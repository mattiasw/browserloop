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
