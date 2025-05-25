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

import { writeFile, appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { LoggingConfig, BrowserloopError, ErrorCategory, ErrorSeverity } from './types.js';

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  error?: BrowserloopError;
}

/**
 * Error metrics for monitoring
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  lastHourErrors: number;
  lastError?: {
    timestamp: number;
    category: ErrorCategory;
    message: string;
  };
}

/**
 * Logging service that doesn't interfere with MCP stdio
 */
export class Logger {
  private config: LoggingConfig;
  private metrics: ErrorMetrics;
  private hourlyErrors: Array<{ timestamp: number; category: ErrorCategory }>;
  private startTime: number;

  constructor(config: LoggingConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {
        network: 0,
        timeout: 0,
        browser_crash: 0,
        invalid_input: 0,
        element_not_found: 0,
        docker: 0,
        resource: 0,
        unknown: 0
      },
      errorsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      lastHourErrors: 0
    };
    this.hourlyErrors = [];
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.config.debug) {
      this.log('debug', message, context);
    }
  }

  /**
   * Log general information
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error with categorization
   */
  error(message: string, error?: BrowserloopError, context?: Record<string, any>): void {
    this.log('error', message, context, error);

    if (error && this.config.enableMetrics) {
      this.updateMetrics(error);
    }
  }

  /**
   * Log retry attempt
   */
  retry(attempt: number, maxAttempts: number, error: Error, context?: Record<string, any>): void {
    this.warn(`Retry attempt ${attempt}/${maxAttempts}`, {
      ...context,
      error: error.message,
      attempt,
      maxAttempts
    });
  }

  /**
   * Log browser reset
   */
  browserReset(reason: string, context?: Record<string, any>): void {
    this.warn('Browser reset triggered', {
      ...context,
      reason
    });
  }

  /**
   * Get current error metrics
   */
  getMetrics(): ErrorMetrics {
    this.updateHourlyErrors();
    return {
      ...this.metrics,
      lastHourErrors: this.hourlyErrors.length
    };
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Clear metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics.totalErrors = 0;
    Object.keys(this.metrics.errorsByCategory).forEach(key => {
      this.metrics.errorsByCategory[key as ErrorCategory] = 0;
    });
    Object.keys(this.metrics.errorsBySeverity).forEach(key => {
      this.metrics.errorsBySeverity[key as ErrorSeverity] = 0;
    });
    this.hourlyErrors = [];
    delete this.metrics.lastError;
  }

  private log(level: LogEntry['level'], message: string, context?: Record<string, any>, error?: BrowserloopError): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      ...(context && { context }),
      ...(error && { error })
    };

    // Only write to file in debug mode (never to console to avoid stdio interference)
    if (this.config.debug && this.config.logFile) {
      this.writeToFile(entry).catch(() => {
        // Silent failure - don't interfere with main process
      });
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.config.logFile) return;

    try {
      await mkdir(dirname(this.config.logFile), { recursive: true });

      const logLine = JSON.stringify({
        timestamp: new Date(entry.timestamp).toISOString(),
        level: entry.level,
        message: entry.message,
        context: entry.context,
        error: entry.error ? {
          category: entry.error.category,
          severity: entry.error.severity,
          message: entry.error.originalError.message,
          isRecoverable: entry.error.isRecoverable
        } : undefined
      }) + '\n';

      await appendFile(this.config.logFile, logLine);
    } catch {
      // Silent failure
    }
  }

  private updateMetrics(error: BrowserloopError): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByCategory[error.category]++;
    this.metrics.errorsBySeverity[error.severity]++;

    this.metrics.lastError = {
      timestamp: Date.now(),
      category: error.category,
      message: error.originalError.message
    };

    // Track for hourly count
    this.hourlyErrors.push({
      timestamp: Date.now(),
      category: error.category
    });

    this.updateHourlyErrors();
  }

  private updateHourlyErrors(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.hourlyErrors = this.hourlyErrors.filter(error => error.timestamp > oneHourAgo);
  }
}

/**
 * Categorize error based on error message and type
 */
export function categorizeError(error: Error, context?: { url?: string }): BrowserloopError {
  const message = error.message.toLowerCase();

  const createContext = (url?: string) => ({
    timestamp: Date.now(),
    ...(url && { url })
  });

  // Network errors
  if (message.includes('network') ||
      message.includes('connection') ||
      message.includes('dns') ||
      message.includes('enotfound') ||
      message.includes('econnrefused')) {
    return {
      originalError: error,
      category: 'network',
      severity: 'medium',
      isRecoverable: true,
      context: createContext(context?.url)
    };
  }

  // Resource errors (check before timeout to avoid "exceeded" conflict)
  if (message.includes('memory') ||
      message.includes('resource') ||
      message.includes('disk') ||
      message.includes('out of memory') ||
      message.includes('resource limit')) {
    return {
      originalError: error,
      category: 'resource',
      severity: 'high',
      isRecoverable: true,
      context: createContext(context?.url)
    };
  }

  // Timeout errors (more specific patterns to avoid conflicts)
  if (message.includes('timeout') ||
      message.includes('navigation timeout') ||
      message.includes('request timeout') ||
      (message.includes('exceeded') && (message.includes('timeout') || message.includes('ms')))) {
    return {
      originalError: error,
      category: 'timeout',
      severity: 'medium',
      isRecoverable: true,
      context: createContext(context?.url)
    };
  }

  // Browser crash errors
  if (message.includes('browser has been closed') ||
      message.includes('browser disconnected') ||
      message.includes('target closed') ||
      message.includes('page crashed')) {
    return {
      originalError: error,
      category: 'browser_crash',
      severity: 'high',
      isRecoverable: true,
      context: createContext(context?.url)
    };
  }

  // Element not found errors
  if (message.includes('element not found') ||
      message.includes('selector')) {
    return {
      originalError: error,
      category: 'element_not_found',
      severity: 'low',
      isRecoverable: false,
      context: createContext(context?.url)
    };
  }

  // Input validation errors
  if (message.includes('invalid') ||
      message.includes('validation') ||
      message.includes('parameter')) {
    return {
      originalError: error,
      category: 'invalid_input',
      severity: 'low',
      isRecoverable: false,
      context: createContext(context?.url)
    };
  }

  // Docker/container errors
  if (message.includes('docker') ||
      message.includes('container') ||
      message.includes('launch browser')) {
    return {
      originalError: error,
      category: 'docker',
      severity: 'critical',
      isRecoverable: true,
      context: createContext(context?.url)
    };
  }

  // Unknown errors
  return {
    originalError: error,
    category: 'unknown',
    severity: 'medium',
    isRecoverable: true,
    context: createContext(context?.url)
  };
}
