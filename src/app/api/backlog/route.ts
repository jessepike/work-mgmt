import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { resolveActor } from '@/lib/api/actor';
import { getEnabledProjectIds } from '@/lib/api/enabled-projects';

// GET /api/backlog
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const statuses = searchParams.get('status')?.split(',').map((s) => s.trim()).filter(Boolean) || [];
    const scope = searchParams.get('scope');
    const type = searchParams.get('type');

    let query = supabase.from('backlog_item').select(`
        *,
        project:project_id(id, name)
    `);
    if (projectId) query = query.eq('project_id', projectId);
    if (statuses.length > 0) query = query.in('status', statuses as any);
    if (type) query = query.eq('type', type);

    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (scope === 'enabled') {
        const enabledProjectIds = await getEnabledProjectIds(supabase);
        const scoped = (data || []).filter((item) => enabledProjectIds.has(item.project_id));
        return NextResponse.json({ data: scoped });
    }

    return NextResponse.json({ data });
}

// POST /api/backlog
export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json();
    const actor = await resolveActor(request, supabase);

    if (!body.project_id || !body.title) {
        return NextResponse.json({ error: 'project_id and title are required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('backlog_item')
        .insert({
            project_id: body.project_id,
            title: body.title,
            description: body.description,
            priority: body.priority,
            size: body.size,
            type: body.type,
            data_origin: body.data_origin || 'native',
            source_id: body.source_id,
            status: 'captured'
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
        entityType: 'backlog_item',
        entityId: data.id,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: 'captured',
        detail: { title: data.title }
    });

    return NextResponse.json({ data });
}
