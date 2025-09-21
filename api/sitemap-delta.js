export const config = { runtime: 'edge' };

const UA = 'TinyUtils-SitemapDelta/1.0 (+https://tinyutils.net)';
const HARD_CAP = 200;
const CHILD_SITEMAPS_LIMIT = 50;
const VERIFY_CONCURRENCY = 6;

function normUrl(u){
  try{
    const x = new URL(u);
    x.hash = '';
    x.hostname = x.hostname.toLowerCase();
    if (x.port === '80' && x.protocol === 'http:') x.port = '';
    if (x.port === '443' && x.protocol === 'https:') x.port = '';
    if (!x.pathname) x.pathname = '/';
    return x.toString();
  } catch { return null; }
}

async function fetchMaybeGzip(url){
  const res = await fetch(url, { headers:{'user-agent':UA}, signal: AbortSignal.timeout(12000) });
  const ct = (res.headers.get('content-type')||'').toLowerCase();
  const looksGz = url.endsWith('.gz') || ct.includes('application/gzip') || ct.includes('application/x-gzip');
  if (looksGz && typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    return await new Response(res.body.pipeThrough(ds)).text();
  }
  return await res.text();
}

function extractLocs(xml){
  const locs = [];
  const urlRe = /<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi;
  let m; while ((m = urlRe.exec(xml))) { locs.push(m[1].trim()); if (locs.length >= HARD_CAP) break; }
  if (locs.length) return { isIndex:false, items: locs };
  const sm = [];
  const idxRe = /<sitemap>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
  while ((m = idxRe.exec(xml))) { sm.push(m[1].trim()); if (sm.length >= CHILD_SITEMAPS_LIMIT) break; }
  return { isIndex:true, items: sm };
}

function pathOf(u){ try{ return new URL(u).pathname.replace(/\/$/,'').toLowerCase(); }catch{ return u; } }
function lastSeg(p){ const s = p.split('/').filter(Boolean); return s[s.length-1] || ''; }
function slugNorm(s){ return s.replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' '); }
function lev(a,b){ const n=a.length,m=b.length; if(!n) return m; if(!m) return n; const d=new Array(m+1).fill(0).map((_,j)=>j); for(let i=1;i<=n;i++){ let prev=d[0]; d[0]=i; for(let j=1;j<=m;j++){ const tmp=d[j]; d[j]=Math.min(d[j]+1,d[j-1]+1,prev+(a[i-1]===b[j-1]?0:1)); prev=tmp; } } return d[m]; }
function sim01(a,b){ if(a===b) return 1; const den=Math.max(a.length,b.length)||1; return 1 - (lev(a,b)/den); }
function guessMatch(aPath,bPath){
  const la=lastSeg(aPath), lb=lastSeg(bPath);
  if (la===lb) return {note:'slug_exact', conf:0.95};
  const sSim = sim01(slugNorm(la), slugNorm(lb));
  if (sSim>=0.85) return {note:'slug_similar', conf:0.88};
  const whole = sim01(aPath,bPath);
  if (whole>=0.70) return {note:'path_similar', conf:0.75};
  return {note:'low_similarity', conf:0.40};
}
function sameRegDomain(a,b){
  try{
    const A=new URL(a).hostname.split('.'), B=new URL(b).hostname.split('.');
    return A.slice(-2).join('.') === B.slice(-2).join('.');
  }catch{return false;}
}

async function verifyTargets(pairs, timeout){
  const out = new Array(pairs.length);
  let i=0; const W = Math.min(VERIFY_CONCURRENCY, pairs.length||1);
  async function worker(){
    while(true){
      const idx = i++; if (idx>=pairs.length) return;
      const p = pairs[idx];
      try{
        const r = await fetch(p.to, { method:'HEAD', redirect:'manual', headers:{'user-agent':UA}, signal: AbortSignal.timeout(timeout) });
        out[idx] = { ...p, verifyStatus: r.status, verifyOk: (r.status>=200&&r.status<300)||(r.status>=301&&r.status<=308) };
      }catch{ out[idx] = { ...p, verifyStatus:0, verifyOk:false, note:(p.note?p.note+'|':'')+'timeout' }; }
    }
  }
  await Promise.all(Array.from({length:W}, ()=>worker()));
  return out;
}

