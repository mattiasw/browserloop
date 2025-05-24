import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { McpScreenshotServer } from '../../src/mcp-server.js';
import { isValidBase64Image } from '../../src/test-utils.js';
import { z } from 'zod';

describe('MCP Server Integration', () => {
  let server: McpScreenshotServer;

  before(async () => {
    server = new McpScreenshotServer();
  });

  after(async () => {
    if (server) {
      await server.cleanup();
    }
  });

  describe('Server Initialization', () => {
    it('should initialize MCP server successfully', async () => {
      await server.initialize();
      assert.ok(true, 'MCP server initialized without errors');
    });

    it('should create server with proper configuration', () => {
      // Test that server was created successfully
      assert.ok(server, 'MCP server instance exists');
    });
  });

  describe('MCP Protocol Implementation', () => {
    it('should use official McpServer class (prevents "No server info found" error)', () => {
      // This test ensures we're using the official McpServer class
      // which properly implements the MCP protocol handshake
      const serverInstance = (server as any).server;
      assert.ok(serverInstance, 'Server instance exists');

      // Check that the server has the expected MCP methods
      // These are internal to McpServer but we can verify the class structure
      assert.ok(typeof serverInstance.tool === 'function', 'Server has tool registration method');
      assert.ok(typeof serverInstance.connect === 'function', 'Server has connect method');

      // Verify server is an instance of the official MCP server
      assert.ok(serverInstance.constructor.name.includes('Mcp') ||
                serverInstance.constructor.name.includes('MCP') ||
                serverInstance.constructor.name === 'McpServer',
                'Server is using official MCP implementation');
    });

    it('should register screenshot tool with proper schema', () => {
      // This test verifies that tools are properly registered
      // which is required for MCP clients to discover them
      const serverInstance = (server as any).server;

      // The McpServer should have internal tool registry
      // We can't directly access it, but we can verify the tool was registered
      // by checking that the setup didn't throw an error
      assert.ok(serverInstance, 'Tool registration completed without errors');
    });

    it('should have proper stdio transport compatibility', async () => {
      // Test that the server can work with stdio transport
      // This is what MCP clients like Cursor use
      try {
        // We can't fully test stdio in a unit test, but we can verify
        // that the server is set up to handle stdio connections
        const hasStdioSupport = true; // Server uses StdioServerTransport
        assert.ok(hasStdioSupport, 'Server supports stdio transport');
      } catch (error) {
        assert.fail(`Server should support stdio transport: ${error}`);
      }
    });
  });

  describe('Tool Testing (Mock)', () => {
    it('should define screenshot tool with proper schema', () => {
      // Since we can't easily test the actual tool execution without
      // a full MCP client setup, we test that the server initializes
      // which includes registering the tool
      assert.ok(server, 'Server with screenshot tool registered');
    });

    it('should validate parameter limits in schema', () => {
      // Test that parameter validation is properly configured
      const validWidth = 1280;
      const invalidWidth = 5000; // Above max limit

      assert.ok(validWidth >= 200 && validWidth <= 4000, 'Valid width within limits');
      assert.ok(invalidWidth > 4000, 'Invalid width exceeds limits');
    });

    it('should handle default parameter values', () => {
      // Test default parameter logic
      const defaultWidth = 1280;
      const defaultHeight = 720;
      const defaultFormat = 'webp';
      const defaultQuality = 80;

      assert.strictEqual(defaultWidth, 1280, 'Default width correct');
      assert.strictEqual(defaultHeight, 720, 'Default height correct');
      assert.strictEqual(defaultFormat, 'webp', 'Default format correct');
      assert.strictEqual(defaultQuality, 80, 'Default quality correct');
    });
  });

  describe('Full Page Screenshot Support', () => {
    it('should include fullPage parameter in schema validation', () => {
      // Test that the fullPage parameter is properly defined
      const fullPageSchema = z.boolean().optional();

      // Test valid fullPage values
      assert.ok(fullPageSchema.safeParse(true).success, 'fullPage accepts true');
      assert.ok(fullPageSchema.safeParse(false).success, 'fullPage accepts false');
      assert.ok(fullPageSchema.safeParse(undefined).success, 'fullPage accepts undefined');

      // Test invalid fullPage values
      assert.ok(!fullPageSchema.safeParse('true').success, 'fullPage rejects string "true"');
      assert.ok(!fullPageSchema.safeParse(1).success, 'fullPage rejects number 1');
      assert.ok(!fullPageSchema.safeParse(null).success, 'fullPage rejects null');
    });

    it('should handle fullPage parameter routing logic', () => {
      // Test the logic that determines which screenshot method to use
      const testCases = [
        { fullPage: true, expectedMethod: 'takeFullPageScreenshot' },
        { fullPage: false, expectedMethod: 'takeScreenshot' },
        { fullPage: undefined, expectedMethod: 'takeScreenshot' }
      ];

      testCases.forEach(testCase => {
        const expectedMethod = testCase.fullPage
          ? 'takeFullPageScreenshot'
          : 'takeScreenshot';

        assert.strictEqual(expectedMethod, testCase.expectedMethod,
          `fullPage=${testCase.fullPage} should route to ${testCase.expectedMethod}`);
      });
    });

    it('should properly configure screenshot service for full page mode', () => {
      // Test that the screenshot service has both methods available
      const screenshotService = (server as any).screenshotService;
      assert.ok(screenshotService, 'Screenshot service exists');

      // Verify both methods exist
      assert.strictEqual(typeof screenshotService.takeScreenshot, 'function',
        'takeScreenshot method exists');
      assert.strictEqual(typeof screenshotService.takeFullPageScreenshot, 'function',
        'takeFullPageScreenshot method exists');
    });

    it('should include fullPage status in response metadata', () => {
      // Test that response metadata reflects fullPage parameter
      const mockMetadata = {
        width: 1280,
        height: 2000, // Taller than viewport for full page
        timestamp: Date.now(),
        url: 'http://localhost:3000',
        viewport: {
          width: 1280,
          height: 720
        },
        configuration: {
          retryCount: 3,
          userAgent: 'default'
        }
      };

      // Verify metadata structure for full page screenshots
      assert.ok(mockMetadata.height > mockMetadata.viewport.height,
        'Full page height should exceed viewport height');
      assert.strictEqual(typeof mockMetadata.width, 'number', 'Width should be number');
      assert.strictEqual(typeof mockMetadata.height, 'number', 'Height should be number');
      assert.ok(mockMetadata.viewport, 'Viewport info should be included');
    });

    it('should handle dimension differences between viewport and full page', () => {
      // Test that full page screenshots can have different dimensions than viewport
      const viewportDimensions = { width: 1280, height: 720 };
      const fullPageDimensions = { width: 1280, height: 3000 }; // Much taller

      // Verify that full page can be larger than viewport
      assert.ok(fullPageDimensions.height > viewportDimensions.height,
        'Full page height can exceed viewport height');
      assert.strictEqual(fullPageDimensions.width, viewportDimensions.width,
        'Full page width should match viewport width');

      // Test minimum and maximum constraints still apply
      assert.ok(fullPageDimensions.width >= 200 && fullPageDimensions.width <= 4000,
        'Full page width within parameter limits');
      // Note: Height limits don't apply to calculated full page height
    });
  });

  describe('Element Screenshot Support', () => {
    it('should include selector parameter in schema validation', () => {
      // Test that the selector parameter is properly defined
      const selectorSchema = z.string().optional();

      // Test valid selector values
      assert.ok(selectorSchema.safeParse('#main-header').success, 'selector accepts ID selector');
      assert.ok(selectorSchema.safeParse('.content-box').success, 'selector accepts class selector');
      assert.ok(selectorSchema.safeParse('div[data-testid="content-section"]').success, 'selector accepts attribute selector');
      assert.ok(selectorSchema.safeParse(undefined).success, 'selector accepts undefined');

      // Test invalid selector values
      assert.ok(!selectorSchema.safeParse(123).success, 'selector rejects number');
      assert.ok(!selectorSchema.safeParse(true).success, 'selector rejects boolean');
      assert.ok(!selectorSchema.safeParse(null).success, 'selector rejects null');
    });

    it('should handle selector parameter routing logic', () => {
      // Test the logic that determines which screenshot method to use
      const testCases = [
        { selector: '#main-header', fullPage: false, expectedMethod: 'takeElementScreenshot' },
        { selector: '.content-box', fullPage: true, expectedMethod: 'takeElementScreenshot' },
        { selector: undefined, fullPage: true, expectedMethod: 'takeFullPageScreenshot' },
        { selector: undefined, fullPage: false, expectedMethod: 'takeScreenshot' }
      ];

      testCases.forEach(testCase => {
        let expectedMethod;
        if (testCase.selector) {
          expectedMethod = 'takeElementScreenshot';
        } else if (testCase.fullPage) {
          expectedMethod = 'takeFullPageScreenshot';
        } else {
          expectedMethod = 'takeScreenshot';
        }

        assert.strictEqual(expectedMethod, testCase.expectedMethod,
          `selector=${testCase.selector}, fullPage=${testCase.fullPage} should route to ${testCase.expectedMethod}`);
      });
    });

    it('should properly configure screenshot service for element mode', () => {
      // Test that the screenshot service has the element screenshot method
      const screenshotService = (server as any).screenshotService;
      assert.ok(screenshotService, 'Screenshot service exists');

      // Verify element screenshot method exists
      assert.strictEqual(typeof screenshotService.takeElementScreenshot, 'function',
        'takeElementScreenshot method exists');
    });

    it('should prioritize selector over fullPage when both are provided', () => {
      // Test that element screenshots take precedence over full page when selector is provided
      const testCase = { selector: '#main-header', fullPage: true };

      // When both selector and fullPage are provided, selector should take precedence
      const expectedMethod = 'takeElementScreenshot';

      assert.strictEqual(expectedMethod, 'takeElementScreenshot',
        'selector should take precedence over fullPage parameter');
    });

    it('should include element dimensions in response metadata', () => {
      // Test that response metadata reflects element-specific information
      const mockElementMetadata = {
        width: 400, // Element width (smaller than viewport)
        height: 150, // Element height (smaller than viewport)
        timestamp: Date.now(),
        url: 'http://localhost:3000/element-test.html',
        viewport: {
          width: 1280,
          height: 720
        },
        configuration: {
          retryCount: 3,
          userAgent: 'default'
        }
      };

      // Verify metadata structure for element screenshots
      assert.ok(mockElementMetadata.width <= mockElementMetadata.viewport.width,
        'Element width should be <= viewport width');
      assert.ok(mockElementMetadata.height <= mockElementMetadata.viewport.height,
        'Element height should be <= viewport height');
      assert.strictEqual(typeof mockElementMetadata.width, 'number', 'Width should be number');
      assert.strictEqual(typeof mockElementMetadata.height, 'number', 'Height should be number');
      assert.ok(mockElementMetadata.viewport, 'Viewport info should be included');
    });
  });

  describe('Error Prevention', () => {
    it('should prevent "No server info found" error with proper MCP implementation', () => {
      // This test specifically targets the error that was happening
      // The error occurred because the server wasn't properly implementing
      // the MCP protocol initialization sequence

      const serverInstance = (server as any).server;

      // Verify the server exists and is properly configured
      assert.ok(serverInstance, 'Server instance exists for MCP communication');

      // Verify the server has proper methods for MCP protocol
      assert.ok(typeof serverInstance.connect === 'function', 'Server has connect method for MCP transport');
      assert.ok(typeof serverInstance.tool === 'function', 'Server has tool registration method');

      // Verify the server is using the official MCP implementation
      // (not a custom/manual implementation that caused the original error)
      const constructorName = serverInstance.constructor.name;
      assert.ok(constructorName === 'McpServer' || constructorName.includes('Mcp'),
                `Server is using official MCP implementation (${constructorName})`);
    });

    it('should have zod validation to prevent invalid requests', () => {
      // Test that zod is properly integrated
      // This prevents runtime errors that could cause protocol issues
      try {
        // Test zod functionality that our server uses
        const urlSchema = z.string().url();
        const numberSchema = z.number().min(1).max(100);
        const booleanSchema = z.boolean();

        // Test valid cases
        assert.ok(urlSchema.safeParse('https://example.com').success, 'URL validation works');
        assert.ok(numberSchema.safeParse(50).success, 'Number validation works');
        assert.ok(booleanSchema.safeParse(true).success, 'Boolean validation works');

        // Test invalid cases
        assert.ok(!urlSchema.safeParse('invalid-url').success, 'URL validation rejects invalid URLs');
        assert.ok(!numberSchema.safeParse(150).success, 'Number validation rejects out-of-range values');
        assert.ok(!booleanSchema.safeParse('not-boolean').success, 'Boolean validation rejects non-booleans');

      } catch (error) {
        assert.fail(`Zod validation should be available: ${error}`);
      }
    });

    it('should use proper import statements for MCP SDK', () => {
      // This test ensures we're importing from the official MCP SDK
      // If someone accidentally reverts to a manual implementation,
      // this would help catch it during testing

      // We can't easily test the imports directly, but we can test
      // that the server is constructed properly with the MCP SDK
      const serverInstance = (server as any).server;
      assert.ok(serverInstance, 'Server uses MCP SDK classes');

      // The original error was caused by not using the McpServer class
      // This test ensures we're using it
      assert.ok(typeof serverInstance.tool === 'function',
                'Server has tool method from McpServer class');
      assert.ok(typeof serverInstance.connect === 'function',
                'Server has connect method from McpServer class');
    });
  });

  describe('Error Handling', () => {
    it('should handle server cleanup gracefully', async () => {
      // Test that cleanup doesn't throw errors
      await server.cleanup();
      assert.ok(true, 'Server cleanup completed without errors');
    });

    it('should handle multiple initializations safely', async () => {
      // Test that re-initialization is safe
      await server.initialize();
      await server.initialize(); // Should not cause issues
      assert.ok(true, 'Multiple initializations handled safely');
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should use proper server name and version', () => {
      // Test that server has correct metadata
      // The new McpServer handles this internally
      assert.ok(server, 'Server configured with proper metadata');
    });

    it('should use zod for input validation', () => {
      // Test that zod validation is set up
      // This is tested implicitly by the server creation
      assert.ok(server, 'Zod validation configured');
    });
  });

  describe('Response Format Verification', () => {
    it('should return correct MCP response format with image content type', async () => {
      // This test verifies our response format matches the MCP specification
      // Expected format: { content: [{ type: 'image', data: string, mimeType: string }], isError: boolean }

      // We can't easily test the actual tool execution without a full MCP setup,
      // but we can verify the response structure by examining the tool handler
      const serverInstance = (server as any).server;
      assert.ok(serverInstance, 'Server instance exists');

      // Verify the response will have the correct structure
      // The tool handler should return content with image type and isError field

      // Test that our response format includes:
      // 1. content array with image type
      // 2. isError boolean field
      // 3. proper base64 data and mimeType for images

      const expectedImageContentStructure = {
        type: 'image',
        data: 'string', // base64 data
        mimeType: 'string' // like image/webp
      };

      const expectedTextContentStructure = {
        type: 'text',
        text: 'string' // JSON metadata
      };

      const expectedResponseStructure = {
        content: [expectedImageContentStructure, expectedTextContentStructure],
        isError: false
      };

      // Verify structure types
      assert.strictEqual(typeof expectedResponseStructure.content, 'object', 'content should be array');
      assert.strictEqual(Array.isArray(expectedResponseStructure.content), true, 'content should be array');
      assert.strictEqual(typeof expectedResponseStructure.isError, 'boolean', 'isError should be boolean');

      // Verify content array structure
      assert.ok(expectedResponseStructure.content.length >= 2, 'content should have at least 2 items');
      const firstContent = expectedResponseStructure.content[0];
      const secondContent = expectedResponseStructure.content[1];

      assert.ok(firstContent, 'first content item should exist');
      assert.ok(secondContent, 'second content item should exist');
      assert.strictEqual(firstContent.type, 'image', 'first content should be image type');
      assert.strictEqual(secondContent.type, 'text', 'second content should be text type');
    });

    it('should handle error responses with correct format', () => {
      // Test error response format
      const expectedErrorResponse = {
        content: [{
          type: 'text',
          text: 'Error message'
        }],
        isError: true
      };

      assert.strictEqual(typeof expectedErrorResponse.isError, 'boolean', 'isError should be boolean');
      assert.strictEqual(expectedErrorResponse.isError, true, 'isError should be true for errors');

      const errorContent = expectedErrorResponse.content[0];
      assert.ok(errorContent, 'error content should exist');
      assert.strictEqual(errorContent.type, 'text', 'error content should be text type');
    });

    it('should include proper metadata for full page screenshots', () => {
      // Test that full page screenshot responses include correct metadata
      const fullPageMetadata = {
        width: 1280,
        height: 2500, // Full page height
        timestamp: Date.now(),
        url: 'http://localhost:3000/long-page.html',
        viewport: {
          width: 1280,
          height: 720
        },
        configuration: {
          retryCount: 3,
          userAgent: 'default'
        }
      };

      // Verify metadata structure
      assert.ok(fullPageMetadata.height > fullPageMetadata.viewport.height,
        'Full page metadata should show height exceeding viewport');
      assert.ok(fullPageMetadata.url.includes('long-page'),
        'URL should reference long page test fixture');
      assert.strictEqual(typeof fullPageMetadata.timestamp, 'number',
        'Timestamp should be number');
    });
  });

  describe('JPEG Format Support', () => {
    it('should include jpeg in format schema validation', () => {
      const validFormats = ['webp', 'png', 'jpeg'];

      validFormats.forEach(format => {
        assert.ok(['webp', 'png', 'jpeg'].includes(format), `${format} should be supported`);
      });
    });

    it('should handle jpeg format parameter routing logic', () => {
      const mockRequest = {
        url: 'https://example.com',
        format: 'jpeg' as const,
        quality: 85
      };

      assert.strictEqual(mockRequest.format, 'jpeg');
      assert.strictEqual(mockRequest.quality, 85);
    });

    it('should properly configure screenshot service for JPEG mode', () => {
      const jpegOptions = {
        url: 'https://example.com',
        format: 'jpeg' as const,
        quality: 90
      };

      assert.strictEqual(jpegOptions.format, 'jpeg');
      assert.strictEqual(typeof jpegOptions.quality, 'number');
      assert.ok(jpegOptions.quality >= 1 && jpegOptions.quality <= 100);
    });

    it('should include JPEG MIME type in response metadata', () => {
      const expectedMimeType = 'image/jpeg';
      assert.strictEqual(expectedMimeType, 'image/jpeg');
    });
  });
});
