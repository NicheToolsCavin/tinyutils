import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base URL for the Edge /api/convert endpoint. When unset, tests are
// effectively skipped to avoid breaking environments without a running API.
const API_BASE = process.env.CONVERTER_API_BASE_URL;

// Vercel bypass token for preview environments
const BYPASS_TOKEN = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  || process.env.PREVIEW_BYPASS_TOKEN
  || process.env.BYPASS_TOKEN;
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';

const baseHeaders = { 'content-type': 'application/json' };
if (BYPASS_TOKEN) {
  baseHeaders['x-vercel-protection-bypass'] = BYPASS_TOKEN;
  baseHeaders['x-vercel-set-bypass-cookie'] = 'true';
  baseHeaders.Cookie = `vercel-protection-bypass=${BYPASS_TOKEN}`;
}
if (PREVIEW_SECRET) {
  baseHeaders['x-preview-secret'] = PREVIEW_SECRET;
}

function appendCookie(setCookieHeader) {
  if (!setCookieHeader) return;
  const first = setCookieHeader.split(',')[0].split(';')[0];
  baseHeaders.Cookie = baseHeaders.Cookie ? `${baseHeaders.Cookie}; ${first}` : first;
}

function parseHandshakeCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const fragments = setCookieHeader.split('\n');
  for (const fragment of fragments) {
    const trimmed = fragment.trim();
    if (!trimmed) continue;
    const [cookiePair] = trimmed.split(';');
    if (cookiePair.startsWith('_vercel_jwt=')) {
      return cookiePair;
    }
  }
  return null;
}

async function preflightIfNeeded() {
  if (!API_BASE || !BYPASS_TOKEN) return;
  const base = API_BASE.replace(/\/$/, '');
  const preUrl = `${base}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(BYPASS_TOKEN)}`;
  const preRes = await fetch(preUrl, {
    method: 'GET',
    headers: baseHeaders,
    redirect: 'manual',
  });
  appendCookie(preRes.headers.get('set-cookie'));
}

async function fetchWithHandshake(url, options) {
  const res = await fetch(url, { ...options, headers: baseHeaders, redirect: 'manual' });
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const handshakeCookie = parseHandshakeCookie(res.headers.get('set-cookie'));
    if (handshakeCookie) {
      baseHeaders.Cookie = baseHeaders.Cookie
        ? `${baseHeaders.Cookie}; ${handshakeCookie}`
        : handshakeCookie;
      return fetch(url, { ...options, headers: baseHeaders, redirect: 'manual' });
    }
  }
  return res;
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

function makeDataUrlFromFixture(name, ext, mimeType) {
  const fixturePath = join(__dirname, 'fixtures', 'converter', `${name}.${ext}`);
  const buf = readFileSync(fixturePath);
  const base64 = Buffer.from(buf).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

test('api/convert smoke – tech_doc markdown', async (t) => {
  if (!API_BASE) {
    t.skip('CONVERTER_API_BASE_URL not set; skipping api/convert smoke');
    return;
  }

  const base = API_BASE.replace(/\/$/, '');
  await preflightIfNeeded();
  const url = `${base}/api/convert?x-vercel-protection-bypass=${encodeURIComponent(BYPASS_TOKEN || '')}&x-vercel-set-bypass-cookie=true`;
  const payload = makeTextPayloadFromFixture('tech_doc', 'md', 'md');

  const res = await fetchWithHandshake(url, {
    method: 'POST',
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

  const base = API_BASE.replace(/\/$/, '');
  await preflightIfNeeded();
  const url = `${base}/api/convert?x-vercel-protection-bypass=${encodeURIComponent(BYPASS_TOKEN || '')}&x-vercel-set-bypass-cookie=true`;
  const payload = makeTextPayloadFromFixture('html_input', 'html', 'html');

  const res = await fetchWithHandshake(url, {
    method: 'POST',
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

test('api/convert smoke – odt_invoice_sample.odt via blobUrl', async (t) => {
  if (!API_BASE) {
    t.skip('CONVERTER_API_BASE_URL not set; skipping api/convert smoke');
    return;
  }

  const base = API_BASE.replace(/\/$/, '');
  await preflightIfNeeded();
  const url = `${base}/api/convert?x-vercel-protection-bypass=${encodeURIComponent(BYPASS_TOKEN || '')}&x-vercel-set-bypass-cookie=true`;
  const blobUrl = makeDataUrlFromFixture(
    'odt_invoice_sample',
    'odt',
    'application/vnd.oasis.opendocument.text',
  );

  const payload = {
    inputs: [
      {
        blobUrl,
        text: undefined,
        name: 'odt_invoice_sample.odt',
      },
    ],
    from: 'odt',
    to: ['docx', 'md'],
    options: {},
  };

  const res = await fetchWithHandshake(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get('content-type') || '';
  assert.ok(ct.startsWith('application/json'), `expected JSON response, got ${ct}`);

  const body = await res.json();
  assert.ok(body && typeof body === 'object', 'payload not JSON object');
  assert.strictEqual(body.ok, true, 'expected ok=true in response');

  const outputs = Array.isArray(body.outputs) ? body.outputs : [];
  const docx = outputs.find((o) => o.target === 'docx');
  const md = outputs.find((o) => o.target === 'md');
  assert.ok(docx && (docx.size || 0) > 1000, 'expected non-trivial DOCX output for ODT invoice');
  assert.ok(md && (md.size || 0) > 200, 'expected non-trivial MD output for ODT invoice');
});
