// Tiny-Reactive UI sanity for Sitemap Delta + Redirect Mapper.
// Requires a Tiny-Reactive controller running locally, e.g.:
//   npx tiny-reactive@latest serve --host 127.0.0.1 --port 5566 --headless --debug
// Then execute: node scripts/ui_smoke_sitemap.mjs

const fetchImpl = globalThis.fetch;
if (typeof fetchImpl !== 'function') {
  throw new Error('Global fetch is required (Node 18+).');
}

const TR = process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566';
const BASE = process.env.TINYUTILS_BASE || 'https://tinyutils-eight.vercel.app';

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

async function run() {
  const toolUrl = `${BASE}/tools/sitemap-delta/`;

  await cmd({ id: 'open', cmd: 'open', args: { url: toolUrl, waitUntil: 'networkidle' }, target: { contextId: 'default', pageId: 'active' } });

  // Accept consent banner if it appears.
  await maybeClick('#tu-consent-accept');

  // Ensure UI ready
  await cmd({ id: 'ready', cmd: 'waitFor', args: { selector: '#runBtn', state: 'visible', timeout: 15000 } });

  // Use the built-in demo content to avoid network flakiness.
  await maybeClick('#demoBtn');

  // Run comparison
  await cmd({ id: 'run', cmd: 'click', args: { selector: '#runBtn' } });

  // Wait until either summary shows or an error is displayed in #status.
  // We use a JS poll to avoid getting stuck if front-end rendering has a bug.
  await cmd({
    id: 'wait-result',
    cmd: 'waitForFunction',
    args: {
      js: `() => {
        const s = document.querySelector('#summary');
        const stat = document.querySelector('#status');
        const visible = s && !s.classList.contains('hidden') && s.textContent.trim().length > 0;
        const errored = stat && /Error:/i.test(stat.textContent || '');
        return visible || errored;
      }`,
      timeout: 120000
    }
  });

  await cmd({ id: 'screen', cmd: 'screenshot', args: { pathOrBase64: './.debug/sitemap-delta-ui.png', fullPage: true } });
  console.log('UI sanity captured to ./.debug/sitemap-delta-ui.png');
}

run().catch((error) => { console.error(error.message || error); process.exit(1); });

