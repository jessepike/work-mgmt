import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ApiResponse } from "@/lib/types/api";

interface BacklogItemRow {
  id: string;
  project_id: string;
  title: string;
  status: "captured" | "triaged" | "prioritized" | "promoted" | "archived";
  priority: "P1" | "P2" | "P3" | null;
  source_id: string | null;
  updated_at: string;
  project?: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface BacklogPageProps {
  searchParams: Promise<{ status?: string; priority?: "P1" | "P2" | "P3" }>;
}

const ACTIVE_STATUSES = ["captured", "triaged", "prioritized"];

export default async function BacklogPage({ searchParams }: BacklogPageProps) {
  const params = await searchParams;
  const statusFilter = params.status || "active";
  const priorityFilter = params.priority || "";

  const statusParam = statusFilter === "active" ? ACTIVE_STATUSES.join(",") : statusFilter;
  let items: BacklogItemRow[] = [];
  let error: string | null = null;

  try {
    const res = await apiFetch<ApiResponse<BacklogItemRow[]>>(`/api/backlog?scope=enabled&status=${encodeURIComponent(statusParam)}`);
    items = (res.data || []).filter((item) => !priorityFilter || item.priority === priorityFilter);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load backlog";
  }

  if (error) {
    return (
      <div className="p-8 lg:p-12">
        <EmptyState message="Backlog unavailable" description={error} />
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 min-h-full bg-zed-main">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Backlog</h2>
            <p className="text-xs text-text-secondary mt-1">Portfolio-wide backlog across enabled projects</p>
          </div>
          <div className="flex items-center gap-2">
            <FilterLink href="/backlog?status=active" active={statusFilter === "active"} label="Active" />
            <FilterLink href="/backlog?status=promoted" active={statusFilter === "promoted"} label="Promoted" />
            <FilterLink href="/backlog?status=archived" active={statusFilter === "archived"} label="Archived" />
            <FilterLink href={`/backlog?status=${encodeURIComponent(statusFilter)}&priority=P1`} active={priorityFilter === "P1"} label="P1" />
            <FilterLink href={`/backlog?status=${encodeURIComponent(statusFilter)}&priority=P2`} active={priorityFilter === "P2"} label="P2" />
            <FilterLink href={`/backlog?status=${encodeURIComponent(statusFilter)}&priority=P3`} active={priorityFilter === "P3"} label="P3" />
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyState message="No backlog items" description="Try another filter or sync additional projects." />
        ) : (
          <div className="rounded border border-zed-border overflow-hidden bg-zed-sidebar/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-zed-header/30 border-b border-zed-border text-text-muted uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Item</th>
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
                      <td className="px-4 py-3 font-mono text-text-secondary">{displayBacklogId(item)}</td>
                      <td className="px-4 py-3 text-text-primary">{item.title}</td>
                      <td className="px-4 py-3">
                        {project ? (
                          <Link href={`/projects/${item.project_id}?from=backlog`} className="text-text-secondary hover:text-text-primary">
                            {project.name}
                          </Link>
                        ) : (
                          <span className="text-text-muted">Unknown</span>
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

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded ${active ? "bg-zed-active text-primary border-zed-border" : "text-text-muted border-zed-border/50"}`}
    >
      {label}
    </Link>
  );
}

function normalizeProject(input: BacklogItemRow["project"]): { id: string; name: string } | null {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] || null;
  return input;
}

function displayBacklogId(item: Pick<BacklogItemRow, "source_id" | "id">): string {
  const match = (item.source_id || "").match(/(?:^|:)(B\d+)(?:$|:)/i);
  if (match) return match[1].toUpperCase();
  return `BL-${item.id.slice(0, 6)}`;
}

function formatRelativeTime(value: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
