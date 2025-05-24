import sharp from 'sharp';

export interface ImageConversionOptions {
  format: 'webp' | 'png' | 'jpeg';
  quality?: number;
}

export class ImageProcessor {
  /**
   * Convert image buffer to specified format
   */
  static async convertImage(
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
        return await processor
          .png()
          .toBuffer();

      default:
        throw new Error(`Unsupported image format: ${options.format}`);
    }
  }

  /**
   * Get the appropriate MIME type for the format
   */
  static getMimeType(format: 'webp' | 'png' | 'jpeg'): string {
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
  static needsConversion(requestedFormat: 'webp' | 'png' | 'jpeg'): boolean {
    // Playwright natively supports PNG for all browsers
    // JPEG and WebP need conversion for consistent cross-browser support
    return requestedFormat !== 'png';
  }

  /**
   * Get the optimal Playwright capture format for conversion
   */
  static getPlaywrightFormat(requestedFormat: 'webp' | 'png' | 'jpeg'): 'png' | 'jpeg' {
    // For best quality conversion, always capture as PNG
    // PNG is lossless and supported by all browsers
    return 'png';
  }
}
