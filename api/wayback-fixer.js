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

export const config = { runtime: 'edge' };

const UA = 'TinyUtils-SitemapDelta/1.0 (+https://tinyutils.net)';
const HARD_CAP = 200;
const CHILD_SITEMAPS_LIMIT = 50;
const VERIFY_CONCURRENCY = 6;

function normUrl(u){
  try{ const x=new URL(u); x.hash=''; x.hostname=x.hostname.toLowerCase();
    if(x.port==='80'&&x.protocol==='http:')x.port='';
    if(x.port==='443'&&x.protocol==='https:')x.port='';
    if(!x.pathname)x.pathname='/';
    return x.toString();
  }catch{ return null; }
}

async function fetchMaybeGzip(url){ url = assertPublicHttp(url);
  const res = await fetch(url, { headers:{'user-agent':UA}, signal: AbortSignal.timeout(12000) });
  const ct = (res.headers.get('content-type')||'').toLowerCase();
  const looksGz = url.endsWith('.gz') || ct.includes('application/gzip') || ct.includes('application/x-gzip');
  if (looksGz && typeof DecompressionStream !== 'undefined'){
    const ds = new DecompressionStream('gzip');
    const txt = await new Response(res.body.pipeThrough(ds)).text();
    return txt;
  }
  return await res.text();
}

function extractLocs(xml){
  const locs = [];
  const reUrl = /<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi;
  let m;
  while ((m = reUrl.exec(xml))) {
    locs.push(m[1].trim());
    if (locs.length >= HARD_CAP) break;
  }
  if (locs.length) return { isIndex:false, items: locs };
  const reSm = /<sitemap>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
  const sm = [];
  while ((m = reSm.exec(xml))) {
    sm.push(m[1].trim());
    if (sm.length >= CHILD_SITEMAPS_LIMIT) break;
  }
  return { isIndex:true, items: sm };
}

async function loadSitemapAny({ url, text }){ if (url) { url = assertPublicHttp(url); }
  if (!url && !text) return [];
  try{
    const xml = text ? text : await fetchMaybeGzip(url);
    const block = extractLocs(xml);
    if (!block.items.length) return [];
    if (block.isIndex){
      let agg = [];
      for (const child0 of block.items.slice(0, CHILD_SITEMAPS_LIMIT)){
        let child;
        try{ child = assertPublicHttp(child0); }catch{ continue }

        try{
          const x = await fetchMaybeGzip(child);
          const urls = extractLocs(x);
          if (!urls.isIndex) agg = agg.concat(urls.items);
        }catch{}
        if (agg.length >= HARD_CAP) break;
      }
      return agg.slice(0,HARD_CAP);
    } else {
      return block.items.slice(0,HARD_CAP);
    }
  }catch(e){ return []; }
}

// --- similarity ---
function pathOf(u){ try{ return new URL(u).pathname.replace(/\/$/,'').toLowerCase(); }catch{return u} }
function lastSeg(p){ const s=p.split('/').filter(Boolean); return s[s.length-1]||''; }
function slugNorm(s){ return s.replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' '); }
function lev(a,b){
  const n=a.length, m=b.length; if(!n) return m; if(!m) return n;
  const dp=new Array(m+1); for(let j=0;j<=m;j++) dp[j]=j;
  for(let i=1;i<=n;i++){ let prev=dp[0]; dp[0]=i;
    for(let j=1;j<=m;j++){ const tmp=dp[j];
      dp[j]=Math.min(dp[j]+1, dp[j-1]+1, prev + (a[i-1]===b[j-1]?0:1)); prev=tmp; } }
  return dp[m];
}
function sim01(a,b){ if(a===b) return 1; const d=lev(a,b); const den=Math.max(a.length,b.length)||1; return 1 - (d/den); }
function guessMatchNote(aPath,bPath){
  const la=lastSeg(aPath), lb=lastSeg(bPath);
  if (la===lb) return {note:'slug_exact', conf:0.95};
  const sA=slugNorm(la), sB=slugNorm(lb);
  const sSim = sim01(sA,sB);
  if (sSim>=0.85) return {note:'slug_similar', conf:0.88};
  const whole = sim01(aPath,bPath);
  if (whole>=0.70) return {note:'path_similar', conf:0.75};
  return {note:'low_similarity', conf:0.40};
}
function sameRegDomain(a,b){
  try{
    const A=new URL(a).hostname.split('.'), B=new URL(b).hostname.split('.');
    return A.slice(-2).join('.') === B.slice(-2).join('.');
  }catch{return false}
}

function inferPrefixRules(pairs){
  const counts = new Map();
  for(const p of pairs){
    try{
      const A = new URL(p.from).pathname.split('/').filter(Boolean)[0]||'';
      const B = new URL(p.to).pathname.split('/').filter(Boolean)[0]||'';
      if (A && B && A!==B){
        const key = A+'|'+B;
        counts.set(key, (counts.get(key)||0)+1);
      }
    }catch{}
  }
  const rules = [];
  for (const [k,v] of counts){
    const [a,b]=k.split('|');
    if (v>=5) rules.push({ fromPrefix:'/'+a+'/', toPrefix:'/'+b+'/', support:v });
  }
  rules.sort((x,y)=>y.support-x.support);
  return rules.slice(0,5);
}

