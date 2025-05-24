import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type Server } from 'node:http';
import { ScreenshotService } from '../../src/screenshot-service.js';
import { createTestScreenshotServiceConfig, isValidBase64Image } from '../../src/test-utils.js';
import type { ScreenshotServiceConfig } from '../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Element Screenshots E2E', () => {
  let server: any;
  let screenshotService: ScreenshotService;
  const port = 3003;
  const baseUrl = `http://localhost:${port}`;

  function createTestConfig(): ScreenshotServiceConfig {
    return createTestScreenshotServiceConfig({
      screenshot: {
        defaultFormat: 'png',
        defaultQuality: 80,
        defaultTimeout: 30000,
        defaultWaitForNetworkIdle: false
      }
    });
  }

  before(async () => {
    server = createServer(async (req, res) => {
      let filePath: string;

      if (req.url === '/element-test.html' || req.url === '/') {
        filePath = join(__dirname, '../fixtures/element-test.html');
      } else if (req.url === '/simple-page.html') {
        filePath = join(__dirname, '../fixtures/simple-page.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      try {
        const content = await readFile(filePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
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

  describe('Element Selection and Capture', () => {
    test('should capture screenshot of element by class selector', async () => {
      const url = `${baseUrl}/simple-page.html`;
      const options = {
        url,
        selector: '.container',
        format: 'png' as const,
        timeout: 10000
      };

      const result = await screenshotService.takeElementScreenshot(options);

      assert.ok(isValidBase64Image(result.data), 'Element screenshot has valid base64 data');
      assert.strictEqual(result.mimeType, 'image/png', 'Element screenshot has correct MIME type');
      assert.ok(typeof result.width === 'number' && result.width > 0, 'Element has valid width');
      assert.ok(typeof result.height === 'number' && result.height > 0, 'Element has valid height');
      assert.ok(typeof result.timestamp === 'number', 'Element screenshot has timestamp');

      console.log(`Container element dimensions: ${result.width}x${result.height}`);
    });

    test('should capture screenshot of h1 element', async () => {
      const url = `${baseUrl}/simple-page.html`;
      const options = {
        url,
        selector: 'h1',
        format: 'png' as const,
        timeout: 10000
      };

      const result = await screenshotService.takeElementScreenshot(options);

      assert.ok(isValidBase64Image(result.data), 'H1 element screenshot is valid');
      assert.strictEqual(result.mimeType, 'image/png', 'H1 element has correct MIME type');
      assert.ok(result.width > 0 && result.height > 0, 'H1 element has valid dimensions');

      console.log(`H1 element dimensions: ${result.width}x${result.height}`);
    });

    test('should capture screenshot of test element', async () => {
      const url = `${baseUrl}/simple-page.html`;
      const options = {
        url,
        selector: '.test-element',
        format: 'webp' as const,
        timeout: 10000
      };

      const result = await screenshotService.takeElementScreenshot(options);

      assert.ok(isValidBase64Image(result.data), 'Test element screenshot is valid');
      assert.strictEqual(result.mimeType, 'image/webp', 'Test element has correct MIME type');
      assert.ok(result.width > 0 && result.height > 0, 'Test element has valid dimensions');

      console.log(`Test element dimensions: ${result.width}x${result.height}`);
    });

    test('should capture screenshot by ID selector', async () => {
      const url = `${baseUrl}/simple-page.html`;
      const options = {
        url,
        selector: '#timestamp',
        format: 'png' as const,
        timeout: 10000
      };

      const result = await screenshotService.takeElementScreenshot(options);

      assert.ok(isValidBase64Image(result.data), 'Timestamp element screenshot is valid');
      assert.ok(result.width > 0 && result.height > 0, 'Timestamp element has valid dimensions');

      console.log(`Timestamp element dimensions: ${result.width}x${result.height}`);
    });
  });

  describe('Element Screenshot vs Other Methods', () => {
    test('should produce different results than viewport screenshot', async () => {
      const url = `${baseUrl}/simple-page.html`;
      const baseOptions = {
        url,
        width: 1280,
        height: 720,
        format: 'png' as const,
        timeout: 10000
      };

      const viewportResult = await screenshotService.takeScreenshot(baseOptions);
      const elementResult = await screenshotService.takeElementScreenshot({
        ...baseOptions,
        selector: '.container'
      });

      assert.ok(isValidBase64Image(viewportResult.data), 'Viewport screenshot is valid');
      assert.ok(isValidBase64Image(elementResult.data), 'Element screenshot is valid');

      assert.strictEqual(viewportResult.width, 1280, 'Viewport screenshot has correct width');
      assert.strictEqual(viewportResult.height, 720, 'Viewport screenshot has correct height');

      assert.ok(elementResult.width !== viewportResult.width || elementResult.height !== viewportResult.height,
        'Element screenshot should have different dimensions than viewport');

      assert.ok(elementResult.width < viewportResult.width, 'Element width should be smaller than viewport');
      assert.ok(elementResult.height < viewportResult.height, 'Element height should be smaller than viewport');

      console.log(`Viewport: ${viewportResult.width}x${viewportResult.height}`);
      console.log(`Element: ${elementResult.width}x${elementResult.height}`);
    });

    test('should handle small and large elements differently', async () => {
      const url = `${baseUrl}/simple-page.html`;
      const baseOptions = {
        url,
        format: 'png' as const,
        timeout: 10000
      };

      const smallElementResult = await screenshotService.takeElementScreenshot({
        ...baseOptions,
        selector: '#timestamp'
      });

      const largeElementResult = await screenshotService.takeElementScreenshot({
        ...baseOptions,
        selector: '.container'
      });

      assert.ok(isValidBase64Image(smallElementResult.data), 'Small element screenshot is valid');
      assert.ok(isValidBase64Image(largeElementResult.data), 'Large element screenshot is valid');

      assert.ok(largeElementResult.width > smallElementResult.width,
        'Large element should be wider than small element');
      assert.ok(largeElementResult.height > smallElementResult.height,
        'Large element should be taller than small element');

      console.log(`Small element: ${smallElementResult.width}x${smallElementResult.height}`);
      console.log(`Large element: ${largeElementResult.width}x${largeElementResult.height}`);
    });
  });

  describe('Element Screenshot Error Handling', () => {
    test('should throw error for non-existent element', async () => {
      const options = {
        url: `${baseUrl}/simple-page.html`,
        selector: '#non-existent-element',
        format: 'png' as const,
        timeout: 5000
      };

      try {
        await screenshotService.takeElementScreenshot(options);
        assert.fail('Should have thrown error for non-existent element');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw Error instance');
        assert.ok(error.message.includes('Element not found'), 'Error message should mention element not found');
        assert.ok(error.message.includes('#non-existent-element'), 'Error message should include selector');
      }
    });

    test('should throw error when selector is missing', async () => {
      const options = {
        url: `${baseUrl}/simple-page.html`,
        format: 'png' as const,
        timeout: 5000
      };

      try {
        await screenshotService.takeElementScreenshot(options);
        assert.fail('Should have thrown error for missing selector');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw Error instance');
        assert.ok(error.message.includes('Selector is required'), 'Error message should mention selector requirement');
      }
    });

    test('should handle invalid CSS selectors gracefully', async () => {
      const options = {
        url: `${baseUrl}/simple-page.html`,
        selector: ':::invalid-selector',
        format: 'png' as const,
        timeout: 5000
      };

      try {
        await screenshotService.takeElementScreenshot(options);
        assert.fail('Should have thrown error for invalid CSS selector');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw Error instance');
        assert.ok(error.message.length > 0, 'Error should have descriptive message');
      }
    });
  });

  describe('Element Screenshot Quality and Formats', () => {
    test('should handle different image formats for element screenshots', async () => {
      const url = `${baseUrl}/simple-page.html`;
      const baseOptions = {
        url,
        selector: '.container',
        timeout: 10000
      };

      const pngResult = await screenshotService.takeElementScreenshot({
        ...baseOptions,
        format: 'png' as const
      });

      const webpResult = await screenshotService.takeElementScreenshot({
        ...baseOptions,
        format: 'webp' as const
      });

      assert.ok(isValidBase64Image(pngResult.data), 'PNG element screenshot is valid');
      assert.ok(isValidBase64Image(webpResult.data), 'WebP element screenshot is valid');

      assert.strictEqual(pngResult.mimeType, 'image/png', 'PNG element has correct MIME type');
      assert.strictEqual(webpResult.mimeType, 'image/webp', 'WebP element has correct MIME type');

      assert.strictEqual(pngResult.width, webpResult.width, 'Both formats have same width');
      assert.strictEqual(pngResult.height, webpResult.height, 'Both formats have same height');
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle multiple element screenshots efficiently', async () => {
      const url = `${baseUrl}/simple-page.html`;
      const selectors = ['.container', 'h1', '.test-element'];

      const startTime = Date.now();

      const screenshots = await Promise.all(
        selectors.map(selector =>
          screenshotService.takeElementScreenshot({
            url,
            selector,
            format: 'png' as const,
            timeout: 10000
          })
        )
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      screenshots.forEach((result, index) => {
        assert.ok(isValidBase64Image(result.data), `Element screenshot ${index + 1} is valid`);
        assert.ok(result.width > 0 && result.height > 0, `Element screenshot ${index + 1} has valid dimensions`);
        console.log(`Element ${selectors[index]}: ${result.width}x${result.height}`);
      });

      assert.ok(totalTime < 30000, `Multiple element screenshots should complete in reasonable time (${totalTime}ms)`);
    });
  });
});
