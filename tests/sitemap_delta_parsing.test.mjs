import test from 'node:test';
import assert from 'node:assert/strict';

import sitemapDelta from '../api/sitemap-delta.js';

const BASE = 'https://tinyutils.net';

function makeRequest(payload) {
  return new Request(`${BASE}/api/sitemap-delta`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

test('sitemap-delta parses simple urlset XML via safer parser', async () => {
  const sitemapAText = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/old</loc></url>
    </urlset>`;

  const sitemapBText = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/old</loc></url>
      <url><loc>https://example.com/new</loc></url>
    </urlset>`;

  const req = makeRequest({ sitemapAText, sitemapBText, verifyTargets: false, sameRegDomainOnly: true, timeout: 5000 });
  const res = await sitemapDelta(req);
  assert.strictEqual(res.status, 200);
  const payload = await res.json();

  assert.ok(Array.isArray(payload.added));
  assert.ok(Array.isArray(payload.removed));
  assert.deepEqual(payload.removed, []);
  assert.deepEqual(payload.added, ['https://example.com/new']);
});

test('sitemap-delta decodes XML entities in loc values', async () => {
  const sitemapAText = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/page?a=1&amp;b=1</loc></url>
  </urlset>`;

  const sitemapBText = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/page?a=1&amp;b=2</loc></url>
  </urlset>`;

  const req = makeRequest({ sitemapAText, sitemapBText, verifyTargets: false, sameRegDomainOnly: true, timeout: 5000 });
  const res = await sitemapDelta(req);
  assert.strictEqual(res.status, 200);
  const payload = await res.json();

  // One URL changed only in querystring; ensure we see a removed and an added URL
  assert.deepEqual(payload.removed, ['https://example.com/page?a=1&b=1']);
  assert.deepEqual(payload.added, ['https://example.com/page?a=1&b=2']);
});

test('sitemap-delta handles mildly malformed XML without 5xx', async () => {
  // Missing closing </urlset>; safer parser should either cope or fall back without throwing
  const sitemapAText = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/a</loc></url>`;

  const sitemapBText = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/b</loc></url>
  </urlset>`;

  const req = makeRequest({ sitemapAText, sitemapBText, verifyTargets: false, sameRegDomainOnly: true, timeout: 5000 });
  const res = await sitemapDelta(req);

  // Should respond with a client error or success, but not 5xx
  assert.ok([200, 400].includes(res.status));
  const payload = await res.json();
  assert.ok(payload && typeof payload === 'object');
});

