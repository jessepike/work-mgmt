"use client";

import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { HealthBadge } from "./HealthBadge";
import type { ProjectHealth } from "@/lib/types/api";

interface TaskCardProps {
    id: string;
    title: string;
    projectName: string;
    health?: ProjectHealth;
    status: string;
    isSynced?: boolean;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onClick?: () => void;
}

export function TaskCard({ id, title, projectName, health, status, isSynced, draggable, onDragStart, onClick }: TaskCardProps) {
    const isDone = status === "done";
    const isBlocked = status === "blocked";

    return (
        <div
            draggable={draggable && !isSynced}
            onDragStart={onDragStart}
            onClick={onClick}
            className={cn(
                "bg-zed-sidebar border border-zed-border rounded p-4 group cursor-pointer hover:border-zed-border/60 transition-all",
                isBlocked && "border-l-2 border-l-status-red",
                draggable && !isSynced && "cursor-grab active:cursor-grabbing",
                isSynced && "opacity-75"
            )}
        >
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-text-muted tracking-widest uppercase">{projectName}</span>
                    <div className="flex items-center gap-2">
                        {isSynced && (
                            <span className="text-[8px] font-bold text-text-muted/50 uppercase">SYNCED</span>
                        )}
                        {isDone && <IconCheck className="w-3.5 h-3.5 text-status-green" />}
                    </div>
                </div>
                <h4 className={cn(
                    "text-xs font-medium leading-relaxed",
                    isDone ? "text-text-muted line-through" : "text-text-primary"
                )}>
                    {title}
                </h4>
                {!isDone && health && (
                    <div className="flex justify-end">
                        <HealthBadge health={health} size="sm" />
                    </div>
                )}
            </div>
        </div>
    );
}
