const originalFetch = globalThis.fetch;
const SNAPSHOT_URL = 'https://web.archive.org/web/20240101120000/https://example.com/old';

let installs = 0;

export function installFetchStub() {
  installs += 1;
  if (installs > 1) {
    return;
  }

  globalThis.fetch = async (url, init = {}) => {
    if (typeof url === 'string' && url.startsWith('https://archive.org/wayback/available')) {
      const payload = {
        archived_snapshots: {
          closest: {
            available: true,
            url: SNAPSHOT_URL,
            timestamp: '20240101120000',
            status: '200'
          }
        }
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (typeof url === 'string' && url.startsWith('https://web.archive.org/web/')) {
      return new Response(null, { status: 200, headers: { 'content-type': 'text/plain' } });
    }

    if (typeof url === 'string' && url.startsWith('https://example.com/robots.txt')) {
      return new Response('User-agent: *\nAllow: /', { status: 200, headers: { 'content-type': 'text/plain' } });
    }

    if (typeof url === 'string' && url.startsWith('https://example.com')) {
      const method = (init.method || 'GET').toUpperCase();
      if (method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
      }
      const html = `<!doctype html><html><head><title>Example</title><meta name="description" content="Demo page"></head><body>
        <a href="https://example.com/about">About</a>
        <a href="https://example.com/contact">Contact</a>
      </body></html>`;
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    if (originalFetch) {
      return originalFetch(url, init);
    }

    throw new Error(`Unhandled fetch target: ${url}`);
  };
}

export function restoreFetchStub() {
  installs = Math.max(installs - 1, 0);
  if (installs === 0) {
    globalThis.fetch = originalFetch;
  }
}
