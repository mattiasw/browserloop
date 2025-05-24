/**
 * Configuration options for screenshot capture
 */
export interface ScreenshotOptions {
  /** Target URL to capture */
  url: string;
  /** Viewport width */
  width?: number;
  /** Viewport height */
  height?: number;
  /** Image format (webp or png) */
  format?: 'webp' | 'png';
  /** Image quality (0-100) for WebP */
  quality?: number;
  /** Wait for network idle before capturing */
  waitForNetworkIdle?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Custom user agent string */
  userAgent?: string;
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
    defaultFormat: 'webp' | 'png';
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
  format?: 'webp' | 'png';
  /** Image quality 0-100 for WebP (default: 80) */
  quality?: number;
  /** Wait for network idle before capturing (default: true) */
  waitForNetworkIdle?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Take full page screenshot instead of viewport (default: false) */
  fullPage?: boolean;
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
