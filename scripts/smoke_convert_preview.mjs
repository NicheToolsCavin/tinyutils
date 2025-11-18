#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const previewUrl = process.env.PREVIEW_URL;

if (!previewUrl) {
  console.error('smoke_convert_preview: PREVIEW_URL not set; skipping.');
  process.exit(0);
}

const base = previewUrl.replace(/\/$/, '');
let endpoint = `${base}/api/convert`;

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
const rtfArtifactDir = resolve(root, 'artifacts', 'converter-rtf-fix', utcDate);

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
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  process.env.PREVIEW_BYPASS_TOKEN ||
  process.env.BYPASS_TOKEN;

if (bypassToken) {
  if (!('x-vercel-protection-bypass' in baseHeaders)) {
    baseHeaders['x-vercel-protection-bypass'] = bypassToken;
  }
  baseHeaders['x-vercel-set-bypass-cookie'] = 'true';
  // Only add Cookie if not already present from PREVIEW_FENCE_HEADER
  if (!('Cookie' in baseHeaders) && !('cookie' in baseHeaders)) {
    baseHeaders['Cookie'] = `vercel-protection-bypass=${bypassToken}`;
  }
}

// If an authenticated preview cookie is provided, append it to Cookie
const vercelJwt = process.env.VERCEL_JWT;
if (vercelJwt) {
  const prior = baseHeaders['Cookie'] || '';
  const sep = prior && !prior.trim().endsWith(';') ? '; ' : '';
  baseHeaders['Cookie'] = prior + sep + `_vercel_jwt=${vercelJwt}`;
}

const buildHeaders = () => ({ ...baseHeaders });

async function preflightBypassCookie() {
  try {
    const res = await fetch(base, { method: 'GET', headers: buildHeaders(), redirect: 'manual' });
    const sc = res.headers.get('set-cookie');
    if (sc) {
      const prior = baseHeaders['Cookie'] || '';
      const sep = prior && !prior.trim().endsWith(';') ? '; ' : '';
      // Append all cookies provided (collapse to one header); simplest is verbatim append
      baseHeaders['Cookie'] = prior + sep + sc.split(',')[0].split(';')[0];
    }
  } catch {}
}

