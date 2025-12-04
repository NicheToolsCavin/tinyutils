#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Formats page (Tier0)

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient, preflightBypass } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error('formats-page tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.');
  process.exit(2);
}

async function main() {
  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, waitForSelector, screenshot } = client;
  const { path, selectors } = tools.formatsPage;

  const url = PREVIEW_URL + path;
  await preflightBypass(url);
  await openTool(url);

  await waitForSelector(selectors.hero, 15000);
  await waitForSelector(selectors.inputsSection, 15000);
  await waitForSelector(selectors.outputsSection, 15000);
  await waitForSelector(selectors.openConverterButton, 15000);

  const screenshotDir = resolve('artifacts/ui/formats-page');
  await mkdir(screenshotDir, { recursive: true });
  const screenshotPath = resolve(screenshotDir, 'formats-page-tier0.png');
  await screenshot(screenshotPath, { fullPage: true });

  console.log('formats-page tiny-reactive harness: PASS');
}

main().catch((err) => {
  console.error('formats-page tiny-reactive harness crashed:', err);
  process.exit(1);
});
