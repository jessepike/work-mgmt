"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { IconChevronUp, IconChevronDown, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { BacklogDetailPanel } from "@/components/features/BacklogDetailPanel";
import type { BacklogItem } from "@/lib/types/api";

interface BacklogItemRow extends BacklogItem {
    project?: { id: string; name: string } | { id: string; name: string }[] | null;
}

type SortKey = "display_id" | "priority" | "project" | "status" | "updated_at";
type SortDir = "asc" | "desc";

const ACTIVE_STATUSES = ["captured", "triaged", "prioritized"];
const STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "promoted", label: "Promoted" },
    { value: "archived", label: "Archived" },
];
const PRIORITY_OPTIONS = ["P1", "P2", "P3"] as const;

function priorityRank(p: string | null): number {
    if (p === "P1") return 0;
    if (p === "P2") return 1;
    if (p === "P3") return 2;
    return 3;
}

function normalizeProject(input: BacklogItemRow["project"]): { id: string; name: string } | null {
    if (!input) return null;
    if (Array.isArray(input)) return input[0] || null;
    return input;
}

function displayBacklogId(item: BacklogItemRow): string {
    if (item.display_id) return `BL-${item.display_id}`;
    const match = (item.source_id || "").match(/(?:^|:)(B\d+)(?:$|:)/i);
    if (match) return match[1].toUpperCase();
    return `BL-${item.id.slice(0, 6)}`;
}

