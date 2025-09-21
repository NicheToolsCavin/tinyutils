export const config = { runtime: 'edge' };

/* ---------- helpers ---------- */

const UA = 'TinyUtils-DeadLinkChecker/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const RUN_CAP = 200;
const REDIRECT_CAP = 5;
const GLOBAL_CONCURRENCY = 10;
const PER_ORIGIN_CAP = 2;
const TLS_FALLBACK_TLD_GUARD = [/\.gov$/i, /\.mil$/i, /\.bank$/i, /\.edu$/i];

function isPrivateHost(h) {
  const host = (h || '').toLowerCase();
  if (['localhost', '127.0.0.1', '::1'].includes(host) || host.endsWith('.local')) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
  return false;
}

function assertPublicHttp(u) {
  let url;
  try { url = new URL(u); } catch { throw new Error('invalid_url'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('unsupported_scheme');
  if (isPrivateHost(url.hostname)) throw new Error('private_host_blocked');
  if (url.toString().length > 2048) throw new Error('invalid_url');
  url.hash = '';
  return url.toString();
}

function unsupportedScheme(u) { return /^(javascript:|data:|mailto:)/i.test(u || ''); }

function normalize(u) {
  try {
    const x = new URL(u);
    x.hash = '';
    x.hostname = x.hostname.toLowerCase();
    if (x.port === '80' && x.protocol === 'http:') x.port = '';
    if (x.port === '443' && x.protocol === 'https:') x.port = '';
    if (!x.pathname) x.pathname = '/';
    return x.toString();
  } catch { return null; }
}

function originOf(u) { try { return new URL(u).origin; } catch { return ''; } }

async function head(u, t) {
  return fetch(u, { method: 'HEAD', redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(t) });
}
async function get(u, t) {
  return fetch(u, { method: 'GET', redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(t) });
}

async function followOnce(url, timeout, headFirst) {
  // one hop (HEAD then GET on success)
  if (headFirst) {
    try {
      const rH = await head(url, timeout);
      if (rH.status >= 200 && rH.status < 300) {
        const rG = await get(url, timeout);
        return { status: rG.status, ok: rG.ok, headers: rG.headers, finalUrl: url };
      }
      return { status: rH.status, ok: rH.ok, headers: rH.headers, finalUrl: url };
    } catch { /* fall through to GET */ }
  }
  const r = await get(url, timeout);
  return { status: r.status, ok: r.ok, headers: r.headers, finalUrl: url };
}

async function follow(url, timeout, headFirst) {
  let current = url;
  let chain = 0;
  while (chain <= REDIRECT_CAP) {
    const r = await followOnce(current, timeout, headFirst);
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      if (!loc) return { status: r.status, ok: false, finalUrl: current, note: 'bad_redirect', chain, headers: r.headers };
      try {
        current = new URL(loc, current).toString();
      } catch {
        return { status: r.status, ok: false, finalUrl: current, note: 'bad_redirect', chain, headers: r.headers };
      }
      chain++;
      continue;
    }
    return { ...r, chain };
  }
  return { status: 0, ok: false, finalUrl: current, note: 'redirect_loop', chain: REDIRECT_CAP };
}

function tldGuard(hostname) {
  const h = (hostname || '').toLowerCase();
  return TLS_FALLBACK_TLD_GUARD.some(rx => rx.test(h));
}

async function tryHttpFallback(url, headers, timeout, headFirst) {
  try {
    const u = new URL(url);
    const hsts = headers && headers.get('strict-transport-security');
    if (u.protocol !== 'https:' || hsts || tldGuard(u.hostname)) {
      return { skipped: true, reason: hsts ? 'hsts' : 'guard' };
    }
    u.protocol = 'http:';
    const r = await follow(u.toString(), timeout, headFirst);
    return { skipped: false, result: r };
  } catch {
    return { skipped: true, reason: 'proto' };
  }
}

function protectCSV(v) {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

function extractLinksFromHtml(html, base, includeAssets) {
  const out = [];
  const abs = v => new URL(v, base).toString();
  html.replace(/<a\b[^>]*href=["']([^"']+)["']/gi, (_, v) => { out.push(v); return _; });
  if (includeAssets) {
    html.replace(/<img\b[^>]*src=["']([^"']+)["']/gi, (_, v) => { out.push(v); return _; });
    html.replace(/<script\b[^>]*src=["']([^"']+)["']/gi, (_, v) => { out.push(v); return _; });
    html.replace(/<link\b[^>]*href=["']([^"']+)["']/gi, (_, v) => { out.push(v); return _; });
  }
  return out.filter(v => !unsupportedScheme(v)).map(v => abs(v));
}

async function getSitemapUrls(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) });
  const xml = await res.text();
  const urls = [];
  const reUrl = /<url>\s*<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = reUrl.exec(xml))) {
    urls.push(m[1].trim());
    if (urls.length >= RUN_CAP) break;
  }
  if (urls.length) return urls;

  // sitemapindex
  const reSm = /<sitemap>\s*<loc>([^<]+)<\/loc>/gi;
  const sms = [];
  while ((m = reSm.exec(xml))) {
    sms.push(m[1].trim());
    if (sms.length >= 50) break;
  }
  const agg = [];
  for (const child of sms) {
    try {
      const r2 = await fetch(child, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) });
      const x2 = await r2.text();
      let m2; const re2 = /<url>\s*<loc>([^<]+)<\/loc>/gi;
      while ((m2 = re2.exec(x2))) {
        agg.push(m2[1].trim());
        if (agg.length >= RUN_CAP) break;
      }
      if (agg.length >= RUN_CAP) break;
    } catch { /* ignore */ }
  }
  return agg;
}

