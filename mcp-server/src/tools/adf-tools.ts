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
}
