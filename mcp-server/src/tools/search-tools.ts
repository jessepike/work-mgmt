import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";

export function registerSearchTools(server: McpServer) {
    server.tool(
        "search_work",
        "Search for tasks and backlog items using full text search",
        {
            query: z.string().min(1)
        },
        async ({ query }) => {
            try {
                const response = await axios.get(`${API_BASE_URL}/search`, { params: { q: query } });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data.data, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error searching: ${error.message}`
                        }
                    ],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "get_whats_next",
        "Get the ranked list of most important tasks to work on next",
        {},
        async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/whats-next`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data.data, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error getting what's next: ${error.message}`
                        }
                    ],
                    isError: true
                };
            }
        }
    );
}
