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
import { CookieUtils } from '../../src/cookie-utils.js';
import type { Cookie } from '../../src/types.js';

describe('CookieUtils', () => {
  describe('Cookie Array Parsing', () => {
    test('should parse valid cookie array', () => {
      const cookies: Cookie[] = [
        {
          name: 'session_id',
          value: 'abc123',
          domain: 'example.com'
        }
      ];

      const result = CookieUtils.parseCookies(cookies);

      assert.strictEqual(result.length, 1);
      assert.ok(result[0], 'Cookie should exist');
      assert.strictEqual(result[0].name, 'session_id');
      assert.strictEqual(result[0].value, 'abc123');
    });

    test('should throw error for empty cookie name', () => {
      const cookies = [
        {
          name: '',
          value: 'test'
        }
      ];

      assert.throws(() => {
        CookieUtils.parseCookies(cookies as Cookie[]);
      }, /Cookie validation failed.*Cookie name cannot be empty/);
    });
  });

  describe('JSON String Parsing', () => {
    test('should parse valid JSON string', () => {
      const cookiesJson = JSON.stringify([
        {
          name: 'session_id',
          value: 'abc123',
          domain: 'example.com'
        }
      ]);

      const result = CookieUtils.parseCookies(cookiesJson);

      assert.strictEqual(result.length, 1);
      assert.ok(result[0], 'Cookie should exist');
      assert.strictEqual(result[0].name, 'session_id');
      assert.strictEqual(result[0].value, 'abc123');
    });

    test('should throw error for invalid JSON', () => {
      const invalidJson = '{"invalid": json}';

      assert.throws(() => {
        CookieUtils.parseCookies(invalidJson);
      }, /Invalid JSON format in cookies parameter/);
    });

    test('should throw error for JSON that is not an array', () => {
      const nonArrayJson = JSON.stringify({
        name: 'session_id',
        value: 'abc123'
      });

      assert.throws(() => {
        CookieUtils.parseCookies(nonArrayJson);
      }, /Cookie JSON must be an array of cookie objects/);
    });
  });

  describe('Cookie Validation', () => {
    test('should validate required fields', () => {
      const invalidCookies = [
        { value: 'test' }, // missing name
        { name: 'test' }   // missing value
      ];

      invalidCookies.forEach(cookie => {
        assert.throws(() => {
          CookieUtils.parseCookies([cookie] as any);
        }, /Cookie validation failed/);
      });
    });
  });

  describe('validateAndSanitize method', () => {
    test('should return both cookies and sanitized version', () => {
      const cookies: Cookie[] = [
        {
          name: 'test_cookie',
          value: 'secret_value'
        }
      ];

      const result = CookieUtils.validateAndSanitize(cookies);

      assert.ok(result.cookies, 'Should return cookies');
      assert.ok(result.sanitizedForLogging, 'Should return sanitized version');
      assert.strictEqual(result.cookies.length, 1);
      assert.strictEqual(result.sanitizedForLogging.length, 1);

      // Verify original cookies contain values
      assert.ok(result.cookies[0], 'Cookie should exist');
      assert.strictEqual(result.cookies[0].value, 'secret_value');
    });
  });

  describe('isValidCookieInput method', () => {
    test('should validate valid cookie inputs', () => {
      const validInputs = [
        [{ name: 'test', value: 'value' }],
        JSON.stringify([{ name: 'test', value: 'value' }]),
        []
      ];

      validInputs.forEach(input => {
        assert.ok(CookieUtils.isValidCookieInput(input), `Should accept valid input`);
      });
    });

    test('should reject invalid cookie inputs', () => {
      const invalidInputs = [
        null,
        undefined,
        123
      ];

      invalidInputs.forEach((input, index) => {
        const isValid = CookieUtils.isValidCookieInput(input);
        assert.ok(!isValid, `Should reject invalid input at index ${index}: ${JSON.stringify(input)}`);
      });
    });
  });

  describe('CookieUtils - Modern Cookie Names', () => {
    test('should support modern authentication cookie names', () => {
      const modernCookies = [
        {
          name: '__Host-next-auth.csrf-token',
          value: 'csrf-token-value',
          domain: 'example.com'
        },
        {
          name: '__Secure-next-auth.callback-url',
          value: 'callback-url-value',
          domain: 'example.com'
        },
        {
          name: '__Secure-next-auth.session-token',
          value: 'session-token-value',
          domain: 'example.com'
        },
        {
          name: 'ajs_user_id',
          value: 'user-id-value',
          domain: '.example.com'
        },
        {
          name: 'simple-cookie',
          value: 'simple-value',
          domain: 'example.com'
        }
      ];

      // Should not throw an error
      const result = CookieUtils.parseCookies(modernCookies);

      assert.strictEqual(result.length, 5, 'Should parse all 5 cookies');
      assert.strictEqual(result[0]?.name, '__Host-next-auth.csrf-token', 'Should preserve __Host- prefix with dots');
      assert.strictEqual(result[1]?.name, '__Secure-next-auth.callback-url', 'Should preserve __Secure- prefix with dots');
      assert.strictEqual(result[2]?.name, '__Secure-next-auth.session-token', 'Should preserve session token name');
      assert.strictEqual(result[3]?.name, 'ajs_user_id', 'Should preserve underscore names');
      assert.strictEqual(result[4]?.name, 'simple-cookie', 'Should preserve hyphenated names');
    });

    test('should support cookie names with various valid RFC 6265 characters', () => {
      const validCookieNames = [
        'simple',
        'with-hyphens',
        'with_underscores',
        'with.dots',
        'with123numbers',
        'MixedCASE',
        '__prefix',
        'suffix__',
        'a!b#c$d%e&f',
        "g'h*i+j",
        'k^l`m|n~o'
      ];

      validCookieNames.forEach(name => {
        const cookie = {
          name: name,
          value: 'test-value',
          domain: 'example.com'
        };

        // Should not throw an error
        const result = CookieUtils.parseCookies([cookie]);
        assert.strictEqual(result.length, 1, `Should parse cookie with name: ${name}`);
        assert.strictEqual(result[0]?.name, name, `Should preserve cookie name: ${name}`);
      });
    });

    test('should reject cookie names with invalid characters', () => {
      const invalidCookieNames = [
        'with spaces',
        'with"quotes',
        'with,commas',
        'with;semicolons',
        'with=equals',
        'with[brackets]',
        'with{braces}',
        'with(parens)',
        'with<angle>',
        'with\\backslash',
        'with/slash'
      ];

      invalidCookieNames.forEach(name => {
        const cookie = {
          name: name,
          value: 'test-value',
          domain: 'example.com'
        };

        assert.throws(
          () => CookieUtils.parseCookies([cookie]),
          /Cookie name contains invalid characters/,
          `Should reject cookie name: ${name}`
        );
      });
    });

    test('should validate and sanitize modern cookies for logging', () => {
      const modernCookies = [
        {
          name: '__Host-next-auth.csrf-token',
          value: 'very-long-csrf-token-value-here',
          domain: 'example.com',
          httpOnly: true,
          secure: true
        }
      ];

      const { cookies, sanitizedForLogging } = CookieUtils.validateAndSanitize(modernCookies);

      assert.strictEqual(cookies.length, 1, 'Should validate modern cookie');
      assert.strictEqual(cookies[0]?.name, '__Host-next-auth.csrf-token', 'Should preserve modern cookie name');

      const sanitized = sanitizedForLogging[0] as any;
      assert.ok(sanitized, 'Should have sanitized version');
      assert.strictEqual(sanitized.name, '__Host-next-auth.csrf-token', 'Should preserve name in sanitized version');
      assert.strictEqual(sanitized.valueLength, 31, 'Should include value length');
      assert.strictEqual(sanitized.hasValue, true, 'Should indicate has value');
      assert.ok(!('value' in sanitized), 'Should not include actual value in sanitized version');
    });
  });
});
