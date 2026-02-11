"use client";

import { useEffect, useMemo, useState } from "react";
import { IconX, IconFlag, IconMessageCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import type { Task, ActivityLog } from "@/lib/types/api";

interface ActorOption {
    id: string;
    name: string;
}

interface TaskDetailPanelProps {
    task: Task;
    projectName?: string;
    phaseName?: string;
    onClose: () => void;
    onTaskUpdated?: (task: Task) => void;
}

export function TaskDetailPanel({ task, projectName, phaseName, onClose, onTaskUpdated }: TaskDetailPanelProps) {
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [actors, setActors] = useState<ActorOption[]>([]);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [draft, setDraft] = useState({
        status: task.status,
        priority: task.priority,
        owner_id: task.owner_id,
        deadline_at: toDateInput(task.deadline_at),
        description: task.description || "",
        notes: task.notes || "",
    });
    const isReadOnly = task.data_origin === "synced";
    const isDone = draft.status === "done";

    useEffect(() => {
        setDraft({
            status: task.status,
            priority: task.priority,
            owner_id: task.owner_id,
            deadline_at: toDateInput(task.deadline_at),
            description: task.description || "",
            notes: task.notes || "",
        });
    }, [task]);

    useEffect(() => {
        fetch(`/api/activity?entity_type=task&entity_id=${task.id}&limit=10`)
            .then((r) => r.json())
            .then((res) => setActivity(res.data || []))
            .catch(() => setActivity([]));
    }, [task.id]);

    useEffect(() => {
        fetch("/api/actors")
            .then((r) => r.json())
            .then((res) => setActors((res.data || []).map((a: any) => ({ id: a.id, name: a.name }))))
            .catch(() => setActors([]));
    }, []);

    const statusClass = useMemo(() => (
        draft.status === "blocked" ? "bg-status-red/10 border-status-red/20 text-status-red" :
            draft.status === "done" ? "bg-status-green/10 border-status-green/20 text-status-green" :
                "bg-zed-active border-zed-border text-text-secondary"
    ), [draft.status]);

    async function patchTask(patch: Record<string, any>, label: string) {
        if (savingField) return;
        setSavingField(label);
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || "Update failed");
            onTaskUpdated?.(body.data);
            showToast("success", "Task updated");
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Failed to update task");
        } finally {
            setSavingField(null);
        }
    }

    return (
        <div className="w-[400px] flex-shrink-0 flex flex-col bg-zed-sidebar/30 border-l border-zed-border">
            <header className="px-6 h-14 flex items-center justify-between border-b border-zed-border">
                <span className="text-[9px] font-bold tracking-widest text-text-muted uppercase truncate">
                    {projectName}{phaseName ? ` / ${phaseName}` : ""}
                </span>
                <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors">
                    <IconX className="w-4 h-4" />
                </button>
            </header>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                <h1 className="text-xl font-semibold mb-4 text-text-primary tracking-tight">{task.title}</h1>

                <div className="flex gap-2 mb-6 flex-wrap">
                    <span className={cn(
                        "flex items-center gap-1.5 px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-tight",
                        draft.priority === "P1" ? "bg-status-red/10 border-status-red/20 text-status-red" :
                            draft.priority === "P2" ? "bg-status-yellow/10 border-status-yellow/20 text-status-yellow" :
                                "bg-primary/10 border-primary/20 text-primary"
                    )}>
                        <IconFlag className="w-3 h-3" /> {draft.priority || "No priority"}
                    </span>
                    <span className={cn("px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-tight", statusClass)}>
                        {draft.status.replace("_", " ")}
                    </span>
                    {isReadOnly && (
                        <span className="px-2 py-1 bg-zed-active border border-zed-border rounded text-[9px] font-bold text-text-muted uppercase tracking-tight">
                            Read Only (synced)
                        </span>
                    )}
                    <button
                        onClick={() => {
                            const next = isDone ? "pending" : "done";
                            setDraft((prev) => ({ ...prev, status: next as Task["status"] }));
                            void patchTask({ status: next }, "status");
                        }}
                        disabled={savingField !== null}
                        className="px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-tight bg-zed-active border-zed-border text-text-secondary disabled:opacity-40"
                    >
                        {isDone ? "Reopen" : "Mark Done"}
                    </button>
                </div>

                <section className="mb-6">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Properties</h4>
                    <div className="space-y-3">
                        <Field label="Status">
                            <select
                                value={draft.status}
                                onChange={(e) => {
                                    const value = e.target.value as Task["status"];
                                    setDraft((prev) => ({ ...prev, status: value }));
                                    void patchTask({ status: value }, "status");
                                }}
                                disabled={savingField !== null}
                                className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="blocked">Blocked</option>
                                <option value="done">Done</option>
                            </select>
                        </Field>

                        <Field label="Priority">
                            <select
                                value={draft.priority || "P2"}
                                onChange={(e) => {
                                    const value = e.target.value as Task["priority"];
                                    setDraft((prev) => ({ ...prev, priority: value }));
                                    void patchTask({ priority: value }, "priority");
                                }}
                                disabled={savingField !== null || isReadOnly}
                                className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary disabled:opacity-50"
                            >
                                <option value="P1">P1</option>
                                <option value="P2">P2</option>
                                <option value="P3">P3</option>
                            </select>
                        </Field>

                        <Field label="Owner">
                            <select
                                value={draft.owner_id || ""}
                                onChange={(e) => {
                                    const value = e.target.value || null;
                                    setDraft((prev) => ({ ...prev, owner_id: value }));
                                    void patchTask({ owner_id: value }, "owner_id");
                                }}
                                disabled={savingField !== null || isReadOnly}
                                className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary disabled:opacity-50"
                            >
                                <option value="">Unassigned</option>
                                {actors.map((actor) => (
                                    <option key={actor.id} value={actor.id}>{actor.name}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Due Date">
                            <input
                                type="date"
                                value={draft.deadline_at}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setDraft((prev) => ({ ...prev, deadline_at: value }));
                                    void patchTask({ deadline_at: value ? new Date(`${value}T12:00:00`).toISOString() : null }, "deadline_at");
                                }}
                                disabled={savingField !== null || isReadOnly}
                                className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary disabled:opacity-50"
                            />
                        </Field>
                    </div>
                </section>

                <section className="mb-6">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Description</h4>
                    <textarea
                        value={draft.description}
                        onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                        onBlur={() => void patchTask({ description: draft.description.trim() || null }, "description")}
                        disabled={savingField !== null || isReadOnly}
                        rows={4}
                        className="w-full bg-zed-main border border-zed-border rounded px-2 py-2 text-xs text-text-primary disabled:opacity-50"
                        placeholder="Add a description..."
                    />
                </section>

                <section className="mb-8">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Notes</h4>
                    <textarea
                        value={draft.notes}
                        onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                        onBlur={() => void patchTask({ notes: draft.notes.trim() || null }, "notes")}
                        disabled={savingField !== null || isReadOnly}
                        rows={4}
                        className="w-full bg-zed-main border border-zed-border rounded px-2 py-2 text-xs text-text-primary disabled:opacity-50"
                        placeholder="Add notes..."
                    />
                </section>

                {activity.length > 0 && (
                    <section>
                        <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-4 flex items-center gap-2">
                            <IconMessageCircle className="w-3.5 h-3.5" /> Activity
                        </h4>
                        <div className="space-y-3">
                            {activity.map((entry) => (
                                <div key={entry.id} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-extrabold text-primary">
                                        {entry.actor_id?.charAt(0).toUpperCase() || "S"}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-text-secondary leading-tight">
                                            <span className="text-text-primary font-bold">{entry.actor_id}</span>{" "}
                                            {entry.action.replaceAll("_", " ")}
                                        </p>
                                        <p className="text-[10px] text-text-muted mt-1">{new Date(entry.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</label>
            <div className="mt-1">{children}</div>
        </div>
    );
}

function toDateInput(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}
