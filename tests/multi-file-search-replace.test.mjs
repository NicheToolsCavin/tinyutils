import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';

import handler from '../api/multi-file-search-replace.js';
import { installFetchStub, restoreFetchStub } from './helpers/fetchStub.mjs';

const BASE = 'https://tinyutils-local.test';

function makeRequest(url, payload, extraHeaders = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(payload)
  });
}

function makeDataUrl(text) {
  const base64 = Buffer.from(String(text), 'utf8').toString('base64');
  return `data:text/markdown;base64,${base64}`;
}

let underlyingFetch;

test.before(() => {
  // Use the shared stub for all non-convert traffic (Wayback, DLF, etc.)
  installFetchStub();
  underlyingFetch = globalThis.fetch;

  globalThis.fetch = async (url, init = {}) => {
    // Intercept only the local convert endpoint used by these tests
    if (typeof url === 'string') {
      try {
        const target = new URL(url);
        if (target.hostname === 'tinyutils-local.test' && target.pathname === '/api/convert') {
          let bodyJson = {};
          if (init && typeof init.body === 'string') {
            try {
              bodyJson = JSON.parse(init.body);
            } catch {
              bodyJson = {};
            }
          }

          const inputs = Array.isArray(bodyJson.inputs) ? bodyJson.inputs : [];
          const outputs = inputs.map((input, index) => ({
            target: 'md',
            name: input?.name || `input-${index + 1}.md`,
            blobUrl: input?.blobUrl || ''
          }));

          const responsePayload = {
            ok: true,
            meta: {
              requestId: 'test-convert'
            },
            outputs
          };

          return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8'
            }
          });
        }
      } catch {
        // fall through to underlying fetch stub
      }
    }

    return underlyingFetch(url, init);
  };
});

test.after(() => {
  if (underlyingFetch) {
    globalThis.fetch = underlyingFetch;
  }
  restoreFetchStub();
});

test('plain text replace across multiple files', async () => {
  const files = [
    {
      name: 'one.md',
      blobUrl: makeDataUrl('# One\nfoo foo\n')
    },
    {
      name: 'two.md',
      blobUrl: makeDataUrl('# Two\nno matches here\n')
    }
  ];

  const payload = {
    files,
    mode: 'text',
    search: 'foo',
    replace: 'bar',
    previewOnly: true
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload, {
    'x-request-id': 'test-plain'
  });

  const res = await handler(req);
  assert.strictEqual(res.status, 200);

  const body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 2);

  const [first, second] = body.files;
  assert.strictEqual(first.name, 'one.md');
  assert.strictEqual(first.matches, 2);
  assert.strictEqual(first.changed, true);

  assert.strictEqual(second.name, 'two.md');
  assert.strictEqual(second.matches, 0);
  assert.strictEqual(second.changed, false);

  assert.strictEqual(body.meta.totalFiles, 2);
  assert.strictEqual(body.meta.changedFiles, 1);
  assert.strictEqual(body.meta.previewOnly, true);
});

test('regex mode with zero matches leaves files unchanged', async () => {
  const files = [
    {
      name: 'sample.md',
      blobUrl: makeDataUrl('foo bar baz\nnothing to see here\n')
    }
  ];

  const payload = {
    files,
    mode: 'regex',
    search: 'foo(?=bar)', // requires "foobar" with no space; text does not match
    replace: 'baz',
    previewOnly: true
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload);
  const res = await handler(req);
  assert.strictEqual(res.status, 200);

  const body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 1);

  const file = body.files[0];
  assert.strictEqual(file.matches, 0);
  assert.strictEqual(file.changed, false);
  assert.strictEqual(body.meta.changedFiles, 0);
});

test('invalid regex returns error envelope', async () => {
  const files = [
    {
      name: 'broken.md',
      blobUrl: makeDataUrl('just some content\n')
    }
  ];

  const payload = {
    files,
    mode: 'regex',
    search: '(',
    replace: '',
    previewOnly: true
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload);
  const res = await handler(req);
  assert.strictEqual(res.status, 400);

  const body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.ok(body.meta);
  assert.strictEqual(body.meta.error, 'Invalid regular expression');
  assert.strictEqual(body.meta.note, 'invalid_regex');
  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 0);
});

