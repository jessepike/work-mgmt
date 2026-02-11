import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";

export function registerQueryTools(server: McpServer) {
    const getStatusHandler = async () => {
        const response = await axios.get(`${API_BASE_URL}/projects/status`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    };

    server.tool(
        "get_portfolio_status",
        "Get a high-level summary of all active projects, health signals, and upcoming deadlines across the portfolio",
        {},
        getStatusHandler
    );

    // Alias for design parity naming.
    server.tool(
        "get_status",
        "Get a high-level summary of all active projects, health signals, and upcoming deadlines across the portfolio",
        {},
        getStatusHandler
    );

    const getBlockersHandler = async () => {
        const response = await axios.get(`${API_BASE_URL}/blockers`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    };

    server.tool(
        "list_blockers",
        "List all blocked tasks across all active projects",
        {},
        getBlockersHandler
    );

    // Alias for design parity naming.
    server.tool(
        "get_blockers",
        "List all blocked tasks across all active projects",
        {},
        getBlockersHandler
    );

    const getDeadlinesHandler = async () => {
        const response = await axios.get(`${API_BASE_URL}/deadlines`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    };

    server.tool(
        "list_deadlines",
        "List upcoming task deadlines across all projects",
        {},
        getDeadlinesHandler
    );

    // Alias for design parity naming.
    server.tool(
        "get_deadlines",
        "List upcoming task deadlines across all projects",
        {},
        getDeadlinesHandler
    );

    server.tool(
        "get_activity",
        "Get activity log entries, optionally filtered by actor or entity",
        {
            actor_id: z.string().uuid().optional(),
            entity_id: z.string().uuid().optional(),
            limit: z.number().int().positive().max(200).optional()
        },
        async ({ actor_id, entity_id, limit }) => {
            const params: Record<string, string | number> = {};
            if (actor_id) params.actor_id = actor_id;
            if (entity_id) params.entity_id = entity_id;
            if (limit) params.limit = limit;

            const response = await axios.get(`${API_BASE_URL}/activity`, { params });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );
}
