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

/**
 * Cookie object structure for browser context injection
 */
export interface Cookie {
  /** Cookie name */
  name: string;
  /** Cookie value */
  value: string;
  /** Cookie domain (optional) */
  domain?: string | undefined;
  /** Cookie path (optional, defaults to '/') */
  path?: string | undefined;
  /** Whether cookie is HTTP-only (optional) */
  httpOnly?: boolean | undefined;
  /** Whether cookie is secure (optional) */
  secure?: boolean | undefined;
  /** Cookie expiration time (optional) */
  expires?: number | undefined;
  /** Cookie same-site policy (optional) */
  sameSite?: 'Strict' | 'Lax' | 'None' | undefined;
}

/**
 * Configuration options for screenshot capture
 */
export interface ScreenshotOptions {
  /** URL to screenshot */
  url: string;
  /** Viewport width (default: 1280) */
  width?: number;
  /** Viewport height (default: 720) */
  height?: number;
  /** Image format (webp, png, or jpeg) */
  format?: 'webp' | 'png' | 'jpeg';
  /** Image quality (0-100) for WebP and JPEG */
  quality?: number;
  /** Wait for network idle before screenshot (default: true) */
  waitForNetworkIdle?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** User agent string (optional) */
  userAgent?: string;
  /** CSS selector for element screenshot (optional) */
  selector?: string;
  /** Cookies for authentication (optional) */
  cookies?: Cookie[] | string;
}

/**
 * Internal screenshot configuration with all resolved properties
 * This is used internally by ScreenshotService after merging defaults
 */
export interface InternalScreenshotConfig {
  /** URL to screenshot */
  url: string;
  /** Viewport width (resolved from defaults) */
  width: number;
  /** Viewport height (resolved from defaults) */
  height: number;
  /** Image format (resolved from defaults) */
  format: 'webp' | 'png' | 'jpeg';
  /** Image quality (resolved from defaults) */
  quality: number;
  /** Wait for network idle before screenshot (resolved from defaults) */
  waitForNetworkIdle: boolean;
  /** Timeout in milliseconds (resolved from defaults) */
  timeout: number;
  /** User agent string (resolved from defaults) */
  userAgent?: string;
  /** CSS selector for element screenshot (optional) */
  selector?: string;
  /** Cookies for authentication (merged and resolved) */
  cookies?: Cookie[] | string | undefined;
}

/**
 * Screenshot capture configuration with retry options
 */
export interface ScreenshotServiceConfig {
  /** Default viewport dimensions */
  viewport: {
    defaultWidth: number;
    defaultHeight: number;
  };
  /** Default screenshot settings */
  screenshot: {
    defaultFormat: 'webp' | 'png' | 'jpeg';
    defaultQuality: number;
    defaultTimeout: number;
    defaultWaitForNetworkIdle: boolean;
  };
  /** Browser configuration */
  browser: {
    userAgent?: string;
    retryCount: number;
    retryDelay: number;
  };
  /** Authentication configuration */
  authentication: {
    defaultCookies: Cookie[];
  };
  /** Logging configuration */
  logging: LoggingConfig;
  /** Timeout configuration */
  timeouts: TimeoutConfig;
}

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  /** Attempt number (1-based) */
  attempt: number;
  /** Maximum number of attempts */
  maxAttempts: number;
  /** Error that caused the retry */
  error: Error;
  /** Delay before this attempt in milliseconds */
  delay: number;
}

/**
 * Screenshot result containing base64 encoded image data
 */
export interface ScreenshotResult {
  /** Base64 encoded image data */
  data: string;
  /** MIME type of the image */
  mimeType: string;
  /** Image dimensions */
  width: number;
  height: number;
  /** Timestamp when screenshot was taken */
  timestamp: number;
}

/**
 * MCP Tool request parameters for screenshot capture
 */
export interface McpScreenshotRequest {
  /** Target URL to capture */
  url: string;
  /** Viewport width (default: 1280) */
  width?: number;
  /** Viewport height (default: 720) */
  height?: number;
  /** Image format (default: webp) */
  format?: 'webp' | 'png' | 'jpeg';
  /** Image quality 0-100 for WebP and JPEG (default: 80) */
  quality?: number;
  /** Wait for network idle before capturing (default: true) */
  waitForNetworkIdle?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Take full page screenshot instead of viewport (default: false) */
  fullPage?: boolean;
  /** CSS selector for element-specific screenshot */
  selector?: string;
  /** Cookies for authentication (optional) */
  cookies?: Cookie[] | string;
}

/**
 * MCP Tool response for screenshot capture
 */
