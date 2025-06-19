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
import { afterEach, beforeEach, describe, test } from 'node:test';
import { categorizeError, Logger } from '../../src/logger.js';
import type { BrowserloopError, LoggingConfig } from '../../src/types.js';

describe('Logger', () => {
  let logger: Logger;

  function createTestLoggingConfig(
    overrides: Partial<LoggingConfig> = {}
  ): LoggingConfig {
    return {
      debug: false,
      enableMetrics: true,
      silent: true,
      ...overrides,
    };
  }

  beforeEach(() => {
    logger = new Logger(createTestLoggingConfig());
  });

  afterEach(() => {
    logger.clearMetrics();
  });

  describe('Basic Logging', () => {
    test('should create logger with config', () => {
      const config = createTestLoggingConfig({ debug: true });
      const testLogger = new Logger(config);

      assert.ok(testLogger, 'Logger should be created');
      assert.strictEqual(
        typeof testLogger.debug,
        'function',
        'Should have debug method'
      );
      assert.strictEqual(
        typeof testLogger.info,
        'function',
        'Should have info method'
      );
      assert.strictEqual(
        typeof testLogger.warn,
        'function',
        'Should have warn method'
      );
      assert.strictEqual(
        typeof testLogger.error,
        'function',
        'Should have error method'
      );
    });

    test('should have metrics methods', () => {
      assert.strictEqual(
        typeof logger.getMetrics,
        'function',
        'Should have getMetrics method'
      );
      assert.strictEqual(
        typeof logger.getUptime,
        'function',
        'Should have getUptime method'
      );
      assert.strictEqual(
        typeof logger.clearMetrics,
        'function',
        'Should have clearMetrics method'
      );
    });

    test('should track uptime', () => {
      const uptime = logger.getUptime();
      assert.ok(
        typeof uptime === 'number' && uptime >= 0,
        'Uptime should be a non-negative number'
      );
    });
  });

  describe('Error Metrics', () => {
    test('should start with empty metrics', () => {
      const metrics = logger.getMetrics();

      assert.strictEqual(
        metrics.totalErrors,
        0,
        'Should start with zero total errors'
      );
      assert.strictEqual(
        metrics.lastHourErrors,
        0,
        'Should start with zero hourly errors'
      );
      assert.strictEqual(
        metrics.errorsByCategory.network,
        0,
        'Should start with zero network errors'
      );
      assert.strictEqual(
        metrics.errorsBySeverity.high,
        0,
        'Should start with zero high severity errors'
      );
    });

    test('should track error metrics when enabled', () => {
      const error: BrowserloopError = {
        originalError: new Error('Test error'),
        category: 'network',
        severity: 'medium',
        isRecoverable: true,
        context: { timestamp: Date.now() },
      };

      logger.error('Test error message', error);

      const metrics = logger.getMetrics();
      assert.strictEqual(metrics.totalErrors, 1, 'Should track total errors');
      assert.strictEqual(
        metrics.errorsByCategory.network,
        1,
        'Should track network errors'
      );
      assert.strictEqual(
        metrics.errorsBySeverity.medium,
        1,
        'Should track medium severity errors'
      );
      assert.ok(metrics.lastError, 'Should track last error');
      assert.strictEqual(
        metrics.lastError?.category,
        'network',
        'Should track last error category'
      );
    });

    test('should clear metrics', () => {
      const error: BrowserloopError = {
        originalError: new Error('Test error'),
        category: 'timeout',
        severity: 'high',
        isRecoverable: true,
        context: { timestamp: Date.now() },
      };

      logger.error('Test error', error);
      logger.clearMetrics();

      const metrics = logger.getMetrics();
      assert.strictEqual(metrics.totalErrors, 0, 'Should clear total errors');
      assert.strictEqual(
        metrics.errorsByCategory.timeout,
        0,
        'Should clear category errors'
      );
      assert.strictEqual(
        metrics.errorsBySeverity.high,
        0,
        'Should clear severity errors'
      );
      assert.strictEqual(
        metrics.lastError,
        undefined,
        'Should clear last error'
      );
    });
  });

  describe('Retry and Browser Reset Logging', () => {
    test('should log retry attempts', () => {
      const testError = new Error('Connection failed');

      // This should not throw
      logger.retry(1, 3, testError, { url: 'https://example.com' });
      logger.retry(2, 3, testError, { url: 'https://example.com' });

      // No direct way to verify log content in silent mode, but method should work
      assert.ok(true, 'Retry logging should not throw');
    });

    test('should log browser resets', () => {
      // This should not throw
      logger.browserReset('Connection lost', {
        error: 'Browser disconnected',
        attempt: 2,
        url: 'https://example.com',
      });

      assert.ok(true, 'Browser reset logging should not throw');
    });
  });
});

