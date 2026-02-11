import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";

export function registerBacklogTools(server: McpServer) {
    server.tool(
        "list_backlog",
        "List all backlog items for a project",
        {
            project_id: z.string().uuid()
        },
        async ({ project_id }) => {
            const response = await axios.get(`${API_BASE_URL}/backlog`, { params: { project_id } });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );

    server.tool(
        "create_backlog_item",
        "Capture a new idea or requirement into the backlog",
        {
            project_id: z.string().uuid(),
            title: z.string(),
            description: z.string().optional(),
            priority: z.enum(["P1", "P2", "P3"]).optional(),
            size: z.enum(["S", "M", "L"]).optional(),
            source_id: z.string().optional()
        },
        async (args) => {
            const response = await axios.post(`${API_BASE_URL}/backlog`, args);
            return {
                content: [{ type: "text", text: `Backlog item created successfully: ${response.data.data.id}` }]
            };
        }
    );

    const promoteBacklogHandler = async (args: {
        backlog_item_id?: string;
        backlog_id?: string;
        plan_id?: string;
        phase_id?: string;
        priority?: "P1" | "P2" | "P3";
        size?: "S" | "M" | "L";
    }): Promise<any> => {
        const backlogItemId = args.backlog_item_id || args.backlog_id;
        if (!backlogItemId) {
            return {
                content: [{ type: "text", text: "Error promoting backlog item: missing backlog id" }],
                isError: true
            };
        }
        const { backlog_item_id: _drop, backlog_id: _drop2, ...rest } = args;
        const payload = { backlog_item_id: backlogItemId, ...rest };
        const response = await axios.post(`${API_BASE_URL}/backlog/promote`, payload);
        return {
            content: [{ type: "text", text: `Backlog item promoted successfully to Task: ${response.data.data.id}` }]
        };
    };

    server.tool(
        "promote_backlog_item",
        "Promote a backlog item to an official task",
        {
            backlog_item_id: z.string().uuid().optional(),
            backlog_id: z.string().uuid().optional(),
            plan_id: z.string().uuid().optional().describe("Link to a plan if project uses 'planned' workflow"),
            phase_id: z.string().uuid().optional().describe("Link to a phase if project uses 'planned' workflow"),
            priority: z.enum(["P1", "P2", "P3"]).optional(),
            size: z.enum(["S", "M", "L"]).optional()
        },
        promoteBacklogHandler
    );

    // Alias for design parity naming.
    server.tool(
        "promote_backlog",
        "Promote a backlog item to an official task",
        {
            backlog_item_id: z.string().uuid().optional(),
            backlog_id: z.string().uuid().optional(),
            plan_id: z.string().uuid().optional().describe("Link to a plan if project uses 'planned' workflow"),
            phase_id: z.string().uuid().optional().describe("Link to a phase if project uses 'planned' workflow"),
            priority: z.enum(["P1", "P2", "P3"]).optional(),
            size: z.enum(["S", "M", "L"]).optional()
        },
        promoteBacklogHandler
    );
}
