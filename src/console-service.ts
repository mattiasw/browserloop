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
  type CDPSession,
  type ConsoleMessage,
  chromium,
  type Page,
} from 'playwright';
import { config } from './config.js';
import {
  filterCookiesByDomain,
  parseCookies,
  validateAndSanitize,
} from './cookie-utils.js';
import { categorizeError, Logger } from './logger.js';
import type {
  ConsoleLogEntry,
  ConsoleLogOptions,
  ConsoleLogResult,
  ConsoleLogServiceConfig,
  Cookie,
  InternalConsoleLogConfig,
} from './types.js';

// CDP Event interfaces
interface CDPConsoleAPIEvent {
  type: string;
  timestamp?: number;
  args?: Array<{
    value?: unknown;
    description?: string;
    preview?: {
      description?: string;
    };
  }>;
}

interface CDPExceptionEvent {
  exceptionDetails?: {
    timestamp?: number;
    exception?: {
      description?: string;
    };
    text?: string;
  };
}

// Extended CDPSession interface for type safety with CDP events
interface ExtendedCDPSession extends CDPSession {
  on(
    event: 'Runtime.consoleAPICalled',
    handler: (data: CDPConsoleAPIEvent) => void
  ): this;
  on(
    event: 'Runtime.exceptionThrown',
    handler: (data: CDPExceptionEvent) => void
  ): this;
}

export class ConsoleLogService {
  private browser: Browser | null = null;
  private isInitialized = false;
  private serviceConfig: ConsoleLogServiceConfig;
  private logger: Logger;
  private lastSuccessfulOperation?: number;
  private initializationInProgress = false;

