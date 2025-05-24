import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { CookieUtils } from './cookie-utils.js';
import type { Cookie } from './types.js';

/**
 * Configuration schema for the browser loop service
 */
const ConfigSchema = z.object({
  viewport: z.object({
    defaultWidth: z.number().min(200).max(4000),
    defaultHeight: z.number().min(200).max(4000)
  }),
  screenshot: z.object({
    defaultFormat: z.enum(['webp', 'png', 'jpeg']),
    defaultQuality: z.number().min(0).max(100),
    defaultTimeout: z.number().min(1000).max(120000),
    defaultWaitForNetworkIdle: z.boolean()
  }),
  browser: z.object({
    userAgent: z.string().optional(),
    retryCount: z.number().min(0).max(10),
    retryDelay: z.number().min(100).max(10000)
  }),
  authentication: z.object({
    defaultCookies: z.array(z.object({
      name: z.string(),
      value: z.string(),
      domain: z.string().optional(),
      path: z.string().optional(),
      httpOnly: z.boolean().optional(),
      secure: z.boolean().optional(),
      expires: z.number().optional(),
      sameSite: z.enum(['Strict', 'Lax', 'None']).optional()
    }))
  }),
  logging: z.object({
    debug: z.boolean(),
    logFile: z.string().optional(),
    enableMetrics: z.boolean(),
    silent: z.boolean()
  }),
  timeouts: z.object({
    browserInit: z.number().min(5000).max(60000),
    navigation: z.number().min(1000).max(120000),
    elementWait: z.number().min(100).max(30000),
    screenshot: z.number().min(1000).max(60000),
    network: z.number().min(1000).max(30000)
  })
});

export type BrowserloopConfig = z.infer<typeof ConfigSchema>;

/**
 * Configuration manager that loads settings from environment variables
 */
export class ConfigManager {
  private config: BrowserloopConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get the complete configuration
   */
  getConfig(): BrowserloopConfig {
    return this.config;
  }

  /**
   * Get viewport configuration
   */
  getViewportConfig() {
    return this.config.viewport;
  }

  /**
   * Get screenshot configuration
   */
  getScreenshotConfig() {
    return this.config.screenshot;
  }

  /**
   * Get browser configuration
   */
  getBrowserConfig() {
    return this.config.browser;
  }

