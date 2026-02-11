import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3005/api';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function main() {
  let createdTaskId = null;

  try {
    const projectsRes = await request('/projects');
    assert.equal(projectsRes.status, 200, 'GET /projects should return 200');
    const project = projectsRes.body.data?.[0];
    assert.ok(project?.id, 'Need at least one project for idempotency smoke');

    const sourceId = `smoke-source-${Date.now()}`;

    const firstUpsert = await request('/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify([
        {
          project_id: project.id,
          source_id: sourceId,
          title: 'Idempotency Smoke Task',
          status: 'pending',
          priority: 'P2',
          data_origin: 'synced'
        }
      ])
    });
    assert.equal(firstUpsert.status, 200, 'First /tasks/bulk should return 200');
    const firstTask = firstUpsert.body.data?.[0];
    assert.ok(firstTask?.id, 'First upsert should return task with id');
    createdTaskId = firstTask.id;

    const secondUpsert = await request('/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify([
        {
          project_id: project.id,
          source_id: sourceId,
          title: 'Idempotency Smoke Task',
          status: 'in_progress',
          priority: 'P1',
          data_origin: 'synced'
        }
      ])
    });
    assert.equal(secondUpsert.status, 200, 'Second /tasks/bulk should return 200');
    const secondTask = secondUpsert.body.data?.[0];
    assert.ok(secondTask?.id, 'Second upsert should return task with id');
    assert.equal(secondTask.id, firstTask.id, 'Second upsert should update same task id');

    const dbCheck = await admin
      .from('task')
      .select('id, status, priority, project_id, source_id')
      .eq('project_id', project.id)
      .eq('source_id', sourceId);

    assert.equal(dbCheck.error, null, `DB check failed: ${dbCheck.error?.message || 'unknown error'}`);
    assert.equal((dbCheck.data || []).length, 1, 'Expected exactly one task row for (project_id, source_id)');
    assert.equal(dbCheck.data[0].status, 'in_progress', 'Expected latest status from second upsert');
    assert.equal(dbCheck.data[0].priority, 'P1', 'Expected latest priority from second upsert');

    console.log('Idempotency smoke test passed.');
    console.log(`Base URL: ${BASE_URL}`);
  } finally {
    if (createdTaskId) {
      await admin.from('task').delete().eq('id', createdTaskId);
    }
  }
}

main().catch((error) => {
  console.error('Idempotency smoke test failed:', error.message);
  process.exit(1);
});
