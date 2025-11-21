#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PREVIEW_URL = process.env.PREVIEW_URL;
const BYPASS_TOKEN =
  process.env.BYPASS_TOKEN || process.env.PREVIEW_BYPASS_TOKEN || process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
if (!PREVIEW_URL) {
  console.log('⚠️  PREVIEW_URL not set - skipping headless preview fallback.');
  console.log('   Set PREVIEW_URL to capture preview screenshots.');
  process.exit(0); // Exit gracefully with success code
}
if (!BYPASS_TOKEN) {
  console.error('Bypass token is required (set BYPASS_TOKEN, PREVIEW_BYPASS_TOKEN, or VERCEL_AUTOMATION_BYPASS_SECRET).');
  process.exit(1);
}

const base = PREVIEW_URL.replace(/\/$/, '');
const artifactDir = resolve('artifacts', 'agent-mode', new Date().toISOString().slice(0, 10).replace(/-/g, ''), 'headless-preview');
const headers = {
  'x-vercel-protection-bypass': BYPASS_TOKEN,
  'x-vercel-bypass-token': BYPASS_TOKEN,
  'x-vercel-set-bypass-cookie': 'true',
  Cookie: `vercel-protection-bypass=${BYPASS_TOKEN}`,
};

async function fetchWithBypass(path) {
  const res = await fetch(`${base}${path}`, { headers, method: 'GET' });
  const text = await res.text();
  return { status: res.status, text };
}

async function preflight() {
  try {
    await fetchWithBypass('/?x-vercel-set-bypass-cookie=true');
  } catch (error) {
    console.warn('Preflight warning:', error.message);
  }
}

(async () => {
  await mkdir(artifactDir, { recursive: true });
  await preflight();
  const paths = ['/', '/tools/', '/tools/text-converter/'];
  const summary = { preview: base, timestamp: new Date().toISOString(), results: [] };

  for (const path of paths) {
    try {
      const { status, text } = await fetchWithBypass(path);
      const fileName = path === '/' ? 'root.html' : path.replace(/\//g, '-').replace(/^-|-$/g, '') + '.html';
      await writeFile(resolve(artifactDir, fileName), text, 'utf-8');
      const lower = text.toLowerCase();
      summary.results.push({
        path,
        status,
        assertions: {
          converterTitle: /<title>.*tinyutils/iu.test(text),
          pdfText: lower.includes('pdf'),
          rtfText: lower.includes('rtf'),
          converterToggle: lower.includes('convert'),
        },
      });
    } catch (error) {
      summary.results.push({ path, status: 'error', error: error.message });
    }
  }
  await writeFile(resolve(artifactDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  console.log('Headless preview summary saved to', artifactDir);
})();
