import { z } from 'zod';
import type { Cookie } from './types.js';

/**
 * Zod schema for validating cookie objects
 */
const CookieSchema = z.object({
  name: z.string().min(1, 'Cookie name cannot be empty'),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  expires: z.number().optional(),
  sameSite: z.enum(['Strict', 'Lax', 'None']).optional()
});

/**
 * Zod schema for validating arrays of cookies or JSON strings
 */
const CookiesInputSchema = z.union([
  z.array(CookieSchema),
  z.string().min(1, 'Cookie JSON string cannot be empty')
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
   */
  static sanitizeCookiesForLogging(cookies: Cookie[]): object[] {
    return cookies.map(cookie => ({
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      expires: cookie.expires,
      sameSite: cookie.sameSite,
      valueLength: cookie.value.length
    }));
  }

  /**
   * Validate and sanitize cookies input
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
}
