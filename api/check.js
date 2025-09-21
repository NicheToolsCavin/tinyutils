// File: /api/check.js
export const config = { runtime: 'edge' };

const UA = 'TinyUtils-DeadLinkChecker/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const HARD_CAP = 200;
const MAX_GLOBAL = 10;
const MAX_PER_ORIGIN = 2;
const MAX_REDIRECTS = 5;
const TLD_NO_FALLBACK = [/\.gov$/i, /\.mil$/i, /\.bank$/i, /\.edu$/i];

function badScheme(u) { return /^(javascript:|data:|mailto:)/i.test(u || ''); }
function originOf(u) { try { return new URL(u).origin; } catch { return ''; } }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function tldGuard(host){ const h = (host||'').toLowerCase(); return TLD_NO_FALLBACK.some(rx=>rx.test(h)); }

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

function norm(u){
  try{
    const x=new URL(u);
    x.hash='';
    x.hostname=x.hostname.toLowerCase();
    if(x.port==='80'&&x.protocol==='http:')x.port='';
    if(x.port==='443'&&x.protocol==='https:')x.port='';
    if(!x.pathname)x.pathname='/';
    return x.toString();
  }catch{return u}
}

async function head(u,t){ return fetch(u,{method:'HEAD',redirect:'manual',headers:{'user-agent':UA},signal:AbortSignal.timeout(t)}) }
async function get(u,t){ return fetch(u,{method:'GET',redirect:'manual',headers:{'user-agent':UA},signal:AbortSignal.timeout(t)}) }

async function follow(u,timeout,headFirst){
  let url=u,chain=0,usedGet=!headFirst;
  while(chain<=MAX_REDIRECTS){
    let r;
    if(!usedGet){
      try{ r=await head(url,timeout) }catch{ usedGet=true; continue }
      if(r.status>=200&&r.status<300) r=await get(url,timeout)
    } else {
      r=await get(url,timeout);
    }
    if(r.status>=300&&r.status<400){
      const loc=r.headers.get('location');
      if(!loc) return{status:r.status,ok:false,finalUrl:url,note:'bad_redirect',chain,headers:r.headers};
      try{ url=new URL(loc,url).href }catch{ return{status:r.status,ok:false,finalUrl:url,note:'bad_redirect',chain,headers:r.headers} }
      chain++; continue;
    }
    return {status:r.status,ok:r.ok,finalUrl:url,chain,headers:r.headers}
  }
  return {status:null,ok:false,finalUrl:url,note:'redirect_loop',chain,headers:null}
}

async function fallback(u,h,timeout){
  try{
    const U=new URL(u);
    const host=U.hostname.toLowerCase();
    if(tldGuard(host)) return {skipped:true,reason:'tld_guard'};
    const hsts=h && /max-age/i.test(h.get('strict-transport-security')||'');
    if(hsts) return {skipped:true,reason:'hsts'};
    if(U.protocol==='https:'){
      U.protocol='http:';
      const r=await follow(U.href,timeout,false);
      return {skipped:false,result:r}
    }
  }catch{}
  return {skipped:true,reason:'proto'}
}

