"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskTools = registerTaskTools;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";
function registerTaskTools(server) {
    server.tool("list_tasks", "List tasks with filtering options", {
        project_id: zod_1.z.string().uuid().optional(),
        status: zod_1.z.enum(["pending", "in_progress", "blocked", "done"]).optional(),
        limit: zod_1.z.number().optional()
    }, async ({ project_id, status, limit }) => {
        try {
            const params = {};
            if (project_id)
                params.project_id = project_id;
            if (status)
                params.status = status;
            const response = await axios_1.default.get(`${API_BASE_URL}/tasks`, { params });
            const tasks = response.data.data.slice(0, limit || 50);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tasks, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error listing tasks: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    });
    server.tool("create_task", "Create a new task", {
        project_id: zod_1.z.string().uuid(),
        title: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        priority: zod_1.z.enum(["P1", "P2", "P3"]).optional(),
        status: zod_1.z.enum(["pending", "in_progress", "blocked"]).default("pending"),
        plan_id: zod_1.z.string().uuid().optional().describe("Required for planned projects"),
        owner_id: zod_1.z.string().optional()
    }, async (args) => {
        try {
            const response = await axios_1.default.post(`${API_BASE_URL}/tasks`, args);
            return {
                content: [
                    {
                        type: "text",
                        text: `Task created: ${JSON.stringify(response.data.data, null, 2)}`
                    }
                ]
            };
        }
        catch (error) {
            // Try to extract detailed error from API response if possible
            const detail = error.response?.data?.error || error.message;
            return {
                content: [
                    {
                        type: "text",
                        text: `Error creating task: ${detail}`
                    }
                ],
                isError: true
            };
        }
    });
    server.tool("update_task", "Update task details", {
        id: zod_1.z.string().uuid(),
        title: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(["pending", "in_progress", "blocked", "done"]).optional(),
        priority: zod_1.z.enum(["P1", "P2", "P3"]).optional()
    }, async ({ id, ...updates }) => {
        try {
            const response = await axios_1.default.patch(`${API_BASE_URL}/tasks/${id}`, updates);
            return {
                content: [
                    {
                        type: "text",
                        text: `Task updated: ${JSON.stringify(response.data.data, null, 2)}`
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error updating task: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    });
    server.tool("complete_task", "Mark a task as complete with an outcome", {
        id: zod_1.z.string().uuid(),
        outcome: zod_1.z.string().optional()
    }, async ({ id, outcome }) => {
        try {
            const response = await axios_1.default.post(`${API_BASE_URL}/tasks/${id}/complete`, { outcome });
            return {
                content: [
                    {
                        type: "text",
                        text: `Task completed: ${JSON.stringify(response.data.data, null, 2)}`
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error completing task: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    });
}
