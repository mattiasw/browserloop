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

import { existsSync, readFileSync, watch } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { parseCookies } from './cookie-utils.js';
import { fileLogger } from './file-logger.js';
import type {
  Cookie,
  FileWatchEvent,
  FileWatcherConfig,
  FileWatcherState,
} from './types.js';

// Global registry to prevent multiple watchers on the same file
const globalWatcherRegistry = new Map<string, import('node:fs').FSWatcher>();

// Test mode flag for mocking file watchers
let testMode = false;
const mockWatchers = new Map<string, { active: boolean }>();

/**
 * Enable test mode for file watching (used in tests)
 */
export function enableFileWatchingTestMode() {
  testMode = true;
  mockWatchers.clear();
}

/**
 * Disable test mode for file watching
 */
export function disableFileWatchingTestMode() {
  testMode = false;
  mockWatchers.clear();
  configInstances.clear();
}

// Store references to all ConfigManager instances for test mode
const configInstances = new Set<ConfigManager>();

/**
 * Simulate a file change in test mode (for testing purposes)
 */
export function simulateFileChange(filePath: string) {
  if (!testMode) {
    throw new Error('simulateFileChange can only be used in test mode');
  }

  // Trigger the change on all ConfigManager instances that are watching this file
  for (const configInstance of configInstances) {
    configInstance.simulateFileChangeForTesting(filePath);
  }
}

/**
 * Configuration schema for the browser loop service
 */
const ConfigSchema = z.object({
  viewport: z.object({
    defaultWidth: z.number().min(200).max(4000),
    defaultHeight: z.number().min(200).max(4000),
  }),
  screenshot: z.object({
    defaultFormat: z.enum(['webp', 'png', 'jpeg']),
    defaultQuality: z.number().min(0).max(100),
    defaultTimeout: z.number().min(1000).max(120000),
    defaultWaitForNetworkIdle: z.boolean(),
  }),
  console: z.object({
    defaultTimeout: z.number().min(1000).max(120000),
    defaultSanitize: z.boolean(),
    defaultWaitForNetworkIdle: z.boolean(),
    maxLogSize: z.number().min(1000).max(10000000), // 1KB to 10MB
    defaultLogLevels: z.array(
      z.enum(['log', 'info', 'warn', 'error', 'debug'])
    ),
  }),
  browser: z.object({
    userAgent: z.string().optional(),
    retryCount: z.number().min(0).max(10),
    retryDelay: z.number().min(100).max(10000),
  }),
  authentication: z.object({
    defaultCookies: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
        domain: z.string().optional(),
        path: z.string().optional(),
        httpOnly: z.boolean().optional(),
        secure: z.boolean().optional(),
        expires: z.number().optional(),
        sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
      })
    ),
  }),
  logging: z.object({
    debug: z.boolean(),
    logFile: z.string().optional(),
    enableMetrics: z.boolean(),
    silent: z.boolean(),
  }),
  timeouts: z.object({
    browserInit: z.number().min(5000).max(60000),
    navigation: z.number().min(1000).max(120000),
    elementWait: z.number().min(100).max(30000),
    screenshot: z.number().min(1000).max(60000),
    network: z.number().min(1000).max(30000),
  }),
});

/**
 * Configuration manager that loads settings from environment variables
 */
export class ConfigManager {
  private config: z.infer<typeof ConfigSchema>;
  private fileWatcherState: FileWatcherState;

  constructor() {
    this.config = this.loadConfig();
    this.fileWatcherState = {
      watchers: new Map<string, FileWatcherConfig>(),
      enabled: true,
      defaultDebounceDelay: 1000, // 1 second debounce
    };

    // Register this instance for test mode
    if (testMode) {
      configInstances.add(this);
    }

    // Initialize file watching for cookie files
    this.initializeFileWatching();
  }

