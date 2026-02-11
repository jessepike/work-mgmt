import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getEnabledProjectIds } from '@/lib/api/enabled-projects';

// GET /api/whats-next
// Algorithm:
// 1. Overdue tasks (P0)
// 2. High priority (P1) tasks in *active* phases/projects (checking project status is active, phase status is active if exists)
// 3. Oldest in-progress tasks
// 4. Recently unblocked? (Hard to track "recently unblocked" without specific timestamp, but we can prioritize active unblocked tasks)
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const enabledProjectIds = await getEnabledProjectIds(supabase);

    // Fetch candidate tasks (Active, not done)
    // We need to fetch tasks and join project/phase to check active status
    // Supabase complex filtering across relations is tricky in one query.
    // We'll fetch active tasks and filter/sort in memory for MVP, or efficient RPC.
    // Given single-user scale, in-memory sorting of ~100 active tasks is fine.

    const { data: tasks, error } = await supabase
        .from('task')
        .select(`
        *,
        project:project_id(id, name, status, current_phase_id),
        phase:phase_id(status)
    `)
        .neq('status', 'done');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = new Date().getTime();

    // Score tasks
    const scoredTasks = tasks
        .filter((task) => enabledProjectIds.has(task.project_id))
        .map(task => {
        let score = 0;
        let reasons: string[] = [];

        const deadline = task.deadline_at ? new Date(task.deadline_at).getTime() : null;
        const isOverdue = deadline && deadline < now;

        // 1. Overdue
        if (isOverdue) {
            score += 100;
            reasons.push('Overdue');
        }

        // 2. High Priority (P1)
        if (task.priority === 'P1') {
            score += 50;
            reasons.push('High Priority');
        }

        // 3. Active Phase/Context
        // If task is in the project's current active phase
        // Check if project is active first
        if (task.project?.status === 'active') {
            if (task.phase_id && task.project.current_phase_id === task.phase_id) {
                score += 30;
                reasons.push('Active Phase');
            } else if (!task.phase_id) {
                // Flat project active task
                score += 10;
            }
        }

        // 4. In Progress (finish what you started)
        if (task.status === 'in_progress') {
            score += 20;
            reasons.push('In Progress');
        }

        // 4b. Blocked tasks still need visibility in today's view.
        if (task.status === 'blocked') {
            score += 35;
            reasons.push('Blocked');
        }

        // 5. Approaching deadline (within 2 days)
        if (deadline && !isOverdue && deadline < now + (2 * 24 * 60 * 60 * 1000)) {
            score += 40;
            reasons.push('Approaching Deadline');
        }

            return { ...task, score, match_reasons: reasons };
        });

    // Sort by score desc, then:
    // - in_progress before pending before blocked
    // - oldest first for tie-breaks
    scoredTasks.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const statusRank = (s: string) => s === 'in_progress' ? 0 : s === 'pending' ? 1 : s === 'blocked' ? 2 : 3;
        const aStatus = statusRank(a.status);
        const bStatus = statusRank(b.status);
        if (aStatus !== bStatus) return aStatus - bStatus;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return NextResponse.json({ data: scoredTasks.slice(0, 10) }); // Top 10
}
