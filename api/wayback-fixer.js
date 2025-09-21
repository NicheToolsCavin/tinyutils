export const config = { runtime: 'edge' };

const UA = 'TinyUtils-WaybackFixer/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const HARD_CAP = 200;

function norm(u){
  try { const x=new URL(u); x.hash=''; return x.toString(); } catch { return null; }
}

async function availability(u, timeoutMs){
  const r = await fetch('https://archive.org/wayback/available?url='+encodeURIComponent(u), {
    headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeoutMs)
  });
  if (!r.ok) throw new Error('network_error');
  return r.json();
}

function pickWindow(closest, pref){
  if (!closest?.url) return null;
  if (pref === 'any') return closest;
  const y = Number(String(closest.timestamp).slice(0,4));
  const nowY = new Date().getUTCFullYear();
  const min = pref === '1y' ? nowY - 1 : nowY - 5;
  return (y >= min) ? closest : closest; // simple fallback
}

export default async function handler(req){
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error:'POST only' }), { status:405, headers:{'content-type':'application/json'} });
  }
  const body = await req.json();
  const verifyHead = !!body.verifyHead;
  const trySPN = !!body.trySavePageNow;
  const pref = body.prefWindow || 'any';
  const timeout = Math.min(30000, Math.max(1000, Number(body.timeout)||10000));
  const maxConc = Math.max(1, Math.min(6, Number(body.concurrency)||6));

  const raw = (body.list || '').toString();
  let urls = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  urls = Array.from(new Set(urls.map(norm).filter(Boolean))).slice(0, HARD_CAP);

  const results = [];
  let spnQueued = 0;

  // Simple pool
  let i=0, inFlight=0;
  async function next(){
    if (i >= urls.length) return;
    while (inFlight < maxConc && i < urls.length) {
      const u = urls[i++]; inFlight++;
      (async ()=>{
        let note = '';
        try{
          let data;
          try { data = await availability(u, timeout); }
          catch { data = await availability(u, timeout); note = 'retry_1'; }
          const closest = pickWindow(data?.archived_snapshots?.closest, pref);
          if (closest) {
            let verify = null;
            if (verifyHead) {
              try {
                const v = await fetch(closest.url, { method:'HEAD', redirect:'manual', headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) });
                verify = { status: v.status, ok: v.status>=200 && v.status<300 };
              } catch { verify = { status:0, ok:false }; note = note ? note+'|timeout' : 'timeout'; }
            }
            results.push({
              url: u,
              snapshotUrl: closest.url,
              snapshotTs: `${closest.timestamp.slice(0,4)}-${closest.timestamp.slice(4,6)}-${closest.timestamp.slice(6,8)}T${closest.timestamp.slice(8,10)}:${closest.timestamp.slice(10,12)}:${closest.timestamp.slice(12,14)}Z`,
              verify,
              note: note ? note+'|archived' : 'archived'
            });
          } else {
            if (trySPN && spnQueued < 10) {
              spnQueued++;
              fetch('https://web.archive.org/save/'+encodeURIComponent(u), { headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) }).catch(()=>{});
              note = note ? note+'|spn_queued' : 'spn_queued';
            }
            results.push({ url:u, snapshotUrl:'', snapshotTs:'', verify:null, note: note ? note+'|no_snapshot' : 'no_snapshot' });
          }
        } catch {
          results.push({ url:u, snapshotUrl:'', snapshotTs:'', verify:null, note: note ? note+'|network_error' : 'network_error' });
        } finally {
          inFlight--; next();
        }
      })();
    }
  }
  await next(); while (inFlight) await new Promise(r=>setTimeout(r,20));

  const meta = {
    runTimestamp: new Date().toISOString(),
    totalQueued: urls.length,
    totalChecked: results.length,
    archived: results.filter(r=>r.note.includes('archived')).length,
    noSnapshot: results.filter(r=>r.note.includes('no_snapshot')).length,
    spnQueued,
    timeoutMs: timeout,
    verifyHead, trySavePageNow: trySPN, prefWindow: pref,
    truncated: false
  };

  return new Response(JSON.stringify({ meta, results }), { headers:{'content-type':'application/json'} });
}
