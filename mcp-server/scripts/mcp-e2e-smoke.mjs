import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  McpStdioClient,
  textFromToolResult,
  parseJsonText,
  findUuid
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

    if (!project && process.env.SMOKE_OWNER_ID) {
      const ownerId = process.env.SMOKE_OWNER_ID;
      const createProject = await callAndParse(client, 'create_project', {
        name: `MCP Smoke Project ${Date.now()}`,
        description: 'Created by MCP e2e smoke test',
        project_type: 'native',
        categories: ['development'],
        workflow_type: 'planned',
        owner_id: ownerId
      });

      const createdProject = createProject.json;
      const createdProjectId = createdProject?.id || findUuid(createProject.text);
      if (!createdProjectId) {
        const msg = `Failed to bootstrap smoke project with SMOKE_OWNER_ID=${ownerId}. Response: ${createProject.text}`;
        if (strict) throw new Error(msg);
        console.warn(`SKIPPED: ${msg}`);
        return;
      }
      project = { id: createdProjectId, workflow_type: 'planned' };
    }

    if (!project) {
      const msg = 'No project found. Set SMOKE_PROJECT_ID, or seed data, or set SMOKE_OWNER_ID to allow project bootstrap.';
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

    if (plans.length === 0) {
      const createPlan = await callAndParse(client, 'create_plan', {
        project_id: projectId,
        name: `MCP Smoke Plan ${Date.now()}`,
        description: 'Created by MCP e2e smoke test'
      });
      const createdPlanId = findUuid(createPlan.text);
      assert(createdPlanId, 'create_plan did not return a plan id');
      plans = [{ id: createdPlanId }];
    }

    const planId = plans[0].id;
    assert(planId, 'No plan id available for update_plan smoke call');

    await client.callTool('update_plan', {
      plan_id: planId,
      description: `Updated by MCP e2e smoke at ${new Date().toISOString()}`
    });

    const tasksRes = await callAndParse(client, 'list_tasks', { project_id: projectId, limit: 20 });
    let tasks = Array.isArray(tasksRes.json) ? tasksRes.json : [];

    if (tasks.length === 0) {
      const workflowType = projectObj?.workflow_type || project.workflow_type;
      const createTaskArgs = {
        project_id: projectId,
        title: `MCP Smoke Task ${Date.now()}`,
        description: 'Created by MCP e2e smoke test',
        priority: 'P2',
        ...(workflowType === 'planned' ? { plan_id: planId } : {})
      };

      const createTask = await callAndParse(client, 'create_task', createTaskArgs);
      const createdTask = createTask.json;
      const createdTaskId = createdTask?.id || findUuid(createTask.text);
      assert(createdTaskId, 'create_task did not return a task id');
      tasks = [{ id: createdTaskId }];
    }

    const taskId = tasks[0].id;
    assert(taskId, 'No task id available for get_task smoke call');

    const taskDetail = await callAndParse(client, 'get_task', { task_id: taskId });
    const taskObj = taskDetail.json;
    assert(taskObj && taskObj.id === taskId, 'get_task failed to return expected task');

    const nextRes = await callAndParse(client, 'whats_next', { limit: 5 });
    assert(Array.isArray(nextRes.json), 'whats_next response is not an array');

    const searchQuery = (taskObj?.title || '').split(' ').slice(0, 3).join(' ') || 'task';
    const searchRes = await callAndParse(client, 'search', { query: searchQuery, limit: 5 });
    assert(Array.isArray(searchRes.json), 'search response is not an array');

    const activityRes = await callAndParse(client, 'get_activity', { limit: 5 });
    assert(Array.isArray(activityRes.json), 'get_activity response is not an array');

    console.log('E2E smoke passed for tools: get_project, update_plan, get_task, whats_next, search, get_activity.');
  } finally {
    await client.stop();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
