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
import { createServer, type Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createPerformanceTester } from '../../src/performance.js';
import { ScreenshotService } from '../../src/screenshot-service.js';
import { createTestScreenshotServiceConfig } from '../../src/test-utils.js';
import type { ScreenshotServiceConfig } from '../../src/types.js';

describe('Performance Benchmarks', () => {
  let server: Server;
  let screenshotService: ScreenshotService;
  const port = 3005;
  const baseUrl = `http://localhost:${port}`;

  function createTestConfig(): ScreenshotServiceConfig {
    return createTestScreenshotServiceConfig({
      screenshot: {
        defaultFormat: 'webp',
        defaultQuality: 80,
        defaultTimeout: 10000,
        defaultWaitForNetworkIdle: false,
      },
      logging: {
        debug: false,
        enableMetrics: true,
        silent: true,
      },
    });
  }

  before(async () => {
    // Create test server
    server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Performance Test Page</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .box { width: 100px; height: 100px; background: #ff6b6b; margin: 10px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Performance Test</h1>
            <p>This page is used for performance testing of the screenshot service.</p>
            <div class="box"></div>
            <div class="box"></div>
            <div class="box"></div>
          </div>
        </body>
        </html>
      `);
    });

    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        resolve();
      });
    });

    screenshotService = new ScreenshotService(createTestConfig());
    await screenshotService.initialize();
  });

  after(async () => {
    if (screenshotService) {
      await screenshotService.cleanup();
    }
    if (server) {
      server.close();
    }
  });

  test('should measure basic screenshot performance', async () => {
    const tester = createPerformanceTester(screenshotService);

    const result = await tester.measureScreenshot({
      url: baseUrl,
      width: 800,
      height: 600,
      format: 'webp',
    });

    assert.ok(result.totalTime > 0, 'Should measure execution time');
    assert.ok(result.resultSize > 0, 'Should measure result size');
    assert.ok(
      result.memory.heapUsed !== undefined,
      'Should measure memory usage'
    );

    console.log(
      `Single screenshot: ${result.totalTime}ms, ${result.resultSize} bytes`
    );
  });

  test('should benchmark sequential performance', async () => {
    const tester = createPerformanceTester(screenshotService);

    const benchmark = await tester.runBenchmark({
      iterations: 5,
      warmup: 2,
      testUrls: [baseUrl],
      screenshotOptions: {
        width: 800,
        height: 600,
        format: 'webp',
      },
      concurrent: false,
    });

    assert.ok(benchmark.summary.avg > 0, 'Should calculate average time');
    assert.ok(
      benchmark.summary.min <= benchmark.summary.avg,
      'Min should be <= average'
    );
    assert.ok(
      benchmark.summary.max >= benchmark.summary.avg,
      'Max should be >= average'
    );
    assert.ok(
      benchmark.throughput.screenshotsPerSecond > 0,
      'Should calculate throughput'
    );

    console.log(
      `Sequential (5 iterations): ${benchmark.summary.avg}ms avg, ${benchmark.throughput.screenshotsPerSecond.toFixed(2)} shots/sec`
    );
  });

  test('should benchmark concurrent performance', async () => {
    const tester = createPerformanceTester(screenshotService);

    const benchmark = await tester.runBenchmark({
      iterations: 6, // Divisible by concurrency level
      warmup: 2,
      testUrls: [baseUrl],
      screenshotOptions: {
        width: 800,
        height: 600,
        format: 'webp',
      },
      concurrent: true,
      concurrency: 3,
    });

    assert.ok(benchmark.summary.avg > 0, 'Should calculate average time');
    assert.ok(
      benchmark.throughput.screenshotsPerSecond > 0,
      'Should calculate throughput'
    );

    console.log(
      `Concurrent (6 iterations, 3 concurrent): ${benchmark.summary.avg}ms avg, ${benchmark.throughput.screenshotsPerSecond.toFixed(2)} shots/sec`
    );
  });

  test('should compare different formats performance', async () => {
    const tester = createPerformanceTester(screenshotService);

    const configs = [
      {
        name: 'PNG',
        options: {
          iterations: 3,
          warmup: 1,
          testUrls: [baseUrl],
          screenshotOptions: {
            format: 'png' as const,
            width: 600,
            height: 400,
          },
        },
      },
      {
        name: 'WebP',
        options: {
          iterations: 3,
          warmup: 1,
          testUrls: [baseUrl],
          screenshotOptions: {
            format: 'webp' as const,
            width: 600,
            height: 400,
          },
        },
      },
      {
        name: 'JPEG',
        options: {
          iterations: 3,
          warmup: 1,
          testUrls: [baseUrl],
          screenshotOptions: {
            format: 'jpeg' as const,
            width: 600,
            height: 400,
          },
        },
      },
    ];

    await tester.compareConfigurations(configs);

    // This test just verifies the comparison runs without errors
    assert.ok(true, 'Format comparison should complete successfully');
  });

  test('should verify page pooling effectiveness', async () => {
    const startTime = Date.now();

    // Take multiple screenshots to test page pooling
    const screenshots = await Promise.all([
      screenshotService.takeScreenshot({ url: baseUrl, format: 'webp' }),
      screenshotService.takeScreenshot({ url: baseUrl, format: 'webp' }),
      screenshotService.takeScreenshot({ url: baseUrl, format: 'webp' }),
    ]);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Verify all screenshots are valid
    screenshots.forEach((result, index) => {
      assert.ok(
        result.data.length > 0,
        `Screenshot ${index + 1} should have data`
      );
      assert.strictEqual(
        result.mimeType,
        'image/webp',
        `Screenshot ${index + 1} should be WebP`
      );
    });

    console.log(`Page pooling test (3 screenshots): ${totalTime}ms total`);

    // With page pooling, 3 screenshots should complete reasonably quickly
    assert.ok(
      totalTime < 15000,
      'Page pooling should improve performance for multiple screenshots'
    );
  });

  test('should measure memory efficiency', async () => {
    const startMemory = process.memoryUsage();

    // Take several screenshots to test memory usage
    for (let i = 0; i < 5; i++) {
      await screenshotService.takeScreenshot({
        url: baseUrl,
        format: 'webp',
        width: 400,
        height: 300,
      });
    }

    const endMemory = process.memoryUsage();
    const heapGrowth = endMemory.heapUsed - startMemory.heapUsed;

    console.log(
      `Memory growth after 5 screenshots: ${Math.round((heapGrowth / 1024 / 1024) * 100) / 100}MB`
    );

    // Memory growth should be reasonable (less than 100MB for 5 small screenshots)
    assert.ok(
      heapGrowth < 100 * 1024 * 1024,
      'Memory usage should be reasonable'
    );
  });
});
