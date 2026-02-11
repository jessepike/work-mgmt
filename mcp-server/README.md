# Work Management MCP Server

This MCP server exposes tools to interact with the Work Management application, allowing AI assistants to manage projects, tasks, and more.

## Prerequisites

- Node.js (v18 or higher)
- The Work Management application running locally on port 3005

## Installation & Build

1. Navigate to the `mcp-server` directory:
   ```bash
   cd mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the server:
   ```bash
   npm run build
   ```

## Configuration for Claude Desktop

To use this server with Claude Desktop, add the following configuration to your `claude_desktop_config.json` file.

**macOS Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows Location:** `%APPDATA%\Claude\claude_desktop_config.json`

Add this entry to the `mcpServers` object:

```json
{
  "mcpServers": {
    "work-management": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/code/_shared/work-management/mcp-server/dist/index.js"
      ],
      "env": {
        "API_URL": "http://localhost:3005/api"
      }
    }
  }
}
```

**Important:** Replace `/ABSOLUTE/PATH/TO/` with the actual absolute path to your project directory.

## Development

To run the server in development mode with hot reloading:

```bash
npm run dev
```

This uses `tsx` to run the TypeScript source directly. The MCP server will connect to the main application at `http://localhost:3005/api`.

## Smoke Checks

Tool contract smoke (validates expected MCP tool names are registered):

```bash
npm run smoke:contract
```

End-to-end MCP smoke (calls key tools: `get_project`, `update_plan`, `get_task`, `whats_next`, `search`, `get_activity`):

```bash
npm run smoke:e2e
```

`smoke:e2e` input behavior:
- Uses `SMOKE_PROJECT_ID` if provided.
- Otherwise uses the first project from `list_projects`.
- If no projects exist, attempts bootstrap only when `SMOKE_OWNER_ID` is set.
- If no project context can be resolved, script exits as `SKIPPED` (exit 0). Set `SMOKE_STRICT=1` to make that a failure.
