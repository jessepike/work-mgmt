import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";

export function registerPhaseTools(server: McpServer) {
    server.tool(
        "list_phases",
        "List all phases for a project or plan",
        {
            project_id: z.string().uuid().optional(),
            plan_id: z.string().uuid().optional()
        },
        async (params) => {
            const response = await axios.get(`${API_BASE_URL}/phases`, { params });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );

    server.tool(
        "create_phase",
        "Create a new phase within a plan",
        {
            project_id: z.string().uuid(),
            plan_id: z.string().uuid(),
            name: z.string(),
            description: z.string().optional(),
            sort_order: z.number().int().describe("Sequence number for this phase")
        },
        async (args) => {
            const response = await axios.post(`${API_BASE_URL}/phases`, args);
            return {
                content: [{ type: "text", text: `Phase created successfully: ${response.data.data.id}` }]
            };
        }
    );

    server.tool(
        "start_phase",
        "Start a phase",
        {
            id: z.string().uuid()
        },
        async ({ id }) => {
            const response = await axios.post(`${API_BASE_URL}/phases/${id}/start`);
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
            const response = await axios.post(`${API_BASE_URL}/phases/${id}/complete`, { handoff_notes });
            return {
                content: [{ type: "text", text: `Phase completed successfully: ${response.data.data.id}` }]
            };
        }
    );
}
