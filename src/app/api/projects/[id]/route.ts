import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { computeProjectHealth } from '@/lib/api/health';
import { resolveActor } from '@/lib/api/actor';

function latestIso(a: string | null, b: string | null): string | null {
    if (!a) return b;
    if (!b) return a;
    return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

// Helper to validate UUID
function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Next.js 15 params are async
) {
    const { id } = await params;
    if (!isValidUUID(id)) {
        return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // 1. Fetch project.
    // We avoid embedding phase directly because project<->phase has two FKs
    // (project.current_phase_id and phase.project_id), which makes embedding ambiguous.
    const { data: project, error: projectError } = await supabase
        .from('project')
        .select(`
      *,
      owner:actor_registry!owner_id(name)
    `)
        .eq('id', id)
        .single();

    if (projectError) {
        return NextResponse.json({ error: projectError.message }, { status: 404 });
    }

    // 2. Fetch plans and phases separately
    const { data: plans, error: plansError } = await supabase
        .from('plan')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

    if (plansError) {
        return NextResponse.json({ error: plansError.message }, { status: 500 });
    }

    const { data: phases, error: phasesError } = await supabase
        .from('phase')
        .select('*')
        .eq('project_id', id)
        .order('sort_order', { ascending: true });

    if (phasesError) {
        return NextResponse.json({ error: phasesError.message }, { status: 500 });
    }

    // 3. Fetch connector info if connected
    let connectorInfo = null;
    if (project.project_type === 'connected') {
        const { data: connector } = await supabase
            .from('connector')
            .select('id, connector_type, status, last_sync_at')
            .eq('project_id', id)
            .single();
        connectorInfo = connector;
    }

    // 4. Fetch tasks for health & summary
    const { data: tasks, error: tasksError } = await supabase
        .from('task')
        .select('*')
        .eq('project_id', id);

    if (tasksError) {
        return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    const { data: backlogItems, error: backlogError } = await supabase
        .from('backlog_item')
        .select('status, priority')
        .eq('project_id', id);

    if (backlogError) {
        return NextResponse.json({ error: backlogError.message }, { status: 500 });
    }

    // 5. Compute Health
    const taskIds = tasks.map(t => t.id);

    const { data: projectActivityRows, error: projectActivityError } = await supabase
        .from('activity_log')
        .select('created_at')
        .eq('entity_type', 'project')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (projectActivityError) {
        return NextResponse.json({ error: projectActivityError.message }, { status: 500 });
    }

    let latestTaskActivityAt: string | null = null;
    if (taskIds.length > 0) {
        // Chunk to avoid supabase query-string URI limits on large projects.
        const idChunks = chunk(taskIds, 100);
        for (const idChunk of idChunks) {
            const { data: taskActivityRows, error: taskActivityError } = await supabase
                .from('activity_log')
                .select('created_at')
                .eq('entity_type', 'task')
                .in('entity_id', idChunk)
                .order('created_at', { ascending: false })
                .limit(1);

            if (taskActivityError) {
                return NextResponse.json({ error: taskActivityError.message }, { status: 500 });
            }

            latestTaskActivityAt = latestIso(latestTaskActivityAt, taskActivityRows?.[0]?.created_at || null);
        }
    }

    const latestProjectActivityAt = projectActivityRows?.[0]?.created_at || null;
    const lastActivityAt = latestIso(latestProjectActivityAt, latestTaskActivityAt);

    let health = project.health_override;
    let healthReason = project.health_reason;

    if (!health) {
        const computed = computeProjectHealth(tasks, lastActivityAt);
        health = computed.health;
        healthReason = computed.reason;
    }

    // 6. Summarize
    const counts = {
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        done: tasks.filter(t => t.status === 'done').length,
        total: tasks.length
    };

    const activeBlockers = tasks
        .filter(t => t.status === 'blocked')
        .map(t => ({ id: t.id, title: t.title, blocked_reason: t.blocked_reason }));
    const backlogSummary = {
        active: (backlogItems || []).filter((item) => item.status !== 'promoted' && item.status !== 'archived').length,
        completed: (backlogItems || []).filter((item) => item.status === 'promoted' || item.status === 'archived').length,
        p1_active: (backlogItems || []).filter((item) => (item.status !== 'promoted' && item.status !== 'archived') && item.priority === 'P1').length,
    };

    // Find current plan
    // Logic: "one non-completed plan". Or specifically the one referenced by project?
    // Design says "Current plan (if planned workflow)".
    // We fetched all plans.
    const currentPlan = (plans || []).find((p: any) => p.status !== 'completed');

    return NextResponse.json({
        data: {
            ...project,
            phases: phases || [],
            plans: plans || [],
            health,
            health_reason: healthReason,
            connector: connectorInfo,
            task_summary: counts,
            backlog_summary: backlogSummary,
            active_blockers: activeBlockers,
            current_plan: currentPlan || null
        }
    });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) {
        return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const body = await request.json();
    const actor = await resolveActor(request, supabase);

    // Validate allowed fields
    // For MVP, simplistic validation.
    const { data, error } = await supabase
        .from('project')
        .update(body)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await logActivity({
        entityType: 'project',
        entityId: id,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: 'updated',
        detail: body
    });

    return NextResponse.json({ data });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) {
        return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const actor = await resolveActor(request, supabase);

    // Soft delete: status = 'archived'
    const { data, error } = await supabase
        .from('project')
        .update({ status: 'archived' })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity({
        entityType: 'project',
        entityId: id,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: 'archived'
    });

    return NextResponse.json({ data });
}
