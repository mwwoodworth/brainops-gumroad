#!/usr/bin/env node
/**
 * AI CLI MCP Server
 * Exposes local AI CLIs (Gemini, Codex, Perplexity, Brain CLI) as MCP tools.
 *
 * Tools:
 *  - ai_gemini_cli: Run Gemini CLI with a prompt
 *  - ai_codex_cli: Run Codex CLI with a prompt
 *  - ai_claude_cli: Run Claude Code CLI with a prompt
 *  - ai_perplexity_cli: Run Perplexity CLI with a query
 *  - ai_brain_cli: Run Brain CLI with arbitrary arguments
 *
 * Notes:
 *  - These tools execute local binaries and return stdout/stderr as text.
 *  - They are best used for heavyweight analysis or workflows where the CLI
 *    already encapsulates complex behavior (e.g., --yolo, --full-auto).
 */

import { spawn } from 'child_process';

const TOOLS = [
  {
    name: 'ai_gemini_cli',
    description: 'Execute a Gemini CLI task (e.g., deep analysis via gemini --yolo).',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Primary prompt to pass to Gemini CLI.'
        },
        extra_args: {
          type: 'array',
          description: 'Additional CLI arguments (e.g., ["--yolo"]).',
          items: { type: 'string' },
          default: ['--yolo']
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'ai_codex_cli',
    description: 'Execute a Codex CLI task (e.g., codex exec --full-auto "<prompt>").',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Prompt describing the coding/devops task.'
        },
        extra_args: {
          type: 'array',
          description: 'Additional CLI arguments (default: ["exec", "--full-auto"]).',
          items: { type: 'string' },
          default: ['exec', '--full-auto']
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'ai_claude_cli',
    description: 'Execute a Claude Code CLI task (e.g., claude --print "<prompt>").',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Primary prompt to pass to Claude Code.'
        },
        extra_args: {
          type: 'array',
          description: 'Additional CLI arguments (default: ["--print"]).',
          items: { type: 'string' },
          default: ['--print']
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'ai_perplexity_cli',
    description: 'Execute a Perplexity CLI research query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Research question to pass to perplexity-cli.'
        },
        extra_args: {
          type: 'array',
          description: 'Additional CLI arguments (default: ["query"]).',
          items: { type: 'string' },
          default: ['query']
        }
      },
      required: ['query']
    }
  },
  {
    name: 'ai_brain_cli',
    description: 'Execute a Brain CLI command for orchestration (e.g., brain ai ask ...).',
    inputSchema: {
      type: 'object',
      properties: {
        args: {
          type: 'array',
          description: 'Arguments to pass to brain (e.g., ["ai", "ask", "Is production healthy?"]).',
          items: { type: 'string' }
        }
      },
      required: ['args']
    }
  }
];

function runCommand(command, args, timeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      if (finished) return;
      finished = true;
      reject(err);
    });

    child.on('close', (code) => {
      if (finished) return;
      finished = true;
      resolve({ code, stdout, stderr });
    });

    if (timeoutMs > 0) {
      setTimeout(() => {
        if (finished) return;
        finished = true;
        child.kill('SIGKILL');
        resolve({
          code: -1,
          stdout,
          stderr: stderr + '\n[ai-cli-mcp] Command timed out.'
        });
      }, timeoutMs);
    }
  });
}

async function handleToolCall(toolName, args) {
  switch (toolName) {
    case 'ai_gemini_cli': {
      const extra = Array.isArray(args.extra_args) ? args.extra_args : ['--yolo'];
      const cmdArgs = [...extra, args.prompt];
      const result = await runCommand('gemini', cmdArgs);
      return {
        command: 'gemini',
        args: cmdArgs,
        exit_code: result.code,
        stdout: result.stdout,
        stderr: result.stderr
      };
    }
    case 'ai_codex_cli': {
      const extra = Array.isArray(args.extra_args) ? args.extra_args : ['exec', '--full-auto'];
      const cmdArgs = [...extra, args.prompt];
      const result = await runCommand('codex', cmdArgs);
      return {
        command: 'codex',
        args: cmdArgs,
        exit_code: result.code,
        stdout: result.stdout,
        stderr: result.stderr
      };
    }
    case 'ai_claude_cli': {
      const extra = Array.isArray(args.extra_args) ? args.extra_args : ['--print'];
      const cmdArgs = [...extra, args.prompt];
      const result = await runCommand('claude', cmdArgs);
      return {
        command: 'claude',
        args: cmdArgs,
        exit_code: result.code,
        stdout: result.stdout,
        stderr: result.stderr
      };
    }
    case 'ai_perplexity_cli': {
      const extra = Array.isArray(args.extra_args) ? args.extra_args : ['query'];
      const cmdArgs = [...extra, args.query];
      const result = await runCommand('perplexity-cli', cmdArgs);
      return {
        command: 'perplexity-cli',
        args: cmdArgs,
        exit_code: result.code,
        stdout: result.stdout,
        stderr: result.stderr
      };
    }
    case 'ai_brain_cli': {
      const cmdArgs = Array.isArray(args.args) ? args.args : [];
      const result = await runCommand('brain', cmdArgs);
      return {
        command: 'brain',
        args: cmdArgs,
        exit_code: result.code,
        stdout: result.stdout,
        stderr: result.stderr
      };
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// MCP Protocol (stdio JSON-RPC)
process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;

    let request;
    try {
      request = JSON.parse(line);
    } catch (err) {
      // Ignore malformed input
      continue;
    }

    if (!request || typeof request !== 'object') continue;

    if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: { tools: TOOLS }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      continue;
    }

    if (request.method === 'tools/call') {
      try {
        const result = await handleToolCall(request.params.name, request.params.arguments || {});
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: error.message || String(error)
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      }
      continue;
    }

    // Unknown method
    const response = {
      jsonrpc: '2.0',
      id: request.id || null,
      error: {
        code: -32601,
        message: `Method not found: ${request.method}`
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }
});

console.error('AI CLI MCP Server running on stdio');
