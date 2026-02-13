import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseTasksMd, parseBacklogMd, parseStatusMd } = require("../mcp-server/dist/adf/parser.js");

const API_URL = process.env.API_URL || "https://work-management-kappa.vercel.app/api";
const API_SECRET = process.env.API_SECRET;
const TARGETS = process.env.SYNC_INGEST_TARGETS || "";

function parseTargets(raw) {
    return raw
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
            const idx = item.indexOf("=");
            if (idx === -1) throw new Error(`Invalid target "${item}". Use "Project Name=/abs/path"`);
            return {
                projectKey: item.slice(0, idx).trim(),
                repoPath: item.slice(idx + 1).trim(),
            };
        });
}

async function api(pathname, init = {}) {
    const res = await fetch(`${API_URL}${pathname}`, {
        ...init,
        headers: {
            "content-type": "application/json",
            ...(API_SECRET ? { authorization: `Bearer ${API_SECRET}` } : {}),
            ...(init.headers || {}),
        },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
        const detail = body?.error || body?.message || `${res.status} ${res.statusText}`;
        throw new Error(`${init.method || "GET"} ${pathname} failed: ${detail}`);
    }
    return body;
}

async function findFile(projectPath, candidates) {
    for (const rel of candidates) {
        const full = path.join(projectPath, rel);
        try {
            await fs.access(full);
            return full;
        } catch {
            // continue
        }
    }
    return "";
}

async function parseIntentSummary(filePath) {
    if (!filePath) return null;
    try {
        const content = (await fs.readFile(filePath, "utf-8")).replace(/\r/g, "");
        const lines = content.split("\n");
        let inFrontmatter = false;
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            if (line === "---") {
                inFrontmatter = !inFrontmatter;
                continue;
            }
            if (inFrontmatter) continue;
            if (line.startsWith("#")) continue;
            const cleaned = line.replace(/^[-*]\s+/, "").trim();
            if (/^[a-z0-9_]+\s*:/i.test(cleaned)) continue;
            if (cleaned.length >= 24) return cleaned.slice(0, 220);
        }
    } catch {
        return null;
    }
    return null;
}

function resolveProjectId(projects, key) {
    const raw = key.trim();
    const byId = projects.find((p) => p.id === raw);
    if (byId) return byId.id;
    const lower = raw.toLowerCase();
    const byName = projects.find((p) => (p.name || "").toLowerCase() === lower);
    if (byName) return byName.id;
    return null;
}

async function runTarget(projects, target) {
    const projectId = resolveProjectId(projects, target.projectKey);
    if (!projectId) {
        throw new Error(`Project not found for key "${target.projectKey}"`);
    }

    const projectPath = path.resolve(target.repoPath);
    const tasksFile = await findFile(projectPath, [
        "tasks.md",
        "task.md",
        "docs/tasks.md",
        "docs/task.md",
        "docs/adf/tasks.md",
        "docs/adf/task.md",
    ]);
    const backlogFile = await findFile(projectPath, [
        "BACKLOG.md",
        "backlog.md",
        "docs/BACKLOG.md",
        "docs/backlog.md",
        "docs/adf/BACKLOG.md",
        "docs/adf/backlog.md",
    ]);
    const statusFile = await findFile(projectPath, ["status.md", "docs/status.md", "docs/adf/status.md"]);
    const intentFile = await findFile(projectPath, ["intent.md", "docs/intent.md", "docs/adf/intent.md"]);

    const tasks = tasksFile ? await parseTasksMd(tasksFile) : [];
    const backlog = backlogFile ? await parseBacklogMd(backlogFile) : [];
    const status = statusFile ? await parseStatusMd(statusFile) : null;
    const intentSummary = await parseIntentSummary(intentFile);

    // Ensure connector is present and tagged with current local path.
    await api("/connectors", {
        method: "POST",
        body: JSON.stringify({
            project_id: projectId,
            connector_type: "adf",
            status: "active",
            config: { path: projectPath },
        }),
    });

    const ingest = await api("/connectors/ingest", {
        method: "POST",
        body: JSON.stringify({
            project_id: projectId,
            repo_path: projectPath,
            tasks,
            backlog,
            status,
            intent_summary: intentSummary,
        }),
    });

    return {
        project_id: projectId,
        project_key: target.projectKey,
        repo_path: projectPath,
        parsed_tasks: tasks.length,
        parsed_backlog: backlog.length,
        ingested_tasks: ingest.tasks_count || 0,
        ingested_backlog: ingest.backlog_count || 0,
        status_synced: !!ingest.status_synced,
    };
}

async function main() {
    if (!API_SECRET) {
        throw new Error("API_SECRET is required for sync ingest.");
    }

    const targets = parseTargets(TARGETS);
    if (targets.length === 0) {
        throw new Error(
            "No targets configured. Set SYNC_INGEST_TARGETS=\"Work Management=/abs/path;Krypton=/abs/path\""
        );
    }

    const projectsRes = await api("/projects");
    const projects = projectsRes?.data || [];

    const results = [];
    for (const target of targets) {
        process.stdout.write(`- Ingest ${target.projectKey} from ${target.repoPath} ... `);
        const result = await runTarget(projects, target);
        results.push(result);
        console.log(`ok (tasks=${result.ingested_tasks}, backlog=${result.ingested_backlog})`);
    }

    console.log("\nIngest summary:");
    for (const r of results) {
        console.log(
            `PASS project=${r.project_key} id=${r.project_id} parsed(tasks=${r.parsed_tasks},backlog=${r.parsed_backlog}) ingested(tasks=${r.ingested_tasks},backlog=${r.ingested_backlog})`
        );
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
