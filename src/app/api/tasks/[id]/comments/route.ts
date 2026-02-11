import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveActor } from "@/lib/api/actor";
import { logActivity } from "@/lib/api/activity";

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const supabase = await createServiceClient();

    const { data: events, error } = await supabase
        .from("activity_log")
        .select("id, actor_id, created_at, detail")
        .eq("entity_type", "task")
        .eq("entity_id", id)
        .eq("action", "commented")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const actorIds = Array.from(new Set((events || []).map((e) => e.actor_id).filter(Boolean)));
    const actorNames = new Map<string, string>();
    if (actorIds.length > 0) {
        const { data: actors } = await supabase
            .from("actor_registry")
            .select("id, name")
            .in("id", actorIds);
        for (const actor of actors || []) actorNames.set(actor.id, actor.name);
    }

    const rows = (events || []).map((event) => ({
        id: event.id,
        actor_id: event.actor_id,
        actor_name: actorNames.get(event.actor_id) || event.actor_id,
        created_at: event.created_at,
        comment: extractComment(event.detail),
    }));

    return NextResponse.json({ data: rows });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";
    if (!comment) {
        return NextResponse.json({ error: "comment is required" }, { status: 400 });
    }
    if (comment.length > 5000) {
        return NextResponse.json({ error: "comment exceeds 5000 characters" }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const actor = await resolveActor(request, supabase);

    const { data: taskExists, error: taskError } = await supabase
        .from("task")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
    if (!taskExists) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    await logActivity({
        entityType: "task",
        entityId: id,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: "commented",
        detail: { comment }
    });

    return NextResponse.json({ data: { ok: true } });
}

function extractComment(detail: unknown): string {
    if (!detail || typeof detail !== "object") return "";
    const raw = (detail as Record<string, unknown>).comment;
    return typeof raw === "string" ? raw : "";
}
