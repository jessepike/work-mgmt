"use client";

import { useState, useEffect, useMemo } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { PriorityChip } from "@/components/ui/PriorityChip";
import type { BacklogItem } from "@/lib/types/api";

interface BacklogSectionProps {
    projectId: string;
    mode?: "all" | "active" | "completed";
    initialExpanded?: boolean;
    showHeader?: boolean;
}

export function BacklogSection({
    projectId,
    mode = "all",
    initialExpanded = false,
    showHeader = true
}: BacklogSectionProps) {
    const [expanded, setExpanded] = useState(initialExpanded);
    const [showCompleted, setShowCompleted] = useState(false);
    const [items, setItems] = useState<BacklogItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [busy, setBusy] = useState<"dry_run" | "apply" | null>(null);
    const [draft, setDraft] = useState<{ title: string; description: string; status: BacklogItem["status"]; priority: BacklogItem["priority"] | null } | null>(null);
    const [preview, setPreview] = useState<Array<{ file_path: string; line: number; before: string; after: string }>>([]);
    const [conflicts, setConflicts] = useState<string[]>([]);

    useEffect(() => {
        if (expanded && !loaded) {
            fetch(`/api/backlog?project_id=${projectId}`)
                .then((r) => r.json())
                .then((res) => {
                    setItems(res.data || []);
                    setLoaded(true);
                });
        }
    }, [expanded, loaded, projectId]);

    const activeItems = items
        .filter((i) => i.status !== "promoted" && i.status !== "archived")
        .sort(compareBacklogItems);
    const completedItems = items
        .filter((i) => i.status === "promoted" || i.status === "archived")
        .sort(compareBacklogItems);

    const editingItem = useMemo(() => items.find((i) => i.id === editingId) || null, [editingId, items]);

    function startGovernedEdit(item: BacklogItem) {
        setEditingId(item.id);
        setPreview([]);
        setConflicts([]);
        setDraft({
            title: item.title,
            description: item.description || "",
            status: item.status,
            priority: item.priority,
        });
    }

    async function runGoverned(item: BacklogItem, apply: boolean) {
        if (!draft || busy) return;
        setBusy(apply ? "apply" : "dry_run");
        setConflicts([]);
        if (!apply) setPreview([]);
        try {
            const res = await fetch("/api/connectors/writeback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_id: projectId,
                    dry_run: !apply,
                    strict_conflicts: true,
                    operations: [
                        {
                            entity_type: "backlog_item",
                            entity_id: item.id,
                            expected_updated_at: item.updated_at,
                            patch: {
                                title: draft.title.trim(),
                                description: draft.description.trim() || null,
                                status: draft.status,
                                priority: draft.priority,
                            },
                        },
                    ],
                }),
            });
            const body = await res.json();
            if (!res.ok) {
                if (res.status === 409 && Array.isArray(body?.conflicts)) {
                    setConflicts(body.conflicts.map((c: any) => c?.error || "Conflict"));
                    return;
                }
                throw new Error(body?.error || "Writeback failed");
            }
            if (!apply) {
                const previews = (body?.data?.previews || [])
                    .flatMap((p: any) => p?.changes || [])
                    .filter((c: any) => c?.before !== undefined && c?.after !== undefined);
                setPreview(previews);
                return;
            }
            setItems((prev) => prev.map((row) => row.id === item.id ? {
                ...row,
                title: draft.title.trim(),
                description: draft.description.trim() || null,
                status: draft.status,
                priority: draft.priority,
                updated_at: new Date().toISOString(),
            } : row));
            setEditingId(null);
            setDraft(null);
            setPreview([]);
        } catch (error) {
            setConflicts([error instanceof Error ? error.message : "Writeback failed"]);
        } finally {
            setBusy(null);
        }
    }

    return (
        <section>
            {showHeader && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-3 mb-4 px-2 w-full"
                >
                    <IconChevronDown className={cn(
                        "w-3.5 h-3.5 text-text-muted transition-transform",
                        !expanded && "-rotate-90"
                    )} />
                    <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase">Backlog</h3>
                    <span className="text-[10px] font-bold text-text-muted/80 tracking-widest uppercase">
                        {activeItems.length} active
                    </span>
                    <div className="h-[1px] flex-1 bg-zed-border/50" />
                </button>
            )}

            {expanded && (
                <div>
                    {(mode === "all" || mode === "active") && (activeItems.length === 0 ? (
                        <div className="h-10 px-4 flex items-center text-xs text-text-muted italic opacity-50">
                            No pending backlog items...
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {activeItems.map((item) => (
                                <div key={item.id} className="px-4 py-2 hover:bg-zed-hover rounded transition-colors">
                                    <div className="flex items-center h-8">
                                        <span className="text-[10px] font-mono text-text-muted/60 mr-3 shrink-0 w-14">{displayBacklogId(item)}</span>
                                        <span className="text-xs text-text-secondary flex-1 truncate">{item.title}</span>
                                        <div className="flex items-center gap-3 ml-4">
                                            <PriorityChip priority={item.priority} />
                                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-tight">
                                                {item.status}
                                            </span>
                                            {item.data_origin === "synced" && (
                                                <button
                                                    onClick={() => startGovernedEdit(item)}
                                                    className="text-[9px] font-bold uppercase tracking-widest text-primary hover:underline"
                                                >
                                                    Governed Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {editingItem?.id === item.id && draft && (
                                        <div className="mt-2 rounded border border-zed-border/60 bg-zed-main/40 p-3 space-y-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <input
                                                    value={draft.title}
                                                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                                                    className="bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                                                />
                                                <input
                                                    value={draft.description}
                                                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                                    className="bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                                                    placeholder="Description"
                                                />
                                                <select
                                                    value={draft.status}
                                                    onChange={(e) => setDraft({ ...draft, status: e.target.value as BacklogItem["status"] })}
                                                    className="bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                                                >
                                                    <option value="captured">Captured</option>
                                                    <option value="triaged">Triaged</option>
                                                    <option value="prioritized">Prioritized</option>
                                                    <option value="promoted">Promoted</option>
                                                    <option value="archived">Archived</option>
                                                </select>
                                                <select
                                                    value={draft.priority || "P2"}
                                                    onChange={(e) => setDraft({ ...draft, priority: e.target.value as BacklogItem["priority"] })}
                                                    className="bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                                                >
                                                    <option value="P1">P1</option>
                                                    <option value="P2">P2</option>
                                                    <option value="P3">P3</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => void runGoverned(item, false)}
                                                    disabled={busy !== null}
                                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-zed-active border border-zed-border rounded disabled:opacity-40"
                                                >
                                                    {busy === "dry_run" ? "Checking..." : "Dry Run"}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (!preview.length) return;
                                                        const confirmed = window.confirm("Apply writeback changes?");
                                                        if (!confirmed) return;
                                                        void runGoverned(item, true);
                                                    }}
                                                    disabled={busy !== null || preview.length === 0}
                                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-primary/20 border border-primary/40 text-primary rounded disabled:opacity-40"
                                                >
                                                    {busy === "apply" ? "Applying..." : "Apply"}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setDraft(null);
                                                        setPreview([]);
                                                        setConflicts([]);
                                                    }}
                                                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-secondary"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                            {conflicts.length > 0 && (
                                                <div className="text-[11px] text-status-red space-y-1">
                                                    {conflicts.map((c, idx) => <div key={`${idx}-${c}`}>{c}</div>)}
                                                </div>
                                            )}
                                            {preview.length > 0 && (
                                                <div className="space-y-1">
                                                    {preview.map((change, idx) => (
                                                        <div key={`${change.file_path}-${change.line}-${idx}`} className="rounded border border-zed-border/50 px-2 py-1">
                                                            <div className="text-[10px] font-mono text-text-muted">{change.file_path}:{change.line}</div>
                                                            <div className="text-[11px] text-status-red line-through break-all">{change.before}</div>
                                                            <div className="text-[11px] text-status-green break-all">{change.after}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}

                    {(mode === "all" || mode === "completed") && completedItems.length > 0 && (
                        <div className="mt-4">
                            {mode === "all" ? (
                                <button
                                    onClick={() => setShowCompleted(!showCompleted)}
                                    className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-secondary"
                                >
                                    {showCompleted ? "Hide" : "Show"} Completed ({completedItems.length})
                                </button>
                            ) : null}
                            {(mode === "completed" || showCompleted) && (
                                <div className="space-y-1 mt-2 opacity-80">
                                    {completedItems.map((item) => (
                                        <div key={item.id} className="flex items-center h-10 px-4 rounded">
                                            <span className="text-[10px] font-mono text-text-muted/40 mr-3 shrink-0 w-14">{displayBacklogId(item)}</span>
                                            <span className="text-xs text-text-muted line-through flex-1 truncate">{item.title}</span>
                                            <div className="flex items-center gap-3 ml-4">
                                                <PriorityChip priority={item.priority} />
                                                <span className="text-[9px] font-bold text-text-muted uppercase tracking-tight">
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {mode === "completed" && completedItems.length === 0 && (
                        <div className="h-10 px-4 flex items-center text-xs text-text-muted italic opacity-50">
                            No completed backlog items...
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

function displayBacklogId(item: Pick<BacklogItem, "source_id" | "id">): string {
    const match = (item.source_id || "").match(/(?:^|:)(B\d+)(?:$|:)/i);
    if (match) return match[1].toUpperCase();
    return `BL-${item.id.slice(0, 6)}`;
}

function compareBacklogItems(a: BacklogItem, b: BacklogItem): number {
    const statusRank = (status: BacklogItem["status"]) => {
        if (status === "prioritized") return 0;
        if (status === "triaged") return 1;
        if (status === "captured") return 2;
        if (status === "promoted") return 3;
        if (status === "archived") return 4;
        return 5;
    };
    const priorityRank = (priority: BacklogItem["priority"]) => {
        if (priority === "P1") return 0;
        if (priority === "P2") return 1;
        return 2;
    };

    const aStatus = statusRank(a.status);
    const bStatus = statusRank(b.status);
    if (aStatus !== bStatus) return aStatus - bStatus;

    const aPriority = priorityRank(a.priority);
    const bPriority = priorityRank(b.priority);
    if (aPriority !== bPriority) return aPriority - bPriority;

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}
