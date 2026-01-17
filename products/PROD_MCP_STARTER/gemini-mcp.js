#!/usr/bin/env node
/**
 * Google Gemini Complete MCP Server
 */

const TOOLS = [
  {
    name: 'gemini_chat',
    description: 'Chat with Gemini (Pro, Ultra, Flash)',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'gemini-1.5-pro' },
        prompt: { type: 'string' },
        temperature: { type: 'number', default: 0.7 }
      }
    }
  },
  {
    name: 'gemini_vision',
    description: 'Analyze images and video with Gemini',
    inputSchema: {
      type: 'object',
      properties: {
        image_base64: { type: 'string' },
        prompt: { type: 'string' }
      }
    }
  },
  {
    name: 'gemini_embeddings',
    description: 'Generate embeddings with Gemini',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        model: { type: 'string', default: 'embedding-001' }
      }
    }
  }
];

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

async function callGemini(model, body) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  return response.json();
}

async function callEmbeddings(model, body) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    return response.json();
  }

async function handleToolCall(toolName, args) {
  switch (toolName) {
    case 'gemini_chat':
      return await callGemini(args.model || 'gemini-1.5-pro', {
        contents: [{ parts: [{ text: args.prompt }] }],
        generationConfig: { temperature: args.temperature || 0.7 }
      });
    
    case 'gemini_vision':
      return await callGemini('gemini-1.5-pro', {
        contents: [{
          parts: [
            { text: args.prompt },
            { inline_data: { mime_type: 'image/jpeg', data: args.image_base64 } }
          ]
        }]
      });

    case 'gemini_embeddings':
      return await callEmbeddings(args.model || 'embedding-001', {
        content: { parts: [{ text: args.text }] }
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

console.error('Google Gemini MCP Server running on stdio');
