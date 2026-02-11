import { IconLink } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface SyncIndicatorProps {
    connectorType?: string;
    lastSyncAt?: string | null;
    className?: string;
}

export function SyncIndicator({ connectorType, lastSyncAt, className }: SyncIndicatorProps) {
    const syncLabel = connectorType ? `Connected via ${connectorType.toUpperCase()}` : "Connected";
    const timeAgo = lastSyncAt ? formatTimeAgo(new Date(lastSyncAt)) : "Never";

    return (
        <div className={cn("flex items-center gap-1.5 text-[10px] font-bold text-text-muted tracking-tight px-2 py-0.5 border border-zed-border rounded", className)}>
            <IconLink className="w-3 h-3" />
            <span>{syncLabel}</span>
            <span className="text-text-muted/60">•</span>
            <span>Last synced: {timeAgo}</span>
        </div>
    );
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}
