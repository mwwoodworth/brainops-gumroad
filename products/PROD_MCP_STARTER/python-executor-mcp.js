#!/usr/bin/env node
/**
 * Python Execution MCP Server
 *
 * Executes Python code inside a configured venv. Intended for local, trusted use.
 * Default venv: /home/matt-woodworth/dev/.venv (override via BRAINOPS_PY_VENV)
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

const DEFAULT_VENV_PATH = '/home/matt-woodworth/dev/.venv';
const VENV_PATH = process.env.BRAINOPS_PY_VENV || DEFAULT_VENV_PATH;
const PYTHON_BIN = process.env.BRAINOPS_PYTHON_BIN || path.join(VENV_PATH, 'bin', 'python3');

const ALLOW_PIP_INSTALL = (process.env.ALLOW_PIP_INSTALL || 'false').toLowerCase() === 'true';

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bsudo\b/i,
  /\bdd\s+if=/i,
  /\bmkfs\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bformat\s+c:/i,
  /os\.system\(/,
  /subprocess\.(call|run|Popen)\(/,
  /\beval\(/,
  /\bexec\(/,
  /__import__\(['"]os['"]\)\.system/
];

const TOOLS = [
  {
    name: 'python_execute',
    description: 'Execute Python code in the configured venv.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Python code to execute.' },
        timeout: { type: 'number', default: 30000, description: 'Timeout in ms (default 30000).' }
      },
      required: ['code']
    }
  },
  {
    name: 'python_run_async',
    description: 'Execute async Python code. Must define async def main().',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Async Python code defining async def main().' },
        timeout: { type: 'number', default: 30000 }
      },
      required: ['code']
    }
  },
  {
    name: 'python_query_database',
    description: 'Run a PostgreSQL query via asyncpg using DATABASE_URL from env.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL query (use $1, $2... for params).' },
        params: { type: 'array', items: {}, description: 'Optional positional params.' },
        fetch_type: {
          type: 'string',
          enum: ['fetch', 'fetchrow', 'fetchval', 'execute'],
          default: 'fetch'
        },
        timeout: { type: 'number', default: 30000 }
      },
      required: ['query']
    }
  },
  {
    name: 'python_semantic_search',
    description: 'Semantic search over provided snippets using sentence-transformers (if installed).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        code_snippets: { type: 'array', items: { type: 'string' } },
        top_k: { type: 'number', default: 5 },
        timeout: { type: 'number', default: 60000 }
      },
      required: ['query', 'code_snippets']
    }
  },
  {
    name: 'python_list_packages',
    description: 'List installed packages in the venv.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Optional substring filter.' },
        timeout: { type: 'number', default: 30000 }
      }
    }
  },
  {
    name: 'python_install_package',
    description: 'Install a package into the venv (requires ALLOW_PIP_INSTALL=true).',
    inputSchema: {
      type: 'object',
      properties: {
        package: { type: 'string', description: 'e.g. requests==2.31.0' }
      },
      required: ['package']
    }
  },
  {
    name: 'python_langgraph_workflow',
    description: 'Execute workflow code (same as python_execute, with longer default timeout).',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_code: { type: 'string' },
        initial_state: { type: 'object' },
        timeout: { type: 'number', default: 60000 }
      },
      required: ['workflow_code', 'initial_state']
    }
  }
];

function validateCode(code) {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      throw new Error(`Security: code matched blocked pattern: ${pattern}`);
    }
  }
}

async function spawnPython(args, { timeout = 30000, env = {} } = {}) {
  return new Promise((resolve) => {
    const proc = spawn(PYTHON_BIN, args, {
      env: {
        ...process.env,
        ...env,
        VIRTUAL_ENV: VENV_PATH,
        PATH: `${path.join(VENV_PATH, 'bin')}:${process.env.PATH}`,
        PYTHONUNBUFFERED: '1'
      }
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      try {
        proc.kill('SIGTERM');
        setTimeout(() => proc.kill('SIGKILL'), 1000).unref();
      } catch {}
      resolve({ success: false, timeout: true, stdout: stdout.trim(), stderr: stderr.trim() });
    }, timeout);
    timer.unref();

    proc.stdout.on('data', (data) => (stdout += data.toString()));
    proc.stderr.on('data', (data) => (stderr += data.toString()));

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        exit_code: code ?? null,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, error: err.message, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function executePython(code, timeout = 30000, extraEnv = {}) {
  validateCode(code);
  return await spawnPython(['-c', code], { timeout, env: extraEnv });
}

function maybeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'python_execute':
      return await executePython(args.code, args.timeout || 30000);

    case 'python_run_async': {
      const asyncCode = `import asyncio\n\n${args.code}\n\nif __name__ == '__main__':\n    asyncio.run(main())\n`;
      return await executePython(asyncCode, args.timeout || 30000);
    }

    case 'python_query_database': {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      const timeout = args.timeout || 30000;
      const env = {
        MCP_QUERY: String(args.query ?? ''),
        MCP_PARAMS: JSON.stringify(args.params || []),
        MCP_FETCH_TYPE: String(args.fetch_type || 'fetch')
      };
      const dbCode = `
import asyncio
import json
import os
from datetime import date, datetime
from decimal import Decimal

import asyncpg

def jsonable(x):
    if isinstance(x, asyncpg.Record):
        return {k: jsonable(v) for k, v in dict(x).items()}
    if isinstance(x, list):
        return [jsonable(v) for v in x]
    if isinstance(x, dict):
        return {k: jsonable(v) for k, v in x.items()}
    if isinstance(x, (datetime, date)):
        return x.isoformat()
    if isinstance(x, Decimal):
        return float(x)
    return x

async def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL not set")
    query = os.environ.get("MCP_QUERY", "")
    params = json.loads(os.environ.get("MCP_PARAMS", "[]"))
    fetch_type = os.environ.get("MCP_FETCH_TYPE", "fetch")

    conn = await asyncpg.connect(dsn, timeout=10)
    try:
        fn = getattr(conn, fetch_type)
        if params:
            result = await fn(query, *params)
        else:
            result = await fn(query)
        print(json.dumps({"success": True, "result": jsonable(result)}))
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
`;
      const res = await executePython(dbCode, timeout, env);
      const parsed = maybeParseJson(res.stdout);
      return parsed ? { ...res, parsed } : res;
    }

    case 'python_semantic_search': {
      const timeout = args.timeout || 60000;
      const env = {
        MCP_QUERY: String(args.query ?? ''),
        MCP_SNIPPETS: JSON.stringify(args.code_snippets || []),
        MCP_TOP_K: String(args.top_k || 5)
      };
      const code = `
import json
import os
from math import sqrt

query = os.environ.get("MCP_QUERY", "")
snippets = json.loads(os.environ.get("MCP_SNIPPETS", "[]"))
top_k = int(os.environ.get("MCP_TOP_K", "5"))

try:
    from sentence_transformers import SentenceTransformer
except Exception as e:
    raise RuntimeError("sentence-transformers is not installed in this venv") from e

model = SentenceTransformer("all-MiniLM-L6-v2")
q_emb = model.encode([query])[0]
s_embs = model.encode(snippets)

def cosine(a, b):
    dot = float((a * b).sum())
    na = sqrt(float((a * a).sum()))
    nb = sqrt(float((b * b).sum()))
    return dot / (na * nb + 1e-12)

scored = [{"index": i, "score": float(cosine(q_emb, s_embs[i])), "snippet": snippets[i]} for i in range(len(snippets))]
scored.sort(key=lambda x: x["score"], reverse=True)
print(json.dumps({"success": True, "results": scored[:top_k]}))
`;
      const res = await executePython(code, timeout, env);
      const parsed = maybeParseJson(res.stdout);
      return parsed ? { ...res, parsed } : res;
    }

    case 'python_list_packages': {
      const timeout = args.timeout || 30000;
      const env = { MCP_FILTER: String(args.filter || '') };
      const code = `
import json
import os
from importlib.metadata import distributions

f = os.environ.get("MCP_FILTER", "").lower()
pkgs = []
for d in distributions():
    name = (d.metadata.get("Name") or "").strip()
    ver = (d.version or "").strip()
    if not name:
        continue
    if f and f not in name.lower():
        continue
    pkgs.append({"name": name, "version": ver})
pkgs.sort(key=lambda x: x["name"].lower())
print(json.dumps({"success": True, "packages": pkgs, "count": len(pkgs)}))
`;
      const res = await executePython(code, timeout, env);
      const parsed = maybeParseJson(res.stdout);
      return parsed ? { ...res, parsed } : res;
    }

    case 'python_install_package': {
      if (!ALLOW_PIP_INSTALL) {
        throw new Error('pip install is disabled (set ALLOW_PIP_INSTALL=true to enable)');
      }
      const pkg = String(args.package || '').trim();
      if (!pkg) throw new Error('package is required');
      if (pkg.includes('\n') || pkg.includes('\r')) throw new Error('invalid package value');
      return await spawnPython(['-m', 'pip', 'install', pkg], { timeout: 10 * 60_000 });
    }

    case 'python_langgraph_workflow': {
      const timeout = args.timeout || 60000;
      const initial = JSON.stringify(args.initial_state || {});
      const workflowCode = String(args.workflow_code ?? '');
      const code = `import json\n\ninitial_state = json.loads(${JSON.stringify(initial)})\n\n${workflowCode}\n`;
      return await executePython(code, timeout);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.trim()) continue;
    let request;
    try {
      request = JSON.parse(line);
    } catch (err) {
      process.stdout.write(
        JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n'
      );
      continue;
    }

    try {
      if (request.method === 'tools/list') {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { tools: TOOLS } }) + '\n');
      } else if (request.method === 'tools/call') {
        const result = await handleToolCall(request.params?.name, request.params?.arguments);
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: { content: [{ type: 'text', text: JSON.stringify(result) }] }
          }) + '\n'
        );
      }
    } catch (error) {
      process.stdout.write(
        JSON.stringify({ jsonrpc: '2.0', id: request.id ?? null, error: { code: -32603, message: error.message } }) +
          '\n'
      );
    }
  }
});

console.error(`Python Executor MCP Server running on stdio (venv=${VENV_PATH})`);
