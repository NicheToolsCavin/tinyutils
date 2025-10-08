export const config = { runtime: 'edge' };

function makeRequestId() {
  return Math.random().toString(16).slice(2, 10);
}

function json(headers, status, bodyObj) {
  return new Response(JSON.stringify(bodyObj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
  });
}

function jsonError(status, code, message, detail = null, stage = null, requestId = null) {
  const headers = requestId ? { 'x-request-id': requestId } : {};
  return json(headers, status, { ok: false, code, message, detail, stage, requestId });
}

function withTimeout(ms, externalSignal) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => {
    if (!ctrl.signal.aborted) {
      ctrl.abort();
    }
  }, ms);
  const cleanup = () => clearTimeout(timeout);
  if (externalSignal) {
    if (externalSignal.aborted) {
      ctrl.abort();
    } else {
      externalSignal.addEventListener('abort', () => ctrl.abort(), { once: true });
    }
  }
  return { signal: ctrl.signal, cancel: cleanup, controller: ctrl };
}

async function timedFetch(url, options, timeoutMs) {
  const { signal, cancel } = withTimeout(timeoutMs, options?.signal);
  try {
    const response = await fetch(url, { ...options, signal });
    cancel();
    return response;
  } catch (error) {
    cancel();
    throw error;
  }
}

const UA = 'TinyUtils-DeadLinkChecker/1.0 (+https://tinyutils.net; hello@tinyutils.net)';
const TLDS = ['.gov', '.mil', '.bank', '.edu'];
const MAX_URLS = 200;
const MAX_REDIRECTS = 5;
const MAX_SITEMAP_FETCHES = 16;

function sanitizeRobotsPattern(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasAnchor = trimmed.endsWith('$');
  const raw = hasAnchor ? trimmed.slice(0, -1) : trimmed;
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  const segments = normalized.split('*').map(segment => segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = segments.join('.*');
  const regexSource = `^${pattern}${hasAnchor ? '$' : '.*'}`;
  let regex;
  try {
    regex = new RegExp(regexSource);
  } catch {
    return null;
  }
  return { pattern: normalized, regex, length: normalized.length, anchor: hasAnchor };
}

function buildRobotsRule(type, value) {
  const sanitized = sanitizeRobotsPattern(value);
  if (!sanitized) return null;
  return { type, regex: sanitized.regex, length: sanitized.length };
}

function parseRobots(content) {
  const lines = String(content || '').split(/\r?\n/);
  const groups = [];
  let currentAgents = [];
  let currentRules = [];
  const pushGroup = () => {
    if (!currentAgents.length) return;
    groups.push({ agents: currentAgents, rules: currentRules });
    currentAgents = [];
    currentRules = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const index = line.indexOf(':');
    if (index === -1) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (key === 'user-agent') {
      const agent = value.toLowerCase();
      if (!agent) continue;
      if (!currentAgents.length || currentRules.length === 0) {
        currentAgents.push(agent);
      } else {
        pushGroup();
        currentAgents = [agent];
      }
      continue;
    }
    if (key === 'allow' || key === 'disallow') {
      if (!currentAgents.length) continue;
      const rule = buildRobotsRule(key, value);
      if (rule) currentRules.push(rule);
      continue;
    }
  }
  pushGroup();

  if (!groups.length) return [];

  const ua = UA.toLowerCase();
  const fallbackAgents = ['tinyutils-deadlinkchecker', 'tinyutils'];
  const matchGroups = (matcher) => groups.filter(group => group.agents.some(agent => matcher(agent)));
  let applicable = matchGroups(agent => agent === ua);
  if (!applicable.length) {
    applicable = matchGroups(agent => fallbackAgents.includes(agent));
  }
  if (!applicable.length) {
    applicable = matchGroups(agent => agent === '*');
  }

  const rules = [];
  for (const group of applicable) {
    for (const rule of group.rules) {
      if (rule) rules.push(rule);
    }
  }
  return rules;
}

function isAllowedByRobots(rules, url) {
  if (!Array.isArray(rules) || !rules.length) return true;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  const path = `${parsed.pathname || '/' }${parsed.search || ''}`;
  let winner = null;
  for (const rule of rules) {
    if (!rule?.regex) continue;
    if (!rule.regex.test(path)) continue;
    if (!winner || rule.length > winner.length || (rule.length === winner.length && rule.type === 'allow' && winner.type !== 'allow')) {
      winner = rule;
    }
  }
  if (!winner) return true;
  return winner.type !== 'disallow';
}

function badScheme(input) {
  return /^(javascript:|data:|mailto:)/i.test(input || '');
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

function assertPublicHttp(raw) {
  let value = String(raw || '').trim();
  if (!value) return { ok: false, note: 'invalid_url' };
  if (value.startsWith('//')) value = 'https:' + value;
  if (!/^[a-zA-Z][a-zA-Z0-9+\.\-]*:/.test(value)) value = 'https://' + value;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, note: 'unsupported_scheme' };
    if (isPrivateHost(url.hostname)) return { ok: false, note: 'private_host' };
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (!url.pathname) url.pathname = '/';
    if (url.port === '80' && url.protocol === 'http:') url.port = '';
    if (url.port === '443' && url.protocol === 'https:') url.port = '';
    return { ok: true, url: url.toString(), origin: url.origin, urlObj: url };
  } catch {
    return { ok: false, note: 'invalid_url' };
  }
}

