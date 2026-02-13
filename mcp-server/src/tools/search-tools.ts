import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiClient } from "../lib/api-client.js";

export function registerSearchTools(server: McpServer) {
    const searchHandler = async ({ query, limit }: { query: string; limit?: number }): Promise<any> => {
        try {
            const response = await apiClient.get("/search", { params: { q: query } });
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
            const response = await apiClient.get("/whats-next");
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
        "whats_next",
        "Get the ranked list of most important tasks to work on next",
        {
            limit: z.number().int().positive().max(200).optional()
        },
        whatsNextHandler
    );
}
