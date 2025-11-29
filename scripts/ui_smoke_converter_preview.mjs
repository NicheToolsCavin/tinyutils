#!/usr/bin/env node
// Lightweight UI smoke for the converter preview.
//
// This script uses Puppeteer to drive the Text Converter page,
// type some sample Markdown into the textarea, click the
// **Preview** button, and assert that the preview iframe renders
// some non‑empty content. It is intentionally minimal and does
// not depend on tiny-reactive.
//
// Usage:
//   BASE_URL=https://tinyutils.net/tools/text-converter/ \\
//     node scripts/ui_smoke_converter_preview.mjs
//
// or:
//   node scripts/ui_smoke_converter_preview.mjs https://tinyutils.net/tools/text-converter/

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';

const cliUrl = process.argv[2];
const rawBase = (process.env.BASE_URL || cliUrl || '').trim();

if (!rawBase) {
  console.error('Usage: BASE_URL=https://host/tools/text-converter/ node scripts/ui_smoke_converter_preview.mjs');
  process.exit(2);
}

// Accept either the exact converter URL or a host root and normalise.
let baseUrl = rawBase;
if (!/\/tools\/text-converter\/?$/.test(baseUrl)) {
  baseUrl = baseUrl.replace(/\/$/, '') + '/tools/text-converter/';
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'converter-preview-ui-smoke', dateSlug);

async function main() {
  console.log(`🧪 Converter preview UI smoke against ${baseUrl}`);
  await mkdir(artifactDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const result = {
    baseUrl,
    timestamp: new Date().toISOString(),
    ok: false,
    reason: null,
    iframeSummary: null,
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });

    await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 60000 });

    // Type a small Markdown sample.
    await page.focus('#textInput');
    await page.keyboard.type('# Preview smoke\n\nHello from TinyUtils preview!');

    // Click Preview.
    await page.click('#previewBtn');

    // Wait for the iframe to receive non-empty srcdoc.
    await page.waitForFunction(
      () => {
        const iframe = document.querySelector('#previewIframe');
        return iframe && typeof iframe.srcdoc === 'string' && iframe.srcdoc.trim().length > 0;
      },
      { timeout: 30000 },
    );

    const iframeHtml = await page.$eval('#previewIframe', (el) => el.srcdoc || '');

    result.ok = iframeHtml.trim().length > 0;
    result.iframeSummary = {
      length: iframeHtml.length,
      hasTable: /<table[\s>]/i.test(iframeHtml),
      hasPre: /<pre[\s>]/i.test(iframeHtml),
      hasCode: /<code[\s>]/i.test(iframeHtml),
    };

    if (!result.ok) {
      result.reason = 'preview iframe srcdoc was empty';
    }

    // Save a snapshot of the iframe HTML and a page screenshot for debugging.
    await writeFile(resolve(artifactDir, 'preview_iframe.html'), iframeHtml, 'utf8');
    await page.screenshot({ path: resolve(artifactDir, 'converter-preview.png'), fullPage: true });

    console.log('Preview iframe summary:', result.iframeSummary);
    console.log('Screenshot saved to', resolve(artifactDir, 'converter-preview.png'));
  } catch (err) {
    result.ok = false;
    result.reason = err?.message || String(err);
    console.error('Converter preview UI smoke failed:', result.reason);
  } finally {
    await browser.close();
  }

  await writeFile(resolve(artifactDir, 'summary.json'), JSON.stringify(result, null, 2), 'utf8');

  if (!result.ok) {
    process.exitCode = 1;
  } else {
    console.log('✅ Converter preview UI smoke passed');
  }
}

main().catch((err) => {
  console.error('ui_smoke_converter_preview.mjs crashed:', err);
  process.exit(1);
});

