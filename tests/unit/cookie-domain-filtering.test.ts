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

import * as assert from 'node:assert';
import { test } from 'node:test';
import { filterCookiesByDomain } from '../../src/cookie-utils.js';
import type { Cookie } from '../../src/types.js';

test('filterCookiesByDomain - empty input', () => {
  const result = filterCookiesByDomain([], 'https://example.com');
  assert.deepStrictEqual(result, {
    matchingCookies: [],
    filteredCount: 0,
  });
});

test('filterCookiesByDomain - exact domain match', () => {
  const cookies: Cookie[] = [
    { name: 'test1', value: 'value1', domain: 'example.com' },
    { name: 'test2', value: 'value2', domain: 'other.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'https://example.com');

  assert.strictEqual(result.matchingCookies.length, 1);
  assert.strictEqual(result.filteredCount, 1);
  assert.strictEqual(result.matchingCookies[0]?.name, 'test1');
});

test('filterCookiesByDomain - parent domain cookies', () => {
  const cookies: Cookie[] = [
    { name: 'parent', value: 'value1', domain: '.example.com' },
    { name: 'exact', value: 'value2', domain: 'app.example.com' },
    { name: 'other', value: 'value3', domain: '.other.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'https://app.example.com');

  assert.strictEqual(result.matchingCookies.length, 2);
  assert.strictEqual(result.filteredCount, 1);

  const matchingNames = result.matchingCookies.map((c) => c.name);
  assert.ok(matchingNames.includes('parent'));
  assert.ok(matchingNames.includes('exact'));
});

test('filterCookiesByDomain - parent domain cannot set on same domain', () => {
  const cookies: Cookie[] = [
    { name: 'parent', value: 'value1', domain: '.example.com' },
    { name: 'exact', value: 'value2', domain: 'example.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'https://example.com');

  assert.strictEqual(result.matchingCookies.length, 1);
  assert.strictEqual(result.filteredCount, 1);
  assert.strictEqual(result.matchingCookies[0]?.name, 'exact');
});

test('filterCookiesByDomain - localhost handling', () => {
  const cookies: Cookie[] = [
    { name: 'local1', value: 'value1', domain: 'localhost' },
    { name: 'local2', value: 'value2', domain: '.localhost' },
    { name: 'ip', value: 'value3', domain: '127.0.0.1' },
    { name: 'other', value: 'value4', domain: 'example.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'http://localhost:3000');

  assert.strictEqual(result.matchingCookies.length, 3);
  assert.strictEqual(result.filteredCount, 1);

  const matchingNames = result.matchingCookies.map((c) => c.name);
  assert.ok(matchingNames.includes('local1'));
  assert.ok(matchingNames.includes('local2'));
  assert.ok(matchingNames.includes('ip'));
});

test('filterCookiesByDomain - __Host- cookies always match', () => {
  const cookies: Cookie[] = [
    { name: '__Host-auth', value: 'value1', domain: 'other.com' },
    { name: '__Host-session', value: 'value2' },
    { name: 'regular', value: 'value3', domain: 'other.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'https://example.com');

  assert.strictEqual(result.matchingCookies.length, 2);
  assert.strictEqual(result.filteredCount, 1);

  const matchingNames = result.matchingCookies.map((c) => c.name);
  assert.ok(matchingNames.includes('__Host-auth'));
  assert.ok(matchingNames.includes('__Host-session'));
});

test('filterCookiesByDomain - cookies without domain always match', () => {
  const cookies: Cookie[] = [
    { name: 'auto1', value: 'value1' },
    { name: 'auto2', value: 'value2', domain: undefined },
    { name: 'explicit', value: 'value3', domain: 'other.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'https://example.com');

  assert.strictEqual(result.matchingCookies.length, 2);
  assert.strictEqual(result.filteredCount, 1);

  const matchingNames = result.matchingCookies.map((c) => c.name);
  assert.ok(matchingNames.includes('auto1'));
  assert.ok(matchingNames.includes('auto2'));
});

test('filterCookiesByDomain - all cookies filtered', () => {
  const cookies: Cookie[] = [
    { name: 'other1', value: 'value1', domain: 'other.com' },
    { name: 'other2', value: 'value2', domain: 'different.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'https://example.com');

  assert.strictEqual(result.matchingCookies.length, 0);
  assert.strictEqual(result.filteredCount, 2);
});

test('filterCookiesByDomain - complex subdomain scenarios', () => {
  const cookies: Cookie[] = [
    { name: 'root', value: 'value1', domain: '.example.com' },
    { name: 'app', value: 'value2', domain: 'app.example.com' },
    { name: 'api', value: 'value3', domain: 'api.example.com' },
    { name: 'subdomain', value: 'value4', domain: '.api.example.com' },
    { name: 'other', value: 'value5', domain: '.other.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'https://app.example.com');

  assert.strictEqual(result.matchingCookies.length, 2);
  assert.strictEqual(result.filteredCount, 3);

  const matchingNames = result.matchingCookies.map((c) => c.name);
  assert.ok(matchingNames.includes('root'));
  assert.ok(matchingNames.includes('app'));
});

test('filterCookiesByDomain - case insensitive domain matching', () => {
  const cookies: Cookie[] = [
    { name: 'upper', value: 'value1', domain: 'EXAMPLE.COM' },
    { name: 'mixed', value: 'value2', domain: 'Example.Com' },
    { name: 'lower', value: 'value3', domain: 'example.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'https://Example.Com');

  assert.strictEqual(result.matchingCookies.length, 3);
  assert.strictEqual(result.filteredCount, 0);
});

test('filterCookiesByDomain - mixed __Secure- and regular cookies', () => {
  const cookies: Cookie[] = [
    { name: '__Secure-auth', value: 'value1', domain: 'example.com' },
    { name: '__Host-session', value: 'value2' },
    { name: 'regular', value: 'value3', domain: 'example.com' },
    { name: 'other', value: 'value4', domain: 'other.com' },
  ];

  const result = filterCookiesByDomain(cookies, 'https://example.com');

  assert.strictEqual(result.matchingCookies.length, 3);
  assert.strictEqual(result.filteredCount, 1);

  const matchingNames = result.matchingCookies.map((c) => c.name);
  assert.ok(matchingNames.includes('__Secure-auth'));
  assert.ok(matchingNames.includes('__Host-session'));
  assert.ok(matchingNames.includes('regular'));
});
