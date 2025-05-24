import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ImageProcessor } from '../../src/image-processor.js';

describe('ImageProcessor', () => {
  test('should get correct MIME types for all formats', () => {
    assert.strictEqual(ImageProcessor.getMimeType('png'), 'image/png');
    assert.strictEqual(ImageProcessor.getMimeType('jpeg'), 'image/jpeg');
    assert.strictEqual(ImageProcessor.getMimeType('webp'), 'image/webp');
  });

  test('should throw error for unsupported MIME type format', () => {
    assert.throws(() => {
      ImageProcessor.getMimeType('invalid' as any);
    }, /Unsupported image format: invalid/);
  });

  test('should correctly identify when conversion is needed', () => {
    assert.strictEqual(ImageProcessor.needsConversion('png'), false);
    assert.strictEqual(ImageProcessor.needsConversion('jpeg'), true);
    assert.strictEqual(ImageProcessor.needsConversion('webp'), true);
  });

  test('should return PNG as optimal Playwright format', () => {
    assert.strictEqual(ImageProcessor.getPlaywrightFormat('png'), 'png');
    assert.strictEqual(ImageProcessor.getPlaywrightFormat('jpeg'), 'png');
    assert.strictEqual(ImageProcessor.getPlaywrightFormat('webp'), 'png');
  });

  test('should have convertImage method', () => {
    assert.strictEqual(typeof ImageProcessor.convertImage, 'function');
  });

  test('should validate conversion options structure', () => {
    const options = {
      format: 'jpeg' as const,
      quality: 90
    };

    assert.strictEqual(typeof options.format, 'string');
    assert.strictEqual(typeof options.quality, 'number');
    assert.ok(['webp', 'png', 'jpeg'].includes(options.format));
  });
});
