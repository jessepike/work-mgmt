import assert from 'node:assert/strict';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3005/api';

async function getJson(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

function assertEnvelope(result, path) {
  assert.equal(result.status, 200, `${path} should return HTTP 200`);
  assert.ok(result.body && typeof result.body === 'object', `${path} should return JSON object`);
  assert.ok('data' in result.body, `${path} should return { data: ... } envelope`);
}

function hasKeys(obj, keys, label) {
  for (const key of keys) {
    assert.ok(key in obj, `${label} missing key: ${key}`);
  }
}

async function main() {
  const projects = await getJson('/projects');
  assertEnvelope(projects, '/projects');
  assert.ok(Array.isArray(projects.body.data), '/projects data should be an array');

  if (projects.body.data.length > 0) {
    const first = projects.body.data[0];
    hasKeys(first, ['id', 'name', 'status', 'project_type', 'workflow_type', 'health', 'task_summary'], 'projects[0]');

    const projectDetail = await getJson(`/projects/${first.id}`);
    assertEnvelope(projectDetail, '/projects/:id');
    assert.ok(projectDetail.body.data && typeof projectDetail.body.data === 'object', '/projects/:id data should be an object');
    hasKeys(
      projectDetail.body.data,
      ['id', 'plans', 'phases', 'task_summary', 'health', 'active_blockers', 'current_plan'],
      'project detail'
    );
    assert.ok(Array.isArray(projectDetail.body.data.plans), 'project detail plans should be array');
    assert.ok(Array.isArray(projectDetail.body.data.phases), 'project detail phases should be array');
  }

  const tasks = await getJson('/tasks');
  assertEnvelope(tasks, '/tasks');
  assert.ok(Array.isArray(tasks.body.data), '/tasks data should be an array');

  const whatsNext = await getJson('/whats-next');
  assertEnvelope(whatsNext, '/whats-next');
  assert.ok(Array.isArray(whatsNext.body.data), '/whats-next data should be an array');
  if (whatsNext.body.data.length > 0) {
    const top = whatsNext.body.data[0];
    hasKeys(top, ['id', 'title', 'status', 'score', 'match_reasons'], 'whats-next[0]');
    assert.ok(Array.isArray(top.match_reasons), 'whats-next[0].match_reasons should be an array');
  }

  const portfolioStatus = await getJson('/projects/status');
  assertEnvelope(portfolioStatus, '/projects/status');
  hasKeys(
    portfolioStatus.body.data,
    ['total_projects', 'by_status', 'by_health', 'task_summary', 'upcoming_deadlines'],
    'projects/status'
  );
  assert.ok(Array.isArray(portfolioStatus.body.data.upcoming_deadlines), 'projects/status upcoming_deadlines should be an array');

  const syncQuality = await getJson('/sync-quality?scope=enabled');
  assertEnvelope(syncQuality, '/sync-quality');
  hasKeys(
    syncQuality.body.data,
    ['generated_at', 'stale_hours_threshold', 'totals', 'rows'],
    'sync-quality'
  );
  hasKeys(
    syncQuality.body.data.totals,
    ['projects', 'red', 'yellow', 'green', 'synced_tasks', 'synced_backlog'],
    'sync-quality totals'
  );
  assert.ok(Array.isArray(syncQuality.body.data.rows), 'sync-quality rows should be an array');

  console.log('API contract smoke test passed for critical UI endpoints.');
  console.log(`Base URL: ${BASE_URL}`);
}

main().catch((error) => {
  console.error('API contract smoke test failed:', error.message);
  process.exit(1);
});
