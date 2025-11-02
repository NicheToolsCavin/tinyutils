// Tiny-Reactive UI sanity for Wayback Fixer.
// Requires a Tiny-Reactive controller running locally, e.g.:
//   npx tiny-reactive@latest serve --host 127.0.0.1 --port 5566 --headless --debug
// Then execute: node scripts/ui_smoke_wayback.mjs

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
  const toolUrl = `${BASE}/tools/wayback-fixer/`;

  await cmd({ id: 'open', cmd: 'open', args: { url: toolUrl, waitUntil: 'networkidle' }, target: { contextId: 'default', pageId: 'active' } });

  // Accept consent banner if it appears.
  await maybeClick('#tu-consent-accept');

  // Ensure UI ready
  await cmd({ id: 'ready', cmd: 'waitFor', args: { selector: '#run', state: 'visible', timeout: 15000 } });

  // Type a small demo list
  const demoText = 'https://example.com/old\nhttps://example.com/missing\nhttps://example.com/2011/post';
  await cmd({ id: 'focus', cmd: 'click', args: { selector: '#list' } });
  await cmd({ id: 'type', cmd: 'type', args: { selector: '#list', text: demoText, delayMs: 20 } });

  // Run
  await cmd({ id: 'run', cmd: 'click', args: { selector: '#run' } });

  // Wait for table rows or an error-ish status line to show progress
  await cmd({
    id: 'wait-result',
    cmd: 'waitForFunction',
    args: {
      js: `() => {
        const tbody = document.querySelector('#tbl tbody');
        const rows = tbody ? tbody.querySelectorAll('tr').length : 0;
        const stat = document.querySelector('#status');
        const hasCounts = stat && /checked|archived|no snapshot|Error/i.test(stat.textContent || '');
        return rows > 0 || hasCounts;
      }`,
      timeout: 120000
    }
  });

  await cmd({ id: 'screen', cmd: 'screenshot', args: { pathOrBase64: './.debug/wayback-fixer-ui.png', fullPage: true } });
  console.log('UI sanity captured to ./.debug/wayback-fixer-ui.png');
}

run().catch((error) => { console.error(error.message || error); process.exit(1); });

