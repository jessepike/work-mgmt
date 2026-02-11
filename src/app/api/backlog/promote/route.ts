import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { validateWorkflowType } from '@/lib/api/validation';
import { resolveActor } from '@/lib/api/actor';

// POST /api/backlog/promote
// Promotes a backlog item to a task
export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json();
    const actor = await resolveActor(request, supabase);

    if (!body.backlog_item_id) {
        return NextResponse.json({ error: 'backlog_item_id is required' }, { status: 400 });
    }

    // 1. Fetch backlog item
    const { data: item, error: itemError } = await supabase
        .from('backlog_item')
        .select('*')
        .eq('id', body.backlog_item_id)
        .single();

    if (itemError || !item) {
        return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
    }

    if (item.status === 'promoted') {
        return NextResponse.json({ error: 'Item already promoted' }, { status: 400 });
    }

    // 2. Fetch project for validation
    const { data: project, error: projectError } = await supabase
        .from('project')
        .select('*')
        .eq('id', item.project_id)
        .single();

    if (projectError) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // 3. Validate workflow (if being promoted to a plan/phase)
    try {
        validateWorkflowType(project, body.plan_id, body.phase_id);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // 4. Create task (atomically if possible, but for MVP we sequential)
    const { data: task, error: taskError } = await supabase
        .from('task')
        .insert({
            project_id: item.project_id,
            plan_id: body.plan_id,
            phase_id: body.phase_id,
            title: item.title,
            description: item.description,
            priority: item.priority || body.priority,
            size: item.size || body.size,
            data_origin: item.data_origin,
            source_id: item.source_id,
            status: 'pending'
        } as any)
        .select()
        .single();

    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

    // 5. Update backlog item
    await supabase
        .from('backlog_item')
        .update({
            status: 'promoted',
            promoted_to_task_id: task.id
        })
        .eq('id', item.id);

    // 6. Log activity
    await logActivity({
        entityType: 'task',
        entityId: task.id,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: 'promoted_from_backlog',
        detail: { backlog_item_id: item.id }
    });

    return NextResponse.json({ data: task });
}
