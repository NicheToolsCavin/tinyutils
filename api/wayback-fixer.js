export const runtime = 'edge';

const UA = 'TinyUtils-WaybackFixer/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const HARD_CAP = 200;

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
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, note: 'unsupported_scheme' };
    if (isPrivateHost(url.hostname)) return { ok: false, note: 'private_host' };
    url.hash = '';
    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false, note: 'invalid_url' };
  }
}

async function availability(target, timeoutMs) {
  const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(target)}`, {
    headers: { 'user-agent': UA },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!r.ok) {
    throw new Error('network_error');
  }
  return r.json();
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
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const verifyHead = !!body.verifyHead;
    const trySPN = !!body.trySavePageNow;
    const pref = body.prefWindow || 'any';
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout) || 10000));
    const maxConc = Math.max(1, Math.min(6, Number(body.concurrency) || 6));

    const rawList = String(body.list || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean);

    const results = [];
    const validUrls = [];
    let invalidCount = 0;
    for (const raw of rawList) {
      const normalized = normalizeUrl(raw);
      if (!normalized.ok || !normalized.url) {
        results.push({ url: raw, snapshotUrl: '', snapshotTs: '', verify: null, note: normalized.note });
        invalidCount += 1;
        continue;
      }
      if (validUrls.length >= HARD_CAP) continue;
      if (validUrls.some(entry => entry.url === normalized.url)) continue;
      validUrls.push({ raw, url: normalized.url });
    }

    let spnQueued = 0;

    let index = 0;
    const workers = Array.from({ length: Math.min(maxConc, validUrls.length || 1) }, () => (async function worker() {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const current = index;
        index += 1;
        if (current >= validUrls.length) return;
        const item = validUrls[current];
        let noteParts = [];
        try {
          let data;
          try {
            data = await availability(item.url, timeout);
          } catch (err) {
            data = await availability(item.url, timeout);
            noteParts.push('retry_1');
          }
          const closest = pickWindow(data?.archived_snapshots?.closest, pref) || null;
          if (closest) {
            let verify = null;
            if (verifyHead) {
              try {
                const headRes = await fetch(closest.url, {
                  method: 'HEAD',
                  redirect: 'manual',
                  headers: { 'user-agent': UA },
                  signal: AbortSignal.timeout(timeout)
                });
                verify = { status: headRes.status, ok: headRes.ok };
              } catch {
                verify = { status: 0, ok: false };
                noteParts.push('timeout');
              }
            }
            noteParts.push('archived');
            results.push({
              url: item.url,
              snapshotUrl: closest.url,
              snapshotTs: toIso(closest.timestamp),
              verify,
              note: noteParts.join('|') || null
            });
          } else {
            if (trySPN && spnQueued < 10) {
              spnQueued += 1;
              fetch(`https://web.archive.org/save/${encodeURIComponent(item.url)}`, {
                headers: { 'user-agent': UA },
                signal: AbortSignal.timeout(timeout)
              }).catch(() => {});
              noteParts.push('spn_queued');
            }
            noteParts.push('no_snapshot');
            results.push({ url: item.url, snapshotUrl: '', snapshotTs: '', verify: null, note: noteParts.join('|') || null });
          }
        } catch (error) {
          if (!noteParts.length) noteParts.push('network_error');
          results.push({ url: item.url, snapshotUrl: '', snapshotTs: '', verify: null, note: noteParts.join('|') || null });
        }
      }
    })());

    await Promise.all(workers);

    const meta = {
      runTimestamp: new Date().toISOString(),
      totalQueued: validUrls.length + invalidCount,
      totalChecked: results.length,
      archived: results.filter(r => (r.note || '').includes('archived')).length,
      noSnapshot: results.filter(r => (r.note || '').includes('no_snapshot')).length,
      spnQueued,
      timeoutMs: timeout,
      verifyHead,
      trySavePageNow: trySPN,
      prefWindow: pref,
      truncated: validUrls.length >= HARD_CAP && rawList.length > validUrls.length
    };

    return new Response(JSON.stringify({ meta, results }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ meta: { error: String(error).slice(0, 200) }, results: [] }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
