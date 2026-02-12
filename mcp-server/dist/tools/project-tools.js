"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProjectTools = registerProjectTools;
const zod_1 = require("zod");
const api_client_js_1 = require("../lib/api-client.js");
function registerProjectTools(server) {
    server.tool("list_projects", "List all projects, optionally filtered by status", {
        status: zod_1.z.enum(["active", "archived", "paused", "completed"]).optional(),
        limit: zod_1.z.number().optional()
    }, async ({ status, limit }) => {
        try {
            const params = {};
            if (status)
                params.status = status;
            const response = await api_client_js_1.apiClient.get("/projects", { params });
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
        categories: zod_1.z.array(zod_1.z.string()).min(1),
        workflow_type: zod_1.z.enum(["flat", "planned"]),
        owner_id: zod_1.z.string()
    }, async (args) => {
        try {
            const response = await api_client_js_1.apiClient.post("/projects", args);
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
    const getProjectHandler = async ({ id, project_id }) => {
        const targetId = id || project_id;
        if (!targetId) {
            return {
                content: [{ type: "text", text: "Error getting project details: missing project id" }],
                isError: true
            };
        }
        try {
            const response = await api_client_js_1.apiClient.get(`/projects/${targetId}`);
            const project = response.data?.data ?? response.data;
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(project, null, 2)
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
    };
    server.tool("get_project_details", "Get detailed information about a specific project including current plan and health", {
        id: zod_1.z.string().uuid().optional(),
        project_id: zod_1.z.string().uuid().optional()
    }, getProjectHandler);
    // Alias for interface parity with original design naming.
    server.tool("get_project", "Get detailed information about a specific project including current plan and health", {
        id: zod_1.z.string().uuid().optional(),
        project_id: zod_1.z.string().uuid().optional()
    }, getProjectHandler);
    server.tool("update_project", "Update project details", {
        id: zod_1.z.string().uuid(),
        name: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        status: zod_1.z.enum(["active", "archived", "paused", "completed"]).optional()
    }, async ({ id, ...updates }) => {
        try {
            const response = await api_client_js_1.apiClient.patch(`/projects/${id}`, updates);
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
