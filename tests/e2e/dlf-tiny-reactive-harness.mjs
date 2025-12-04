#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Dead Link Finder
//
// Tier0/Tier1 coverage:
//   - Page load and basic UI wiring
//   - Single-page crawl (Page URL only)
//   - List mode crawl (Page URL empty, list textarea populated)
//   - CSV/JSON export buttons wired to real downloads (via anchor click
//     instrumentation; no fake rows or stubbed payloads)

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient, applyPreviewBypassIfNeeded } from './harness/client.mjs';
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
    exportCsvMarker: null,
    exportJsonMarker: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${dlf.path}?debug=1`;

    // Ensure the tiny-reactive browser context is authenticated against
    // the protected preview before we rely on client-side fetch(/api/check).
    await applyPreviewBypassIfNeeded(client, PREVIEW_URL);

    // 1) Navigate to Dead Link Finder page
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    // Patch anchor downloads so we can assert that CSV/JSON exports
    // are wired to real blob downloads without changing production code.
    await trCmd({
      id: 'patch-export-downloads',
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          if (window.__dlfDownloadPatched) return true;
          try {
            window.__dlfDownloadPatched = true;
            const origClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function patchedClick() {
              try {
                if (this && this.download && this.href && this.href.startsWith('blob:')) {
                  const markerId = '__dlfLastExportMeta';
                  let el = document.getElementById(markerId);
                  if (!el) {
                    el = document.createElement('div');
                    el.id = markerId;
                    el.style.display = 'none';
                    document.body.appendChild(el);
                  }
                  const filename = this.download || '';
                  el.textContent = filename;
                  try {
                    fetch(this.href)
                      .then((r) => r.text())
                      .then((text) => {
                        const snippet = text ? String(text).slice(0, 200) : '';
                        el.textContent = filename + '|' + snippet;
                      })
                      .catch(() => {});
                  } catch (e) {
                    // best-effort only
                  }
                }
              } catch (e) {
                // ignore
              }
              return origClick.apply(this, arguments);
            };
          } catch (e) {
            // If patching fails we still don't want to block the flow.
          }
          return true;
        }`,
        timeout: 10000,
      },
    });

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

    const listSummaryLine = await getText('#summary');
    summary.listModeSummaryLine = listSummaryLine || null;
    const listFlowOk = !!listSummaryLine;

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

    // Click Export CSV and wait for our anchor-click instrumentation to
    // capture a filename + snippet marker from the real blob content.
    await clickButton(exportCsvSelector);
    summary.steps.push({ step: 'click-export-csv' });

    await trCmd({
      id: 'wait-export-csv-marker',
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const el = document.getElementById('__dlfLastExportMeta');
          return !!el && typeof el.textContent === 'string' && el.textContent.length > 0;
        }`,
        timeout: 30000,
      },
    });
    const csvMarker = await getText('#__dlfLastExportMeta').catch(() => null);
    summary.exportCsvMarker = csvMarker || null;
    const csvLooksReal = !!csvMarker && /\.csv\|/.test(csvMarker) && csvMarker.length > 16;

    // Now exercise Export JSON in the same session and capture a marker
    // from the JSON payload as well.
    const exportJsonSelector = '#exportJson';
    await trCmd({
      id: 'wait-export-json-enabled',
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const btn = document.querySelector(${JSON.stringify(exportJsonSelector)});
          return !!btn && !btn.disabled;
        }`,
        timeout: 30000,
      },
    });
    summary.steps.push({ step: 'wait-export-json-enabled' });

    await clickButton(exportJsonSelector);
    summary.steps.push({ step: 'click-export-json' });

    await trCmd({
      id: 'wait-export-json-marker',
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const el = document.getElementById('__dlfLastExportMeta');
          return !!el && typeof el.textContent === 'string' && el.textContent.includes('.json|');
        }`,
        timeout: 30000,
      },
    });
    const jsonMarker = await getText('#__dlfLastExportMeta').catch(() => null);
    summary.exportJsonMarker = jsonMarker || null;
    const jsonLooksReal = !!jsonMarker && jsonMarker.includes('.json|') && jsonMarker.includes('dead-link-finder');

    summary.ok = pageFlowOk && listFlowOk && csvLooksReal && jsonLooksReal;

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
