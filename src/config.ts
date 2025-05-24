import { z } from 'zod';

/**
 * Configuration schema for environment variables
 */
const ConfigSchema = z.object({
  viewport: z.object({
    defaultWidth: z.number().min(200).max(4000).default(1280),
    defaultHeight: z.number().min(200).max(4000).default(720)
  }),
  screenshot: z.object({
    defaultFormat: z.enum(['webp', 'png', 'jpeg']).default('webp'),
    defaultQuality: z.number().min(1).max(100).default(80),
    defaultTimeout: z.number().min(1000).max(120000).default(30000),
    defaultWaitForNetworkIdle: z.boolean().default(true)
  }),
  browser: z.object({
    userAgent: z.string().optional(),
    retryCount: z.number().min(0).max(10).default(3),
    retryDelay: z.number().min(100).max(10000).default(1000)
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
   * Get the current configuration
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
    const value = process.env[envVar]?.toLowerCase();
    if (!value) return defaultValue;

    return value === 'true' || value === '1' || value === 'yes';
  }

  private parseEnum<T extends string>(
    envVar: string,
    validValues: readonly T[],
    defaultValue: T
  ): T {
    const value = process.env[envVar] as T;
    if (!value) return defaultValue;

    return validValues.includes(value) ? value : defaultValue;
  }
}

// Export singleton instance
export const config = new ConfigManager();
