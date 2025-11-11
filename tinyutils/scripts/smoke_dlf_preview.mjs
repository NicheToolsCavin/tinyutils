const previewUrl = process.env.PREVIEW_URL;

if (!previewUrl) {
  console.log('PREVIEW_URL not set; skipping preview smoke.');
  process.exit(0);
}

const endpoint = `${previewUrl.replace(/\/$/, '')}/api/check`;

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ mode: 'list', urls: ['https://example.com/'] })
});

const contentType = response.headers.get('content-type') || '';
if (!contentType.includes('application/json')) {
  console.error(`Preview smoke failed: expected JSON but received "${contentType}"`);
  process.exit(1);
}

let payload;
try {
  payload = await response.json();
} catch (error) {
  console.error(`Preview smoke failed: unable to parse JSON (${error.message})`);
  process.exit(1);
}

const status = payload?.ok ? 'ok' : 'err';
const stage = payload?.stage || payload?.meta?.stage || 'unknown';
const reqId = payload?.requestId || payload?.meta?.requestId || 'n/a';
const total = Array.isArray(payload?.rows) ? payload.rows.length : Number(payload?.meta?.totalChecked ?? 0);

console.log(`preview: ${status} · stage=${stage} · req=${reqId} · total=${total}`);
