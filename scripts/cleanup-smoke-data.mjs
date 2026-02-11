import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    json: argv.includes("--json"),
  };
}

async function loadEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.split("\n");
    for (const raw of lines) {
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
    // ignore missing env files
  }
}

async function loadLocalEnv() {
  await loadEnvFile(path.join(ROOT, ".env.local"));
  await loadEnvFile(path.join(ROOT, ".env"));
}

function matchesSmokeTitle(value) {
  if (!value) return false;
  const title = value.trim().toLowerCase();
  return (
    title.startsWith("smoke ") ||
    title.startsWith("mcp smoke ") ||
    title.startsWith("idempotency smoke ") ||
    title.includes("smoke test")
  );
}

function matchesSmokeSourceId(sourceId) {
  if (!sourceId) return false;
  return sourceId.trim().toLowerCase().startsWith("smoke-source-");
}

function matchesSmokeProjectName(name) {
  if (!name) return false;
  const value = name.trim().toLowerCase();
  return value.startsWith("mcp smoke ") || value.startsWith("smoke project ");
}

function matchesSmokePlanName(name) {
  if (!name) return false;
  const value = name.trim().toLowerCase();
  return value.startsWith("mcp smoke ") || value.startsWith("smoke planned rule ");
}

async function deleteInChunks(supabase, table, column, ids) {
  if (!ids.length) return 0;
  const chunkSize = 200;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).delete().in(column, chunk);
    if (error) throw error;
    deleted += chunk.length;
  }
  return deleted;
}

async function main() {
  const { apply, json } = parseArgs(process.argv.slice(2));
  await loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const [tasksRes, backlogRes, projectsRes, plansRes] = await Promise.all([
    supabase.from("task").select("id,title,source_id,project_id"),
    supabase.from("backlog_item").select("id,title,source_id,project_id,promoted_to_task_id"),
    supabase.from("project").select("id,name,current_phase_id"),
    supabase.from("plan").select("id,name,project_id"),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (backlogRes.error) throw backlogRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (plansRes.error) throw plansRes.error;

  const smokeProjects = (projectsRes.data || []).filter((p) => matchesSmokeProjectName(p.name));
  const smokeProjectIds = new Set(smokeProjects.map((p) => p.id));

  const smokeTasks = (tasksRes.data || []).filter(
    (row) =>
      matchesSmokeTitle(row.title) ||
      matchesSmokeSourceId(row.source_id) ||
      smokeProjectIds.has(row.project_id)
  );

  const smokeBacklog = (backlogRes.data || []).filter(
    (row) =>
      matchesSmokeTitle(row.title) ||
      matchesSmokeSourceId(row.source_id) ||
      smokeProjectIds.has(row.project_id)
  );

  const smokePlans = (plansRes.data || []).filter(
    (row) => matchesSmokePlanName(row.name) || smokeProjectIds.has(row.project_id)
  );

  const summary = {
    mode: apply ? "apply" : "dry-run",
    candidates: {
      projects: smokeProjects.length,
      plans: smokePlans.length,
      tasks: smokeTasks.length,
      backlog: smokeBacklog.length,
    },
    samples: {
      projects: smokeProjects.slice(0, 10).map((p) => ({ id: p.id, name: p.name })),
      plans: smokePlans.slice(0, 10).map((p) => ({ id: p.id, name: p.name })),
      tasks: smokeTasks.slice(0, 10).map((t) => ({ id: t.id, title: t.title, source_id: t.source_id })),
      backlog: smokeBacklog.slice(0, 10).map((b) => ({ id: b.id, title: b.title, source_id: b.source_id })),
    },
    deleted: {
      projects: 0,
      plans: 0,
      tasks: 0,
      backlog: 0,
      connectors: 0,
    },
  };

  if (!apply) {
    if (json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log("Smoke cleanup dry-run");
      console.log(JSON.stringify(summary, null, 2));
      console.log("Run with --apply to delete these records.");
    }
    return;
  }

  const smokeTaskIds = Array.from(new Set(smokeTasks.map((t) => t.id)));
  const smokeBacklogIds = Array.from(new Set(smokeBacklog.map((b) => b.id)));
  const smokePlanIds = Array.from(new Set(smokePlans.map((p) => p.id)));
  const smokeProjectIdList = Array.from(smokeProjectIds);

  if (smokeTaskIds.length > 0) {
    const { error } = await supabase
      .from("backlog_item")
      .update({ promoted_to_task_id: null })
      .in("promoted_to_task_id", smokeTaskIds);
    if (error) throw error;
  }

  summary.deleted.backlog += await deleteInChunks(supabase, "backlog_item", "id", smokeBacklogIds);
  summary.deleted.tasks += await deleteInChunks(supabase, "task", "id", smokeTaskIds);

  if (smokeProjectIdList.length > 0) {
    summary.deleted.backlog += await deleteInChunks(supabase, "backlog_item", "project_id", smokeProjectIdList);
    summary.deleted.tasks += await deleteInChunks(supabase, "task", "project_id", smokeProjectIdList);
    summary.deleted.connectors += await deleteInChunks(supabase, "connector", "project_id", smokeProjectIdList);

    const { error: clearProjectPhaseError } = await supabase
      .from("project")
      .update({ current_phase_id: null })
      .in("id", smokeProjectIdList);
    if (clearProjectPhaseError) throw clearProjectPhaseError;

    summary.deleted.plans += await deleteInChunks(supabase, "plan", "project_id", smokeProjectIdList);
    summary.deleted.projects += await deleteInChunks(supabase, "project", "id", smokeProjectIdList);
  }

  const standalonePlanIds = smokePlanIds.filter((id) => !smokePlans.find((p) => p.id === id && smokeProjectIds.has(p.project_id)));
  if (standalonePlanIds.length > 0) {
    const { data: planPhases, error: phaseQueryError } = await supabase
      .from("phase")
      .select("id")
      .in("plan_id", standalonePlanIds);
    if (phaseQueryError) throw phaseQueryError;

    const phaseIds = (planPhases || []).map((row) => row.id);
    if (phaseIds.length > 0) {
      const { error: clearPhasePointerError } = await supabase
        .from("project")
        .update({ current_phase_id: null })
        .in("current_phase_id", phaseIds);
      if (clearPhasePointerError) throw clearPhasePointerError;
    }

    summary.deleted.tasks += await deleteInChunks(supabase, "task", "plan_id", standalonePlanIds);
    summary.deleted.plans += await deleteInChunks(supabase, "plan", "id", standalonePlanIds);
  }

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("Smoke cleanup complete");
    console.log(JSON.stringify(summary, null, 2));
  }
}

main().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
