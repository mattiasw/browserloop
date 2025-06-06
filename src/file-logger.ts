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

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class FileLogger {
  private logPath: string;
  private debugEnabled: boolean;
  private silentMode: boolean;

  constructor() {
    // Try different log paths in order of preference
    const logPaths = [
      '/var/log/browserloop.log',
      '/tmp/browserloop.log',
      `${process.env.HOME}/.browserloop.log`,
      './browserloop.log',
    ];

    this.logPath = this.findWritableLogPath(logPaths);
    this.debugEnabled = process.env.BROWSERLOOP_DEBUG === 'true';
    // Note: silentMode is no longer used for file logging, only kept for backward compatibility
    this.silentMode = process.env.BROWSERLOOP_SILENT !== 'false';

    // Initialize log file with startup message when debug is enabled
    if (this.debugEnabled) {
      this.initializeLogFile();
    }
  }

  private findWritableLogPath(paths: string[]): string {
    for (const path of paths) {
      try {
        // Try to create directory if it doesn't exist
        const dir = dirname(path);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        // Test write access
        appendFileSync(path, '');
        return path;
      } catch {
        // Continue to next path
      }
    }

    // Fallback to stderr if no file path works
    return '';
  }

  private initializeLogFile() {
    if (!this.logPath) return;

    try {
      const timestamp = new Date().toISOString();
      const startupMessage = `\n=== BrowserLoop Debug Log Started at ${timestamp} ===\n`;
      appendFileSync(this.logPath, startupMessage);
    } catch {
      // Silent failure - don't interfere with MCP protocol
    }
  }

  log(message: string) {
    // File logging only depends on debug being enabled, not silent mode
    if (!this.debugEnabled || !this.logPath) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      appendFileSync(this.logPath, logEntry);
    } catch {
      // Silent failure - don't interfere with MCP protocol
    }
  }

  debug(message: string) {
    this.log(`[DEBUG] ${message}`);
  }

  warn(message: string) {
    this.log(`[WARN] ${message}`);
  }

  error(message: string) {
    this.log(`[ERROR] ${message}`);
  }

  getLogPath(): string {
    return this.logPath;
  }
}

// Export singleton instance
export const fileLogger = new FileLogger();
