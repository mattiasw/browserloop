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
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

test('Docker Integration - Container can run basic commands', async () => {
  try {
    // Test that the container is running
    const { stdout: psOutput } = await execAsync('docker ps | grep browserloop-dev');
    assert(psOutput.includes('browserloop-dev'), 'Container should be running');

    // Test that we can execute commands in the container
    const { stdout: whoamiOutput } = await execAsync('docker exec browserloop-dev whoami');
    assert.strictEqual(whoamiOutput.trim(), 'playwright', 'Should run as playwright user');

    // Test that Node.js is available
    const { stdout: nodeOutput } = await execAsync('docker exec browserloop-dev node --version');
    assert(nodeOutput.startsWith('v20'), 'Should have Node.js v20');

    // Test that Playwright is installed
    const { stdout: playwrightOutput } = await execAsync('docker exec browserloop-dev npx playwright --version');
    assert(playwrightOutput.includes('Version'), 'Playwright should be installed');

    console.log('✅ Docker integration tests passed');
  } catch (error) {
    console.error('❌ Docker integration test failed:', error);
    throw error;
  }
});

test('Docker Integration - File mounts work correctly', async () => {
  try {
    // Test that source files are mounted
    const { stdout: lsOutput } = await execAsync('docker exec browserloop-dev ls -la /app/src');
    assert(lsOutput.includes('index.ts'), 'Source files should be mounted');

    // Test that package.json is mounted
    const { stdout: packageOutput } = await execAsync('docker exec browserloop-dev cat /app/package.json');
    const packageData = JSON.parse(packageOutput);
    assert.strictEqual(packageData.name, 'browserloop', 'Package.json should be correctly mounted');

    console.log('✅ File mount tests passed');
  } catch (error) {
    console.error('❌ File mount test failed:', error);
    throw error;
  }
});

test('Docker Integration - Playwright browser is available', async () => {
  try {
    // Test that Chromium browser is installed
    const { stdout: browserOutput } = await execAsync('docker exec browserloop-dev npx playwright install --dry-run chromium');
    assert(browserOutput.includes('chromium') || browserOutput.includes('already installed'), 'Chromium should be available');

    console.log('✅ Playwright browser tests passed');
  } catch (error) {
    console.error('❌ Playwright browser test failed:', error);
    throw error;
  }
});
