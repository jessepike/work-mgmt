import type { SupabaseClient } from '@supabase/supabase-js';

interface ProjectScopeRow {
    id: string;
    project_type: 'connected' | 'native';
}

interface ConnectorScopeRow {
    project_id: string;
    status: 'active' | 'paused' | 'error';
    config: { path?: string } | null;
}

function connectorHasPath(connector: ConnectorScopeRow): boolean {
    const path = connector?.config?.path;
    return typeof path === 'string' && path.trim().length > 0;
}

// Returns project IDs that should be visible in dashboard views:
// - all active native projects
// - active connected projects with an active ADF connector + configured repo path
export async function getEnabledProjectIds(
    supabase: SupabaseClient,
    projectIds?: string[]
): Promise<Set<string>> {
    let projectQuery = supabase
        .from('project')
        .select('id, project_type')
        .eq('status', 'active');

    if (projectIds && projectIds.length > 0) {
        projectQuery = projectQuery.in('id', projectIds);
    }

    const { data: projects, error: projectError } = await projectQuery;
    if (projectError) throw projectError;

    const rows = (projects || []) as ProjectScopeRow[];
    const enabled = new Set<string>();
    const connectedIds: string[] = [];

    for (const project of rows) {
        if (project.project_type === 'native') enabled.add(project.id);
        else connectedIds.push(project.id);
    }

    if (connectedIds.length === 0) return enabled;

    const { data: connectors, error: connectorError } = await supabase
        .from('connector')
        .select('project_id, status, config')
        .eq('connector_type', 'adf')
        .in('project_id', connectedIds);

    if (connectorError) throw connectorError;

    for (const connector of (connectors || []) as ConnectorScopeRow[]) {
        if (connector.status === 'active' && connectorHasPath(connector)) {
            enabled.add(connector.project_id);
        }
    }

    return enabled;
}
