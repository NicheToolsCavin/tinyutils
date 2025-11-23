// Shared helpers for TinyUtils Edge APIs
// - Network safety: public http(s) only, no localhost/RFC1918/.local
// - Polite outbound fetch wrapper with timeouts and single retry with jitter
// - Minimal JSON response helpers with consistent headers and request-id
// - CSV hardening helpers for spreadsheet-safe exports

const MAX_GLOBAL_CONCURRENCY = 10;
const MAX_PER_ORIGIN_CONCURRENCY = 2;

let globalInFlight = 0;
const perOriginInFlight = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isPrivateHost(hostname) {
  const host = (hostname || '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.local')) return true;
  if (host === '0.0.0.0') return true;
  if (host.startsWith('127.')) return true;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('169.254.')) return true;

  const parts = host.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
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

export function normalizePublicHttpUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) return { ok: false, note: 'invalid_url' };
  if (value.startsWith('//')) value = `https:${value}`;
  if (!/^[a-zA-Z][a-zA-Z0-9+\.\-]*:/.test(value)) value = `https://${value}`;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, note: 'unsupported_scheme' };
    }
    if (isPrivateHost(url.hostname)) {
      return { ok: false, note: 'private_host' };
    }
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (!url.pathname) url.pathname = '/';
    if (url.port === '80' && url.protocol === 'http:') url.port = '';
    if (url.port === '443' && url.protocol === 'https:') url.port = '';
    return { ok: true, url: url.toString(), origin: url.origin, urlObj: url };
  } catch {
    return { ok: false, note: 'invalid_url' };
  }
}

function acquireConcurrencySlot(origin) {
  const safeOrigin = origin || 'unknown';
  if (globalInFlight >= MAX_GLOBAL_CONCURRENCY) {
    const error = new Error('global_concurrency_limit');
    error.code = 'global_concurrency_limit';
    throw error;
  }
  const current = perOriginInFlight.get(safeOrigin) || 0;
  if (current >= MAX_PER_ORIGIN_CONCURRENCY) {
    const error = new Error('origin_concurrency_limit');
    error.code = 'origin_concurrency_limit';
    throw error;
  }
  globalInFlight += 1;
  perOriginInFlight.set(safeOrigin, current + 1);
}

function releaseConcurrencySlot(origin) {
  const safeOrigin = origin || 'unknown';
  globalInFlight = Math.max(0, globalInFlight - 1);
  const current = perOriginInFlight.get(safeOrigin) || 0;
  if (current <= 1) {
    perOriginInFlight.delete(safeOrigin);
  } else {
    perOriginInFlight.set(safeOrigin, current - 1);
  }
}

export async function safeFetch(url, options = {}) {
  const {
    timeoutMs = 8000,
    validateUrl = true,
    maxRetries = 1,
    retryJitterMs = 150,
    signal,
    onRetry,
    ...init
  } = options || {};

  let target = String(url || '').trim();
  if (!target) {
    const error = new Error('invalid_url');
    error.code = 'invalid_url';
    throw error;
  }

  if (validateUrl) {
    const normalized = normalizePublicHttpUrl(target);
    if (!normalized.ok || !normalized.url) {
      const error = new Error(normalized.note || 'invalid_url');
      error.code = normalized.note || 'invalid_url';
      throw error;
    }
    target = normalized.url;
  }

  let origin = 'unknown';
  try {
    origin = new URL(target).origin;
  } catch {
    origin = 'invalid';
  }

  acquireConcurrencySlot(origin);

  const controller = new AbortController();
  const { signal: internalSignal } = controller;
  const timeoutId = setTimeout(() => {
    if (!internalSignal.aborted) controller.abort();
  }, timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  let attempt = 0;

  const attemptFetch = async () => {
    attempt += 1;
    try {
      const res = await fetch(target, { ...init, signal: internalSignal });
      if ((res.status === 429 || res.status >= 500) && attempt <= maxRetries) {
        if (typeof onRetry === 'function') onRetry(attempt);
        const base = retryJitterMs > 0 ? retryJitterMs : 100;
        const jitter = Math.floor(Math.random() * base);
        await sleep(base + jitter);
        return attemptFetch();
      }
      return res;
    } catch (error) {
      if (error?.name === 'AbortError' || attempt > maxRetries) throw error;
      if (typeof onRetry === 'function') onRetry(attempt);
      const base = retryJitterMs > 0 ? retryJitterMs : 100;
      const jitter = Math.floor(Math.random() * base);
      await sleep(base + jitter);
      return attemptFetch();
    }
  };

  try {
    return await attemptFetch();
  } finally {
    clearTimeout(timeoutId);
    releaseConcurrencySlot(origin);
  }
}

export function makeRequestId(req) {
  try {
    const incoming = req.headers.get('x-request-id');
    if (incoming) return String(incoming).trim().slice(0, 64);
  } catch {
    // ignore
  }
  return Math.random().toString(16).slice(2, 10);
}

export function jsonResponse(status, payload, requestId, extraHeaders) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  if (requestId) headers.set('x-request-id', requestId);
  if (extraHeaders && typeof extraHeaders === 'object') {
    for (const [key, value] of Object.entries(extraHeaders)) {
      if (value != null) headers.set(key, String(value));
    }
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

export function csvSafeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /^[=+\-@]/.test(str) ? `'${str}` : str;
}

export function csvSafeRow(values) {
  return (values || []).map(csvSafeCell);
}

