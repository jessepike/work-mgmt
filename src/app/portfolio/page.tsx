import { Suspense } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PortfolioHeader } from "./PortfolioHeader";
import type { ApiResponse } from "@/lib/types/api";

interface ProjectFromApi {
    id: string;
    name: string;
    categories: string[];
    focus: string | null;
    health: "green" | "yellow" | "red";
    health_reason: string | null;
    project_type: "connected" | "native";
    task_summary?: {
        pending: number;
        in_progress: number;
        blocked: number;
        total_active: number;
    };
}

interface StatusFromApi {
    total_projects: number;
    by_health: { healthy: number; at_risk: number; unhealthy: number };
    task_summary: { pending: number; in_progress: number; blocked: number; overdue: number; total_active: number };
}

interface PortfolioPageProps {
    searchParams: Promise<{ category?: string }>;
}

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
    const params = await searchParams;
    const categoryFilter = params.category || "";

    let apiPath = "/api/projects?status=active";
    if (categoryFilter) {
        apiPath += `&categories=${encodeURIComponent(categoryFilter)}`;
    }

    const [projectsRes, statusRes] = await Promise.all([
        apiFetch<ApiResponse<ProjectFromApi[]>>(apiPath),
        apiFetch<ApiResponse<StatusFromApi>>("/api/projects/status"),
    ]);

    const projects = projectsRes.data;
    const status = statusRes.data;

    return (
        <div className="flex flex-col min-h-full bg-zed-main">
            <Suspense>
                <PortfolioHeader />
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
                                name={project.name}
                                category={project.categories[0]?.toUpperCase() || "UNCATEGORIZED"}
                                tasksCount={project.task_summary?.total_active || 0}
                                blockedCount={project.task_summary?.blocked || 0}
                                currentFocus={project.focus || "No focus set"}
                                progress={calculateProgress(project.task_summary)}
                                health={project.health}
                                syncing={project.project_type === "connected"}
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

function calculateProgress(summary?: { pending: number; in_progress: number; blocked: number; total_active: number }): number {
    if (!summary || summary.total_active === 0) return 0;
    // This is active tasks only (no done count available), so show in_progress as partial progress
    const inProgress = summary.in_progress / summary.total_active;
    return Math.round(inProgress * 100);
}
