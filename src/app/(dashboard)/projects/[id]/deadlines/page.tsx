import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriorityChip } from "@/components/ui/PriorityChip";
import type { ApiResponse, Task } from "@/lib/types/api";

interface ProjectInfo {
    id: string;
    name: string;
}

interface DeadlinePageProps {
    params: Promise<{ id: string }>;
}

type Bucket = "overdue" | "today" | "this_week" | "later" | "no_deadline";

const bucketOrder: Bucket[] = ["overdue", "today", "this_week", "later", "no_deadline"];
const bucketLabels: Record<Bucket, string> = {
    overdue: "Overdue",
    today: "Due Today",
    this_week: "Due This Week",
    later: "Due Later",
    no_deadline: "No Deadline",
};

export default async function ProjectDeadlinePage({ params }: DeadlinePageProps) {
    const { id } = await params;

    let project: ProjectInfo | null = null;
    let tasks: Task[] = [];
    let error: string | null = null;

    try {
        const [projectRes, tasksRes] = await Promise.all([
            apiFetch<ApiResponse<ProjectInfo>>(`/api/projects/${id}`),
            apiFetch<ApiResponse<Task[]>>(`/api/tasks?project_id=${id}&status=pending,in_progress,blocked`),
        ]);
        project = projectRes.data;
        tasks = tasksRes.data || [];
    } catch (e) {
        error = e instanceof Error ? e.message : "Failed to load deadline view";
    }

    if (error || !project) {
        return (
            <div className="p-8 lg:p-12">
                <EmptyState message="Deadline view unavailable" description={error || "Project not found"} />
            </div>
        );
    }

    const grouped = groupTasksByDeadline(tasks);

    return (
        <div className="flex flex-col min-h-full bg-zed-main">
            <header className="px-8 h-14 flex items-center justify-between border-b border-zed-border bg-zed-header/30">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href={`/projects/${project.id}`} className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-secondary">
                        Back to Overview
                    </Link>
                    <h2 className="text-sm font-semibold text-text-primary truncate">{project.name}</h2>
                </div>
                <nav className="hidden lg:flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50">
                    <Link href={`/projects/${project.id}`} className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-secondary">
                        Overview
                    </Link>
                    <Link href={`/projects/${project.id}/priority`} className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-secondary">
                        Priority
                    </Link>
                    <Link href={`/projects/${project.id}/deadlines`} className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-zed-active text-primary rounded-sm shadow-sm">
                        Deadlines
                    </Link>
                </nav>
            </header>

            <div className="p-8 space-y-6">
                {tasks.length === 0 ? (
                    <EmptyState message="No active tasks" description="This project has no pending work with deadlines." />
                ) : (
                    bucketOrder.map((bucket) => {
                        const rows = grouped.get(bucket) || [];
                        if (rows.length === 0) return null;
                        return (
                            <section key={bucket}>
                                <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted">{bucketLabels[bucket]}</h3>
                                    <span className="text-[10px] font-mono text-text-muted">({rows.length})</span>
                                    <div className="h-[1px] flex-1 bg-zed-border/50" />
                                </div>
                                <div className="space-y-2">
                                    {rows.map((task) => (
                                        <Link
                                            key={task.id}
                                            href={`/projects/${project.id}?from=deadlines&task=${task.id}`}
                                            className="block rounded border border-zed-border bg-zed-sidebar/30 hover:bg-zed-hover transition-colors px-3 py-3"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-medium text-text-primary truncate">{task.title}</span>
                                                <PriorityChip priority={task.priority || "P3"} />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
                                                <span>{task.status.replace("_", " ")}</span>
                                                <span>{task.deadline_at ? new Date(task.deadline_at).toLocaleDateString("en-US") : "no due date"}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function groupTasksByDeadline(tasks: Task[]): Map<Bucket, Task[]> {
    const grouped = new Map<Bucket, Task[]>();
    const now = new Date();
    const startOfTomorrow = new Date(now);
    startOfTomorrow.setHours(24, 0, 0, 0);
    const startOfNextWeek = new Date(now);
    startOfNextWeek.setDate(now.getDate() + 7);
    startOfNextWeek.setHours(23, 59, 59, 999);

    for (const task of tasks) {
        let bucket: Bucket = "no_deadline";
        if (task.deadline_at) {
            const deadline = new Date(task.deadline_at);
            if (deadline.getTime() < now.getTime()) bucket = "overdue";
            else if (deadline.getTime() < startOfTomorrow.getTime()) bucket = "today";
            else if (deadline.getTime() <= startOfNextWeek.getTime()) bucket = "this_week";
            else bucket = "later";
        }
        if (!grouped.has(bucket)) grouped.set(bucket, []);
        grouped.get(bucket)!.push(task);
    }

    for (const [bucket, rows] of grouped.entries()) {
        rows.sort((a, b) => {
            const aDeadline = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            const bDeadline = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            if (aDeadline !== bDeadline) return aDeadline - bDeadline;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        grouped.set(bucket, rows);
    }

    return grouped;
}
