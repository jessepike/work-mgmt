import { cn } from "@/lib/utils";

interface EmptyStateProps {
    message: string;
    description?: string;
    className?: string;
}

export function EmptyState({ message, description, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-16 px-8", className)}>
            <p className="text-sm text-text-secondary font-medium">{message}</p>
            {description && (
                <p className="text-xs text-text-muted mt-1">{description}</p>
            )}
        </div>
    );
}
