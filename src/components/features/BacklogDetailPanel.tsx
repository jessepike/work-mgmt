"use client";

import { useEffect, useMemo, useState } from "react";
import { IconX, IconFlag, IconArrowUp } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";
import type { BacklogItem, ActivityLog } from "@/lib/types/api";

interface BacklogDetailPanelProps {
    item: BacklogItem & { project?: { id: string; name: string } | { id: string; name: string }[] | null };
    projectName?: string;
    onClose: () => void;
    onItemUpdated?: (item: BacklogItem) => void;
}

export function BacklogDetailPanel({ item, projectName, onClose, onItemUpdated }: BacklogDetailPanelProps) {
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [governedBusy, setGovernedBusy] = useState<"dry_run" | "apply" | null>(null);
    const [governedPreview, setGovernedPreview] = useState<Array<{ file_path: string; line: number; before: string; after: string }>>([]);
    const [governedConflicts, setGovernedConflicts] = useState<Array<{ error: string }>>([]);
    const [draft, setDraft] = useState({
        status: item.status,
        priority: item.priority,
        description: item.description || "",
        notes: item.notes || "",
    });
    const isReadOnly = item.data_origin === "synced";
    const canPromote = item.status !== "promoted" && item.status !== "archived";

    useEffect(() => {
        setDraft({
            status: item.status,
            priority: item.priority,
            description: item.description || "",
            notes: item.notes || "",
        });
        setGovernedPreview([]);
        setGovernedConflicts([]);
    }, [item]);

    useEffect(() => {
        fetch(`/api/activity?entity_type=backlog_item&entity_id=${item.id}&limit=10`)
            .then((r) => r.json())
            .then((res) => setActivity(res.data || []))
            .catch(() => setActivity([]));
    }, [item.id]);

    const priorityClass = useMemo(() => (
        draft.priority === "P1" ? "bg-status-red/10 border-status-red/20 text-status-red" :
            draft.priority === "P2" ? "bg-status-yellow/10 border-status-yellow/20 text-status-yellow" :
                "bg-primary/10 border-primary/20 text-primary"
    ), [draft.priority]);

    async function patchItem(patch: Record<string, any>, label: string) {
        if (savingField) return;
        setSavingField(label);
        try {
            const res = await fetch(`/api/backlog/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || "Update failed");
            onItemUpdated?.(body.data);
            showToast("success", "Backlog item updated");
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Failed to update");
        } finally {
            setSavingField(null);
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
                    project_id: item.project_id,
                    dry_run: !apply,
                    strict_conflicts: true,
                    operations: [{
                        entity_type: "backlog_item",
                        entity_id: item.id,
                        expected_updated_at: item.updated_at,
                        patch: {
                            title: item.title,
                            description: draft.description.trim() || null,
                            status: draft.status,
                            priority: draft.priority,
                        },
                    }],
                }),
            });
            const body = await res.json();
            if (!res.ok) {
                if (res.status === 409 && Array.isArray(body?.conflicts)) {
                    setGovernedConflicts(body.conflicts);
                    showToast("error", "Writeback conflict");
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
            onItemUpdated?.({ ...item, ...draft, updated_at: new Date().toISOString() });
            setGovernedPreview([]);
            showToast("success", "Governed writeback applied");
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Governed writeback failed");
        } finally {
            setGovernedBusy(null);
        }
    }

    async function handlePromote() {
        const confirmed = window.confirm("Promote this backlog item to a task?");
        if (!confirmed) return;
        try {
            const res = await fetch("/api/backlog/promote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ backlog_item_id: item.id }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || "Promote failed");
            onItemUpdated?.({ ...item, status: "promoted", promoted_to_task_id: body.data?.id || null });
            showToast("success", "Promoted to task");
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Failed to promote");
        }
    }

    return (
        <div className="w-[400px] flex-shrink-0 flex flex-col bg-zed-sidebar/30 border-l border-zed-border">
            <header className="px-6 h-14 flex items-center justify-between border-b border-zed-border">
                <span className="text-[9px] font-bold tracking-widest text-text-muted uppercase truncate">
                    {projectName || "Backlog Item"}
                </span>
                <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors">
                    <IconX className="w-4 h-4" />
                </button>
            </header>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                <h1 className="text-xl font-semibold mb-4 text-text-primary tracking-tight">{item.title}</h1>

                {savingField && (
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-muted animate-pulse">
                        Saving {savingField.replaceAll("_", " ")}...
                    </div>
                )}

                <div className="flex gap-2 mb-6 flex-wrap">
                    {draft.priority && (
                        <span className={cn(
                            "flex items-center gap-1.5 px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-tight",
                            priorityClass,
                        )}>
                            <IconFlag className="w-3 h-3" /> {draft.priority}
                        </span>
                    )}
                    <span className="px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-tight bg-zed-active border-zed-border text-text-secondary lowercase">
                        {draft.status}
                    </span>
                    {isReadOnly && (
                        <span className="px-2 py-1 bg-zed-active border border-zed-border rounded text-[9px] font-bold text-text-muted uppercase tracking-tight">
                            Synced
                        </span>
                    )}
                    {canPromote && (
                        <button
                            onClick={handlePromote}
                            className="flex items-center gap-1 px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-tight bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 transition-colors"
                        >
                            <IconArrowUp className="w-3 h-3" /> Promote
                        </button>
                    )}
                </div>

                {/* Governed edit for synced items */}
                {isReadOnly && (
                    <section className="mb-6">
                        <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Governed Edit</h4>
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
                                    if (!governedPreview.length) { showToast("error", "Run dry-run first"); return; }
                                    const confirmed = window.confirm("Apply writeback changes?");
                                    if (!confirmed) return;
                                    void runGovernedWriteback(true);
                                }}
                                disabled={governedBusy !== null || governedPreview.length === 0}
                                className="px-3 py-1.5 bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold tracking-widest uppercase hover:bg-primary/30 transition-colors rounded disabled:opacity-40"
                            >
                                {governedBusy === "apply" ? "Applying..." : "Apply"}
                            </button>
                        </div>
                        {governedConflicts.length > 0 && (
                            <div className="mb-3 rounded border border-status-red/30 bg-status-red/10 px-3 py-2 text-[11px] text-status-red">
                                {governedConflicts.map((c, idx) => <div key={`${idx}-${c.error}`}>{c.error}</div>)}
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

                {/* Context */}
                <section className="mb-6">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Context</h4>
                    <div className="space-y-2 text-[11px]">
                        <div className="flex items-center justify-between rounded border border-zed-border/50 bg-zed-main/30 px-3 py-2">
                            <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">ID</span>
                            <span className="font-mono text-text-secondary">
                                {item.display_id ? `BL-${item.display_id}` : item.id.slice(0, 8)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded border border-zed-border/50 bg-zed-main/30 px-3 py-2">
                            <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Updated</span>
                            <span className="text-text-secondary">{new Date(item.updated_at).toLocaleString()}</span>
                        </div>
                        {item.type && (
                            <div className="flex items-center justify-between rounded border border-zed-border/50 bg-zed-main/30 px-3 py-2">
                                <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Type</span>
                                <span className="text-text-secondary">{item.type}</span>
                            </div>
                        )}
                        {item.size && (
                            <div className="flex items-center justify-between rounded border border-zed-border/50 bg-zed-main/30 px-3 py-2">
                                <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Size</span>
                                <span className="text-text-secondary">{item.size}</span>
                            </div>
                        )}
                        {item.source_id && (
                            <div className="rounded border border-zed-border/50 bg-zed-main/30 px-3 py-2">
                                <span className="text-text-muted uppercase tracking-widest text-[9px] font-bold">Source</span>
                                <p className="text-text-secondary font-mono mt-1 break-all">{item.source_id}</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Properties */}
                <section className="mb-6">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Properties</h4>
                    <div className="space-y-3">
                        <Field label="Status">
                            <select
                                value={draft.status}
                                onChange={(e) => {
                                    if (isReadOnly) return;
                                    const value = e.target.value as BacklogItem["status"];
                                    setDraft((prev) => ({ ...prev, status: value }));
                                    void patchItem({ status: value }, "status");
                                }}
                                disabled={savingField !== null || isReadOnly}
                                className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary disabled:opacity-50"
                            >
                                <option value="captured">Captured</option>
                                <option value="triaged">Triaged</option>
                                <option value="prioritized">Prioritized</option>
                                <option value="promoted">Promoted</option>
                                <option value="archived">Archived</option>
                            </select>
                        </Field>

                        <Field label="Priority">
                            <select
                                value={draft.priority || ""}
                                onChange={(e) => {
                                    if (isReadOnly) return;
                                    const value = (e.target.value || null) as BacklogItem["priority"];
                                    setDraft((prev) => ({ ...prev, priority: value }));
                                    void patchItem({ priority: value }, "priority");
                                }}
                                disabled={savingField !== null || isReadOnly}
                                className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary disabled:opacity-50"
                            >
                                <option value="">None</option>
                                <option value="P1">P1</option>
                                <option value="P2">P2</option>
                                <option value="P3">P3</option>
                            </select>
                        </Field>
                    </div>
                </section>

                {/* Description */}
                <section className="mb-6">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Description</h4>
                    <textarea
                        value={draft.description}
                        onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                        onBlur={() => { if (!isReadOnly) void patchItem({ description: draft.description.trim() || null }, "description"); }}
                        disabled={savingField !== null || isReadOnly}
                        rows={4}
                        className="w-full bg-zed-main border border-zed-border rounded px-2 py-2 text-xs text-text-primary disabled:opacity-50"
                        placeholder="Add a description..."
                    />
                </section>

                {/* Notes */}
                <section className="mb-8">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Notes</h4>
                    <textarea
                        value={draft.notes}
                        onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                        onBlur={() => { if (!isReadOnly) void patchItem({ notes: draft.notes.trim() || null }, "notes"); }}
                        disabled={savingField !== null || isReadOnly}
                        rows={4}
                        className="w-full bg-zed-main border border-zed-border rounded px-2 py-2 text-xs text-text-primary disabled:opacity-50"
                        placeholder="Add notes..."
                    />
                </section>

                {/* Activity */}
                {activity.length > 0 && (
                    <section>
                        <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-4">Activity</h4>
                        <div className="space-y-3">
                            {activity.map((entry) => (
                                <div key={entry.id} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-extrabold text-primary">
                                        {entry.actor_id?.charAt(0).toUpperCase() || "S"}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-text-secondary leading-tight">
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
