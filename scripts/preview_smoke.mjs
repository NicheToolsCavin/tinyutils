#!/usr/bin/env node
// Smoke test preview URLs that may require a Vercel protection bypass cookie.

const BASE_URL = process.env.PREVIEW_URL;

// Support all known ways to pass a protection-bypass token without hardcoding secrets.
// Precedence: Automation bypass (official) > explicit preview bypass > legacy BYPASS_TOKEN.
const BYPASS_TOKEN =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  process.env.PREVIEW_BYPASS_TOKEN ||
  process.env.BYPASS_TOKEN ||
  '';
// Optional preview secret header (project-specific). If present, send it.
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';

if (!BASE_URL) {
  console.error('PREVIEW_URL env var is required.');
  process.exit(1);
}

const pages = ['/', '/tools/', '/tools/dead-link-finder/', '/tools/sitemap-delta/', '/tools/wayback-fixer/'];
const apis = [
  { path: '/api/check', body: { pageUrl: 'https://example.com/' } },
  { path: '/api/metafetch', body: { url: 'https://example.com/' } },
  { path: '/api/sitemap-delta', body: { sitemapAText: '<urlset></urlset>', sitemapBText: '<urlset></urlset>' } },
  { path: '/api/wayback-fixer', body: { list: 'https://example.com/old', verifyHead: false } }
];

function buildUrl(path) {
  return new URL(path, BASE_URL).toString();
}

const defaultHeaders = BYPASS_TOKEN
  ? {
      // Official Vercel header for Protection Bypass for Automation
      // Ref: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
      'x-vercel-protection-bypass': BYPASS_TOKEN,
      // Ask Vercel to set the bypass as a cookie for follow-up requests in the session
      'x-vercel-set-bypass-cookie': 'true',
      // Also send the cookie explicitly to support one-off requests
      'Cookie': `vercel-protection-bypass=${BYPASS_TOKEN}`,
    }
  : {};

if (PREVIEW_SECRET) {
  defaultHeaders['x-preview-secret'] = PREVIEW_SECRET;
}

async function fetchWithBypass(path, options = {}) {
  const url = buildUrl(path);
  const init = { ...options };
  init.headers = {
    ...(options.headers || {}),
    ...defaultHeaders
  };
  return fetch(url, init);
}

async function testPages() {
  const results = [];
  for (const path of pages) {
    try {
      const res = await fetchWithBypass(path, { method: 'GET' });
      const ok = res.status === 200;
      results.push({ path, status: res.status, ok });
    } catch (error) {
      results.push({ path, status: 'error', ok: false, error: error.message });
    }
  }
  return results;
}

async function testApis() {
  const results = [];
  for (const { path, body } of apis) {
    try {
      const res = await fetchWithBypass(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const contentType = res.headers.get('content-type') || '';
      const requestId = res.headers.get('x-request-id');
      const acceptableStatus = res.status === 200 || res.status === 400;
      const jsonOk = contentType.includes('application/json');
      const ridOk = Boolean(requestId);
      const ok = acceptableStatus && jsonOk && ridOk;
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        // ignore JSON parse errors
      }
      results.push({ path, status: res.status, ok, requestId, jsonOk, ridOk, payload });
    } catch (error) {
      results.push({ path, status: 'error', ok: false, error: error.message });
    }
  }
  return results;
}

(async () => {
  const pageResults = await testPages();
  const apiResults = await testApis();

  console.log('Page checks:');
  pageResults.forEach(({ path, status, ok, error }) => {
    console.log(`  ${path} -> ${status}${error ? ` (${error})` : ''} ${ok ? 'OK' : 'FAIL'}`);
  });
  console.log();

  console.log('API checks:');
  apiResults.forEach(({ path, status, ok, jsonOk, ridOk, error }) => {
    console.log(`  ${path} -> ${status}${error ? ` (${error})` : ''} JSON=${jsonOk} RID=${ridOk} ${ok ? 'OK' : 'FAIL'}`);
  });
  console.log();

  const pageFailures = pageResults.filter(r => !r.ok);
  const apiFailures = apiResults.filter(r => !r.ok);
  if (pageFailures.length === 0 && apiFailures.length === 0) {
    console.log('Preview smoke: PASS');
    process.exit(0);
  }

  console.log('Preview smoke: FAIL');
  process.exit(1);
})().catch(error => {
  console.error('Preview smoke encountered an error:', error);
  process.exit(1);
});
