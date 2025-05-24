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
 * Timeout configuration for different operations
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
