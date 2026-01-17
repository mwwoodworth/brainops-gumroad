#!/usr/bin/env node
/**
 * COMPLETE Supabase MCP Server
 * Full PostgreSQL database control + Supabase features
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import pg from 'pg';

const { Pool } = pg;

const DB_CONFIG = {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

class SupabaseMCPServer {
  constructor() {
    // Validate config
    if (!DB_CONFIG.host || !DB_CONFIG.user || !DB_CONFIG.password) {
      console.error('Error: Missing required database environment variables (PGHOST, PGUSER, PGPASSWORD)');
      process.exit(1);
    }

    this.pool = new Pool(DB_CONFIG);
    // pg.Pool can emit an 'error' event on idle clients; unhandled errors crash the process.
    this.pool.on('error', (err) => console.error('[Supabase MCP][PG pool error]', err?.message || err));
    
    this.server = new Server(
      { name: 'supabase-complete', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    
    process.on('SIGINT', async () => {
      await this.pool.end();
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ==================== RAW SQL ====================
        {
          name: 'sql_query',
          description: 'Execute any SQL query (SELECT, INSERT, UPDATE, DELETE, CREATE, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', required: true, description: 'SQL query to execute' },
              params: { type: 'array', description: 'Query parameters for prepared statements' }
            },
            required: ['query']
          }
        },
        {
          name: 'sql_transaction',
          description: 'Execute multiple queries in a transaction (all or nothing)',
          inputSchema: {
            type: 'object',
            properties: {
              queries: { type: 'array', items: { type: 'string' }, required: true, description: 'Array of SQL queries' }
            },
            required: ['queries']
          }
        },

        // ==================== TABLE OPERATIONS ====================
        {
          name: 'list_tables',
          description: 'List all tables in the database with details',
          inputSchema: {
            type: 'object',
            properties: {
              schema: { type: 'string', default: 'public', description: 'Schema name' },
              includeSystem: { type: 'boolean', default: false }
            }
          }
        },
        {
          name: 'describe_table',
          description: 'Get detailed table structure (columns, types, constraints)',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName']
          }
        },
        {
          name: 'create_table',
          description: 'Create a new table with columns and constraints',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              columns: {
                type: 'array', 
                required: true,
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    nullable: { type: 'boolean', default: true },
                    unique: { type: 'boolean', default: false },
                    primaryKey: { type: 'boolean', default: false },
                    default: { type: 'string' },
                    references: { type: 'string', description: 'Foreign key (table.column)' }
                  }
                }
              },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName', 'columns']
          }
        },
        {
          name: 'drop_table',
          description: 'Drop (delete) a table permanently',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              schema: { type: 'string', default: 'public' },
              cascade: { type: 'boolean', default: false, description: 'Drop dependent objects' }
            },
            required: ['tableName']
          }
        },
        {
          name: 'alter_table',
          description: 'Modify table structure (add/drop/alter columns)',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              action: { type: 'string', enum: ['ADD_COLUMN', 'DROP_COLUMN', 'ALTER_COLUMN', 'RENAME'], required: true },
              columnName: { type: 'string' },
              columnType: { type: 'string' },
              newName: { type: 'string' },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName', 'action']
          }
        },

        // ==================== ROW OPERATIONS ====================
        {
          name: 'select_rows',
          description: 'Query rows with filtering, sorting, pagination',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              columns: { type: 'array', items: { type: 'string' }, description: 'Columns to select (* for all)' },
              where: { type: 'string', description: 'WHERE clause (e.g., "id > 100")' },
              orderBy: { type: 'string', description: 'ORDER BY clause' },
              limit: { type: 'number', description: 'Limit rows' },
              offset: { type: 'number', description: 'Offset for pagination' },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName']
          }
        },
        {
          name: 'insert_rows',
          description: 'Insert one or more rows',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              rows: { type: 'array', items: { type: 'object' }, required: true, description: 'Array of row objects' },
              returning: { type: 'array', items: { type: 'string' }, description: 'Columns to return' },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName', 'rows']
          }
        },
        {
          name: 'update_rows',
          description: 'Update rows with conditions',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              set: { type: 'object', required: true, description: 'Columns to update' },
              where: { type: 'string', required: true, description: 'WHERE clause' },
              returning: { type: 'array', items: { type: 'string' } },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName', 'set', 'where']
          }
        },
        {
          name: 'delete_rows',
          description: 'Delete rows with conditions',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              where: { type: 'string', required: true, description: 'WHERE clause' },
              returning: { type: 'array', items: { type: 'string' } },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName', 'where']
          }
        },
        {
          name: 'count_rows',
          description: 'Count rows with optional filtering',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              where: { type: 'string', description: 'WHERE clause' },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName']
          }
        },

        // ==================== INDEXES ====================
        {
          name: 'list_indexes',
          description: 'List all indexes on a table',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName']
          }
        },
        {
          name: 'create_index',
          description: 'Create an index for query performance',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              columns: { type: 'array', items: { type: 'string' }, required: true },
              indexName: { type: 'string' },
              unique: { type: 'boolean', default: false },
              method: { type: 'string', enum: ['btree', 'hash', 'gist', 'gin'], default: 'btree' },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName', 'columns']
          }
        },
        {
          name: 'drop_index',
          description: 'Drop an index',
          inputSchema: {
            type: 'object',
            properties: {
              indexName: { type: 'string', required: true },
              schema: { type: 'string', default: 'public' }
            },
            required: ['indexName']
          }
        },

        // ==================== ROW LEVEL SECURITY ====================
        {
          name: 'enable_rls',
          description: 'Enable Row Level Security on a table',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName']
          }
        },
        {
          name: 'disable_rls',
          description: 'Disable Row Level Security on a table',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName']
          }
        },
        {
          name: 'create_policy',
          description: 'Create an RLS policy',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              policyName: { type: 'string', required: true },
              command: { type: 'string', enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'], default: 'ALL' },
              using: { type: 'string', description: 'USING clause for row visibility' },
              check: { type: 'string', description: 'CHECK clause for modifications' },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName', 'policyName']
          }
        },
        {
          name: 'drop_policy',
          description: 'Drop an RLS policy',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              policyName: { type: 'string', required: true },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName', 'policyName']
          }
        },

        // ==================== FUNCTIONS & TRIGGERS ====================
        {
          name: 'list_functions',
          description: 'List all database functions',
          inputSchema: {
            type: 'object',
            properties: {
              schema: { type: 'string', default: 'public' }
            }
          }
        },
        {
          name: 'create_function',
          description: 'Create a PostgreSQL function',
          inputSchema: {
            type: 'object',
            properties: {
              functionName: { type: 'string', required: true },
              args: { type: 'array', items: { type: 'string' }, description: 'Function arguments' },
              returns: { type: 'string', required: true, description: 'Return type' },
              language: { type: 'string', enum: ['plpgsql', 'sql'], default: 'plpgsql' },
              body: { type: 'string', required: true, description: 'Function body' },
              schema: { type: 'string', default: 'public' }
            },
            required: ['functionName', 'returns', 'body']
          }
        },
        {
          name: 'execute_function',
          description: 'Execute a database function',
          inputSchema: {
            type: 'object',
            properties: {
              functionName: { type: 'string', required: true },
              args: { type: 'array', description: 'Function arguments' },
              schema: { type: 'string', default: 'public' }
            },
            required: ['functionName']
          }
        },

        // ==================== DATABASE STATS ====================
        {
          name: 'get_database_size',
          description: 'Get total database size',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_table_sizes',
          description: 'Get sizes of all tables',
          inputSchema: {
            type: 'object',
            properties: {
              schema: { type: 'string', default: 'public' },
              limit: { type: 'number', default: 50 }
            }
          }
        },
        {
          name: 'analyze_query',
          description: 'Analyze query performance with EXPLAIN',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', required: true },
              analyze: { type: 'boolean', default: false, description: 'Actually execute (EXPLAIN ANALYZE)' }
            },
            required: ['query']
          }
        },
        {
          name: 'vacuum_table',
          description: 'Vacuum a table to reclaim space and update statistics',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              full: { type: 'boolean', default: false },
              analyze: { type: 'boolean', default: true },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName']
          }
        },

        // ==================== CONNECTION INFO ====================
        {
          name: 'get_active_connections',
          description: 'List all active database connections',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'kill_connection',
          description: 'Terminate a database connection',
          inputSchema: {
            type: 'object',
            properties: {
              pid: { type: 'number', required: true, description: 'Process ID to kill' }
            },
            required: ['pid']
          }
        },

        // ==================== BACKUP ====================
        {
          name: 'backup_table',
          description: 'Create a backup copy of a table',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: { type: 'string', required: true },
              backupName: { type: 'string', description: 'Backup table name (default: {table}_backup_{timestamp})' },
              schema: { type: 'string', default: 'public' }
            },
            required: ['tableName']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          // Raw SQL
          case 'sql_query': return await this.sqlQuery(args);
          case 'sql_transaction': return await this.sqlTransaction(args);
          
          // Tables
          case 'list_tables': return await this.listTables(args);
          case 'describe_table': return await this.describeTable(args);
          case 'create_table': return await this.createTable(args);
          case 'drop_table': return await this.dropTable(args);
          case 'alter_table': return await this.alterTable(args);
          
          // Rows
          case 'select_rows': return await this.selectRows(args);
          case 'insert_rows': return await this.insertRows(args);
          case 'update_rows': return await this.updateRows(args);
          case 'delete_rows': return await this.deleteRows(args);
          case 'count_rows': return await this.countRows(args);
          
          // Indexes
          case 'list_indexes': return await this.listIndexes(args);
          case 'create_index': return await this.createIndex(args);
          case 'drop_index': return await this.dropIndex(args);
          
          // RLS
          case 'enable_rls': return await this.enableRls(args);
          case 'disable_rls': return await this.disableRls(args);
          case 'create_policy': return await this.createPolicy(args);
          case 'drop_policy': return await this.dropPolicy(args);
          
          // Functions
          case 'list_functions': return await this.listFunctions(args);
          case 'create_function': return await this.createFunction(args);
          case 'execute_function': return await this.executeFunction(args);
          
          // Stats
          case 'get_database_size': return await this.getDatabaseSize(args);
          case 'get_table_sizes': return await this.getTableSizes(args);
          case 'analyze_query': return await this.analyzeQuery(args);
          case 'vacuum_table': return await this.vacuumTable(args);
          
          // Connections
          case 'get_active_connections': return await this.getActiveConnections(args);
          case 'kill_connection': return await this.killConnection(args);
          
          // Backup
          case 'backup_table': return await this.backupTable(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}\n${error.stack}` }],
          isError: true
        };
      }
    });
  }

  // ==================== RAW SQL METHODS ====================
  
  async sqlQuery(args) {
    const result = await this.pool.query(args.query, args.params);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          rowCount: result.rowCount,
          command: result.command,
          rows: result.rows
        }, null, 2)
      }]
    };
  }

  async sqlTransaction(args) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const query of args.queries) {
        const result = await client.query(query);
        results.push({
          command: result.command,
          rowCount: result.rowCount
        });
      }
      
      await client.query('COMMIT');
      
      return {
        content: [{ type: 'text', text: `✅ Transaction committed\n${JSON.stringify(results, null, 2)}` }]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== TABLE METHODS ====================
  
  async listTables(args) {
    const query = `
      SELECT table_name, 
             pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
      FROM information_schema.tables
      WHERE table_schema = $1
      ${!args.includeSystem ? "AND table_name NOT LIKE 'pg_%' AND table_name NOT LIKE 'sql_%'" : ''}
      ORDER BY pg_total_relation_size(quote_ident(table_name)::regclass) DESC
    `;
    
    const result = await this.pool.query(query, [args.schema || 'public']);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }]
    };
  }

  async describeTable(args) {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;
    
    const result = await this.pool.query(query, [args.schema || 'public', args.tableName]);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }]
    };
  }

  async createTable(args) {
    const columns = args.columns.map(col => {
      let def = `${col.name} ${col.type}`;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (!col.nullable && !col.primaryKey) def += ' NOT NULL';
      if (col.unique) def += ' UNIQUE';
      if (col.default) def += ` DEFAULT ${col.default}`;
      if (col.references) def += ` REFERENCES ${col.references}`;
      return def;
    }).join(', ');
    
    const query = `CREATE TABLE ${args.schema || 'public'}.${args.tableName} (${columns})`;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Table ${args.tableName} created` }]
    };
  }

  async dropTable(args) {
    const cascade = args.cascade ? ' CASCADE' : '';
    const query = `DROP TABLE ${args.schema || 'public'}.${args.tableName}${cascade}`;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Table ${args.tableName} dropped` }]
    };
  }

  async alterTable(args) {
    let query;
    const schema = args.schema || 'public';
    
    switch (args.action) {
      case 'ADD_COLUMN':
        query = `ALTER TABLE ${schema}.${args.tableName} ADD COLUMN ${args.columnName} ${args.columnType}`;
        break;
      case 'DROP_COLUMN':
        query = `ALTER TABLE ${schema}.${args.tableName} DROP COLUMN ${args.columnName}`;
        break;
      case 'ALTER_COLUMN':
        query = `ALTER TABLE ${schema}.${args.tableName} ALTER COLUMN ${args.columnName} TYPE ${args.columnType}`;
        break;
      case 'RENAME':
        query = `ALTER TABLE ${schema}.${args.tableName} RENAME TO ${args.newName}`;
        break;
    }
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Table altered: ${args.action}` }]
    };
  }

  // ==================== ROW METHODS ====================
  
  async selectRows(args) {
    const schema = args.schema || 'public';
    const columns = args.columns?.join(', ') || '*';
    let query = `SELECT ${columns} FROM ${schema}.${args.tableName}`;
    
    if (args.where) query += ` WHERE ${args.where}`;
    if (args.orderBy) query += ` ORDER BY ${args.orderBy}`;
    if (args.limit) query += ` LIMIT ${args.limit}`;
    if (args.offset) query += ` OFFSET ${args.offset}`;
    
    const result = await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }]
    };
  }

  async insertRows(args) {
    const schema = args.schema || 'public';
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const inserted = [];
      for (const row of args.rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const returning = args.returning ? ` RETURNING ${args.returning.join(', ')}` : '';
        const query = `INSERT INTO ${schema}.${args.tableName} (${columns.join(', ')}) VALUES (${placeholders})${returning}`;
        
        const result = await client.query(query, values);
        if (args.returning) inserted.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      
      return {
        content: [{
          type: 'text',
          text: `✅ Inserted ${args.rows.length} rows${inserted.length ? `\n${JSON.stringify(inserted, null, 2)}` : ''}`
        }]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateRows(args) {
    const schema = args.schema || 'public';
    const setClauses = Object.entries(args.set).map(([key, val], i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(args.set);
    
    const returning = args.returning ? ` RETURNING ${args.returning.join(', ')}` : '';
    const query = `UPDATE ${schema}.${args.tableName} SET ${setClauses} WHERE ${args.where}${returning}`;
    
    const result = await this.pool.query(query, values);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Updated ${result.rowCount} rows${result.rows.length ? `\n${JSON.stringify(result.rows, null, 2)}` : ''}`
      }]
    };
  }

  async deleteRows(args) {
    const schema = args.schema || 'public';
    const returning = args.returning ? ` RETURNING ${args.returning.join(', ')}` : '';
    const query = `DELETE FROM ${schema}.${args.tableName} WHERE ${args.where}${returning}`;
    
    const result = await this.pool.query(query);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Deleted ${result.rowCount} rows${result.rows.length ? `\n${JSON.stringify(result.rows, null, 2)}` : ''}`
      }]
    };
  }

  async countRows(args) {
    const schema = args.schema || 'public';
    let query = `SELECT COUNT(*) FROM ${schema}.${args.tableName}`;
    
    if (args.where) query += ` WHERE ${args.where}`;
    
    const result = await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `Count: ${result.rows[0].count}` }]
    };
  }

  // ==================== INDEX METHODS ====================
  
  async listIndexes(args) {
    const query = `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = $1 AND tablename = $2
    `;
    
    const result = await this.pool.query(query, [args.schema || 'public', args.tableName]);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }]
    };
  }

  async createIndex(args) {
    const schema = args.schema || 'public';
    const indexName = args.indexName || `idx_${args.tableName}_${args.columns.join('_')}`;
    const unique = args.unique ? 'UNIQUE ' : '';
    const method = args.method || 'btree';
    
    const query = `CREATE ${unique}INDEX ${indexName} ON ${schema}.${args.tableName} USING ${method} (${args.columns.join(', ')})`;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Index ${indexName} created` }]
    };
  }

  async dropIndex(args) {
    const schema = args.schema || 'public';
    const query = `DROP INDEX ${schema}.${args.indexName}`;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Index ${args.indexName} dropped` }]
    };
  }

  // ==================== RLS METHODS ====================
  
  async enableRls(args) {
    const schema = args.schema || 'public';
    const query = `ALTER TABLE ${schema}.${args.tableName} ENABLE ROW LEVEL SECURITY`;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ RLS enabled on ${args.tableName}` }]
    };
  }

  async disableRls(args) {
    const schema = args.schema || 'public';
    const query = `ALTER TABLE ${schema}.${args.tableName}DISABLE ROW LEVEL SECURITY`;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ RLS disabled on ${args.tableName}` }]
    };
  }

  async createPolicy(args) {
    const schema = args.schema || 'public';
    let query = `CREATE POLICY ${args.policyName} ON ${schema}.${args.tableName}`;
    
    if (args.command) query += ` FOR ${args.command}`;
    if (args.using) query += ` USING (${args.using})`;
    if (args.check) query += ` WITH CHECK (${args.check})`;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Policy ${args.policyName} created` }]
    };
  }

  async dropPolicy(args) {
    const schema = args.schema || 'public';
    const query = `DROP POLICY ${args.policyName} ON ${schema}.${args.tableName}`;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Policy ${args.policyName} dropped` }]
    };
  }

  // ==================== FUNCTION METHODS ====================
  
  async listFunctions(args) {
    const query = `
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = $1
    `;
    
    const result = await this.pool.query(query, [args.schema || 'public']);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }]
    };
  }

  async createFunction(args) {
    const schema = args.schema || 'public';
    const argsStr = args.args?.join(', ') || '';
    
    const query = `
      CREATE OR REPLACE FUNCTION ${schema}.${args.functionName}(${argsStr})
      RETURNS ${args.returns}
      LANGUAGE ${args.language}
      AS $$
      ${args.body}
      $$ 
    `;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Function ${args.functionName} created` }]
    };
  }

  async executeFunction(args) {
    const schema = args.schema || 'public';
    const argsStr = args.args?.map(arg => typeof arg === 'string' ? `'${arg}'` : arg).join(', ') || '';
    
    const query = `SELECT ${schema}.${args.functionName}(${argsStr})`;
    
    const result = await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }]
    };
  }

  // ==================== STATS METHODS ====================
  
  async getDatabaseSize(args) {
    const query = `SELECT pg_size_pretty(pg_database_size(current_database())) as size`;
    
    const result = await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `Database size: ${result.rows[0].size}` }]
    };
  }

  async getTableSizes(args) {
    const query = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = $1
      ORDER BY size_bytes DESC
      LIMIT $2
    `;
    
    const result = await this.pool.query(query, [args.schema || 'public', args.limit || 50]);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }]
    };
  }

  async analyzeQuery(args) {
    const prefix = args.analyze ? 'EXPLAIN ANALYZE' : 'EXPLAIN';
    const query = `${prefix} ${args.query}`;
    
    const result = await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: result.rows.map(r => r['QUERY PLAN']).join('\n') }]
    };
  }

  async vacuumTable(args) {
    const schema = args.schema || 'public';
    const full = args.full ? 'FULL ' : '';
    const analyze = args.analyze ? 'ANALYZE ' : '';
    
    const query = `VACUUM ${full}${analyze}${schema}.${args.tableName}`;
    
    await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Vacuumed ${args.tableName}` }]
    };
  }

  // ==================== CONNECTION METHODS ====================
  
  async getActiveConnections(args) {
    const query = `
      SELECT pid, usename, application_name, client_addr, state, query
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    
    const result = await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }]
    };
  }

  async killConnection(args) {
    const query = `SELECT pg_terminate_backend($1)`;
    
    await this.pool.query(query, [args.pid]);
    
    return {
      content: [{ type: 'text', text: `✅ Connection ${args.pid} terminated` }]
    };
  }

  // ==================== BACKUP METHODS ====================
  
  async backupTable(args) {
    const schema = args.schema || 'public';
    const backupName = args.backupName || `${args.tableName}_backup_${Date.now()}`;
    
    const query = `CREATE TABLE ${schema}.${backupName} AS SELECT * FROM ${schema}.${args.tableName}`;
    
    const result = await this.pool.query(query);
    
    return {
      content: [{ type: 'text', text: `✅ Backup created: ${backupName} (${result.rowCount} rows)` }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Supabase Complete MCP Server running on stdio');
  }
}

const server = new SupabaseMCPServer();
server.run().catch(console.error);
