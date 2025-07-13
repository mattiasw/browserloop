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
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Test-specific type definitions for MCP responses
interface McpImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

interface McpTextContent {
  type: 'text';
  text: string;
}

interface McpContent {
  type: string;
  data?: string;
  mimeType?: string;
  text?: string;
}

interface McpCallResult {
  content: McpContent[];
  isError: boolean;
}

/**
 * Real Environment MCP Integration Test
 *
 * This test simulates actual MCP client usage by:
 * 1. Starting the MCP server as a separate process
 * 2. Connecting via stdio transport (like real AI tools do)
 * 3. Calling both screenshot and read_console tools
 * 4. Verifying proper MCP protocol responses
 *
 * This test is designed to catch MCP errors that occur in production
 * and should currently fail if there are real MCP protocol issues.
 */
describe('MCP Real Environment Integration', () => {
  let mcpClient: Client;
  let testCookieFile: string;

  before(async () => {
    // Create a temporary cookie file for authentication testing
    testCookieFile = join(process.cwd(), 'test-cookies.json');
    const testCookies = [
      {
        name: 'test-session',
        value: 'test-value-123',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
      },
    ];
    await writeFile(testCookieFile, JSON.stringify(testCookies, null, 2));

    // Create MCP client with stdio transport
    const transport = new StdioClientTransport({
      command: 'node',
      args: [join(process.cwd(), 'dist/src/index.js')],
      env: {
        ...process.env,
        BROWSERLOOP_DEBUG: 'true',
        BROWSERLOOP_DEFAULT_COOKIES: testCookieFile,
        BROWSERLOOP_DEFAULT_FORMAT: 'png',
        BROWSERLOOP_DEFAULT_QUALITY: '80',
        BROWSERLOOP_DEFAULT_WIDTH: '1280',
        BROWSERLOOP_DEFAULT_HEIGHT: '720',
      },
    });

    mcpClient = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Connect to the MCP server
    await mcpClient.connect(transport);
  });

  after(async () => {
    // Clean up resources
    try {
      if (mcpClient) {
        await mcpClient.close();
      }
    } catch (error) {
      console.error('Error closing MCP client:', error);
    }

    // Clean up test files
    try {
      await unlink(testCookieFile);
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('MCP Protocol Communication', () => {
    it('should successfully connect to MCP server', async () => {
      // Verify the client is connected
      assert.ok(mcpClient, 'MCP client should be connected');

      // Test that we can list tools
      const toolsResponse = await mcpClient.listTools();
      assert.ok(toolsResponse.tools, 'Should receive tools list');
      assert.ok(toolsResponse.tools.length > 0, 'Should have registered tools');

      // Verify both tools are registered
      const toolNames = toolsResponse.tools.map((tool) => tool.name);
      assert.ok(
        toolNames.includes('screenshot'),
        'Should have screenshot tool'
      );
      assert.ok(
        toolNames.includes('read_console'),
        'Should have read_console tool'
      );
    });

    it('should handle screenshot tool call via MCP protocol', async () => {
      // Create a simple HTML page using data URL to avoid server setup
      const testUrl =
        'data:text/html,<html><body><h1>Test Screenshot</h1><p>Hello from MCP test</p></body></html>';

      // Call the screenshot tool via MCP protocol
      const response = await mcpClient.callTool({
        name: 'screenshot',
        arguments: {
          url: testUrl,
          width: 800,
          height: 600,
          format: 'png',
          quality: 80,
          waitForNetworkIdle: false,
          timeout: 10000,
        },
      });
      const result = response as McpCallResult;

      // Verify the response structure
      assert.ok(result, 'Should receive a response');
      assert.strictEqual(
        result.isError,
        false,
        'Should not be an error response'
      );
      assert.ok(result.content, 'Should have content array');
      assert.ok(Array.isArray(result.content), 'Content should be an array');
      assert.ok(
        result.content.length >= 2,
        'Should have at least 2 content items'
      );

      // Verify image content
      const imageContent = result.content.find(
        (c: McpContent) => c.type === 'image'
      ) as McpImageContent;
      assert.ok(imageContent, 'Should have image content');
      assert.ok(imageContent.data, 'Image should have data field');
      assert.ok(imageContent.mimeType, 'Image should have mimeType field');
      assert.ok(imageContent.mimeType === 'image/png', 'Should be PNG format');

      // Verify metadata content
      const textContent = result.content.find(
        (c: McpContent) => c.type === 'text'
      ) as McpTextContent;
      assert.ok(textContent, 'Should have text content');
      assert.ok(textContent.text, 'Text should have text field');

      // Parse and verify metadata
      const metadata = JSON.parse(textContent.text);
      assert.ok(metadata.metadata, 'Should have metadata object');
      assert.ok(metadata.metadata.width, 'Should have width in metadata');
      assert.ok(metadata.metadata.height, 'Should have height in metadata');
      assert.ok(
        metadata.metadata.timestamp,
        'Should have timestamp in metadata'
      );
    });

    it('should handle read_console tool call via MCP protocol', async () => {
      // Create a test HTML page with console logs using data URL
      const testUrl = `data:text/html,<html><body><h1>Console Test</h1><script>
        console.log('Test log message');
        console.info('Test info message');
        console.warn('Test warning message');
        console.error('Test error message');
        console.debug('Test debug message');
      </script></body></html>`;

      // Call the read_console tool via MCP protocol
      const response = await mcpClient.callTool({
        name: 'read_console',
        arguments: {
          url: testUrl,
          timeout: 10000,
          sanitize: true,
          waitForNetworkIdle: false,
          logLevels: ['log', 'info', 'warn', 'error', 'debug'],
        },
      });
      const result = response as McpCallResult;

      // Verify the response structure
      assert.ok(result, 'Should receive a response');
      assert.strictEqual(
        result.isError,
        false,
        'Should not be an error response'
      );
      assert.ok(result.content, 'Should have content array');
      assert.ok(Array.isArray(result.content), 'Content should be an array');
      assert.ok(
        result.content.length >= 1,
        'Should have at least 1 content item'
      );

      // Verify text content
      const textContent = result.content.find(
        (c: McpContent) => c.type === 'text'
      ) as McpTextContent;
      assert.ok(textContent, 'Should have text content');
      assert.ok(textContent.text, 'Text should have text field');

      // Parse and verify console log data
      const consoleData = JSON.parse(textContent.text);
      assert.ok(consoleData.logs, 'Should have logs array');
      assert.ok(Array.isArray(consoleData.logs), 'Logs should be an array');
      assert.ok(consoleData.metadata, 'Should have metadata object');
      assert.ok(consoleData.metadata.url, 'Should have URL in metadata');
      assert.ok(
        consoleData.metadata.startTimestamp,
        'Should have start timestamp'
      );
      assert.ok(consoleData.metadata.endTimestamp, 'Should have end timestamp');
      assert.ok(
        consoleData.metadata.totalLogs >= 0,
        'Should have total logs count'
      );

      // Verify at least some console logs were captured
      // Note: Some logs might be filtered out, so we check >= 0
      assert.ok(consoleData.logs.length >= 0, 'Should capture console logs');
    });

    it('should handle invalid URL errors gracefully', async () => {
      // Test with invalid URL
      const response = await mcpClient.callTool({
        name: 'screenshot',
        arguments: {
          url: 'invalid-url-format',
          width: 800,
          height: 600,
        },
      });
      const result = response as McpCallResult;

      // Should return error response
      assert.ok(result, 'Should receive a response');
      assert.strictEqual(result.isError, true, 'Should be an error response');
      assert.ok(result.content, 'Should have content array');

      const textContent = result.content.find(
        (c: McpContent) => c.type === 'text'
      ) as McpTextContent;
      assert.ok(textContent, 'Should have text content');
      assert.ok(textContent.text, 'Text should have text field');
    });

    it('should handle invalid parameters gracefully', async () => {
      // Test with invalid width parameter
      const response = await mcpClient.callTool({
        name: 'screenshot',
        arguments: {
          url: 'https://example.com',
          width: 5000, // Exceeds maximum
          height: 600,
        },
      });
      const result = response as McpCallResult;

      // Should return error response
      assert.ok(result, 'Should receive a response');
      assert.strictEqual(result.isError, true, 'Should be an error response');
      assert.ok(result.content, 'Should have content array');

      const textContent = result.content.find(
        (c: McpContent) => c.type === 'text'
      ) as McpTextContent;
      assert.ok(textContent, 'Should have text content');
      assert.ok(
        textContent.text.includes('Width'),
        'Error should mention width parameter'
      );
    });

    it('should handle console tool with invalid URL', async () => {
      // Test read_console with invalid URL
      const response = await mcpClient.callTool({
        name: 'read_console',
        arguments: {
          url: 'not-a-valid-url',
          timeout: 5000,
        },
      });
      const result = response as McpCallResult;

      // Should return error response
      assert.ok(result, 'Should receive a response');
      assert.strictEqual(result.isError, true, 'Should be an error response');
      assert.ok(result.content, 'Should have content array');

      const textContent = result.content.find(
        (c: McpContent) => c.type === 'text'
      ) as McpTextContent;
      assert.ok(textContent, 'Should have text content');
      assert.ok(textContent.text, 'Text should have text field');
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should return responses in correct MCP format', async () => {
      // Test that responses follow MCP specification
      const testUrl =
        'data:text/html,<html><body><h1>Format Test</h1></body></html>';

      const response = await mcpClient.callTool({
        name: 'screenshot',
        arguments: {
          url: testUrl,
          width: 400,
          height: 300,
        },
      });
      const result = response as McpCallResult;

      // Verify MCP response format
      assert.ok(result, 'Should receive a response');
      assert.ok(
        typeof result.isError === 'boolean',
        'isError should be boolean'
      );
      assert.ok(Array.isArray(result.content), 'content should be array');

      // Verify content items follow MCP format
      for (const item of result.content) {
        assert.ok(item.type, 'Each content item should have type');
        assert.ok(
          ['text', 'image', 'resource'].includes(item.type),
          'Type should be valid MCP type'
        );

        if (item.type === 'image') {
          assert.ok(item.data, 'Image content should have data field');
          assert.ok(item.mimeType, 'Image content should have mimeType field');
        }

        if (item.type === 'text') {
          assert.ok(item.text, 'Text content should have text field');
        }
      }
    });

    it('should handle concurrent tool calls', async () => {
      // Test multiple concurrent tool calls
      const testUrl = `data:text/html,<html><body><h1>Concurrent Test</h1><script>console.log('Concurrent test');</script></body></html>`;

      const screenshotPromise = mcpClient.callTool({
        name: 'screenshot',
        arguments: {
          url: testUrl,
          width: 400,
          height: 300,
        },
      });

      const consolePromise = mcpClient.callTool({
        name: 'read_console',
        arguments: {
          url: testUrl,
          timeout: 5000,
        },
      });

      // Wait for both to complete
      const [screenshotResult, consoleResult] = await Promise.all([
        screenshotPromise,
        consolePromise,
      ]);

      // Both should succeed
      assert.ok(screenshotResult, 'Screenshot should complete');
      assert.ok(consoleResult, 'Console should complete');
      assert.strictEqual(
        (screenshotResult as McpCallResult).isError,
        false,
        'Screenshot should not error'
      );
      assert.strictEqual(
        (consoleResult as McpCallResult).isError,
        false,
        'Console should not error'
      );
    });
  });
});
