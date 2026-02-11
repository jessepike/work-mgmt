import { cn } from "@/lib/utils";
import type { PriorityLevel } from "@/lib/types/api";

const priorityStyles: Record<PriorityLevel, string> = {
    P1: "text-status-red",
    P2: "text-status-yellow",
    P3: "text-primary",
};

interface PriorityChipProps {
    priority: PriorityLevel | null;
    className?: string;
}

export function PriorityChip({ priority, className }: PriorityChipProps) {
    if (!priority) return null;

    return (
        <span className={cn("text-[10px] font-bold", priorityStyles[priority], className)}>
            {priority}
        </span>
    );
}
