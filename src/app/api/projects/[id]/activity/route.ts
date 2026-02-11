import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });

    const supabase = await createServiceClient();
    const rawLimit = parseInt(request.nextUrl.searchParams.get('limit') || '40', 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 200)) : 40;

    const [{ data: taskRows, error: taskError }, { data: backlogRows, error: backlogError }] = await Promise.all([
        supabase.from('task').select('id').eq('project_id', id),
        supabase.from('backlog_item').select('id').eq('project_id', id),
    ]);

    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
    if (backlogError) return NextResponse.json({ error: backlogError.message }, { status: 500 });

    const taskIds = (taskRows || []).map((row) => row.id);
    const backlogIds = (backlogRows || []).map((row) => row.id);

    const queries = [
        supabase
            .from('activity_log')
            .select('*')
            .eq('entity_type', 'project')
            .eq('entity_id', id)
            .limit(limit),
        supabase
            .from('activity_log')
            .select('*')
            .eq('entity_type', 'connector')
            .eq('entity_id', id)
            .limit(limit),
    ];

    if (taskIds.length > 0) {
        queries.push(
            supabase
                .from('activity_log')
                .select('*')
                .eq('entity_type', 'task')
                .in('entity_id', taskIds)
                .limit(limit)
        );
    }

    if (backlogIds.length > 0) {
        queries.push(
            supabase
                .from('activity_log')
                .select('*')
                .eq('entity_type', 'backlog_item')
                .in('entity_id', backlogIds)
                .limit(limit)
        );
    }

    const results = await Promise.all(queries);
    for (const result of results) {
        if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const merged = results
        .flatMap((result) => result.data || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);

    return NextResponse.json({ data: merged });
}
