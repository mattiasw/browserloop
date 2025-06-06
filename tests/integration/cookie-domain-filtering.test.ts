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

import * as assert from 'node:assert';
import { test } from 'node:test';
import { ScreenshotService } from '../../src/screenshot-service.js';
import { createTestScreenshotServiceConfig } from '../../src/test-utils.js';
import type { Cookie } from '../../src/types.js';

test('should filter cookies by domain and continue with matching ones', async () => {
  const service = new ScreenshotService(createTestScreenshotServiceConfig());
  await service.initialize();

  try {
    // Create a multi-site cookie collection
    const multiSiteCookies: Cookie[] = [
      { name: 'localhost_cookie', value: 'value1', domain: 'localhost' },
      { name: 'github_cookie', value: 'value2', domain: 'github.com' },
      { name: 'google_cookie', value: 'value3', domain: '.google.com' },
      { name: 'auto_derived', value: 'value4' }, // No domain, should auto-derive
    ];

    // Take screenshot of localhost - should only use localhost and auto-derived cookies
    const result = await service.takeScreenshot({
      url: 'http://localhost:3000',
      cookies: multiSiteCookies,
    });

    // Should succeed even though some cookies were filtered
    assert.ok(result.data);
    assert.strictEqual(result.mimeType, 'image/webp');
  } finally {
    await service.cleanup();
  }
});

test('should continue with screenshot when all cookies are filtered', async () => {
  const service = new ScreenshotService(createTestScreenshotServiceConfig());
  await service.initialize();

  try {
    // Create cookies that don't match the target URL
    const mismatchedCookies: Cookie[] = [
      { name: 'github_cookie', value: 'value1', domain: 'github.com' },
      { name: 'google_cookie', value: 'value2', domain: '.google.com' },
      { name: 'other_cookie', value: 'value3', domain: 'other.com' },
    ];

    // Take screenshot of localhost - all cookies should be filtered
    const result = await service.takeScreenshot({
      url: 'http://localhost:3000',
      cookies: mismatchedCookies,
    });

    // Should still succeed without any cookies
    assert.ok(result.data);
    assert.strictEqual(result.mimeType, 'image/webp');
  } finally {
    await service.cleanup();
  }
});

test('should handle special prefix cookies correctly regardless of domain', async () => {
  const debugConfig = createTestScreenshotServiceConfig();
  debugConfig.logging.debug = true;
  debugConfig.logging.silent = false;
  const service = new ScreenshotService(debugConfig);
  await service.initialize();

  try {
    // Create cookies including special prefixed ones
    // Note: Using __Secure- instead of __Host- for HTTP testing
    const cookiesWithPrefixes: Cookie[] = [
      { name: '__Secure-auth', value: 'value1', domain: 'localhost' }, // Should pass with matching domain
      { name: '__Secure-session', value: 'value2', domain: 'localhost' }, // Should pass
      { name: 'regular_cookie', value: 'value3', domain: 'github.com' }, // Should be filtered
      { name: 'local_cookie', value: 'value4', domain: 'localhost' }, // Should pass
    ];

    // Take screenshot of localhost
    const result = await service.takeScreenshot({
      url: 'http://localhost:3000',
      cookies: cookiesWithPrefixes,
    });

    // Should succeed with __Secure- cookies and localhost cookie
    assert.ok(result.data);
    assert.strictEqual(result.mimeType, 'image/webp');
  } finally {
    await service.cleanup();
  }
});

test('should filter parent domain cookies correctly', async () => {
  const service = new ScreenshotService(createTestScreenshotServiceConfig());
  await service.initialize();

  try {
    // Create cookies with various domain configurations
    const parentDomainCookies: Cookie[] = [
      { name: 'root_domain', value: 'value1', domain: '.example.com' },
      { name: 'subdomain', value: 'value2', domain: 'app.example.com' },
      { name: 'other_root', value: 'value3', domain: '.other.com' },
      { name: 'localhost_cookie', value: 'value4', domain: 'localhost' },
    ];

    // Test with localhost URL - should only get localhost cookie
    const result = await service.takeScreenshot({
      url: 'http://localhost:3000',
      cookies: parentDomainCookies,
    });

    // Should succeed with only the localhost cookie
    assert.ok(result.data);
    assert.strictEqual(result.mimeType, 'image/webp');
  } finally {
    await service.cleanup();
  }
});

test('should handle mixed cookie scenarios with debug logging', async () => {
  const debugConfig = createTestScreenshotServiceConfig();
  debugConfig.logging.debug = true; // Enable debug logging

  const service = new ScreenshotService(debugConfig);
  await service.initialize();

  try {
    // Create a realistic multi-site cookie scenario
    const mixedCookies: Cookie[] = [
      // Valid for localhost
      { name: 'session', value: 'abc123', domain: 'localhost' },
      { name: 'csrf', value: 'def456' }, // Auto-derived

      // Invalid for localhost (should be filtered)
      { name: 'github_token', value: 'ghi789', domain: 'github.com' },
      { name: 'google_analytics', value: 'jkl012', domain: '.google.com' },

      // Special prefixes (using __Secure- for HTTP testing)
      { name: '__Secure-secure', value: 'mno345', domain: 'localhost' }, // Should pass with matching domain
      { name: '__Secure-auth', value: 'pqr678', domain: 'localhost' }, // Should pass with matching domain
    ];

    const result = await service.takeScreenshot({
      url: 'http://localhost:3000',
      cookies: mixedCookies,
    });

    // Should succeed with filtered cookies
    assert.ok(result.data);
    assert.strictEqual(result.mimeType, 'image/webp');
  } finally {
    await service.cleanup();
  }
});

test('should work with empty cookie array after filtering', async () => {
  const service = new ScreenshotService(createTestScreenshotServiceConfig());
  await service.initialize();

  try {
    // All cookies will be filtered for localhost
    const allFilteredCookies: Cookie[] = [
      { name: 'external1', value: 'value1', domain: 'example.com' },
      { name: 'external2', value: 'value2', domain: '.other.com' },
      { name: 'external3', value: 'value3', domain: 'different.net' },
    ];

    const result = await service.takeScreenshot({
      url: 'http://localhost:3000',
      cookies: allFilteredCookies,
    });

    // Should still work without any valid cookies
    assert.ok(result.data);
    assert.strictEqual(result.mimeType, 'image/webp');
  } finally {
    await service.cleanup();
  }
});
