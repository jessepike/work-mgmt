import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";

export function registerProjectTools(server: McpServer) {
    server.tool(
        "list_projects",
        "List all projects, optionally filtered by status",
        {
            status: z.enum(["active", "archived", "paused", "completed"]).optional(),
            limit: z.number().optional()
        },
        async ({ status, limit }) => {
            try {
                const params: any = {};
                if (status) params.status = status;

                const response = await axios.get(`${API_BASE_URL}/projects`, { params });
                const projects = response.data.data.slice(0, limit || 50);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(projects, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
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
        }
    );

    server.tool(
        "create_project",
        "Create a new project",
        {
            name: z.string(),
            description: z.string().optional(),
            project_type: z.enum(["connected", "native"]),
            categories: z.array(z.string()).optional()
        },
        async (args) => {
            try {
                const response = await axios.post(`${API_BASE_URL}/projects`, args);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Project created: ${JSON.stringify(response.data.data, null, 2)}`
                        }
                    ]
                };
            } catch (error: any) {
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
        }
    );

    server.tool(
        "get_project_details",
        "Get detailed information about a specific project including current plan and health",
        {
            id: z.string().uuid()
        },
        async ({ id }) => {
            try {
                const response = await axios.get(`${API_BASE_URL}/projects/${id}`);
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
                            text: `Error getting project details: ${error.message}`
                        }
                    ],
                    isError: true
                };
            }
        }
    );

    server.tool(
        "update_project",
        "Update project details",
        {
            id: z.string().uuid(),
            name: z.string().optional(),
            description: z.string().optional(),
            status: z.enum(["active", "archived", "paused", "completed"]).optional()
        },
        async ({ id, ...updates }) => {
            try {
                const response = await axios.patch(`${API_BASE_URL}/projects/${id}`, updates);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Project updated: ${JSON.stringify(response.data.data, null, 2)}`
                        }
                    ]
                };
            } catch (error: any) {
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
        }
    );
}
