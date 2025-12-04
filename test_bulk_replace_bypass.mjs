#!/usr/bin/env node
// Test bulk-replace API with tiny-reactive to diagnose 307 redirect loop

const TINY_REACTIVE_URL = process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566';
const TINY_REACTIVE_TOKEN = process.env.TINY_REACTIVE_TOKEN || 'dev123';
const PREVIEW_URL = 'https://tinyutils-fod6rop6c-cavins-projects-7b0e00bb.vercel.app';
const AUTH_STATE_FILE = './.tiny-reactive-vercel-login.json';

async function trCmd(body) {
  const res = await fetch(`${TINY_REACTIVE_URL}/cmd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TINY_REACTIVE_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`tiny-reactive error: ${res.status} ${text}`);
  }

  return await res.json();
}

async function main() {
  console.log('🔍 Testing bulk-replace API bypass...\n');

  // Load saved Vercel login
  console.log('1️⃣  Loading saved Vercel login...');
  await trCmd({
    id: 'load-auth',
    cmd: 'loadAuthState',
    args: { path: AUTH_STATE_FILE }
  });
  console.log('✅ Auth loaded\n');

  // Navigate to preview root first
  console.log('2️⃣  Navigating to preview root...');
  await trCmd({
    id: 'open-root',
    cmd: 'open',
    args: { url: PREVIEW_URL, waitUntil: 'networkidle' },
  });
  console.log('✅ Root loaded\n');

  // Now test the bulk-replace API by navigating directly to it
  console.log('3️⃣  Testing /api/bulk-replace endpoint...');
  const apiUrl = `${PREVIEW_URL}/api/bulk-replace`;

  // Try a GET request first to see what happens
  await trCmd({
    id: 'test-api',
    cmd: 'open',
    args: { url: apiUrl, waitUntil: 'networkidle' },
  });

  // Get the page content
  const content = await trCmd({
    id: 'get-content',
    cmd: 'getText',
    args: { selector: 'body' },
  });

  console.log('📄 Response body:', content.data?.text?.substring(0, 500));

  // Take a screenshot
  await trCmd({
    id: 'screenshot',
    cmd: 'screenshot',
    args: { pathOrBase64: 'bulk-replace-test.png', fullPage: true },
  });
  console.log('📸 Screenshot saved to bulk-replace-test.png\n');

  // Now try a real POST with FormData using page.evaluate
  console.log('4️⃣  Testing POST request from browser context...');
  const postResult = await trCmd({
    id: 'test-post',
    cmd: 'evaluate',
    args: {
      js: `async () => {
        // Create a simple test ZIP
        const testFiles = [
          { name: 'test.txt', content: 'TODO: test content' }
        ];

        // Create FormData
        const formData = new FormData();
        const blob = new Blob(['test content'], { type: 'application/zip' });
        formData.append('file', blob, 'test.zip');
        formData.append('mode', 'simple');
        formData.append('action', 'preview');
        formData.append('find', 'TODO');
        formData.append('replace', 'DONE');

        try {
          const response = await fetch('/api/bulk-replace', {
            method: 'POST',
            body: formData
          });

          return {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            contentType: response.headers.get('content-type'),
            body: await response.text()
          };
        } catch (err) {
          return {
            error: err.message,
            stack: err.stack
          };
        }
      }`
    }
  });

  console.log('\n📊 POST Response:');
  console.log('Status:', postResult.data?.status);
  console.log('Content-Type:', postResult.data?.contentType);
  console.log('Body preview:', postResult.data?.body?.substring(0, 500));

  if (postResult.data?.body?.includes('Redirecting') || postResult.data?.status === 307) {
    console.log('\n⚠️  CONFIRMED: 307 redirect loop detected!');
    console.log('Response headers:', JSON.stringify(postResult.data?.headers, null, 2));
  }

  console.log('\n✅ Test complete!');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
