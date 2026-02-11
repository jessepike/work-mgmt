"use client";

import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/components/ui/Toast";

interface ProjectRow {
  id: string;
  name: string;
  project_type: "connected" | "native";
  workflow_type: "flat" | "planned";
  status: string;
  health?: "green" | "yellow" | "red";
}

interface ConnectorRow {
  id: string;
  project_id: string;
  connector_type: string;
  status: "active" | "paused" | "error";
  last_sync_at: string | null;
  config: { path?: string } | null;
}

interface SyncQualityRow {
  project_id: string;
  severity: "green" | "yellow" | "red";
  duplicate_titles: number;
  duplicate_source_ids: number;
  synced_without_source: number;
  absolute_source_ids: number;
  last_sync_age_hours: number | null;
}

type ConnectionState = "configured" | "missing_path" | "not_configured" | "native";
type FreshnessState = "healthy" | "aging" | "stale" | "never" | "not_ready" | "n/a";

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

function badgeClass(kind: "green" | "yellow" | "red" | "muted") {
  if (kind === "green") return "bg-status-green/15 text-status-green border-status-green/30";
  if (kind === "yellow") return "bg-status-yellow/15 text-status-yellow border-status-yellow/30";
  if (kind === "red") return "bg-status-red/15 text-status-red border-status-red/30";
  return "bg-zed-active text-text-secondary border-zed-border";
}

function getConnectionState(projectType: ProjectRow["project_type"], connector?: ConnectorRow): ConnectionState {
  if (projectType === "native") return "native";
  if (!connector) return "not_configured";
  if (!connector.config?.path) return "missing_path";
  return "configured";
}

function getFreshnessState(
  projectType: ProjectRow["project_type"],
  connection: ConnectionState,
  lastSyncAt: string | null
): FreshnessState {
  if (projectType === "native") return "n/a";
  if (connection !== "configured") return "not_ready";
  if (!lastSyncAt) return "never";
  const ageHours = (Date.now() - new Date(lastSyncAt).getTime()) / 36e5;
  if (ageHours <= 6) return "healthy";
  if (ageHours <= 24) return "aging";
  return "stale";
}