  /**
   * Get authentication configuration
   */
  getAuthenticationConfig() {
    return this.config.authentication;
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig() {
    return this.config.logging;
  }

  /**
   * Get timeout configuration
   */
  getTimeoutConfig() {
    return this.config.timeouts;
  }

  private loadConfig(): BrowserloopConfig {
    const envConfig = {
      viewport: {
        defaultWidth: this.parseNumber('BROWSERLOOP_DEFAULT_WIDTH', 1280),
        defaultHeight: this.parseNumber('BROWSERLOOP_DEFAULT_HEIGHT', 720)
      },
      screenshot: {
        defaultFormat: this.parseEnum('BROWSERLOOP_DEFAULT_FORMAT', ['webp', 'png', 'jpeg'], 'webp'),
        defaultQuality: this.parseNumber('BROWSERLOOP_DEFAULT_QUALITY', 80),
        defaultTimeout: this.parseNumber('BROWSERLOOP_DEFAULT_TIMEOUT', 30000),
        defaultWaitForNetworkIdle: this.parseBoolean('BROWSERLOOP_DEFAULT_WAIT_NETWORK_IDLE', true)
      },
      browser: {
        ...(process.env.BROWSERLOOP_USER_AGENT && { userAgent: process.env.BROWSERLOOP_USER_AGENT }),
        retryCount: this.parseNumber('BROWSERLOOP_RETRY_COUNT', 3),
        retryDelay: this.parseNumber('BROWSERLOOP_RETRY_DELAY', 1000)
      },
      authentication: {
        defaultCookies: this.parseDefaultCookies('BROWSERLOOP_DEFAULT_COOKIES')
      },
      logging: {
        debug: this.parseBoolean('BROWSERLOOP_DEBUG', false),
        ...(process.env.BROWSERLOOP_LOG_FILE && { logFile: process.env.BROWSERLOOP_LOG_FILE }),
        enableMetrics: this.parseBoolean('BROWSERLOOP_ENABLE_METRICS', true),
        silent: this.parseBoolean('BROWSERLOOP_SILENT', true)
      },
      timeouts: {
        browserInit: this.parseNumber('BROWSERLOOP_TIMEOUT_BROWSER_INIT', 30000),
        navigation: this.parseNumber('BROWSERLOOP_TIMEOUT_NAVIGATION', 30000),
        elementWait: this.parseNumber('BROWSERLOOP_TIMEOUT_ELEMENT_WAIT', 5000),
        screenshot: this.parseNumber('BROWSERLOOP_TIMEOUT_SCREENSHOT', 10000),
        network: this.parseNumber('BROWSERLOOP_TIMEOUT_NETWORK', 5000)
      }
    };

    try {
      return ConfigSchema.parse(envConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        throw new Error(`Configuration validation failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  private parseNumber(envVar: string, defaultValue: number): number {
    const value = process.env[envVar];
    if (!value) return defaultValue;

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  private parseBoolean(envVar: string, defaultValue: boolean): boolean {
    const value = process.env[envVar];
    if (!value) return defaultValue;

    return value.toLowerCase() === 'true';
  }

  private parseEnum<T extends string>(envVar: string, validValues: readonly T[], defaultValue: T): T {
    const value = process.env[envVar] as T;
    if (!value) return defaultValue;

    return validValues.includes(value) ? value : defaultValue;
  }

  private parseDefaultCookies(envVar: string): Cookie[] {
    const value = process.env[envVar];
    if (!value) {
      if (this.parseBoolean('BROWSERLOOP_DEBUG', false) && !this.parseBoolean('BROWSERLOOP_SILENT', true)) {
        console.debug('No default cookies configured');
      }
      return [];
    }

    try {
      let cookies: Cookie[] = [];
      let source: string = '';

      // Check if value looks like a file path (starts with / or contains file extension)
      if (value.startsWith('/') || value.includes('.json')) {
        // Treat as file path - read the file
        try {
          const fileContent = readFileSync(value, 'utf-8');
          cookies = CookieUtils.parseCookies(fileContent);
          source = `file: ${value}`;

          if (this.parseBoolean('BROWSERLOOP_DEBUG', false) && !this.parseBoolean('BROWSERLOOP_SILENT', true)) {
            console.debug(`Loaded ${cookies.length} default cookies from ${source}`);
            console.debug(`Cookie names: ${cookies.map(c => c.name).join(', ')}`);
          }
        } catch (fileError) {
          if (!this.parseBoolean('BROWSERLOOP_SILENT', true)) {
            console.warn(`Warning: Failed to read cookie file ${value}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}. Using no default cookies.`);
          }
          return [];
        }
      } else {
        // Treat as JSON string (backward compatibility)
        cookies = CookieUtils.parseCookies(value);
        source = 'environment variable JSON';

        if (this.parseBoolean('BROWSERLOOP_DEBUG', false) && !this.parseBoolean('BROWSERLOOP_SILENT', true)) {
          console.debug(`Loaded ${cookies.length} default cookies from ${source}`);
          console.debug(`Cookie names: ${cookies.map(c => c.name).join(', ')}`);
        }
      }

      return cookies;
    } catch (error) {
      // Log warning but don't fail configuration loading
      if (!this.parseBoolean('BROWSERLOOP_SILENT', true)) {
        console.warn(`Warning: Failed to parse ${envVar}: ${error instanceof Error ? error.message : 'Unknown error'}. Using no default cookies.`);
      }
      return [];
    }
  }
}

// Export singleton instance
export const config = new ConfigManager();
