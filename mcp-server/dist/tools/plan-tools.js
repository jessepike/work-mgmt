"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPlanTools = registerPlanTools;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";
function registerPlanTools(server) {
    server.tool("list_plans", "List all plans for a project", {
        project_id: zod_1.z.string().uuid()
    }, async ({ project_id }) => {
        const response = await axios_1.default.get(`${API_BASE_URL}/projects/${project_id}/plans`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
    server.tool("create_plan", "Create a new execution plan for a project. Only one plan can be active at a time.", {
        project_id: zod_1.z.string().uuid(),
        name: zod_1.z.string(),
        description: zod_1.z.string().optional()
    }, async ({ project_id, ...payload }) => {
        const response = await axios_1.default.post(`${API_BASE_URL}/projects/${project_id}/plans`, payload);
        return {
            content: [{ type: "text", text: `Plan created successfully: ${response.data.data.id}` }]
        };
    });
    const updatePlanHandler = async ({ id, plan_id, ...updates }) => {
        const targetId = id || plan_id;
        if (!targetId) {
            return {
                content: [{ type: "text", text: "Error updating plan: missing plan id" }],
                isError: true
            };
        }
        const response = await axios_1.default.patch(`${API_BASE_URL}/plans/${targetId}`, updates);
        return {
            content: [{ type: "text", text: `Plan updated successfully: ${response.data.data.id}` }]
        };
    };
    server.tool("patch_plan", "Update an existing plan", {
        id: zod_1.z.string().uuid().optional(),
        plan_id: zod_1.z.string().uuid().optional(),
        name: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(["draft", "approved", "in_progress", "completed"]).optional()
    }, updatePlanHandler);
    // Alias for design parity naming.
    server.tool("update_plan", "Update an existing plan", {
        id: zod_1.z.string().uuid().optional(),
        plan_id: zod_1.z.string().uuid().optional(),
        name: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(["draft", "approved", "in_progress", "completed"]).optional()
    }, updatePlanHandler);
    server.tool("approve_plan", "Approve a plan and set its status to 'approved'", {
        id: zod_1.z.string().uuid(),
        approved_by: zod_1.z.string().describe("The ID of the actor approving the plan")
    }, async ({ id, approved_by }) => {
        const response = await axios_1.default.post(`${API_BASE_URL}/plans/${id}/approve`, { approved_by });
        return {
            content: [{ type: "text", text: `Plan approved successfully: ${response.data.data.id}` }]
        };
    });
}
