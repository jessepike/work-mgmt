"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/Toast";

interface TaskItemProps {
    title: string;
    project: string;
    priority: "P1" | "P2" | "P3";
    status: "pending" | "done" | "blocked" | "in_progress";
    dueDate?: string;
    href?: string;
    taskId?: string;
    isReadOnly?: boolean;
}

const priorityColors = {
    P1: "text-status-red",
    P2: "text-status-yellow",
    P3: "text-primary",
};

const statusColors = {
    pending: "bg-text-muted",
    done: "bg-status-green",
    blocked: "bg-status-red",
    in_progress: "bg-status-yellow",
};

export function TaskItem({ title, project, priority, status, href, taskId, isReadOnly = false }: TaskItemProps) {
    const [localStatus, setLocalStatus] = useState(status);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setLocalStatus(status);
    }, [status]);

    async function toggleComplete(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (!taskId || busy || isReadOnly) return;
        const next = localStatus === "done" ? "pending" : "done";
        setLocalStatus(next);
        setBusy(true);
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: next }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || "Failed to update task");
            setLocalStatus(body.data.status);
            showToast("success", next === "done" ? "Task completed" : "Task reopened");
        } catch (error) {
            setLocalStatus(status);
            showToast("error", error instanceof Error ? error.message : "Failed to update task");
        } finally {
            setBusy(false);
        }
    }

    const content = (
        <>
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <button
                    onClick={toggleComplete}
                    disabled={!taskId || busy || isReadOnly}
                    className="flex-shrink-0 text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
                >
                    {localStatus === "done" ? (
                        <IconCircleCheckFilled className="w-4 h-4 text-status-green" />
                    ) : (
                        <IconCircle className="w-4 h-4" />
                    )}
                </button>

                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusColors[localStatus])} />

                <span className={cn(
                    "text-sm truncate flex-1",
                    localStatus === "done" ? "text-text-muted line-through" : "text-text-primary"
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
        </>
    );

    if (href) {
        return (
            <Link href={href} className="flex items-center group h-10 px-6 hover:bg-zed-hover transition-colors cursor-pointer border-b border-zed-border/30 last:border-none">
                {content}
            </Link>
        );
    }

    return (
        <div className="flex items-center group h-10 px-6 hover:bg-zed-hover transition-colors cursor-pointer border-b border-zed-border/30 last:border-none">
            {content}
        </div>
    );
}
