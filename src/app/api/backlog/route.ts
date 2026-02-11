import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';
import { resolveActor } from '@/lib/api/actor';

// GET /api/backlog
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    let query = supabase.from('backlog_item').select('*');
    if (projectId) query = query.eq('project_id', projectId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
