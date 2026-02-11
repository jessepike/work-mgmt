"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface FilterOption {
    label: string;
    value: string;
}

interface FilterBarProps {
    paramName: string;
    options: FilterOption[];
    className?: string;
}

export function FilterBar({ paramName, options, className }: FilterBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const current = searchParams.get(paramName) || "";

    function setFilter(value: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(paramName, value);
        } else {
            params.delete(paramName);
        }
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <nav className={cn("flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50", className)}>
            {options.map((opt) => {
                const isActive = current === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => setFilter(opt.value)}
                        className={cn(
                            "px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors",
                            isActive
                                ? "bg-zed-active text-primary rounded-sm shadow-sm"
                                : "text-text-muted hover:text-text-secondary"
                        )}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </nav>
    );
}
