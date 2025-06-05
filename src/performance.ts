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

/**
 * Performance testing and benchmarking utilities
 */

import type { ScreenshotService } from './screenshot-service.js';
import type { ScreenshotOptions } from './types.js';

export interface PerformanceMetrics {
  /** Total execution time in milliseconds */
  totalTime: number;
  /** Time breakdown by operation */
  breakdown: {
    browserInit?: number;
    navigation?: number;
    screenshot?: number;
    processing?: number;
  };
  /** Memory usage metrics */
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  /** Result size in bytes */
  resultSize: number;
  /** Throughput (screenshots per second) */
  throughput?: number;
}

export interface BenchmarkOptions {
  /** Number of iterations to run */
  iterations: number;
  /** Warmup iterations before measurement */
  warmup?: number;
  /** URLs to test (will cycle through them) */
  testUrls: string[];
  /** Screenshot options to use */
  screenshotOptions?: Partial<ScreenshotOptions>;
  /** Whether to run concurrent tests */
  concurrent?: boolean;
  /** Concurrency level (if concurrent is true) */
  concurrency?: number;
}

export interface BenchmarkResult {
  /** Individual test metrics */
  metrics: PerformanceMetrics[];
  /** Statistical summary */
  summary: {
    avg: number;
    min: number;
    max: number;
    median: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  /** Throughput metrics */
  throughput: {
    screenshotsPerSecond: number;
    avgBytesPerSecond: number;
  };
  /** Test configuration */
  config: BenchmarkOptions;
}

export class PerformanceTester {
  private service: ScreenshotService;

  constructor(service: ScreenshotService) {
    this.service = service;
  }

  /**
   * Measure performance of a single screenshot operation
   */
  async measureScreenshot(
    options: ScreenshotOptions
  ): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // Measure navigation time
    const navStart = Date.now();
    const result = await this.service.takeScreenshot(options);
    const navEnd = Date.now();

    const endTime = Date.now();
    const endMemory = process.memoryUsage();

    return {
      totalTime: endTime - startTime,
      breakdown: {
        navigation: navEnd - navStart,
      },
      memory: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        rss: endMemory.rss,
      },
      resultSize: Buffer.from(result.data, 'base64').length,
    };
  }

  /**
   * Run a comprehensive benchmark
   */
  async runBenchmark(options: BenchmarkOptions): Promise<BenchmarkResult> {
    const {
      iterations,
      warmup = 3,
      testUrls,
      screenshotOptions = {},
      concurrent = false,
      concurrency = 3,
    } = options;

    // Warmup phase
    console.log(`Running ${warmup} warmup iterations...`);
    for (let i = 0; i < warmup; i++) {
      const url = testUrls[i % testUrls.length];
      if (url) {
        await this.service.takeScreenshot({ url, ...screenshotOptions });
      }
    }

    console.log(`Running ${iterations} benchmark iterations...`);
    const startTime = Date.now();
    const metrics: PerformanceMetrics[] = [];

    if (concurrent) {
      // Run concurrent tests
      const batches = Math.ceil(iterations / concurrency);
      for (let batch = 0; batch < batches; batch++) {
        const batchPromises: Promise<PerformanceMetrics>[] = [];
        const batchSize = Math.min(
          concurrency,
          iterations - batch * concurrency
        );

        for (let i = 0; i < batchSize; i++) {
          const iterationIndex = batch * concurrency + i;
          const url = testUrls[iterationIndex % testUrls.length];
          if (url) {
            batchPromises.push(
              this.measureScreenshot({ url, ...screenshotOptions })
            );
          }
        }

        const batchResults = await Promise.all(batchPromises);
        metrics.push(...batchResults);
      }
    } else {
      // Run sequential tests
      for (let i = 0; i < iterations; i++) {
        const url = testUrls[i % testUrls.length];
        if (url) {
          const metric = await this.measureScreenshot({
            url,
            ...screenshotOptions,
          });
          metrics.push(metric);
        }
      }
    }

    const endTime = Date.now();
    const totalTestTime = endTime - startTime;

    // Calculate statistics
    const times = metrics.map((m) => m.totalTime);
    const sizes = metrics.map((m) => m.resultSize);
    const summary = this.calculateStatistics(times);

    const totalSize = sizes.reduce((sum, size) => sum + size, 0);
    const throughput = {
      screenshotsPerSecond: (iterations * 1000) / totalTestTime,
      avgBytesPerSecond: (totalSize * 1000) / totalTestTime,
    };

    return {
      metrics,
      summary,
      throughput,
      config: options,
    };
  }

  /**
   * Calculate statistical summary
   */
  private calculateStatistics(values: number[]) {
    if (values.length === 0) {
      return {
        avg: 0,
        min: 0,
        max: 0,
        median: 0,
        p95: 0,
        p99: 0,
        stdDev: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;

    const variance =
      sorted.reduce((acc, val) => acc + (val - avg) ** 2, 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    return {
      avg: Math.round(avg * 100) / 100,
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      median: sorted[Math.floor(sorted.length / 2)] ?? 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
      stdDev: Math.round(stdDev * 100) / 100,
    };
  }

  /**
   * Compare performance between different configurations
   */
  async compareConfigurations(
    configs: Array<{ name: string; options: BenchmarkOptions }>
  ): Promise<void> {
    console.log('Running performance comparison...\n');

    const results: Array<{ name: string; result: BenchmarkResult }> = [];

    for (const config of configs) {
      console.log(`Testing configuration: ${config.name}`);
      const result = await this.runBenchmark(config.options);
      results.push({ name: config.name, result });
      console.log(
        `Completed ${config.name}: ${result.summary.avg}ms avg, ${result.throughput.screenshotsPerSecond.toFixed(2)} shots/sec\n`
      );
    }

    // Print comparison table
    console.log('Performance Comparison Results:');
    console.log('================================');
    console.log('Config Name\t\tAvg Time\tMin Time\tMax Time\tThroughput');
    console.log('----------\t\t--------\t--------\t--------\t----------');

    for (const { name, result } of results) {
      console.log(
        `${name.padEnd(15)}\t${result.summary.avg}ms\t\t${result.summary.min}ms\t\t${result.summary.max}ms\t\t${result.throughput.screenshotsPerSecond.toFixed(2)} shots/sec`
      );
    }
  }
}

/**
 * Create a performance testing instance
 */
export function createPerformanceTester(
  service: ScreenshotService
): PerformanceTester {
  return new PerformanceTester(service);
}
