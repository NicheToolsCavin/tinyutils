// Tiny-Reactive UI sanity for Safari PDF accept selection check.
//
// Usage:
//   TINY_REACTIVE_URL=http://127.0.0.1:5566 node scripts/ui_smoke_safari_pdf_accept.mjs
//
// Features:
//   - Checks that the converter file input advertises PDF support via its accept attribute
//   - Intended as a proxy for the Safari/macOS PDF picker bug

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

function parseHandshakeCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const fragments = setCookieHeader.split('\n');
  for (const fragment of fragments) {
    const trimmed = fragment.trim();
    if (!trimmed) continue;
    const [cookiePair] = trimmed.split(';');
    if (cookiePair.startsWith('_vercel_jwt=')) {
      return cookiePair;
    }
  }
  return null;
}

async function applyPreviewBypassIfNeeded(client, baseUrl) {
  const token = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    || process.env.PREVIEW_BYPASS_TOKEN
    || process.env.BYPASS_TOKEN;
  const previewSecret = (process.env.PREVIEW_SECRET || '').trim();

  if (!token) return;

  try {
    // Mirror the working curl flow by preflighting the preview root.
    // This is where Vercel protection usually performs the 30x +
    // _vercel_jwt handshake when automation headers are present.
    const preflightUrl = new URL(baseUrl);
    preflightUrl.pathname = '/';
    preflightUrl.searchParams.set('x-vercel-set-bypass-cookie', 'true');
    preflightUrl.searchParams.set('x-vercel-protection-bypass', token);

    const headers = {
      'x-vercel-protection-bypass': token,
      'x-vercel-set-bypass-cookie': 'true',
      Cookie: `vercel-protection-bypass=${token}`,
    };
    if (previewSecret) {
      headers['x-preview-secret'] = previewSecret;
    }

    const res = await fetch(preflightUrl.toString(), {
      method: 'GET',
      headers,
      redirect: 'manual',
    });

    const handshake = parseHandshakeCookie(res.headers.get('set-cookie'));
    const cookies = [];

    // Always set the protection-bypass cookie in the browser context so
    // pages that rely on it (not just APIs) see the same automation token.
    cookies.push({
      name: 'vercel-protection-bypass',
      value: token,
      url: baseUrl,
    });

    // If we received a _vercel_jwt cookie, propagate that as well so the
    // browser context looks authenticated to Vercel's protection layer.
    if (handshake) {
      const [name, ...rest] = handshake.split('=');
      const value = rest.join('=').split(';')[0];
      cookies.push({ name, value, url: baseUrl });
    }

    if (cookies.length) {
      await client.cmd({
        id: 'set-cookie',
        cmd: 'setCookies',
        args: { cookies },
      });
    }
  } catch (error) {
    console.warn('⚠️  preview bypass preflight failed:', error.message);
  }
}

