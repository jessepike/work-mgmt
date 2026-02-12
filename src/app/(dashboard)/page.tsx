import { TaskItem } from "@/components/ui/TaskItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/api/fetch";
import { TodayHeaderActions } from "@/components/features/TodayHeaderActions";
import type { TaskWithProject, ApiResponse } from "@/lib/types/api";

type DeadlineBucket = "overdue" | "today" | "this_week" | "later";

function bucketTask(task: TaskWithProject): DeadlineBucket {
    const reasons = task.match_reasons || [];
    if (reasons.includes("Overdue")) return "overdue";
    if (reasons.includes("Approaching Deadline")) return "today";

    if (task.deadline_at) {
        const deadline = new Date(task.deadline_at);
        const now = new Date();
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);

        if (deadline <= endOfWeek) return "this_week";
    }

    return "later";
}

const bucketConfig: Record<DeadlineBucket, { label: string; colorClass: string }> = {
    overdue: { label: "Overdue", colorClass: "text-status-red" },
    today: { label: "Due Soon", colorClass: "text-status-yellow" },
    this_week: { label: "This Week", colorClass: "text-text-secondary" },
    later: { label: "Later", colorClass: "text-text-muted" },
};

const bucketOrder: DeadlineBucket[] = ["overdue", "today", "this_week", "later"];

export default async function TodayPage() {
    let tasks: TaskWithProject[] = [];
    let projects: Array<{ id: string; name: string }> = [];
    let error: string | null = null;

    try {
        const [taskRes, projectRes] = await Promise.all([
            apiFetch<ApiResponse<TaskWithProject[]>>("/api/whats-next?limit=20"),
            apiFetch<ApiResponse<Array<{ id: string; name: string }>>>("/api/projects?status=active&scope=enabled"),
        ]);
        tasks = taskRes.data;
        projects = projectRes.data.map((p) => ({ id: p.id, name: p.name }));
    } catch (e) {
        error = e instanceof Error ? e.message : "Failed to load tasks";
    }

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
    });

    if (error) {
        return (
            <div className="flex flex-col min-h-full bg-zed-main p-8 lg:p-12">
                <div className="max-w-4xl mx-auto w-full">
                    <EmptyState message="Failed to load tasks" description={error} />
                </div>
            </div>
        );
    }

    // Group tasks by deadline bucket
    const buckets = new Map<DeadlineBucket, TaskWithProject[]>();
    for (const task of tasks) {
        const bucket = bucketTask(task);
        if (!buckets.has(bucket)) buckets.set(bucket, []);
        buckets.get(bucket)!.push(task);
    }

    return (
        <div className="flex flex-col min-h-full bg-zed-main p-8 lg:p-12">
            <div className="max-w-4xl mx-auto w-full">
                <header className="mb-10">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Today</h2>
                            <p className="text-xs text-text-secondary mt-1 font-medium">
                                {today} • {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <TodayHeaderActions projects={projects} />
                    </div>
                </header>

                {tasks.length === 0 ? (
                    <EmptyState message="No tasks right now" description="All caught up!" />
                ) : (
                    <div className="space-y-12">
                        {bucketOrder.map((bucketKey) => {
                            const bucketTasks = buckets.get(bucketKey);
                            if (!bucketTasks || bucketTasks.length === 0) return null;
                            const config = bucketConfig[bucketKey];

                            return (
                                <section key={bucketKey}>
                                    <div className="flex items-center gap-3 mb-4 px-6">
                                        <h3 className={`text-[10px] font-bold tracking-widest uppercase ${config.colorClass}`}>
                                            {config.label}
                                        </h3>
                                        <span className="text-[10px] text-text-muted font-bold font-mono">
                                            ({bucketTasks.length})
                                        </span>
                                        <div className="h-[1px] flex-1 bg-zed-border/50" />
                                    </div>
                                    <div className="bg-zed-sidebar/30 rounded-lg border border-zed-border/30 overflow-hidden backdrop-blur-sm">
                                        {bucketTasks.map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                title={task.title}
                                                project={task.project?.name || "Unknown"}
                                                priority={task.priority || "P3"}
                                                status={task.status}
                                                href={task.project?.id ? `/projects/${task.project.id}?from=today&task=${task.id}` : undefined}
                                                taskId={task.id}
                                                isReadOnly={task.data_origin === "synced"}
                                            />
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 translate-x-1/3 -translate-y-1/3" />
        </div>
    );
}
