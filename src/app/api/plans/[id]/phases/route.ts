import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

// GET /api/plans/:id/phases
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // plan_id
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });

    const supabase = await createServiceClient();

    const { data, error } = await supabase
        .from('phase')
        .select('*')
        .eq('plan_id', id)
        .order('sort_order', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}

// POST /api/plans/:id/phases
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // plan_id
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });

    const supabase = await createServiceClient();
    const body = await request.json();

    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    // 1. Get plan to get project_id (needed for phase table)
    const { data: plan, error: planError } = await supabase
        .from('plan')
        .select('project_id')
        .eq('id', id)
        .single();

    if (planError || !plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    // 2. Get max sort_order
    const { data: phases, error: phasesError } = await supabase
        .from('phase')
        .select('sort_order')
        .eq('plan_id', id)
        .order('sort_order', { ascending: false }) // Sort desc to get max
        .limit(1);

    const nextSortOrder = phases && phases.length > 0 ? phases[0].sort_order + 1 : 1;

    // 3. Create phase
    const { data, error } = await supabase
        .from('phase')
        .insert({
            plan_id: id,
            project_id: plan.project_id,
            name: body.name,
            description: body.description,
            sort_order: nextSortOrder,
            status: 'pending' // Default
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
        entityType: 'phase',
        entityId: data.id,
        actorType: 'human',
        actorId: 'jess',
        action: 'created',
        detail: { name: body.name }
    });

    return NextResponse.json({ data });
}
