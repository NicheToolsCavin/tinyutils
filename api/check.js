export const config = { runtime: 'edge' };

const UA = 'TinyUtils-DeadLinkChecker/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const TLDS = ['.gov', '.mil', '.bank', '.edu'];
const MAX_URLS = 200;
const MAX_REDIRECTS = 5;

function badScheme(input) {
  return /^(javascript:|data:|mailto:)/i.test(input || '');
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

function normalize(raw) {
  let value = String(raw || '').trim();
  if (!value) return { ok: false, note: 'invalid_url' };
  if (value.startsWith('//')) value = 'https:' + value;
  if (!/^[a-zA-Z][a-zA-Z0-9+\.\-]*:/.test(value)) value = 'https://' + value;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, note: 'unsupported_scheme' };
    if (isPrivateHost(url.hostname)) return { ok: false, note: 'private_host' };
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (!url.pathname) url.pathname = '/';
    if (url.port === '80' && url.protocol === 'http:') url.port = '';
    if (url.port === '443' && url.protocol === 'https:') url.port = '';
    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false, note: 'invalid_url' };
  }
}

async function fetchHead(u, timeout) {
  return fetch(u, {
    method: 'HEAD',
    redirect: 'manual',
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(timeout)
  });
}

async function fetchGet(u, timeout) {
  return fetch(u, {
    method: 'GET',
    redirect: 'manual',
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(timeout)
  });
}

async function follow(url, timeout, headFirst) {
  let current = url;
  let chain = 0;
  let usedGet = !headFirst;

  while (chain <= MAX_REDIRECTS) {
    let response;
    if (!usedGet) {
      try {
        response = await fetchHead(current, timeout);
      } catch {
        usedGet = true;
        continue;
      }
      if (response.status >= 200 && response.status < 300) {
        response = await fetchGet(current, timeout);
      }
    } else {
      response = await fetchGet(current, timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return { status: response.status, ok: false, finalUrl: current, note: 'bad_redirect', chain, headers: response.headers };
      }
      try {
        current = new URL(location, current).href;
      } catch {
        return { status: response.status, ok: false, finalUrl: current, note: 'bad_redirect', chain, headers: response.headers };
      }
      chain += 1;
      continue;
    }

    return { status: response.status, ok: response.ok, finalUrl: current, chain, headers: response.headers };
  }

  return { status: null, ok: false, finalUrl: current, note: 'redirect_loop', chain, headers: null };
}

async function httpFallback(url, headers, timeout) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (TLDS.some(tld => host.endsWith(tld))) {
      return { skipped: true, reason: 'tld_guard' };
    }
    if (headers && headers.get('strict-transport-security')) {
      return { skipped: true, reason: 'hsts' };
    }
    if (parsed.protocol === 'https:') {
      parsed.protocol = 'http:';
      if (isPrivateHost(parsed.hostname)) {
        return { skipped: true, reason: 'private_host' };
      }
      const result = await follow(parsed.href, timeout, false);
      return { skipped: false, result };
    }
  } catch {
    return { skipped: true, reason: 'proto' };
  }
  return { skipped: true, reason: 'proto' };
}

