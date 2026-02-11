"use client";

import { useMemo, useState } from "react";
import { IconDots, IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
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
    updated_at: string;
    workflow_type: "flat" | "planned";
    project_type: "connected" | "native";
    categories: string[];
    current_stage: string | null;
    focus: string | null;
    health: ProjectHealth;
    health_reason: string | null;
    phases: Phase[];
    current_plan: { id: string; name: string } | null;
    connector: { id: string; connector_type: string; status: string; last_sync_at: string | null } | null;
    task_summary: { pending: number; in_progress: number; blocked: number; done: number; total: number };
    backlog_summary: { active: number; completed: number; p1_active: number };
}

interface ProjectDetailClientProps {
    project: ProjectInfo;
    tasks: Task[];
}

type ProjectTab = "active" | "backlog" | "completed";
type TaskSortMode = "smart" | "priority" | "due_date" | "updated";

export function ProjectDetailClient({ project, tasks }: ProjectDetailClientProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedTab, setSelectedTab] = useState<ProjectTab>("active");
    const [sortMode, setSortMode] = useState<TaskSortMode>("smart");

    const isConnected = project.project_type === "connected";
    const isPlanned = project.workflow_type === "planned";
    const orderedTasks = useMemo(() => [...tasks].sort((a, b) => compareTaskSort(a, b, sortMode)), [tasks, sortMode]);
    const activeTasks = orderedTasks.filter((task) => task.status !== "done");
    const completedTasks = orderedTasks.filter((task) => task.status === "done");
    const overdueCount = activeTasks.filter((task) => task.deadline_at && new Date(task.deadline_at).getTime() < Date.now()).length;

    const activeTasksByPhase = new Map<string | null, Task[]>();
    for (const task of activeTasks) {
        const key = isPlanned ? (task.phase_id || "__unphased") : null;
        if (!activeTasksByPhase.has(key)) activeTasksByPhase.set(key, []);
        activeTasksByPhase.get(key)!.push(task);
    }

    const activeStatusGroups = ["blocked", "in_progress", "pending"] as const;

    function findPhaseName(task: Task): string | undefined {
        const phase = project.phases.find((p) => p.id === task.phase_id);
        return phase?.name;
    }

    return (
        <div className="flex h-full bg-zed-main overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-zed-border min-w-0">
                <header className="px-8 h-14 flex items-center justify-between border-b border-zed-border bg-zed-header/30">
                    <div className="flex items-center gap-3 min-w-0">
                        <HealthBadge health={project.health} size="md" />
                        <h2 className="text-sm font-semibold text-text-primary truncate">{project.name}</h2>
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

                <div className="px-8 py-4 border-b border-zed-border bg-zed-sidebar/20 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 px-2 py-1 bg-zed-active border border-zed-border rounded text-[9px] font-bold text-text-secondary uppercase tracking-tight">
                            {project.categories[0] || "UNCATEGORIZED"}
                        </div>
                        <div className="flex items-center gap-2 px-2 py-1 bg-zed-main border border-zed-border rounded text-[9px] font-bold text-text-secondary uppercase tracking-tight">
                            {project.current_stage || "Stage Not Set"}
                        </div>
                        {project.focus && (
                            <span className="text-[11px] text-text-secondary truncate max-w-[650px]">{project.focus}</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <Stat label="Open Tasks" value={String(activeTasks.length)} />
                        <Stat label="Blocked" value={String(project.task_summary.blocked)} alert={project.task_summary.blocked > 0} />
                        <Stat label="Overdue" value={String(overdueCount)} alert={overdueCount > 0} />
                        <Stat label="P1 Backlog" value={String(project.backlog_summary.p1_active)} alert={project.backlog_summary.p1_active > 0} />
                        <Stat label="Last Sync" value={formatRelativeTime(project.connector?.last_sync_at)} muted={!project.connector} />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50">
                            {([
                                { id: "active", label: `Active (${activeTasks.length})` },
                                { id: "backlog", label: `Backlog (${project.backlog_summary.active})` },
                                { id: "completed", label: `Completed (${completedTasks.length + project.backlog_summary.completed})` },
                            ] as const).map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedTab(tab.id)}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-sm",
                                        selectedTab === tab.id
                                            ? "bg-zed-active text-primary shadow-sm"
                                            : "text-text-muted hover:text-text-secondary"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50">
                            {([
                                { id: "smart", label: "Smart" },
                                { id: "priority", label: "Priority" },
                                { id: "due_date", label: "Due Date" },
                                { id: "updated", label: "Updated" },
                            ] as const).map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setSortMode(option.id)}
                                    className={cn(
                                        "px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-sm",
                                        sortMode === option.id
                                            ? "bg-zed-active text-primary shadow-sm"
                                            : "text-text-muted hover:text-text-secondary"
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
                    {selectedTab === "active" && (
                        <>
                            {!isConnected && (
                                <QuickAdd
                                    projectId={project.id}
                                    planId={project.current_plan?.id}
                                />
                            )}

                            {isPlanned ? (
                                <>
                                    {project.phases.map((phase) => (
                                        <PhaseAccordion
                                            key={phase.id}
                                            phase={phase}
                                            tasks={activeTasksByPhase.get(phase.id) || []}
                                            onTaskClick={setSelectedTask}
                                        />
                                    ))}
                                    {(activeTasksByPhase.get("__unphased") || []).length > 0 && (
                                        <section>
                                            <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted mb-4 px-2">Unphased</h3>
                                            <TaskListFlat tasks={activeTasksByPhase.get("__unphased")!} onTaskClick={setSelectedTask} />
                                        </section>
                                    )}
                                </>
                            ) : (
                                activeStatusGroups.map((status) => {
                                    const statusTasks = activeTasks.filter((t) => t.status === status);
                                    if (statusTasks.length === 0) return null;
                                    return (
                                        <section key={status}>
                                            <div className="flex items-center gap-3 mb-4 px-2">
                                                <h3 className={cn(
                                                    "text-[10px] font-bold tracking-widest uppercase",
                                                    status === "blocked" ? "text-status-red" :
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
                        </>
                    )}

                    {selectedTab === "backlog" && (
                        <BacklogSection projectId={project.id} mode="active" initialExpanded={true} showHeader={false} />
                    )}

                    {selectedTab === "completed" && (
                        <>
                            <section>
                                <div className="flex items-center gap-3 mb-4 px-2">
                                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-status-green">Completed Tasks</h3>
                                    <div className="h-[1px] flex-1 bg-zed-border/50" />
                                </div>
                                {completedTasks.length > 0 ? (
                                    <TaskListFlat tasks={completedTasks} onTaskClick={setSelectedTask} />
                                ) : (
                                    <div className="h-10 px-4 flex items-center text-xs text-text-muted italic opacity-50">
                                        No completed tasks...
                                    </div>
                                )}
                            </section>
                            <section>
                                <div className="flex items-center gap-3 mb-4 px-2">
                                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-status-green">Completed Backlog</h3>
                                    <div className="h-[1px] flex-1 bg-zed-border/50" />
                                </div>
                                <BacklogSection projectId={project.id} mode="completed" initialExpanded={true} showHeader={false} />
                            </section>
                        </>
                    )}
                </div>
            </div>

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

function compareTaskSort(a: Task, b: Task, mode: TaskSortMode): number {
    if (mode === "updated") {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }

    const priorityRank = (p: Task["priority"]) => (p === "P1" ? 0 : p === "P2" ? 1 : 2);
    const dueDateRank = (task: Task) => task.deadline_at ? new Date(task.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;

    if (mode === "priority") {
        const aPriority = priorityRank(a.priority);
        const bPriority = priorityRank(b.priority);
        if (aPriority !== bPriority) return aPriority - bPriority;
        return dueDateRank(a) - dueDateRank(b);
    }

    if (mode === "due_date") {
        const aDue = dueDateRank(a);
        const bDue = dueDateRank(b);
        if (aDue !== bDue) return aDue - bDue;
        return priorityRank(a.priority) - priorityRank(b.priority);
    }

    const statusRank = (status: Task["status"]) => {
        if (status === "blocked") return 0;
        if (status === "in_progress") return 1;
        if (status === "pending") return 2;
        if (status === "done") return 3;
        return 4;
    };

    const aStatus = statusRank(a.status);
    const bStatus = statusRank(b.status);
    if (aStatus !== bStatus) return aStatus - bStatus;

    const aOverdue = a.deadline_at ? new Date(a.deadline_at).getTime() < Date.now() : false;
    const bOverdue = b.deadline_at ? new Date(b.deadline_at).getTime() < Date.now() : false;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    const aPriority = priorityRank(a.priority);
    const bPriority = priorityRank(b.priority);
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aDue = dueDateRank(a);
    const bDue = dueDateRank(b);
    if (aDue !== bDue) return aDue - bDue;

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

function formatRelativeTime(value: string | null | undefined): string {
    if (!value) return "n/a";
    const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function Stat({ label, value, alert, muted }: { label: string; value: string; alert?: boolean; muted?: boolean }) {
    return (
        <div className="px-3 py-2 rounded border border-zed-border bg-zed-main/40">
            <div className="text-[9px] font-bold uppercase tracking-widest text-text-muted">{label}</div>
            <div className={cn(
                "text-sm font-semibold mt-1",
                alert ? "text-status-red" : muted ? "text-text-muted" : "text-text-primary"
            )}>
                {value}
            </div>
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
