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
import { describe, test } from 'node:test';
import {
  clearCookieMemory,
  parseCookies,
  sanitizeCookiesForLogging,
  validateCookieSecurity,
} from '../../src/cookie-utils.js';
import type { Cookie } from '../../src/types.js';

describe('Cookie Security', () => {
  describe('Input Validation Security', () => {
    test('should reject cookies with suspicious script patterns', () => {
      const maliciousCookies: Cookie[] = [
        {
          name: '<script>alert',
          value: 'test_value',
        },
      ];

      assert.throws(() => {
        validateCookieSecurity(maliciousCookies);
      }, /Cookie contains suspicious patterns/);
    });

    test('should reject cookies with javascript: URLs', () => {
      const maliciousCookies: Cookie[] = [
        {
          name: 'test_cookie',
          value: 'test_value',
          domain: 'javascript:alert(1)',
        },
      ];

      assert.throws(() => {
        validateCookieSecurity(maliciousCookies);
      }, /Cookie contains suspicious patterns/);
    });

    test('should reject cookies with eval patterns', () => {
      const maliciousCookies: Cookie[] = [
        {
          name: 'eval(',
          value: 'test_value',
        },
      ];

      assert.throws(() => {
        validateCookieSecurity(maliciousCookies);
      }, /Cookie contains suspicious patterns/);
    });

    test('should reject cookies exceeding size limits', () => {
      const oversizedCookie = 'x'.repeat(5000); // Exceeds 4096 byte limit

      assert.throws(() => {
        parseCookies([
          {
            name: 'test',
            value: oversizedCookie,
          },
        ] as Cookie[]);
      }, /Cookie value too long/);
    });

    test('should reject too many cookies', () => {
      const manyCookies = Array.from({ length: 60 }, (_, i) => ({
        name: `cookie_${i}`,
        value: 'value',
      }));

      assert.throws(() => {
        parseCookies(manyCookies as Cookie[]);
      }, /Too many cookies/);
    });

    test('should reject invalid cookie names', () => {
      const invalidNameCookies: Cookie[] = [
        {
          name: 'cookie with spaces',
          value: 'test_value',
        },
      ];

      assert.throws(() => {
        parseCookies(invalidNameCookies);
      }, /Cookie name contains invalid characters/);
    });

    test('should reject invalid domain characters', () => {
      const invalidDomainCookies: Cookie[] = [
        {
          name: 'test_cookie',
          value: 'test_value',
          domain: 'domain<script>',
        },
      ];

      assert.throws(() => {
        parseCookies(invalidDomainCookies);
      }, /Cookie domain contains invalid characters/);
    });
  });

  describe('Memory Security', () => {
    test('should clear cookie values from memory', () => {
      const cookies: Cookie[] = [
        {
          name: 'sensitive_cookie',
          value: 'very_secret_value_123',
          expires: 1234567890,
        },
      ];

      // Verify initial state
      assert.ok(cookies[0], 'Cookie should exist');
      assert.strictEqual(cookies[0].value, 'very_secret_value_123');
      assert.strictEqual(cookies[0].expires, 1234567890);

      // Clear memory
      clearCookieMemory(cookies);

      // Verify values are cleared
      assert.ok(cookies[0], 'Cookie should still exist after clearing');
      assert.strictEqual(cookies[0].value, '');
      assert.strictEqual(cookies[0].expires, 0);
    });

    test('should handle null/undefined arrays gracefully', () => {
      // Should not throw - testing guard clause behavior
      clearCookieMemory(null as unknown as Cookie[]);
      clearCookieMemory(undefined as unknown as Cookie[]);
      clearCookieMemory([] as Cookie[]);
    });

    test('should handle malformed cookie objects', () => {
      const malformedCookies = [
        null,
        undefined,
        'not an object',
        { name: 'test' }, // missing value
      ];

      // Should not throw when clearing memory
      assert.doesNotThrow(() => {
        clearCookieMemory(malformedCookies as unknown as Cookie[]);
      });
    });
  });

  describe('Logging Security', () => {
    test('should never log actual cookie values', () => {
      const cookies: Cookie[] = [
        {
          name: 'secret_session',
          value: 'super_secret_token_xyz123',
          domain: 'example.com',
          path: '/secure',
        },
      ];

      const sanitized = sanitizeCookiesForLogging(cookies);

      // Verify no actual values are in sanitized output
      const sanitizedStr = JSON.stringify(sanitized);
      assert.ok(
        !sanitizedStr.includes('super_secret_token_xyz123'),
        'Sanitized output should not contain actual cookie value'
      );
      assert.ok(
        sanitizedStr.includes('valueLength'),
        'Should include value length'
      );
      assert.ok(
        sanitizedStr.includes('hasValue'),
        'Should include hasValue flag'
      );
    });

    test('should include useful debugging info without sensitive data', () => {
      const cookies: Cookie[] = [
        {
          name: 'auth_token',
          value: 'secret123',
          domain: 'example.com',
          httpOnly: true,
          secure: true,
        },
      ];

      const sanitized = sanitizeCookiesForLogging(cookies);

      assert.strictEqual(sanitized.length, 1);
      const sanitizedCookie = sanitized[0] as Record<string, unknown>;

      assert.strictEqual(sanitizedCookie.name, 'auth_token');
      assert.strictEqual(sanitizedCookie.domain, 'example.com');
      assert.strictEqual(sanitizedCookie.httpOnly, true);
      assert.strictEqual(sanitizedCookie.secure, true);
      assert.strictEqual(sanitizedCookie.valueLength, 9);
      assert.strictEqual(sanitizedCookie.hasValue, true);
      assert.ok(
        !Object.hasOwn(sanitizedCookie, 'value'),
        'Should not include actual value'
      );
    });

    test('should handle auto-derived domains in logging', () => {
      const cookies: Cookie[] = [
        {
          name: 'test_cookie',
          value: 'test_value',
          // No domain specified
        },
      ];

      const sanitized = sanitizeCookiesForLogging(cookies);
      const sanitizedCookie = sanitized[0] as Record<string, unknown>;

      assert.strictEqual(sanitizedCookie.domain, '[auto-derived]');
      assert.strictEqual(sanitizedCookie.path, '/');
    });
  });

  describe('Validation Bypass Prevention', () => {
    test('should not allow bypassing validation with malformed JSON', () => {
      const maliciousJson =
        '{"__proto__": {"name": "evil", "value": "payload"}}';

      assert.throws(() => {
        parseCookies(maliciousJson);
      }, /Cookie parsing failed.*Cookie JSON must be an array/);
    });

    test('should validate all cookies in array', () => {
      const mixedCookies = [
        {
          name: 'good_cookie',
          value: 'good_value',
        },
        {
          name: '<script>',
          value: 'evil_value',
        },
      ];

      assert.throws(() => {
        validateCookieSecurity(mixedCookies as Cookie[]);
      }, /Cookie contains suspicious patterns/);
    });

    test('should enforce expires timestamp limits', () => {
      const invalidExpiresCookie = [
        {
          name: 'test',
          value: 'test',
          expires: 999999999999999, // Way beyond 32-bit timestamp limit
        },
      ];

      assert.throws(() => {
        parseCookies(invalidExpiresCookie as Cookie[]);
      }, /Cookie expires timestamp too large/);
    });

    test('should allow session cookies with expires -1', () => {
      const sessionCookie = [
        {
          name: 'test',
          value: 'test',
          expires: -1, // Session cookie
        },
      ];

      // Should not throw for session cookies
      assert.doesNotThrow(() => {
        parseCookies(sessionCookie as Cookie[]);
      });
    });

    test('should reject invalid negative expires values', () => {
      const invalidExpiresCookie = [
        {
          name: 'test',
          value: 'test',
          expires: -2, // Invalid negative value (only -1 allowed)
        },
      ];

      assert.throws(() => {
        parseCookies(invalidExpiresCookie as Cookie[]);
      }, /Cookie expires must be -1 \(session\) or positive timestamp/);
    });
  });
});
