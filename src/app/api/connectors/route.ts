import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/connectors
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const type = searchParams.get('connector_type');

    let query = supabase.from('connector').select('*');
    if (projectId) query = query.eq('project_id', projectId);
    if (type) query = query.eq('connector_type', type);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}

// POST /api/connectors
export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json();
    if (!body.project_id || !body.connector_type) {
        return NextResponse.json({ error: 'project_id and connector_type are required' }, { status: 400 });
    }

    // Manual upsert to avoid relying on a DB unique constraint that may not exist yet.
    const { data: existing, error: existingError } = await supabase
        .from('connector')
        .select('id')
        .eq('project_id', body.project_id)
        .eq('connector_type', body.connector_type)
        .maybeSingle();

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

    if (existing?.id) {
        const { data, error } = await supabase
            .from('connector')
            .update({
                status: body.status || 'active',
                config: body.config || {},
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data });
    }

    const { data, error } = await supabase
        .from('connector')
        .insert({
            project_id: body.project_id,
            connector_type: body.connector_type,
            status: body.status || 'active',
            config: body.config || {},
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}
