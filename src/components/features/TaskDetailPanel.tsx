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

interface TaskComment {
    id: string;
    actor_id: string;
    actor_name: string;
    created_at: string;
    comment: string;
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
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [commentDraft, setCommentDraft] = useState("");
    const [commentBusy, setCommentBusy] = useState(false);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [governedBusy, setGovernedBusy] = useState<"dry_run" | "apply" | null>(null);
    const [governedPreview, setGovernedPreview] = useState<Array<{ file_path: string; line: number; before: string; after: string }>>([]);
    const [governedConflicts, setGovernedConflicts] = useState<Array<{ error: string }>>([]);
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
    const governedPatch = useMemo(() => ({
        status: draft.status,
        priority: draft.priority,
        title: task.title,
        description: draft.description.trim() || null,
    }), [draft.description, draft.priority, draft.status, task.title]);

    useEffect(() => {
        setDraft({
            status: task.status,
            priority: task.priority,
            owner_id: task.owner_id,
            deadline_at: toDateInput(task.deadline_at),
            description: task.description || "",
            notes: task.notes || "",
        });
        setGovernedPreview([]);
        setGovernedConflicts([]);
    }, [task]);

    useEffect(() => {
        fetch(`/api/activity?entity_type=task&entity_id=${task.id}&limit=10`)
            .then((r) => r.json())
            .then((res) => setActivity(res.data || []))
            .catch(() => setActivity([]));
    }, [task.id]);

