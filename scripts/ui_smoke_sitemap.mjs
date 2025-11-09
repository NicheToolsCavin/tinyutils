// Tiny-Reactive UI sanity for Sitemap Delta + Redirect Mapper.
// When TINY_REACTIVE_URL is provided, we drive the UI through Tiny Reactive.
// Otherwise we fall back to simple HTTP checks against a local/static instance.

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
  const toolUrl = `${BASE.replace(/\/$/, '')}/tools/sitemap-delta/`;

  await cmd({ id: 'open', cmd: 'open', args: { url: toolUrl, waitUntil: 'networkidle' }, target: { contextId: 'default', pageId: 'active' } });

  await maybeClick('#tu-consent-accept');

  await cmd({ id: 'ready', cmd: 'waitFor', args: { selector: '#runBtn', state: 'visible', timeout: 15000 } });

  await maybeClick('#demoBtn');
  await cmd({ id: 'run', cmd: 'click', args: { selector: '#runBtn' } });

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

async function runFallback() {
  const base = BASE.replace(/\/$/, '');
  const pageUrl = `${base}/tools/sitemap-delta/`;
  const apiUrl = `${base}/api/sitemap-delta`;

  const pageRes = await fetchImpl(pageUrl, { redirect: 'follow' });
  if (!pageRes.ok) throw new Error(`sitemap page status ${pageRes.status}`);
  const html = await pageRes.text();
  if (!/Sitemap Delta/i.test(html)) throw new Error('Sitemap Delta page missing expected heading');

  const xmlA = '<urlset><url><loc>https://example.com/a</loc></url></urlset>';
  const xmlB = '<urlset><url><loc>https://example.com/a</loc></url><url><loc>https://example.com/b</loc></url></urlset>';
  const apiRes = await fetchImpl(apiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sitemapAText: xmlA, sitemapBText: xmlB, verifyTargets: false })
  });
  if (!apiRes.ok) {
    if ([404, 405, 501].includes(apiRes.status)) {
      console.log(`Sitemap API skipped (status ${apiRes.status} indicates static server)`);
      return;
    }
    throw new Error(`sitemap API status ${apiRes.status}`);
  }
  const payload = await apiRes.json();
  if (!payload || typeof payload !== 'object' || !payload.meta || !Array.isArray(payload.pairs)) {
    throw new Error('sitemap API response missing meta/pairs');
  }
  console.log('Fallback Sitemap Delta checks passed');
}

async function run() {
  if (TR) {
    await runTinyReactive();
  } else {
    await runFallback();
  }
}

run().catch((error) => { console.error(error.message || error); process.exit(1); });
