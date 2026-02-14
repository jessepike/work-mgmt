import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ApiResponse } from "@/lib/types/api";

interface BacklogItemRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  type: string | null;
  status: "captured" | "triaged" | "prioritized" | "promoted" | "archived";
  priority: "P1" | "P2" | "P3" | null;
  source_id: string | null;
  updated_at: string;
  project?: { id: string; name: string } | { id: string; name: string }[] | null;
}

export default async function IdeasPage() {
  let items: BacklogItemRow[] = [];
  let error: string | null = null;

  try {
    const res = await apiFetch<ApiResponse<BacklogItemRow[]>>(
      `/api/backlog?scope=enabled&type=idea&status=captured,triaged,prioritized`
    );
    items = res.data || [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load ideas";
  }

  if (error) {
    return (
      <div className="p-8 lg:p-12">
        <EmptyState message="Ideas unavailable" description={error} />
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 min-h-full bg-zed-main">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Ideas</h2>
          <p className="text-xs text-text-secondary mt-1">
            Ideas across all enabled projects — from ingest, backlog, or manual capture
          </p>
        </header>

        {items.length === 0 ? (
          <EmptyState message="No ideas yet" description="Items with type 'idea' will appear here across all projects." />
        ) : (
          <div className="rounded border border-zed-border overflow-hidden bg-zed-sidebar/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-zed-header/30 border-b border-zed-border text-text-muted uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-4 py-3">Idea</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const project = normalizeProject(item.project);
                  return (
                    <tr key={item.id} className="border-b border-zed-border/50 last:border-b-0 hover:bg-zed-hover/50">
                      <td className="px-4 py-3">
                        <div className="text-text-primary">{item.title}</div>
                        {item.description && (
                          <div className="text-text-muted mt-0.5 line-clamp-1">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {project ? (
                          <Link href={`/projects/${item.project_id}`} className="text-text-secondary hover:text-text-primary">
                            {project.name}
                          </Link>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{item.priority || "—"}</td>
                      <td className="px-4 py-3 text-text-secondary">{item.status}</td>
                      <td className="px-4 py-3 text-text-muted">{formatRelativeTime(item.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeProject(input: BacklogItemRow["project"]): { id: string; name: string } | null {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] || null;
  return input;
}

function formatRelativeTime(value: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
