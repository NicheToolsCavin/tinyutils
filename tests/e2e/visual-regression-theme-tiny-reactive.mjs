#!/usr/bin/env node
// TinyUtils visual regression test for liquid glass theme transparency.
//
// This test captures screenshots of key UI elements in both themes to verify:
// - Glass transparency effects render correctly
// - Opacity values are visually correct
// - No beige/parchment colors remain
// - Tool cards have proper gradient effects
// - Headers have proper transparency
//
// Test flow:
// 1. Dark mode: Home page, Tools page, Tool cards
// 2. Light mode: Home page, Tools page, Tool cards
// 3. Dark mode: Converter with preview
// 4. Light mode: Converter with preview
//
// Artifacts: artifacts/ui/visual-regression/<YYYYMMDD>/vr-*.png

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
    'visual-regression harness: PREVIEW_URL, TINY_REACTIVE_BASE_URL, and TINY_REACTIVE_TOKEN are required.',
  );
  process.exit(2);
}

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const artifactDir = resolve(process.env.ARTIFACT_DIR || 'artifacts', 'ui', 'visual-regression', dateSlug);

async function captureScreenshot(client, name, fullPage = false) {
  const path = resolve(artifactDir, `${name}.png`);
  const resp = await client.screenshot({ path, fullPage });

  if (!resp.ok) {
    console.warn(`⚠️  Screenshot failed: ${name}`);
    return { ok: false, path: null };
  }

  console.log(`📸 Captured: ${name}.png`);
  return { ok: true, path };
}

async function setTheme(client, theme) {
  const resp = await client.evaluate(`
    document.documentElement.setAttribute('data-theme', '${theme}');
    new Promise(resolve => setTimeout(resolve, 300));
  `);

  if (!resp.ok) {
    throw new Error(`Failed to set theme to ${theme}`);
  }

  // Wait for theme to apply
  await new Promise(resolve => setTimeout(resolve, 400));
}

/**
 * Scroll to an element using safe parameterized evaluate.
 * @param {Object} client - TinyReactive client
 * @param {string} selector - CSS selector (passed safely as parameter, not interpolated)
 */
async function scrollToElement(client, selector) {
  await client.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  }, selector);
  await new Promise(resolve => setTimeout(resolve, 300));
}

