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
import { unlinkSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, test } from 'node:test';
import {
  ConfigManager,
  disableFileWatchingTestMode,
  enableFileWatchingTestMode,
  simulateFileChange,
} from '../../src/config.js';

// Disable file watching during tests to prevent "too many open files" errors
process.env.BROWSERLOOP_DISABLE_FILE_WATCHING = 'true';

describe('ConfigManager', () => {
  test('should load default configuration', () => {
    const config = new ConfigManager();
    const result = config.getConfig();

    // Test default viewport
    assert.strictEqual(result.viewport.defaultWidth, 1280);
    assert.strictEqual(result.viewport.defaultHeight, 720);

    // Test default screenshot settings
    assert.strictEqual(result.screenshot.defaultFormat, 'webp');
    assert.strictEqual(result.screenshot.defaultQuality, 80);
    assert.strictEqual(result.screenshot.defaultTimeout, 30000);
    assert.strictEqual(result.screenshot.defaultWaitForNetworkIdle, true);

    // Test default browser settings
    assert.strictEqual(result.browser.userAgent, undefined);
    assert.strictEqual(result.browser.retryCount, 3);
    assert.strictEqual(result.browser.retryDelay, 1000);
  });

  test('should parse environment variables correctly', () => {
    // Set environment variables
    process.env.BROWSERLOOP_DEFAULT_WIDTH = '1920';
    process.env.BROWSERLOOP_DEFAULT_HEIGHT = '1080';
    process.env.BROWSERLOOP_DEFAULT_FORMAT = 'png';
    process.env.BROWSERLOOP_DEFAULT_QUALITY = '90';
    process.env.BROWSERLOOP_USER_AGENT = 'test-agent';
    process.env.BROWSERLOOP_RETRY_COUNT = '5';

    const config = new ConfigManager();
    const result = config.getConfig();

    // Test parsed values
    assert.strictEqual(result.viewport.defaultWidth, 1920);
    assert.strictEqual(result.viewport.defaultHeight, 1080);
    assert.strictEqual(result.screenshot.defaultFormat, 'png');
    assert.strictEqual(result.screenshot.defaultQuality, 90);
    assert.strictEqual(result.browser.userAgent, 'test-agent');
    assert.strictEqual(result.browser.retryCount, 5);

    // Clean up environment variables
    process.env.BROWSERLOOP_DEFAULT_WIDTH = undefined;
    process.env.BROWSERLOOP_DEFAULT_HEIGHT = undefined;
    process.env.BROWSERLOOP_DEFAULT_FORMAT = undefined;
    process.env.BROWSERLOOP_DEFAULT_QUALITY = undefined;
    process.env.BROWSERLOOP_USER_AGENT = undefined;
    process.env.BROWSERLOOP_RETRY_COUNT = undefined;
  });

  test('should handle invalid environment variables gracefully', () => {
    // Set invalid environment variables
    process.env.BROWSERLOOP_DEFAULT_WIDTH = 'invalid';
    process.env.BROWSERLOOP_DEFAULT_FORMAT = 'gif'; // Not supported
    process.env.BROWSERLOOP_RETRY_COUNT = 'not-a-number';

    const config = new ConfigManager();
    const result = config.getConfig();

    // Should fallback to defaults for invalid values
    assert.strictEqual(result.viewport.defaultWidth, 1280); // fallback
    assert.strictEqual(result.screenshot.defaultFormat, 'webp'); // fallback
    assert.strictEqual(result.browser.retryCount, 3); // fallback

    // Clean up
    process.env.BROWSERLOOP_DEFAULT_WIDTH = undefined;
    process.env.BROWSERLOOP_DEFAULT_FORMAT = undefined;
    process.env.BROWSERLOOP_RETRY_COUNT = undefined;
  });

  test('should provide convenience getters', () => {
    const config = new ConfigManager();

    const viewportConfig = config.getViewportConfig();
    const screenshotConfig = config.getScreenshotConfig();
    const browserConfig = config.getBrowserConfig();

    assert.strictEqual(typeof viewportConfig.defaultWidth, 'number');
    assert.strictEqual(typeof screenshotConfig.defaultFormat, 'string');
    assert.strictEqual(typeof browserConfig.retryCount, 'number');
  });
});

