export const config = { runtime: 'edge' };
const UA = 'TinyUtils-WaybackFixer/1.0 (+https://tinyutils.net; hello@tinyutils.net)';

function isPrivateHost(host){
  const h = (host||'').toLowerCase();
  if (['localhost','127.0.0.1','::1'].includes(h) || h.endsWith('.local')) return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  return false;
}
function assertPublicHttp(u){
  let url; try { url = new URL(u); } catch { throw new Error('invalid_url'); }
  if (!/^https?:$/.test(url.protocol)) throw new Error('unsupported_scheme');
  if (isPrivateHost(url.hostname)) throw new Error('blocked_private_host');
  if (u.length > 2048) throw new Error('invalid_url');
  url.hash = ''; return url.toString();
}
function jitter(){ return 40 + Math.floor(Math.random()*40); }

async function availability(url, timeout){
  const r = await fetch('https://archive.org/wayback/available?url='+encodeURIComponent(url), {
    headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout)
  });
  if (!r.ok) throw new Error('network_error');
  return r.json();
}
function pickByWindow(closest, prefWindow){
  if (!closest?.url) return null;
  if (prefWindow === 'any') return closest;
  const ts = closest.timestamp||'';
  if (ts.length < 4) return closest;
  const year = Number(ts.slice(0,4));
  const y = (new Date()).getUTCFullYear();
  const min = prefWindow === '1y' ? y-1 : y-5;
  return (year >= min) ? closest : closest; // fallback to closest
}
async function trySavePageNow(url, timeout){
  try{
    await fetch('https://web.archive.org/save/'+encodeURIComponent(url), {
      headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout)
    });
  }catch{}
}
function toIso(ts){ // YYYYMMDDhhmmss -> ISO
  if (!ts || ts.length < 14) return '';
  return `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}T${ts.slice(8,10)}:${ts.slice(10,12)}:${ts.slice(12,14)}Z`;
}

\1const reqId = Math.random().toString(36).slice(2,8);
if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try{
    const body = await req.json();
    const verifyHead = !!body.verifyHead;
    const trySPN = !!body.trySavePageNow;
    const prefWindow = body.prefWindow || 'any';
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout)||10000));
    const maxConc = Math.max(1, Math.min(6, Number(body.concurrency)||6));

    let lines = [];
    if (Array.isArray(body.urls)) lines = body.urls.map(s=>String(s||''));
    if (body.list) lines = String(body.list||'').split(/\r?\n/);
    const cleaned = Array.from(new Set(lines.map(s=>s.trim()).filter(Boolean)));

    const prepared = cleaned.map(u=>{
      try{ return assertPublicHttp(u); }catch(e){ return { url:u, err: e.message }; }
    });
    const queued = prepared.slice(0,200);
    const results = [];
    let spnQueued = 0;

    // simple concurrency pool
    const pending = new Set();
    async function runOne(item){
      if (typeof item !== 'string'){
        results.push({ url: item.url, snapshotUrl:'', snapshotTs:'', verify:null, note: item.err });
        return;
      }
      let note = '';
      try{
        let data;
        try {
          data = await availability(item, timeout);
        } catch(e) {
          await new Promise(r=>setTimeout(r, jitter()));
          data = await availability(item, timeout);
          note += (note? '|' : '') + 'retry_1';
        }
        const closest = pickByWindow(data?.archived_snapshots?.closest, prefWindow);
        if (closest?.url){
          let v = null;
          if (verifyHead){
            try{
              const r = await fetch(closest.url, { method:'HEAD', redirect:'manual', headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) });
              v = { status: r.status, ok: r.status>=200 && r.status<300 };
            }catch{
              v = { status:0, ok:false }; note += (note? '|' : '') + 'timeout';
            }
          }
          results.push({ url: item, snapshotUrl: closest.url, snapshotTs: toIso(closest.timestamp), verify: v, note: (note? note+'|' : '') + 'archived' });
        } else {
          if (trySPN && spnQueued < 10){
            spnQueued++;
            await trySavePageNow(item, timeout);
            note += (note? '|' : '') + 'spn_queued';
          }
          results.push({ url: item, snapshotUrl:'', snapshotTs:'', verify: null, note: (note? note+'|' : '') + 'no_snapshot' });
        }
      }catch(e){
        const m = (e?.message)||'network_error';
        results.push({ url: item, snapshotUrl:'', snapshotTs:'', verify:null, note: m });
      }
    }
    for (const it of queued){
      const task = runOne(it);
      pending.add(task);
      task.finally(()=>pending.delete(task));
      if (pending.size >= maxConc){
        await Promise.race(pending);
      }
    }
    await Promise.all(Array.from(pending));

    const meta = {
      runTimestamp: new Date().toISOString(),
      totalQueued: queued.length,
      totalChecked: results.length,
      archived: results.filter(r=>r.note?.includes('archived')).length,
      noSnapshot: results.filter(r=>r.note?.includes('no_snapshot')).length,
      spnQueued,
      timeoutMs: timeout,
      verifyHead, trySavePageNow: trySPN, prefWindow,
      truncated: cleaned.length > 200
    };
    return new Response(JSON.stringify({ meta, results }), { status:200, headers:{ 'content-type':'application/json', 'x-request-id': reqId } });
  }catch(e){
    return new Response(JSON.stringify({ message:'Server error', error: (e?.message||'').slice(0,200) }), { status:500, headers:{'content-type':'application/json'} });
  }
}