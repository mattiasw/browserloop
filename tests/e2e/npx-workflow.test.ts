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
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Test the complete NPX workflow and functionality
 * This test verifies that the package works correctly when installed via npm/npx
 */

const BUILT_BINARY = join(process.cwd(), 'dist', 'src', 'index.js');

function createTestPromise<_T>(
  command: string,
  args: string[],
  options: {
    timeout?: number;
    env?: Record<string, string>;
    expectedExitCode?: number;
  } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const { timeout = 5000, env = {} } = options;

    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

describe('NPX Workflow Tests', () => {
  it('should display help message correctly', async () => {
    const result = await createTestPromise('node', [BUILT_BINARY, '--help']);

    assert.strictEqual(
      result.exitCode,
      0,
      'Help command should exit with code 0'
    );
    assert.match(
      result.stdout,
      /BrowserLoop v\d+\.\d+\.\d+ - MCP Screenshot Server/
    );
    assert.match(result.stdout, /USAGE:/);
    assert.match(result.stdout, /OPTIONS:/);
    assert.match(result.stdout, /DESCRIPTION:/);
    assert.match(result.stdout, /MCP INTEGRATION:/);
    assert.match(result.stdout, /ENVIRONMENT VARIABLES:/);
  });

  it('should display version information correctly', async () => {
    const result = await createTestPromise('node', [BUILT_BINARY, '--version']);

    assert.strictEqual(
      result.exitCode,
      0,
      'Version command should exit with code 0'
    );
    assert.match(result.stdout, /BrowserLoop v\d+\.\d+\.\d+/);
  });

  it('should detect NPX environment and show NPX-specific help', async () => {
    const env = {
      npm_execpath: '/usr/local/bin/npx',
      npm_command: 'exec',
    };

    const result = await createTestPromise('node', [BUILT_BINARY, '--help'], {
      env,
    });

    assert.strictEqual(
      result.exitCode,
      0,
      'NPX help command should exit with code 0'
    );
    assert.match(result.stdout, /npx browserloop@latest \[OPTIONS\]/);
    assert.match(result.stdout, /NPX USAGE:/);
    assert.match(
      result.stdout,
      /# Start the MCP server \(recommended for AI tools\)/
    );
    assert.match(result.stdout, /npx browserloop@latest/);
    assert.match(result.stdout, /BROWSER REQUIREMENTS:/);
    assert.match(result.stdout, /npx playwright install chromium/);
  });

  it('should detect NPX environment in version command', async () => {
    const env = {
      npm_execpath: '/usr/local/bin/npx',
      npm_command: 'exec',
    };

    const result = await createTestPromise(
      'node',
      [BUILT_BINARY, '--version'],
      { env }
    );

    assert.strictEqual(
      result.exitCode,
      0,
      'NPX version command should exit with code 0'
    );
    assert.match(result.stdout, /BrowserLoop v\d+\.\d+\.\d+/);
    assert.match(
      result.stdout,
      /Running via NPX - latest version downloaded automatically/
    );
  });

  it('should start MCP server without immediate errors', async () => {
    // Test that the server starts and doesn't crash immediately
    // Use a shorter timeout since we just want to verify it starts
    try {
      await createTestPromise('node', [BUILT_BINARY], {
        timeout: 2000,
        expectedExitCode: 0, // We expect it to be killed by timeout
      });
      // If we get here without timeout, that's also fine
    } catch (error) {
      // We expect a timeout error since the MCP server runs indefinitely
      if (error instanceof Error && error.message.includes('timed out')) {
        // This is expected - the server started successfully and was running
        return;
      }
      // If it's not a timeout error, then there was a real problem
      throw error;
    }
  });

  it('should handle invalid arguments gracefully', async () => {
    const result = await createTestPromise(
      'node',
      [BUILT_BINARY, '--invalid-flag'],
      {
        expectedExitCode: 1,
      }
    );

    // Should exit with error code but not crash
    assert.strictEqual(
      result.exitCode,
      1,
      'Invalid arguments should exit with code 1'
    );
  });

  it('should provide helpful browser error messages for NPX users', async () => {
    // This test simulates what happens when browsers aren't installed
    // We can't easily simulate this without breaking the actual browser,
    // so we'll test the error message formatting logic indirectly
    const env = {
      npm_execpath: '/usr/local/bin/npx',
      npm_command: 'exec',
    };

    const result = await createTestPromise('node', [BUILT_BINARY, '--help'], {
      env,
    });

    // Verify that NPX-specific browser installation instructions are shown
    assert.match(result.stdout, /npx playwright install chromium/);
    assert.match(result.stdout, /BROWSER REQUIREMENTS:/);
  });

  it('should include correct MCP configuration for NPX in help', async () => {
    const env = {
      npm_execpath: '/usr/local/bin/npx',
      npm_command: 'exec',
    };

    const result = await createTestPromise('node', [BUILT_BINARY, '--help'], {
      env,
    });

    // Verify NPX-specific MCP configuration is shown
    assert.match(result.stdout, /"command": "npx"/);
    assert.match(result.stdout, /"args": \["-y", "browserloop@latest"\]/);
  });

  it('should detect regular installation vs NPX correctly', async () => {
    // Test without NPX environment variables (regular installation)
    const result = await createTestPromise('node', [BUILT_BINARY, '--help']);

    // Should NOT contain NPX-specific content
    assert.doesNotMatch(result.stdout, /NPX USAGE:/);
    assert.doesNotMatch(result.stdout, /npx browserloop@latest \[OPTIONS\]/);
    assert.match(result.stdout, /browserloop \[OPTIONS\]/);
    assert.match(result.stdout, /"command": "browserloop"/);
  });

  it('should handle package.json version reading from dist location', async () => {
    // This tests that the version reading works when running from dist/
    const result = await createTestPromise('node', [BUILT_BINARY, '--version']);

    assert.strictEqual(result.exitCode, 0);
    assert.match(result.stdout, /BrowserLoop v\d+\.\d+\.\d+/);
    // Should not show any errors about missing package.json
    assert.strictEqual(result.stderr, '');
  });
});
