#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for JSON ↔ CSV Converter (Tier0)
//
// This flow verifies that the JSON↔CSV page loads and exposes the
// upload input and convert button. It does not attempt real file
// uploads or conversions.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error(
    'json-to-csv tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.',
  );
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'json-to-csv', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, waitForSelector, getText, screenshot } = client;
  const jsonToCsv = tools.jsonToCsv;

  const summary = {
    tool: 'json-to-csv',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
    convertButtonLabel: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${jsonToCsv.path}`;
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    await waitForSelector(jsonToCsv.selectors.uploadInput, 30000);
    summary.steps.push({ step: 'wait-upload-input' });

    await waitForSelector(jsonToCsv.selectors.convertButton, 30000);
    summary.steps.push({ step: 'wait-convert-button' });

    const buttonText = await getText(jsonToCsv.selectors.convertButton).catch(() => null);
    summary.convertButtonLabel = buttonText || null;
    summary.ok = !!buttonText && /download/i.test(buttonText);

    const screenshotPath = resolve(artifactDir, 'json-to-csv-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(
      resolve(artifactDir, 'json-to-csv-preview.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    if (!summary.ok) {
      console.error('json-to-csv tiny-reactive harness: UI did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('json-to-csv tiny-reactive harness: JSON↔CSV UI flow OK');
      console.log('Summary written to', resolve(artifactDir, 'json-to-csv-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'json-to-csv-preview.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('json-to-csv tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('json-to-csv tiny-reactive harness crashed:', err);
  process.exit(1);
});

