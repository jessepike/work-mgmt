import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { parseTasksMd, parseBacklogMd, parseStatusMd, parseIntentMdSummary } from '@/lib/adf/parser';
import path from 'path';
import fs from 'fs/promises';

function normalizeSourceId(sourceId: string, projectPath: string): string {
    if (!sourceId) return sourceId;
    const normalized = sourceId.replace(/\\/g, '/');
    const structuredMatch = normalized.match(/^(.*?)(:(?:id|slug):.*)$/);
    const sourcePathPart = structuredMatch ? structuredMatch[1] : normalized;
    const sourceSuffix = structuredMatch ? structuredMatch[2] : "";

    const rootAbsolute = path.resolve(projectPath).replace(/\\/g, '/');
    const sourceAbsolute = path.isAbsolute(sourcePathPart)
        ? path.resolve(sourcePathPart).replace(/\\/g, '/')
        : path.resolve(projectPath, sourcePathPart).replace(/\\/g, '/');

    if (sourceAbsolute.startsWith(rootAbsolute)) {
        const relative = sourceAbsolute.slice(rootAbsolute.length).replace(/^\/+/, '');
        const normalizedRelative = relative ? `./${relative}` : '.';
        return `${normalizedRelative}${sourceSuffix}`;
    }

    const rootBase = path.basename(rootAbsolute);
    const marker = `/${rootBase}/`;
    const markerIndex = sourceAbsolute.indexOf(marker);
    if (markerIndex !== -1) {
        const relative = sourceAbsolute.slice(markerIndex + marker.length).replace(/^\/+/, '');
        const normalizedRelative = relative ? `./${relative}` : '.';
        return `${normalizedRelative}${sourceSuffix}`;
    }

    return `${sourceAbsolute}${sourceSuffix}`;
}

