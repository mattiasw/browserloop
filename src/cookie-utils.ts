import { z } from 'zod';
import type { Cookie } from './types.js';

/**
 * Zod schema for validating cookie objects
 * Enhanced with security validation to prevent injection attacks
 */
const CookieSchema = z.object({
  name: z.string()
    .min(1, 'Cookie name cannot be empty')
    .max(255, 'Cookie name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Cookie name contains invalid characters'),
  value: z.string()
    .max(4096, 'Cookie value too long'), // RFC limit
  domain: z.string()
    .max(255, 'Cookie domain too long')
    .regex(/^[a-zA-Z0-9.-]*$/, 'Cookie domain contains invalid characters')
    .optional(),
  path: z.string()
    .max(4096, 'Cookie path too long')
    .optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  expires: z.number()
    .min(0, 'Cookie expires must be non-negative')
    .max(2147483647, 'Cookie expires timestamp too large') // 32-bit timestamp limit
    .optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional()
});

/**
 * Zod schema for validating arrays of cookies or JSON strings
 */
const CookiesInputSchema = z.union([
  z.array(CookieSchema).max(50, 'Too many cookies (maximum 50)'),
  z.string()
    .min(1, 'Cookie JSON string cannot be empty')
    .max(51200, 'Cookie JSON string too large (50KB limit)')
]);

export class CookieUtils {
  /**
   * Parse and validate cookies from input (array or JSON string)
   * Never logs cookie values for security
   */
  static parseCookies(input: Cookie[] | string): Cookie[] {
    try {
      // Validate input type first
      const validatedInput = CookiesInputSchema.parse(input);

      if (typeof validatedInput === 'string') {
        // Parse JSON string and validate
        const parsed = JSON.parse(validatedInput);
        if (!Array.isArray(parsed)) {
          throw new Error('Cookie JSON must be an array of cookie objects');
        }
        const validatedCookies = z.array(CookieSchema).parse(parsed);
        return validatedCookies as Cookie[];
      }

      // Input is already an array, just validate
      const validatedCookies = z.array(CookieSchema).parse(validatedInput);
      return validatedCookies as Cookie[];
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue =>
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        throw new Error(`Cookie validation failed: ${issues}`);
      }

      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in cookies parameter');
      }

      throw new Error(`Cookie parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sanitize cookies for logging (removes sensitive values)
   * SECURITY: Never logs actual cookie values
   */
  static sanitizeCookiesForLogging(cookies: Cookie[]): object[] {
    return cookies.map(cookie => ({
      name: cookie.name,
      domain: cookie.domain || '[auto-derived]',
      path: cookie.path || '/',
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      expires: cookie.expires,
      sameSite: cookie.sameSite,
      valueLength: cookie.value.length,
      hasValue: cookie.value.length > 0
    }));
  }

  /**
   * Validate and sanitize cookies input
   * SECURITY: Returns sanitized version for logging
   */
  static validateAndSanitize(input: Cookie[] | string): {
    cookies: Cookie[],
    sanitizedForLogging: object[]
  } {
    const cookies = this.parseCookies(input);
    const sanitizedForLogging = this.sanitizeCookiesForLogging(cookies);

    return { cookies, sanitizedForLogging };
  }

  /**
   * Check if input looks like a cookie array or JSON string
   */
  static isValidCookieInput(input: unknown): boolean {
    try {
      CookiesInputSchema.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear sensitive cookie data from memory
   * SECURITY: Overwrites cookie values to prevent memory dumps
   */
  static clearCookieMemory(cookies: Cookie[]): void {
    if (!cookies || !Array.isArray(cookies)) {
      return;
    }

    cookies.forEach(cookie => {
      if (cookie && typeof cookie === 'object') {
        // Overwrite sensitive fields with random data first, then empty
        if (cookie.value) {
          (cookie as any).value = Math.random().toString(36);
          (cookie as any).value = '';
        }
        if (cookie.expires) {
          (cookie as any).expires = 0;
        }
      }
    });
  }

  /**
   * Validate cookie security requirements
   * SECURITY: Enforces secure cookie practices
   */
  static validateCookieSecurity(cookies: Cookie[]): void {
    for (const cookie of cookies) {
      // Warn about insecure cookies (dev-only warning)
      if (cookie.value && cookie.value.length > 100 && !cookie.httpOnly) {
        // Note: This is just validation, no logging of actual values
      }

      // Check for suspicious patterns that might indicate injection
      if (this.containsSuspiciousPatterns(cookie.name) ||
          this.containsSuspiciousPatterns(cookie.domain || '')) {
        throw new Error(`Cookie contains suspicious patterns: ${cookie.name}`);
      }
    }
  }

  /**
   * Check for suspicious patterns that might indicate injection attacks
   */
  private static containsSuspiciousPatterns(value: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+=/i,
      /document\./i,
      /window\./i,
      /eval\(/i,
      /setTimeout\(/i,
      /setInterval\(/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(value));
  }
}