export default function SettingsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [syncQualityRows, setSyncQualityRows] = useState<SyncQualityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProject, setBusyProject] = useState<string | null>(null);
  const [pathDraft, setPathDraft] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<"all" | "attention" | "enabled">("all");

  async function load() {
    setLoading(true);
    try {
      const [projectsRes, connectorsRes, syncQualityRes] = await Promise.all([
        fetch("/api/projects?status=active").then((r) => r.json()),
        fetch("/api/connectors?connector_type=adf").then((r) => r.json()),
        fetch("/api/sync-quality?include_unconfigured=1").then((r) => r.json()),
      ]);

      setProjects(projectsRes.data || []);
      setConnectors(connectorsRes.data || []);
      setSyncQualityRows(syncQualityRes.data?.rows || []);
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

  const syncQualityByProject = useMemo(() => {
    const map = new Map<string, SyncQualityRow>();
    for (const row of syncQualityRows) map.set(row.project_id, row);
    return map;
  }, [syncQualityRows]);

  const visibleProjects = useMemo(() => {
    const healthRank: Record<string, number> = { red: 0, yellow: 1, green: 2 };

    const withMeta = projects.map((project) => {
      const connector = connectorByProject.get(project.id);
      const syncQuality = syncQualityByProject.get(project.id);
      const connection = getConnectionState(project.project_type, connector);
      const freshness = getFreshnessState(project.project_type, connection, connector?.last_sync_at || null);
      const enabled = connector?.status === "active";
      const needsAttention =
        project.project_type === "connected" &&
        (
          connection === "not_configured" ||
          connection === "missing_path" ||
          freshness === "stale" ||
          freshness === "never" ||
          syncQuality?.severity === "red" ||
          syncQuality?.severity === "yellow"
        );

      return { project, connector, syncQuality, connection, freshness, enabled, needsAttention };
    });

    const filtered = withMeta.filter((row) => {
      if (filterMode === "attention") return row.needsAttention;
      if (filterMode === "enabled") {
        if (row.project.project_type === "native") return true;
        return row.enabled;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
      const aRank = healthRank[a.project.health || "green"] ?? 2;
      const bRank = healthRank[b.project.health || "green"] ?? 2;
      if (aRank !== bRank) return aRank - bRank;
      return a.project.name.localeCompare(b.project.name);
    });
  }, [projects, connectorByProject, syncQualityByProject, filterMode]);

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
            <div className="px-4 py-3 border-b border-zed-border bg-zed-header/30 flex items-center gap-2">
              <button
                onClick={() => setFilterMode("all")}
                className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded ${filterMode === "all" ? "bg-zed-active text-primary border-zed-border" : "text-text-muted border-zed-border/50"}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode("attention")}
                className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded ${filterMode === "attention" ? "bg-zed-active text-primary border-zed-border" : "text-text-muted border-zed-border/50"}`}
              >
                Needs Attention
              </button>
              <button
                onClick={() => setFilterMode("enabled")}
                className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border rounded ${filterMode === "enabled" ? "bg-zed-active text-primary border-zed-border" : "text-text-muted border-zed-border/50"}`}
              >
                Enabled
              </button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-zed-header/40 border-b border-zed-border text-text-muted uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Connection</th>
                  <th className="px-4 py-3">Sync Control</th>
                  <th className="px-4 py-3">Last Synced</th>
                  <th className="px-4 py-3">Freshness</th>
                  <th className="px-4 py-3">Trust</th>
                  <th className="px-4 py-3">Repo Path</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProjects.map(({ project, connector, syncQuality, enabled, connection, freshness, needsAttention }) => {
                  const isConnected = project.project_type === "connected";
                  const busy = busyProject === project.id;

                  return (
                    <tr
                      key={project.id}
                      className={`border-b border-zed-border/50 last:border-b-0 ${needsAttention ? "bg-status-yellow/5" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-text-primary font-medium">{project.name}</div>
                        <div className="text-text-muted text-[10px] mt-1">{project.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${
                          project.health === "red" ? badgeClass("red") : project.health === "yellow" ? badgeClass("yellow") : badgeClass("green")
                        }`}>
                          {project.health || "green"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("muted")}`}>
                          {project.project_type === "native" ? "Native" : "ADF"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {connection === "native" ? (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("muted")}`}>—</span>
                        ) : connection === "configured" ? (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("green")}`}>Configured</span>
                        ) : connection === "missing_path" ? (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("yellow")}`}>Missing Path</span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("red")}`}>Not Configured</span>
                        )}
                      </td>
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
                            <span className="ml-2 text-[11px] text-text-secondary">
                              {!connector ? "Disabled" : enabled ? "Enabled" : connector.status === "error" ? "Error" : "Paused"}
                            </span>
                          </label>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{isConnected ? formatTimeAgo(connector?.last_sync_at || null) : "—"}</td>
                      <td className="px-4 py-3">
                        {freshness === "n/a" ? (
                          <span className="text-text-muted">—</span>
                        ) : freshness === "healthy" ? (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("green")}`}>Healthy</span>
                        ) : freshness === "aging" ? (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("yellow")}`}>Aging</span>
                        ) : freshness === "stale" ? (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("red")}`}>Stale</span>
                        ) : freshness === "never" ? (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("yellow")}`}>Never Synced</span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("red")}`}>Not Ready</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {project.project_type === "native" ? (
                          <span className="text-text-muted">—</span>
                        ) : !syncQuality ? (
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${badgeClass("muted")}`}>Unknown</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center w-fit px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${
                              syncQuality.severity === "red"
                                ? badgeClass("red")
                                : syncQuality.severity === "yellow"
                                  ? badgeClass("yellow")
                                  : badgeClass("green")
                            }`}>
                              {syncQuality.severity}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              dup-title {syncQuality.duplicate_titles} • dup-id {syncQuality.duplicate_source_ids}
                            </span>
                          </div>
                        )}
                      </td>
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
                            disabled={!connector || busy || connector.status === "paused" || !connector.config?.path}
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