async function fetchHead(u, timeout) {
  return timedFetch(u, {
    method: 'HEAD',
    redirect: 'manual',
    headers: { 'user-agent': UA }
  }, timeout);
}

async function fetchGet(u, timeout) {
  return timedFetch(u, {
    method: 'GET',
    redirect: 'manual',
    headers: { 'user-agent': UA }
  }, timeout);
}

async function loadSingleSitemap(url) {
  let response;
  try {
    response = await timedFetch(url, {
      headers: { 'user-agent': UA }
    }, 10000);
  } catch {
    const error = new Error('sitemap_fetch_failed');
    error.code = 'sitemap_fetch_failed';
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`sitemap_status_${response.status}`);
    error.code = `sitemap_status_${response.status}`;
    error.status = response.status;
    throw error;
  }

  return readSitemapBody(response, url);
}

async function follow(url, timeout, headFirst, setStage) {
  let current = url;
  let chain = 0;
  let usedGet = !headFirst;

  while (chain <= MAX_REDIRECTS) {
    let response = null;
    let fromHead = false;
    if (!usedGet) {
      try {
        if (setStage) setStage('head_check');
        response = await fetchHead(current, timeout);
        fromHead = true;
      } catch (error) {
        usedGet = true;
        if (error?.name === 'AbortError') {
          return { status: null, ok: false, finalUrl: current, note: 'timeout', chain, headers: null };
        }
      }
      if (response && response.status >= 200 && response.status < 300) {
        try {
          if (setStage) setStage('get_check');
          response = await fetchGet(current, timeout);
          usedGet = true;
          fromHead = false;
        } catch (error) {
          const note = error?.name === 'AbortError' ? 'timeout' : 'network_error';
          return { status: null, ok: false, finalUrl: current, note, chain, headers: null };
        }
      }
    }
    if (!response || (fromHead && (response.status === 405 || response.status === 501))) {
      try {
        if (setStage) setStage('get_check');
        response = await fetchGet(current, timeout);
        usedGet = true;
      } catch (error) {
        const note = error?.name === 'AbortError' ? 'timeout' : 'network_error';
        return { status: null, ok: false, finalUrl: current, note, chain, headers: null };
      }
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return { status: response.status, ok: false, finalUrl: current, note: 'bad_redirect', chain, headers: response.headers };
      }
      try {
        current = new URL(location, current).href;
      } catch {
        return { status: response.status, ok: false, finalUrl: current, note: 'bad_redirect', chain, headers: response.headers };
      }
      chain += 1;
      continue;
    }

    return { status: response.status, ok: response.ok, finalUrl: current, chain, headers: response.headers };
  }

  return { status: null, ok: false, finalUrl: current, note: 'redirect_loop', chain, headers: null };
}

