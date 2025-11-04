#!/usr/bin/env node
import sitemapDelta from '../api/sitemap-delta.js';
import waybackFixer from '../api/wayback-fixer.js';

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

  const req = createRequest('https://tinyutils.net/api/sitemap-delta', payload);
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

  const req = createRequest('https://tinyutils.net/api/wayback-fixer', payload);
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

async function main() {
  try {
    await testSitemapDelta();
    await testWaybackFixer();
    console.log('Handler smoke tests completed successfully.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error('Handler smoke tests failed:', error);
  process.exit(1);
});
