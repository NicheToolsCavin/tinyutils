// Tiny-Reactive UI sanity for Dead Link Finder.
// Upgraded to use new tiny-reactive features!
//
// Usage:
//   TINY_REACTIVE_URL=http://127.0.0.1:5566 node scripts/ui_smoke_dlf.mjs
//
// New features:
//   - Resilient connection with timeout
//   - Structured JSON/YAML output
//   - Artifact directory support
//   - Performance metrics

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
      else console.log(Object.entries(result).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(', '));
    }
  };
}

const { createResilientClient, outputStructuredResult } = smokeUtils;

async function testDLF(client) {
  const base = process.env.TINYUTILS_BASE || 'https://tinyutils.net';
  const toolUrl = `${base}/tools/dead-link-finder/?debug=1`;
  const artifactDir = process.env.ARTIFACT_DIR || './.debug';
  const screenshotPath = `${artifactDir}/dlf-ui.png`;

  // Navigate and wait for ready
  await client.cmd({
    id: 'open',
    cmd: 'open',
    args: { url: toolUrl, waitUntil: 'networkidle' },
    target: { contextId: 'default', pageId: 'active' }
  });

  // Wait for UI with retry logic (new feature!)
  await client.cmd({
    id: 'ready',
    cmd: 'waitFor',
    args: {
      selector: '#runBtn',
      state: 'visible',
      retryCount: 2,
      retryDelayMs: 1000
    }
  });

  // Consent banner removed in current UI; skip.

  // Type demo URL
  await client.cmd({
    id: 'type',
    cmd: 'type',
    args: { selector: '#pageUrl', text: 'wikipedia.com', delayMs: 30 }
  });

  // Run the tool
  await client.cmd({
    id: 'run',
    cmd: 'click',
    args: { selector: '#runBtn' }
  });

  // Wait for results table to populate (empty row has class "empty-cell")
  await client.cmd({
    id: 'wait-results',
    cmd: 'waitForFunction',
    args: {
      js: `() => {
        const tbody = document.querySelector('#results tbody');
        if (!tbody) return false;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        return rows.some((r) => !r.classList.contains('empty-cell'));
      }`,
      timeout: 120000,
      retryCount: 2,
      retryDelayMs: 2000
    }
  });

  // Screenshot with metadata (new feature!)
  const result = await client.cmd({
    id: 'screen',
    cmd: 'screenshot',
    args: { pathOrBase64: screenshotPath, fullPage: true }
  });

  return {
    screenshot: result.data.path,
    data: {
      url: toolUrl,
      durationMs: result.meta.durationMs
    }
  };
}

// Run with structured output
const config = {
  tool: 'dlf',
  outputFormat: process.env.OUTPUT_FORMAT || 'json',
  clientOptions: {
    trUrl: process.env.TINY_REACTIVE_URL,
    fallbackMode: 'error'
  }
};

const startTime = Date.now();
const result = {
  tool: 'dlf',
  status: 'unknown',
  durationMs: 0,
  error: null,
  screenshot: null
};

try {
  const client = await createResilientClient(config.clientOptions);
  const testResult = await testDLF(client);
  result.status = 'pass';
  result.screenshot = testResult.screenshot;
  result.data = testResult.data;
} catch (error) {
  result.status = 'fail';
  result.error = error.message;
} finally {
  result.durationMs = Date.now() - startTime;
}

outputStructuredResult(result, config.outputFormat);
process.exit(result.status === 'pass' ? 0 : 1);
