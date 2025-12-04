#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Sitemap Delta (scaffold)
//
// This script drives a minimal happy-path flow for the Sitemap Delta
// tool through a running tiny-reactive HTTP API.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';
import { patchExportDownloads, validateExport } from './harness/export-validator.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error('sitemap-delta tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.');
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'sitemap-delta', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const {
    openTool,
    clickButton,
    waitForSelector,
    waitForNonEmptyTable,
    screenshot,
    getText,
  } = client;
  const sitemap = tools.sitemapDelta;

  const summary = {
    tool: 'sitemap-delta',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${sitemap.path}`;

    // 1) Navigate to Sitemap Delta page
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    // 2) Wait for the Load demo button
    await waitForSelector(sitemap.selectors.loadDemoButton, 30000);
    summary.steps.push({ step: 'wait-load-demo' });

    // 3) Click Load demo to populate sitemaps
    await clickButton(sitemap.selectors.loadDemoButton);
    summary.steps.push({ step: 'click-load-demo' });

    // 4) Click Run diff
    await clickButton(sitemap.selectors.runButton);
    summary.steps.push({ step: 'click-run-diff' });

    // 5) Wait for the mappings table to have at least one non-empty row
    await waitForNonEmptyTable(sitemap.selectors.mapTable, 'empty-cell', 120000);
    summary.steps.push({ step: 'wait-mappings' });

    // 6) Capture the summary line text
    const summaryLine = await getText(sitemap.selectors.summaryLine);
    summary.summaryLine = summaryLine || null;
    const baseOk = !!summaryLine;

    // 7) Capture a screenshot
    const screenshotPath = resolve(artifactDir, 'sitemap-delta-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    // 8) Validate CSV/JSON exports using the shared export validator. This
    // relies on the same CSV/JSON payloads that real users download; we
    // never stub rows or simulate fake data.
    await patchExportDownloads(client, '__sitemapExportMeta');

    const csvResult = await validateExport(
      client,
      'button.btn.secondary:nth-of-type(1)',
      '__sitemapExportMeta',
      /\.csv\|/i,
      /url|removed|added/i,
    );
    summary.exportCsv = csvResult;

    const jsonResult = await validateExport(
      client,
      'button.btn.secondary:nth-of-type(2)',
      '__sitemapExportMeta',
      /\.json\|/i,
      /"meta"|"rows"|"tool"/i,
    );
    summary.exportJson = jsonResult;

    summary.ok = baseOk && csvResult.ok && jsonResult.ok;

    await writeFile(
      resolve(artifactDir, 'sitemap-delta-preview.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    if (!summary.ok) {
      console.error('sitemap-delta tiny-reactive harness: flow did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('sitemap-delta tiny-reactive harness: Sitemap Delta flow OK');
      console.log('Summary written to', resolve(artifactDir, 'sitemap-delta-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'sitemap-delta-preview.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('sitemap-delta tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('sitemap-delta tiny-reactive harness crashed:', err);
  process.exit(1);
});
