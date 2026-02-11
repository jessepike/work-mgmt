import { Database } from "./database";

// Base row types
export type Project = Database["public"]["Tables"]["project"]["Row"];
export type Task = Database["public"]["Tables"]["task"]["Row"];
export type Plan = Database["public"]["Tables"]["plan"]["Row"];
export type Phase = Database["public"]["Tables"]["phase"]["Row"];
export type BacklogItem = Database["public"]["Tables"]["backlog_item"]["Row"];
export type Connector = Database["public"]["Tables"]["connector"]["Row"];
export type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];

// Enum types
export type ProjectHealth = Database["public"]["Enums"]["project_health"];
export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type PriorityLevel = Database["public"]["Enums"]["priority_level"];
export type DataOrigin = Database["public"]["Enums"]["data_origin"];
export type WorkflowType = Database["public"]["Enums"]["workflow_type"];
export type BacklogStatus = Database["public"]["Enums"]["backlog_status"];
export type PhaseStatus = Database["public"]["Enums"]["phase_status"];

// API response: task with joined project info (from whats-next, task list)
export interface TaskWithProject extends Task {
    project?: {
        id: string;
        name: string;
        status: ProjectStatus;
        current_phase_id: string | null;
    } | null;
    phase?: {
        id: string;
        name: string;
        status: PhaseStatus;
    } | null;
    score?: number;
    match_reasons?: string[];
}

// API response: project with computed health and task summary
export interface ProjectWithDetails extends Project {
    computed_health?: ProjectHealth;
    task_summary?: {
        pending: number;
        in_progress: number;
        blocked: number;
        done: number;
        total: number;
    };
    connector?: Connector | null;
}

// API response: portfolio status summary
export interface PortfolioStatus {
    total_projects: number;
    by_health: Record<ProjectHealth, number>;
    by_status: Record<ProjectStatus, number>;
    total_tasks: number;
    tasks_by_status: Record<TaskStatus, number>;
    active_blockers: number;
}

// Generic API response envelope
export interface ApiResponse<T> {
    data: T;
    meta?: {
        total: number;
        limit: number;
        offset: number;
    };
}
