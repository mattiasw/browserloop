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

import sharp from 'sharp';

export interface ImageConversionOptions {
  format: 'webp' | 'png' | 'jpeg';
  quality?: number;
}

/**
 * Convert image buffer to specified format
 */
export async function convertImage(
  inputBuffer: Buffer,
  options: ImageConversionOptions
): Promise<Buffer> {
  const processor = sharp(inputBuffer);

  switch (options.format) {
    case 'webp':
      return await processor
        .webp({ quality: options.quality || 80 })
        .toBuffer();

    case 'jpeg':
      return await processor
        .jpeg({ quality: options.quality || 80 })
        .toBuffer();

    case 'png':
      // PNG doesn't use quality setting (lossless)
      return await processor.png().toBuffer();

    default:
      throw new Error(`Unsupported image format: ${options.format}`);
  }
}

/**
 * Get the appropriate MIME type for the format
 */
export function getMimeType(format: 'webp' | 'png' | 'jpeg'): string {
  switch (format) {
    case 'webp':
      return 'image/webp';
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      throw new Error(`Unsupported image format: ${format}`);
  }
}

/**
 * Check if format conversion is needed based on Playwright's native support
 */
export function needsConversion(
  requestedFormat: 'webp' | 'png' | 'jpeg'
): boolean {
  // Playwright natively supports PNG for all browsers
  // JPEG and WebP need conversion for consistent cross-browser support
  return requestedFormat !== 'png';
}

/**
 * Get the optimal Playwright capture format for conversion
 */
export function getPlaywrightFormat(
  requestedFormat: 'webp' | 'png' | 'jpeg'
): 'png' | 'jpeg' {
  // For best quality conversion, always capture as PNG
  // PNG is lossless and supported by all browsers
  return 'png';
}