async function verifyTargets(pairs, timeout){
  function jitter(){ return 40 + Math.floor(Math.random()*40); }
  const out = new Array(pairs.length);
  let i=0; const W = Math.min(VERIFY_CONCURRENCY, pairs.length||1);
  async function worker(){
    while(true){
      const idx = i++; if (idx>=pairs.length) return;
      const p = pairs[idx];
      try{
        let toUrl;
        try{ toUrl = assertPublicHttp(p.to); }catch(e){ out[idx] = { ...p, verifyStatus: 0, verifyOk:false, note:(NOTES[e.message]||'network_error') }; continue; }
        let res = await fetch(toUrl, { method:'HEAD', redirect:'manual', headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) });
        if (res.status===429 || res.status>=500){ await new Promise(r=>setTimeout(r,jitter())); res = await fetch(toUrl, { method:'HEAD', redirect:'manual', headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) }); out[idx] = { ...p, verifyStatus: res.status||0, verifyOk: (res.status>=200&&res.status<300)||(res.status>=301&&res.status<=308), note: ((p.note?p.note+'|':'')+'retry_1') }; }
        else { out[idx] = { ...p, verifyStatus: res.status||0, verifyOk: (res.status>=200&&res.status<300)||(res.status>=301&&res.status<=308) }; }
      }catch(e){
        const nm = (e&&e.message)||'';
        out[idx] = { ...p, verifyStatus: 0, verifyOk: false, note: (NOTES[nm]||'network_error') };
      }
    }
  }
  await Promise.all(Array.from({length:W}, ()=>worker()));
  return out;
}

const reqId = Math.random().toString(36).slice(2,8);
if (req.method!=='POST') return new Response(JSON.stringify({ error:'POST only' }), { status:405, headers:{'content-type':'application/json'} });
  const body = await req.json();
  const timeout = Math.min(30000, Math.max(1000, Number(body.timeout)||10000));
  const maxCompare = Math.min(HARD_CAP, Math.max(100, Number(body.maxCompare)||2000));
  const verify = !!body.verifyTargets;
  const sameReg = body.sameRegDomainOnly !== false;

  const listA = await loadSitemapAny({ url: body.sitemapAUrl ? assertPublicHttp(body.sitemapAUrl) : null, text: body.sitemapAText });
  const listB = await loadSitemapAny({ url: body.sitemapBUrl ? assertPublicHttp(body.sitemapBUrl) : null, text: body.sitemapBText });

  const normA = Array.from(new Set(listA.map(normUrl).filter(Boolean))).slice(0,maxCompare);
  const normB = Array.from(new Set(listB.map(normUrl).filter(Boolean))).slice(0,maxCompare);

  const setA = new Set(normA);
  const setB = new Set(normB);

  const removed = normA.filter(u=>!setB.has(u));
  const added = normB.filter(u=>!setA.has(u));

  // Build mapping suggestions
  const byHost = new Map();
  for (const u of added){
    try{
      const host = new URL(u).host;
      if (!byHost.has(host)) byHost.set(host, []);
      byHost.get(host).push(u);
    }catch{}
  }
  const allAdded = added.slice();
  const pairs = [];
  for (const r of removed){
    let cand = [];
    try {
      const host = new URL(r).host;
      cand = (byHost.get(host)||[]);
      if (!cand.length) cand = allAdded.filter(u=>sameRegDomain(u,r));
    }catch{ cand = allAdded; }
    let best=null, bestScore=-1, bestNote='';
    const rp = pathOf(r);
    for (const t of (cand.length?cand:allAdded)){
      if (sameReg && !sameRegDomain(r, t)) continue;
      const g = guessMatchNote(rp, pathOf(t));
      if (g.conf > bestScore){ best={from:r,to:t,confidence:g.conf,note:g.note}, bestScore=g.conf; }
    }
    if (best && best.confidence >= 0.66){
      pairs.push({ ...best, method:'301' });
    }
  }

  // Dedup by "from"
  const map = new Map();
  for (const p of pairs){
    const prev = map.get(p.from);
    if (!prev || p.confidence > prev.confidence) map.set(p.from, p);
  }
  let dedup = Array.from(map.values());

  if (verify && dedup.length){
    dedup = await verifyTargets(dedup, timeout);
  }

  const mappedFrom = new Set(dedup.map(p=>p.from));
  const unmapped = removed.filter(u=>!mappedFrom.has(u));

  const rules = inferPrefixRules(dedup);

  const meta = {
    runTimestamp: new Date().toISOString(),
    removedCount: removed.length,
    addedCount: added.length,
    suggestedMappings: dedup.length,
    truncated: normA.length!==listA.length || normB.length!==listB.length || (normA.length>maxCompare || normB.length>maxCompare),
    verify, timeoutMs: timeout, maxCompare, sameRegDomainOnly: sameReg
  };

  return new Response(JSON.stringify({ meta, added, removed, pairs: dedup, unmapped, rules }), { headers:{'content-type':'application/json'} });
