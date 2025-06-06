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

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createTestScreenshotOptions,
  createTestServer,
  isValidBase64Image,
} from '../../src/test-utils.js';

describe('Test Utils', () => {
  describe('createTestServer', () => {
    it('should create a test server and start it', async () => {
      const server = createTestServer();

      // Should have methods before starting
      assert.strictEqual(typeof server.start, 'function');
      assert.strictEqual(typeof server.stop, 'function');

      // Start the server
      await server.start();

      // Should have port and URL after starting
      assert.strictEqual(typeof server.port, 'number');
      assert.ok(server.port > 0, 'Port should be positive number');
      assert.strictEqual(server.url, `http://localhost:${server.port}`);

      // Clean up
      await server.stop();
    });

    it('should create a test server with custom port', async () => {
      const server = createTestServer(8080);

      await server.start();

      // When custom port is specified, it should be used
      assert.strictEqual(server.port, 8080);
      assert.strictEqual(server.url, 'http://localhost:8080');

      await server.stop();
    });

    it('should serve basic HTML content', async () => {
      const server = createTestServer();
      await server.start();

      try {
        // Test that we can make a request to the server
        const response = await fetch(`${server.url}/`);
        assert.strictEqual(response.status, 200);

        const content = await response.text();
        assert.ok(content.includes('Test Page'), 'Should serve HTML content');
      } finally {
        await server.stop();
      }
    });
  });

  describe('createTestScreenshotOptions', () => {
    it('should create default screenshot options', () => {
      const options = createTestScreenshotOptions();

      assert.strictEqual(options.url, 'http://localhost:3000');
      assert.strictEqual(options.width, 800);
      assert.strictEqual(options.height, 600);
      assert.strictEqual(options.format, 'webp');
      assert.strictEqual(options.quality, 80);
      assert.strictEqual(options.waitForNetworkIdle, true);
      assert.strictEqual(options.timeout, 5000);
    });

    it('should override default options', () => {
      const options = createTestScreenshotOptions({
        width: 1200,
        format: 'png',
        quality: 90,
      });

      assert.strictEqual(options.width, 1200);
      assert.strictEqual(options.format, 'png');
      assert.strictEqual(options.quality, 90);
      // Non-overridden values should remain default
      assert.strictEqual(options.height, 600);
      assert.strictEqual(options.url, 'http://localhost:3000');
    });
  });

  describe('isValidBase64Image', () => {
    it('should validate basic base64 strings', () => {
      const validBase64 = Buffer.from('test').toString('base64');
      assert.strictEqual(isValidBase64Image(validBase64), true);
    });

    it('should reject empty base64 strings', () => {
      assert.strictEqual(isValidBase64Image(''), false);
    });

    it('should reject invalid base64 strings', () => {
      assert.strictEqual(isValidBase64Image('invalid-base64!@#'), false);
    });

    it('should validate WebP headers', () => {
      // Mock WebP header in base64
      const webpBase64 = 'UklGRgAAAFdFQlA='; // Simple WebP header
      assert.strictEqual(isValidBase64Image(webpBase64, 'image/webp'), true);
    });

    it('should validate PNG headers', () => {
      // Mock PNG header in base64
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      assert.strictEqual(isValidBase64Image(pngBase64, 'image/png'), true);
    });

    it('should reject wrong format headers', () => {
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      assert.strictEqual(isValidBase64Image(pngBase64, 'image/webp'), false);
    });
  });
});
