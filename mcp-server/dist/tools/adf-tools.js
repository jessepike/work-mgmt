"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdfTools = registerAdfTools;
const zod_1 = require("zod");
const api_client_js_1 = require("../lib/api-client.js");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
function registerAdfTools(server) {
    server.tool("discover_local_projects", "Scan a directory for ADF projects (look for status.md files)", {
        base_dir: zod_1.z.string().describe("The root directory to scan (e.g. /Users/jessepike/code/_shared)")
    }, async ({ base_dir }) => {
        try {
            const entries = await promises_1.default.readdir(base_dir, { withFileTypes: true });
            const projects = [];
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const projectPath = path_1.default.join(base_dir, entry.name);
                    // ADF Signal Check
                    const hasAdfFolder = (await promises_1.default.readdir(projectPath)).some(f => f === "adf" || f === "docs");
                    const statusPath = path_1.default.join(projectPath, "status.md");
                    const docsStatusPath = path_1.default.join(projectPath, "docs", "status.md");
                    const adfDocsStatusPath = path_1.default.join(projectPath, "docs", "adf", "status.md");
                    let finalStatusPath = "";
                    try {
                        await promises_1.default.access(adfDocsStatusPath);
                        finalStatusPath = adfDocsStatusPath;
                    }
                    catch {
                        try {
                            await promises_1.default.access(docsStatusPath);
                            finalStatusPath = docsStatusPath;
                        }
                        catch {
                            try {
                                await promises_1.default.access(statusPath);
                                finalStatusPath = statusPath;
                            }
                            catch { }
                        }
                    }
                    if (finalStatusPath) {
                        let initialization_status = "legacy";
                        try {
                            const content = await promises_1.default.readFile(finalStatusPath, "utf-8");
                            if (content.includes('type: "status"') || content.includes('type: "brief"')) {
                                initialization_status = "adf-initialized";
                            }
                            else if (finalStatusPath.includes("adf")) {
                                initialization_status = "adf-partial";
                            }
                        }
                        catch { }
                        projects.push({
                            name: entry.name,
                            path: projectPath,
                            initialization_status,
                            status_file: path_1.default.relative(projectPath, finalStatusPath)
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
        }
        catch (error) {
            return { content: [{ type: "text", text: `Error scanning directory: ${error.message}` }], isError: true };
        }
    });
    server.tool("connect_local_project", "Bind a local directory to a project in the database. Creates an 'adf' connector.", {
        project_id: zod_1.z.string().uuid(),
        local_path: zod_1.z.string().describe("Absolute path to the project root")
    }, async ({ project_id, local_path }) => {
        try {
            // Check if connector already exists
            const existingRes = await api_client_js_1.apiClient.get(`/projects/${project_id}`);
            const project = existingRes.data.data;
            const response = await api_client_js_1.apiClient.post("/connectors", {
                project_id,
                connector_type: "adf",
                status: "active",
                config: { path: local_path }
            });
            return {
                content: [{ type: "text", text: `Successfully connected ${project.name} to ${local_path}. Connector ID: ${response.data.data.id}` }]
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: `Error connecting project: ${error.message}` }], isError: true };
        }
    });
    server.tool("sync_adf_project", "Sync a local project's ADF files (status.md, tasks.md, BACKLOG.md) to the database via REST API", {
        project_id: zod_1.z.string().uuid().describe("The ID of the project in the database to sync to")
    }, async ({ project_id }) => {
        try {
            // Call the new centralized REST endpoint
            const response = await api_client_js_1.apiClient.post("/connectors/sync", {
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
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            return { content: [{ type: "text", text: `Error syncing project: ${message}` }], isError: true };
        }
    });
    server.tool("governed_writeback_task", "Write changes for a synced task back to its ADF source file with conflict checks. Use dry_run=true first.", {
        project_id: zod_1.z.string().uuid(),
        task_id: zod_1.z.string().uuid(),
        status: zod_1.z.enum(["pending", "in_progress", "blocked", "done"]).optional(),
        priority: zod_1.z.enum(["P1", "P2", "P3"]).optional(),
        title: zod_1.z.string().optional(),
        expected_updated_at: zod_1.z.string().optional(),
        dry_run: zod_1.z.boolean().default(true),
        strict_conflicts: zod_1.z.boolean().default(true),
    }, async ({ project_id, task_id, status, priority, title, expected_updated_at, dry_run, strict_conflicts }) => {
        try {
            const patch = {};
            if (status)
                patch.status = status;
            if (priority)
                patch.priority = priority;
            if (title)
                patch.title = title;
            const response = await api_client_js_1.apiClient.post("/connectors/writeback", {
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
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            const detail = error.response?.data ? `\n${JSON.stringify(error.response.data, null, 2)}` : "";
            return { content: [{ type: "text", text: `Error writeback task: ${message}${detail}` }], isError: true };
        }
    });
    server.tool("governed_writeback_backlog_item", "Write changes for a synced backlog item back to ADF source with conflict checks. Use dry_run=true first.", {
        project_id: zod_1.z.string().uuid(),
        backlog_item_id: zod_1.z.string().uuid(),
        status: zod_1.z.enum(["captured", "triaged", "prioritized", "promoted", "archived"]).optional(),
        priority: zod_1.z.enum(["P1", "P2", "P3"]).optional(),
        title: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        expected_updated_at: zod_1.z.string().optional(),
        dry_run: zod_1.z.boolean().default(true),
        strict_conflicts: zod_1.z.boolean().default(true),
    }, async ({ project_id, backlog_item_id, status, priority, title, description, expected_updated_at, dry_run, strict_conflicts }) => {
        try {
            const patch = {};
            if (status)
                patch.status = status;
            if (priority)
                patch.priority = priority;
            if (title)
                patch.title = title;
            if (description !== undefined)
                patch.description = description;
            const response = await api_client_js_1.apiClient.post("/connectors/writeback", {
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
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            const detail = error.response?.data ? `\n${JSON.stringify(error.response.data, null, 2)}` : "";
            return { content: [{ type: "text", text: `Error writeback backlog item: ${message}${detail}` }], isError: true };
        }
    });
    server.tool("governed_writeback_status", "Write project status fields (current_stage/focus) back to status.md with conflict checks. Use dry_run=true first.", {
        project_id: zod_1.z.string().uuid(),
        current_stage: zod_1.z.string().optional(),
        focus: zod_1.z.string().optional(),
        dry_run: zod_1.z.boolean().default(true),
        strict_conflicts: zod_1.z.boolean().default(true),
    }, async ({ project_id, current_stage, focus, dry_run, strict_conflicts }) => {
        try {
            const patch = {};
            if (current_stage)
                patch.current_stage = current_stage;
            if (focus)
                patch.focus = focus;
            const response = await api_client_js_1.apiClient.post("/connectors/writeback", {
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
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            const detail = error.response?.data ? `\n${JSON.stringify(error.response.data, null, 2)}` : "";
            return { content: [{ type: "text", text: `Error writeback status: ${message}${detail}` }], isError: true };
        }
    });
}
