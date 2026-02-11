"use client";

import { useState } from "react";
import { IconLink, IconDots, IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { PriorityChip } from "@/components/ui/PriorityChip";
import { SyncIndicator } from "@/components/ui/SyncIndicator";
import { PhaseAccordion } from "@/components/features/PhaseAccordion";
import { TaskDetailPanel } from "@/components/features/TaskDetailPanel";
import { QuickAdd } from "@/components/features/QuickAdd";
import { BacklogSection } from "@/components/features/BacklogSection";
import type { Task, Phase, ProjectHealth } from "@/lib/types/api";

interface ProjectInfo {
    id: string;
    name: string;
    workflow_type: "flat" | "planned";
    project_type: "connected" | "native";
    categories: string[];
    focus: string | null;
    health: ProjectHealth;
    health_reason: string | null;
    phases: Phase[];
    current_plan: { id: string; name: string } | null;
    connector: { id: string; connector_type: string; status: string; last_sync_at: string | null } | null;
    task_summary: { pending: number; in_progress: number; blocked: number; done: number; total: number };
}

interface ProjectDetailClientProps {
    project: ProjectInfo;
    tasks: Task[];
}

export function ProjectDetailClient({ project, tasks }: ProjectDetailClientProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const isConnected = project.project_type === "connected";
    const isPlanned = project.workflow_type === "planned";
    const completionPct = project.task_summary.total > 0
        ? Math.round((project.task_summary.done / project.task_summary.total) * 100)
        : 0;

    // Group tasks by phase for planned, or by status for flat
    const tasksByPhase = new Map<string | null, Task[]>();
    for (const task of tasks) {
        const key = isPlanned ? (task.phase_id || "__unphased") : null;
        if (!tasksByPhase.has(key)) tasksByPhase.set(key, []);
        tasksByPhase.get(key)!.push(task);
    }

    // For flat: group by status
    const statusGroups = ["in_progress", "pending", "blocked", "done"] as const;

    function findPhaseName(task: Task): string | undefined {
        const phase = project.phases.find(p => p.id === task.phase_id);
        return phase?.name;
    }

    return (
        <div className="flex h-full bg-zed-main overflow-hidden">
            {/* Left Pane: Task List */}
            <div className="flex-1 flex flex-col border-r border-zed-border min-w-0">
                <header className="px-8 h-14 flex items-center justify-between border-b border-zed-border bg-zed-header/30">
                    <div className="flex items-center gap-3">
                        <HealthBadge health={project.health} size="md" />
                        <h2 className="text-sm font-semibold text-text-primary">{project.name}</h2>
                        {isConnected && project.connector && (
                            <SyncIndicator
                                connectorType={project.connector.connector_type}
                                lastSyncAt={project.connector.last_sync_at}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {!isConnected && (
                            <button className="px-3 py-1.5 bg-zed-active border border-zed-border text-[10px] font-bold tracking-widest uppercase hover:bg-zed-hover transition-colors rounded">
                                New Task
                            </button>
                        )}
                        <IconDots className="w-4 h-4 text-text-muted cursor-pointer" />
                    </div>
                </header>

                <div className="p-8 flex items-center gap-6 border-b border-zed-border bg-zed-sidebar/20">
                    <div className="flex items-center gap-2 px-2 py-1 bg-zed-active border border-zed-border rounded text-[9px] font-bold text-text-secondary uppercase tracking-tight">
                        {project.categories[0] || "UNCATEGORIZED"}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-text-muted tracking-widest uppercase">
                        <span>{project.task_summary.total} tasks</span>
                        {project.task_summary.blocked > 0 && (
                            <span className="text-status-red">{project.task_summary.blocked} blocked</span>
                        )}
                        <span>{completionPct}% complete</span>
                    </div>
                    <div className="h-1.5 w-32 bg-zed-border rounded-full overflow-hidden flex-shrink-0">
                        <div
                            className={cn("h-full rounded-full", project.health === "red" ? "bg-status-red" : project.health === "yellow" ? "bg-status-yellow" : "bg-primary")}
                            style={{ width: `${completionPct}%` }}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12">
                    {/* Quick add for native projects */}
                    {!isConnected && (
                        <QuickAdd
                            projectId={project.id}
                            planId={project.current_plan?.id}
                        />
                    )}

                    {isPlanned ? (
                        // Planned: Phase accordion
                        <>
                            {project.phases.map((phase) => (
                                <PhaseAccordion
                                    key={phase.id}
                                    phase={phase}
                                    tasks={tasksByPhase.get(phase.id) || []}
                                    onTaskClick={setSelectedTask}
                                />
                            ))}
                            {/* Unphased tasks */}
                            {(tasksByPhase.get("__unphased") || []).length > 0 && (
                                <section>
                                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted mb-4 px-2">Unphased</h3>
                                    <TaskListFlat tasks={tasksByPhase.get("__unphased")!} onTaskClick={setSelectedTask} />
                                </section>
                            )}
                        </>
                    ) : (
                        // Flat: grouped by status
                        statusGroups.map((status) => {
                            const statusTasks = tasks.filter((t) => t.status === status);
                            if (statusTasks.length === 0) return null;
                            return (
                                <section key={status}>
                                    <div className="flex items-center gap-3 mb-4 px-2">
                                        <h3 className={cn(
                                            "text-[10px] font-bold tracking-widest uppercase",
                                            status === "blocked" ? "text-status-red" :
                                            status === "done" ? "text-status-green" :
                                            status === "in_progress" ? "text-status-yellow" :
                                            "text-text-secondary"
                                        )}>
                                            {status.replace("_", " ")}
                                        </h3>
                                        <span className="text-[10px] text-text-muted font-bold font-mono">({statusTasks.length})</span>
                                        <div className="h-[1px] flex-1 bg-zed-border/50" />
                                    </div>
                                    <TaskListFlat tasks={statusTasks} onTaskClick={setSelectedTask} />
                                </section>
                            );
                        })
                    )}

                    {/* Backlog section */}
                    <BacklogSection projectId={project.id} />
                </div>
            </div>

            {/* Right Pane: Task Detail */}
            {selectedTask && (
                <TaskDetailPanel
                    task={selectedTask}
                    projectName={project.name}
                    phaseName={findPhaseName(selectedTask)}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </div>
    );
}

function TaskListFlat({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (t: Task) => void }) {
    return (
        <div className="space-y-1">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="flex items-center h-10 px-4 hover:bg-zed-hover rounded group transition-colors cursor-pointer"
                >
                    <span className="mr-4 text-text-muted">
                        {task.status === "done" ? (
                            <IconCircleCheckFilled className="w-4 h-4 text-status-green" />
                        ) : (
                            <IconCircle className="w-4 h-4" />
                        )}
                    </span>
                    <span className={cn(
                        "text-xs flex-1 truncate",
                        task.status === "done" ? "text-text-muted line-through" : "text-text-primary"
                    )}>
                        {task.title}
                    </span>
                    <div className="flex items-center gap-4 ml-4">
                        {task.status === "blocked" && (
                            <span className="text-[9px] font-bold text-status-red uppercase tracking-tight">BLOCKED</span>
                        )}
                        {task.data_origin === "synced" && (
                            <span className="text-[9px] font-bold text-text-muted/50 uppercase tracking-tight">SYNCED</span>
                        )}
                        <PriorityChip priority={task.priority} />
                        {task.deadline_at && (
                            <span className="text-[9px] font-mono text-text-muted font-bold">
                                {new Date(task.deadline_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
