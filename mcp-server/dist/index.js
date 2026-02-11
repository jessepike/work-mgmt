"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Only load dotenv for HTTP mode (stdio must keep stdout clean for JSON-RPC)
if (process.argv[2] === 'http') {
    import("dotenv").then(d => d.config());
}
const server = new mcp_js_1.McpServer({
    name: "Work Management MCP",
    version: "1.0.0",
});
// Tools will be registered here
const project_tools_js_1 = require("./tools/project-tools.js");
const task_tools_js_1 = require("./tools/task-tools.js");
const search_tools_js_1 = require("./tools/search-tools.js");
const adf_tools_js_1 = require("./tools/adf-tools.js");
(0, project_tools_js_1.registerProjectTools)(server);
(0, task_tools_js_1.registerTaskTools)(server);
(0, search_tools_js_1.registerSearchTools)(server);
(0, adf_tools_js_1.registerAdfTools)(server);
async function main() {
    const mode = process.argv[2]; // 'stdio' or 'http'
    if (mode === 'http') {
        const app = (0, express_1.default)();
        app.use((0, cors_1.default)());
        let transport;
        app.get("/sse", async (req, res) => {
            console.log("New SSE connection");
            transport = new sse_js_1.SSEServerTransport("/message", res);
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
    }
    else {
        // Default to stdio
        const transport = new stdio_js_1.StdioServerTransport();
        console.error("Starting Work Management MCP Server on stdio...");
        await server.connect(transport);
        console.error("Work Management MCP Server running and listening on stdio");
    }
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
