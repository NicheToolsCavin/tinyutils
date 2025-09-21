export const config = { runtime: 'edge' };

const UA = 'TinyUtils-SitemapDelta/1.0 (+https://tinyutils.net)';
const HARD_CAP = 200;
const CHILD_SITEMAPS_LIMIT = 50;
const VERIFY_CONCURRENCY = 6;

function isPrivateHost(host) {
  const h = (host || '').toLowerCase();
  if (['localhost', '127.0.0.1', '::1'].includes(h) || h.endsWith('.local')) return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  return false;
}
function assertPublicHttp(u) {
  let url; try { url = new URL(u); } catch { throw new Error('invalid_url'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('unsupported_scheme');
  if (isPrivateHost(url.hostname)) throw new Error('private_host_blocked');
  if (url.toString().length > 2048) throw new Error('invalid_url');
  url.hash = ''; return url.toString();
}
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

async function fetchMaybeGzip(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) });
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const gz = url.endsWith('.gz') || ct.includes('application/gzip') || ct.includes('application/x-gzip');
  if (gz && typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    return await new Response(res.body.pipeThrough(ds)).text();
  }
  return await res.text();
}

function extractLocs(xml) {
  const locs = [];
  let m;
  const reUrl = /<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi;
  while ((m = reUrl.exec(xml))) {
    locs.push(m[1].trim());
    if (locs.length >= HARD_CAP) break;
  }
  if (locs.length) return { isIndex: false, items: locs };
  const reSm = /<sitemap>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
  const sms = [];
  while ((m = reSm.exec(xml))) {
    sms.push(m[1].trim());
    if (sms.length >= 50) break;
  }
  return { isIndex: true, items: sms };
}

async function loadSitemapAny({ url, text }) {
  if (!url && !text) return [];
  const xml = text ? text : await fetchMaybeGzip(url);
  const block = extractLocs(xml);
  if (!block.items.length) return [];
  if (!block.isIndex) return block.items.slice(0, HARD_CAP);

  // index → pull children (bounded)
  const agg = [];
  for (const child of block.items.slice(0, CHILD_SITEMAPS_LIMIT)) {
    try {
      const x = await fetchMaybeGzip(child);
      let m; const re2 = /<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi;
      while ((m = re2.exec(x))) {
        agg.push(m[1].trim());
        if (agg.length >= HARD_CAP) break;
      }
      if (agg.length >= HARD_CAP) break;
    } catch { /* ignore one child */ }
  }
  return agg.slice(0, HARD_CAP);
}

function pathOnly(u) { try { return new URL(u).pathname.replace(/\/$/, '').toLowerCase(); } catch { return ''; } }
function lastSeg(p) { const s = p.split('/').filter(Boolean); return s[s.length - 1] || ''; }
function slug(s) { return s.replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' '); }
function lev(a, b) {
  const n = a.length, m = b.length; if (!n) return m; if (!m) return n;
  const dp = new Array(m + 1); for (let j = 0; j <= m; j++) dp[j] = j;
  for (let i = 1; i <= n; i++) { let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= m; j++) { const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; } }
  return dp[m];
}
function sim01(a, b) {
  if (a === b) return 1;
  const d = lev(a, b); const den = Math.max(a.length, b.length) || 1;
  return 1 - (d / den);
}
function sameRegDomain(a, b) {
  try {
    const A = new URL(a).hostname.split('.'), B = new URL(b).hostname.split('.');
    return A.slice(-2).join('.') === B.slice(-2).join('.');
  } catch { return false; }
}
function guess(fromPath, toPath) {
  const la = lastSeg(fromPath), lb = lastSeg(toPath);
  if (la === lb) return { note: 'slug_exact', confidence: 0.95 };
  const sA = slug(la), sB = slug(lb);
  const s = sim01(sA, sB);
  if (s >= 0.85) return { note: 'slug_similar', confidence: 0.88 };
  const w = sim01(fromPath, toPath);
  if (w >= 0.70) return { note: 'path_similar', confidence: 0.75 };
  return { note: 'low_similarity', confidence: 0.40 };
}

