import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base URL for the Edge /api/convert endpoint. When unset, tests are
// effectively skipped to avoid breaking environments without a running API.
const API_BASE = process.env.CONVERTER_API_BASE_URL;

// Vercel bypass token for preview environments
const BYPASS_TOKEN = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || process.env.PREVIEW_SECRET;

function buildHeaders() {
  const headers = { 'content-type': 'application/json' };
  if (BYPASS_TOKEN) {
    headers['x-vercel-protection-bypass'] = BYPASS_TOKEN;
    headers['x-vercel-set-bypass-cookie'] = 'true';
    headers['Cookie'] = `vercel-protection-bypass=${BYPASS_TOKEN}`;
  }
  return headers;
}

function makeTextPayloadFromFixture(name, ext, fromFormat) {
  const fixturePath = join(__dirname, 'fixtures', 'converter', `${name}.${ext}`);
  const text = readFileSync(fixturePath, 'utf8');
  return {
    inputs: [
      {
        blobUrl: undefined,
        text,
        name: `${name}.${ext}`,
      },
    ],
    from: fromFormat,
    to: ['md'],
    options: {},
  };
}

test('api/convert smoke – tech_doc markdown', async (t) => {
  if (!API_BASE) {
    t.skip('CONVERTER_API_BASE_URL not set; skipping api/convert smoke');
    return;
  }

  const url = new URL('/api/convert', API_BASE).toString();
  const payload = makeTextPayloadFromFixture('tech_doc', 'md', 'md');

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  assert.strictEqual(res.headers.get('content-type')?.startsWith('application/json'), true);

  const body = await res.json();
  // High-level envelope assertions
  assert.ok(typeof body === 'object' && body !== null, 'payload not JSON object');
  assert.ok(Object.hasOwn(body, 'ok'));
  assert.ok(Object.hasOwn(body, 'meta'));
  assert.ok(Array.isArray(body.outputs));
  assert.ok(Array.isArray(body.preview?.headings));
  // For a simple markdown input we expect at least one md output target
  const mdOutputs = body.outputs.filter((o) => o.target === 'md');
  assert.ok(mdOutputs.length >= 1, 'expected at least one md output');
});

test('api/convert smoke – html_input.html', async (t) => {
  if (!API_BASE) {
    t.skip('CONVERTER_API_BASE_URL not set; skipping api/convert smoke');
    return;
  }

  const url = new URL('/api/convert', API_BASE).toString();
  const payload = makeTextPayloadFromFixture('html_input', 'html', 'html');

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  assert.strictEqual(res.headers.get('content-type')?.startsWith('application/json'), true);
  const body = await res.json();

  assert.ok(typeof body === 'object' && body !== null);
  assert.ok(Array.isArray(body.outputs));
  // Expect one md output and no hard failure
  const mdOutputs = body.outputs.filter((o) => o.target === 'md');
  assert.ok(mdOutputs.length >= 1, 'expected at least one md output for html_input');

  // Use preview as a lightweight structural check: we should see the main
  // heading from html_input.html reflected here.
  const headings = body.preview?.headings || [];
  const joined = headings.join(' ');
  assert.ok(joined.toLowerCase().includes('html input fidelity test'));

  // The sanitized malformed data: URL should not crash conversion; this is
  // already implicit in getting a 200 + outputs, but if we ever add preview
  // snippets for images we can assert on "data-url-removed" here.
});
