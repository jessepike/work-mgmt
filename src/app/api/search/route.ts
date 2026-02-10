import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');

    if (!q) {
        return NextResponse.json({ data: [] });
    }

    // FTS on task
    // Using 'websearch_to_tsquery' or 'plainto_tsquery'
    // Columns `search_vector` are generated.

    const { data: tasks, error: taskError } = await supabase
        .from('task')
        .select('id, title, description, status, project_id, project:project_id(name)')
        .textSearch('search_vector', q, {
            type: 'websearch',
            config: 'english'
        })
        .limit(20);

    const { data: backlog, error: backlogError } = await supabase
        .from('backlog_item')
        .select('id, title, description, status, project_id, project:project_id(name)')
        .textSearch('search_vector', q, {
            type: 'websearch',
            config: 'english'
        })
        .limit(20);

    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
    if (backlogError) return NextResponse.json({ error: backlogError.message }, { status: 500 });

    // Combine and format
    const results = [
        ...(tasks || []).map(t => ({ ...t, type: 'task' })),
        ...(backlog || []).map(b => ({ ...b, type: 'backlog_item' }))
    ];

    return NextResponse.json({ data: results });
}
