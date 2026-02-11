import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
        .from('actor_registry')
        .select('id, name, type, active')
        .eq('active', true)
        .order('name', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
}
