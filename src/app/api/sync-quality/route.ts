import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getEnabledProjectIds } from '@/lib/api/enabled-projects';

type Severity = 'green' | 'yellow' | 'red';

interface SyncQualityRow {
    project_id: string;
    project_name: string;
    stage: string;
    connector_status: string;
    last_sync_at: string | null;
    last_sync_age_hours: number | null;
    synced_tasks: number;
    synced_backlog: number;
    synced_without_source: number;
    absolute_source_ids: number;
    duplicate_source_ids: number;
    duplicate_titles: number;
    severity: Severity;
}

function hoursSince(iso: string | null): number {
    if (!iso) return Number.POSITIVE_INFINITY;
    return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function normalizeTitle(title: string | null): string {
    if (!title) return '';
    return title
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s-]/g, '')
        .trim();
}

function isAbsoluteSourceId(value: string | null): boolean {
    if (!value) return false;
    const v = value.trim();
    if (v.startsWith('/')) return true;
    return /^[a-zA-Z]:[\\/]/.test(v);
}

function countDuplicateSourceIds(rows: Array<{ source_id: string | null }>): number {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const row of rows) {
        if (!row.source_id) continue;
        if (seen.has(row.source_id)) duplicates += 1;
        else seen.add(row.source_id);
    }
    return duplicates;
}

