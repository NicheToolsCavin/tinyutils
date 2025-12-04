#!/usr/bin/env node
// SAVE CURRENT BROWSER STATE: Save whatever auth you already have in tiny-reactive
//
// Use this when you're already signed into Vercel in the tiny-reactive browser
// and just want to save that session for future use.
//
// Usage:
//   node scripts/save_current_browser_state.mjs

const TINY_REACTIVE_URL = process.env.TINY_REACTIVE_URL || 'http://127.0.0.1:5566';
const TINY_REACTIVE_TOKEN = process.env.TINY_REACTIVE_TOKEN || 'dev123';
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
  console.log('💾 Saving current browser auth state...');

  // Save whatever auth state the browser currently has
  await trCmd({
    id: 'save-current-state',
    cmd: 'saveAuthState',
    args: { path: AUTH_STATE_FILE },
  });

  console.log('');
  console.log('🎉 SUCCESS! Browser state saved to:', AUTH_STATE_FILE);
  console.log('');
  console.log('✨ All future tests will use this saved login!');
  console.log('   Works for ALL preview URLs.');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
