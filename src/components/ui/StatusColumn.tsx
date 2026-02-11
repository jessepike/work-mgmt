"use client";

import { cn } from "@/lib/utils";
import { IconDots } from "@tabler/icons-react";

interface StatusColumnProps {
    title: string;
    count: number;
    status: string;
    children: React.ReactNode;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
}

export function StatusColumn({ title, count, status, children, onDragOver, onDrop }: StatusColumnProps) {
    return (
        <div
            className="w-[300px] flex flex-col gap-4"
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <h3 className={cn(
                        "text-[10px] font-bold tracking-widest uppercase",
                        status === "blocked" ? "text-status-red" :
                        status === "done" ? "text-status-green" :
                        status === "in_progress" ? "text-status-yellow" :
                        "text-text-secondary"
                    )}>
                        {title}
                    </h3>
                    <span className="text-[10px] font-mono text-text-muted font-bold">{count}</span>
                </div>
                <IconDots className="w-4 h-4 text-text-muted cursor-pointer hover:text-text-secondary" />
            </div>

            <div className="flex-1 flex flex-col gap-3 min-h-0">
                {children}
            </div>
        </div>
    );
}
