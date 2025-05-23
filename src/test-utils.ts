/**
 * Test utilities for the browserloop project
 */

/**
 * Creates a simple test server for testing purposes
 */
export function createTestServer(port = 3000) {
  // TODO: Implement simple HTTP server for testing
  return {
    port,
    url: `http://localhost:${port}`,
    start: () => Promise.resolve(),
    stop: () => Promise.resolve(),
  };
}

/**
 * Creates test screenshot options with defaults
 */
export function createTestScreenshotOptions(overrides = {}) {
  return {
    url: 'http://localhost:3000',
    width: 800,
    height: 600,
    format: 'webp' as const,
    quality: 80,
    waitForNetworkIdle: true,
    timeout: 5000,
    ...overrides,
  };
}

/**
 * Validates base64 image data
 */
export function isValidBase64Image(data: string, expectedMimeType?: string) {
  try {
    // Basic base64 validation - check if it contains only valid base64 characters
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
      return false;
    }

    // Try to decode to ensure it's valid base64
    const decoded = Buffer.from(data, 'base64');
    if (decoded.length === 0) return false;

    // Check for image headers if MIME type specified
    if (expectedMimeType === 'image/webp') {
      return data.startsWith('UklGR'); // WebP header in base64
    }
    if (expectedMimeType === 'image/png') {
      return data.startsWith('iVBORw0KGgo'); // PNG header in base64
    }

    return true;
  } catch {
    return false;
  }
}
