import { chromium, type Browser, type Page } from 'playwright';
import type { ScreenshotOptions, ScreenshotResult, ScreenshotServiceConfig, RetryAttempt } from './types.js';

export class ScreenshotService {
  private browser: Browser | null = null;
  private isInitialized = false;
  private serviceConfig: ScreenshotServiceConfig;

  constructor(config: ScreenshotServiceConfig) {
    this.serviceConfig = config;
  }

  /**
   * Initialize the browser instance
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.isInitialized = true;
  }

  /**
   * Take a screenshot of the specified URL with retry logic
   */
  async takeScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
    return await this.executeWithRetry(async () => {
      await this.ensureInitialized();

      const config = this.createScreenshotConfig(options);
      const page = await this.createPage(config);

      try {
        await this.navigateToUrl(page, config);
        const screenshotBuffer = await this.captureScreenshot(page, config, false);
        return this.createResult(screenshotBuffer, config);
      } finally {
        await this.closePage(page);
      }
    });
  }

  /**
   * Take a full page screenshot with retry logic
   */
  async takeFullPageScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
    return await this.executeWithRetry(async () => {
      await this.ensureInitialized();

      const config = this.createScreenshotConfig(options);
      const page = await this.createPage(config);

      try {
        await this.navigateToUrl(page, config);
        const pageSize = await this.getPageDimensions(page);
        const screenshotBuffer = await this.captureScreenshot(page, config, true);
        return this.createResult(screenshotBuffer, config, pageSize);
      } finally {
        await this.closePage(page);
      }
    });
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return this.isInitialized && this.browser !== null;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.browser) {
      await this.initialize();
    }
  }

  private createScreenshotConfig(options: ScreenshotOptions) {
    return {
      url: options.url,
      width: options.width ?? this.serviceConfig.viewport.defaultWidth,
      height: options.height ?? this.serviceConfig.viewport.defaultHeight,
      format: options.format ?? this.serviceConfig.screenshot.defaultFormat,
      quality: options.quality ?? this.serviceConfig.screenshot.defaultQuality,
      waitForNetworkIdle: options.waitForNetworkIdle ?? this.serviceConfig.screenshot.defaultWaitForNetworkIdle,
      timeout: options.timeout ?? this.serviceConfig.screenshot.defaultTimeout,
      userAgent: options.userAgent ?? this.serviceConfig.browser.userAgent
    };
  }

  private async createPage(config: ReturnType<typeof this.createScreenshotConfig>): Promise<Page> {
    const pageOptions = config.userAgent ? { userAgent: config.userAgent } : {};
    const page = await this.browser!.newPage(pageOptions);
    await page.setViewportSize({ width: config.width, height: config.height });

    page.setDefaultTimeout(config.timeout);
    return page;
  }

  private async navigateToUrl(page: Page, config: ReturnType<typeof this.createScreenshotConfig>): Promise<void> {
    await page.goto(config.url, {
      waitUntil: config.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
      timeout: config.timeout
    });
  }

  private async captureScreenshot(
    page: Page,
    config: ReturnType<typeof this.createScreenshotConfig>,
    fullPage: boolean
  ): Promise<Buffer> {
    const playwrightFormat = config.format === 'webp' ? 'png' : config.format;
    const screenshotOptions = {
      type: playwrightFormat as 'png',
      fullPage
    };

    return await page.screenshot(screenshotOptions);
  }

  private async getPageDimensions(page: Page): Promise<{ width: number; height: number }> {
    return await page.evaluate(() => ({
      width: (globalThis as any).document.documentElement.scrollWidth,
      height: (globalThis as any).document.documentElement.scrollHeight
    }));
  }

  private createResult(
    screenshotBuffer: Buffer,
    config: ReturnType<typeof this.createScreenshotConfig>,
    pageSize?: { width: number; height: number }
  ): ScreenshotResult {
    const base64Data = screenshotBuffer.toString('base64');
    const mimeType = config.format === 'webp' ? 'image/webp' : `image/${config.format}`;

    return {
      data: base64Data,
      mimeType,
      width: pageSize?.width ?? config.width,
      height: pageSize?.height ?? config.height,
      timestamp: Date.now()
    };
  }

  private async closePage(page: Page): Promise<void> {
    try {
      await page.close();
    } catch (error) {
      // Silent cleanup - don't interfere with stdio
    }
  }

  /**
   * Execute a function with retry logic
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxAttempts = this.serviceConfig.browser.retryCount + 1; // +1 for initial attempt

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;

        if (isLastAttempt) {
          throw error;
        }

        // Create retry attempt info for potential logging
        const retryInfo: RetryAttempt = {
          attempt,
          maxAttempts,
          error: error instanceof Error ? error : new Error(String(error)),
          delay: this.serviceConfig.browser.retryDelay
        };

        // Log retry attempt (only if not in test environment)
        if (process.env.NODE_ENV !== 'test') {
          // Silent logging - don't interfere with stdio in production
        }

        // Wait before retry
        await this.delay(retryInfo.delay);

        // Reset browser if it might be in a bad state
        if (this.isErrorRecoverable(error)) {
          await this.resetBrowser();
        }
      }
    }

    throw new Error('Retry logic failed - should not reach here');
  }

  /**
   * Check if an error is recoverable and browser should be reset
   */
  private isErrorRecoverable(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const recoverableErrors = [
      'browser has been closed',
      'browser disconnected',
      'target closed',
      'page crashed',
      'navigation failed'
    ];

    return recoverableErrors.some(msg =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Reset browser instance for error recovery
   */
  private async resetBrowser(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
      }
    } catch {
      // Ignore errors during cleanup
    }

    this.browser = null;
    this.isInitialized = false;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
