export const config = { runtime: 'edge' };

function rid() {
  return Math.random().toString(16).slice(2, 10);
}

function json(status, body, requestId) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  if (requestId) headers.set('x-request-id', requestId);
  return new Response(JSON.stringify(body), { status, headers });
}

function jerr(status, message, note, requestId) {
  return json(status, {
    meta: {
      error: message || null,
      note: note || null,
      requestId
    },
    results: []
  }, requestId);
}

const UA = 'TinyUtils-WaybackFixer/1.0 (+https://tinyutils-eight.vercel.app; hello@tinyutils.net)';
const HARD_CAP = 200;
const GLOBAL_FETCH_CAP = 10;
const PER_ORIGIN_FETCH_CAP = 2;
const SPN_CAP = 10;
const RETRY_JITTER_MIN_MS = 50;
const RETRY_JITTER_MAX_MS = 200;
const SAME_ORIGIN_JITTER_MIN_MS = 30;
const SAME_ORIGIN_JITTER_MAX_MS = 120;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

async function fetchWithRetry(url, init = {}, timeoutMs = 10000) {
  const buildInit = () => {
    const headers = new Headers(init.headers || {});
    if (!headers.has('user-agent')) headers.set('user-agent', UA);
    return { ...init, headers, signal: AbortSignal.timeout(timeoutMs) };
  };

  let retried = false;
  try {
    let res = await fetch(url, buildInit());
    if (res.status === 429 || res.status >= 500) {
      retried = true;
      await delay(randomBetween(RETRY_JITTER_MIN_MS, RETRY_JITTER_MAX_MS));
      res = await fetch(url, buildInit());
    }
    return { res, retried };
  } catch (error) {
    if (retried) {
      error.__retried = true;
      throw error;
    }
    retried = true;
    await delay(randomBetween(RETRY_JITTER_MIN_MS, RETRY_JITTER_MAX_MS));
    try {
      const res = await fetch(url, buildInit());
      return { res, retried };
    } catch (err) {
      err.__retried = true;
      throw err;
    }
  }
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

function normalizeUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) return { ok: false, note: 'invalid_url' };
  if (value.startsWith('//')) value = 'https:' + value;
  if (!/^[a-zA-Z][a-zA-Z0-9+\.\-]*:/.test(value)) value = 'https://' + value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, note: 'unsupported_scheme' };
    if (isPrivateHost(url.hostname)) return { ok: false, note: 'private_host' };
    url.hash = '';
    if (!url.pathname) url.pathname = '/';
    if (url.port === '80' && url.protocol === 'http:') url.port = '';
    if (url.port === '443' && url.protocol === 'https:') url.port = '';
    url.hostname = url.hostname.toLowerCase();
    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false, note: 'invalid_url' };
  }
}

async function availability(target, timeoutMs) {
  try {
    const { res, retried } = await fetchWithRetry(
      `https://archive.org/wayback/available?url=${encodeURIComponent(target)}`,
      { headers: { 'user-agent': UA } },
      timeoutMs
    );
    if (!res.ok) {
      const error = new Error('network_error');
      error.__retried = retried;
      throw error;
    }
    return { data: await res.json(), retried };
  } catch (error) {
    if (error && typeof error.__retried === 'undefined') {
      error.__retried = false;
    }
    throw error;
  }
}

function pickWindow(closest, pref) {
  if (!closest || !closest.url) return null;
  if (pref === 'any') return closest;
  const ts = String(closest.timestamp || '');
  if (ts.length < 14) return closest;
  const year = Number.parseInt(ts.slice(0, 4), 10);
  if (Number.isNaN(year)) return closest;
  const nowYear = new Date().getUTCFullYear();
  const min = pref === '1y' ? nowYear - 1 : nowYear - 5;
  return year >= min ? closest : null;
}

function toIso(timestamp) {
  if (!timestamp || timestamp.length < 14) return '';
  const y = timestamp.slice(0, 4);
  const m = timestamp.slice(4, 6);
  const d = timestamp.slice(6, 8);
  const hh = timestamp.slice(8, 10);
  const mm = timestamp.slice(10, 12);
  const ss = timestamp.slice(12, 14);
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
}

