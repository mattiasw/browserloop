import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ScreenshotService } from './screenshot-service.js';
import { config } from './config.js';
import type { ScreenshotServiceConfig } from './types.js';

export class McpScreenshotServer {
  private server: McpServer;
  private screenshotService: ScreenshotService;

  constructor() {
    // Create the MCP server instance
    this.server = new McpServer({
      name: 'browserloop',
      version: '1.0.0'
    });

    // Create screenshot service with configuration
    this.screenshotService = new ScreenshotService(config.getConfig() as ScreenshotServiceConfig);

    this.setupScreenshotTool();
  }

  private setupScreenshotTool(): void {
    const browserConfig = config.getBrowserConfig();
    const viewportConfig = config.getViewportConfig();
    const screenshotConfig = config.getScreenshotConfig();

    // Parameter limits (keep existing validation)
    const PARAMETER_LIMITS = {
      WIDTH: { MIN: 200, MAX: 4000 },
      HEIGHT: { MIN: 200, MAX: 4000 },
      QUALITY: { MIN: 1, MAX: 100 },
      TIMEOUT: { MIN: 1000, MAX: 120000 }
    };

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
        format: z.enum(['webp', 'png', 'jpeg']).optional(),
        quality: z.number()
          .min(PARAMETER_LIMITS.QUALITY.MIN, `Quality must be at least ${PARAMETER_LIMITS.QUALITY.MIN}`)
          .max(PARAMETER_LIMITS.QUALITY.MAX, `Quality must be at most ${PARAMETER_LIMITS.QUALITY.MAX}`)
          .optional(),
        waitForNetworkIdle: z.boolean().optional(),
        timeout: z.number()
          .min(PARAMETER_LIMITS.TIMEOUT.MIN, `Timeout must be at least ${PARAMETER_LIMITS.TIMEOUT.MIN}ms`)
          .max(PARAMETER_LIMITS.TIMEOUT.MAX, `Timeout must be at most ${PARAMETER_LIMITS.TIMEOUT.MAX}ms`)
          .optional(),
        fullPage: z.boolean().optional(),
        userAgent: z.string().optional(),
        selector: z.string().optional()
      },
      async (request, extra) => {
        const requestId = extra.requestId || 'unknown';
        try {
          // Set defaults from configuration
          const baseOptions = {
            url: request.url,
            width: request.width ?? viewportConfig.defaultWidth,
            height: request.height ?? viewportConfig.defaultHeight,
            format: request.format ?? screenshotConfig.defaultFormat,
            quality: request.quality ?? screenshotConfig.defaultQuality,
            waitForNetworkIdle: request.waitForNetworkIdle ?? screenshotConfig.defaultWaitForNetworkIdle,
            timeout: request.timeout ?? screenshotConfig.defaultTimeout
          };

          // Only add userAgent if one is provided
          const userAgent = request.userAgent ?? config.getBrowserConfig().userAgent;
          const options = userAgent ? { ...baseOptions, userAgent } : baseOptions;

          // Add selector if provided
          const finalOptions = request.selector ? { ...options, selector: request.selector } : options;

          // Take screenshot using appropriate method
          let result;
          if (request.selector) {
            result = await this.screenshotService.takeElementScreenshot(finalOptions);
          } else if (request.fullPage) {
            result = await this.screenshotService.takeFullPageScreenshot(finalOptions);
          } else {
            result = await this.screenshotService.takeScreenshot(finalOptions);
          }

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
                      width: finalOptions.width,
                      height: finalOptions.height
                    },
                    configuration: {
                      retryCount: config.getBrowserConfig().retryCount,
                      userAgent: ('userAgent' in finalOptions ? finalOptions.userAgent : undefined) || 'default'
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
      await this.screenshotService.initialize();

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
    await this.screenshotService.initialize();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.screenshotService.cleanup();
    } catch (error) {
      // Silent cleanup - don't interfere with stdio
    }
  }
}

// Export a singleton instance
export const mcpServer = new McpScreenshotServer();
