import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { computeProjectHealth } from '@/lib/api/health';


// GET /api/projects
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const statusFilter = searchParams.get('status')?.split(',') || [];
    const categoriesFilter = searchParams.get('categories')?.split(',') || [];
    const healthFilter = searchParams.get('health')?.split(',') || [];

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
    const projectIds = projects.map(p => p.id);

    const { data: tasks, error: tasksError } = await supabase
        .from('task')
        .select('id, project_id, status, deadline_at')
        .in('project_id', projectIds)
        .neq('status', 'done'); // Only need active tasks for most health checks? 
    // Wait, health check needs to know if there are ANY tasks?
    // And overdue checks. overdue is active tasks with deadline < now.
    // So neq status done is good.

    // We also need last activity for each project
    const { data: activities, error: activityError } = await supabase
        .from('activity_log')
        .select('entity_id, created_at, project_id:entity_id') // Wait, entity_id is polymorphic.
    // We can't join easily. We have to query by entity_id IN projectIds? 
    // No, activity log is by entity. Project activity is entity_type='project'.
    // But task activity also counts as project activity?
    // The health logic says "No activity in X days". Usually implies ANY activity in the project.
    // This is hard to query efficiently without a "last_activity_at" on the project table.
    // RECOMMENDATION: Add last_activity_at to project table and update it via trigger.
    // For now, I will skip the "days since activity" check in the list view to avoid massive queries,
    // OR just verify project-level activity.

    // Let's stick to the critical path.

    if (tasksError) {
        return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    // Group tasks by project
    const tasksByProject = (tasks || []).reduce((acc, task) => {
        if (!acc[task.project_id]) acc[task.project_id] = [];
        acc[task.project_id].push(task);
        return acc;
    }, {} as Record<string, typeof tasks>);

    // Compute health and shape response
    const results = projects.map(project => {
        // Determine health
        let health = project.health_override;
        let healthReason = project.health_reason;

        if (!health) {
            const projectTasks = tasksByProject[project.id] || [];
            // Mocking lastActivity for now as current time to avoid false positives on "no activity" 
            // until we implement the last_activity_at column or complex query.
            const computed = computeProjectHealth(projectTasks as any, new Date().toISOString());
            health = computed.health;
            healthReason = computed.reason;
        }

        // Filter by health if requested (post-computation filter)
        if (healthFilter.length > 0 && !healthFilter.includes(health)) {
            return null;
        }

        // Task counts
        const projectTasks = tasksByProject[project.id] || [];
        const counts = {
            pending: projectTasks.filter(t => t.status === 'pending').length,
            in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
            blocked: projectTasks.filter(t => t.status === 'blocked').length,
            // done is not fetched in the optimization above, so checking "total active"
            total_active: projectTasks.length
        };

        return {
            ...project,
            health,
            health_reason: healthReason,
            task_summary: counts
        };
    }).filter(Boolean);

    return NextResponse.json({ data: results });
}

// POST /api/projects
export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json();

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
            name: body.name,
            description: body.description,
            project_type: body.project_type,
            categories: body.categories,
            tags: body.tags,
            workflow_type: body.workflow_type,
            owner_id: body.owner_id,
            status: body.status || 'active',
            focus: body.focus
        })
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
        actorType: 'human', // validation required
        actorId: body.owner_id, // simplistic assumption
        action: 'created',
        detail: { name: data.name }
    });

    return NextResponse.json({ data });
}
