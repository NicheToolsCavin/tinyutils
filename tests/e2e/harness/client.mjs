// Tiny-reactive HTTP client and basic UI actions used by E2E tests.

import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

import fetch from 'node-fetch';

// Build bypass headers + cookie + query params (for redirects)
function buildBypassHeaders(extra = {}) {
  const token = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    || process.env.PREVIEW_BYPASS_TOKEN
    || process.env.BYPASS_TOKEN;
  const previewSecret = process.env.PREVIEW_SECRET;

  const headers = { ...extra };
  if (token) {
    headers['x-vercel-protection-bypass'] = token;
    headers['x-vercel-set-bypass-cookie'] = 'true';
    headers['Cookie'] = headers['Cookie']
      ? `${headers['Cookie']}; vercel-protection-bypass=${token}`
      : `vercel-protection-bypass=${token}`;
  }
  if (previewSecret) headers['x-preview-secret'] = previewSecret;
  return { headers, token };
}

async function preflightBypass(url) {
  const { headers, token } = buildBypassHeaders();
  if (!token) return headers;
  try {
    const res = await fetch(url, { method: 'GET', headers, redirect: 'manual' });
    const sc = res.headers.get('set-cookie');
    if (sc) {
      const first = sc.split(',')[0].split(';')[0];
      headers['Cookie'] = headers['Cookie'] ? `${headers['Cookie']}; ${first}` : first;
    }
  } catch {
    // best-effort
  }
  return headers;
}

// Parse _vercel_jwt cookie from Set-Cookie header
function parseHandshakeCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const fragments = setCookieHeader.split('\n');
  for (const fragment of fragments) {
    const trimmed = fragment.trim();
    if (!trimmed) continue;
    const [cookiePair] = trimmed.split(';');
    if (cookiePair.startsWith('_vercel_jwt=')) {
      return cookiePair;
    }
  }
  return null;
}

// Apply preview bypass by setting cookies in the tiny-reactive browser context
// AND navigating to the root to complete the handshake.
// This is CRITICAL for preview environments - without it, browser-side fetch()
// calls will get 401 because document.cookie is empty.
//
// PERMANENT AUTH OPTIONS (checked in order):
// 1. .tiny-reactive-vercel-login.json - Your Vercel.com login (works for ALL previews)
//    Created by: node scripts/save_vercel_login.mjs
// 2. .tiny-reactive-vercel-auth.json - Preview-specific auth (works for one preview)
//    Created by: node scripts/login_to_vercel_once.mjs
// 3. Bypass token method (fallback if no saved auth)
async function applyPreviewBypassIfNeeded(client, baseUrl) {
  const VERCEL_LOGIN_FILE = './.tiny-reactive-vercel-login.json';
  const PREVIEW_AUTH_FILE = './.tiny-reactive-vercel-auth.json';

  // Option 1: Check for saved Vercel login (works for ALL preview URLs!)
  try {
    await access(VERCEL_LOGIN_FILE, constants.R_OK);

    // Load saved Vercel login - this is your actual Vercel.com account login!
    await client.trCmd({
      id: 'load-vercel-login',
      cmd: 'loadAuthState',
      args: { path: VERCEL_LOGIN_FILE }
    });

    console.log('✅ Loaded Vercel login from', VERCEL_LOGIN_FILE);
    return; // Done! Works for any preview URL
  } catch {
    // No saved Vercel login, try preview-specific auth
  }

  // Option 2: Check for preview-specific saved auth
  try {
    await access(PREVIEW_AUTH_FILE, constants.R_OK);

    // Load saved auth state - this includes all cookies from when you signed in!
    await client.trCmd({
      id: 'load-preview-auth',
      cmd: 'loadAuthState',
      args: { path: PREVIEW_AUTH_FILE }
    });

    console.log('✅ Loaded saved preview auth from', PREVIEW_AUTH_FILE);
    return; // Done! No bypass token needed
  } catch {
    // No saved auth, fall back to bypass token method
  }

  const token = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    || process.env.PREVIEW_BYPASS_TOKEN
    || process.env.BYPASS_TOKEN;
  const previewSecret = (process.env.PREVIEW_SECRET || '').trim();

  if (!token) {
    console.warn('⚠️  No saved auth and no bypass token. Run: node scripts/login_to_vercel_once.mjs');
    return;
  }

  try {
    // Preflight the preview root with bypass headers to trigger Vercel's
    // protection handshake and get the _vercel_jwt cookie.
    const preflightUrl = new URL(baseUrl);
    preflightUrl.pathname = '/';
    preflightUrl.searchParams.set('x-vercel-set-bypass-cookie', 'true');
    preflightUrl.searchParams.set('x-vercel-protection-bypass', token);

    const headers = {
      'x-vercel-protection-bypass': token,
      'x-vercel-set-bypass-cookie': 'true',
      Cookie: `vercel-protection-bypass=${token}`,
    };
    if (previewSecret) {
      headers['x-preview-secret'] = previewSecret;
    }

    const res = await fetch(preflightUrl.toString(), {
      method: 'GET',
      headers,
      redirect: 'manual',
    });

    const handshake = parseHandshakeCookie(res.headers.get('set-cookie'));
    const cookies = [];

    // Always set the protection-bypass cookie in the browser context so
    // pages that rely on it (not just APIs) see the same automation token.
    cookies.push({
      name: 'vercel-protection-bypass',
      value: token,
      url: baseUrl,
    });

    // If we received a _vercel_jwt cookie, propagate that as well so the
    // browser context looks authenticated to Vercel's protection layer.
    if (handshake) {
      const [name, ...rest] = handshake.split('=');
      const value = rest.join('=').split(';')[0];
      cookies.push({ name, value, url: baseUrl });
    }

    if (cookies.length) {
      await client.trCmd({
        id: 'set-cookie',
        cmd: 'setCookies',
        args: { cookies },
      });
    }

    // CRITICAL: After setting cookies, navigate to the preview root so the
    // browser completes the protection handshake in a real navigation context.
    // Without this step, the cookies won't be properly activated for API calls.
    await client.trCmd({
      id: 'open-root',
      cmd: 'open',
      args: { url: baseUrl, waitUntil: 'networkidle' },
      target: { contextId: 'default', pageId: 'active' }
    });
  } catch (error) {
    console.warn('⚠️  preview bypass cookie setup failed:', error.message);
  }
}

