import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const BACKLOG_PATH = path.join(ROOT, "BACKLOG.md");
const PROJECT_NAME = process.env.WM_BACKLOG_ADMIN_PROJECT_NAME || "Work Management";
const MODE = process.argv[2] || "import";

const STATUS_VALUES = new Set(["Pending", "In Progress", "Partial", "Done", "Deferred", "Archived"]);

async function loadEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore missing env file
  }
}

async function getSupabase() {
  await loadEnvFile(path.join(ROOT, ".env.local"));
  await loadEnvFile(path.join(ROOT, ".env"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}

function parseQueueRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim().startsWith("| ID | Item |"));
  if (headerIndex === -1) return [];

  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) break;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    if (cells.length < 7) continue;
    const [backlog_key, title, item_type, component, priority, size, status] = cells;
    if (!/^B\d+$/i.test(backlog_key)) continue;

    rows.push({
      backlog_key: backlog_key.toUpperCase(),
      title,
      item_type: item_type || null,
      component: component || null,
      priority: priority || null,
      size: size || null,
      status: STATUS_VALUES.has(status) ? status : "Pending",
      source_of_truth: "markdown",
      sync_state: "in_sync",
      last_synced_at: new Date().toISOString(),
    });
  }
  return rows;
}

function renderQueueRows(items) {
  const header = [
    "| ID | Item | Type | Component | Pri | Size | Status |",
    "|----|------|------|-----------|-----|------|--------|",
  ];
  const rows = items.map((item) =>
    `| ${item.backlog_key} | ${safeCell(item.title)} | ${safeCell(item.item_type)} | ${safeCell(item.component)} | ${safeCell(item.priority)} | ${safeCell(item.size)} | ${safeCell(item.status)} |`
  );
  return [...header, ...rows].join("\n");
}

function safeCell(value) {
  if (!value) return "";
  return String(value).replace(/\|/g, "\\|").trim();
}

function backlogKeyNum(key) {
  const n = Number(String(key || "").replace(/^B/i, ""));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

async function resolveProjectId(supabase) {
  const forced = process.env.WM_BACKLOG_ADMIN_PROJECT_ID;
  if (forced) return forced;

  const { data, error } = await supabase
    .from("project")
    .select("id")
    .ilike("name", PROJECT_NAME)
    .maybeSingle();

  if (error) throw new Error(`Failed to resolve project: ${error.message}`);
  if (!data?.id) throw new Error(`Project not found by name: ${PROJECT_NAME}`);
  return data.id;
}

async function importFromMarkdown() {
  const supabase = await getSupabase();
  const projectId = await resolveProjectId(supabase);
  const markdown = await fs.readFile(BACKLOG_PATH, "utf8");
  const rows = parseQueueRows(markdown);

  if (rows.length === 0) {
    throw new Error("No backlog rows found in BACKLOG.md queue table");
  }

  const payload = rows.map((row) => ({ ...row, project_id: projectId }));

  const { error } = await supabase
    .from("backlog_admin_item")
    .upsert(payload, { onConflict: "project_id,backlog_key" });

  if (error) throw new Error(`Upsert failed: ${error.message}`);
  console.log(`Imported ${rows.length} backlog rows into backlog_admin_item for project ${projectId}.`);
}

async function exportToMarkdown() {
  const supabase = await getSupabase();
  const projectId = await resolveProjectId(supabase);
  const markdown = await fs.readFile(BACKLOG_PATH, "utf8");

  const { data, error } = await supabase
    .from("backlog_admin_item")
    .select("backlog_key,title,item_type,component,priority,size,status")
    .eq("project_id", projectId);
  if (error) throw new Error(`Failed to fetch backlog_admin_item: ${error.message}`);

  const sorted = (data || []).sort((a, b) => backlogKeyNum(a.backlog_key) - backlogKeyNum(b.backlog_key));
  const table = renderQueueRows(sorted);

  const start = markdown.indexOf("| ID | Item | Type | Component | Pri | Size | Status |");
  if (start === -1) throw new Error("Queue table header not found in BACKLOG.md");
  const notesIndex = markdown.indexOf("\n## Notes", start);
  if (notesIndex === -1) throw new Error("Could not locate Notes section after queue table");

  const before = markdown.slice(0, start);
  const after = markdown.slice(notesIndex + 1);
  const next = `${before}${table}\n\n${after}`;

  await fs.writeFile(BACKLOG_PATH, next, "utf8");
  console.log(`Exported ${sorted.length} DB backlog rows into BACKLOG.md queue table.`);
}

async function main() {
  if (!["import", "export"].includes(MODE)) {
    console.error("Usage: node scripts/backlog-admin-sync.mjs <import|export>");
    process.exit(1);
  }

  if (MODE === "import") await importFromMarkdown();
  else await exportToMarkdown();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