const cases = [
  // Basic markdown → md+txt (multi-export, default dialect)
  {
    name: 'md_md_txt',
    body: {
      inputs: [
        { blobUrl: 'data:text/plain;base64,SGVsbG8gVGlueVV0aWxzIQ==', name: 'hello.md' },
      ],
      from: 'markdown',
      to: ['md', 'txt'],
      options: { extractMedia: false },
    },
  },
  // Basic markdown → html (single-target)
  {
    name: 'md_html',
    body: {
      inputs: [
        { blobUrl: 'data:text/plain;base64,SGVsbG8gVGlueVV0aWxzIQ==', name: 'hello.md' },
      ],
      from: 'markdown',
      to: ['html'],
      options: { extractMedia: false },
    },
  },
  // Single-target markdown with a non-default dialect (e.g., commonmark_x)
  {
    name: 'md_md_commonmark_x',
    body: {
      inputs: [
        { blobUrl: 'data:text/plain;base64,SGVsbG8gVGlueVV0aWxzIQ==', name: 'hello.md' },
      ],
      from: 'markdown',
      to: ['md'],
      options: { extractMedia: false, mdDialect: 'commonmark_x' },
    },
  },
  // Advanced multi-export style run: markdown → md + txt + html (mdDialect still allowed)
  {
    name: 'md_multi_export_md_txt_html',
    body: {
      inputs: [
        { blobUrl: 'data:text/plain;base64,SGVsbG8gVGlueVV0aWxzIQ==', name: 'hello.md' },
      ],
      from: 'markdown',
      to: ['md', 'txt', 'html'],
      options: { extractMedia: false, mdDialect: 'gfm' },
    },
  },
  // Layout-aware PDF → Markdown smoke (kept intact)
  {
    name: 'pdf_md_layout_aware',
    body: {
      inputs: [
        // Minimal tiny PDF ("Hello") data URL fixture
        { blobUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUj4+ID4+Ci9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCi9Db250ZW50cyAzIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzEgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKMyAwIG9iago8PAovTGVuZ3RoIDQ3Cj4+CnN0cmVhbQpCBTAgMCBvYmogPDwvVHlwZSAvQ29udGVudHMgL0xlbmd0aCA0Nz4+CnN0cmVhbQpUIC9GMSAxMiBUZgovVDAgMCAwIDQwIDQwIDUwIChIZWxsbykgVGoKZW5kc3RyZWFtCmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovTmFtZSAvRjEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA5MCAwMDAwMCBuIAowMDAwMDAwMTY2IDAwMDAwIG4gCjAwMDAwMDAyNjUgMDAwMDAgbiAKMDAwMDAwMDQyMCAwMDAwMCBuIAowMDAwMDAwNTQ3IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1Jvb3QgMiAwIFIKL1NpemUgNgovSW5mbyA8PCAvUHJvZHVjZXIgKE1pbmkpID4+Pj4Kc3RhcnR4cmVmCjY3NQolJUVPRg==', name: 'tiny.pdf' },
      ],
      from: 'pdf',
      to: ['md'],
      options: { }
    },
  },
  // Markdown → RTF (exercise RTF path and save an actual .rtf artifact)
  {
    name: 'md_rtf',
    body: {
      inputs: [
        {
          blobUrl:
            'data:text/plain;base64,IyBUaW55VXRpbHMgUlRGCgpfKiBUaGlzIGlzIGEgc21hbGwgZGVtbyBkb2N1bWVudCB1c2VkIHRvIHNtb2tlIHRoZSBNRC0+UlRGIHBhdGguICovCgpIZWFkaW5nIDEKCi0gQnVsbGV0cyBhbmQgbGlzdHMKLSBDb2RlIGJsb2NrcwoKIyMgTW9yZQoKVGhpcyB2ZXJpZmllcyB0aGF0IHRoZSBjb252ZXJ0ZXIgY2FuIHByb2R1Y2UgYSBjb21wbGV0ZSBSVEYgcGFnZSAobm90IGp1c3QgYSBoZWFkbGluZSkuCg==',
          name: 'tinyutils-demo.md',
        },
      ],
      from: 'markdown',
      to: ['rtf'],
      options: { extractMedia: false, mdDialect: 'gfm' },
    },
  },
];

// If we have a bypass token, also append it as a query param to the endpoint to avoid auth redirects during POST.
if (bypassToken) {
  const qp = `x-vercel-protection-bypass=${encodeURIComponent(bypassToken)}`;
  endpoint += (endpoint.includes('?') ? '&' : '?') + qp;
  // Ask Vercel to set a bypass cookie via query param as well (helps some proxy paths)
  endpoint += '&x-vercel-set-bypass-cookie=true';
}

const ensureArtifacts = async () => {
  await mkdir(artifactDir, { recursive: true });
  return artifactDir;
};

const ensureRtfArtifacts = async () => {
  await mkdir(rtfArtifactDir, { recursive: true });
  return rtfArtifactDir;
};

async function saveRtfArtifact(output) {
  if (!output) return;
  const href = output.blobUrl || output.url;
  if (!href || typeof href !== 'string') return;
  await ensureRtfArtifacts();
  const rawName = output.name || output.filename || 'md-to-rtf-output.rtf';
  const fileName = rawName.toLowerCase().endsWith('.rtf') ? rawName : `${rawName}.rtf`;
  const destPath = join(rtfArtifactDir, fileName);

  try {
    if (href.startsWith('data:')) {
      const firstComma = href.indexOf(',');
      if (firstComma === -1) return;
      const meta = href.slice(5, firstComma);
      const dataPart = href.slice(firstComma + 1);
      const isBase64 = /;base64$/i.test(meta);
      const buf = isBase64
        ? Buffer.from(dataPart, 'base64')
        : Buffer.from(decodeURIComponent(dataPart.replace(/\+/g, '%20')), 'utf8');
      await writeFile(destPath, buf);
      return;
    }

    const res = await fetch(href, { headers: buildHeaders() });
    if (!res.ok) {
      console.error(`smoke_convert_preview: md_rtf artifact fetch failed with ${res.status}`);
      return;
    }
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    await writeFile(destPath, buf);
  } catch (err) {
    console.error('smoke_convert_preview: failed to save md_rtf artifact', err);
  }
}

const runCase = async ({ name, body }) => {
  // Preflight once to try to set a bypass cookie for POST
  await preflightBypassCookie();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
    });

  const payload = await response.text();
  const outputPath = join(artifactDir, `resp_${name}.json`);
  await writeFile(outputPath, payload);

   if (name === 'md_rtf') {
    try {
      const parsed = JSON.parse(payload);
      const firstOutput = Array.isArray(parsed.outputs) ? parsed.outputs[0] : null;
      if (firstOutput) {
        await saveRtfArtifact(firstOutput);
      } else {
        console.error('smoke_convert_preview: md_rtf case returned no outputs');
        process.exitCode = 1;
      }
    } catch (err) {
      console.error('smoke_convert_preview: failed to process md_rtf response JSON', err);
      process.exitCode = 1;
    }
  }

  if (!response.ok) {
    console.error(`smoke_convert_preview: ${name} failed with ${response.status}`);
    process.exitCode = 1;
  }
};

const main = async () => {
  await ensureArtifacts();
  for (const testCase of cases) {
    await runCase(testCase);
  }
  console.log(`smoke_convert_preview: artifacts stored in ${artifactDir}`);
};

main().catch((error) => {
  console.error('smoke_convert_preview: unexpected error', error);
  process.exit(1);
});
