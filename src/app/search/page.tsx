import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ApiResponse } from "@/lib/types/api";

interface SearchResult {
    id: string;
    type: "task" | "backlog_item";
    title: string;
    description: string | null;
    notes: string | null;
    status: string;
    priority: "P1" | "P2" | "P3" | null;
    deadline_at?: string | null;
    display_id?: number;
    updated_at: string;
    data_origin: "synced" | "native";
    project_id: string;
    project?: { id: string; name: string }[] | { id: string; name: string } | null;
}

interface SearchPageProps {
    searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const params = await searchParams;
    const query = (params.q || "").trim();

    if (!query) {
        return (
            <div className="p-8 lg:p-12">
                <div className="max-w-5xl mx-auto">
                    <header className="mb-8">
                        <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Search</h2>
                        <p className="text-xs text-text-secondary mt-1">Find tasks and backlog across enabled projects.</p>
                    </header>
                    <EmptyState
                        message="Start typing in Global search"
                        description="Press Enter in the header search bar to run a portfolio-wide query."
                    />
                </div>
            </div>
        );
    }

    let results: SearchResult[] = [];
    let error: string | null = null;

    try {
        const res = await apiFetch<ApiResponse<SearchResult[]>>(`/api/search?q=${encodeURIComponent(query)}&scope=enabled&limit=80`);
        results = res.data || [];
    } catch (e) {
        error = e instanceof Error ? e.message : "Search failed";
    }

    if (error) {
        return (
            <div className="p-8 lg:p-12">
                <div className="max-w-5xl mx-auto">
                    <EmptyState message="Search failed" description={error} />
                </div>
            </div>
        );
    }

    const taskResults = results.filter((item) => item.type === "task");
    const backlogResults = results.filter((item) => item.type === "backlog_item");

    return (
        <div className="p-8 lg:p-12">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8">
                    <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Search</h2>
                    <p className="text-xs text-text-secondary mt-1">
                        {results.length} result{results.length === 1 ? "" : "s"} for <span className="text-text-primary font-semibold">"{query}"</span>
                    </p>
                </header>

                {results.length === 0 ? (
                    <EmptyState message="No matches found" description="Try another query or search fewer words." />
                ) : (
                    <div className="space-y-8">
                        <SearchSection
                            title="Tasks"
                            rows={taskResults}
                            emptyLabel="No task matches"
                            renderHref={(row) => `/projects/${row.project_id}?from=search&task=${row.id}`}
                        />
                        <SearchSection
                            title="Backlog"
                            rows={backlogResults}
                            emptyLabel="No backlog matches"
                            renderHref={(row) => `/projects/${row.project_id}?from=search`}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function SearchSection({
    title,
    rows,
    emptyLabel,
    renderHref,
}: {
    title: string;
    rows: SearchResult[];
    emptyLabel: string;
    renderHref: (row: SearchResult) => string;
}) {
    return (
        <section>
            <div className="flex items-center gap-3 mb-4 px-2">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-text-muted">{title}</h3>
                <span className="text-[10px] text-text-muted font-bold font-mono">({rows.length})</span>
                <div className="h-[1px] flex-1 bg-zed-border/50" />
            </div>
            {rows.length === 0 ? (
                <div className="text-xs text-text-muted italic px-2">{emptyLabel}</div>
            ) : (
                <div className="space-y-2">
                    {rows.map((row) => {
                        const project = normalizeProject(row.project);
                        const snippet = row.description || row.notes || "";
                        return (
                            <Link
                                key={`${row.type}-${row.id}`}
                                href={renderHref(row)}
                                className="block rounded border border-zed-border bg-zed-sidebar/30 hover:bg-zed-hover transition-colors px-3 py-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-semibold text-text-primary truncate">{row.title}</span>
                                        {row.priority && (
                                            <span className={`text-[9px] font-bold uppercase ${priorityClass(row.priority)}`}>
                                                {row.priority}
                                            </span>
                                        )}
                                        {row.data_origin === "synced" && (
                                            <span className="text-[9px] font-bold uppercase text-text-muted">synced</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-text-muted">{new Date(row.updated_at).toLocaleDateString("en-US")}</span>
                                </div>
                                <div className="mt-1 text-[10px] uppercase tracking-widest text-text-muted">{project?.name || "Unknown project"}</div>
                                {snippet && (
                                    <p className="mt-2 text-xs text-text-secondary line-clamp-2">{snippet}</p>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function normalizeProject(input: SearchResult["project"]): { id: string; name: string } | null {
    if (!input) return null;
    if (Array.isArray(input)) return input[0] || null;
    return input;
}

function priorityClass(priority: "P1" | "P2" | "P3"): string {
    if (priority === "P1") return "text-status-red";
    if (priority === "P2") return "text-status-yellow";
    return "text-primary";
}
