import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params; // plan_id
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });

    const supabase = await createServiceClient();
    const body = await request.json();

    // Spec: POST /api/plans/:id/approve
    // Body: { approved_by }

    if (!body.approved_by) {
        return NextResponse.json({ error: 'approved_by is required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('plan')
        .update({
            status: 'approved',
            approved_by: body.approved_by,
            approved_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
        entityType: 'plan',
        entityId: id,
        actorType: 'human',
        actorId: body.approved_by, // The approver is the actor here? Or the user making the request?
        action: 'status_changed',
        detail: { status: 'approved' }
    });

    return NextResponse.json({ data });
}
