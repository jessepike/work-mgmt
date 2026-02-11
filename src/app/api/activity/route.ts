import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const VALID_ENTITY_TYPES = new Set([
    'project',
    'plan',
    'phase',
    'task',
    'backlog_item',
    'connector'
]);

export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const projectId = searchParams.get('project_id');
    const actorId = searchParams.get('actor_id');
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 200)) : 50;

    if (entityType && !VALID_ENTITY_TYPES.has(entityType)) {
        return NextResponse.json(
            { error: `Invalid entity_type. Expected one of: ${Array.from(VALID_ENTITY_TYPES).join(', ')}` },
            { status: 400 }
        );
    }

    let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (actorId) {
        query = query.eq('actor_id', actorId);
    }

    if (entityType) {
        query = query.eq('entity_type', entityType);
    }

    // Compatibility alias: project_id is treated as entity_type=project + entity_id=project_id
    if (projectId && !entityId && !entityType) {
        query = query.eq('entity_type', 'project').eq('entity_id', projectId);
    }

    if (entityId) {
        query = query.eq('entity_id', entityId);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
}
