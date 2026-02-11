"use client";

import { IconDots, IconPlus, IconCheck } from "@tabler/icons-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface KanbanTask {
    id: string;
    title: string;
    project: string;
    health?: string;
    status?: string;
}

const columns: { id: string; title: string; count: number; tasks: KanbanTask[] }[] = [
    {
        id: "pending",
        title: "Pending",
        count: 5,
        tasks: [
            { id: "k1", title: "Plugin manifest spec", project: "ADF", health: "red" },
            { id: "k2", title: "Client pres prep", project: "ACME", health: "yellow" },
            { id: "k3", title: "KB search ranking", project: "KB", health: "primary" },
            { id: "k4", title: "Integration test suite", project: "ADF", health: "yellow" },
            { id: "k5", title: "Standing desk research", project: "PERSONAL", health: "primary" },
        ]
    },
    {
        id: "in_progress",
        title: "In Progress",
        count: 4,
        tasks: [
            { id: "k6", title: "Auth system migration", project: "SAAS", health: "red" },
            { id: "k7", title: "Review design brief", project: "ACME", health: "red" },
            { id: "k8", title: "Q1 delivery sprint", project: "ACME", health: "yellow" },
            { id: "k9", title: "Budget spreadsheet", project: "PERSONAL", health: "primary" },
        ]
    },
    {
        id: "blocked",
        title: "Blocked",
        count: 3,
        tasks: [
            { id: "k10", title: "Dep conflicts", project: "ADF", health: "red" },
            { id: "k11", title: "Board review prep", project: "BOARD", health: "yellow" },
            { id: "k12", title: "Plugin API extraction", project: "SAAS", health: "red" },
        ]
    },
    {
        id: "done",
        title: "Done",
        count: 6,
        tasks: [
            { id: "k13", title: "Extract plugin disk", project: "ADF", status: "done" },
            { id: "k14", title: "Migrate hooks", project: "ADF", status: "done" },
            { id: "k15", title: "Add plugin docs", project: "ADF", status: "done" },
            { id: "k16", title: "Update docs", project: "ADF", status: "done" },
            { id: "k17", title: "Gather W-2 forms", project: "PERSONAL", status: "done" },
            { id: "k18", title: "Fix kitchen faucet", project: "PERSONAL", status: "done" },
        ]
    }
];

const healthColors: Record<string, string> = {
    red: "bg-status-red",
    yellow: "bg-status-yellow",
    primary: "bg-primary",
    done: "bg-status-green",
};

export default function KanbanPage() {
    return (
        <div className="flex flex-col h-full bg-zed-main overflow-hidden">
            <header className="px-8 h-14 flex items-center justify-between border-b border-zed-border bg-zed-header/30 backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <nav className="flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50">
                        <button className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase bg-zed-active text-primary rounded-sm shadow-sm">All Projects</button>
                        <button className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-secondary transition-colors">By Priority</button>
                    </nav>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-primary text-white h-8 px-3 rounded hover:opacity-90 transition-all">
                    <IconPlus className="w-3.5 h-3.5" />
                    Add Task
                </button>
            </header>

            <div className="flex-1 overflow-x-auto p-8 custom-scrollbar">
                <div className="flex gap-6 h-full min-w-fit">
                    {columns.map((column) => (
                        <div key={column.id} className="w-[300px] flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <h3 className={cn(
                                        "text-[10px] font-bold tracking-widest uppercase",
                                        column.id === "blocked" ? "text-status-red" : "text-text-secondary"
                                    )}>
                                        {column.title}
                                    </h3>
                                    <span className="text-[10px] font-mono text-text-muted font-bold">{column.count}</span>
                                </div>
                                <IconDots className="w-4 h-4 text-text-muted cursor-pointer hover:text-text-secondary" />
                            </div>

                            <div className="flex-1 flex flex-col gap-3 min-h-0">
                                {column.tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className={cn(
                                            "bg-zed-sidebar border border-zed-border rounded p-4 group cursor-pointer hover:border-zed-border/60 transition-all",
                                            column.id === "blocked" && "border-l-2 border-l-status-red"
                                        )}
                                    >
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-bold text-text-muted tracking-widest uppercase">{task.project}</span>
                                                {column.id === "done" && <IconCheck className="w-3.5 h-3.5 text-status-green" />}
                                            </div>
                                            <h4 className={cn(
                                                "text-xs font-medium leading-relaxed",
                                                column.id === "done" ? "text-text-muted line-through" : "text-text-primary"
                                            )}>
                                                {task.title}
                                            </h4>
                                            <div className="flex justify-end gap-2">
                                                {column.id !== "done" && (
                                                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1", healthColors[task.health || "primary"])} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button className="flex items-center justify-center h-10 border border-dashed border-zed-border rounded-md text-text-muted hover:text-text-secondary hover:border-zed-border/60 transition-all group">
                                    <IconPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
