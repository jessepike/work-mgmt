import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiClient } from "../lib/api-client.js";
import path from "path";
import fs from "fs/promises";
import { parseStatusMd, parseTasksMd, parseBacklogMd } from "../adf/parser.js";

export function registerAdfTools(server: McpServer) {
    server.tool(
        "discover_local_projects",
        "Scan a directory for ADF projects (look for status.md files)",
        {
            base_dir: z.string().describe("The root directory to scan (e.g. /Users/jessepike/code/_shared)")
        },
        async ({ base_dir }) => {
            try {
                const entries = await fs.readdir(base_dir, { withFileTypes: true });
                const projects = [];

                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const projectPath = path.join(base_dir, entry.name);

                        // ADF Signal Check
                        const hasAdfFolder = (await fs.readdir(projectPath)).some(f => f === "adf" || f === "docs");
                        const statusPath = path.join(projectPath, "status.md");
                        const docsStatusPath = path.join(projectPath, "docs", "status.md");
                        const adfDocsStatusPath = path.join(projectPath, "docs", "adf", "status.md");

                        let finalStatusPath = "";
                        try { await fs.access(adfDocsStatusPath); finalStatusPath = adfDocsStatusPath; } catch {
                            try { await fs.access(docsStatusPath); finalStatusPath = docsStatusPath; } catch {
                                try { await fs.access(statusPath); finalStatusPath = statusPath; } catch { }
                            }
                        }

                        if (finalStatusPath) {
                            let initialization_status = "legacy";
                            try {
                                const content = await fs.readFile(finalStatusPath, "utf-8");
                                if (content.includes('type: "status"') || content.includes('type: "brief"')) {
                                    initialization_status = "adf-initialized";
                                } else if (finalStatusPath.includes("adf")) {
                                    initialization_status = "adf-partial";
                                }
                            } catch { }

                            projects.push({
                                name: entry.name,
                                path: projectPath,
                                initialization_status,
                                status_file: path.relative(projectPath, finalStatusPath)
                            });
                        }
                    }
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Found ${projects.length} potential projects:\n\n${projects.map(p => `- [${p.initialization_status.toUpperCase()}] ${p.name} (${p.path})`).join("\n")}`
                        }
                    ]
                };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error scanning directory: ${error.message}` }], isError: true };
            }
        }
    );

    server.tool(
        "connect_local_project",
        "Bind a local directory to a project in the database. Creates an 'adf' connector.",
        {
            project_id: z.string().uuid(),
            local_path: z.string().describe("Absolute path to the project root")
        },
        async ({ project_id, local_path }) => {
            try {
                // Check if connector already exists
                const existingRes = await apiClient.get(`/projects/${project_id}`);
                const project = existingRes.data.data;

                const response = await apiClient.post("/connectors", {
                    project_id,
                    connector_type: "adf",
                    status: "active",
                    config: { path: local_path }
                });

                return {
                    content: [{ type: "text", text: `Successfully connected ${project.name} to ${local_path}. Connector ID: ${response.data.data.id}` }]
                };
            } catch (error: any) {
                return { content: [{ type: "text", text: `Error connecting project: ${error.message}` }], isError: true };
            }
        }
    );

    server.tool(
        "sync_adf_project",
        "Sync a local project's ADF files (status.md, tasks.md, BACKLOG.md) to the database via REST API",
        {
            project_id: z.string().uuid().describe("The ID of the project in the database to sync to")
        },
        async ({ project_id }) => {
            try {
                // Call the new centralized REST endpoint
                const response = await apiClient.post("/connectors/sync", {
                    project_id
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: `Sync complete for project ${project_id}. ${response.data.count} items upserted.`
                        }
                    ]
                };
            } catch (error: any) {
                const message = error.response?.data?.error || error.message;
                return { content: [{ type: "text", text: `Error syncing project: ${message}` }], isError: true };
            }
        }
    );

    server.tool(
        "governed_writeback_task",
        "Write changes for a synced task back to its ADF source file with conflict checks. Use dry_run=true first.",
        {
            project_id: z.string().uuid(),
            task_id: z.string().uuid(),
            status: z.enum(["pending", "in_progress", "blocked", "done"]).optional(),
            priority: z.enum(["P1", "P2", "P3"]).optional(),
            title: z.string().optional(),
            expected_updated_at: z.string().optional(),
            dry_run: z.boolean().default(true),
            strict_conflicts: z.boolean().default(true),
        },
        async ({ project_id, task_id, status, priority, title, expected_updated_at, dry_run, strict_conflicts }) => {
            try {
                const patch: Record<string, any> = {};
                if (status) patch.status = status;
                if (priority) patch.priority = priority;
                if (title) patch.title = title;

                const response = await apiClient.post("/connectors/writeback", {
                    project_id,
                    dry_run,
                    strict_conflicts,
                    operations: [
                        {
                            entity_type: "task",
                            entity_id: task_id,
                            expected_updated_at,
                            patch,
                        },
                    ],
                });

                return {
                    content: [{ type: "text", text: JSON.stringify(response.data?.data || response.data, null, 2) }],
                };
            } catch (error: any) {
                const message = error.response?.data?.error || error.message;
                const detail = error.response?.data ? `\n${JSON.stringify(error.response.data, null, 2)}` : "";
                return { content: [{ type: "text", text: `Error writeback task: ${message}${detail}` }], isError: true };
            }
        }
    );

    server.tool(
        "governed_writeback_backlog_item",
        "Write changes for a synced backlog item back to ADF source with conflict checks. Use dry_run=true first.",
        {
            project_id: z.string().uuid(),
            backlog_item_id: z.string().uuid(),
            status: z.enum(["captured", "triaged", "prioritized", "promoted", "archived"]).optional(),
            priority: z.enum(["P1", "P2", "P3"]).optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            expected_updated_at: z.string().optional(),
            dry_run: z.boolean().default(true),
            strict_conflicts: z.boolean().default(true),
        },
        async ({ project_id, backlog_item_id, status, priority, title, description, expected_updated_at, dry_run, strict_conflicts }) => {
            try {
                const patch: Record<string, any> = {};
                if (status) patch.status = status;
                if (priority) patch.priority = priority;
                if (title) patch.title = title;
                if (description !== undefined) patch.description = description;

                const response = await apiClient.post("/connectors/writeback", {
                    project_id,
                    dry_run,
                    strict_conflicts,
                    operations: [
                        {
                            entity_type: "backlog_item",
                            entity_id: backlog_item_id,
                            expected_updated_at,
                            patch,
                        },
                    ],
                });

                return {
                    content: [{ type: "text", text: JSON.stringify(response.data?.data || response.data, null, 2) }],
                };
            } catch (error: any) {
                const message = error.response?.data?.error || error.message;
                const detail = error.response?.data ? `\n${JSON.stringify(error.response.data, null, 2)}` : "";
                return { content: [{ type: "text", text: `Error writeback backlog item: ${message}${detail}` }], isError: true };
            }
        }
    );

    server.tool(
        "governed_writeback_status",
        "Write project status fields (current_stage/focus) back to status.md with conflict checks. Use dry_run=true first.",
        {
            project_id: z.string().uuid(),
            current_stage: z.string().optional(),
            focus: z.string().optional(),
            dry_run: z.boolean().default(true),
            strict_conflicts: z.boolean().default(true),
        },
        async ({ project_id, current_stage, focus, dry_run, strict_conflicts }) => {
            try {
                const patch: Record<string, any> = {};
                if (current_stage) patch.current_stage = current_stage;
                if (focus) patch.focus = focus;

                const response = await apiClient.post("/connectors/writeback", {
                    project_id,
                    dry_run,
                    strict_conflicts,
                    operations: [
                        {
                            entity_type: "project_status",
                            patch,
                        },
                    ],
                });

                return {
                    content: [{ type: "text", text: JSON.stringify(response.data?.data || response.data, null, 2) }],
                };
            } catch (error: any) {
                const message = error.response?.data?.error || error.message;
                const detail = error.response?.data ? `\n${JSON.stringify(error.response.data, null, 2)}` : "";
                return { content: [{ type: "text", text: `Error writeback status: ${message}${detail}` }], isError: true };
            }
        }
    );
}
