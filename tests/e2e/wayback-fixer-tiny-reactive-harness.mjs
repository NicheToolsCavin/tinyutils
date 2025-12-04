#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Wayback Fixer (scaffold)
//
// This script drives a minimal happy-path flow for the Wayback Fixer
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
  console.error('wayback-fixer tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.');
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'wayback-fixer', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const {
    openTool,
    fillField,
    clickButton,
    waitForSelector,
    waitForNonEmptyTable,
    screenshot,
    getText,
  } = client;
  const wayback = tools.waybackFixer;

  const summary = {
    tool: 'wayback-fixer',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${wayback.path}`;

    // 1) Navigate to Wayback Fixer page
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    // 2) Wait for the Load demo button and Run button
    await waitForSelector(wayback.selectors.loadDemoButton, 30000);
    await waitForSelector(wayback.selectors.runButton, 30000);
    summary.steps.push({ step: 'wait-ui' });

    // 3) Click Load demo to populate URLs
    await clickButton(wayback.selectors.loadDemoButton);
    summary.steps.push({ step: 'click-load-demo' });

    // 4) Optionally ensure the textarea is non-empty (best-effort)
    const urlsText = await getText(wayback.selectors.urlsInput).catch(() => null);
    summary.demoUrlsVisible = !!urlsText;

    // 5) Click Run
    await clickButton(wayback.selectors.runButton);
    summary.steps.push({ step: 'click-run' });

    // 6) Wait for the results table to have at least one non-empty row
    await waitForNonEmptyTable(wayback.selectors.resultsTable, 'empty', 180000);
    summary.steps.push({ step: 'wait-results' });

    // 7) Capture the status/meta text
    const statusText = await getText(wayback.selectors.statusText).catch(() => null);
    summary.status = statusText || null;
    const statusOk = !!statusText && /Done\./i.test(statusText || '') && /snapshot|replacements|redirects/i.test(statusText || '');

    // 8) Validate Replacements CSV and 410 CSV exports using the shared
    // export validator. As with other harnesses, we assert against real
    // blob contents produced by the UI, never fake rows.
    await patchExportDownloads(client, '__waybackExportMeta');

    const replacementsResult = await validateExport(
      client,
      '.export-row .btn.secondary:nth-of-type(1)',
      '__waybackExportMeta',
      /replacements.*\.csv\|/i,
      /url|snapshot|replacement/i,
    );
    summary.exportReplacements = replacementsResult;

    const csv410Result = await validateExport(
      client,
      '.export-row .btn.secondary:nth-of-type(2)',
      '__waybackExportMeta',
      /410.*\.csv\|/i,
      /410|url|reason/i,
    );
    summary.export410 = csv410Result;

    summary.ok = statusOk && replacementsResult.ok && csv410Result.ok;

    // 8) Capture a screenshot
    const screenshotPath = resolve(artifactDir, 'wayback-fixer-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(
      resolve(artifactDir, 'wayback-fixer-preview.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    if (!summary.ok) {
      console.error('wayback-fixer tiny-reactive harness: flow did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('wayback-fixer tiny-reactive harness: Wayback Fixer flow OK');
      console.log('Summary written to', resolve(artifactDir, 'wayback-fixer-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'wayback-fixer-preview.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('wayback-fixer tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('wayback-fixer tiny-reactive harness crashed:', err);
  process.exit(1);
});
