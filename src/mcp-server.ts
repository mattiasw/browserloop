/*
 * This file is part of BrowserLoop.
 *
 * BrowserLoop is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * BrowserLoop is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with BrowserLoop. If not, see <https://www.gnu.org/licenses/>.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { config } from './config.js';
import { ConsoleLogService } from './console-service.js';
import { validateAndSanitize } from './cookie-utils.js';
import { fileLogger } from './file-logger.js';
import { getPackageInfo } from './package-info.js';
import { ScreenshotService } from './screenshot-service.js';
import type {
  ConsoleLogOptions,
  ConsoleLogResult,
  ConsoleLogServiceConfig,
  Cookie,
  ScreenshotOptions,
  ScreenshotResult,
  ScreenshotServiceConfig,
} from './types.js';

// Extended screenshot options that include all possible MCP properties
interface McpScreenshotOptions extends ScreenshotOptions {
  fullPage?: boolean;
  cookies?: Cookie[];
}

export class McpScreenshotServer {
  private server: McpServer;
  private screenshotService: ScreenshotService;
  private consoleLogService: ConsoleLogService;

  constructor() {
    // Log startup information to file
    fileLogger.debug('[MCP-Server] Starting BrowserLoop MCP Server...');
    fileLogger.debug('[MCP-Server] Environment variables:');
    fileLogger.debug(
      `[MCP-Server]   BROWSERLOOP_DEFAULT_COOKIES = "${process.env.BROWSERLOOP_DEFAULT_COOKIES}"`
    );
    fileLogger.debug(
      `[MCP-Server]   BROWSERLOOP_DEBUG = "${process.env.BROWSERLOOP_DEBUG}"`
    );
    fileLogger.debug(
      `[MCP-Server]   BROWSERLOOP_SILENT = "${process.env.BROWSERLOOP_SILENT}"`
    );
    fileLogger.debug(
      `[MCP-Server]   BROWSERLOOP_DISABLE_FILE_WATCHING = "${process.env.BROWSERLOOP_DISABLE_FILE_WATCHING}"`
    );
    fileLogger.debug(`[MCP-Server]   Working directory = "${process.cwd()}"`);

    // Create the MCP server instance with proper capabilities
    const packageInfo = getPackageInfo();
    this.server = new McpServer(
      {
        name: 'browserloop',
        version: packageInfo.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Create screenshot service with configuration
    this.screenshotService = new ScreenshotService(
      config.getConfig() as ScreenshotServiceConfig
    );

    // Create console log service with configuration
    this.consoleLogService = new ConsoleLogService(
      config.getConfig() as ConsoleLogServiceConfig
    );

    // Log configuration after creation
    const authConfig = config.getAuthenticationConfig();
    const watcherStatus = config.getFileWatcherStatus();
    fileLogger.debug('[MCP-Server] Configuration loaded:');
    fileLogger.debug(
      `[MCP-Server]   Default cookies count = ${authConfig.defaultCookies.length}`
    );
    fileLogger.debug(
      `[MCP-Server]   File watching enabled = ${watcherStatus.enabled}`
    );
    fileLogger.debug(
      `[MCP-Server]   Active watchers = ${watcherStatus.activeWatchers.length}`
    );

    this.setupScreenshotTool();
    this.setupConsoleLogTool();
  }

  private setupScreenshotTool(): void {
    const _browserConfig = config.getBrowserConfig();
    const viewportConfig = config.getViewportConfig();
    const screenshotConfig = config.getScreenshotConfig();

    // Parameter limits (keep existing validation)
    const PARAMETER_LIMITS = {
      WIDTH: { MIN: 200, MAX: 4000 },
      HEIGHT: { MIN: 200, MAX: 4000 },
      QUALITY: { MIN: 1, MAX: 100 },
      TIMEOUT: { MIN: 1000, MAX: 120000 },
    };

    // Cookie validation schema
    const CookieObjectSchema = z.object({
      name: z.string().min(1),
      value: z.string(),
      domain: z.string().optional(),
      path: z.string().optional(),
      httpOnly: z.boolean().optional(),
      secure: z.boolean().optional(),
      expires: z.number().optional(),
      sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
    });

    const CookiesSchema = z
      .union([z.array(CookieObjectSchema), z.string().min(1)])
      .optional();

    // Register the screenshot tool
    this.server.tool(
      'screenshot',
      {
        url: z.string().url('Invalid URL format'),
        width: z
          .number()
          .min(
            PARAMETER_LIMITS.WIDTH.MIN,
            `Width must be at least ${PARAMETER_LIMITS.WIDTH.MIN}`
          )
          .max(
            PARAMETER_LIMITS.WIDTH.MAX,
            `Width must be at most ${PARAMETER_LIMITS.WIDTH.MAX}`
          )
          .optional(),
        height: z
          .number()
          .min(
            PARAMETER_LIMITS.HEIGHT.MIN,
            `Height must be at least ${PARAMETER_LIMITS.HEIGHT.MIN}`
          )
          .max(
            PARAMETER_LIMITS.HEIGHT.MAX,
            `Height must be at most ${PARAMETER_LIMITS.HEIGHT.MAX}`
          )
          .optional(),
        format: z.enum(['webp', 'png', 'jpeg']).optional(),
        quality: z
          .number()
          .min(
            PARAMETER_LIMITS.QUALITY.MIN,
            `Quality must be at least ${PARAMETER_LIMITS.QUALITY.MIN}`
          )
          .max(
            PARAMETER_LIMITS.QUALITY.MAX,
            `Quality must be at most ${PARAMETER_LIMITS.QUALITY.MAX}`
          )
          .optional(),
        waitForNetworkIdle: z.boolean().optional(),
        timeout: z
          .number()
          .min(
            PARAMETER_LIMITS.TIMEOUT.MIN,
            `Timeout must be at least ${PARAMETER_LIMITS.TIMEOUT.MIN}ms`
          )
          .max(
            PARAMETER_LIMITS.TIMEOUT.MAX,
            `Timeout must be at most ${PARAMETER_LIMITS.TIMEOUT.MAX}ms`
          )
          .optional(),
        fullPage: z.boolean().optional(),
        userAgent: z.string().optional(),
        selector: z.string().optional(),
        cookies: CookiesSchema,
      },
      async (request, extra) => {
        const _requestId = extra.requestId || 'unknown';
        try {
          // Set defaults from configuration
          const baseOptions = {
            url: request.url,
            width: request.width ?? viewportConfig.defaultWidth,
            height: request.height ?? viewportConfig.defaultHeight,
            format: request.format ?? screenshotConfig.defaultFormat,
            quality: request.quality ?? screenshotConfig.defaultQuality,
            waitForNetworkIdle:
              request.waitForNetworkIdle ??
              screenshotConfig.defaultWaitForNetworkIdle,
            timeout: request.timeout ?? screenshotConfig.defaultTimeout,
          };

          // Only add userAgent if one is provided
          const userAgent =
            request.userAgent ?? config.getBrowserConfig().userAgent;
          const options = userAgent
            ? { ...baseOptions, userAgent }
            : baseOptions;

          // Build final options with all possible properties
          const finalOptions: McpScreenshotOptions = { ...options };

          // Add selector if provided
          if (request.selector) {
            finalOptions.selector = request.selector;
          }

          // Add cookies if provided
          if (request.cookies) {
            try {
              const { cookies } = validateAndSanitize(request.cookies);
              finalOptions.cookies = cookies;
            } catch (cookieError) {
              const cookieErrorMessage =
                cookieError instanceof Error
                  ? cookieError.message
                  : 'Cookie validation failed';
              return {
                content: [
                  {
                    type: 'text',
                    text: `Cookie validation failed: ${cookieErrorMessage}`,
                  },
                ],
                isError: true,
              };
            }
          }

          // Take screenshot using appropriate method
          let result: ScreenshotResult;
          if (request.selector) {
            result =
              await this.screenshotService.takeElementScreenshot(finalOptions);
          } else if (request.fullPage) {
            result =
              await this.screenshotService.takeFullPageScreenshot(finalOptions);
          } else {
            result = await this.screenshotService.takeScreenshot(finalOptions);
          }

          // Format response for MCP
          return {
            content: [
              {
                type: 'image',
                data: result.data,
                mimeType: result.mimeType,
              },
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    metadata: {
                      width: result.width,
                      height: result.height,
                      timestamp: result.timestamp,
                      url: request.url,
                      viewport: {
                        width: finalOptions.width,
                        height: finalOptions.height,
                      },
                      configuration: {
                        retryCount: config.getBrowserConfig().retryCount,
                        userAgent:
                          ('userAgent' in finalOptions
                            ? finalOptions.userAgent
                            : undefined) || 'default',
                      },
                    },
                  },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          return {
            content: [
              {
                type: 'text',
                text: `Screenshot capture failed: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  private setupConsoleLogTool(): void {
    const consoleConfig = config.getConsoleConfig();
    const browserConfig = config.getBrowserConfig();

    // Parameter limits
    const PARAMETER_LIMITS = {
      TIMEOUT: { MIN: 1000, MAX: 120000 },
    };

    // Cookie validation schema (same as screenshot tool)
    const CookieObjectSchema = z.object({
      name: z.string().min(1),
      value: z.string(),
      domain: z.string().optional(),
      path: z.string().optional(),
      httpOnly: z.boolean().optional(),
      secure: z.boolean().optional(),
      expires: z.number().optional(),
      sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
    });

    const CookiesSchema = z
      .union([z.array(CookieObjectSchema), z.string().min(1)])
      .optional();

    // Register the console log reading tool
    this.server.tool(
      'read_console',
      {
        url: z.string().url('Invalid URL format'),
        timeout: z
          .number()
          .min(
            PARAMETER_LIMITS.TIMEOUT.MIN,
            `Timeout must be at least ${PARAMETER_LIMITS.TIMEOUT.MIN}ms`
          )
          .max(
            PARAMETER_LIMITS.TIMEOUT.MAX,
            `Timeout must be at most ${PARAMETER_LIMITS.TIMEOUT.MAX}ms`
          )
          .optional(),
        sanitize: z.boolean().optional(),
        waitForNetworkIdle: z.boolean().optional(),
        userAgent: z.string().optional(),
        logLevels: z
          .array(z.enum(['log', 'info', 'warn', 'error', 'debug']))
          .optional(),
        cookies: CookiesSchema,
      },
      async (request, extra) => {
        const _requestId = extra.requestId || 'unknown';
        try {
          // Set defaults from configuration
          const baseOptions = {
            url: request.url,
            timeout: request.timeout ?? consoleConfig.defaultTimeout,
            sanitize: request.sanitize ?? consoleConfig.defaultSanitize,
            waitForNetworkIdle:
              request.waitForNetworkIdle ??
              consoleConfig.defaultWaitForNetworkIdle,
            logLevels: request.logLevels ?? consoleConfig.defaultLogLevels,
          };

          // Only add userAgent if one is provided
          const userAgent = request.userAgent ?? browserConfig.userAgent;
          const options: ConsoleLogOptions = userAgent
            ? { ...baseOptions, userAgent }
            : baseOptions;

          // Add cookies if provided
          if (request.cookies) {
            try {
              const { cookies } = validateAndSanitize(request.cookies);
              options.cookies = cookies;
            } catch (cookieError) {
              const cookieErrorMessage =
                cookieError instanceof Error
                  ? cookieError.message
                  : 'Cookie validation failed';
              return {
                content: [
                  {
                    type: 'text',
                    text: `Cookie validation failed: ${cookieErrorMessage}`,
                  },
                ],
                isError: true,
              };
            }
          }

          // Read console logs
          const result: ConsoleLogResult =
            await this.consoleLogService.readConsoleLogs(options);

          // Format response for MCP
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    logs: result.logs,
                    metadata: {
                      url: result.url,
                      startTimestamp: result.startTimestamp,
                      endTimestamp: result.endTimestamp,
                      totalLogs: result.totalLogs,
                      configuration: {
                        retryCount: browserConfig.retryCount,
                        sanitize: options.sanitize,
                        logLevels: options.logLevels,
                        userAgent: options.userAgent || 'default',
                      },
                    },
                  },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          return {
            content: [
              {
                type: 'text',
                text: `Console log reading failed: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    await this.screenshotService.initialize();
    await this.consoleLogService.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  /**
   * Initialize the server (for testing)
   */
  async initialize(): Promise<void> {
    await this.screenshotService.initialize();
    await this.consoleLogService.initialize();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.screenshotService.cleanup();
    } catch (_error) {
      // Silent cleanup - don't interfere with stdio
    }

    try {
      await this.consoleLogService.cleanup();
    } catch (_error) {
      // Silent cleanup - don't interfere with stdio
    }

    try {
      config.cleanup();
    } catch (_error) {
      // Silent cleanup - don't interfere with stdio
    }
  }
}

// Export a singleton instance
export const mcpServer = new McpScreenshotServer();
