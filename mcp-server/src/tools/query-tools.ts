import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";

export function registerQueryTools(server: McpServer) {
    server.tool(
        "get_portfolio_status",
        "Get a high-level summary of all active projects, health signals, and upcoming deadlines across the portfolio",
        {},
        async () => {
            const response = await axios.get(`${API_BASE_URL}/projects/status`);
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );

    server.tool(
        "list_blockers",
        "List all blocked tasks across all active projects",
        {},
        async () => {
            const response = await axios.get(`${API_BASE_URL}/blockers`);
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );

    server.tool(
        "list_deadlines",
        "List upcoming task deadlines across all projects",
        {},
        async () => {
            const response = await axios.get(`${API_BASE_URL}/deadlines`);
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );
}
