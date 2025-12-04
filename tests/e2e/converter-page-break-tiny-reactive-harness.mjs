#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Converter page-break markers validation.
//
// This script tests the converter's ability to process documents with page breaks
// and section breaks, verifying that content is preserved in the correct sequence.
//
// It writes a JSON summary and screenshot under:
//   artifacts/ui/converter/<YYYYMMDD>/converter-page-break.json|.png

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createTinyReactiveClient, preflightBypass } from './harness/client.mjs';

const BYPASS_TOKEN = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  || process.env.PREVIEW_BYPASS_TOKEN
  || process.env.BYPASS_TOKEN;
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';

function buildBypassHeaders() {
  const headers = {};
  if (BYPASS_TOKEN) {
    headers['x-vercel-protection-bypass'] = BYPASS_TOKEN;
    headers['x-vercel-set-bypass-cookie'] = 'true';
    headers.Cookie = `vercel-protection-bypass=${BYPASS_TOKEN}`;
  }
  if (PREVIEW_SECRET) {
    headers['x-preview-secret'] = PREVIEW_SECRET;
  }
  return headers;
}

// Decode base64 data: URI if present
function decodeDataHref(href) {
  if (!href || !href.startsWith('data:')) return null;
  const [, encoded] = href.split(',', 2);
  if (!encoded) return null;
  const buf = Buffer.from(encoded, 'base64');
  return buf.toString('utf8');
}

