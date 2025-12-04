#!/usr/bin/env node
// ONE-TIME SETUP: Sign into Vercel and save auth permanently
//
// Usage:
//   1. Start tiny-reactive in HEADFUL mode:
//      cd ~/dev/playwrightwrap && HTTP_API_ENABLED=true HTTP_API_TOKEN=dev123 \
//        node dist/src/cli/tiny-reactive.js serve --host 127.0.0.1 --port 5566 --headful --debug
//
//   2. Run this script:
//      node scripts/login_to_vercel_once.mjs
//
//   3. Sign in when browser opens, then press Enter
//
//   4. DONE! All future tests will use this saved auth automatically.

import { createInterface } from 'readline';

const TINY_REACTIVE_URL = process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566';
const TINY_REACTIVE_TOKEN = process.env.TINY_REACTIVE_TOKEN || 'dev123';
const PREVIEW_URL = process.env.PREVIEW_URL || 'https://tinyutils.vercel.app';
const AUTH_STATE_FILE = './.tiny-reactive-vercel-auth.json';

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

async function waitForEnter(prompt) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  console.log('🚀 Opening browser to Vercel preview...');
  console.log(`   URL: ${PREVIEW_URL}\n`);

  // Open preview in browser
  await trCmd({
    id: 'open-preview',
    cmd: 'open',
    args: { url: PREVIEW_URL, waitUntil: 'networkidle' },
  });

  console.log('✅ Browser opened!');
  console.log('');
  console.log('👉 Please sign in to Vercel in the browser window.');
  console.log('   (If you\'re already signed in, just verify the page loads)');
  console.log('');

  await waitForEnter('Press ENTER when you\'re signed in... ');

  console.log('\n💾 Saving authentication state...');

  // Save auth state
  await trCmd({
    id: 'save-auth',
    cmd: 'saveAuthState',
    args: { path: AUTH_STATE_FILE },
  });

  console.log('');
  console.log('🎉 SUCCESS! Authentication saved to:', AUTH_STATE_FILE);
  console.log('');
  console.log('✨ You will NEVER need to deal with cookies again!');
  console.log('   All future tests will automatically use this saved auth.');
  console.log('');
  console.log('ℹ️  If cookies expire (usually 7+ days), just re-run this script.');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
