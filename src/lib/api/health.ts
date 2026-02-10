import { Database } from '../types/database';

type Task = Database['public']['Tables']['task']['Row'];
type ProjectHealth = Database['public']['Enums']['project_health'];

export interface HealthSignal {
    health: ProjectHealth;
    reason: string;
}

export function computeProjectHealth(
    tasks: Task[],
    lastActivityAt: string | null
): HealthSignal {
    const now = new Date();
    const activeTasks = tasks.filter(t => t.status !== 'done');
    const blockedTasks = activeTasks.filter(t => t.status === 'blocked');

    // Red signals (worst first)
    const overdue = tasks.filter(t =>
        t.deadline_at && new Date(t.deadline_at) < now && t.status !== 'done'
    );
    if (overdue.length > 0) {
        return { health: 'red', reason: `${overdue.length} overdue task(s)` };
    }

    if (activeTasks.length > 0 && blockedTasks.length / activeTasks.length > 0.3) {
        return { health: 'red', reason: `${blockedTasks.length}/${activeTasks.length} tasks blocked (>30%)` };
    }

    const daysSinceActivity = lastActivityAt
        ? (now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;

    // If no activity timestamp provided (new project), treat as recent activity = 0 days
    if (lastActivityAt && daysSinceActivity > 14) {
        return { health: 'red', reason: `No activity in ${Math.floor(daysSinceActivity)} days` };
    }

    // Yellow signals
    const soonDeadlines = tasks.filter(t => {
        if (!t.deadline_at || t.status === 'done') return false;
        const deadline = new Date(t.deadline_at);
        return deadline > now && deadline.getTime() < now.getTime() + 48 * 60 * 60 * 1000;
    });

    if (soonDeadlines.length > 0) {
        return { health: 'yellow', reason: `${soonDeadlines.length} deadline(s) within 48h` };
    }

    if (blockedTasks.length > 0) {
        return { health: 'yellow', reason: `${blockedTasks.length} blocked task(s)` };
    }

    if (lastActivityAt && daysSinceActivity > 7) {
        return { health: 'yellow', reason: `No activity in ${Math.floor(daysSinceActivity)} days` };
    }

    // Green
    return { health: 'green', reason: 'On track' };
}