/* ---------- handler ---------- */

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const mode = body.mode || 'list';
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout) || 10000));
    const headFirst = body.headFirst !== false;
    const retryHttp = !!body.retryHttp;
    const includeAssets = !!body.includeAssets;
    const scope = body.scope || 'internal'; // 'internal' | 'all'

    // Gather URLs
    let urls = [];
    if (mode === 'list') {
      const raw = Array.isArray(body.urls) ? body.urls.join('\n') : String(body.list || '');
      urls = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    } else if (mode === 'crawl') {
      const pageUrl = assertPublicHttp(body.pageUrl || '');
      const r = await fetch(pageUrl, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) });
      const html = await r.text();
      const links = extractLinksFromHtml(html, pageUrl, includeAssets);
      if (scope === 'internal') {
        const origin = originOf(pageUrl);
        urls = links.filter(u => originOf(u) === origin);
      } else {
        urls = links;
      }
    } else if (mode === 'sitemap') {
      const sm = assertPublicHttp(body.sitemapUrl || '');
      urls = await getSitemapUrls(sm);
    } else {
      return new Response(JSON.stringify({ message: 'bad_mode' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    // Normalize + SSRF guard + cap
    const uniq = new Set();
    const work = [];
    for (const u0 of urls) {
      try {
        if (unsupportedScheme(u0)) { work.push({ url: u0, note: 'unsupported_scheme', skip: true }); continue; }
        const u = assertPublicHttp(u0);
        const n = normalize(u);
        if (n && !uniq.has(n)) { uniq.add(n); work.push({ url: n }); }
      } catch (e) {
        work.push({ url: u0, note: e.message || 'invalid_url', skip: true });
      }
      if (work.length >= RUN_CAP) break;
    }

    const toCheck = work.filter(x => !x.skip).map(x => x.url);
    const prefilled = work.filter(x => x.skip).map(x => ({
      url: x.url, status: 0, ok: false, finalUrl: '', archive: null, note: x.note, chain: 0
    }));

    // Pool with per-origin cap
    const results = [];
    let i = 0, inFlight = 0;
    const originCounts = new Map();
    async function tick() {
      while (i < toCheck.length && inFlight < GLOBAL_CONCURRENCY) {
        const idx = i++;
        const u = toCheck[idx];
        const org = originOf(u);
        const cnt = originCounts.get(org) || 0;
        if (cnt >= PER_ORIGIN_CAP) { i--; break; }
        originCounts.set(org, cnt + 1);
        inFlight++;
        (async () => {
          try {
            let r = await follow(u, timeout, headFirst);
            if (r.status && (r.status === 429 || r.status >= 500)) {
              r = await follow(u, timeout, false);
              if (r) r.note = (r.note ? r.note + '|' : '') + 'retry_1';
            }
            if (!r.ok && retryHttp) {
              const fb = await tryHttpFallback(u, r.headers, timeout, headFirst);
              if (fb.skipped) {
                r.note = (r.note ? r.note + '|' : '') + (fb.reason || 'guard');
              } else if (fb.result) {
                r = { ...fb.result, note: (r.note ? r.note + '|' : '') + 'http_fallback_used' };
              }
            }
            if (r.status === 410) r.note = (r.note ? r.note + '|' : '') + 'gone';
            results[idx] = {
              url: u, status: r.status || 0, ok: !!r.ok, finalUrl: r.finalUrl || u,
              archive: null, note: r.note || null, chain: r.chain || 0
            };
          } catch {
            results[idx] = { url: u, status: 0, ok: false, finalUrl: '', archive: null, note: 'network_error', chain: 0 };
          } finally {
            originCounts.set(org, (originCounts.get(org) || 1) - 1);
            inFlight--;
            tick();
          }
        })();
      }
      if (i >= toCheck.length && inFlight === 0) return true;
      return false;
    }
    await new Promise(res => {
      const loop = () => { if (tick()) res(); else setTimeout(loop, 25); };
      loop();
    });

    const out = [...prefilled, ...results.filter(Boolean)];

    const meta = {
      runTimestamp: new Date().toISOString(),
      mode,
      source: body.pageUrl || body.sitemapUrl || 'list',
      concurrency: GLOBAL_CONCURRENCY,
      timeoutMs: timeout,
      robots: body.respectRobots !== false, // UI defaults ON; server is neutral here
      scope,
      assets: !!includeAssets,
      httpFallback: !!retryHttp,
      wayback: !!body.includeArchive,
      totalQueued: work.length,
      totalChecked: toCheck.length,
      truncated: work.length > toCheck.length
    };

    return new Response(JSON.stringify({ meta, results: out }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ message: 'Server error', error: String(e).slice(0, 200) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
