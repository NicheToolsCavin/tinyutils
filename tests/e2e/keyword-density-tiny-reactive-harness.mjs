#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Keyword Density (scaffold)
//
// This script drives a minimal happy-path flow for the Keyword Density
// tool through a running tiny-reactive HTTP API.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error('keyword-density tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.');
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'keyword-density', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, fillField, clickButton, waitForSelector, waitForNonEmptyTable, getText, screenshot } = client;
  const kd = tools.keywordDensity;

  const summary = {
    tool: 'keyword-density',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${kd.path}`;

    // 1) Navigate to Keyword Density page
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    // 2) Wait for the text input
    await waitForSelector(kd.selectors.textInput, 30000);
    summary.steps.push({ step: 'wait-input' });

    // 3) Fill in a small sample of text
    const sample = 'Apple banana apple banana orange apple';
    await fillField(kd.selectors.textInput, sample);
    summary.steps.push({ step: 'fill-text' });

    // 4) Click Analyze
    await clickButton(kd.selectors.analyzeButton);
    summary.steps.push({ step: 'click-analyze' });

    // 5) Wait for the results table to have at least one non-empty row
    await waitForNonEmptyTable(kd.selectors.resultsTable, 'empty-cell', 60000);
    summary.steps.push({ step: 'wait-results' });

    // 6) Capture the top keyword term (first row, first cell)
    const topTerm = await getText(`${kd.selectors.resultsTable} tbody tr:first-child td:first-child`).catch(() => null);
    summary.topTerm = topTerm || null;
    summary.ok = !!topTerm;

    // 7) Capture a screenshot
    const screenshotPath = resolve(artifactDir, 'keyword-density-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(
      resolve(artifactDir, 'keyword-density-preview.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    if (!summary.ok) {
      console.error('keyword-density tiny-reactive harness: flow did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('keyword-density tiny-reactive harness: Keyword Density flow OK');
      console.log('Summary written to', resolve(artifactDir, 'keyword-density-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'keyword-density-preview.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('keyword-density tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('keyword-density tiny-reactive harness crashed:', err);
  process.exit(1);
});

