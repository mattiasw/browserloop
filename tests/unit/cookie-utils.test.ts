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
});
