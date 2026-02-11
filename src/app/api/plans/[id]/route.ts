import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { resolveActor } from '@/lib/api/actor';

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    // Get plan details? Or just use list?
    // Design didn't specify GET /api/plans/:id but usually useful.
    // Spec: "GET /api/plans/:id/phases" is there. 
    // Implementing basic GET for completeness.
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await createServiceClient();
    const { data, error } = await supabase.from('plan').select('*').eq('id', id).single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await createServiceClient();
    const body = await request.json();
    const actor = await resolveActor(request, supabase);

    const { data, error } = await supabase
        .from('plan')
        .update(body)
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
        entityType: 'plan',
        entityId: id,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: body.status ? 'status_changed' : 'updated',
        detail: body
    });

    return NextResponse.json({ data });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Not explicitly in spec but needed for cleanup/management
    // Soft delete not really spec'd for plans, but maybe cascade delete from project?
    // Let's implement hard delete for draft plans, or status='archived' if enum supports it?
    // Enum: draft, approved, in_progress, completed. No 'archived'.
    // We'll skip DELETE for now unless requested.
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
