import { cn } from "@/lib/utils";
import type { ProjectHealth } from "@/lib/types/api";

const healthStyles: Record<ProjectHealth, string> = {
    green: "bg-status-green",
    yellow: "bg-status-yellow",
    red: "bg-status-red",
};

const healthLabels: Record<ProjectHealth, string> = {
    green: "Healthy",
    yellow: "At Risk",
    red: "Critical",
};

interface HealthBadgeProps {
    health: ProjectHealth;
    showLabel?: boolean;
    size?: "sm" | "md";
    className?: string;
}

export function HealthBadge({ health, showLabel = false, size = "sm", className }: HealthBadgeProps) {
    const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

    return (
        <span className={cn("inline-flex items-center gap-1.5", className)}>
            <span className={cn("rounded-full", dotSize, healthStyles[health])} />
            {showLabel && (
                <span className={cn(
                    "font-bold uppercase tracking-tight",
                    size === "sm" ? "text-[9px]" : "text-[10px]",
                    `text-status-${health}`
                )}>
                    {healthLabels[health]}
                </span>
            )}
        </span>
    );
}
