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
      'x-actor-id': 'jess',
      'x-actor-type': 'human',
      ...(options.headers || {})
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function main() {
  let createdPlanId = null;
  let backlogId = null;
  let promotedTaskId = null;

  try {
    const projectsRes = await request('/projects');
    assert.equal(projectsRes.status, 200, 'GET /projects should return 200');
    const plannedProject = (projectsRes.body.data || []).find((p) => p.workflow_type === 'planned');
    assert.ok(plannedProject?.id, 'Expected at least one planned project');

    const createBacklog = await request('/backlog', {
      method: 'POST',
      body: JSON.stringify({
        project_id: plannedProject.id,
        title: `Smoke Planned Backlog ${Date.now()}`,
        priority: 'P2'
      })
    });
    assert.equal(createBacklog.status, 200, 'POST /backlog should return 200');
    backlogId = createBacklog.body.data?.id;
    assert.ok(backlogId, 'Backlog item id missing');

    const promoteMissingPlan = await request('/backlog/promote', {
      method: 'POST',
      body: JSON.stringify({ backlog_item_id: backlogId })
    });
    assert.equal(promoteMissingPlan.status, 400, 'Planned project promote without plan_id should return 400');

    const plansRes = await request(`/projects/${plannedProject.id}/plans`);
    assert.equal(plansRes.status, 200, 'GET /projects/:id/plans should return 200');

    let activePlan = (plansRes.body.data || []).find((p) => p.status !== 'completed');
    if (!activePlan) {
      const createPlan = await request(`/projects/${plannedProject.id}/plans`, {
        method: 'POST',
        body: JSON.stringify({ name: `Smoke Planned Rule ${Date.now()}` })
      });
      assert.equal(createPlan.status, 200, 'POST /projects/:id/plans should return 200 when creating fallback plan');
      activePlan = createPlan.body.data;
      createdPlanId = activePlan.id;
    }

    const promoteWithPlan = await request('/backlog/promote', {
      method: 'POST',
      body: JSON.stringify({
        backlog_item_id: backlogId,
        plan_id: activePlan.id
      })
    });
    assert.equal(promoteWithPlan.status, 200, 'Planned project promote with plan_id should return 200');
    promotedTaskId = promoteWithPlan.body.data?.id;
    assert.ok(promotedTaskId, 'Promoted task id missing');

    console.log('Workflow rules smoke test passed.');
    console.log(`Base URL: ${BASE_URL}`);
  } finally {
    if (promotedTaskId) {
      await admin.from('task').delete().eq('id', promotedTaskId);
    }
    if (backlogId) {
      await admin.from('backlog_item').delete().eq('id', backlogId);
    }
    if (createdPlanId) {
      await admin.from('plan').delete().eq('id', createdPlanId);
    }
  }
}

main().catch((error) => {
  console.error('Workflow rules smoke test failed:', error.message);
  process.exit(1);
});
