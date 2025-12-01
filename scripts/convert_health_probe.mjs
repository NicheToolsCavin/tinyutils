#!/usr/bin/env node
// Simple /api/convert health probe for the TinyUtils converter.
//
// Usage (from repo root):
//   BASE_URL=http://localhost:3000 \
//   node scripts/convert_health_probe.mjs
//
// Optional preview headers are picked up from Vercel-style env vars
// (VERCEL_AUTOMATION_BYPASS_SECRET / PREVIEW_SECRET).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.BASE_URL || process.env.CONVERTER_API_BASE_URL || 'http://localhost:3000';
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

function buildOdtDataUrl() {
  const fixturePath = join(__dirname, '..', 'tests', 'fixtures', 'converter', 'odt_invoice_sample.odt');
  const bytes = readFileSync(fixturePath);
  const base64 = bytes.toString('base64');
  const mime = 'application/vnd.oasis.opendocument.text';
  return `data:${mime};base64,${base64}`;
}

async function main() {
  const base = BASE_URL.replace(/\/$/, '');

  // Preflight GET to set Vercel bypass cookies, as per AGENTS.md + preview_smoke.
  if (BYPASS_TOKEN) {
    const preflightUrl = `${base}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(BYPASS_TOKEN)}`;
    const preRes = await fetch(preflightUrl, {
      method: 'GET',
      headers: baseHeaders,
      redirect: 'manual',
    });
    appendCookie(preRes.headers.get('set-cookie'));
  }

  const url = `${base}/api/convert?x-vercel-protection-bypass=${encodeURIComponent(BYPASS_TOKEN || '')}&x-vercel-set-bypass-cookie=true`;
  const blobUrl = buildOdtDataUrl();

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

  // eslint-disable-next-line no-console
  console.log('convert_health_probe: POST', url);

  let res = await fetch(url, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(payload),
    redirect: 'manual',
  });

  // Handle one-shot 30x handshake for preview protection, similar to
  // scripts/preview_smoke.mjs. If we see a redirect with a _vercel_jwt
  // cookie, append it and retry once with the same URL and headers.
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const handshakeCookie = parseHandshakeCookie(res.headers.get('set-cookie'));
    if (handshakeCookie) {
      baseHeaders.Cookie = baseHeaders.Cookie
        ? `${baseHeaders.Cookie}; ${handshakeCookie}`
        : handshakeCookie;
      res = await fetch(url, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(payload),
        redirect: 'manual',
      });
    }
  }

  const ct = res.headers.get('content-type') || '';
  if (!ct.startsWith('application/json')) {
    console.error('Unexpected content-type:', ct);
  }

  const body = await res.json().catch((err) => {
    console.error('Failed to parse JSON response:', err);
    return null;
  });

  if (!body || typeof body !== 'object') {
    console.error('Health probe: non-object response body');
    process.exitCode = 1;
    return;
  }

  const toolVersions = body.toolVersions || {};
  const outputs = Array.isArray(body.outputs) ? body.outputs : [];

  const summary = {
    pandocVersion: toolVersions.pandoc || null,
    outputs: outputs.map((o) => ({ target: o.target, name: o.name, size: o.size })),
    hasDocx: outputs.some((o) => o.target === 'docx' && (o.size || 0) > 0),
    hasMd: outputs.some((o) => o.target === 'md' && (o.size || 0) > 0),
    ok: !!body.ok,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('convert_health_probe error:', err);
  process.exitCode = 1;
});
