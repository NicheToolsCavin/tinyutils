#!/usr/bin/env node
// URL guard assertions for /api/check (DLF) – blocked private host + happy path.

import assert from 'node:assert/strict';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TOKEN =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  process.env.PREVIEW_BYPASS_TOKEN ||
  process.env.BYPASS_TOKEN ||
  '';
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';

if (!PREVIEW_URL) {
  console.error('PREVIEW_URL not set; skipping url-guard asserts.');
  process.exit(0);
}

let cookieJar = '';

function headers(extra = {}) {
  const h = { 'content-type': 'application/json', ...extra };
  if (TOKEN) {
    h['x-vercel-protection-bypass'] = TOKEN;
    h['x-vercel-set-bypass-cookie'] = 'true';
    h['Cookie'] = `vercel-protection-bypass=${TOKEN}`;
  }
  if (PREVIEW_SECRET) h['x-preview-secret'] = PREVIEW_SECRET;
  if (cookieJar) h.Cookie = h.Cookie ? `${h.Cookie}; ${cookieJar}` : cookieJar;
  return h;
}

async function preflight() {
  if (!TOKEN) return;
  const url = `${PREVIEW_URL}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, { method: 'GET', redirect: 'manual', headers: headers() });
  const sc = res.headers.get('set-cookie');
  if (sc) {
    const first = sc.split(',')[0].split(';')[0];
    cookieJar = cookieJar ? `${cookieJar}; ${first}` : first;
  }
}

async function post(pathFragment, body) {
  if (TOKEN && !cookieJar) await preflight();
  let url = `${PREVIEW_URL}${pathFragment}`;
  if (TOKEN) {
    const qp = `x-vercel-protection-bypass=${encodeURIComponent(TOKEN)}&x-vercel-set-bypass-cookie=true`;
    url += (url.includes('?') ? '&' : '?') + qp;
  }
  const res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body), redirect: 'manual' });
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const sc = res.headers.get('set-cookie');
    if (sc && sc.includes('_vercel_jwt')) {
      const first = sc.split(',')[0].split(';')[0];
      cookieJar = cookieJar ? `${cookieJar}; ${first}` : first;
      return fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body), redirect: 'manual' });
    }
  }
  return res;
}

async function testBlockedHost() {
  const res = await post('/api/check', { pageUrl: 'http://127.0.0.1' });
  assert.ok(res.status >= 400, 'blocked host should be 4xx');
  const ct = res.headers.get('content-type') || '';
  assert.ok(ct.includes('application/json'), 'blocked host json');
  const body = await res.json();
  const msg = JSON.stringify(body).toLowerCase();
  assert.ok(msg.includes('localhost') || msg.includes('private') || msg.includes('loopback'), 'blocked host message');
  return { status: res.status, body };
}

async function testHappyPath() {
  const res = await post('/api/check', { pageUrl: 'https://example.com' });
  assert.equal(res.status, 200, 'happy path 200');
  const ct = res.headers.get('content-type') || '';
  assert.ok(ct.includes('application/json'), 'happy path json');
  const body = await res.json();
  assert.ok(body && typeof body === 'object', 'happy path body object');
  return { status: res.status, keys: Object.keys(body) };
}

async function main() {
  const results = {};
  results.blocked = await testBlockedHost();
  results.happy = await testHappyPath();
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((err) => {
  console.error('url-guard-api-assert failed:', err?.message || err);
  process.exit(1);
});
