/**
 * Test utilities for the browserloop project
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScreenshotServiceConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Creates a test configuration for ScreenshotService
 */
export function createTestScreenshotServiceConfig(overrides: Partial<ScreenshotServiceConfig> = {}): ScreenshotServiceConfig {
  return {
    viewport: {
      defaultWidth: 1280,
      defaultHeight: 720,
      ...overrides.viewport
    },
    screenshot: {
      defaultFormat: 'webp',
      defaultQuality: 80,
      defaultTimeout: 30000,
      defaultWaitForNetworkIdle: true,
      ...overrides.screenshot
    },
    browser: {
      retryCount: 3,
      retryDelay: 1000,
      ...overrides.browser
    },
    logging: {
      debug: false,
      enableMetrics: false,
      silent: true,
      ...overrides.logging
    },
    timeouts: {
      browserInit: 30000,
      navigation: 30000,
      elementWait: 5000,
      screenshot: 10000,
      network: 5000,
      ...overrides.timeouts
    }
  };
}

/**
 * Creates a simple test server for testing purposes
 */
export function createTestServer(port = 0) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = req.url || '/';

      // Handle specific routes
      if (url === '/simple.html' || url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Simple Test Page</title></head>
          <body>
            <h1>Test Page</h1>
            <p>This is a simple test page for BrowserLoop</p>
          </body>
          </html>
        `);
        return;
      }

      // Try to serve fixture files
      if (url.endsWith('.html')) {
        const fixturePath = join(__dirname, '..', 'tests', 'fixtures', url.slice(1));
        try {
          const content = await readFile(fixturePath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
          return;
        } catch (error) {
          // File not found, continue to 404
        }
      }

      // 404 for other routes
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  let actualPort: number;

  return {
    get port() {
      return actualPort;
    },
    get url() {
      return `http://localhost:${actualPort}`;
    },
    async start() {
      return new Promise<void>((resolve, reject) => {
        server.listen(port, 'localhost', () => {
          const address = server.address();
          if (address && typeof address === 'object') {
            actualPort = address.port;
            resolve();
          } else {
            reject(new Error('Failed to get server address'));
          }
        });

        server.on('error', reject);
      });
    },
    async stop() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
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