export default async function handler(req){
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error:'POST only' }), { status:405, headers:{'content-type':'application/json'} });
  }
  const body = await req.json();
  const timeout = Math.min(30000, Math.max(1000, Number(body.timeout)||10000));
  const verify = !!body.verifyTargets;
  const sameReg = body.sameRegDomainOnly !== false;

  // Load A
  let listA = [];
  if (body.sitemapAText) {
    const blk = extractLocs(body.sitemapAText);
    listA = blk.isIndex ? [] : blk.items;
  } else if (body.sitemapAUrl) {
    const x = await fetchMaybeGzip(body.sitemapAUrl);
    const blk = extractLocs(x);
    if (blk.isIndex) {
      let agg = [];
      for (const child of blk.items.slice(0,50)) {
        try {
          const t = await fetchMaybeGzip(child);
          const urls = extractLocs(t);
          if (!urls.isIndex) agg = agg.concat(urls.items);
        } catch {}
        if (agg.length >= HARD_CAP) break;
      }
      listA = agg.slice(0,HARD_CAP);
    } else listA = blk.items.slice(0,HARD_CAP);
  }

  // Load B
  let listB = [];
  if (body.sitemapBText) {
    const blk = extractLocs(body.sitemapBText);
    listB = blk.isIndex ? [] : blk.items;
  } else if (body.sitemapBUrl) {
    const x = await fetchMaybeGzip(body.sitemapBUrl);
    const blk = extractLocs(x);
    if (blk.isIndex) {
      let agg = [];
      for (const child of blk.items.slice(0,50)) {
        try {
          const t = await fetchMaybeGzip(child);
          const urls = extractLocs(t);
          if (!urls.isIndex) agg = agg.concat(urls.items);
        } catch {}
        if (agg.length >= HARD_CAP) break;
      }
      listB = agg.slice(0,HARD_CAP);
    } else listB = blk.items.slice(0,HARD_CAP);
  }

  const A = Array.from(new Set(listA.map(normUrl).filter(Boolean)));
  const B = Array.from(new Set(listB.map(normUrl).filter(Boolean)));

  const setA = new Set(A), setB = new Set(B);
  const removed = A.filter(u=>!setB.has(u));
  const added = B.filter(u=>!setA.has(u));

  const byHost = new Map();
  for (const u of added) { try{ const h=new URL(u).host; if(!byHost.has(h)) byHost.set(h,[]); byHost.get(h).push(u);}catch{} }
  const allAdded = added.slice();

  const pairs = [];
  for (const r of removed) {
    let cand = [];
    try {
      const h = new URL(r).host;
      cand = (byHost.get(h)||[]);
      if (!cand.length) cand = allAdded.filter(u=>sameRegDomain(u,r));
    } catch { cand = allAdded; }
    let best=null, bestScore=-1;
    const rp = pathOf(r);
    for (const t of (cand.length?cand:allAdded)){
      if (sameReg && !sameRegDomain(r,t)) continue;
      const g = guessMatch(rp, pathOf(t));
      if (g.conf > bestScore){ best = { from:r, to:t, confidence:g.conf, note:g.note, method:'301' }; bestScore = g.conf; }
    }
    if (best && best.confidence >= 0.66) pairs.push(best);
  }

  // Dedup by 'from', keep highest confidence
  const map = new Map();
  for (const p of pairs) { const prev = map.get(p.from); if (!prev || p.confidence > prev.confidence) map.set(p.from, p); }
  let dedup = Array.from(map.values());

  if (verify && dedup.length) dedup = await verifyTargets(dedup, timeout);

  const mappedFrom = new Set(dedup.map(p=>p.from));
  const unmapped = removed.filter(u=>!mappedFrom.has(u));

  const meta = {
    runTimestamp: new Date().toISOString(),
    removedCount: removed.length,
    addedCount: added.length,
    suggestedMappings: dedup.length,
    truncated: (A.length > HARD_CAP) || (B.length > HARD_CAP),
    verify, timeoutMs: timeout, sameRegDomainOnly: sameReg
  };

  return new Response(JSON.stringify({ meta, added, removed, pairs: dedup, unmapped }), { headers:{'content-type':'application/json'} });
}
