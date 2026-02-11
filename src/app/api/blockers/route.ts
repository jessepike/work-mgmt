import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/blockers
// Returns all blocked tasks across the portfolio
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();

    const { data: tasks, error } = await supabase
        .from('task')
        .select(`
            *,
            project:project_id (
                id,
                name
            )
        `)
        .eq('status', 'blocked')
        .order('priority', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: tasks });
}