function collectLinks(html, baseUrl, includeAssets) {
  const urls = [];
  const base = baseUrl;
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["']/gi;
  html.replace(anchorRe, (_, value) => {
    try {
      urls.push(new URL(value, base).href);
    } catch {}
    return _;
  });
  if (includeAssets) {
    const imgRe = /<img\b[^>]*src=["']([^"']+)["']/gi;
    const scriptRe = /<script\b[^>]*src=["']([^"']+)["']/gi;
    const linkRe = /<link\b[^>]*href=["']([^"']+)["']/gi;
    html.replace(imgRe, (_, value) => {
      try { urls.push(new URL(value, base).href); } catch {}
      return _;
    });
    html.replace(scriptRe, (_, value) => {
      try { urls.push(new URL(value, base).href); } catch {}
      return _;
    });
    html.replace(linkRe, (_, value) => {
      try { urls.push(new URL(value, base).href); } catch {}
      return _;
    });
  }
  return Array.from(new Set(urls));
}

async function loadSitemap(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) {
    const error = new Error(`sitemap_status_${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res.text();
}

function decodeXmlEntities(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: String.fromCharCode(34),
    apos: String.fromCharCode(39)
  };
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (full, entity) => {
    if (!entity) return full;
    if (entity.startsWith('#')) {
      const hex = entity[1] === 'x' || entity[1] === 'X';
      const codePoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(codePoint)) return full;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return full;
      }
    }
    const replacement = named[entity.toLowerCase()];
    return replacement !== undefined ? replacement : full;
  });
}

function extractSitemapUrls(xml) {
  const urls = [];
  const matches = xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi);
  for (const [, block] of matches) {
    const locMatch = block.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i);
    if (!locMatch) continue;
    let value = locMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    if (!value) continue;
    value = decodeXmlEntities(value);
    if (value) urls.push(value.trim());
  }
  if (!urls.length) {
    return [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/gi)].map(match => {
      const raw = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
      return decodeXmlEntities(raw);
    }).filter(Boolean);
  }
  return urls;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const reqId = Math.random().toString(36).slice(2, 8);

  try {
    const body = await req.json();
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout) || 10000));
    const headFirst = body.headFirst !== false;
    const retryHttp = !!body.retryHttp;

    let urls = [];

    if (body.mode === 'list') {
      const raw = Array.isArray(body.urls) ? body.urls : String(body.list || '').split(/\r?\n/);
      urls = raw.map(value => String(value || '').trim()).filter(Boolean);
    } else if (body.mode === 'crawl') {
      const sourceUrl = normalize(body.pageUrl || '');
      if (!sourceUrl.ok || !sourceUrl.url) {
        return new Response('bad pageUrl', { status: 400 });
      }
      const response = await fetch(sourceUrl.url, {
        headers: { 'user-agent': UA },
        signal: AbortSignal.timeout(10000)
      });
      const html = await response.text();
      urls = collectLinks(html, sourceUrl.url, !!body.includeAssets);
    } else if (body.mode === 'sitemap') {
      const sitemapUrl = normalize(body.sitemapUrl || '');
      if (!sitemapUrl.ok || !sitemapUrl.url) {
        return new Response('bad sitemapUrl', { status: 400 });
      }
      let xml;
      try {
        xml = await loadSitemap(sitemapUrl.url);
      } catch (error) {
        const status = typeof error?.status === 'number' ? error.status : 502;
        const note = error?.message || 'fetch_failed';
        return new Response(JSON.stringify({ message: 'Failed to load sitemap', note }), {
          status,
          headers: { 'content-type': 'application/json', 'x-request-id': reqId }
        });
      }
      urls = extractSitemapUrls(xml);
    } else {
      return new Response('bad mode', { status: 400 });
    }

    const seen = new Set();
    const queue = [];
    const prefilled = [];
    for (const raw of urls) {
      if (!raw) continue;
      if (badScheme(raw)) {
        prefilled.push({ url: raw, status: null, ok: false, finalUrl: null, note: 'unsupported_scheme', chain: 0, archive: null });
        continue;
      }
      const result = normalize(raw);
      if (!result.ok || !result.url) {
        const note = result.note || 'invalid_url';
        prefilled.push({ url: raw, status: null, ok: false, finalUrl: null, note, chain: 0, archive: null });
        continue;
      }
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      queue.push({ raw, url: result.url });
      if (queue.length >= MAX_URLS) break;
    }

    const responses = [];
    for (const item of queue) {
      let state = await follow(item.url, timeout, headFirst);
      if (state.status && (state.status === 429 || state.status >= 500)) {
        state = await follow(item.url, timeout, false);
        state.note = (state.note ? `${state.note}|` : '') + 'retry_1';
      }
      if (!state.ok && retryHttp) {
        const fallback = await httpFallback(item.url, state.headers, timeout);
        if (fallback.skipped) {
          state.note = (state.note ? `${state.note}|` : '') + fallback.reason;
        } else if (fallback.result) {
          state = { ...fallback.result, note: (state.note ? `${state.note}|` : '') + 'http_fallback_used' };
        }
      }
      if (state.status === 410) {
        state.note = (state.note ? `${state.note}|` : '') + 'gone';
      }
      responses.push({
        url: item.url,
        status: state.status,
        ok: state.ok,
        finalUrl: state.finalUrl,
        archive: null,
        note: state.note || null,
        chain: state.chain || 0
      });
    }

    const totalResults = responses.length + prefilled.length;
    const truncated = queue.length >= MAX_URLS && (urls.length > (queue.length + prefilled.length));

    const meta = {
      runTimestamp: new Date().toISOString(),
      mode: body.mode || 'list',
      source: body.pageUrl || body.sitemapUrl || 'list',
      concurrency: Number(body.concurrency) || 10,
      timeoutMs: timeout,
      robots: body.respectRobots !== false,
      scope: body.scope || 'internal',
      assets: !!body.includeAssets,
      httpFallback: !!body.retryHttp,
      wayback: !!body.includeArchive,
      totalQueued: queue.length + prefilled.length,
      totalChecked: totalResults,
      truncated
    };

    const payload = { meta, results: [...prefilled, ...responses] };
    return new Response(JSON.stringify(payload), {
      headers: {
        'content-type': 'application/json',
        'x-request-id': reqId
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Server error', error: String(error).slice(0, 200) }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'x-request-id': reqId }
    });
  }
}