  constructor(config: ConsoleLogServiceConfig) {
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
    this.logger.debug('Initializing browser for console log collection', {
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
      this.logger.info(
        'Browser initialized successfully for console log collection'
      );
    } catch (error) {
      const categorizedError = categorizeError(error as Error);
      this.logger.error('Browser initialization failed', categorizedError);
      throw error;
    } finally {
      this.initializationInProgress = false;
    }
  }

  /**
   * Read console logs from a URL
   */
  async readConsoleLogs(options: ConsoleLogOptions): Promise<ConsoleLogResult> {
    return await this.executeWithRetry(async () => {
      await this.ensureInitialized();

      const config = this.createConsoleLogConfig(options);
      const page = await this.createPage(config);
      const logs: ConsoleLogEntry[] = [];
      const startTimestamp = Date.now();

      try {
        // Debug: Log collection start
        if (this.serviceConfig.logging.debug) {
          this.logger.debug('Starting console log collection', {
            url: config.url,
            sanitize: config.sanitize,
            timeout: config.timeout,
            logLevels: config.logLevels,
          });
        }

        // CRITICAL: Set up console log listener BEFORE navigation
        // This ensures we capture console messages from the very beginning
        let consoleListenerActive = true;
        page.on('console', (message: ConsoleMessage) => {
          if (!consoleListenerActive) return;

          const entry = this.processConsoleMessage(
            message,
            config.sanitize,
            config.logLevels
          );
          if (entry) {
            logs.push(entry);

            // Debug: Log each captured message immediately
            if (this.serviceConfig.logging.debug) {
              this.logger.debug('Console message captured', {
                level: entry.level,
                message: entry.message.substring(0, 200),
                totalLogs: logs.length,
                timestamp: entry.timestamp,
              });
            }

            // Check log size limit
            const totalSize = this.estimateLogSize(logs);
            if (totalSize > config.maxLogSize) {
              this.logger.warn('Log size limit exceeded, stopping collection', {
                totalSize,
                maxSize: config.maxLogSize,
                logCount: logs.length,
              });
              // Remove the last entry that caused the overflow
              logs.pop();
              consoleListenerActive = false;
            }
          }
        });

        // Also listen for page errors and warnings
        page.on('pageerror', (error) => {
          if (!consoleListenerActive) return;

          const entry: ConsoleLogEntry = {
            timestamp: Date.now(),
            level: 'error',
            message: `Page error: ${error.message}`,
            args: [error.stack || error.message],
          };

          if (config.logLevels.includes('error')) {
            logs.push(entry);

            if (this.serviceConfig.logging.debug) {
              this.logger.debug('Page error captured', {
                message: entry.message.substring(0, 200),
                totalLogs: logs.length,
              });
            }
          }
        });

        // Set up Chrome DevTools Protocol (CDP) to capture browser-level console messages
        // This captures Permissions-Policy warnings, security warnings, etc.
        let cdpSession: CDPSession | null = null;
        try {
          // Create CDP session directly from the page
          cdpSession = await page.context().newCDPSession(page);

          if (this.serviceConfig.logging.debug) {
            this.logger.debug('CDP session created successfully');
          }

          // Enable Runtime domain to capture console API calls
          await cdpSession.send('Runtime.enable');

          if (this.serviceConfig.logging.debug) {
            this.logger.debug('CDP Runtime domain enabled');
          }

          // Listen for console API calls (includes browser warnings)
          (cdpSession as ExtendedCDPSession).on(
            'Runtime.consoleAPICalled',
            (event: CDPConsoleAPIEvent) => {
              if (!consoleListenerActive) return;

              try {
                const level = event.type; // 'log', 'warn', 'error', 'info', 'debug'

                if (
                  !config.logLevels.includes(
                    level as 'log' | 'info' | 'warn' | 'error' | 'debug'
                  )
                ) {
                  return;
                }

                // Extract arguments and convert to strings
                const args: string[] =
                  event.args?.map((arg): string => {
                    if (arg.value !== undefined) {
                      return String(arg.value);
                    }
                    if (arg.description !== undefined) {
                      return String(arg.description);
                    }
                    if (arg.preview?.description !== undefined) {
                      return String(arg.preview.description);
                    }
                    return '[Object]';
                  }) || [];

                const message = args.join(' ') || `[${level.toUpperCase()}]`;

                const entry: ConsoleLogEntry = {
                  timestamp: event.timestamp
                    ? Math.floor(event.timestamp)
                    : Date.now(),
                  level: level as 'log' | 'info' | 'warn' | 'error' | 'debug',
                  message: config.sanitize
                    ? this.sanitizeMessage(message)
                    : message,
                  args: config.sanitize
                    ? args.map((arg) => this.sanitizeMessage(arg))
                    : args,
                };

                logs.push(entry);

                if (this.serviceConfig.logging.debug) {
                  this.logger.debug('CDP console message captured', {
                    level: entry.level,
                    message: entry.message.substring(0, 200),
                    totalLogs: logs.length,
                    source: 'CDP Runtime.consoleAPICalled',
                  });
                }
              } catch (error) {
                if (this.serviceConfig.logging.debug) {
                  this.logger.debug('Error processing CDP console message', {
                    error:
                      error instanceof Error ? error.message : String(error),
                    event: JSON.stringify(event).substring(0, 200),
                  });
                }
              }
            }
          );

          // Also listen for runtime exceptions (might include browser warnings)
          (cdpSession as ExtendedCDPSession).on(
            'Runtime.exceptionThrown',
            (event: CDPExceptionEvent) => {
              if (!consoleListenerActive || !config.logLevels.includes('error'))
                return;

              try {
                const exception = event.exceptionDetails;
                const message =
                  exception?.exception?.description ||
                  exception?.text ||
                  'Runtime exception';

                const entry: ConsoleLogEntry = {
                  timestamp: exception?.timestamp
                    ? Math.floor(exception.timestamp)
                    : Date.now(),
                  level: 'error',
                  message: `Runtime exception: ${config.sanitize ? this.sanitizeMessage(message) : message}`,
                  args: [
                    config.sanitize ? this.sanitizeMessage(message) : message,
                  ],
                };

                logs.push(entry);

                if (this.serviceConfig.logging.debug) {
                  this.logger.debug('CDP runtime exception captured', {
                    message: entry.message.substring(0, 200),
                    totalLogs: logs.length,
                  });
                }
              } catch (error) {
                if (this.serviceConfig.logging.debug) {
                  this.logger.debug('Error processing CDP exception', {
                    error:
                      error instanceof Error ? error.message : String(error),
                  });
                }
              }
            }
          );
        } catch (error) {
          if (this.serviceConfig.logging.debug) {
            this.logger.debug(
              'Could not set up CDP console capture (falling back to standard Playwright events)',
              {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
              }
            );
          }
          // Don't fail the entire operation if CDP setup fails
          // Standard Playwright console events will still work
        }

        // Debug: Log before navigation
        if (this.serviceConfig.logging.debug) {
          this.logger.debug('Console listeners set up, navigating to URL', {
            url: config.url,
            currentLogCount: logs.length,
          });
        }

        // Navigate to the URL
        await this.navigateToUrl(page, config);

        // Debug: Log immediately after navigation
        if (this.serviceConfig.logging.debug) {
          this.logger.debug('Navigation complete, current log count', {
            currentLogCount: logs.length,
          });
        }

        // Wait for console messages with progressive delays
        // Many console messages appear during and right after page load
        await this.delay(500); // Initial short delay

        const logsAfter500ms = logs.length;
        if (this.serviceConfig.logging.debug) {
          this.logger.debug('After 500ms delay', {
            logCount: logsAfter500ms,
          });
        }

        await this.delay(1500); // Another 1.5 seconds (total 2 seconds)

        const logsAfter2s = logs.length;
        if (this.serviceConfig.logging.debug) {
          this.logger.debug('After 2 seconds total', {
            logCount: logsAfter2s,
            additionalLogs: logsAfter2s - logsAfter500ms,
          });
        }

        // Extra delay for any late-arriving messages
        await this.delay(1000); // Additional 1 second

        const logsAfter3s = logs.length;
        if (this.serviceConfig.logging.debug) {
          this.logger.debug('After 3 seconds total', {
            logCount: logsAfter3s,
            additionalLogs: logsAfter3s - logsAfter2s,
          });
        }

        // Stop the console listener
        consoleListenerActive = false;

        // Clean up CDP session
        if (cdpSession) {
          try {
            await cdpSession.detach();
          } catch (error) {
            if (this.serviceConfig.logging.debug) {
              this.logger.debug('Error detaching CDP session', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }

        const endTimestamp = Date.now();

        // Debug: Final collection summary
        if (this.serviceConfig.logging.debug) {
          this.logger.debug('Console log collection complete', {
            finalLogCount: logs.length,
            duration: endTimestamp - startTimestamp,
            logLevels: logs.reduce(
              (acc, log) => {
                acc[log.level] = (acc[log.level] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
          });
        }

        const result: ConsoleLogResult = {
          logs,
          url: config.url,
          startTimestamp,
          endTimestamp,
          totalLogs: logs.length,
        };

        this.lastSuccessfulOperation = Date.now();
        this.logger.debug('Console logs collected successfully', {
          url: options.url,
          logCount: logs.length,
          duration: endTimestamp - startTimestamp,
        });

        return result;
      } finally {
        await this.safeClosePage(page);
      }
    }, options.url);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up console log service resources');

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

  private createConsoleLogConfig(
    options: ConsoleLogOptions
  ): InternalConsoleLogConfig & { maxLogSize: number } {
    // Get fresh authentication config
    const authConfig = config.getAuthenticationConfig();
    const consoleConfig = config.getConsoleConfig();

    // Merge default cookies with request cookies
    const mergedCookies = this.mergeCookies(
      authConfig.defaultCookies || [],
      options.cookies
    );

    const result: InternalConsoleLogConfig & { maxLogSize: number } = {
      url: options.url,
      timeout: options.timeout ?? consoleConfig.defaultTimeout,
      sanitize: options.sanitize ?? consoleConfig.defaultSanitize,
      waitForNetworkIdle:
        options.waitForNetworkIdle ?? consoleConfig.defaultWaitForNetworkIdle,
      logLevels: options.logLevels ?? consoleConfig.defaultLogLevels,
      cookies: mergedCookies,
      maxLogSize: consoleConfig.maxLogSize,
    };

    // Add userAgent only if it exists
    const userAgent = options.userAgent ?? this.serviceConfig.browser.userAgent;
    if (userAgent) {
      result.userAgent = userAgent;
    }

    return result;
  }

  /**
   * Merge default cookies with request cookies
   */
  private mergeCookies(
    defaultCookies: Cookie[],
    requestCookies?: Cookie[] | string
  ): Cookie[] | string | undefined {
    // If no cookies, return undefined
    if ((!defaultCookies || defaultCookies.length === 0) && !requestCookies) {
      return undefined;
    }

    // If no default cookies, return request cookies as-is
    if (!defaultCookies || defaultCookies.length === 0) {
      return requestCookies;
    }

    // If no request cookies, return default cookies
    if (!requestCookies) {
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

      // Add default cookies that aren't overridden by request cookies
      for (const defaultCookie of defaultCookies) {
        if (!requestCookieMap.has(defaultCookie.name)) {
          mergedCookies.push(defaultCookie);
        }
      }

      // Add all request cookies (these take priority)
      for (const requestCookie of parsedRequestCookies) {
        mergedCookies.push(requestCookie);
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

  private async createPage(config: InternalConsoleLogConfig): Promise<Page> {
    const pageOptions = config.userAgent ? { userAgent: config.userAgent } : {};
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    const page = await this.browser.newPage(pageOptions);

    // Set a reasonable viewport for console log collection
    await page.setViewportSize({ width: 1280, height: 720 });
    page.setDefaultTimeout(this.serviceConfig.timeouts.navigation);

    return page;
  }

  private async navigateToUrl(
    page: Page,
    config: InternalConsoleLogConfig
  ): Promise<void> {
    const navigationTimeout = Math.min(
      config.timeout,
      this.serviceConfig.timeouts.navigation
    );

    // Inject cookies before navigation if provided
    if (config.cookies) {
      await this.injectCookies(page, config.cookies, config.url);
    }

    await page.goto(config.url, {
      waitUntil: config.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
      timeout: navigationTimeout,
    });
  }

  private async injectCookies(
    page: Page,
    cookiesInput: Cookie[] | string,
    url: string
  ): Promise<void> {
    try {
      // Parse cookies if they're a string
      const cookies =
        typeof cookiesInput === 'string'
          ? parseCookies(cookiesInput)
          : cookiesInput;

      if (cookies.length === 0) {
        this.logger.debug('No cookies to inject for console log collection');
        return;
      }

      const { cookies: validatedCookies } = validateAndSanitize(cookies);
      const { matchingCookies: filteredCookies } = filterCookiesByDomain(
        validatedCookies,
        url
      );

      if (filteredCookies.length === 0) {
        this.logger.debug(
          'No cookies match target domain for console log collection',
          {
            url,
            originalCount: validatedCookies.length,
          }
        );
        return;
      }

      // Convert to Playwright format and inject
      const playwrightCookies = filteredCookies.map((cookie) => {
        const playwrightCookie: {
          name: string;
          value: string;
          domain?: string;
          path?: string;
          expires?: number;
          httpOnly?: boolean;
          secure?: boolean;
          sameSite?: 'Strict' | 'Lax' | 'None';
        } = {
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || new URL(url).hostname,
          path: cookie.path || '/',
        };

        if (cookie.httpOnly !== undefined)
          playwrightCookie.httpOnly = cookie.httpOnly;
        if (cookie.secure !== undefined)
          playwrightCookie.secure = cookie.secure;
        if (cookie.sameSite !== undefined)
          playwrightCookie.sameSite = cookie.sameSite as
            | 'Strict'
            | 'Lax'
            | 'None';
        if (cookie.expires !== undefined)
          playwrightCookie.expires = cookie.expires;

        return playwrightCookie;
      });

      await page.context().addCookies(playwrightCookies);

      this.logger.debug('Cookies injected for console log collection', {
        count: playwrightCookies.length,
        url,
      });
    } catch (error) {
      this.logger.warn('Failed to inject cookies for console log collection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url,
      });
      // Continue without cookies rather than failing
    }
  }

  private processConsoleMessage(
    message: ConsoleMessage,
    sanitize: boolean,
    allowedLevels: Array<'log' | 'info' | 'warn' | 'error' | 'debug'>
  ): ConsoleLogEntry | null {
    const level = message.type();
    const text = message.text();

    // Debug: Log all console message types we receive
    if (this.serviceConfig.logging.debug) {
      this.logger.debug('Playwright console message received', {
        type: level,
        text: text.substring(0, 200),
        fullText: text, // Log full text to see if we're getting Permissions-Policy warnings
        allowedLevels,
        location: message.location(),
      });
    }

    // Check if this log level is in the allowed levels
    // Note: 'warning' type from CDP might be mapped to 'warn' in Playwright
    const normalizedLevel = level === 'warning' ? 'warn' : level;
    if (
      !allowedLevels.includes(
        normalizedLevel as 'log' | 'info' | 'warn' | 'error' | 'debug'
      )
    ) {
      if (this.serviceConfig.logging.debug) {
        this.logger.debug('Console message ignored (not in allowed levels)', {
          type: level,
          normalizedLevel,
          allowedLevels,
        });
      }
      return null;
    }

    try {
      let messageText = message.text();
      const args = message.args().map((arg) => {
        try {
          const argString: string | undefined = arg.toString();
          return argString || '[object]';
        } catch {
          return '[object]';
        }
      });

      if (sanitize) {
        messageText = this.sanitizeMessage(messageText);
        for (let i = 0; i < args.length; i++) {
          if (typeof args[i] === 'string') {
            args[i] = this.sanitizeMessage(args[i] as string);
          }
        }
      }

      return {
        timestamp: Date.now(),
        level: normalizedLevel as 'log' | 'info' | 'warn' | 'error' | 'debug',
        message: messageText,
        args,
      };
    } catch (error) {
      this.logger.warn('Failed to process console message', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private sanitizeMessage(message: string): string {
    if (!message) return message;

    // Patterns to detect and mask sensitive data
    const patterns = [
      // API keys (various formats)
      { pattern: /\b[A-Za-z0-9_-]{20,}\b/g, replacement: '[API_KEY_MASKED]' },
      // Email addresses
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL_MASKED]',
      },
      // URLs with credentials or tokens
      {
        pattern: /https?:\/\/[^\s]*(?:token|key|auth|password|secret)[^\s]*/gi,
        replacement: '[URL_WITH_AUTH_MASKED]',
      },
      // JWT tokens
      {
        pattern: /\bey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*\b/g,
        replacement: '[JWT_TOKEN_MASKED]',
      },
      // Authorization headers
      {
        pattern: /\b(?:Bearer|Basic)\s+[A-Za-z0-9+/=_-]+/gi,
        replacement: '[AUTH_HEADER_MASKED]',
      },
      // Common secret patterns
      {
        pattern:
          /\b(?:password|secret|private_key|access_token|refresh_token|api_key)\s*[:=]\s*[^\s,}]*/gi,
        replacement: '$1: [VALUE_MASKED]',
      },
    ];

    let sanitized = message;
    for (const { pattern, replacement } of patterns) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }

  private estimateLogSize(logs: ConsoleLogEntry[]): number {
    // Rough estimation of JSON size
    return JSON.stringify(logs).length;
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    url: string
  ): Promise<T> {
    const maxAttempts = this.serviceConfig.browser.retryCount + 1;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const categorizedError = categorizeError(lastError);

        this.logger.warn('Console log collection attempt failed', {
          attempt,
          maxAttempts,
          error: categorizedError.originalError.message,
          category: categorizedError.category,
          isRecoverable: categorizedError.isRecoverable,
          url,
        });

        // Don't retry on the last attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Only retry if the error is recoverable
        if (!categorizedError.isRecoverable) {
          this.logger.error(
            'Non-recoverable error, not retrying',
            categorizedError
          );
          break;
        }

        // Wait before retrying
        const delay = this.serviceConfig.browser.retryDelay * attempt;
        this.logger.debug('Retrying console log collection after delay', {
          attempt: attempt + 1,
          delay,
          url,
        });
        await this.delay(delay);

        // Reset browser for some error types
        if (['browser_crash', 'resource'].includes(categorizedError.category)) {
          await this.resetBrowser();
        }
      }
    }

    throw lastError || new Error('Console log collection failed');
  }

  private async resetBrowser(): Promise<void> {
    this.logger.debug('Resetting browser for console log service');

    try {
      if (this.browser) {
        await this.browser.close();
      }
    } catch (_error) {
      // Ignore cleanup errors
    }

    this.browser = null;
    this.isInitialized = false;
    this.initializationInProgress = false;

    await this.initialize();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async safeClosePage(page: Page): Promise<void> {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (_error) {
      // Silent cleanup - don't interfere with main operation
    }
  }
}