function deriveStage(status: string | null | undefined): string | null {
    if (!status) return null;
    const lower = status.replace(/^["']|["']$/g, '').toLowerCase();
    if (lower.includes('discover')) return 'Discover';
    if (lower.includes('design')) return 'Design';
    if (lower.includes('develop')) return 'Develop';
    if (lower.includes('build')) return 'Build';
    if (lower.includes('validate')) return 'Validate';
    if (lower.includes('deliver')) return 'Deliver';
    if (lower.includes('operate')) return 'Operate';
    if (lower.includes('improve')) return 'Improve';
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

async function deleteByIdsInChunks(
    supabase: any,
    table: 'task' | 'backlog_item',
    ids: string[]
): Promise<number> {
    if (ids.length === 0) return 0;
    const chunkSize = 200;
    let deleted = 0;
    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).delete().in('id', chunk);
        if (error) throw error;
        deleted += chunk.length;
    }
    return deleted;
}

// POST /api/connectors/sync
export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json();
    const { project_id } = body;

    if (!project_id) {
        return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    try {
        // 1. Fetch the ADF connector for this project
        const { data: connector, error: entryError } = await supabase
            .from('connector')
            .select('*')
            .eq('project_id', project_id)
            .eq('connector_type', 'adf')
            .single();

        if (entryError || !connector) {
            return NextResponse.json({ error: 'ADF connector not found for this project' }, { status: 404 });
        }

        const config = connector.config as any;
        const projectPath = config?.path;
        if (!projectPath) {
            return NextResponse.json({ error: 'Project path not configured in connector' }, { status: 400 });
        }

        // 2. Identify and parse files
        const possibleTaskPaths = [
            path.join(projectPath, "tasks.md"),
            path.join(projectPath, "task.md"),
            path.join(projectPath, "docs", "tasks.md"),
            path.join(projectPath, "docs", "task.md"),
            path.join(projectPath, "docs", "adf", "tasks.md"),
            path.join(projectPath, "docs", "adf", "task.md")
        ];

        let tasksFile = "";
        for (const p of possibleTaskPaths) {
            try {
                await fs.access(p);
                tasksFile = p;
                break;
            } catch { }
        }

        const possibleBacklogPaths = [
            path.join(projectPath, "BACKLOG.md"),
            path.join(projectPath, "backlog.md"),
            path.join(projectPath, "docs", "BACKLOG.md"),
            path.join(projectPath, "docs", "backlog.md"),
            path.join(projectPath, "docs", "adf", "BACKLOG.md"),
            path.join(projectPath, "docs", "adf", "backlog.md")
        ];

        let backlogFile = "";
        for (const p of possibleBacklogPaths) {
            try {
                await fs.access(p);
                backlogFile = p;
                break;
            } catch { }
        }

        const possibleStatusPaths = [
            path.join(projectPath, "status.md"),
            path.join(projectPath, "docs", "status.md"),
            path.join(projectPath, "docs", "adf", "status.md")
        ];

        let statusFile = "";
        for (const p of possibleStatusPaths) {
            try {
                await fs.access(p);
                statusFile = p;
                break;
            } catch { }
        }

        const tasks = tasksFile ? await parseTasksMd(tasksFile) : [];
        const backlog = backlogFile ? await parseBacklogMd(backlogFile) : [];
        const status = statusFile ? await parseStatusMd(statusFile) : null;
        const possibleIntentPaths = [
            path.join(projectPath, "intent.md"),
            path.join(projectPath, "docs", "intent.md"),
            path.join(projectPath, "docs", "adf", "intent.md")
        ];

        let intentFile = "";
        for (const p of possibleIntentPaths) {
            try {
                await fs.access(p);
                intentFile = p;
                break;
            } catch { }
        }
        const intentSummary = intentFile ? await parseIntentMdSummary(intentFile) : null;
        const tasksCount = tasks.length;
        const backlogCount = backlog.length;
        const totalCount = tasksCount + backlogCount;

        if (totalCount === 0 && !status) {
            return NextResponse.json({ message: 'No items found to sync', count: 0 });
        }

        // 3. Prepare payloads for bulk upsert
        const rawTaskPayload = tasks.map(item => ({
            project_id,
            source_id: normalizeSourceId(item.source_id, projectPath),
            title: item.title,
            status: item.status,
            priority: item.priority || "P2",
            data_origin: "synced",
            updated_at: new Date().toISOString()
        } as any));

        const rawBacklogPayload = backlog.map(item => ({
            project_id,
            source_id: normalizeSourceId(item.source_id, projectPath),
            title: item.title,
            description: item.description || null,
            priority: item.priority || "P2",
            status: item.status,
            data_origin: "synced",
            updated_at: new Date().toISOString()
        } as any));

        const { rows: taskPayload, dropped: droppedTaskDuplicates } = dedupeBySourceId(rawTaskPayload);
        const { rows: backlogPayload, dropped: droppedBacklogDuplicates } = dedupeBySourceId(rawBacklogPayload);

        // 4. Perform bulk upserts
        let upsertedTasks: any[] = [];
        let upsertedBacklog: any[] = [];
        let deletedStaleTasks = 0;
        let deletedStaleBacklog = 0;

        if (taskPayload.length > 0) {
            const { data, error: taskUpsertError } = await supabase
                .from('task')
                .upsert(taskPayload, {
                    onConflict: 'project_id, source_id',
                    ignoreDuplicates: false
                })
                .select();

            if (taskUpsertError) throw taskUpsertError;
            upsertedTasks = data || [];
        }

        if (backlogPayload.length > 0) {
            const { data, error: backlogUpsertError } = await supabase
                .from('backlog_item')
                .upsert(backlogPayload, {
                    onConflict: 'project_id, source_id',
                    ignoreDuplicates: false
                })
                .select();

            if (backlogUpsertError) throw backlogUpsertError;
            upsertedBacklog = data || [];
        }

        // 4b. Remove stale synced rows so source-of-truth files do not leave ghost duplicates.
        if (tasksFile) {
            const { data: existingTasks, error: existingTasksError } = await supabase
                .from('task')
                .select('id, source_id')
                .eq('project_id', project_id)
                .eq('data_origin', 'synced');
            if (existingTasksError) throw existingTasksError;

            const incomingTaskSourceIds = new Set(
                taskPayload.map((row: any) => row.source_id).filter((value: string | null) => !!value)
            );
            const staleTaskIds = (existingTasks || [])
                .filter((row: any) => !row.source_id || !incomingTaskSourceIds.has(row.source_id))
                .map((row: any) => row.id);
            deletedStaleTasks = await deleteByIdsInChunks(supabase, 'task', staleTaskIds);
        }

        if (backlogFile) {
            const { data: existingBacklog, error: existingBacklogError } = await supabase
                .from('backlog_item')
                .select('id, source_id')
                .eq('project_id', project_id)
                .eq('data_origin', 'synced');
            if (existingBacklogError) throw existingBacklogError;

            const incomingBacklogSourceIds = new Set(
                backlogPayload.map((row: any) => row.source_id).filter((value: string | null) => !!value)
            );
            const staleBacklogIds = (existingBacklog || [])
                .filter((row: any) => !row.source_id || !incomingBacklogSourceIds.has(row.source_id))
                .map((row: any) => row.id);
            deletedStaleBacklog = await deleteByIdsInChunks(supabase, 'backlog_item', staleBacklogIds);
        }

        if (status || intentSummary) {
            const stage = status?.current_stage || deriveStage(status?.current_status);
            const { error: projectUpdateError } = await supabase
                .from('project')
                .update({
                    current_stage: stage,
                    blockers: status?.blockers || [],
                    pending_decisions: status?.pending_decisions || [],
                    focus: status?.focus || intentSummary || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', project_id);

            if (projectUpdateError) throw projectUpdateError;
        }

        // 5. Update connector heartbeat metadata for UI visibility.
        const { error: connectorUpdateError } = await supabase
            .from('connector')
            .update({
                last_sync_at: new Date().toISOString(),
                status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('project_id', project_id)
            .eq('connector_type', 'adf');

        if (connectorUpdateError) throw connectorUpdateError;

        // 6. Log activity
        await logActivity({
            entityType: 'project',
            entityId: project_id,
            actorType: 'connector',
            actorId: 'adf-sync',
            action: 'bulk_sync',
            detail: {
                count: totalCount,
                tasks: tasksCount,
                backlog: backlogCount,
                status: !!status,
                dedupe_dropped_tasks: droppedTaskDuplicates,
                dedupe_dropped_backlog: droppedBacklogDuplicates,
                deleted_stale_tasks: deletedStaleTasks,
                deleted_stale_backlog: deletedStaleBacklog
            }
        });

        return NextResponse.json({
            message: 'Sync complete',
            count: totalCount,
            tasks_count: upsertedTasks.length,
            backlog_count: upsertedBacklog.length,
            status_synced: !!status,
            cleanup: {
                dedupe_dropped_tasks: droppedTaskDuplicates,
                dedupe_dropped_backlog: droppedBacklogDuplicates,
                deleted_stale_tasks: deletedStaleTasks,
                deleted_stale_backlog: deletedStaleBacklog
            },
            tasks: upsertedTasks,
            backlog: upsertedBacklog
        });

    } catch (error: any) {
        console.error('Sync failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
