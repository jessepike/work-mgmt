import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiClient } from "../lib/api-client.js";

export function registerPhaseTools(server: McpServer) {
    server.tool(
        "list_phases",
        "List all phases for a plan",
        {
            plan_id: z.string().uuid()
        },
        async ({ plan_id }) => {
            const response = await apiClient.get(`/plans/${plan_id}/phases`);
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );

    server.tool(
        "create_phase",
        "Create a new phase within a plan",
        {
            plan_id: z.string().uuid(),
            name: z.string(),
            description: z.string().optional()
        },
        async ({ plan_id, ...payload }) => {
            const response = await apiClient.post(`/plans/${plan_id}/phases`, payload);
            return {
                content: [{ type: "text", text: `Phase created successfully: ${response.data.data.id}` }]
            };
        }
    );

    const updatePhaseHandler = async ({
        id,
        phase_id,
        ...updates
    }: {
        id?: string;
        phase_id?: string;
        name?: string;
        description?: string;
        sort_order?: number;
        deadline_at?: string;
        status?: "pending" | "active" | "completed";
        handoff_notes?: string;
    }): Promise<any> => {
        const targetId = id || phase_id;
        if (!targetId) {
            return {
                content: [{ type: "text", text: "Error updating phase: missing phase id" }],
                isError: true
            };
        }
        const response = await apiClient.patch(`/phases/${targetId}`, updates);
        return {
            content: [{ type: "text", text: `Phase updated successfully: ${response.data.data.id}` }]
        };
    };

    server.tool(
        "update_phase",
        "Update an existing phase",
        {
            id: z.string().uuid().optional(),
            phase_id: z.string().uuid().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            sort_order: z.number().optional(),
            deadline_at: z.string().optional(),
            status: z.enum(["pending", "active", "completed"]).optional(),
            handoff_notes: z.string().optional()
        },
        updatePhaseHandler
    );

    server.tool(
        "start_phase",
        "Start a phase",
        {
            id: z.string().uuid()
        },
        async ({ id }) => {
            const response = await apiClient.post(`/phases/${id}/start`);
            return {
                content: [{ type: "text", text: `Phase started successfully: ${response.data.data.id}` }]
            };
        }
    );

    server.tool(
        "complete_phase",
        "Mark a phase as completed",
        {
            id: z.string().uuid(),
            handoff_notes: z.string().optional().describe("Outcome and handoff details")
        },
        async ({ id, handoff_notes }) => {
            const response = await apiClient.post(`/phases/${id}/complete`, { handoff_notes });
            return {
                content: [{ type: "text", text: `Phase completed successfully: ${response.data.data.id}` }]
            };
        }
    );
}
