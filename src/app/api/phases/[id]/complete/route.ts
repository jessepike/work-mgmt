import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { resolveActor } from '@/lib/api/actor';

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // phase_id
) {
    const { id } = await params;
    const supabase = await createServiceClient();
    const actor = await resolveActor(request, supabase);

    const { data, error } = await supabase
        .from('phase')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Clear project current_phase_id?
    if (data) {
        await supabase
            .from('project')
            .update({ current_phase_id: null }) // Or set to next?
            .eq('id', data.project_id)
            .eq('current_phase_id', id); // Only clear if it was this phase
    }

    await logActivity({
        entityType: 'phase',
        entityId: id,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: 'completed'
    });

    return NextResponse.json({ data });
}
