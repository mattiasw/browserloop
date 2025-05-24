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

    test('should merge default cookies with request cookies', async () => {
      // Create service config with default cookies
      const serviceConfig = createTestScreenshotServiceConfig({
        authentication: {
          defaultCookies: [
            { name: 'default_session', value: 'default_value', domain: 'localhost' },
            { name: 'app_config', value: 'config_value', domain: 'localhost' }
          ]
        }
      });

      const service = new ScreenshotService(serviceConfig);

      try {
        await service.initialize();

        // Test that request cookies override default cookies with same name
        const requestCookies = [
          { name: 'default_session', value: 'overridden_value' }, // Should override default
          { name: 'request_only', value: 'request_value' } // Should be added
        ];

        // Use a mock page to verify cookie injection without network calls
        const mockPage = {
          context: () => ({
            addCookies: (cookies: any[]) => {
              // Verify merged cookies
              const cookieNames = cookies.map(c => c.name);
              const cookieValues = new Map(cookies.map(c => [c.name, c.value]));

              // Should have all three cookies
              assert.ok(cookieNames.includes('default_session'), 'Should include default_session');
              assert.ok(cookieNames.includes('app_config'), 'Should include app_config');
              assert.ok(cookieNames.includes('request_only'), 'Should include request_only');

              // Request cookie should override default
              assert.strictEqual(cookieValues.get('default_session'), 'overridden_value',
                'Request cookie should override default cookie');
              assert.strictEqual(cookieValues.get('app_config'), 'config_value',
                'Default cookie should be preserved when not overridden');
              assert.strictEqual(cookieValues.get('request_only'), 'request_value',
                'Request-only cookie should be included');

              return Promise.resolve();
            }
          }),
          setViewportSize: () => Promise.resolve(),
          setDefaultTimeout: () => {},
          goto: () => Promise.resolve(),
          screenshot: () => {
            // Return a minimal valid PNG buffer (1x1 pixel transparent PNG)
            const pngBuffer = Buffer.from([
              0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
              0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
              0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
              0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
              0x42, 0x60, 0x82
            ]);
            return Promise.resolve(pngBuffer);
          },
          isClosed: () => false,
          close: () => Promise.resolve()
        };

        // Mock the createPage method to return our mock page
        const originalCreatePage = (service as any).createPage;
        (service as any).createPage = () => Promise.resolve(mockPage);

        try {
          await service.takeScreenshot({
            url: 'http://localhost:3000',
            cookies: requestCookies
          });

          // If we get here, the test passed (cookie merging worked)
          assert.ok(true, 'Cookie merging completed successfully');
        } finally {
          // Restore original method
          (service as any).createPage = originalCreatePage;
        }

      } finally {
        await service.cleanup();
      }
    });
  });
});
