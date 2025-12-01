#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Sitemap Generator (Tier0)
//
// Verifies that the Sitemap Generator UI loads and exposes the
// main heading, base URL input, paths textarea, and build button.
// Does not attempt real sitemap generation or downloads.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error(
    'sitemap-generator tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.',
  );
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'sitemap-generator', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, waitForSelector, getText, screenshot } = client;
  const sg = tools.sitemapGenerator;

  const summary = {
    tool: 'sitemap-generator',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
    heading: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${sg.path}`;
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    await waitForSelector(sg.selectors.heading, 30000);
    summary.steps.push({ step: 'wait-heading' });

    await waitForSelector(sg.selectors.baseUrlInput, 30000);
    summary.steps.push({ step: 'wait-base-url' });

    await waitForSelector(sg.selectors.pathsTextarea, 30000);
    summary.steps.push({ step: 'wait-paths-textarea' });

    await waitForSelector(sg.selectors.buildButton, 30000);
    summary.steps.push({ step: 'wait-build-button' });

    const headingText = await getText(sg.selectors.heading).catch(() => null);
    summary.heading = headingText || null;
    summary.ok = !!headingText && /sitemap generator/i.test(headingText);

    const screenshotPath = resolve(artifactDir, 'sitemap-generator-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(
      resolve(artifactDir, 'sitemap-generator-preview.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    if (!summary.ok) {
      console.error('sitemap-generator tiny-reactive harness: UI did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('sitemap-generator tiny-reactive harness: UI flow OK');
      console.log('Summary written to', resolve(artifactDir, 'sitemap-generator-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'sitemap-generator-preview.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('sitemap-generator tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('sitemap-generator tiny-reactive harness crashed:', err);
  process.exit(1);
});

