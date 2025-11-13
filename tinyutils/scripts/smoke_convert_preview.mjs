#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFile = promisify(_execFile);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const previewUrl = process.env.PREVIEW_URL;

if (!previewUrl) {
  console.error('smoke_convert_preview: PREVIEW_URL not set; skipping.');
  process.exit(0);
}

const base = previewUrl.replace(/\/$/, '');
const endpoint = `${base}/api/convert`;

const now = new Date();
const fmt = (tz, opts) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, ...opts });
const utcDate = fmt('UTC', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replaceAll('-', '');
const madridTs = fmt('Europe/Madrid', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now).replace(/[^0-9]/g, '');

const artifactDir = process.env.CONVERT_SMOKE_ARTIFACTS
  ? resolve(process.env.CONVERT_SMOKE_ARTIFACTS)
  : resolve(root, 'artifacts', 'convert', utcDate, `preview-smoke-${madridTs}`);

const fenceHeader = process.env.PREVIEW_FENCE_HEADER;
const previewSecret = process.env.PREVIEW_SECRET;
const baseHeaders = { 'content-type': 'application/json' };
if (fenceHeader) {
  const lines = fenceHeader.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const name = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (name && value) baseHeaders[name] = value;
  }
}
if (previewSecret) baseHeaders['x-preview-secret'] = previewSecret;

const bypassToken = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || process.env.PREVIEW_BYPASS_TOKEN || process.env.BYPASS_TOKEN;
if (bypassToken) {
  if (!('x-vercel-protection-bypass' in baseHeaders)) baseHeaders['x-vercel-protection-bypass'] = bypassToken;
  if (!('Cookie' in baseHeaders) && !('cookie' in baseHeaders)) baseHeaders['Cookie'] = `vercel-protection-bypass=${bypassToken}`;
}

const setBypassCookieIfPossible = async () => {
  const token = baseHeaders['x-vercel-protection-bypass'] || baseHeaders['X-Vercel-Protection-Bypass'] || bypassToken;
  if (!token) return;
  // Primary: curl Set-Cookie capture
  try {
    const url = `${endpoint}?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(token)}`;
    const headersPath = join(artifactDir, 'set_cookie.headers');
    const cookiesPath = join(artifactDir, 'cookies.txt');
    const bodyPath = join(artifactDir, 'set_cookie.html');
    await execFile('curl', ['-sS', '-D', headersPath, url, '-c', cookiesPath, '-o', bodyPath]);
    const cookiesTxt = await readFile(cookiesPath, 'utf-8');
    const lines = cookiesTxt.split(/\r?\n/).filter(Boolean);
    const jwtLine = [...lines].reverse().find((l) => /\t_vercel_jwt\t/.test(l));
    if (jwtLine) {
      const parts = jwtLine.split('\t');
      const value = parts[parts.length - 1];
      const cookie = `_vercel_jwt=${value}`;
      baseHeaders['Cookie'] = baseHeaders['Cookie'] ? `${baseHeaders['Cookie']}; ${cookie}` : cookie;
      return;
    }
  } catch {
    // fall through to fetch
  }
  // Fallback: fetch Set-Cookie
  try {
    const url = `${endpoint}?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${encodeURIComponent(token)}`;
    const resp = await fetch(url, { headers: baseHeaders, redirect: 'manual' });
    let cookies = [];
    const anyHeaders = resp.headers;
    if (typeof anyHeaders.getSetCookie === 'function') cookies = anyHeaders.getSetCookie();
    else {
      const raw = anyHeaders.get('set-cookie') || anyHeaders.get('Set-Cookie');
      if (raw) cookies = [raw];
    }
    for (const raw of cookies) {
      const m = String(raw).match(/_vercel_jwt=([^;]+)/);
      if (m) {
        const cookie = `_vercel_jwt=${m[1]}`;
        baseHeaders['Cookie'] = baseHeaders['Cookie'] ? `${baseHeaders['Cookie']}; ${cookie}` : cookie;
        break;
      }
    }
  } catch {}
};

const ensureArtifacts = async () => { await mkdir(artifactDir, { recursive: true }); return artifactDir; };

const buildHeaders = () => ({ ...baseHeaders });

const cases = [
  { name: 'md_md_txt', body: { inputs: [{ blobUrl: 'data:text/plain;base64,SGVsbG8gVGlueVV0aWxzIQ==', name: 'hello.md' }], from: 'markdown', to: ['md', 'txt'], options: { extractMedia: false } } },
  { name: 'md_html',   body: { inputs: [{ blobUrl: 'data:text/plain;base64,SGVsbG8gVGlueVV0aWxzIQ==', name: 'hello.md' }], from: 'markdown', to: ['html'],        options: { extractMedia: false } } },
];

const runCase = async ({ name, body }) => {
  const response = await fetch(endpoint, { method: 'POST', headers: buildHeaders(), body: JSON.stringify(body) });
  const payload = await response.text();
  const outputPath = join(artifactDir, `resp_${name}.json`);
  await writeFile(outputPath, payload);
  if (!response.ok) {
    const snippet = payload.slice(0, 240).replace(/\s+/g, ' ').trim();
    console.error(`smoke_convert_preview: ${name} failed with ${response.status} ${snippet ? `- ${snippet}` : ''}`);
    process.exitCode = 1;
  }
};

const main = async () => {
  await ensureArtifacts();
  await setBypassCookieIfPossible();
  for (const t of cases) await runCase(t);
  console.log(`smoke_convert_preview: artifacts stored in ${artifactDir}`);
};

main().catch((error) => { console.error('smoke_convert_preview: unexpected error', error); process.exit(1); });

