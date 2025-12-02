#!/usr/bin/env node
// Assertion-bearing API checks for data-tools endpoints against preview/prod with bypass.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TOKEN =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  process.env.PREVIEW_BYPASS_TOKEN ||
  process.env.BYPASS_TOKEN ||
  '';
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';

if (!PREVIEW_URL) {
  console.error('PREVIEW_URL not set; skipping data-tools API asserts.');
  process.exit(0);
}

const fixturesRoot = process.env.DATA_TOOLS_FIXTURES_DIR || path.join(process.env.HOME || '.', 'dev', 'TinyUtils', 'fixtures');
const pdfPath = path.join(fixturesRoot, 'pdf', 'dummy_w3c.pdf');
if (!fs.existsSync(pdfPath)) {
  console.error('PDF fixture missing:', pdfPath);
  process.exit(1);
}

function headers(extra = {}) {
  const h = { ...extra };
  if (TOKEN) {
    h['x-vercel-protection-bypass'] = TOKEN;
    h['x-vercel-set-bypass-cookie'] = 'true';
    h['Cookie'] = `vercel-protection-bypass=${TOKEN}`;
  }
  if (PREVIEW_SECRET) h['x-preview-secret'] = PREVIEW_SECRET;
  return h;
}

let cookieJar = '';

async function preflight() {
  if (!TOKEN) return;
  const url = `${PREVIEW_URL}/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, { method: 'GET', redirect: 'manual', headers: headers() });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const first = setCookie.split(',')[0].split(';')[0];
    cookieJar = cookieJar ? `${cookieJar}; ${first}` : first;
  }
}

async function fetchWithBypass(pathFragment, options = {}) {
  if (TOKEN && !cookieJar) await preflight();
  let url = `${PREVIEW_URL}${pathFragment}`;
  if (TOKEN) {
    const qp = `x-vercel-protection-bypass=${encodeURIComponent(TOKEN)}&x-vercel-set-bypass-cookie=true`;
    url += (url.includes('?') ? '&' : '?') + qp;
  }
  const hdrs = headers(options.headers || {});
  if (cookieJar) {
    hdrs.Cookie = hdrs.Cookie ? `${hdrs.Cookie}; ${cookieJar}` : cookieJar;
  }

  const attempt = async () => {
    const res = await fetch(url, { ...options, headers: hdrs, redirect: 'manual' });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const sc = res.headers.get('set-cookie');
      if (sc && sc.includes('_vercel_jwt')) {
        const first = sc.split(',')[0].split(';')[0];
        cookieJar = cookieJar ? `${cookieJar}; ${first}` : first;
        const retryHdrs = { ...hdrs, Cookie: hdrs.Cookie ? `${hdrs.Cookie}; ${cookieJar}` : cookieJar };
        return fetch(url, { ...options, headers: retryHdrs, redirect: 'manual' });
      }
    }
    return res;
  };

  return attempt();
}

function buildForm(fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

async function testJsonToolsJsonToCsv() {
  const payload = { user: { id: 1, name: 'Cavin' }, meta: { tags: ['a', 'b'], active: true } };
  const fd = buildForm({ mode: 'json_to_csv', file: new Blob([JSON.stringify(payload)], { type: 'application/json' }), filename: 'data.json' });
  const res = await fetchWithBypass('/api/json_tools', { method: 'POST', body: fd });
  assert.equal(res.status, 200, 'json_to_csv status');
  const ct = res.headers.get('content-type') || '';
  assert.ok(ct.includes('text/csv'), 'json_to_csv content-type');
  const body = await res.text();
  assert.ok(body.includes('meta.active'), 'csv header meta.active');
  assert.ok(body.includes('Cavin'), 'csv contains name');
  return { ct, preview: body.slice(0, 120) };
}

async function testJsonToolsCsvToJson() {
  const csv = 'id,name\n1,Cavin\n2,Alex\n';
  const fd = buildForm({ mode: 'csv_to_json', file: new Blob([csv], { type: 'text/csv' }), filename: 'data.csv' });
  const res = await fetchWithBypass('/api/json_tools', { method: 'POST', body: fd });
  assert.equal(res.status, 200, 'csv_to_json status');
  const ct = res.headers.get('content-type') || '';
  assert.ok(ct.includes('application/json'), 'csv_to_json content-type');
  const body = await res.json();
  assert.ok(Array.isArray(body) && body.length === 2, 'csv_to_json length 2');
  assert.equal(body[0].name, 'Cavin');
  return { ct, sample: body[0] };
}

async function testPdfExtractInvalidZip() {
  const bad = new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'application/zip' });
  const fd = buildForm({ file: bad, filename: 'bad.zip' });
  const res = await fetchWithBypass('/api/pdf_extract', { method: 'POST', body: fd });
  assert.ok(res.status === 400 || res.status === 422, 'invalid zip should be 4xx');
  const ct = res.headers.get('content-type') || '';
  assert.ok(ct.includes('application/json'), 'invalid zip json');
  const body = await res.json();
  assert.ok(body.error, 'invalid zip error present');
  return { status: res.status, error: body.error };
}

async function testPdfExtractSinglePdf() {
  const buf = fs.readFileSync(pdfPath);
  const fd = buildForm({ file: new Blob([buf], { type: 'application/pdf' }), filename: 'dummy_w3c.pdf' });
  const res = await fetchWithBypass('/api/pdf_extract', { method: 'POST', body: fd });
  assert.equal(res.status, 200, 'pdf_extract status');
  const ct = res.headers.get('content-type') || '';
  assert.ok(ct.includes('application/zip'), 'pdf_extract zip');
  const cd = res.headers.get('content-disposition') || '';
  assert.ok(/extracted_text\.zip/i.test(cd), 'pdf_extract filename');
  const ab = await res.arrayBuffer();
  assert.ok(ab.byteLength > 100, 'zip size');
  return { ct, cd, size: ab.byteLength };
}

async function main() {
  const results = {};
  results.json_to_csv = await testJsonToolsJsonToCsv();
  results.csv_to_json = await testJsonToolsCsvToJson();
  results.pdf_invalid = await testPdfExtractInvalidZip();
  results.pdf_single = await testPdfExtractSinglePdf();
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((err) => {
  console.error('data-tools-api-assert failed:', err?.message || err);
  process.exit(1);
});
