#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness (scaffold)
//
// This script is intentionally minimal: it drives a single converter
// happy-path preview flow through a running tiny-reactive HTTP API,
// using the data-testids already present on the page.
//
// Environment contract (kept simple for CI friendliness):
//   - PREVIEW_URL: base preview URL, e.g. https://tinyutils.net
//   - TINY_REACTIVE_BASE_URL: e.g. http://localhost:7779
//   - TINY_REACTIVE_TOKEN: HTTP API token for tiny-reactive
//
// It emits a small JSON summary and a screenshot path under
//   artifacts/ui/converter/<YYYYMMDD>/converter-preview.json|png

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error('tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.');
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'converter', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, fillField, clickButton, waitForIframeText, screenshot, getText } = client;
  const converter = tools.converter;

  const summary = {
    tool: 'converter',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${converter.path}`;

    // 1) Navigate to converter page
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    // 2) Fill textarea with a small markdown snippet
    await fillField(converter.selectors.textInput, '# Tiny-reactive preview\n\nHello from E2E harness.');
    summary.steps.push({ step: 'fill-text' });

    // 3) Click Preview button
    await clickButton(converter.selectors.previewButton);
    summary.steps.push({ step: 'click-preview' });

    // 4) Wait for preview iframe to receive content
    await waitForIframeText(converter.selectors.previewIframe, 30000);
    summary.steps.push({ step: 'wait-preview' });

    // 5) Get a bit of text out of the preview header to assert we are on the right page
    const headerText = await getText(converter.selectors.previewHeader);

    summary.header = headerText;
    summary.ok = !!summary.header;

    // 6) Capture a screenshot via tiny-reactive
    const screenshotPath = resolve(artifactDir, 'converter-preview.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(resolve(artifactDir, 'converter-preview.json'), JSON.stringify(summary, null, 2), 'utf8');

    if (!summary.ok) {
      console.error('tiny-reactive harness: converter preview flow did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('tiny-reactive harness: converter preview flow OK');
      console.log('Summary written to', resolve(artifactDir, 'converter-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(resolve(artifactDir, 'converter-preview.error.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.error('tiny-reactive harness: error during converter flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('tiny-reactive harness crashed:', err);
  process.exit(1);
});
