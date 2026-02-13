import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/api/activity";
import type { AdfBacklogItem, AdfStatus, AdfTask } from "@/lib/adf/parser";

function normalizeSourceId(sourceId: string, projectPath: string): string {
    if (!sourceId) return sourceId;
    const normalized = sourceId.replace(/\\/g, "/");
    const structuredMatch = normalized.match(/^(.*?)(:(?:id|slug):.*)$/);
    const sourcePathPart = structuredMatch ? structuredMatch[1] : normalized;
    const sourceSuffix = structuredMatch ? structuredMatch[2] : "";

    const rootAbsolute = projectPath.replace(/\\/g, "/");
    const sourceAbsolute = sourcePathPart.replace(/\\/g, "/");

    if (sourceAbsolute.startsWith(rootAbsolute)) {
        const relative = sourceAbsolute.slice(rootAbsolute.length).replace(/^\/+/, "");
        const normalizedRelative = relative ? `./${relative}` : ".";
        return `${normalizedRelative}${sourceSuffix}`;
    }

    return `${sourceAbsolute}${sourceSuffix}`;
}

function deriveStage(status: string | null | undefined): string | null {
    if (!status) return null;
    const lower = status.replace(/^["']|["']$/g, "").toLowerCase();
    if (lower.includes("discover")) return "Discover";
    if (lower.includes("design")) return "Design";
    if (lower.includes("develop")) return "Develop";
    if (lower.includes("build")) return "Build";
    if (lower.includes("validate")) return "Validate";
    if (lower.includes("deliver")) return "Deliver";
    if (lower.includes("operate")) return "Operate";
    if (lower.includes("improve")) return "Improve";
    return null;
}

function dedupeBySourceId<T extends { source_id: string | null }>(rows: T[]): { rows: T[]; dropped: number } {
    const seen = new Set<string>();
    const deduped: T[] = [];
    let dropped = 0;

    for (const row of rows) {
        if (!row.source_id) {
            deduped.push(row);
            continue;
        }
        if (seen.has(row.source_id)) {
            dropped += 1;
            continue;
        }
        seen.add(row.source_id);
        deduped.push(row);
    }

    return { rows: deduped, dropped };
}

async function deleteByIdsInChunks(supabase: any, table: "task" | "backlog_item", ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const chunkSize = 200;
    let deleted = 0;
    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).delete().in("id", chunk);
        if (error) throw error;
        deleted += chunk.length;
    }
    return deleted;
}

