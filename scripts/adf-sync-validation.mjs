import process from 'node:process';

const API_URL = process.env.API_URL || 'http://localhost:3005/api';
const API_SECRET = process.env.API_SECRET;
const LIMIT = Number(process.env.SYNC_LIMIT || '3');
const ONLY_PROJECT_IDS = (process.env.SYNC_PROJECT_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function api(path, init = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(API_SECRET ? { authorization: `Bearer ${API_SECRET}` } : {}),
      ...(init.headers || {})
    }
  });

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const detail = body?.error || body?.message || `${res.status} ${res.statusText}`;
    throw new Error(`${init.method || 'GET'} ${path} failed: ${detail}`);
  }

  return body;
}

async function main() {
  console.log(`ADF sync validation against ${API_URL}`);

  const connectorsRes = await api('/connectors?connector_type=adf');
  const connectors = (connectorsRes?.data || []).filter((c) => c.status === 'active');

  const scopedConnectors = ONLY_PROJECT_IDS.length > 0
    ? connectors.filter((c) => ONLY_PROJECT_IDS.includes(c.project_id))
    : connectors;

  const selected = scopedConnectors.slice(0, LIMIT);

  if (selected.length === 0) {
    console.log('No active ADF connectors available for validation.');
    process.exit(0);
  }

  const results = [];

  for (const connector of selected) {
    const projectId = connector.project_id;
    process.stdout.write(`- Syncing ${projectId}... `);

    try {
      const syncRes = await api('/connectors/sync', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      });

      const row = {
        project_id: projectId,
        ok: true,
        count: syncRes.count || 0,
        tasks_count: syncRes.tasks_count || 0,
        backlog_count: syncRes.backlog_count || 0,
        status_synced: !!syncRes.status_synced,
        error: ''
      };

      results.push(row);
      console.log(`ok (count=${row.count}, tasks=${row.tasks_count}, backlog=${row.backlog_count}, status=${row.status_synced})`);
    } catch (error) {
      const row = {
        project_id: projectId,
        ok: false,
        count: 0,
        tasks_count: 0,
        backlog_count: 0,
        status_synced: false,
        error: error instanceof Error ? error.message : String(error)
      };

      results.push(row);
      console.log('failed');
      console.error(`  ${row.error}`);
    }
  }

  const failed = results.filter((r) => !r.ok);

  console.log('\nValidation summary:');
  for (const r of results) {
    console.log(
      `${r.ok ? 'PASS' : 'FAIL'} project=${r.project_id} count=${r.count} tasks=${r.tasks_count} backlog=${r.backlog_count} status=${r.status_synced}`
    );
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
