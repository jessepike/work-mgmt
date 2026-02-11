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

    const { data, error } = await supabase
        .from('connector')
        .upsert({
            project_id: body.project_id,
            connector_type: body.connector_type,
            status: body.status || 'active',
            config: body.config,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'project_id, connector_type'
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}
