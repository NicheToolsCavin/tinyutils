// Tiny-Reactive UI sanity for converter fail-soft banners on large CSV/JSON.
//
// Usage:
//   TINY_REACTIVE_URL=http://127.0.0.1:5566 node scripts/ui_smoke_converter_fail_soft.mjs
//
// Features:
//   - Drives the Text Converter via tiny-reactive
//   - Feeds large CSV/JSON payloads
//   - Asserts that fail-soft/truncation banners appear and the page stays responsive

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import smoke-utils from tiny-reactive
const utilsPath = resolve(__dirname, '../../../playwrightwrap/examples/smoke-utils.mjs');
let smokeUtils;
try {
  const utilsUrl = `file://${utilsPath}`;
  smokeUtils = await import(utilsUrl);
} catch {
  // Fallback to inline minimal implementation if smoke-utils not available
  console.warn('⚠️  smoke-utils.mjs not found, using fallback implementation');
  smokeUtils = {
    createResilientClient: async (opts) => ({
      mode: 'tiny-reactive',
      trUrl: opts.trUrl || process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566',
      cmd: async (body) => {
        const res = await fetch(`${opts.trUrl || process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566'}/cmd`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.error?.message || 'Command failed');
        return payload;
      }
    }),
    outputStructuredResult: (result, format) => {
      if (format === 'json') console.log(JSON.stringify(result));
      else console.log(Object.entries(result).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', '));
    }
  };
}

const { createResilientClient, outputStructuredResult } = smokeUtils;

function generateLargeCSV(rows) {
  let csv = 'Name,Age,City,Country\n';
  for (let i = 0; i < rows; i += 1) {
    csv += `User${i},${20 + (i % 50)},City${i % 100},Country${i % 25}\n`;
  }
  return csv;
}

function generateLargeJSON(objects) {
  const data = [];
  for (let i = 0; i < objects; i += 1) {
    data.push({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      meta: { index: i, flag: i % 2 === 0 }
    });
  }
  return JSON.stringify(data, null, 2);
}

async function testLargeCSV(client) {
  const base = process.env.TINYUTILS_BASE || 'https://tinyutils.net';
  const toolUrl = `${base}/tools/text-converter/`;
  const artifactDir = process.env.ARTIFACT_DIR || './.debug';
  const screenshotPath = `${artifactDir}/converter-fail-soft-csv.png`;

  await client.cmd({
    id: 'open-csv',
    cmd: 'open',
    args: { url: toolUrl, waitUntil: 'networkidle' },
    target: { contextId: 'default', pageId: 'active' }
  });

  await client.cmd({
    id: 'ready-csv',
    cmd: 'waitFor',
    args: {
      selector: '#textInput',
      state: 'visible',
      retryCount: 2,
      retryDelayMs: 1000
    }
  });

  const largeCSV = generateLargeCSV(10000);

  await client.cmd({
    id: 'fill-csv',
    cmd: 'fill',
    args: { selector: '#textInput', value: largeCSV }
  });

  await client.cmd({
    id: 'preview-csv',
    cmd: 'click',
    args: { selector: '#previewBtn' }
  });

  await client.cmd({
    id: 'wait-preview-csv',
    cmd: 'waitFor',
    args: {
      selector: '#previewPanel',
      state: 'visible',
      timeout: 30000
    }
  });

  const bannerText = await client.cmd({
    id: 'banner-csv',
    cmd: 'evaluate',
    args: {
      js: `() => {
        const el = document.getElementById('previewStatusBanner');
        if (!el || el.hidden) return '';
        return (el.textContent || '').trim();
      }`
    }
  });

  const iframeLength = await client.cmd({
    id: 'iframe-csv',
    cmd: 'evaluate',
    args: {
      js: `() => {
        const iframe = document.getElementById('previewIframe');
        return iframe && typeof iframe.srcdoc === 'string' ? iframe.srcdoc.length : 0;
      }`
    }
  });

  await client.cmd({
    id: 'screen-csv',
    cmd: 'screenshot',
    args: { pathOrBase64: screenshotPath, fullPage: true }
  });

  const text = String(bannerText.data?.result || '');
  const triggeredFailSoft =
    /Preview truncated/i.test(text) ||
    /Preview simplified/i.test(text) ||
    /rows/i.test(text);

  return {
    screenshot: screenshotPath,
    data: {
      url: toolUrl,
      bannerText: text,
      iframeLength: iframeLength.data?.result || 0,
      triggeredFailSoft
    }
  };
}

