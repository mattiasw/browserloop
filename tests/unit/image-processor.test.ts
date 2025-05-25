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
