import { apiFetch } from "@/lib/api/fetch";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectDetailClient } from "./ProjectDetailClient";
import type { Task, Phase, ApiResponse } from "@/lib/types/api";

interface ProjectDetail {
    id: string;
    name: string;
    workflow_type: "flat" | "planned";
    project_type: "connected" | "native";
    categories: string[];
    focus: string | null;
    health: "green" | "yellow" | "red";
    health_reason: string | null;
    data_origin: "synced" | "native";
    phases: Phase[];
    current_plan: { id: string; name: string } | null;
    connector: { id: string; connector_type: string; status: string; last_sync_at: string | null } | null;
    task_summary: { pending: number; in_progress: number; blocked: number; done: number; total: number };
    active_blockers: { id: string; title: string; blocked_reason: string | null }[];
}

interface ProjectDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
    const { id } = await params;

    let project: ProjectDetail | null = null;
    let tasks: Task[] = [];
    let error: string | null = null;

    try {
        const [projectRes, tasksRes] = await Promise.all([
            apiFetch<ApiResponse<ProjectDetail>>(`/api/projects/${id}`),
            apiFetch<ApiResponse<Task[]>>(`/api/tasks?project_id=${id}`),
        ]);
        project = projectRes.data;
        tasks = tasksRes.data;
    } catch (e) {
        error = e instanceof Error ? e.message : "Failed to load project";
    }

    if (error || !project) {
        return (
            <div className="flex items-center justify-center min-h-full">
                <EmptyState message="Project not found" description={error || "The project may have been archived or deleted"} />
            </div>
        );
    }

    return (
        <ProjectDetailClient
            project={project}
            tasks={tasks}
        />
    );
}
