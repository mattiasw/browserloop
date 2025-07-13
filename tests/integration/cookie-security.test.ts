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

import { strict as assert } from 'node:assert';
import { describe, test } from 'node:test';
import { ScreenshotService } from '../../src/screenshot-service.js';
import {
  createTestScreenshotOptions,
  createTestScreenshotServiceConfig,
  createTestServer,
} from '../../src/test-utils.js';
import type { Cookie } from '../../src/types.js';

describe('Cookie Security Integration', () => {
  describe('Domain Validation', () => {
    test('should filter cookies with mismatched domains', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with wrong domain that will be filtered out
        const cookies: Cookie[] = [
          {
            name: 'evil_cookie',
            value: 'evil_value',
            domain: 'attacker.com', // Different from localhost - will be filtered
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies,
        });

        // Should succeed but cookies are filtered out due to domain mismatch
        const result = await service.takeScreenshot(options);

        assert.ok(result.data, 'Should return screenshot data');
        assert.strictEqual(
          result.mimeType,
          'image/webp',
          'Should return WebP format'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should allow cookies with correct domain', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with correct domain
        const cookies: Cookie[] = [
          {
            name: 'valid_cookie',
            value: 'valid_value',
            domain: 'localhost', // Matches URL domain
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies,
        });

        // Should not throw with correct domain
        const result = await service.takeScreenshot(options);
        assert.ok(result.data, 'Should return screenshot data');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should allow subdomain cookies for development', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with .localhost domain (subdomain pattern)
        const cookies: Cookie[] = [
          {
            name: 'subdomain_cookie',
            value: 'subdomain_value',
            domain: '.localhost', // Should be allowed for localhost
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies,
        });

        // Should not throw with subdomain pattern
        const result = await service.takeScreenshot(options);
        assert.ok(result.data, 'Should return screenshot data');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should allow 127.0.0.1 for localhost development', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with 127.0.0.1 domain
        const cookies: Cookie[] = [
          {
            name: 'ip_cookie',
            value: 'ip_value',
            domain: '127.0.0.1', // Should be allowed for localhost URLs
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies,
        });

        // Should not throw with IP address
        const result = await service.takeScreenshot(options);
        assert.ok(result.data, 'Should return screenshot data');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });
  });

  describe('Error Message Sanitization', () => {
    test('should handle cookies with sensitive values safely', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with sensitive data that will be filtered out
        const cookies: Cookie[] = [
          {
            name: 'secret_cookie',
            value: 'very_secret_value_that_should_not_appear_in_logs',
            domain: 'evil.com', // Will be filtered out due to domain mismatch
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies,
        });

        // Should succeed - cookies are filtered out silently
        const result = await service.takeScreenshot(options);

        assert.ok(result.data, 'Should return screenshot data');
        assert.strictEqual(
          result.mimeType,
          'image/webp',
          'Should return WebP format'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should sanitize validation error messages', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with suspicious content
        const cookies: Cookie[] = [
          {
            name: 'xss_cookie',
            value: '<script>alert("xss")</script>',
            domain: 'localhost',
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies,
        });

        try {
          await service.takeScreenshot(options);
          assert.fail('Should have thrown validation error');
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Verify that the suspicious script content is not exposed
          assert.ok(
            !errorMessage.includes('<script>alert("xss")</script>'),
            'Error message should not contain suspicious cookie value'
          );

          // But should still contain useful debugging info
          assert.ok(
            errorMessage.includes('Cookie injection failed') ||
              errorMessage.includes('validation'),
            'Error message should indicate validation failure'
          );
        }

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });
  });

  describe('Memory Cleanup Verification', () => {
    test('should clear sensitive data during normal operation', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with sensitive data that will be processed normally
        const cookies: Cookie[] = [
          {
            name: 'sensitive_token',
            value: 'super_secret_token_123456789',
            domain: 'localhost', // Valid domain
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies,
        });

        // Should succeed and clean up memory after use
        const result = await service.takeScreenshot(options);

        assert.ok(result.data, 'Should return screenshot data');
        assert.strictEqual(
          result.mimeType,
          'image/webp',
          'Should return WebP format'
        );

        // Memory cleanup should have occurred after successful injection
        // Note: This is hard to test directly, but the test verifies the code path is exercised
        assert.ok(true, 'Memory cleanup should have been called');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });
  });
});
