"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdfTools = registerAdfTools;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";
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
            const existingRes = await axios_1.default.get(`${API_BASE_URL}/projects/${project_id}`);
            const project = existingRes.data.data;
            // Create connector row via REST (B15 - implementing MVP here)
            // Since B15 is pending, we'll implement a simple POST to a new endpoint or use direct Supabase if needed.
            // For now, we'll assume the /api/connectors endpoint is about to be implemented.
            const response = await axios_1.default.post(`${API_BASE_URL}/connectors`, {
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
            const response = await axios_1.default.post(`${API_BASE_URL}/connectors/sync`, {
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
}
