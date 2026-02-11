"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQueryTools = registerQueryTools;
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";
function registerQueryTools(server) {
    server.tool("get_portfolio_status", "Get a high-level summary of all active projects, health signals, and upcoming deadlines across the portfolio", {}, async () => {
        const response = await axios_1.default.get(`${API_BASE_URL}/projects/status`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
    server.tool("list_blockers", "List all blocked tasks across all active projects", {}, async () => {
        const response = await axios_1.default.get(`${API_BASE_URL}/blockers`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
    server.tool("list_deadlines", "List upcoming task deadlines across all projects", {}, async () => {
        const response = await axios_1.default.get(`${API_BASE_URL}/deadlines`);
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
}
