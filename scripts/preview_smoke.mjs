#!/usr/bin/env node
// =========================================
// PREVIEW BYPASS — READ ME BEFORE RUNNING
// - Export exactly one token (precedence below) and PREVIEW_URL
//   1) VERCEL_AUTOMATION_BYPASS_SECRET (preferred)
//   2) PREVIEW_BYPASS_TOKEN
//   3) BYPASS_TOKEN
// - This script will:
//   • send x-vercel-protection-bypass: <token>
//   • send x-vercel-set-bypass-cookie: true
//   • include Cookie: vercel-protection-bypass=<token>
// - If a route still redirects, verify the token is valid for THIS project/preview.
// =========================================
// Smoke test preview URLs that may require a Vercel protection bypass cookie.

const BASE_URL = process.env.PREVIEW_URL;

const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';
const BYPASS_CANDIDATES = [
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  process.env.PREVIEW_BYPASS_TOKEN,
  process.env.BYPASS_TOKEN,
].filter(Boolean);

if (!BASE_URL) {
  console.error('PREVIEW_URL env var is required.');
  process.exit(1);
}

const pages = ['/', '/tools/', '/tools/dead-link-finder/', '/tools/sitemap-delta/', '/tools/wayback-fixer/', '/cookies.html'];

// Lightweight expectations per page for invariant markup. These are kept
// deliberately loose to avoid brittleness: we only check for marker classes
// or attributes that should remain stable across visual tweaks.
const pageExpectations = {
  '/': { adSlot: true },
  '/tools/': { adSlot: true },
  '/tools/dead-link-finder/': { adSlot: true, progressBanner: true },
  '/tools/sitemap-delta/': { adSlot: true, progressBanner: true },
  '/tools/wayback-fixer/': { adSlot: true },
  '/cookies.html': {},
};
const apis = [
  { path: '/api/check', body: { pageUrl: 'https://example.com/' } },
  { path: '/api/metafetch', body: { url: 'https://example.com/' } },
  { path: '/api/sitemap-delta', body: { sitemapAText: '<urlset></urlset>', sitemapBText: '<urlset></urlset>' } },
  { path: '/api/wayback-fixer', body: { list: 'https://example.com/old', verifyHead: false } }
];

function buildUrl(path, token) {
  const url = new URL(path, BASE_URL);
  if (token) {
    url.searchParams.set('x-vercel-set-bypass-cookie', 'true');
    url.searchParams.set('x-vercel-protection-bypass', token);
  }
  return url.toString();
}

function buildHeaders(token, extraHeaders = {}, cookies = []) {
  const headers = { ...extraHeaders };
  if (token) {
    headers['x-vercel-protection-bypass'] = token;
    headers['x-vercel-set-bypass-cookie'] = 'true';
    headers['Cookie'] = `vercel-protection-bypass=${token}`;
  }
  if (cookies.length) {
    const handshake = cookies.join('; ');
    headers['Cookie'] = headers['Cookie']
      ? `${headers['Cookie']}; ${handshake}`
      : handshake;
  }
  if (PREVIEW_SECRET) {
    headers['x-preview-secret'] = PREVIEW_SECRET;
  }
  return headers;
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

async function attemptFetch(url, token, options, cookies = [], tries = 0) {
  const headers = buildHeaders(token, options.headers, cookies);
  const response = await fetch(url, { ...options, headers, redirect: 'manual' });
  const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
  if (isRedirect && token && tries === 0) {
    const handshakeCookie = parseHandshakeCookie(response.headers.get('set-cookie'));
    if (handshakeCookie) {
      return attemptFetch(url, token, options, [...cookies, handshakeCookie], tries + 1);
    }
  }
  return response;
}

async function fetchWithBypass(path, options = {}) {
  const tokens = BYPASS_CANDIDATES.length ? BYPASS_CANDIDATES : [null];
  let lastError = null;
  for (const token of tokens) {
    const url = buildUrl(path, token);
    try {
      const response = await attemptFetch(url, token, options);
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('fetch failed');
}

async function testPages() {
  const results = [];
  for (const path of pages) {
    try {
      const res = await fetchWithBypass(path, { method: 'GET' });
      const status = res.status;
      const okStatus = status === 200;
      let html = '';
      try {
        html = await res.text();
      } catch {
        // If we cannot read the body, fall back to status-only.
      }

      const expectations = pageExpectations[path] || {};
      const needsAdSlot = !!expectations.adSlot;
      const needsProgress = !!expectations.progressBanner;

      const hasAdSlotMarker = !needsAdSlot || (html && /class="[^"]*\bad-slot\b[^"]*"/.test(html));
      const hasProgressMarker = !needsProgress || (html && html.includes('progress-banner'));

      const ok = okStatus && hasAdSlotMarker && hasProgressMarker;

      results.push({
        path,
        status,
        ok,
        okStatus,
        needsAdSlot,
        hasAdSlotMarker,
        needsProgress,
        hasProgressMarker,
      });
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
  pageResults.forEach(({ path, status, ok, error, needsAdSlot, hasAdSlotMarker, needsProgress, hasProgressMarker }) => {
    if (typeof status === 'string') {
      console.log(`  ${path} -> ${status}${error ? ` (${error})` : ''} ${ok ? 'OK' : 'FAIL'}`);
      return;
    }
    const markers = [];
    if (needsAdSlot) markers.push(`ad-slot:${hasAdSlotMarker ? 'yes' : 'no'}`);
    if (needsProgress) markers.push(`progress:${hasProgressMarker ? 'yes' : 'no'}`);
    const markerText = markers.length ? ` [${markers.join(', ')}]` : '';
    console.log(`  ${path} -> ${status}${markerText} ${ok ? 'OK' : 'FAIL'}`);
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
