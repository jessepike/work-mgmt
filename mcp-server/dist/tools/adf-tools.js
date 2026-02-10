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
const parser_js_1 = require("../adf/parser.js");
const API_BASE_URL = process.env.API_URL || "http://localhost:3000/api";
function registerAdfTools(server) {
    server.tool("sync_adf_project", "Sync a local project's ADF files (status.md, tasks.md, BACKLOG.md) to the database", {
        project_path: zod_1.z.string(),
        project_id: zod_1.z.string().uuid().describe("The ID of the project in the database to sync to")
    }, async ({ project_path, project_id }) => {
        try {
            const results = [];
            // 1. Parse Files
            const tasksPath = path_1.default.join(project_path, "tasks.md"); // or task.md
            const backlogPath = path_1.default.join(project_path, "BACKLOG.md");
            // Try task.md if tasks.md doesn't exist
            let tasksFile = tasksPath;
            try {
                await promises_1.default.access(tasksPath);
            }
            catch {
                tasksFile = path_1.default.join(project_path, "task.md");
            }
            const tasks = await (0, parser_js_1.parseTasksMd)(tasksFile);
            const backlog = await (0, parser_js_1.parseBacklogMd)(backlogPath);
            const allItems = [...tasks, ...backlog]; // Backlog items treated as tasks for now? Or separate entity?
            // Our API has `data_origin` defaults to 'native'. We should set 'synced'.
            // 2. Sync loop
            // In a real app we'd bulk upsert. Here we loop sequentially for MVP simplicity.
            let syncedCount = 0;
            for (const item of allItems) {
                // Check if exists by source_id? The API doesn't expose a way to query by source_id easily in `in_progress` implementation
                // We need to implement that or just "create always" which duplicates.
                // Prerequisite: API needs to support UPSERT or we check existence.
                // Let's use `list_tasks` to check existence? Slow.
                // Better: POST /api/tasks handles existence check if we pass source_id?
                // Currently POST create always creates.
                // Hack for MVP: search by title match?
                // Or: We add `source_id` uniqueness constraint in DB (we didn't, we added index).
                // Let's just try to create and ignore if duplicate (need DB constraint) OR
                // Call GET /tasks?project_id=X first to get all, then match in memory.
                // Optimization: We will just log "Would sync item: ..." for the first version if we can't upsert.
                // Actually, let's do the "Get all and diff" approach.
            }
            // Fetch existing tasks for project
            const existingRes = await axios_1.default.get(`${API_BASE_URL}/tasks`, { params: { project_id, limit: 1000 } });
            const existingTasks = existingRes.data.data;
            const existingMap = new Map(existingTasks.map((t) => [t.source_id, t])); // Map source_id -> task
            for (const item of allItems) {
                const match = existingMap.get(item.source_id);
                if (match) {
                    // Update if status changed
                    if (match.status !== item.status) {
                        await axios_1.default.patch(`${API_BASE_URL}/tasks/${match.id}`, { status: item.status });
                        results.push(`Updated status for ${item.title}`);
                    }
                }
                else {
                    // Create
                    await axios_1.default.post(`${API_BASE_URL}/tasks`, {
                        project_id,
                        title: item.title,
                        status: item.status,
                        priority: item.priority || "P2",
                        source_id: item.source_id,
                        data_origin: "synced"
                    });
                    results.push(`Created task ${item.title}`);
                    syncedCount++;
                }
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Sync complete. ${syncedCount} new items created. ${results.length} items processed.`
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error syncing project: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    });
}