// POST /api/connectors/ingest
// Accepts parsed ADF payload from a local runner and upserts into the central DB.
export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();

    const body = await request.json();
    const projectId = body?.project_id as string | undefined;
    const repoPath = body?.repo_path as string | undefined;
    const tasks = (body?.tasks || []) as AdfTask[];
    const backlog = (body?.backlog || []) as AdfBacklogItem[];
    const status = (body?.status || null) as AdfStatus | null;
    const intentSummary = (body?.intent_summary || null) as string | null;
    const actorId = (body?.actor_id || null) as string | null;

    if (!projectId) {
        return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    // Ensure connector exists and capture latest local path for visibility.
    const { data: existingConnector, error: connectorReadError } = await supabase
        .from("connector")
        .select("id, config")
        .eq("project_id", projectId)
        .eq("connector_type", "adf")
        .maybeSingle();
    if (connectorReadError) {
        return NextResponse.json({ error: connectorReadError.message }, { status: 500 });
    }

    const existingConfig =
        existingConnector?.config && typeof existingConnector.config === "object"
            ? (existingConnector.config as Record<string, unknown>)
            : {};
    const connectorConfig = {
        ...existingConfig,
        ...(repoPath ? { path: repoPath } : {}),
    };

    if (existingConnector?.id) {
        const { error } = await supabase
            .from("connector")
            .update({
                status: "active",
                config: connectorConfig,
                updated_at: new Date().toISOString(),
            })
            .eq("id", existingConnector.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
        const { error } = await supabase
            .from("connector")
            .insert({
                project_id: projectId,
                connector_type: "adf",
                status: "active",
                config: connectorConfig,
                updated_at: new Date().toISOString(),
            });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rawTaskPayload = tasks.map((item) => ({
        project_id: projectId,
        source_id: repoPath ? normalizeSourceId(item.source_id, repoPath) : item.source_id,
        title: item.title,
        status: item.status,
        priority: item.priority || "P2",
        data_origin: "synced",
        updated_at: new Date().toISOString(),
    }));

    const rawBacklogPayload = backlog.map((item) => ({
        project_id: projectId,
        source_id: repoPath ? normalizeSourceId(item.source_id, repoPath) : item.source_id,
        title: item.title,
        description: item.description || null,
        priority: item.priority || "P2",
        status: item.status,
        data_origin: "synced",
        updated_at: new Date().toISOString(),
    }));

    const { rows: taskPayload, dropped: droppedTaskDuplicates } = dedupeBySourceId(rawTaskPayload);
    const { rows: backlogPayload, dropped: droppedBacklogDuplicates } = dedupeBySourceId(rawBacklogPayload);

    let upsertedTasks: any[] = [];
    let upsertedBacklog: any[] = [];
    let deletedStaleTasks = 0;
    let deletedStaleBacklog = 0;

    if (taskPayload.length > 0) {
        const { data, error } = await (supabase as any)
            .from("task")
            .upsert(taskPayload as any[], { onConflict: "project_id,source_id", ignoreDuplicates: false })
            .select("id, source_id");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        upsertedTasks = data || [];
    }

    if (backlogPayload.length > 0) {
        const { data, error } = await (supabase as any)
            .from("backlog_item")
            .upsert(backlogPayload as any[], { onConflict: "project_id,source_id", ignoreDuplicates: false })
            .select("id, source_id");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        upsertedBacklog = data || [];
    }

    // Remove stale synced rows to mirror source-of-truth files.
    const { data: existingTasks, error: existingTasksError } = await supabase
        .from("task")
        .select("id, source_id")
        .eq("project_id", projectId)
        .eq("data_origin", "synced");
    if (existingTasksError) return NextResponse.json({ error: existingTasksError.message }, { status: 500 });

    const incomingTaskSourceIds = new Set(taskPayload.map((row: any) => row.source_id).filter(Boolean));
    const staleTaskIds = (existingTasks || [])
        .filter((row: any) => !row.source_id || !incomingTaskSourceIds.has(row.source_id))
        .map((row: any) => row.id);
    deletedStaleTasks = await deleteByIdsInChunks(supabase, "task", staleTaskIds);

    const { data: existingBacklog, error: existingBacklogError } = await supabase
        .from("backlog_item")
        .select("id, source_id")
        .eq("project_id", projectId)
        .eq("data_origin", "synced");
    if (existingBacklogError) return NextResponse.json({ error: existingBacklogError.message }, { status: 500 });

    const incomingBacklogSourceIds = new Set(backlogPayload.map((row: any) => row.source_id).filter(Boolean));
    const staleBacklogIds = (existingBacklog || [])
        .filter((row: any) => !row.source_id || !incomingBacklogSourceIds.has(row.source_id))
        .map((row: any) => row.id);
    deletedStaleBacklog = await deleteByIdsInChunks(supabase, "backlog_item", staleBacklogIds);

    if (status || intentSummary) {
        const stage = status?.current_stage || deriveStage(status?.current_status);
        const { error: updateProjectError } = await supabase
            .from("project")
            .update({
                current_stage: stage,
                blockers: status?.blockers || [],
                pending_decisions: status?.pending_decisions || [],
                focus: status?.focus || intentSummary || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);
        if (updateProjectError) return NextResponse.json({ error: updateProjectError.message }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { error: connectorUpdateError } = await supabase
        .from("connector")
        .update({
            last_sync_at: now,
            status: "active",
            updated_at: now,
        })
        .eq("project_id", projectId)
        .eq("connector_type", "adf");
    if (connectorUpdateError) return NextResponse.json({ error: connectorUpdateError.message }, { status: 500 });

    if (actorId) {
        await logActivity({
            entityType: "project",
            entityId: projectId,
            actorType: "human",
            actorId,
            action: "adf_sync_ingest",
            detail: {
                tasks_count: upsertedTasks.length,
                backlog_count: upsertedBacklog.length,
                stale_tasks_deleted: deletedStaleTasks,
                stale_backlog_deleted: deletedStaleBacklog,
            },
        });
    }

    return NextResponse.json({
        message: "Ingest sync completed",
        project_id: projectId,
        tasks_count: upsertedTasks.length,
        backlog_count: upsertedBacklog.length,
        dropped_task_duplicates: droppedTaskDuplicates,
        dropped_backlog_duplicates: droppedBacklogDuplicates,
        deleted_stale_tasks: deletedStaleTasks,
        deleted_stale_backlog: deletedStaleBacklog,
        status_synced: !!status,
    });
}
