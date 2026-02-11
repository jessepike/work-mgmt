"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPhaseTools = registerPhaseTools;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";
function registerPhaseTools(server) {
    server.tool("list_phases", "List all phases for a project or plan", {
        project_id: zod_1.z.string().uuid().optional(),
        plan_id: zod_1.z.string().uuid().optional()
    }, async (params) => {
        const response = await axios_1.default.get(`${API_BASE_URL}/phases`, { params });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
    server.tool("create_phase", "Create a new phase within a plan", {
        project_id: zod_1.z.string().uuid(),
        plan_id: zod_1.z.string().uuid(),
        name: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        sort_order: zod_1.z.number().int().describe("Sequence number for this phase")
    }, async (args) => {
        const response = await axios_1.default.post(`${API_BASE_URL}/phases`, args);
        return {
            content: [{ type: "text", text: `Phase created successfully: ${response.data.data.id}` }]
        };
    });
    server.tool("start_phase", "Start a phase", {
        id: zod_1.z.string().uuid()
    }, async ({ id }) => {
        const response = await axios_1.default.post(`${API_BASE_URL}/phases/${id}/start`);
        return {
            content: [{ type: "text", text: `Phase started successfully: ${response.data.data.id}` }]
        };
    });
    server.tool("complete_phase", "Mark a phase as completed", {
        id: zod_1.z.string().uuid(),
        handoff_notes: zod_1.z.string().optional().describe("Outcome and handoff details")
    }, async ({ id, handoff_notes }) => {
        const response = await axios_1.default.post(`${API_BASE_URL}/phases/${id}/complete`, { handoff_notes });
        return {
            content: [{ type: "text", text: `Phase completed successfully: ${response.data.data.id}` }]
        };
    });
}