async function httpFallback(url, headers, timeout, setStage) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (TLDS.some(tld => host.endsWith(tld))) {
      return { skipped: true, reason: 'tld_guard' };
    }
    if (headers && headers.get('strict-transport-security')) {
      return { skipped: true, reason: 'hsts' };
    }
    if (parsed.protocol === 'https:') {
      parsed.protocol = 'http:';
      if (isPrivateHost(parsed.hostname)) {
        return { skipped: true, reason: 'private_host' };
      }
      const result = await follow(parsed.href, timeout, false, setStage);
      return { skipped: false, result };
    }
  } catch {
    return { skipped: true, reason: 'proto' };
  }
  return { skipped: true, reason: 'proto' };
}

function collectLinks(html, baseUrl, includeAssets) {
  const urls = [];
  const base = baseUrl;
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["']/gi;
  html.replace(anchorRe, (_, value) => {
    if (badScheme(value)) return _;
    try {
      urls.push(new URL(value, base).href);
    } catch {}
    return _;
  });
  if (includeAssets) {
    const imgRe = /<img\b[^>]*src=["']([^"']+)["']/gi;
    const scriptRe = /<script\b[^>]*src=["']([^"']+)["']/gi;
    const linkRe = /<link\b[^>]*href=["']([^"']+)["']/gi;
    html.replace(imgRe, (_, value) => {
      if (badScheme(value)) return _;
      try { urls.push(new URL(value, base).href); } catch {}
      return _;
    });
    html.replace(scriptRe, (_, value) => {
      if (badScheme(value)) return _;
      try { urls.push(new URL(value, base).href); } catch {}
      return _;
    });
    html.replace(linkRe, (_, value) => {
      if (badScheme(value)) return _;
      try { urls.push(new URL(value, base).href); } catch {}
      return _;
    });
  }
  return Array.from(new Set(urls));
}

function decodeXmlEntities(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: String.fromCharCode(34),
    apos: String.fromCharCode(39)
  };
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (full, entity) => {
    if (!entity) return full;
    if (entity.startsWith('#')) {
      const hex = entity[1] === 'x' || entity[1] === 'X';
      const codePoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(codePoint)) return full;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return full;
      }
    }
    const replacement = named[entity.toLowerCase()];
    return replacement !== undefined ? replacement : full;
  });
}

function extractSitemapUrls(xml) {
  const urls = [];
  const matches = xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi);
  for (const [, block] of matches) {
    const locMatch = block.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i);
    if (!locMatch) continue;
    let value = locMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    if (!value) continue;
    value = decodeXmlEntities(value);
    if (value) urls.push(value.trim());
  }
  if (!urls.length) {
    return [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/gi)].map(match => {
      const raw = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
      return decodeXmlEntities(raw);
    }).filter(Boolean);
  }
  return urls;
}

function extractSitemapIndex(xml) {
  const urls = [];
  const matches = xml.matchAll(/<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi);
  for (const [, block] of matches) {
    const locMatch = block.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i);
    if (!locMatch) continue;
    let value = locMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    if (!value) continue;
    value = decodeXmlEntities(value);
    if (value) urls.push(value.trim());
    if (urls.length >= MAX_SITEMAP_FETCHES) break;
  }
  if (!urls.length) {
    return [...xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/gi)].map((match) => {
      const raw = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
      return decodeXmlEntities(raw);
    }).filter(Boolean);
  }
  return urls;
}

async function readSitemapBody(response, url) {
  const contentType = response.headers.get('content-type') || '';
  const isGzip = /\.gz(\?|$)/i.test(new URL(url).pathname) || /gzip/i.test(contentType);
  if (isGzip) {
    if (typeof DecompressionStream !== 'function' || !response.body) {
      const error = new Error('gz_not_supported');
      error.code = 'gz_not_supported';
      throw error;
    }
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }
  return response.text();
}

