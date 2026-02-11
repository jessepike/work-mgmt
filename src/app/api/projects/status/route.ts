import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { computeProjectHealth } from '@/lib/api/health';
import { getEnabledProjectIds } from '@/lib/api/enabled-projects';

// GET /api/projects/status
// Returns a high-level summary of the entire portfolio
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const scope = request.nextUrl.searchParams.get('scope');

    // 1. Fetch all active projects
    const { data: projects, error: projectsError } = await supabase
        .from('project')
        .select('id, name, status, health_override, health_reason')
        .eq('status', 'active');

    if (projectsError) {
        return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    let scopedProjects = projects || [];
    if (scope === 'enabled') {
        const enabledIds = await getEnabledProjectIds(supabase, scopedProjects.map((p) => p.id));
        scopedProjects = scopedProjects.filter((p) => enabledIds.has(p.id));
    }

    // 2. Fetch all active tasks for these projects to compute health
    const projectIds = scopedProjects.map(p => p.id);
    if (projectIds.length === 0) {
        return NextResponse.json({
            data: {
                total_projects: 0,
                by_status: { active: 0, on_hold: 0, archived: 0 },
                by_health: { healthy: 0, at_risk: 0, unhealthy: 0 },
                task_summary: { pending: 0, in_progress: 0, blocked: 0, overdue: 0, total_active: 0 },
                upcoming_deadlines: []
            }
        });
    }
    const { data: tasks, error: tasksError } = await supabase
        .from('task')
        .select('id, project_id, status, deadline_at')
        .in('project_id', projectIds)
        .neq('status', 'done');

    if (tasksError) {
        return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    // Group tasks by project
    const tasksByProject = (tasks || []).reduce((acc, task) => {
        if (!acc[task.project_id]) acc[task.project_id] = [];
        acc[task.project_id].push(task);
        return acc;
    }, {} as Record<string, any[]>);

    // 3. Compute stats
    const by_status: Record<string, number> = { active: scopedProjects.length, on_hold: 0, archived: 0 };
    const by_health: Record<string, number> = { healthy: 0, at_risk: 0, unhealthy: 0 };

    // Task aggregation
    const task_summary = {
        pending: 0,
        in_progress: 0,
        blocked: 0,
        overdue: 0,
        total_active: tasks?.length || 0
    };

    const now = new Date();

    (tasks || []).forEach(task => {
        if (task.status === 'pending') task_summary.pending++;
        if (task.status === 'in_progress') task_summary.in_progress++;
        if (task.status === 'blocked') task_summary.blocked++;
        if (task.deadline_at && new Date(task.deadline_at) < now) {
            task_summary.overdue++;
        }
    });

    const deadlines: any[] = [];

    scopedProjects.forEach(project => {
        let health = project.health_override;
        if (!health) {
            const projectTasks = tasksByProject[project.id] || [];
            // Simplified lastActivity for aggregation
            const computed = computeProjectHealth(projectTasks, now.toISOString());
            health = computed.health;
        }

        if (health === 'green') by_health.healthy++;
        else if (health === 'yellow') by_health.at_risk++;
        else if (health === 'red') by_health.unhealthy++;

        // Collect upcoming deadlines
        const projectTasks = tasksByProject[project.id] || [];
        projectTasks.forEach(t => {
            if (t.deadline_at) {
                deadlines.push({
                    project_id: project.id,
                    project_name: project.name,
                    task_id: t.id,
                    deadline: t.deadline_at,
                    health: health
                });
            }
        });
    });

    // Sort deadlines and take top 5
    const upcoming_deadlines = deadlines
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, 5);

    let onHoldCount = 0;
    let archivedCount = 0;
    if (scope !== 'enabled') {
        // Fetch on_hold (paused in DB) /archived counts separately for completeness
        const { count: onHold } = await supabase
            .from('project')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'paused');

        const { count: archived } = await supabase
            .from('project')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'archived');

        onHoldCount = onHold || 0;
        archivedCount = archived || 0;
    }

    by_status.on_hold = onHoldCount;
    by_status.archived = archivedCount;

    return NextResponse.json({
        data: {
            total_projects: scope === 'enabled'
                ? scopedProjects.length
                : scopedProjects.length + (onHoldCount || 0) + (archivedCount || 0),
            by_status,
            by_health,
            task_summary,
            upcoming_deadlines
        }
    });
}