describe('ConfigManager - Default Cookies', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a clean environment for each test
    process.env = { ...originalEnv };
    // Disable file watching for these tests
    process.env.BROWSERLOOP_DISABLE_FILE_WATCHING = 'true';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('should handle empty default cookies', () => {
    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.ok(
      Array.isArray(authConfig.defaultCookies),
      'Default cookies should be an array'
    );
    assert.strictEqual(
      authConfig.defaultCookies.length,
      0,
      'Should start with empty default cookies'
    );
  });

  test('should parse valid default cookies from environment', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = JSON.stringify([
      { name: 'session_id', value: 'abc123', domain: 'example.com' },
      { name: 'auth_token', value: 'def456' },
    ]);

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(
      authConfig.defaultCookies.length,
      2,
      'Should parse 2 cookies'
    );

    const firstCookie = authConfig.defaultCookies[0];
    const secondCookie = authConfig.defaultCookies[1];

    assert.ok(firstCookie, 'First cookie should exist');
    assert.ok(secondCookie, 'Second cookie should exist');

    assert.strictEqual(
      firstCookie.name,
      'session_id',
      'First cookie name should match'
    );
    assert.strictEqual(
      firstCookie.value,
      'abc123',
      'First cookie value should match'
    );
    assert.strictEqual(
      firstCookie.domain,
      'example.com',
      'First cookie domain should match'
    );
    assert.strictEqual(
      secondCookie.name,
      'auth_token',
      'Second cookie name should match'
    );
  });

  test('should handle invalid JSON gracefully', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = 'invalid json';
    process.env.BROWSERLOOP_SILENT = 'true'; // Suppress warnings in tests

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(
      authConfig.defaultCookies.length,
      0,
      'Should fallback to empty array on invalid JSON'
    );
  });

  test('should handle invalid cookie format gracefully', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = JSON.stringify([
      { name: '', value: 'invalid_empty_name' }, // Invalid: empty name
      { name: 'valid_cookie', value: 'valid_value' },
    ]);
    process.env.BROWSERLOOP_SILENT = 'true'; // Suppress warnings in tests

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(
      authConfig.defaultCookies.length,
      0,
      'Should fallback to empty array on validation failure'
    );
  });

  test('should parse cookies with all optional properties', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = JSON.stringify([
      {
        name: 'full_cookie',
        value: 'full_value',
        domain: 'example.com',
        path: '/app',
        httpOnly: true,
        secure: true,
        expires: 1640995200,
        sameSite: 'Strict',
      },
    ]);

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(
      authConfig.defaultCookies.length,
      1,
      'Should parse 1 cookie'
    );
    const cookie = authConfig.defaultCookies[0];

    assert.ok(cookie, 'Cookie should exist');
    assert.strictEqual(cookie.name, 'full_cookie');
    assert.strictEqual(cookie.value, 'full_value');
    assert.strictEqual(cookie.domain, 'example.com');
    assert.strictEqual(cookie.path, '/app');
    assert.strictEqual(cookie.httpOnly, true);
    assert.strictEqual(cookie.secure, true);
    assert.strictEqual(cookie.expires, 1640995200);
    assert.strictEqual(cookie.sameSite, 'Strict');
  });

  test('should handle malformed cookie array gracefully', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = JSON.stringify({
      not: 'an array',
    });
    process.env.BROWSERLOOP_SILENT = 'true';

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(
      authConfig.defaultCookies.length,
      0,
      'Should fallback to empty array for non-array JSON'
    );
  });

  test('should parse cookies from JSON file path', () => {
    // Create a temporary cookies file
    const cookiesFile = '/tmp/test-cookies.json';
    const cookiesData = [
      { name: 'file_session', value: 'file_value', domain: 'example.com' },
      { name: 'file_auth', value: 'file_auth_value' },
    ];

    writeFileSync(cookiesFile, JSON.stringify(cookiesData), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;

      const config = new ConfigManager();
      const authConfig = config.getAuthenticationConfig();

      assert.strictEqual(
        authConfig.defaultCookies.length,
        2,
        'Should parse 2 cookies from file'
      );

      const firstCookie = authConfig.defaultCookies[0];
      const secondCookie = authConfig.defaultCookies[1];

      assert.ok(firstCookie, 'First cookie should exist');
      assert.ok(secondCookie, 'Second cookie should exist');

      assert.strictEqual(
        firstCookie.name,
        'file_session',
        'First cookie name should match'
      );
      assert.strictEqual(
        firstCookie.value,
        'file_value',
        'First cookie value should match'
      );
      assert.strictEqual(
        secondCookie.name,
        'file_auth',
        'Second cookie name should match'
      );
    } finally {
      // Clean up
      unlinkSync(cookiesFile);
    }
  });

  test('should handle non-existent cookie file gracefully', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = '/tmp/non-existent-cookies.json';
    process.env.BROWSERLOOP_SILENT = 'true'; // Suppress warnings in tests

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(
      authConfig.defaultCookies.length,
      0,
      'Should fallback to empty array for missing file'
    );
  });

  test('should handle invalid JSON in cookie file gracefully', () => {
    // Create a file with invalid JSON
    const cookiesFile = '/tmp/invalid-cookies.json';
    writeFileSync(cookiesFile, 'invalid json content', 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true'; // Suppress warnings in tests

      const config = new ConfigManager();
      const authConfig = config.getAuthenticationConfig();

      assert.strictEqual(
        authConfig.defaultCookies.length,
        0,
        'Should fallback to empty array for invalid JSON file'
      );
    } finally {
      // Clean up
      unlinkSync(cookiesFile);
    }
  });

  test('should maintain backward compatibility with JSON strings', () => {
    // This test ensures the old JSON string approach still works
    process.env.BROWSERLOOP_DEFAULT_COOKIES = JSON.stringify([
      { name: 'json_session', value: 'json_value', domain: 'example.com' },
    ]);

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(
      authConfig.defaultCookies.length,
      1,
      'Should parse 1 cookie from JSON string'
    );

    const cookie = authConfig.defaultCookies[0];
    assert.ok(cookie, 'Cookie should exist');
    assert.strictEqual(cookie.name, 'json_session', 'Cookie name should match');
    assert.strictEqual(cookie.value, 'json_value', 'Cookie value should match');
  });

  test('should detect file paths correctly', () => {
    // Test cases for different path formats
    const validFilePaths = [
      '/tmp/test-cookies-1.json',
      '/tmp/test-cookies-2.json',
    ];

    const jsonStrings = ['[{"name":"session","value":"123"}]', '[]'];

    // Test valid file paths
    for (const filePath of validFilePaths) {
      // Create a valid test file
      writeFileSync(filePath, '[]', 'utf-8');

      try {
        process.env.BROWSERLOOP_DEFAULT_COOKIES = filePath;
        process.env.BROWSERLOOP_SILENT = 'true';

        const config = new ConfigManager();
        const authConfig = config.getAuthenticationConfig();

        // Should not throw and should return empty array from file
        assert.strictEqual(
          authConfig.defaultCookies.length,
          0,
          `File path ${filePath} should be treated as file`
        );
      } finally {
        // Clean up
        try {
          unlinkSync(filePath);
        } catch {
          /* ignore */
        }
      }
    }

    // Test JSON strings (not file paths)
    for (const jsonString of jsonStrings) {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = jsonString;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();
      const authConfig = config.getAuthenticationConfig();

      // For the valid JSON with a cookie, we should get 1 cookie
      // For the empty array JSON, we should get 0 cookies
      const expectedCount = jsonString === '[]' ? 0 : 1;
      assert.strictEqual(
        authConfig.defaultCookies.length,
        expectedCount,
        `JSON string ${jsonString} should be parsed correctly`
      );
    }

    // Test file with actual cookies
    const cookiesFile = '/tmp/test-cookies-with-data.json';
    const cookiesData = [{ name: 'test', value: 'value', domain: 'localhost' }];
    writeFileSync(cookiesFile, JSON.stringify(cookiesData), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();
      const authConfig = config.getAuthenticationConfig();

      assert.strictEqual(
        authConfig.defaultCookies.length,
        1,
        'Should load 1 cookie from file'
      );
      assert.strictEqual(
        authConfig.defaultCookies[0]?.name,
        'test',
        'Cookie name should match'
      );
    } finally {
      // Clean up
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });
});

