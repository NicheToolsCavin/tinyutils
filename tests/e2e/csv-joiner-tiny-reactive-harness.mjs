#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for CSV Joiner (Tier0)
//
// This flow only verifies that the CSV Joiner UI loads and
// shows the upload zone and step heading. It does not attempt
// real file uploads or joining.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient, preflightBypass } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error(
    'csv-joiner tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.',
  );
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'csv-joiner', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, waitForSelector, getText, screenshot } = client;
  const csvJoiner = tools.csvJoiner;

  const summary = {
    tool: 'csv-joiner',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
    heading: null,
  };

  try {
    await preflightBypass(PREVIEW_URL);
    const toolUrl = `${PREVIEW_URL}${csvJoiner.path}`;
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    // Wait for the upload input to be present as a proxy for the main UI.
    await waitForSelector(csvJoiner.selectors.uploadInput, 30000);
    summary.steps.push({ step: 'wait-upload-input' });

    const headingText = await getText(csvJoiner.selectors.stepHeading).catch(() => null);
    summary.heading = headingText || null;
    summary.ok = !!headingText && headingText.includes('Upload two files');

    const screenshotPath = resolve(artifactDir, 'csv-joiner-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(resolve(artifactDir, 'csv-joiner-preview.json'), JSON.stringify(summary, null, 2), 'utf8');

    if (!summary.ok) {
      console.error('csv-joiner tiny-reactive harness: UI did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('csv-joiner tiny-reactive harness: CSV Joiner UI flow OK');
      console.log('Summary written to', resolve(artifactDir, 'csv-joiner-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'csv-joiner-preview.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('csv-joiner tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('csv-joiner tiny-reactive harness crashed:', err);
  process.exit(1);
});
