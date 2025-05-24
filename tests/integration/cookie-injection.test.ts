import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { ScreenshotService } from '../../src/screenshot-service.js';
import { createTestServer, createTestScreenshotOptions, createTestScreenshotServiceConfig } from '../../src/test-utils.js';
import type { Cookie } from '../../src/types.js';

describe('Cookie Injection Integration', () => {
  describe('Cookie Context Injection', () => {
    test('should inject cookies into browser context before navigation', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create test cookies
        const cookies: Cookie[] = [
          {
            name: 'test_cookie',
            value: 'test_value',
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false
          },
          {
            name: 'auth_token',
            value: 'abc123',
            httpOnly: true,
            secure: false
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies
        });

        // Take screenshot with cookies - should not throw
        const result = await service.takeScreenshot(options);

        // Verify result structure
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(result.timestamp, 'Should return timestamp');
        assert.strictEqual(typeof result.width, 'number', 'Width should be a number');
        assert.strictEqual(typeof result.height, 'number', 'Height should be a number');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should handle cookies as JSON string', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create test cookies as JSON string
        const cookiesJson = JSON.stringify([
          {
            name: 'json_cookie',
            value: 'json_value',
            domain: 'localhost',
            path: '/'
          }
        ]);

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies: cookiesJson
        });

        // Take screenshot with JSON cookies - should not throw
        const result = await service.takeScreenshot(options);

        // Verify result structure
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should handle empty cookies gracefully', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies: []
        });

        // Take screenshot with empty cookies - should not throw
        const result = await service.takeScreenshot(options);

        // Verify result structure
        assert.ok(result.data, 'Should return base64 data');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should auto-derive domain from URL when not specified', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Cookie without domain - should auto-derive from URL
        const cookies: Cookie[] = [
          {
            name: 'auto_domain_cookie',
            value: 'auto_value'
            // No domain specified - should use localhost from URL
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies
        });

        // Take screenshot - should not throw with auto-derived domain
        const result = await service.takeScreenshot(options);

        // Verify result structure
        assert.ok(result.data, 'Should return base64 data');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should handle invalid cookie format gracefully', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies: 'invalid json string'
        });

        // Should throw error for invalid cookie format
        await assert.rejects(
          async () => await service.takeScreenshot(options),
          /Cookie injection failed.*Invalid JSON format/,
          'Should reject invalid cookie JSON'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should work with full page screenshot and cookies', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        const cookies: Cookie[] = [
          {
            name: 'fullpage_cookie',
            value: 'fullpage_value',
            domain: 'localhost',
            path: '/'
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies,
          fullPage: true
        });

        // Take full page screenshot with cookies - should not throw
        const result = await service.takeFullPageScreenshot(options);

        // Verify result structure
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should work with element screenshot and cookies', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        const cookies: Cookie[] = [
          {
            name: 'element_cookie',
            value: 'element_value',
            domain: 'localhost',
            path: '/'
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies,
          selector: 'h1'
        });

        // Take element screenshot with cookies - should not throw
        const result = await service.takeElementScreenshot(options);

        // Verify result structure
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });
  });
});
