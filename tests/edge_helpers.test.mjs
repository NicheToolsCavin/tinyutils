import test from 'node:test';
import assert from 'node:assert/strict';

import { csvSafeCell, isPrivateHost } from '../api/_lib/edge_helpers.js';

test('csvSafeCell prefixes formula-like strings', () => {
  const dangerous = ['=SUM(A1:A2)', '+1+2', '-10', '@cmd'];
  for (const value of dangerous) {
    const hardened = csvSafeCell(value);
    assert.ok(hardened.startsWith("'"), `expected leading quote for ${value}`);
    assert.ok(hardened.slice(1).startsWith(value), 'original value should follow leading quote');
  }
});

test('csvSafeCell leaves normal values unchanged', () => {
  const safeValues = ['hello', '123', "#notformula", ' (space)'];
  for (const value of safeValues) {
    assert.equal(csvSafeCell(value), String(value));
  }
});

test('isPrivateHost detects localhost and RFC1918', () => {
  const privateHosts = [
    'localhost',
    'LOCALHOST',
    '127.0.0.1',
    '10.1.2.3',
    '192.168.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '0.0.0.0',
    'myrouter.local',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1'
  ];
  for (const host of privateHosts) {
    assert.equal(isPrivateHost(host), true, `expected private for ${host}`);
  }
});

test('isPrivateHost allows public hosts', () => {
  const publicHosts = ['example.com', 'sub.example.org', '8.8.8.8'];
  for (const host of publicHosts) {
    assert.equal(isPrivateHost(host), false, `expected public for ${host}`);
  }
});

