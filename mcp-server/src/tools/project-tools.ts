import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiClient } from "../lib/api-client.js";

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

                const response = await apiClient.get("/projects", { params });
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
            categories: z.array(z.string()).min(1),
            workflow_type: z.enum(["flat", "planned"]),
            owner_id: z.string()
        },
        async (args) => {
            try {
                const response = await apiClient.post("/projects", args);
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

    const getProjectHandler = async ({ id, project_id }: { id?: string; project_id?: string }): Promise<any> => {
        const targetId = id || project_id;
        if (!targetId) {
            return {
                content: [{ type: "text", text: "Error getting project details: missing project id" }],
                isError: true
            };
        }
        try {
            const response = await apiClient.get(`/projects/${targetId}`);
            const project = response.data?.data ?? response.data;
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(project, null, 2)
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
    };

    server.tool(
        "get_project",
        "Get detailed information about a specific project including current plan and health",
        {
            id: z.string().uuid().optional(),
            project_id: z.string().uuid().optional()
        },
        getProjectHandler
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
                const response = await apiClient.patch(`/projects/${id}`, updates);
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
