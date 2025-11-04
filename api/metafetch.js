export const config = { runtime: 'edge' };

const UA = 'TinyUtils-DeadLinkChecker/1.0 (+https://tinyutils-eight.vercel.app; hello@tinyutils.net)';

function rid() {
  return Math.random().toString(16).slice(2, 10);
}

function json(status, body, requestId) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  if (requestId) headers.set('x-request-id', requestId);
  return new Response(JSON.stringify(body), { status, headers });
}

function isPrivateHost(hostname) {
  const host = (hostname || '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.local')) return true;
  if (host === '0.0.0.0') return true;
  if (host.startsWith('127.')) return true;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('169.254.')) return true;
  const parts = host.split('.').map(p => Number.parseInt(p, 10));
  if (parts.length === 4 && parts.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) {
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }
  if (host.includes(':')) {
    const compact = host.split('%')[0];
    if (compact === '::1') return true;
    if (compact.startsWith('fc') || compact.startsWith('fd')) return true;
    if (compact.startsWith('fe80')) return true;
  }
  return false;
}

function normalizeUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) return null;
  if (value.startsWith('//')) value = 'https:' + value;
  if (!/^[a-zA-Z][a-zA-Z0-9+\.\-]*:/.test(value)) value = 'https://' + value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (isPrivateHost(url.hostname)) return null;
    url.hash = '';
    if (!url.pathname) url.pathname = '/';
    if (url.port === '80' && url.protocol === 'http:') url.port = '';
    if (url.port === '443' && url.protocol === 'https:') url.port = '';
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, timeoutMs) {
  const attempt = () => fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
  let retried = false;
  try {
    let res = await attempt();
    if (res.status === 429 || res.status >= 500) {
      retried = true;
      await delay(50 + Math.random() * 150);
      res = await attempt();
    }
    return res;
  } catch (error) {
    if (retried) throw error;
    retried = true;
    await delay(50 + Math.random() * 150);
    return attempt();
  }
}

export default async function handler(req) {
  const requestId = rid();

  if (req.method !== 'POST') {
    return json(405, { ok: false, message: 'Only POST is supported', meta: { requestId } }, requestId);
  }

  try {
    const { url } = await req.json();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      return json(400, { title: '', description: '', error: 'invalid_url', meta: { requestId } }, requestId);
    }
    const res = await fetchWithRetry(normalized, 8000);
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
    const desc = (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
    return json(200, { title, description: desc, meta: { requestId } }, requestId);
  } catch (error) {
    return json(502, { title: '', description: '', error: String(error).slice(0, 200), meta: { requestId } }, requestId);
  }
}