async function verifyTargets(pairs, timeout) {
  const out = new Array(pairs.length);
  let i = 0; const W = Math.min(VERIFY_CONCURRENCY, Math.max(1, pairs.length));
  async function worker() {
    while (true) {
      const idx = i++; if (idx >= pairs.length) return;
      const p = pairs[idx];
      try {
        const res = await fetch(p.to, { method: 'HEAD', redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout) });
        out[idx] = { ...p, verifyStatus: res.status, verifyOk: (res.status >= 200 && res.status < 300) || (res.status >= 301 && res.status <= 308) };
      } catch {
        out[idx] = { ...p, verifyStatus: 0, verifyOk: false, note: (p.note ? p.note + '|' : '') + 'timeout' };
      }
    }
  }
  await Promise.all(Array.from({ length: W }, () => worker()));
  return out;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'content-type': 'application/json' } });
  }
  try {
    const body = await req.json();
    const verify = !!body.verifyTargets;
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout) || 10000));
    const sameRegOnly = body.sameRegDomainOnly !== false;

    const Aurl = body.sitemapAUrl ? assertPublicHttp(body.sitemapAUrl) : null;
    const Burl = body.sitemapBUrl ? assertPublicHttp(body.sitemapBUrl) : null;

    const listA = await loadSitemapAny({ url: Aurl, text: body.sitemapAText });
    const listB = await loadSitemapAny({ url: Burl, text: body.sitemapBText });

    const normA = Array.from(new Set(listA.map(normalize).filter(Boolean))).slice(0, HARD_CAP);
    const normB = Array.from(new Set(listB.map(normalize).filter(Boolean))).slice(0, HARD_CAP);

    const setA = new Set(normA); const setB = new Set(normB);
    const removed = normA.filter(u => !setB.has(u));
    const added = normB.filter(u => !setA.has(u));

    const byHost = new Map();
    for (const u of added) {
      try {
        const host = new URL(u).host;
        if (!byHost.has(host)) byHost.set(host, []);
        byHost.get(host).push(u);
      } catch { /* ignore */ }
    }
    const allAdded = added.slice();
    const pairs = [];
    for (const r of removed) {
      const rp = pathOnly(r);
      let cand = [];
      try {
        const host = new URL(r).host;
        cand = (byHost.get(host) || []);
        if (!cand.length) cand = allAdded.filter(u => sameRegDomain(u, r));
      } catch { cand = allAdded; }
      let best = null, bestScore = -1;
      for (const t of (cand.length ? cand : allAdded)) {
        if (sameRegOnly && !sameRegDomain(r, t)) continue;
        const g = guess(rp, pathOnly(t));
        if (g.confidence > bestScore) { best = { from: r, to: t, confidence: g.confidence, note: g.note, method: '301' }; bestScore = g.confidence; }
      }
      if (best && best.confidence >= 0.66) pairs.push(best);
    }

    // Dedup by "from"
    const map = new Map();
    for (const p of pairs) {
      const prev = map.get(p.from);
      if (!prev || p.confidence > prev.confidence) map.set(p.from, p);
    }
    let dedup = Array.from(map.values());
    if (verify && dedup.length) dedup = await verifyTargets(dedup, timeout);

    const mappedFrom = new Set(dedup.map(p => p.from));
    const unmapped = removed.filter(u => !mappedFrom.has(u));

    const meta = {
      runTimestamp: new Date().toISOString(),
      removedCount: removed.length,
      addedCount: added.length,
      suggestedMappings: dedup.length,
      truncated: normA.length !== listA.length || normB.length !== listB.length,
      verify: !!verify,
      timeoutMs: timeout,
      sameRegDomainOnly: sameRegOnly
    };

    return new Response(JSON.stringify({ meta, added, removed, pairs: dedup, unmapped }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 200) }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
}
