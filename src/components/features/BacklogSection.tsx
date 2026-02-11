"use client";

import { useState, useEffect } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { PriorityChip } from "@/components/ui/PriorityChip";
import type { BacklogItem } from "@/lib/types/api";

interface BacklogSectionProps {
    projectId: string;
}

export function BacklogSection({ projectId }: BacklogSectionProps) {
    const [expanded, setExpanded] = useState(false);
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

    const activeItems = items.filter((i) => i.status !== "promoted" && i.status !== "archived");

    return (
        <section>
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-3 mb-4 px-2 w-full"
            >
                <IconChevronDown className={cn(
                    "w-3.5 h-3.5 text-text-muted transition-transform",
                    !expanded && "-rotate-90"
                )} />
                <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase">Backlog</h3>
                <div className="h-[1px] flex-1 bg-zed-border/50" />
            </button>

            {expanded && (
                <div>
                    {activeItems.length === 0 ? (
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
                    )}
                </div>
            )}
        </section>
    );
}
