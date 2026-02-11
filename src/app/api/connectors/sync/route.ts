import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { parseTasksMd, parseBacklogMd, parseStatusMd } from '@/lib/adf/parser';
import path from 'path';
import fs from 'fs/promises';

function normalizeSourceId(sourceId: string, projectPath: string): string {
    if (!sourceId) return sourceId;
    const normalizedRoot = projectPath.replace(/\\/g, '/');
    const normalizedSource = sourceId.replace(/\\/g, '/');

    if (normalizedSource.startsWith(normalizedRoot)) {
        return normalizedSource.replace(normalizedRoot, '.');
    }

    return normalizedSource;
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
            path.join(projectPath, "docs", "task.md")
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
        const tasksCount = tasks.length;
        const backlogCount = backlog.length;
        const totalCount = tasksCount + backlogCount;

        if (totalCount === 0 && !status) {
            return NextResponse.json({ message: 'No items found to sync', count: 0 });
        }

        // 3. Prepare payloads for bulk upsert
        const taskPayload = tasks.map(item => ({
            project_id,
            source_id: normalizeSourceId(item.source_id, projectPath),
            title: item.title,
            status: item.status,
            priority: item.priority || "P2",
            data_origin: "synced",
            updated_at: new Date().toISOString()
        } as any));

        const backlogPayload = backlog.map(item => ({
            project_id,
            source_id: normalizeSourceId(item.source_id, projectPath),
            title: item.title,
            description: item.description || null,
            priority: item.priority || "P2",
            status: item.status,
            data_origin: "synced",
            updated_at: new Date().toISOString()
        } as any));

        // 4. Perform bulk upserts
        let upsertedTasks: any[] = [];
        let upsertedBacklog: any[] = [];

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

        if (status) {
            const { error: projectUpdateError } = await supabase
                .from('project')
                .update({
                    current_stage: status.current_status,
                    blockers: status.blockers,
                    pending_decisions: status.pending_decisions,
                    focus: status.focus || null,
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
                status: !!status
            }
        });

        return NextResponse.json({
            message: 'Sync complete',
            count: totalCount,
            tasks_count: upsertedTasks.length,
            backlog_count: upsertedBacklog.length,
            status_synced: !!status,
            tasks: upsertedTasks,
            backlog: upsertedBacklog
        });

    } catch (error: any) {
        console.error('Sync failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
