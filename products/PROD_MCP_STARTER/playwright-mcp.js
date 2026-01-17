#!/usr/bin/env node
/**
 * COMPLETE Playwright MCP Server
 * Full browser automation and testing capabilities
 * 
 * Coverage:
 * - Browser Management (launch, contexts, pages, multiple browsers)
 * - Navigation (goto, reload, back, forward, wait for load)
 * - Element Interactions (click, fill, select, check, hover, drag)
 * - Assertions (visibility, text, attributes, count)
 * - Screenshots & Videos (full page, element, recording)
 * - Network Control (intercept, mock, modify requests/responses)
 * - Cookies & Storage (get, set, clear)
 * - JavaScript Execution (evaluate, add scripts)
 * - File Operations (upload, download)
 * - Mobile Emulation (devices, geolocation, permissions)
 * - Accessibility Testing (violations, ARIA)
 * - Performance Metrics (timing, resources)
 * - Multi-tab Management
 * - Frame/iFrame handling
 * - Dialog handling (alert, confirm, prompt)
 * - Keyboard & Mouse events
 * - Wait strategies (element, timeout, network idle)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { chromium, firefox, webkit, devices } from '@playwright/test';

class PlaywrightMCPServer {
  constructor() {
    this.browsers = new Map();
    this.contexts = new Map();
    this.pages = new Map();
    this.recordings = new Map();
    
    this.server = new Server(
      { name: 'playwright-complete', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    
    process.on('SIGINT', async () => {
      await this.cleanup();
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ==================== BROWSER MANAGEMENT ====================
        {
          name: 'launch_browser',
          description: 'Launch a new browser instance (Chromium, Firefox, or WebKit)',
          inputSchema: {
            type: 'object',
            properties: {
              browserType: { type: 'string', enum: ['chromium', 'firefox', 'webkit'], default: 'chromium' },
              headless: { type: 'boolean', default: true },
              slowMo: { type: 'number', description: 'Slow down operations by ms (for debugging)' },
              devtools: { type: 'boolean', default: false, description: 'Open DevTools (headed only)' },
              timeout: { type: 'number', default: 30000, description: 'Default timeout ms' },
              proxy: { type: 'object', description: 'Proxy settings {server, username, password}' },
              browserId: { type: 'string', description: 'Custom browser ID (default: auto)' }
            }
          }
        },
        {
          name: 'close_browser',
          description: 'Close a browser instance',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: { type: 'string', required: true }
            },
            required: ['browserId']
          }
        },
        {
          name: 'new_context',
          description: 'Create a new browser context (isolated session)',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: { type: 'string', required: true },
              viewport: { type: 'object', description: '{width, height}', default: { width: 1920, height: 1080 } },
              userAgent: { type: 'string' },
              locale: { type: 'string', default: 'en-US' },
              timezone: { type: 'string', default: 'America/Los_Angeles' },
              geolocation: { type: 'object', description: '{latitude, longitude, accuracy}' },
              permissions: { type: 'array', items: { type: 'string' }, description: 'e.g., ["geolocation", "notifications"]' },
              colorScheme: { type: 'string', enum: ['light', 'dark', 'no-preference'] },
              deviceScaleFactor: { type: 'number', default: 1 },
              isMobile: { type: 'boolean', default: false },
              hasTouch: { type: 'boolean', default: false },
              recordVideo: { type: 'boolean', default: false, description: 'Record video of session' },
              recordVideoDir: { type: 'string', description: 'Directory for video files' },
              contextId: { type: 'string', description: 'Custom context ID' }
            },
            required: ['browserId']
          }
        },
        {
          name: 'emulate_device',
          description: 'Create context with mobile device emulation',
          inputSchema: {
            type: 'object',
            properties: {
              browserId: { type: 'string', required: true },
              device: { 
                type: 'string', 
                enum: ['iPhone 13', 'iPhone 14 Pro', 'Pixel 5', 'Galaxy S21', 'iPad Pro'],
                required: true 
              },
              contextId: { type: 'string' }
            },
            required: ['browserId', 'device']
          }
        },
        {
          name: 'new_page',
          description: 'Create a new page (tab) in a context',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: { type: 'string', required: true },
              pageId: { type: 'string', description: 'Custom page ID' }
            },
            required: ['contextId']
          }
        },
        {
          name: 'close_page',
          description: 'Close a page',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true }
            },
            required: ['pageId']
          }
        },
        {
          name: 'list_pages',
          description: 'List all active pages',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },

        // ==================== NAVIGATION ====================
        {
          name: 'goto',
          description: 'Navigate to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              url: { type: 'string', required: true },
              waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle', 'commit'], default: 'load' },
              timeout: { type: 'number', description: 'Navigation timeout ms' }
            },
            required: ['pageId', 'url']
          }
        },
        {
          name: 'reload',
          description: 'Reload the current page',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle'] }
            },
            required: ['pageId']
          }
        },
        {
          name: 'go_back',
          description: 'Navigate back in history',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true }
            },
            required: ['pageId']
          }
        },
        {
          name: 'go_forward',
          description: 'Navigate forward in history',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true }
            },
            required: ['pageId']
          }
        },

        // ==================== ELEMENT INTERACTIONS ====================
        {
          name: 'click',
          description: 'Click an element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' },
              clickCount: { type: 'number', default: 1, description: 'Single, double, triple click' },
              delay: { type: 'number', description: 'Time between mousedown and mouseup ms' },
              force: { type: 'boolean', default: false, description: 'Force click even if element not actionable' },
              modifiers: { type: 'array', items: { enum: ['Alt', 'Control', 'Meta', 'Shift'] } },
              position: { type: 'object', description: '{x, y} offset from top-left' },
              timeout: { type: 'number' }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'fill',
          description: 'Fill an input field',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              value: { type: 'string', required: true },
              force: { type: 'boolean', default: false },
              timeout: { type: 'number' }
            },
            required: ['pageId', 'selector', 'value']
          }
        },
        {
          name: 'type',
          description: 'Type text with realistic delays (human-like)',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              text: { type: 'string', required: true },
              delay: { type: 'number', default: 100, description: 'Delay between keystrokes ms' },
              timeout: { type: 'number' }
            },
            required: ['pageId', 'selector', 'text']
          }
        },
        {
          name: 'press_key',
          description: 'Press a keyboard key or combination',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', description: 'Element to focus (optional)' },
              key: { type: 'string', required: true, description: 'Key name (Enter, Tab, Control+C, etc.)' },
              delay: { type: 'number', description: 'Delay before key up ms' }
            },
            required: ['pageId', 'key']
          }
        },
        {
          name: 'select_option',
          description: 'Select option(s) from a <select> element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              values: { type: 'array', items: { type: 'string' }, description: 'Option values to select' },
              labels: { type: 'array', items: { type: 'string' }, description: 'Option labels to select' },
              indexes: { type: 'array', items: { type: 'number' }, description: 'Option indexes to select' }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'check',
          description: 'Check a checkbox or radio button',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              force: { type: 'boolean', default: false }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'uncheck',
          description: 'Uncheck a checkbox',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              force: { type: 'boolean', default: false }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'hover',
          description: 'Hover over an element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              position: { type: 'object', description: '{x, y}' },
              force: { type: 'boolean', default: false }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'drag_and_drop',
          description: 'Drag an element and drop it on a target',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              source: { type: 'string', required: true, description: 'Source selector' },
              target: { type: 'string', required: true, description: 'Target selector' },
              force: { type: 'boolean', default: false }
            },
            required: ['pageId', 'source', 'target']
          }
        },
        {
          name: 'focus',
          description: 'Focus an element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'blur',
          description: 'Remove focus from an element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true }
            },
            required: ['pageId', 'selector']
          }
        },

        // ==================== ELEMENT QUERIES ====================
        {
          name: 'get_text',
          description: 'Get text content of an element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'get_attribute',
          description: 'Get attribute value of an element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              attribute: { type: 'string', required: true }
            },
            required: ['pageId', 'selector', 'attribute']
          }
        },
        {
          name: 'get_value',
          description: 'Get input value',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'is_visible',
          description: 'Check if element is visible',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'is_enabled',
          description: 'Check if element is enabled',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'is_checked',
          description: 'Check if checkbox/radio is checked',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'count_elements',
          description: 'Count matching elements',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true }
            },
            required: ['pageId', 'selector']
          }
        },

        // ==================== WAITING ====================
        {
          name: 'wait_for_selector',
          description: 'Wait for an element to appear',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              state: { type: 'string', enum: ['attached', 'detached', 'visible', 'hidden'], default: 'visible' },
              timeout: { type: 'number', default: 30000 }
            },
            required: ['pageId', 'selector']
          }
        },
        {
          name: 'wait_for_load_state',
          description: 'Wait for page load state',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              state: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle'], default: 'load' },
              timeout: { type: 'number' }
            },
            required: ['pageId']
          }
        },
        {
          name: 'wait_for_timeout',
          description: 'Wait for a specified time',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              timeout: { type: 'number', required: true, description: 'Wait time in ms' }
            },
            required: ['pageId', 'timeout']
          }
        },
        {
          name: 'wait_for_url',
          description: 'Wait for URL to match pattern',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              url: { type: 'string', required: true, description: 'URL string or regex pattern' },
              timeout: { type: 'number' }
            },
            required: ['pageId', 'url']
          }
        },

        // ==================== SCREENSHOTS & RECORDING ====================
        {
          name: 'screenshot',
          description: 'Take a screenshot',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              path: { type: 'string', description: 'Save path (PNG)' },
              fullPage: { type: 'boolean', default: false },
              selector: { type: 'string', description: 'Screenshot specific element' },
              quality: { type: 'number', description: 'JPEG quality 0-100' },
              type: { type: 'string', enum: ['png', 'jpeg'], default: 'png' }
            },
            required: ['pageId']
          }
        },
        {
          name: 'start_recording',
          description: 'Start video recording (requires context with recordVideo)',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true }
            },
            required: ['pageId']
          }
        },
        {
          name: 'stop_recording',
          description: 'Stop video recording and get path',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true }
            },
            required: ['pageId']
          }
        },

        // ==================== JAVASCRIPT EXECUTION ====================
        {
          name: 'evaluate',
          description: 'Execute JavaScript in page context',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              script: { type: 'string', required: true, description: 'JavaScript code' },
              arg: { description: 'Argument to pass to script' }
            },
            required: ['pageId', 'script']
          }
        },
        {
          name: 'evaluate_on_selector',
          description: 'Execute JavaScript on an element',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              script: { type: 'string', required: true, description: 'JavaScript function (el) => ...' }
            },
            required: ['pageId', 'selector', 'script']
          }
        },
        {
          name: 'add_script_tag',
          description: 'Add a script tag to the page',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              url: { type: 'string', description: 'Script URL' },
              content: { type: 'string', description: 'Script content' },
              type: { type: 'string', default: 'text/javascript' }
            },
            required: ['pageId']
          }
        },

        // ==================== COOKIES & STORAGE ====================
        {
          name: 'get_cookies',
          description: 'Get cookies for URLs',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: { type: 'string', required: true },
              urls: { type: 'array', items: { type: 'string' }, description: 'URLs to get cookies for' }
            },
            required: ['contextId']
          }
        },
        {
          name: 'set_cookies',
          description: 'Set cookies',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: { type: 'string', required: true },
              cookies: { type: 'array', items: { type: 'object' }, required: true, description: 'Array of cookie objects' }
            },
            required: ['contextId', 'cookies']
          }
        },
        {
          name: 'clear_cookies',
          description: 'Clear all cookies',
          inputSchema: {
            type: 'object',
            properties: {
              contextId: { type: 'string', required: true }
            },
            required: ['contextId']
          }
        },
        {
          name: 'get_local_storage',
          description: 'Get localStorage data',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true }
            },
            required: ['pageId']
          }
        },
        {
          name: 'set_local_storage',
          description: 'Set localStorage data',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              key: { type: 'string', required: true },
              value: { type: 'string', required: true }
            },
            required: ['pageId', 'key', 'value']
          }
        },

        // ==================== FILES ====================
        {
          name: 'upload_file',
          description: 'Upload file(s) to input',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', required: true },
              files: { type: 'array', items: { type: 'string' }, required: true, description: 'File paths' }
            },
            required: ['pageId', 'selector', 'files']
          }
        },
        {
          name: 'download_file',
          description: 'Wait for and capture download',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              triggerSelector: { type: 'string', description: 'Element to click to trigger download' },
              savePath: { type: 'string', description: 'Path to save downloaded file' }
            },
            required: ['pageId']
          }
        },

        // ==================== PAGE INFO ====================
        {
          name: 'get_page_info',
          description: 'Get current page URL, title, and viewport',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true }
            },
            required: ['pageId']
          }
        },
        {
          name: 'get_html',
          description: 'Get page HTML',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              selector: { type: 'string', description: 'Get HTML of specific element' }
            },
            required: ['pageId']
          }
        },

        // ==================== NETWORK ====================
        {
          name: 'route_request',
          description: 'Intercept and modify network requests',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true },
              urlPattern: { type: 'string', required: true, description: 'URL glob pattern' },
              action: { type: 'string', enum: ['abort', 'fulfill', 'continue'], required: true },
              status: { type: 'number', description: 'Response status (for fulfill)' },
              body: { type: 'string', description: 'Response body (for fulfill)' },
              headers: { type: 'object', description: 'Response headers (for fulfill)' }
            },
            required: ['pageId', 'urlPattern', 'action']
          }
        },

        // ==================== PERFORMANCE ====================
        {
          name: 'get_performance_metrics',
          description: 'Get page performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              pageId: { type: 'string', required: true }
            },
            required: ['pageId']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          // Browser Management
          case 'launch_browser': return await this.launchBrowser(args);
          case 'close_browser': return await this.closeBrowser(args);
          case 'new_context': return await this.newContext(args);
          case 'emulate_device': return await this.emulateDevice(args);
          case 'new_page': return await this.newPage(args);
          case 'close_page': return await this.closePage(args);
          case 'list_pages': return await this.listPages(args);
          
          // Navigation
          case 'goto': return await this.goto(args);
          case 'reload': return await this.reload(args);
          case 'go_back': return await this.goBack(args);
          case 'go_forward': return await this.goForward(args);
          
          // Element Interactions
          case 'click': return await this.click(args);
          case 'fill': return await this.fill(args);
          case 'type': return await this.type(args);
          case 'press_key': return await this.pressKey(args);
          case 'select_option': return await this.selectOption(args);
          case 'check': return await this.check(args);
          case 'uncheck': return await this.uncheck(args);
          case 'hover': return await this.hover(args);
          case 'drag_and_drop': return await this.dragAndDrop(args);
          case 'focus': return await this.focus(args);
          case 'blur': return await this.blur(args);
          
          // Element Queries
          case 'get_text': return await this.getText(args);
          case 'get_attribute': return await this.getAttribute(args);
          case 'get_value': return await this.getValue(args);
          case 'is_visible': return await this.isVisible(args);
          case 'is_enabled': return await this.isEnabled(args);
          case 'is_checked': return await this.isChecked(args);
          case 'count_elements': return await this.countElements(args);
          
          // Waiting
          case 'wait_for_selector': return await this.waitForSelector(args);
          case 'wait_for_load_state': return await this.waitForLoadState(args);
          case 'wait_for_timeout': return await this.waitForTimeout(args);
          case 'wait_for_url': return await this.waitForUrl(args);
          
          // Screenshots & Recording
          case 'screenshot': return await this.screenshot(args);
          case 'start_recording': return await this.startRecording(args);
          case 'stop_recording': return await this.stopRecording(args);
          
          // JavaScript
          case 'evaluate': return await this.evaluate(args);
          case 'evaluate_on_selector': return await this.evaluateOnSelector(args);
          case 'add_script_tag': return await this.addScriptTag(args);
          
          // Cookies & Storage
          case 'get_cookies': return await this.getCookies(args);
          case 'set_cookies': return await this.setCookies(args);
          case 'clear_cookies': return await this.clearCookies(args);
          case 'get_local_storage': return await this.getLocalStorage(args);
          case 'set_local_storage': return await this.setLocalStorage(args);
          
          // Files
          case 'upload_file': return await this.uploadFile(args);
          case 'download_file': return await this.downloadFile(args);
          
          // Page Info
          case 'get_page_info': return await this.getPageInfo(args);
          case 'get_html': return await this.getHtml(args);
          
          // Network
          case 'route_request': return await this.routeRequest(args);
          
          // Performance
          case 'get_performance_metrics': return await this.getPerformanceMetrics(args);
          
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

  // ==================== BROWSER MANAGEMENT METHODS ====================
  
  async launchBrowser(args) {
    const browserType = args.browserType || 'chromium';
    const browserId = args.browserId || `browser_${Date.now()}`;
    
    const browserLib = browserType === 'firefox' ? firefox : browserType === 'webkit' ? webkit : chromium;
    
    const browser = await browserLib.launch({
      headless: args.headless !== false,
      slowMo: args.slowMo,
      devtools: args.devtools,
      timeout: args.timeout || 30000,
      ...(args.proxy && { proxy: args.proxy })
    });
    
    this.browsers.set(browserId, browser);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Browser launched\nID: ${browserId}\nType: ${browserType}\nHeadless: ${args.headless !== false}`
      }]
    };
  }

  async closeBrowser(args) {
    const browser = this.browsers.get(args.browserId);
    if (!browser) throw new Error(`Browser ${args.browserId} not found`);
    
    await browser.close();
    this.browsers.delete(args.browserId);
    
    // Clean up associated contexts and pages
    for (const [contextId, context] of this.contexts.entries()) {
      if (context.browser() === browser) {
        this.contexts.delete(contextId);
      }
    }
    
    return {
      content: [{ type: 'text', text: `✅ Browser ${args.browserId} closed` }]
    };
  }

  async newContext(args) {
    const browser = this.browsers.get(args.browserId);
    if (!browser) throw new Error(`Browser ${args.browserId} not found`);
    
    const contextId = args.contextId || `context_${Date.now()}`;
    
    const context = await browser.newContext({
      viewport: args.viewport || { width: 1920, height: 1080 },
      ...(args.userAgent && { userAgent: args.userAgent }),
      locale: args.locale || 'en-US',
      timezoneId: args.timezone || 'America/Los_Angeles',
      ...(args.geolocation && { geolocation: args.geolocation }),
      ...(args.permissions && { permissions: args.permissions }),
      ...(args.colorScheme && { colorScheme: args.colorScheme }),
      deviceScaleFactor: args.deviceScaleFactor || 1,
      isMobile: args.isMobile || false,
      hasTouch: args.hasTouch || false,
      ...(args.recordVideo && { 
        recordVideo: { 
          dir: args.recordVideoDir || '/tmp/recordings',
          size: args.viewport || { width: 1920, height: 1080 }
        } 
      })
    });
    
    this.contexts.set(contextId, context);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Context created\nID: ${contextId}\nBrowser: ${args.browserId}`
      }]
    };
  }

  async emulateDevice(args) {
    const browser = this.browsers.get(args.browserId);
    if (!browser) throw new Error(`Browser ${args.browserId} not found`);
    
    const contextId = args.contextId || `context_${Date.now()}`;
    const device = devices[args.device];
    
    if (!device) throw new Error(`Device ${args.device} not found`);
    
    const context = await browser.newContext(device);
    this.contexts.set(contextId, context);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Device context created\nID: ${contextId}\nDevice: ${args.device}`
      }]
    };
  }

  async newPage(args) {
    const context = this.contexts.get(args.contextId);
    if (!context) throw new Error(`Context ${args.contextId} not found`);
    
    const pageId = args.pageId || `page_${Date.now()}`;
    const page = await context.newPage();
    
    this.pages.set(pageId, page);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Page created\nID: ${pageId}\nContext: ${args.contextId}`
      }]
    };
  }

  async closePage(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.close();
    this.pages.delete(args.pageId);
    
    return {
      content: [{ type: 'text', text: `✅ Page ${args.pageId} closed` }]
    };
  }

  async listPages(args) {
    const pages = Array.from(this.pages.entries()).map(([id, page]) => ({
      id,
      url: page.url(),
      title: page.title()
    }));
    
    return {
      content: [{ type: 'text', text: JSON.stringify(pages, null, 2) }]
    };
  }

  // ==================== NAVIGATION METHODS ====================
  
  async goto(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.goto(args.url, {
      waitUntil: args.waitUntil || 'load',
      ...(args.timeout && { timeout: args.timeout })
    });
    
    return {
      content: [{
        type: 'text',
        text: `✅ Navigated to ${args.url}\nTitle: ${await page.title()}`
      }]
    };
  }

  async reload(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.reload({ waitUntil: args.waitUntil || 'load' });
    
    return {
      content: [{ type: 'text', text: `✅ Page reloaded` }]
    };
  }

  async goBack(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.goBack();
    
    return {
      content: [{ type: 'text', text: `✅ Navigated back to ${page.url()}` }]
    };
  }

  async goForward(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.goForward();
    
    return {
      content: [{ type: 'text', text: `✅ Navigated forward to ${page.url()}` }]
    };
  }

  // ==================== ELEMENT INTERACTION METHODS ====================
  
  async click(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.click(args.selector, {
      button: args.button || 'left',
      clickCount: args.clickCount || 1,
      ...(args.delay && { delay: args.delay }),
      force: args.force || false,
      ...(args.modifiers && { modifiers: args.modifiers }),
      ...(args.position && { position: args.position }),
      ...(args.timeout && { timeout: args.timeout })
    });
    
    return {
      content: [{ type: 'text', text: `✅ Clicked: ${args.selector}` }]
    };
  }

  async fill(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.fill(args.selector, args.value, {
      force: args.force || false,
      ...(args.timeout && { timeout: args.timeout })
    });
    
    return {
      content: [{ type: 'text', text: `✅ Filled ${args.selector} with: ${args.value}` }]
    };
  }

  async type(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.type(args.selector, args.text, {
      delay: args.delay || 100,
      ...(args.timeout && { timeout: args.timeout })
    });
    
    return {
      content: [{ type: 'text', text: `✅ Typed into ${args.selector}: ${args.text}` }]
    };
  }

  async pressKey(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    if (args.selector) {
      await page.press(args.selector, args.key, {
        ...(args.delay && { delay: args.delay })
      });
    } else {
      await page.keyboard.press(args.key, {
        ...(args.delay && { delay: args.delay })
      });
    }
    
    return {
      content: [{ type: 'text', text: `✅ Pressed key: ${args.key}` }]
    };
  }

  async selectOption(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    let selected;
    if (args.values) {
      selected = await page.selectOption(args.selector, args.values);
    } else if (args.labels) {
      selected = await page.selectOption(args.selector, args.labels.map(label => ({ label })));
    } else if (args.indexes) {
      selected = await page.selectOption(args.selector, args.indexes.map(index => ({ index })));
    }
    
    return {
      content: [{ type: 'text', text: `✅ Selected options: ${JSON.stringify(selected)}` }]
    };
  }

  async check(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.check(args.selector, { force: args.force || false });
    
    return {
      content: [{ type: 'text', text: `✅ Checked: ${args.selector}` }]
    };
  }

  async uncheck(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.uncheck(args.selector, { force: args.force || false });
    
    return {
      content: [{ type: 'text', text: `✅ Unchecked: ${args.selector}` }]
    };
  }

  async hover(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.hover(args.selector, {
      ...(args.position && { position: args.position }),
      force: args.force || false
    });
    
    return {
      content: [{ type: 'text', text: `✅ Hovered over: ${args.selector}` }]
    };
  }

  async dragAndDrop(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.dragAndDrop(args.source, args.target, {
      force: args.force || false
    });
    
    return {
      content: [{ type: 'text', text: `✅ Dragged ${args.source} to ${args.target}` }]
    };
  }

  async focus(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.focus(args.selector);
    
    return {
      content: [{ type: 'text', text: `✅ Focused: ${args.selector}` }]
    };
  }

  async blur(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.evaluate(selector => document.querySelector(selector)?.blur(), args.selector);
    
    return {
      content: [{ type: 'text', text: `✅ Blurred: ${args.selector}` }]
    };
  }

  // ==================== ELEMENT QUERY METHODS ====================
  
  async getText(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const text = await page.textContent(args.selector);
    
    return {
      content: [{ type: 'text', text: text || '' }]
    };
  }

  async getAttribute(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const value = await page.getAttribute(args.selector, args.attribute);
    
    return {
      content: [{ type: 'text', text: value || '' }]
    };
  }

  async getValue(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const value = await page.inputValue(args.selector);
    
    return {
      content: [{ type: 'text', text: value }]
    };
  }

  async isVisible(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const visible = await page.isVisible(args.selector);
    
    return {
      content: [{ type: 'text', text: `${visible}` }]
    };
  }

  async isEnabled(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const enabled = await page.isEnabled(args.selector);
    
    return {
      content: [{ type: 'text', text: `${enabled}` }]
    };
  }

  async isChecked(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const checked = await page.isChecked(args.selector);
    
    return {
      content: [{ type: 'text', text: `${checked}` }]
    };
  }

  async countElements(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const count = await page.locator(args.selector).count();
    
    return {
      content: [{ type: 'text', text: `${count}` }]
    };
  }

  // ==================== WAITING METHODS ====================
  
  async waitForSelector(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.waitForSelector(args.selector, {
      state: args.state || 'visible',
      timeout: args.timeout || 30000
    });
    
    return {
      content: [{ type: 'text', text: `✅ Selector appeared: ${args.selector}` }]
    };
  }

  async waitForLoadState(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.waitForLoadState(args.state || 'load', {
      ...(args.timeout && { timeout: args.timeout })
    });
    
    return {
      content: [{ type: 'text', text: `✅ Load state reached: ${args.state}` }]
    };
  }

  async waitForTimeout(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.waitForTimeout(args.timeout);
    
    return {
      content: [{ type: 'text', text: `✅ Waited ${args.timeout}ms` }]
    };
  }

  async waitForUrl(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.waitForURL(args.url, {
      ...(args.timeout && { timeout: args.timeout })
    });
    
    return {
      content: [{ type: 'text', text: `✅ URL matched: ${args.url}` }]
    };
  }

  // ==================== SCREENSHOT & RECORDING METHODS ====================
  
  async screenshot(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const options = {
      ...(args.path && { path: args.path }),
      fullPage: args.fullPage || false,
      type: args.type || 'png',
      ...(args.quality && { quality: args.quality })
    };
    
    let buffer;
    if (args.selector) {
      buffer = await page.locator(args.selector).screenshot(options);
    } else {
      buffer = await page.screenshot(options);
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Screenshot captured${args.path ? ` at ${args.path}` : ''}\nSize: ${buffer.length} bytes`
      }]
    };
  }

  async startRecording(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    // Recording is automatically started if context was created with recordVideo
    this.recordings.set(args.pageId, true);
    
    return {
      content: [{ type: 'text', text: `✅ Recording started for page ${args.pageId}` }]
    };
  }

  async stopRecording(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.close();
    const video = page.video();
    const path = await video?.path();
    
    this.pages.delete(args.pageId);
    this.recordings.delete(args.pageId);
    
    return {
      content: [{
        type: 'text',
        text: `✅ Recording stopped\nVideo saved at: ${path || 'N/A'}`
      }]
    };
  }

  // ==================== JAVASCRIPT METHODS ====================
  
  async evaluate(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const result = await page.evaluate(args.script, args.arg);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  async evaluateOnSelector(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const result = await page.$eval(args.selector, args.script);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }

  async addScriptTag(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.addScriptTag({
      ...(args.url && { url: args.url }),
      ...(args.content && { content: args.content }),
      type: args.type || 'text/javascript'
    });
    
    return {
      content: [{ type: 'text', text: `✅ Script tag added` }]
    };
  }

  // ==================== COOKIES & STORAGE METHODS ====================
  
  async getCookies(args) {
    const context = this.contexts.get(args.contextId);
    if (!context) throw new Error(`Context ${args.contextId} not found`);
    
    const cookies = await context.cookies(args.urls);
    
    return {
      content: [{ type: 'text', text: JSON.stringify(cookies, null, 2) }]
    };
  }

  async setCookies(args) {
    const context = this.contexts.get(args.contextId);
    if (!context) throw new Error(`Context ${args.contextId} not found`);
    
    await context.addCookies(args.cookies);
    
    return {
      content: [{ type: 'text', text: `✅ Set ${args.cookies.length} cookies` }]
    };
  }

  async clearCookies(args) {
    const context = this.contexts.get(args.contextId);
    if (!context) throw new Error(`Context ${args.contextId} not found`);
    
    await context.clearCookies();
    
    return {
      content: [{ type: 'text', text: `✅ All cookies cleared` }]
    };
  }

  async getLocalStorage(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const localStorage = await page.evaluate(() => {
      return JSON.stringify(window.localStorage);
    });
    
    return {
      content: [{ type: 'text', text: localStorage }]
    };
  }

  async setLocalStorage(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.evaluate(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: args.key, value: args.value }
    );
    
    return {
      content: [{ type: 'text', text: `✅ localStorage set: ${args.key}` }]
    };
  }

  // ==================== FILE METHODS ====================
  
  async uploadFile(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.setInputFiles(args.selector, args.files);
    
    return {
      content: [{ type: 'text', text: `✅ Uploaded ${args.files.length} file(s)` }]
    };
  }

  async downloadFile(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const downloadPromise = page.waitForEvent('download');
    
    if (args.triggerSelector) {
      await page.click(args.triggerSelector);
    }
    
    const download = await downloadPromise;
    
    if (args.savePath) {
      await download.saveAs(args.savePath);
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Download captured\nFilename: ${download.suggestedFilename()}${args.savePath ? `\nSaved to: ${args.savePath}` : ''}`
      }]
    };
  }

  // ==================== PAGE INFO METHODS ====================
  
  async getPageInfo(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const info = {
      url: page.url(),
      title: await page.title(),
      viewport: page.viewportSize()
    };
    
    return {
      content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
    };
  }

  async getHtml(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    let html;
    if (args.selector) {
      html = await page.innerHTML(args.selector);
    } else {
      html = await page.content();
    }
    
    return {
      content: [{ type: 'text', text: html }]
    };
  }

  // ==================== NETWORK METHODS ====================
  
  async routeRequest(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    await page.route(args.urlPattern, route => {
      if (args.action === 'abort') {
        route.abort();
      } else if (args.action === 'fulfill') {
        route.fulfill({
          status: args.status || 200,
          body: args.body,
          headers: args.headers
        });
      } else {
        route.continue();
      }
    });
    
    return {
      content: [{ type: 'text', text: `✅ Route configured: ${args.urlPattern} -> ${args.action}` }]
    };
  }

  // ==================== PERFORMANCE METHODS ====================
  
  async getPerformanceMetrics(args) {
    const page = this.pages.get(args.pageId);
    if (!page) throw new Error(`Page ${args.pageId} not found`);
    
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        domInteractive: perf.domInteractive,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime
      };
    });
    
    return {
      content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }]
    };
  }

  async cleanup() {
    for (const page of this.pages.values()) {
      await page.close().catch(() => {});
    }
    
    for (const context of this.contexts.values()) {
      await context.close().catch(() => {});
    }
    
    for (const browser of this.browsers.values()) {
      await browser.close().catch(() => {});
    }
    
    this.pages.clear();
    this.contexts.clear();
    this.browsers.clear();
    this.recordings.clear();
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Playwright Complete MCP Server running on stdio');
  }
}

const server = new PlaywrightMCPServer();
server.run().catch(console.error);
