"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { TaskCreateModal } from "@/components/features/TaskCreateModal";

interface TodayHeaderActionsProps {
    projects: Array<{ id: string; name: string }>;
}

export function TodayHeaderActions({ projects }: TodayHeaderActionsProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const disabled = projects.length === 0;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                disabled={disabled}
                title={disabled ? "No enabled projects available" : "Create task"}
                className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 transition-all shadow-sm shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <IconPlus className="w-3.5 h-3.5" />
                New Task
            </button>
            <TaskCreateModal
                open={open}
                onClose={() => setOpen(false)}
                projects={projects}
                onCreated={() => router.refresh()}
            />
        </>
    );
}
