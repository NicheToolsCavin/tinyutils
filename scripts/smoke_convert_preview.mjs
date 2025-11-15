#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const previewUrl = process.env.PREVIEW_URL;

if (!previewUrl) {
  console.error('smoke_convert_preview: PREVIEW_URL not set; skipping.');
  process.exit(0);
}

const base = previewUrl.replace(/\/$/, '');
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

const buildHeaders = () => ({ ...baseHeaders });

const cases = [
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
];

const ensureArtifacts = async () => {
  await mkdir(artifactDir, { recursive: true });
  return artifactDir;
};

const runCase = async ({ name, body }) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(),
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
  for (const testCase of cases) {
    await runCase(testCase);
  }
  console.log(`smoke_convert_preview: artifacts stored in ${artifactDir}`);
};

main().catch((error) => {
  console.error('smoke_convert_preview: unexpected error', error);
  process.exit(1);
});
