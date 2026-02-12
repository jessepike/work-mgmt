import { apiFetch } from "@/lib/api/fetch";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectDetailClient } from "./ProjectDetailClient";
import type { Task, Phase, ApiResponse } from "@/lib/types/api";

interface ProjectDetail {
    id: string;
    name: string;
    updated_at: string;
    workflow_type: "flat" | "planned";
    project_type: "connected" | "native";
    categories: string[];
    current_stage: string | null;
    focus: string | null;
    health: "green" | "yellow" | "red";
    health_reason: string | null;
    data_origin: "synced" | "native";
    phases: Phase[];
    current_plan: { id: string; name: string } | null;
    connector: { id: string; connector_type: string; status: string; last_sync_at: string | null } | null;
    task_summary: { pending: number; in_progress: number; blocked: number; done: number; total: number };
    backlog_summary: { active: number; completed: number; p1_active: number };
    active_blockers: { id: string; title: string; blocked_reason: string | null }[];
}

interface ProjectDetailPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string; category?: string; preset?: string; health?: string; trust?: string; task?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
    const { id } = await params;
    const query = await searchParams;

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
            returnHref={buildReturnHref(query)}
            returnLabel={buildReturnLabel(query)}
            initialTaskId={query.task}
        />
    );
}

function buildReturnHref(query: { from?: string; category?: string; preset?: string; health?: string; trust?: string }): string | undefined {
    if (query.from === "today") return "/";
    if (query.from === "kanban") return "/tasks/kanban";
    if (query.from === "backlog") return "/backlog";
    if (query.from === "search") return "/search";
    if (query.from === "priority") return undefined;
    if (query.from === "deadlines") return undefined;
    if (query.from === "portfolio") {
        const params = new URLSearchParams();
        if (query.category) params.set("category", query.category);
        if (query.preset) params.set("preset", query.preset);
        if (query.health) params.set("health", query.health);
        if (query.trust) params.set("trust", query.trust);
        const suffix = params.toString();
        return suffix ? `/portfolio?${suffix}` : "/portfolio";
    }
    return undefined;
}

function buildReturnLabel(query: { from?: string }): string | undefined {
    if (query.from === "today") return "Back to Today";
    if (query.from === "kanban") return "Back to Kanban";
    if (query.from === "backlog") return "Back to Backlog";
    if (query.from === "search") return "Back to Search";
    if (query.from === "portfolio") return "Back to Portfolio";
    return undefined;
}
