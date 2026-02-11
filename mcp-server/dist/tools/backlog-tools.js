"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBacklogTools = registerBacklogTools;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";
function registerBacklogTools(server) {
    server.tool("list_backlog", "List all backlog items for a project", {
        project_id: zod_1.z.string().uuid()
    }, async ({ project_id }) => {
        const response = await axios_1.default.get(`${API_BASE_URL}/backlog`, { params: { project_id } });
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
        source_id: zod_1.z.string().optional()
    }, async (args) => {
        const response = await axios_1.default.post(`${API_BASE_URL}/backlog`, args);
        return {
            content: [{ type: "text", text: `Backlog item created successfully: ${response.data.data.id}` }]
        };
    });
    server.tool("promote_backlog_item", "Promote a backlog item to an official task", {
        backlog_item_id: zod_1.z.string().uuid(),
        plan_id: zod_1.z.string().uuid().optional().describe("Link to a plan if project uses 'planned' workflow"),
        phase_id: zod_1.z.string().uuid().optional().describe("Link to a phase if project uses 'planned' workflow"),
        priority: zod_1.z.enum(["P1", "P2", "P3"]).optional(),
        size: zod_1.z.enum(["S", "M", "L"]).optional()
    }, async (args) => {
        const response = await axios_1.default.post(`${API_BASE_URL}/backlog/promote`, args);
        return {
            content: [{ type: "text", text: `Backlog item promoted successfully to Task: ${response.data.data.id}` }]
        };
    });
}
