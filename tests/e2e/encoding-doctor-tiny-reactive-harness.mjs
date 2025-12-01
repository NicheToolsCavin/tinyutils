#!/usr/bin/env node
// TinyUtils tiny-reactive UI E2E harness for Encoding Doctor (scaffold)
//
// This script drives a minimal happy-path flow for the Encoding Doctor
// tool through a running tiny-reactive HTTP API.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';
import { tools } from './harness/registry.mjs';

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error('encoding-doctor tiny-reactive harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.');
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve('artifacts', 'ui', 'encoding-doctor', dateSlug);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const client = createTinyReactiveClient({ baseUrl: TR_BASE, token: TR_TOKEN });
  const { openTool, fillField, clickButton, waitForSelector, getText, screenshot, trCmd } = client;
  const enc = tools.encodingDoctor;

  const summary = {
    tool: 'encoding-doctor',
    baseUrl: PREVIEW_URL,
    ok: false,
    steps: [],
    error: null,
    screenshot: null,
  };

  try {
    const toolUrl = `${PREVIEW_URL}${enc.path}`;

    // 1) Navigate to Encoding Doctor page
    await openTool(toolUrl);
    summary.steps.push({ step: 'open', url: toolUrl });

    // 2) Wait for the text input to be present
    await waitForSelector(enc.selectors.textInput, 30000);
    summary.steps.push({ step: 'wait-input' });

    // 3) Fill a small mojibake sample
    const sample = "FranÃ§ois dâ€™Arcy — rÃ©sumÃ©";
    await fillField(enc.selectors.textInput, sample);
    summary.steps.push({ step: 'fill-text' });

    // 4) Click Repair
    await clickButton(enc.selectors.runButton);
    summary.steps.push({ step: 'click-repair' });

    // 5) Wait for the "After" text to change from the placeholder
    await trCmd({
      id: 'wait-encoding-after',
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const el = document.querySelector(${JSON.stringify(enc.selectors.afterText)});
          if (!el) return false;
          const txt = (el.textContent || '').trim();
          if (!txt) return false;
          if (txt === '(no repaired output yet)') return false;
          return true;
        }`,
        timeout: 120000,
      },
    });
    summary.steps.push({ step: 'wait-after-text' });

    // 6) Capture the repaired text
    const afterText = await getText(enc.selectors.afterText).catch(() => null);
    summary.afterText = afterText || null;
    summary.ok = !!afterText;

    // 7) Capture a screenshot
    const screenshotPath = resolve(artifactDir, 'encoding-doctor-ui.png');
    await screenshot(screenshotPath, { fullPage: true });
    summary.screenshot = screenshotPath;

    await writeFile(
      resolve(artifactDir, 'encoding-doctor-preview.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    if (!summary.ok) {
      console.error('encoding-doctor tiny-reactive harness: flow did not reach expected state');
      process.exitCode = 1;
    } else {
      console.log('encoding-doctor tiny-reactive harness: Encoding Doctor flow OK');
      console.log('Summary written to', resolve(artifactDir, 'encoding-doctor-preview.json'));
      console.log('Screenshot at', screenshotPath);
    }
  } catch (err) {
    summary.ok = false;
    summary.error = err?.message || String(err);
    await mkdir(artifactDir, { recursive: true }).catch(() => {});
    await writeFile(
      resolve(artifactDir, 'encoding-doctor-preview.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('encoding-doctor tiny-reactive harness: error during flow:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('encoding-doctor tiny-reactive harness crashed:', err);
  process.exit(1);
});

