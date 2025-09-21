// File: /api/wayback-fixer.js
export const config = { runtime: 'edge' };

const UA = 'TinyUtils-WaybackFixer/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const HARD_CAP = 200;

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
  url.hash=''; return url.toString();
}
function norm(u){ try{ const x=new URL(u); x.hash=''; x.hostname=x.hostname.toLowerCase(); return x.toString(); }catch{ return null; } }

async function availability(url, timeout){
  const r = await fetch('https://archive.org/wayback/available?url='+encodeURIComponent(url),
    { headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error('network_error');
  return r.json();
}
function tsToISO(ts){ // YYYYMMDDhhmmss -> ISO
  if (!ts || ts.length < 14) return '';
  return `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}T${ts.slice(8,10)}:${ts.slice(10,12)}:${ts.slice(12,14)}Z`;
}
function pickByWindow(closest, pref){
  if (!closest?.url) return null;
  if (pref === 'any') return closest;
  const year = Number((closest.timestamp||'').slice(0,4)||0);
  const yNow = new Date().getUTCFullYear();
  const min = (pref === '1y') ? yNow - 1 : yNow - 5;
  return (year >= min) ? closest : closest; // fallback to closest in this simple strategy
}

export default async function handler(req){
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message:'Method Not Allowed' }), { status:405, headers:{'content-type':'application/json'} });
  }
  try{
    const body = await req.json();
    const verifyHead = !!body.verifyHead;
    const trySPN = !!body.trySavePageNow;
    const prefWindow = body.prefWindow || 'any';
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout)||10000));
    const maxConc = Math.max(1, Math.min(6, Number(body.concurrency)||6));

    const raw = (Array.isArray(body.urls) ? body.urls.join('\n') : (body.list||'')).toString();
    const uniq = new Set();
    const items = [];
    for (const line of raw.split(/\r?\n/)) {
      const s = line.trim(); if (!s) continue;
      try{
        const guarded = assertPublicHttp(s);
        const n = norm(guarded); if (!n) continue;
        if (!uniq.has(n)) { uniq.add(n); items.push(n); }
      }catch(e){
        items.push({ url: s, err: e.message });
      }
    }
    const work = items.slice(0, HARD_CAP);

    const results = [];
    let inFlight = 0, i = 0, spnQueued = 0;
    async function worker(){
      while (true) {
        let currIdx;
        if (i >= work.length) return;
        currIdx = i++; const entry = work[currIdx];
        if (typeof entry !== 'string') {
          results[currIdx] = { url: entry.url, snapshotUrl:'', snapshotTs:'', verify:null,
            note: entry.err === 'unsupported_scheme' ? 'unsupported_scheme' :
                  entry.err === 'private_host_blocked' ? 'blocked_private_host' : 'invalid_url' };
          continue;
        }
        const url = entry;
        let note = '';
        try{
          let data;
          try { data = await availability(url, timeout); }
          catch { data = await availability(url, timeout); note += (note? '|':'') + 'retry_1'; }
          const closest = pickByWindow(data?.archived_snapshots?.closest, prefWindow);
          if (closest?.url) {
            let verify = null;
            if (verifyHead) {
              try{
                const r = await fetch(closest.url, { method:'HEAD', redirect:'manual', headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) });
                verify = { status: r.status||0, ok: r.status>=200 && r.status<300 };
              }catch{ verify = { status:0, ok:false }; note += (note?'|':'') + 'timeout'; }
            }
            results[currIdx] = { url, snapshotUrl: closest.url, snapshotTs: tsToISO(closest.timestamp), verify, note: (note? note+'|' : '') + 'archived' };
          } else {
            if (trySPN && spnQueued < 10){
              spnQueued++;
              try{ await fetch('https://web.archive.org/save/'+encodeURIComponent(url), { headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) }); }catch{}
              note += (note? '|':'') + 'spn_queued';
            }
            results[currIdx] = { url, snapshotUrl:'', snapshotTs:'', verify:null, note: (note? note+'|' : '') + 'no_snapshot' };
          }
        } catch(e){
          results[currIdx] = { url, snapshotUrl:'', snapshotTs:'', verify:null, note: (e?.message||'network_error') };
        }
      }
    }
    const workers = Array.from({length: maxConc}, ()=>worker());
    await Promise.all(workers);

    const meta = {
      runTimestamp: new Date().toISOString(),
      totalQueued: work.length,
      totalChecked: results.length,
      archived: results.filter(r=>r.note?.includes('archived')).length,
      noSnapshot: results.filter(r=>r.note?.includes('no_snapshot')).length,
      spnQueued,
      timeoutMs: timeout,
      verifyHead, trySavePageNow: trySPN, prefWindow,
      truncated: items.length > work.length
    };

    return new Response(JSON.stringify({ meta, results }), { status:200, headers:{'content-type':'application/json'} });
  }catch(e){
    return new Response(JSON.stringify({ message:'Server error', error: String(e.message||e).slice(0,200) }), { status:500, headers:{'content-type':'application/json'} });
  }
}
