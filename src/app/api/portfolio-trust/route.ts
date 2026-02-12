import { NextRequest, NextResponse } from 'next/server';

// GET /api/portfolio-trust
// Aggregates portfolio execution status + sync trust quality into one dashboard payload.
export async function GET(request: NextRequest) {
    const scope = request.nextUrl.searchParams.get('scope') || 'enabled';
    const staleHours = request.nextUrl.searchParams.get('stale_hours') || '24';
    const origin = request.nextUrl.origin;
    const authorization = request.headers.get('authorization');
    const forwardHeaders = authorization ? { authorization } : undefined;

    const [statusRes, syncRes] = await Promise.all([
        fetch(`${origin}/api/projects/status?scope=${encodeURIComponent(scope)}`, {
            cache: 'no-store',
            headers: forwardHeaders,
        }),
        fetch(`${origin}/api/sync-quality?scope=${encodeURIComponent(scope)}&stale_hours=${encodeURIComponent(staleHours)}`, {
            cache: 'no-store',
            headers: forwardHeaders,
        }),
    ]);

    if (!statusRes.ok) {
        const errorText = await statusRes.text();
        return NextResponse.json({ error: `Failed to load projects status: ${errorText}` }, { status: 502 });
    }
    if (!syncRes.ok) {
        const errorText = await syncRes.text();
        return NextResponse.json({ error: `Failed to load sync quality: ${errorText}` }, { status: 502 });
    }

    const statusBody = await statusRes.json();
    const syncBody = await syncRes.json();
    const status = statusBody?.data || {};
    const syncQuality = syncBody?.data || {};

    const atRisk = Number(status?.by_health?.at_risk || 0);
    const unhealthy = Number(status?.by_health?.unhealthy || 0);
    const syncRed = Number(syncQuality?.totals?.red || 0);
    const syncYellow = Number(syncQuality?.totals?.yellow || 0);

    return NextResponse.json({
        data: {
            generated_at: new Date().toISOString(),
            scope,
            stale_hours_threshold: Number(staleHours) || 24,
            status,
            sync_quality: syncQuality,
            highlights: {
                at_risk_projects: atRisk,
                unhealthy_projects: unhealthy,
                sync_red_projects: syncRed,
                sync_yellow_projects: syncYellow,
                needs_attention: unhealthy > 0 || atRisk > 0 || syncRed > 0 || syncYellow > 0,
            },
        },
    });
}
