import fs from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { resolveBacklogAdminProjectId } from "@/lib/api/backlog-admin";

type DbClient = SupabaseClient<Database>;

const BACKLOG_PATH = path.join(process.cwd(), "BACKLOG.md");
const STATUS_VALUES = new Set(["Pending", "In Progress", "Partial", "Done", "Deferred", "Archived"]);

interface ParsedRow {
    backlog_key: string;
    title: string;
    item_type: string | null;
    component: string | null;
    priority: "P1" | "P2" | "P3" | null;
    size: "S" | "M" | "L" | "XL" | null;
    status: string;
    source_of_truth: "markdown";
    sync_state: "in_sync";
    last_synced_at: string;
}

export async function importBacklogMarkdownToDb(supabase: DbClient): Promise<{ imported: number; project_id: string }> {
    const projectId = await resolveBacklogAdminProjectId(supabase);
    const markdown = await fs.readFile(BACKLOG_PATH, "utf8");
    const rows = parseQueueRows(markdown);
    if (rows.length === 0) throw new Error("No backlog rows found in BACKLOG.md queue table");

    const payload = rows.map((row) => ({ ...row, project_id: projectId }));
    const { error } = await supabase
        .from("backlog_admin_item" as any)
        .upsert(payload, { onConflict: "project_id,backlog_key" });
    if (error) throw new Error(error.message);

    return { imported: rows.length, project_id: projectId };
}

export async function exportBacklogDbToMarkdown(supabase: DbClient): Promise<{ exported: number; project_id: string }> {
    const projectId = await resolveBacklogAdminProjectId(supabase);
    const markdown = await fs.readFile(BACKLOG_PATH, "utf8");

    const { data, error } = await supabase
        .from("backlog_admin_item" as any)
        .select("backlog_key,title,item_type,component,priority,size,status")
        .eq("project_id", projectId);
    if (error) throw new Error(error.message);

    const sorted = ((data || []) as any[]).sort((a, b) => keyNum(a.backlog_key) - keyNum(b.backlog_key));
    const queueTable = renderQueueRows(sorted);

    const start = markdown.indexOf("| ID | Item | Type | Component | Pri | Size | Status |");
    if (start === -1) throw new Error("Queue table header not found in BACKLOG.md");
    const notesIndex = markdown.indexOf("\n## Notes", start);
    if (notesIndex === -1) throw new Error("Could not locate Notes section after queue table");

    const before = markdown.slice(0, start);
    const after = markdown.slice(notesIndex + 1);
    const next = `${before}${queueTable}\n\n${after}`;
    await fs.writeFile(BACKLOG_PATH, next, "utf8");

    return { exported: sorted.length, project_id: projectId };
}

function parseQueueRows(markdown: string): ParsedRow[] {
    const lines = markdown.split(/\r?\n/);
    const headerIndex = lines.findIndex((line) => line.trim().startsWith("| ID | Item |"));
    if (headerIndex === -1) return [];

    const rows: ParsedRow[] = [];
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
            priority: normalizePriority(priority),
            size: normalizeSize(size),
            status: STATUS_VALUES.has(status) ? status : "Pending",
            source_of_truth: "markdown",
            sync_state: "in_sync",
            last_synced_at: new Date().toISOString(),
        });
    }
    return rows;
}

function renderQueueRows(items: Array<any>): string {
    const header = [
        "| ID | Item | Type | Component | Pri | Size | Status |",
        "|----|------|------|-----------|-----|------|--------|",
    ];
    const rows = items.map((item) =>
        `| ${safe(item.backlog_key)} | ${safe(item.title)} | ${safe(item.item_type)} | ${safe(item.component)} | ${safe(item.priority)} | ${safe(item.size)} | ${safe(item.status)} |`
    );
    return [...header, ...rows].join("\n");
}

function safe(value: unknown): string {
    if (!value) return "";
    return String(value).replace(/\|/g, "\\|").trim();
}

function keyNum(backlogKey: string): number {
    const n = Number(String(backlogKey || "").replace(/^B/i, ""));
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function normalizePriority(value: string): "P1" | "P2" | "P3" | null {
    if (value === "P1" || value === "P2" || value === "P3") return value;
    return null;
}

function normalizeSize(value: string): "S" | "M" | "L" | "XL" | null {
    if (value === "S" || value === "M" || value === "L" || value === "XL") return value;
    return null;
}
