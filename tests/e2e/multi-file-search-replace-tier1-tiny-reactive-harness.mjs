#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Multi-File Search & Replace (Tier1)
//
// Tier1 scope: drive a small end-to-end preview flow using a tiny ZIP
// fixture. The harness:
//   - Opens /tools/multi-file-search-replace/
//   - Injects a ZIP containing two files with TODO markers via the
//     mfsr test hook on the page
//   - Sets find/replace (TODO -> DONE)
//   - Clicks Preview
//   - Asserts stats and diff cards via mfsr-* data-testids
//
// This relies on the client-side test hook installed in
// src/routes/tools/multi-file-search-replace/+page.svelte:
//   window.__mfsrTestSetFileFromBase64(name, base64)

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient, applyPreviewBypassIfNeeded } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error(
    'multi-file-search-replace Tier1 tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.',
  );
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'multi-file-search-replace', dateSlug);

// Base64-encoded ZIP fixture containing:
//   src/app.js
//   docs/notes.md
// Each file has exactly two "TODO" markers.
const MFSR_TINY_ZIP_BASE64 =
  'UEsDBAoAAAAAAIUag1sAAAAAAAAAAAAAAAAEABwAc3JjL1VUCQADWZ4vaVmeL2l1eAsAAQT2AQAABBQAAABQSwMEFAAAAAgAhRqDW/PQ2cF/AAAAnwAAAAoAHABzcmMvYXBwLmpzVVQJAANZni9pWZ4vaXV4CwABBPYBAAAEFAAAAE2LMQrCQBBF+z3F76KNi63BSrEQJODmAkuYxMHdnbAz4vVNtLH68N773iNwnhPhGjDysqNU3C7hjp6p7mGk5rzHSYpFLgp7C/ru3CHH+qSqbrUrOKDSnOJAsAcrBsmZirlBihrUor0URzR/X3BZROUyNe23k0S7JNPmV29b9wFQSwMECgAAAAAAhRqDWwAAAAAAAAAAAAAAAAUAHABkb2NzL1VUCQADWZ4vaVmeL2l1eAsAAQT2AQAABBQAAABQSwMEFAAAAAgAhRqDW3owfWZeAAAAbgAAAA0AHABkb2NzL25vdGVzLm1kVVQJAANZni9pWZ4vaXV4CwABBPYBAAAEFAAAAE3LQQqEMAxG4X1O8cOsvYC7AXGngvYCVSIWYwNNxOtPcTXbx/c+GPplRmBzjOpsROFIhj0JI4opNs0eUzb4owhTN+GK5eRiLVHzhrbqUv/1FmGv8ZvVDy7/GpIy0w9QSwECHgMKAAAAAACFGoNbAAAAAAAAAAAAAAAABAAYAAAAAAAAABAA7UEAAAAAc3JjL1VUBQADWZ4vaXV4CwABBPYBAAAEFAAAAFBLAQIeAxQAAAAIAIUag1vz0NnBfwAAAJ8AAAAKABgAAAAAAAEAAACkgT4AAABzcmMvYXBwLmpzVVQFAANZni9pdXgLAAEE9gEAAAQUAAAAUEsBAh4DCgAAAAAAhRqDWwAAAAAAAAAAAAAAAAUAGAAAAAAAAAAQAO1BAQEAAGRvY3MvVVQFAANZni9pdXgLAAEE9gEAAAQUAAAAUEsBAh4DFAAAAAgAhRqDW3owfWZeAAAAbgAAAA0AGAAAAAAAAQAAAKSBQAEAAGRvY3Mvbm90ZXMubWRVVAUAA1meL2l1eAsAAQT2AQAABBQAAABQSwUGAAAAAAQABAA4AQAA5QEAAAAA';

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, fillField, clickButton, waitForSelector, screenshot, trCmd, getText } = client;
  const mfsr = tools.multiFileSearchReplace;

  const summary = {
    tool: 'multi-file-search-replace',
    flow: 'tier1-zip-preview',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
    stats: null,
    diffFilenames: [],
  };

  try {
    const toolUrl = `${PREVIEW_URL}${mfsr.path}`;

    // Apply preview bypass cookies in the browser context BEFORE navigation.
    // This is critical - without it, browser-side fetch() calls get 401.
    await applyPreviewBypassIfNeeded(client, PREVIEW_URL);
    summary.steps.push({ step: 'apply-cookies' });

    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    await waitForSelector(mfsr.selectors.page, 30000);
    summary.steps.push({ step: 'wait-page' });

    await waitForSelector(mfsr.selectors.uploadZone, 30000);
    summary.steps.push({ step: 'wait-upload-zone' });

    // Inject the ZIP fixture into the Svelte component via the test hook.
    const hookResult = await trCmd({
      id: 'mfsr-set-file',
      cmd: 'evaluate',
      args: {
        js: `(args) => {
          if (typeof window !== 'undefined' && window.__mfsrTestSetFileFromBase64) {
            window.__mfsrTestSetFileFromBase64(args.fileName, args.base64);
            return { ok: true };
          }
          return { ok: false, reason: 'missing_test_hook' };
        }`,
        args: { fileName: 'mfsr-tiny.zip', base64: MFSR_TINY_ZIP_BASE64 },
      },
    });
    summary.steps.push({ step: 'set-file-hook', result: hookResult?.data?.value ?? null });

    // Fill find/replace inputs
    await fillField(mfsr.selectors.findInput, 'TODO');
    summary.steps.push({ step: 'fill-find' });

    await fillField(mfsr.selectors.replaceInput, 'DONE');
    summary.steps.push({ step: 'fill-replace' });

    // Click Preview
    await clickButton(mfsr.selectors.previewButton);
    summary.steps.push({ step: 'click-preview' });

    // Wait for review section and stats to appear
    await waitForSelector(mfsr.selectors.reviewSection, 120000);
    summary.steps.push({ step: 'wait-review' });

    await waitForSelector(mfsr.selectors.statsFilesModified, 120000);
    summary.steps.push({ step: 'wait-stats' });

    // Debug aid: capture previewData snapshot from the page so we
    // can see what the backend actually returned on this preview.
    const previewDump = await trCmd({
      id: 'mfsr-preview-data',
      cmd: 'evaluate',
      args: {
        js: () => {
          const anyWin = window;
          const pd = anyWin.__mfsrLastPreview || null;
          if (!pd) return null;
          // Shallow copy with trimmed diffs to avoid huge payloads
          const diffs = Array.isArray(pd.diffs)
            ? pd.diffs.map((d) => ({
                filename: d.filename,
                matchCount: d.matchCount,
                diffSnippet: typeof d.diff === 'string' ? d.diff.slice(0, 200) : null,
              }))
            : [];
          return {
            hasPreviewData: !!pd,
            stats: pd.stats || null,
            diffs,
          };
        },
        args: {},
      },
    }).catch(() => null);

    summary.previewSnapshot = previewDump?.data?.value ?? null;

    // Helper to parse numeric counts from stat cards
    // We target the innermost number element inside each card to avoid
    // label text or whitespace confusing the parse.
    async function readCount(selector) {
      const result = await trCmd({
        id: 'mfsr-read-stat',
        cmd: 'evaluate',
        args: {
          js: (sel) => {
            const card = document.querySelector(sel);
            if (!card) return null;
            const num =
              card.querySelector('div.text-3xl') ||
              card.querySelector('div') ||
              card;
            const raw = (num.textContent || '').trim();
            const n = parseInt(raw, 10);
            if (Number.isNaN(n)) return null;
            return n;
          },
          args: selector,
        },
      }).catch(() => null);

      return result?.data?.value ?? null;
    }

    const filesScanned = await readCount(mfsr.selectors.statsFilesScanned);
    const filesModified = await readCount(mfsr.selectors.statsFilesModified);
    const totalMatches = await readCount(mfsr.selectors.statsTotalMatches);
    const filesSkipped = await readCount(mfsr.selectors.statsFilesSkipped);

    summary.stats = { filesScanned, filesModified, totalMatches, filesSkipped };

    // Wait for at least one diff item to appear, then collect metadata
    await waitForSelector(mfsr.selectors.diffItem, 120000).catch(() => {});
    summary.steps.push({ step: 'wait-diffs' });

    const diffResult = await trCmd({
      id: 'mfsr-diff-info',
      cmd: 'evaluate',
      args: {
        js: `() => {
          const items = Array.from(document.querySelectorAll('[data-testid="mfsr-diff-item"]'));
          return items.map((el) => ({
            filename: el.getAttribute('data-filename') || '',
            text: el.innerText || '',
          }));
        }`,
        args: {},
      },
    });

    const diffs = Array.isArray(diffResult?.data?.value) ? diffResult.data.value : [];
    summary.diffFilenames = diffs.map((d) => d.filename);

    const expectedStats = {
      filesScanned: 2,
      filesModified: 2,
      totalMatches: 4,
      filesSkipped: 0,
    };

    const statsOk =
      filesScanned === expectedStats.filesScanned &&
      filesModified === expectedStats.filesModified &&
      totalMatches === expectedStats.totalMatches &&
      filesSkipped === expectedStats.filesSkipped;

    const filenamesOk =
      diffs.length >= 2 &&
      summary.diffFilenames.includes('src/app.js') &&
      summary.diffFilenames.includes('docs/notes.md');

    const doneLinesOk = diffs.every((d) => typeof d.text === 'string' && d.text.includes('DONE'));

    summary.ok = statsOk && filenamesOk && doneLinesOk;

    const screenshotPath = resolve(artifactDir, 'multi-file-search-replace-tier1.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    const summaryPath = resolve(artifactDir, 'multi-file-search-replace-tier1.json');
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

    if (!summary.ok) {
      console.error(
        'multi-file-search-replace Tier1 tiny-reactive harness: flow did not reach expected state',
      );
      process.exitCode = 1;
    } else {
      console.log('multi-file-search-replace Tier1 tiny-reactive harness: flow OK');
      console.log('Summary written to', summaryPath);
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    const errorPath = resolve(artifactDir, 'multi-file-search-replace-tier1.error.json');
    await writeFile(errorPath, JSON.stringify(summary, null, 2), 'utf8');
    console.error(
      'multi-file-search-replace Tier1 tiny-reactive harness: error during flow:',
      summary.error,
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('multi-file-search-replace Tier1 tiny-reactive harness crashed:', err);
  process.exit(1);
});
