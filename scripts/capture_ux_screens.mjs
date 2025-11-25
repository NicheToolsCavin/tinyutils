#!/usr/bin/env node
// Capture PNG screenshots of key TinyUtils SvelteKit routes.
// Usage:
//   node scripts/capture_ux_screens.mjs [dateSlug]
//
// By default, hits http://localhost:4174 and writes PNGs under
//   artifacts/sveltekit-ux/<dateSlug>/{home,tools,converter,dlf,sd,wbf}.png
// where <dateSlug> defaults to today's YYYYMMDD if not provided.

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.UX_BASE_URL || 'http://localhost:4174';

// Allow overriding the date slug via CLI arg; default to today.
const argSlug = process.argv[2];
const today = new Date();
const defaultSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const dateSlug = argSlug && argSlug.trim() ? argSlug.trim() : defaultSlug;

const artifactDir = resolve('artifacts', 'sveltekit-ux', dateSlug);

const routes = [
  { path: '/', name: 'home' },
  { path: '/tools/', name: 'tools' },
  { path: '/tools/text-converter/', name: 'converter' },
  { path: '/tools/dead-link-finder/', name: 'dlf' },
  { path: '/tools/sitemap-delta/', name: 'sd' },
  { path: '/tools/wayback-fixer/', name: 'wbf' },
];

async function main() {
  console.log(`📸 Starting UX capture against ${BASE_URL} → ${artifactDir}`);
  await mkdir(artifactDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });

    for (const { path, name } of routes) {
      const url = `${BASE_URL.replace(/\/$/, '')}${path}`;
      const outPath = resolve(artifactDir, `${name}.png`);
      console.log(`→ Capturing ${url} → ${outPath}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        // Small extra delay to let animations settle a bit. Puppeteer v23
        // dropped page.waitForTimeout(), so use a plain Promise here.
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await page.screenshot({ path: outPath, fullPage: true });
      } catch (err) {
        console.error(`Failed to capture ${url}:`, err?.message || err);
      }
    }

    console.log('✅ UX screenshots captured under', artifactDir);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('capture_ux_screens.mjs failed:', err);
  process.exit(1);
});
