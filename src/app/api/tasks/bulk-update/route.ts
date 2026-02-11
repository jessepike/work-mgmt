import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { resolveActor } from '@/lib/api/actor';

interface BulkUpdateBody {
    task_ids: string[];
    updates: {
        status?: 'pending' | 'in_progress' | 'blocked' | 'done';
        priority?: 'P1' | 'P2' | 'P3';
    };
}

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json() as BulkUpdateBody;
    const actor = await resolveActor(request, supabase);

    if (!Array.isArray(body.task_ids) || body.task_ids.length === 0) {
        return NextResponse.json({ error: 'task_ids must be a non-empty array' }, { status: 400 });
    }
    if (!body.updates || (!body.updates.status && !body.updates.priority)) {
        return NextResponse.json({ error: 'updates.status and/or updates.priority is required' }, { status: 400 });
    }
    if (body.task_ids.some((id) => !isValidUUID(id))) {
        return NextResponse.json({ error: 'task_ids must contain valid UUIDs' }, { status: 400 });
    }

    const { data: tasks, error: taskFetchError } = await supabase
        .from('task')
        .select('id, project_id, data_origin')
        .in('id', body.task_ids);

    if (taskFetchError) {
        return NextResponse.json({ error: taskFetchError.message }, { status: 500 });
    }

    const foundIds = new Set((tasks || []).map((t) => t.id));
    const missingIds = body.task_ids.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
        return NextResponse.json({ error: `Some tasks were not found (${missingIds.length})` }, { status: 404 });
    }

    const forbiddenForSynced = !!body.updates.priority;
    const allowedTasks = (tasks || []).filter((task) => !(forbiddenForSynced && task.data_origin === 'synced'));
    const skippedIds = (tasks || [])
        .filter((task) => forbiddenForSynced && task.data_origin === 'synced')
        .map((task) => task.id);

    if (allowedTasks.length === 0) {
        return NextResponse.json({
            error: 'No tasks eligible for update (synced tasks only allow status changes)',
            skipped_ids: skippedIds
        }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = {
        ...body.updates,
        updated_at: nowIso,
    };
    if (body.updates.status === 'done') updates.completed_at = nowIso;
    if (body.updates.status && body.updates.status !== 'done') updates.completed_at = null;

    const eligibleIds = allowedTasks.map((task) => task.id);
    const { error: updateError } = await supabase
        .from('task')
        .update(updates)
        .in('id', eligibleIds);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const projectId = allowedTasks[0]?.project_id || null;
    if (projectId) {
        await logActivity({
            entityType: 'project',
            entityId: projectId,
            actorType: actor.actorType,
            actorId: actor.actorId,
            action: 'bulk_task_update',
            detail: {
                count: eligibleIds.length,
                updates: body.updates,
                skipped_ids: skippedIds
            }
        });
    }

    return NextResponse.json({
        data: {
            updated_count: eligibleIds.length,
            skipped_ids: skippedIds
        }
    });
}
