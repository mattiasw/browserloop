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
  isValidBase64Image,
} from '../../src/test-utils.js';
import type { Cookie } from '../../src/types.js';

describe('Authentication Scenarios E2E', () => {
  describe('Authentication Required Page Tests', () => {
    test('should capture screenshot without cookies (shows unauthenticated state)', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Use the auth-required.html fixture we created
        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/auth-required.html`,
          // No cookies - should show unauthenticated state
        });

        const result = await service.takeScreenshot(options);

        // Verify screenshot was taken successfully
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(
          isValidBase64Image(result.data, 'webp'),
          'Should be valid WebP image'
        );
        assert.strictEqual(
          result.mimeType,
          'image/webp',
          'Should return WebP MIME type'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should capture screenshot with authentication cookies', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create authentication cookies
        const authCookies: Cookie[] = [
          {
            name: 'session_id',
            value: 'test_session_12345',
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
          },
          {
            name: 'auth_token',
            value: 'bearer_token_abcdef',
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            secure: false,
          },
          {
            name: 'user_role',
            value: 'admin',
            domain: 'localhost',
            path: '/',
          },
        ];

        // Use the auth-required.html fixture - it will show authenticated state
        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/auth-required.html`,
          cookies: authCookies,
        });

        const result = await service.takeScreenshot(options);

        // Verify screenshot was taken successfully
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(
          isValidBase64Image(result.data, 'webp'),
          'Should be valid WebP image'
        );
        assert.strictEqual(
          result.mimeType,
          'image/webp',
          'Should return WebP MIME type'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should capture screenshot with complex authentication cookies', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create comprehensive authentication cookies
        const complexAuthCookies: Cookie[] = [
          {
            name: 'session_id',
            value: `sess_${Date.now()}`,
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
          },
          {
            name: 'csrf_token',
            value: `csrf_${Math.random().toString(36).substr(2, 16)}`,
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
          },
          {
            name: 'remember_me',
            value: 'true',
            domain: 'localhost',
            path: '/',
            expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
          },
          {
            name: 'user_role',
            value: 'premium_user',
            domain: 'localhost',
            path: '/',
          },
          {
            name: 'preferences',
            value: JSON.stringify({ theme: 'dark', lang: 'en' }),
            domain: 'localhost',
            path: '/',
          },
        ];

        // Use the multi-domain-auth.html fixture for complex scenarios
        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/multi-domain-auth.html`,
          cookies: complexAuthCookies,
        });

        const result = await service.takeScreenshot(options);

        // Verify screenshot was taken successfully
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(
          isValidBase64Image(result.data, 'webp'),
          'Should be valid WebP image'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });
  });

  describe('Multi-Domain Authentication Tests', () => {
    test('should handle localhost domain authentication', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        const localhostCookies: Cookie[] = [
          {
            name: 'session_id',
            value: 'localhost_session_123',
            // Domain will be auto-derived as localhost
          },
          {
            name: 'auth_token',
            value: 'localhost_token_456',
            domain: 'localhost',
            path: '/',
          },
        ];

        // Use multi-domain fixture which shows domain information
        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/multi-domain-auth.html`,
          cookies: localhostCookies,
        });

        const result = await service.takeScreenshot(options);

        // Verify screenshot was taken successfully
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(
          isValidBase64Image(result.data, 'webp'),
          'Should be valid WebP image'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should handle domain validation correctly', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Test with cookies that have explicit localhost domain
        const domainCookies: Cookie[] = [
          {
            name: 'domain_test',
            value: 'domain_value_123',
            domain: 'localhost',
            path: '/',
          },
          {
            name: 'subdomain_test',
            value: 'subdomain_value_456',
            domain: '.localhost', // Subdomain pattern
            path: '/',
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/multi-domain-auth.html`,
          cookies: domainCookies,
        });

        const result = await service.takeScreenshot(options);

        // Verify screenshot was taken successfully with domain validation
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(
          isValidBase64Image(result.data, 'webp'),
          'Should be valid WebP image'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });
  });

  describe('Authentication Error Scenarios', () => {
    test('should handle expired authentication gracefully', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with expired timestamp
        const expiredAuthCookies: Cookie[] = [
          {
            name: 'session_id',
            value: 'valid_session_123',
            domain: 'localhost',
            path: '/',
          },
          {
            name: 'expired_token',
            value: 'expired_token_456',
            domain: 'localhost',
            path: '/',
            expires: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/auth-required.html`,
          cookies: expiredAuthCookies,
        });

        const result = await service.takeScreenshot(options);

        // Verify screenshot was taken successfully even with expired cookies
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(
          isValidBase64Image(result.data, 'webp'),
          'Should be valid WebP image'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should handle authentication failure domain mismatch', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies with wrong domain that should be filtered out
        const invalidDomainCookies: Cookie[] = [
          {
            name: 'invalid_session',
            value: 'session_value_123',
            domain: 'example.com', // Wrong domain - will be filtered
            path: '/',
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/auth-required.html`,
          cookies: invalidDomainCookies,
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
  });

  describe('Real-World Authentication Patterns', () => {
    test('should handle JWT-style authentication tokens', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create JWT-style authentication
        const jwtCookies: Cookie[] = [
          {
            name: 'jwt_token',
            value:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            secure: false,
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/auth-required.html`,
          cookies: jwtCookies,
        });

        const result = await service.takeScreenshot(options);

        // Verify screenshot was taken successfully
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(
          isValidBase64Image(result.data, 'webp'),
          'Should be valid WebP image'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should handle session-based authentication with CSRF protection', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create session + CSRF cookies
        const sessionCsrfCookies: Cookie[] = [
          {
            name: 'PHPSESSID',
            value: `sess_${Math.random().toString(36).substr(2, 26)}`,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            secure: false,
          },
          {
            name: 'csrf_token',
            value: `csrf_${Math.random().toString(36).substr(2, 32)}`,
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
          },
        ];

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/multi-domain-auth.html`,
          cookies: sessionCsrfCookies,
        });

        const result = await service.takeScreenshot(options);

        // Verify screenshot was taken successfully
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(
          isValidBase64Image(result.data, 'webp'),
          'Should be valid WebP image'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });

    test('should handle JSON string cookie format', async () => {
      const serviceConfig = createTestScreenshotServiceConfig();
      const service = new ScreenshotService(serviceConfig);

      await service.initialize();

      try {
        const testServer = await createTestServer();
        await testServer.start();
        const port = testServer.port;

        // Create cookies as JSON string (common format for AI tools)
        const cookiesJson = JSON.stringify([
          {
            name: 'json_session',
            value: 'json_session_value_123',
            domain: 'localhost',
            path: '/',
          },
          {
            name: 'json_auth',
            value: 'json_auth_token_456',
            httpOnly: true,
          },
        ]);

        const options = createTestScreenshotOptions({
          url: `http://localhost:${port}/auth-required.html`,
          cookies: cookiesJson,
        });

        const result = await service.takeScreenshot(options);

        // Verify screenshot was taken successfully with JSON string cookies
        assert.ok(result.data, 'Should return base64 data');
        assert.ok(result.mimeType, 'Should return MIME type');
        assert.ok(
          isValidBase64Image(result.data, 'webp'),
          'Should be valid WebP image'
        );

        await testServer.stop();
      } finally {
        await service.cleanup();
      }
    });
  });
});
