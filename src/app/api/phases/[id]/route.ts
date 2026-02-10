import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // phase_id
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
        .from('phase')
        .update(body)
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
        entityType: 'phase',
        entityId: id,
        actorType: 'human',
        actorId: 'jess',
        action: body.status ? 'status_changed' : 'updated',
        detail: body
    });

    return NextResponse.json({ data });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await createServiceClient();

    // Cascade delete handles phases if plan is deleted, but creating a delete endpoint for phase
    // requires reordering other phases? Or just leave gaps?
    // Let's implement delete without reordering for MVP.
    const { error } = await supabase.from('phase').delete().eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
