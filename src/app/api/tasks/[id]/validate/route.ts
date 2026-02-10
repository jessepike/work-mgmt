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
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await createServiceClient();
    const body = await request.json(); // { validated_by, status: 'passed' | 'failed' }

    if (!body.status || !['passed', 'failed'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid validation status' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('task')
        .update({
            validation_status: body.status,
            validated_by: body.validated_by || 'jess',
            validated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
        entityType: 'task',
        entityId: id,
        actorType: 'human',
        actorId: body.validated_by || 'jess',
        action: 'validated',
        detail: { status: body.status }
    });

    return NextResponse.json({ data });
}