export function createTinyReactiveClient({ baseUrl, token }) {
  if (!baseUrl || !token) {
    throw new Error('createTinyReactiveClient: baseUrl and token are required');
  }

  async function trCmd(body) {
    // Inject bypass token into navigation URLs
    if (body?.cmd === 'open' && body.args?.url) {
      const { token } = buildBypassHeaders();
      if (token) {
        const u = new URL(body.args.url);
        u.searchParams.set('x-vercel-protection-bypass', token);
        u.searchParams.set('x-vercel-set-bypass-cookie', 'true');
        body.args.url = u.toString();
      }
    }

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/cmd`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
        Origin: baseUrl,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`tiny-reactive /cmd failed: ${res.status} ${text}`);
    }
    return await res.json();
  }

  async function openTool(url) {
    await trCmd({
      id: 'open-tool',
      cmd: 'open',
      args: { url, waitUntil: 'networkidle' },
    });
  }

  async function fillField(selector, value) {
    await trCmd({
      id: `fill-${selector}`,
      cmd: 'fill',
      args: { selector, value },
    });
  }

  async function clickButton(selector) {
    await trCmd({
      id: `click-${selector}`,
      cmd: 'click',
      args: { selector },
    });
  }

  async function waitForIframeText(selector, timeoutMs) {
    await trCmd({
      id: 'wait-iframe',
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const iframe = document.querySelector(${JSON.stringify(selector)});
          return iframe && typeof iframe.srcdoc === 'string' && iframe.srcdoc.trim().length > 0;
        }`,
        timeout: timeoutMs,
      },
    });
  }

  async function waitForSelector(selector, timeoutMs) {
    await trCmd({
      id: 'wait-selector',
      cmd: 'waitForFunction',
      args: {
        js: `() => !!document.querySelector(${JSON.stringify(selector)})`,
        timeout: timeoutMs,
      },
    });
  }

  async function waitForNonEmptyTable(tableSelector, emptyClass = 'empty-cell', timeoutMs) {
    await trCmd({
      id: 'wait-table',
      cmd: 'waitForFunction',
      args: {
        js: `() => {
          const table = document.querySelector(${JSON.stringify(tableSelector)});
          if (!table) return false;
          const tbody = table.querySelector('tbody');
          if (!tbody) return false;
          const rows = Array.from(tbody.querySelectorAll('tr'));
          if (!rows.length) return false;
          if (rows.length === 1) {
            const cell = rows[0].querySelector('td');
            if (cell && cell.classList.contains(${JSON.stringify(emptyClass)})) return false;
          }
          return true;
        }`,
        timeout: timeoutMs,
      },
    });
  }

  async function getText(selector) {
    const result = await trCmd({
      id: 'get-text',
      cmd: 'getText',
      args: { selector },
    });
    return result?.data?.text ?? null;
  }

  async function screenshot(pathOrAbsolute, options = {}) {
    // Request base64 from tiny-reactive and persist locally to avoid ARTIFACT_DIR mismatches.
    const res = await trCmd({
      id: 'screenshot',
      cmd: 'screenshot',
      args: { pathOrBase64: 'base64', fullPage: options.fullPage === true },
    });
    const base64 = res?.data?.base64 || res?.data || res?.base64;
    if (!base64) {
      throw new Error('screenshot: missing base64 payload');
    }
    const abs = path.isAbsolute(pathOrAbsolute)
      ? pathOrAbsolute
      : path.resolve(pathOrAbsolute);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, Buffer.from(base64, 'base64'));
    return abs;
  }

  return {
    trCmd,
    openTool,
    fillField,
    clickButton,
    waitForIframeText,
    waitForSelector,
    waitForNonEmptyTable,
    getText,
    screenshot,
    buildBypassHeaders,
    preflightBypass,
  };
}

// Expose helpers for harnesses that need to preflight
// preview URLs or construct consistent bypass headers.
export { buildBypassHeaders, preflightBypass, applyPreviewBypassIfNeeded };
