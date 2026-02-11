import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class McpStdioClient {
  constructor({ cwd, env, command = 'node', args = ['dist/index.js'] }) {
    this.cwd = cwd;
    this.env = env;
    this.command = command;
    this.args = args;
    this.transport = null;
    this.client = null;
  }

  async start() {
    if (this.client) return;

    this.transport = new StdioClientTransport({
      command: this.command,
      args: this.args,
      cwd: this.cwd,
      env: { ...process.env, ...this.env },
      stderr: 'pipe'
    });

    const stderr = this.transport.stderr;
    if (stderr) {
      stderr.on('data', (chunk) => {
        const text = String(chunk).trim();
        if (text) process.stderr.write(`[mcp-server] ${text}\n`);
      });
    }

    this.client = new Client(
      { name: 'wm-mcp-smoke-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
  }

  async initialize() {
    await this.start();
  }

  async listTools() {
    if (!this.client) throw new Error('MCP client not started');
    const res = await this.client.listTools();
    return res.tools || [];
  }

  async callTool(name, args = {}, _timeoutMs = 20000) {
    if (!this.client) throw new Error('MCP client not started');
    return this.client.callTool({ name, arguments: args });
  }

  async stop() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }
}

export function textFromToolResult(result) {
  const parts = result?.content || [];
  const firstText = parts.find((p) => p?.type === 'text');
  return firstText?.text || '';
}

export function parseJsonText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const startObj = text.indexOf('{');
    const endObj = text.lastIndexOf('}');
    if (startObj >= 0 && endObj > startObj) {
      const maybeObj = text.slice(startObj, endObj + 1);
      try {
        return JSON.parse(maybeObj);
      } catch {
        // Continue
      }
    }

    const startArr = text.indexOf('[');
    const endArr = text.lastIndexOf(']');
    if (startArr >= 0 && endArr > startArr) {
      const maybeArr = text.slice(startArr, endArr + 1);
      try {
        return JSON.parse(maybeArr);
      } catch {
        return null;
      }
    }

    return null;
  }
}

export function findUuid(text) {
  const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match?.[0] || null;
}
