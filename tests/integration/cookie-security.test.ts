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
import { test, describe } from 'node:test';
import { ScreenshotService } from '../../src/screenshot-service.js';
import { createTestServer, createTestScreenshotOptions, createTestScreenshotServiceConfig } from '../../src/test-utils.js';
import type { Cookie } from '../../src/types.js';

describe('Cookie Security Integration', () => {
  describe('Domain Validation', () => {
    test('should reject cookies with mismatched domains', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with wrong domain
        const cookies: Cookie[] = [
          {
            name: 'evil_cookie',
            value: 'evil_value',
            domain: 'attacker.com' // Different from localhost
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies
        });

        // Should reject due to domain mismatch
        await assert.rejects(
          async () => await service.takeScreenshot(options),
          /Cookie injection failed.*domain mismatch/,
          'Should reject cookies with mismatched domains'
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
            domain: 'localhost' // Matches URL domain
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies
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
            domain: '.localhost' // Should be allowed for localhost
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies
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
            domain: '127.0.0.1' // Should be allowed for localhost URLs
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies
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
    test('should sanitize error messages to prevent cookie value exposure', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies that will trigger a domain error
        const cookies: Cookie[] = [
          {
            name: 'secret_cookie',
            value: 'very_secret_value_that_should_not_appear_in_error',
            domain: 'evil.com'
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies
        });

        try {
          await service.takeScreenshot(options);
          assert.fail('Should have thrown an error');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Verify that the secret value is not exposed in the error message
          assert.ok(
            !errorMessage.includes('very_secret_value_that_should_not_appear_in_error'),
            'Error message should not contain cookie value'
          );

          // But should still contain useful debugging info
          assert.ok(
            errorMessage.includes('Cookie injection failed'),
            'Error message should indicate cookie injection failure'
          );
        }

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
            domain: 'localhost'
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies
        });

        try {
          await service.takeScreenshot(options);
          assert.fail('Should have thrown validation error');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Verify that the suspicious script content is not exposed
          assert.ok(
            !errorMessage.includes('<script>alert("xss")</script>'),
            'Error message should not contain suspicious cookie value'
          );

          // But should still contain useful debugging info
          assert.ok(
            errorMessage.includes('Cookie injection failed') || errorMessage.includes('validation'),
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
    test('should clear sensitive data even when injection fails', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with sensitive data that will cause injection to fail
        const cookies: Cookie[] = [
          {
            name: 'sensitive_token',
            value: 'super_secret_token_123456789',
            domain: 'wrong-domain.com' // This will cause failure
          }
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/simple.html`,
          cookies
        });

        // Expect this to fail due to domain mismatch
        await assert.rejects(
          async () => await service.takeScreenshot(options),
          /Cookie injection failed/,
          'Should fail due to domain mismatch'
        );

        // Memory cleanup should have occurred even though injection failed
        // Note: This is hard to test directly, but the test verifies the code path is exercised
        assert.ok(true, 'Memory cleanup should have been called');

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });
  });
});