export interface McpScreenshotResponse {
  /** Base64 encoded image data with data URL prefix */
  image: string;
  /** Image metadata */
  metadata: {
    mimeType: string;
    width: number;
    height: number;
    timestamp: number;
    url: string;
    viewport: {
      width: number;
      height: number;
    };
  };
}

export interface ImageProcessingConfig {
  /** Output image format */
  format: 'webp' | 'png' | 'jpeg';
  /** Image quality 0-100 for WebP and JPEG (default: 80) */
  quality?: number;
  /** Viewport width in pixels (200-4000) */
  width?: number;
  /** Viewport height in pixels (200-4000) */
  height?: number;
  /** Wait for network idle before screenshot (default: true) */
  waitForNetworkIdle?: boolean;
  /** Timeout in milliseconds (1000-120000) */
  timeout?: number;
  /** User agent string (optional) */
  userAgent?: string;
  /** CSS selector for element screenshot (optional) */
  selector?: string;
  /** Take full page screenshot instead of viewport */
  fullPage?: boolean;
  /** Cookies for authentication (optional) */
  cookies?: Cookie[] | string;
}

/**
 * Error severity levels for logging and handling
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for better error handling and recovery
 */
export type ErrorCategory =
  | 'network'
  | 'timeout'
  | 'browser_crash'
  | 'invalid_input'
  | 'element_not_found'
  | 'docker'
  | 'resource'
  | 'unknown';

/**
 * Structured error information for logging and handling
 */
export interface BrowserloopError {
  /** Original error */
  originalError: Error;
  /** Error category for recovery strategy */
  category: ErrorCategory;
  /** Severity level */
  severity: ErrorSeverity;
  /** Whether this error type is recoverable */
  isRecoverable: boolean;
  /** Context information */
  context?: {
    url?: string;
    attempt?: number;
    requestId?: string;
    timestamp: number;
  };
}

/**
 * Health check result
 */
export interface HealthCheck {
  /** Overall health status */
  healthy: boolean;
  /** Browser status */
  browser: {
    initialized: boolean;
    connected: boolean;
    lastError?: string;
  };
  /** System resources */
  resources: {
    memoryUsage: number;
    uptime: number;
  };
  /** Last successful operation timestamp */
  lastSuccessfulOperation?: number;
  /** Error count in last hour */
  recentErrorCount: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Enable debug logging */
  debug: boolean;
  /** Log file path (optional, for debugging only) */
  logFile?: string;
  /** Enable error metrics collection */
  enableMetrics: boolean;
  /** Silent mode (no console output in production) */
  silent: boolean;
}

/**
 * Timeout configuration for various operations
 */
export interface TimeoutConfig {
  /** Browser initialization timeout */
  browserInit: number;
  /** Page navigation timeout */
  navigation: number;
  /** Element waiting timeout */
  elementWait: number;
  /** Screenshot capture timeout */
  screenshot: number;
  /** Network request timeout */
  network: number;
}

/**
 * Log context for structured logging
 */
export interface LogContext {
  /** URL being processed */
  url?: string;
  /** Request ID for tracking */
  requestId?: string;
  /** Attempt number for retries */
  attempt?: number;
  /** Maximum attempts allowed */
  maxAttempts?: number;
  /** Error message */
  error?: string;
  /** Reason for operation */
  reason?: string;
  /** Delay in milliseconds */
  delay?: number;
  /** Timestamp of operation */
  timestamp?: number;
  /** Browser status */
  browserStatus?: string;
  /** Memory usage information */
  memoryUsage?: number;
  /** Additional context data - allows common serializable values including arrays */
  [key: string]: unknown;
}

/**
 * Extended screenshot options that includes cookies with proper typing
 * Used in MCP server to avoid type casting
 */
export interface ScreenshotOptionsWithCookies extends ScreenshotOptions {
  /** Cookies for authentication (properly typed) */
  cookies?: Cookie[];
  /** Full page screenshot flag */
  fullPage?: boolean;
}

/**
 * Mock cookie interface for testing
 * Provides proper typing for test mock objects
 */