async function handlerCore(req){
  const reqId = Math.random().toString(36).slice(2,8);
  if(req.method!=='POST') return new Response('Method Not Allowed',{status:405, headers:{'x-request-id':reqId}});
  const b=await req.json();
  const timeout=Math.min(30000,Math.max(1000,Number(b.timeout)||10000));
  const headFirst=b.headFirst!==false, retry=!!b.retryHttp;

  let urls=[];
  try{
    if(b.mode==='list'){
      const arr=(Array.isArray(b.urls)?b.urls:String(b.list||'').split(/\r?\n/)).map(s=>s.trim()).filter(Boolean);
      urls=arr.map(u=>{ try{return assertPublicHttp(u)}catch(e){return {url:u,err:NOTES[e.message]||'invalid_url'}} });
    } else if(b.mode==='crawl'){
      const page = assertPublicHttp(b.pageUrl);
      const r=await fetch(page,{headers:{'user-agent':UA},signal:AbortSignal.timeout(10000)});
      const h=await r.text(); const arr=[];
      h.replace(/<a\b[^>]*href=["']([^"']+)["']/gi,(_,v)=>{ try{arr.push(new URL(v,page).href)}catch{} });
      if(b.includeAssets){
        h.replace(/<img\b[^>]*src=["']([^"']+)["']/gi,(_,v)=>{ try{arr.push(new URL(v,page).href)}catch{} });
        h.replace(/<script\b[^>]*src=["']([^"']+)["']/gi,(_,v)=>{ try{arr.push(new URL(v,page).href)}catch{} });
        h.replace(/<link\b[^>]*href=["']([^"']+)["']/gi,(_,v)=>{ try{arr.push(new URL(v,page).href)}catch{} });
      }
      urls=[...new Set(arr)].map(assertPublicHttp);
      if((b.scope||'internal')==='internal'){
        const o = originOf(page);
        urls=urls.filter(u=>originOf(u)===o);
      }
    } else if(b.mode==='sitemap'){
      const sm = assertPublicHttp(b.sitemapUrl);
      const r=await fetch(sm,{headers:{'user-agent':UA},signal:AbortSignal.timeout(10000)});
      const x=await r.text();
      urls=[...x.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/gi)].map(m=>m[1].trim()).map(assertPublicHttp);
    } else {
      return new Response('bad mode',{status:400,headers:{'x-request-id':reqId}});
    }
  }catch(e){
    return new Response(JSON.stringify({error:String(e&&e.message||e)}),{status:400,headers:{'content-type':'application/json','x-request-id':reqId}});
  }

  // normalize+cap + de-dup
  const seen=new Set(); const work=[];
  for(const u of urls){
    if(typeof u==='object'){ work.push(u); continue; }
    if(badScheme(u)){ work.push({url:u,err:'unsupported_scheme'}); continue; }
    const n=norm(u);
    if(!seen.has(n)){ seen.add(n); work.push(n) }
  }
  const totalQueued=work.length;
  const slice=work.slice(0,HARD_CAP);

  // polite scheduler
  const originCounts = new Map();
  let inFlight = 0, i = 0;
  const results = new Array(slice.length);

  async function runOne(idx, u){
    if(typeof u==='object'){ results[idx]={url:u.url,status:null,ok:false,finalUrl:null,note:u.err,archive:null,chain:0}; return; }
    let r=await follow(u,timeout,headFirst);
    if(r.status && (r.status===429 || r.status>=500)){
      await sleep(40+Math.floor(Math.random()*40));
      r=await follow(u,timeout,false);
      r.note=(r.note? r.note+'|' : '')+'retry_1';
    }
    if(!r.ok && retry){
      const alt=await fallback(u,r.headers,timeout);
      if(alt.skipped){
        r.note=(r.note? r.note+'|' : '')+alt.reason
      } else if(alt.result){
        r={...alt.result,note:(r.note? r.note+'|' : '')+'http_fallback_used'}
      }
    }
    if(r.status===410) r.note=(r.note? r.note+'|' : '')+'gone';
    results[idx]={url:u,status:r.status,ok:r.ok,finalUrl:r.finalUrl,archive:null,note:r.note||null,chain:r.chain||0};
  }

  async function pump(){
    while(i<slice.length && inFlight<MAX_GLOBAL){
      const idx=i++; const u=slice[idx];
      if(typeof u==='string'){
        const org = originOf(u); const n = originCounts.get(org)||0;
        if(n>=MAX_PER_ORIGIN){ i--; await sleep(50); break; }
        originCounts.set(org,n+1);
      }
      inFlight++;
      (async ()=>{
        try{ await runOne(idx,u) } finally {
          if(typeof u==='string'){
            const org = originOf(u); originCounts.set(org,(originCounts.get(org)||1)-1);
          }
          inFlight--; pump();
        }
      })();
    }
  }
  await new Promise(res=>{ pump(); const tid=setInterval(()=>{ if(i>=slice.length && inFlight===0){ clearInterval(tid); res(); } }, 15); });

  const meta={runTimestamp:new Date().toISOString(),mode:b.mode||'list',source:b.pageUrl||b.sitemapUrl||'list',concurrency: b.concurrency||10,timeoutMs:timeout,robots: b.respectRobots!==false,scope:b.scope||'internal',assets:!!b.includeAssets,httpFallback:!!b.retryHttp,wayback:false,totalQueued,totalChecked:slice.length,truncated: totalQueued>slice.length};
  return new Response(JSON.stringify({ meta, results }),{
    headers:{'content-type':'application/json','x-request-id':reqId}
  });
}

export default async function handler(req){ return handlerCore(req); }
