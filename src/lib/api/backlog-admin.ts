import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type DbClient = SupabaseClient<Database>;

const DEFAULT_PROJECT_NAME = "Work Management";

export async function resolveBacklogAdminProjectId(supabase: DbClient): Promise<string> {
    const forcedProjectId = process.env.WM_BACKLOG_ADMIN_PROJECT_ID;
    if (forcedProjectId) return forcedProjectId;

    const { data, error } = await supabase
        .from("project")
        .select("id")
        .ilike("name", DEFAULT_PROJECT_NAME)
        .maybeSingle();

    if (error) throw new Error(`Failed to resolve backlog admin project: ${error.message}`);
    if (!data?.id) throw new Error(`Backlog admin project "${DEFAULT_PROJECT_NAME}" not found`);
    return data.id;
}

export function nextBacklogKeyFromRows(rows: Array<{ backlog_key: string }>): string {
    let max = 0;
    for (const row of rows) {
        const n = Number(row.backlog_key.replace(/^B/i, ""));
        if (Number.isFinite(n) && n > max) max = n;
    }
    return `B${max + 1}`;
}
