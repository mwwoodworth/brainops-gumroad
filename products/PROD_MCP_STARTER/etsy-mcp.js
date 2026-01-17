#!/usr/bin/env node

/**
 * BrainOps Etsy MCP Server - Complete Implementation
 *
 * Complete Etsy API control for digital product sales on Etsy marketplace.
 * Enables listing management, order tracking, and shop analytics.
 *
 * Features:
 * - Shop management and info
 * - Listing management (create, update, delete)
 * - Order/receipt tracking
 * - Transaction history
 * - Shipping profiles
 * - Shop sections
 * - Reviews and feedback
 *
 * Environment Variables:
 * - ETSY_API_KEY: Etsy API key (keystring)
 * - ETSY_SHARED_SECRET: Etsy shared secret
 * - ETSY_ACCESS_TOKEN: OAuth access token
 * - ETSY_SHOP_ID: Your shop ID
 *
 * API Docs: https://developers.etsy.com/documentation/
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

class EtsyMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'etsy-complete',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiKey = process.env.ETSY_API_KEY;
    this.accessToken = process.env.ETSY_ACCESS_TOKEN;
    this.shopId = process.env.ETSY_SHOP_ID;

    if (!this.apiKey) console.error('Warning: ETSY_API_KEY not set');
    if (!this.accessToken) console.error('Warning: ETSY_ACCESS_TOKEN not set');

    this.etsy = axios.create({
      baseURL: 'https://openapi.etsy.com/v3/application',
      headers: {
        'x-api-key': this.apiKey,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[Etsy MCP Error]', error);
    process.on('SIGINT', async () => { await this.server.close(); process.exit(0); });
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Shop Management
        { name: 'etsy_get_shop', description: 'Get shop details', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' } }, required: [] } },
        { name: 'etsy_get_shop_sections', description: 'Get shop sections', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' } }, required: [] } },
        
        // Listings
        { name: 'etsy_list_active_listings', description: 'List active shop listings', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' }, limit: { type: 'number', default: 25 }, offset: { type: 'number', default: 0 } }, required: [] } },
        { name: 'etsy_get_listing', description: 'Get listing details', inputSchema: { type: 'object', properties: { listing_id: { type: 'number' } }, required: ['listing_id'] } },
        { name: 'etsy_create_draft_listing', description: 'Create a draft listing', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' }, quantity: { type: 'number' }, title: { type: 'string' }, description: { type: 'string' }, price: { type: 'number' }, who_made: { type: 'string', enum: ['i_did', 'someone_else', 'collective'] }, when_made: { type: 'string' }, taxonomy_id: { type: 'number' }, is_digital: { type: 'boolean', default: true }, shipping_profile_id: { type: 'number' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['title', 'description', 'price', 'quantity'] } },
        { name: 'etsy_update_listing', description: 'Update a listing', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' }, listing_id: { type: 'number' }, title: { type: 'string' }, description: { type: 'string' }, price: { type: 'number' }, quantity: { type: 'number' }, state: { type: 'string', enum: ['active', 'inactive', 'draft'] }, tags: { type: 'array' } }, required: ['listing_id'] } },
        { name: 'etsy_delete_listing', description: 'Delete a listing', inputSchema: { type: 'object', properties: { listing_id: { type: 'number' } }, required: ['listing_id'] } },
        
        // Orders/Receipts
        { name: 'etsy_get_shop_receipts', description: 'Get shop orders/receipts', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' }, limit: { type: 'number', default: 25 }, min_created: { type: 'number' }, max_created: { type: 'number' }, was_paid: { type: 'boolean' }, was_shipped: { type: 'boolean' } }, required: [] } },
        { name: 'etsy_get_receipt', description: 'Get receipt details', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' }, receipt_id: { type: 'number' } }, required: ['receipt_id'] } },
        { name: 'etsy_get_receipt_transactions', description: 'Get receipt transactions', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' }, receipt_id: { type: 'number' } }, required: ['receipt_id'] } },
        
        // Transactions
        { name: 'etsy_get_shop_transactions', description: 'Get shop transactions', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' }, limit: { type: 'number', default: 25 } }, required: [] } },
        
        // Reviews
        { name: 'etsy_get_shop_reviews', description: 'Get shop reviews', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' }, limit: { type: 'number', default: 25 } }, required: [] } },
        
        // Shipping
        { name: 'etsy_get_shipping_profiles', description: 'Get shipping profiles', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' } }, required: [] } },
        
        // Revenue Stats
        { name: 'etsy_get_revenue_stats', description: 'Get revenue statistics', inputSchema: { type: 'object', properties: { shop_id: { type: 'string' }, days: { type: 'number', default: 30 } }, required: [] } },
        
        // Taxonomy
        { name: 'etsy_get_taxonomy', description: 'Get seller taxonomy (categories)', inputSchema: { type: 'object', properties: {}, required: [] } }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const shopId = args.shop_id || this.shopId;

      try {
        let result;
        switch (name) {
          case 'etsy_get_shop':
            result = (await this.etsy.get(`/shops/\${shopId}`)).data;
            break;
            
          case 'etsy_get_shop_sections':
            result = (await this.etsy.get(`/shops/\${shopId}/sections`)).data;
            break;
            
          case 'etsy_list_active_listings':
            result = (await this.etsy.get(`/shops/\${shopId}/listings/active`, {
              params: { limit: args.limit || 25, offset: args.offset || 0 }
            })).data;
            break;
            
          case 'etsy_get_listing':
            result = (await this.etsy.get(`/listings/\${args.listing_id}`)).data;
            break;
            
          case 'etsy_create_draft_listing':
            result = (await this.etsy.post(`/shops/\${shopId}/listings`, {
              quantity: args.quantity || 999,
              title: args.title,
              description: args.description,
              price: { amount: Math.round(args.price * 100), divisor: 100, currency_code: 'USD' },
              who_made: args.who_made || 'i_did',
              when_made: args.when_made || 'made_to_order',
              taxonomy_id: args.taxonomy_id || 2078, // Digital downloads
              is_digital: args.is_digital !== false,
              tags: args.tags || [],
              shipping_profile_id: args.shipping_profile_id
            })).data;
            break;
            
          case 'etsy_update_listing':
            const updateData = {};
            if (args.title) updateData.title = args.title;
            if (args.description) updateData.description = args.description;
            if (args.price) updateData.price = { amount: Math.round(args.price * 100), divisor: 100, currency_code: 'USD' };
            if (args.quantity !== undefined) updateData.quantity = args.quantity;
            if (args.state) updateData.state = args.state;
            if (args.tags) updateData.tags = args.tags;
            result = (await this.etsy.patch(`/shops/\${shopId}/listings/\${args.listing_id}`, updateData)).data;
            break;
            
          case 'etsy_delete_listing':
            await this.etsy.delete(`/shops/\${shopId}/listings/\${args.listing_id}`);
            result = { success: true, message: `Listing \${args.listing_id} deleted` };
            break;
            
          case 'etsy_get_shop_receipts':
            const receiptParams = { limit: args.limit || 25 };
            if (args.min_created) receiptParams.min_created = args.min_created;
            if (args.max_created) receiptParams.max_created = args.max_created;
            if (args.was_paid !== undefined) receiptParams.was_paid = args.was_paid;
            if (args.was_shipped !== undefined) receiptParams.was_shipped = args.was_shipped;
            result = (await this.etsy.get(`/shops/\${shopId}/receipts`, { params: receiptParams })).data;
            break;
            
          case 'etsy_get_receipt':
            result = (await this.etsy.get(`/shops/\${shopId}/receipts/\${args.receipt_id}`)).data;
            break;
            
          case 'etsy_get_receipt_transactions':
            result = (await this.etsy.get(`/shops/\${shopId}/receipts/\${args.receipt_id}/transactions`)).data;
            break;
            
          case 'etsy_get_shop_transactions':
            result = (await this.etsy.get(`/shops/\${shopId}/transactions`, {
              params: { limit: args.limit || 25 }
            })).data;
            break;
            
          case 'etsy_get_shop_reviews':
            result = (await this.etsy.get(`/shops/\${shopId}/reviews`, {
              params: { limit: args.limit || 25 }
            })).data;
            break;
            
          case 'etsy_get_shipping_profiles':
            result = (await this.etsy.get(`/shops/\${shopId}/shipping-profiles`)).data;
            break;
            
          case 'etsy_get_revenue_stats':
            // Calculate revenue from receipts
            const days = args.days || 30;
            const minCreated = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
            const receiptsResponse = await this.etsy.get(`/shops/\${shopId}/receipts`, {
              params: { limit: 100, min_created: minCreated, was_paid: true }
            });
            const receipts = receiptsResponse.data.results || [];
            const totalRevenue = receipts.reduce((sum, r) => sum + (r.grandtotal?.amount || 0), 0);
            result = {
              period_days: days,
              total_orders: receipts.length,
              total_revenue_cents: totalRevenue,
              total_revenue: `\$\${(totalRevenue / 100).toFixed(2)}`,
              orders_per_day: (receipts.length / days).toFixed(2)
            };
            break;
            
          case 'etsy_get_taxonomy':
            result = (await this.etsy.get('/seller-taxonomy/nodes')).data;
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
    console.error('Etsy MCP server running');
  }
}

new EtsyMCPServer().run().catch(console.error);
