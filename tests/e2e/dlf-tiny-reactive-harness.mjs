#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Dead Link Finder (scaffold)
//
// This script drives a minimal happy-path flow for the Dead Link Finder
// tool through a running tiny-reactive HTTP API.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient, preflightBypass } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error('dlf tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.');
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'dead-link-finder', dateSlug);

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
    trCmd,
  } = client;
  const dlf = tools.deadLinkFinder;

  const summary = {
    tool: 'dead-link-finder',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${dlf.path}?debug=1`;

    // 1) Navigate to Dead Link Finder page
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    // 2) Wait for the Run button to be present
    await waitForSelector(dlf.selectors.runButton, 30000);
    summary.steps.push({ step: 'wait-run-button' });

    // 3) Fill a simple page URL
    await fillField(dlf.selectors.pageUrlInput, 'https://example.com/');
    summary.steps.push({ step: 'fill-page-url' });

    // 4) Click Run
    await clickButton(dlf.selectors.runButton);
    summary.steps.push({ step: 'click-run' });

    // 5) Wait for results table to have at least one non-empty row
    await waitForNonEmptyTable(dlf.selectors.resultsTable, 'empty-cell', 120000);
    summary.steps.push({ step: 'wait-results' });

    // 6) Capture a short summary line text if present
    const summaryLine = await getText('#summary');
    summary.summaryLine = summaryLine || null;
    const pageFlowOk = !!summaryLine;

    // 7) Capture a screenshot for the single-page crawl
    const screenshotPath = resolve(artifactDir, 'dlf-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    // 8) Run a second flow in list mode (Page URL empty, list textarea populated)
    const listUrls = [
      'https://example.com/',
      'https://example.com/missing',
    ].join('\n');

    await fillField(dlf.selectors.pageUrlInput, '');
    summary.steps.push({ step: 'clear-page-url-for-list-mode' });

    const listInputSelector = dlf.selectors.listInput || '#targetsInput';
    await fillField(listInputSelector, listUrls);
    summary.steps.push({ step: 'fill-list-urls' });

    await clickButton(dlf.selectors.runButton);
    summary.steps.push({ step: 'click-run-list-mode' });

    await waitForNonEmptyTable(dlf.selectors.resultsTable, 'empty-cell', 120000);
    summary.steps.push({ step: 'wait-results-list-mode' });

    // Ensure Export CSV is enabled before clicking (sanity for exports wiring)
    const exportCsvSelector = dlf.selectors.exportCsvButton || '#exportCsv';
    await trCmd({
      id: 'wait-export-csv-enabled',
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const btn = document.querySelector(${JSON.stringify(exportCsvSelector)});
          return !!btn && !btn.disabled;
        }`,
        timeout: 30000,
      },
    });
    summary.steps.push({ step: 'wait-export-csv-enabled' });

    await clickButton(exportCsvSelector);
    summary.steps.push({ step: 'click-export-csv' });

    const listSummaryLine = await getText('#summary');
    summary.listModeSummaryLine = listSummaryLine || null;

    const listFlowOk = !!listSummaryLine;
    summary.ok = pageFlowOk && listFlowOk;

    await writeFile(resolve(artifactDir, 'dlf-preview.json'), JSON.stringify(summary, null, 2), 'utf8');

    if (!summary.ok) {
      console.error('dlf tiny-reactive harness: flow did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('dlf tiny-reactive harness: Dead Link Finder flow OK');
      console.log('Summary written to', resolve(artifactDir, 'dlf-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(resolve(artifactDir, 'dlf-preview.error.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.error('dlf tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('dlf tiny-reactive harness crashed:', err);
  process.exit(1);
});
