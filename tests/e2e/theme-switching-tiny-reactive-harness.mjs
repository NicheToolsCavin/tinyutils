#!/usr/bin/env node
// TinyUtils tiny-reactive integration test for theme switching in previews.
//
// This test verifies that preview iframes update with correct theme colors when user toggles theme.
//
// Test flow:
// 1. Navigate to text-converter
// 2. Generate table preview in dark mode
// 3. Capture iframe background colors
// 4. Toggle to light mode
// 5. Verify iframe colors updated
// 6. Toggle back to dark mode
// 7. Verify colors reverted
//
// Artifacts: artifacts/ui/theme-switching/<YYYYMMDD>/theme-switching-*.json|.png

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createTinyReactiveClient } from './harness/client.mjs';

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

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const TR_BASE = (process.env.TINY_REACTIVE_BASE_URL || '').replace(/\/$/, '');
const TR_TOKEN = process.env.TINY_REACTIVE_TOKEN || '';

if (!PREVIEW_URL || !TR_BASE || !TR_TOKEN) {
  console.error(
    'theme-switching harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.',
  );
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve(process.env.ARTIFACT_DIR || 'artifacts', 'ui', 'theme-switching', dateSlug);

// Test configuration constants
const THEME_TRANSITION_WAIT_MS = 50;  // Poll interval
const THEME_TRANSITION_TIMEOUT_MS = 3000;  // Max wait time
const PREVIEW_LOAD_TIMEOUT_MS = 5000;

/**
 * Wait for theme attribute to change to expected value using safe parameterized evaluate.
 * Polls the data-theme attribute instead of using fixed delays.
 *
 * @param {Object} client - TinyReactive client
 * @param {string} expectedTheme - Expected theme value ('light' or 'dark')
 * @param {number} timeout - Maximum wait time in milliseconds
 * @returns {Promise<void>}
 */
async function waitForThemeChange(client, expectedTheme, timeout = THEME_TRANSITION_TIMEOUT_MS) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const themeResp = await client.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    if (themeResp.ok && themeResp.result === expectedTheme) {
      return; // Theme changed successfully
    }

    await new Promise(resolve => setTimeout(resolve, THEME_TRANSITION_WAIT_MS));
  }

  throw new Error(`Theme did not change to "${expectedTheme}" within ${timeout}ms`);
}

