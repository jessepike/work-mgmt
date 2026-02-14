import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { computeProjectHealth } from '@/lib/api/health';
import { resolveActor } from '@/lib/api/actor';
import { getEnabledProjectIds } from '@/lib/api/enabled-projects';

function latestIso(a: string | null, b: string | null): string | null {
    if (!a) return b;
    if (!b) return a;
    return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

// GET /api/projects
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const statusFilter = searchParams.get('status')?.split(',') || [];
    const categoriesFilter = searchParams.get('categories')?.split(',') || [];
    const healthFilter = searchParams.get('health')?.split(',') || [];
    const scope = searchParams.get('scope');

    // 1. Fetch projects
    let query = supabase.from('project').select('*');

    if (statusFilter.length > 0) {
        query = query.in('status', statusFilter as any);
    }
    // Categories is an array column, so we use overlaps or contains
    if (categoriesFilter.length > 0) {
        query = query.overlaps('categories', categoriesFilter);
    }

    const { data: projects, error: projectsError } = await query.order('created_at', { ascending: false });

    if (projectsError) {
        return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    // 2. Fetch tasks for health computation (optimized: we could fetch only pending/recent tasks, 
    // but for MVP fetching all tasks per project is acceptable or checking last activity).
    // To avoid N+1, let's fetch task summaries.
    // Actually, computeHealth needs overdue tasks + blocked tasks + last activity.
    // We can fetch all active tasks + recent activity for these projects.

    // For MVP simplicity: Fetch all tasks for these projects. 
    // Optimization: In a real app, we'd use a view or RPC.
    let filteredProjects = projects || [];
    if (scope === 'enabled') {
        const enabledIds = await getEnabledProjectIds(supabase, filteredProjects.map(p => p.id));
        filteredProjects = filteredProjects.filter((p) => enabledIds.has(p.id));
    }

    const projectIds = filteredProjects.map(p => p.id);

    if (projectIds.length === 0) {
        return NextResponse.json({ data: [] });
    }

    const { data: tasks, error: tasksError } = await supabase
        .from('task')
        .select('id, project_id, status, deadline_at')
        .in('project_id', projectIds)
        .neq('status', 'done'); // Only need active tasks for most health checks? 
    // Wait, health check needs to know if there are ANY tasks?
    // And overdue checks. overdue is active tasks with deadline < now.
    // So neq status done is good.

    if (tasksError) {
        return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    const { data: backlogItems, error: backlogError } = await supabase
        .from('backlog_item')
        .select('project_id, status, priority')
        .in('project_id', projectIds)
        .in('status', ['captured', 'triaged', 'prioritized']);

    if (backlogError) {
        return NextResponse.json({ error: backlogError.message }, { status: 500 });
    }

    const { data: connectors, error: connectorError } = await supabase
        .from('connector')
        .select('project_id, status, last_sync_at')
        .eq('connector_type', 'adf')
        .in('project_id', projectIds);

    if (connectorError) {
        return NextResponse.json({ error: connectorError.message }, { status: 500 });
    }

    // Build task->project map to roll up task activity into project activity.
    const taskToProject = (tasks || []).reduce((acc, task) => {
        acc[task.id] = task.project_id;
        return acc;
    }, {} as Record<string, string>);

    // Fetch direct project activity
    let projectActivityByProject: Record<string, string | null> = {};
    if (projectIds.length > 0) {
        const { data: projectActivityRows, error: projectActivityError } = await supabase
            .from('activity_log')
            .select('entity_id, created_at')
            .eq('entity_type', 'project')
            .in('entity_id', projectIds);

        if (projectActivityError) {
            return NextResponse.json({ error: projectActivityError.message }, { status: 500 });
        }

        for (const row of projectActivityRows || []) {
            const current = projectActivityByProject[row.entity_id] || null;
            projectActivityByProject[row.entity_id] = latestIso(current, row.created_at);
        }
    }

    // Fetch task activity and roll it up to project.
    // Batch in chunks to avoid Supabase URI length limits with many task IDs.
    let taskActivityByProject: Record<string, string | null> = {};
    const taskIds = Object.keys(taskToProject);
    const BATCH_SIZE = 100;
    for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
        const batch = taskIds.slice(i, i + BATCH_SIZE);
        const { data: taskActivityRows, error: taskActivityError } = await supabase
            .from('activity_log')
            .select('entity_id, created_at')
            .eq('entity_type', 'task')
            .in('entity_id', batch);

        if (taskActivityError) {
            return NextResponse.json({ error: taskActivityError.message }, { status: 500 });
        }

        for (const row of taskActivityRows || []) {
            const pid = taskToProject[row.entity_id];
            if (!pid) continue;
            const current = taskActivityByProject[pid] || null;
            taskActivityByProject[pid] = latestIso(current, row.created_at);
        }
    }

    // Group tasks by project
    const tasksByProject = (tasks || []).reduce((acc, task) => {
        if (!acc[task.project_id]) acc[task.project_id] = [];
        acc[task.project_id].push(task);
        return acc;
    }, {} as Record<string, typeof tasks>);

    const backlogByProject = (backlogItems || []).reduce((acc, item) => {
        if (!acc[item.project_id]) {
            acc[item.project_id] = { total_active: 0, p1: 0, p2: 0, p3: 0 };
        }
        acc[item.project_id].total_active += 1;
        if (item.priority === 'P1') acc[item.project_id].p1 += 1;
        if (item.priority === 'P2') acc[item.project_id].p2 += 1;
        if (item.priority === 'P3') acc[item.project_id].p3 += 1;
        return acc;
    }, {} as Record<string, { total_active: number; p1: number; p2: number; p3: number }>);
    const connectorByProject = (connectors || []).reduce((acc, item) => {
        acc[item.project_id] = item;
        return acc;
    }, {} as Record<string, { project_id: string; status: string; last_sync_at: string | null }>);

    // Compute health and shape response
    const results = filteredProjects.map(project => {
        // Determine health
        let health = project.health_override;
        let healthReason = project.health_reason;

        if (!health) {
            const projectTasks = tasksByProject[project.id] || [];
            const projectLastActivity = latestIso(
                projectActivityByProject[project.id] || null,
                taskActivityByProject[project.id] || null
            );
            const computed = computeProjectHealth(projectTasks as any, projectLastActivity);
            health = computed.health;
            healthReason = computed.reason;
        }

        // Filter by health if requested (post-computation filter)
        if (healthFilter.length > 0 && !healthFilter.includes(health)) {
            return null;
        }

        // Task counts
        const projectTasks = tasksByProject[project.id] || [];
        const now = Date.now();
        const counts = {
            pending: projectTasks.filter(t => t.status === 'pending').length,
            in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
            blocked: projectTasks.filter(t => t.status === 'blocked').length,
            overdue: projectTasks.filter(t => t.deadline_at && new Date(t.deadline_at).getTime() < now).length,
            // done is not fetched in the optimization above, so checking "total active"
            total_active: projectTasks.length
        };
        const lastActivityAt = latestIso(
            projectActivityByProject[project.id] || null,
            taskActivityByProject[project.id] || null
        );

        return {
            ...project,
            health,
            health_reason: healthReason,
            last_activity_at: lastActivityAt,
            connector_summary: connectorByProject[project.id] || null,
            task_summary: counts,
            backlog_summary: backlogByProject[project.id] || { total_active: 0, p1: 0, p2: 0, p3: 0 }
        };
    }).filter(Boolean);

    return NextResponse.json({ data: results });
}

// POST /api/projects
export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json();
    const actor = await resolveActor(request, supabase, { actorId: body.owner_id, actorType: 'human' });

    // Manual validation
    if (!body.name || !body.owner_id || !body.project_type || !body.workflow_type) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Array.isArray(body.categories) || body.categories.length === 0) {
        return NextResponse.json({ error: 'At least one category is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('project')
        .insert({
            ...(body.id ? { id: body.id } : {}),
            name: body.name,
            description: body.description,
            project_type: body.project_type,
            categories: body.categories,
            tags: body.tags,
            workflow_type: body.workflow_type,
            owner_id: body.owner_id,
            status: body.status || 'active',
            focus: body.focus
        } as any)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    // Determine actor_id. For now, assume parameters passed or parsed from Auth.
    // In a real scenario, we extract this from the JWT.
    // For MVP, we'll use the owner_id as the actor if not provided in headers (which it isn't yet).
    // Or we decode the JWT.
    // Let's use a placeholder 'system' or the owner_id for now.

    await logActivity({
        entityType: 'project',
        entityId: data.id,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: 'created',
        detail: { name: data.name }
    });

    return NextResponse.json({ data });
}
