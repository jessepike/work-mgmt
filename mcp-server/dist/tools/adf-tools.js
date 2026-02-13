"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdfTools = registerAdfTools;
const zod_1 = require("zod");
const api_client_js_1 = require("../lib/api-client.js");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const parser_js_1 = require("../adf/parser.js");
async function findFile(projectPath, candidates) {
    for (const rel of candidates) {
        const full = path_1.default.join(projectPath, rel);
        try {
            await promises_1.default.access(full);
            return full;
        }
        catch {
            // continue
        }
    }
    return "";
}
async function parseIntentSummary(filePath) {
    if (!filePath)
        return null;
    try {
        const content = (await promises_1.default.readFile(filePath, "utf-8")).replace(/\r/g, "");
        const lines = content.split("\n");
        let inFrontmatter = false;
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line)
                continue;
            if (line === "---") {
                inFrontmatter = !inFrontmatter;
                continue;
            }
            if (inFrontmatter)
                continue;
            if (line.startsWith("#"))
                continue;
            const cleaned = line.replace(/^[-*]\s+/, "").trim();
            if (/^[a-z0-9_]+\s*:/i.test(cleaned))
                continue;
            if (cleaned.length >= 24)
                return cleaned.slice(0, 220);
        }
    }
    catch {
        return null;
    }
    return null;
}
function parseTargetsFromEnv() {
    const raw = process.env.SYNC_INGEST_TARGETS || "";
    if (!raw.trim())
        return [];
    return raw
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
        const idx = item.indexOf("=");
        if (idx === -1)
            return null;
        return {
            projectKey: item.slice(0, idx).trim(),
            localPath: item.slice(idx + 1).trim(),
        };
    })
        .filter((v) => !!v && !!v.projectKey && !!v.localPath);
}
function resolveProjectId(projects, key) {
    const byId = projects.find((p) => p.id === key);
    if (byId)
        return byId.id;
    const lower = key.toLowerCase();
    const byName = projects.find((p) => (p.name || "").toLowerCase() === lower);
    return byName?.id || null;
}
async function syncProjectViaIngest(projectId, localPath) {
    const resolvedPath = path_1.default.resolve(localPath);
    const tasksFile = await findFile(resolvedPath, [
        "tasks.md",
        "task.md",
        "docs/tasks.md",
        "docs/task.md",
        "docs/adf/tasks.md",
        "docs/adf/task.md",
    ]);
    const backlogFile = await findFile(resolvedPath, [
        "BACKLOG.md",
        "backlog.md",
        "docs/BACKLOG.md",
        "docs/backlog.md",
        "docs/adf/BACKLOG.md",
        "docs/adf/backlog.md",
    ]);
    const statusFile = await findFile(resolvedPath, [
        "status.md",
        "docs/status.md",
        "docs/adf/status.md",
    ]);
    const intentFile = await findFile(resolvedPath, [
        "intent.md",
        "docs/intent.md",
        "docs/adf/intent.md",
    ]);
    const tasks = tasksFile ? await (0, parser_js_1.parseTasksMd)(tasksFile) : [];
    const backlog = backlogFile ? await (0, parser_js_1.parseBacklogMd)(backlogFile) : [];
    const status = statusFile ? await (0, parser_js_1.parseStatusMd)(statusFile) : null;
    const intentSummary = await parseIntentSummary(intentFile);
    await api_client_js_1.apiClient.post("/connectors", {
        project_id: projectId,
        connector_type: "adf",
        status: "active",
        config: { path: resolvedPath },
    });
    const response = await api_client_js_1.apiClient.post("/connectors/ingest", {
        project_id: projectId,
        repo_path: resolvedPath,
        tasks,
        backlog,
        status,
        intent_summary: intentSummary,
    });
    const data = response.data || {};
    return {
        project_id: projectId,
        local_path: resolvedPath,
        parsed_tasks: tasks.length,
        parsed_backlog: backlog.length,
        synced_tasks: data.tasks_count || 0,
        synced_backlog: data.backlog_count || 0,
        status_synced: !!data.status_synced,
    };
}
function registerAdfTools(server) {
    server.tool("discover_local_projects", "Scan a directory for ADF projects (look for status.md files)", {
        base_dir: zod_1.z.string().describe("The root directory to scan (e.g. /Users/jessepike/code/_shared)"),
    }, async ({ base_dir }) => {
        try {
            const entries = await promises_1.default.readdir(base_dir, { withFileTypes: true });
            const projects = [];
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const projectPath = path_1.default.join(base_dir, entry.name);
                const statusPath = path_1.default.join(projectPath, "status.md");
                const docsStatusPath = path_1.default.join(projectPath, "docs", "status.md");
                const adfDocsStatusPath = path_1.default.join(projectPath, "docs", "adf", "status.md");
                let finalStatusPath = "";
                try {
                    await promises_1.default.access(adfDocsStatusPath);
                    finalStatusPath = adfDocsStatusPath;
                }
                catch {
                    try {
                        await promises_1.default.access(docsStatusPath);
                        finalStatusPath = docsStatusPath;
                    }
                    catch {
                        try {
                            await promises_1.default.access(statusPath);
                            finalStatusPath = statusPath;
                        }
                        catch {
                            // no status file
                        }
                    }
                }
                if (!finalStatusPath)
                    continue;
                let initializationStatus = "legacy";
                try {
                    const content = await promises_1.default.readFile(finalStatusPath, "utf-8");
                    if (content.includes('type: "status"') || content.includes('type: "brief"')) {
                        initializationStatus = "adf-initialized";
                    }
                    else if (finalStatusPath.includes("adf")) {
                        initializationStatus = "adf-partial";
                    }
                }
                catch {
                    // ignore
                }
                projects.push({
                    name: entry.name,
                    path: projectPath,
                    initialization_status: initializationStatus,
                    status_file: path_1.default.relative(projectPath, finalStatusPath),
                });
            }
            return {
                content: [{
                        type: "text",
                        text: `Found ${projects.length} potential projects:\n\n${projects
                            .map((p) => `- [${p.initialization_status.toUpperCase()}] ${p.name} (${p.path})`)
                            .join("\n")}`,
                    }],
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: `Error scanning directory: ${error.message}` }], isError: true };
        }
    });
    server.tool("connect_local_project", "Bind a local directory to a project in the database. Creates/updates an 'adf' connector.", {
        project_id: zod_1.z.string().uuid(),
        local_path: zod_1.z.string().describe("Absolute path to the project root"),
    }, async ({ project_id, local_path }) => {
        try {
            const existingRes = await api_client_js_1.apiClient.get(`/projects/${project_id}`);
            const project = existingRes.data.data;
            const response = await api_client_js_1.apiClient.post("/connectors", {
                project_id,
                connector_type: "adf",
                status: "active",
                config: { path: path_1.default.resolve(local_path) },
            });
            return {
                content: [{ type: "text", text: `Connected ${project.name} -> ${local_path}. Connector ID: ${response.data.data.id}` }],
            };
        }
        catch (error) {
            return { content: [{ type: "text", text: `Error connecting project: ${error.message}` }], isError: true };
        }
    });
    server.tool("sync_adf_project", "Parse local ADF files for one project and ingest to API (prod-safe). Uses connector config.path unless local_path is provided.", {
        project_id: zod_1.z.string().uuid().describe("Project ID to sync"),
        local_path: zod_1.z.string().optional().describe("Optional absolute path override; otherwise uses connector config.path"),
    }, async ({ project_id, local_path }) => {
        try {
            let effectivePath = local_path?.trim() || "";
            if (!effectivePath) {
                const connectorsRes = await api_client_js_1.apiClient.get("/connectors", { params: { project_id, connector_type: "adf" } });
                const connector = (connectorsRes.data?.data || [])[0];
                effectivePath = connector?.config?.path?.trim() || "";
            }
            if (!effectivePath) {
                return {
                    content: [{
                            type: "text",
                            text: "Error syncing project: no local path found. Set connector config.path via connect_local_project or pass local_path.",
                        }],
                    isError: true,
                };
            }
            const result = await syncProjectViaIngest(project_id, effectivePath);
            return {
                content: [{
                        type: "text",
                        text: `Sync complete for ${project_id} from ${result.local_path}. tasks=${result.synced_tasks}, backlog=${result.synced_backlog}, status=${result.status_synced}`,
                    }],
            };
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            return { content: [{ type: "text", text: `Error syncing project: ${message}` }], isError: true };
        }
    });
    server.tool("sync_adf_projects", "Batch sync multiple ADF projects using local paths from connector config.path or SYNC_INGEST_TARGETS.", {
        project_ids: zod_1.z.array(zod_1.z.string().uuid()).optional().describe("Optional explicit project IDs to sync"),
        project_names: zod_1.z.array(zod_1.z.string()).optional().describe("Optional explicit project names to sync"),
        limit: zod_1.z.number().int().min(1).max(100).default(25),
    }, async ({ project_ids, project_names, limit }) => {
        try {
            const projectsRes = await api_client_js_1.apiClient.get("/projects");
            const projects = (projectsRes.data?.data || []);
            const connectorsRes = await api_client_js_1.apiClient.get("/connectors", { params: { connector_type: "adf" } });
            const connectors = (connectorsRes.data?.data || []);
            const activeConnectors = connectors.filter((c) => c.status === "active");
            const connectorPathByProjectId = new Map();
            for (const c of activeConnectors) {
                const pathValue = c.config?.path?.trim();
                if (pathValue)
                    connectorPathByProjectId.set(c.project_id, pathValue);
            }
            const envTargets = parseTargetsFromEnv();
            const envPathByProjectId = new Map();
            for (const target of envTargets) {
                const projectId = resolveProjectId(projects, target.projectKey);
                if (projectId)
                    envPathByProjectId.set(projectId, path_1.default.resolve(target.localPath));
            }
            let selectedProjectIds = [];
            if ((project_ids || []).length > 0) {
                selectedProjectIds = [...(project_ids || [])];
            }
            else if ((project_names || []).length > 0) {
                selectedProjectIds = (project_names || [])
                    .map((name) => resolveProjectId(projects, name))
                    .filter((v) => !!v);
            }
            else {
                selectedProjectIds = Array.from(new Set([...connectorPathByProjectId.keys(), ...envPathByProjectId.keys()]));
            }
            selectedProjectIds = selectedProjectIds.slice(0, limit);
            if (selectedProjectIds.length === 0) {
                return {
                    content: [{
                            type: "text",
                            text: "No sync targets resolved. Provide project_ids/project_names or configure connector paths/SYNC_INGEST_TARGETS.",
                        }],
                };
            }
            const results = [];
            const failures = [];
            for (const projectId of selectedProjectIds) {
                const projectName = projects.find((p) => p.id === projectId)?.name;
                const localRepoPath = connectorPathByProjectId.get(projectId) || envPathByProjectId.get(projectId);
                if (!localRepoPath) {
                    failures.push({ project_id: projectId, error: "No local path found" });
                    continue;
                }
                try {
                    const result = await syncProjectViaIngest(projectId, localRepoPath);
                    results.push({ ...result, project_name: projectName });
                }
                catch (error) {
                    const message = error.response?.data?.error || error.message || String(error);
                    failures.push({ project_id: projectId, error: message });
                }
            }
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            synced: results.length,
                            failed: failures.length,
                            results,
                            failures,
                        }, null, 2),
                    }],
                isError: failures.length > 0,
            };
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            return { content: [{ type: "text", text: `Error batch syncing projects: ${message}` }], isError: true };
        }
    });
    server.tool("sync_enabled_adf_projects", "Sync all enabled connected ADF projects (as configured in the app) using local connector paths/environment mappings.", {}, async () => {
        try {
            const projectsRes = await api_client_js_1.apiClient.get("/projects", {
                params: { status: "active", scope: "enabled" },
            });
            const projects = (projectsRes.data?.data || []);
            const enabledConnected = projects.filter((p) => p.project_type === "connected");
            const connectorsRes = await api_client_js_1.apiClient.get("/connectors", { params: { connector_type: "adf" } });
            const connectors = (connectorsRes.data?.data || []);
            const activeConnectors = connectors.filter((c) => c.status === "active");
            const connectorPathByProjectId = new Map();
            for (const c of activeConnectors) {
                const pathValue = c.config?.path?.trim();
                if (pathValue)
                    connectorPathByProjectId.set(c.project_id, pathValue);
            }
            const envTargets = parseTargetsFromEnv();
            const envPathByProjectId = new Map();
            for (const target of envTargets) {
                const projectId = resolveProjectId(projects, target.projectKey);
                if (projectId)
                    envPathByProjectId.set(projectId, path_1.default.resolve(target.localPath));
            }
            const results = [];
            const failures = [];
            for (const project of enabledConnected) {
                const localRepoPath = connectorPathByProjectId.get(project.id) || envPathByProjectId.get(project.id);
                if (!localRepoPath) {
                    failures.push({
                        project_id: project.id,
                        project_name: project.name,
                        error: "No local path found for enabled connected project",
                    });
                    continue;
                }
                try {
                    const result = await syncProjectViaIngest(project.id, localRepoPath);
                    results.push({ ...result, project_name: project.name });
                }
                catch (error) {
                    failures.push({
                        project_id: project.id,
                        project_name: project.name,
                        error: error.response?.data?.error || error.message || String(error),
                    });
                }
            }
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            enabled_connected_projects: enabledConnected.length,
                            synced: results.length,
                            failed: failures.length,
                            results,
                            failures,
                        }, null, 2),
                    }],
                isError: failures.length > 0,
            };
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            return { content: [{ type: "text", text: `Error syncing enabled projects: ${message}` }], isError: true };
        }
    });
    server.tool("governed_writeback_task", "Write changes for a synced task back to its ADF source file with conflict checks. Use dry_run=true first.", {
        project_id: zod_1.z.string().uuid(),
        task_id: zod_1.z.string().uuid(),
        status: zod_1.z.enum(["pending", "in_progress", "blocked", "done"]).optional(),
        priority: zod_1.z.enum(["P1", "P2", "P3"]).optional(),
        title: zod_1.z.string().optional(),
        expected_updated_at: zod_1.z.string().optional(),
        dry_run: zod_1.z.boolean().default(true),
        strict_conflicts: zod_1.z.boolean().default(true),
    }, async ({ project_id, task_id, status, priority, title, expected_updated_at, dry_run, strict_conflicts }) => {
        try {
            const patch = {};
            if (status)
                patch.status = status;
            if (priority)
                patch.priority = priority;
            if (title)
                patch.title = title;
            const response = await api_client_js_1.apiClient.post("/connectors/writeback", {
                project_id,
                dry_run,
                strict_conflicts,
                operations: [
                    {
                        entity_type: "task",
                        entity_id: task_id,
                        expected_updated_at,
                        patch,
                    },
                ],
            });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data?.data || response.data, null, 2) }],
            };
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            const detail = error.response?.data ? `\n${JSON.stringify(error.response.data, null, 2)}` : "";
            return { content: [{ type: "text", text: `Error writeback task: ${message}${detail}` }], isError: true };
        }
    });
    server.tool("governed_writeback_backlog_item", "Write changes for a synced backlog item back to ADF source with conflict checks. Use dry_run=true first.", {
        project_id: zod_1.z.string().uuid(),
        backlog_item_id: zod_1.z.string().uuid(),
        status: zod_1.z.enum(["captured", "triaged", "prioritized", "promoted", "archived"]).optional(),
        priority: zod_1.z.enum(["P1", "P2", "P3"]).optional(),
        title: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        expected_updated_at: zod_1.z.string().optional(),
        dry_run: zod_1.z.boolean().default(true),
        strict_conflicts: zod_1.z.boolean().default(true),
    }, async ({ project_id, backlog_item_id, status, priority, title, description, expected_updated_at, dry_run, strict_conflicts }) => {
        try {
            const patch = {};
            if (status)
                patch.status = status;
            if (priority)
                patch.priority = priority;
            if (title)
                patch.title = title;
            if (description !== undefined)
                patch.description = description;
            const response = await api_client_js_1.apiClient.post("/connectors/writeback", {
                project_id,
                dry_run,
                strict_conflicts,
                operations: [
                    {
                        entity_type: "backlog_item",
                        entity_id: backlog_item_id,
                        expected_updated_at,
                        patch,
                    },
                ],
            });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data?.data || response.data, null, 2) }],
            };
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            const detail = error.response?.data ? `\n${JSON.stringify(error.response.data, null, 2)}` : "";
            return { content: [{ type: "text", text: `Error writeback backlog item: ${message}${detail}` }], isError: true };
        }
    });
    server.tool("governed_writeback_status", "Write project status fields (current_stage/focus) back to status.md with conflict checks. Use dry_run=true first.", {
        project_id: zod_1.z.string().uuid(),
        current_stage: zod_1.z.string().optional(),
        focus: zod_1.z.string().optional(),
        dry_run: zod_1.z.boolean().default(true),
        strict_conflicts: zod_1.z.boolean().default(true),
    }, async ({ project_id, current_stage, focus, dry_run, strict_conflicts }) => {
        try {
            const patch = {};
            if (current_stage)
                patch.current_stage = current_stage;
            if (focus)
                patch.focus = focus;
            const response = await api_client_js_1.apiClient.post("/connectors/writeback", {
                project_id,
                dry_run,
                strict_conflicts,
                operations: [
                    {
                        entity_type: "project_status",
                        patch,
                    },
                ],
            });
            return {
                content: [{ type: "text", text: JSON.stringify(response.data?.data || response.data, null, 2) }],
            };
        }
        catch (error) {
            const message = error.response?.data?.error || error.message;
            const detail = error.response?.data ? `\n${JSON.stringify(error.response.data, null, 2)}` : "";
            return { content: [{ type: "text", text: `Error writeback status: ${message}${detail}` }], isError: true };
        }
    });
}
