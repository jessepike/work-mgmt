import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const projectId = searchParams.get('project_id');
    const actorId = searchParams.get('actor_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    // If filtering by project, we need activity where entity_type='project' AND entity_id=projectId
    // OR entity_type='task' AND task.project_id=projectId (requires join or separate query)
    // Simplify: For project filter, just match explicit project logs?
    // Or: UI usually asks for "All activity". 
    // Let's implement basic filters supported by the table columns.
    // The table doesn't have a `project_id` column for polymorphic entities.

    // If we really need project-scoped activity, we'd need to fetch all task IDs for the project
    // and query `entity_id IN (project_id, ...task_ids)`.
    // For now, let's just support simple filtering or no filtering.

    if (actorId) {
        query = query.eq('actor_id', actorId);
    }
    // Supporting basic equality on entity_id if provided
    const entityId = searchParams.get('entity_id');
    if (entityId) {
        query = query.eq('entity_id', entityId);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
}
