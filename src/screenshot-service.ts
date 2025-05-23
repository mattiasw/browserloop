import { chromium, type Browser, type Page } from 'playwright';
import type { ScreenshotOptions, ScreenshotResult } from './types.js';

export class ScreenshotService {
  private browser: Browser | null = null;
  private isInitialized = false;

  /**
   * Initialize the browser instance
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.browser = await this.launchBrowser();
      this.isInitialized = true;
      console.log('Screenshot service initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${error}`);
    }
  }

  /**
   * Take a screenshot of the specified URL
   */
  async takeScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
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
  }

  /**
   * Take a full page screenshot
   */
  async takeFullPageScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
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
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
      console.log('Screenshot service cleaned up');
    }
  }

  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return this.isInitialized && this.browser !== null;
  }

  private async launchBrowser(): Promise<Browser> {
    return await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.browser) {
      await this.initialize();
    }
  }

  private createScreenshotConfig(options: ScreenshotOptions) {
    return {
      url: options.url,
      width: options.width ?? 1280,
      height: options.height ?? 720,
      format: options.format ?? 'webp',
      quality: options.quality ?? 80,
      waitForNetworkIdle: options.waitForNetworkIdle ?? true,
      timeout: options.timeout ?? 30000
    };
  }

  private async createPage(config: ReturnType<typeof this.createScreenshotConfig>): Promise<Page> {
    const page = await this.browser!.newPage();
    await page.setViewportSize({ width: config.width, height: config.height });
    page.setDefaultTimeout(config.timeout);
    return page;
  }

  private async navigateToUrl(page: Page, config: ReturnType<typeof this.createScreenshotConfig>): Promise<void> {
    console.log(`Taking screenshot of: ${config.url}`);
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
      console.warn('Error closing page:', error);
    }
  }
}

// Export singleton instance
export const screenshotService = new ScreenshotService();
