"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/components/ui/Toast";

interface ProjectRow {
  id: string;
  name: string;
  project_type: "connected" | "native";
  workflow_type: "flat" | "planned";
  status: string;
}

interface ConnectorRow {
  id: string;
  project_id: string;
  connector_type: string;
  status: "active" | "paused" | "error";
  last_sync_at: string | null;
  config: { path?: string } | null;
}

function formatTimeAgo(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  const now = Date.now();
  const mins = Math.floor((now - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SettingsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProject, setBusyProject] = useState<string | null>(null);
  const [pathDraft, setPathDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const [projectsRes, connectorsRes] = await Promise.all([
        fetch("/api/projects?status=active").then((r) => r.json()),
        fetch("/api/connectors?connector_type=adf").then((r) => r.json()),
      ]);

      setProjects(projectsRes.data || []);
      setConnectors(connectorsRes.data || []);
    } catch {
      showToast("error", "Failed to load settings data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const connectorByProject = useMemo(() => {
    const map = new Map<string, ConnectorRow>();
    for (const c of connectors) map.set(c.project_id, c);
    return map;
  }, [connectors]);

  async function toggleProject(project: ProjectRow, enabled: boolean) {
    if (project.project_type !== "connected") return;

    const existing = connectorByProject.get(project.id);
    setBusyProject(project.id);

    try {
      if (existing) {
        const res = await fetch(`/api/connectors/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: enabled ? "active" : "paused" }),
        });
        if (!res.ok) throw new Error("Failed to update connector");
      } else {
        if (!enabled) return;
        const path = pathDraft[project.id]?.trim();
        if (!path) {
          showToast("error", `Enter repo path for ${project.name} first`);
          return;
        }

        const res = await fetch("/api/connectors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: project.id,
            connector_type: "adf",
            status: "active",
            config: { path },
          }),
        });
        if (!res.ok) throw new Error("Failed to create connector");
      }

      showToast("success", `${project.name} sync ${enabled ? "enabled" : "paused"}`);
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setBusyProject(null);
    }
  }

  async function syncNow(project: ProjectRow) {
    if (project.project_type !== "connected") return;
    setBusyProject(project.id);
    try {
      const res = await fetch("/api/connectors/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Sync failed");
      showToast("success", `${project.name} synced (${body.count || 0} items)`);
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusyProject(null);
    }
  }

  return (
    <div className="p-8 lg:p-12 bg-zed-main min-h-full">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h2>
          <p className="text-xs text-text-secondary mt-1">Project sync controls and connector status</p>
        </header>

        {loading ? (
          <div className="text-sm text-text-muted">Loading settings...</div>
        ) : (
          <div className="rounded-lg border border-zed-border overflow-hidden bg-zed-sidebar/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-zed-header/40 border-b border-zed-border text-text-muted uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Sync Status</th>
                  <th className="px-4 py-3">Last Synced</th>
                  <th className="px-4 py-3">Repo Path</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const connector = connectorByProject.get(project.id);
                  const enabled = connector?.status === "active";
                  const isConnected = project.project_type === "connected";
                  const busy = busyProject === project.id;

                  return (
                    <tr key={project.id} className="border-b border-zed-border/50 last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="text-text-primary font-medium">{project.name}</div>
                        <div className="text-text-muted text-[10px] mt-1">{project.id}</div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{project.project_type}</td>
                      <td className="px-4 py-3">
                        {isConnected ? (
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={enabled}
                              disabled={busy}
                              onChange={(e) => toggleProject(project, e.target.checked)}
                            />
                            <span className={`w-10 h-5 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-zed-border"}`}>
                              <span className={`block w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                            </span>
                            <span className="ml-2 text-[11px] text-text-secondary">{enabled ? "Enabled" : connector ? "Paused" : "Not configured"}</span>
                          </label>
                        ) : (
                          <span className="text-text-muted">N/A (native)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{isConnected ? formatTimeAgo(connector?.last_sync_at || null) : "-"}</td>
                      <td className="px-4 py-3">
                        {isConnected ? (
                          connector?.config?.path ? (
                            <span className="text-text-secondary text-[11px]">{connector.config.path}</span>
                          ) : (
                            <input
                              value={pathDraft[project.id] || ""}
                              onChange={(e) => setPathDraft((prev) => ({ ...prev, [project.id]: e.target.value }))}
                              placeholder="/absolute/path/to/repo"
                              className="w-full bg-zed-main border border-zed-border rounded px-2 py-1 text-[11px] text-text-primary"
                              disabled={busy}
                            />
                          )
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isConnected ? (
                          <button
                            onClick={() => syncNow(project)}
                            disabled={!connector || busy || connector.status === "paused"}
                            className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded bg-zed-active border border-zed-border text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zed-hover"
                          >
                            Sync now
                          </button>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
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
