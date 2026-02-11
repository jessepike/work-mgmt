"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSearchTools = registerSearchTools;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";
function registerSearchTools(server) {
    const searchHandler = async ({ query, limit }) => {
        try {
            const response = await axios_1.default.get(`${API_BASE_URL}/search`, { params: { q: query } });
            const results = response.data?.data ?? [];
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(limit ? results.slice(0, limit) : results, null, 2)
                    }
                ]
            };
        }
        catch (error) {
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
    server.tool("search_work", "Search for tasks and backlog items using full text search", {
        query: zod_1.z.string().min(1),
        limit: zod_1.z.number().int().positive().max(200).optional()
    }, searchHandler);
    // Alias for design parity naming.
    server.tool("search", "Search for tasks and backlog items using full text search", {
        query: zod_1.z.string().min(1),
        limit: zod_1.z.number().int().positive().max(200).optional()
    }, searchHandler);
    const whatsNextHandler = async ({ limit }) => {
        try {
            const response = await axios_1.default.get(`${API_BASE_URL}/whats-next`);
            const items = response.data?.data ?? [];
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(limit ? items.slice(0, limit) : items, null, 2)
                    }
                ]
            };
        }
        catch (error) {
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
    server.tool("get_whats_next", "Get the ranked list of most important tasks to work on next", {
        limit: zod_1.z.number().int().positive().max(200).optional()
    }, whatsNextHandler);
    // Alias for design parity naming.
    server.tool("whats_next", "Get the ranked list of most important tasks to work on next", {
        limit: zod_1.z.number().int().positive().max(200).optional()
    }, whatsNextHandler);
}
