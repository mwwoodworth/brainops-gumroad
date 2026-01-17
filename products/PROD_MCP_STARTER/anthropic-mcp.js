#!/usr/bin/env node
/**
 * Anthropic Claude Complete MCP Server
 */

const TOOLS = [
  {
    name: 'claude_chat',
    description: 'Chat with Claude (Opus, Sonnet, Haiku)',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'claude-3-5-sonnet-20241022' },
        messages: { type: 'array' },
        max_tokens: { type: 'number', default: 4096 },
        temperature: { type: 'number', default: 1.0 }
      }
    }
  },
  {
    name: 'claude_streaming',
    description: 'Stream responses from Claude (returns full text in this implementation)',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'claude-3-5-sonnet-20241022' },
        messages: { type: 'array' },
        max_tokens: { type: 'number', default: 4096 }
      }
    }
  },
  {
    name: 'claude_vision',
    description: 'Analyze images with Claude',
    inputSchema: {
      type: 'object',
      properties: {
        image_base64: { type: 'string' },
        prompt: { type: 'string' },
        model: { type: 'string', default: 'claude-3-5-sonnet-20241022' }
      }
    }
  }
];

const API_KEY = process.env.ANTHROPIC_API_KEY;

async function callClaude(body, stream = false) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ ...body, stream })
  });
  return response.json();
}

async function handleToolCall(toolName, args) {
  switch (toolName) {
    case 'claude_chat':
      return await callClaude({
        model: args.model || 'claude-3-5-sonnet-20241022',
        messages: args.messages,
        max_tokens: args.max_tokens || 4096,
        temperature: args.temperature || 1.0
      });
    
    case 'claude_streaming':
      // MCP basic transport doesn't support real streaming yet
      return await callClaude({
        model: args.model || 'claude-3-5-sonnet-20241022',
        messages: args.messages,
        max_tokens: args.max_tokens || 4096,
        stream: false
      });
    
    case 'claude_vision':
      return await callClaude({
        model: args.model || 'claude-3-5-sonnet-20241022',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: args.image_base64 } },
            { type: 'text', text: args.prompt }
          ]
        }],
        max_tokens: 4096
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

console.error('Anthropic Claude MCP Server running on stdio');
