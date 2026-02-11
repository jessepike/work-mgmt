"use client";

import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TaskItemProps {
    title: string;
    project: string;
    priority: "P1" | "P2" | "P3" | "P4";
    status: "pending" | "completed" | "blocked" | "in_progress";
    dueDate?: string;
}

const priorityColors = {
    P1: "text-status-red",
    P2: "text-status-yellow",
    P3: "text-primary",
    P4: "text-text-muted",
};

const statusColors = {
    pending: "bg-text-muted",
    completed: "bg-status-green",
    blocked: "bg-status-red",
    in_progress: "bg-status-yellow",
};

export function TaskItem({ title, project, priority, status }: TaskItemProps) {
    return (
        <div className="flex items-center group h-10 px-6 hover:bg-zed-hover transition-colors cursor-pointer border-b border-zed-border/30 last:border-none">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <button className="flex-shrink-0 text-text-muted hover:text-text-secondary transition-colors">
                    {status === "completed" ? (
                        <IconCircleCheckFilled className="w-4 h-4 text-status-green" />
                    ) : (
                        <IconCircle className="w-4 h-4" />
                    )}
                </button>

                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusColors[status])} />

                <span className={cn(
                    "text-sm truncate flex-1",
                    status === "completed" ? "text-text-muted line-through" : "text-text-primary"
                )}>
                    {title}
                </span>
            </div>

            <div className="flex items-center gap-6 ml-4">
                <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase truncate max-w-[120px]">
                    {project}
                </span>
                <span className={cn("text-[10px] font-bold w-6 text-right", priorityColors[priority])}>
                    {priority}
                </span>
            </div>
        </div>
    );
}
