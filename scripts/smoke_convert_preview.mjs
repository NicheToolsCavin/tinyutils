#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targetUrl = process.env.PREVIEW_URL || process.env.TARGET_URL;

if (!targetUrl) {
  console.error('smoke_convert_preview: PREVIEW_URL or TARGET_URL not set; skipping.');
  process.exit(0);
}

const base = targetUrl.replace(/\/$/, '');
const endpoint = `${base}/api/convert`;

const now = new Date();
const fmt = (tz, opts) => new Intl.DateTimeFormat('en-CA', {
  timeZone: tz,
  ...opts,
});
const utcDate = fmt('UTC', { year: 'numeric', month: '2-digit', day: '2-digit' })
  .format(now)
  .replaceAll('-', '');
const madridTs = fmt('Europe/Madrid', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).format(now).replace(/[^0-9]/g, '');

const artifactDir = process.env.CONVERT_SMOKE_ARTIFACTS
  ? resolve(process.env.CONVERT_SMOKE_ARTIFACTS)
  : resolve(root, 'artifacts', 'convert', utcDate, `preview-smoke-${madridTs}`);

const fenceHeader = process.env.PREVIEW_FENCE_HEADER;
const previewSecret = process.env.PREVIEW_SECRET;
const baseHeaders = { 'content-type': 'application/json' };
if (fenceHeader) {
  const lines = fenceHeader
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) {
      continue;
    }
    const name = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (name && value) {
      baseHeaders[name] = value;
    }
  }
}
if (previewSecret) {
  baseHeaders['x-preview-secret'] = previewSecret;
}

// Fallback: if no explicit PREVIEW_FENCE_HEADER provided, try env tokens.
const bypassToken =
  process.env.PREVIEW_BYPASS_TOKEN ||
  process.env.BYPASS_TOKEN ||
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (bypassToken) {
  if (!('x-vercel-protection-bypass' in baseHeaders)) {
    baseHeaders['x-vercel-protection-bypass'] = bypassToken;
  }
  // Only add Cookie if not already present from PREVIEW_FENCE_HEADER
  if (!('Cookie' in baseHeaders) && !('cookie' in baseHeaders)) {
    baseHeaders['Cookie'] = `vercel-protection-bypass=${bypassToken}`;
  }
}

const buildHeaders = (cookie = null) => {
  const headers = { ...baseHeaders };
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  return headers;
};

const getBypassCookie = async () => {
  if (!bypassToken) {
    console.warn('smoke_convert_preview: No bypass token found. Proceeding without protection bypass.');
    return null;
  }

  const bypassHeaders = {
    'x-vercel-protection-bypass': bypassToken,
    'user-agent': 'tinyutils-smoke-test',
  };

  // Attempt to get the cookie from the root path
  const rootResponse = await fetch(base, { headers: bypassHeaders, redirect: 'manual' });
  const setCookieHeader = rootResponse.headers.get('set-cookie');

  if (setCookieHeader) {
    const match = setCookieHeader.match(/_vercel_jwt=([^;]+)/);
    if (match && match[1]) {
      const cookie = `_vercel_jwt=${match[1]}`;
      console.log('smoke_convert_preview: Successfully captured _vercel_jwt cookie.');
      await writeFile(join(artifactDir, 'cookies.txt'), cookie);
      await writeFile(join(artifactDir, 'set_cookie.headers'), rootResponse.headers.get('set-cookie'));
      return cookie;
    }
  }

  console.warn('smoke_convert_preview: Failed to capture _vercel_jwt cookie. Proceeding without it.');
  return null;
};

const runCase = async ({ name, body }, bypassCookie) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(bypassCookie),
    body: JSON.stringify(body),
  });

  const payload = await response.text();
  const outputPath = join(artifactDir, `resp_${name}.json`);
  await writeFile(outputPath, payload);

  if (!response.ok) {
    console.error(`smoke_convert_preview: ${name} failed with ${response.status}`);
    process.exitCode = 1;
  }
};

const main = async () => {
  await ensureArtifacts();
  const bypassCookie = await getBypassCookie();
  for (const testCase of cases) {
    await runCase(testCase, bypassCookie);
  }
  console.log(`smoke_convert_preview: artifacts stored in ${artifactDir}`);
};

main().catch((error) => {
  console.error('smoke_convert_preview: unexpected error', error);
  process.exit(1);
});
