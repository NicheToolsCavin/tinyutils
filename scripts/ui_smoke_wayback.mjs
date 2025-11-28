// Tiny-Reactive UI sanity for Wayback Fixer.
// Requires a Tiny-Reactive controller running locally, e.g.:
//   npx tiny-reactive@latest serve --host 127.0.0.1 --port 5566 --headless --debug
// Then execute: node scripts/ui_smoke_wayback.mjs

const fetchImpl = globalThis.fetch;
if (typeof fetchImpl !== 'function') {
  throw new Error('Global fetch is required (Node 18+).');
}

const TR = process.env.TINY_REACTIVE_URL || '';
const BASE = process.env.TINYUTILS_BASE || 'http://127.0.0.1:4173';

async function cmd(body) {
  const res = await fetchImpl(`${TR}/cmd`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`tiny-reactive HTTP error: ${res.status}`);
  const payload = await res.json();
  if (!payload.ok) {
    const code = payload.error?.code || 'unknown';
    throw new Error(`tiny-reactive error (${code})`);
  }
  return payload;
}

async function maybeClick(selector) {
  try {
    await cmd({ id: `maybe-${selector}`, cmd: 'waitFor', args: { selector, state: 'visible', timeout: 2000 } });
  } catch {
    return false;
  }
  await cmd({ id: `click-${selector}`, cmd: 'click', args: { selector } });
  return true;
}

async function runTinyReactive() {
  const toolUrl = `${BASE.replace(/\/$/, '')}/tools/wayback-fixer/`;

  await cmd({ id: 'open', cmd: 'open', args: { url: toolUrl, waitUntil: 'networkidle' }, target: { contextId: 'default', pageId: 'active' } });

  // Current UI (Nov 2025): no consent modal; primary button has text "Run"
  await cmd({ id: 'ready', cmd: 'waitFor', args: { selector: 'text=Run', state: 'visible', timeout: 15000 } });

  const demoText = 'https://example.com/old\nhttps://example.com/missing\nhttps://example.com/2011/post';
  await cmd({ id: 'focus', cmd: 'click', args: { selector: '#urlsList' } });
  await cmd({ id: 'type', cmd: 'type', args: { selector: '#urlsList', text: demoText, delayMs: 20 } });

  await cmd({ id: 'run', cmd: 'click', args: { selector: 'text=Run' } });

  await cmd({
    id: 'wait-result',
    cmd: 'waitForFunction',
    args: {
      js: `() => {
        const tbody = document.querySelector('#resultsTable tbody');
        if (!tbody) return false;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const meaningful = rows.some((r) => !r.classList.contains('empty'));
        return meaningful;
      }`,
      timeout: 120000
    }
  });

  await cmd({ id: 'screen', cmd: 'screenshot', args: { pathOrBase64: './.debug/wayback-fixer-ui.png', fullPage: true } });
  console.log('UI sanity captured to ./.debug/wayback-fixer-ui.png');
}

async function runFallback() {
  const base = BASE.replace(/\/$/, '');
  const pageUrl = `${base}/tools/wayback-fixer/`;
  const apiUrl = `${base}/api/wayback-fixer`;

  const pageRes = await fetchImpl(pageUrl, { redirect: 'follow' });
  if (!pageRes.ok) throw new Error(`wayback page status ${pageRes.status}`);
  const html = await pageRes.text();
  if (!/Wayback Fixer/i.test(html)) throw new Error('Wayback page content missing expected heading');

  const apiRes = await fetchImpl(apiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ urls: ['https://example.com/missing-page'], verifyHead: false, trySavePageNow: false, timeout: 3000, concurrency: 2 })
  });
  if (!apiRes.ok) {
    if ([404, 405, 501].includes(apiRes.status)) {
      console.log(`Wayback API skipped (status ${apiRes.status} indicates static server)`);
      return;
    }
    throw new Error(`wayback API status ${apiRes.status}`);
  }
  const payload = await apiRes.json();
  if (!payload || typeof payload !== 'object' || !payload.meta || !Array.isArray(payload.results)) {
    throw new Error('wayback API response missing meta/results');
  }
  console.log('Fallback Wayback Fixer checks passed');
}

async function run() {
  if (TR) {
    await runTinyReactive();
  } else {
    await runFallback();
  }
}

run().catch((error) => { console.error(error.message || error); process.exit(1); });
