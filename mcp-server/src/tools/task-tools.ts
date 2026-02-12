import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiClient } from "../lib/api-client.js";

export function registerTaskTools(server: McpServer) {
    server.tool(
        "list_tasks",
        "List tasks with filtering options",
        {
            project_id: z.string().uuid().optional(),
            status: z.enum(["pending", "in_progress", "blocked", "done"]).optional(),
            limit: z.number().optional()
        },
        async ({ project_id, status, limit }) => {
            try {
                const params: any = {};
                if (project_id) params.project_id = project_id;
                if (status) params.status = status;

                const response = await apiClient.get("/tasks", { params });
                const tasks = response.data.data.slice(0, limit || 50);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(tasks, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
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
        }
    );

    const getTaskHandler = async ({ id, task_id }: { id?: string; task_id?: string }): Promise<any> => {
        const targetId = id || task_id;
        if (!targetId) {
            return {
                content: [{ type: "text", text: "Error getting task: missing task id" }],
                isError: true
            };
        }
        try {
            const response = await apiClient.get(`/tasks/${targetId}`);
            const task = response.data?.data ?? response.data;
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(task, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error getting task: ${error.response?.data?.error || error.message}`
                    }
                ],
                isError: true
            };
        }
    };

    server.tool(
        "get_task",
        "Get details for a specific task",
        {
            id: z.string().uuid().optional(),
            task_id: z.string().uuid().optional()
        },
        getTaskHandler
    );

    server.tool(
        "create_task",
        "Create a new task",
        {
            project_id: z.string().uuid(),
            title: z.string(),
            description: z.string().optional(),
            priority: z.enum(["P1", "P2", "P3"]).optional(),
            status: z.enum(["pending", "in_progress", "blocked"]).default("pending"),
            plan_id: z.string().uuid().optional().describe("Required for planned projects"),
            owner_id: z.string().optional()
        },
        async (args) => {
            try {
                const response = await apiClient.post("/tasks", args);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task created: ${JSON.stringify(response.data.data, null, 2)}`
                        }
                    ]
                };
            } catch (error: any) {
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
        }
    );

    server.tool(
        "update_task",
        "Update task details",
        {
            id: z.string().uuid(),
            title: z.string().optional(),
            description: z.string().optional(),
            status: z.enum(["pending", "in_progress", "blocked", "done"]).optional(),
            priority: z.enum(["P1", "P2", "P3"]).optional()
        },
        async ({ id, ...updates }) => {
            try {
                const response = await apiClient.patch(`/tasks/${id}`, updates);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task updated: ${JSON.stringify(response.data.data, null, 2)}`
                        }
                    ]
                };
            } catch (error: any) {
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
        }
    );

    server.tool(
        "complete_task",
        "Mark a task as complete with an outcome",
        {
            id: z.string().uuid(),
            outcome: z.string().optional()
        },
        async ({ id, outcome }) => {
            try {
                const response = await apiClient.post(`/tasks/${id}/complete`, { outcome });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task completed: ${JSON.stringify(response.data.data, null, 2)}`
                        }
                    ]
                };
            } catch (error: any) {
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
        }
    );

    server.tool(
        "validate_task",
        "Validate a task with passed/failed status",
        {
            id: z.string().uuid(),
            status: z.enum(["passed", "failed"]),
            validated_by: z.string().optional()
        },
        async ({ id, status, validated_by }) => {
            try {
                const response = await apiClient.post(`/tasks/${id}/validate`, {
                    status,
                    validated_by
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Task validated: ${JSON.stringify(response.data.data, null, 2)}`
                        }
                    ]
                };
            } catch (error: any) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error validating task: ${error.response?.data?.error || error.message}`
                        }
                    ],
                    isError: true
                };
            }
        }
    );
}
