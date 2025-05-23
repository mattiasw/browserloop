import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createTestServer,
  createTestScreenshotOptions,
  isValidBase64Image
} from '../../src/test-utils.js';

describe('Test Utils', () => {
  describe('createTestServer', () => {
    it('should create a test server with default port', () => {
      const server = createTestServer();

      assert.strictEqual(server.port, 3000);
      assert.strictEqual(server.url, 'http://localhost:3000');
      assert.strictEqual(typeof server.start, 'function');
      assert.strictEqual(typeof server.stop, 'function');
    });

    it('should create a test server with custom port', () => {
      const server = createTestServer(8080);

      assert.strictEqual(server.port, 8080);
      assert.strictEqual(server.url, 'http://localhost:8080');
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
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      assert.strictEqual(isValidBase64Image(pngBase64, 'image/png'), true);
    });

    it('should reject wrong format headers', () => {
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      assert.strictEqual(isValidBase64Image(pngBase64, 'image/webp'), false);
    });
  });
});
