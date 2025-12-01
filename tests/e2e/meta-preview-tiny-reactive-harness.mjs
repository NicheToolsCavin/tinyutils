#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Meta Preview (scaffold)
//
// This script drives a minimal happy-path flow for the Meta Preview
// tool through a running tiny-reactive HTTP API.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error('meta-preview tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.');
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'meta-preview', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, fillField, clickButton, waitForSelector, waitForNonEmptyTable, getText, screenshot } = client;
  const meta = tools.metaPreview;

  const summary = {
    tool: 'meta-preview',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${meta.path}`;

    // 1) Navigate to Meta Preview page
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    // 2) Wait for the URL input
    await waitForSelector(meta.selectors.urlInput, 30000);
    summary.steps.push({ step: 'wait-input' });

    // 3) Fill a simple URL
    await fillField(meta.selectors.urlInput, 'https://example.com/');
    summary.steps.push({ step: 'fill-url' });

    // 4) Click Preview
    await clickButton(meta.selectors.runButton);
    summary.steps.push({ step: 'click-preview' });

    // 5) Wait for the results table to appear with at least one row
    await waitForNonEmptyTable(meta.selectors.resultsTable, 'empty-cell', 60000);
    summary.steps.push({ step: 'wait-results' });

    // 6) Capture the extracted title cell text
    const titleText = await getText(meta.selectors.titleCell).catch(() => null);
    summary.title = titleText || null;
    summary.ok = !!titleText;

    // 7) Capture a screenshot
    const screenshotPath = resolve(artifactDir, 'meta-preview-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(
      resolve(artifactDir, 'meta-preview-preview.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    if (!summary.ok) {
      console.error('meta-preview tiny-reactive harness: flow did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('meta-preview tiny-reactive harness: Meta Preview flow OK');
      console.log('Summary written to', resolve(artifactDir, 'meta-preview-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'meta-preview-preview.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('meta-preview tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('meta-preview tiny-reactive harness crashed:', err);
  process.exit(1);
});

