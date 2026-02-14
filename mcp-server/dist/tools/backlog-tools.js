"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBacklogTools = registerBacklogTools;
const zod_1 = require("zod");
const api_client_js_1 = require("../lib/api-client.js");
function registerBacklogTools(server) {
    server.tool("list_backlog", "List all backlog items for a project. Optionally filter by type.", {
        project_id: zod_1.z.string().uuid().optional(),
        type: zod_1.z.string().optional().describe("Filter by item type (e.g. 'idea', 'task', 'review')"),
        scope: zod_1.z.enum(["enabled"]).optional().describe("Set to 'enabled' to scope to enabled projects only")
    }, async ({ project_id, type, scope }) => {
        const params = {};
        if (project_id)
            params.project_id = project_id;
        if (type)
            params.type = type;
        if (scope)
            params.scope = scope;
        const response = await api_client_js_1.apiClient.get("/backlog", { params });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
    server.tool("create_backlog_item", "Capture a new idea or requirement into the backlog", {
        project_id: zod_1.z.string().uuid(),
        title: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        priority: zod_1.z.enum(["P1", "P2", "P3"]).optional(),
        size: zod_1.z.enum(["S", "M", "L"]).optional(),
        type: zod_1.z.string().optional().describe("Item type (e.g. 'idea', 'task', 'review'). Freeform text."),
        source_id: zod_1.z.string().optional()
    }, async (args) => {
        const response = await api_client_js_1.apiClient.post("/backlog", args);
        return {
            content: [{ type: "text", text: `Backlog item created successfully: ${response.data.data.id}` }]
        };
    });
    const promoteBacklogHandler = async (args) => {
        const backlogItemId = args.backlog_item_id || args.backlog_id;
        if (!backlogItemId) {
            return {
                content: [{ type: "text", text: "Error promoting backlog item: missing backlog id" }],
                isError: true
            };
        }
        const { backlog_item_id: _drop, backlog_id: _drop2, ...rest } = args;
        const payload = { backlog_item_id: backlogItemId, ...rest };
        const response = await api_client_js_1.apiClient.post("/backlog/promote", payload);
        return {
            content: [{ type: "text", text: `Backlog item promoted successfully to Task: ${response.data.data.id}` }]
        };
    };
    server.tool("promote_backlog", "Promote a backlog item to an official task", {
        backlog_item_id: zod_1.z.string().uuid().optional(),
        backlog_id: zod_1.z.string().uuid().optional(),
        plan_id: zod_1.z.string().uuid().optional().describe("Link to a plan if project uses 'planned' workflow"),
        phase_id: zod_1.z.string().uuid().optional().describe("Link to a phase if project uses 'planned' workflow"),
        priority: zod_1.z.enum(["P1", "P2", "P3"]).optional(),
        size: zod_1.z.enum(["S", "M", "L"]).optional()
    }, promoteBacklogHandler);
}
