#!/usr/bin/env node

/**
 * BrainOps Gumroad MCP Server - Complete Implementation
 *
 * Complete Gumroad API control for digital product sales automation.
 * Enables creating products, managing sales, tracking revenue, and customer management.
 *
 * Features:
 * - Product management (create, update, delete, list)
 * - Sales tracking and analytics
 * - Customer management
 * - Offer/discount code management
 * - License key management
 * - Webhook configuration
 *
 * Environment Variables:
 * - GUMROAD_ACCESS_TOKEN: Gumroad API access token
 *
 * API Docs: https://app.gumroad.com/api
 *
 * Created: 2025-12-16
 * Version: 1.0.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

class GumroadMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'gumroad-complete',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN;
    if (!GUMROAD_ACCESS_TOKEN) {
      console.error('Warning: GUMROAD_ACCESS_TOKEN not set');
    }

    this.gumroad = axios.create({
      baseURL: 'https://api.gumroad.com/v2',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${GUMROAD_ACCESS_TOKEN}`
      }
    });

    this.accessToken = GUMROAD_ACCESS_TOKEN;
    this.setupHandlers();
    this.setupErrorHandling();
  }

  toFormData(obj) {
    const params = new URLSearchParams();
    params.append('access_token', this.accessToken);
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
    return params;
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[Gumroad MCP Error]', error);
    process.on('SIGINT', async () => { await this.server.close(); process.exit(0); });
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        { name: 'gumroad_list_products', description: 'List all products', inputSchema: { type: 'object', properties: {}, required: [] } },
        { name: 'gumroad_get_product', description: 'Get product details', inputSchema: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'] } },
        { name: 'gumroad_create_product', description: 'Create a new product', inputSchema: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'number' }, description: { type: 'string' }, url: { type: 'string' } }, required: ['name', 'price'] } },
        { name: 'gumroad_update_product', description: 'Update a product', inputSchema: { type: 'object', properties: { product_id: { type: 'string' }, name: { type: 'string' }, price: { type: 'number' }, description: { type: 'string' } }, required: ['product_id'] } },
        { name: 'gumroad_delete_product', description: 'Delete a product', inputSchema: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'] } },
        { name: 'gumroad_enable_product', description: 'Enable/publish a product', inputSchema: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'] } },
        { name: 'gumroad_disable_product', description: 'Disable/unpublish a product', inputSchema: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'] } },
        { name: 'gumroad_list_sales', description: 'List all sales', inputSchema: { type: 'object', properties: { after: { type: 'string' }, before: { type: 'string' }, product_id: { type: 'string' } }, required: [] } },
        { name: 'gumroad_get_sale', description: 'Get sale details', inputSchema: { type: 'object', properties: { sale_id: { type: 'string' } }, required: ['sale_id'] } },
        { name: 'gumroad_get_revenue_stats', description: 'Get revenue statistics', inputSchema: { type: 'object', properties: { days: { type: 'number', default: 30 } }, required: [] } },
        { name: 'gumroad_list_offer_codes', description: 'List discount codes', inputSchema: { type: 'object', properties: { product_id: { type: 'string' } }, required: ['product_id'] } },
        { name: 'gumroad_create_offer_code', description: 'Create discount code', inputSchema: { type: 'object', properties: { product_id: { type: 'string' }, name: { type: 'string' }, percent_off: { type: 'number' }, amount_off: { type: 'number' } }, required: ['product_id', 'name'] } },
        { name: 'gumroad_delete_offer_code', description: 'Delete discount code', inputSchema: { type: 'object', properties: { product_id: { type: 'string' }, offer_code_id: { type: 'string' } }, required: ['product_id', 'offer_code_id'] } },
        { name: 'gumroad_get_user', description: 'Get account info', inputSchema: { type: 'object', properties: {}, required: [] } },
        { name: 'gumroad_verify_license', description: 'Verify license key', inputSchema: { type: 'object', properties: { product_id: { type: 'string' }, license_key: { type: 'string' } }, required: ['product_id', 'license_key'] } },
        { name: 'gumroad_create_webhook', description: 'Create webhook subscription', inputSchema: { type: 'object', properties: { resource_name: { type: 'string', enum: ['sale', 'refund', 'cancellation'] }, post_url: { type: 'string' } }, required: ['resource_name', 'post_url'] } }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        let result;
        switch (name) {
          case 'gumroad_list_products':
            result = (await this.gumroad.get('/products', { params: { access_token: this.accessToken } })).data;
            break;
          case 'gumroad_get_product':
            result = (await this.gumroad.get(`/products/\${args.product_id}`, { params: { access_token: this.accessToken } })).data;
            break;
          case 'gumroad_create_product':
            result = (await this.gumroad.post('/products', this.toFormData({ name: args.name, price: args.price, description: args.description, url: args.url }))).data;
            break;
          case 'gumroad_update_product':
            const { product_id, ...updates } = args;
            result = (await this.gumroad.put(`/products/\${product_id}`, this.toFormData(updates))).data;
            break;
          case 'gumroad_delete_product':
            result = (await this.gumroad.delete(`/products/\${args.product_id}`, { params: { access_token: this.accessToken } })).data;
            break;
          case 'gumroad_enable_product':
            result = (await this.gumroad.put(`/products/\${args.product_id}/enable`, this.toFormData({}))).data;
            break;
          case 'gumroad_disable_product':
            result = (await this.gumroad.put(`/products/\${args.product_id}/disable`, this.toFormData({}))).data;
            break;
          case 'gumroad_list_sales':
            const salesParams = { access_token: this.accessToken };
            if (args.after) salesParams.after = args.after;
            if (args.before) salesParams.before = args.before;
            if (args.product_id) salesParams.product_id = args.product_id;
            result = (await this.gumroad.get('/sales', { params: salesParams })).data;
            break;
          case 'gumroad_get_sale':
            result = (await this.gumroad.get(`/sales/\${args.sale_id}`, { params: { access_token: this.accessToken } })).data;
            break;
          case 'gumroad_get_revenue_stats':
            const days = args.days || 30;
            const after = new Date(); after.setDate(after.getDate() - days);
            const statsResponse = await this.gumroad.get('/sales', { params: { access_token: this.accessToken, after: after.toISOString().split('T')[0] } });
            const sales = statsResponse.data.sales || [];
            const totalRevenue = sales.reduce((sum, s) => sum + (s.price || 0), 0);
            result = { period_days: days, total_sales: sales.length, total_revenue_cents: totalRevenue, total_revenue: `\$\${(totalRevenue / 100).toFixed(2)}` };
            break;
          case 'gumroad_list_offer_codes':
            result = (await this.gumroad.get(`/products/\${args.product_id}/offer_codes`, { params: { access_token: this.accessToken } })).data;
            break;
          case 'gumroad_create_offer_code':
            result = (await this.gumroad.post(`/products/\${args.product_id}/offer_codes`, this.toFormData({ name: args.name, percent_off: args.percent_off, amount_off: args.amount_off }))).data;
            break;
          case 'gumroad_delete_offer_code':
            result = (await this.gumroad.delete(`/products/\${args.product_id}/offer_codes/\${args.offer_code_id}`, { params: { access_token: this.accessToken } })).data;
            break;
          case 'gumroad_get_user':
            result = (await this.gumroad.get('/user', { params: { access_token: this.accessToken } })).data;
            break;
          case 'gumroad_verify_license':
            result = (await this.gumroad.post('/licenses/verify', this.toFormData({ product_id: args.product_id, license_key: args.license_key }))).data;
            break;
          case 'gumroad_create_webhook':
            result = (await this.gumroad.put('/resource_subscriptions', this.toFormData({ resource_name: args.resource_name, post_url: args.post_url }))).data;
            break;
          default:
            return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: \${name}` }) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: error.message, details: error.response?.data }) }], isError: true };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gumroad MCP server running');
  }
}

new GumroadMCPServer().run().catch(console.error);