async function fetchRobotsSitemaps(origin) {
  const robotsUrl = `${origin.replace(/\/$/, '')}/robots.txt`;
  try {
    const res = await timedFetch(robotsUrl, {
      headers: { 'user-agent': UA }
    }, 8000);
    if (!res.ok) {
      return { urls: [], note: `robots_status_${res.status}`, robotsUrl };
    }
    const text = await res.text();
    const urls = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*sitemap:\s*(.+)$/i);
      if (!match) continue;
      const raw = match[1].trim();
      if (!raw) continue;
      try {
        const resolved = new URL(raw, origin).href;
        const normalized = assertPublicHttp(resolved);
        if (normalized.ok && !urls.includes(normalized.url)) {
          urls.push(normalized.url);
          if (urls.length >= 2) break;
        }
      } catch {}
    }
    return { urls, note: urls.length ? null : 'robots_none', robotsUrl };
  } catch {
    return { urls: [], note: 'robots_unknown', robotsUrl };
  }
}

async function collectSitemapUrls(candidates) {
  const queue = Array.from(new Set(candidates));
  const visited = new Set();
  const seenUrls = new Set();
  const urls = [];
  const notes = new Set();
  let truncated = false;

  while (queue.length && visited.size < MAX_SITEMAP_FETCHES) {
    const next = queue.shift();
    if (visited.has(next)) continue;
    visited.add(next);

    let res;
    try {
      res = await timedFetch(next, {
        headers: { 'user-agent': UA }
      }, 10000);
    } catch {
      notes.add('sitemap_fetch_failed');
      continue;
    }

    if (!res.ok) {
      notes.add(`sitemap_status_${res.status}`);
      continue;
    }

    let xml;
    try {
      xml = await readSitemapBody(res, next);
    } catch (error) {
      if (error?.code === 'gz_not_supported') {
        notes.add('gz_not_supported');
      } else {
        notes.add('sitemap_fetch_failed');
      }
      continue;
    }

    if (/<sitemapindex\b/i.test(xml)) {
      const children = extractSitemapIndex(xml);
      for (const child of children) {
        const normalized = assertPublicHttp(child);
        if (!normalized.ok) continue;
        if (visited.has(normalized.url) || queue.includes(normalized.url)) continue;
        if (visited.size + queue.length >= MAX_SITEMAP_FETCHES) {
          truncated = true;
          continue;
        }
        queue.push(normalized.url);
      }
      continue;
    }

    const locs = extractSitemapUrls(xml);
    for (const loc of locs) {
      const normalized = assertPublicHttp(loc);
      if (!normalized.ok) continue;
      if (!seenUrls.has(normalized.url)) {
        seenUrls.add(normalized.url);
        urls.push(normalized.url);
      }
    }
  }

  if (queue.length && visited.size >= MAX_SITEMAP_FETCHES) {
    truncated = true;
  }

  return {
    urls,
    notes: Array.from(notes),
    fetched: Array.from(visited),
    truncated
  };
}

function classifySitemapInput(body) {
  const raw = String(body?.sitemapInput || body?.sitemapUrl || '').trim();
  if (!raw) return { ok: false, note: 'invalid_url' };
  const normalized = assertPublicHttp(raw);
  if (!normalized.ok || !normalized.urlObj) {
    return { ok: false, note: normalized.note || 'invalid_url' };
  }
  const sitemapLike = /\.xml(\.gz)?(\?|$|\/)/i.test(normalized.urlObj.pathname);
  return { ok: true, raw, normalized, sitemapLike };
}

