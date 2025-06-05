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

import { test } from 'node:test';
import assert from 'node:assert';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

test('Docker Integration - Container environment setup', async () => {
  try {
    // Test basic container setup using entrypoint override
    const { stdout: nodeOutput } = await execAsync(
      'docker run --rm --entrypoint=node browserloop:test --version'
    );
    assert(nodeOutput.startsWith('v20'), 'Should have Node.js v20');

    // Test that user is set correctly
    const { stdout: userOutput } = await execAsync(
      'docker run --rm --entrypoint=whoami browserloop:test'
    );
    assert.strictEqual(
      userOutput.trim(),
      'playwright',
      'Should run as playwright user'
    );

    // Test that Chromium is available
    const { stdout: chromiumOutput } = await execAsync(
      'docker run --rm --entrypoint=which browserloop:test chromium-browser'
    );
    assert(
      chromiumOutput.includes('/usr/bin/chromium-browser'),
      'Chromium should be installed'
    );

    console.log('✅ Docker environment tests passed');
  } catch (error) {
    console.error('❌ Docker environment test failed:', error);
    throw error;
  }
});

test('Docker Integration - Application responds to help', async () => {
  try {
    // Test that the application responds to --help
    const { stdout: helpOutput } = await execAsync(
      'docker run --rm browserloop:test --help'
    );
    assert(
      helpOutput.includes('BrowserLoop - MCP Screenshot Server'),
      'Should show help message'
    );
    assert(
      helpOutput.includes('--help'),
      'Should show help option'
    );

    // Test that the application responds to --version
    const { stdout: versionOutput } = await execAsync(
      'docker run --rm browserloop:test --version'
    );
    assert(
      versionOutput.includes('BrowserLoop v'),
      'Should show version'
    );

    console.log('✅ Application CLI tests passed');
  } catch (error) {
    console.error('❌ Application CLI test failed:', error);
    throw error;
  }
});

test('Docker Integration - Application files are correctly built', async () => {
  try {
    // Test that the built application exists using entrypoint override
    const { stdout: lsOutput } = await execAsync(
      'docker run --rm --entrypoint=ls browserloop:test -la /app/dist/src'
    );
    assert(lsOutput.includes('index.js'), 'Built index.js should exist');
    assert(lsOutput.includes('mcp-server.js'), 'Built mcp-server.js should exist');

    // Test that package.json exists
    const { stdout: packageOutput } = await execAsync(
      'docker run --rm --entrypoint=cat browserloop:test /app/package.json'
    );
    const packageData = JSON.parse(packageOutput);
    assert.strictEqual(
      packageData.name,
      'browserloop',
      'Package.json should be correctly copied'
    );

    console.log('✅ Application files test passed');
  } catch (error) {
    console.error('❌ Application files test failed:', error);
    throw error;
  }
});
