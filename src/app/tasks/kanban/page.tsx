"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StatusColumn } from "@/components/ui/StatusColumn";
import { TaskCard } from "@/components/ui/TaskCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { showToast } from "@/components/ui/Toast";
import type { TaskStatus, ProjectHealth } from "@/lib/types/api";

interface KanbanTask {
    id: string;
    title: string;
    status: TaskStatus;
    project_id: string;
    project_name: string;
    project_health: ProjectHealth;
    data_origin: "synced" | "native";
    sort_order: number | null;
}

interface ProjectOption {
    id: string;
    name: string;
}

const columns: { status: TaskStatus; title: string }[] = [
    { status: "pending", title: "Pending" },
    { status: "in_progress", title: "In Progress" },
    { status: "blocked", title: "Blocked" },
    { status: "done", title: "Done" },
];

export default function KanbanPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [dragTaskId, setDragTaskId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            let tasksUrl = "/api/tasks?scope=enabled";
            if (selectedProject) tasksUrl = `/api/tasks?scope=enabled&project_id=${selectedProject}`;

            const [tasksRes, projectsRes] = await Promise.all([
                fetch(tasksUrl).then((r) => r.json()),
                fetch("/api/projects?status=active&scope=enabled").then((r) => r.json()),
            ]);

            const projectMap = new Map<string, { name: string; health: ProjectHealth }>();
            for (const p of projectsRes.data || []) {
                projectMap.set(p.id, { name: p.name, health: p.health || "green" });
            }

            const nextProjects = (projectsRes.data || []).map((p: any) => ({ id: p.id, name: p.name }));
            setProjects(nextProjects);
            if (selectedProject && !nextProjects.some((p: ProjectOption) => p.id === selectedProject)) {
                setSelectedProject("");
            }
            setTasks(
                (tasksRes.data || []).map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    project_id: t.project_id,
                    project_name: projectMap.get(t.project_id)?.name || t.project?.name || "Unknown",
                    project_health: projectMap.get(t.project_id)?.health || "green",
                    data_origin: t.data_origin,
                    sort_order: t.sort_order,
                }))
            );
        } catch {
            showToast("error", "Failed to load kanban data");
        } finally {
            setLoading(false);
        }
    }, [selectedProject]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function handleDragStart(e: React.DragEvent, taskId: string) {
        setDragTaskId(taskId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", taskId);
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }

    async function handleDrop(e: React.DragEvent, newStatus: TaskStatus) {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("text/plain") || dragTaskId;
        if (!taskId) return;

        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.status === newStatus) return;
        if (task.data_origin === "synced") {
            showToast("error", "Cannot move synced tasks");
            return;
        }

        // Optimistic update
        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        setDragTaskId(null);

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Update failed");
            showToast("success", `Task moved to ${newStatus.replace("_", " ")}`);
        } catch {
            showToast("error", "Failed to update task status");
            fetchData(); // Revert
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-zed-main">
                <div className="px-8 h-14 border-b border-zed-border bg-zed-header/30" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-xs text-text-muted animate-pulse">Loading kanban...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zed-main overflow-hidden">
            <header className="px-8 h-14 flex items-center justify-between border-b border-zed-border bg-zed-header/30 backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <nav className="flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50">
                        <button
                            onClick={() => setSelectedProject("")}
                            className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${
                                !selectedProject ? "bg-zed-active text-primary rounded-sm shadow-sm" : "text-text-muted hover:text-text-secondary"
                            }`}
                        >
                            All Projects
                        </button>
                        {projects.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProject(p.id)}
                                className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors truncate max-w-[120px] ${
                                    selectedProject === p.id ? "bg-zed-active text-primary rounded-sm shadow-sm" : "text-text-muted hover:text-text-secondary"
                                }`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <div className="flex-1 overflow-x-auto p-8 custom-scrollbar">
                {tasks.length === 0 ? (
                    <EmptyState message="No tasks found" description="Create tasks in a project first" />
                ) : (
                    <div className="flex gap-6 h-full min-w-fit">
                        {columns.map((col) => {
                            const columnTasks = tasks.filter((t) => t.status === col.status);
                            return (
                                <StatusColumn
                                    key={col.status}
                                    title={col.title}
                                    count={columnTasks.length}
                                    status={col.status}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, col.status)}
                                >
                                    {columnTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            id={task.id}
                                            title={task.title}
                                            projectName={task.project_name}
                                            health={task.project_health}
                                            status={task.status}
                                            isSynced={task.data_origin === "synced"}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onClick={() => router.push(`/projects/${task.project_id}?from=kanban&task=${task.id}`)}
                                        />
                                    ))}
                                </StatusColumn>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
