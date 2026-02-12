import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveActor } from "@/lib/api/actor";
import { logActivity } from "@/lib/api/activity";
import { nextBacklogKeyFromRows, resolveBacklogAdminProjectId } from "@/lib/api/backlog-admin";

const VALID_STATUSES = new Set(["Pending", "In Progress", "Partial", "Done", "Deferred", "Archived"]);

export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const projectId = await resolveBacklogAdminProjectId(supabase);
    const statuses = (request.nextUrl.searchParams.get("status") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    let query = supabase
        .from("backlog_admin_item" as any)
        .select("*")
        .eq("project_id", projectId);

    if (statuses.length > 0) {
        query = query.in("status", statuses);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const sorted = (data || []).sort((a: any, b: any) => keyNum(a.backlog_key) - keyNum(b.backlog_key));
    return NextResponse.json({ data: sorted });
}

export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json();
    const projectId = await resolveBacklogAdminProjectId(supabase);
    const actor = await resolveActor(request, supabase);

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const status = typeof body?.status === "string" ? body.status.trim() : "Pending";
    if (!VALID_STATUSES.has(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let backlogKey = typeof body?.backlog_key === "string" ? body.backlog_key.trim().toUpperCase() : "";
    if (!backlogKey) {
        const { data: keys, error: keyErr } = await supabase
            .from("backlog_admin_item" as any)
            .select("backlog_key")
            .eq("project_id", projectId);
        if (keyErr) return NextResponse.json({ error: keyErr.message }, { status: 500 });
        backlogKey = nextBacklogKeyFromRows(((keys || []) as unknown) as Array<{ backlog_key: string }>);
    }

    const payload = {
        project_id: projectId,
        backlog_key: backlogKey,
        title,
        item_type: body?.item_type || null,
        component: body?.component || null,
        priority: body?.priority || null,
        size: body?.size || null,
        status,
        notes: body?.notes || null,
        source_of_truth: body?.source_of_truth || "db",
        sync_state: "needs_export",
    };

    const { data, error } = await supabase
        .from("backlog_admin_item" as any)
        .insert(payload)
        .select("*")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const row = data as any;

    await logActivity({
        entityType: "project",
        entityId: projectId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "backlog_admin_item_created",
        detail: { backlog_key: row?.backlog_key || null, title: row?.title || null }
    });

    return NextResponse.json({ data });
}

function keyNum(backlogKey: string): number {
    const n = Number((backlogKey || "").replace(/^B/i, ""));
    if (!Number.isFinite(n)) return Number.MAX_SAFE_INTEGER;
    return n;
}
