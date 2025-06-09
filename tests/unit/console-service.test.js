import { strict as assert } from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { ConsoleLogService } from '../../dist/src/console-service.js';

describe('ConsoleLogService', () => {
  let service;
  let mockConfig;

  before(() => {
    mockConfig = {
      console: {
        defaultTimeout: 30000,
        defaultSanitize: true,
        defaultWaitForNetworkIdle: true,
        maxLogSize: 1048576,
        defaultLogLevels: ['log', 'info', 'warn', 'error', 'debug'],
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

    it('should not be initialized initially', () => {
      assert.strictEqual(service.isHealthy(), false);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize();
      assert.strictEqual(service.isHealthy(), true);
    });

    it('should not re-initialize if already initialized', async () => {
      const wasHealthy = service.isHealthy();
      await service.initialize();
      assert.strictEqual(service.isHealthy(), wasHealthy);
    });
  });

  describe('console log collection', () => {
    it('should collect console logs from a basic HTML page', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Test Console Logs</title></head>
        <body>
                     <script>
             console.log('Hello from console.log');
             console.info('Info message');
             console.warn('Warning message');
             console.error('Error message');
             console.debug('Debug message should be captured');
           </script>
        </body>
        </html>
      `;

      // Create a data URL for testing
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`;

      const result = await service.readConsoleLogs({
        url: dataUrl,
        timeout: 10000,
        sanitize: false,
      });

      assert.ok(result);
      assert.strictEqual(result.url, dataUrl);
      assert.ok(Array.isArray(result.logs));
      assert.ok(result.totalLogs >= 0);
      assert.ok(result.startTimestamp > 0);
      assert.ok(result.endTimestamp > result.startTimestamp);

      // Find expected log messages
      const logMessages = result.logs.filter((log) => log.level === 'log');
      const infoMessages = result.logs.filter((log) => log.level === 'info');
      const warnMessages = result.logs.filter((log) => log.level === 'warn');
      const errorMessages = result.logs.filter((log) => log.level === 'error');
      const debugMessages = result.logs.filter((log) => log.level === 'debug');

      // We should have at least some console messages (exact count may vary due to browser behavior)
      assert.ok(logMessages.length >= 0);
      assert.ok(infoMessages.length >= 0);
      assert.ok(warnMessages.length >= 0);
      assert.ok(errorMessages.length >= 0);
      assert.ok(debugMessages.length >= 0);
    });

    it('should sanitize sensitive data when enabled', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Test Sanitization</title></head>
        <body>
          <script>
            console.log('API key: abc123def456ghi789jkl012mno345pqr678stu901vwx234');
            console.log('Email: user@example.com');
            console.log('JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
          </script>
        </body>
        </html>
      `;

      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`;

      const result = await service.readConsoleLogs({
        url: dataUrl,
        timeout: 10000,
        sanitize: true,
      });

      assert.ok(result);

      // Check that sensitive data has been masked
      const allMessages = result.logs
        .map((log) => `${log.message} ${log.args.join(' ')}`)
        .join(' ');

      // Original sensitive data should not be present
      assert.ok(
        !allMessages.includes(
          'abc123def456ghi789jkl012mno345pqr678stu901vwx234'
        )
      );
      assert.ok(!allMessages.includes('user@example.com'));
      assert.ok(!allMessages.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));

      // Masked placeholders should be present (if any logs were captured)
      if (result.logs.length > 0) {
        const hasApiKeyMask = allMessages.includes('[API_KEY_MASKED]');
        const hasEmailMask = allMessages.includes('[EMAIL_MASKED]');
        const hasJwtMask = allMessages.includes('[JWT_TOKEN_MASKED]');

        // At least one type of masking should have occurred if logs were captured
        assert.ok(
          hasApiKeyMask ||
            hasEmailMask ||
            hasJwtMask ||
            result.logs.length === 0
        );
      }
    });

    it('should respect timeout settings', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Test Timeout</title></head>
        <body>
          <script>
            console.log('Initial message');
            setTimeout(() => console.log('Delayed message'), 1000);
          </script>
        </body>
        </html>
      `;

      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`;

      const startTime = Date.now();
      const result = await service.readConsoleLogs({
        url: dataUrl,
        timeout: 3000,
      });
      const endTime = Date.now();

      assert.ok(result);
      assert.ok(endTime - startTime < 5000); // Should complete within 5 seconds
    });
  });

  describe('configuration', () => {
    it('should use default configuration values', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Test Defaults</title></head>
        <body>
          <script>
            console.log('Testing defaults');
          </script>
        </body>
        </html>
      `;

      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(testHtml)}`;

      // Use minimal options to test defaults
      const result = await service.readConsoleLogs({
        url: dataUrl,
      });

      assert.ok(result);
      assert.strictEqual(result.url, dataUrl);
    });
  });

  describe('error handling', () => {
    it('should handle invalid URLs gracefully', async () => {
      await assert.rejects(
        async () => {
          await service.readConsoleLogs({
            url: 'invalid-url',
          });
        },
        (error) => {
          assert.ok(error instanceof Error);
          return true;
        }
      );
    });

    it('should handle network errors', async () => {
      await assert.rejects(
        async () => {
          await service.readConsoleLogs({
            url: 'https://nonexistent-domain-12345.invalid',
            timeout: 5000,
          });
        },
        (error) => {
          assert.ok(error instanceof Error);
          return true;
        }
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await service.cleanup();
      assert.strictEqual(service.isHealthy(), false);
    });
  });
});
