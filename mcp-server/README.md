# Work Management MCP Server

This MCP server exposes tools to interact with the Work Management application, allowing AI assistants to manage projects, tasks, and more.

## Prerequisites

- Node.js (v18 or higher)
- The Work Management application running locally (usually on port 3000)

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
