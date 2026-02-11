import { Suspense } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PortfolioHeader } from "./PortfolioHeader";
import type { ApiResponse } from "@/lib/types/api";

interface ProjectFromApi {
    id: string;
    name: string;
    created_at: string;
    categories: string[];
    focus: string | null;
    current_stage: string | null;
    health: "green" | "yellow" | "red";
    health_reason: string | null;
    project_type: "connected" | "native";
    task_summary?: {
        pending: number;
        in_progress: number;
        blocked: number;
        overdue: number;
        total_active: number;
    };
    backlog_summary?: {
        total_active: number;
        p1: number;
        p2: number;
        p3: number;
    };
    last_activity_at: string | null;
    connector_summary?: {
        status: "active" | "paused" | "error";
        last_sync_at: string | null;
    } | null;
}

interface StatusFromApi {
    total_projects: number;
    by_health: { healthy: number; at_risk: number; unhealthy: number };
    task_summary: { pending: number; in_progress: number; blocked: number; overdue: number; total_active: number };
}

interface PortfolioPageProps {
    searchParams: Promise<{ category?: string; preset?: string }>;
}

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
    const params = await searchParams;
    const categoryFilter = params.category || "";
    const preset = params.preset || "";

    let apiPath = "/api/projects?status=active&scope=enabled";
    if (categoryFilter) {
        apiPath += `&categories=${encodeURIComponent(categoryFilter)}`;
    }

    const [projectsRes, statusRes, tasksRes] = await Promise.all([
        apiFetch<ApiResponse<ProjectFromApi[]>>(apiPath),
        apiFetch<ApiResponse<StatusFromApi>>("/api/projects/status?scope=enabled"),
        apiFetch<ApiResponse<Array<{
            id: string;
            title: string;
            status: "pending" | "in_progress" | "blocked" | "done";
            priority: "P1" | "P2" | "P3" | null;
            deadline_at: string | null;
            updated_at: string;
            project_id: string;
        }>>>("/api/tasks?scope=enabled&status=pending,in_progress,blocked"),
    ]);

    const projects = applyPresetFilter(projectsRes.data, preset);
    const status = statusRes.data;
    const tasks = tasksRes.data || [];
    const categoryValues = Array.from(
        new Set(projects.flatMap((p) => p.categories || []).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    const categoryOptions = [
        { label: "All", value: "" },
        ...categoryValues.map((value) => ({ label: normalizeCategoryLabel(value), value })),
    ];
    const presetOptions = [
        { label: "All", value: "" },
        { label: "Needs Attention", value: "attention" },
        { label: "Execution Today", value: "execution" },
        { label: "Heavy Backlog", value: "backlog" },
        { label: "Stale", value: "stale" },
    ];
    const nextTasksByProject = buildNextTasksByProject(tasks);

    return (
        <div className="flex flex-col min-h-full bg-zed-main">
            <Suspense>
                <PortfolioHeader categoryOptions={categoryOptions} presetOptions={presetOptions} />
            </Suspense>

            <div className="p-8 lg:p-12 flex-1">
                {projects.length === 0 ? (
                    <EmptyState message="No projects found" description={categoryFilter ? "Try a different filter" : "Create your first project"} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1400px] mx-auto">
                        {projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                id={project.id}
                                href={buildProjectHref(project.id, { category: categoryFilter, preset })}
                                name={project.name}
                                category={normalizeCategoryLabel(project.categories[0] || "uncategorized")}
                                tasksCount={project.task_summary?.total_active || 0}
                                blockedCount={project.task_summary?.blocked || 0}
                                overdueCount={project.task_summary?.overdue || 0}
                                backlogCount={project.backlog_summary?.total_active || 0}
                                p1Count={project.backlog_summary?.p1 || 0}
                                currentFocus={project.focus || "No focus from status/intent"}
                                stage={normalizeStageLabel(project.current_stage)}
                                lastActivityAt={project.last_activity_at}
                                health={project.health}
                                projectType={project.project_type}
                                connectorStatus={project.connector_summary?.status}
                                lastSyncAt={project.connector_summary?.last_sync_at || null}
                                nextTasks={nextTasksByProject.get(project.id) || []}
                                isStale={isProjectStale(project)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <footer className="mt-auto h-8 bg-zed-header border-t border-zed-border flex items-center justify-between px-8 text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted opacity-30" />
                        {status.total_projects} Total Projects
                    </span>
                    <span className="flex items-center gap-2 text-status-red">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-red" />
                        {status.by_health.unhealthy} Critical
                    </span>
                    <span className="flex items-center gap-2 text-status-yellow">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-yellow" />
                        {status.by_health.at_risk} At Risk
                    </span>
                </div>
            </footer>
        </div>
    );
}

function normalizeStageLabel(stage: string | null): string {
    if (!stage) return "Stage Not Set";
    const s = stage.trim();
    if (!s) return "Stage Not Set";
    const lower = s.toLowerCase();
    if (lower === "active" || lower === "in progress" || lower === "unknown") return "Stage Not Set";
    return s;
}

function normalizeCategoryLabel(category: string): string {
    const c = category.trim().toLowerCase();
    if (!c) return "UNCATEGORIZED";
    if (c === "infra") return "INFRASTRUCTURE";
    if (c === "infrastructure") return "INFRASTRUCTURE";
    if (c === "dev") return "DEVELOPMENT";
    if (c === "development") return "DEVELOPMENT";
    if (c === "core") return "CORE";
    if (c === "personal") return "PERSONAL";
    return c.toUpperCase();
}

function applyPresetFilter(projects: ProjectFromApi[], preset: string): ProjectFromApi[] {
    if (!preset) return projects;
    if (preset === "attention") {
        return projects.filter((p) =>
            p.health !== "green" ||
            (p.task_summary?.blocked || 0) > 0 ||
            (p.task_summary?.overdue || 0) > 0 ||
            (p.backlog_summary?.p1 || 0) > 0
        );
    }
    if (preset === "execution") {
        return projects.filter((p) =>
            (p.task_summary?.in_progress || 0) > 0 ||
            (p.task_summary?.overdue || 0) > 0 ||
            (p.task_summary?.blocked || 0) > 0
        );
    }
    if (preset === "backlog") {
        return projects.filter((p) => (p.backlog_summary?.total_active || 0) >= 10);
    }
    if (preset === "stale") {
        return projects.filter((p) => isProjectStale(p));
    }
    return projects;
}

function buildNextTasksByProject(tasks: Array<{
    id: string;
    title: string;
    status: "pending" | "in_progress" | "blocked" | "done";
    priority: "P1" | "P2" | "P3" | null;
    deadline_at: string | null;
    updated_at: string;
    project_id: string;
}>): Map<string, Array<{ id: string; title: string; priority: "P1" | "P2" | "P3" | null }>> {
    const grouped = new Map<string, typeof tasks>();
    for (const task of tasks) {
        if (!grouped.has(task.project_id)) grouped.set(task.project_id, []);
        grouped.get(task.project_id)!.push(task);
    }

    const out = new Map<string, Array<{ id: string; title: string; priority: "P1" | "P2" | "P3" | null }>>();
    for (const [projectId, projectTasks] of grouped.entries()) {
        const sorted = [...projectTasks].sort((a, b) => {
            const statusRank = (status: string) => status === "blocked" ? 0 : status === "in_progress" ? 1 : 2;
            const priorityRank = (p: string | null) => p === "P1" ? 0 : p === "P2" ? 1 : 2;
            const aStatus = statusRank(a.status);
            const bStatus = statusRank(b.status);
            if (aStatus !== bStatus) return aStatus - bStatus;
            const aPriority = priorityRank(a.priority);
            const bPriority = priorityRank(b.priority);
            if (aPriority !== bPriority) return aPriority - bPriority;
            const aDue = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            const bDue = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            if (aDue !== bDue) return aDue - bDue;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }).slice(0, 2);

        out.set(projectId, sorted.map((task) => ({ id: task.id, title: task.title, priority: task.priority })));
    }

    return out;
}

function isProjectStale(project: Pick<ProjectFromApi, "last_activity_at" | "created_at">): boolean {
    const now = Date.now();
    const reference = project.last_activity_at || project.created_at;
    if (!reference) return false;
    const ageDays = (now - new Date(reference).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays >= 7;
}

function buildProjectHref(projectId: string, context: { category?: string; preset?: string }): string {
    const params = new URLSearchParams();
    params.set("from", "portfolio");
    if (context.category) params.set("category", context.category);
    if (context.preset) params.set("preset", context.preset);
    return `/projects/${projectId}?${params.toString()}`;
}
