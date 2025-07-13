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

import {
  type Browser,
  chromium,
  type Locator,
  type Page,
  type Cookie as PlaywrightCookie,
} from 'playwright';
import { config } from './config.js';
import {
  filterCookiesByDomain,
  parseCookies,
  validateAndSanitize,
  validateCookieSecurity,
} from './cookie-utils.js';
import {
  convertImage,
  getMimeType,
  needsConversion,
} from './image-processor.js';
import { categorizeError, Logger } from './logger.js';
import type {
  BrowserloopError,
  Cookie,
  HealthCheck,
  InternalScreenshotConfig,
  RetryAttempt,
  ScreenshotOptions,
  ScreenshotResult,
  ScreenshotServiceConfig,
} from './types.js';

export class ScreenshotService {
  private browser: Browser | null = null;
  private isInitialized = false;
  private serviceConfig: ScreenshotServiceConfig;
  private logger: Logger;
  private lastSuccessfulOperation?: number;
  private initializationInProgress = false;
  private pagePool: Page[] = [];
  private maxPoolSize = 3;
  private activePages = new Set<Page>();

  constructor(config: ScreenshotServiceConfig) {
    this.serviceConfig = config;
    this.logger = new Logger(config.logging);
  }

  /**
   * Initialize the browser instance with timeout handling
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationInProgress) {
      // Wait for ongoing initialization
      while (this.initializationInProgress && !this.isInitialized) {
        await this.delay(100);
      }
      return;
    }

    this.initializationInProgress = true;
    this.logger.debug('Initializing browser', {
      timeout: this.serviceConfig.timeouts.browserInit,
    });

    try {
      const initTimeout = setTimeout(() => {
        throw new Error(
          `Browser initialization timeout after ${this.serviceConfig.timeouts.browserInit}ms`
        );
      }, this.serviceConfig.timeouts.browserInit);

      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: this.serviceConfig.timeouts.browserInit,
      });

      clearTimeout(initTimeout);
      this.isInitialized = true;
      this.logger.info('Browser initialized successfully');
    } catch (error) {
      const categorizedError = categorizeError(error as Error);
      this.logger.error('Browser initialization failed', categorizedError);
      throw error;
    } finally {
      this.initializationInProgress = false;
    }
  }

  /**
   * Take a screenshot of the specified URL with enhanced error handling
   */
  async takeScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
    return await this.executeWithRetry(async () => {
      await this.ensureInitialized();

      const config = this.createScreenshotConfig(options);
      const page = await this.getPage(config);

      try {
        await this.navigateToUrl(page, config);
        const screenshotBuffer = await this.captureScreenshot(
          page,
          config,
          false
        );
        const result = this.createResult(screenshotBuffer, config);

        this.lastSuccessfulOperation = Date.now();
        this.logger.debug('Screenshot captured successfully', {
          url: options.url,
          format: config.format,
          size: screenshotBuffer.length,
        });

        return result;
      } finally {
        await this.returnPage(page);
      }
    }, options.url);
  }

  /**
   * Take a full page screenshot with enhanced error handling
   */
  async takeFullPageScreenshot(
    options: ScreenshotOptions
  ): Promise<ScreenshotResult> {
    return await this.executeWithRetry(async () => {
      await this.ensureInitialized();

      const config = this.createScreenshotConfig(options);
      const page = await this.getPage(config);

      try {
        await this.navigateToUrl(page, config);
        const pageSize = await this.getPageDimensions(page);
        const screenshotBuffer = await this.captureScreenshot(
          page,
          config,
          true
        );
        const result = this.createResult(screenshotBuffer, config, pageSize);

        this.lastSuccessfulOperation = Date.now();
        this.logger.debug('Full page screenshot captured successfully', {
          url: options.url,
          format: config.format,
          pageSize,
          size: screenshotBuffer.length,
        });

        return result;
      } finally {
        await this.returnPage(page);
      }
    }, options.url);
  }

  /**
   * Take a screenshot of a specific element with enhanced error handling
   */
  async takeElementScreenshot(
    options: ScreenshotOptions
  ): Promise<ScreenshotResult> {
    if (!options.selector) {
      throw new Error('Selector is required for element screenshots');
    }

    return await this.executeWithRetry(async () => {
      await this.ensureInitialized();

      const config = this.createScreenshotConfig(options);
      const page = await this.getPage(config);

      try {
        await this.navigateToUrl(page, config);
        const element = await this.findElement(
          page,
          options.selector as string
        );
        const screenshotBuffer = await this.captureElementScreenshot(
          page,
          element,
          config
        );
        const elementSize = await this.getElementDimensions(element);
        const result = this.createResult(screenshotBuffer, config, elementSize);

        this.lastSuccessfulOperation = Date.now();
        this.logger.debug('Element screenshot captured successfully', {
          url: options.url,
          selector: options.selector,
          format: config.format,
          elementSize,
          size: screenshotBuffer.length,
        });

        return result;
      } finally {
        await this.returnPage(page);
      }
    }, options.url);
  }

  /**
   * Get health status of the service
   */
  getHealthCheck(): HealthCheck {
    const metrics = this.logger.getMetrics();
    const memoryUsage = process.memoryUsage();

    return {
      healthy:
        this.isInitialized &&
        this.browser !== null &&
        !this.initializationInProgress,
      browser: {
        initialized: this.isInitialized,
        connected: this.browser?.isConnected() ?? false,
        ...(metrics.lastError?.message && {
          lastError: metrics.lastError.message,
        }),
      },
      resources: {
        memoryUsage: memoryUsage.heapUsed,
        uptime: this.logger.getUptime(),
      },
      ...(this.lastSuccessfulOperation && {
        lastSuccessfulOperation: this.lastSuccessfulOperation,
      }),
      recentErrorCount: metrics.lastHourErrors,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up browser resources');

    // Close all pages in pool
    await Promise.all([
      ...this.pagePool.map((page) => this.safeClosePage(page)),
      ...Array.from(this.activePages).map((page) => this.safeClosePage(page)),
    ]);

    this.pagePool = [];
    this.activePages.clear();

    if (this.browser) {
      try {
        await this.browser.close();
        this.logger.debug('Browser closed successfully');
      } catch (error) {
        this.logger.warn('Error during browser cleanup', {
          error: (error as Error).message,
        });
      }
      this.browser = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return (
      this.isInitialized &&
      this.browser !== null &&
      !this.initializationInProgress
    );
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.browser || !this.browser.isConnected()) {
      this.logger.debug('Re-initializing browser due to disconnection');
      await this.initialize();
    }
  }

  private createScreenshotConfig(
    options: ScreenshotOptions
  ): InternalScreenshotConfig {
    // Get fresh authentication config to ensure we use the latest default cookies
    const authConfig = config.getAuthenticationConfig();

    // Use fresh file-watched config when available, otherwise fall back to service-specific config
    // This ensures both production (file-watched) and test (service-specific) scenarios work
    const defaultCookies =
      authConfig.defaultCookies.length > 0
        ? authConfig.defaultCookies
        : this.serviceConfig.authentication?.defaultCookies || [];

    // Merge default cookies with request cookies
    const mergedCookies = this.mergeCookies(defaultCookies, options.cookies);

    const result: InternalScreenshotConfig = {
      url: options.url,
      width: options.width ?? this.serviceConfig.viewport.defaultWidth,
      height: options.height ?? this.serviceConfig.viewport.defaultHeight,
      format: options.format ?? this.serviceConfig.screenshot.defaultFormat,
      quality: options.quality ?? this.serviceConfig.screenshot.defaultQuality,
      waitForNetworkIdle:
        options.waitForNetworkIdle ??
        this.serviceConfig.screenshot.defaultWaitForNetworkIdle,
      timeout: options.timeout ?? this.serviceConfig.screenshot.defaultTimeout,
      cookies: mergedCookies,
    };

    // Add userAgent only if it exists
    const userAgent = options.userAgent ?? this.serviceConfig.browser.userAgent;
    if (userAgent) {
      result.userAgent = userAgent;
    }

    // Add selector only if it exists
    if (options.selector) {
      result.selector = options.selector;
    }

    return result;
  }

  /**
   * Merge default cookies with request cookies
   * Request cookies take priority over default cookies with the same name
   */
  private mergeCookies(
    defaultCookies: Cookie[],
    requestCookies?: Cookie[] | string
  ): Cookie[] | string | undefined {
    // Log debug information about cookie merging
    if (this.serviceConfig.logging.debug) {
      this.logger.debug('Cookie merging process', {
        defaultCookieCount: defaultCookies?.length || 0,
        defaultCookieNames: defaultCookies?.map((c) => c.name) || [],
        hasRequestCookies: !!requestCookies,
        requestCookiesType: typeof requestCookies,
        note: 'Using fresh config data from ConfigManager',
      });
    }

    // If no default cookies and no request cookies, return undefined
    if ((!defaultCookies || defaultCookies.length === 0) && !requestCookies) {
      this.logger.debug('No cookies to merge - using no cookies');
      return undefined;
    }

    // If no default cookies, return request cookies as-is
    if (!defaultCookies || defaultCookies.length === 0) {
      this.logger.debug('No default cookies - using request cookies only');
      return requestCookies;
    }

    // If no request cookies, return default cookies
    if (!requestCookies) {
      this.logger.debug('No request cookies - using default cookies only', {
        defaultCookieCount: defaultCookies.length,
        defaultCookieNames: defaultCookies.map((c) => c.name),
      });
      return defaultCookies;
    }

    try {
      // Parse request cookies if they're a string
      const parsedRequestCookies =
        typeof requestCookies === 'string'
          ? parseCookies(requestCookies)
          : requestCookies;

      // Create a map of request cookies by name for fast lookup
      const requestCookieMap = new Map<string, Cookie>();
      for (const cookie of parsedRequestCookies) {
        requestCookieMap.set(cookie.name, cookie);
      }

      // Start with default cookies and override with request cookies
      const mergedCookies: Cookie[] = [];
      const overriddenCookies: string[] = [];
      const addedDefaultCookies: string[] = [];

      // Add default cookies that aren't overridden by request cookies
      for (const defaultCookie of defaultCookies) {
        if (!requestCookieMap.has(defaultCookie.name)) {
          mergedCookies.push(defaultCookie);
          addedDefaultCookies.push(defaultCookie.name);
        } else {
          overriddenCookies.push(defaultCookie.name);
        }
      }

      // Add all request cookies (these take priority)
      for (const requestCookie of parsedRequestCookies) {
        mergedCookies.push(requestCookie);
      }

      // Log the merge results
      if (this.serviceConfig.logging.debug) {
        this.logger.debug('Cookie merge completed', {
          totalMergedCookies: mergedCookies.length,
          addedDefaultCookies,
          overriddenCookies,
          requestCookieNames: parsedRequestCookies.map((c) => c.name),
          finalCookieNames: mergedCookies.map((c) => c.name),
        });
      }

      return mergedCookies;
    } catch (error) {
      // If parsing fails, log warning and return request cookies only
      this.logger.warn('Failed to merge default cookies with request cookies', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackBehavior: 'Using request cookies only',
      });
      return requestCookies;
    }
  }

  private async createPage(
    config: ReturnType<typeof this.createScreenshotConfig>
  ): Promise<Page> {
    const pageOptions = config.userAgent ? { userAgent: config.userAgent } : {};
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    const page = await this.browser.newPage(pageOptions);

    await page.setViewportSize({ width: config.width, height: config.height });
    page.setDefaultTimeout(this.serviceConfig.timeouts.navigation);

    return page;
  }

  private async navigateToUrl(
    page: Page,
    config: ReturnType<typeof this.createScreenshotConfig>
  ): Promise<void> {
    const navigationTimeout = Math.min(
      config.timeout,
      this.serviceConfig.timeouts.navigation
    );

    // Inject cookies before navigation if provided
    if (config.cookies) {
      await this.injectCookies(page, config.cookies, config.url);
    }

    // Debug: Listen for response headers if debug mode is enabled
    if (this.serviceConfig.logging.debug && config.cookies) {
      page.on('response', async (response) => {
        if (response.url() === config.url) {
          const headers = response.headers();
          const setCookieHeaders = headers['set-cookie'];
          if (setCookieHeaders) {
            this.logger.debug(
              'Server sent Set-Cookie headers (might override injected cookies)',
              {
                url: config.url,
                setCookieHeaders: Array.isArray(setCookieHeaders)
                  ? setCookieHeaders
                  : [setCookieHeaders],
                status: response.status(),
              }
            );
          }
        }
      });
    }

    await page.goto(config.url, {
      waitUntil: config.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
      timeout: navigationTimeout,
    });

    // Debug: Dump actual cookies present in browser after navigation
    if (this.serviceConfig.logging.debug && config.cookies) {
      await this.dumpBrowserCookies(page, config.url);
    }
  }

  /**
   * Inject cookies into the browser context before navigation
   */
  private async injectCookies(
    page: Page,
    cookiesInput: Cookie[] | string,
    url: string
  ): Promise<void> {
    let cookies: Cookie[] = [];
    let playwrightCookies: PlaywrightCookie[] = [];

    try {
      // Parse and validate cookies using existing utilities
      const { cookies: parsedCookies, sanitizedForLogging } =
        validateAndSanitize(cookiesInput);
      cookies = parsedCookies;

      if (cookies.length === 0) {
        return;
      }

      // Automatically enhance cookies if they appear to need it
      this.logger.debug('About to enhance cookies if needed', {
        cookieCount: cookies.length,
      });
      try {
        cookies = this.enhanceCookiesIfNeeded(cookies);
      } catch (enhancementError) {
        this.logger.warn('Cookie enhancement failed, using original cookies', {
          error:
            enhancementError instanceof Error
              ? enhancementError.message
              : 'Unknown error',
        });
      }

      // Additional security validation to prevent injection attacks
      validateCookieSecurity(cookies);

      this.logger.debug('Injecting cookies into browser context', {
        url,
        cookieCount: cookies.length,
        cookies: sanitizedForLogging,
        cookieTypes: {
          hostPrefixed: cookies.filter((c) => c.name.startsWith('__Host-'))
            .length,
          securePrefixed: cookies.filter((c) => c.name.startsWith('__Secure-'))
            .length,
          regular: cookies.filter(
            (c) =>
              !c.name.startsWith('__Host-') && !c.name.startsWith('__Secure-')
          ).length,
        },
      });

      // Derive domain from URL if not specified in cookies
      const urlObj = new URL(url);
      const defaultDomain = urlObj.hostname;

      // Filter cookies by domain first (for multi-site cookie files)
      const { matchingCookies, filteredCount } = filterCookiesByDomain(
        cookies,
        url
      );
      cookies = matchingCookies;

      // Log domain filtering results (without exposing cookie values)
      if (filteredCount > 0) {
        this.logger.debug('Filtered cookies due to domain mismatch', {
          url,
          totalCookies: cookies.length + filteredCount,
          matchingCookies: cookies.length,
          filteredCount,
        });
      }

      // If all cookies were filtered out, continue without cookies
      if (cookies.length === 0) {
        this.logger.debug(
          'No cookies remain after domain filtering, continuing without cookies',
          {
            url,
            filteredCount,
          }
        );
        // Continue to check if we have any cookies left after filtering
      }

      // Log filtered cookies for debugging but continue without throwing errors
      if (filteredCount > 0) {
        this.logger.debug('Some cookies were filtered due to domain mismatch', {
          url,
          totalCookies: cookies.length + filteredCount,
          matchingCookies: cookies.length,
          filteredCount,
        });
      }

      // If all cookies were filtered out and no security violation, continue without cookies
      if (cookies.length === 0) {
        return;
      }

      // Convert cookies to Playwright format with proper prefix handling
      playwrightCookies = cookies.map((cookie) => {
        // Handle __Host- prefix requirements (RFC 6265bis)
        if (cookie.name.startsWith('__Host-')) {
          // __Host- cookies MUST:
          // 1. Have secure flag set
          // 2. Have path="/"
          // 3. NOT have a domain attribute (use host-only)
          // 4. Use URL instead of domain/path for Playwright
          const playwrightCookie: PlaywrightCookie & { url?: string } = {
            name: cookie.name,
            value: cookie.value,
            url: url, // Use URL instead of domain for __Host- cookies
            expires: cookie.expires || -1,
            httpOnly: cookie.httpOnly || false,
            secure: true, // __Host- cookies must be secure
            sameSite: cookie.sameSite || 'Lax',
          } as PlaywrightCookie & { url?: string };
          // Note: Do NOT set domain, path, or other fields when using url
          return playwrightCookie as PlaywrightCookie;
        }

        // For all other cookies, use domain/path approach
        const playwrightCookie: PlaywrightCookie = {
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || defaultDomain,
          path: cookie.path || '/',
          expires: cookie.expires || -1,
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure || false,
          sameSite: cookie.sameSite || 'Lax',
        };

        if (cookie.name.startsWith('__Secure-')) {
          // __Secure- cookies MUST:
          // 1. Have secure flag set
          // 2. Can have domain and path as specified
          playwrightCookie.secure = true;
          playwrightCookie.domain = cookie.domain || defaultDomain;
          playwrightCookie.path = cookie.path || '/';
        } else {
          // Regular cookies use the specified or default values
          playwrightCookie.domain = cookie.domain || defaultDomain;
          playwrightCookie.path = cookie.path || '/';
        }

        // Add other optional properties if they are defined
        // Note: For __Host- and __Secure- cookies, we override secure above
        if (cookie.httpOnly !== undefined) {
          playwrightCookie.httpOnly = cookie.httpOnly;
        }
        if (
          cookie.secure !== undefined &&
          !cookie.name.startsWith('__Host-') &&
          !cookie.name.startsWith('__Secure-')
        ) {
          // Only set user-defined secure for non-prefix cookies
          playwrightCookie.secure = cookie.secure;
        }
        if (cookie.expires !== undefined) {
          // Handle float timestamps from browser extensions (e.g., 1750704030.825311)
          playwrightCookie.expires = Math.floor(cookie.expires);
        }
        if (cookie.sameSite !== undefined) {
          playwrightCookie.sameSite = cookie.sameSite;
        }

        return playwrightCookie as PlaywrightCookie;
      });

      // Add all cookies in a single call (Playwright will handle URL vs domain/path internally)
      const context = page.context();
      const cookieTimeout = this.serviceConfig.timeouts.network;

      // Log the exact cookies being sent to Playwright for debugging
      if (this.serviceConfig.logging.debug) {
        this.logger.debug('Playwright cookies being injected', {
          url,
          playwrightCookies: playwrightCookies.map((c) => ({
            name: c.name,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            httpOnly: c.httpOnly,
            sameSite: c.sameSite,
            hasValue: !!c.value,
            valueLength: c.value?.length || 0,
          })),
        });
      }

      await Promise.race([
        context.addCookies(playwrightCookies),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`Cookie injection timeout after ${cookieTimeout}ms`)
              ),
            cookieTimeout
          )
        ),
      ]);

      this.logger.debug('Cookies injected successfully', {
        url,
        cookieCount: playwrightCookies.length,
      });
    } catch (error) {
      // Clear sensitive data from memory before throwing
      this.clearCookieMemory(cookies, playwrightCookies);

      // Categorize cookie-specific errors without exposing cookie values
      let categorizedError: BrowserloopError;
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          categorizedError = categorizeError(error, { url });
        } else if (
          error.message.includes('validation') ||
          error.message.includes('parsing')
        ) {
          categorizedError = categorizeError(error, { url });
        } else {
          categorizedError = categorizeError(error, { url });
        }
      } else {
        categorizedError = categorizeError(
          new Error('Unknown cookie injection error'),
          { url }
        );
      }

      this.logger.error('Cookie injection failed', categorizedError);

      // Sanitize error message to prevent cookie value exposure
      const sanitizedErrorMessage = this.sanitizeErrorMessage(
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw new Error(`Cookie injection failed: ${sanitizedErrorMessage}`);
    } finally {
      // Always clear sensitive data from memory after use
      this.clearCookieMemory(cookies, playwrightCookies);
    }
  }

  /**
   * Automatically enhance cookies with proper security attributes if they appear to need it
   * Respects existing attributes from browser extension exports
   */
  private enhanceCookiesIfNeeded(cookies: Cookie[]): Cookie[] {
    // Check if cookies need enhancement
    const cookieAnalysis = cookies.map((cookie) => ({
      name: cookie.name,
      missingExpires: cookie.expires === undefined,
      missingSecure: cookie.secure === undefined,
      isAuthCookie:
        cookie.name.startsWith('__Host-') ||
        cookie.name.startsWith('__Secure-') ||
        cookie.name.includes('auth') ||
        cookie.name.includes('session'),
      needsEnhancement: false,
    }));

    // Update needs enhancement flag
    for (const analysis of cookieAnalysis) {
      const missingSecurityFlags =
        analysis.missingSecure && analysis.isAuthCookie;
      analysis.needsEnhancement =
        analysis.missingExpires || missingSecurityFlags;
    }

    const needsEnhancement = cookieAnalysis.some(
      (analysis) => analysis.needsEnhancement
    );

    // Log detailed analysis
    this.logger.debug('Cookie enhancement analysis', {
      cookieAnalysis,
      overallNeedsEnhancement: needsEnhancement,
    });

    if (!needsEnhancement) {
      this.logger.debug(
        'Cookies already have proper attributes, no enhancement needed'
      );
      return cookies;
    }

    this.logger.debug(
      'Automatically enhancing cookies with security attributes and expiration dates'
    );

    return cookies.map((cookie) => {
      const enhanced = { ...cookie };

      // Only add expiration date if missing and not a session cookie
      // Respect existing expires values including -1 for session cookies
      if (enhanced.expires === undefined) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        enhanced.expires = Math.floor(expirationDate.getTime() / 1000);
      }

      // Set security attributes based on cookie prefix and type
      // Only set attributes that are undefined - respect existing values
      if (cookie.name.startsWith('__Host-')) {
        if (enhanced.secure === undefined) enhanced.secure = true;
        if (enhanced.httpOnly === undefined) enhanced.httpOnly = true;
        if (enhanced.path === undefined) enhanced.path = '/';
        // __Host- cookies must not have domain - remove it if present
        if (enhanced.domain !== undefined) {
          const { domain: _domain, ...cookieWithoutDomain } = enhanced;
          return cookieWithoutDomain as Cookie;
        }
      } else if (cookie.name.startsWith('__Secure-')) {
        if (enhanced.secure === undefined) enhanced.secure = true;
        if (enhanced.httpOnly === undefined) enhanced.httpOnly = true;
        if (enhanced.path === undefined) enhanced.path = '/';
      } else if (
        cookie.name.includes('auth') ||
        cookie.name.includes('session')
      ) {
        // Authentication cookies
        if (enhanced.secure === undefined) enhanced.secure = true;
        if (enhanced.httpOnly === undefined) enhanced.httpOnly = true;
        if (enhanced.path === undefined) enhanced.path = '/';
      } else if (cookie.name.includes('ajs_')) {
        // Analytics cookies (don't set httpOnly so they can be accessed by JS)
        if (enhanced.secure === undefined) enhanced.secure = true;
        if (enhanced.path === undefined) enhanced.path = '/';
      } else {
        // Other cookies - set secure but be conservative with httpOnly
        if (enhanced.secure === undefined) enhanced.secure = true;
        if (enhanced.path === undefined) enhanced.path = '/';
      }

      // Set SameSite for security if not already set
      if (enhanced.sameSite === undefined) {
        enhanced.sameSite = 'Lax';
      }

      return enhanced;
    });
  }

  /**
   * Validate cookie domains according to RFC 6265 specification
   * Supports parent domain cookies (e.g., .example.com for app.example.com)
   * Skips domain validation for __Host- cookies (which must not have domains)
   */
  private validateCookieDomains(cookies: Cookie[], urlObj: URL): void {
    const targetDomain = urlObj.hostname.toLowerCase();

    for (const cookie of cookies) {
      // Skip domain validation for __Host- cookies (they must not have domains)
      if (cookie.name.startsWith('__Host-')) {
        continue;
      }

      if (cookie.domain) {
        const cookieDomain = cookie.domain.toLowerCase();

        if (!this.isDomainValid(cookieDomain, targetDomain)) {
          throw new Error(
            `Cookie '${cookie.name}' domain mismatch: cookie domain '${cookieDomain}' vs URL domain '${targetDomain}'`
          );
        }
      }
    }
  }

  /**
   * Check if a cookie domain is valid for a target domain according to RFC 6265
   * @param cookieDomain - The domain specified in the cookie
   * @param targetDomain - The domain from the URL
   * @returns true if the cookie domain is valid for the target domain
   */
  private isDomainValid(cookieDomain: string, targetDomain: string): boolean {
    // Exact match
    if (cookieDomain === targetDomain) {
      return true;
    }

    // Handle localhost and IP addresses specially
    if (targetDomain === 'localhost' || targetDomain === '127.0.0.1') {
      return (
        cookieDomain === 'localhost' ||
        cookieDomain === '127.0.0.1' ||
        cookieDomain === '.localhost'
      );
    }

    // Handle domain with leading dot (parent domain)
    if (cookieDomain.startsWith('.')) {
      const parentDomain = cookieDomain.slice(1); // Remove leading dot

      // Cookie domain ".example.com" is valid for "app.example.com"
      // but not for "example.com" itself (RFC 6265 requirement)
      if (targetDomain === parentDomain) {
        return false; // Parent domain cookie cannot be set on the parent domain itself
      }

      // Check if target domain is a subdomain of the cookie domain
      return targetDomain.endsWith(`.${parentDomain}`);
    }

    // Handle subdomain cookie for exact domain match
    if (targetDomain.startsWith('.')) {
      return targetDomain === `.${cookieDomain}`;
    }

    return false;
  }

  /**
   * Clear sensitive cookie data from memory
   */
  private clearCookieMemory(
    cookies: Cookie[],
    playwrightCookies: PlaywrightCookie[]
  ): void {
    // Clear cookie values from original array
    if (cookies && Array.isArray(cookies)) {
      for (const cookie of cookies) {
        if (cookie && typeof cookie === 'object') {
          // Overwrite sensitive fields with empty strings
          (cookie as Cookie).value = '';
          if ((cookie as Cookie).expires) {
            (cookie as Cookie).expires = 0;
          }
        }
      }
    }

    // Clear playwright cookies array
    if (playwrightCookies && Array.isArray(playwrightCookies)) {
      for (const cookie of playwrightCookies) {
        if (cookie && typeof cookie === 'object') {
          // Overwrite sensitive fields with empty strings
          (cookie as PlaywrightCookie).value = '';
          if ((cookie as PlaywrightCookie).expires) {
            (cookie as PlaywrightCookie).expires = 0;
          }
        }
      }
      // Clear the array
      playwrightCookies.length = 0;
    }
  }

  /**
   * Sanitize error messages to prevent cookie value exposure
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove any potential cookie value patterns from error messages
    // This regex matches common cookie value patterns
    return message
      .replace(/value["\s]*[:=]["\s]*[^"\s;,}]+/gi, 'value: [REDACTED]')
      .replace(/["\s]*:["\s]*[^"\s;,}]{10,}/g, ': [REDACTED]')
      .replace(/Cookie[^:]*:\s*[^;,}\s]{8,}/gi, 'Cookie: [REDACTED]');
  }

  private async captureScreenshot(
    page: Page,
    config: ReturnType<typeof this.createScreenshotConfig>,
    fullPage: boolean
  ): Promise<Buffer> {
    // Always capture as PNG for best quality, then convert if needed
    const playwrightFormat = 'png';
    const screenshotTimeout = this.serviceConfig.timeouts.screenshot;

    const screenshotOptions = {
      type: playwrightFormat as 'png',
      fullPage,
      timeout: screenshotTimeout,
    };

    const rawBuffer = await page.screenshot(screenshotOptions);

    // Convert to requested format if needed
    if (needsConversion(config.format)) {
      return await convertImage(rawBuffer, {
        format: config.format,
        quality: config.quality,
      });
    }

    return rawBuffer;
  }

  private async getPageDimensions(
    page: Page
  ): Promise<{ width: number; height: number }> {
    return await page.evaluate(() => ({
      width: (
        globalThis as unknown as {
          document: { documentElement: { scrollWidth: number } };
        }
      ).document.documentElement.scrollWidth,
      height: (
        globalThis as unknown as {
          document: { documentElement: { scrollHeight: number } };
        }
      ).document.documentElement.scrollHeight,
    }));
  }

  private async findElement(page: Page, selector: string) {
    const element = page.locator(selector).first();

    // Wait for the element to be attached to the DOM before checking count
    try {
      await element.waitFor({ state: 'attached', timeout: 5000 });
    } catch (_error) {
      throw new Error(`Element not found: ${selector}`);
    }

    await element.scrollIntoViewIfNeeded();

    return element;
  }

  private async captureElementScreenshot(
    _page: Page,
    element: Locator,
    config: ReturnType<typeof this.createScreenshotConfig>
  ): Promise<Buffer> {
    // Always capture as PNG for best quality, then convert if needed
    const playwrightFormat = 'png';

    const rawBuffer = await element.screenshot({
      type: playwrightFormat as 'png',
    });

    // Convert to requested format if needed
    if (needsConversion(config.format)) {
      return await convertImage(rawBuffer, {
        format: config.format,
        quality: config.quality,
      });
    }

    return rawBuffer;
  }

  private async getElementDimensions(
    element: Locator
  ): Promise<{ width: number; height: number }> {
    const boundingBox = await element.boundingBox();
    if (!boundingBox) {
      throw new Error('Could not get element dimensions');
    }

    return {
      width: Math.round(boundingBox.width),
      height: Math.round(boundingBox.height),
    };
  }

  private createResult(
    screenshotBuffer: Buffer,
    config: ReturnType<typeof this.createScreenshotConfig>,
    pageSize?: { width: number; height: number }
  ): ScreenshotResult {
    const base64Data = screenshotBuffer.toString('base64');
    const mimeType = getMimeType(config.format);

    return {
      data: base64Data,
      mimeType,
      width: pageSize?.width ?? config.width,
      height: pageSize?.height ?? config.height,
      timestamp: Date.now(),
    };
  }

  /**
   * Execute a function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    url: string
  ): Promise<T> {
    const maxAttempts = this.serviceConfig.browser.retryCount + 1; // +1 for initial attempt

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        const typedError =
          error instanceof Error ? error : new Error(String(error));

        // Don't retry validation errors - fail fast
        if (
          typedError.message.includes('domain mismatch') ||
          typedError.message.includes('Cookie injection failed') ||
          typedError.message.includes('validation')
        ) {
          const categorizedError = categorizeError(typedError, { url });
          this.logger.error('Validation error - no retry', categorizedError, {
            url,
          });
          throw error;
        }

        if (isLastAttempt) {
          const categorizedError = categorizeError(typedError, { url });
          this.logger.error('All retry attempts failed', categorizedError, {
            attempts: maxAttempts,
            url,
          });
          throw error;
        }

        // Create retry attempt info
        const retryInfo: RetryAttempt = {
          attempt,
          maxAttempts,
          error: typedError,
          delay: this.serviceConfig.browser.retryDelay,
        };

        // Log retry attempt using the logger
        this.logger.retry(attempt, maxAttempts, typedError, { url });

        // Wait before retry
        await this.delay(retryInfo.delay);

        // Reset browser if error indicates it's in a bad state
        if (this.isErrorRecoverable(error)) {
          this.logger.browserReset('Error recovery', {
            error: typedError.message,
            attempt,
            url,
          });
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

    // Domain validation errors should not be retried
    if (error.message.includes('domain mismatch')) {
      return false;
    }

    // Cookie validation errors should not be retried
    if (error.message.includes('Cookie injection failed')) {
      return false;
    }

    const recoverableErrors = [
      'browser has been closed',
      'browser disconnected',
      'target closed',
      'page crashed',
      'navigation failed',
      'protocol error',
      'connection closed',
    ];

    return recoverableErrors.some((msg) =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Reset browser instance for error recovery
   */
  private async resetBrowser(): Promise<void> {
    this.logger.debug('Resetting browser instance');

    try {
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      this.logger.warn('Error during browser reset', {
        error: (error as Error).message,
      });
    }

    this.browser = null;
    this.isInitialized = false;
    this.initializationInProgress = false;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get a page from the pool or create a new one
   */
  private async getPage(
    config: ReturnType<typeof this.createScreenshotConfig>
  ): Promise<Page> {
    // Try to get a page from the pool
    let page = this.pagePool.pop();

    if (page && !page.isClosed()) {
      this.activePages.add(page);
      await this.configurePage(page, config);
      return page;
    }

    // Create a new page if pool is empty or page was closed
    page = await this.createPage(config);
    this.activePages.add(page);
    return page;
  }

  /**
   * Return a page to the pool for reuse
   */
  private async returnPage(page: Page): Promise<void> {
    if (page.isClosed() || this.pagePool.length >= this.maxPoolSize) {
      await this.safeClosePage(page);
      this.activePages.delete(page);
      return;
    }

    try {
      // Reset page state for reuse
      await page.evaluate(() => {
        // Clear any JavaScript state
        if (
          (globalThis as unknown as { localStorage?: Storage }).localStorage
        ) {
          (
            globalThis as unknown as { localStorage: Storage }
          ).localStorage.clear();
        }
        if (
          (globalThis as unknown as { sessionStorage?: Storage }).sessionStorage
        ) {
          (
            globalThis as unknown as { sessionStorage: Storage }
          ).sessionStorage.clear();
        }
      });

      this.activePages.delete(page);
      this.pagePool.push(page);

      this.logger.debug('Page returned to pool', {
        poolSize: this.pagePool.length,
      });
    } catch (_error) {
      // If page cleanup fails, close it instead of reusing
      await this.safeClosePage(page);
      this.activePages.delete(page);
    }
  }

  /**
   * Configure page settings
   */
  private async configurePage(
    page: Page,
    config: ReturnType<typeof this.createScreenshotConfig>
  ): Promise<void> {
    await page.setViewportSize({ width: config.width, height: config.height });
    page.setDefaultTimeout(this.serviceConfig.timeouts.navigation);
  }

  /**
   * Safely close a page without throwing errors
   */
  private async safeClosePage(page: Page): Promise<void> {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (error) {
      // Silent cleanup - don't interfere with stdio
      this.logger.debug('Error closing page', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Dump actual cookies present in browser for debugging
   */
  private async dumpBrowserCookies(page: Page, url: string): Promise<void> {
    try {
      const context = page.context();
      const actualCookies = await context.cookies();

      // Filter cookies relevant to the current URL
      const urlObj = new URL(url);
      const relevantCookies = actualCookies.filter((cookie) => {
        // Check if cookie applies to this URL
        if (cookie.domain) {
          const cookieDomain = cookie.domain.startsWith('.')
            ? cookie.domain.slice(1)
            : cookie.domain;
          return (
            urlObj.hostname === cookieDomain ||
            urlObj.hostname.endsWith(`.${cookieDomain}`)
          );
        }
        return true;
      });

      this.logger.debug('Browser cookies after navigation (actual state)', {
        url,
        totalCookiesInBrowser: actualCookies.length,
        relevantCookiesCount: relevantCookies.length,
        relevantCookies: relevantCookies.map((cookie) => ({
          name: cookie.name,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          valueLength: cookie.value?.length || 0,
          hasValue: !!cookie.value,
          expires: cookie.expires,
          isHostPrefixed: cookie.name.startsWith('__Host-'),
          isSecurePrefixed: cookie.name.startsWith('__Secure-'),
        })),
        cookieAnalysis: {
          hostPrefixed: relevantCookies.filter((c) =>
            c.name.startsWith('__Host-')
          ).length,
          securePrefixed: relevantCookies.filter((c) =>
            c.name.startsWith('__Secure-')
          ).length,
          withDomain: relevantCookies.filter((c) => c.domain).length,
          secure: relevantCookies.filter((c) => c.secure).length,
          httpOnly: relevantCookies.filter((c) => c.httpOnly).length,
        },
      });

      // Check if our expected cookies are present
      const expectedCookieNames = [
        '__Host-next-auth.csrf-token',
        '__Secure-next-auth.session-token',
        'ajs_user_id',
      ];
      const missingCookies = expectedCookieNames.filter(
        (expectedName) =>
          !relevantCookies.find(
            (actualCookie) => actualCookie.name === expectedName
          )
      );

      if (missingCookies.length > 0) {
        this.logger.warn('Expected cookies missing from browser', {
          url,
          missingCookies,
          presentCookieNames: relevantCookies.map((c) => c.name),
        });
      }
    } catch (error) {
      this.logger.warn('Failed to dump browser cookies for debugging', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
