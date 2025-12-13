#!/usr/bin/env node
/**
 * UI smoke for Image Compressor tool using tiny-reactive HTTP API.
 *
 * NOTE: This is intentionally NOT named `test-*.mjs` because `node --test`
 * auto-discovers `test-*.js` files anywhere in the repo.
 *
 * Prerequisites:
 *   - Dev server running: `pnpm dev` (usually :5173 or :5174)
 *   - tiny-reactive running with HTTP API:
 *     HTTP_API_ENABLED=true HTTP_API_TOKEN=dev123 node dist/src/cli/tiny-reactive.js serve --port 5566 --headful
 *
 * Usage: node scripts/ui_smoke_image_compressor.mjs [port]
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TINY_REACTIVE_URL = process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566';
const TINY_REACTIVE_TOKEN = process.env.HTTP_API_TOKEN || 'dev123';
const DEV_PORT = process.argv[2] || '5174';
const BASE_URL = `http://localhost:${DEV_PORT}`;
const ARTIFACT_DIR = resolve(
	process.env.ARTIFACT_DIR || `artifacts/ui/image-compressor/${dateSlugMadrid()}`
);

function dateSlugMadrid() {
	const d = new Date();
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Madrid',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	})
		.formatToParts(d)
		.reduce((acc, p) => {
			if (p.type !== 'literal') acc[p.type] = p.value;
			return acc;
		}, {});
	return `${parts.year}${parts.month}${parts.day}`;
}

async function call(cmd, args = {}) {
  const res = await fetch(`${TINY_REACTIVE_URL}/cmd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TINY_REACTIVE_TOKEN}`
    },
    body: JSON.stringify({ cmd, args })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`tiny-reactive error: ${res.status} ${text}`);
  }
  const result = await res.json();
  if (process.env.DEBUG) {
    console.log(`[DEBUG] ${cmd}:`, JSON.stringify(result, null, 2).slice(0, 500));
  }
  if (!result.ok) {
    throw new Error(`Command ${cmd} failed: ${result.error?.message || JSON.stringify(result.error)}`);
  }
  return result;
}

async function navigate(url) {
  return call('open', { url });
}

async function evaluate(js) {
  return call('evaluate', { js });
}

async function waitFor(selector, state = 'visible', timeoutMs = 10000) {
  return call('waitFor', { selector, state, timeout: timeoutMs });
}

async function click(selector) {
  return call('click', { selector });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Test utilities
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

async function run() {
  console.log('🧪 Image Compressor Automated Test');
  console.log(`   Target: ${BASE_URL}/tools/image-compressor/`);
  console.log(`   tiny-reactive: ${TINY_REACTIVE_URL}\n`);

  try {
    mkdirSync(ARTIFACT_DIR, { recursive: true });

    // 1. Navigate to page
    console.log('1️⃣ Navigation');
    await navigate(`${BASE_URL}/tools/image-compressor/`);
    await sleep(1000);

    const pageCheck = await evaluate(`(function() {
      return {
        title: document.title,
        hasDropzone: !!document.querySelector('.drop-zone, [class*="dropzone"], [class*="drop"]'),
        hasFileInput: !!document.querySelector('input[type="file"]'),
        hasProcessButton: !!document.querySelector('button')
      };
    })()`);

    const page = pageCheck.data?.value;
    assert(page?.title?.includes('Image'), `Page title contains "Image": ${page?.title}`);
    assert(page?.hasFileInput, 'File input exists');

    // 2. Create and upload test image via test hook
    console.log('\n2️⃣ File Upload');
    const uploadResult = await evaluate(`(function() {
      return new Promise((resolve) => {
        // Create test image via canvas
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 200, 200);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.5, '#4ecdc4');
        gradient.addColorStop(1, '#45b7d1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 200, 200);

        // Add text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Test Image', 100, 100);

        canvas.toBlob(async (blob) => {
          try {
            const file = new File([blob], 'test-image.png', { type: 'image/png' });

            // Use test hook if available (dev mode)
            const testHook = window.__IMAGE_COMPRESSOR_TEST__;
            if (testHook && testHook.addFiles) {
              await testHook.addFiles([file]);

              // Wait for Svelte reactivity
              await new Promise(r => setTimeout(r, 300));

              resolve({
                uploaded: true,
                fileName: file.name,
                fileSize: file.size,
                tasksLength: testHook.getTasks().length,
                canProcess: testHook.canProcess(),
                method: 'test-hook'
              });
            } else {
              // Fallback: try file input (less reliable)
              const input = document.querySelector('input[type="file"]');
              if (!input) {
                resolve({ error: 'No file input and no test hook' });
                return;
              }

              const dt = new DataTransfer();
              dt.items.add(file);
              input.files = dt.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));

              await new Promise(r => setTimeout(r, 500));
              resolve({
                uploaded: true,
                fileName: file.name,
                method: 'file-input-fallback'
              });
            }
          } catch (err) {
            resolve({ error: err.message });
          }
        }, 'image/png');
      });
    })()`);

    const upload = uploadResult.data?.value;
    if (upload?.error) console.log('    Upload error:', upload.error);
    assert(upload?.uploaded, `File uploaded: ${upload?.fileName} (tasks: ${upload?.tasksLength}, canProcess: ${upload?.canProcess})`);

    // 3. Wait for preview
    console.log('\n3️⃣ Preview Check');
    await sleep(500);

    const previewCheck = await evaluate(`(function() {
      const previews = document.querySelectorAll('img');
      const cards = document.querySelectorAll('[class*="card"], [class*="preview"], [class*="item"]');
      return {
        imageCount: previews.length,
        cardCount: cards.length,
        hasPreviewImage: Array.from(previews).some(img => img.src.startsWith('blob:') || img.src.startsWith('data:'))
      };
    })()`);

    const preview = previewCheck.data?.value;
    assert(preview?.hasPreviewImage || preview?.imageCount > 0,
      `Preview image displayed (${preview?.imageCount} images found)`);

    // 4. Process the image
    console.log('\n4️⃣ Processing');

    // Use test hook to trigger processing directly
    const processResult = await evaluate(`(function() {
      return new Promise(async (resolve) => {
        const testHook = window.__IMAGE_COMPRESSOR_TEST__;

        if (testHook && testHook.canProcess()) {
          // Use test hook to start processing
          testHook.startProcessing();
          resolve({ started: true, method: 'test-hook' });
        } else {
          // Fallback: try clicking the button
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b =>
            b.textContent.toLowerCase().includes('process')
          );

          if (btn && !btn.disabled) {
            btn.click();
            resolve({ started: true, buttonText: btn.textContent.trim(), method: 'button-click' });
          } else {
            resolve({
              started: false,
              canProcess: testHook?.canProcess?.() ?? 'no hook',
              tasksLength: testHook?.getTasks?.()?.length ?? 'no hook',
              disabledButtons: buttons.filter(b => b.disabled).map(b => b.textContent.trim())
            });
          }
        }
      });
    })()`);

    const processBtn = processResult.data?.value;
    if (!processBtn?.started) {
      console.log('    Process debug:', JSON.stringify(processBtn, null, 2));
    }
    assert(processBtn?.started, `Processing started via ${processBtn?.method || 'N/A'}`);

    // 5. Wait for processing to complete
    console.log('\n5️⃣ Results');
    await sleep(2000);

    const resultsCheck = await evaluate(`(function() {
      // Check for download button or processed results
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const downloadBtn = buttons.find(b =>
        b.textContent.toLowerCase().includes('download') ||
        b.href?.startsWith('blob:')
      );

      // Check for any blob URLs (processed images)
      const blobLinks = document.querySelectorAll('a[href^="blob:"]');
      const blobImages = document.querySelectorAll('img[src^="blob:"]');

      // Check for error messages
      const errors = document.querySelectorAll('[class*="error"], .text-red-500, .text-danger');

      return {
        hasDownloadOption: !!downloadBtn || blobLinks.length > 0,
        blobLinksCount: blobLinks.length,
        blobImagesCount: blobImages.length,
        errorCount: errors.length,
        errorMessages: Array.from(errors).map(e => e.textContent.trim()).slice(0, 3)
      };
    })()`);

    const results = resultsCheck.data?.value;
    assert(results?.errorCount === 0,
      `No errors displayed (found ${results?.errorCount})`);
    assert(
      results?.hasDownloadOption || results?.blobImagesCount > 0,
      `Processed result available (${results?.blobImagesCount} blob images, ${results?.blobLinksCount} blob links)`
    );

    // Screenshot + summary artifact
    const screenshotPath = resolve(ARTIFACT_DIR, 'image-compressor-smoke.png');
    const shot = await call('screenshot', { pathOrBase64: 'base64', fullPage: true });
    const base64 = shot?.data?.base64 || shot?.data || shot?.base64;
    if (!base64) throw new Error('tiny-reactive screenshot missing base64 payload');
    writeFileSync(screenshotPath, Buffer.from(base64, 'base64'));
    const summaryPath = resolve(ARTIFACT_DIR, 'image-compressor-smoke.json');
    writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          ok: failed === 0,
          passed,
          failed,
          url: `${BASE_URL}/tools/image-compressor/`,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);
    console.log(`🧾 Summary saved: ${summaryPath}`);

    // Summary
    console.log('\n' + '─'.repeat(40));
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('✅ All tests passed!\n');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('\n💥 Test error:', err.message);
    process.exit(2);
  }
}

run();
