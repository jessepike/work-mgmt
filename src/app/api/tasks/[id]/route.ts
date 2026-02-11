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
    const actor = await resolveActor(request, supabase);

    // 1. Fetch current task to check data_origin
    const { data: currentTask, error: fetchError } = await supabase
        .from('task')
        .select('data_origin, status')
        .eq('id', id)
        .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

    // 2. Enforce Data Origin Protection (BUG-3)
    if (currentTask.data_origin === 'synced') {
        const allowedFields = ['status'];
        const updateFields = Object.keys(body);
        const forbiddenFields = updateFields.filter(f => !allowedFields.includes(f));

        if (forbiddenFields.length > 0) {
            return NextResponse.json({
                error: `This task is synced from an external source. You can only update: ${allowedFields.join(', ')}. Forbidden fields: ${forbiddenFields.join(', ')}`
            }, { status: 403 });
        }
    }

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
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: 'updated',
        detail: body
    });

    return NextResponse.json({ data });
}
