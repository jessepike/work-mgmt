"use client";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-full bg-zed-main p-8">
            <p className="text-sm text-status-red font-medium mb-2">Something went wrong</p>
            <p className="text-xs text-text-muted mb-4">{error.message}</p>
            <button
                onClick={reset}
                className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-zed-active border border-zed-border rounded hover:bg-zed-hover transition-colors"
            >
                Try Again
            </button>
        </div>
    );
}
