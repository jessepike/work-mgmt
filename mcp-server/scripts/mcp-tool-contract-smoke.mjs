import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { McpStdioClient } from './lib/mcp-stdio-client.mjs';

const EXPECTED_TOOLS = [
  'list_projects',
  'get_project',
  'create_project',
  'update_project',
  'list_plans',
  'create_plan',
  'update_plan',
  'approve_plan',
  'list_phases',
  'create_phase',
  'update_phase',
  'list_tasks',
  'get_task',
  'create_task',
  'update_task',
  'complete_task',
  'validate_task',
  'list_backlog',
  'create_backlog_item',
  'promote_backlog',
  'get_status',
  'whats_next',
  'get_blockers',
  'get_deadlines',
  'search',
  'get_activity',
  'get_sync_quality'
];

async function main() {
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const client = new McpStdioClient({
    cwd,
    env: { API_URL: process.env.API_URL || 'http://localhost:3005/api' },
    args: ['dist/index.js']
  });

  try {
    await client.initialize();
    const tools = await client.listTools();
    const names = new Set(tools.map((t) => t.name));
    const missing = EXPECTED_TOOLS.filter((name) => !names.has(name));

    if (missing.length > 0) {
      console.error('Missing expected MCP tools:');
      for (const name of missing) console.error(`- ${name}`);
      process.exitCode = 1;
      return;
    }

    console.log(`Contract smoke passed: ${EXPECTED_TOOLS.length} expected tools are registered.`);
  } finally {
    await client.stop();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
