#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Bulk PDF Text Extractor (Tier0)
//
// Verifies that the PDF Text Extractor UI loads and exposes the
// ZIP upload control and the main "Download text files" button.
// Does not attempt real file uploads or extraction.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error(
    'pdf-text-extractor tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.',
  );
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'pdf-text-extractor', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, waitForSelector, getText, screenshot } = client;
  const pdfTool = tools.pdfTextExtractor;

  const summary = {
    tool: 'pdf-text-extractor',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
    runButtonLabel: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${pdfTool.path}`;
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    await waitForSelector(pdfTool.selectors.uploadInput, 30000);
    summary.steps.push({ step: 'wait-upload-input' });

    await waitForSelector(pdfTool.selectors.runButton, 30000);
    summary.steps.push({ step: 'wait-run-button' });

    const label = await getText(pdfTool.selectors.runButton).catch(() => null);
    summary.runButtonLabel = label || null;
    summary.ok = !!label && /download/i.test(label);

    const screenshotPath = resolve(artifactDir, 'pdf-text-extractor-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(
      resolve(artifactDir, 'pdf-text-extractor-preview.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    if (!summary.ok) {
      console.error('pdf-text-extractor tiny-reactive harness: UI did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('pdf-text-extractor tiny-reactive harness: UI flow OK');
      console.log('Summary written to', resolve(artifactDir, 'pdf-text-extractor-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'pdf-text-extractor-preview.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('pdf-text-extractor tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('pdf-text-extractor tiny-reactive harness crashed:', err);
  process.exit(1);
});

