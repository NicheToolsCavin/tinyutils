import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';

import encodingDoctor from '../api/encoding-doctor.js';
import { installFetchStub, restoreFetchStub } from './helpers/fetchStub.mjs';

const BASE = 'https://tinyutils-eight.vercel.app';

function makeRequest(payload, extraHeaders = {}) {
  return new Request(`${BASE}/api/encoding-doctor`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(payload)
  });
}

function makeDataUrl(text, mimeType = 'text/markdown') {
  const buf = Buffer.from(String(text || ''), 'utf8');
  const base64 = buf.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

function assertJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  assert.ok(
    contentType.includes('application/json'),
    `expected JSON response but got ${contentType}`
  );
}

async function parsePayload(response) {
  assertJsonResponse(response);
  const body = await response.json();
  assert.ok(body && typeof body === 'object', 'payload not JSON object');
  assert.ok(Object.hasOwn(body, 'meta'), 'missing meta block');
  assert.strictEqual(body.meta?.requestId, response.headers.get('x-request-id'));
  return body;
}

test.before(() => {
  installFetchStub();

  const baseFetch = globalThis.fetch;

  // Stub /api/convert so Encoding Doctor can treat blobUrls as Markdown text directly.
  globalThis.fetch = async (url, init = {}) => {
    if (typeof url === 'string' && url.startsWith(`${BASE}/api/convert`)) {
      const bodyText = typeof init.body === 'string' ? init.body : '{}';
      let payload;
      try {
        payload = JSON.parse(bodyText);
      } catch {
        payload = {};
      }
      const inputs = Array.isArray(payload.inputs) ? payload.inputs : [];
      const outputs = inputs.map((input, index) => ({
        target: 'md',
        name: (input && input.name) || `input-${index + 1}.md`,
        blobUrl: (input && input.blobUrl) || ''
      }));

      const responseBody = JSON.stringify({
        ok: true,
        meta: { requestId: 'convert-stub' },
        outputs
      });

      return new Response(responseBody, {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'x-request-id': 'convert-stub'
        }
      });
    }

    return baseFetch(url, init);
  };
});

test.after(() => {
  restoreFetchStub();
});

test('encoding doctor repairs basic mojibake for text only', async () => {
  const payload = {
    text: 'FranÃ§ois dâ€™Arcy â€” résumé',
    options: {
      autoRepair: true,
      normalizeForm: 'NFC',
      smartPunctuation: true
    }
  };

  const req = makeRequest(payload, { 'x-request-id': 'encoding-text-basic' });
  const res = await encodingDoctor(req);
  assert.strictEqual(res.status, 200);

  const body = await parsePayload(res);
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.meta.textIncluded, true);
  assert.strictEqual(body.meta.fileCount, 0);

  assert.ok(body.text);
  assert.strictEqual(body.text.fixed, 'François d’Arcy — résumé');
  assert.match(body.text.summary || '', /mojibake/i);
});

test('mixed clean and broken text does not over-correct', async () => {
  const payload = {
    text: 'Café, déjà vu, FranÃ§ois',
    options: {
      autoRepair: true,
      normalizeForm: 'NFC',
      smartPunctuation: false
    }
  };

  const req = makeRequest(payload, { 'x-request-id': 'encoding-text-mixed' });
  const res = await encodingDoctor(req);
  assert.strictEqual(res.status, 200);

  const body = await parsePayload(res);
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.meta.textIncluded, true);

  assert.ok(body.text);
  assert.strictEqual(body.text.fixed, 'Café, déjà vu, François');
});

test('file-based workflow repairs mojibake and returns data URLs', async () => {
  const badText = 'FranÃ§ois dâ€™Arcy â€” résumé';
  const dataUrl = makeDataUrl(badText, 'text/markdown');

  const payload = {
    files: [
      { name: 'bad.md', blobUrl: dataUrl }
    ],
    options: {
      autoRepair: true,
      normalizeForm: 'NFC',
      smartPunctuation: true
    }
  };

  const req = makeRequest(payload, { 'x-request-id': 'encoding-file-basic' });
  const res = await encodingDoctor(req);
  assert.strictEqual(res.status, 200);

  const body = await parsePayload(res);
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.meta.fileCount, 1);

  assert.ok(Array.isArray(body.files));
  assert.strictEqual(body.files.length, 1);

  const file = body.files[0];
  assert.strictEqual(file.name, 'bad.md');
  assert.ok(file.summary && /mojibake/i.test(file.summary));
  assert.ok(typeof file.previewOriginal === 'string');
  assert.ok(typeof file.previewFixed === 'string');
  assert.match(file.blobUrl || '', /^data:/);
});

test('missing input returns a 400 error with missing_input code', async () => {
  const payload = {
    text: '',
    files: [],
    options: {}
  };

  const req = makeRequest(payload, { 'x-request-id': 'encoding-missing-input' });
  const res = await encodingDoctor(req);
  assert.strictEqual(res.status, 400);

  const body = await parsePayload(res);
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.meta.note, 'missing_input');
  assert.ok(body.meta.error && /paste some text|add at least one file/i.test(body.meta.error));
});
