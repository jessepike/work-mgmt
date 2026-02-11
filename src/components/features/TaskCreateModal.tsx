"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/Toast";

interface ProjectOption {
    id: string;
    name: string;
}

interface TaskCreateModalProps {
    open: boolean;
    onClose: () => void;
    projects: ProjectOption[];
    defaultProjectId?: string;
    onCreated?: (task: any) => void;
}

export function TaskCreateModal({ open, onClose, projects, defaultProjectId, onCreated }: TaskCreateModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [projectId, setProjectId] = useState(defaultProjectId || "");
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<"P1" | "P2" | "P3">("P2");
    const [deadlineAt, setDeadlineAt] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ title?: string; project?: string }>({});
    const sortedProjects = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name)), [projects]);
    const hasProjects = sortedProjects.length > 0;

    useEffect(() => {
        if (!open) return;
        setProjectId(defaultProjectId || sortedProjects[0]?.id || "");
        setTitle("");
        setPriority("P2");
        setDeadlineAt("");
        setFormError(null);
        setFieldErrors({});
    }, [open, defaultProjectId, sortedProjects]);

    async function submit() {
        const trimmed = title.trim();
        if (submitting) return;
        const nextFieldErrors: { title?: string; project?: string } = {};
        if (!trimmed) nextFieldErrors.title = "Title is required";
        if (!projectId) nextFieldErrors.project = "Project is required";
        setFieldErrors(nextFieldErrors);
        setFormError(null);
        if (Object.keys(nextFieldErrors).length > 0) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_id: projectId,
                    title: trimmed,
                    priority,
                    deadline_at: deadlineAt ? new Date(`${deadlineAt}T12:00:00`).toISOString() : null,
                }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || "Failed to create task");
            showToast("success", "Task created");
            onCreated?.(body.data);
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create task";
            setFormError(message);
            showToast("error", message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal open={open} onClose={onClose} title="New Task">
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Project</label>
                    {!hasProjects && (
                        <p className="mt-1 text-[11px] text-status-red">No enabled projects available. Enable a project in Settings first.</p>
                    )}
                    <select
                        value={projectId}
                        onChange={(e) => {
                            setProjectId(e.target.value);
                            setFieldErrors((prev) => ({ ...prev, project: undefined }));
                        }}
                        disabled={submitting || !hasProjects}
                        className={`
                            mt-1 w-full bg-zed-main border rounded px-2 py-2 text-sm text-text-primary disabled:opacity-50
                            ${fieldErrors.project ? "border-status-red" : "border-zed-border"}
                        `}
                    >
                        {sortedProjects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                    </select>
                    {fieldErrors.project && <p className="mt-1 text-[11px] text-status-red">{fieldErrors.project}</p>}
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Title</label>
                    <input
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setFieldErrors((prev) => ({ ...prev, title: undefined }));
                        }}
                        placeholder="What needs to get done?"
                        disabled={submitting}
                        className={`
                            mt-1 w-full bg-zed-main border rounded px-2 py-2 text-sm text-text-primary disabled:opacity-50
                            ${fieldErrors.title ? "border-status-red" : "border-zed-border"}
                        `}
                    />
                    {fieldErrors.title && <p className="mt-1 text-[11px] text-status-red">{fieldErrors.title}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Priority</label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as any)}
                            disabled={submitting}
                            className="mt-1 w-full bg-zed-main border border-zed-border rounded px-2 py-2 text-sm text-text-primary disabled:opacity-50"
                        >
                            <option value="P1">P1</option>
                            <option value="P2">P2</option>
                            <option value="P3">P3</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Due Date</label>
                        <input
                            type="date"
                            value={deadlineAt}
                            onChange={(e) => setDeadlineAt(e.target.value)}
                            disabled={submitting}
                            className="mt-1 w-full bg-zed-main border border-zed-border rounded px-2 py-2 text-sm text-text-primary disabled:opacity-50"
                        />
                    </div>
                </div>
                {formError && (
                    <div className="rounded border border-status-red/30 bg-status-red/10 px-3 py-2 text-[11px] text-status-red">
                        {formError}
                    </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border border-zed-border text-text-muted hover:text-text-secondary disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={submitting || !title.trim() || !projectId || !hasProjects}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded bg-primary text-white disabled:opacity-40"
                    >
                        {submitting ? "Creating..." : "Create Task"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
