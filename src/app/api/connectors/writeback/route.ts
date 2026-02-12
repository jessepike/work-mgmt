import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveActor } from "@/lib/api/actor";
import { logActivity } from "@/lib/api/activity";
import {
  applyEntityWriteback,
  applyStatusWriteback,
  type WritebackPatch,
  type WritebackPreview,
} from "@/lib/adf/writeback";

type Operation = {
  entity_type: "task" | "backlog_item" | "project_status";
  entity_id?: string;
  expected_updated_at?: string;
  patch: WritebackPatch;
};

async function resolveProjectPaths(projectPath: string) {
  const possibleStatusPaths = [
    path.join(projectPath, "status.md"),
    path.join(projectPath, "docs", "status.md"),
    path.join(projectPath, "docs", "adf", "status.md"),
  ];

  for (const p of possibleStatusPaths) {
    try {
      await fs.access(p);
      return { statusFile: p };
    } catch {
      // continue
    }
  }
  return { statusFile: "" };
}

function toError(operation: Operation, message: string) {
  return {
    entity_type: operation.entity_type,
    entity_id: operation.entity_id || null,
    error: message,
  };
}

// POST /api/connectors/writeback
// Governed write-back path for synced ADF entities.
export async function POST(request: NextRequest) {
  const supabase = await createServiceClient();
  const actor = await resolveActor(request, supabase, { actorType: "agent" });
  const body = await request.json();
  const projectId = body.project_id as string | undefined;
  const operations = (body.operations || []) as Operation[];
  const dryRun = body.dry_run === true;
  const strictConflicts = body.strict_conflicts !== false;

  if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  if (!Array.isArray(operations) || operations.length === 0) {
    return NextResponse.json({ error: "operations[] is required" }, { status: 400 });
  }

  const { data: connector, error: connectorError } = await supabase
    .from("connector")
    .select("*")
    .eq("project_id", projectId)
    .eq("connector_type", "adf")
    .single();
  if (connectorError || !connector) {
    return NextResponse.json({ error: "ADF connector not found for project" }, { status: 404 });
  }

  const projectPath = (connector.config as any)?.path as string | undefined;
  if (!projectPath) {
    return NextResponse.json({ error: "ADF connector path is not configured" }, { status: 400 });
  }

  const { statusFile } = await resolveProjectPaths(projectPath);

  const conflicts: Array<{ entity_type: string; entity_id: string | null; error: string }> = [];
  const previews: Array<{ operation: Operation; changes: WritebackPreview[] }> = [];
  const entityRows: Array<{ op: Operation; row: any }> = [];

  // Preflight.
  for (const op of operations) {
    try {
      if (op.entity_type === "project_status") {
        if (!statusFile) throw new Error("status.md not found for project");
        const changes = await applyStatusWriteback(statusFile, op.patch || {}, true);
        previews.push({ operation: op, changes });
        continue;
      }

      if (!op.entity_id) throw new Error("entity_id is required");
      const table = op.entity_type === "task" ? "task" : "backlog_item";
      const { data: rowData, error: rowError } = await supabase
        .from(table as any)
        .select("*")
        .eq("id", op.entity_id)
        .eq("project_id", projectId)
        .single();
      const row = rowData as any;
      if (rowError || !row) throw new Error(`${op.entity_type} not found`);
      if (row.data_origin !== "synced") throw new Error("Only synced entities are eligible for governed write-back");
      if (!row.source_id) throw new Error("synced entity missing source_id");
      if (op.expected_updated_at && row.updated_at !== op.expected_updated_at) {
        throw new Error(`conflict: expected_updated_at mismatch (expected ${op.expected_updated_at}, got ${row.updated_at})`);
      }

      const preview = await applyEntityWriteback(row.source_id, projectPath, op.patch || {}, true);
      previews.push({ operation: op, changes: [preview] });
      entityRows.push({ op, row });
    } catch (error) {
      conflicts.push(toError(op, error instanceof Error ? error.message : String(error)));
    }
  }

  if (conflicts.length > 0 && strictConflicts) {
    return NextResponse.json(
      { error: "writeback_conflict", conflicts, dry_run: true, applied: 0, previews },
      { status: 409 }
    );
  }

  if (dryRun) {
    return NextResponse.json({
      data: {
        project_id: projectId,
        dry_run: true,
        strict_conflicts: strictConflicts,
        applied: 0,
        conflicts,
        previews,
      },
    });
  }

  // Apply.
  const applied: Array<{ entity_type: string; entity_id: string | null; changes: WritebackPreview[] }> = [];

  for (const entry of previews) {
    const op = entry.operation;
    if (op.entity_type === "project_status") {
      const changes = await applyStatusWriteback(statusFile, op.patch || {}, false);
      const projectPatch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (typeof op.patch.current_stage === "string") projectPatch.current_stage = op.patch.current_stage;
      if (typeof op.patch.focus === "string") projectPatch.focus = op.patch.focus;
      if (Object.keys(projectPatch).length > 1) {
        await supabase.from("project").update(projectPatch).eq("id", projectId);
      }
      applied.push({ entity_type: "project_status", entity_id: projectId, changes });
      continue;
    }

    const resolved = entityRows.find((r) => r.op === op);
    if (!resolved) continue;
    const row = resolved.row;
    const table = op.entity_type === "task" ? "task" : "backlog_item";
    const change = await applyEntityWriteback(row.source_id, projectPath, op.patch || {}, false);

    const dbPatch: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of ["status", "priority", "title", "description"] as const) {
      if (op.patch[key] !== undefined) dbPatch[key] = op.patch[key];
    }
    await supabase.from(table as any).update(dbPatch).eq("id", row.id);

    applied.push({ entity_type: op.entity_type, entity_id: row.id, changes: [change] });
  }

  await supabase
    .from("connector")
    .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: "active" })
    .eq("project_id", projectId)
    .eq("connector_type", "adf");

  await logActivity({
    entityType: "project",
    entityId: projectId,
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "governed_writeback",
    detail: {
      dry_run: false,
      applied: applied.map((a) => ({ entity_type: a.entity_type, entity_id: a.entity_id })),
      conflicts,
    },
  });

  return NextResponse.json({
    data: {
      project_id: projectId,
      dry_run: false,
      strict_conflicts: strictConflicts,
      applied: applied.length,
      conflicts,
      applied_operations: applied,
    },
  });
}
