#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Multi-File Search & Replace (Tier0)
//
// Tier0 scope: only verifies that the page loads and primary
// controls are present. It does not perform real uploads or
// diff preview; those belong in higher-tier flows.

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient, applyPreviewBypassIfNeeded } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error('multi-file-search-replace tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.');
  process.exit(2);
}

async function main() {
  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, waitForSelector, screenshot } = client;
  const { path, selectors } = tools.multiFileSearchReplace;

  const url = PREVIEW_URL + path;

  // Apply preview bypass cookies in the browser context BEFORE navigation
  await applyPreviewBypassIfNeeded(client, PREVIEW_URL);

  await openTool(url);

  await waitForSelector(selectors.page, 15000);
  await waitForSelector(selectors.uploadZone, 15000);
  await waitForSelector(selectors.findInput, 15000);
  await waitForSelector(selectors.replaceInput, 15000);
  await waitForSelector(selectors.previewButton, 15000);

  const screenshotDir = resolve('artifacts/ui/multi-file-search-replace');
  await mkdir(screenshotDir, { recursive: true });
  const screenshotPath = resolve(screenshotDir, 'multi-file-search-replace-tier0.png');
  await screenshot(screenshotPath, { fullPage: true });

  console.log('multi-file-search-replace tiny-reactive harness: PASS');
}

main().catch((err) => {
  console.error('multi-file-search-replace tiny-reactive harness crashed:', err);
  process.exit(1);
});
