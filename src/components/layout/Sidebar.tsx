"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    IconHome,
    IconBriefcase,
    IconListCheck,
    IconTimeline,
    IconUsers,
    IconBrush,
    IconSettings
} from "@tabler/icons-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { label: "Home", href: "/", icon: IconHome },
    { label: "Portfolio", href: "/portfolio", icon: IconBriefcase },
    { label: "Tasks", href: "/tasks", icon: IconListCheck },
    { label: "Timeline", href: "/timeline", icon: IconTimeline },
];

const teamItems = [
    { label: "Engineering", href: "/teams/eng", icon: IconUsers },
    { label: "Product Design", href: "/teams/design", icon: IconBrush },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-[240px] flex-shrink-0 bg-zed-sidebar border-r border-zed-border flex flex-col h-screen">
            <div className="h-12 flex items-center px-4 border-b border-zed-border text-text-secondary font-semibold text-[10px] tracking-widest uppercase">
                Workspaces
            </div>

            <nav className="flex-1 py-2 overflow-y-auto custom-scrollbar">
                <div className="space-y-0.5">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center h-9 px-4 transition-colors group",
                                    isActive
                                        ? "bg-zed-active border-l-2 border-primary text-text-primary"
                                        : "text-text-secondary hover:bg-zed-hover hover:text-text-primary"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-4 h-4 mr-3 transition-colors",
                                    isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"
                                )} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-6 px-4 mb-2 text-[10px] text-text-muted font-bold tracking-widest uppercase">
                    Teams
                </div>

                <div className="space-y-0.5">
                    {teamItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center h-9 px-4 transition-colors group",
                                    isActive
                                        ? "bg-zed-active border-l-2 border-primary text-text-primary"
                                        : "text-text-secondary hover:bg-zed-hover hover:text-text-primary"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-4 h-4 mr-3 transition-colors",
                                    isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"
                                )} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className="p-4 border-t border-zed-border text-text-muted text-xs flex items-center justify-between">
                <span className="font-mono opacity-50">V1.4.2</span>
                <button className="hover:text-text-secondary transition-colors">
                    <IconSettings className="w-4 h-4" />
                </button>
            </div>
        </aside>
    );
}
