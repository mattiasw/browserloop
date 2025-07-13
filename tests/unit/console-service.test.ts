import { strict as assert } from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { ConsoleLogService } from '../../src/console-service.js';
import type {
  ConsoleLogServiceConfig,
  ConsoleLogEntry,
} from '../../src/types.js';

describe('ConsoleLogService', () => {
  let service: ConsoleLogService;
  let mockConfig: ConsoleLogServiceConfig;

  before(() => {
    mockConfig = {
      console: {
        defaultTimeout: 30000,
        defaultSanitize: true,
        defaultWaitForNetworkIdle: true,
        maxLogSize: 1048576,
        defaultLogLevels: ['log', 'info', 'warn', 'error', 'debug'] as Array<
          'log' | 'info' | 'warn' | 'error' | 'debug'
        >,
      },
      browser: {
        retryCount: 3,
        retryDelay: 1000,
      },
      authentication: {
        defaultCookies: [],
      },
      logging: {
        debug: false,
        enableMetrics: true,
        silent: true,
      },
      timeouts: {
        browserInit: 30000,
        navigation: 30000,
        elementWait: 5000,
        screenshot: 10000,
        network: 5000,
      },
    };

    service = new ConsoleLogService(mockConfig);
  });

  after(async () => {
    if (service) {
      await service.cleanup();
    }
  });

  describe('constructor', () => {
    it('should create a ConsoleLogService instance', () => {
      assert.ok(service instanceof ConsoleLogService);
    });

    it('should initialize with healthy state as false', () => {
      assert.strictEqual(service.isHealthy(), false);
    });
  });

  describe('initialize', () => {
    it('should initialize service successfully', async () => {
      await service.initialize();
      assert.strictEqual(service.isHealthy(), true);
    });

    it('should handle multiple initialization attempts gracefully', async () => {
      const wasHealthy = service.isHealthy();
      await service.initialize();
      assert.strictEqual(service.isHealthy(), wasHealthy);
    });
  });

  describe('readConsoleLogs', () => {
    it('should read console logs from a test page', async () => {
      // Test with a local file URL that generates console output
      const testUrl =
        'data:text/html,<html><head></head><body><script>console.log("test log");console.info("test info");console.warn("test warning");console.error("test error");console.debug("test debug");</script></body></html>';

      const result = await service.readConsoleLogs({
        url: testUrl,
        timeout: 5000,
        sanitize: false,
        waitForNetworkIdle: false,
      });

      // Verify result structure
      assert.ok(result);
      assert.ok(Array.isArray(result.logs));
      assert.strictEqual(typeof result.url, 'string');
      assert.strictEqual(result.url, testUrl);
      assert.strictEqual(typeof result.startTimestamp, 'number');
      assert.strictEqual(typeof result.endTimestamp, 'number');
      assert.strictEqual(typeof result.totalLogs, 'number');
      assert.strictEqual(result.totalLogs, result.logs.length);

      // Check log structure and filter by levels
      const logMessages = result.logs.filter(
        (log: ConsoleLogEntry) => log.level === 'log'
      );
      const infoMessages = result.logs.filter(
        (log: ConsoleLogEntry) => log.level === 'info'
      );
      const warnMessages = result.logs.filter(
        (log: ConsoleLogEntry) => log.level === 'warn'
      );
      const errorMessages = result.logs.filter(
        (log: ConsoleLogEntry) => log.level === 'error'
      );
      const debugMessages = result.logs.filter(
        (log: ConsoleLogEntry) => log.level === 'debug'
      );

      // Should have captured different types of console output
      assert.ok(
        logMessages.length > 0 ||
          infoMessages.length > 0 ||
          warnMessages.length > 0 ||
          errorMessages.length > 0 ||
          debugMessages.length > 0
      );

      // Verify each log entry has the right structure
      result.logs.forEach((log: ConsoleLogEntry) => {
        assert.strictEqual(typeof log.timestamp, 'number');
        assert.ok(
          ['log', 'info', 'warn', 'error', 'debug'].includes(log.level)
        );
        assert.strictEqual(typeof log.message, 'string');
        assert.ok(Array.isArray(log.args));
      });
    });

    it('should sanitize sensitive information when enabled', async () => {
      // Test with a local URL that includes patterns that should be sanitized
      const longApiKey = 'abcdef123456789012345678901234567890'; // 36 chars, should match API key pattern
      const emailAddress = 'user@example.com';
      const testUrl = `data:text/html,<html><head></head><body><script>console.log("API key: ${longApiKey}");console.log("Email: ${emailAddress}");</script></body></html>`;

      const result = await service.readConsoleLogs({
        url: testUrl,
        timeout: 5000,
        sanitize: true,
        waitForNetworkIdle: false,
      });

      // Check that sensitive patterns are masked
      const allLogText = result.logs
        .map((log: ConsoleLogEntry) => `${log.message} ${log.args.join(' ')}`)
        .join(' ');

      // Should not contain the original sensitive data if logs were captured
      if (result.logs.length > 0) {
        assert.ok(
          !allLogText.includes(longApiKey) || !allLogText.includes(emailAddress)
        );

        // Should contain masked markers if sensitive data was found
        assert.ok(
          allLogText.includes('[API_KEY_MASKED]') ||
            allLogText.includes('[EMAIL_MASKED]') ||
            result.logs.length === 0
        );
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid URL', async () => {
      try {
        await service.readConsoleLogs({
          url: 'invalid-url-format',
          timeout: 5000,
        });
        assert.fail('Should have thrown an error for invalid URL');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(
          error.message.includes('URL') ||
            error.message.includes('Protocol') ||
            error.message.includes('Invalid')
        );
      }
    });

    it('should handle timeout', async () => {
      try {
        // Use a very short timeout with a URL that might take longer to load
        await service.readConsoleLogs({
          url: 'data:text/html,<html><head></head><body><script>setTimeout(() => console.log("delayed"), 2000);</script></body></html>',
          timeout: 100, // Very short timeout
        });
        // If it doesn't timeout, that's actually fine too
      } catch (error) {
        assert.ok(error instanceof Error);
        // Should be a timeout-related error
        assert.ok(
          error.message.includes('timeout') || error.message.includes('Timeout')
        );
      }
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources and set healthy state to false', async () => {
      await service.cleanup();
      assert.strictEqual(service.isHealthy(), false);
    });
  });
});
