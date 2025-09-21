export const config = { runtime: 'edge' };

const UA = 'TinyUtils-DeadLinkChecker/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const TLDS = ['.gov', '.mil', '.bank', '.edu'];
const HARD_CAP = 200;
const MAX_REDIRECTS = 5;

function badScheme(u){ return /^(javascript:|data:|mailto:)/i.test(u || ''); }
function norm(u){
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

async function fetchHead(u, t){ return fetch(u, { method:'HEAD', redirect:'manual', headers:{'user-agent':UA}, signal: AbortSignal.timeout(t) }); }
async function fetchGet(u, t){ return fetch(u, { method:'GET',  redirect:'manual', headers:{'user-agent':UA}, signal: AbortSignal.timeout(t) }); }

async function followOnce(url, timeout, headFirst){
  let usedGet = !headFirst;
  let r;
  if (!usedGet) {
    try { r = await fetchHead(url, timeout); }
    catch { usedGet = true; }
    if (r && r.status >= 200 && r.status < 300) r = await fetchGet(url, timeout);
  }
  if (!r) r = await fetchGet(url, timeout);
  return r;
}

async function follow(url, timeout, headFirst){
  let u = url, chain = 0, lastHeaders = null;
  while (chain <= MAX_REDIRECTS) {
    const r = await followOnce(u, timeout, headFirst);
    lastHeaders = r.headers;
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      if (!loc) return { status:r.status, ok:false, finalUrl:u, note:'bad_redirect', chain, headers:lastHeaders };
      try { u = new URL(loc, u).href; } catch { return { status:r.status, ok:false, finalUrl:u, note:'bad_redirect', chain, headers:lastHeaders }; }
      chain++; continue;
    }
    return { status:r.status, ok:r.ok, finalUrl:u, chain, headers:lastHeaders };
  }
  return { status:null, ok:false, finalUrl:url, note:'redirect_loop', chain, headers:lastHeaders };
}

async function httpFallbackIfAllowed(origUrl, headers, timeout, headFirst){
  try {
    const U = new URL(origUrl);
    const host = U.hostname.toLowerCase();
    if (TLDS.some(t => host.endsWith(t))) return { skipped:true, reason:'tld_guard' };
    const hsts = headers && headers.get('strict-transport-security');
    if (hsts) return { skipped:true, reason:'hsts' };
    if (U.protocol === 'https:') {
      U.protocol = 'http:';
      const r = await follow(U.href, timeout, headFirst);
      return { skipped:false, result:r };
    }
  } catch {}
  return { skipped:true, reason:'proto' };
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error:'POST only' }), { status:405, headers:{'content-type':'application/json'} });
  }
  const b = await req.json();
  const timeout = Math.min(30000, Math.max(1000, Number(b.timeout) || 10000));
  const headFirst = b.headFirst !== false;
  const retryHttp = !!b.retryHttp;

  // Gather URLs
  let urls = [];
  if (b.mode === 'list') {
    const raw = Array.isArray(b.urls) ? b.urls : String(b.list || '').split(/\r?\n/);
    urls = raw.map(s => s.trim()).filter(Boolean);
  } else if (b.mode === 'crawl') {
    const page = b.pageUrl;
    if (!page) return new Response(JSON.stringify({ error:'pageUrl required' }), { status:400 });
    const r = await fetch(page, { headers:{'user-agent':UA}, signal: AbortSignal.timeout(10000) });
    const html = await r.text();
    const out = [];
    html.replace(/<a\b[^>]*href=["']([^"']+)["']/gi, (_,v) => { try { out.push(new URL(v, page).href); } catch {} return _; });
    if (b.includeAssets) {
      html.replace(/<img\b[^>]*src=["']([^"']+)["']/gi, (_,v)=>{ try{ out.push(new URL(v,page).href);}catch{} return _; });
      html.replace(/<script\b[^>]*src=["']([^"']+)["']/gi,(_,v)=>{ try{ out.push(new URL(v,page).href);}catch{} return _; });
      html.replace(/<link\b[^>]*href=["']([^"']+)["']/gi,  (_,v)=>{ try{ out.push(new URL(v,page).href);}catch{} return _; });
    }
    urls = Array.from(new Set(out));
  } else if (b.mode === 'sitemap') {
    const sm = b.sitemapUrl;
    if (!sm) return new Response(JSON.stringify({ error:'sitemapUrl required' }), { status:400 });
    const r = await fetch(sm, { headers:{'user-agent':UA}, signal: AbortSignal.timeout(10000) });
    const xml = await r.text();
    urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/gi)].map(m => m[1].trim());
  } else {
    return new Response(JSON.stringify({ error:'bad mode' }), { status:400 });
  }

  // Normalize, dedupe, cap
  const seen = new Set(), work = [];
  for (const u of urls) {
    if (badScheme(u)) { work.push({ kind:'skip', url:u }); continue; }
    const n = norm(u);
    if (n && !seen.has(n)) { seen.add(n); work.push({ kind:'url', url:n }); }
  }
  const queued = work.filter(x => x.kind === 'url').map(x => x.url);
  const slice = queued.slice(0, HARD_CAP);

  // Check
  const results = [];
  for (const u of slice) {
    let r = await follow(u, timeout, headFirst);
    if (r.status && (r.status === 429 || r.status >= 500)) {
      r = await follow(u, timeout, false);
      if (!r.ok) r.note = (r.note ? r.note+'|' : '') + 'retry_1';
    }
    if (!r.ok && retryHttp) {
      const alt = await httpFallbackIfAllowed(u, r.headers, timeout, headFirst);
      if (alt.skipped) {
        r.note = (r.note ? r.note+'|' : '') + alt.reason;
      } else if (alt.result) {
        r = { ...alt.result, note: (r.note ? r.note+'|' : '') + 'http_fallback_used' };
      }
    }
    if (r.status === 410) r.note = (r.note ? r.note+'|' : '') + 'gone';
    results.push({ url:u, status:r.status, ok:r.ok, finalUrl:r.finalUrl, archive:null, note:r.note || null, chain:r.chain || 0 });
  }

  const meta = {
    runTimestamp: new Date().toISOString(),
    mode: b.mode || 'list',
    source: b.pageUrl || b.sitemapUrl || 'list',
    concurrency: Number(b.concurrency) || 10,
    timeoutMs: timeout,
    robots: b.respectRobots !== false,
    scope: b.scope || 'internal',
    assets: !!b.includeAssets,
    httpFallback: !!b.retryHttp,
    wayback: !!b.includeArchive,
    totalQueued: queued.length,
    totalChecked: slice.length,
    truncated: queued.length > slice.length
  };

  return new Response(JSON.stringify({ meta, results }), { headers:{'content-type':'application/json'} });
}
