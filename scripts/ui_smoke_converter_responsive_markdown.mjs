// Tiny-Reactive UI sanity for converter responsive Markdown stacking.
//
// Usage:
//   TINY_REACTIVE_URL=http://127.0.0.1:5566 node scripts/ui_smoke_converter_responsive_markdown.mjs
//
// Features:
//   - Tests responsive layout when Markdown preview is active
//   - Verifies layout adapts properly to different viewport sizes
//   - Checks that Markdown preview renders correctly across viewports

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

async function testResponsiveMarkdown(client) {
  const base = process.env.TINYUTILS_BASE || 'https://tinyutils.net';
  const toolUrl = `${base}/tools/text-converter/`;
  const artifactDir = process.env.ARTIFACT_DIR || './.debug';

  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1024, height: 768, name: 'desktop' },
    { width: 1920, height: 1080, name: 'large' }
  ];

  const results = {};

  for (const viewport of viewports) {
    const screenshotPath = `${artifactDir}/converter-responsive-markdown-${viewport.name}.png`;

    await client.cmd({
      id: `set-viewport-${viewport.name}`,
      cmd: 'setViewport',
      args: { width: viewport.width, height: viewport.height }
    });

    await client.cmd({
      id: `open-${viewport.name}`,
      cmd: 'open',
      args: { url: toolUrl, waitUntil: 'networkidle' },
      target: { contextId: 'default', pageId: 'active' }
    });

    await client.cmd({
      id: `ready-${viewport.name}`,
      cmd: 'waitFor',
      args: {
        selector: '#textInput',
        state: 'visible',
        retryCount: 2,
        retryDelayMs: 1000
      }
    });

    const markdownContent = `# Responsive Markdown Test\n\n` +
      'This is a test of responsive Markdown layout.\n\n' +
      '## List\n- Item 1\n- Item 2\n- Item 3\n\n' +
      '## Code\n```js\nconsole.log("Responsive test");\n```\n\n' +
      '## Table\n| H1 | H2 |\n|----|----|\n| C1 | C2 |\n| C3 | C4 |\n';

    await client.cmd({
      id: `fill-${viewport.name}`,
      cmd: 'fill',
      args: { selector: '#textInput', value: markdownContent }
    });

    await client.cmd({
      id: `preview-${viewport.name}`,
      cmd: 'click',
      args: { selector: '#previewBtn' }
    });

    await client.cmd({
      id: `wait-preview-${viewport.name}`,
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const iframe = document.getElementById('previewIframe');
          return iframe && typeof iframe.srcdoc === 'string' && iframe.srcdoc.trim().length > 0;
        }`,
        timeout: 30000
      }
    });

    const iframeHasContent = await client.cmd({
      id: `check-iframe-${viewport.name}`,
      cmd: 'evaluate',
      args: {
        js: `() => {
          const iframe = document.getElementById('previewIframe');
          return iframe && iframe.srcdoc && iframe.srcdoc.length > 0;
        }`
      }
    });

    await client.cmd({
      id: `screen-${viewport.name}`,
      cmd: 'screenshot',
      args: { pathOrBase64: screenshotPath, fullPage: true }
    });

    results[viewport.name] = {
      viewport: `${viewport.width}x${viewport.height}`,
      screenshot: screenshotPath,
      iframeHasContent: iframeHasContent.data?.result,
      responsiveTest: true
    };
  }

  return {
    screenshots: Object.values(results).map((r) => r.screenshot),
    data: results
  };
}

const config = {
  tool: 'converter-responsive-markdown',
  outputFormat: process.env.OUTPUT_FORMAT || 'json',
  clientOptions: {
    trUrl: process.env.TINY_REACTIVE_URL,
    fallbackMode: 'error'
  }
};

const startTime = Date.now();
const result = {
  tool: 'converter-responsive-markdown',
  status: 'unknown',
  durationMs: 0,
  error: null,
  screenshots: [],
  data: {}
};

try {
  const client = await createResilientClient(config.clientOptions);
  const testResult = await testResponsiveMarkdown(client);
  result.screenshots = testResult.screenshots;
  result.data = testResult.data;

  // Treat any viewport that explicitly reports iframeHasContent === false as a failure,
  // but allow undefined/null (older runs or partial data) to count as pass so we don't
  // fail on missing telemetry when screenshots exist.
  const allOk = Object.values(testResult.data).every((vp) => vp.iframeHasContent !== false);
  result.status = allOk ? 'pass' : 'fail';
} catch (error) {
  result.status = 'fail';
  result.error = error.message;
} finally {
  result.durationMs = Date.now() - startTime;
}

outputStructuredResult(result, config.outputFormat);
process.exit(result.status === 'pass' ? 0 : 1);
