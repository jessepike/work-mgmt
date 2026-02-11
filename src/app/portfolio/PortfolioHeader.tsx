"use client";

import { FilterBar } from "@/components/ui/FilterBar";
import { IconPlus } from "@tabler/icons-react";

interface PortfolioHeaderProps {
    categoryOptions: Array<{ label: string; value: string }>;
    presetOptions: Array<{ label: string; value: string }>;
}

export function PortfolioHeader({ categoryOptions, presetOptions }: PortfolioHeaderProps) {
    return (
        <header className="border-b border-zed-border bg-zed-header/30 backdrop-blur-md sticky top-0 z-20">
            <div className="px-8 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FilterBar paramName="preset" options={presetOptions} />
                    <FilterBar paramName="category" options={categoryOptions} />
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 transition-all shadow-sm shadow-primary/20">
                        <IconPlus className="w-3.5 h-3.5" />
                        New Project
                    </button>
                </div>
            </div>
            <div className="px-8 pb-3">
                <details className="text-[10px] text-text-muted">
                    <summary className="cursor-pointer uppercase tracking-widest font-bold">Card Legend</summary>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-text-secondary">
                        <div><span className="font-bold uppercase text-text-muted">Category:</span> Project domain label (`DEVELOPMENT`, `INFRASTRUCTURE`, `CORE`, `PERSONAL`).</div>
                        <div><span className="font-bold uppercase text-text-muted">Stage:</span> Parsed from `status.md` current stage/status; shows `Stage Not Set` when unavailable.</div>
                        <div><span className="font-bold uppercase text-text-muted">Open:</span> Active tasks (`pending`, `in_progress`, `blocked`).</div>
                        <div><span className="font-bold uppercase text-text-muted">Backlog:</span> Unpromoted backlog items (`captured`, `triaged`, `prioritized`).</div>
                        <div><span className="font-bold uppercase text-text-muted">P1:</span> High-priority backlog count.</div>
                        <div><span className="font-bold uppercase text-text-muted">Sync:</span> Last connector sync freshness and connector status.</div>
                    </div>
                </details>
            </div>
        </header>
    );
}
