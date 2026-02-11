"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
    id?: string;
    name: string;
    category: string;
    tasksCount: number;
    blockedCount: number;
    overdueCount: number;
    backlogCount: number;
    p1Count: number;
    currentFocus: string;
    stage: string;
    lastActivityAt: string | null;
    health: "green" | "yellow" | "red";
    projectType: "connected" | "native";
    connectorStatus?: "active" | "paused" | "error";
    lastSyncAt?: string | null;
}

const healthColors = {
    green: "bg-status-green",
    yellow: "bg-status-yellow",
    red: "bg-status-red",
};

export function ProjectCard({
    id,
    name,
    category,
    tasksCount,
    blockedCount,
    overdueCount,
    backlogCount,
    p1Count,
    currentFocus,
    stage,
    lastActivityAt,
    health,
    projectType,
    connectorStatus,
    lastSyncAt
}: ProjectCardProps) {
    const Wrapper = id ? Link : "div";
    const wrapperProps = id ? { href: `/projects/${id}` } : {};
    const stageLabel = stage.trim();
    const syncLabel = formatRelativeTime(lastSyncAt);
    const activityLabel = formatRelativeTime(lastActivityAt);
    const syncClass = connectorStatus === "error"
        ? "text-status-red"
        : connectorStatus === "paused"
            ? "text-status-yellow"
            : "text-text-muted";

    return (
        <Wrapper {...wrapperProps as any} className="bg-zed-sidebar border border-zed-border rounded-md hover:border-zed-border/60 hover:bg-zed-hover group transition-all flex flex-col h-fit overflow-hidden cursor-pointer shadow-sm hover:shadow-md">
            <div className="p-5 flex-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className={cn("w-2 h-2 rounded-full", healthColors[health])} />
                        <h3 className="font-semibold text-text-primary text-sm tracking-tight group-hover:text-primary transition-colors">{name}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{projectType}</span>
                </div>

                <div className="flex items-center gap-2 mb-5">
                    <span className="bg-zed-header px-2 py-0.5 rounded text-[10px] text-text-secondary font-bold tracking-tight border border-zed-border uppercase">
                        {category}
                    </span>
                    <span className="bg-zed-main px-2 py-0.5 rounded text-[10px] text-text-muted font-bold tracking-tight border border-zed-border uppercase">
                        {stageLabel}
                    </span>
                    <div className="flex items-center gap-2 transition-opacity">
                        <span className="text-[10px] font-bold text-text-muted">{tasksCount} open</span>
                        <span className="w-1 h-1 rounded-full bg-text-muted opacity-30"></span>
                        <span className="text-[10px] font-bold text-text-muted">{backlogCount} backlog</span>
                        {p1Count > 0 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-text-muted opacity-30"></span>
                                <span className="text-[10px] font-bold text-status-red">{p1Count} P1</span>
                            </>
                        )}
                        {blockedCount > 0 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-text-muted opacity-30"></span>
                                <span className="text-[10px] font-bold text-status-red">{blockedCount} blocked</span>
                            </>
                        )}
                        {overdueCount > 0 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-text-muted opacity-30"></span>
                                <span className="text-[10px] font-bold text-status-red">{overdueCount} overdue</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted tracking-wider uppercase">Focus</span>
                    <p className="text-xs text-text-primary font-medium line-clamp-1">{currentFocus}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-zed-border/40 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Updated {activityLabel}</span>
                    {projectType === "connected" && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${syncClass}`}>
                            Sync {syncLabel}
                        </span>
                    )}
                </div>
            </div>
        </Wrapper>
    );
}

function formatRelativeTime(value: string | null | undefined): string {
    if (!value) return "never";
    const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
