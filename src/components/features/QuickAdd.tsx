"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { showToast } from "@/components/ui/Toast";

interface QuickAddProps {
    projectId: string;
    planId?: string | null;
    phaseId?: string | null;
    disabled?: boolean;
    onCreated?: (task: any) => void;
}

export function QuickAdd({ projectId, planId, phaseId, disabled, onCreated }: QuickAddProps) {
    const [title, setTitle] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    if (disabled) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed || submitting) return;

        setSubmitting(true);
        try {
            const payload: Record<string, string> = { project_id: projectId, title: trimmed };
            if (planId) payload.plan_id = planId;
            if (phaseId) payload.phase_id = phaseId;

            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create task");
            }
            const responseBody = await res.json();

            setTitle("");
            showToast("success", "Task created");
            onCreated?.(responseBody.data);
            router.refresh();
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Failed to create task");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 h-10">
            <IconPlus className="w-3.5 h-3.5 text-text-muted" />
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a task..."
                disabled={submitting}
                className="flex-1 bg-transparent border-none text-xs text-text-primary placeholder-text-muted focus:outline-none"
            />
        </form>
    );
}
