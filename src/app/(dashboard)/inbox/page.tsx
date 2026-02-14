import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ApiResponse } from "@/lib/types/api";

const INBOX_PROJECT_ID = "ce973e7b-f899-46ec-9ac9-cffa31b56d1a";

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
}

export default async function InboxPage() {
  let items: BacklogItemRow[] = [];
  let error: string | null = null;

  try {
    const res = await apiFetch<ApiResponse<BacklogItemRow[]>>(
      `/api/backlog?project_id=${INBOX_PROJECT_ID}&status=captured,triaged,prioritized`
    );
    items = res.data || [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load inbox";
  }

  if (error) {
    return (
      <div className="p-8 lg:p-12">
        <EmptyState message="Inbox unavailable" description={error} />
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 min-h-full bg-zed-main">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Inbox</h2>
          <p className="text-xs text-text-secondary mt-1">
            Untriaged items — set type, move to project, or archive
          </p>
        </header>

        {items.length === 0 ? (
          <EmptyState message="Inbox is empty" description="No untriaged items. New captures from /ingest will appear here." />
        ) : (
          <div className="rounded border border-zed-border overflow-hidden bg-zed-sidebar/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-zed-header/30 border-b border-zed-border text-text-muted uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-zed-border/50 last:border-b-0 hover:bg-zed-hover/50">
                    <td className="px-4 py-3">
                      <div className="text-text-primary">{item.title}</div>
                      {item.description && (
                        <div className="text-text-muted mt-0.5 line-clamp-1">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.type ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zed-active text-primary">
                          {item.type}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{item.priority || "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{item.status}</td>
                    <td className="px-4 py-3 text-text-muted">{formatRelativeTime(item.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(value: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
