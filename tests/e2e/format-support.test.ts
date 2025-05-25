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

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScreenshotService } from '../../src/screenshot-service.js';
import {
  createTestScreenshotServiceConfig,
  isValidBase64Image,
} from '../../src/test-utils.js';
import type { ScreenshotServiceConfig } from '../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Format Support E2E', () => {
  let server: Server;
  let screenshotService: ScreenshotService;
  const port = 3002;
  const baseUrl = `http://localhost:${port}`;

  function createTestConfig(): ScreenshotServiceConfig {
    return createTestScreenshotServiceConfig({
      screenshot: {
        defaultFormat: 'webp',
        defaultQuality: 80,
        defaultTimeout: 30000,
        defaultWaitForNetworkIdle: true,
      },
    });
  }

  before(async () => {
    // Create test configuration
    const config = createTestConfig();

    screenshotService = new ScreenshotService(config);
    await screenshotService.initialize();

    // Start HTTP server for testing
    server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Format Test Page</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
              color: white;
            }
            .content {
              background: rgba(0,0,0,0.7);
              padding: 20px;
              border-radius: 10px;
            }
          </style>
        </head>
        <body>
          <div class="content">
            <h1>Format Support Test</h1>
            <p>This page tests different image formats: PNG, JPEG, and WebP.</p>
            <div style="width: 200px; height: 100px; background: #ff4757; margin: 10px 0;"></div>
            <div style="width: 200px; height: 100px; background: #2ed573; margin: 10px 0;"></div>
            <div style="width: 200px; height: 100px; background: #3742fa; margin: 10px 0;"></div>
          </div>
        </body>
        </html>
      `);
    });

    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });
  });

  after(async () => {
    if (screenshotService) {
      await screenshotService.cleanup();
    }
    if (server) {
      server.close();
    }
  });

  test('should capture PNG format screenshots', async () => {
    const result = await screenshotService.takeScreenshot({
      url: baseUrl,
      format: 'png',
      width: 800,
      height: 600,
    });

    assert.ok(result.data, 'Screenshot data should exist');
    assert.strictEqual(result.mimeType, 'image/png', 'MIME type should be PNG');
    assert.ok(isValidBase64Image(result.data), 'Should be valid base64 image');
    assert.strictEqual(result.width, 800, 'Width should match request');
    assert.strictEqual(result.height, 600, 'Height should match request');
  });

  test('should capture JPEG format screenshots', async () => {
    const result = await screenshotService.takeScreenshot({
      url: baseUrl,
      format: 'jpeg',
      quality: 85,
      width: 800,
      height: 600,
    });

    assert.ok(result.data, 'Screenshot data should exist');
    assert.strictEqual(
      result.mimeType,
      'image/jpeg',
      'MIME type should be JPEG'
    );
    assert.ok(isValidBase64Image(result.data), 'Should be valid base64 image');
    assert.strictEqual(result.width, 800, 'Width should match request');
    assert.strictEqual(result.height, 600, 'Height should match request');
  });

  test('should capture WebP format screenshots', async () => {
    const result = await screenshotService.takeScreenshot({
      url: baseUrl,
      format: 'webp',
      quality: 80,
      width: 800,
      height: 600,
    });

    assert.ok(result.data, 'Screenshot data should exist');
    assert.strictEqual(
      result.mimeType,
      'image/webp',
      'MIME type should be WebP'
    );
    assert.ok(isValidBase64Image(result.data), 'Should be valid base64 image');
    assert.strictEqual(result.width, 800, 'Width should match request');
    assert.strictEqual(result.height, 600, 'Height should match request');
  });

  test('should handle different quality settings for JPEG', async () => {
    const lowQuality = await screenshotService.takeScreenshot({
      url: baseUrl,
      format: 'jpeg',
      quality: 30,
      width: 400,
      height: 300,
    });

    const highQuality = await screenshotService.takeScreenshot({
      url: baseUrl,
      format: 'jpeg',
      quality: 95,
      width: 400,
      height: 300,
    });

    assert.ok(lowQuality.data, 'Low quality screenshot should exist');
    assert.ok(highQuality.data, 'High quality screenshot should exist');
    assert.strictEqual(
      lowQuality.mimeType,
      'image/jpeg',
      'Low quality should be JPEG'
    );
    assert.strictEqual(
      highQuality.mimeType,
      'image/jpeg',
      'High quality should be JPEG'
    );

    // High quality should generally produce larger files (more base64 data)
    // This is a rough heuristic test
    const lowQualitySize = lowQuality.data.length;
    const highQualitySize = highQuality.data.length;

    // Allow for some variance, but high quality should generally be larger
    assert.ok(
      highQualitySize >= lowQualitySize * 0.8,
      'High quality JPEG should not be significantly smaller than low quality'
    );
  });

  test('should handle different quality settings for WebP', async () => {
    const lowQuality = await screenshotService.takeScreenshot({
      url: baseUrl,
      format: 'webp',
      quality: 40,
      width: 400,
      height: 300,
    });

    const highQuality = await screenshotService.takeScreenshot({
      url: baseUrl,
      format: 'webp',
      quality: 90,
      width: 400,
      height: 300,
    });

    assert.ok(lowQuality.data, 'Low quality WebP screenshot should exist');
    assert.ok(highQuality.data, 'High quality WebP screenshot should exist');
    assert.strictEqual(
      lowQuality.mimeType,
      'image/webp',
      'Low quality should be WebP'
    );
    assert.strictEqual(
      highQuality.mimeType,
      'image/webp',
      'High quality should be WebP'
    );
  });

  test('should support all formats for full page screenshots', async () => {
    const formats: Array<'png' | 'jpeg' | 'webp'> = ['png', 'jpeg', 'webp'];

    for (const format of formats) {
      const result = await screenshotService.takeFullPageScreenshot({
        url: baseUrl,
        format,
        quality: 80,
        width: 600,
        height: 400,
      });

      assert.ok(result.data, `${format} full page screenshot should exist`);
      assert.strictEqual(
        result.mimeType,
        `image/${format}`,
        `MIME type should be ${format}`
      );
      assert.ok(
        isValidBase64Image(result.data),
        `${format} should be valid base64 image`
      );
    }
  });

  test('should support all formats for element screenshots', async () => {
    const formats: Array<'png' | 'jpeg' | 'webp'> = ['png', 'jpeg', 'webp'];

    for (const format of formats) {
      const result = await screenshotService.takeElementScreenshot({
        url: baseUrl,
        format,
        quality: 80,
        width: 600,
        height: 400,
        selector: '.content',
      });

      assert.ok(result.data, `${format} element screenshot should exist`);
      assert.strictEqual(
        result.mimeType,
        `image/${format}`,
        `MIME type should be ${format}`
      );
      assert.ok(
        isValidBase64Image(result.data),
        `${format} should be valid base64 image`
      );

      // Element screenshots should have different dimensions than viewport
      assert.ok(
        result.width > 0 && result.height > 0,
        `${format} element should have valid dimensions`
      );
    }
  });
});
