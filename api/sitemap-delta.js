export const config = { runtime: 'edge' };

const UA = 'TinyUtils-SitemapDelta/1.0 (+https://tinyutils-eight.vercel.app)';
const HARD_CAP = 200;
const CHILD_SITEMAPS_LIMIT = 50;
const VERIFY_CONCURRENCY = 6;
const GLOBAL_FETCH_CAP = 10;
const PER_ORIGIN_FETCH_CAP = 2;

function rid() {
  return Math.random().toString(16).slice(2, 10);
}

function jsonResponse(status, payload, requestId) {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
  if (requestId) headers.set('x-request-id', requestId);
  return new Response(JSON.stringify(payload), { status, headers });
}

function requestIdFrom(req) {
  try {
    const incoming = req.headers.get('x-request-id');
    if (incoming) return incoming.trim().slice(0, 64);
  } catch {}
  return rid();
}

function readUrlModeInput(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value !== 'object') return '';
  const mode = typeof value.mode === 'string' ? value.mode.toLowerCase() : null;
  if (mode && mode !== 'url') return '';
  const candidate = value.url ?? value.href ?? value.value;
  return typeof candidate === 'string' ? candidate.trim() : '';
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return 'invalid';
  }
}

async function fetchWithRetry(url, timeoutMs, options = {}) {
  const attempt = () => fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  let retried = false;
  try {
    let res = await attempt();
    if (res.status === 429 || res.status >= 500) {
      retried = true;
      await delay(50 + Math.random() * 150);
      res = await attempt();
    }
    res.__retried = retried;
    return res;
  } catch (error) {
    if (retried) throw error;
    retried = true;
    await delay(50 + Math.random() * 150);
    const res = await attempt();
    res.__retried = true;
    return res;
  }
}

async function fetchMaybeGzip(url, timeoutMs, notes) {
  const res = await fetchWithRetry(url, timeoutMs, { headers: { 'user-agent': UA } });
  if (!res.ok) {
    const error = new Error(`status_${res.status}`);
    error.status = res.status;
    if (notes && res.__retried) notes.add('retry_1');
    throw error;
  }
  if (notes && res.__retried) notes.add('retry_1');
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const looksGz = url.endsWith('.gz') || ct.includes('application/gzip') || ct.includes('application/x-gzip');
  if (looksGz) {
    if (typeof DecompressionStream !== 'function' || !res.body) {
      const error = new Error('gz_not_supported');
      error.code = 'gz_not_supported';
      error.note = 'gz_not_supported';
      throw error;
    }
    const ds = new DecompressionStream('gzip');
    return new Response(res.body.pipeThrough(ds)).text();
  }
  return res.text();
}