function countDuplicateTitles(rows: Array<{ title: string | null }>): number {
    const counts = new Map<string, number>();
    for (const row of rows) {
        const key = normalizeTitle(row.title);
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    let duplicates = 0;
    for (const count of counts.values()) {
        if (count > 1) duplicates += count - 1;
    }
    return duplicates;
}

function evaluateSeverity(row: Omit<SyncQualityRow, 'severity'>, staleHours: number): Severity {
    if (row.connector_status !== 'active') return 'red';
    if (!Number.isFinite(row.last_sync_age_hours || Number.POSITIVE_INFINITY)) return 'red';
    if ((row.last_sync_age_hours || Number.POSITIVE_INFINITY) > staleHours * 7) return 'red';
    if (row.duplicate_source_ids > 0) return 'red';
    if (row.synced_without_source > 0) return 'red';

    if ((row.last_sync_age_hours || Number.POSITIVE_INFINITY) > staleHours) return 'yellow';
    if (row.absolute_source_ids > 0) return 'yellow';
    if (row.duplicate_titles > 0) return 'yellow';

    return 'green';
}

// GET /api/sync-quality
export async function GET(request: NextRequest) {
    const supabase = await createServiceClient();
    const scope = request.nextUrl.searchParams.get('scope');
    const projectId = request.nextUrl.searchParams.get('project_id');
    const includeUnconfigured = request.nextUrl.searchParams.get('include_unconfigured') === '1';
    const staleHoursRaw = Number(request.nextUrl.searchParams.get('stale_hours') || '24');
    const staleHours = Number.isFinite(staleHoursRaw) && staleHoursRaw > 0 ? staleHoursRaw : 24;

    let projectQuery = supabase
        .from('project')
        .select('id, name, status, project_type, current_stage')
        .eq('status', 'active')
        .eq('project_type', 'connected');

    if (projectId) {
        projectQuery = projectQuery.eq('id', projectId);
    }

    const { data: projects, error: projectsError } = await projectQuery;
    if (projectsError) {
        return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    const projectRows = projects || [];
    if (projectRows.length === 0) {
        return NextResponse.json({
            data: {
                generated_at: new Date().toISOString(),
                stale_hours_threshold: staleHours,
                totals: {
                    projects: 0,
                    red: 0,
                    yellow: 0,
                    green: 0,
                    synced_tasks: 0,
                    synced_backlog: 0,
                },
                rows: [],
            },
        });
    }

    let scopedProjects = projectRows;
    if (scope === 'enabled') {
        const enabledIds = await getEnabledProjectIds(supabase, projectRows.map((p) => p.id));
        scopedProjects = projectRows.filter((p) => enabledIds.has(p.id));
    }

    if (scopedProjects.length === 0) {
        return NextResponse.json({
            data: {
                generated_at: new Date().toISOString(),
                stale_hours_threshold: staleHours,
                totals: {
                    projects: 0,
                    red: 0,
                    yellow: 0,
                    green: 0,
                    synced_tasks: 0,
                    synced_backlog: 0,
                },
                rows: [],
            },
        });
    }

    const scopedIds = scopedProjects.map((p) => p.id);

    const connectorRes = await supabase
        .from('connector')
        .select('project_id, connector_type, status, last_sync_at')
        .eq('connector_type', 'adf')
        .in('project_id', scopedIds);

    if (connectorRes.error) {
        return NextResponse.json({ error: connectorRes.error.message }, { status: 500 });
    }
    const connectors = connectorRes.data || [];
    const connectorByProject = new Map(connectors.map((c) => [c.project_id, c]));
    if (!includeUnconfigured) {
        scopedProjects = scopedProjects.filter((p) => connectorByProject.has(p.id));
    }
    if (scopedProjects.length === 0) {
        return NextResponse.json({
            data: {
                generated_at: new Date().toISOString(),
                stale_hours_threshold: staleHours,
                totals: {
                    projects: 0,
                    red: 0,
                    yellow: 0,
                    green: 0,
                    synced_tasks: 0,
                    synced_backlog: 0,
                },
                rows: [],
            },
        });
    }

    const finalProjectIds = scopedProjects.map((p) => p.id);
    const [tasksRes, backlogRes] = await Promise.all([
        supabase
            .from('task')
            .select('project_id, title, source_id')
            .eq('data_origin', 'synced')
            .in('project_id', finalProjectIds),
        supabase
            .from('backlog_item')
            .select('project_id, title, source_id')
            .eq('data_origin', 'synced')
            .in('project_id', finalProjectIds),
    ]);
    if (tasksRes.error) {
        return NextResponse.json({ error: tasksRes.error.message }, { status: 500 });
    }
    if (backlogRes.error) {
        return NextResponse.json({ error: backlogRes.error.message }, { status: 500 });
    }

    const tasksByProject = new Map<string, Array<{ title: string | null; source_id: string | null }>>();
    const backlogByProject = new Map<string, Array<{ title: string | null; source_id: string | null }>>();

    for (const task of tasksRes.data || []) {
        if (!tasksByProject.has(task.project_id)) tasksByProject.set(task.project_id, []);
        tasksByProject.get(task.project_id)!.push(task);
    }
    for (const item of backlogRes.data || []) {
        if (!backlogByProject.has(item.project_id)) backlogByProject.set(item.project_id, []);
        backlogByProject.get(item.project_id)!.push(item);
    }

    const rows: SyncQualityRow[] = scopedProjects.map((project) => {
        const connector = connectorByProject.get(project.id);
        const projectTasks = tasksByProject.get(project.id) || [];
        const projectBacklog = backlogByProject.get(project.id) || [];
        const combined = [...projectTasks, ...projectBacklog];

        const baseRow: Omit<SyncQualityRow, 'severity'> = {
            project_id: project.id,
            project_name: project.name,
            stage: project.current_stage || 'n/a',
            connector_status: connector?.status || 'missing',
            last_sync_at: connector?.last_sync_at || null,
            last_sync_age_hours: connector?.last_sync_at ? Number(hoursSince(connector.last_sync_at).toFixed(1)) : null,
            synced_tasks: projectTasks.length,
            synced_backlog: projectBacklog.length,
            synced_without_source: combined.filter((r) => !r.source_id || !r.source_id.trim()).length,
            absolute_source_ids: combined.filter((r) => isAbsoluteSourceId(r.source_id)).length,
            duplicate_source_ids: countDuplicateSourceIds(combined),
            duplicate_titles: countDuplicateTitles(combined),
        };

        return {
            ...baseRow,
            severity: evaluateSeverity(baseRow, staleHours),
        };
    });

    const severityOrder: Record<Severity, number> = { red: 0, yellow: 1, green: 2 };
    rows.sort((a, b) => {
        const rank = severityOrder[a.severity] - severityOrder[b.severity];
        if (rank !== 0) return rank;
        return a.project_name.localeCompare(b.project_name);
    });

    return NextResponse.json({
        data: {
            generated_at: new Date().toISOString(),
            stale_hours_threshold: staleHours,
            totals: {
                projects: rows.length,
                red: rows.filter((r) => r.severity === 'red').length,
                yellow: rows.filter((r) => r.severity === 'yellow').length,
                green: rows.filter((r) => r.severity === 'green').length,
                synced_tasks: rows.reduce((sum, row) => sum + row.synced_tasks, 0),
                synced_backlog: rows.reduce((sum, row) => sum + row.synced_backlog, 0),
            },
            rows,
        },
    });
}
