// Tiny-reactive HTTP client and basic UI actions used by E2E tests.

import { mkdir, writeFile } from 'node:fs/promises';
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
