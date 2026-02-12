import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiClient } from "../lib/api-client.js";

export function registerQueryTools(server: McpServer) {
    const getStatusHandler = async (): Promise<any> => {
        const response = await apiClient.get("/projects/status");
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    };

    server.tool(
        "get_portfolio_status",
        "Get a high-level summary of all active projects, health signals, and upcoming deadlines across the portfolio",
        {},
        getStatusHandler
    );

    // Alias for design parity naming.
    server.tool(
        "get_status",
        "Get a high-level summary of all active projects, health signals, and upcoming deadlines across the portfolio",
        {
            project_id: z.string().uuid().optional()
        },
        async (): Promise<any> => getStatusHandler()
    );

    const getBlockersHandler = async ({ project_id }: { project_id?: string }): Promise<any> => {
        const response = await apiClient.get("/blockers");
        const blockers = response.data?.data ?? [];
        const filtered = project_id
            ? blockers.filter((item: any) => item.project_id === project_id || item.project?.id === project_id)
            : blockers;
        return {
            content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }]
        };
    };

    server.tool(
        "list_blockers",
        "List all blocked tasks across all active projects",
        {},
        async (): Promise<any> => getBlockersHandler({})
    );

    // Alias for design parity naming.
    server.tool(
        "get_blockers",
        "List all blocked tasks across all active projects",
        {
            project_id: z.string().uuid().optional()
        },
        getBlockersHandler
    );

    const getDeadlinesHandler = async (): Promise<any> => {
        const response = await apiClient.get("/deadlines");
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    };

    server.tool(
        "list_deadlines",
        "List upcoming task deadlines across all projects",
        {},
        getDeadlinesHandler
    );

    // Alias for design parity naming.
    server.tool(
        "get_deadlines",
        "List upcoming task deadlines across all projects",
        {
            limit: z.number().int().positive().max(200).optional()
        },
        async ({ limit }): Promise<any> => {
            const response = await apiClient.get("/deadlines");
            const items = response.data?.data ?? [];
            return {
                content: [{ type: "text", text: JSON.stringify(limit ? items.slice(0, limit) : items, null, 2) }]
            };
        }
    );

    server.tool(
        "get_activity_by_project",
        "Get activity log entries filtered by project id when possible",
        {
            project_id: z.string().uuid(),
            limit: z.number().int().positive().max(200).optional()
        },
        async ({ project_id, limit }): Promise<any> => {
            const params: Record<string, string | number> = { entity_id: project_id };
            if (limit) params.limit = limit;
            const response = await apiClient.get("/activity", { params });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );

    server.tool(
        "get_activity",
        "Get activity log entries, optionally filtered by actor or entity",
        {
            actor_id: z.string().uuid().optional(),
            entity_id: z.string().uuid().optional(),
            entity_type: z.string().optional(),
            limit: z.number().int().positive().max(200).optional()
        },
        async ({ actor_id, entity_id, limit }): Promise<any> => {
            const params: Record<string, string | number> = {};
            if (actor_id) params.actor_id = actor_id;
            if (entity_id) params.entity_id = entity_id;
            if (limit) params.limit = limit;

            const response = await apiClient.get("/activity", { params });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );

    server.tool(
        "get_sync_quality",
        "Get sync-quality trust metrics for connected projects (freshness, source-id integrity, duplicate signals)",
        {
            project_id: z.string().uuid().optional(),
            scope: z.enum(['enabled']).optional(),
            stale_hours: z.number().int().positive().max(24 * 30).optional(),
            include_unconfigured: z.boolean().optional()
        },
        async ({ project_id, scope, stale_hours, include_unconfigured }): Promise<any> => {
            const params: Record<string, string | number> = {};
            if (project_id) params.project_id = project_id;
            if (scope) params.scope = scope;
            if (stale_hours) params.stale_hours = stale_hours;
            if (include_unconfigured) params.include_unconfigured = 1;

            const response = await apiClient.get("/sync-quality", { params });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );

    server.tool(
        "get_portfolio_trust",
        "Get merged portfolio status + sync quality trust metrics in a single response",
        {
            scope: z.enum(['enabled']).optional(),
            stale_hours: z.number().int().positive().max(24 * 30).optional()
        },
        async ({ scope, stale_hours }): Promise<any> => {
            const params: Record<string, string | number> = {};
            if (scope) params.scope = scope;
            if (stale_hours) params.stale_hours = stale_hours;
            const response = await apiClient.get("/portfolio-trust", { params });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
            };
        }
    );
}