async function testLargeJSON(client) {
  const base = process.env.TINYUTILS_BASE || 'https://tinyutils.net';
  const toolUrl = `${base}/tools/text-converter/`;
  const artifactDir = process.env.ARTIFACT_DIR || './.debug';
  const screenshotPath = `${artifactDir}/converter-fail-soft-json.png`;

  await client.cmd({
    id: 'open-json',
    cmd: 'open',
    args: { url: toolUrl, waitUntil: 'networkidle' },
    target: { contextId: 'default', pageId: 'active' }
  });

  await client.cmd({
    id: 'ready-json',
    cmd: 'waitFor',
    args: {
      selector: '#textInput',
      state: 'visible',
      retryCount: 2,
      retryDelayMs: 1000
    }
  });

  const largeJSON = generateLargeJSON(5000);

  await client.cmd({
    id: 'fill-json',
    cmd: 'fill',
    args: { selector: '#textInput', value: largeJSON }
  });

  await client.cmd({
    id: 'preview-json',
    cmd: 'click',
    args: { selector: '#previewBtn' }
  });

  await client.cmd({
    id: 'wait-preview-json',
    cmd: 'waitFor',
    args: {
      selector: '#previewPanel',
      state: 'visible',
      timeout: 30000
    }
  });

  const bannerText = await client.cmd({
    id: 'banner-json',
    cmd: 'evaluate',
    args: {
      js: `() => {
        const el = document.getElementById('previewStatusBanner');
        if (!el || el.hidden) return '';
        return (el.textContent || '').trim();
      }`
    }
  });

  const iframeLength = await client.cmd({
    id: 'iframe-json',
    cmd: 'evaluate',
    args: {
      js: `() => {
        const iframe = document.getElementById('previewIframe');
        return iframe && typeof iframe.srcdoc === 'string' ? iframe.srcdoc.length : 0;
      }`
    }
  });

  await client.cmd({
    id: 'screen-json',
    cmd: 'screenshot',
    args: { pathOrBase64: screenshotPath, fullPage: true }
  });

  const text = String(bannerText.data?.result || '');
  const triggeredFailSoft =
    /Preview simplified/i.test(text) ||
    /Preview truncated/i.test(text) ||
    /structure/i.test(text);

  return {
    screenshot: screenshotPath,
    data: {
      url: toolUrl,
      bannerText: text,
      iframeLength: iframeLength.data?.result || 0,
      triggeredFailSoft
    }
  };
}

// Run with structured output
const config = {
  tool: 'converter-fail-soft',
  outputFormat: process.env.OUTPUT_FORMAT || 'json',
  clientOptions: {
    trUrl: process.env.TINY_REACTIVE_URL,
    fallbackMode: 'error'
  }
};

const startTime = Date.now();
const result = {
  tool: 'converter-fail-soft',
  status: 'unknown',
  durationMs: 0,
  error: null,
  screenshots: [],
  data: {}
};

try {
  const client = await createResilientClient(config.clientOptions);

  console.log('Testing large CSV fail-soft behaviour via tiny-reactive…');
  const csvResult = await testLargeCSV(client);
  result.screenshots.push(csvResult.screenshot);
  result.data.csv = csvResult.data;

  console.log('Testing large JSON fail-soft behaviour via tiny-reactive…');
  const jsonResult = await testLargeJSON(client);
  result.screenshots.push(jsonResult.screenshot);
  result.data.json = jsonResult.data;

  result.status = csvResult.data.triggeredFailSoft && jsonResult.data.triggeredFailSoft ? 'pass' : 'fail';
} catch (error) {
  result.status = 'fail';
  result.error = error.message;
} finally {
  result.durationMs = Date.now() - startTime;
}

outputStructuredResult(result, config.outputFormat);
process.exit(result.status === 'pass' ? 0 : 1);
