import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";

export function registerPlanTools(server: McpServer) {
    server.tool(
        "list_plans",
        "List all plans for a project",
        {
            project_id: z.string().uuid()
        },
        async ({ project_id }) => {
            const response = await axios.get(`${API_BASE_URL}/projects/${project_id}/plans`);
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );

    server.tool(
        "create_plan",
        "Create a new execution plan for a project. Only one plan can be active at a time.",
        {
            project_id: z.string().uuid(),
            name: z.string(),
            description: z.string().optional()
        },
        async ({ project_id, ...payload }) => {
            const response = await axios.post(`${API_BASE_URL}/projects/${project_id}/plans`, payload);
            return {
                content: [{ type: "text", text: `Plan created successfully: ${response.data.data.id}` }]
            };
        }
    );

    const updatePlanHandler = async ({
        id,
        plan_id,
        ...updates
    }: {
        id?: string;
        plan_id?: string;
        name?: string;
        description?: string;
        status?: "draft" | "approved" | "in_progress" | "completed";
    }): Promise<any> => {
        const targetId = id || plan_id;
        if (!targetId) {
            return {
                content: [{ type: "text", text: "Error updating plan: missing plan id" }],
                isError: true
            };
        }
        const response = await axios.patch(`${API_BASE_URL}/plans/${targetId}`, updates);
        return {
            content: [{ type: "text", text: `Plan updated successfully: ${response.data.data.id}` }]
        };
    };

    server.tool(
        "patch_plan",
        "Update an existing plan",
        {
            id: z.string().uuid().optional(),
            plan_id: z.string().uuid().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            status: z.enum(["draft", "approved", "in_progress", "completed"]).optional()
        },
        updatePlanHandler
    );

    // Alias for design parity naming.
    server.tool(
        "update_plan",
        "Update an existing plan",
        {
            id: z.string().uuid().optional(),
            plan_id: z.string().uuid().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            status: z.enum(["draft", "approved", "in_progress", "completed"]).optional()
        },
        updatePlanHandler
    );

    server.tool(
        "approve_plan",
        "Approve a plan and set its status to 'approved'",
        {
            id: z.string().uuid(),
            approved_by: z.string().describe("The ID of the actor approving the plan")
        },
        async ({ id, approved_by }) => {
            const response = await axios.post(`${API_BASE_URL}/plans/${id}/approve`, { approved_by });
            return {
                content: [{ type: "text", text: `Plan approved successfully: ${response.data.data.id}` }]
            };
        }
    );
}
