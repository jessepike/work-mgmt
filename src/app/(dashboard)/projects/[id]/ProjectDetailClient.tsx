"use client";

import { useEffect, useMemo, useState } from "react";
import { IconDots, IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HealthBadge } from "@/components/ui/HealthBadge";
import { PriorityChip } from "@/components/ui/PriorityChip";
import { SyncIndicator } from "@/components/ui/SyncIndicator";
import { PhaseAccordion } from "@/components/features/PhaseAccordion";
import { TaskDetailPanel } from "@/components/features/TaskDetailPanel";
import { QuickAdd } from "@/components/features/QuickAdd";
import { BacklogSection } from "@/components/features/BacklogSection";
import { TaskCreateModal } from "@/components/features/TaskCreateModal";
import { showToast } from "@/components/ui/Toast";
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
    returnHref?: string;
    returnLabel?: string;
    initialTaskId?: string;
}

type ProjectTab = "active" | "backlog" | "completed";
type TaskSortMode = "smart" | "priority" | "due_date" | "updated";
interface ActivityItem {
    id: string;
    created_at: string;
    entity_type: string;
    action: string;
    detail: Record<string, any> | null;
    entity_label?: string | null;
}

export function ProjectDetailClient({ project, tasks, returnHref, returnLabel, initialTaskId }: ProjectDetailClientProps) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedTab, setSelectedTab] = useState<ProjectTab>("active");
    const [sortMode, setSortMode] = useState<TaskSortMode>("smart");
    const [syncing, setSyncing] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(project.connector?.last_sync_at || null);
    const [taskRows, setTaskRows] = useState<Task[]>(tasks);
    const [backlogSummary, setBacklogSummary] = useState(project.backlog_summary);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkFeedback, setBulkFeedback] = useState<{ skippedIds: string[]; skippedReasons: Record<string, string> } | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [newTaskOpen, setNewTaskOpen] = useState(false);

    const isConnected = project.project_type === "connected";
    const isPlanned = project.workflow_type === "planned";
    const orderedTasks = useMemo(() => [...taskRows].sort((a, b) => compareTaskSort(a, b, sortMode)), [taskRows, sortMode]);
    const activeTasks = orderedTasks.filter((task) => task.status !== "done");
    const completedTasks = orderedTasks.filter((task) => task.status === "done");
    const overdueCount = activeTasks.filter((task) => task.deadline_at && new Date(task.deadline_at).getTime() < Date.now()).length;
    const selectedHasSynced = Array.from(selectedTaskIds).some((taskId) => {
        const task = taskRows.find((row) => row.id === taskId);
        return task?.data_origin === "synced";
    });

    const activeTasksByPhase = new Map<string | null, Task[]>();
    for (const task of activeTasks) {
        const key = isPlanned ? (task.phase_id || "__unphased") : null;
        if (!activeTasksByPhase.has(key)) activeTasksByPhase.set(key, []);
        activeTasksByPhase.get(key)!.push(task);
    }

    const activeStatusGroups = ["blocked", "in_progress", "pending"] as const;

    useEffect(() => {
        setSelectedTaskIds(new Set());
    }, [selectedTab, sortMode]);

    useEffect(() => {
        const key = `wm.projectPrefs.${project.id}`;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const parsed = JSON.parse(raw) as { tab?: ProjectTab; sort?: TaskSortMode };
            if (parsed.tab && ["active", "backlog", "completed"].includes(parsed.tab)) {
                setSelectedTab(parsed.tab);
            }
            if (parsed.sort && ["smart", "priority", "due_date", "updated"].includes(parsed.sort)) {
                setSortMode(parsed.sort);
            }
        } catch {
            // ignore parse errors
        }
    }, [project.id]);

    useEffect(() => {
        const key = `wm.projectPrefs.${project.id}`;
        localStorage.setItem(key, JSON.stringify({ tab: selectedTab, sort: sortMode }));
    }, [project.id, selectedTab, sortMode]);

    useEffect(() => {
        fetch(`/api/projects/${project.id}/activity?limit=12`)
            .then((r) => r.json())
            .then((res) => setActivity(res.data || []))
            .catch(() => setActivity([]));
    }, [project.id, lastSyncAt]);

    useEffect(() => {
        if (!initialTaskId) return;
        const task = taskRows.find((row) => row.id === initialTaskId);
        if (!task) return;
        setSelectedTask(task);
    }, [initialTaskId, taskRows]);

    function findPhaseName(task: Task): string | undefined {
        const phase = project.phases.find((p) => p.id === task.phase_id);
        return phase?.name;
    }

    function toggleTaskSelection(taskId: string) {
        setSelectedTaskIds((prev) => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    }

    async function toggleTaskComplete(task: Task) {
        if (task.data_origin === "synced") {
            showToast("error", "Synced tasks are read-only in the dashboard");
            return;
        }
        const nextStatus: Task["status"] = task.status === "done" ? "pending" : "done";
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || "Failed to update task");
            setTaskRows((prev) =>
                prev.map((row) => row.id === task.id ? body.data : row)
            );
            showToast("success", nextStatus === "done" ? "Task completed" : "Task reopened");
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Failed to update task");
        }
    }

    async function runBulkUpdate(updates: { status?: Task["status"]; priority?: Task["priority"] }) {
        if (selectedTaskIds.size === 0 || bulkBusy) return;
        const taskIds = Array.from(selectedTaskIds);
        if (taskIds.length >= 20) {
            const confirmed = window.confirm(`Apply this change to ${taskIds.length} tasks?`);
            if (!confirmed) return;
        }
        const previousById = new Map(
            taskRows
                .filter((task) => taskIds.includes(task.id))
                .map((task) => [task.id, { status: task.status, priority: task.priority, completed_at: task.completed_at }])
        );
        setBulkBusy(true);
        setBulkFeedback(null);
        try {
            const res = await fetch("/api/tasks/bulk-update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task_ids: taskIds,
                    updates,
                }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || "Bulk update failed");
            const skippedIds: string[] = body?.data?.skipped_ids || [];
            const updatedTaskIds = taskIds.filter((id) => !skippedIds.includes(id));

            setTaskRows((prev) =>
                prev.map((task) => {
                    if (!taskIds.includes(task.id)) return task;
                    if (skippedIds.includes(task.id)) return task;
                    const nextStatus = updates.status ?? task.status;
                    return {
                        ...task,
                        ...updates,
                        status: nextStatus,
                        completed_at: nextStatus === "done" ? new Date().toISOString() : null,
                        updated_at: new Date().toISOString(),
                    };
                })
            );

            setSelectedTaskIds(new Set());
            const skipped = skippedIds.length;
            const updated = body?.data?.updated_count || taskIds.length;
            if (skipped > 0) {
                setBulkFeedback({
                    skippedIds: body?.data?.skipped_ids || [],
                    skippedReasons: body?.data?.skipped_reasons || {},
                });
            }
            showToast("success", `Updated ${updated} tasks${skipped ? ` (${skipped} skipped)` : ""}`, {
                actionLabel: "Undo",
                onAction: async () => {
                    const reverseIds = Array.from(previousById.keys());
                    for (const taskId of reverseIds.filter((id) => updatedTaskIds.includes(id))) {
                        const prev = previousById.get(taskId);
                        if (!prev) continue;
                        const undoPayload: Record<string, any> = {};
                        if (updates.status) undoPayload.status = prev.status;
                        if (updates.priority) undoPayload.priority = prev.priority;
                        await fetch(`/api/tasks/${taskId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(undoPayload),
                        });
                    }
                    setTaskRows((prev) =>
                        prev.map((task) => {
                            const before = previousById.get(task.id);
                            if (!before) return task;
                            return {
                                ...task,
                                status: before.status,
                                priority: before.priority,
                                completed_at: before.completed_at,
                                updated_at: new Date().toISOString(),
                            };
                        })
                    );
                    showToast("success", "Bulk action undone");
                },
            });
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Bulk update failed");
        } finally {
            setBulkBusy(false);
        }
    }

    async function promoteTopBacklogItem() {
        try {
            const backlogRes = await fetch(`/api/backlog?project_id=${project.id}`);
            const backlogBody = await backlogRes.json();
            if (!backlogRes.ok) throw new Error(backlogBody?.error || "Failed to load backlog");

            const activeItems = (backlogBody?.data || [])
                .filter((item: any) => item.status !== "promoted" && item.status !== "archived")
                .sort((a: any, b: any) => {
                    const statusRank = (status: string) => status === "prioritized" ? 0 : status === "triaged" ? 1 : 2;
                    const priorityRank = (p: string | null) => p === "P1" ? 0 : p === "P2" ? 1 : 2;
                    const aStatus = statusRank(a.status);
                    const bStatus = statusRank(b.status);
                    if (aStatus !== bStatus) return aStatus - bStatus;
                    const aPriority = priorityRank(a.priority);
                    const bPriority = priorityRank(b.priority);
                    if (aPriority !== bPriority) return aPriority - bPriority;
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                });

            const top = activeItems[0];
            if (!top) {
                showToast("error", "No promotable backlog items found");
                return;
            }

            const promoteRes = await fetch("/api/backlog/promote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    backlog_item_id: top.id,
                    plan_id: project.current_plan?.id || null,
                }),
            });
            const promoteBody = await promoteRes.json();
            if (!promoteRes.ok) throw new Error(promoteBody?.error || "Failed to promote backlog item");

            setTaskRows((prev) => [promoteBody.data, ...prev]);
            setBacklogSummary((prev) => ({
                active: Math.max(0, prev.active - 1),
                completed: prev.completed + 1,
                p1_active: top.priority === "P1" ? Math.max(0, prev.p1_active - 1) : prev.p1_active,
            }));
            setSelectedTab("active");
            showToast("success", `Promoted: ${top.title}`);
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Promotion failed");
        }
    }

    return (
        <div className="flex h-full bg-zed-main overflow-hidden">
            <div className="flex-1 flex flex-col border-r border-zed-border min-w-0">
                <header className="px-8 h-14 flex items-center justify-between border-b border-zed-border bg-zed-header/30">
                    <div className="flex items-center gap-3 min-w-0">
                        {returnHref && (
                            <Link
                                href={returnHref}
                                className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-secondary"
                            >
                                {returnLabel || "Back"}
                            </Link>
                        )}
                        <HealthBadge health={project.health} size="md" />
                        <h2 className="text-sm font-semibold text-text-primary truncate">{project.name}</h2>
                        {isConnected && project.connector && (
                            <SyncIndicator
                                connectorType={project.connector.connector_type}
                                lastSyncAt={lastSyncAt}
                            />
                        )}
                    </div>
                    <nav className="hidden lg:flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50">
                        <Link
                            href={`/projects/${project.id}`}
                            className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-zed-active text-primary rounded-sm shadow-sm"
                        >
                            Overview
                        </Link>
                        <Link
                            href={`/projects/${project.id}/priority`}
                            className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-secondary"
                        >
                            Priority
                        </Link>
                        <Link
                            href={`/projects/${project.id}/deadlines`}
                            className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-secondary"
                        >
                            Deadlines
                        </Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        {isConnected && project.connector && (
                            <button
                                onClick={async () => {
                                    if (syncing) return;
                                    setSyncing(true);
                                    try {
                                        const res = await fetch("/api/connectors/sync", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ project_id: project.id }),
                                        });
                                        const body = await res.json();
                                        if (!res.ok) throw new Error(body?.error || "Sync failed");
                                        const nowIso = new Date().toISOString();
                                        setLastSyncAt(nowIso);
                                        const tasksRes = await fetch(`/api/tasks?project_id=${project.id}`);
                                        const tasksBody = await tasksRes.json();
                                        if (tasksRes.ok && Array.isArray(tasksBody?.data)) {
                                            setTaskRows(tasksBody.data);
                                        }
                                        showToast("success", `Synced ${body?.count || 0} items`);
                                    } catch (error) {
                                        showToast("error", error instanceof Error ? error.message : "Sync failed");
                                    } finally {
                                        setSyncing(false);
                                    }
                                }}
                                disabled={syncing}
                                className="px-3 py-1.5 bg-zed-active border border-zed-border text-[10px] font-bold tracking-widest uppercase hover:bg-zed-hover transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {syncing ? "Syncing..." : "Sync Now"}
                            </button>
                        )}
                        <button
                            onClick={() => setNewTaskOpen(true)}
                            className="px-3 py-1.5 bg-zed-active border border-zed-border text-[10px] font-bold tracking-widest uppercase hover:bg-zed-hover transition-colors rounded"
                        >
                            New Task
                        </button>
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
                        <Stat label="P1 Backlog" value={String(backlogSummary.p1_active)} alert={backlogSummary.p1_active > 0} />
                        <Stat label="Last Sync" value={formatRelativeTime(lastSyncAt)} muted={!project.connector} />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50">
                                {([
                                    { id: "active", label: `Active (${activeTasks.length})` },
                                    { id: "backlog", label: `Backlog (${backlogSummary.active})` },
                                    { id: "completed", label: `Completed (${completedTasks.length + backlogSummary.completed})` },
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

                    {selectedTaskIds.size > 0 && (
                        <div className="flex items-center justify-between gap-3 p-2 rounded border border-primary/30 bg-primary/5">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">
                                {selectedTaskIds.size} selected
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                                <button
                                    onClick={() => runBulkUpdate({ status: "done" })}
                                    disabled={bulkBusy || selectedHasSynced}
                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover disabled:opacity-40"
                                >
                                    Mark Done
                                </button>
                                <button
                                    onClick={() => runBulkUpdate({ status: "in_progress" })}
                                    disabled={bulkBusy || selectedHasSynced}
                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover disabled:opacity-40"
                                >
                                    Move In Progress
                                </button>
                                <button
                                    onClick={() => runBulkUpdate({ status: "pending" })}
                                    disabled={bulkBusy || selectedHasSynced}
                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover disabled:opacity-40"
                                >
                                    Move Pending
                                </button>
                                <button
                                    onClick={() => runBulkUpdate({ status: "blocked" })}
                                    disabled={bulkBusy || selectedHasSynced}
                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover disabled:opacity-40"
                                >
                                    Move Blocked
                                </button>
                                <button
                                    onClick={() => runBulkUpdate({ priority: "P1" })}
                                    disabled={bulkBusy || selectedHasSynced}
                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover disabled:opacity-40"
                                >
                                    Set P1
                                </button>
                                <button
                                    onClick={() => runBulkUpdate({ priority: "P2" })}
                                    disabled={bulkBusy || selectedHasSynced}
                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover disabled:opacity-40"
                                >
                                    Set P2
                                </button>
                                <button
                                    onClick={() => runBulkUpdate({ priority: "P3" })}
                                    disabled={bulkBusy || selectedHasSynced}
                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover disabled:opacity-40"
                                >
                                    Set P3
                                </button>
                                <button
                                    onClick={() => setSelectedTaskIds(new Set())}
                                    disabled={bulkBusy}
                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border text-text-muted hover:text-text-secondary disabled:opacity-40"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                    {selectedTaskIds.size > 0 && selectedHasSynced && (
                        <div className="text-[11px] text-status-yellow">
                            Synced tasks are read-only. Deselect synced items to use bulk actions.
                        </div>
                    )}

                    {bulkFeedback && bulkFeedback.skippedIds.length > 0 && (
                        <div className="p-2 rounded border border-status-yellow/30 bg-status-yellow/10">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-status-yellow">
                                Some tasks were skipped
                            </div>
                            <div className="mt-1 space-y-1">
                                {bulkFeedback.skippedIds.slice(0, 5).map((taskId) => (
                                    <div key={taskId} className="text-[11px] text-text-secondary font-mono">
                                        {taskId.slice(0, 8)}: {bulkFeedback.skippedReasons[taskId] || "Skipped"}
                                    </div>
                                ))}
                                {bulkFeedback.skippedIds.length > 5 && (
                                    <div className="text-[11px] text-text-muted">+{bulkFeedback.skippedIds.length - 5} more</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
                    {selectedTab === "active" && (
                        <>
                            {activeTasks.length === 0 && (
                                <div className="rounded border border-zed-border bg-zed-sidebar/30 p-4">
                                    <div className="text-sm font-semibold text-text-primary">No active tasks</div>
                                    <div className="text-xs text-text-secondary mt-1">
                                        Promote a backlog item or create a new task to start execution.
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <button
                                            onClick={promoteTopBacklogItem}
                                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover"
                                        >
                                            Promote Top Backlog Item
                                        </button>
                                        <button
                                            onClick={() => setSelectedTab("backlog")}
                                            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover"
                                        >
                                            Open Backlog
                                        </button>
                                        {!isConnected && (
                                            <button
                                                onClick={() => {
                                                    const input = document.querySelector<HTMLInputElement>('input[placeholder=\"Add a task...\"]');
                                                    input?.focus();
                                                }}
                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover"
                                            >
                                                Add Task
                                            </button>
                                        )}
                                        {isConnected && project.connector && (
                                            <button
                                                onClick={async () => {
                                                    if (syncing) return;
                                                    setSyncing(true);
                                                    try {
                                                        const res = await fetch("/api/connectors/sync", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ project_id: project.id }),
                                                        });
                                                        const body = await res.json();
                                                        if (!res.ok) throw new Error(body?.error || "Sync failed");
                                                        setLastSyncAt(new Date().toISOString());
                                                        showToast("success", `Synced ${body?.count || 0} items`);
                                                    } catch (error) {
                                                        showToast("error", error instanceof Error ? error.message : "Sync failed");
                                                    } finally {
                                                        setSyncing(false);
                                                    }
                                                }}
                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border bg-zed-active hover:bg-zed-hover"
                                            >
                                                Sync Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!isConnected && (
                                <QuickAdd
                                    projectId={project.id}
                                    planId={project.current_plan?.id}
                                    onCreated={(createdTask) => setTaskRows((prev) => [createdTask, ...prev])}
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
                                            selectionEnabled={true}
                                            selectedTaskIds={selectedTaskIds}
                                            onToggleTaskSelection={toggleTaskSelection}
                                            onToggleComplete={toggleTaskComplete}
                                        />
                                    ))}
                                    {(activeTasksByPhase.get("__unphased") || []).length > 0 && (
                                        <section>
                                            <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted mb-4 px-2">Unphased</h3>
                                            <TaskListFlat
                                                tasks={activeTasksByPhase.get("__unphased")!}
                                                onTaskClick={setSelectedTask}
                                                selectionEnabled={true}
                                                selectedTaskIds={selectedTaskIds}
                                                onToggleTaskSelection={toggleTaskSelection}
                                                onToggleComplete={toggleTaskComplete}
                                            />
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
                                            <TaskListFlat
                                                tasks={statusTasks}
                                                onTaskClick={setSelectedTask}
                                                selectionEnabled={true}
                                                selectedTaskIds={selectedTaskIds}
                                                onToggleTaskSelection={toggleTaskSelection}
                                                onToggleComplete={toggleTaskComplete}
                                            />
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
                                    <TaskListFlat
                                        tasks={completedTasks}
                                        onTaskClick={setSelectedTask}
                                        selectionEnabled={false}
                                        onToggleComplete={toggleTaskComplete}
                                    />
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

                    <section>
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Recent Activity</h3>
                            <div className="h-[1px] flex-1 bg-zed-border/50" />
                        </div>
                        {activity.length === 0 ? (
                            <div className="h-10 px-4 flex items-center text-xs text-text-muted italic opacity-50">
                                No recent activity...
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {activity.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 h-9 px-3 rounded border border-zed-border/40 bg-zed-sidebar/20">
                                        <div className="text-[11px] text-text-secondary truncate">
                                            <span className="uppercase text-text-muted mr-2">{item.entity_type}</span>
                                            {item.entity_label && (
                                                <span className="text-text-primary mr-2">{item.entity_label}</span>
                                            )}
                                            {item.action.replaceAll("_", " ")}
                                        </div>
                                        <div className="text-[10px] font-mono text-text-muted whitespace-nowrap">
                                            {formatRelativeTime(item.created_at)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {selectedTask && (
                <TaskDetailPanel
                    task={selectedTask}
                    projectName={project.name}
                    phaseName={findPhaseName(selectedTask)}
                    onTaskUpdated={(updated) => {
                        setTaskRows((prev) => prev.map((task) => task.id === updated.id ? updated : task));
                        setSelectedTask(updated);
                    }}
                    onClose={() => setSelectedTask(null)}
                />
            )}

            <TaskCreateModal
                open={newTaskOpen}
                onClose={() => setNewTaskOpen(false)}
                projects={[{ id: project.id, name: project.name }]}
                defaultProjectId={project.id}
                onCreated={(createdTask) => {
                    setTaskRows((prev) => [createdTask, ...prev]);
                }}
            />
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

function TaskListFlat({
    tasks,
    onTaskClick,
    selectionEnabled = false,
    selectedTaskIds,
    onToggleTaskSelection,
    onToggleComplete,
}: {
    tasks: Task[];
    onTaskClick: (t: Task) => void;
    selectionEnabled?: boolean;
    selectedTaskIds?: Set<string>;
    onToggleTaskSelection?: (taskId: string) => void;
    onToggleComplete?: (task: Task) => void;
}) {
    return (
        <div className="space-y-1">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="flex items-center h-10 px-4 hover:bg-zed-hover rounded group transition-colors cursor-pointer"
                >
                    {selectionEnabled && (
                        <input
                            type="checkbox"
                            checked={selectedTaskIds?.has(task.id) || false}
                            onChange={() => onToggleTaskSelection?.(task.id)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={task.data_origin === "synced"}
                            className="mr-3 accent-primary disabled:opacity-40"
                        />
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleComplete?.(task);
                        }}
                        disabled={task.data_origin === "synced"}
                        className="mr-4 text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
                    >
                        {task.status === "done" ? (
                            <IconCircleCheckFilled className="w-4 h-4 text-status-green" />
                        ) : (
                            <IconCircle className="w-4 h-4" />
                        )}
                    </button>
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
                            <span
                                className="text-[9px] font-bold text-text-muted/50 uppercase tracking-tight"
                                title={task.source_id || "Synced task"}
                            >
                                SYNCED
                            </span>
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
