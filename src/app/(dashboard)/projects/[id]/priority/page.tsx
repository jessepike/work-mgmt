import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriorityChip } from "@/components/ui/PriorityChip";
import type { ApiResponse, Task } from "@/lib/types/api";

interface ProjectInfo {
    id: string;
    name: string;
}

interface PriorityPageProps {
    params: Promise<{ id: string }>;
}

const columns: Array<{ key: "P1" | "P2" | "P3"; label: string }> = [
    { key: "P1", label: "Priority 1" },
    { key: "P2", label: "Priority 2" },
    { key: "P3", label: "Priority 3" },
];

export default async function ProjectPriorityPage({ params }: PriorityPageProps) {
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
        error = e instanceof Error ? e.message : "Failed to load priority board";
    }

    if (error || !project) {
        return (
            <div className="p-8 lg:p-12">
                <EmptyState message="Priority board unavailable" description={error || "Project not found"} />
            </div>
        );
    }

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
                    <Link href={`/projects/${project.id}/priority`} className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-zed-active text-primary rounded-sm shadow-sm">
                        Priority
                    </Link>
                    <Link href={`/projects/${project.id}/deadlines`} className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-secondary">
                        Deadlines
                    </Link>
                </nav>
            </header>

            <div className="p-8 flex-1 overflow-x-auto custom-scrollbar">
                {tasks.length === 0 ? (
                    <EmptyState message="No active tasks" description="This project has no pending work to prioritize." />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-[980px]">
                        {columns.map((column) => {
                            const rows = tasks
                                .filter((task) => (task.priority || "P3") === column.key)
                                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                            return (
                                <section key={column.key} className="rounded border border-zed-border bg-zed-sidebar/30 min-h-[420px]">
                                    <div className="h-10 px-3 border-b border-zed-border flex items-center justify-between">
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">{column.label}</span>
                                        <span className="text-[10px] font-mono text-text-muted">{rows.length}</span>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {rows.length === 0 ? (
                                            <div className="text-xs text-text-muted italic">No tasks.</div>
                                        ) : (
                                            rows.map((task) => (
                                                <Link
                                                    key={task.id}
                                                    href={`/projects/${project.id}?from=priority&task=${task.id}`}
                                                    className="block rounded border border-zed-border bg-zed-main/40 hover:bg-zed-hover transition-colors p-3"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-medium text-text-primary truncate">{task.title}</span>
                                                        <PriorityChip priority={task.priority || "P3"} />
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted">
                                                        <span>{task.status.replace("_", " ")}</span>
                                                        <span>{task.deadline_at ? new Date(task.deadline_at).toLocaleDateString("en-US") : "no due date"}</span>
                                                    </div>
                                                </Link>
                                            ))
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
