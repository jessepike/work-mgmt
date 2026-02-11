"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconX, IconFlag, IconMessageCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { PriorityChip } from "@/components/ui/PriorityChip";
import { showToast } from "@/components/ui/Toast";
import type { Task, ActivityLog } from "@/lib/types/api";

interface TaskDetailPanelProps {
    task: Task;
    projectName?: string;
    phaseName?: string;
    onClose: () => void;
}

export function TaskDetailPanel({ task, projectName, phaseName, onClose }: TaskDetailPanelProps) {
    const router = useRouter();
    const [editingField, setEditingField] = useState<string | null>(null);
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const isReadOnly = task.data_origin === "synced";

    useEffect(() => {
        fetch(`/api/activity?entity_type=task&entity_id=${task.id}&limit=10`)
            .then((r) => r.json())
            .then((res) => setActivity(res.data || []))
            .catch(() => {});
    }, [task.id]);

    async function updateField(field: string, value: string | null) {
        if (isReadOnly) return;
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value }),
            });
            if (!res.ok) throw new Error("Update failed");
            showToast("success", "Task updated");
            router.refresh();
        } catch {
            showToast("error", "Failed to update task");
        }
        setEditingField(null);
    }

    const statusColor: Record<string, string> = {
        pending: "text-text-muted",
        in_progress: "text-status-yellow",
        blocked: "text-status-red",
        done: "text-status-green",
    };

    return (
        <div className="w-[360px] flex-shrink-0 flex flex-col bg-zed-sidebar/30 border-l border-zed-border">
            <header className="px-6 h-14 flex items-center justify-between border-b border-zed-border">
                <span className="text-[9px] font-bold tracking-widest text-text-muted uppercase truncate">
                    {projectName}{phaseName ? ` / ${phaseName}` : ""}
                </span>
                <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors">
                    <IconX className="w-4 h-4" />
                </button>
            </header>

            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                <h1 className="text-xl font-semibold mb-4 text-text-primary tracking-tight">{task.title}</h1>

                <div className="flex gap-2 mb-10">
                    {task.priority && (
                        <span className={cn(
                            "flex items-center gap-1.5 px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-tight",
                            task.priority === "P1" ? "bg-status-red/10 border-status-red/20 text-status-red" :
                            task.priority === "P2" ? "bg-status-yellow/10 border-status-yellow/20 text-status-yellow" :
                            "bg-primary/10 border-primary/20 text-primary"
                        )}>
                            <IconFlag className="w-3 h-3" /> {task.priority}
                        </span>
                    )}
                    <span className={cn(
                        "px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-tight",
                        task.status === "blocked" ? "bg-status-red/10 border-status-red/20 text-status-red" :
                        task.status === "done" ? "bg-status-green/10 border-status-green/20 text-status-green" :
                        "bg-zed-active border-zed-border text-text-secondary"
                    )}>
                        {task.status.replace("_", " ")}
                    </span>
                    {isReadOnly && (
                        <span className="px-2 py-1 bg-zed-active border border-zed-border rounded text-[9px] font-bold text-text-muted uppercase tracking-tight">
                            Read Only
                        </span>
                    )}
                </div>

                <div className="space-y-8">
                    {task.description && (
                        <section>
                            <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Description</h4>
                            <p className="text-xs text-text-secondary leading-relaxed">{task.description}</p>
                        </section>
                    )}

                    <section>
                        <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Properties</h4>
                        <div className="border border-zed-border rounded divide-y divide-zed-border">
                            <PropertyRow label="Status" value={task.status.replace("_", " ")} />
                            <PropertyRow label="Priority" value={task.priority || "None"} />
                            <PropertyRow label="Owner" value={task.owner_id || "Unassigned"} />
                            <PropertyRow label="Due Date" value={task.deadline_at ? new Date(task.deadline_at).toLocaleDateString() : "None"} />
                            {task.blocked_reason && <PropertyRow label="Blocked" value={task.blocked_reason} />}
                        </div>
                    </section>

                    {activity.length > 0 && (
                        <section>
                            <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-4 flex items-center gap-2">
                                <IconMessageCircle className="w-3.5 h-3.5" /> Activity
                            </h4>
                            <div className="space-y-4">
                                {activity.map((entry) => (
                                    <div key={entry.id} className="flex gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-extrabold text-primary">
                                            {entry.actor_id?.charAt(0).toUpperCase() || "S"}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-text-secondary leading-tight">
                                                <span className="text-text-primary font-bold">{entry.actor_id}</span>{" "}
                                                {entry.action}
                                            </p>
                                            <p className="text-[10px] text-text-muted mt-1">
                                                {new Date(entry.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center text-xs h-9 px-3">
            <span className="w-24 text-text-secondary">{label}</span>
            <span className="flex-1 font-medium text-text-primary capitalize">{value}</span>
        </div>
    );
}
