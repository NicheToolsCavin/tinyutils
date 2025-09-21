export const config = { runtime: 'edge' };

const UA = 'TinyUtils-WaybackFixer/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const RUN_CAP = 200;
const POOL = 6;

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

function tsToIso(ts) {
  // ts like YYYYMMDDhhmmss
  if (!ts || ts.length < 14) return '';
  return `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}T${ts.slice(8,10)}:${ts.slice(10,12)}:${ts.slice(12,14)}Z`;
}

function chooseWindow(closest, pref) {
  if (!closest?.url) return null;
  if (pref === 'any') return closest;
  const y = Number((closest.timestamp || '').slice(0, 4));
  const nowY = new Date().getUTCFullYear();
  const minY = pref === '1y' ? nowY - 1 : nowY - 5;
  return (y >= minY) ? closest : closest; // prefer if recent; else fallback to closest anyway
}

async function availability(u, timeout) {
  const r = await fetch('https://archive.org/wayback/available?url=' + encodeURIComponent(u),
    { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error('network_error');
  return r.json();
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const body = await req.json();
    const verifyHead = !!body.verifyHead;
    const trySPN = !!body.trySavePageNow;
    const prefWindow = body.prefWindow || 'any'; // any|5y|1y
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout) || 10000));
    const maxConc = Math.max(1, Math.min(POOL, Number(body.concurrency) || POOL));

    const raw = Array.isArray(body.urls) ? body.urls.join('\n') : String(body.list || '');
    const list = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, RUN_CAP);

    const urls = list.map(u => {
      try { return assertPublicHttp(u); }
      catch (e) { return { err: e.message || 'invalid_url', url: u }; }
    });

    const results = [];
    let spnQueued = 0;
    let i = 0;
    async function worker() {
      while (true) {
        const idx = i++; if (idx >= urls.length) return;
        const item = urls[idx];
        if (typeof item !== 'string') {
          results[idx] = { url: item.url, snapshotUrl: '', snapshotTs: '', verify: null, note: item.err };
          continue;
        }
        let note = '';
        try {
          let data;
          try {
            data = await availability(item, timeout);
          } catch {
            // retry once
            data = await availability(item, timeout);
            note = 'retry_1';
          }
          const chosen = chooseWindow(data?.archived_snapshots?.closest, prefWindow);
          if (chosen?.url) {
            let verify = null;
            if (verifyHead) {
              try {
                const r = await fetch(chosen.url, { method: 'HEAD', redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout) });
                verify = { status: r.status, ok: r.status >= 200 && r.status < 300 };
              } catch {
                verify = { status: 0, ok: false };
                note = note ? note + '|timeout' : 'timeout';
              }
            }
            results[idx] = {
              url: item,
              snapshotUrl: chosen.url,
              snapshotTs: tsToIso(chosen.timestamp),
              verify,
              note: (note ? note + '|' : '') + 'archived'
            };
          } else {
            if (trySPN && spnQueued < 10) {
              spnQueued++;
              // fire & forget
              fetch('https://web.archive.org/save/' + encodeURIComponent(item),
                { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout) }).catch(() => {});
              note = note ? note + '|spn_queued' : 'spn_queued';
            }
            results[idx] = { url: item, snapshotUrl: '', snapshotTs: '', verify: null, note: (note ? note + '|' : '') + 'no_snapshot' };
          }
        } catch (e) {
          results[idx] = { url: item, snapshotUrl: '', snapshotTs: '', verify: null, note: String(e.message || 'network_error') };
        }
      }
    }
    await Promise.all(Array.from({ length: maxConc }, () => worker()));

    const meta = {
      runTimestamp: new Date().toISOString(),
      totalQueued: urls.length,
      totalChecked: results.length,
      archived: results.filter(r => r.note?.includes('archived')).length,
      noSnapshot: results.filter(r => r.note?.includes('no_snapshot')).length,
      spnQueued,
      timeoutMs: timeout,
      verifyHead, trySavePageNow: trySPN, prefWindow,
      truncated: list.length > urls.length
    };

    return new Response(JSON.stringify({ meta, results }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ message: 'Server error', error: String(e).slice(0, 200) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
