#!/usr/bin/env node
// Test the fixed bulk-replace API with tiny-reactive

const TINY_REACTIVE_URL = process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566';
const TINY_REACTIVE_TOKEN = process.env.TINY_REACTIVE_TOKEN || 'dev123';
const PREVIEW_URL = 'https://tinyutils-2uq1t8tlf-cavins-projects-7b0e00bb.vercel.app';
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

// Base64-encoded ZIP fixture (same as smoke test)
const MFSR_TINY_ZIP_BASE64 =
  'UEsDBAoAAAAAAIUag1sAAAAAAAAAAAAAAAAEABwAc3JjL1VUCQADWZ4vaVmeL2l1eAsAAQT2AQAABBQAAABQSwMEFAAAAAgAhRqDW/PQ2cF/AAAAnwAAAAoAHABzcmMvYXBwLmpzVVQJAANZni9pWZ4vaXV4CwABBPYBAAAEFAAAAE2LMQrCQBBF+z3F76KNi63BSrEQJODmAkuYxMHdnbAz4vVNtLH68N773iNwnhPhGjDysqNU3C7hjp6p7mGk5rzHSYpFLgp7C/ru3CHH+qSqbrUrOKDSnOJAsAcrBsmZirlBihrUor0URzR/X3BZROUyNe23k0S7JNPmV29b9wFQSwMECgAAAAAAhRqDWwAAAAAAAAAAAAAAAAUAHABkb2NzL1VUCQADWZ4vaVmeL2l1eAsAAQT2AQAABBQAAABQSwMEFAAAAAgAhRqDW3owfWZeAAAAbgAAAA0AHABkb2NzL25vdGVzLm1kVVQJAANZni9pWZ4vaXV4CwABBPYBAAAEFAAAAE3LQQqEMAxG4X1O8cOsvYC7AXGngvYCVSIWYwNNxOtPcTXbx/c+GPplRmBzjOpsROFIhj0JI4opNs0eUzb4owhTN+GK5eRiLVHzhrbqUv/1FmGv8ZvVDy7/GpIy0w9QSwECHgMKAAAAAACFGoNbAAAAAAAAAAAAAAAABAAYAAAAAAAAABAA7UEAAAAAc3JjL1VUBQADWZ4vaXV4CwABBPYBAAAEFAAAAFBLAQIeAxQAAAAIAIUag1vz0NnBfwAAAJ8AAAAKABgAAAAAAAEAAACkgT4AAABzcmMvYXBwLmpzVVQFAANZni9pdXgLAAEE9gEAAAQUAAAAUEsBAh4DCgAAAAAAhRqDWwAAAAAAAAAAAAAAAAUAGAAAAAAAAAAQAO1BAQEAAGRvY3MvVVQFAANZni9pdXgLAAEE9gEAAAQUAAAAUEsBAh4DFAAAAAgAhRqDW3owfWZeAAAAbgAAAA0AGAAAAAAAAQAAAKSBQAEAAGRvY3Mvbm90ZXMubWRVVAUAA1meL2l1eAsAAQT2AQAABBQAAABQSwUGAAAAAAQABAA4AQAA5QEAAAAA';

async function main() {
  console.log('🚀 Testing fixed bulk-replace API...\n');

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

  // Test the bulk-replace API with a real POST request
  console.log('3️⃣  Testing POST to /api/bulk-replace...');
  const postResult = await trCmd({
    id: 'test-post',
    cmd: 'evaluate',
    args: {
      js: `async () => {
        // Decode the base64 ZIP
        const zipBase64 = '${MFSR_TINY_ZIP_BASE64}';
        const binaryString = atob(zipBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const zipBlob = new Blob([bytes], { type: 'application/zip' });

        // Create FormData
        const formData = new FormData();
        formData.append('file', zipBlob, 'test.zip');
        formData.append('mode', 'simple');
        formData.append('action', 'preview');
        formData.append('find', 'TODO');
        formData.append('replace', 'DONE');

        try {
          const response = await fetch('/api/bulk-replace', {
            method: 'POST',
            body: formData
          });

          const contentType = response.headers.get('content-type');
          const text = await response.text();

          let parsed = null;
          if (contentType && contentType.includes('application/json')) {
            try {
              parsed = JSON.parse(text);
            } catch (e) {
              parsed = null;
            }
          }

          return {
            status: response.status,
            statusText: response.statusText,
            contentType,
            bodyLength: text.length,
            bodyPreview: text.substring(0, 500),
            parsed,
            isJson: !!parsed,
            ok: parsed ? parsed.ok : false
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

  const result = postResult.data;

  console.log('\n📊 Result:');
  console.log('├─ Status:', result.status);
  console.log('├─ Content-Type:', result.contentType);
  console.log('├─ Is JSON:', result.isJson);
  console.log('├─ Body length:', result.bodyLength);

  if (result.error) {
    console.log('└─ ❌ Error:', result.error);
  } else if (result.status === 500) {
    console.log('└─ ❌ 500 Error - Function still crashing');
    console.log('\nBody preview:', result.bodyPreview);
  } else if (result.status === 307 || result.status === 302) {
    console.log('└─ ⚠️  Redirect detected - still looping');
  } else if (result.isJson && result.ok) {
    console.log('└─ ✅ SUCCESS! API returned valid JSON response');
    console.log('\nResponse data:', JSON.stringify(result.parsed, null, 2));
  } else if (result.isJson) {
    console.log('└─ ⚠️  Got JSON but ok=false');
    console.log('\nResponse data:', JSON.stringify(result.parsed, null, 2));
  } else {
    console.log('└─ ⚠️  Non-JSON response');
    console.log('\nBody preview:', result.bodyPreview);
  }

  // Take a screenshot
  await trCmd({
    id: 'screenshot',
    cmd: 'screenshot',
    args: { pathOrBase64: 'bulk-replace-fixed-test.png', fullPage: true },
  });
  console.log('\n📸 Screenshot saved to bulk-replace-fixed-test.png');
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
