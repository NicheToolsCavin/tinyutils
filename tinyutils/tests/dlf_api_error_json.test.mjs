import test from 'node:test';
import assert from 'node:assert/strict';

import handler from '../api/check.js';

test('DLF API responds with JSON error envelopes', async () => {
  const request = new Request('https://tinyutils.net/api/check', {
    method: 'GET'
  });

  const response = await handler(request);

  const contentType = response.headers.get('content-type') || '';
  assert.ok(
    contentType.includes('application/json'),
    `Expected JSON content-type, got "${contentType}"`
  );

  const payload = await response.json();
  assert.strictEqual(typeof payload, 'object');
  assert.strictEqual(payload.ok, false);
  assert.ok(typeof payload.message === 'string' && payload.message.length > 0);
  assert.ok(typeof payload.requestId === 'string' && payload.requestId.length > 0);
});