import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error(
    'converter-page-break tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.',
  );
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const baseArtifactDir = process.env.ARTIFACT_DIR || resolve('artifacts', 'ui', 'converter', dateSlug);
const artifactDir = resolve(baseArtifactDir);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, fillField, clickButton, waitForSelector, screenshot, trCmd, getText } = client;
  const converter = tools.converter;

  const MARKER = 'PAGE-BREAK-TEST';
  const BEFORE_BREAK = 'BREAK-BEFORE-001';
  const AFTER_BREAK = 'BREAK-AFTER-001';
  const SECTION_BEFORE = 'SECTION-CONT-BEFORE-001';
  const SECTION_AFTER = 'SECTION-CONT-AFTER-001';

  const summary = {
    tool: 'converter',
    flow: 'page-break-markers',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
    markers: {
      before: false,
      after: false,
      sectionBefore: false,
      sectionAfter: false,
      sequenceCorrect: false,
    },
    contentPreserved: false,
  };

  try {
    await preflightBypass(PREVIEW_URL);
    const toolUrl = `${PREVIEW_URL}${converter.path}`;
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    const convertSelector = converter.selectors.convertButton || '#convertBtn';
    const resultsTableSelector = converter.selectors.resultsTable || '#results';

    // Ensure critical controls are present
    await waitForSelector(converter.selectors.textInput, 30000);
    summary.steps.push({ step: 'wait-text-input' });

    await waitForSelector(convertSelector, 30000);
    summary.steps.push({ step: 'wait-convert-button' });

    // Fill text area with content containing page break markers
    const pageBreakContent = `# Page Break Test Document

This is content before the page break marked with ${BEFORE_BREAK}.

---

This line should appear after the break marker marked with ${MARKER}-MID-001.

---

This is content after the page break marked with ${AFTER_BREAK}.

## Section Break Test
This is content in the first section marked with ${SECTION_BEFORE}.

This continues the first section.

---

This is content in the next section marked with ${SECTION_AFTER}.

This continues the second section.

## Multiple Break Test
First section with ${MARKER}-MULTI-1-001.

---

Second section with ${MARKER}-MULTI-2-001.

---

Third section with ${MARKER}-MULTI-3-001.`;

    await trCmd({
      id: 'fill-text',
      cmd: 'fill',
      args: { selector: converter.selectors.textInput, value: pageBreakContent },
    });
    summary.steps.push({ step: 'fill-page-break-text' });

    // Click Convert
    await clickButton(convertSelector);
    summary.steps.push({ step: 'click-convert' });

    // Wait for the results table to contain at least one non-placeholder row
    await trCmd({
      id: 'wait-converter-results',
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const table = document.querySelector(${JSON.stringify(resultsTableSelector)});
          if (!table) return false;
          const tbody = table.querySelector('tbody');
          if (!tbody) return false;
          const rows = Array.from(tbody.querySelectorAll('tr'));
          if (!rows.length) return false;
          if (rows.length === 1 && rows[0].id === 'resultsEmptyRow') return false;
          return true;
        }`,
        timeout: 120000,
      },
    });
    summary.steps.push({ step: 'wait-results-table' });

    // Read the first real result row: Format, Filename, Download column
    const formatText = await getText('#results tbody tr:first-child td:nth-child(1)').catch(() => null);
    const filenameText = await getText('#results tbody tr:first-child td:nth-child(2)').catch(() => null);
    const downloadText = await getText('#results tbody tr:first-child td:nth-child(4)').catch(() => null);

    // Also fetch the hrefs for downloads to validate content markers
    const hrefs = await trCmd({
      id: 'grab-hrefs',
      cmd: 'evaluate',
      args: {
        js: `() => {
          const rows = document.querySelectorAll('#results tbody tr');
          if (!rows.length) return [];
          const first = rows[0];
          const links = first.querySelectorAll('a');
          return Array.from(links).map((a) => ({ href: a.getAttribute('href') || '', text: a.textContent || '' }));
        }`,
        args: {},
      },
    }).then((r) => r?.data?.value || []).catch(() => []);

    // Try to extract content from the first download to check for markers
    if (hrefs.length) {
      try {
        const text = await fetchHrefText(PREVIEW_URL, hrefs[0].href);
        if (text) {
          // Check for page break markers in the converted content
          summary.markers.before = new RegExp(BEFORE_BREAK).test(text);
          summary.markers.after = new RegExp(AFTER_BREAK).test(text);
          summary.markers.sectionBefore = new RegExp(SECTION_BEFORE).test(text);
          summary.markers.sectionAfter = new RegExp(SECTION_AFTER).test(text);
          
          // Check sequence: BEFORE_BREAK should appear before AFTER_BREAK
          const beforePos = text.indexOf(BEFORE_BREAK);
          const afterPos = text.indexOf(AFTER_BREAK);
          const sectionBeforePos = text.indexOf(SECTION_BEFORE);
          const sectionAfterPos = text.indexOf(SECTION_AFTER);
          
          summary.markers.sequenceCorrect = 
            (beforePos >= 0 && afterPos >= 0 && beforePos < afterPos) &&
            (sectionBeforePos >= 0 && sectionAfterPos >= 0 && sectionBeforePos < sectionAfterPos);
            
          summary.contentPreserved = 
            summary.markers.before && 
            summary.markers.after && 
            summary.markers.sectionBefore && 
            summary.markers.sectionAfter && 
            summary.markers.sequenceCorrect;
        }
      } catch (err) {
        summary.error = `marker check failed: ${err?.message || err}`;
      }
    }

    const hasFormat = !!(formatText && formatText.trim().length > 0);
    const trimmedFilename = (filenameText || '').trim();
    const hasFilename = trimmedFilename.length > 0;
    const plausibleExt = /\.[A-Za-z0-9]{2,8}$/.test(trimmedFilename);
    const hasDownloadLabel = !!(downloadText && /download/i.test(downloadText));
    const markersPresent = summary.contentPreserved;

    summary.ok = hasFormat && hasFilename && plausibleExt && hasDownloadLabel && markersPresent;

    const screenshotPath = resolve(artifactDir, 'converter-page-break.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(resolve(artifactDir, 'converter-page-break.json'), JSON.stringify(summary, null, 2), 'utf8');

    if (!summary.ok) {
      console.error(
        'converter-page-break tiny-reactive harness: Page break markers flow did not reach expected state',
      );
      process.exitCode = 1;
    } else {
      console.log('converter-page-break tiny-reactive harness: Page break markers flow OK');
      console.log('Summary written to', resolve(artifactDir, 'converter-page-break.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'converter-page-break.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('converter-page-break tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

// Helper function to fetch text from href
async function fetchHrefText(baseUrl, href) {
  if (!href) return null;
  if (href.startsWith('data:')) {
    const [, encoded] = href.split(',', 2);
    if (!encoded) return null;
    const buf = Buffer.from(encoded, 'base64');
    return buf.toString('utf8');
  }
  const url = href.startsWith('http') ? href : `${baseUrl}${href}`;
  const res = await fetch(url, { headers: buildBypassHeaders(), redirect: 'follow' });
  const ct = res.headers.get('content-type') || '';
  if (ct.startsWith('text/') || ct.includes('json') || ct.includes('markdown')) {
    return await res.text();
  }
  // Try to decode docx/odt quickly as text (best-effort: might be binary)
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString('utf8');
}

main().catch((err) => {
  console.error('converter-page-break tiny-reactive harness crashed:', err);
  process.exit(1);
});
