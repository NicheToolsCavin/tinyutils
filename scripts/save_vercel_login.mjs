#!/usr/bin/env node
// SAVE YOUR VERCEL LOGIN: Sign into Vercel.com and save auth permanently
//
// This saves your actual Vercel account login, so it works for ALL preview URLs.
//
// Usage:
//   1. Start tiny-reactive in HEADFUL mode:
//      cd ~/dev/playwrightwrap && env HTTP_API_ENABLED=true HTTP_API_TOKEN=dev123 \
//        node dist/src/cli/tiny-reactive.js serve --host 127.0.0.1 --port 5566 --headful --debug
//
//   2. Run this script:
//      node scripts/save_vercel_login.mjs
//
//   3. Sign into Vercel when browser opens, then press Enter
//
//   4. DONE! All future tests on ANY preview URL will use this login automatically.

import { createInterface } from 'readline';

const TINY_REACTIVE_URL = process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566';
const TINY_REACTIVE_TOKEN = process.env.TINY_REACTIVE_TOKEN || 'dev123';
const VERCEL_LOGIN_URL = 'https://vercel.com/login';
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
  console.log('🚀 Opening Vercel login page...');
  console.log(`   URL: ${VERCEL_LOGIN_URL}\n`);

  // Open Vercel login page
  await trCmd({
    id: 'open-vercel-login',
    cmd: 'open',
    args: { url: VERCEL_LOGIN_URL, waitUntil: 'networkidle' },
  });

  console.log('✅ Browser opened!');
  console.log('');
  console.log('👉 Please sign into your Vercel account in the browser window.');
  console.log('   (Choose your preferred login method: GitHub, GitLab, Bitbucket, Email, etc.)');
  console.log('');
  console.log('💡 TIP: After signing in, navigate to any TinyUtils preview URL to verify');
  console.log('   you\'re fully authenticated before pressing Enter.');
  console.log('');

  await waitForEnter('Press ENTER when you\'re fully signed in... ');

  console.log('\n💾 Saving Vercel login state...');

  // Save auth state
  await trCmd({
    id: 'save-vercel-login',
    cmd: 'saveAuthState',
    args: { path: AUTH_STATE_FILE },
  });

  console.log('');
  console.log('🎉 SUCCESS! Vercel login saved to:', AUTH_STATE_FILE);
  console.log('');
  console.log('✨ This login works for ALL TinyUtils preview URLs!');
  console.log('   All future tests will automatically use this saved login.');
  console.log('');
  console.log('ℹ️  If your login expires (usually weeks/months), just re-run this script.');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