export default async function handler(req) {
  const requestId = makeRequestId();
  const startedAt = new Date();
  let stage = 'init';
  const setStage = (value) => {
    stage = value;
  };

  try {
    if (req.method !== 'POST') {
      return jsonError(405, 'method_not_allowed', 'Only POST is supported', null, stage, requestId);
    }

    let rawBody = '';
    try {
      rawBody = await req.text();
    } catch (error) {
      return jsonError(400, 'body_read_failed', 'Unable to read request body', error?.message || null, stage, requestId);
    }

    let body = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (error) {
        return jsonError(400, 'invalid_json', 'Request body must be valid JSON', error?.message || null, stage, requestId);
      }
    }
    if (!body || typeof body !== 'object') body = {};

    setStage('normalize_input');

    const timeout = Math.min(30000, Math.max(1000, Number(body.timeout) || 10000));
    const headFirst = body.headFirst !== false;
    const retryHttp = !!body.retryHttp;
    const respectRobots = body.respectRobots !== false;

    let urls = [];
    let sitemapInfo = null;
    let inputCount = 0;
    let sitemapSource = null;

    if (body.mode === 'list') {
      const raw = Array.isArray(body.urls) ? body.urls : String(body.list || '').split(/\r?\n/);
      urls = raw.map(value => String(value || '').trim()).filter(Boolean);
      inputCount = urls.length;
    } else if (body.mode === 'crawl' || !body.mode) {
      const sourceUrl = assertPublicHttp(body.pageUrl || '');
      if (!sourceUrl.ok || !sourceUrl.url) {
        return jsonError(400, 'invalid_page_url', 'pageUrl must be a valid http(s) URL', sourceUrl.note || null, stage, requestId);
      }
      let response;
      try {
        setStage('fetch_html');
        response = await timedFetch(sourceUrl.url, {
          headers: { 'user-agent': UA }
        }, 15000);
      } catch (error) {
        const code = error?.name === 'AbortError' ? 'page_timeout' : 'page_fetch_failed';
        const status = error?.name === 'AbortError' ? 504 : 502;
        return jsonError(status, code, 'Failed to fetch page HTML', error?.message || null, stage, requestId);
      }
      let html;
      try {
        html = await response.text();
      } catch (error) {
        return jsonError(500, 'page_read_failed', 'Failed to read page HTML', error?.message || null, stage, requestId);
      }
      setStage('parse_links');
      urls = collectLinks(html, sourceUrl.url, !!body.includeAssets);
      inputCount = urls.length;
    } else if (body.mode === 'sitemap') {
      const classified = classifySitemapInput(body);
      if (!classified.ok) {
        return jsonError(400, 'invalid_sitemap_input', 'Invalid sitemap input', classified.note || null, stage, requestId);
      }
      sitemapSource = classified.raw;

      const candidates = [];
      if (classified.sitemapLike) {
        candidates.push(classified.normalized.url);
      } else {
        candidates.push(`${classified.normalized.origin}/sitemap.xml`);
      }
      if (body.sitemapUrl && typeof body.sitemapUrl === 'string') {
        const hinted = assertPublicHttp(body.sitemapUrl);
        if (hinted.ok) {
          candidates.push(hinted.url);
        }
      }

      let robotsMeta = null;
      if (!classified.sitemapLike) {
        robotsMeta = await fetchRobotsSitemaps(classified.normalized.origin);
        candidates.push(...robotsMeta.urls);
      }

      const discovery = await collectSitemapUrls(candidates);
      urls = discovery.urls;
      inputCount = urls.length;
      const notes = new Set(discovery.notes);
      if (robotsMeta?.note) notes.add(robotsMeta.note);
      sitemapInfo = {
        input: classified.raw,
        origin: classified.normalized.origin,
        candidates: Array.from(new Set(candidates)),
        robotsUrl: robotsMeta?.robotsUrl || null,
        robotsListed: robotsMeta?.urls || [],
        notes: Array.from(notes).filter(Boolean),
        fetched: discovery.fetched,
        truncated: discovery.truncated
      };
    } else {
      return jsonError(400, 'invalid_mode', 'Unsupported mode', body.mode || null, stage, requestId);
    }

    const seen = new Set();
    const queue = [];
    const prefilled = [];
    for (const raw of urls) {
      if (!raw) continue;
      if (badScheme(raw)) {
        prefilled.push({ url: raw, status: null, ok: false, finalUrl: null, note: 'unsupported_scheme', chain: 0, archive: null });
        continue;
      }
      const result = assertPublicHttp(raw);
      if (!result.ok || !result.url) {
        const note = result.note || 'invalid_url';
        prefilled.push({ url: raw, status: null, ok: false, finalUrl: null, note, chain: 0, archive: null });
        continue;
      }
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      queue.push({ raw, url: result.url });
      if (queue.length >= MAX_URLS) break;
    }

    const robotsCache = new Map();
    let robotsStatus = respectRobots ? 'applied' : 'ignored';

    const getRobotsRules = async (origin) => {
      if (!respectRobots) return { status: 'ignored', rules: [] };
      if (!origin) return { status: 'ignored', rules: [] };
      if (robotsCache.has(origin)) return robotsCache.get(origin);
      setStage('robots_fetch');
      const robotsUrl = `${origin.replace(/\/$/, '')}/robots.txt`;
      try {
        const res = await timedFetch(robotsUrl, { headers: { 'user-agent': UA } }, 5000);
        if (!res.ok) {
          const value = { status: 'error', rules: [], statusCode: res.status };
          robotsCache.set(origin, value);
          return value;
        }
        const text = await res.text();
        const rules = parseRobots(text);
        const value = { status: 'ok', rules };
        robotsCache.set(origin, value);
        return value;
      } catch (error) {
        const value = { status: 'error', rules: [], error };
        robotsCache.set(origin, value);
        return value;
      }
    };

    const responses = [];
    let fallbackUsed = false;
    for (const item of queue) {
      if (respectRobots) {
        setStage('robots_evaluate');
        let origin = null;
        try {
          origin = new URL(item.url).origin;
        } catch {
          origin = null;
        }
        if (origin) {
          const robotsInfo = await getRobotsRules(origin);
          if (robotsInfo.status === 'error') {
            robotsStatus = 'unknown';
          }
          if (robotsInfo.status === 'ok') {
            const allowed = isAllowedByRobots(robotsInfo.rules, item.url);
            if (!allowed) {
              responses.push({
                url: item.url,
                status: null,
                ok: false,
                finalUrl: null,
                archive: null,
                note: 'disallowed_by_robots',
                chain: 0
              });
              continue;
            }
          }
        }
      }

      let state = await follow(item.url, timeout, headFirst, setStage);
      if (state.status && (state.status === 429 || state.status >= 500)) {
        const retryState = await follow(item.url, timeout, false, setStage);
        state = { ...retryState, note: retryState.note ? `${retryState.note}|retry_1` : 'retry_1' };
      }
      if (!state.ok && retryHttp) {
        const fallback = await httpFallback(item.url, state.headers, timeout, setStage);
        if (fallback.skipped) {
          const reason = fallback.reason || 'http_fallback_skipped';
          state.note = state.note ? `${state.note}|${reason}` : reason;
        } else if (fallback.result) {
          fallbackUsed = true;
          const mergedNote = state.note ? `${state.note}|http_fallback_used` : 'http_fallback_used';
          state = { ...fallback.result, note: mergedNote };
        }
      }
      if (state.status === 410) {
        state.note = state.note ? `${state.note}|gone` : 'gone';
      }
      responses.push({
        url: item.url,
        status: state.status,
        ok: state.ok,
        finalUrl: state.finalUrl,
        archive: null,
        note: state.note || null,
        chain: state.chain || 0
      });
    }

    const totalResults = responses.length + prefilled.length;
    let truncated = queue.length >= MAX_URLS && (inputCount > (queue.length + prefilled.length));
    if (sitemapInfo?.truncated) truncated = true;

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - startedAt.getTime();

    setStage('complete');

    const meta = {
      requestId,
      startedAtIso: startedAt.toISOString(),
      endedAtIso: endedAt.toISOString(),
      durationMs,
      robotsStatus,
      runTimestamp: startedAt.toISOString(),
      mode: body.mode || 'list',
      source: sitemapSource || body.pageUrl || body.sitemapUrl || 'list',
      concurrency: Number(body.concurrency) || 10,
      timeoutMs: timeout,
      robots: respectRobots,
      scope: body.scope || 'internal',
      assets: !!body.includeAssets,
      httpFallback: fallbackUsed,
      wayback: !!body.includeArchive,
      totalQueued: queue.length + prefilled.length,
      totalChecked: totalResults,
      truncated,
      sitemap: sitemapInfo,
      stage: 'complete'
    };

    const payload = { ok: true, stage: 'complete', meta, rows: [...prefilled, ...responses] };
    return json({ 'x-request-id': requestId }, 200, payload);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return jsonError(500, 'internal_error', 'Unexpected server error', detail, stage, requestId);
  }
}
