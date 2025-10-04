export const runtime = 'edge';

const UA = 'TinyUtils-SitemapDelta/1.0 (+https://tinyutils.net)';
const HARD_CAP = 200;
const CHILD_SITEMAPS_LIMIT = 50;
const VERIFY_CONCURRENCY = 6;

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

function normUrl(u) {
  try {
    const url = new URL(u);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (isPrivateHost(url.hostname)) return null;
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (!url.pathname) url.pathname = '/';
    if (url.port === '80' && url.protocol === 'http:') url.port = '';
    if (url.port === '443' && url.protocol === 'https:') url.port = '';
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchMaybeGzip(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) });
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const looksGz = url.endsWith('.gz') || ct.includes('application/gzip') || ct.includes('application/x-gzip');
  if (looksGz && typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    return new Response(res.body.pipeThrough(ds)).text();
  }
  return res.text();
}

function extractLocs(xml) {
  const locs = [];
  const urlRe = /<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi;
  let m;
  while ((m = urlRe.exec(xml))) {
    locs.push(m[1].trim());
    if (locs.length >= HARD_CAP) break;
  }
  if (locs.length) return { isIndex: false, items: locs };
  const sm = [];
  const idxRe = /<sitemap>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
  while ((m = idxRe.exec(xml))) {
    sm.push(m[1].trim());
    if (sm.length >= CHILD_SITEMAPS_LIMIT) break;
  }
  return { isIndex: true, items: sm };
}

function pathOf(u) {
  try {
    return new URL(u).pathname.replace(/\/$/, '').toLowerCase();
  } catch {
    return u;
  }
}

function lastSeg(p) {
  const s = p.split('/').filter(Boolean);
  return s[s.length - 1] || '';
}

function slugNorm(s) {
  return s.replace(/[^a-z0-9]+/gi, ' ').trim().replace(/\s+/g, ' ').toLowerCase();
}

function lev(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n) return m;
  if (!m) return n;
  const d = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i += 1) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= m; j += 1) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[m];
}

function sim01(a, b) {
  if (a === b) return 1;
  const den = Math.max(a.length, b.length) || 1;
  return 1 - lev(a, b) / den;
}

function guessMatch(aPath, bPath) {
  const la = lastSeg(aPath);
  const lb = lastSeg(bPath);
  if (la === lb) return { note: 'slug_exact', conf: 0.95 };
  const sSim = sim01(slugNorm(la), slugNorm(lb));
  if (sSim >= 0.85) return { note: 'slug_similar', conf: 0.88 };
  const whole = sim01(aPath, bPath);
  if (whole >= 0.7) return { note: 'path_similar', conf: 0.75 };
  return { note: 'low_similarity', conf: 0.4 };
}

function sameRegDomain(a, b) {
  try {
    const A = new URL(a).hostname.split('.');
    const B = new URL(b).hostname.split('.');
    return A.slice(-2).join('.') === B.slice(-2).join('.');
  } catch {
    return false;
  }
}

async function verifyTargets(pairs, timeout) {
  const out = new Array(pairs.length);
  let idx = 0;
  const pool = Math.min(VERIFY_CONCURRENCY, pairs.length || 1);
  async function worker() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const current = idx;
      idx += 1;
      if (current >= pairs.length) return;
      const p = pairs[current];
      try {
        const r = await fetch(p.to, {
          method: 'HEAD',
          redirect: 'manual',
          headers: { 'user-agent': UA },
          signal: AbortSignal.timeout(timeout)
        });
        out[current] = {
          ...p,
          verifyStatus: r.status,
          verifyOk: (r.status >= 200 && r.status < 300) || (r.status >= 301 && r.status <= 308)
        };
      } catch {
        out[current] = { ...p, verifyStatus: 0, verifyOk: false, note: (p.note ? `${p.note}|` : '') + 'timeout' };
      }
    }
  }
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return out;
}

