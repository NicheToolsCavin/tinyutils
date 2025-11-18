const previewUrl = process.env.PREVIEW_URL;

if (!previewUrl) {
  console.log('PREVIEW_URL not set; skipping preview smoke.');
  process.exit(0);
}

const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';
const BYPASS_CANDIDATES = [
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  process.env.PREVIEW_BYPASS_TOKEN,
  process.env.BYPASS_TOKEN,
].filter(Boolean);

function buildUrl(path, token) {
  const url = new URL(path, previewUrl);
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

const endpointPath = '/api/check';
const response = await fetchWithBypass(endpointPath, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ mode: 'list', urls: ['https://example.com/'] })
});

const contentType = response.headers.get('content-type') || '';
if (!contentType.includes('application/json')) {
  console.error(`Preview smoke failed: expected JSON but received "${contentType}"`);
  process.exit(1);
}

let payload;
try {
  payload = await response.json();
} catch (error) {
  console.error(`Preview smoke failed: unable to parse JSON (${error.message})`);
  process.exit(1);
}

const status = payload?.ok ? 'ok' : 'err';
const stage = payload?.stage || payload?.meta?.stage || 'unknown';
const reqId = payload?.requestId || payload?.meta?.requestId || 'n/a';
const total = Array.isArray(payload?.rows) ? payload.rows.length : Number(payload?.meta?.totalChecked ?? 0);

console.log(`preview: ${status} · stage=${stage} · req=${reqId} · total=${total}`);
