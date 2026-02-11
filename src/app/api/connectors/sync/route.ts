import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { parseTasksMd, parseBacklogMd } from '@/lib/adf/parser';
import path from 'path';
import fs from 'fs/promises';

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
            path.join(projectPath, "docs", "BACKLOG.md")
        ];

        let backlogFile = "";
        for (const p of possibleBacklogPaths) {
            try {
                await fs.access(p);
                backlogFile = p;
                break;
            } catch { }
        }

        const tasksCount = tasksFile ? (await parseTasksMd(tasksFile)).length : 0;
        const backlogCount = backlogFile ? (await parseBacklogMd(backlogFile)).length : 0;

        const tasks = tasksFile ? await parseTasksMd(tasksFile) : [];
        const backlog = backlogFile ? await parseBacklogMd(backlogFile) : [];

        const allItems = [...tasks, ...backlog];

        if (allItems.length === 0) {
            return NextResponse.json({ message: 'No items found to sync', count: 0 });
        }

        // 3. Prepare payload for bulk upsert
        const payload = allItems.map(item => ({
            project_id,
            source_id: item.source_id,
            title: item.title,
            status: item.status,
            priority: item.priority || "P2",
            data_origin: "synced",
            updated_at: new Date().toISOString()
        } as any));

        // 4. Perform bulk upsert
        const { data, error: upsertError } = await supabase
            .from('task')
            .upsert(payload, {
                onConflict: 'project_id, source_id',
                ignoreDuplicates: false
            })
            .select();

        if (upsertError) {
            throw upsertError;
        }

        // 5. Log activity
        await logActivity({
            entityType: 'project',
            entityId: project_id,
            actorType: 'connector',
            actorId: 'adf-sync',
            action: 'bulk_sync',
            detail: {
                count: allItems.length,
                tasks: tasksCount,
                backlog: backlogCount
            }
        });

        return NextResponse.json({
            message: 'Sync complete',
            count: allItems.length,
            data
        });

    } catch (error: any) {
        console.error('Sync failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