    useEffect(() => {
        fetch(`/api/tasks/${task.id}/comments`)
            .then((r) => r.json())
            .then((res) => setComments(res.data || []))
            .catch(() => setComments([]));
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
    const actorNameById = useMemo(() => new Map(actors.map((actor) => [actor.id, actor.name])), [actors]);

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

    async function postComment() {
        if (!commentDraft.trim() || commentBusy) return;
        setCommentBusy(true);
        try {
            const res = await fetch(`/api/tasks/${task.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comment: commentDraft.trim() }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || "Failed to post comment");
            const refresh = await fetch(`/api/tasks/${task.id}/comments`);
            const refreshedBody = await refresh.json();
            if (refresh.ok) setComments(refreshedBody.data || []);
            setCommentDraft("");
            showToast("success", "Comment added");
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Failed to post comment");
        } finally {
            setCommentBusy(false);
        }
    }

    async function runGovernedWriteback(apply: boolean) {
        if (governedBusy) return;
        setGovernedBusy(apply ? "apply" : "dry_run");
        setGovernedConflicts([]);
        if (!apply) setGovernedPreview([]);
        try {
            const res = await fetch("/api/connectors/writeback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_id: task.project_id,
                    dry_run: !apply,
                    strict_conflicts: true,
                    operations: [
                        {
                            entity_type: "task",
                            entity_id: task.id,
                            expected_updated_at: task.updated_at,
                            patch: governedPatch,
                        },
                    ],
                }),
            });
            const body = await res.json();
            if (!res.ok) {
                if (res.status === 409 && Array.isArray(body?.conflicts)) {
                    setGovernedConflicts(body.conflicts);
                    showToast("error", "Writeback conflict. Refresh task and try again.");
                    return;
                }
                throw new Error(body?.error || "Governed writeback failed");
            }
            if (!apply) {
                const previews = (body?.data?.previews || [])
                    .flatMap((p: any) => p?.changes || [])
                    .filter((c: any) => c?.before !== undefined && c?.after !== undefined);
                setGovernedPreview(previews);
                showToast("success", "Dry-run preview ready");
                return;
            }
            const refresh = await fetch(`/api/tasks/${task.id}`);
            const refreshedBody = await refresh.json();
            if (refresh.ok && refreshedBody?.data) onTaskUpdated?.(refreshedBody.data);
            setGovernedPreview([]);
            showToast("success", "Governed writeback applied");
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Governed writeback failed");
        } finally {
            setGovernedBusy(null);
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
                {savingField && (
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-muted animate-pulse">
                        Saving {savingField.replaceAll("_", " ")}...
                    </div>
                )}

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
                            if (isReadOnly) return;
                            const next = isDone ? "pending" : "done";
                            setDraft((prev) => ({ ...prev, status: next as Task["status"] }));
                            void patchTask({ status: next }, "status");
                        }}
                        disabled={savingField !== null || isReadOnly}
                        className="px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-tight bg-zed-active border-zed-border text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {savingField === "status" ? "Saving..." : isDone ? "Reopen" : "Mark Done"}
                    </button>
                </div>
                {isReadOnly && (
                    <div className="mb-4 rounded border border-zed-border/50 bg-zed-main/40 px-3 py-2 text-[11px] text-text-secondary">
                        This task is synced from source files. Use Governed Edit to preview and apply safe write-back.
                    </div>
                )}
                {isReadOnly && (
                    <section className="mb-6">
                        <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Governed Edit (Synced)</h4>
                        <div className="flex items-center gap-2 mb-3">
                            <button
                                onClick={() => void runGovernedWriteback(false)}
                                disabled={governedBusy !== null}
                                className="px-3 py-1.5 bg-zed-active border border-zed-border text-[10px] font-bold tracking-widest uppercase hover:bg-zed-hover transition-colors rounded disabled:opacity-40"
                            >
                                {governedBusy === "dry_run" ? "Checking..." : "Dry Run"}
                            </button>
                            <button
                                onClick={() => {
                                    if (!governedPreview.length) {
                                        showToast("error", "Run dry-run first");
                                        return;
                                    }
                                    const confirmed = window.confirm("Apply this write-back to source files and DB?");
                                    if (!confirmed) return;
                                    void runGovernedWriteback(true);
                                }}
                                disabled={governedBusy !== null || governedPreview.length === 0}
                                className="px-3 py-1.5 bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold tracking-widest uppercase hover:bg-primary/30 transition-colors rounded disabled:opacity-40"
                            >
                                {governedBusy === "apply" ? "Applying..." : "Apply Writeback"}
                            </button>
                        </div>
                        {governedConflicts.length > 0 && (
                            <div className="mb-3 rounded border border-status-red/30 bg-status-red/10 px-3 py-2 text-[11px] text-status-red">
                                {governedConflicts.map((c, idx) => (
                                    <div key={`${idx}-${c.error}`}>{c.error}</div>
                                ))}
                            </div>
                        )}
                        {governedPreview.length > 0 && (
                            <div className="space-y-2">
                                {governedPreview.map((change, idx) => (
                                    <div key={`${change.file_path}-${change.line}-${idx}`} className="rounded border border-zed-border/60 bg-zed-main/40 px-3 py-2">
                                        <div className="text-[10px] font-mono text-text-muted mb-2">{change.file_path}:{change.line}</div>
                                        <div className="text-[11px] text-status-red line-through break-all">{change.before}</div>
                                        <div className="text-[11px] text-status-green break-all">{change.after}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                <section className="mb-6">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Context</h4>
                    <div className="space-y-2 text-[11px]">
                        <div className="flex items-center justify-between rounded border border-zed-border/50 bg-zed-main/30 px-3 py-2">
                            <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Task ID</span>
                            <span className="font-mono text-text-secondary">{task.display_id ? `#${task.display_id}` : task.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded border border-zed-border/50 bg-zed-main/30 px-3 py-2">
                            <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Updated</span>
                            <span className="text-text-secondary">{new Date(task.updated_at).toLocaleString()}</span>
                        </div>
                        {task.source_id && (
                            <div className="rounded border border-zed-border/50 bg-zed-main/30 px-3 py-2">
                                <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Source</span>
                                <p className="text-text-secondary font-mono mt-1 break-all">{task.source_id}</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="mb-6">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Properties</h4>
                    <div className="space-y-3">
                        <Field label="Status">
                            <select
                                value={draft.status}
                                onChange={(e) => {
                                    if (isReadOnly) return;
                                    const value = e.target.value as Task["status"];
                                    setDraft((prev) => ({ ...prev, status: value }));
                                    void patchTask({ status: value }, "status");
                                }}
                                disabled={savingField !== null || isReadOnly}
                                className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary disabled:opacity-50"
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

                <section className="mb-8">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Comments</h4>
                    <div className="space-y-3 mb-3">
                        <textarea
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            disabled={commentBusy}
                            rows={3}
                            className="w-full bg-zed-main border border-zed-border rounded px-2 py-2 text-xs text-text-primary disabled:opacity-50"
                            placeholder="Add context for this task..."
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-text-muted">{commentDraft.trim().length}/5000</span>
                            <button
                                onClick={() => void postComment()}
                                disabled={!commentDraft.trim() || commentBusy}
                                className="px-3 py-1.5 bg-zed-active border border-zed-border text-[10px] font-bold tracking-widest uppercase hover:bg-zed-hover transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {commentBusy ? "Posting..." : "Add Comment"}
                            </button>
                        </div>
                    </div>

                    {comments.length > 0 ? (
                        <div className="space-y-2">
                            {comments.map((comment) => (
                                <div key={comment.id} className="rounded border border-zed-border/40 bg-zed-main/30 px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                                            {comment.actor_name}
                                        </span>
                                        <span className="text-[10px] text-text-muted">{new Date(comment.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-text-primary whitespace-pre-wrap">{comment.comment}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-text-muted italic">No comments yet.</div>
                    )}
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
                                            <span className="text-text-primary font-bold">{actorNameById.get(entry.actor_id) || entry.actor_id}</span>{" "}
                                            {entry.action.replaceAll("_", " ")}
                                        </p>
                                        {summarizeDetail(entry.detail) && (
                                            <p className="text-[11px] text-text-muted mt-1">{summarizeDetail(entry.detail)}</p>
                                        )}
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

function summarizeDetail(detail: ActivityLog["detail"]): string | null {
    if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
    const record = detail as Record<string, unknown>;

    const comment = typeof record.comment === "string" ? record.comment : null;
    if (comment) return truncate(comment, 140);

    const title = typeof record.title === "string" ? record.title : null;
    if (title) return `Title: ${truncate(title, 120)}`;

    const changedKeys = Object.keys(record).filter((k) => record[k] !== undefined && record[k] !== null);
    if (changedKeys.length > 0) return `Updated ${changedKeys.slice(0, 4).join(", ")}`;
    return null;
}

function truncate(value: string, max: number): string {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}...`;
}