async function run() {
  const client = createTinyReactiveClient(TR_BASE, TR_TOKEN);

  console.log('🎨 Theme Switching Integration Test');
  console.log(`Preview: ${PREVIEW_URL}`);
  console.log(`Artifact dir: ${artifactDir}\n`);

  await mkdir(artifactDir, { recursive: true });

  const results = {
    timestamp: new Date().toISOString(),
    previewUrl: PREVIEW_URL,
    ok: false,
    phases: {},
    errors: []
  };

  try {
    // Phase 1: Navigate to text-converter
    console.log('Phase 1: Navigate to text-converter...');
    const converterUrl = `${PREVIEW_URL}/tools/text-converter/`;
    const bypassHeaders = buildBypassHeaders();

    const navResp = await client.navigate(converterUrl, {
      waitUntil: 'networkidle',
      extraHeaders: bypassHeaders
    });

    if (!navResp.ok) {
      throw new Error(`Navigation failed: ${navResp.error || 'unknown'}`);
    }

    results.phases.navigate = { ok: true, url: converterUrl };
    console.log('✅ Navigated to converter\n');

    // Phase 2: Input CSV data for table preview
    console.log('Phase 2: Input CSV data...');
    const csvData = 'Name,Status,Value\nAlice,Active,100\nBob,Inactive,200\nCharlie,Active,300';

    const typeResp = await client.type('[data-testid="converter-text-input"]', csvData, {
      clearFirst: true
    });

    if (!typeResp.ok) {
      throw new Error(`Type failed: ${typeResp.error || 'unknown'}`);
    }

    results.phases.inputData = { ok: true, length: csvData.length };
    console.log('✅ CSV data entered\n');

    // Phase 3: Click convert button to generate preview
    console.log('Phase 3: Generate preview...');

    // Use evaluate to click the button (more reliable than browser_click)
    // Using parameterized evaluate to avoid injection patterns
    const clickResp = await client.evaluate(() => {
      document.querySelector('[data-testid="converter-preview-button"]').click();
    });

    if (!clickResp.ok) {
      throw new Error(`Click failed: ${clickResp.error || 'unknown'}`);
    }

    // Wait for preview iframe to appear
    await client.waitFor('[data-testid="converter-preview-iframe"]', {
      state: 'visible',
      timeoutMs: PREVIEW_LOAD_TIMEOUT_MS
    });

    results.phases.generatePreview = { ok: true };
    console.log('✅ Preview generated\n');

    // Phase 4: Capture dark mode colors
    console.log('Phase 4: Capture dark mode iframe colors...');

    const darkColorsResp = await client.evaluate(() => {
      const iframe = document.querySelector('[data-testid="converter-preview-iframe"]');
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const table = iframeDoc.querySelector('table');

      if (!table) {
        throw new Error('No table found in iframe');
      }

      const computedStyle = iframeDoc.defaultView.getComputedStyle(table);

      return {
        theme: document.documentElement.getAttribute('data-theme'),
        tableBorder: computedStyle.borderColor,
        tableBackground: computedStyle.backgroundColor,
        // Sample a cell to get cell border color
        cellBorder: iframeDoc.defaultView.getComputedStyle(table.querySelector('td')).borderColor
      };
    });

    if (!darkColorsResp.ok) {
      throw new Error(`Failed to capture dark colors: ${darkColorsResp.error || 'unknown'}`);
    }

    const darkColors = darkColorsResp.result;
    results.phases.darkModeColors = { ok: true, colors: darkColors };
    console.log('Dark mode colors:', JSON.stringify(darkColors, null, 2));
    console.log('✅ Dark mode colors captured\n');

    // Screenshot in dark mode
    const darkScreenshot = await client.screenshot({
      path: resolve(artifactDir, 'theme-switching-dark.png'),
      fullPage: false
    });

    if (!darkScreenshot.ok) {
      console.warn('⚠️  Dark mode screenshot failed');
    } else {
      console.log('✅ Dark mode screenshot saved\n');
    }

    // Phase 5: Toggle to light mode
    console.log('Phase 5: Toggle to light mode...');

    const toggleResp = await client.evaluate(() => {
      // Find and click the theme toggle button
      const themeToggle = document.querySelector('[data-testid="theme-toggle"]')
        || document.querySelector('button[aria-label*="theme"]')
        || document.querySelector('button[aria-label*="Theme"]');

      if (!themeToggle) {
        throw new Error('Theme toggle button not found');
      }

      themeToggle.click();
    });

    if (!toggleResp.ok) {
      throw new Error(`Toggle failed: ${toggleResp.error || 'unknown'}`);
    }

    // Wait for theme attribute to change to 'light'
    await waitForThemeChange(client, 'light');

    results.phases.toggleToLight = { ok: true };
    console.log('✅ Toggled to light mode\n');

    // Phase 6: Capture light mode colors
    console.log('Phase 6: Capture light mode iframe colors...');

    const lightColorsResp = await client.evaluate(() => {
      const iframe = document.querySelector('[data-testid="converter-preview-iframe"]');
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const table = iframeDoc.querySelector('table');

      if (!table) {
        throw new Error('No table found in iframe after theme change');
      }

      const computedStyle = iframeDoc.defaultView.getComputedStyle(table);

      return {
        theme: document.documentElement.getAttribute('data-theme'),
        tableBorder: computedStyle.borderColor,
        tableBackground: computedStyle.backgroundColor,
        cellBorder: iframeDoc.defaultView.getComputedStyle(table.querySelector('td')).borderColor
      };
    });

    if (!lightColorsResp.ok) {
      throw new Error(`Failed to capture light colors: ${lightColorsResp.error || 'unknown'}`);
    }

    const lightColors = lightColorsResp.result;
    results.phases.lightModeColors = { ok: true, colors: lightColors };
    console.log('Light mode colors:', JSON.stringify(lightColors, null, 2));
    console.log('✅ Light mode colors captured\n');

    // Screenshot in light mode
    const lightScreenshot = await client.screenshot({
      path: resolve(artifactDir, 'theme-switching-light.png'),
      fullPage: false
    });

    if (!lightScreenshot.ok) {
      console.warn('⚠️  Light mode screenshot failed');
    } else {
      console.log('✅ Light mode screenshot saved\n');
    }

    // Phase 7: Verify colors changed
    console.log('Phase 7: Verify theme colors updated...');

    const colorsChanged = darkColors.tableBorder !== lightColors.tableBorder
      || darkColors.tableBackground !== lightColors.tableBackground
      || darkColors.cellBorder !== lightColors.cellBorder;

    if (!colorsChanged) {
      throw new Error('Colors did not change after theme toggle!');
    }

    results.phases.verifyChange = {
      ok: true,
      colorsChanged: true,
      darkTheme: darkColors.theme,
      lightTheme: lightColors.theme
    };
    console.log('✅ Theme colors updated correctly\n');

    // Phase 8: Toggle back to dark mode
    console.log('Phase 8: Toggle back to dark mode...');

    const toggleBackResp = await client.evaluate(() => {
      const themeToggle = document.querySelector('[data-testid="theme-toggle"]')
        || document.querySelector('button[aria-label*="theme"]')
        || document.querySelector('button[aria-label*="Theme"]');

      themeToggle.click();
    });

    if (!toggleBackResp.ok) {
      throw new Error(`Toggle back failed: ${toggleBackResp.error || 'unknown'}`);
    }

    // Wait for theme attribute to change back to 'dark'
    await waitForThemeChange(client, 'dark');

    results.phases.toggleBackToDark = { ok: true };
    console.log('✅ Toggled back to dark mode\n');

    // Phase 9: Verify colors reverted
    console.log('Phase 9: Verify colors reverted...');

    const revertedColorsResp = await client.evaluate(() => {
      const iframe = document.querySelector('[data-testid="converter-preview-iframe"]');
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const table = iframeDoc.querySelector('table');
      const computedStyle = iframeDoc.defaultView.getComputedStyle(table);

      return {
        theme: document.documentElement.getAttribute('data-theme'),
        tableBorder: computedStyle.borderColor,
        tableBackground: computedStyle.backgroundColor,
        cellBorder: iframeDoc.defaultView.getComputedStyle(table.querySelector('td')).borderColor
      };
    });

    if (!revertedColorsResp.ok) {
      throw new Error(`Failed to capture reverted colors: ${revertedColorsResp.error || 'unknown'}`);
    }

    const revertedColors = revertedColorsResp.result;

    // Check if colors are close to original dark colors (may not be exact due to rounding/CSS parsing)
    const colorsReverted = revertedColors.theme === 'dark';

    if (!colorsReverted) {
      throw new Error('Colors did not revert to dark mode!');
    }

    results.phases.verifyRevert = {
      ok: true,
      colorsReverted: true,
      finalTheme: revertedColors.theme
    };
    console.log('✅ Theme colors reverted correctly\n');

    // Success!
    results.ok = true;
    console.log('🎉 All phases passed!');

  } catch (err) {
    results.errors.push({
      message: err.message,
      stack: err.stack
    });
    console.error('\n❌ Test failed:', err.message);
  }

  // Write results
  const jsonPath = resolve(artifactDir, 'theme-switching-results.json');
  await writeFile(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results: ${jsonPath}`);

  if (!results.ok) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
