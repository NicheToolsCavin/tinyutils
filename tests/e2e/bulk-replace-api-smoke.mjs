#!/usr/bin/env node
// TinyUtils API smoke test for Bulk Find & Replace (ESM safe).
//
// Minimal goal: verify that the /api/bulk-replace endpoint is reachable on the
// current preview and does not return a 404. This avoids multipart/form-data
// complexity and CommonJS require() in an ESM environment.
//
// Writes JSON summary under:
//   artifacts/api/bulk-find-replace/<YYYYMMDD>/bulk-replace-api-smoke.json

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BYPASS_TOKEN = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  || process.env.PREVIEW_BYPASS_TOKEN
  || process.env.BYPASS_TOKEN;
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';

function buildBypassHeaders() {
  const headers = {
    'User-Agent': 'TinyUtils-BulkReplace-Smoke/1.1',
  };
  if (BYPASS_TOKEN) {
    headers['x-vercel-protection-bypass'] = BYPASS_TOKEN;
    headers['x-vercel-set-bypass-cookie'] = 'true';
    headers['Cookie'] = `vercel-protection-bypass=${BYPASS_TOKEN}`;
  }
  if (PREVIEW_SECRET) {
    headers['x-preview-secret'] = PREVIEW_SECRET;
  }
  return headers;
}

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '');

const today = new Date();
const dateSlug = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
  today.getDate(),
).padStart(2, '0')}`;
const baseArtifactDir = process.env.ARTIFACT_DIR || resolve('artifacts', 'api', 'bulk-find-replace', dateSlug);
const artifactDir = resolve(baseArtifactDir);

async function main() {
  await mkdir(artifactDir, { recursive: true });

  const summary = {
    tool: 'bulk-find-replace',
    flow: 'api-smoke-minimal',
    baseUrl: PREVIEW_URL,
    endpoint: '/api/bulk-replace',
    ok: false,
    steps: [],
    error: null,
    responseCode: null,
    responseOk: null,
  };

  try {
    if (!PREVIEW_URL) {
      summary.error = 'PREVIEW_URL not set; cannot exercise /api/bulk-replace on preview.';
      await writeFile(
        resolve(artifactDir, 'bulk-replace-api-smoke.error.json'),
        JSON.stringify(summary, null, 2),
        'utf8',
      );
      console.error('bulk-replace-api-smoke: PREVIEW_URL missing, treating as env-blocked.');
      process.exitCode = 1;
      return;
    }

    const apiEndpoint = `${PREVIEW_URL}/api/bulk-replace`;
    summary.steps.push({ step: 'build-endpoint', apiEndpoint });

    let res = await fetch(apiEndpoint, {
      method: 'GET',
      headers: buildBypassHeaders(),
      redirect: 'manual', // Capture redirects instead of following them
    });

    summary.responseCode = res.status;
    summary.steps.push({ step: 'api-request', status: res.status });

    // Handle Vercel's two-stage bypass: 307 with JWT cookie, then follow
    if (res.status === 307) {
      const location = res.headers.get('location');
      const setCookie = res.headers.get('set-cookie');
      summary.redirectLocation = location;
      summary.steps.push({ step: 'redirect-detected', location, setCookie: !!setCookie });

      if (setCookie) {
        const jwtMatch = setCookie.match(/_vercel_jwt=([^;]+)/);
        if (jwtMatch) {
          const jwt = jwtMatch[1];
          summary.steps.push({ step: 'jwt-extracted', jwtLength: jwt.length });

          // Follow redirect with JWT cookie
          const headers = buildBypassHeaders();
          headers['Cookie'] = `_vercel_jwt=${jwt}`;

          res = await fetch(apiEndpoint, {
            method: 'GET',
            headers,
            redirect: 'manual',
          });

          summary.responseCode = res.status;
          summary.steps.push({ step: 'api-request-with-jwt', status: res.status });
        }
      }
    }

    // Read response body for diagnostics
    let bodyText = '';
    try {
      bodyText = await res.text();
      summary.responseBody = bodyText.substring(0, 500); // First 500 chars
    } catch (readErr) {
      summary.responseBody = `[Error reading body: ${readErr.message}]`;
    }

    // Enhanced classification:
    // - 404: endpoint missing
    // - 3xx: redirect/auth issues (env-blocked)
    // - 500-599: function exists but crashes (deployment issue)
    // - 200-299: success
    // - 400-499: endpoint exists, bad request (ok for smoke test)
    if (res.status === 404) {
      summary.ok = false;
      summary.responseOk = false;
      summary.error = 'Endpoint returned 404 (not found)';
    } else if (res.status >= 300 && res.status < 400) {
      summary.ok = false;
      summary.responseOk = false;
      summary.error = `Endpoint returned ${res.status} redirect (likely env-blocked or auth loop)`;
    } else if (res.status >= 500) {
      summary.ok = false;
      summary.responseOk = false;
      summary.error = `Endpoint returned ${res.status} server error (function crash or deployment issue)`;
    } else {
      summary.ok = true;
      summary.responseOk = true;
    }

    await writeFile(
      resolve(artifactDir, 'bulk-replace-api-smoke.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    if (!summary.ok) {
      console.error('bulk-replace-api-smoke: endpoint appears missing (404).');
      process.exitCode = 1;
    } else {
      console.log('bulk-replace-api-smoke: endpoint reachable (non-404).');
      console.log('Summary written to', resolve(artifactDir, 'bulk-replace-api-smoke.json'));
    }
  } catch (err) {
    summary.ok = false;
    summary.responseOk = false;
    summary.error = err?.message || String(err);
    await writeFile(
      resolve(artifactDir, 'bulk-replace-api-smoke.error.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );
    console.error('bulk-replace-api-smoke: error during API test:', summary.error);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('bulk-replace-api-smoke crashed:', err);
  process.exit(1);
});
