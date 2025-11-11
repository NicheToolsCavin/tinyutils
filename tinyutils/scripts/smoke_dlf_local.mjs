import handler from '../api/check.js';

const originalFetch = globalThis.fetch;

const HOST_BEHAVIOUR = {
  'facebook.com': { head: 200, get: 200 },
  'www.facebook.com': { head: 200, get: 200 },
  'wikipedia.com': { head: 200, get: 200 },
  'www.wikipedia.com': { head: 200, get: 200 },
  'wikipedia.org': { head: 200, get: 200 },
  'www.wikipedia.org': { head: 200, get: 200 },
  'instagram.com': { head: 503, get: 503 },
  'www.instagram.com': { head: 503, get: 503 },
  'example.com': { head: 200, get: 200 },
  'www.example.com': { head: 200, get: 200 }
};

function responseFor(status, method) {
  if (method === 'GET') {
    return new Response('<html><body>mock</body></html>', {
      status,
      headers: { 'content-type': 'text/html' }
    });
  }
  return new Response(null, {
    status,
    headers: { 'content-type': 'text/html' }
  });
}

globalThis.fetch = async (input, init = {}) => {
  const target = typeof input === 'string' ? input : input.url;
  const url = new URL(target);
  const method = (init?.method || 'GET').toUpperCase();
  const headers = new Headers(init?.headers || {});

  if (init?.signal?.aborted) {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    throw abortError;
  }

  if (url.pathname === '/robots.txt') {
    return new Response('User-agent: *\nAllow: /', {
      status: 200,
      headers: { 'content-type': 'text/plain' }
    });
  }

  if (url.hostname.endsWith('instagram.com') && url.pathname === '/' && method === 'GET' && headers.get('user-agent')) {
    const abortError = new Error('Synthetic timeout');
    abortError.name = 'AbortError';
    throw abortError;
  }

  const behaviour = HOST_BEHAVIOUR[url.hostname] || HOST_BEHAVIOUR[url.host] || HOST_BEHAVIOUR[url.hostname.replace(/^www\./, '')];

  const status = behaviour ? behaviour[method.toLowerCase()] : 200;
  return responseFor(status ?? 200, method);
};

const CASES = [
  {
    label: 'facebook.com',
    payload: { mode: 'list', urls: ['https://facebook.com/'] }
  },
  {
    label: 'wikipedia.com',
    payload: { mode: 'list', urls: ['https://wikipedia.com/'] }
  },
  {
    label: 'wikipedia.org (robots off)',
    payload: { mode: 'list', respectRobots: false, urls: ['https://wikipedia.org/'] }
  },
  {
    label: 'instagram.com',
    payload: { mode: 'crawl', pageUrl: 'https://instagram.com/' }
  },
  {
    label: 'example.com',
    payload: { mode: 'list', urls: ['https://example.com/'] }
  }
];

(async () => {
  for (const testCase of CASES) {
    try {
      const request = new Request('https://tinyutils.net/api/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(testCase.payload)
      });
      const response = await handler(request);
      const ctype = response.headers.get('content-type') || '';
      let payload;
      if (ctype.includes('application/json')) {
        payload = await response.json();
      } else {
        const text = await response.text();
        console.log(`${testCase.label}: non-json (${response.status}) ${text.slice(0, 60)}`);
        continue;
      }
      const statusMark = payload?.ok ? 'ok' : 'err';
      const stage = payload?.stage || payload?.meta?.stage || 'unknown';
      const reqId = payload?.requestId || payload?.meta?.requestId || 'n/a';
      const total = Array.isArray(payload?.rows)
        ? payload.rows.length
        : Number(payload?.meta?.totalChecked ?? 0);
      console.log(`${testCase.label}: ${statusMark} · stage=${stage} · req=${reqId} · total=${total}`);
    } catch (error) {
      console.log(`${testCase.label}: threw ${error.message}`);
    }
  }
})()
  .finally(() => {
    globalThis.fetch = originalFetch;
  });
