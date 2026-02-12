import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { createServiceClient } from "@/lib/supabase/server";

type Action = "normalize_absolute_source_ids" | "dedupe_source_ids" | "activate_connector";

function normalizeSourceId(sourceId: string, projectPath: string): string {
    if (!sourceId) return sourceId;
    const normalized = sourceId.replace(/\\/g, "/");
    const structuredMatch = normalized.match(/^(.*?)(:(?:id|slug):.*)$/);
    const sourcePathPart = structuredMatch ? structuredMatch[1] : normalized;
    const sourceSuffix = structuredMatch ? structuredMatch[2] : "";

    const rootAbsolute = path.resolve(projectPath).replace(/\\/g, "/");
    const sourceAbsolute = path.isAbsolute(sourcePathPart)
        ? path.resolve(sourcePathPart).replace(/\\/g, "/")
        : path.resolve(projectPath, sourcePathPart).replace(/\\/g, "/");

    if (sourceAbsolute.startsWith(rootAbsolute)) {
        const relative = sourceAbsolute.slice(rootAbsolute.length).replace(/^\/+/, "");
        const normalizedRelative = relative ? `./${relative}` : ".";
        return `${normalizedRelative}${sourceSuffix}`;
    }

    const rootBase = path.basename(rootAbsolute);
    const marker = `/${rootBase}/`;
    const markerIndex = sourceAbsolute.indexOf(marker);
    if (markerIndex !== -1) {
        const relative = sourceAbsolute.slice(markerIndex + marker.length).replace(/^\/+/, "");
        const normalizedRelative = relative ? `./${relative}` : ".";
        return `${normalizedRelative}${sourceSuffix}`;
    }

    return `${sourceAbsolute}${sourceSuffix}`;
}

export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json();
    const projectId = body?.project_id as string | undefined;
    const action = body?.action as Action | undefined;

    if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

    const { data: connector, error: connectorError } = await supabase
        .from("connector")
        .select("*")
        .eq("project_id", projectId)
        .eq("connector_type", "adf")
        .maybeSingle();

    if (connectorError) return NextResponse.json({ error: connectorError.message }, { status: 500 });
    if (!connector) return NextResponse.json({ error: "ADF connector not found for project" }, { status: 404 });

    if (action === "activate_connector") {
        const { error } = await supabase
            .from("connector")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("id", connector.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data: { action, updated: 1 } });
    }

    if (action === "normalize_absolute_source_ids") {
        const projectPath = (connector.config as any)?.path as string | undefined;
        if (!projectPath) {
            return NextResponse.json({ error: "Connector is missing config.path" }, { status: 400 });
        }

        const [tasksRes, backlogRes] = await Promise.all([
            supabase
                .from("task")
                .select("id, source_id")
                .eq("project_id", projectId)
                .eq("data_origin", "synced"),
            supabase
                .from("backlog_item")
                .select("id, source_id")
                .eq("project_id", projectId)
                .eq("data_origin", "synced"),
        ]);

        if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 });
        if (backlogRes.error) return NextResponse.json({ error: backlogRes.error.message }, { status: 500 });

        let updated = 0;
        let skipped = 0;

        for (const row of tasksRes.data || []) {
            if (!row.source_id) continue;
            const next = normalizeSourceId(row.source_id, projectPath);
            if (next === row.source_id) continue;
            const { error } = await supabase
                .from("task")
                .update({ source_id: next, updated_at: new Date().toISOString() })
                .eq("id", row.id);
            if (error) skipped += 1;
            else updated += 1;
        }

        for (const row of backlogRes.data || []) {
            if (!row.source_id) continue;
            const next = normalizeSourceId(row.source_id, projectPath);
            if (next === row.source_id) continue;
            const { error } = await supabase
                .from("backlog_item")
                .update({ source_id: next, updated_at: new Date().toISOString() })
                .eq("id", row.id);
            if (error) skipped += 1;
            else updated += 1;
        }

        return NextResponse.json({ data: { action, updated, skipped } });
    }

    if (action === "dedupe_source_ids") {
        const [tasksRes, backlogRes] = await Promise.all([
            supabase
                .from("task")
                .select("id, source_id, updated_at")
                .eq("project_id", projectId)
                .eq("data_origin", "synced")
                .not("source_id", "is", null),
            supabase
                .from("backlog_item")
                .select("id, source_id, updated_at")
                .eq("project_id", projectId)
                .eq("data_origin", "synced")
                .not("source_id", "is", null),
        ]);
        if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 });
        if (backlogRes.error) return NextResponse.json({ error: backlogRes.error.message }, { status: 500 });

        const staleTaskIds = duplicateIdsBySourceId(tasksRes.data || []);
        const staleBacklogIds = duplicateIdsBySourceId(backlogRes.data || []);

        const deletedTasks = await deleteIdsInChunks(supabase, "task", staleTaskIds);
        const deletedBacklog = await deleteIdsInChunks(supabase, "backlog_item", staleBacklogIds);

        return NextResponse.json({
            data: {
                action,
                deleted_tasks: deletedTasks,
                deleted_backlog: deletedBacklog,
            },
        });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

function duplicateIdsBySourceId(rows: Array<{ id: string; source_id: string | null; updated_at: string }>): string[] {
    const bySource = new Map<string, Array<{ id: string; updated_at: string }>>();
    for (const row of rows) {
        if (!row.source_id) continue;
        if (!bySource.has(row.source_id)) bySource.set(row.source_id, []);
        bySource.get(row.source_id)!.push({ id: row.id, updated_at: row.updated_at });
    }

    const staleIds: string[] = [];
    for (const grouped of bySource.values()) {
        if (grouped.length <= 1) continue;
        grouped.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        for (let i = 1; i < grouped.length; i += 1) staleIds.push(grouped[i].id);
    }
    return staleIds;
}

async function deleteIdsInChunks(supabase: any, table: "task" | "backlog_item", ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    let deleted = 0;
    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).delete().in("id", chunk);
        if (error) throw error;
        deleted += chunk.length;
    }
    return deleted;
}
