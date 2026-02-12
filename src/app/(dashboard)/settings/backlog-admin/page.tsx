"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/components/ui/Toast";

type ItemStatus = "Pending" | "In Progress" | "Partial" | "Done" | "Deferred" | "Archived";
type Priority = "P1" | "P2" | "P3" | null;
type Size = "S" | "M" | "L" | "XL" | null;

interface BacklogAdminItem {
  id: string;
  backlog_key: string;
  title: string;
  item_type: string | null;
  component: string | null;
  priority: Priority;
  size: Size;
  status: ItemStatus;
  notes: string | null;
  source_of_truth: "db" | "markdown" | "adf";
  sync_state: "in_sync" | "needs_export" | "needs_import" | "conflict";
  updated_at: string;
}

const STATUS_OPTIONS: ItemStatus[] = ["Pending", "In Progress", "Partial", "Done", "Deferred", "Archived"];

function sortByKey(a: BacklogAdminItem, b: BacklogAdminItem): number {
  const getNum = (key: string) => {
    const n = Number(key.replace(/^B/i, ""));
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  };
  return getNum(a.backlog_key) - getNum(b.backlog_key);
}

export default function BacklogAdminSettingsPage() {
  const [rows, setRows] = useState<BacklogAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState<"import" | "export" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ItemStatus>("all");
  const [createDraft, setCreateDraft] = useState({
    title: "",
    priority: "P2" as "P1" | "P2" | "P3",
    status: "Pending" as ItemStatus,
    component: "Dashboard",
  });
  const [editDraft, setEditDraft] = useState<Partial<BacklogAdminItem>>({});

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) || null,
    [rows, selectedId]
  );
  const filteredRows = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((row) => row.status === statusFilter)),
    [rows, statusFilter]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wm.settings.backlog.statusFilter");
      if (raw === "all" || STATUS_OPTIONS.includes(raw as ItemStatus)) {
        setStatusFilter(raw as "all" | ItemStatus);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("wm.settings.backlog.statusFilter", statusFilter);
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backlog-items");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Failed to load backlog admin items");
      const sorted = ((body.data || []) as BacklogAdminItem[]).sort(sortByKey);
      setRows(sorted);
      if (!selectedId && sorted.length > 0) setSelectedId(sorted[0].id);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to load backlog admin items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selected) {
      setEditDraft({});
      return;
    }
    setEditDraft({
      title: selected.title,
      item_type: selected.item_type,
      component: selected.component,
      priority: selected.priority,
      size: selected.size,
      status: selected.status,
      notes: selected.notes,
      source_of_truth: selected.source_of_truth,
    });
  }, [selected?.id]);

  async function createItem() {
    if (!createDraft.title.trim() || createBusy) return;
    setCreateBusy(true);
    try {
      const res = await fetch("/api/admin/backlog-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createDraft.title.trim(),
          priority: createDraft.priority,
          status: createDraft.status,
          component: createDraft.component || null,
          item_type: "Enhancement",
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Create failed");
      const item = body.data as BacklogAdminItem;
      setRows((prev) => [...prev, item].sort(sortByKey));
      setSelectedId(item.id);
      setCreateDraft((prev) => ({ ...prev, title: "" }));
      showToast("success", `Created ${item.backlog_key}`);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Create failed");
    } finally {
      setCreateBusy(false);
    }
  }

  async function saveSelected() {
    if (!selected || busy) return;
    setBusy(selected.id);
    try {
      const res = await fetch(`/api/admin/backlog-items/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title,
          item_type: editDraft.item_type,
          component: editDraft.component,
          priority: editDraft.priority,
          size: editDraft.size,
          status: editDraft.status,
          notes: editDraft.notes,
          source_of_truth: editDraft.source_of_truth,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Save failed");
      const updated = body.data as BacklogAdminItem;
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)).sort(sortByKey));
      showToast("success", `${updated.backlog_key} updated`);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSelected() {
    if (!selected || busy) return;
    const confirmed = window.confirm(`Delete ${selected.backlog_key}? This removes it from DB backlog admin.`);
    if (!confirmed) return;
    setBusy(selected.id);
    try {
      const res = await fetch(`/api/admin/backlog-items/${selected.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Delete failed");
      const nextRows = rows.filter((row) => row.id !== selected.id);
      setRows(nextRows);
      setSelectedId(nextRows[0]?.id || null);
      showToast("success", `${selected.backlog_key} deleted`);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function runSync(action: "import" | "export") {
    if (syncBusy) return;
    setSyncBusy(action);
    try {
      const res = await fetch("/api/admin/backlog-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `${action} failed`);
      await load();
      showToast("success", action === "import" ? `Imported ${body?.data?.imported || 0} rows` : `Exported ${body?.data?.exported || 0} rows`);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setSyncBusy(null);
    }
  }

  return (
    <div className="p-8 lg:p-12 bg-zed-main min-h-full">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h2>
              <p className="text-xs text-text-secondary mt-1">Backlog admin (DB-first) for Work Management</p>
            </div>
            <div className="flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50">
              <Link
                href="/settings"
                className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-secondary"
              >
                Sync
              </Link>
              <Link
                href="/settings/backlog-admin"
                className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-zed-active text-primary rounded-sm shadow-sm"
              >
                Backlog Admin
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
          <section className="rounded-lg border border-zed-border overflow-hidden bg-zed-sidebar/20">
            <div className="px-4 py-3 border-b border-zed-border bg-zed-header/30">
              <div className="text-[11px] font-bold tracking-widest uppercase text-text-secondary">Create Backlog Item</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={createDraft.title}
                  onChange={(e) => setCreateDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Describe the backlog item"
                  className="flex-1 min-w-[240px] bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                />
                <select
                  value={createDraft.priority}
                  onChange={(e) => setCreateDraft((prev) => ({ ...prev, priority: e.target.value as "P1" | "P2" | "P3" }))}
                  className="bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                >
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
                <select
                  value={createDraft.status}
                  onChange={(e) => setCreateDraft((prev) => ({ ...prev, status: e.target.value as ItemStatus }))}
                  className="bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button
                  onClick={() => void createItem()}
                  disabled={createBusy || !createDraft.title.trim()}
                  className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded bg-zed-active border border-zed-border text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zed-hover"
                >
                  {createBusy ? "Creating..." : "Add Item"}
                </button>
                <button
                  onClick={() => void runSync("import")}
                  disabled={syncBusy !== null}
                  className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded border border-zed-border text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zed-hover"
                >
                  {syncBusy === "import" ? "Importing..." : "Import MD -> DB"}
                </button>
                <button
                  onClick={() => void runSync("export")}
                  disabled={syncBusy !== null}
                  className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded border border-zed-border text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zed-hover"
                >
                  {syncBusy === "export" ? "Exporting..." : "Export DB -> MD"}
                </button>
              </div>
            </div>

            <div className="max-h-[560px] overflow-auto custom-scrollbar">
              {loading ? (
                <div className="p-4 text-sm text-text-muted">Loading backlog items...</div>
              ) : rows.length === 0 ? (
                <div className="p-4 text-sm text-text-muted">No backlog admin items yet.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zed-header/20 border-b border-zed-border text-text-muted uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Pri</th>
                      <th className="px-3 py-2">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as "all" | ItemStatus)}
                          className="bg-zed-main border border-zed-border rounded px-2 py-1 text-[10px] text-text-primary"
                        >
                          <option value="all">All</option>
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </th>
                      <th className="px-3 py-2">Sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-b border-zed-border/50 cursor-pointer ${selectedId === row.id ? "bg-zed-active/40" : "hover:bg-zed-hover/50"}`}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td className="px-3 py-2 font-mono text-text-secondary">{row.backlog_key}</td>
                        <td className="px-3 py-2 text-text-primary truncate max-w-[260px]">{row.title}</td>
                        <td className="px-3 py-2 text-text-secondary">{row.priority || "—"}</td>
                        <td className="px-3 py-2 text-text-secondary">{row.status}</td>
                        <td className="px-3 py-2 text-text-muted">{row.sync_state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zed-border overflow-hidden bg-zed-sidebar/20">
            <div className="px-4 py-3 border-b border-zed-border bg-zed-header/30">
              <div className="text-[11px] font-bold tracking-widest uppercase text-text-secondary">Edit Selected Item</div>
            </div>
            {!selected ? (
              <div className="p-4 text-sm text-text-muted">Select a row to edit.</div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="text-[11px] text-text-muted">Key: <span className="font-mono text-text-secondary">{selected.backlog_key}</span></div>
                <Field label="Title">
                  <input
                    value={String(editDraft.title || "")}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={String(editDraft.status || selected.status)}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value as ItemStatus }))}
                    className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Priority">
                    <select
                      value={String(editDraft.priority || selected.priority || "")}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, priority: (e.target.value || null) as Priority }))}
                      className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                    >
                      <option value="">None</option>
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="P3">P3</option>
                    </select>
                  </Field>
                  <Field label="Size">
                    <select
                      value={String(editDraft.size || selected.size || "")}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, size: (e.target.value || null) as Size }))}
                      className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                    >
                      <option value="">None</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type">
                    <input
                      value={String(editDraft.item_type || selected.item_type || "")}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, item_type: e.target.value || null }))}
                      className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                    />
                  </Field>
                  <Field label="Component">
                    <input
                      value={String(editDraft.component || selected.component || "")}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, component: e.target.value || null }))}
                      className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                    />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea
                    value={String(editDraft.notes || selected.notes || "")}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, notes: e.target.value || null }))}
                    rows={5}
                    className="w-full bg-zed-main border border-zed-border rounded px-2 py-2 text-xs text-text-primary"
                  />
                </Field>
                <Field label="Source of Truth">
                  <select
                    value={String(editDraft.source_of_truth || selected.source_of_truth)}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, source_of_truth: e.target.value as "db" | "markdown" | "adf" }))}
                    className="w-full bg-zed-main border border-zed-border rounded px-2 py-1.5 text-xs text-text-primary"
                  >
                    <option value="db">db</option>
                    <option value="markdown">markdown</option>
                    <option value="adf">adf</option>
                  </select>
                </Field>
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-text-muted">Sync state: <span className="text-text-secondary">{selected.sync_state}</span></div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void deleteSelected()}
                      disabled={busy === selected.id}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded border border-status-red/40 text-status-red disabled:opacity-40 disabled:cursor-not-allowed hover:bg-status-red/10"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => void saveSelected()}
                      disabled={busy === selected.id}
                      className="px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded bg-zed-active border border-zed-border text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zed-hover"
                    >
                      {busy === selected.id ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
