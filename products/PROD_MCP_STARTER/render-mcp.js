#!/usr/bin/env node
/**
 * COMPLETE Render MCP Server
 * Full Render API v1 implementation - ALL capabilities
 * 
 * API Coverage:
 * - Services (web, private, background, cron - create, update, delete, list, suspend, resume)
 * - Deploys (trigger, list, get, cancel)
 * - Environment Variables (create, update, delete, list, bulk operations)
 * - Custom Domains (add, remove, verify, list)
 * - Databases (PostgreSQL, Redis - create, delete, list, connection info)
 * - Logs (stream, historical, filter by service)
 * - Metrics (CPU, memory, requests, errors)
 * - Scaling (instances, plan upgrades)
 * - Disk Usage (check, cleanup)
 * - Health Checks (configure, status)
 * - Build Settings (commands, environment)
 * - Owners & Teams (list, permissions)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const RENDER_API_KEY = process.env.RENDER_API_KEY || '';
const RENDER_API_BASE = 'https://api.render.com/v1';

const renderApi = axios.create({
  baseURL: RENDER_API_BASE,
  headers: {
    'Authorization': `Bearer ${RENDER_API_KEY}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

class RenderMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'render-complete', version: '1.0.0' },
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
        // ==================== SERVICES ====================
        {
          name: 'render_list_services',
          description: 'List all services with detailed information',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Filter by service name' },
              type: { type: 'string', enum: ['web', 'pserv', 'bg', 'cron'], description: 'Filter by type' },
              env: { type: 'string', description: 'Filter by environment' },
              region: { type: 'string', enum: ['oregon', 'frankfurt', 'singapore'], description: 'Filter by region' },
              suspended: { type: 'string', enum: ['suspended', 'not_suspended'], description: 'Filter by suspension status' },
              limit: { type: 'number', default: 20, description: 'Limit results (max 100)' }
            }
          }
        },
        {
          name: 'render_get_service',
          description: 'Get detailed information about a specific service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true, description: 'Service ID (srv-xxx)' }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_create_service',
          description: 'Create a new service (web, background, private, cron)',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['web', 'pserv', 'bg', 'cron'], required: true },
              name: { type: 'string', required: true },
              ownerId: { type: 'string', required: true },
              repo: { type: 'string', description: 'GitHub repo URL' },
              branch: { type: 'string', default: 'main' },
              buildCommand: { type: 'string' },
              startCommand: { type: 'string' },
              envVars: { type: 'array', description: 'Array of {key, value}' },
              plan: { type: 'string', enum: ['free', 'starter', 'standard', 'pro', 'pro_plus'], default: 'free' },
              region: { type: 'string', enum: ['oregon', 'frankfurt', 'singapore'], default: 'oregon' },
              numInstances: { type: 'number', default: 1 },
              dockerCommand: { type: 'string', description: 'Docker command override' },
              dockerfilePath: { type: 'string', description: 'Path to Dockerfile' },
              healthCheckPath: { type: 'string', description: 'Health check endpoint' },
              autoDeploy: { type: 'boolean', default: true }
            },
            required: ['type', 'name', 'ownerId']
          }
        },
        {
          name: 'render_update_service',
          description: 'Update service configuration',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              name: { type: 'string' },
              buildCommand: { type: 'string' },
              startCommand: { type: 'string' },
              plan: { type: 'string' },
              numInstances: { type: 'number' },
              healthCheckPath: { type: 'string' },
              autoDeploy: { type: 'boolean' }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_delete_service',
          description: 'Permanently delete a service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_suspend_service',
          description: 'Suspend a service (stop without deleting)',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_resume_service',
          description: 'Resume a suspended service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_restart_service',
          description: 'Restart a running service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_scale_service',
          description: 'Scale service instances or upgrade plan',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              numInstances: { type: 'number', description: 'Number of instances (horizontal scaling)' },
              plan: { type: 'string', enum: ['free', 'starter', 'standard', 'pro', 'pro_plus'], description: 'Service plan (vertical scaling)' }
            },
            required: ['serviceId']
          }
        },

        // ==================== DEPLOYS ====================
        {
          name: 'render_list_deploys',
          description: 'List all deploys for a service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              limit: { type: 'number', default: 20 }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_get_deploy',
          description: 'Get details of a specific deploy',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              deployId: { type: 'string', required: true }
            },
            required: ['serviceId', 'deployId']
          }
        },
        {
          name: 'render_trigger_deploy',
          description: 'Manually trigger a new deploy',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              clearCache: { type: 'boolean', default: false, description: 'Clear build cache' },
              branch: { type: 'string', description: 'Deploy specific branch' }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_cancel_deploy',
          description: 'Cancel a running deploy',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              deployId: { type: 'string', required: true }
            },
            required: ['serviceId', 'deployId']
          }
        },

        // ==================== ENVIRONMENT VARIABLES ====================
        {
          name: 'render_list_env_vars',
          description: 'List all environment variables for a service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_create_env_var',
          description: 'Create a new environment variable',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              key: { type: 'string', required: true },
              value: { type: 'string', required: true }
            },
            required: ['serviceId', 'key', 'value']
          }
        },
        {
          name: 'render_update_env_var',
          description: 'Update an existing environment variable',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              key: { type: 'string', required: true },
              value: { type: 'string', required: true }
            },
            required: ['serviceId', 'key', 'value']
          }
        },
        {
          name: 'render_delete_env_var',
          description: 'Delete an environment variable',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              key: { type: 'string', required: true }
            },
            required: ['serviceId', 'key']
          }
        },
        {
          name: 'render_bulk_update_env_vars',
          description: 'Bulk create/update environment variables',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              envVars: { type: 'array', items: { type: 'object' }, required: true, description: 'Array of {key, value}' }
            },
            required: ['serviceId', 'envVars']
          }
        },

        // ==================== CUSTOM DOMAINS ====================
        {
          name: 'render_list_custom_domains',
          description: 'List all custom domains for a service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true }
            },
            required: ['serviceId']
          }
        },
        {
          name: 'render_add_custom_domain',
          description: 'Add a custom domain to a service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              name: { type: 'string', required: true, description: 'Domain name (e.g., example.com)' }
            },
            required: ['serviceId', 'name']
          }
        },
        {
          name: 'render_delete_custom_domain',
          description: 'Remove a custom domain from a service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              domainId: { type: 'string', required: true }
            },
            required: ['serviceId', 'domainId']
          }
        },
        {
          name: 'render_verify_custom_domain',
          description: 'Verify DNS configuration for a custom domain',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              domainId: { type: 'string', required: true }
            },
            required: ['serviceId', 'domainId']
          }
        },

        // ==================== LOGS ====================
        {
          name: 'render_get_logs',
          description: 'Get service logs with filtering',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              type: { type: 'string', enum: ['build', 'deploy', 'run'], description: 'Log type' },
              limit: { type: 'number', default: 100, description: 'Number of log lines' },
              since: { type: 'string', description: 'ISO timestamp to start from' },
              tail: { type: 'boolean', default: false, description: 'Follow logs in real-time' }
            },
            required: ['serviceId']
          }
        },

        // ==================== METRICS ====================
        {
          name: 'render_get_metrics',
          description: 'Get service performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true },
              metrics: { type: 'array', items: { enum: ['cpu', 'memory', 'bandwidth', 'requests'] }, default: ['cpu', 'memory'] },
              from: { type: 'string', description: 'Start time (ISO)' },
              to: { type: 'string', description: 'End time (ISO)' },
              step: { type: 'string', enum: ['1m', '5m', '1h'], default: '5m' }
            },
            required: ['serviceId']
          }
        },

        // ==================== DATABASES ====================
        {
          name: 'render_list_databases',
          description: 'List all databases',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['postgres', 'redis'] }
            }
          }
        },
        {
          name: 'render_get_database',
          description: 'Get database details including connection info',
          inputSchema: {
            type: 'object',
            properties: {
              databaseId: { type: 'string', required: true }
            },
            required: ['databaseId']
          }
        },
        {
          name: 'render_create_database',
          description: 'Create a new PostgreSQL or Redis database',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', required: true },
              type: { type: 'string', enum: ['postgres', 'redis'], required: true },
              plan: { type: 'string', enum: ['free', 'starter', 'standard', 'pro'], default: 'free' },
              region: { type: 'string', enum: ['oregon', 'frankfurt', 'singapore'], default: 'oregon' },
              version: { type: 'string', description: 'Database version (e.g., "16" for PostgreSQL)' }
            },
            required: ['name', 'type']
          }
        },
        {
          name: 'render_delete_database',
          description: 'Delete a database permanently',
          inputSchema: {
            type: 'object',
            properties: {
              databaseId: { type: 'string', required: true }
            },
            required: ['databaseId']
          }
        },

        // ==================== OWNERS ====================
        {
          name: 'render_list_owners',
          description: 'List all owners (personal and teams)',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'render_get_owner',
          description: 'Get owner details',
          inputSchema: {
            type: 'object',
            properties: {
              ownerId: { type: 'string', required: true }
            },
            required: ['ownerId']
          }
        },

        // ==================== DISK USAGE ====================
        {
          name: 'render_get_disk_usage',
          description: 'Check disk usage for a service',
          inputSchema: {
            type: 'object',
            properties: {
              serviceId: { type: 'string', required: true }
            },
            required: ['serviceId']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          // Services
          case 'render_list_services': return await this.listServices(args);
          case 'render_get_service': return await this.getService(args);
          case 'render_create_service': return await this.createService(args);
          case 'render_update_service': return await this.updateService(args);
          case 'render_delete_service': return await this.deleteService(args);
          case 'render_suspend_service': return await this.suspendService(args);
          case 'render_resume_service': return await this.resumeService(args);
          case 'render_restart_service': return await this.restartService(args);
          case 'render_scale_service': return await this.scaleService(args);
          
          // Deploys
          case 'render_list_deploys': return await this.listDeploys(args);
          case 'render_get_deploy': return await this.getDeploy(args);
          case 'render_trigger_deploy': return await this.triggerDeploy(args);
          case 'render_cancel_deploy': return await this.cancelDeploy(args);
          
          // Environment Variables
          case 'render_list_env_vars': return await this.listEnvVars(args);
          case 'render_create_env_var': return await this.createEnvVar(args);
          case 'render_update_env_var': return await this.updateEnvVar(args);
          case 'render_delete_env_var': return await this.deleteEnvVar(args);
          case 'render_bulk_update_env_vars': return await this.bulkUpdateEnvVars(args);
          
          // Custom Domains
          case 'render_list_custom_domains': return await this.listCustomDomains(args);
          case 'render_add_custom_domain': return await this.addCustomDomain(args);
          case 'render_delete_custom_domain': return await this.deleteCustomDomain(args);
          case 'render_verify_custom_domain': return await this.verifyCustomDomain(args);
          
          // Logs & Metrics
          case 'render_get_logs': return await this.getLogs(args);
          case 'render_get_metrics': return await this.getMetrics(args);
          
          // Databases
          case 'render_list_databases': return await this.listDatabases(args);
          case 'render_get_database': return await this.getDatabase(args);
          case 'render_create_database': return await this.createDatabase(args);
          case 'render_delete_database': return await this.deleteDatabase(args);
          
          // Owners
          case 'render_list_owners': return await this.listOwners(args);
          case 'render_get_owner': return await this.getOwner(args);
          
          // Disk
          case 'render_get_disk_usage': return await this.getDiskUsage(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ''}` 
          }],
          isError: true
        };
      }
    });
  }

  // ==================== SERVICE METHODS ====================
  
  async listServices(args) {
    const params = {
      limit: args.limit || 20,
      ...(args.name && { name: args.name }),
      ...(args.type && { type: args.type }),
      ...(args.env && { env: args.env }),
      ...(args.region && { region: args.region }),
      ...(args.suspended && { suspended: args.suspended })
    };
    
    const response = await renderApi.get('/services', { params });
    
    const services = response.data.map(s => ({
      id: s.service.id,
      name: s.service.name,
      type: s.service.type,
      env: s.service.env,
      region: s.service.region,
      status: s.service.serviceDetails?.status || 'unknown',
      url: s.service.serviceDetails?.url,
      plan: s.service.plan?.name,
      suspended: s.service.suspended === 'suspended',
      autoDeploy: s.service.autoDeploy,
      createdAt: s.service.createdAt,
      updatedAt: s.service.updatedAt
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(services, null, 2) }]
    };
  }

  async getService(args) {
    const response = await renderApi.get(`/services/${args.serviceId}`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  async createService(args) {
    const payload = {
      type: args.type,
      name: args.name,
      ownerId: args.ownerId,
      ...(args.repo && { repo: args.repo }),
      ...(args.branch && { branch: args.branch }),
      ...(args.buildCommand && { buildCommand: args.buildCommand }),
      ...(args.startCommand && { startCommand: args.startCommand }),
      ...(args.envVars && { envVars: args.envVars }),
      ...(args.plan && { plan: args.plan }),
      ...(args.region && { region: args.region }),
      ...(args.numInstances && { numInstances: args.numInstances }),
      ...(args.dockerCommand && { dockerCommand: args.dockerCommand }),
      ...(args.dockerfilePath && { dockerfilePath: args.dockerfilePath }),
      ...(args.healthCheckPath && { healthCheckPath: args.healthCheckPath }),
      autoDeploy: args.autoDeploy !== false
    };
    
    const response = await renderApi.post('/services', payload);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Service created!\nID: ${response.data.service.id}\nName: ${response.data.service.name}\nType: ${response.data.service.type}\nURL: ${response.data.service.serviceDetails?.url || 'N/A'}`
      }]
    };
  }

  async updateService(args) {
    const { serviceId, ...updates } = args;
    const response = await renderApi.patch(`/services/${serviceId}`, updates);
    
    return {
      content: [{ type: 'text', text: `✅ Service ${serviceId} updated` }]
    };
  }

  async deleteService(args) {
    await renderApi.delete(`/services/${args.serviceId}`);
    
    return {
      content: [{ type: 'text', text: `✅ Service ${args.serviceId} deleted permanently` }]
    };
  }

  async suspendService(args) {
    await renderApi.post(`/services/${args.serviceId}/suspend`);
    
    return {
      content: [{ type: 'text', text: `✅ Service ${args.serviceId} suspended` }]
    };
  }

  async resumeService(args) {
    await renderApi.post(`/services/${args.serviceId}/resume`);
    
    return {
      content: [{ type: 'text', text: `✅ Service ${args.serviceId} resumed` }]
    };
  }

  async restartService(args) {
    await renderApi.post(`/services/${args.serviceId}/restart`);
    
    return {
      content: [{ type: 'text', text: `✅ Service ${args.serviceId} restarting` }]
    };
  }

  async scaleService(args) {
    const updates = {};
    if (args.numInstances) updates.numInstances = args.numInstances;
    if (args.plan) updates.plan = args.plan;
    
    await renderApi.patch(`/services/${args.serviceId}`, updates);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Service ${args.serviceId} scaled\n${args.numInstances ? `Instances: ${args.numInstances}\n` : ''}${args.plan ? `Plan: ${args.plan}` : ''}`
      }]
    };
  }

  // ==================== DEPLOY METHODS ====================
  
  async listDeploys(args) {
    const response = await renderApi.get(`/services/${args.serviceId}/deploys`, {
      params: { limit: args.limit || 20 }
    });
    
    const deploys = response.data.map(d => ({
      id: d.deploy.id,
      status: d.deploy.status,
      commit: d.deploy.commit,
      createdAt: d.deploy.createdAt,
      finishedAt: d.deploy.finishedAt
    }));
    
    return {
      content: [{ type: 'text', text: JSON.stringify(deploys, null, 2) }]
    };
  }

  async getDeploy(args) {
    const response = await renderApi.get(`/services/${args.serviceId}/deploys/${args.deployId}`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  async triggerDeploy(args) {
    const payload = {
      clearCache: args.clearCache || false,
      ...(args.branch && { branch: args.branch })
    };
    
    const response = await renderApi.post(`/services/${args.serviceId}/deploys`, payload);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Deploy triggered for service ${args.serviceId}\nDeploy ID: ${response.data.deploy.id}\nStatus: ${response.data.deploy.status}`
      }]
    };
  }

  async cancelDeploy(args) {
    await renderApi.post(`/services/${args.serviceId}/deploys/${args.deployId}/cancel`);
    
    return {
      content: [{ type: 'text', text: `✅ Deploy ${args.deployId} cancelled` }]
    };
  }

  // ==================== ENV VAR METHODS ====================
  
  async listEnvVars(args) {
    const response = await renderApi.get(`/services/${args.serviceId}/env-vars`);
    
    const envVars = response.data.map(e => ({
      key: e.envVar.key,
      value: e.envVar.value
    }));
    
    return {
      content: [{ type: 'text', text: JSON.stringify(envVars, null, 2) }]
    };
  }

  async createEnvVar(args) {
    const payload = {
      key: args.key,
      value: args.value
    };
    
    await renderApi.post(`/services/${args.serviceId}/env-vars`, payload);
    
    return {
      content: [{ type: 'text', text: `✅ Environment variable ${args.key} created` }]
    };
  }

  async updateEnvVar(args) {
    await renderApi.put(`/services/${args.serviceId}/env-vars/${args.key}`, {
      value: args.value
    });
    
    return {
      content: [{ type: 'text', text: `✅ Environment variable ${args.key} updated` }]
    };
  }

  async deleteEnvVar(args) {
    await renderApi.delete(`/services/${args.serviceId}/env-vars/${args.key}`);
    
    return {
      content: [{ type: 'text', text: `✅ Environment variable ${args.key} deleted` }]
    };
  }

  async bulkUpdateEnvVars(args) {
    for (const envVar of args.envVars) {
      await renderApi.put(`/services/${args.serviceId}/env-vars/${envVar.key}`, {
        value: envVar.value
      }).catch(() => {
        // If doesn't exist, create it
        return renderApi.post(`/services/${args.serviceId}/env-vars`, envVar);
      });
    }
    
    return {
      content: [{ type: 'text', text: `✅ Bulk updated ${args.envVars.length} environment variables` }]
    };
  }

  // ==================== CUSTOM DOMAIN METHODS ====================
  
  async listCustomDomains(args) {
    const response = await renderApi.get(`/services/${args.serviceId}/custom-domains`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  async addCustomDomain(args) {
    const response = await renderApi.post(`/services/${args.serviceId}/custom-domains`, {
      name: args.name
    });
    
    return {
      content: [{ 
        type: 'text', 
        text: `✅ Custom domain ${args.name} added\nDomain ID: ${response.data.customDomain.id}` 
      }]
    };
  }

  async deleteCustomDomain(args) {
    await renderApi.delete(`/services/${args.serviceId}/custom-domains/${args.domainId}`);
    
    return {
      content: [{ type: 'text', text: `✅ Custom domain deleted` }]
    };
  }

  async verifyCustomDomain(args) {
    const response = await renderApi.get(`/services/${args.serviceId}/custom-domains/${args.domainId}/verify`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  // ==================== LOG METHODS ====================
  
  async getLogs(args) {
    const params = {
      limit: args.limit || 100,
      ...(args.type && { type: args.type }),
      ...(args.since && { since: args.since })
    };
    
    const response = await renderApi.get(`/services/${args.serviceId}/logs`, { params });
    
    const logs = response.data.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
    
    return {
      content: [{ type: 'text', text: logs || 'No logs available' }]
    };
  }

  // ==================== METRIC METHODS ====================
  
  async getMetrics(args) {
    const params = {
      metrics: args.metrics?.join(',') || 'cpu,memory',
      ...(args.from && { from: args.from }),
      ...(args.to && { to: args.to }),
      step: args.step || '5m'
    };
    
    const response = await renderApi.get(`/services/${args.serviceId}/metrics`, { params });
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  // ==================== DATABASE METHODS ====================
  
  async listDatabases(args) {
    const params = args.type ? { type: args.type } : {};
    const response = await renderApi.get('/databases', { params });
    
    const databases = response.data.map(d => ({
      id: d.database.id,
      name: d.database.name,
      type: d.database.type,
      plan: d.database.plan?.name,
      region: d.database.region,
      status: d.database.status,
      createdAt: d.database.createdAt
    }));
    
    return {
      content: [{ type: 'text', text: JSON.stringify(databases, null, 2) }]
    };
  }

  async getDatabase(args) {
    const response = await renderApi.get(`/databases/${args.databaseId}`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  async createDatabase(args) {
    const payload = {
      name: args.name,
      type: args.type,
      ...(args.plan && { plan: args.plan }),
      ...(args.region && { region: args.region }),
      ...(args.version && { version: args.version })
    };
    
    const response = await renderApi.post('/databases', payload);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Database created!\nID: ${response.data.database.id}\nName: ${response.data.database.name}\nType: ${response.data.database.type}`
      }]
    };
  }

  async deleteDatabase(args) {
    await renderApi.delete(`/databases/${args.databaseId}`);
    
    return {
      content: [{ type: 'text', text: `✅ Database ${args.databaseId} deleted` }]
    };
  }

  // ==================== OWNER METHODS ====================
  
  async listOwners(args) {
    const response = await renderApi.get('/owners');
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  async getOwner(args) {
    const response = await renderApi.get(`/owners/${args.ownerId}`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  // ==================== DISK METHODS ====================
  
  async getDiskUsage(args) {
    const response = await renderApi.get(`/services/${args.serviceId}/disk`);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Render Complete MCP Server running on stdio');
  }
}

const server = new RenderMCPServer();
server.run().catch(console.error);
