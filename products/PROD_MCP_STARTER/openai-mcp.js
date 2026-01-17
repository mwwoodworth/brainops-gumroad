#!/usr/bin/env node
/**
 * OpenAI Complete MCP Server
 * Provides full OpenAI API access via MCP
 */

const TOOLS = [
  {
    name: 'openai_chat_completion',
    description: 'Generate chat completions using GPT-4, GPT-4-turbo, GPT-3.5-turbo',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'gpt-4-turbo-preview' },
        messages: { type: 'array', items: { type: 'object' } },
        temperature: { type: 'number', default: 0.7 },
        max_tokens: { type: 'number', default: 4000 }
      }
    }
  },
  {
    name: 'openai_streaming_chat',
    description: 'Stream chat completions (returns full text in this implementation)',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'gpt-4-turbo-preview' },
        messages: { type: 'array' },
        temperature: { type: 'number', default: 0.7 }
      }
    }
  },
  {
    name: 'openai_embeddings',
    description: 'Generate embeddings for text (text-embedding-3-small, text-embedding-3-large)',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
        model: { type: 'string', default: 'text-embedding-3-small' }
      }
    }
  },
  {
    name: 'openai_image_generation',
    description: 'Generate images using DALL-E 3',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        model: { type: 'string', default: 'dall-e-3' },
        size: { type: 'string', default: '1024x1024' },
        quality: { type: 'string', default: 'standard' }
      }
    }
  },
  {
    name: 'openai_vision',
    description: 'Analyze images using GPT-4 Vision',
    inputSchema: {
      type: 'object',
      properties: {
        image_url: { type: 'string' },
        prompt: { type: 'string' },
        max_tokens: { type: 'number', default: 1000 }
      }
    }
  },
  {
    name: 'openai_function_calling',
    description: 'Chat completion with function calling',
    inputSchema: {
      type: 'object',
      properties: {
        messages: { type: 'array' },
        functions: { type: 'array' },
        function_call: { type: 'string', default: 'auto' },
        model: { type: 'string', default: 'gpt-4-turbo-preview' }
      }
    }
  },
  {
    name: 'openai_moderation',
    description: 'Check content for policy violations',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' }
      }
    }
  }
];

const API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(endpoint, body) {
  const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return response.json();
}

async function handleToolCall(toolName, args) {
  switch (toolName) {
    case 'openai_chat_completion':
      return await callOpenAI('chat/completions', {
        model: args.model || 'gpt-4-turbo-preview',
        messages: args.messages,
        temperature: args.temperature || 0.7,
        max_tokens: args.max_tokens || 4000
      });
    
    case 'openai_streaming_chat':
      // MCP basic transport doesn't support real streaming yet, so we return the full completion
      return await callOpenAI('chat/completions', {
        model: args.model || 'gpt-4-turbo-preview',
        messages: args.messages,
        temperature: args.temperature || 0.7,
        stream: false
      });

    case 'openai_embeddings':
      return await callOpenAI('embeddings', {
        input: args.input,
        model: args.model || 'text-embedding-3-small'
      });
    
    case 'openai_image_generation':
      return await callOpenAI('images/generations', {
        prompt: args.prompt,
        model: args.model || 'dall-e-3',
        size: args.size || '1024x1024',
        quality: args.quality || 'standard'
      });
    
    case 'openai_vision':
      return await callOpenAI('chat/completions', {
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: args.prompt },
            { type: 'image_url', image_url: { url: args.image_url } }
          ]
        }],
        max_tokens: args.max_tokens || 1000
      });

    case 'openai_function_calling':
      return await callOpenAI('chat/completions', {
        model: args.model || 'gpt-4-turbo-preview',
        messages: args.messages,
        functions: args.functions,
        function_call: args.function_call || 'auto'
      });
    
    case 'openai_moderation':
      return await callOpenAI('moderations', { input: args.input });
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// MCP Protocol Implementation
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

console.error('OpenAI MCP Server running on stdio');
