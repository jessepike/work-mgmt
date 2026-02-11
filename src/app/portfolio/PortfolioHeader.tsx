"use client";

import { FilterBar } from "@/components/ui/FilterBar";
import { IconPlus } from "@tabler/icons-react";

interface PortfolioHeaderProps {
    categoryOptions: Array<{ label: string; value: string }>;
}

export function PortfolioHeader({ categoryOptions }: PortfolioHeaderProps) {
    return (
        <header className="px-8 h-14 flex items-center justify-between border-b border-zed-border bg-zed-header/30 backdrop-blur-md sticky top-0 z-20">
            <FilterBar paramName="category" options={categoryOptions} />
            <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 transition-all shadow-sm shadow-primary/20">
                    <IconPlus className="w-3.5 h-3.5" />
                    New Project
                </button>
            </div>
        </header>
    );
}