async function loadSitemapFromUrl(rawUrl) {
  const normalized = normUrl(rawUrl);
  if (!normalized) {
    throw new Error('bad_sitemap_url');
  }
  return fetchMaybeGzip(normalized);
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout) || 10000));
    const verify = !!body.verifyTargets;
    const sameReg = body.sameRegDomainOnly !== false;

    let listA = [];
    if (body.sitemapAText) {
      const blk = extractLocs(body.sitemapAText);
      listA = blk.isIndex ? [] : blk.items;
    } else if (body.sitemapAUrl) {
      const xml = await loadSitemapFromUrl(body.sitemapAUrl);
      const blk = extractLocs(xml);
      if (blk.isIndex) {
        const agg = [];
        for (const child of blk.items.slice(0, CHILD_SITEMAPS_LIMIT)) {
          try {
            const text = await loadSitemapFromUrl(child);
            const urls = extractLocs(text);
            if (!urls.isIndex) agg.push(...urls.items);
          } catch {}
          if (agg.length >= HARD_CAP) break;
        }
        listA = agg.slice(0, HARD_CAP);
      } else {
        listA = blk.items.slice(0, HARD_CAP);
      }
    }

    let listB = [];
    if (body.sitemapBText) {
      const blk = extractLocs(body.sitemapBText);
      listB = blk.isIndex ? [] : blk.items;
    } else if (body.sitemapBUrl) {
      const xml = await loadSitemapFromUrl(body.sitemapBUrl);
      const blk = extractLocs(xml);
      if (blk.isIndex) {
        const agg = [];
        for (const child of blk.items.slice(0, CHILD_SITEMAPS_LIMIT)) {
          try {
            const text = await loadSitemapFromUrl(child);
            const urls = extractLocs(text);
            if (!urls.isIndex) agg.push(...urls.items);
          } catch {}
          if (agg.length >= HARD_CAP) break;
        }
        listB = agg.slice(0, HARD_CAP);
      } else {
        listB = blk.items.slice(0, HARD_CAP);
      }
    }

    const A = Array.from(new Set(listA.map(normUrl).filter(Boolean))).slice(0, HARD_CAP);
    const B = Array.from(new Set(listB.map(normUrl).filter(Boolean))).slice(0, HARD_CAP);

    const setA = new Set(A);
    const setB = new Set(B);
    const removed = A.filter(u => !setB.has(u));
    const added = B.filter(u => !setA.has(u));

    const byHost = new Map();
    for (const u of added) {
      try {
        const h = new URL(u).host;
        if (!byHost.has(h)) byHost.set(h, []);
        byHost.get(h).push(u);
      } catch {}
    }

    const allAdded = added.slice();
    const pairs = [];
    for (const r of removed) {
      let candidates = [];
      try {
        const h = new URL(r).host;
        candidates = byHost.get(h) || [];
        if (!candidates.length) {
          candidates = allAdded.filter(u => sameRegDomain(u, r));
        }
      } catch {
        candidates = allAdded;
      }
      let best = null;
      let bestScore = -1;
      const rp = pathOf(r);
      for (const t of (candidates.length ? candidates : allAdded)) {
        if (sameReg && !sameRegDomain(r, t)) continue;
        const guess = guessMatch(rp, pathOf(t));
        if (guess.conf > bestScore) {
          best = { from: r, to: t, confidence: guess.conf, note: guess.note, method: '301' };
          bestScore = guess.conf;
        }
      }
      if (best && best.confidence >= 0.66) {
        pairs.push(best);
      }
    }

    const dedupMap = new Map();
    for (const p of pairs) {
      const prev = dedupMap.get(p.from);
      if (!prev || p.confidence > prev.confidence) {
        dedupMap.set(p.from, p);
      }
    }

    let deduped = Array.from(dedupMap.values());
    if (verify && deduped.length) {
      deduped = await verifyTargets(deduped, timeout);
    }

    const mappedFrom = new Set(deduped.map(p => p.from));
    const unmapped = removed.filter(u => !mappedFrom.has(u));

    const meta = {
      runTimestamp: new Date().toISOString(),
      removedCount: removed.length,
      addedCount: added.length,
      suggestedMappings: deduped.length,
      truncated: A.length >= HARD_CAP || B.length >= HARD_CAP,
      verify,
      timeoutMs: timeout,
      sameRegDomainOnly: sameReg
    };

    return new Response(
      JSON.stringify({ meta, added, removed, pairs: deduped, unmapped, rules: [] }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        meta: { runTimestamp: new Date().toISOString(), error: String(error).slice(0, 200) },
        added: [],
        removed: [],
        pairs: [],
        unmapped: [],
        rules: []
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