  /**
   * Get the complete configuration
   */
  getConfig(): z.infer<typeof ConfigSchema> {
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

  /**
   * Get console log configuration
   */
  getConsoleConfig() {
    return this.config.console;
  }

  /**
   * Refresh configuration by reloading from environment variables and files
   * This includes re-reading cookie files to pick up any changes
   *
   * @returns Promise<boolean> - true if configuration was successfully refreshed, false otherwise
   */
  async refreshConfig(): Promise<boolean> {
    fileLogger.debug('[ConfigRefresh] Starting configuration refresh...');

    try {
      // Load new configuration atomically
      const newConfig = this.loadConfig();

      // Only replace the current configuration if loading was successful
      this.config = newConfig;

      fileLogger.debug('[ConfigRefresh] Configuration refreshed successfully');
      fileLogger.debug(
        `[ConfigRefresh] Default cookies count: ${this.config.authentication.defaultCookies.length}`
      );
      if (this.config.authentication.defaultCookies.length > 0) {
        fileLogger.debug(
          `[ConfigRefresh] Cookie names: ${this.config.authentication.defaultCookies.map((c) => c.name).join(', ')}`
        );
      }

      return true;
    } catch (error) {
      // Log error but preserve existing configuration
      // Use file logger instead of console to avoid MCP protocol interference
      fileLogger.warn(
        `Failed to refresh configuration: ${error instanceof Error ? error.message : 'Unknown error'}. Keeping existing configuration.`
      );
      return false;
    }
  }

  /**
   * Initialize file watching for configured cookie files
   * Automatically watches cookie file when BROWSERLOOP_DEFAULT_COOKIES points to a file path
   */
  private initializeFileWatching() {
    const cookieEnvValue = process.env.BROWSERLOOP_DEFAULT_COOKIES;

    fileLogger.debug('[FileWatching] Initializing file watching...');
    fileLogger.debug(
      `[FileWatching] BROWSERLOOP_DEFAULT_COOKIES = "${cookieEnvValue}"`
    );
    fileLogger.debug(
      `[FileWatching] BROWSERLOOP_DISABLE_FILE_WATCHING = "${process.env.BROWSERLOOP_DISABLE_FILE_WATCHING}"`
    );
    fileLogger.debug(
      `[FileWatching] File watching enabled = ${this.fileWatcherState.enabled}`
    );

    // Skip file watching if disabled by environment variable (useful for testing)
    if (process.env.BROWSERLOOP_DISABLE_FILE_WATCHING === 'true') {
      fileLogger.debug(
        '[FileWatching] File watching is disabled by BROWSERLOOP_DISABLE_FILE_WATCHING'
      );
      return;
    }

    if (!cookieEnvValue || !this.fileWatcherState.enabled) {
      fileLogger.debug(
        `[FileWatching] File watching not initialized: cookieEnvValue=${!!cookieEnvValue}, enabled=${this.fileWatcherState.enabled}`
      );
      return;
    }

    // Check if the value looks like a file path
    if (cookieEnvValue.startsWith('/') || cookieEnvValue.includes('.json')) {
      fileLogger.debug(
        `[FileWatching] Cookie value looks like file path, attempting to watch: ${cookieEnvValue}`
      );
      this.watchFile(cookieEnvValue);
    } else {
      fileLogger.debug(
        '[FileWatching] Cookie value looks like JSON string, not watching file'
      );
    }
  }

  /**
   * Watch a file for changes and automatically refresh configuration
   * @param filePath - Path to the file to watch
   */
  private watchFile(filePath: string) {
    // Don't watch the same file twice in this instance
    if (this.fileWatcherState.watchers.has(filePath)) {
      return;
    }

    // In test mode, use mock watchers to avoid system resource issues
    if (testMode) {
      try {
        // In test mode, still validate that the file path could be watched
        // but don't actually create a real watcher

        // Check if the directory exists (basic validation)
        if (!existsSync(dirname(filePath))) {
          throw new Error(`Directory does not exist: ${dirname(filePath)}`);
        }

        // Check if another ConfigManager instance is already watching this file in test mode
        if (mockWatchers.has(filePath)) {
          // Don't create duplicate mock watchers and don't track it in this instance
          fileLogger.debug(
            `File already being watched (test mode): ${filePath}`
          );
          return;
        }

        const watcherConfig: FileWatcherConfig = {
          filePath,
          isActive: true,
          debounceDelay: this.fileWatcherState.defaultDebounceDelay,
        };

        // Store mock watcher globally to prevent duplicates
        mockWatchers.set(filePath, { active: true });
        this.fileWatcherState.watchers.set(filePath, watcherConfig);

        fileLogger.debug(`Started watching file (test mode): ${filePath}`);
      } catch (error) {
        fileLogger.warn(
          `Warning: Failed to watch file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      return;
    }

    // Check if another ConfigManager instance is already watching this file
    let watcher = globalWatcherRegistry.get(filePath);
    let isNewWatcher = false;

    try {
      if (!watcher) {
        // Create new watcher only if none exists globally
        watcher = watch(filePath);
        globalWatcherRegistry.set(filePath, watcher);
        isNewWatcher = true;
      }

      const watcherConfig: FileWatcherConfig = {
        filePath,
        isActive: true,
        debounceDelay: this.fileWatcherState.defaultDebounceDelay,
        watcher, // Store the watcher instance for cleanup
      };

      // Only set up event handlers if this is a new watcher
      if (isNewWatcher) {
        // Handle file events with debouncing
        watcher.on('change', (eventType: FileWatchEvent) => {
          this.handleFileChange(filePath, eventType);
        });

        watcher.on('error', (error: Error) => {
          this.handleWatchError(filePath, error);
        });
      }

      // Store the watcher configuration in this instance
      this.fileWatcherState.watchers.set(filePath, watcherConfig);

      fileLogger.debug(
        `Started watching file: ${filePath} (${isNewWatcher ? 'new watcher' : 'reusing existing watcher'})`
      );
    } catch (error) {
      fileLogger.warn(
        `Warning: Failed to watch file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle file change events with debouncing
   * @param filePath - Path of the changed file
   * @param eventType - Type of file event
   */
  private handleFileChange(filePath: string, eventType: FileWatchEvent) {
    fileLogger.debug(
      `[FileWatching] File change detected: ${filePath} (${eventType})`
    );

    const watcherConfig = this.fileWatcherState.watchers.get(filePath);
    if (!watcherConfig || !watcherConfig.isActive) {
      fileLogger.debug(
        `[FileWatching] No active watcher found for file: ${filePath}`
      );
      return;
    }

    // Handle 'rename' events by recreating the watcher (editors often replace files)
    if (eventType === 'rename') {
      fileLogger.debug(
        `[FileWatching] Rename event detected - recreating watcher for: ${filePath}`
      );
      this.recreateWatcher(filePath, watcherConfig);
    }

    const now = Date.now();
    watcherConfig.lastEventTimestamp = now;

    // Clear any existing debounce timeout
    if (watcherConfig.debounceTimeout) {
      clearTimeout(watcherConfig.debounceTimeout);
      fileLogger.debug(
        `[FileWatching] Cleared previous debounce timeout for: ${filePath}`
      );
    }

    fileLogger.debug(
      `[FileWatching] Setting up debounced refresh (${watcherConfig.debounceDelay}ms) for: ${filePath}`
    );

    // Set up debounced refresh
    watcherConfig.debounceTimeout = setTimeout(async () => {
      // Only refresh if this is still the latest event
      if (watcherConfig.lastEventTimestamp === now) {
        fileLogger.debug(
          `[FileWatching] Debounce timeout triggered, refreshing configuration: ${filePath}`
        );
        const success = await this.refreshConfig();
        fileLogger.debug(
          `[FileWatching] Configuration refresh ${success ? 'succeeded' : 'failed'} due to file change`
        );
      } else {
        fileLogger.debug(
          `[FileWatching] Skipping refresh - newer file change detected: ${filePath}`
        );
      }
    }, watcherConfig.debounceDelay);
  }

  /**
   * Handle file watcher errors
   * @param filePath - Path of the file that had an error
   * @param error - The error that occurred
   */
  private handleWatchError(filePath: string, error: Error) {
    fileLogger.warn(
      `Warning: File watcher error for ${filePath}: ${error.message}. Automatic reloading disabled for this file.`
    );

    // Disable this specific watcher and clean up resources
    const watcherConfig = this.fileWatcherState.watchers.get(filePath);
    if (watcherConfig) {
      watcherConfig.isActive = false;

      // Close the watcher and remove from global registry
      if (watcherConfig.watcher) {
        try {
          watcherConfig.watcher.close();
          globalWatcherRegistry.delete(filePath);
        } catch (_closeError) {
          // Silent cleanup - don't log watcher close errors
        }
      }
    }
  }

  /**
   * Recreate a file watcher after a rename event
   * @param filePath - Path of the file to recreate watcher for
   * @param currentConfig - Current watcher configuration
   */
  private recreateWatcher(filePath: string, currentConfig: FileWatcherConfig) {
    try {
      fileLogger.debug(
        `[FileWatching] Starting watcher recreation for: ${filePath}`
      );

      // Close the existing watcher
      if (currentConfig.watcher) {
        try {
          currentConfig.watcher.close();
          globalWatcherRegistry.delete(filePath);
          fileLogger.debug(
            `[FileWatching] Closed old watcher for: ${filePath}`
          );
        } catch (closeError) {
          fileLogger.debug(
            `[FileWatching] Error closing old watcher (expected): ${closeError instanceof Error ? closeError.message : 'Unknown error'}`
          );
        }
      }

      // Short delay to ensure file operations are complete
      setTimeout(() => {
        try {
          // Check if file exists before recreating watcher
          if (existsSync(filePath)) {
            fileLogger.debug(
              `[FileWatching] File exists, recreating watcher for: ${filePath}`
            );

            // Remove old watcher config
            this.fileWatcherState.watchers.delete(filePath);
            fileLogger.debug(
              `[FileWatching] Removed old watcher config for: ${filePath}`
            );

            // Create new watcher
            this.watchFile(filePath);
            fileLogger.debug(
              `[FileWatching] Successfully recreated watcher for: ${filePath}`
            );
          } else {
            fileLogger.debug(
              `[FileWatching] File no longer exists, not recreating watcher: ${filePath}`
            );
            currentConfig.isActive = false;
          }
        } catch (recreateError) {
          fileLogger.warn(
            `[FileWatching] Error during watcher recreation: ${recreateError instanceof Error ? recreateError.message : 'Unknown error'}`
          );
          currentConfig.isActive = false;
        }
      }, 100); // 100ms delay to ensure file operations are complete
    } catch (error) {
      fileLogger.warn(
        `[FileWatching] Failed to recreate watcher for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      currentConfig.isActive = false;
    }
  }

  /**
   * Clean up all file watchers
   * Should be called on application shutdown
   */
  cleanup() {
    for (const [filePath, watcherConfig] of this.fileWatcherState.watchers) {
      if (watcherConfig.debounceTimeout) {
        clearTimeout(watcherConfig.debounceTimeout);
      }

      // In test mode, just clean up mock watchers
      if (testMode) {
        mockWatchers.delete(filePath);
      } else {
        // Close the file watcher and remove from global registry
        if (watcherConfig.watcher) {
          try {
            watcherConfig.watcher.close();
            globalWatcherRegistry.delete(filePath);
          } catch (_error) {
            // Silent cleanup - don't log watcher close errors
          }
        }
      }

      watcherConfig.isActive = false;

      fileLogger.debug(`Stopped watching file: ${filePath}`);
    }

    this.fileWatcherState.watchers.clear();
    this.fileWatcherState.enabled = false;

    // Unregister this instance from test mode
    if (testMode) {
      configInstances.delete(this);
    }
  }

  /**
   * Get file watcher status for debugging
   * @returns Object containing watcher status information
   */
  getFileWatcherStatus() {
    const status = {
      enabled: this.fileWatcherState.enabled,
      watchedFiles: Array.from(this.fileWatcherState.watchers.keys()),
      activeWatchers: Array.from(this.fileWatcherState.watchers.values())
        .filter((w) => w.isActive)
        .map((w) => w.filePath),
    };
    return status;
  }

  /**
   * Simulate a file change for testing purposes
   * Only works in test mode
   */
  simulateFileChangeForTesting(filePath: string) {
    if (!testMode) {
      throw new Error(
        'simulateFileChangeForTesting can only be used in test mode'
      );
    }

    if (this.fileWatcherState?.watchers?.has(filePath)) {
      this.handleFileChange(filePath, 'change');
    }
  }

  private loadConfig(): z.infer<typeof ConfigSchema> {
    const envConfig = {
      viewport: {
        defaultWidth: this.parseNumber('BROWSERLOOP_DEFAULT_WIDTH', 1280),
        defaultHeight: this.parseNumber('BROWSERLOOP_DEFAULT_HEIGHT', 720),
      },
      screenshot: {
        defaultFormat: this.parseEnum(
          'BROWSERLOOP_DEFAULT_FORMAT',
          ['webp', 'png', 'jpeg'],
          'webp'
        ),
        defaultQuality: this.parseNumber('BROWSERLOOP_DEFAULT_QUALITY', 80),
        defaultTimeout: this.parseNumber('BROWSERLOOP_DEFAULT_TIMEOUT', 30000),
        defaultWaitForNetworkIdle: this.parseBoolean(
          'BROWSERLOOP_DEFAULT_WAIT_NETWORK_IDLE',
          true
        ),
      },
      console: {
        defaultTimeout: this.parseNumber('BROWSERLOOP_CONSOLE_TIMEOUT', 30000),
        defaultSanitize: this.parseBoolean('BROWSERLOOP_SANITIZE_LOGS', true),
        defaultWaitForNetworkIdle: this.parseBoolean(
          'BROWSERLOOP_CONSOLE_WAIT_NETWORK_IDLE',
          true
        ),
        maxLogSize: this.parseNumber('BROWSERLOOP_MAX_LOG_SIZE', 1048576), // 1MB default
        defaultLogLevels: this.parseLogLevels(
          'BROWSERLOOP_CONSOLE_LOG_LEVELS',
          ['log', 'info', 'warn', 'error', 'debug']
        ),
      },
      browser: {
        ...(process.env.BROWSERLOOP_USER_AGENT && {
          userAgent: process.env.BROWSERLOOP_USER_AGENT,
        }),
        retryCount: this.parseNumber('BROWSERLOOP_RETRY_COUNT', 3),
        retryDelay: this.parseNumber('BROWSERLOOP_RETRY_DELAY', 1000),
      },
      authentication: {
        defaultCookies: this.parseDefaultCookies('BROWSERLOOP_DEFAULT_COOKIES'),
      },
      logging: {
        debug: this.parseBoolean('BROWSERLOOP_DEBUG', false),
        ...(process.env.BROWSERLOOP_LOG_FILE && {
          logFile: process.env.BROWSERLOOP_LOG_FILE,
        }),
        enableMetrics: this.parseBoolean('BROWSERLOOP_ENABLE_METRICS', true),
        silent: true, // Always silent for MCP protocol compatibility
      },
      timeouts: {
        browserInit: this.parseNumber(
          'BROWSERLOOP_TIMEOUT_BROWSER_INIT',
          30000
        ),
        navigation: this.parseNumber('BROWSERLOOP_TIMEOUT_NAVIGATION', 30000),
        elementWait: this.parseNumber('BROWSERLOOP_TIMEOUT_ELEMENT_WAIT', 5000),
        screenshot: this.parseNumber('BROWSERLOOP_TIMEOUT_SCREENSHOT', 10000),
        network: this.parseNumber('BROWSERLOOP_TIMEOUT_NETWORK', 5000),
      },
    };

    try {
      return ConfigSchema.parse(envConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
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

  private parseEnum<T extends string>(
    envVar: string,
    validValues: readonly T[],
    defaultValue: T
  ): T {
    const value = process.env[envVar] as T;
    if (!value) return defaultValue;

    return validValues.includes(value) ? value : defaultValue;
  }

  private parseLogLevels(
    envVar: string,
    defaultValue: Array<'log' | 'info' | 'warn' | 'error' | 'debug'>
  ): Array<'log' | 'info' | 'warn' | 'error' | 'debug'> {
    const value = process.env[envVar];
    if (!value) return defaultValue;

    try {
      // Support comma-separated string like "log,warn,error"
      const levels = value
        .split(',')
        .map((level) => level.trim().toLowerCase());
      const validLevels: Array<'log' | 'info' | 'warn' | 'error' | 'debug'> = [
        'log',
        'info',
        'warn',
        'error',
        'debug',
      ];

      const filteredLevels = levels.filter(
        (level): level is 'log' | 'info' | 'warn' | 'error' | 'debug' =>
          validLevels.includes(
            level as 'log' | 'info' | 'warn' | 'error' | 'debug'
          )
      );

      return filteredLevels.length > 0 ? filteredLevels : defaultValue;
    } catch (_error) {
      return defaultValue;
    }
  }

  private parseDefaultCookies(envVar: string): Cookie[] {
    const value = process.env[envVar];
    if (!value) {
      fileLogger.debug('No default cookies configured');
      return [];
    }

    try {
      let cookies: Cookie[] = [];
      let source = '';

      // Check if value looks like a file path (starts with / or contains file extension)
      if (value.startsWith('/') || value.includes('.json')) {
        // Treat as file path - read the file
        try {
          const fileContent = readFileSync(value, 'utf-8');
          cookies = parseCookies(fileContent);
          source = `file: ${value}`;

          fileLogger.debug(
            `Loaded ${cookies.length} default cookies from ${source}`
          );
          fileLogger.debug(
            `Cookie names: ${cookies.map((c) => c.name).join(', ')}`
          );
        } catch (fileError) {
          fileLogger.warn(
            `Warning: Failed to read cookie file ${value}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}. Using no default cookies.`
          );
          return [];
        }
      } else {
        // Treat as JSON string (backward compatibility)
        cookies = parseCookies(value);
        source = 'environment variable JSON';

        fileLogger.debug(
          `Loaded ${cookies.length} default cookies from ${source}`
        );
        fileLogger.debug(
          `Cookie names: ${cookies.map((c) => c.name).join(', ')}`
        );
      }

      return cookies;
    } catch (error) {
      // Log warning but don't fail configuration loading
      fileLogger.warn(
        `Warning: Failed to parse ${envVar}: ${error instanceof Error ? error.message : 'Unknown error'}. Using no default cookies.`
      );
      return [];
    }
  }
}

// Export singleton instance
export const config = new ConfigManager();