export interface MockCookie {
  /** Cookie name */
  name: string;
  /** Cookie value */
  value: string;
  /** Cookie domain (optional) */
  domain?: string;
  /** Cookie path (optional) */
  path?: string;
  /** Whether cookie is HTTP-only (optional) */
  httpOnly?: boolean;
  /** Whether cookie is secure (optional) */
  secure?: boolean;
  /** Cookie expiration time (optional, supports -1 for session cookies) */
  expires?: number;
  /** Cookie same-site policy (optional) */
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Mock page interface for testing browser interactions
 * Provides proper typing for test mock objects
 */
export interface MockPage {
  /** Mock browser context */
  context: () => MockBrowserContext;
  /** Mock viewport setting */
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
  /** Mock timeout setting */
  setDefaultTimeout: (timeout: number) => void;
  /** Mock navigation */
  goto: (url: string) => Promise<void>;
  /** Mock screenshot capture */
  screenshot: (options?: unknown) => Promise<Buffer>;
  /** Mock page status */
  isClosed: () => boolean;
  /** Mock page cleanup */
  close: () => Promise<void>;
}

/**
 * Mock browser context interface for testing
 * Provides proper typing for cookie injection tests
 */
export interface MockBrowserContext {
  /** Mock cookie addition */
  addCookies: (cookies: MockCookie[]) => Promise<void>;
}

/**
 * File watcher configuration and state
 */
export interface FileWatcherConfig {
  /** File path being watched */
  filePath: string;
  /** Whether the watcher is currently active */
  isActive: boolean;
  /** Debounce delay in milliseconds */
  debounceDelay: number;
  /** Last event timestamp for debouncing */
  lastEventTimestamp?: number;
  /** Debounce timeout handle */
  debounceTimeout?: NodeJS.Timeout;
  /** The actual file watcher instance for cleanup */
  watcher?: import('node:fs').FSWatcher;
}

/**
 * File watch event types
 */
export type FileWatchEvent = 'change' | 'rename';

/**
 * File watcher state management
 */
export interface FileWatcherState {
  /** Map of file paths to watcher configurations */
  watchers: Map<string, FileWatcherConfig>;
  /** Whether file watching is enabled globally */
  enabled: boolean;
  /** Global debounce delay for all watchers */
  defaultDebounceDelay: number;
}

/**
 * Console log entry with metadata
 */
export interface ConsoleLogEntry {
  /** Log timestamp in milliseconds since epoch */
  timestamp: number;
  /** Log level (log, info, warn, error, debug) */
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  /** Main log message */
  message: string;
  /** Additional arguments passed to console method */
  args: string[];
}

/**
 * Console log reading options
 */
export interface ConsoleLogOptions {
  /** URL to read console logs from */
  url: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Whether to sanitize sensitive data (default: true) */
  sanitize?: boolean;
  /** Cookies for authentication (optional) */
  cookies?: Cookie[] | string;
  /** User agent string (optional) */
  userAgent?: string;
  /** Wait for network idle before finishing collection (default: true) */
  waitForNetworkIdle?: boolean;
  /** Log levels to capture (default: ['log', 'info', 'warn', 'error', 'debug']) */
  logLevels?: Array<'log' | 'info' | 'warn' | 'error' | 'debug'>;
}

/**
 * Console log reading result
 */
export interface ConsoleLogResult {
  /** Array of console log entries */
  logs: ConsoleLogEntry[];
  /** URL that was monitored */
  url: string;
  /** Timestamp when collection started */
  startTimestamp: number;
  /** Timestamp when collection ended */
  endTimestamp: number;
  /** Total number of logs collected */
  totalLogs: number;
}

/**
 * Internal console log configuration with all resolved properties
 */
export interface InternalConsoleLogConfig {
  /** URL to monitor */
  url: string;
  /** Timeout in milliseconds (resolved from defaults) */
  timeout: number;
  /** Whether to sanitize sensitive data (resolved from defaults) */
  sanitize: boolean;
  /** Cookies for authentication (merged and resolved) */
  cookies?: Cookie[] | string | undefined;
  /** User agent string (resolved from defaults) */
  userAgent?: string;
  /** Wait for network idle before finishing collection (resolved from defaults) */
  waitForNetworkIdle: boolean;
  /** Log levels to capture (resolved from defaults) */
  logLevels: Array<'log' | 'info' | 'warn' | 'error' | 'debug'>;
}

/**
 * Console log service configuration
 */
export interface ConsoleLogServiceConfig {
  /** Default console log settings */
  console: {
    defaultTimeout: number;
    defaultSanitize: boolean;
    defaultWaitForNetworkIdle: boolean;
    maxLogSize: number;
    defaultLogLevels: Array<'log' | 'info' | 'warn' | 'error' | 'debug'>;
  };
  /** Browser configuration (shared with screenshot service) */
  browser: {
    userAgent?: string;
    retryCount: number;
    retryDelay: number;
  };
  /** Authentication configuration (shared) */
  authentication: {
    defaultCookies: Cookie[];
  };
  /** Logging configuration (shared) */
  logging: LoggingConfig;
  /** Timeout configuration (shared) */
  timeouts: TimeoutConfig;
}
