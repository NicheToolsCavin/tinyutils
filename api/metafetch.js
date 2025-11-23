import { safeFetch, normalizePublicHttpUrl, makeRequestId, jsonResponse } from './_lib/edge_helpers.js';

export const config = { runtime: 'edge' };

const UA = 'TinyUtils-DeadLinkChecker/1.0 (+https://tinyutils.net; hello@tinyutils.net)';

function json(status, body, requestId) {
  return jsonResponse(status, body, requestId);
}

function normalizeUrl(raw) {
  const normalized = normalizePublicHttpUrl(raw);
  if (!normalized.ok) return null;
  return normalized.url;
}

async function fetchWithRetry(url, timeoutMs) {
  return safeFetch(url, {
    timeoutMs,
    maxRetries: 1,
    retryJitterMs: 150,
    validateUrl: false,
    headers: { 'user-agent': UA }
  });
}

export default async function handler(req) {
  const requestId = makeRequestId(req);

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