function formatRelativeTime(value: string): string {
    const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

const priorityDot: Record<string, string> = {
    P1: "bg-status-red",
    P2: "bg-status-yellow",
    P3: "bg-primary",
};

export default function BacklogPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const statusFilter = searchParams.get("status") || "active";
    const priorityFilter = searchParams.get("priority") || "";

    const [items, setItems] = useState<BacklogItemRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>("updated_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Fetch data
    useEffect(() => {
        setLoading(true);
        setError(null);
        const statusParam = statusFilter === "active" ? ACTIVE_STATUSES.join(",") : statusFilter;
        fetch(`/api/backlog?scope=enabled&status=${encodeURIComponent(statusParam)}`)
            .then((r) => r.json())
            .then((res) => {
                setItems(res.data || []);
                setLoading(false);
            })
            .catch((e) => {
                setError(e instanceof Error ? e.message : "Failed to load backlog");
                setLoading(false);
            });
    }, [statusFilter]);

    // Filter + sort
    const filtered = useMemo(() => {
        let list = items;
        if (priorityFilter) list = list.filter((i) => i.priority === priorityFilter);
        return list;
    }, [items, priorityFilter]);

    const sorted = useMemo(() => {
        const copy = [...filtered];
        copy.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case "display_id":
                    cmp = (a.display_id || 0) - (b.display_id || 0);
                    break;
                case "priority":
                    cmp = priorityRank(a.priority) - priorityRank(b.priority);
                    break;
                case "project": {
                    const pa = normalizeProject(a.project)?.name || "";
                    const pb = normalizeProject(b.project)?.name || "";
                    cmp = pa.localeCompare(pb);
                    break;
                }
                case "status":
                    cmp = a.status.localeCompare(b.status);
                    break;
                case "updated_at":
                    cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                    break;
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
        return copy;
    }, [filtered, sortKey, sortDir]);

    const selectedItem = useMemo(() => sorted.find((i) => i.id === selectedId) || null, [sorted, selectedId]);

    const toggleSort = useCallback((key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir(key === "updated_at" ? "desc" : "asc");
        }
    }, [sortKey]);

    function setFilter(key: string, value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`/backlog?${params.toString()}`);
    }

    function handleItemUpdated(updated: BacklogItem) {
        setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
    }

    if (error) {
        return (
            <div className="p-8 lg:p-12">
                <EmptyState message="Backlog unavailable" description={error} />
            </div>
        );
    }

    return (
        <div className="flex h-full">
            <div className="flex-1 min-w-0 p-8 lg:p-12 min-h-full bg-zed-main">
                <div className="max-w-6xl mx-auto">
                    {/* Header toolbar */}
                    <header className="mb-6 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Backlog</h2>
                            <span className="text-xs font-mono text-text-muted bg-zed-active px-1.5 py-0.5 rounded">
                                {filtered.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {/* Status filters */}
                            {STATUS_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFilter("status", opt.value)}
                                    className={cn(
                                        "px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded transition-colors",
                                        statusFilter === opt.value
                                            ? "bg-zed-active text-text-primary border-zed-border"
                                            : "text-text-muted border-transparent hover:border-zed-border/50"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <div className="w-px h-4 bg-zed-border/50 mx-1" />
                            {/* Priority filters */}
                            {PRIORITY_OPTIONS.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setFilter("priority", priorityFilter === p ? "" : p)}
                                    className={cn(
                                        "px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded transition-colors",
                                        priorityFilter === p
                                            ? "bg-zed-active text-text-primary border-zed-border"
                                            : "text-text-muted border-transparent hover:border-zed-border/50"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </header>

                    {loading ? (
                        <div className="h-40 flex items-center justify-center text-xs text-text-muted animate-pulse">Loading...</div>
                    ) : sorted.length === 0 ? (
                        <EmptyState message="No backlog items" description="Try another filter or sync additional projects." />
                    ) : (
                        <div className="rounded border border-zed-border overflow-hidden bg-zed-sidebar/20">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-zed-header/30 border-b border-zed-border">
                                    <tr>
                                        <SortHeader label="ID" sortKey="display_id" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-20" />
                                        <th className="px-4 py-2.5 text-text-muted uppercase tracking-widest text-[10px] font-bold">Item</th>
                                        <SortHeader label="Project" sortKey="project" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                                        <SortHeader label="Priority" sortKey="priority" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-24" />
                                        <SortHeader label="Status" sortKey="status" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-28" />
                                        <SortHeader label="Updated" sortKey="updated_at" currentKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-24" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((item) => {
                                        const project = normalizeProject(item.project);
                                        const isSelected = item.id === selectedId;
                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => setSelectedId(isSelected ? null : item.id)}
                                                className={cn(
                                                    "border-b border-zed-border/50 last:border-b-0 cursor-pointer transition-colors",
                                                    isSelected
                                                        ? "bg-zed-active border-l-2 border-l-primary"
                                                        : "hover:bg-zed-hover/50"
                                                )}
                                            >
                                                <td className="px-4 py-2.5 font-mono text-[11px] text-text-secondary">{displayBacklogId(item)}</td>
                                                <td className="px-4 py-2.5 text-text-primary truncate max-w-[300px]">{item.title}</td>
                                                <td className="px-4 py-2.5">
                                                    {project ? (
                                                        <Link
                                                            href={`/projects/${item.project_id}?from=backlog`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-text-muted hover:text-text-primary transition-colors"
                                                        >
                                                            {project.name}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-text-muted">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {item.priority ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <span className={cn("w-2 h-2 rounded-full", priorityDot[item.priority] || "bg-text-muted")} />
                                                            <span className="text-text-secondary text-[11px]">{item.priority}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-text-muted">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-[10px] font-medium text-text-secondary bg-zed-active/60 px-1.5 py-0.5 rounded lowercase">
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-text-muted">{formatRelativeTime(item.updated_at)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail panel */}
            {selectedItem && (
                <BacklogDetailPanel
                    item={selectedItem}
                    projectName={normalizeProject(selectedItem.project)?.name}
                    onClose={() => setSelectedId(null)}
                    onItemUpdated={handleItemUpdated}
                />
            )}
        </div>
    );
}

function SortHeader({
    label,
    sortKey,
    currentKey,
    dir,
    onSort,
    className,
}: {
    label: string;
    sortKey: SortKey;
    currentKey: SortKey;
    dir: SortDir;
    onSort: (key: SortKey) => void;
    className?: string;
}) {
    const active = currentKey === sortKey;
    return (
        <th className={cn("px-4 py-2.5", className)}>
            <button
                onClick={() => onSort(sortKey)}
                className="flex items-center gap-1 text-text-muted uppercase tracking-widest text-[10px] font-bold hover:text-text-secondary transition-colors"
            >
                {label}
                {active && (
                    dir === "asc"
                        ? <IconChevronUp className="w-3 h-3" />
                        : <IconChevronDown className="w-3 h-3" />
                )}
            </button>
        </th>
    );
}
