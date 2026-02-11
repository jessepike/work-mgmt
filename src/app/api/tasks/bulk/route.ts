import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/api/activity';

// POST /api/tasks/bulk
// Upsert multiple tasks at once. 
// Match by (project_id, source_id) if source_id is provided.
export async function POST(request: NextRequest) {
    const supabase = await createServiceClient();
    const body = await request.json();

    if (!Array.isArray(body)) {
        return NextResponse.json({ error: 'Body must be an array of tasks' }, { status: 400 });
    }

    const results = {
        created: 0,
        updated: 0,
        failed: 0,
        errors: [] as string[]
    };

    // For each item, decide whether to insert or update.
    // Supabase .upsert() with onConflict('project_id, source_id') is ideal if we have a unique constraint.
    // Let's check if we can use .upsert(). 
    // We added a unique index on (project_id, source_id) in migration 000003_tasks.

    const { data, error } = await supabase
        .from('task')
        .upsert(body.map(item => ({
            ...item,
            updated_at: new Date().toISOString()
        })), {
            onConflict: 'project_id, source_id',
            ignoreDuplicates: false // We want to update status if matched
        })
        .select();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log bulk activity
    await logActivity({
        entityType: 'project',
        entityId: body[0]?.project_id, // Assume same project for bulk
        actorType: 'connector',
        actorId: 'adf-sync',
        action: 'bulk_sync',
        detail: { count: body.length }
    });

    return NextResponse.json({ data });
}
