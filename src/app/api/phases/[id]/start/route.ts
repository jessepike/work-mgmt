import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';

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

    // Logic: promote current phase to 'active', maybe complete previous 'active' phase?
    // Or just set status.
    // Spec doesn't strictly define complex state transitions for phases, so generic PATCH is likely enough.
    // BUT common action is "start phase"

    const { data, error } = await supabase
        .from('phase')
        .update({
            status: 'active',
            started_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update project current_phase_id if needed? 
    // Data model has `project.current_phase_id`. We should update that too.
    if (data) {
        await supabase.from('project').update({ current_phase_id: id }).eq('id', data.project_id);
    }

    await logActivity({
        entityType: 'phase',
        entityId: id,
        actorType: 'human',
        actorId: 'jess',
        action: 'started'
    });

    return NextResponse.json({ data });
}
