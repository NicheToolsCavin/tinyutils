import test from 'node:test';
import assert from 'node:assert/strict';

import checkHandler from '../api/check.js';
import { installFetchStub, restoreFetchStub } from './helpers/fetchStub.mjs';

const BASE = 'https://tinyutils.net';

test.before(() => {
  installFetchStub();
});

test.after(() => {
  restoreFetchStub();
});

function makeRequest(url, init = {}) {
  return new Request(url, init);
}

test('check handler rejects non-POST with method_not_allowed envelope', async () => {
  const request = makeRequest(`${BASE}/api/check`, {
    method: 'GET'
  });

  const response = await checkHandler(request);
  assert.strictEqual(response.status, 405);
  const payload = await response.json();
  assert.strictEqual(payload.ok, false);
  assert.strictEqual(payload.code, 'method_not_allowed');
  assert.ok(payload?.meta?.stage);
  assert.ok(payload?.meta?.requestId);
  assert.strictEqual(response.headers.get('x-request-id'), payload.meta.requestId);
});

test('check handler envelopes invalid JSON with detail and scheduler meta', async () => {
  const request = makeRequest(`${BASE}/api/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{'
  });

  const response = await checkHandler(request);
  assert.strictEqual(response.status, 400);
  const payload = await response.json();
  assert.strictEqual(payload.ok, false);
  assert.strictEqual(payload.code, 'invalid_json');
  assert.strictEqual(payload.message, 'Request body must be valid JSON');
  assert.strictEqual(response.headers.get('x-request-id'), payload.meta?.requestId);
  assert.strictEqual(payload.meta?.stage, 'normalize_input');
  assert.ok(payload.meta?.detail && payload.meta.detail.length > 0);
  assert.ok(payload.meta?.scheduler);
  assert.ok(Number.isInteger(payload.meta.scheduler?.globalCap));
});
