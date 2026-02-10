import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await createServiceClient();
    const { data, error } = await supabase
        .from('task')
        .select(`
            *,
            project:project_id(name),
            plan:plan_id(name),
            phase:phase_id(name)
        `)
        .eq('id', id)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
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

    const { data, error } = await supabase
        .from('task')
        .update(body)
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
        entityType: 'task',
        entityId: id,
        actorType: 'human',
        actorId: 'jess',
        action: 'updated',
        detail: body
    });

    return NextResponse.json({ data });
}