function extractLocs(xml, limit = HARD_CAP) {
  const locs = [];
  const urlRe = /<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi;
  let m;
  while ((m = urlRe.exec(xml))) {
    locs.push(m[1].trim());
    if (locs.length >= limit) break;
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

async function runFetchQueue(urls, worker) {
  const queue = urls.slice();
  const perOrigin = new Map();
  const maxWorkers = Math.min(GLOBAL_FETCH_CAP, queue.length);
  const workers = [];
  const results = [];

  async function takeNext() {
    const url = queue.shift();
    if (!url) return;
    const origin = safeOrigin(url);
    if ((perOrigin.get(origin) || 0) >= PER_ORIGIN_FETCH_CAP) {
      queue.push(url);
      await delay(10);
      return takeNext();
    }
    perOrigin.set(origin, (perOrigin.get(origin) || 0) + 1);
    try {
      const result = await worker(url);
      if (result !== undefined) results.push(result);
    } finally {
      perOrigin.set(origin, (perOrigin.get(origin) || 0) - 1);
    }
    return takeNext();
  }

  for (let i = 0; i < maxWorkers; i += 1) {
    workers.push(takeNext());
  }
  await Promise.all(workers);
  return results;
}

async function expandIndex(children, timeoutMs, notes, limit = HARD_CAP) {
  const limited = children.slice(0, CHILD_SITEMAPS_LIMIT);
  if (!limited.length) return [];
  const normalized = [];
  for (const child of limited) {
    const norm = normUrl(child);
    if (!norm) {
      notes?.add('invalid_child_url');
      continue;
    }
    normalized.push(norm);
  }
  if (!normalized.length) return [];
  const results = await runFetchQueue(normalized, async (url) => {
    try {
      const xml = await fetchMaybeGzip(url, timeoutMs, notes);
      const locs = extractLocs(xml, limit);
      if (locs.isIndex) {
        notes?.add('nested_sitemap_index');
        return [];
      }
      return locs.items;
    } catch (error) {
      if (error?.note === 'gz_not_supported' || error?.code === 'gz_not_supported') {
        notes?.add('gz_not_supported');
      } else {
        notes?.add('sitemap_fetch_error');
      }
      return [];
    }
  });
  return results.flat().slice(0, limit);
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
  if (!pairs.length) return [];
  const out = new Array(pairs.length);
  const queue = pairs.map((pair, index) => ({ pair, index, url: pair.to }));
  const perOrigin = new Map();
  const maxWorkers = Math.min(VERIFY_CONCURRENCY, queue.length, GLOBAL_FETCH_CAP);

  async function processNext() {
    const item = queue.shift();
    if (!item) return;
    const origin = safeOrigin(item.url);
    if ((perOrigin.get(origin) || 0) >= PER_ORIGIN_FETCH_CAP) {
      queue.push(item);
      await delay(15 + Math.random() * 35);
      return processNext();
    }

    perOrigin.set(origin, (perOrigin.get(origin) || 0) + 1);
    const noteParts = item.pair.note ? item.pair.note.split('|') : [];
    try {
      const res = await fetchWithRetry(
        item.url,
        timeout,
        { method: 'HEAD', redirect: 'manual', headers: { 'user-agent': UA } }
      );
      if (res.__retried && !noteParts.includes('retry_1')) noteParts.push('retry_1');
      out[item.index] = {
        ...item.pair,
        note: noteParts.length ? noteParts.join('|') : null,
        verifyStatus: res.status,
        verifyOk: (res.status >= 200 && res.status < 300) || (res.status >= 301 && res.status <= 308)
      };
    } catch (error) {
      if (error?.__retried && !noteParts.includes('retry_1')) noteParts.push('retry_1');
      if (!noteParts.includes('timeout')) noteParts.push('timeout');
      out[item.index] = {
        ...item.pair,
        note: noteParts.join('|'),
        verifyStatus: 0,
        verifyOk: false
      };
    } finally {
      perOrigin.set(origin, Math.max(0, (perOrigin.get(origin) || 1) - 1));
      await delay(10 + Math.random() * 30);
    }

    return processNext();
  }

  await Promise.all(Array.from({ length: maxWorkers }, () => processNext()));
  return out;
}

async function loadSitemapFromUrl(rawUrl, timeoutMs, notes) {
  const normalized = normUrl(rawUrl);
  if (!normalized) {
    const err = new Error('bad_sitemap_url');
    err.code = 'bad_sitemap_url';
    err.note = 'bad_sitemap_url';
    throw err;
  }
  try {
    return await fetchMaybeGzip(normalized, timeoutMs, notes);
  } catch (error) {
    if (error?.code === 'gz_not_supported') {
      const err = new Error('gz_not_supported');
      err.note = 'gz_not_supported';
      err.code = 'gz_not_supported';
      throw err;
    }
    throw error;
  }
}

export default async function handler(req) {
  const requestId = requestIdFrom(req);

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed', details: { message: 'Only POST is supported' } }, requestId);
  }

  let parsed;
  try {
    parsed = await req.json();
  } catch (error) {
    return jsonResponse(400, { error: 'invalid_json', details: { message: error?.message || 'Invalid JSON' } }, requestId);
  }

  const body = parsed && typeof parsed === 'object' ? parsed : {};
  const timeout = Math.min(30000, Math.max(1000, Number(body.timeout) || 10000));
  const verify = !!body.verifyTargets;
  const sameReg = body.sameRegDomainOnly !== false;
  const notes = new Set();
  const sitemapAUrlInput = readUrlModeInput(body.sitemapAUrl);
  const sitemapBUrlInput = readUrlModeInput(body.sitemapBUrl);
  const requestedMax = Number(body.maxCompare);
  const maxCompare = Number.isFinite(requestedMax)
    ? Math.min(HARD_CAP, Math.max(1, Math.floor(requestedMax)))
    : HARD_CAP;

  try {
    let listA = [];
    if (body.sitemapAText) {
      const blk = extractLocs(body.sitemapAText, maxCompare);
      listA = blk.isIndex ? [] : blk.items;
    } else if (sitemapAUrlInput) {
      const xml = await loadSitemapFromUrl(sitemapAUrlInput, timeout, notes);
      const blk = extractLocs(xml, maxCompare);
      if (blk.isIndex) {
        listA = (await expandIndex(blk.items, timeout, notes, maxCompare)).slice(0, maxCompare);
      } else {
        listA = blk.items.slice(0, maxCompare);
      }
    }

    let listB = [];
    if (body.sitemapBText) {
      const blk = extractLocs(body.sitemapBText, maxCompare);
      listB = blk.isIndex ? [] : blk.items;
    } else if (sitemapBUrlInput) {
      const xml = await loadSitemapFromUrl(sitemapBUrlInput, timeout, notes);
      const blk = extractLocs(xml, maxCompare);
      if (blk.isIndex) {
        listB = (await expandIndex(blk.items, timeout, notes, maxCompare)).slice(0, maxCompare);
      } else {
        listB = blk.items.slice(0, maxCompare);
      }
    }

    const normalizedA = Array.from(new Set(listA.map(normUrl).filter(Boolean)));
    const normalizedB = Array.from(new Set(listB.map(normUrl).filter(Boolean)));
    const A = normalizedA.slice(0, maxCompare);
    const B = normalizedB.slice(0, maxCompare);

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
      if (pairs.length >= maxCompare) break;
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
      requestId,
      removedCount: removed.length,
      addedCount: added.length,
      suggestedMappings: deduped.length,
      truncated: normalizedA.length > maxCompare || normalizedB.length > maxCompare,
      verify,
      timeoutMs: timeout,
      sameRegDomainOnly: sameReg,
      maxCompare,
      fetchCaps: { global: GLOBAL_FETCH_CAP, perOrigin: PER_ORIGIN_FETCH_CAP },
      notes: Array.from(notes)
    };

    return jsonResponse(200, { meta, added, removed, pairs: deduped, unmapped, rules: [] }, requestId);
  } catch (error) {
    const note = error?.note || (error?.code === 'gz_not_supported' ? 'gz_not_supported' : null);
    const code = note || (typeof error?.code === 'string' ? error.code : 'server_error');
    const clientErrors = new Set(['bad_sitemap_url', 'gz_not_supported', 'invalid_sitemap_input']);
    const meta = {
      runTimestamp: new Date().toISOString(),
      requestId,
      note,
      error: String(error).slice(0, 200)
    };
    const status = clientErrors.has(code)
      ? 400
      : typeof error?.status === 'number'
        ? 400
        : 500;

    return jsonResponse(status, {
      error: code,
      details: { message: error?.message || null, note, meta },
      meta,
      added: [],
      removed: [],
      pairs: [],
      unmapped: [],
      rules: []
    }, requestId);
  }
}
