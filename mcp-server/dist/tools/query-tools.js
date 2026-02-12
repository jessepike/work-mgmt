"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQueryTools = registerQueryTools;
const zod_1 = require("zod");
const api_client_js_1 = require("../lib/api-client.js");
function registerQueryTools(server) {
    const getStatusHandler = async () => {
        const response = await api_client_js_1.apiClient.get("/projects/status");
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    };
    server.tool("get_portfolio_status", "Get a high-level summary of all active projects, health signals, and upcoming deadlines across the portfolio", {}, getStatusHandler);
    // Alias for design parity naming.
    server.tool("get_status", "Get a high-level summary of all active projects, health signals, and upcoming deadlines across the portfolio", {
        project_id: zod_1.z.string().uuid().optional()
    }, async () => getStatusHandler());
    const getBlockersHandler = async ({ project_id }) => {
        const response = await api_client_js_1.apiClient.get("/blockers");
        const blockers = response.data?.data ?? [];
        const filtered = project_id
            ? blockers.filter((item) => item.project_id === project_id || item.project?.id === project_id)
            : blockers;
        return {
            content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }]
        };
    };
    server.tool("list_blockers", "List all blocked tasks across all active projects", {}, async () => getBlockersHandler({}));
    // Alias for design parity naming.
    server.tool("get_blockers", "List all blocked tasks across all active projects", {
        project_id: zod_1.z.string().uuid().optional()
    }, getBlockersHandler);
    const getDeadlinesHandler = async () => {
        const response = await api_client_js_1.apiClient.get("/deadlines");
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    };
    server.tool("list_deadlines", "List upcoming task deadlines across all projects", {}, getDeadlinesHandler);
    // Alias for design parity naming.
    server.tool("get_deadlines", "List upcoming task deadlines across all projects", {
        limit: zod_1.z.number().int().positive().max(200).optional()
    }, async ({ limit }) => {
        const response = await api_client_js_1.apiClient.get("/deadlines");
        const items = response.data?.data ?? [];
        return {
            content: [{ type: "text", text: JSON.stringify(limit ? items.slice(0, limit) : items, null, 2) }]
        };
    });
    server.tool("get_activity_by_project", "Get activity log entries filtered by project id when possible", {
        project_id: zod_1.z.string().uuid(),
        limit: zod_1.z.number().int().positive().max(200).optional()
    }, async ({ project_id, limit }) => {
        const params = { entity_id: project_id };
        if (limit)
            params.limit = limit;
        const response = await api_client_js_1.apiClient.get("/activity", { params });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
    server.tool("get_activity", "Get activity log entries, optionally filtered by actor or entity", {
        actor_id: zod_1.z.string().uuid().optional(),
        entity_id: zod_1.z.string().uuid().optional(),
        entity_type: zod_1.z.string().optional(),
        limit: zod_1.z.number().int().positive().max(200).optional()
    }, async ({ actor_id, entity_id, limit }) => {
        const params = {};
        if (actor_id)
            params.actor_id = actor_id;
        if (entity_id)
            params.entity_id = entity_id;
        if (limit)
            params.limit = limit;
        const response = await api_client_js_1.apiClient.get("/activity", { params });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
    server.tool("get_sync_quality", "Get sync-quality trust metrics for connected projects (freshness, source-id integrity, duplicate signals)", {
        project_id: zod_1.z.string().uuid().optional(),
        scope: zod_1.z.enum(['enabled']).optional(),
        stale_hours: zod_1.z.number().int().positive().max(24 * 30).optional(),
        include_unconfigured: zod_1.z.boolean().optional()
    }, async ({ project_id, scope, stale_hours, include_unconfigured }) => {
        const params = {};
        if (project_id)
            params.project_id = project_id;
        if (scope)
            params.scope = scope;
        if (stale_hours)
            params.stale_hours = stale_hours;
        if (include_unconfigured)
            params.include_unconfigured = 1;
        const response = await api_client_js_1.apiClient.get("/sync-quality", { params });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
    server.tool("get_portfolio_trust", "Get merged portfolio status + sync quality trust metrics in a single response", {
        scope: zod_1.z.enum(['enabled']).optional(),
        stale_hours: zod_1.z.number().int().positive().max(24 * 30).optional()
    }, async ({ scope, stale_hours }) => {
        const params = {};
        if (scope)
            params.scope = scope;
        if (stale_hours)
            params.stale_hours = stale_hours;
        const response = await api_client_js_1.apiClient.get("/portfolio-trust", { params });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data.data, null, 2) }]
        };
    });
}
