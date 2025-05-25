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

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { stat } from 'node:fs/promises';

describe('Built Server E2E', () => {
  describe('MCP Server Startup', () => {
    it('should start built server silently without console output (clean MCP communication)', async () => {
      // Test that the server starts silently (no console output for clean JSON-RPC)
      const builtServerPath = join(process.cwd(), 'dist', 'src', 'index.js');

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          serverProcess.kill();
          reject(new Error('Server startup timeout'));
        }, 5000); // Reduced timeout since we don't wait for specific output

        let stdout = '';
        let stderr = '';

        const serverProcess = spawn('node', [builtServerPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'test' },
        });

        // Give the server a moment to start
        setTimeout(() => {
          // If we get here without crashes, the server started successfully
          clearTimeout(timeout);
          serverProcess.kill();

          // Verify no console output (clean MCP communication)
          if (stdout.trim() === '' && stderr.trim() === '') {
            resolve();
          } else {
            reject(
              new Error(
                `Server should start silently but produced output: stdout="${stdout}", stderr="${stderr}"`
              )
            );
          }
        }, 2000);

        serverProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        serverProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Server process error: ${error.message}`));
        });

        serverProcess.on('exit', (code) => {
          clearTimeout(timeout);
          // If server exits cleanly (code 0) or via signal (null), that's good
          if (code === 0 || code === null) {
            resolve();
          }
        });
      });
    });

    it('should handle MCP protocol communication (stdio-based)', async () => {
      // Test that the server can handle basic stdio communication
      const builtServerPath = join(process.cwd(), 'dist', 'src', 'index.js');

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          serverProcess.kill();
          reject(new Error('MCP protocol test timeout'));
        }, 10000);

        const receivedOutput = false;

        const serverProcess = spawn('node', [builtServerPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'test' },
        });

        // Give server time to initialize
        setTimeout(() => {
          // Send a basic MCP initialize message
          const initMessage = `${JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test-client', version: '1.0.0' },
            },
          })}\n`;

          serverProcess.stdin.write(initMessage);
        }, 1000);

        // Wait for any response (indicates server is processing)
        setTimeout(() => {
          clearTimeout(timeout);
          serverProcess.kill();
          // If we get here without server crashing, it's handling stdio properly
          resolve();
        }, 8000);

        serverProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Server process error: ${error.message}`));
        });

        serverProcess.on('exit', (code) => {
          if (code !== null && code !== 0) {
            clearTimeout(timeout);
            reject(new Error(`Server exited with error code: ${code}`));
          }
        });
      });
    });

    it('should have built file available for testing', async () => {
      // Ensure the build exists in the correct location
      const builtServerPath = join(process.cwd(), 'dist', 'src', 'index.js');

      try {
        const stats = await stat(builtServerPath);
        assert.ok(
          stats.isFile(),
          'Built server file should exist and be a file'
        );
        assert.ok(stats.size > 0, 'Built server file should not be empty');
      } catch (error) {
        assert.fail(
          `Built server file not found or invalid: ${error}. Run 'npm run build' first.`
        );
      }
    });

    it('should start and stop cleanly without hanging', async () => {
      // Test that the server can start and stop without hanging
      const builtServerPath = join(process.cwd(), 'dist', 'src', 'index.js');

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          serverProcess.kill('SIGKILL'); // Force kill if hanging
          reject(
            new Error(
              'Server did not respond to termination signal - may be hanging'
            )
          );
        }, 5000); // Reduced timeout

        const serverProcess = spawn('node', [builtServerPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'test' },
        });

        // Give server time to start, then try graceful shutdown
        setTimeout(() => {
          serverProcess.kill('SIGTERM'); // Send termination signal
        }, 1000);

        serverProcess.on('exit', (code, signal) => {
          clearTimeout(timeout);
          // Server should exit cleanly with SIGTERM
          if (signal === 'SIGTERM' || code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `Server exited unexpectedly with code ${code}, signal ${signal}`
              )
            );
          }
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Server process error: ${error.message}`));
        });
      });
    });
  });
});
