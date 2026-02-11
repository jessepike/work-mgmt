import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
// Only load dotenv for HTTP mode (stdio must keep stdout clean for JSON-RPC)
if (process.argv[2] === 'http') {
    import("dotenv").then(d => d.config());
}

const server = new McpServer({
    name: "Work Management MCP",
    version: "1.0.0",
});

// Tools will be registered here
import { registerProjectTools } from "./tools/project-tools.js";
import { registerTaskTools } from "./tools/task-tools.js";
import { registerSearchTools } from "./tools/search-tools.js";
import { registerAdfTools } from "./tools/adf-tools.js";

registerProjectTools(server);
registerTaskTools(server);
registerSearchTools(server);
registerAdfTools(server);

async function main() {
    const mode = process.argv[2]; // 'stdio' or 'http'

    if (mode === 'http') {
        const app = express();
        app.use(cors());

        let transport: SSEServerTransport | undefined;

        app.get("/sse", async (req, res) => {
            console.log("New SSE connection");
            transport = new SSEServerTransport("/message", res);
            await server.connect(transport);
        });

        app.post("/message", async (req, res) => {
            if (!transport) {
                res.sendStatus(400);
                return;
            }
            await transport.handlePostMessage(req, res);
        });

        const port = process.env.MCP_PORT || 3002;
        app.listen(port, () => {
            console.error(`Work Management MCP Server running on http://localhost:${port}/sse`);
        });
    } else {
        // Default to stdio
        const transport = new StdioServerTransport();
        console.error("Starting Work Management MCP Server on stdio...");
        await server.connect(transport);
        console.error("Work Management MCP Server running and listening on stdio");
    }
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
