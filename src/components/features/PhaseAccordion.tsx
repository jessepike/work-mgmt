"use client";

import { useState } from "react";
import { IconChevronDown, IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { PriorityChip } from "@/components/ui/PriorityChip";
import type { Phase, Task, PriorityLevel } from "@/lib/types/api";

interface PhaseAccordionProps {
    phase: Phase;
    tasks: Task[];
    onTaskClick?: (task: Task) => void;
}

export function PhaseAccordion({ phase, tasks, onTaskClick }: PhaseAccordionProps) {
    const [expanded, setExpanded] = useState(phase.status === "active" || phase.status === "pending");
    const doneCount = tasks.filter((t) => t.status === "done").length;

    return (
        <section>
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between w-full mb-4 px-2 group"
            >
                <div className="flex items-center gap-2">
                    <IconChevronDown className={cn(
                        "w-3.5 h-3.5 text-text-muted transition-transform",
                        !expanded && "-rotate-90"
                    )} />
                    <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">
                        {phase.name}
                    </h3>
                </div>
                <span className="text-[10px] font-mono text-text-muted font-bold">
                    {doneCount} / {tasks.length} Completed
                </span>
            </button>

            {expanded && (
                <div className="space-y-1">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => onTaskClick?.(task)}
                            className="flex items-center h-10 px-4 hover:bg-zed-hover rounded group transition-colors cursor-pointer"
                        >
                            <span className="mr-4 text-text-muted">
                                {task.status === "done" ? (
                                    <IconCircleCheckFilled className="w-4 h-4 text-status-green" />
                                ) : (
                                    <IconCircle className="w-4 h-4" />
                                )}
                            </span>
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
                                    <span className="text-[9px] font-bold text-text-muted/50 uppercase tracking-tight">SYNCED</span>
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
            )}
        </section>
    );
}
