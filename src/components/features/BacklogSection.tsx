"use client";

import { useState, useEffect } from "react";
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
                                <div key={item.id} className="flex items-center h-10 px-4 hover:bg-zed-hover rounded transition-colors">
                                    <span className="text-xs text-text-secondary flex-1 truncate">{item.title}</span>
                                    <div className="flex items-center gap-3 ml-4">
                                        <PriorityChip priority={item.priority} />
                                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-tight">
                                            {item.status}
                                        </span>
                                    </div>
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
