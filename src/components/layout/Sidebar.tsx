"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
    IconHome,
    IconBriefcase,
    IconLayoutKanban,
    IconListCheck,
    IconSettings
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const navItems = [
    { label: "Today", href: "/", icon: IconHome },
    { label: "Portfolio", href: "/portfolio", icon: IconBriefcase },
    { label: "Backlog", href: "/backlog", icon: IconListCheck },
    { label: "Kanban", href: "/tasks/kanban", icon: IconLayoutKanban },
    { label: "Settings", href: "/settings", icon: IconSettings },
];

export function Sidebar() {
    const pathname = usePathname();
    const [projectLinks, setProjectLinks] = useState<Array<{ id: string; name: string }>>([]);

    useEffect(() => {
        fetch("/api/projects?status=active&scope=enabled")
            .then((r) => r.json())
            .then((res) => {
                const rows = (res?.data || []) as Array<{ id: string; name: string }>;
                setProjectLinks(rows.slice(0, 18));
            })
            .catch(() => setProjectLinks([]));
    }, []);

    return (
        <aside className="w-[240px] flex-shrink-0 bg-zed-sidebar border-r border-zed-border flex flex-col h-screen">
            <div className="h-12 flex items-center px-4 border-b border-zed-border text-text-secondary font-semibold text-[10px] tracking-widest uppercase">
                Workspaces
            </div>

            <nav className="flex-1 py-2 overflow-y-auto custom-scrollbar">
                <div className="space-y-0.5">
                    {navItems.map((item) => {
                        const isActive = item.href === "/settings"
                            ? pathname.startsWith("/settings")
                            : pathname === item.href;
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

                <div className="mt-4 px-4">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2">
                        Projects
                    </div>
                    <div className="space-y-0.5">
                        {projectLinks.map((project) => {
                            const href = `/projects/${project.id}`;
                            const isActive = pathname.startsWith(href);
                            return (
                                <Link
                                    key={project.id}
                                    href={href}
                                    className={cn(
                                        "block h-7 px-2 leading-7 text-xs truncate rounded transition-colors",
                                        isActive
                                            ? "bg-zed-active text-primary"
                                            : "text-text-secondary hover:bg-zed-hover hover:text-text-primary"
                                    )}
                                >
                                    {project.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            <div className="p-4 border-t border-zed-border text-text-muted text-xs flex items-center justify-between">
                <span className="font-mono opacity-50">V1.4.2</span>
                <Link href="/settings" className="hover:text-text-secondary transition-colors">
                    <IconSettings className="w-4 h-4" />
                </Link>
            </div>
        </aside>
    );
}
