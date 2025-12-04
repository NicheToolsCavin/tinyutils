#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// TinyUtils Bulk Replace API smoke
//
// Posts the same tiny ZIP fixture used by the Tier1 UI harness to
// /api/bulk-replace with mode=simple, action=preview, find=TODO,
// replace=DONE and asserts that we get a 200 JSON response with
// ok=true, data.stats, and at least one diff entry. When the
// response is HTML/auth shell instead of JSON, we set envBlocked
// in the summary so humans can classify it as an environment issue.

const BASE_URL = (process.env.BASE_URL || process.env.PREVIEW_URL || '').replace(/\/$/, '');
const isPreview = !!process.env.PREVIEW_URL;

if (!BASE_URL) {
  console.error('smoke_bulk_replace_preview: BASE_URL/PREVIEW_URL not set; skipping.');
  process.exit(0);
}

const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';
const BYPASS_CANDIDATES = [
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  process.env.PREVIEW_BYPASS_TOKEN,
  process.env.BYPASS_TOKEN,
].filter(Boolean);

const now = new Date();
const utcFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const utcDate = utcFmt.format(now).replaceAll('-', '');
const artifactDir = resolve('artifacts', 'mfsr', utcDate);
const summaryFileName = `bulk-replace-api-${isPreview ? 'preview' : 'local'}.json`;

// Base64-encoded ZIP fixture containing:
//   src/app.js
//   docs/notes.md
// Each file has exactly two "TODO" markers.
const MFSR_TINY_ZIP_BASE64 =
  'UEsDBAoAAAAAAIUag1sAAAAAAAAAAAAAAAAEABwAc3JjL1VUCQADWZ4vaVmeL2l1eAsAAQT2AQAABBQAAABQSwMEFAAAAAgAhRqDW/PQ2cF/AAAAnwAAAAoAHABzcmMvYXBwLmpzVVQJAANZni9pWZ4vaXV4CwABBPYBAAAEFAAAAE2LMQrCQBBF+z3F76KNi63BSrEQJODmAkuYxMHdnbAz4vVNtLH68N773iNwnhPhGjDysqNU3C7hjp6p7mGk5rzHSYpFLgp7C/ru3CHH+qSqbrUrOKDSnOJAsAcrBsmZirlBihrUor0URzR/X3BZROUyNe23k0S7JNPmV29b9wFQSwMECgAAAAAAhRqDWwAAAAAAAAAAAAAAAAUAHABkb2NzL1VUCQADWZ4vaVmeL2l1eAsAAQT2AQAABBQAAABQSwMEFAAAAAgAhRqDW3owfWZeAAAAbgAAAA0AHABkb2NzL25vdGVzLm1kVVQJAANZni9pWZ4vaXV4CwABBPYBAAAEFAAAAE3LQQqEMAxG4X1O8cOsvYC7AXGngvYCVSIWYwNNxOtPcTXbx/c+GPplRmBzjOpsROFIhj0JI4opNs0eUzb4owhTN+GK5eRiLVHzhrbqUv/1FmGv8ZvVDy7/GpIy0w9QSwECHgMKAAAAAACFGoNbAAAAAAAAAAAAAAAABAAYAAAAAAAAABAA7UEAAAAAc3JjL1VUBQADWZ4vaXV4CwABBPYBAAAEFAAAAFBLAQIeAxQAAAAIAIUag1vz0NnBfwAAAJ8AAAAKABgAAAAAAAEAAACkgT4AAABzcmMvYXBwLmpzVVQFAANZni9pdXgLAAEE9gEAAAQUAAAAUEsBAh4DCgAAAAAAhRqDWwAAAAAAAAAAAAAAAAUAGAAAAAAAAAAQAO1BAQEAAGRvY3MvVVQFAANZni9pdXgLAAEE9gEAAAQUAAAAUEsBAh4DFAAAAAgAhRqDW3owfWZeAAAAbgAAAA0AGAAAAAAAAQAAAKSBQAEAAGRvY3Mvbm90ZXMubWRVVAUAA1meL2l1eAsAAQT2AQAABBQAAABQSwUGAAAAAAQABAA4AQAA5QEAAAAA';

