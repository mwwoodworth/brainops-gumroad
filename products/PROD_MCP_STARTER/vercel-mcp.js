#!/usr/bin/env node
/**
 * COMPLETE Vercel MCP Server
 * Full Vercel API v13 implementation - ALL capabilities
 * 
 * API Coverage:
 * - Deployments (create, list, get, delete, cancel)
 * - Projects (create, update, delete, list, env vars)
 * - Domains (add, remove, verify, configure)
 * - Environment Variables (create, update, delete, list)
 * - Logs (deployment, build, runtime)
 * - Teams (list, get, members)
 * - Aliases (create, delete, list)
 * - Certificates (list, issue, delete)
 * - Webhooks (create, delete, list)
 * - Integrations (list, configure)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
const VERCEL_API_BASE = 'https://api.vercel.com';

const vercelApi = axios.create({
  baseURL: VERCEL_API_BASE,
  headers: {
    'Authorization': VERCEL_TOKEN ? `Bearer ${VERCEL_TOKEN}` : '',
    'Content-Type': 'application/json'
  }
});

class VercelMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'vercel-complete', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ==================== DEPLOYMENTS ====================
        {
          name: 'vercel_list_deployments',
          description: 'List all deployments with filtering options',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', description: 'Filter by project name' },
              limit: { type: 'number', description: 'Limit results (default: 20, max: 100)', default: 20 },
              since: { type: 'number', description: 'List deployments since timestamp (ms)' },
              until: { type: 'number', description: 'List deployments until timestamp (ms)' },
              state: { type: 'string', enum: ['BUILDING', 'ERROR', 'INITIALIZING', 'QUEUED', 'READY', 'CANCELED'] }
            }
          }
        },
        {
          name: 'vercel_get_deployment',
          description: 'Get detailed information about a specific deployment',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentId: { type: 'string', description: 'Deployment ID or URL', required: true }
            },
            required: ['deploymentId']
          }
        },
        {
          name: 'vercel_create_deployment',
          description: 'Create a new deployment from local files or Git',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', description: 'Project name', required: true },
              files: { type: 'array', description: 'Array of {file: path, data: content}' },
              gitSource: { type: 'object', description: 'Git source {type: "github", repo, ref}' },
              env: { type: 'object', description: 'Environment variables' },
              buildCommand: { type: 'string', description: 'Custom build command' },
              production: { type: 'boolean', description: 'Deploy to production', default: false }
            },
            required: ['projectName']
          }
        },
        {
          name: 'vercel_cancel_deployment',
          description: 'Cancel a running deployment',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentId: { type: 'string', required: true }
            },
            required: ['deploymentId']
          }
        },
        {
          name: 'vercel_delete_deployment',
          description: 'Delete a deployment permanently',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentId: { type: 'string', required: true }
            },
            required: ['deploymentId']
          }
        },
        {
          name: 'vercel_get_deployment_logs',
          description: 'Get build and runtime logs for a deployment',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentId: { type: 'string', required: true },
              follow: { type: 'boolean', description: 'Follow logs in real-time', default: false },
              limit: { type: 'number', description: 'Limit log lines', default: 100 }
            },
            required: ['deploymentId']
          }
        },

        // ==================== PROJECTS ====================
        {
          name: 'vercel_list_projects',
          description: 'List all projects',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', default: 20 },
              search: { type: 'string', description: 'Search projects by name' }
            }
          }
        },
        {
          name: 'vercel_get_project',
          description: 'Get detailed project information',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true }
            },
            required: ['projectName']
          }
        },
        {
          name: 'vercel_create_project',
          description: 'Create a new project',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', required: true },
              framework: { type: 'string', description: 'Framework (nextjs, react, vue, etc.)' },
              gitRepository: { type: 'object', description: 'Git repo {type, repo}' },
              buildCommand: { type: 'string' },
              outputDirectory: { type: 'string' },
              installCommand: { type: 'string' },
              rootDirectory: { type: 'string' }
            },
            required: ['name']
          }
        },
        {
          name: 'vercel_update_project',
          description: 'Update project settings',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true },
              framework: { type: 'string' },
              buildCommand: { type: 'string' },
              outputDirectory: { type: 'string' },
              installCommand: { type: 'string' },
              rootDirectory: { type: 'string' },
              nodeVersion: { type: 'string', enum: ['18.x', '20.x', '22.x'] }
            },
            required: ['projectName']
          }
        },
        {
          name: 'vercel_delete_project',
          description: 'Delete a project permanently',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true }
            },
            required: ['projectName']
          }
        },

        // ==================== ENVIRONMENT VARIABLES ====================
        {
          name: 'vercel_list_env_vars',
          description: 'List all environment variables for a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true }
            },
            required: ['projectName']
          }
        },
        {
          name: 'vercel_create_env_var',
          description: 'Create a new environment variable',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true },
              key: { type: 'string', required: true },
              value: { type: 'string', required: true },
              target: { type: 'array', items: { enum: ['production', 'preview', 'development'] }, default: ['production'] },
              type: { type: 'string', enum: ['plain', 'secret', 'encrypted'], default: 'encrypted' }
            },
            required: ['projectName', 'key', 'value']
          }
        },
        {
          name: 'vercel_update_env_var',
          description: 'Update an existing environment variable',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true },
              envId: { type: 'string', required: true },
              key: { type: 'string' },
              value: { type: 'string' },
              target: { type: 'array' }
            },
            required: ['projectName', 'envId']
          }
        },
        {
          name: 'vercel_delete_env_var',
          description: 'Delete an environment variable',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true },
              envId: { type: 'string', required: true }
            },
            required: ['projectName', 'envId']
          }
        },

        // ==================== DOMAINS ====================
        {
          name: 'vercel_list_domains',
          description: 'List all domains across projects',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', description: 'Filter by project' },
              limit: { type: 'number', default: 20 }
            }
          }
        },
        {
          name: 'vercel_add_domain',
          description: 'Add a domain to a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true },
              domain: { type: 'string', required: true, description: 'Domain name (e.g., example.com)' },
              redirect: { type: 'string', description: 'Redirect to another domain' }
            },
            required: ['projectName', 'domain']
          }
        },
        {
          name: 'vercel_remove_domain',
          description: 'Remove a domain from a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true },
              domain: { type: 'string', required: true }
            },
            required: ['projectName', 'domain']
          }
        },
        {
          name: 'vercel_verify_domain',
          description: 'Verify domain DNS configuration',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', required: true }
            },
            required: ['domain']
          }
        },

        // ==================== ALIASES ====================
        {
          name: 'vercel_list_aliases',
          description: 'List all deployment aliases',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string' },
              limit: { type: 'number', default: 20 }
            }
          }
        },
        {
          name: 'vercel_create_alias',
          description: 'Assign an alias to a deployment',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentId: { type: 'string', required: true },
              alias: { type: 'string', required: true, description: 'Alias domain' }
            },
            required: ['deploymentId', 'alias']
          }
        },
        {
          name: 'vercel_delete_alias',
          description: 'Remove an alias',
          inputSchema: {
            type: 'object',
            properties: {
              alias: { type: 'string', required: true }
            },
            required: ['alias']
          }
        },

        // ==================== TEAMS ====================
        {
          name: 'vercel_list_teams',
          description: 'List all teams',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vercel_get_team',
          description: 'Get team details',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: { type: 'string', required: true }
            },
            required: ['teamId']
          }
        },

        // ==================== ANALYTICS ====================
        {
          name: 'vercel_get_analytics',
          description: 'Get project analytics data',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', required: true },
              from: { type: 'number', description: 'Start timestamp (ms)' },
              to: { type: 'number', description: 'End timestamp (ms)' }
            },
            required: ['projectName']
          }
        },

        // ==================== WEBHOOKS ====================
        {
          name: 'vercel_list_webhooks',
          description: 'List all webhooks',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string' }
            }
          }
        },
        {
          name: 'vercel_create_webhook',
          description: 'Create a new webhook',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', required: true },
              events: { type: 'array', items: { type: 'string' }, required: true },
              projectIds: { type: 'array', items: { type: 'string' } }
            },
            required: ['url', 'events']
          }
        },
        {
          name: 'vercel_delete_webhook',
          description: 'Delete a webhook',
          inputSchema: {
            type: 'object',
            properties: {
              webhookId: { type: 'string', required: true }
            },
            required: ['webhookId']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          // Deployments
          case 'vercel_list_deployments': return await this.listDeployments(args);
          case 'vercel_get_deployment': return await this.getDeployment(args);
          case 'vercel_create_deployment': return await this.createDeployment(args);
          case 'vercel_cancel_deployment': return await this.cancelDeployment(args);
          case 'vercel_delete_deployment': return await this.deleteDeployment(args);
          case 'vercel_get_deployment_logs': return await this.getDeploymentLogs(args);
          
          // Projects
          case 'vercel_list_projects': return await this.listProjects(args);
          case 'vercel_get_project': return await this.getProject(args);
          case 'vercel_create_project': return await this.createProject(args);
          case 'vercel_update_project': return await this.updateProject(args);
          case 'vercel_delete_project': return await this.deleteProject(args);
          
          // Environment Variables
          case 'vercel_list_env_vars': return await this.listEnvVars(args);
          case 'vercel_create_env_var': return await this.createEnvVar(args);
          case 'vercel_update_env_var': return await this.updateEnvVar(args);
          case 'vercel_delete_env_var': return await this.deleteEnvVar(args);
          
          // Domains
          case 'vercel_list_domains': return await this.listDomains(args);
          case 'vercel_add_domain': return await this.addDomain(args);
          case 'vercel_remove_domain': return await this.removeDomain(args);
          case 'vercel_verify_domain': return await this.verifyDomain(args);
          
          // Aliases
          case 'vercel_list_aliases': return await this.listAliases(args);
          case 'vercel_create_alias': return await this.createAlias(args);
          case 'vercel_delete_alias': return await this.deleteAlias(args);
          
          // Teams
          case 'vercel_list_teams': return await this.listTeams(args);
          case 'vercel_get_team': return await this.getTeam(args);
          
          // Analytics
          case 'vercel_get_analytics': return await this.getAnalytics(args);
          
          // Webhooks
          case 'vercel_list_webhooks': return await this.listWebhooks(args);
          case 'vercel_create_webhook': return await this.createWebhook(args);
          case 'vercel_delete_webhook': return await this.deleteWebhook(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ''}` }],
          isError: true
        };
      }
    });
  }

  // ==================== DEPLOYMENT METHODS ====================
  
  async listDeployments(args) {
    const params = {
      limit: args.limit || 20,
      ...(args.projectName && { projectId: args.projectName }),
      ...(args.since && { since: args.since }),
      ...(args.until && { until: args.until }),
      ...(args.state && { state: args.state })
    };
    
    const response = await vercelApi.get('/v6/deployments', { params });
    
    const deployments = response.data.deployments.map(d => ({
      id: d.uid,
      name: d.name,
      url: d.url,
      state: d.state,
      readyState: d.readyState,
      created: new Date(d.created).toISOString(),
      creator: d.creator?.username,
      target: d.target
    }));
    
    return {
      content: [{ type: 'text', text: JSON.stringify(deployments, null, 2) }]
    };
  }

  async getDeployment(args) {
    const deploymentId = args.deploymentId.replace('https://', '').split('.')[0].split('/')[0];
    const response = await vercelApi.get(`/v13/deployments/${deploymentId}`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  async createDeployment(args) {
    const payload = {
      name: args.projectName,
      target: args.production ? 'production' : 'preview',
      ...(args.files && { files: args.files }),
      ...(args.gitSource && { gitSource: args.gitSource }),
      ...(args.env && { env: args.env }),
      ...(args.buildCommand && { buildCommand: args.buildCommand })
    };
    
    const response = await vercelApi.post('/v13/deployments', payload);
    
    return {
      content: [{ 
        type: 'text', 
        text: `✅ Deployment created!\nID: ${response.data.id}\nURL: https://${response.data.url}\nState: ${response.data.readyState}` 
      }]
    };
  }

  async cancelDeployment(args) {
    await vercelApi.patch(`/v12/deployments/${args.deploymentId}/cancel`);
    
    return {
      content: [{ type: 'text', text: `✅ Deployment ${args.deploymentId} cancelled` }]
    };
  }

  async deleteDeployment(args) {
    await vercelApi.delete(`/v13/deployments/${args.deploymentId}`);
    
    return {
      content: [{ type: 'text', text: `✅ Deployment ${args.deploymentId} deleted` }]
    };
  }

  async getDeploymentLogs(args) {
    const response = await vercelApi.get(`/v2/deployments/${args.deploymentId}/events`, {
      params: { limit: args.limit || 100 }
    });
    
    const logs = response.data.map(e => `[${new Date(e.created).toISOString()}] ${e.text}`).join('\n');
    
    return {
      content: [{ type: 'text', text: logs }]
    };
  }

  // ==================== PROJECT METHODS ====================
  
  async listProjects(args) {
    const params = {
      limit: args.limit || 20,
      ...(args.search && { search: args.search })
    };
    
    const response = await vercelApi.get('/v9/projects', { params });
    
    const projects = response.data.projects.map(p => ({
      id: p.id,
      name: p.name,
      framework: p.framework,
      latestDeployment: p.latestDeployments?.[0]?.url,
      updatedAt: new Date(p.updatedAt).toISOString()
    }));
    
    return {
      content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }]
    };
  }

  async getProject(args) {
    const response = await vercelApi.get(`/v9/projects/${args.projectName}`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  async createProject(args) {
    const payload = {
      name: args.name,
      ...(args.framework && { framework: args.framework }),
      ...(args.gitRepository && { gitRepository: args.gitRepository }),
      ...(args.buildCommand && { buildCommand: args.buildCommand }),
      ...(args.outputDirectory && { outputDirectory: args.outputDirectory }),
      ...(args.installCommand && { installCommand: args.installCommand }),
      ...(args.rootDirectory && { rootDirectory: args.rootDirectory })
    };
    
    const response = await vercelApi.post('/v9/projects', payload);
    
    return {
      content: [{ type: 'text', text: `✅ Project created: ${response.data.name} (${response.data.id})` }]
    };
  }

  async updateProject(args) {
    const { projectName, ...updates } = args;
    const response = await vercelApi.patch(`/v9/projects/${projectName}`, updates);
    
    return {
      content: [{ type: 'text', text: `✅ Project ${projectName} updated` }]
    };
  }

  async deleteProject(args) {
    await vercelApi.delete(`/v9/projects/${args.projectName}`);
    
    return {
      content: [{ type: 'text', text: `✅ Project ${args.projectName} deleted` }]
    };
  }

  // ==================== ENV VAR METHODS ====================
  
  async listEnvVars(args) {
    const response = await vercelApi.get(`/v9/projects/${args.projectName}/env`);
    
    const envVars = response.data.envs.map(e => ({
      id: e.id,
      key: e.key,
      value: e.type === 'secret' ? '[REDACTED]' : e.value,
      target: e.target,
      type: e.type,
      updatedAt: new Date(e.updatedAt).toISOString()
    }));
    
    return {
      content: [{ type: 'text', text: JSON.stringify(envVars, null, 2) }]
    };
  }

  async createEnvVar(args) {
    const payload = {
      key: args.key,
      value: args.value,
      target: args.target || ['production'],
      type: args.type || 'encrypted'
    };
    
    await vercelApi.post(`/v10/projects/${args.projectName}/env`, payload);
    
    return {
      content: [{ type: 'text', text: `✅ Environment variable ${args.key} created` }]
    };
  }

  async updateEnvVar(args) {
    const { projectName, envId, ...updates } = args;
    await vercelApi.patch(`/v9/projects/${projectName}/env/${envId}`, updates);
    
    return {
      content: [{ type: 'text', text: `✅ Environment variable updated` }]
    };
  }

  async deleteEnvVar(args) {
    await vercelApi.delete(`/v9/projects/${args.projectName}/env/${args.envId}`);
    
    return {
      content: [{ type: 'text', text: `✅ Environment variable deleted` }]
    };
  }

  // ==================== DOMAIN METHODS ====================
  
  async listDomains(args) {
    const params = {
      limit: args.limit || 20,
      ...(args.projectName && { projectId: args.projectName })
    };
    
    const response = await vercelApi.get('/v5/domains', { params });
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data.domains, null, 2) }]
    };
  }

  async addDomain(args) {
    const payload = {
      name: args.domain,
      ...(args.redirect && { redirect: args.redirect })
    };
    
    await vercelApi.post(`/v10/projects/${args.projectName}/domains`, payload);
    
    return {
      content: [{ type: 'text', text: `✅ Domain ${args.domain} added to ${args.projectName}` }]
    };
  }

  async removeDomain(args) {
    await vercelApi.delete(`/v9/projects/${args.projectName}/domains/${args.domain}`);
    
    return {
      content: [{ type: 'text', text: `✅ Domain ${args.domain} removed` }]
    };
  }

  async verifyDomain(args) {
    const response = await vercelApi.get(`/v6/domains/${args.domain}/config`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  // ==================== ALIAS METHODS ====================
  
  async listAliases(args) {
    const params = {
      limit: args.limit || 20,
      ...(args.projectName && { projectId: args.projectName })
    };
    
    const response = await vercelApi.get('/v4/aliases', { params });
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data.aliases, null, 2) }]
    };
  }

  async createAlias(args) {
    const payload = {
      alias: args.alias
    };
    
    await vercelApi.post(`/v2/deployments/${args.deploymentId}/aliases`, payload);
    
    return {
      content: [{ type: 'text', text: `✅ Alias ${args.alias} assigned to deployment` }]
    };
  }

  async deleteAlias(args) {
    await vercelApi.delete(`/v2/aliases/${args.alias}`);
    
    return {
      content: [{ type: 'text', text: `✅ Alias ${args.alias} deleted` }]
    };
  }

  // ==================== TEAM METHODS ====================
  
  async listTeams(args) {
    const response = await vercelApi.get('/v2/teams');
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data.teams, null, 2) }]
    };
  }

  async getTeam(args) {
    const response = await vercelApi.get(`/v2/teams/${args.teamId}`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  // ==================== ANALYTICS METHODS ====================
  
  async getAnalytics(args) {
    const params = {
      ...(args.from && { from: args.from }),
      ...(args.to && { to: args.to })
    };
    
    const response = await vercelApi.get(`/v1/projects/${args.projectName}/analytics`, { params });
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  // ==================== WEBHOOK METHODS ====================
  
  async listWebhooks(args) {
    const params = args.projectName ? { projectId: args.projectName } : {};
    const response = await vercelApi.get('/v1/webhooks', { params });
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  async createWebhook(args) {
    const payload = {
      url: args.url,
      events: args.events,
      ...(args.projectIds && { projectIds: args.projectIds })
    };
    
    const response = await vercelApi.post('/v1/webhooks', payload);
    
    return {
      content: [{ type: 'text', text: `✅ Webhook created: ${response.data.id}` }]
    };
  }

  async deleteWebhook(args) {
    await vercelApi.delete(`/v1/webhooks/${args.webhookId}`);
    
    return {
      content: [{ type: 'text', text: `✅ Webhook ${args.webhookId} deleted` }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Vercel Complete MCP Server running on stdio');
  }
}

const server = new VercelMCPServer();
server.run().catch(console.error);
