"use client";

import Link from "next/link";
import { IconRefresh } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
    id?: string;
    name: string;
    category: string;
    tasksCount: number;
    blockedCount: number;
    currentFocus: string;
    progress: number;
    health: "green" | "yellow" | "red";
    syncing?: boolean;
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
    currentFocus,
    progress,
    health,
    syncing
}: ProjectCardProps) {
    const Wrapper = id ? Link : "div";
    const wrapperProps = id ? { href: `/projects/${id}` } : {};

    return (
        <Wrapper {...wrapperProps as any} className="bg-zed-sidebar border border-zed-border rounded-md hover:border-zed-border/60 hover:bg-zed-hover group transition-all flex flex-col h-fit overflow-hidden cursor-pointer shadow-sm hover:shadow-md">
            <div className="p-5 flex-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className={cn("w-2 h-2 rounded-full", healthColors[health])} />
                        <h3 className="font-semibold text-text-primary text-sm tracking-tight group-hover:text-primary transition-colors">{name}</h3>
                    </div>
                    {syncing && <IconRefresh className="w-3.5 h-3.5 text-text-muted animate-spin" />}
                </div>

                <div className="flex items-center gap-2 mb-5">
                    <span className="bg-zed-header px-2 py-0.5 rounded text-[10px] text-text-secondary font-bold tracking-tight border border-zed-border uppercase">
                        {category}
                    </span>
                    <div className="flex items-center gap-2 transition-opacity">
                        <span className="text-[10px] font-bold text-text-muted">{tasksCount} tasks</span>
                        {blockedCount > 0 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-text-muted opacity-30"></span>
                                <span className="text-[10px] font-bold text-status-red">{blockedCount} blocked</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted tracking-wider uppercase">Focus</span>
                    <p className="text-xs text-text-primary font-medium line-clamp-1">{currentFocus}</p>
                </div>
            </div>

            <div className="mt-auto">
                <div className="flex justify-between px-5 mb-1.5 items-end">
                    <span className="text-[10px] font-bold text-text-muted font-mono">{progress}%</span>
                </div>
                <div className="h-[3px] w-full bg-zed-main/50">
                    <div
                        className="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_8px_rgba(91,148,205,0.4)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </Wrapper>
    );
}
