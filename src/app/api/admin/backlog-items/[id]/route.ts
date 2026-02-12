import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveActor } from "@/lib/api/actor";
import { logActivity } from "@/lib/api/activity";
import { resolveBacklogAdminProjectId } from "@/lib/api/backlog-admin";

const VALID_STATUSES = new Set(["Pending", "In Progress", "Partial", "Done", "Deferred", "Archived"]);

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const supabase = await createServiceClient();
    const actor = await resolveActor(request, supabase);
    const projectId = await resolveBacklogAdminProjectId(supabase);
    const body = await request.json();

    if (body.status && !VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.item_type === "string" || body.item_type === null) patch.item_type = body.item_type;
    if (typeof body.component === "string" || body.component === null) patch.component = body.component;
    if (typeof body.priority === "string" || body.priority === null) patch.priority = body.priority;
    if (typeof body.size === "string" || body.size === null) patch.size = body.size;
    if (typeof body.status === "string") patch.status = body.status;
    if (typeof body.notes === "string" || body.notes === null) patch.notes = body.notes;
    if (typeof body.source_of_truth === "string") patch.source_of_truth = body.source_of_truth;
    patch.sync_state = "needs_export";

    const { data, error } = await supabase
        .from("backlog_admin_item" as any)
        .update(patch)
        .eq("id", id)
        .eq("project_id", projectId)
        .select("*")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const row = data as any;

    await logActivity({
        entityType: "project",
        entityId: projectId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "backlog_admin_item_updated",
        detail: { id, backlog_key: row?.backlog_key || null, updates: Object.keys(patch) }
    });

    return NextResponse.json({ data });
}
