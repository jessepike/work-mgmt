"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProjectTools = registerProjectTools;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_URL || "http://localhost:3000/api";
function registerProjectTools(server) {
    server.tool("list_projects", "List all projects, optionally filtered by status", {
        status: zod_1.z.enum(["active", "archived", "paused", "completed"]).optional(),
        limit: zod_1.z.number().optional()
    }, async ({ status, limit }) => {
        try {
            const params = {};
            if (status)
                params.status = status;
            const response = await axios_1.default.get(`${API_BASE_URL}/projects`, { params });
            const projects = response.data.data.slice(0, limit || 50);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(projects, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error listing projects: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    });
    server.tool("create_project", "Create a new project", {
        name: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        project_type: zod_1.z.enum(["connected", "native"]),
        categories: zod_1.z.array(zod_1.z.string()).optional()
    }, async (args) => {
        try {
            const response = await axios_1.default.post(`${API_BASE_URL}/projects`, args);
            return {
                content: [
                    {
                        type: "text",
                        text: `Project created: ${JSON.stringify(response.data.data, null, 2)}`
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error creating project: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    });
    server.tool("get_project_details", "Get detailed information about a specific project including current plan and health", {
        id: zod_1.z.string().uuid()
    }, async ({ id }) => {
        try {
            const response = await axios_1.default.get(`${API_BASE_URL}/projects/${id}`);
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
                        text: `Error getting project details: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    });
    server.tool("update_project", "Update project details", {
        id: zod_1.z.string().uuid(),
        name: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(["active", "archived", "paused", "completed"]).optional()
    }, async ({ id, ...updates }) => {
        try {
            const response = await axios_1.default.patch(`${API_BASE_URL}/projects/${id}`, updates);
            return {
                content: [
                    {
                        type: "text",
                        text: `Project updated: ${JSON.stringify(response.data.data, null, 2)}`
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error updating project: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    });
}
