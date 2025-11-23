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

test('rejects blob URLs on private hosts', async () => {
  const payload = {
    files: [
      {
        name: 'blocked.md',
        blobUrl: 'https://127.0.0.1/blocked.md'
      }
    ],
    mode: 'text',
    search: 'foo',
    replace: 'bar',
    previewOnly: true
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload);
  const res = await handler(req);
  assert.strictEqual(res.status, 400);

  const body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.meta.error, 'Source URL is not allowed');
  assert.strictEqual(body.meta.note, 'disallowed_host');
  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 0);
});

test('rejects unsupported blob URL schemes', async () => {
  const payload = {
    files: [
      {
        name: 'ftp.md',
        blobUrl: 'ftp://example.com/ftp.md'
      }
    ],
    mode: 'text',
    search: 'foo',
    replace: 'bar',
    previewOnly: true
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload);
  const res = await handler(req);
  assert.strictEqual(res.status, 400);

  const body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.meta.error, 'Source URL is not allowed');
  assert.strictEqual(body.meta.note, 'unsupported_scheme');
  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 0);
});

test('enforces pattern length caps via 413 envelope', async () => {
  const oversized = 'x'.repeat(5000);
  const payload = {
    files: [
      {
        name: 'small.md',
        blobUrl: makeDataUrl('tiny file\n')
      }
    ],
    mode: 'text',
    search: oversized,
    replace: '',
    previewOnly: true
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload);
  const res = await handler(req);
  assert.strictEqual(res.status, 413);

  const body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.meta.error, 'Input too large');
  assert.strictEqual(body.meta.note, 'pattern_too_large');
  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 0);
});

test('caps cumulative decoded bytes and returns 413 envelope', async () => {
  const hugeChunk = 'A'.repeat(4 * 1024 * 1024); // 4 MiB
  const files = Array.from({ length: 3 }, (_, idx) => ({
    name: `big-${idx}.md`,
    blobUrl: makeDataUrl(hugeChunk)
  }));

  const payload = {
    files,
    mode: 'text',
    search: 'A',
    replace: 'B',
    previewOnly: true
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload);
  const res = await handler(req);
  assert.strictEqual(res.status, 413);

  const body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.meta.error, 'Total input too large');
  assert.strictEqual(body.meta.note, 'too_large');
  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 0);
});

test('missing search pattern returns 400 with missing_search', async () => {
  const payload = {
    files: [
      {
        name: 'one.md',
        blobUrl: makeDataUrl('# One\ncontent\n')
      }
    ],
    mode: 'text',
    search: '   ',
    replace: '',
    exportFormat: 'md',
    previewOnly: true
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload);
  const res = await handler(req);
  assert.strictEqual(res.status, 400);

  const body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.ok(body.meta);
  assert.strictEqual(body.meta.error, 'Search pattern is required');
  assert.strictEqual(body.meta.note, 'missing_search');
  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 0);
});

test('invalid exportFormat returns 400 with clear envelope', async () => {
  const payload = {
    files: [
      {
        name: 'sample.md',
        blobUrl: makeDataUrl('content\n')
      }
    ],
    mode: 'text',
    search: 'content',
    replace: 'updated',
    exportFormat: 'exe',
    previewOnly: true
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload);
  const res = await handler(req);
  assert.strictEqual(res.status, 400);

  const body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.ok(body.meta);
  assert.strictEqual(body.meta.error, 'Unsupported export format');
  assert.strictEqual(body.meta.note, 'invalid_export_format');
  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 0);
});

test('zip entry names are sanitised to remove traversal and absolute paths', async () => {
  const files = [
    {
      name: '../secret/../../etc/passwd.md',
      blobUrl: makeDataUrl('one foo line\n')
    },
    {
      name: 'C\\temp\\..\\evil.txt',
      blobUrl: makeDataUrl('second foo line\n')
    }
  ];

  const payload = {
    files,
    mode: 'text',
    search: 'foo',
    replace: 'bar',
    exportFormat: 'md',
    previewOnly: false
  };

  const req = makeRequest(`${BASE}/api/multi-file-search-replace`, payload);
  const res = await handler(req);
  assert.strictEqual(res.status, 200);

  const body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.ok(body.meta && body.meta.zip);
  const zip = body.meta.zip;
  assert.ok(zip.blobUrl && typeof zip.blobUrl === 'string');

  // Decode the data: URL and inspect central directory file names.
  const match = /^data:application\/zip;base64,(.*)$/i.exec(zip.blobUrl);
  assert.ok(match, 'zip blobUrl should be a base64 data URL');
  const buf = Buffer.from(match[1], 'base64');

  const names = [];
  let offset = 0;
  while (offset + 4 <= buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig === 0x02014b50) {
      // central directory header
      const nameLen = buf.readUInt16LE(offset + 28);
      const extraLen = buf.readUInt16LE(offset + 30);
      const commentLen = buf.readUInt16LE(offset + 32);
      const nameStart = offset + 46;
      const nameEnd = nameStart + nameLen;
      const name = buf.toString('utf8', nameStart, nameEnd);
      names.push(name);
      offset = nameEnd + extraLen + commentLen;
      continue;
    }
    // End of central directory
    if (sig === 0x06054b50) break;
    offset += 1;
  }

  assert.ok(names.length >= 2, 'expected at least two entries in zip');
  names.forEach((n) => {
    assert.ok(!n.startsWith('/'), 'zip entry should not start with /');
    assert.ok(!/^.[a-zA-Z]:/.test(n), 'zip entry should not start with drive letter');
    assert.ok(!n.includes('..'), 'zip entry should not contain traversal segments');
  });
});
