"use client";

import { useState } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { IconPlus } from "@tabler/icons-react";
import { TaskCreateModal } from "@/components/features/TaskCreateModal";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface PortfolioHeaderProps {
    categoryOptions: Array<{ label: string; value: string }>;
    presetOptions: Array<{ label: string; value: string }>;
    trustOptions: Array<{ label: string; value: string }>;
    projectOptions: Array<{ id: string; name: string }>;
    trustHighlights?: {
        at_risk_projects: number;
        unhealthy_projects: number;
        sync_red_projects: number;
        sync_yellow_projects: number;
        needs_attention: boolean;
    };
}

export function PortfolioHeader({ categoryOptions, presetOptions, trustOptions, projectOptions, trustHighlights }: PortfolioHeaderProps) {
    const [newTaskOpen, setNewTaskOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function setTrustFilter(value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set("trust", value);
        else params.delete("trust");
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <header className="border-b border-zed-border bg-zed-header/30 backdrop-blur-md sticky top-0 z-20">
            <div className="px-8 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FilterBar paramName="preset" options={presetOptions} />
                    <FilterBar paramName="category" options={categoryOptions} />
                    <FilterBar paramName="trust" options={trustOptions} />
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setNewTaskOpen(true)}
                        className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 transition-all shadow-sm shadow-primary/20"
                    >
                        <IconPlus className="w-3.5 h-3.5" />
                        New Task
                    </button>
                </div>
            </div>
            <div className="px-8 pb-3">
                {trustHighlights && (
                    <div className="mb-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-status-red">Health Red {trustHighlights.unhealthy_projects}</span>
                        <span className="text-status-yellow">Health Yellow {trustHighlights.at_risk_projects}</span>
                        <button
                            onClick={() => setTrustFilter("red")}
                            className="text-status-red hover:underline decoration-dotted"
                        >
                            Sync Red {trustHighlights.sync_red_projects}
                        </button>
                        <button
                            onClick={() => setTrustFilter("yellow")}
                            className="text-status-yellow hover:underline decoration-dotted"
                        >
                            Sync Yellow {trustHighlights.sync_yellow_projects}
                        </button>
                    </div>
                )}
                <details className="text-[10px] text-text-muted">
                    <summary className="cursor-pointer uppercase tracking-widest font-bold">Card Legend</summary>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-text-secondary">
                        <div><span className="font-bold uppercase text-text-muted">Category:</span> Project domain label (`DEVELOPMENT`, `INFRASTRUCTURE`, `CORE`, `PERSONAL`).</div>
                        <div><span className="font-bold uppercase text-text-muted">Stage:</span> Parsed from `status.md` current stage/status; shows `Stage Not Set` when unavailable.</div>
                        <div><span className="font-bold uppercase text-text-muted">Open:</span> Active tasks (`pending`, `in_progress`, `blocked`).</div>
                        <div><span className="font-bold uppercase text-text-muted">Backlog:</span> Unpromoted backlog items (`captured`, `triaged`, `prioritized`).</div>
                        <div><span className="font-bold uppercase text-text-muted">P1:</span> High-priority backlog count.</div>
                        <div><span className="font-bold uppercase text-text-muted">Sync:</span> Last connector sync freshness and connector status.</div>
                        <div><span className="font-bold uppercase text-text-muted">Stale:</span> No project activity for 7+ days.</div>
                    </div>
                </details>
            </div>

            <TaskCreateModal
                open={newTaskOpen}
                onClose={() => setNewTaskOpen(false)}
                projects={projectOptions}
                onCreated={() => router.refresh()}
            />
        </header>
    );
}