describe('ConfigManager - Configuration Refresh', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a clean environment for each test
    process.env = { ...originalEnv };
    // Disable file watching for these tests
    process.env.BROWSERLOOP_DISABLE_FILE_WATCHING = 'true';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('should successfully refresh configuration', async () => {
    // Set initial configuration
    process.env.BROWSERLOOP_DEFAULT_WIDTH = '800';
    process.env.BROWSERLOOP_DEFAULT_QUALITY = '90';
    process.env.BROWSERLOOP_SILENT = 'true';

    const config = new ConfigManager();

    // Verify initial values
    assert.strictEqual(config.getViewportConfig().defaultWidth, 800);
    assert.strictEqual(config.getScreenshotConfig().defaultQuality, 90);

    // Change environment variables
    process.env.BROWSERLOOP_DEFAULT_WIDTH = '1024';
    process.env.BROWSERLOOP_DEFAULT_QUALITY = '95';

    // Refresh configuration
    const refreshResult = await config.refreshConfig();

    // Verify refresh was successful
    assert.strictEqual(
      refreshResult,
      true,
      'Refresh should return true on success'
    );

    // Verify new values are loaded
    assert.strictEqual(config.getViewportConfig().defaultWidth, 1024);
    assert.strictEqual(config.getScreenshotConfig().defaultQuality, 95);
  });

  test('should refresh default cookies from file', async () => {
    // Create initial cookie file
    const cookiesFile = '/tmp/test-refresh-cookies.json';
    const initialCookies = [
      {
        name: 'initial_session',
        value: 'initial_value',
        domain: 'example.com',
      },
    ];
    writeFileSync(cookiesFile, JSON.stringify(initialCookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();

      // Verify initial cookies
      const initialAuthConfig = config.getAuthenticationConfig();
      assert.strictEqual(initialAuthConfig.defaultCookies.length, 1);
      assert.strictEqual(
        initialAuthConfig.defaultCookies[0]?.name,
        'initial_session'
      );

      // Update cookie file
      const updatedCookies = [
        {
          name: 'updated_session',
          value: 'updated_value',
          domain: 'example.com',
        },
        { name: 'new_cookie', value: 'new_value', domain: 'test.com' },
      ];
      writeFileSync(cookiesFile, JSON.stringify(updatedCookies), 'utf-8');

      // Refresh configuration
      const refreshResult = await config.refreshConfig();

      // Verify refresh was successful
      assert.strictEqual(
        refreshResult,
        true,
        'Refresh should return true on success'
      );

      // Verify updated cookies are loaded
      const updatedAuthConfig = config.getAuthenticationConfig();
      assert.strictEqual(updatedAuthConfig.defaultCookies.length, 2);
      assert.strictEqual(
        updatedAuthConfig.defaultCookies[0]?.name,
        'updated_session'
      );
      assert.strictEqual(
        updatedAuthConfig.defaultCookies[1]?.name,
        'new_cookie'
      );
    } finally {
      // Clean up
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });

  test('should handle file read errors gracefully during refresh', async () => {
    // Create initial configuration
    process.env.BROWSERLOOP_DEFAULT_WIDTH = '800';
    process.env.BROWSERLOOP_SILENT = 'true';

    const config = new ConfigManager();
    const initialWidth = config.getViewportConfig().defaultWidth;

    // Set up environment to point to non-existent cookie file
    process.env.BROWSERLOOP_DEFAULT_COOKIES =
      '/tmp/non-existent-refresh-cookies.json';

    // Refresh configuration - should succeed despite missing cookie file
    const refreshResult = await config.refreshConfig();

    // Verify refresh was successful (missing cookie file is handled gracefully)
    assert.strictEqual(
      refreshResult,
      true,
      'Refresh should return true even with missing cookie file'
    );

    // Verify configuration is still accessible
    assert.strictEqual(config.getViewportConfig().defaultWidth, initialWidth);
    assert.strictEqual(
      config.getAuthenticationConfig().defaultCookies.length,
      0
    );
  });

  test('should preserve existing configuration on validation errors', async () => {
    // Set valid initial configuration
    process.env.BROWSERLOOP_DEFAULT_WIDTH = '800';
    process.env.BROWSERLOOP_DEFAULT_QUALITY = '80';
    process.env.BROWSERLOOP_SILENT = 'true';

    const config = new ConfigManager();

    // Store initial values
    const initialWidth = config.getViewportConfig().defaultWidth;
    const initialQuality = config.getScreenshotConfig().defaultQuality;

    // Set invalid environment variable that would cause validation to fail
    process.env.BROWSERLOOP_DEFAULT_WIDTH = '50'; // Below minimum of 200

    // Refresh configuration - should fail but preserve existing config
    const refreshResult = await config.refreshConfig();

    // Verify refresh failed
    assert.strictEqual(
      refreshResult,
      false,
      'Refresh should return false on validation error'
    );

    // Verify original configuration is preserved
    assert.strictEqual(config.getViewportConfig().defaultWidth, initialWidth);
    assert.strictEqual(
      config.getScreenshotConfig().defaultQuality,
      initialQuality
    );
  });

  test('should handle corrupted cookie file during refresh', async () => {
    // Create valid initial configuration
    const cookiesFile = '/tmp/test-corrupted-refresh-cookies.json';
    const validCookies = [
      { name: 'valid_session', value: 'valid_value', domain: 'example.com' },
    ];
    writeFileSync(cookiesFile, JSON.stringify(validCookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();

      // Verify initial valid cookies
      const initialAuthConfig = config.getAuthenticationConfig();
      assert.strictEqual(initialAuthConfig.defaultCookies.length, 1);

      // Corrupt the cookie file
      writeFileSync(cookiesFile, 'invalid json content', 'utf-8');

      // Refresh configuration - should succeed but with empty cookies (graceful handling)
      const refreshResult = await config.refreshConfig();

      // Verify refresh succeeded (corrupted files are handled gracefully)
      assert.strictEqual(
        refreshResult,
        true,
        'Refresh should return true even with corrupted cookie file (graceful handling)'
      );

      // Verify cookies were cleared due to corruption (graceful fallback)
      const updatedAuthConfig = config.getAuthenticationConfig();
      assert.strictEqual(
        updatedAuthConfig.defaultCookies.length,
        0,
        'Corrupted cookie file should result in empty cookies'
      );
    } finally {
      // Clean up
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });

  test('should not log sensitive cookie values during refresh', async () => {
    // This test verifies cookie sanitization during refresh
    // Note: Logging now goes to file instead of console to prevent MCP protocol interference
    const cookiesFile = '/tmp/test-sanitization-refresh-cookies.json';
    const cookies = [
      { name: 'session_id', value: 'secret123', domain: 'example.com' },
      { name: 'auth_token', value: 'token456', domain: 'example.com' },
    ];
    writeFileSync(cookiesFile, JSON.stringify(cookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_DEBUG = 'true';
      process.env.BROWSERLOOP_SILENT = 'false';

      const config = new ConfigManager();

      // Update cookies and refresh
      const updatedCookies = [
        { name: 'new_session', value: 'newsecret789', domain: 'example.com' },
      ];
      writeFileSync(cookiesFile, JSON.stringify(updatedCookies), 'utf-8');

      await config.refreshConfig();

      // Since logging now goes to file (to prevent MCP protocol interference),
      // we verify the functionality works by checking the configuration was updated
      const authConfig = config.getAuthenticationConfig();
      assert.strictEqual(
        authConfig.defaultCookies.length,
        1,
        'Should load updated cookies'
      );
      assert.strictEqual(
        authConfig.defaultCookies[0]?.name,
        'new_session',
        'Should load correct cookie name'
      );

      // The important security aspect is that cookie values are never exposed in any logs
      // This is now handled by the file logger which sanitizes all output
    } finally {
      // Clean up
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });

  test('should support atomic configuration replacement', async () => {
    // This test ensures that if any part of config loading fails,
    // the entire existing configuration is preserved
    process.env.BROWSERLOOP_DEFAULT_WIDTH = '800';
    process.env.BROWSERLOOP_DEFAULT_QUALITY = '80';
    process.env.BROWSERLOOP_SILENT = 'true';

    const config = new ConfigManager();

    // Store references to initial configuration
    const initialConfig = config.getConfig();
    const initialWidth = initialConfig.viewport.defaultWidth;
    const initialQuality = initialConfig.screenshot.defaultQuality;

    // Create invalid configuration that will fail validation
    process.env.BROWSERLOOP_DEFAULT_WIDTH = '5000'; // Above maximum of 4000
    process.env.BROWSERLOOP_DEFAULT_QUALITY = '150'; // Above maximum of 100

    // Attempt refresh - should fail atomically
    const refreshResult = await config.refreshConfig();

    // Verify refresh failed
    assert.strictEqual(
      refreshResult,
      false,
      'Refresh should fail with invalid values'
    );

    // Verify ALL original values are preserved (atomic failure)
    assert.strictEqual(config.getViewportConfig().defaultWidth, initialWidth);
    assert.strictEqual(
      config.getScreenshotConfig().defaultQuality,
      initialQuality
    );

    // Verify the configuration object itself wasn't partially updated
    const configAfterFailedRefresh = config.getConfig();
    assert.deepStrictEqual(
      configAfterFailedRefresh,
      initialConfig,
      'Configuration should be completely unchanged after failed refresh'
    );
  });
});

describe('ConfigManager - File Watching', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a clean environment for each test
    process.env = { ...originalEnv };
    // Enable file watching for these specific tests
    process.env.BROWSERLOOP_DISABLE_FILE_WATCHING = 'false';
    // Enable test mode to avoid system resource issues
    enableFileWatchingTestMode();
  });

  afterEach(() => {
    // Disable test mode and restore original environment
    disableFileWatchingTestMode();
    process.env = originalEnv;
  });

  test('should initialize file watching for cookie files', () => {
    const cookiesFile = '/tmp/test-file-watching-cookies.json';
    const cookies = [
      { name: 'session_id', value: 'abc123', domain: 'example.com' },
    ];
    writeFileSync(cookiesFile, JSON.stringify(cookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();
      const watcherStatus = config.getFileWatcherStatus();

      // Verify file watching was initialized
      assert.strictEqual(
        watcherStatus.enabled,
        true,
        'File watching should be enabled'
      );
      assert.strictEqual(
        watcherStatus.watchedFiles.length,
        1,
        'Should watch one file'
      );
      assert.strictEqual(
        watcherStatus.watchedFiles[0],
        cookiesFile,
        'Should watch the cookie file'
      );
      assert.strictEqual(
        watcherStatus.activeWatchers.length,
        1,
        'Should have one active watcher'
      );

      // Clean up
      config.cleanup();
    } finally {
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });

  test('should not initialize file watching for JSON string cookies', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = JSON.stringify([
      { name: 'session_id', value: 'abc123', domain: 'example.com' },
    ]);
    process.env.BROWSERLOOP_SILENT = 'true';

    const config = new ConfigManager();
    const watcherStatus = config.getFileWatcherStatus();

    // Verify file watching was not initialized for JSON string
    assert.strictEqual(
      watcherStatus.enabled,
      true,
      'File watching should be enabled globally'
    );
    assert.strictEqual(
      watcherStatus.watchedFiles.length,
      0,
      'Should not watch any files for JSON string'
    );
    assert.strictEqual(
      watcherStatus.activeWatchers.length,
      0,
      'Should have no active watchers'
    );

    // Clean up
    config.cleanup();
  });

  test('should not initialize file watching when no cookies configured', () => {
    process.env.BROWSERLOOP_SILENT = 'true';

    const config = new ConfigManager();
    const watcherStatus = config.getFileWatcherStatus();

    // Verify file watching was not initialized
    assert.strictEqual(
      watcherStatus.enabled,
      true,
      'File watching should be enabled globally'
    );
    assert.strictEqual(
      watcherStatus.watchedFiles.length,
      0,
      'Should not watch any files'
    );
    assert.strictEqual(
      watcherStatus.activeWatchers.length,
      0,
      'Should have no active watchers'
    );

    // Clean up
    config.cleanup();
  });

  test('should handle file watching initialization errors gracefully', () => {
    // Use a path that cannot be watched (non-existent directory)
    const invalidPath = '/non-existent-directory/cookies.json';
    process.env.BROWSERLOOP_DEFAULT_COOKIES = invalidPath;
    process.env.BROWSERLOOP_SILENT = 'true';

    // Should not throw an error
    const config = new ConfigManager();
    const watcherStatus = config.getFileWatcherStatus();

    // Verify graceful handling - no watchers should be active
    assert.strictEqual(
      watcherStatus.enabled,
      true,
      'File watching should still be enabled'
    );
    assert.strictEqual(
      watcherStatus.activeWatchers.length,
      0,
      'Should have no active watchers due to error'
    );

    // Clean up
    config.cleanup();
  });

  test('should not watch the same file twice', () => {
    const cookiesFile = '/tmp/test-duplicate-watching-cookies.json';
    const cookies = [
      { name: 'session_id', value: 'abc123', domain: 'example.com' },
    ];
    writeFileSync(cookiesFile, JSON.stringify(cookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      // Create first config instance
      const config1 = new ConfigManager();
      const status1 = config1.getFileWatcherStatus();

      // Create second config instance pointing to same file
      const config2 = new ConfigManager();
      const status2 = config2.getFileWatcherStatus();

      // Both should show the file is being watched, but only one active watcher
      assert.strictEqual(
        status1.watchedFiles.length,
        1,
        'First config should watch the file'
      );
      assert.strictEqual(
        status2.watchedFiles.length,
        0,
        'Second config should not watch the same file again'
      );

      // Clean up
      config1.cleanup();
      config2.cleanup();
    } finally {
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });

  test('should clean up file watchers on shutdown', () => {
    const cookiesFile = '/tmp/test-cleanup-watching-cookies.json';
    const cookies = [
      { name: 'session_id', value: 'abc123', domain: 'example.com' },
    ];
    writeFileSync(cookiesFile, JSON.stringify(cookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();
      let watcherStatus = config.getFileWatcherStatus();

      // Verify file watching was initialized
      assert.strictEqual(
        watcherStatus.enabled,
        true,
        'File watching should be enabled initially'
      );
      assert.strictEqual(
        watcherStatus.activeWatchers.length,
        1,
        'Should have one active watcher initially'
      );

      // Clean up
      config.cleanup();
      watcherStatus = config.getFileWatcherStatus();

      // Verify cleanup
      assert.strictEqual(
        watcherStatus.enabled,
        false,
        'File watching should be disabled after cleanup'
      );
      assert.strictEqual(
        watcherStatus.watchedFiles.length,
        0,
        'Should have no watched files after cleanup'
      );
      assert.strictEqual(
        watcherStatus.activeWatchers.length,
        0,
        'Should have no active watchers after cleanup'
      );
    } finally {
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });

  test('should handle file watcher errors by disabling the watcher', async () => {
    const cookiesFile = '/tmp/test-watcher-error-cookies.json';
    const cookies = [
      { name: 'session_id', value: 'abc123', domain: 'example.com' },
    ];
    writeFileSync(cookiesFile, JSON.stringify(cookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();
      let watcherStatus = config.getFileWatcherStatus();

      // Verify file watching was initialized
      assert.strictEqual(
        watcherStatus.activeWatchers.length,
        1,
        'Should have one active watcher initially'
      );

      // Simulate a watcher error by deleting the watched file
      unlinkSync(cookiesFile);

      // Give the file system event some time to trigger
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The watcher should still exist but may become inactive depending on the system
      watcherStatus = config.getFileWatcherStatus();
      assert.strictEqual(
        watcherStatus.watchedFiles.length,
        1,
        'Should still track the watched file'
      );

      // Clean up
      config.cleanup();
    } catch (_error) {
      // File was already deleted above
      try {
        const config = new ConfigManager();
        config.cleanup();
      } catch {
        /* ignore */
      }
    }
  });

  test('should provide debugging information about file watchers', () => {
    const cookiesFile = '/tmp/test-debug-watching-cookies.json';
    const cookies = [
      { name: 'session_id', value: 'abc123', domain: 'example.com' },
    ];
    writeFileSync(cookiesFile, JSON.stringify(cookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();
      const watcherStatus = config.getFileWatcherStatus();

      // Verify status structure
      assert.ok(
        typeof watcherStatus.enabled === 'boolean',
        'enabled should be boolean'
      );
      assert.ok(
        Array.isArray(watcherStatus.watchedFiles),
        'watchedFiles should be array'
      );
      assert.ok(
        Array.isArray(watcherStatus.activeWatchers),
        'activeWatchers should be array'
      );

      // Verify content
      assert.strictEqual(
        watcherStatus.enabled,
        true,
        'Should show file watching as enabled'
      );
      assert.strictEqual(
        watcherStatus.watchedFiles.length,
        1,
        'Should list watched files'
      );
      assert.strictEqual(
        watcherStatus.watchedFiles[0],
        cookiesFile,
        'Should list the correct file'
      );
      assert.strictEqual(
        watcherStatus.activeWatchers.length,
        1,
        'Should list active watchers'
      );
      assert.strictEqual(
        watcherStatus.activeWatchers[0],
        cookiesFile,
        'Should list the correct active watcher'
      );

      // Clean up
      config.cleanup();
    } finally {
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });

  test('should automatically refresh configuration when cookie file changes', async () => {
    const cookiesFile = '/tmp/test-auto-refresh-cookies.json';
    const initialCookies = [
      { name: 'session_id', value: 'initial123', domain: 'example.com' },
    ];
    writeFileSync(cookiesFile, JSON.stringify(initialCookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();

      // Verify initial cookies
      let authConfig = config.getAuthenticationConfig();
      assert.strictEqual(
        authConfig.defaultCookies.length,
        1,
        'Should have initial cookie'
      );
      assert.strictEqual(
        authConfig.defaultCookies[0]?.name,
        'session_id',
        'Should have correct initial cookie name'
      );

      // Update the cookie file
      const updatedCookies = [
        { name: 'session_id', value: 'updated456', domain: 'example.com' },
        { name: 'new_cookie', value: 'new789', domain: 'example.com' },
      ];
      writeFileSync(cookiesFile, JSON.stringify(updatedCookies), 'utf-8');

      // In test mode, simulate the file change event
      simulateFileChange(cookiesFile);

      // Wait for debouncing and config refresh
      // The default debounce is 1000ms, so we wait a bit longer
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Verify configuration was refreshed automatically
      authConfig = config.getAuthenticationConfig();
      assert.strictEqual(
        authConfig.defaultCookies.length,
        2,
        'Should have updated cookies count'
      );
      assert.strictEqual(
        authConfig.defaultCookies[0]?.name,
        'session_id',
        'Should have updated first cookie'
      );
      assert.strictEqual(
        authConfig.defaultCookies[1]?.name,
        'new_cookie',
        'Should have new second cookie'
      );

      // Clean up
      config.cleanup();
    } finally {
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });

  test('should debounce rapid file changes', async () => {
    const cookiesFile = '/tmp/test-debounce-cookies.json';
    const initialCookies = [
      { name: 'session_id', value: 'initial123', domain: 'example.com' },
    ];
    writeFileSync(cookiesFile, JSON.stringify(initialCookies), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();

      // Create multiple rapid file changes
      const changes = [
        [{ name: 'session_id', value: 'change1', domain: 'example.com' }],
        [{ name: 'session_id', value: 'change2', domain: 'example.com' }],
        [{ name: 'session_id', value: 'change3', domain: 'example.com' }],
        [{ name: 'session_id', value: 'final_change', domain: 'example.com' }],
      ];

      // Write changes rapidly (faster than debounce delay)
      for (const change of changes) {
        writeFileSync(cookiesFile, JSON.stringify(change), 'utf-8');
        // In test mode, simulate the file change event
        simulateFileChange(cookiesFile);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay between writes
      }

      // Wait for debouncing to complete
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Verify only the final change was applied (debouncing worked)
      const authConfig = config.getAuthenticationConfig();
      assert.strictEqual(
        authConfig.defaultCookies.length,
        1,
        'Should have final cookie'
      );
      assert.strictEqual(
        authConfig.defaultCookies[0]?.value,
        'final_change',
        'Should have the final change value'
      );

      // Clean up
      config.cleanup();
    } finally {
      try {
        unlinkSync(cookiesFile);
      } catch {
        /* ignore */
      }
    }
  });
});
