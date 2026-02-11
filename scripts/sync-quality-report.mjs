import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

function parseArgs(argv) {
  const parsed = {
    json: argv.includes("--json"),
    projectId: "",
    staleHours: 24,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project" && argv[i + 1]) parsed.projectId = argv[i + 1];
    if (arg === "--stale-hours" && argv[i + 1]) parsed.staleHours = Number(argv[i + 1]) || 24;
  }

  return parsed;
}

async function loadEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    for (const raw of content.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

async function loadLocalEnv() {
  await loadEnvFile(path.join(ROOT, ".env.local"));
  await loadEnvFile(path.join(ROOT, ".env"));
}

function hoursSince(iso) {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

function normalizeTitle(title) {
  return (title || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

function isAbsoluteSourceId(value) {
  if (!value) return false;
  const v = value.trim();
  if (v.startsWith("/")) return true;
  return /^[a-zA-Z]:[\\/]/.test(v);
}

function countDuplicateSourceIds(rows) {
  const seen = new Set();
  let duplicates = 0;
  for (const row of rows) {
    if (!row.source_id) continue;
    if (seen.has(row.source_id)) duplicates += 1;
    else seen.add(row.source_id);
  }
  return duplicates;
}

function countDuplicateTitles(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeTitle(row.title);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  let duplicates = 0;
  for (const count of map.values()) {
    if (count > 1) duplicates += count - 1;
  }
  return duplicates;
}

function evaluateSeverity(row, staleHours) {
  if (row.connector_status !== "active") return "red";
  if (!Number.isFinite(row.last_sync_age_hours)) return "red";
  if (row.last_sync_age_hours > staleHours * 7) return "red";
  if (row.duplicate_source_ids > 0) return "red";
  if (row.synced_without_source > 0) return "red";

  if (row.last_sync_age_hours > staleHours) return "yellow";
  if (row.absolute_source_ids > 0) return "yellow";
  if (row.duplicate_titles > 0) return "yellow";

  return "green";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let projectQuery = supabase
    .from("project")
    .select("id,name,status,project_type,workflow_type,current_stage")
    .in("project_type", ["connected", "native"])
    .eq("status", "active");

  if (args.projectId) projectQuery = projectQuery.eq("id", args.projectId);

  const [projectsRes, connectorsRes] = await Promise.all([
    projectQuery,
    supabase.from("connector").select("id,project_id,connector_type,status,last_sync_at").eq("connector_type", "adf"),
  ]);

  if (projectsRes.error) throw projectsRes.error;
  if (connectorsRes.error) throw connectorsRes.error;

  const projects = projectsRes.data || [];
  const connectors = connectorsRes.data || [];
  const connectorByProject = new Map(connectors.map((c) => [c.project_id, c]));

  const connectedProjects = projects.filter((p) => connectorByProject.has(p.id));
  const connectedProjectIds = connectedProjects.map((p) => p.id);

  if (connectedProjectIds.length === 0) {
    const empty = { generated_at: new Date().toISOString(), stale_hours_threshold: args.staleHours, rows: [] };
    console.log(args.json ? JSON.stringify(empty, null, 2) : "No connected projects found.");
    return;
  }

  const [taskRes, backlogRes] = await Promise.all([
    supabase
      .from("task")
      .select("id,project_id,title,status,source_id,updated_at,data_origin")
      .in("project_id", connectedProjectIds)
      .eq("data_origin", "synced"),
    supabase
      .from("backlog_item")
      .select("id,project_id,title,status,source_id,updated_at,data_origin")
      .in("project_id", connectedProjectIds)
      .eq("data_origin", "synced"),
  ]);

  if (taskRes.error) throw taskRes.error;
  if (backlogRes.error) throw backlogRes.error;

  const tasks = taskRes.data || [];
  const backlog = backlogRes.data || [];

  const tasksByProject = new Map();
  const backlogByProject = new Map();

  for (const row of tasks) {
    if (!tasksByProject.has(row.project_id)) tasksByProject.set(row.project_id, []);
    tasksByProject.get(row.project_id).push(row);
  }
  for (const row of backlog) {
    if (!backlogByProject.has(row.project_id)) backlogByProject.set(row.project_id, []);
    backlogByProject.get(row.project_id).push(row);
  }

  const rows = connectedProjects.map((project) => {
    const connector = connectorByProject.get(project.id);
    const projectTasks = tasksByProject.get(project.id) || [];
    const projectBacklog = backlogByProject.get(project.id) || [];
    const combined = [...projectTasks, ...projectBacklog];

    const syncedWithoutSource = combined.filter((r) => !r.source_id || !r.source_id.trim()).length;
    const absoluteSourceIds = combined.filter((r) => isAbsoluteSourceId(r.source_id)).length;
    const duplicateSourceIds = countDuplicateSourceIds(combined);
    const duplicateTitles = countDuplicateTitles(combined);
    const lastSyncAgeHours = hoursSince(connector?.last_sync_at || null);

    const row = {
      project_id: project.id,
      project_name: project.name,
      stage: project.current_stage || "n/a",
      connector_status: connector?.status || "missing",
      last_sync_at: connector?.last_sync_at || null,
      last_sync_age_hours: Number.isFinite(lastSyncAgeHours) ? Number(lastSyncAgeHours.toFixed(1)) : null,
      synced_tasks: projectTasks.length,
      synced_backlog: projectBacklog.length,
      synced_without_source: syncedWithoutSource,
      absolute_source_ids: absoluteSourceIds,
      duplicate_source_ids: duplicateSourceIds,
      duplicate_titles: duplicateTitles,
    };

    return {
      ...row,
      severity: evaluateSeverity(
        {
          ...row,
          last_sync_age_hours: row.last_sync_age_hours ?? Number.POSITIVE_INFINITY,
        },
        args.staleHours
      ),
    };
  });

  const severityOrder = { red: 0, yellow: 1, green: 2 };
  rows.sort((a, b) => {
    const rank = severityOrder[a.severity] - severityOrder[b.severity];
    if (rank !== 0) return rank;
    return a.project_name.localeCompare(b.project_name);
  });

  const summary = {
    generated_at: new Date().toISOString(),
    stale_hours_threshold: args.staleHours,
    totals: {
      projects: rows.length,
      red: rows.filter((r) => r.severity === "red").length,
      yellow: rows.filter((r) => r.severity === "yellow").length,
      green: rows.filter((r) => r.severity === "green").length,
      synced_tasks: rows.reduce((sum, r) => sum + r.synced_tasks, 0),
      synced_backlog: rows.reduce((sum, r) => sum + r.synced_backlog, 0),
    },
    rows,
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Sync Quality Report (${summary.generated_at})`);
  console.log(`Threshold: stale if last sync > ${args.staleHours}h`);
  console.log(
    `Projects: ${summary.totals.projects} | red=${summary.totals.red} yellow=${summary.totals.yellow} green=${summary.totals.green}`
  );
  console.log(
    "severity | project | stage | sync_age_h | status | synced_tasks | synced_backlog | no_source | abs_source | dup_source | dup_title"
  );
  for (const row of rows) {
    console.log(
      `${row.severity.padEnd(7)} | ${row.project_name} | ${row.stage} | ${String(row.last_sync_age_hours ?? "n/a").padStart(9)} | ${row.connector_status.padEnd(6)} | ${String(row.synced_tasks).padStart(11)} | ${String(row.synced_backlog).padStart(14)} | ${String(row.synced_without_source).padStart(9)} | ${String(row.absolute_source_ids).padStart(10)} | ${String(row.duplicate_source_ids).padStart(10)} | ${String(row.duplicate_titles).padStart(9)}`
    );
  }
}

main().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