function buildHeaders(token, extraHeaders = {}, cookies = []) {
  const headers = { ...extraHeaders };
  if (token) {
    headers['x-vercel-protection-bypass'] = token;
    headers['x-vercel-set-bypass-cookie'] = 'true';
    headers['Cookie'] = headers['Cookie']
      ? `${headers['Cookie']}; vercel-protection-bypass=${token}`
      : `vercel-protection-bypass=${token}`;
  }
  if (cookies.length) {
    const handshake = cookies.join('; ');
    headers['Cookie'] = headers['Cookie']
      ? `${headers['Cookie']}; ${handshake}`
      : handshake;
  }
  if (PREVIEW_SECRET) {
    headers['x-preview-secret'] = PREVIEW_SECRET;
  }
  return headers;
}

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

async function attemptFetch(url, token, options, cookies = [], tries = 0) {
  const headers = buildHeaders(token, options.headers, cookies);
  const response = await fetch(url, { ...options, headers, redirect: 'manual' });
  const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
  if (isRedirect && token && tries === 0) {
    const handshakeCookie = parseHandshakeCookie(response.headers.get('set-cookie'));
    if (handshakeCookie) {
      return attemptFetch(url, token, options, [...cookies, handshakeCookie], tries + 1);
    }
  }
  return response;
}

async function smokeTest() {
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    env: isPreview ? 'preview' : 'local',
    envBlocked: false,
    ok: false,
    error: null,
    responseStatus: null,
    contentType: null,
    data: null,
  };

  try {
    await mkdir(artifactDir, { recursive: true });

    const zipBuffer = Buffer.from(MFSR_TINY_ZIP_BASE64, 'base64');
    const token = BYPASS_CANDIDATES[0] || null;

    // Build multipart/form-data using the global FormData available in Node 20
    const form = new FormData();
    form.append('file', new Blob([zipBuffer], { type: 'application/zip' }), 'mfsr-tiny.zip');
    form.append('mode', 'simple');
    form.append('action', 'preview');
    form.append('find', 'TODO');
    form.append('replace', 'DONE');

    const endpoint = `${BASE_URL}/api/bulk-replace`;
    const res = await attemptFetch(endpoint, token, {
      method: 'POST',
      body: form,
      headers: {},
    });

    summary.responseStatus = res.status;
    const contentType = res.headers.get('content-type') || '';
    summary.contentType = contentType;

    const text = await res.text();

    const isHtml = contentType.includes('text/html');
    const hasAuthKeywords = /Authentication Required|Vercel/i.test(text);

    if (isHtml || hasAuthKeywords) {
      summary.envBlocked = true;
      summary.error = 'Received HTML/auth response instead of JSON from /api/bulk-replace';
    } else {
      let json;
      try {
        json = JSON.parse(text);
      } catch (err) {
        summary.error = `Failed to parse JSON: ${err}`;
      }

      if (json) {
        summary.data = json;
        const hasOk = json.ok === true;
        const stats = json.data && json.data.stats;
        const diffs = json.data && Array.isArray(json.data.diffs) ? json.data.diffs : [];
        const hasStats = !!stats && typeof stats === 'object';
        const hasDiff = diffs.length > 0;
        const diffHasFilename = hasDiff && diffs.every((d) => d && d.filename && typeof d.matchCount === 'number');

        summary.ok = res.status === 200 && hasOk && hasStats && hasDiff && diffHasFilename;
        if (!summary.ok && !summary.error) {
          summary.error = 'Response JSON failed Bulk Replace API smoke assertions';
        }
      }
    }

    const summaryPath = resolve(artifactDir, summaryFileName);
    await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  } catch (err) {
    summary.error = summary.error || String(err && err.message ? err.message : err);
  }

  // Print summary for humans/CI
  console.log(JSON.stringify(summary, null, 2));

  return summary;
}

// Execute
smokeTest()
  .then((summary) => {
    if (!summary.ok && !summary.envBlocked) {
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    console.error('smoke_bulk_replace_preview crashed:', err);
    process.exitCode = 1;
  });