export default async function handler(req) {
  const requestId = rid();

  if (req.method !== 'POST') {
    return json(405, { ok: false, message: 'Only POST is supported' }, requestId);
  }

  try {
    const body = await req.json();
    const verifyHead = !!body.verifyHead;
    const trySPN = !!body.trySavePageNow;
    const pref = body.prefWindow || 'any';
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout) || 10000));
    const maxConc = Math.max(1, Math.min(6, Number(body.concurrency) || 6));

    const sources = new Set();
    const rawCandidates = [];

    if (Array.isArray(body.urls)) {
      const list = body.urls
        .map(value => String(value || '').trim())
        .filter(Boolean);
      if (list.length) {
        sources.add('urls');
        rawCandidates.push(...list);
      }
    }

    if (typeof body.list === 'string') {
      const list = body.list
        .split(/\r?\n/)
        .map(value => value.trim())
        .filter(Boolean);
      if (list.length) {
        sources.add('list');
        rawCandidates.push(...list);
      }
    }

    const rawInputCount = rawCandidates.length;
    const results = [];
    const validUrls = [];
    const seenUrls = new Set();
    let invalidCount = 0;
    let duplicateCount = 0;
    let truncatedInput = false;

    for (const raw of rawCandidates) {
      const normalized = normalizeUrl(raw);
      if (!normalized.ok || !normalized.url) {
        results.push({ url: raw, snapshotUrl: '', snapshotTs: '', verify: null, note: normalized.note });
        invalidCount += 1;
        continue;
      }
      if (seenUrls.has(normalized.url)) {
        duplicateCount += 1;
        continue;
      }
      if (validUrls.length >= HARD_CAP) {
        truncatedInput = true;
        continue;
      }
      seenUrls.add(normalized.url);
      validUrls.push({ raw, url: normalized.url });
    }

    let spnQueued = 0;
    const globalCap = Math.min(maxConc, GLOBAL_FETCH_CAP);
    const workerCount = validUrls.length ? Math.min(globalCap, validUrls.length) : 0;
    const perOriginInFlight = new Map();
    let globalInFlight = 0;
    let retryCount = 0;

    let index = 0;
    const workers = workerCount ? Array.from({ length: workerCount }, () => (async function worker() {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const current = index;
        index += 1;
        if (current >= validUrls.length) return;
        const item = validUrls[current];
        let noteParts = [];
        let retriedThisItem = false;
        let originKey;
        let acquired = false;
        try {
          originKey = new URL(item.url).origin;
          while (
            globalInFlight >= globalCap ||
            (perOriginInFlight.get(originKey) || 0) >= PER_ORIGIN_FETCH_CAP
          ) {
            await delay(25);
          }
          globalInFlight += 1;
          acquired = true;
          const originCount = (perOriginInFlight.get(originKey) || 0) + 1;
          perOriginInFlight.set(originKey, originCount);
          if (originCount > 1) {
            await delay(randomBetween(SAME_ORIGIN_JITTER_MIN_MS, SAME_ORIGIN_JITTER_MAX_MS));
          }

          let availabilityData;
          try {
            const { data, retried } = await availability(item.url, timeout);
            availabilityData = data;
            if (retried) retriedThisItem = true;
          } catch (err) {
            if (err?.__retried) {
              retriedThisItem = true;
            }
            throw err;
          }
          const closest = pickWindow(availabilityData?.archived_snapshots?.closest, pref) || null;
          let resultEntry;
          if (closest) {
            let verify = null;
            if (verifyHead) {
              try {
                const { res: headRes, retried } = await fetchWithRetry(
                  closest.url,
                  { method: 'HEAD', redirect: 'manual', headers: { 'user-agent': UA } },
                  timeout
                );
                verify = { status: headRes.status, ok: headRes.ok };
                if (retried) retriedThisItem = true;
              } catch {
                verify = { status: 0, ok: false };
                noteParts.push('timeout');
                retriedThisItem = true;
              }
            }
            noteParts.push('archived');
            resultEntry = {
              url: item.url,
              snapshotUrl: closest.url,
              snapshotTs: toIso(closest.timestamp),
              verify,
              note: null
            };
          } else {
            if (trySPN && spnQueued < SPN_CAP) {
              spnQueued += 1;
              fetchWithRetry(`https://web.archive.org/save/${encodeURIComponent(item.url)}`, {}, timeout).catch(() => {});
              noteParts.push('spn_queued');
            }
            noteParts.push('no_snapshot');
            resultEntry = { url: item.url, snapshotUrl: '', snapshotTs: '', verify: null, note: null };
          }
          if (retriedThisItem && !noteParts.includes('retry_1')) {
            noteParts.push('retry_1');
            retryCount += 1;
          }
          resultEntry.note = noteParts.length ? noteParts.join('|') : null;
          results.push(resultEntry);
        } catch (error) {
          if (error?.__retried && !noteParts.includes('retry_1')) {
            noteParts.push('retry_1');
            retryCount += 1;
          }
          if (!noteParts.length) noteParts.push('network_error');
          results.push({ url: item.url, snapshotUrl: '', snapshotTs: '', verify: null, note: noteParts.join('|') || null });
        } finally {
          if (acquired) {
            globalInFlight = Math.max(0, globalInFlight - 1);
            const remaining = (perOriginInFlight.get(originKey) || 0) - 1;
            if (remaining > 0) {
              perOriginInFlight.set(originKey, remaining);
            } else {
              perOriginInFlight.delete(originKey);
            }
          }
        }
      }
    })()) : [];

    await Promise.all(workers);

    const sourcesList = Array.from(sources);
    const truncated = truncatedInput || (validUrls.length >= HARD_CAP && rawInputCount > validUrls.length);

    const meta = {
      runTimestamp: new Date().toISOString(),
      totalQueued: rawInputCount,
      totalChecked: results.length,
      archived: results.filter(r => (r.note || '').includes('archived')).length,
      noSnapshot: results.filter(r => (r.note || '').includes('no_snapshot')).length,
      spnQueued,
      timeoutMs: timeout,
      verifyHead,
      trySavePageNow: trySPN,
      prefWindow: pref,
      truncated,
      input: {
        sources: sourcesList,
        raw: rawInputCount,
        accepted: validUrls.length,
        invalid: invalidCount,
        duplicates: duplicateCount
      },
      concurrency: {
        requested: maxConc,
        effective: workerCount,
        perOriginCap: PER_ORIGIN_FETCH_CAP,
        globalCap
      },
      network: {
        timeoutMs: timeout,
        retries: retryCount
      },
      spnLimit: SPN_CAP
    };

    meta.requestId = requestId;
    return json(200, { meta, results }, requestId);
  } catch (error) {
    return jerr(500, String(error).slice(0, 200), error?.note || null, requestId);
  }
}