async function testSafariPDFAccept(client) {
  const base = process.env.TINYUTILS_BASE || 'https://tinyutils.net';
  const bypassToken = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    || process.env.PREVIEW_BYPASS_TOKEN
    || process.env.BYPASS_TOKEN;
  let toolUrl = `${base}/tools/text-converter/`;

  // For preview deployments, add bypass query params so the first navigation
  // also carries the token. Cookie handshake is handled by applyPreviewBypassIfNeeded.
  if (bypassToken) {
    try {
      const u = new URL(toolUrl);
      u.searchParams.set('x-vercel-set-bypass-cookie', 'true');
      u.searchParams.set('x-vercel-protection-bypass', bypassToken);
      toolUrl = u.toString();
    } catch {
      // If URL parsing fails, fall back to the plain URL.
    }
  }
  const artifactDir = process.env.ARTIFACT_DIR || './.debug';
  const screenshotPath = `${artifactDir}/safari-pdf-accept-check.png`;

  // Apply preview bypass handshake (if configured) before opening the page so
  // Tiny-Reactive does not get redirected to the Vercel login/SSO flow.
  await applyPreviewBypassIfNeeded(client, base);

   const cookiesBeforeNav = await client.cmd({
     id: 'cookies-before-nav',
     cmd: 'getCookies',
     args: {}
   });

  // First open the preview root so the browser follows any redirects that
  // complete the protection handshake in a real navigation context.
  await client.cmd({
    id: 'open-root',
    cmd: 'open',
    args: { url: base, waitUntil: 'networkidle' },
    target: { contextId: 'default', pageId: 'active' }
  });

  const rootSnapshot = await client.cmd({
    id: 'snapshot-root',
    cmd: 'evaluate',
    args: {
      js: `() => {
        const html = document.documentElement.outerHTML || '';
        return {
          href: location.href,
          readyState: document.readyState,
          title: document.title,
          cookie: document.cookie,
          hasFileInput: html.includes('id="fileInput"'),
          snippet: html.slice(0, 2000)
        };
      }`
    }
  });

  // Then navigate to the converter page (still carrying bypass query params
  // for good measure) and wait for the file input.
  await client.cmd({
    id: 'open-converter',
    cmd: 'open',
    args: { url: toolUrl, waitUntil: 'networkidle' },
    target: { contextId: 'default', pageId: 'active' }
  });

  const converterSnapshot = await client.cmd({
    id: 'snapshot-converter',
    cmd: 'evaluate',
    args: {
      js: `() => {
        const html = document.documentElement.outerHTML || '';
        return {
          href: location.href,
          readyState: document.readyState,
          title: document.title,
          cookie: document.cookie,
          hasFileInput: html.includes('id="fileInput"'),
          snippet: html.slice(0, 2000)
        };
      }`
    }
  });

  await client.cmd({
    id: 'ready',
    cmd: 'waitFor',
    args: {
      selector: '#fileInput',
      state: 'visible',
      retryCount: 2,
      retryDelayMs: 1000
    }
  });

  const acceptAttribute = await client.cmd({
    id: 'check-accept',
    cmd: 'evaluate',
    args: {
      js: `() => {
        const fileInput = document.getElementById('fileInput');
        if (!fileInput) return { accept: null, outerHTML: null };
        return {
          accept: fileInput.getAttribute('accept'),
          outerHTML: fileInput.outerHTML
        };
      }`
    }
  });

  const acceptPayload = acceptAttribute.data?.value ?? acceptAttribute.data?.result ?? null;
  const acceptRaw = (acceptPayload && typeof acceptPayload === 'object'
    ? acceptPayload.accept
    : acceptPayload) || '';
  const acceptValue = String(acceptRaw || '').toLowerCase();
  const hasDotPdf = acceptValue.includes('.pdf');
  const hasMimePdf = acceptValue.includes('application/pdf');

  await client.cmd({
    id: 'screen',
    cmd: 'screenshot',
    args: { pathOrBase64: screenshotPath, fullPage: true }
  });

  // Lightweight debug to understand what the browser actually loaded.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    safariPdfAcceptDebug: {
      rootSnapshotEnvelope: rootSnapshot,
      converterSnapshotEnvelope: converterSnapshot
    }
  }));

  return {
    screenshot: screenshotPath,
    data: {
      url: toolUrl,
      accept: acceptRaw,
      fileInputOuterHTML:
        (acceptPayload && typeof acceptPayload === 'object' ? acceptPayload.outerHTML : null) || null,
      cookiesBeforeNav: cookiesBeforeNav.data?.cookies || null,
      rootSnapshot: rootSnapshot.data?.value ?? rootSnapshot.data?.result ?? null,
      converterSnapshot: converterSnapshot.data?.value ?? converterSnapshot.data?.result ?? null,
      hasDotPdf,
      hasMimePdf
    }
  };
}

const config = {
  tool: 'safari-pdf-accept',
  outputFormat: process.env.OUTPUT_FORMAT || 'json',
  clientOptions: {
    trUrl: process.env.TINY_REACTIVE_URL,
    fallbackMode: 'error'
  }
};

const startTime = Date.now();
const result = {
  tool: 'safari-pdf-accept',
  status: 'unknown',
  durationMs: 0,
  error: null,
  screenshot: null,
  data: {}
};

try {
  const client = await createResilientClient(config.clientOptions);
  const testResult = await testSafariPDFAccept(client);
  result.screenshot = testResult.screenshot;
  result.data = testResult.data;
  result.status = testResult.data.hasDotPdf && testResult.data.hasMimePdf ? 'pass' : 'fail';
} catch (error) {
  result.status = 'fail';
  result.error = error.message;
} finally {
  result.durationMs = Date.now() - startTime;
}

outputStructuredResult(result, config.outputFormat);
process.exit(result.status === 'pass' ? 0 : 1);
