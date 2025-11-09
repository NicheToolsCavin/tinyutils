import test from 'node:test';
import assert from 'node:assert/strict';

import sitemapDelta from '../api/sitemap-delta.js';
import waybackFixer from '../api/wayback-fixer.js';
import metafetch from '../api/metafetch.js';
import checkHandler from '../api/check.js';

import { installFetchStub, restoreFetchStub } from './helpers/fetchStub.mjs';

function makeRequest(url, payload, extraHeaders = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(payload)
  });
}

const BASE = 'https://tinyutils-eight.vercel.app';

test.before(() => {
  installFetchStub();
});

test.after(() => {
  restoreFetchStub();
});

function assertJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  assert.ok(contentType.includes('application/json'), `expected JSON but got ${contentType}`);
}

async function assertEnvelope(response, body) {
  assert.ok(typeof body === 'object' && body !== null, 'payload not JSON object');
  assert.ok(Object.hasOwn(body, 'meta'), 'missing meta block');
  assert.strictEqual(body.meta?.requestId, response.headers.get('x-request-id'));
}

test('sitemap-delta contract produces add/remove data and request id', async () => {
  const req = makeRequest(`${BASE}/api/sitemap-delta`, {
    sitemapAText: '<urlset><url><loc>https://demo.local/old</loc></url></urlset>',
    sitemapBText: '<urlset><url><loc>https://demo.local/new</loc></url></urlset>',
    verifyTargets: false,
    sameRegDomainOnly: true,
    timeout: 5000,
    maxCompare: 10
  });

  const res = await sitemapDelta(req);
  assert.strictEqual(res.status, 200);
  assertJsonResponse(res);
  const payload = await res.json();
  await assertEnvelope(res, payload);
  assert.ok(Array.isArray(payload?.added));
  assert.ok(Array.isArray(payload?.removed));
});

test('wayback fixer returns archived snapshot info with request id', async () => {
  const req = makeRequest(`${BASE}/api/wayback-fixer`, {
    list: 'https://example.com/old\nhttps://example.com/older',
    verifyHead: true,
    trySavePageNow: false,
    prefWindow: 'any',
    timeout: 2000,
    concurrency: 2
  }, {
    'x-request-id': 'wayback-test-id'
  });

  const res = await waybackFixer(req);
  assert.strictEqual(res.status, 200);
  assertJsonResponse(res);
  const payload = await res.json();
  await assertEnvelope(res, payload);
  assert.ok(Array.isArray(payload?.results));
  assert.ok(payload?.meta?.totalChecked >= 0);
});

test('metafetch produces meta block even when upstream content is HTML', async () => {
  const req = makeRequest(`${BASE}/api/metafetch`, { url: 'https://example.com/' });
  const res = await metafetch(req);
  assert.ok([200, 400].includes(res.status));
  assertJsonResponse(res);
  const payload = await res.json();
  await assertEnvelope(res, payload);
  assert.ok(payload?.title === null || typeof payload.title === 'string');
  assert.ok(payload?.description === null || typeof payload.description === 'string');
});

test('check handler returns ok envelope and scheduler meta', async () => {
  const req = makeRequest(`${BASE}/api/check`, { pageUrl: 'https://example.com/', mode: 'page' });
  const res = await checkHandler(req);
  assert.ok([200, 400].includes(res.status));
  assertJsonResponse(res);
  const payload = await res.json();
  await assertEnvelope(res, payload);
  assert.ok(payload?.meta?.scheduler);
  assert.ok(payload?.meta?.stage);
});
