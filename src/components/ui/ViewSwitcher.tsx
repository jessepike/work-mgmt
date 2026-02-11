"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ViewLink {
    label: string;
    href: string;
}

interface ViewSwitcherProps {
    views: ViewLink[];
    className?: string;
}

export function ViewSwitcher({ views, className }: ViewSwitcherProps) {
    const pathname = usePathname();

    return (
        <nav className={cn("flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50", className)}>
            {views.map((view) => {
                const isActive = pathname === view.href;
                return (
                    <Link
                        key={view.href}
                        href={view.href}
                        className={cn(
                            "px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors",
                            isActive
                                ? "bg-zed-active text-primary rounded-sm shadow-sm"
                                : "text-text-muted hover:text-text-secondary"
                        )}
                    >
                        {view.label}
                    </Link>
                );
            })}
        </nav>
    );
}
