"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPhaseTools = registerPhaseTools;
const zod_1 = require("zod");
const api_client_js_1 = require("../lib/api-client.js");
function registerPhaseTools(server) {
    server.tool("list_phases", "List all phases for a plan", {
        plan_id: zod_1.z.string().uuid()
    }, async ({ plan_id }) => {
        const response = await api_client_js_1.apiClient.get(`/plans/${plan_id}/phases`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
    server.tool("create_phase", "Create a new phase within a plan", {
        plan_id: zod_1.z.string().uuid(),
        name: zod_1.z.string(),
        description: zod_1.z.string().optional()
    }, async ({ plan_id, ...payload }) => {
        const response = await api_client_js_1.apiClient.post(`/plans/${plan_id}/phases`, payload);
        return {
            content: [{ type: "text", text: `Phase created successfully: ${response.data.data.id}` }]
        };
    });
    const updatePhaseHandler = async ({ id, phase_id, ...updates }) => {
        const targetId = id || phase_id;
        if (!targetId) {
            return {
                content: [{ type: "text", text: "Error updating phase: missing phase id" }],
                isError: true
            };
        }
        const response = await api_client_js_1.apiClient.patch(`/phases/${targetId}`, updates);
        return {
            content: [{ type: "text", text: `Phase updated successfully: ${response.data.data.id}` }]
        };
    };
    server.tool("update_phase", "Update an existing phase", {
        id: zod_1.z.string().uuid().optional(),
        phase_id: zod_1.z.string().uuid().optional(),
        name: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        sort_order: zod_1.z.number().optional(),
        deadline_at: zod_1.z.string().optional(),
        status: zod_1.z.enum(["pending", "active", "completed"]).optional(),
        handoff_notes: zod_1.z.string().optional()
    }, updatePhaseHandler);
    server.tool("start_phase", "Start a phase", {
        id: zod_1.z.string().uuid()
    }, async ({ id }) => {
        const response = await api_client_js_1.apiClient.post(`/phases/${id}/start`);
        return {
            content: [{ type: "text", text: `Phase started successfully: ${response.data.data.id}` }]
        };
    });
    server.tool("complete_phase", "Mark a phase as completed", {
        id: zod_1.z.string().uuid(),
        handoff_notes: zod_1.z.string().optional().describe("Outcome and handoff details")
    }, async ({ id, handoff_notes }) => {
        const response = await api_client_js_1.apiClient.post(`/phases/${id}/complete`, { handoff_notes });
        return {
            content: [{ type: "text", text: `Phase completed successfully: ${response.data.data.id}` }]
        };
    });
}
