import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { screenshotService } from './screenshot-service.js';

// Default parameter values
const DEFAULT_VIEWPORT = {
  WIDTH: 1280,
  HEIGHT: 720
};

const DEFAULT_SETTINGS = {
  FORMAT: 'webp' as const,
  QUALITY: 80,
  WAIT_FOR_NETWORK_IDLE: true,
  TIMEOUT: 30000
};

const PARAMETER_LIMITS = {
  WIDTH: { MIN: 200, MAX: 4000 },
  HEIGHT: { MIN: 200, MAX: 4000 },
  QUALITY: { MIN: 1, MAX: 100 },
  TIMEOUT: { MIN: 1000, MAX: 120000 }
};

export class McpScreenshotServer {
  private server: McpServer;

  constructor() {
    // Create the MCP server instance
    this.server = new McpServer({
      name: 'browserloop',
      version: '1.0.0'
    });

    this.setupScreenshotTool();
  }

  private setupScreenshotTool(): void {
    // Register the screenshot tool
    this.server.tool(
      'screenshot',
      {
        url: z.string().url('Invalid URL format'),
        width: z.number()
          .min(PARAMETER_LIMITS.WIDTH.MIN, `Width must be at least ${PARAMETER_LIMITS.WIDTH.MIN}`)
          .max(PARAMETER_LIMITS.WIDTH.MAX, `Width must be at most ${PARAMETER_LIMITS.WIDTH.MAX}`)
          .optional(),
        height: z.number()
          .min(PARAMETER_LIMITS.HEIGHT.MIN, `Height must be at least ${PARAMETER_LIMITS.HEIGHT.MIN}`)
          .max(PARAMETER_LIMITS.HEIGHT.MAX, `Height must be at most ${PARAMETER_LIMITS.HEIGHT.MAX}`)
          .optional(),
        format: z.enum(['webp', 'png']).optional(),
        quality: z.number()
          .min(PARAMETER_LIMITS.QUALITY.MIN, `Quality must be at least ${PARAMETER_LIMITS.QUALITY.MIN}`)
          .max(PARAMETER_LIMITS.QUALITY.MAX, `Quality must be at most ${PARAMETER_LIMITS.QUALITY.MAX}`)
          .optional(),
        waitForNetworkIdle: z.boolean().optional(),
        timeout: z.number()
          .min(PARAMETER_LIMITS.TIMEOUT.MIN, `Timeout must be at least ${PARAMETER_LIMITS.TIMEOUT.MIN}ms`)
          .max(PARAMETER_LIMITS.TIMEOUT.MAX, `Timeout must be at most ${PARAMETER_LIMITS.TIMEOUT.MAX}ms`)
          .optional(),
        fullPage: z.boolean().optional()
      },
      async (request, extra) => {
        const requestId = extra.requestId || 'unknown'; // Use extra.requestId if available, otherwise default to 'unknown'
        try {
          // Set defaults for optional parameters
          const options = {
            url: request.url,
            width: request.width ?? DEFAULT_VIEWPORT.WIDTH,
            height: request.height ?? DEFAULT_VIEWPORT.HEIGHT,
            format: request.format ?? DEFAULT_SETTINGS.FORMAT,
            quality: request.quality ?? DEFAULT_SETTINGS.QUALITY,
            waitForNetworkIdle: request.waitForNetworkIdle ?? DEFAULT_SETTINGS.WAIT_FOR_NETWORK_IDLE,
            timeout: request.timeout ?? DEFAULT_SETTINGS.TIMEOUT
          };

          // Take screenshot using appropriate method
          const result = request.fullPage
            ? await screenshotService.takeFullPageScreenshot(options)
            : await screenshotService.takeScreenshot(options);

          // Format response for MCP
          return {
            content: [
              {
                type: 'image',
                data: result.data,
                mimeType: result.mimeType
              },
              {
                type: 'text',
                text: JSON.stringify({
                  metadata: {
                    width: result.width,
                    height: result.height,
                    timestamp: result.timestamp,
                    url: request.url,
                    viewport: {
                      width: options.width,
                      height: options.height
                    }
                  }
                }, null, 2)
              }
            ],
            isError: false
          };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          return {
            content: [{
              type: 'text',
              text: `Screenshot capture failed: ${errorMessage}`
            }],
            isError: true
          };
        }
      }
    );
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      await screenshotService.initialize();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Initialize the server (for testing)
   */
  async initialize(): Promise<void> {
    await screenshotService.initialize();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await screenshotService.cleanup();
    } catch (error) {
      // Silent cleanup - don't interfere with stdio
    }
  }
}

// Export a singleton instance
export const mcpServer = new McpScreenshotServer();
