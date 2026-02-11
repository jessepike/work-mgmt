import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3005/api';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const cleanup = {
    taskIds: new Set(),
    backlogIds: new Set()
  };

  let admin = null;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  try {
    const projectsRes = await request('/projects');
    assert.equal(projectsRes.status, 200, 'GET /projects should return 200');
    const projects = projectsRes.body.data || [];
    assert.ok(Array.isArray(projects) && projects.length > 0, 'Expected at least one project');

    const flatProject = projects.find((p) => p.workflow_type === 'flat') || projects[0];
    assert.ok(flatProject?.id, 'Expected a project with id');

    const actorHeaders = {
      'x-actor-id': 'jess',
      'x-actor-type': 'human'
    };

    const createTask = await request('/tasks', {
      method: 'POST',
      headers: actorHeaders,
      body: JSON.stringify({
        project_id: flatProject.id,
        title: `Smoke Task ${Date.now()}`,
        priority: 'P2'
      })
    });
    assert.equal(createTask.status, 200, 'POST /tasks should return 200');
    const task = createTask.body.data;
    assert.ok(task?.id, 'Created task should include id');
    cleanup.taskIds.add(task.id);

    const validateTask = await request(`/tasks/${task.id}/validate`, {
      method: 'POST',
      headers: actorHeaders,
      body: JSON.stringify({ status: 'passed' })
    });
    assert.equal(validateTask.status, 200, 'POST /tasks/:id/validate should return 200');
    assert.equal(validateTask.body.data.validation_status, 'passed', 'Task validation_status should be passed');

    const completeTask = await request(`/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: actorHeaders,
      body: JSON.stringify({ outcome: 'Smoke test completion' })
    });
    assert.equal(completeTask.status, 200, 'POST /tasks/:id/complete should return 200');
    assert.equal(completeTask.body.data.status, 'done', 'Task should be marked done');

    const createBacklog = await request('/backlog', {
      method: 'POST',
      headers: actorHeaders,
      body: JSON.stringify({
        project_id: flatProject.id,
        title: `Smoke Backlog ${Date.now()}`,
        priority: 'P2'
      })
    });
    assert.equal(createBacklog.status, 200, 'POST /backlog should return 200');
    const backlog = createBacklog.body.data;
    assert.ok(backlog?.id, 'Created backlog item should include id');
    cleanup.backlogIds.add(backlog.id);

    const promoteBacklog = await request('/backlog/promote', {
      method: 'POST',
      headers: actorHeaders,
      body: JSON.stringify({ backlog_item_id: backlog.id })
    });
    assert.equal(promoteBacklog.status, 200, 'POST /backlog/promote should return 200');
    const promotedTask = promoteBacklog.body.data;
    assert.ok(promotedTask?.id, 'Promoted task should include id');
    cleanup.taskIds.add(promotedTask.id);

    console.log('API mutation smoke test passed.');
    console.log(`Base URL: ${BASE_URL}`);
  } finally {
    if (!admin) {
      console.warn('Cleanup skipped: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable cleanup.');
      return;
    }

    const taskIds = Array.from(cleanup.taskIds);
    if (taskIds.length > 0) {
      await admin.from('task').delete().in('id', taskIds);
    }

    const backlogIds = Array.from(cleanup.backlogIds);
    if (backlogIds.length > 0) {
      await admin.from('backlog_item').delete().in('id', backlogIds);
    }
  }
}

main().catch((error) => {
  console.error('API mutation smoke test failed:', error.message);
  process.exit(1);
});
