// Tiny-Reactive UI sanity for Dead Link Finder.
// Requires a Tiny-Reactive controller running locally, e.g.:
//   tiny-reactive serve --host 127.0.0.1 --port 5566 --headful --debug
// Then execute: node scripts/ui_smoke_dlf.mjs

import { mkdir } from 'node:fs/promises';

const fetchImpl = globalThis.fetch;
if (typeof fetchImpl !== 'function') {
  throw new Error('Global fetch is required (Node 18+).');
}

const TR = process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566';

async function cmd(body) {
  const res = await fetchImpl(`${TR}/cmd`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`tiny-reactive HTTP error: ${res.status}`);
  }
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
  const base = process.env.TINYUTILS_BASE || 'https://tinyutils-eight.vercel.app';
  const toolUrl = `${base}/tools/dead-link-finder/?debug=1`;

  await cmd({
    id: 'open',
    cmd: 'open',
    args: { url: toolUrl, waitUntil: 'networkidle' },
    target: { contextId: 'default', pageId: 'active' }
  });

  await cmd({
    id: 'ready',
    cmd: 'waitFor',
    args: { selector: '#runBtn', state: 'visible' }
  });

  // Accept consent banner if it appears.
  await maybeClick('#tu-consent-accept');

  await cmd({
    id: 'type',
    cmd: 'type',
    args: { selector: '#pageUrl', text: 'wikipedia.com', delayMs: 30 }
  });

  await cmd({
    id: 'run',
    cmd: 'click',
    args: { selector: '#runBtn' }
  });

  // Wait for scheduler capsule to render.
  await cmd({
    id: 'wait-debug',
    cmd: 'waitFor',
    args: { selector: '.debug-scheduler', state: 'attached', timeout: 120000 }
  });

  await cmd({
    id: 'reveal-debug',
    cmd: 'evaluate',
    args: {
      js: "() => { const el = document.querySelector('.debug-scheduler'); if (el) { el.style.display = 'block'; el.style.visibility = 'visible'; } return el?.textContent || ''; }"
    }
  });

  const debugDir = new URL('../.debug/', import.meta.url);
  await mkdir(debugDir, { recursive: true });
  await cmd({
    id: 'screen',
    cmd: 'screenshot',
    args: { pathOrBase64: './.debug/dlf-ui.png', fullPage: true }
  });

  console.log('UI sanity captured to ./.debug/dlf-ui.png');
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
