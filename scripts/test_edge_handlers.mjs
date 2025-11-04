#!/usr/bin/env node
import sitemapDelta from '../api/sitemap-delta.js';
import waybackFixer from '../api/wayback-fixer.js';
import metafetch from '../api/metafetch.js';
import checkHandler from '../api/check.js';

const originalFetch = globalThis.fetch;

const SNAPSHOT_URL = 'https://web.archive.org/web/20240101120000/https://example.com/old';

globalThis.fetch = async (url, init = {}) => {
  if (typeof url === 'string' && url.startsWith('https://archive.org/wayback/available')) {
    const payload = {
      archived_snapshots: {
        closest: {
          available: true,
          url: SNAPSHOT_URL,
          timestamp: '20240101120000',
          status: '200'
        }
      }
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }

  if (typeof url === 'string' && url.startsWith('https://web.archive.org/web/')) {
    return new Response(null, { status: 200, headers: { 'content-type': 'text/plain' } });
  }

  if (typeof url === 'string' && url.startsWith('https://example.com/robots.txt')) {
    return new Response('User-agent: *\nAllow: /', { status: 200, headers: { 'content-type': 'text/plain' } });
  }

  if (typeof url === 'string' && url.startsWith('https://example.com')) {
    const method = (init.method || 'GET').toUpperCase();
    if (method === 'HEAD') {
      return new Response(null, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    const html = `<!doctype html><html><head><title>Example</title><meta name="description" content="Demo page"></head><body>
      <a href="https://example.com/about">About</a>
      <a href="https://example.com/contact">Contact</a>
    </body></html>`;
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  if (originalFetch) {
    return originalFetch(url, init);
  }

  throw new Error(`Unhandled fetch target: ${url}`);
};

function createRequest(handlerUrl, payload) {
  return new Request(handlerUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function testSitemapDelta() {
  const payload = {
    sitemapAText: '<urlset><url><loc>https://demo.local/old</loc></url></urlset>',
    sitemapBText: '<urlset><url><loc>https://demo.local/new</loc></url></urlset>',
    verifyTargets: false,
    sameRegDomainOnly: true,
    timeout: 5000,
    maxCompare: 10
  };

  const req = createRequest('https://tinyutils-eight.vercel.app/api/sitemap-delta', payload);
  const res = await sitemapDelta(req);
  const data = await res.json();

  console.log('--- /api/sitemap-delta');
  console.log('status:', res.status);
  console.log('content-type:', res.headers.get('content-type'));
  console.log('x-request-id:', res.headers.get('x-request-id'));
  console.log('meta.requestId:', data?.meta?.requestId);
  console.log('removedCount:', data?.meta?.removedCount, 'addedCount:', data?.meta?.addedCount);
  console.log();

  if (res.status !== 200) throw new Error('sitemap-delta handler did not return 200');
  if (res.headers.get('content-type')?.includes('application/json') !== true) throw new Error('sitemap-delta missing JSON content-type');
  if (!res.headers.get('x-request-id')) throw new Error('sitemap-delta missing x-request-id');
}

async function testWaybackFixer() {
  const payload = {
    list: 'https://example.com/old\nhttps://example.com/older',
    verifyHead: true,
    trySavePageNow: false,
    prefWindow: 'any',
    timeout: 5000,
    concurrency: 2
  };

  const req = createRequest('https://tinyutils-eight.vercel.app/api/wayback-fixer', payload);
  const res = await waybackFixer(req);
  const data = await res.json();

  console.log('--- /api/wayback-fixer');
  console.log('status:', res.status);
  console.log('content-type:', res.headers.get('content-type'));
  console.log('x-request-id:', res.headers.get('x-request-id'));
  console.log('meta.requestId:', data?.meta?.requestId);
  console.log('totalChecked:', data?.meta?.totalChecked, 'archived:', data?.meta?.archived);
  console.log();

  if (res.status !== 200) throw new Error('wayback-fixer handler did not return 200');
  if (res.headers.get('content-type')?.includes('application/json') !== true) throw new Error('wayback-fixer missing JSON content-type');
  if (!res.headers.get('x-request-id')) throw new Error('wayback-fixer missing x-request-id');
}

async function testMetafetch() {
  const payload = { url: 'https://example.com/' };
  const req = createRequest('https://tinyutils-eight.vercel.app/api/metafetch', payload);
  const res = await metafetch(req);
  const data = await res.json();

  console.log('--- /api/metafetch');
  console.log('status:', res.status);
  console.log('content-type:', res.headers.get('content-type'));
  console.log('x-request-id:', res.headers.get('x-request-id'));
  console.log('meta.requestId:', data?.meta?.requestId);
  console.log('title:', data?.title, 'description length:', data?.description?.length ?? 0);
  console.log();

  if (![200, 400].includes(res.status)) throw new Error('metafetch returned unexpected status');
  if (res.headers.get('content-type')?.includes('application/json') !== true) throw new Error('metafetch missing JSON content-type');
  if (!res.headers.get('x-request-id')) console.warn('metafetch missing x-request-id header');
}

async function testCheck() {
  const payload = {
    pageUrl: 'https://example.com/',
    mode: 'page'
  };
  const req = createRequest('https://tinyutils-eight.vercel.app/api/check', payload);
  const res = await checkHandler(req);
  const data = await res.json();

  console.log('--- /api/check');
  console.log('status:', res.status);
  console.log('content-type:', res.headers.get('content-type'));
  console.log('x-request-id:', res.headers.get('x-request-id'));
  console.log('meta.requestId:', data?.meta?.requestId);
  console.log('rows:', Array.isArray(data?.rows) ? data.rows.length : 'n/a');
  console.log();

  if (![200, 400].includes(res.status)) throw new Error('check API returned unexpected status');
  if (res.headers.get('content-type')?.includes('application/json') !== true) throw new Error('check missing JSON content-type');
  if (!res.headers.get('x-request-id')) throw new Error('check missing x-request-id');
}

async function main() {
  try {
    await testSitemapDelta();
    await testWaybackFixer();
    await testMetafetch();
    await testCheck();
    console.log('Handler smoke tests completed successfully.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error('Handler smoke tests failed:', error);
  process.exit(1);
});
