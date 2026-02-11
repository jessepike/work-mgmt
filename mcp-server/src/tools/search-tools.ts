import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";

export function registerSearchTools(server: McpServer) {
    const searchHandler = async ({ query, limit }: { query: string; limit?: number }): Promise<any> => {
        try {
            const response = await axios.get(`${API_BASE_URL}/search`, { params: { q: query } });
            const results = response.data?.data ?? [];
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(limit ? results.slice(0, limit) : results, null, 2)
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
    };

    server.tool(
        "search_work",
        "Search for tasks and backlog items using full text search",
        {
            query: z.string().min(1),
            limit: z.number().int().positive().max(200).optional()
        },
        searchHandler
    );

    // Alias for design parity naming.
    server.tool(
        "search",
        "Search for tasks and backlog items using full text search",
        {
            query: z.string().min(1),
            limit: z.number().int().positive().max(200).optional()
        },
        searchHandler
    );

    const whatsNextHandler = async ({ limit }: { limit?: number }): Promise<any> => {
        try {
            const response = await axios.get(`${API_BASE_URL}/whats-next`);
            const items = response.data?.data ?? [];
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(limit ? items.slice(0, limit) : items, null, 2)
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
    };

    server.tool(
        "get_whats_next",
        "Get the ranked list of most important tasks to work on next",
        {
            limit: z.number().int().positive().max(200).optional()
        },
        whatsNextHandler
    );

    // Alias for design parity naming.
    server.tool(
        "whats_next",
        "Get the ranked list of most important tasks to work on next",
        {
            limit: z.number().int().positive().max(200).optional()
        },
        whatsNextHandler
    );
}
