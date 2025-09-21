// File: /api/check.js
export const config = { runtime: 'edge' };

const UA = 'TinyUtils-DeadLinkChecker/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const HARD_CAP = 200;
const MAX_GLOBAL = 10;
const MAX_PER_ORIGIN = 2;
const MAX_REDIRECTS = 5;
const TLD_NO_FALLBACK = [/\.gov$/i, /\.mil$/i, /\.bank$/i, /\.edu$/i];

function badScheme(u) { return /^(javascript:|data:|mailto:)/i.test(u || ''); }
function originOf(u) { try { return new URL(u).origin; } catch { return ''; } }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function tldGuard(host){ const h = (host||'').toLowerCase(); return TLD_NO_FALLBACK.some(rx=>rx.test(h)); }

function isPrivateHost(host){
  const h = (host||'').toLowerCase();
  if (['localhost','127.0.0.1','::1'].includes(h) || h.endsWith('.local')) return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  return false;
}
function assertPublicHttp(u){
  let url; try { url = new URL(u); } catch { throw new Error('invalid_url'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('unsupported_scheme');
  if (isPrivateHost(url.hostname)) throw new Error('private_host_blocked');
  if (url.toString().length > 2048) throw new Error('invalid_url');
  url.hash = '';
  return url.toString();
}
function norm(u){
  try{
    const x = new URL(u);
    x.hash = '';
    x.hostname = x.hostname.toLowerCase();
    if (x.port === '80' && x.protocol === 'http:') x.port = '';
    if (x.port === '443' && x.protocol === 'https:') x.port = '';
    if (!x.pathname) x.pathname = '/';
    return x.toString();
  } catch { return null; }
}

// --- robots.txt (naive, cached) ---
const ROBOTS_TTL_MS = 20 * 60 * 1000;
const robotsCache = new Map(); // origin -> { ts, allow, disallow, ok|unknown }
async function fetchRobots(origin){
  const now = Date.now();
  const cached = robotsCache.get(origin);
  if (cached && now - cached.ts < ROBOTS_TTL_MS) return cached;
  try{
    const res = await fetch(`${origin}/robots.txt`, {
      headers:{ 'user-agent': UA }, signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error('bad');
    const txt = await res.text();
    const allow = [], disallow = [];
    let inStar = false;
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.trim(); if (!line || line.startsWith('#')) continue;
      const i = line.indexOf(':'); if (i < 0) continue;
      const k = line.slice(0,i).trim().toLowerCase();
      const v = (line.slice(i+1).trim()) || '';
      if (k === 'user-agent') inStar = (v === '*' || v.includes('*'));
      else if (inStar && k === 'disallow') disallow.push(v);
      else if (inStar && k === 'allow') allow.push(v);
    }
    const entry = { ts: now, allow, disallow, ok: true };
    robotsCache.set(origin, entry);
    return entry;
  } catch {
    const entry = { ts: now, allow:[], disallow:[], ok:false, unknown:true };
    robotsCache.set(origin, entry);
    return entry;
  }
}
function isAllowedByRobots(path, rules){
  const match = (p, arr) => arr.some(rule => rule && p.startsWith(rule));
  if (match(path, rules.disallow) && !match(path, rules.allow)) return false;
  return true;
}

// --- fetching helpers ---
async function head(u,t){ return fetch(u,{ method:'HEAD', redirect:'manual', headers:{'user-agent':UA}, signal:AbortSignal.timeout(t) }); }
async function get(u,t){ return fetch(u,{ method:'GET',  redirect:'manual', headers:{'user-agent':UA}, signal:AbortSignal.timeout(t) }); }

async function follow(url, timeout, headFirst){
  let current = url, hops = 0, usedGet = !headFirst;
  while (hops <= MAX_REDIRECTS) {
    let res;
    if (!usedGet) {
      try {
        res = await head(current, timeout);
      } catch { usedGet = true; continue; }
      if (res.status >= 200 && res.status < 300) res = await get(current, timeout);
    } else {
      res = await get(current, timeout);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return { status: res.status, ok:false, finalUrl: current, note:'bad_redirect', chain: hops, headers: res.headers };
      try{ current = new URL(loc, current).toString(); } catch {
        return { status: res.status, ok:false, finalUrl: current, note:'bad_redirect', chain:hops, headers:res.headers };
      }
      hops++; continue;
    }
    return { status: res.status, ok: (res.status>=200 && res.status<300), finalUrl: current, chain: hops, headers: res.headers };
  }
  return { status: 0, ok:false, finalUrl: url, note:'redirect_loop', chain: MAX_REDIRECTS, headers: null };
}

async function gatherUrls(body){
  const mode = body.mode || 'list';
  if (mode === 'list') {
    const raw = (Array.isArray(body.urls) ? body.urls.join('\n') : (body.list||'')).toString();
    return raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  }
  if (mode === 'crawl') {
    const pageUrl = assertPublicHttp(body.pageUrl||'');
    const res = await fetch(pageUrl, { headers:{'user-agent':UA}, signal:AbortSignal.timeout(10000) });
    const html = await res.text();
    const links = [];
    html.replace(/<a\b[^>]*href=["']([^"']+)["']/gi, (_,v)=>{ links.push(v); return _; });
    if (body.includeAssets) {
      html.replace(/<img\b[^>]*src=["']([^"']+)["']/gi,(_,v)=>{ links.push(v); return _; });
      html.replace(/<script\b[^>]*src=["']([^"']+)["']/gi,(_,v)=>{ links.push(v); return _; });
      html.replace(/<link\b[^>]*href=["']([^"']+)["']/gi,(_,v)=>{ links.push(v); return _; });
    }
    const abs = (v)=>new URL(v, pageUrl).toString();
    const absed = links.filter(v=>!badScheme(v)).map(abs);
    if ((body.scope||'internal') === 'internal') {
      const o = originOf(pageUrl);
      return Array.from(new Set(absed.filter(u=>originOf(u)===o)));
    }
    return Array.from(new Set(absed));
  }
  if (mode === 'sitemap') {
    const sm = assertPublicHttp(body.sitemapUrl||'');
    const r = await fetch(sm, { headers:{'user-agent':UA}, signal:AbortSignal.timeout(10000) });
    const xml = await r.text();
    const locs = [];
    // urlset
    xml.replace(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi, (_,u)=>{ locs.push(u.trim()); return _; });
    if (locs.length) return locs;
    // sitemapindex
    const sitems = []; xml.replace(/<sitemap>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi, (_,u)=>{ sitems.push(u.trim()); return _; });
    let agg = [];
    for (const child of sitems.slice(0,50)){
      try{
        const r2 = await fetch(child, { headers:{'user-agent':UA}, signal:AbortSignal.timeout(10000) });
        const x2 = await r2.text();
        x2.replace(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi, (_,u)=>{ agg.push(u.trim()); return _; });
      }catch{}
      if (agg.length >= HARD_CAP) break;
    }
    return agg;
  }
  return [];
}

async function handlerCore(body){
  const headFirst = body.headFirst !== false;
  const retryHttp = !!body.retryHttp;
  const respectRobots = body.respectRobots !== false;
  const includeAssets = !!body.includeAssets;
  const scope = body.scope || 'internal';
  const timeout = Math.min(30000, Math.max(1000, Number(body.timeout)||10000));

  // gather -> normalize -> cap
  let urls = await gatherUrls({ ...body, includeAssets, scope });
  const seen = new Set(), work = [];
  for (const raw of urls) {
    try{
      const guarded = assertPublicHttp(raw);
      const n = norm(guarded); if (!n) continue;
      if (!seen.has(n)) { seen.add(n); work.push(n); }
    }catch(e){
      work.push({ url: raw, err: e.message });
    }
  }
  const totalQueued = work.length;
  const slice = work.slice(0, HARD_CAP);

  // polite per-origin pool
  const results = new Array(slice.length);
  const originCounts = new Map();
  let idx = 0, inflight = 0;

  async function runOne(i, val){
    if (typeof val !== 'string') {
      results[i] = { url: val.url, status:0, ok:false, finalUrl:'', archive:null, note: val.err === 'unsupported_scheme' ? 'unsupported_scheme' :
                     val.err === 'private_host_blocked' ? 'blocked_private_host' : 'invalid_url', chain:0 };
      return;
    }
    const u = val;
    if (badScheme(u)) { results[i] = { url:u, status:0, ok:false, finalUrl:'', archive:null, note:'unsupported_scheme', chain:0 }; return; }
    // robots
    if (respectRobots) {
      try{
        const rules = await fetchRobots(originOf(u));
        if (rules.unknown) {
          // proceed but record note at the end
          var robotsUnknown = true; // function-scope
        }
        const path = new URL(u).pathname + (new URL(u).search||'');
        if (!isAllowedByRobots(path, rules)) {
          results[i] = { url:u, status:0, ok:false, finalUrl:'', archive:null, note:'robots_blocked', chain:0 };
          return;
        }
      }catch{}
    }
    // follow & optional HTTP fallback
    let r = await follow(u, timeout, headFirst);
    if (r.status && (r.status === 429 || r.status >= 500)) {
      await sleep(40 + Math.floor(Math.random()*40));
      r = await follow(u, timeout, false);
      r.note = (r.note ? r.note + '|' : '') + 'retry_1';
    }
    if (!r.ok && retryHttp) {
      try{
        const HSTS = r.headers && r.headers.get('strict-transport-security');
        const host = new URL(r.finalUrl||u).hostname;
        if (!HSTS && !tldGuard(host) && (u.startsWith('https://'))) {
          const hUrl = 'http://' + u.slice('https://'.length);
          const r2 = await follow(hUrl, timeout, false);
          r = { ...r2, note: (r.note ? r.note+'|' : '') + 'http_fallback_used' };
        } else if (HSTS) {
          r.note = (r.note ? r.note+'|' : '') + 'hsts';
        }
      }catch{}
    }
    if (r.status === 410) r.note = (r.note ? r.note+'|' : '') + 'gone';
    if (typeof robotsUnknown !== 'undefined') r.note = (r.note ? r.note+'|' : '') + 'robots_unknown';

    results[i] = {
      url: u,
      status: r.status||0,
      ok: !!r.ok,
      finalUrl: r.finalUrl || '',
      archive: null,
      note: r.note || null,
      chain: r.chain || 0
    };
  }

  return await new Promise(resolve=>{
    const pump = async () => {
      while (idx < slice.length && inflight < MAX_GLOBAL) {
        const i = idx++;
        const val = slice[i];
        const u = (typeof val === 'string') ? val : val.url;
        const org = originOf(u);
        const n = originCounts.get(org) || 0;
        if (n >= MAX_PER_ORIGIN) { await sleep(50); break; }
        originCounts.set(org, n+1); inflight++;
        runOne(i, val).finally(() => {
          originCounts.set(org, Math.max(0, (originCounts.get(org)||1)-1));
          inflight--; pump();
        });
      }
      if (idx >= slice.length && inflight === 0) {
        const meta = {
          runTimestamp: new Date().toISOString(),
          mode: (body.mode||'list'),
          source: body.pageUrl || body.sitemapUrl || 'list',
          concurrency: MAX_GLOBAL,
          timeoutMs: timeout,
          robots: !!respectRobots,
          scope,
          assets: !!body.includeAssets,
          httpFallback: !!retryHttp,
          wayback: !!body.includeArchive,
          totalQueued,
          totalChecked: slice.length,
          truncated: totalQueued > slice.length
        };
        resolve({ meta, results });
      }
    };
    pump();
  });
}

export default async function handler(req){
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message:'Method Not Allowed' }), { status:405, headers:{'content-type':'application/json'} });
  }
  try{
    const body = await req.json();
    const { meta, results } = await handlerCore(body);
    return new Response(JSON.stringify({ meta, results }), { status:200, headers:{'content-type':'application/json'} });
  }catch(e){
    return new Response(JSON.stringify({ message:'Server error', error: String(e.message||e).slice(0,200) }), { status:500, headers:{'content-type':'application/json'} });
  }
}
