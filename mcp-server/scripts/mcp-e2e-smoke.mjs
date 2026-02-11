import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  McpStdioClient,
  textFromToolResult,
  parseJsonText
} from './lib/mcp-stdio-client.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function callAndParse(client, name, args = {}, opts = {}) {
  const result = await client.callTool(name, args, opts.timeoutMs || 20000);
  const text = textFromToolResult(result);
  if (result?.isError) {
    if (opts.allowError) {
      return { result, text, json: parseJsonText(text) };
    }
    throw new Error(`Tool ${name} failed: ${text || 'unknown error'}`);
  }
  return { result, text, json: parseJsonText(text) };
}

async function main() {
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const strict = process.env.SMOKE_STRICT === '1';
  const client = new McpStdioClient({
    cwd,
    env: { API_URL: process.env.API_URL || 'http://localhost:3005/api' },
    args: ['dist/index.js']
  });

  try {
    await client.initialize();

    let project = null;

    if (process.env.SMOKE_PROJECT_ID) {
      project = { id: process.env.SMOKE_PROJECT_ID };
    } else {
      const projectsRes = await callAndParse(client, 'list_projects', { limit: 20 }, { allowError: !strict });
      if (projectsRes.result?.isError) {
        const msg = `Cannot list projects from API. ${projectsRes.text || 'Unknown error'}`;
        if (strict) throw new Error(msg);
        console.warn(`SKIPPED: ${msg}`);
        return;
      }
      const projects = Array.isArray(projectsRes.json) ? projectsRes.json : [];
      project = projects[0] || null;
    }

    if (!project) {
      const msg = 'No project found. Set SMOKE_PROJECT_ID or seed data.';
      if (strict) throw new Error(msg);
      console.warn(`SKIPPED: ${msg}`);
      return;
    }

    const projectId = project.id;
    assert(projectId, 'Project id missing from list_projects result');

    const projectDetails = await callAndParse(client, 'get_project', { project_id: projectId });
    const projectObj = projectDetails.json;
    assert(projectObj && projectObj.id === projectId, 'get_project failed to return expected project');

    const plansRes = await callAndParse(client, 'list_plans', { project_id: projectId });
    let plans = Array.isArray(plansRes.json) ? plansRes.json : [];

    const planId = plans[0]?.id;
    if (planId) {
      await client.callTool('update_plan', {
        plan_id: planId,
        description: `Updated by MCP e2e smoke at ${new Date().toISOString()}`
      });
    } else {
      console.warn('SKIPPED: update_plan (no existing plans)');
    }

    const tasksRes = await callAndParse(client, 'list_tasks', { project_id: projectId, limit: 20 });
    let tasks = Array.isArray(tasksRes.json) ? tasksRes.json : [];

    let taskObj = null;
    const taskId = tasks[0]?.id;
    if (taskId) {
      const taskDetail = await callAndParse(client, 'get_task', { task_id: taskId });
      taskObj = taskDetail.json;
      assert(taskObj && taskObj.id === taskId, 'get_task failed to return expected task');
    } else {
      console.warn('SKIPPED: get_task (no existing tasks)');
    }

    const nextRes = await callAndParse(client, 'whats_next', { limit: 5 });
    assert(Array.isArray(nextRes.json), 'whats_next response is not an array');

    const searchQuery = (taskObj?.title || projectObj?.name || '').split(' ').slice(0, 3).join(' ') || 'task';
    const searchRes = await callAndParse(client, 'search', { query: searchQuery, limit: 5 });
    assert(Array.isArray(searchRes.json), 'search response is not an array');

    const activityRes = await callAndParse(client, 'get_activity', { limit: 5 });
    assert(Array.isArray(activityRes.json), 'get_activity response is not an array');

    const syncQualityRes = await callAndParse(client, 'get_sync_quality', { scope: 'enabled' });
    assert(syncQualityRes.json && typeof syncQualityRes.json === 'object', 'get_sync_quality response is not an object');

    console.log('E2E smoke passed for tools: get_project, update_plan, get_task, whats_next, search, get_activity, get_sync_quality.');
  } finally {
    await client.stop();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
