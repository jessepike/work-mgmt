import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getEnabledProjectIds } from '@/lib/api/enabled-projects';

export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const scope = searchParams.get('scope');
    const projectId = searchParams.get('project_id');

    const rawLimit = Number(searchParams.get('limit') || '40');
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 200)) : 40;

    if (!q) {
        return NextResponse.json({ data: [] });
    }

    const enabledProjectIds = scope === 'enabled' ? await getEnabledProjectIds(supabase) : null;
    const allowedProjectIds = enabledProjectIds
        ? Array.from(enabledProjectIds).filter((id) => !projectId || id === projectId)
        : projectId
            ? [projectId]
            : null;

    if (allowedProjectIds && allowedProjectIds.length === 0) {
        return NextResponse.json({ data: [] });
    }

    let taskQuery = supabase
        .from('task')
        .select('id, display_id, title, description, notes, status, priority, deadline_at, updated_at, data_origin, project_id, project:project_id(id, name)')
        .textSearch('search_vector', q, {
            type: 'websearch',
            config: 'english'
        })
        .order('updated_at', { ascending: false })
        .limit(limit);

    let backlogQuery = supabase
        .from('backlog_item')
        .select('id, title, description, notes, status, priority, updated_at, data_origin, project_id, project:project_id(id, name)')
        .textSearch('search_vector', q, {
            type: 'websearch',
            config: 'english'
        })
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (allowedProjectIds) {
        taskQuery = taskQuery.in('project_id', allowedProjectIds);
        backlogQuery = backlogQuery.in('project_id', allowedProjectIds);
    }

    const [{ data: tasks, error: taskError }, { data: backlog, error: backlogError }] = await Promise.all([
        taskQuery,
        backlogQuery,
    ]);

    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
    if (backlogError) return NextResponse.json({ error: backlogError.message }, { status: 500 });

    // Combine and format
    const results = [
        ...(tasks || []).map(t => ({ ...t, type: 'task' })),
        ...(backlog || []).map(b => ({ ...b, type: 'backlog_item' }))
    ];

    const ranked = results.sort((a: any, b: any) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        const queryLower = q.toLowerCase();
        const titlePrefixA = titleA.startsWith(queryLower) ? 0 : 1;
        const titlePrefixB = titleB.startsWith(queryLower) ? 0 : 1;
        if (titlePrefixA !== titlePrefixB) return titlePrefixA - titlePrefixB;

        const updatedA = new Date(a.updated_at || 0).getTime();
        const updatedB = new Date(b.updated_at || 0).getTime();
        return updatedB - updatedA;
    });

    return NextResponse.json({ data: ranked.slice(0, limit) });
}
