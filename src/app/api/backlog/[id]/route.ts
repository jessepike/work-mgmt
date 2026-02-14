import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { resolveActor } from '@/lib/api/actor';

// GET /api/backlog/:id
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const supabase = await createServiceClient();

    const { data, error } = await supabase
        .from('backlog_item')
        .select('*, project:project_id(id, name)')
        .eq('id', id)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ data });
}

// PATCH /api/backlog/:id
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const supabase = await createServiceClient();
    const body = await request.json();
    const actor = await resolveActor(request, supabase);

    // Only allow updating safe fields
    const allowedFields = ['title', 'description', 'status', 'priority', 'size', 'notes', 'type', 'component'];
    const patch: Record<string, any> = {};
    for (const key of allowedFields) {
        if (key in body) patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Check data_origin — synced items must go through governed writeback
    const { data: existing } = await supabase
        .from('backlog_item')
        .select('data_origin')
        .eq('id', id)
        .single();

    if (existing?.data_origin === 'synced') {
        return NextResponse.json({ error: 'Synced items must be updated via governed writeback' }, { status: 403 });
    }

    const { data, error } = await supabase
        .from('backlog_item')
        .update(patch)
        .eq('id', id)
        .select('*, project:project_id(id, name)')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
        entityType: 'backlog_item',
        entityId: id,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: 'updated',
        detail: patch,
    });

    return NextResponse.json({ data });
}
