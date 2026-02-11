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
    server.tool("search_work", "Search for tasks and backlog items using full text search", {
        query: zod_1.z.string().min(1)
    }, async ({ query }) => {
        try {
            const response = await axios_1.default.get(`${API_BASE_URL}/search`, { params: { q: query } });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response.data.data, null, 2)
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
    });
    server.tool("get_whats_next", "Get the ranked list of most important tasks to work on next", {}, async () => {
        try {
            const response = await axios_1.default.get(`${API_BASE_URL}/whats-next`);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response.data.data, null, 2)
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
    });
}
