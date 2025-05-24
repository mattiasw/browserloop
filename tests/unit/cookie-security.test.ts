import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CookieUtils } from '../../src/cookie-utils.js';
import type { Cookie } from '../../src/types.js';

describe('Cookie Security', () => {
  describe('Input Validation Security', () => {
    test('should reject cookies with suspicious script patterns', () => {
      const maliciousCookies: Cookie[] = [
        {
          name: '<script>alert',
          value: 'test_value'
        }
      ];

      assert.throws(() => {
        CookieUtils.validateCookieSecurity(maliciousCookies);
      }, /Cookie contains suspicious patterns/);
    });

    test('should reject cookies with javascript: URLs', () => {
      const maliciousCookies: Cookie[] = [
        {
          name: 'test_cookie',
          value: 'test_value',
          domain: 'javascript:alert(1)'
        }
      ];

      assert.throws(() => {
        CookieUtils.validateCookieSecurity(maliciousCookies);
      }, /Cookie contains suspicious patterns/);
    });

    test('should reject cookies with eval patterns', () => {
      const maliciousCookies: Cookie[] = [
        {
          name: 'eval(',
          value: 'test_value'
        }
      ];

      assert.throws(() => {
        CookieUtils.validateCookieSecurity(maliciousCookies);
      }, /Cookie contains suspicious patterns/);
    });

    test('should reject cookies exceeding size limits', () => {
      const oversizedCookie = 'x'.repeat(5000); // Exceeds 4096 byte limit

      assert.throws(() => {
        CookieUtils.parseCookies([{
          name: 'test',
          value: oversizedCookie
        }] as Cookie[]);
      }, /Cookie value too long/);
    });

    test('should reject too many cookies', () => {
      const manyCookies = Array.from({ length: 60 }, (_, i) => ({
        name: `cookie_${i}`,
        value: 'value'
      }));

      assert.throws(() => {
        CookieUtils.parseCookies(manyCookies as Cookie[]);
      }, /Too many cookies/);
    });

    test('should reject invalid cookie names', () => {
      const invalidNameCookies: Cookie[] = [
        {
          name: 'cookie with spaces',
          value: 'test_value'
        }
      ];

      assert.throws(() => {
        CookieUtils.parseCookies(invalidNameCookies);
      }, /Cookie name contains invalid characters/);
    });

    test('should reject invalid domain characters', () => {
      const invalidDomainCookies: Cookie[] = [
        {
          name: 'test_cookie',
          value: 'test_value',
          domain: 'domain<script>'
        }
      ];

      assert.throws(() => {
        CookieUtils.parseCookies(invalidDomainCookies);
      }, /Cookie domain contains invalid characters/);
    });
  });

  describe('Memory Security', () => {
    test('should clear cookie values from memory', () => {
      const cookies: Cookie[] = [
        {
          name: 'sensitive_cookie',
          value: 'very_secret_value_123',
          expires: 1234567890
        }
      ];

      // Verify initial state
      assert.ok(cookies[0], 'Cookie should exist');
      assert.strictEqual(cookies[0].value, 'very_secret_value_123');
      assert.strictEqual(cookies[0].expires, 1234567890);

      // Clear memory
      CookieUtils.clearCookieMemory(cookies);

      // Verify values are cleared
      assert.ok(cookies[0], 'Cookie should still exist after clearing');
      assert.strictEqual(cookies[0].value, '');
      assert.strictEqual(cookies[0].expires, 0);
    });

    test('should handle null/undefined arrays gracefully', () => {
      // Should not throw
      CookieUtils.clearCookieMemory(null as any);
      CookieUtils.clearCookieMemory(undefined as any);
      CookieUtils.clearCookieMemory([] as Cookie[]);
    });

    test('should handle malformed cookie objects', () => {
      const malformedCookies = [
        null,
        undefined,
        'not an object',
        { name: 'test' } // missing value
      ];

      // Should not throw when clearing memory
      assert.doesNotThrow(() => {
        CookieUtils.clearCookieMemory(malformedCookies as any);
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
          path: '/secure'
        }
      ];

      const sanitized = CookieUtils.sanitizeCookiesForLogging(cookies);

      // Verify no actual values are in sanitized output
      const sanitizedStr = JSON.stringify(sanitized);
      assert.ok(!sanitizedStr.includes('super_secret_token_xyz123'), 'Sanitized output should not contain actual cookie value');
      assert.ok(sanitizedStr.includes('valueLength'), 'Should include value length');
      assert.ok(sanitizedStr.includes('hasValue'), 'Should include hasValue flag');
    });

    test('should include useful debugging info without sensitive data', () => {
      const cookies: Cookie[] = [
        {
          name: 'auth_token',
          value: 'secret123',
          domain: 'example.com',
          httpOnly: true,
          secure: true
        }
      ];

      const sanitized = CookieUtils.sanitizeCookiesForLogging(cookies);

      assert.strictEqual(sanitized.length, 1);
      const sanitizedCookie = sanitized[0] as any;

      assert.strictEqual(sanitizedCookie.name, 'auth_token');
      assert.strictEqual(sanitizedCookie.domain, 'example.com');
      assert.strictEqual(sanitizedCookie.httpOnly, true);
      assert.strictEqual(sanitizedCookie.secure, true);
      assert.strictEqual(sanitizedCookie.valueLength, 9);
      assert.strictEqual(sanitizedCookie.hasValue, true);
      assert.ok(!sanitizedCookie.hasOwnProperty('value'), 'Should not include actual value');
    });

    test('should handle auto-derived domains in logging', () => {
      const cookies: Cookie[] = [
        {
          name: 'test_cookie',
          value: 'test_value'
          // No domain specified
        }
      ];

      const sanitized = CookieUtils.sanitizeCookiesForLogging(cookies);
      const sanitizedCookie = sanitized[0] as any;

      assert.strictEqual(sanitizedCookie.domain, '[auto-derived]');
      assert.strictEqual(sanitizedCookie.path, '/');
    });
  });

  describe('Validation Bypass Prevention', () => {
    test('should not allow bypassing validation with malformed JSON', () => {
      const maliciousJson = '{"__proto__": {"name": "evil", "value": "payload"}}';

      assert.throws(() => {
        CookieUtils.parseCookies(maliciousJson);
      }, /Cookie parsing failed.*Cookie JSON must be an array/);
    });

    test('should validate all cookies in array', () => {
      const mixedCookies = [
        {
          name: 'good_cookie',
          value: 'good_value'
        },
        {
          name: '<script>',
          value: 'evil_value'
        }
      ];

      assert.throws(() => {
        CookieUtils.validateCookieSecurity(mixedCookies as Cookie[]);
      }, /Cookie contains suspicious patterns/);
    });

    test('should enforce expires timestamp limits', () => {
      const invalidExpiresCookie = [
        {
          name: 'test',
          value: 'test',
          expires: 999999999999999 // Way beyond 32-bit timestamp limit
        }
      ];

      assert.throws(() => {
        CookieUtils.parseCookies(invalidExpiresCookie as Cookie[]);
      }, /Cookie expires timestamp too large/);
    });

    test('should enforce negative expires validation', () => {
      const negativeExpiresCookie = [
        {
          name: 'test',
          value: 'test',
          expires: -1
        }
      ];

      assert.throws(() => {
        CookieUtils.parseCookies(negativeExpiresCookie as Cookie[]);
      }, /Cookie expires must be non-negative/);
    });
  });
});
