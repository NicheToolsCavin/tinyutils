#!/usr/bin/env node
// Tiny-reactive UI checks for data-tools pages (pdf-text-extractor and json-to-csv upload readiness).

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';
const ARTIFACT_DIR = resolve(process.env.ARTIFACT_DIR || 'artifacts/ui/data-tools');

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error('data-tools tiny-reactive: PREVIEW_URL, TINY_REACTIVE_BASE_URL, TINY_REACTIVE_TOKEN required');
  process.exit(2);
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, waitForSelector, screenshot } = client;

  const summary = { ok: true, steps: [] };

  // PDF Text Extractor
  const pdfUrl = `${PREVIEW_URL}${tools.pdfTextExtractor.path}`;
  await openTool(pdfUrl);
  summary.steps.push({ tool: 'pdf-text-extractor', step: 'open', url: pdfUrl });
  await waitForSelector(tools.pdfTextExtractor.selectors.uploadInput, 30000);
  summary.steps.push({ tool: 'pdf-text-extractor', step: 'wait-upload' });
  const pdfShot = resolve(ARTIFACT_DIR, 'pdf-text-extractor.png');
  await screenshot(pdfShot, { fullPage: true });
  summary.pdfShot = pdfShot;

  // JSON↔CSV (json_to_csv page)
  const jsonUrl = `${PREVIEW_URL}${tools.jsonToCsv.path}`;
  await openTool(jsonUrl);
  summary.steps.push({ tool: 'json-to-csv', step: 'open', url: jsonUrl });
  await waitForSelector(tools.jsonToCsv.selectors.uploadInput, 30000);
  summary.steps.push({ tool: 'json-to-csv', step: 'wait-upload' });
  const jsonShot = resolve(ARTIFACT_DIR, 'json-to-csv.png');
  await screenshot(jsonShot, { fullPage: true });
  summary.jsonShot = jsonShot;

  await writeFile(resolve(ARTIFACT_DIR, 'data-tools-ui.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('data-tools tiny-reactive UI: OK');
}

main().catch((err) => {
  console.error('data-tools tiny-reactive UI failed:', err?.message || err);
  process.exit(1);
});
