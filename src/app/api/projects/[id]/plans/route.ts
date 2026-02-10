import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';

// Helper to validate UUID
function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

// GET /api/projects/:id/plans
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) {
        return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: plans, error } = await supabase
        .from('plan')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: plans });
}

// POST /api/projects/:id/plans
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) {
        return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const body = await request.json();

    if (!body.name) {
        return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }

    // 1. Check if project is planned workflow
    const { data: project, error: projectError } = await supabase
        .from('project')
        .select('workflow_type')
        .eq('id', id)
        .single();

    if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.workflow_type !== 'planned') {
        return NextResponse.json({ error: 'Cannot create plan for flat project' }, { status: 400 });
    }

    // 2. Check one-active-plan constraint API-side check
    // (DB index also enforces this, but decent error message here is better)
    const { count } = await supabase
        .from('plan')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id)
        .neq('status', 'completed');

    if (count && count > 0) {
        return NextResponse.json({
            error: 'Project already has an active plan. Complete it before creating a new one.'
        }, { status: 409 });
    }

    // 3. Create plan
    const { data, error } = await supabase
        .from('plan')
        .insert({
            project_id: id,
            name: body.name,
            description: body.description,
            status: 'draft'
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Project already has an active plan' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity({
        entityType: 'plan',
        entityId: data.id,
        actorType: 'human',
        actorId: 'jess', // Placeholder
        action: 'created',
        detail: { name: body.name }
    });

    return NextResponse.json({ data });
}
