import { test, describe } from 'node:test';
import assert from 'node:assert';
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
    process.env.BROWSERLOOP_DEFAULT_FORMAT = 'jpeg'; // Not supported
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
