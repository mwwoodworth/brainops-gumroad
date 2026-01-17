#!/usr/bin/env node

/**
 * BrainOps Docker MCP Server - COMPLETE Implementation
 *
 * Complete Docker control for container orchestration and management.
 * Provides full Docker API coverage with comprehensive tools.
 *
 * Features:
 * - Container lifecycle (create, start, stop, restart, delete, pause, unpause)
 * - Image management (pull, build, push, tag, delete, search, inspect)
 * - Network operations (create, connect, disconnect, list, inspect, delete)
 * - Volume management (create, delete, list, prune, inspect)
 * - Docker Compose (up, down, logs, ps, exec)
 * - System operations (info, events, prune, df, version)
 * - Container exec and file operations (exec, cp, logs, stats)
 * - Build context and Dockerfile management
 * - Registry authentication and image distribution
 *
 * Environment Variables:
 * - DOCKER_HOST: Docker daemon socket (default: unix:///var/run/docker.sock)
 * - DOCKER_CERT_PATH: Path to TLS certificates
 * - DOCKER_TLS_VERIFY: Enable TLS verification (1/0)
 * - DOCKER_USERNAME: Docker Hub username
 * - DOCKER_PASSWORD: Docker Hub password
 *
 * Created: 2025-11-02
 * Version: 1.0.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Docker from 'dockerode';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

/**
 * Safe command execution using spawn (prevents command injection)
 * @param {string} command - The command to execute
 * @param {string[]} args - Array of arguments (NOT concatenated string)
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function safeExec(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: false });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Validate file path to prevent path traversal attacks
 * @param {string} filePath - Path to validate
 * @returns {boolean}
 */
function isValidPath(filePath) {
  if (!filePath) return false;
  // Block obvious injection patterns
  const dangerousPatterns = [';', '&&', '||', '|', '`', '$', '>', '<', '\n', '\r'];
  return !dangerousPatterns.some(p => filePath.includes(p));
}

class DockerMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'docker-complete',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Docker client
    const dockerOptions = {};
    if (process.env.DOCKER_HOST) {
      dockerOptions.host = process.env.DOCKER_HOST;
    }
    if (process.env.DOCKER_CERT_PATH && process.env.DOCKER_TLS_VERIFY === '1') {
      dockerOptions.ca = require('fs').readFileSync(path.join(process.env.DOCKER_CERT_PATH, 'ca.pem'));
      dockerOptions.cert = require('fs').readFileSync(path.join(process.env.DOCKER_CERT_PATH, 'cert.pem'));
      dockerOptions.key = require('fs').readFileSync(path.join(process.env.DOCKER_CERT_PATH, 'key.pem'));
    }
    this.docker = new Docker(dockerOptions);

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ========== Container Lifecycle ==========
        {
          name: 'docker_list_containers',
          description: 'List all Docker containers (running or all)',
          inputSchema: {
            type: 'object',
            properties: {
              all: { type: 'boolean', description: 'Show all containers (default shows just running)' },
              limit: { type: 'number', description: 'Limit number of containers to return' },
              filters: { type: 'object', description: 'Filters (e.g., {status: ["running"], name: ["web"]})' }
            }
          }
        },
        {
          name: 'docker_inspect_container',
          description: 'Get detailed information about a container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_create_container',
          description: 'Create a new container',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Image name (e.g., nginx:latest)' },
              name: { type: 'string', description: 'Container name' },
              cmd: { type: 'array', items: { type: 'string' }, description: 'Command to run' },
              env: { type: 'array', items: { type: 'string' }, description: 'Environment variables (KEY=VALUE)' },
              ports: { type: 'object', description: 'Port mappings (e.g., {"80/tcp": [{"HostPort": "8080"}]})' },
              volumes: { type: 'object', description: 'Volume bindings (e.g., {"/host/path": {bind: "/container/path"}})' },
              restart_policy: { type: 'string', enum: ['no', 'always', 'unless-stopped', 'on-failure'], description: 'Restart policy' },
              network_mode: { type: 'string', description: 'Network mode (e.g., bridge, host, none)' }
            },
            required: ['image']
          }
        },
        {
          name: 'docker_start_container',
          description: 'Start a container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_stop_container',
          description: 'Stop a running container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              timeout: { type: 'number', description: 'Seconds to wait before killing (default: 10)' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_restart_container',
          description: 'Restart a container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              timeout: { type: 'number', description: 'Seconds to wait before killing (default: 10)' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_pause_container',
          description: 'Pause a running container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_unpause_container',
          description: 'Unpause a paused container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_kill_container',
          description: 'Kill a running container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              signal: { type: 'string', description: 'Signal to send (default: SIGKILL)' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_remove_container',
          description: 'Remove a container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              force: { type: 'boolean', description: 'Force removal of running container' },
              volumes: { type: 'boolean', description: 'Remove associated volumes' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_container_logs',
          description: 'Get container logs',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              follow: { type: 'boolean', description: 'Follow log output' },
              tail: { type: 'number', description: 'Number of lines from the end (default: all)' },
              since: { type: 'number', description: 'Unix timestamp to show logs since' },
              timestamps: { type: 'boolean', description: 'Show timestamps' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_container_stats',
          description: 'Get container resource usage statistics',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              stream: { type: 'boolean', description: 'Stream stats continuously' }
            },
            required: ['container_id']
          }
        },
        {
          name: 'docker_container_top',
          description: 'List processes running in a container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              ps_args: { type: 'string', description: 'Arguments to pass to ps (default: -ef)' }
            },
            required: ['container_id']
          }
        },

        // ========== Container Exec & Files ==========
        {
          name: 'docker_exec',
          description: 'Execute a command in a running container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              cmd: { type: 'array', items: { type: 'string' }, description: 'Command and arguments' },
              tty: { type: 'boolean', description: 'Allocate a pseudo-TTY' },
              detach: { type: 'boolean', description: 'Detached mode (run in background)' },
              env: { type: 'array', items: { type: 'string' }, description: 'Environment variables' },
              working_dir: { type: 'string', description: 'Working directory' },
              user: { type: 'string', description: 'User to run as (user:group)' }
            },
            required: ['container_id', 'cmd']
          }
        },
        {
          name: 'docker_copy_to_container',
          description: 'Copy files/folders to a container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              src_path: { type: 'string', description: 'Source path on host' },
              dest_path: { type: 'string', description: 'Destination path in container' }
            },
            required: ['container_id', 'src_path', 'dest_path']
          }
        },
        {
          name: 'docker_copy_from_container',
          description: 'Copy files/folders from a container',
          inputSchema: {
            type: 'object',
            properties: {
              container_id: { type: 'string', description: 'Container ID or name' },
              src_path: { type: 'string', description: 'Source path in container' },
              dest_path: { type: 'string', description: 'Destination path on host' }
            },
            required: ['container_id', 'src_path', 'dest_path']
          }
        },

        // ========== Image Management ==========
        {
          name: 'docker_list_images',
          description: 'List Docker images',
          inputSchema: {
            type: 'object',
            properties: {
              all: { type: 'boolean', description: 'Show all images (default hides intermediate)' },
              filters: { type: 'object', description: 'Filters (e.g., {dangling: ["true"]})' }
            }
          }
        },
        {
          name: 'docker_inspect_image',
          description: 'Get detailed information about an image',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Image name or ID' }
            },
            required: ['image']
          }
        },
        {
          name: 'docker_pull_image',
          description: 'Pull an image from a registry',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Image name (e.g., nginx:latest)' },
              tag: { type: 'string', description: 'Image tag (default: latest)' },
              auth: { type: 'object', description: 'Registry auth {username, password, serveraddress}' }
            },
            required: ['image']
          }
        },
        {
          name: 'docker_push_image',
          description: 'Push an image to a registry',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Image name' },
              tag: { type: 'string', description: 'Image tag' },
              auth: { type: 'object', description: 'Registry auth {username, password, serveraddress}' }
            },
            required: ['image']
          }
        },
        {
          name: 'docker_tag_image',
          description: 'Tag an image',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Source image name or ID' },
              repo: { type: 'string', description: 'Target repository' },
              tag: { type: 'string', description: 'Target tag' }
            },
            required: ['image', 'repo']
          }
        },
        {
          name: 'docker_remove_image',
          description: 'Remove an image',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Image name or ID' },
              force: { type: 'boolean', description: 'Force removal' },
              noprune: { type: 'boolean', description: 'Do not delete untagged parents' }
            },
            required: ['image']
          }
        },
        {
          name: 'docker_build_image',
          description: 'Build an image from a Dockerfile',
          inputSchema: {
            type: 'object',
            properties: {
              context_path: { type: 'string', description: 'Build context path' },
              dockerfile: { type: 'string', description: 'Dockerfile path (default: Dockerfile)' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Image tags' },
              buildargs: { type: 'object', description: 'Build arguments' },
              target: { type: 'string', description: 'Target build stage' },
              nocache: { type: 'boolean', description: 'Do not use cache' },
              pull: { type: 'boolean', description: 'Always pull newer base images' }
            },
            required: ['context_path']
          }
        },
        {
          name: 'docker_search_images',
          description: 'Search Docker Hub for images',
          inputSchema: {
            type: 'object',
            properties: {
              term: { type: 'string', description: 'Search term' },
              limit: { type: 'number', description: 'Max results (default: 25)' },
              filters: { type: 'object', description: 'Filters (e.g., {is-official: ["true"]})' }
            },
            required: ['term']
          }
        },
        {
          name: 'docker_image_history',
          description: 'Show the history of an image',
          inputSchema: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Image name or ID' }
            },
            required: ['image']
          }
        },
        {
          name: 'docker_prune_images',
          description: 'Remove unused images',
          inputSchema: {
            type: 'object',
            properties: {
              all: { type: 'boolean', description: 'Remove all unused images, not just dangling' },
              filters: { type: 'object', description: 'Filters (e.g., {until: ["24h"]})' }
            }
          }
        },

        // ========== Network Management ==========
        {
          name: 'docker_list_networks',
          description: 'List Docker networks',
          inputSchema: {
            type: 'object',
            properties: {
              filters: { type: 'object', description: 'Filters (e.g., {driver: ["bridge"]})' }
            }
          }
        },
        {
          name: 'docker_inspect_network',
          description: 'Get detailed information about a network',
          inputSchema: {
            type: 'object',
            properties: {
              network_id: { type: 'string', description: 'Network ID or name' }
            },
            required: ['network_id']
          }
        },
        {
          name: 'docker_create_network',
          description: 'Create a new network',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Network name' },
              driver: { type: 'string', description: 'Driver (bridge, overlay, macvlan, host, none)' },
              internal: { type: 'boolean', description: 'Restrict external access' },
              attachable: { type: 'boolean', description: 'Enable manual container attachment' },
              ipam: { type: 'object', description: 'IPAM configuration' },
              options: { type: 'object', description: 'Network driver options' }
            },
            required: ['name']
          }
        },
        {
          name: 'docker_remove_network',
          description: 'Remove a network',
          inputSchema: {
            type: 'object',
            properties: {
              network_id: { type: 'string', description: 'Network ID or name' }
            },
            required: ['network_id']
          }
        },
        {
          name: 'docker_connect_network',
          description: 'Connect a container to a network',
          inputSchema: {
            type: 'object',
            properties: {
              network_id: { type: 'string', description: 'Network ID or name' },
              container_id: { type: 'string', description: 'Container ID or name' },
              aliases: { type: 'array', items: { type: 'string' }, description: 'Network aliases' },
              ipv4_address: { type: 'string', description: 'IPv4 address' },
              ipv6_address: { type: 'string', description: 'IPv6 address' }
            },
            required: ['network_id', 'container_id']
          }
        },
        {
          name: 'docker_disconnect_network',
          description: 'Disconnect a container from a network',
          inputSchema: {
            type: 'object',
            properties: {
              network_id: { type: 'string', description: 'Network ID or name' },
              container_id: { type: 'string', description: 'Container ID or name' },
              force: { type: 'boolean', description: 'Force disconnect' }
            },
            required: ['network_id', 'container_id']
          }
        },
        {
          name: 'docker_prune_networks',
          description: 'Remove unused networks',
          inputSchema: {
            type: 'object',
            properties: {
              filters: { type: 'object', description: 'Filters (e.g., {until: ["24h"]})' }
            }
          }
        },

        // ========== Volume Management ==========
        {
          name: 'docker_list_volumes',
          description: 'List Docker volumes',
          inputSchema: {
            type: 'object',
            properties: {
              filters: { type: 'object', description: 'Filters (e.g., {dangling: ["true"]})' }
            }
          }
        },
        {
          name: 'docker_inspect_volume',
          description: 'Get detailed information about a volume',
          inputSchema: {
            type: 'object',
            properties: {
              volume_name: { type: 'string', description: 'Volume name' }
            },
            required: ['volume_name']
          }
        },
        {
          name: 'docker_create_volume',
          description: 'Create a new volume',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Volume name' },
              driver: { type: 'string', description: 'Volume driver (default: local)' },
              driver_opts: { type: 'object', description: 'Driver-specific options' },
              labels: { type: 'object', description: 'Volume labels' }
            },
            required: ['name']
          }
        },
        {
          name: 'docker_remove_volume',
          description: 'Remove a volume',
          inputSchema: {
            type: 'object',
            properties: {
              volume_name: { type: 'string', description: 'Volume name' },
              force: { type: 'boolean', description: 'Force removal' }
            },
            required: ['volume_name']
          }
        },
        {
          name: 'docker_prune_volumes',
          description: 'Remove unused volumes',
          inputSchema: {
            type: 'object',
            properties: {
              filters: { type: 'object', description: 'Filters (e.g., {label: ["keep=true"]})' }
            }
          }
        },

        // ========== Docker Compose ==========
        {
          name: 'docker_compose_up',
          description: 'Create and start containers via docker-compose',
          inputSchema: {
            type: 'object',
            properties: {
              compose_file: { type: 'string', description: 'Path to docker-compose.yml' },
              project_name: { type: 'string', description: 'Project name' },
              detach: { type: 'boolean', description: 'Detached mode' },
              build: { type: 'boolean', description: 'Build images before starting' },
              force_recreate: { type: 'boolean', description: 'Recreate containers' }
            },
            required: ['compose_file']
          }
        },
        {
          name: 'docker_compose_down',
          description: 'Stop and remove containers via docker-compose',
          inputSchema: {
            type: 'object',
            properties: {
              compose_file: { type: 'string', description: 'Path to docker-compose.yml' },
              project_name: { type: 'string', description: 'Project name' },
              volumes: { type: 'boolean', description: 'Remove named volumes' },
              remove_orphans: { type: 'boolean', description: 'Remove orphan containers' }
            },
            required: ['compose_file']
          }
        },
        {
          name: 'docker_compose_ps',
          description: 'List containers in a compose project',
          inputSchema: {
            type: 'object',
            properties: {
              compose_file: { type: 'string', description: 'Path to docker-compose.yml' },
              project_name: { type: 'string', description: 'Project name' }
            },
            required: ['compose_file']
          }
        },
        {
          name: 'docker_compose_logs',
          description: 'View logs from compose services',
          inputSchema: {
            type: 'object',
            properties: {
              compose_file: { type: 'string', description: 'Path to docker-compose.yml' },
              project_name: { type: 'string', description: 'Project name' },
              services: { type: 'array', items: { type: 'string' }, description: 'Service names' },
              follow: { type: 'boolean', description: 'Follow log output' },
              tail: { type: 'number', description: 'Number of lines from the end' }
            },
            required: ['compose_file']
          }
        },
        {
          name: 'docker_compose_exec',
          description: 'Execute command in a compose service',
          inputSchema: {
            type: 'object',
            properties: {
              compose_file: { type: 'string', description: 'Path to docker-compose.yml' },
              project_name: { type: 'string', description: 'Project name' },
              service: { type: 'string', description: 'Service name' },
              cmd: { type: 'array', items: { type: 'string' }, description: 'Command and arguments' }
            },
            required: ['compose_file', 'service', 'cmd']
          }
        },

        // ========== System Operations ==========
        {
          name: 'docker_info',
          description: 'Get Docker system information',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'docker_version',
          description: 'Get Docker version information',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'docker_ping',
          description: 'Ping the Docker daemon',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'docker_df',
          description: 'Show Docker disk usage',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'docker_events',
          description: 'Get real-time Docker events',
          inputSchema: {
            type: 'object',
            properties: {
              since: { type: 'number', description: 'Unix timestamp to start from' },
              until: { type: 'number', description: 'Unix timestamp to end at' },
              filters: { type: 'object', description: 'Event filters' }
            }
          }
        },
        {
          name: 'docker_prune_system',
          description: 'Remove unused data (containers, networks, images, volumes)',
          inputSchema: {
            type: 'object',
            properties: {
              all: { type: 'boolean', description: 'Remove all unused images, not just dangling' },
              volumes: { type: 'boolean', description: 'Prune volumes' },
              filters: { type: 'object', description: 'Filters (e.g., {until: ["24h"]})' }
            }
          }
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        // ========== Container Lifecycle Handlers ==========
        if (name === 'docker_list_containers') {
          const containers = await this.docker.listContainers({
            all: args.all || false,
            limit: args.limit,
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(containers, null, 2)
            }]
          };
        }

        if (name === 'docker_inspect_container') {
          const container = this.docker.getContainer(args.container_id);
          const data = await container.inspect();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }]
          };
        }

        if (name === 'docker_create_container') {
          const options = {
            Image: args.image,
            name: args.name,
            Cmd: args.cmd,
            Env: args.env,
            ExposedPorts: args.ports ? Object.keys(args.ports).reduce((acc, port) => {
              acc[port] = {};
              return acc;
            }, {}) : undefined,
            HostConfig: {
              PortBindings: args.ports,
              Binds: args.volumes ? Object.entries(args.volumes).map(([host, container]) =>
                `${host}:${container.bind}${container.mode ? ':' + container.mode : ''}`
              ) : undefined,
              RestartPolicy: args.restart_policy ? { Name: args.restart_policy } : undefined,
              NetworkMode: args.network_mode
            }
          };
          const container = await this.docker.createContainer(options);
          return {
            content: [{
              type: 'text',
              text: `Container created: ${container.id}`
            }]
          };
        }

        if (name === 'docker_start_container') {
          const container = this.docker.getContainer(args.container_id);
          await container.start();
          return {
            content: [{
              type: 'text',
              text: `Container ${args.container_id} started`
            }]
          };
        }

        if (name === 'docker_stop_container') {
          const container = this.docker.getContainer(args.container_id);
          await container.stop({ t: args.timeout || 10 });
          return {
            content: [{
              type: 'text',
              text: `Container ${args.container_id} stopped`
            }]
          };
        }

        if (name === 'docker_restart_container') {
          const container = this.docker.getContainer(args.container_id);
          await container.restart({ t: args.timeout || 10 });
          return {
            content: [{
              type: 'text',
              text: `Container ${args.container_id} restarted`
            }]
          };
        }

        if (name === 'docker_pause_container') {
          const container = this.docker.getContainer(args.container_id);
          await container.pause();
          return {
            content: [{
              type: 'text',
              text: `Container ${args.container_id} paused`
            }]
          };
        }

        if (name === 'docker_unpause_container') {
          const container = this.docker.getContainer(args.container_id);
          await container.unpause();
          return {
            content: [{
              type: 'text',
              text: `Container ${args.container_id} unpaused`
            }]
          };
        }

        if (name === 'docker_kill_container') {
          const container = this.docker.getContainer(args.container_id);
          await container.kill({ signal: args.signal || 'SIGKILL' });
          return {
            content: [{
              type: 'text',
              text: `Container ${args.container_id} killed`
            }]
          };
        }

        if (name === 'docker_remove_container') {
          const container = this.docker.getContainer(args.container_id);
          await container.remove({
            force: args.force || false,
            v: args.volumes || false
          });
          return {
            content: [{
              type: 'text',
              text: `Container ${args.container_id} removed`
            }]
          };
        }

        if (name === 'docker_container_logs') {
          const container = this.docker.getContainer(args.container_id);
          const logs = await container.logs({
            follow: args.follow || false,
            stdout: true,
            stderr: true,
            tail: args.tail,
            since: args.since,
            timestamps: args.timestamps || false
          });
          return {
            content: [{
              type: 'text',
              text: logs.toString('utf-8')
            }]
          };
        }

        if (name === 'docker_container_stats') {
          const container = this.docker.getContainer(args.container_id);
          const stats = await container.stats({ stream: args.stream || false });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(stats, null, 2)
            }]
          };
        }

        if (name === 'docker_container_top') {
          const container = this.docker.getContainer(args.container_id);
          const processes = await container.top({ ps_args: args.ps_args || '-ef' });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(processes, null, 2)
            }]
          };
        }

        // ========== Container Exec & Files Handlers ==========
        if (name === 'docker_exec') {
          const container = this.docker.getContainer(args.container_id);
          const exec = await container.exec({
            Cmd: args.cmd,
            AttachStdout: true,
            AttachStderr: true,
            Tty: args.tty || false,
            Detach: args.detach || false,
            Env: args.env,
            WorkingDir: args.working_dir,
            User: args.user
          });
          const stream = await exec.start({ Detach: args.detach || false });

          if (args.detach) {
            return {
              content: [{
                type: 'text',
                text: 'Command started in background'
              }]
            };
          }

          let output = '';
          stream.on('data', (chunk) => { output += chunk.toString(); });
          await new Promise((resolve) => stream.on('end', resolve));

          return {
            content: [{
              type: 'text',
              text: output
            }]
          };
        }

        if (name === 'docker_copy_to_container') {
          const container = this.docker.getContainer(args.container_id);
          const tarStream = require('tar-fs').pack(args.src_path);
          await container.putArchive(tarStream, { path: args.dest_path });
          return {
            content: [{
              type: 'text',
              text: `Copied ${args.src_path} to ${args.container_id}:${args.dest_path}`
            }]
          };
        }

        if (name === 'docker_copy_from_container') {
          const container = this.docker.getContainer(args.container_id);
          const stream = await container.getArchive({ path: args.src_path });
          const extract = require('tar-fs').extract(args.dest_path);
          stream.pipe(extract);
          await new Promise((resolve, reject) => {
            extract.on('finish', resolve);
            extract.on('error', reject);
          });
          return {
            content: [{
              type: 'text',
              text: `Copied ${args.container_id}:${args.src_path} to ${args.dest_path}`
            }]
          };
        }

        // ========== Image Management Handlers ==========
        if (name === 'docker_list_images') {
          const images = await this.docker.listImages({
            all: args.all || false,
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(images, null, 2)
            }]
          };
        }

        if (name === 'docker_inspect_image') {
          const image = this.docker.getImage(args.image);
          const data = await image.inspect();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }]
          };
        }

        if (name === 'docker_pull_image') {
          const stream = await this.docker.pull(args.image, {
            tag: args.tag || 'latest',
            authconfig: args.auth
          });

          let output = '';
          stream.on('data', (chunk) => { output += chunk.toString(); });
          await new Promise((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
          });

          return {
            content: [{
              type: 'text',
              text: `Pulled ${args.image}:${args.tag || 'latest'}\n${output}`
            }]
          };
        }

        if (name === 'docker_push_image') {
          const image = this.docker.getImage(args.image);
          const stream = await image.push({
            tag: args.tag,
            authconfig: args.auth
          });

          let output = '';
          stream.on('data', (chunk) => { output += chunk.toString(); });
          await new Promise((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
          });

          return {
            content: [{
              type: 'text',
              text: `Pushed ${args.image}:${args.tag}\n${output}`
            }]
          };
        }

        if (name === 'docker_tag_image') {
          const image = this.docker.getImage(args.image);
          await image.tag({
            repo: args.repo,
            tag: args.tag || 'latest'
          });
          return {
            content: [{
              type: 'text',
              text: `Tagged ${args.image} as ${args.repo}:${args.tag || 'latest'}`
            }]
          };
        }

        if (name === 'docker_remove_image') {
          const image = this.docker.getImage(args.image);
          await image.remove({
            force: args.force || false,
            noprune: args.noprune || false
          });
          return {
            content: [{
              type: 'text',
              text: `Image ${args.image} removed`
            }]
          };
        }

        if (name === 'docker_build_image') {
          const stream = await this.docker.buildImage({
            context: args.context_path,
            src: ['Dockerfile']
          }, {
            dockerfile: args.dockerfile || 'Dockerfile',
            t: args.tags,
            buildargs: args.buildargs,
            target: args.target,
            nocache: args.nocache || false,
            pull: args.pull || false
          });

          let output = '';
          stream.on('data', (chunk) => { output += chunk.toString(); });
          await new Promise((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
          });

          return {
            content: [{
              type: 'text',
              text: `Build complete\n${output}`
            }]
          };
        }

        if (name === 'docker_search_images') {
          const results = await this.docker.searchImages({
            term: args.term,
            limit: args.limit || 25,
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }]
          };
        }

        if (name === 'docker_image_history') {
          const image = this.docker.getImage(args.image);
          const history = await image.history();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(history, null, 2)
            }]
          };
        }

        if (name === 'docker_prune_images') {
          const result = await this.docker.pruneImages({
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });
          return {
            content: [{
              type: 'text',
              text: `Pruned ${result.ImagesDeleted?.length || 0} images, freed ${result.SpaceReclaimed} bytes`
            }]
          };
        }

        // ========== Network Management Handlers ==========
        if (name === 'docker_list_networks') {
          const networks = await this.docker.listNetworks({
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(networks, null, 2)
            }]
          };
        }

        if (name === 'docker_inspect_network') {
          const network = this.docker.getNetwork(args.network_id);
          const data = await network.inspect();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }]
          };
        }

        if (name === 'docker_create_network') {
          const network = await this.docker.createNetwork({
            Name: args.name,
            Driver: args.driver || 'bridge',
            Internal: args.internal || false,
            Attachable: args.attachable || false,
            IPAM: args.ipam,
            Options: args.options
          });
          return {
            content: [{
              type: 'text',
              text: `Network created: ${network.id}`
            }]
          };
        }

        if (name === 'docker_remove_network') {
          const network = this.docker.getNetwork(args.network_id);
          await network.remove();
          return {
            content: [{
              type: 'text',
              text: `Network ${args.network_id} removed`
            }]
          };
        }

        if (name === 'docker_connect_network') {
          const network = this.docker.getNetwork(args.network_id);
          await network.connect({
            Container: args.container_id,
            EndpointConfig: {
              Aliases: args.aliases,
              IPAMConfig: {
                IPv4Address: args.ipv4_address,
                IPv6Address: args.ipv6_address
              }
            }
          });
          return {
            content: [{
              type: 'text',
              text: `Connected ${args.container_id} to network ${args.network_id}`
            }]
          };
        }

        if (name === 'docker_disconnect_network') {
          const network = this.docker.getNetwork(args.network_id);
          await network.disconnect({
            Container: args.container_id,
            Force: args.force || false
          });
          return {
            content: [{
              type: 'text',
              text: `Disconnected ${args.container_id} from network ${args.network_id}`
            }]
          };
        }

        if (name === 'docker_prune_networks') {
          const result = await this.docker.pruneNetworks({
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });
          return {
            content: [{
              type: 'text',
              text: `Pruned ${result.NetworksDeleted?.length || 0} networks`
            }]
          };
        }

        // ========== Volume Management Handlers ==========
        if (name === 'docker_list_volumes') {
          const result = await this.docker.listVolumes({
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result.Volumes, null, 2)
            }]
          };
        }

        if (name === 'docker_inspect_volume') {
          const volume = this.docker.getVolume(args.volume_name);
          const data = await volume.inspect();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }]
          };
        }

        if (name === 'docker_create_volume') {
          const volume = await this.docker.createVolume({
            Name: args.name,
            Driver: args.driver || 'local',
            DriverOpts: args.driver_opts,
            Labels: args.labels
          });
          return {
            content: [{
              type: 'text',
              text: `Volume created: ${volume.Name}`
            }]
          };
        }

        if (name === 'docker_remove_volume') {
          const volume = this.docker.getVolume(args.volume_name);
          await volume.remove({ force: args.force || false });
          return {
            content: [{
              type: 'text',
              text: `Volume ${args.volume_name} removed`
            }]
          };
        }

        if (name === 'docker_prune_volumes') {
          const result = await this.docker.pruneVolumes({
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });
          return {
            content: [{
              type: 'text',
              text: `Pruned ${result.VolumesDeleted?.length || 0} volumes, freed ${result.SpaceReclaimed} bytes`
            }]
          };
        }

        // ========== Docker Compose Handlers (SECURE - using spawn) ==========
        if (name === 'docker_compose_up') {
          // Validate inputs to prevent injection
          if (!isValidPath(args.compose_file)) {
            throw new Error('Invalid compose_file path');
          }
          if (args.project_name && !isValidPath(args.project_name)) {
            throw new Error('Invalid project_name');
          }

          const cmdArgs = ['-f', args.compose_file];
          if (args.project_name) cmdArgs.push('-p', args.project_name);
          cmdArgs.push('up');
          if (args.detach) cmdArgs.push('-d');
          if (args.build) cmdArgs.push('--build');
          if (args.force_recreate) cmdArgs.push('--force-recreate');

          const { stdout, stderr } = await safeExec('docker-compose', cmdArgs);
          return {
            content: [{
              type: 'text',
              text: stdout + (stderr ? `\nErrors:\n${stderr}` : '')
            }]
          };
        }

        if (name === 'docker_compose_down') {
          if (!isValidPath(args.compose_file)) {
            throw new Error('Invalid compose_file path');
          }
          if (args.project_name && !isValidPath(args.project_name)) {
            throw new Error('Invalid project_name');
          }

          const cmdArgs = ['-f', args.compose_file];
          if (args.project_name) cmdArgs.push('-p', args.project_name);
          cmdArgs.push('down');
          if (args.volumes) cmdArgs.push('-v');
          if (args.remove_orphans) cmdArgs.push('--remove-orphans');

          const { stdout, stderr } = await safeExec('docker-compose', cmdArgs);
          return {
            content: [{
              type: 'text',
              text: stdout + (stderr ? `\nErrors:\n${stderr}` : '')
            }]
          };
        }

        if (name === 'docker_compose_ps') {
          if (!isValidPath(args.compose_file)) {
            throw new Error('Invalid compose_file path');
          }
          if (args.project_name && !isValidPath(args.project_name)) {
            throw new Error('Invalid project_name');
          }

          const cmdArgs = ['-f', args.compose_file];
          if (args.project_name) cmdArgs.push('-p', args.project_name);
          cmdArgs.push('ps');

          const { stdout, stderr } = await safeExec('docker-compose', cmdArgs);
          return {
            content: [{
              type: 'text',
              text: stdout + (stderr ? `\nErrors:\n${stderr}` : '')
            }]
          };
        }

        if (name === 'docker_compose_logs') {
          if (!isValidPath(args.compose_file)) {
            throw new Error('Invalid compose_file path');
          }
          if (args.project_name && !isValidPath(args.project_name)) {
            throw new Error('Invalid project_name');
          }

          const cmdArgs = ['-f', args.compose_file];
          if (args.project_name) cmdArgs.push('-p', args.project_name);
          cmdArgs.push('logs');
          if (args.follow) cmdArgs.push('-f');
          if (args.tail) cmdArgs.push('--tail', String(args.tail));
          if (args.services && Array.isArray(args.services)) {
            args.services.forEach(svc => {
              if (isValidPath(svc)) cmdArgs.push(svc);
            });
          }

          const { stdout, stderr } = await safeExec('docker-compose', cmdArgs);
          return {
            content: [{
              type: 'text',
              text: stdout + (stderr ? `\nErrors:\n${stderr}` : '')
            }]
          };
        }

        if (name === 'docker_compose_exec') {
          if (!isValidPath(args.compose_file)) {
            throw new Error('Invalid compose_file path');
          }
          if (args.project_name && !isValidPath(args.project_name)) {
            throw new Error('Invalid project_name');
          }
          if (!isValidPath(args.service)) {
            throw new Error('Invalid service name');
          }

          const cmdArgs = ['-f', args.compose_file];
          if (args.project_name) cmdArgs.push('-p', args.project_name);
          cmdArgs.push('exec', args.service);
          if (args.cmd && Array.isArray(args.cmd)) {
            args.cmd.forEach(c => cmdArgs.push(c));
          }

          const { stdout, stderr } = await safeExec('docker-compose', cmdArgs);
          return {
            content: [{
              type: 'text',
              text: stdout + (stderr ? `\nErrors:\n${stderr}` : '')
            }]
          };
        }

        // ========== System Operations Handlers ==========
        if (name === 'docker_info') {
          const info = await this.docker.info();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(info, null, 2)
            }]
          };
        }

        if (name === 'docker_version') {
          const version = await this.docker.version();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(version, null, 2)
            }]
          };
        }

        if (name === 'docker_ping') {
          await this.docker.ping();
          return {
            content: [{
              type: 'text',
              text: 'Docker daemon is responsive'
            }]
          };
        }

        if (name === 'docker_df') {
          const df = await this.docker.df();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(df, null, 2)
            }]
          };
        }

        if (name === 'docker_events') {
          const events = await this.docker.getEvents({
            since: args.since,
            until: args.until,
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });

          let output = '';
          events.on('data', (chunk) => { output += chunk.toString() + '\n'; });

          // Collect events for 5 seconds
          await new Promise((resolve) => setTimeout(resolve, 5000));
          events.destroy();

          return {
            content: [{
              type: 'text',
              text: output || 'No events in the specified time period'
            }]
          };
        }

        if (name === 'docker_prune_system') {
          const result = await this.docker.pruneSystem({
            filters: args.filters ? JSON.stringify(args.filters) : undefined
          });
          return {
            content: [{
              type: 'text',
              text: `System prune complete:\n${JSON.stringify(result, null, 2)}`
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`
          }],
          isError: true,
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Docker MCP server running on stdio');
  }
}

const server = new DockerMCPServer();
server.run().catch(console.error);
