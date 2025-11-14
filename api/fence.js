export const config = { runtime: 'edge' };

const COOKIE_NAME = 'tu_preview_secret';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

function rid() {
  return Math.random().toString(16).slice(2, 10);
}

function json(status, body, requestId, extraHeaders = {}) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  if (requestId) headers.set('x-request-id', requestId);
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function parseCookies(cookieHeader) {
  const out = {};
  const source = String(cookieHeader || '');
  for (const part of source.split(/;\s*/)) {
    if (!part) continue;
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    const value = part.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

function normaliseTarget(target) {
  if (!target) return '/';
  if (target.startsWith('http://') || target.startsWith('https://')) return target;
  return target.startsWith('/') ? target : `/${target}`;
}

function buildPreviewCookie(secret) {
  return `${COOKIE_NAME}=${secret}; Path=/tools/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export default async function handler(req) {
  const requestId = rid();

  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    const expectedSecret = (process.env.PREVIEW_SECRET || '').trim();
    const expectedBypass = (process.env.PREVIEW_BYPASS_TOKEN || '').trim();

    const headerSecret = req.headers.get('x-preview-secret');
    const headerBypass = req.headers.get('x-vercel-bypass-token') || req.headers.get('x-vercel-protection-bypass');
    const querySecret = params.get('preview_secret');
    const cookies = parseCookies(req.headers.get('cookie'));
    const cookieSecret = cookies[COOKIE_NAME];
    const presentedSecret = headerSecret || cookieSecret || querySecret;

    let allowed = false;
    let cookieToSet = null;

    // Bypass header takes precedence when configured
    if (expectedBypass && headerBypass && headerBypass.trim() === expectedBypass) {
      allowed = true;
    } else if (!expectedSecret) {
      allowed = true;
    } else if (presentedSecret && presentedSecret === expectedSecret) {
      allowed = true;
      if (!cookieSecret || cookieSecret !== expectedSecret) {
        cookieToSet = buildPreviewCookie(expectedSecret);
      }
    }

    if (!allowed) {
      return json(401, {
        ok: false,
        code: 'preview_required',
        message: 'Preview access required. Provide PREVIEW_SECRET via ?preview_secret=… or header x-preview-secret.',
        requestId
      }, requestId, { 'www-authenticate': 'Bearer realm="Preview"' });
    }

    const targetParam = params.get('target');
    const normalisedTarget = normaliseTarget(targetParam || url.pathname || '/');

    const origin = `${url.protocol || 'https:'}//${req.headers.get('host')}`;
    const targetUrl = new URL(normalisedTarget, origin);

    let pathname = targetUrl.pathname;
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    const hasExtension = /\.[^/]+$/.test(pathname);
    if (!hasExtension && pathname) {
      targetUrl.pathname = `${pathname}.html`;
    } else if (!pathname) {
      targetUrl.pathname = '/';
    } else {
      targetUrl.pathname = pathname;
    }

    // ensure we do not re-trigger the rewrite when proxying internally
    targetUrl.searchParams.set('preview_fence_proxy', '1');
    targetUrl.searchParams.delete('preview_secret');

    const forwardedHeaders = new Headers(req.headers);
    forwardedHeaders.set('x-preview-fence-bypass', '1');
    forwardedHeaders.delete('x-preview-secret');
    forwardedHeaders.delete('cookie');

    const proxiedRequest = new Request(targetUrl.toString(), {
      method: req.method === 'GET' || req.method === 'HEAD' ? req.method : 'GET',
      headers: forwardedHeaders,
      redirect: 'manual'
    });

    const upstream = await fetch(proxiedRequest);

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('cache-control', 'no-store');
    if (cookieToSet) {
      responseHeaders.set('set-cookie', cookieToSet);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return json(500, {
      ok: false,
      code: 'server_error',
      message: String(error).slice(0, 200),
      requestId
    }, requestId);
  }
}
