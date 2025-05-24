import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { ConfigManager } from '../../src/config.js';

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
    delete process.env.BROWSERLOOP_DEFAULT_WIDTH;
    delete process.env.BROWSERLOOP_DEFAULT_HEIGHT;
    delete process.env.BROWSERLOOP_DEFAULT_FORMAT;
    delete process.env.BROWSERLOOP_DEFAULT_QUALITY;
    delete process.env.BROWSERLOOP_USER_AGENT;
    delete process.env.BROWSERLOOP_RETRY_COUNT;
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
    delete process.env.BROWSERLOOP_DEFAULT_WIDTH;
    delete process.env.BROWSERLOOP_DEFAULT_FORMAT;
    delete process.env.BROWSERLOOP_RETRY_COUNT;
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
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('should handle empty default cookies', () => {
    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.ok(Array.isArray(authConfig.defaultCookies), 'Default cookies should be an array');
    assert.strictEqual(authConfig.defaultCookies.length, 0, 'Should start with empty default cookies');
  });

  test('should parse valid default cookies from environment', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = JSON.stringify([
      { name: 'session_id', value: 'abc123', domain: 'example.com' },
      { name: 'auth_token', value: 'def456' }
    ]);

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(authConfig.defaultCookies.length, 2, 'Should parse 2 cookies');

    const firstCookie = authConfig.defaultCookies[0];
    const secondCookie = authConfig.defaultCookies[1];

    assert.ok(firstCookie, 'First cookie should exist');
    assert.ok(secondCookie, 'Second cookie should exist');

    assert.strictEqual(firstCookie.name, 'session_id', 'First cookie name should match');
    assert.strictEqual(firstCookie.value, 'abc123', 'First cookie value should match');
    assert.strictEqual(firstCookie.domain, 'example.com', 'First cookie domain should match');
    assert.strictEqual(secondCookie.name, 'auth_token', 'Second cookie name should match');
  });

  test('should handle invalid JSON gracefully', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = 'invalid json';
    process.env.BROWSERLOOP_SILENT = 'true'; // Suppress warnings in tests

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(authConfig.defaultCookies.length, 0, 'Should fallback to empty array on invalid JSON');
  });

  test('should handle invalid cookie format gracefully', () => {
    process.env.BROWSERLOOP_DEFAULT_COOKIES = JSON.stringify([
      { name: '', value: 'invalid_empty_name' }, // Invalid: empty name
      { name: 'valid_cookie', value: 'valid_value' }
    ]);
    process.env.BROWSERLOOP_SILENT = 'true'; // Suppress warnings in tests

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(authConfig.defaultCookies.length, 0, 'Should fallback to empty array on validation failure');
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
        sameSite: 'Strict'
      }
    ]);

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(authConfig.defaultCookies.length, 1, 'Should parse 1 cookie');
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
      not: 'an array'
    });
    process.env.BROWSERLOOP_SILENT = 'true';

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(authConfig.defaultCookies.length, 0, 'Should fallback to empty array for non-array JSON');
  });

  test('should parse cookies from JSON file path', () => {
    // Create a temporary cookies file
    const cookiesFile = '/tmp/test-cookies.json';
    const cookiesData = [
      { name: 'file_session', value: 'file_value', domain: 'example.com' },
      { name: 'file_auth', value: 'file_auth_value' }
    ];

    writeFileSync(cookiesFile, JSON.stringify(cookiesData), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;

      const config = new ConfigManager();
      const authConfig = config.getAuthenticationConfig();

      assert.strictEqual(authConfig.defaultCookies.length, 2, 'Should parse 2 cookies from file');

      const firstCookie = authConfig.defaultCookies[0];
      const secondCookie = authConfig.defaultCookies[1];

      assert.ok(firstCookie, 'First cookie should exist');
      assert.ok(secondCookie, 'Second cookie should exist');

      assert.strictEqual(firstCookie.name, 'file_session', 'First cookie name should match');
      assert.strictEqual(firstCookie.value, 'file_value', 'First cookie value should match');
      assert.strictEqual(secondCookie.name, 'file_auth', 'Second cookie name should match');
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

    assert.strictEqual(authConfig.defaultCookies.length, 0, 'Should fallback to empty array for missing file');
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

      assert.strictEqual(authConfig.defaultCookies.length, 0, 'Should fallback to empty array for invalid JSON file');
    } finally {
      // Clean up
      unlinkSync(cookiesFile);
    }
  });

  test('should maintain backward compatibility with JSON strings', () => {
    // This test ensures the old JSON string approach still works
    process.env.BROWSERLOOP_DEFAULT_COOKIES = JSON.stringify([
      { name: 'json_session', value: 'json_value', domain: 'example.com' }
    ]);

    const config = new ConfigManager();
    const authConfig = config.getAuthenticationConfig();

    assert.strictEqual(authConfig.defaultCookies.length, 1, 'Should parse 1 cookie from JSON string');

    const cookie = authConfig.defaultCookies[0];
    assert.ok(cookie, 'Cookie should exist');
    assert.strictEqual(cookie.name, 'json_session', 'Cookie name should match');
    assert.strictEqual(cookie.value, 'json_value', 'Cookie value should match');
  });

  test('should detect file paths correctly', () => {
    // Test cases for different path formats
    const validFilePaths = [
      '/tmp/test-cookies-1.json',
      '/tmp/test-cookies-2.json'
    ];

    const jsonStrings = [
      '[{"name":"session","value":"123"}]',
      '[]'
    ];

    // Test valid file paths
    validFilePaths.forEach((filePath) => {
      // Create a valid test file
      writeFileSync(filePath, '[]', 'utf-8');

      try {
        process.env.BROWSERLOOP_DEFAULT_COOKIES = filePath;
        process.env.BROWSERLOOP_SILENT = 'true';

        const config = new ConfigManager();
        const authConfig = config.getAuthenticationConfig();

        // Should not throw and should return empty array from file
        assert.strictEqual(authConfig.defaultCookies.length, 0, `File path ${filePath} should be treated as file`);
      } finally {
        // Clean up
        try { unlinkSync(filePath); } catch { /* ignore */ }
      }
    });

    // Test JSON strings (not file paths)
    jsonStrings.forEach((jsonString) => {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = jsonString;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();
      const authConfig = config.getAuthenticationConfig();

      // For the valid JSON with a cookie, we should get 1 cookie
      // For the empty array JSON, we should get 0 cookies
      const expectedCount = jsonString === '[]' ? 0 : 1;
      assert.strictEqual(authConfig.defaultCookies.length, expectedCount, `JSON string ${jsonString} should be parsed correctly`);
    });

    // Test file with actual cookies
    const cookiesFile = '/tmp/test-cookies-with-data.json';
    const cookiesData = [{ name: 'test', value: 'value', domain: 'localhost' }];
    writeFileSync(cookiesFile, JSON.stringify(cookiesData), 'utf-8');

    try {
      process.env.BROWSERLOOP_DEFAULT_COOKIES = cookiesFile;
      process.env.BROWSERLOOP_SILENT = 'true';

      const config = new ConfigManager();
      const authConfig = config.getAuthenticationConfig();

      assert.strictEqual(authConfig.defaultCookies.length, 1, 'Should load 1 cookie from file');
      assert.strictEqual(authConfig.defaultCookies[0]?.name, 'test', 'Cookie name should match');
    } finally {
      // Clean up
      try { unlinkSync(cookiesFile); } catch { /* ignore */ }
    }
  });
});