describe('Error Categorization', () => {
  test('should categorize network errors', () => {
    const networkErrors = [
      new Error('net::ERR_INTERNET_DISCONNECTED'),
      new Error('ENOTFOUND example.com'),
      new Error('ECONNREFUSED'),
    ];

    for (const error of networkErrors) {
      const categorized = categorizeError(error, {
        url: 'https://example.com',
      });

      assert.strictEqual(
        categorized.category,
        'network',
        `Should categorize "${error.message}" as network error`
      );
      assert.strictEqual(
        categorized.severity,
        'medium',
        'Network errors should have medium severity'
      );
      assert.strictEqual(
        categorized.isRecoverable,
        true,
        'Network errors should be recoverable'
      );
      assert.ok(categorized.context, 'Should include context');
      assert.strictEqual(
        categorized.context?.url,
        'https://example.com',
        'Should include URL in context'
      );
    }
  });

  test('should categorize timeout errors', () => {
    const timeoutErrors = [
      new Error('Timeout exceeded'),
      new Error('Navigation timeout of 30000ms exceeded'),
      new Error('Request timeout'),
    ];

    for (const error of timeoutErrors) {
      const categorized = categorizeError(error);

      assert.strictEqual(
        categorized.category,
        'timeout',
        `Should categorize "${error.message}" as timeout error`
      );
      assert.strictEqual(
        categorized.severity,
        'medium',
        'Timeout errors should have medium severity'
      );
      assert.strictEqual(
        categorized.isRecoverable,
        true,
        'Timeout errors should be recoverable'
      );
    }
  });

  test('should categorize browser crash errors', () => {
    const crashErrors = [
      new Error('Browser has been closed'),
      new Error('Browser disconnected'),
      new Error('Target closed'),
      new Error('Page crashed'),
    ];

    for (const error of crashErrors) {
      const categorized = categorizeError(error);

      assert.strictEqual(
        categorized.category,
        'browser_crash',
        `Should categorize "${error.message}" as browser crash`
      );
      assert.strictEqual(
        categorized.severity,
        'high',
        'Browser crash errors should have high severity'
      );
      assert.strictEqual(
        categorized.isRecoverable,
        true,
        'Browser crash errors should be recoverable'
      );
    }
  });

  test('should categorize element not found errors', () => {
    const elementErrors = [
      new Error('Element not found: .selector'),
      new Error('Selector did not match any elements'),
    ];

    for (const error of elementErrors) {
      const categorized = categorizeError(error);

      assert.strictEqual(
        categorized.category,
        'element_not_found',
        `Should categorize "${error.message}" as element not found`
      );
      assert.strictEqual(
        categorized.severity,
        'low',
        'Element not found errors should have low severity'
      );
      assert.strictEqual(
        categorized.isRecoverable,
        false,
        'Element not found errors should not be recoverable'
      );
    }
  });

  test('should categorize validation errors', () => {
    const validationErrors = [
      new Error('Invalid parameter value'),
      new Error('Validation failed'),
      new Error('Parameter out of range'),
    ];

    for (const error of validationErrors) {
      const categorized = categorizeError(error);

      assert.strictEqual(
        categorized.category,
        'invalid_input',
        `Should categorize "${error.message}" as invalid input`
      );
      assert.strictEqual(
        categorized.severity,
        'low',
        'Validation errors should have low severity'
      );
      assert.strictEqual(
        categorized.isRecoverable,
        false,
        'Validation errors should not be recoverable'
      );
    }
  });

  test('should categorize docker errors', () => {
    const dockerErrors = [
      new Error('Docker container failed'),
      new Error('Failed to launch browser in container'),
      new Error('Container not found'),
    ];

    for (const error of dockerErrors) {
      const categorized = categorizeError(error);

      assert.strictEqual(
        categorized.category,
        'docker',
        `Should categorize "${error.message}" as docker error`
      );
      assert.strictEqual(
        categorized.severity,
        'critical',
        'Docker errors should have critical severity'
      );
      assert.strictEqual(
        categorized.isRecoverable,
        true,
        'Docker errors should be recoverable'
      );
    }
  });

  test('should categorize resource errors', () => {
    const resourceErrors = [
      new Error('Out of memory'),
      new Error('Disk space full'),
      new Error('Resource limit exceeded'),
    ];

    for (const error of resourceErrors) {
      const categorized = categorizeError(error);

      assert.strictEqual(
        categorized.category,
        'resource',
        `Should categorize "${error.message}" as resource error`
      );
      assert.strictEqual(
        categorized.severity,
        'high',
        'Resource errors should have high severity'
      );
      assert.strictEqual(
        categorized.isRecoverable,
        true,
        'Resource errors should be recoverable'
      );
    }
  });

  test('should categorize unknown errors', () => {
    const unknownError = new Error('Some unexpected error');
    const categorized = categorizeError(unknownError);

    assert.strictEqual(
      categorized.category,
      'unknown',
      'Should categorize unrecognized errors as unknown'
    );
    assert.strictEqual(
      categorized.severity,
      'medium',
      'Unknown errors should have medium severity'
    );
    assert.strictEqual(
      categorized.isRecoverable,
      true,
      'Unknown errors should be recoverable by default'
    );
  });

  test('should include context when provided', () => {
    const error = new Error('Test error');
    const context = { url: 'https://test.com' };

    const categorized = categorizeError(error, context);

    assert.ok(categorized.context, 'Should include context');
    assert.strictEqual(
      categorized.context?.url,
      'https://test.com',
      'Should include URL from context'
    );
    assert.ok(
      typeof categorized.context?.timestamp === 'number',
      'Should include timestamp'
    );
  });

  test('should handle context without URL', () => {
    const error = new Error('Test error');

    const categorized = categorizeError(error);

    assert.ok(categorized.context, 'Should include context even without URL');
    assert.ok(
      typeof categorized.context?.timestamp === 'number',
      'Should include timestamp'
    );
    assert.strictEqual(
      categorized.context?.url,
      undefined,
      'Should not include URL when not provided'
    );
  });
});
