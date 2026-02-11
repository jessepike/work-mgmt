"use client";

import { IconLink, IconPlus, IconDots, IconCircle, IconCircleCheckFilled, IconFlag, IconMessageCircle, IconSend } from "@tabler/icons-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const phases = [
    {
        id: "p1",
        title: "Phase 1: Core Refactor",
        status: "4 / 6 Completed",
        tasks: [
            { id: "t1", title: "Initialize atomic design patterns", date: "Jul 12", status: "done" },
            { id: "t2", title: "Setup unit testing architecture", date: "Jul 14", status: "done" },
            { id: "t3", title: "Resolve dependency conflicts", date: "Today", status: "blocked", priority: "P1" },
            { id: "t4", title: "Optimize hydration logic", date: "Jul 18", status: "pending" },
        ]
    },
    {
        id: "p2",
        title: "Phase 2: Plugin System",
        status: "0 / 4 Completed",
        tasks: [
            { id: "t5", title: "Define plugin manifest schema", date: "Aug 01", status: "pending" },
            { id: "t6", title: "Implement lifecycle hooks", date: "Aug 05", status: "pending" },
        ]
    }
];

export default function ProjectDetailPage() {
    return (
        <div className="flex h-full bg-zed-main overflow-hidden">
            {/* Left Pane: Task List */}
            <div className="flex-1 flex flex-col border-r border-zed-border min-w-0">
                <header className="px-8 h-14 flex items-center justify-between border-b border-zed-border bg-zed-header/30">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-status-yellow" />
                        <h2 className="text-sm font-semibold text-text-primary">ADF Framework</h2>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted tracking-tight ml-2 px-2 py-0.5 border border-zed-border rounded">
                            <IconLink className="w-3 h-3" />
                            CONNECTED
                        </div>
                        <span className="text-[10px] text-text-muted ml-2">Last synced: 2 hours ago</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="px-3 py-1.5 bg-zed-active border border-zed-border text-[10px] font-bold tracking-widest uppercase hover:bg-zed-hover transition-colors rounded">New Task</button>
                        <IconDots className="w-4 h-4 text-text-muted cursor-pointer" />
                    </div>
                </header>

                <div className="p-8 flex items-center gap-6 border-b border-zed-border bg-zed-sidebar/20">
                    <div className="flex items-center gap-2 px-2 py-1 bg-status-yellow/10 border border-status-yellow/20 rounded text-[9px] font-bold text-status-yellow uppercase tracking-tight">DEV CHIP</div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-text-muted tracking-widest uppercase">
                        <span>12 tasks</span>
                        <span className="text-status-red">2 blocked</span>
                        <span>45% complete</span>
                    </div>
                    <div className="h-1.5 w-32 bg-zed-border rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full bg-status-yellow w-[45%]" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12">
                    {phases.map((phase) => (
                        <section key={phase.id}>
                            <div className="flex items-center justify-between mb-6 px-2">
                                <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">{phase.title}</h3>
                                <span className="text-[10px] font-mono text-text-muted font-bold">{phase.status}</span>
                            </div>
                            <div className="space-y-1">
                                {phase.tasks.map((task) => (
                                    <div key={task.id} className="flex items-center h-10 px-4 hover:bg-zed-hover rounded group transition-colors cursor-pointer">
                                        <button className="mr-4 text-text-muted group-hover:text-text-secondary transition-colors">
                                            {task.status === "done" ? <IconCircleCheckFilled className="w-4 h-4 text-status-green" /> : <IconCircle className="w-4 h-4" />}
                                        </button>
                                        <span className={cn(
                                            "text-xs flex-1 truncate",
                                            task.status === "done" ? "text-text-muted line-through" : "text-text-primary"
                                        )}>
                                            {task.title}
                                        </span>
                                        <div className="flex items-center gap-6 ml-4">
                                            {task.status === "blocked" && <span className="text-[9px] font-bold text-status-red uppercase tracking-tight">BLOCKED</span>}
                                            <span className="text-[9px] font-mono text-text-muted font-bold min-w-[40px] text-right">{task.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}

                    <section>
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase">Backlog</h3>
                            <div className="h-[1px] flex-1 bg-zed-border/50"></div>
                        </div>
                        <div className="h-10 px-4 flex items-center text-xs text-text-muted italic opacity-50">
                            No pending backlog items...
                        </div>
                    </section>
                </div>
            </div>

            {/* Right Pane: Details */}
            <div className="w-[360px] flex-shrink-0 flex flex-col bg-zed-sidebar/30">
                <header className="px-6 h-14 flex items-center border-b border-zed-border text-[9px] font-bold tracking-widest text-text-muted uppercase">
                    ADF Framework / Phase 1
                </header>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                    <h1 className="text-xl font-semibold mb-4 text-text-primary tracking-tight">Resolve dependency conflicts</h1>

                    <div className="flex gap-2 mb-10">
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-status-red/10 border border-status-red/20 text-status-red text-[9px] font-bold rounded uppercase tracking-tight">
                            <IconFlag className="w-3 h-3" /> P1 PROIRITY
                        </span>
                        <span className="px-2 py-1 bg-status-red/10 border border-status-red/20 text-status-red text-[9px] font-bold rounded uppercase tracking-tight">BLOCKED</span>
                    </div>

                    <div className="space-y-8">
                        <section>
                            <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Description</h4>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                The current version of <code className="bg-zed-active px-1 py-0.5 rounded font-mono text-primary text-[11px]">@adf/core</code> is conflicting with the peer dependencies in the new refactor branch. Need to isolate the workspace packages and align versions.
                            </p>
                        </section>

                        <section>
                            <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-3">Properties</h4>
                            <div className="border border-zed-border rounded divide-y divide-zed-border">
                                {[
                                    { label: "Owner", value: "@marcus_dev" },
                                    { label: "Due Date", value: "Jul 18, 2024" },
                                    { label: "Branch", value: "fix/dep-conflicts", isLink: true },
                                ].map((prop) => (
                                    <div key={prop.label} className="flex items-center text-xs h-9 px-3">
                                        <span className="w-24 text-text-secondary">{prop.label}</span>
                                        <span className={cn("flex-1 font-medium", prop.isLink ? "text-primary hover:underline cursor-pointer" : "text-text-primary")}>
                                            {prop.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-4 flex items-center gap-2">
                                <IconMessageCircle className="w-3.5 h-3.5" /> Activity
                            </h4>
                            <div className="space-y-6">
                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-status-red/20 border border-status-red/30 flex items-center justify-center text-[9px] font-extrabold text-status-red">M</div>
                                    <div className="flex-1">
                                        <p className="text-xs text-text-secondary leading-tight"><span className="text-text-primary font-bold">Marcus</span> updated status to <span className="text-status-red font-bold">Blocked</span></p>
                                        <p className="text-[10px] text-text-muted mt-1">2 hours ago</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-extrabold text-primary">JD</div>
                                    <div className="flex-1">
                                        <p className="text-xs text-text-secondary leading-tight"><span className="text-text-primary font-bold">John Dev</span> commented:</p>
                                        <div className="mt-2 p-3 bg-zed-active/50 border border-zed-border rounded text-xs text-text-primary italic">
                                            "Should we try pnpm overrides?"
                                        </div>
                                        <p className="text-[10px] text-text-muted mt-1">4 hours ago</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="p-4 border-t border-zed-border bg-zed-header/20">
                    <div className="relative">
                        <input
                            className="w-full bg-zed-active border border-zed-border rounded-md px-4 py-2 text-xs text-text-primary placeholder-text-muted focus:ring-1 focus:ring-primary focus:border-primary transition-all pr-10"
                            placeholder="Add a comment..."
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors">
                            <IconSend className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
