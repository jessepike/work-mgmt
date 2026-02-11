import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/deadlines
// Returns upcoming task deadlines across the portfolio
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const now = new Date().toISOString();

    const { data: tasks, error } = await supabase
        .from('task')
        .select(`
            *,
            project:project_id (
                id,
                name,
                display_id_prefix
            )
        `)
        .neq('status', 'done')
        .not('deadline_at', 'is', null)
        .gte('deadline_at', now)
        .order('deadline_at', { ascending: true })
        .limit(20);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: tasks });
}
