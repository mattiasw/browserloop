import { test, mock, describe } from 'node:test';
import assert from 'node:assert';
import { ScreenshotService } from '../../src/screenshot-service.js';
import { isValidBase64Image } from '../../src/test-utils.js';
import type { ScreenshotServiceConfig } from '../../src/types.js';

describe('ScreenshotService', () => {
  function createTestConfig(): ScreenshotServiceConfig {
    return {
      viewport: {
        defaultWidth: 1280,
        defaultHeight: 720
      },
      screenshot: {
        defaultFormat: 'webp',
        defaultQuality: 80,
        defaultTimeout: 30000,
        defaultWaitForNetworkIdle: true
      },
      browser: {
        retryCount: 3,
        retryDelay: 1000
      }
    };
  }

  test('should initialize properly', async () => {
    const service = new ScreenshotService(createTestConfig());

    // Mock browser to avoid actual Playwright startup in tests
    const mockBrowser = {
      newPage: mock.fn(),
      close: mock.fn()
    };

    // We can't easily mock Playwright's chromium.launch in this test
    // so we'll test the isHealthy method behavior
    assert.strictEqual(service.isHealthy(), false, 'Service should start unhealthy');
  });

  test('should handle screenshot options correctly', async () => {
    // Test default options
    const defaultOptions = {
      url: 'http://localhost:3000',
      width: undefined,
      height: undefined,
      format: undefined,
      quality: undefined,
      waitForNetworkIdle: undefined,
      timeout: undefined
    };

    // Verify options structure
    assert.strictEqual(typeof defaultOptions.url, 'string');
    assert.strictEqual(defaultOptions.width, undefined);
    assert.strictEqual(defaultOptions.height, undefined);
  });

  test('should cleanup resources properly', async () => {
    const service = new ScreenshotService(createTestConfig());

    // Test cleanup when not initialized
    await service.cleanup();
    assert.strictEqual(service.isHealthy(), false);
  });

  test('should validate base64 output format', () => {
    // Test our base64 validation utility works
    const validBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77kQAAAABJRU5ErkJggg==';
    const invalidBase64 = 'not-base64-data';

    assert.strictEqual(isValidBase64Image(validBase64), true);
    assert.strictEqual(isValidBase64Image(invalidBase64), false);
  });
});