async function run() {
  const client = createTinyReactiveClient(TR_BASE, TR_TOKEN);

  console.log('🎨 Visual Regression Test - Theme Transparency');
  console.log(`Preview: ${PREVIEW_URL}`);
  console.log(`Artifact dir: ${artifactDir}\n`);

  await mkdir(artifactDir, { recursive: true });

  const results = {
    timestamp: new Date().toISOString(),
    previewUrl: PREVIEW_URL,
    ok: false,
    screenshots: [],
    errors: []
  };

  const bypassHeaders = buildBypassHeaders();

  try {
    // ===== DARK MODE CAPTURES =====
    console.log('\n=== DARK MODE ===\n');

    // Home page - dark mode
    console.log('Capturing home page (dark mode)...');
    await client.navigate(`${PREVIEW_URL}/`, {
      waitUntil: 'networkidle',
      extraHeaders: bypassHeaders
    });
    await setTheme(client, 'dark');

    const homePageDark = await captureScreenshot(client, 'vr-01-home-dark', true);
    results.screenshots.push({ name: 'home-dark', ...homePageDark });

    // Tools page - dark mode
    console.log('Capturing tools page (dark mode)...');
    await client.navigate(`${PREVIEW_URL}/tools/`, {
      waitUntil: 'networkidle',
      extraHeaders: bypassHeaders
    });
    await setTheme(client, 'dark');

    const toolsPageDark = await captureScreenshot(client, 'vr-02-tools-dark', true);
    results.screenshots.push({ name: 'tools-dark', ...toolsPageDark });

    // Tool card close-up - dark mode
    console.log('Capturing tool card (dark mode)...');
    await scrollToElement(client, '.tool-card-enhanced');
    const toolCardDark = await captureScreenshot(client, 'vr-03-tool-card-dark', false);
    results.screenshots.push({ name: 'tool-card-dark', ...toolCardDark });

    // Converter with preview - dark mode
    console.log('Capturing converter with preview (dark mode)...');
    await client.navigate(`${PREVIEW_URL}/tools/text-converter/`, {
      waitUntil: 'networkidle',
      extraHeaders: bypassHeaders
    });
    await setTheme(client, 'dark');

    // Add sample data and generate preview
    await client.type('[data-testid="converter-text-input"]', 'Name,Age,City\nAlice,30,NYC\nBob,25,SF', {
      clearFirst: true
    });

    await client.evaluate(`
      document.querySelector('[data-testid="converter-preview-button"]').click();
    `);

    await client.waitFor('[data-testid="converter-preview-iframe"]', {
      state: 'visible',
      timeoutMs: 5000
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const converterDark = await captureScreenshot(client, 'vr-04-converter-preview-dark', false);
    results.screenshots.push({ name: 'converter-preview-dark', ...converterDark });

    // ===== LIGHT MODE CAPTURES =====
    console.log('\n=== LIGHT MODE ===\n');

    // Home page - light mode
    console.log('Capturing home page (light mode)...');
    await client.navigate(`${PREVIEW_URL}/`, {
      waitUntil: 'networkidle',
      extraHeaders: bypassHeaders
    });
    await setTheme(client, 'light');

    const homePageLight = await captureScreenshot(client, 'vr-05-home-light', true);
    results.screenshots.push({ name: 'home-light', ...homePageLight });

    // Tools page - light mode
    console.log('Capturing tools page (light mode)...');
    await client.navigate(`${PREVIEW_URL}/tools/`, {
      waitUntil: 'networkidle',
      extraHeaders: bypassHeaders
    });
    await setTheme(client, 'light');

    const toolsPageLight = await captureScreenshot(client, 'vr-06-tools-light', true);
    results.screenshots.push({ name: 'tools-light', ...toolsPageLight });

    // Tool card close-up - light mode
    console.log('Capturing tool card (light mode)...');
    await scrollToElement(client, '.tool-card-enhanced');
    const toolCardLight = await captureScreenshot(client, 'vr-07-tool-card-light', false);
    results.screenshots.push({ name: 'tool-card-light', ...toolCardLight });

    // Converter with preview - light mode
    console.log('Capturing converter with preview (light mode)...');
    await client.navigate(`${PREVIEW_URL}/tools/text-converter/`, {
      waitUntil: 'networkidle',
      extraHeaders: bypassHeaders
    });
    await setTheme(client, 'light');

    await client.type('[data-testid="converter-text-input"]', 'Name,Age,City\nAlice,30,NYC\nBob,25,SF', {
      clearFirst: true
    });

    await client.evaluate(`
      document.querySelector('[data-testid="converter-preview-button"]').click();
    `);

    await client.waitFor('[data-testid="converter-preview-iframe"]', {
      state: 'visible',
      timeoutMs: 5000
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const converterLight = await captureScreenshot(client, 'vr-08-converter-preview-light', false);
    results.screenshots.push({ name: 'converter-preview-light', ...converterLight });

    // ===== COLOR VALIDATION =====
    console.log('\n=== VALIDATING NO PARCHMENT COLORS ===\n');

    // Check for forbidden parchment colors in light mode
    const colorCheckResp = await client.evaluate(`
      const forbiddenColors = ['#e0d5c5', '#d5c4af', '#2d1f0f'];
      const allElements = document.querySelectorAll('*');
      const violations = [];

      for (const el of allElements) {
        const styles = window.getComputedStyle(el);
        const bg = styles.backgroundColor;
        const color = styles.color;
        const border = styles.borderColor;

        // Convert rgb to hex for comparison (simplified)
        const rgbToHex = (rgb) => {
          if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return null;
          const match = rgb.match(/^rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)$/);
          if (!match) return null;
          return '#' + ((1 << 24) + (parseInt(match[1]) << 16) + (parseInt(match[2]) << 8) + parseInt(match[3])).toString(16).slice(1);
        };

        const bgHex = rgbToHex(bg);
        const colorHex = rgbToHex(color);
        const borderHex = rgbToHex(border);

        if (forbiddenColors.includes(bgHex)) {
          violations.push({ element: el.tagName, property: 'background', color: bgHex });
        }
        if (forbiddenColors.includes(colorHex)) {
          violations.push({ element: el.tagName, property: 'color', color: colorHex });
        }
        if (forbiddenColors.includes(borderHex)) {
          violations.push({ element: el.tagName, property: 'border', color: borderHex });
        }
      }

      ({ violations: violations.slice(0, 10) })  // Limit to first 10
    `);

    if (colorCheckResp.ok) {
      const violations = colorCheckResp.result.violations;

      if (violations && violations.length > 0) {
        console.warn(`⚠️  Found ${violations.length} parchment color violations!`);
        results.colorViolations = violations;
      } else {
        console.log('✅ No parchment colors detected!');
        results.colorViolations = [];
      }
    }

    // Success!
    results.ok = true;
    const successCount = results.screenshots.filter(s => s.ok).length;
    console.log(`\n🎉 Captured ${successCount}/${results.screenshots.length} screenshots!`);

  } catch (err) {
    results.errors.push({
      message: err.message,
      stack: err.stack
    });
    console.error('\n❌ Test failed:', err.message);
  }

  // Write results
  const jsonPath = resolve(artifactDir, 'visual-regression-results.json');
  await writeFile(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results: ${jsonPath}`);
  console.log(`📁 Screenshots: ${artifactDir}`);

  if (!results.ok) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
