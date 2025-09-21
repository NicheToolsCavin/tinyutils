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
const NOTES = { invalid_url:'invalid_url', unsupported_scheme:'unsupported_scheme', private_host_blocked:'blocked_private_host', aborted:'timeout' };

async function availability(url, timeout){
  const r = await fetch('https://archive.org/wayback/available?url='+encodeURIComponent(url),
    { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error('network_error');
  return r.json();
}
function pickByWindow(closest, prefWindow){
  if (!closest?.url) return null;
  if (prefWindow==='any') return closest;
  const y = Number((closest.timestamp||'').slice(0,4)||'0');
  const now = new Date().getUTCFullYear();
  const min = prefWindow==='1y' ? now-1 : now-5;
  return (y>=min) ? closest : closest; // fallback to closest for simplicity
}

export default async function handler(req){
  const reqId = Math.random().toString(36).slice(2,8);
  if (req.method!=='POST') return new Response('Method Not Allowed',{status:405,headers:{'x-request-id':reqId}});
  try{
    const body = await req.json();
    const verifyHead = !!body.verifyHead;
    const trySPN = !!body.trySavePageNow;
    const prefWindow = body.prefWindow || 'any';
    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout)||10000));
    const maxConc = Math.max(1, Math.min(6, Number(body.concurrency)||6));

    const raw = (body.list || '').toString();
    let urls = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const safe = [];
    for (const u of urls){
      try{ safe.push(assertPublicHttp(u)); }catch(e){ safe.push({ url:u, err:NOTES[e.message]||'invalid_url' }); }
    }
    const input = Array.from(new Set(safe)).slice(0, HARD_CAP);

    const results = [];
    let spnQueued = 0;

    let i=0, inFlight=0;
    async function tick(){
      while (i<input.length && inFlight<maxConc){
        const idx = i++; const item = input[idx];
        inFlight++;
        (async ()=>{
          try{
            if (typeof item!=='string'){ results[idx]={ url:item.url, snapshotUrl:'', snapshotTs:'', verify:null, note:item.err }; return; }
            let note='';
            let data;
            try{ data = await availability(item, timeout); }
            catch{ data = await availability(item, timeout); note='retry_1'; }
            const closest = pickByWindow(data?.archived_snapshots?.closest, prefWindow);
            if (closest){
              let v=null;
              if (verifyHead){
                try{
                  const r = await fetch(closest.url, { method:'HEAD', redirect:'manual', headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) });
                  v = { status: r.status, ok: r.status>=200 && r.status<300 };
                }catch{ v = { status:0, ok:false }; note = note ? note+'|timeout' : 'timeout'; }
              }
              results[idx]={
                url:item,
                snapshotUrl:closest.url,
                snapshotTs:`${closest.timestamp.slice(0,4)}-${closest.timestamp.slice(4,6)}-${closest.timestamp.slice(6,8)}T${closest.timestamp.slice(8,10)}:${closest.timestamp.slice(10,12)}:${closest.timestamp.slice(12,14)}Z`,
                verify:v,
                note: note ? note+'|archived' : 'archived'
              };
            } else {
              if (trySPN && spnQueued < 10){
                spnQueued++;
                await fetch('https://web.archive.org/save/'+encodeURIComponent(item),
                  { headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) }).catch(()=>{});
                note = note ? note+'|spn_queued' : 'spn_queued';
              }
              results[idx]={ url:item, snapshotUrl:'', snapshotTs:'', verify:null, note: note ? note+'|no_snapshot' : 'no_snapshot' };
            }
          }catch(e){
            results[idx]={ url: (typeof item==='string'? item: item.url), snapshotUrl:'', snapshotTs:'', verify:null, note: 'network_error' };
          }finally{
            inFlight--; tick();
          }
        })();
      }
    }
    await new Promise(res=>{ tick(); const id=setInterval(()=>{ if(i>=input.length && inFlight===0){ clearInterval(id); res(); } }, 20); });

    const meta = {
      runTimestamp: new Date().toISOString(),
      totalQueued: input.length,
      totalChecked: results.length,
      archived: results.filter(r=>r.note?.includes('archived')).length,
      noSnapshot: results.filter(r=>r.note?.includes('no_snapshot')).length,
      spnQueued,
      timeoutMs: timeout,
      verifyHead, trySavePageNow: trySPN, prefWindow,
      truncated: safe.length > HARD_CAP
    };

    return new Response(JSON.stringify({ meta, results }), {
      status:200, headers:{ 'content-type':'application/json','x-request-id':reqId }
    });
  }catch(e){
    return new Response(JSON.stringify({ message:'Server error', error:(e?.message||'').slice(0,200) }), { status:500, headers:{'content-type':'application/json'} });
  }
}
