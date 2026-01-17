#!/usr/bin/env node
/**
 * Ollama Local LLM MCP Server
 */

const TOOLS = [
  {
    name: 'ollama_chat',
    description: 'Chat with local Ollama models (llama3, codellama, mistral, etc)',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'llama3:latest' },
        prompt: { type: 'string' },
        temperature: { type: 'number', default: 0.7 }
      }
    }
  },
  {
    name: 'ollama_list_models',
    description: 'List all available Ollama models',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'ollama_embeddings',
    description: 'Generate embeddings using Ollama',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'llama3' },
        text: { type: 'string' }
      }
    }
  }
];

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

async function callOllama(endpoint, body) {
  const response = await fetch(`${OLLAMA_HOST}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response.json();
}

async function handleToolCall(toolName, args) {
  switch (toolName) {
    case 'ollama_chat':
      return await callOllama('generate', {
        model: args.model || 'llama3:latest',
        prompt: args.prompt,
        options: { temperature: args.temperature || 0.7 }
      });
    
    case 'ollama_list_models':
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      return response.json();
    
    case 'ollama_embeddings':
      return await callOllama('embeddings', {
        model: args.model || 'llama3',
        prompt: args.text
      });
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// MCP Protocol
process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const request = JSON.parse(line);
      
      if (request.method === 'tools/list') {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: { tools: TOOLS }
        }) + '\n');
      } else if (request.method === 'tools/call') {
        const result = await handleToolCall(request.params.name, request.params.arguments);
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: { content: [{ type: 'text', text: JSON.stringify(result) }] }
        }) + '\n');
      }
    } catch (error) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: error.message }
      }) + '\n');
    }
  }
});

console.error('Ollama MCP Server running on stdio');
