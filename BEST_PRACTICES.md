# Development Best Practices

To ensure a stable development environment for the Agentic Development Framework (ADF) and MCP server, follow these practices.

## Port Configuration

-   **Main Application**: Runs on **Port 3005**.
    -   Command: `npm run dev` (configured to use `-p 3005`)
    -   URL: `http://localhost:3005`
-   **MCP Server**: Connects to Port 3005.
    -   URL: `http://localhost:3005/api`

## Running Persistent Services

To avoid terminal conflicts and ensure the MCP server is always available for your AI agent, we recommend using a process manager like **PM2**.

### 1. Install PM2
```bash
npm install -g pm2
```

### 2. Start Services
Create a `ecosystem.config.js` in the root `work-management` folder:

```javascript
module.exports = {
  apps: [
    {
      name: "work-mgmt-app",
      script: "npm",
      args: "run dev",
      cwd: "./",
      env: {
        PORT: 3005
      }
    }
  ]
};
```

Start the app:
```bash
pm2 start ecosystem.config.js
```

### 3. Monitoring
-   View logs: `pm2 logs`
-   Status: `pm2 status`
-   Stop: `pm2 stop work-mgmt-app`

## Troubleshooting "Hanging" Connections

If Claude says the tool is hanging:
1.  Check if the main app is running: `curl -I http://localhost:3005/favicon.ico`
2.  If that times out, the Next.js process is stuck.
3.  Restart it: `pm2 restart work-mgmt-app` (or Ctrl+C and run again if using terminal).
