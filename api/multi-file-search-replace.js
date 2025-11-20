export const config = { runtime: 'edge' };

const MAX_INPUT_FILES = 64;
const MAX_MD_OUTPUTS = 256;
const MAX_DIFF_LINES = 1500;
const CONVERT_TIMEOUT_MS = 120000;
const BLOB_TIMEOUT_MS = 60000;
const FETCH_TIMEOUT_MS = 10000; // Default timeout for external fetches
const MAX_RETRY_DELAY = 1000; // Maximum jitter delay in ms

function rid() {
  return Math.random().toString(16).slice(2, 10);
}

function jsonResponse(status, payload, requestId) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  if (requestId) headers.set('x-request-id', requestId);
  return new Response(JSON.stringify(payload), { status, headers });
}

function requestIdFrom(req) {
  try {
    const incoming = req.headers.get('x-request-id');
    if (incoming) return String(incoming).trim().slice(0, 64);
  } catch {
    // ignore
  }
  return rid();
}

function buildErrorMeta(message, note, requestId) {
  return {
    ok: false,
    meta: {
      error: message || null,
      note: note || null,
      requestId
    },
    files: []
  };
}

// Check if a URL is safe to fetch from (not private/loopback/local)
function isSafeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    
    // Allow data URLs as they don't involve network requests
    if (url.protocol === 'data:') {
      return true;
    }
    
    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    
    // Block private IP addresses (RFC 1918, 127.0.0.0/8, 169.254.0.0/16, etc.)
    const hostname = url.hostname.toLowerCase();
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    if (ipRegex.test(hostname)) {
      const [a, b] = hostname.split('.').map(Number);
      if (a === 127) return false; // localhost
      if (a === 10) return false; // 10.0.0.0/8
      if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
      if (a === 192 && b === 168) return false; // 192.168.0.0/16
      if (a === 169 && b === 254) return false; // 169.254.0.0/16
    }
    
    // Block .local domains (mDNS)
    if (hostname.endsWith('.local')) return false;
    
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '[::1]' || hostname.startsWith('ip6-')) return false;
    
    return true;
  } catch (error) {
    // If URL parsing fails, consider it unsafe
    return false;
  }
}

function normalizeMode(raw) {
  const value = (raw || '').toString().toLowerCase();
  return value === 'regex' ? 'regex' : 'text';
}

function normalizeFlags(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    caseSensitive: !!src.caseSensitive,
    global: src.global !== false, // default to global on
    multiline: !!src.multiline
  };
}

function normalizeExportFormat(raw) {
  const value = (raw || '').toString().toLowerCase();
  if (value === 'txt' || value === 'text' || value === 'text/plain') return 'txt';
  // Default: normalized markdown
  return 'md';
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeStem(name) {
  const str = String(name || '').trim() || 'document';
  const lastSeg = str.split(/[\\/]/).filter(Boolean).pop() || 'document';
  const dot = lastSeg.lastIndexOf('.');
  const base = dot > 0 ? lastSeg.slice(0, dot) : lastSeg;
  return base || 'document';
}

function ensureExtension(name, ext) {
  const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
  const str = String(name || '').trim() || `document${cleanExt}`;
  const parts = str.split('/');
  const last = parts.pop() || '';
  const dot = last.lastIndexOf('.');
  const base = dot > 0 ? last.slice(0, dot) : last;
  parts.push(base + cleanExt);
  return parts.join('/') || base + cleanExt;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  // First check if the URL is safe
  if (!isSafeUrl(url)) {
    throw new Error('unsafe_url');
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  // First attempt
  let response;
  try {
    response = await fetchWithTimeout(url, options, timeoutMs);
    
    // If successful, return immediately
    if (response.ok) {
      return response;
    }
  } catch (error) {
    // If it's a network error or timeout, continue to retry
    if (error.name === 'AbortError') {
      throw new Error(`fetch_timeout_after_${timeoutMs}ms`);
    }
  }
  
  // If first attempt failed with 429 or 5xx, retry once with jitter
  if (response && (response.status === 429 || response.status >= 500)) {
    // Add small jitter before retry
    const jitterDelay = Math.floor(Math.random() * MAX_RETRY_DELAY);
    await new Promise(resolve => setTimeout(resolve, jitterDelay));
    
    try {
      return await fetchWithTimeout(url, options, timeoutMs);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`fetch_timeout_after_${timeoutMs}ms_on_retry`);
      }
      throw error;
    }
  }
  
  // Return the original response if it wasn't a 429 or 5xx
  return response;
}

async function loadTextFromBlobUrl(url, timeoutMs = BLOB_TIMEOUT_MS) {
  const value = String(url || '');
  if (!value) throw new Error('missing_blob_url');

  if (value.startsWith('data:')) {
    return decodeDataUrlToText(value);
  }

  // Check if URL is safe before fetching
  if (!isSafeUrl(value)) {
    throw new Error('unsafe_blob_url');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(value, { signal: controller.signal });
    if (!res.ok) throw new Error(`blob_fetch_${res.status}`);
    const buf = await res.arrayBuffer();
    const dec = new TextDecoder('utf-8', { fatal: false });
    return dec.decode(buf);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadBytesFromBlobUrl(url, timeoutMs = BLOB_TIMEOUT_MS) {
  const value = String(url || '');
  if (!value) throw new Error('missing_blob_url');

  if (value.startsWith('data:')) {
    return decodeDataUrlToBytes(value);
  }

  // Check if URL is safe before fetching
  if (!isSafeUrl(value)) {
    throw new Error('unsafe_blob_url');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(value, { signal: controller.signal });
    if (!res.ok) throw new Error(`blob_fetch_${res.status}`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } finally {
    clearTimeout(timeoutId);
  }
}

function decodeDataUrlToBytes(url) {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/i.exec(String(url || ''));
  if (!match) throw new Error('invalid_data_url');
  const base64 = !!match[2];
  const payload = match[3] || '';

  if (base64) {
    if (typeof atob === 'function') {
      const bin = atob(payload);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) {
        out[i] = bin.charCodeAt(i);
      }
      return out;
    }
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(payload, 'base64'));
    }
    throw new Error('base64_unsupported');
  }

  const decoded = decodeURIComponent(payload.replace(/\+/g, ' '));
  const enc = new TextEncoder();
  return enc.encode(decoded);
}

function decodeDataUrlToText(url) {
  const bytes = decodeDataUrlToBytes(url);
  const dec = new TextDecoder('utf-8', { fatal: false });
  return dec.decode(bytes);
}

function applySearchReplace(text, search, replace, mode, flags) {
  const source = String(text || '');
  const pattern = String(search || '');
  const replacement = String(replace ?? '');

  if (!pattern) {
    return { text: source, matches: 0 };
  }

  if (mode === 'regex') {
    let flagStr = '';
    if (flags.global) flagStr += 'g';
    if (!flags.caseSensitive) flagStr += 'i';
    if (flags.multiline) flagStr += 'm';

    let re;
    try {
      re = new RegExp(pattern, flagStr);
    } catch {
      const err = new Error('invalid_regex');
      err.code = 'invalid_regex';
      throw err;
    }

    let matches = 0;
    if (flags.global) {
      const iter = source.matchAll(re);
      for (const _ of iter) {
        matches += 1;
        if (matches > 1e6) break; // sanity cap
      }
    } else {
      matches = re.test(source) ? 1 : 0;
    }

    if (!matches) {
      return { text: source, matches: 0 };
    }

    const next = source.replace(re, replacement);
    return { text: next, matches };
  }

  // Plain text mode
  const haystack = flags.caseSensitive ? source : source.toLowerCase();
  const needle = flags.caseSensitive ? pattern : pattern.toLowerCase();
  if (!needle) return { text: source, matches: 0 };

  if (!flags.global) {
    const idx = haystack.indexOf(needle);
    if (idx === -1) return { text: source, matches: 0 };
    const before = source.slice(0, idx);
    const after = source.slice(idx + pattern.length);
    return { text: before + replacement + after, matches: 1 };
  }

  let idx = 0;
  let last = 0;
  let out = '';
  let matches = 0;
  const length = needle.length;

  while (true) {
    const pos = haystack.indexOf(needle, idx);
    if (pos === -1) break;
    out += source.slice(last, pos) + replacement;
    idx = pos + length;
    last = idx;
    matches += 1;
    if (matches > 1e6) break; // safety cap
  }

  if (!matches) {
    return { text: source, matches: 0 };
  }

  out += source.slice(last);
  return { text: out, matches };
}

function buildLineDiff(before, after, maxLines = MAX_DIFF_LINES) {
  const a = String(before || '').split(/\r?\n/);
  const b = String(after || '').split(/\r?\n/);
  const total = a.length + b.length;

  if (!total) {
    return { truncated: false, lines: [] };
  }

  if (total > maxLines) {
    return { truncated: true, lines: [] };
  }

  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = dp[i + 1][j] >= dp[i][j + 1] ? dp[i + 1][j] : dp[i][j + 1];
      }
    }
  }

  const lines = [];
  let i = 0;
  let j = 0;
  let oldLine = 1;
  let newLine = 1;

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      lines.push({
        type: 'context',
        oldLine,
        newLine,
        text: a[i]
      });
      i += 1;
      j += 1;
      oldLine += 1;
      newLine += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({
        type: 'remove',
        oldLine,
        newLine: null,
        text: a[i]
      });
      i += 1;
      oldLine += 1;
    } else {
      lines.push({
        type: 'add',
        oldLine: null,
        newLine,
        text: b[j]
      });
      j += 1;
      newLine += 1;
    }
  }

  while (i < n) {
    lines.push({
      type: 'remove',
      oldLine,
      newLine: null,
      text: a[i]
    });
    i += 1;
    oldLine += 1;
  }

  while (j < m) {
    lines.push({
      type: 'add',
      oldLine: null,
      newLine,
      text: b[j]
    });
    j += 1;
    newLine += 1;
  }

  return { truncated: false, lines };
}

function crc32(bytes) {
  const table = crc32.table || (crc32.table = makeCrc32Table());
  let crc = -1;

  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i];
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }

  return (crc ^ -1) >>> 0;
}

function makeCrc32Table() {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c >>>= 1;
      }
    }
    table[i] = c >>> 0;
  }

  return table;
}

function concatUint8Arrays(chunks) {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;

  const out = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }

  return out;
}

function makeZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let count = 0;

  for (const entry of entries) {
    const nameStr = entry.name || `document-${count + 1}.txt`;
    const nameBytes = encoder.encode(nameStr);
    const data = entry.bytes || new Uint8Array(0);
    const crc = crc32(data);
    const size = data.length;

    // CSV hardening: prefix values beginning with dangerous characters to prevent spreadsheet injection
    let processedData = data;
    if (nameStr.toLowerCase().endsWith('.csv')) {
      const text = new TextDecoder().decode(data);
      const lines = text.split('\n');
      const processedLines = lines.map(line => {
        if (line.startsWith('=') || line.startsWith('+') || line.startsWith('-') || line.startsWith('@')) {
          return "'" + line;
        }
        return line;
      });
      processedData = encoder.encode(processedLines.join('\n'));
    }

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local file header signature
    lv.setUint16(4, 20, true); // version needed to extract
    lv.setUint16(6, 0, true); // general purpose bit flag
    lv.setUint16(8, 0, true); // compression method (store)
    lv.setUint16(10, 0, true); // last mod time
    lv.setUint16(12, 0, true); // last mod date
    lv.setUint32(14, crc >>> 0, true); // crc-32
    lv.setUint32(18, size >>> 0, true); // compressed size
    lv.setUint32(22, size >>> 0, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // file name length
    lv.setUint16(28, 0, true); // extra field length
    local.set(nameBytes, 30);

    localParts.push(local);
    localParts.push(processedData); // Use processed data to harden CSV

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // central file header signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed to extract
    cv.setUint16(8, 0, true); // general purpose flag
    cv.setUint16(10, 0, true); // compression method
    cv.setUint16(12, 0, true); // last mod time
    cv.setUint16(14, 0, true); // last mod date
    cv.setUint32(16, crc >>> 0, true); // crc
    cv.setUint32(20, size >>> 0, true); // compressed size
    cv.setUint32(24, size >>> 0, true); // uncompressed size
    cv.setUint16(28, nameBytes.length, true); // file name length
    cv.setUint16(30, 0, true); // extra length
    cv.setUint16(32, 0, true); // comment length
    cv.setUint16(34, 0, true); // disk number start
    cv.setUint16(36, 0, true); // internal attributes
    cv.setUint32(38, 0, true); // external attributes
    cv.setUint32(42, offset >>> 0, true); // relative local header offset
    central.set(nameBytes, 46);

    centralParts.push(central);

    offset += local.length + size;
    count += 1;
  }

  const centralDir = concatUint8Arrays(centralParts);
  const centralOffset = offset;
  const centralSize = centralDir.length;

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central dir signature
  ev.setUint16(4, 0, true); // this disk
  ev.setUint16(6, 0, true); // disk with start
  ev.setUint16(8, count, true); // total entries on this disk
  ev.setUint16(10, count, true); // total entries
  ev.setUint32(12, centralSize >>> 0, true); // size of central dir
  ev.setUint32(16, centralOffset >>> 0, true); // offset of central dir
  ev.setUint16(20, 0, true); // comment length

  return concatUint8Arrays([...localParts, centralDir, end]);
}

function encodeBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Very small manual base64 fallback
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;

  while (i < bytes.length) {
    const chr1 = bytes[i++];
    const chr2 = i < bytes.length ? bytes[i++] : NaN;
    const chr3 = i < bytes.length ? bytes[i++] : NaN;

    const enc1 = chr1 >> 2;
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    const enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    const enc4 = chr3 & 63;

    if (Number.isNaN(chr2)) {
      output += alphabet.charAt(enc1) + alphabet.charAt(enc2) + '==';
    } else if (Number.isNaN(chr3)) {
      output += alphabet.charAt(enc1) + alphabet.charAt(enc2) + alphabet.charAt(enc3) + '=';
    } else {
      output +=
        alphabet.charAt(enc1) +
        alphabet.charAt(enc2) +
        alphabet.charAt(enc3) +
        alphabet.charAt(enc4);
    }
  }

  return output;
}

async function callConvertToMarkdown(request, inputs, requestId) {
  if (!inputs.length) return [];

  const payload = {
    inputs,
    from: 'auto',
    to: ['md'],
    options: {
      acceptTrackedChanges: true,
      extractMedia: false,
      removeZeroWidth: true
    }
  };

  const url = new URL('/api/convert', request.url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONVERT_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    const error = new Error('convert_invalid_json');
    error.cause = err;
    throw error;
  }

  if (!res.ok || !data || data.ok === false) {
    const note =
      (data && data.meta && (data.meta.error || data.meta.note)) ||
      `convert_http_${res.status}`;
    const error = new Error('convert_failed');
    error.note = note;
    throw error;
  }

  const outputs = Array.isArray(data.outputs) ? data.outputs : [];
  const mdOutputs = outputs.filter((out) => out && out.target === 'md').slice(0, MAX_MD_OUTPUTS);
  return mdOutputs;
}

export default async function handler(request) {
  const requestId = requestIdFrom(request);

  if (request.method !== 'POST') {
    const payload = buildErrorMeta('Method not allowed', 'method_not_allowed', requestId);
    return jsonResponse(405, payload, requestId);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    const payload = buildErrorMeta('Invalid JSON body', 'invalid_json', requestId);
    return jsonResponse(400, payload, requestId);
  }

  const files = safeArray(body.files).map((f) => ({
    name: String(f && f.name ? f.name : 'input'),
    blobUrl: String(f && f.blobUrl ? f.blobUrl : '')
  }));

  const mode = normalizeMode(body.mode);
  const flags = normalizeFlags(body.flags);
  const search = trimOrEmpty(body.search);
  const replace = typeof body.replace === 'string' ? body.replace : '';
  const exportFormat = normalizeExportFormat(body.exportFormat);
  const previewOnly = !!body.previewOnly;

  const includeNames = new Set(
    safeArray(body.includeNames)
      .map((n) => String(n || '').trim())
      .filter(Boolean)
  );

  // Check for missing required inputs
  if (!files.length) {
    const payload = buildErrorMeta('At least one file is required', 'no_files', requestId);
    return jsonResponse(400, payload, requestId);
  }

  if (files.length > MAX_INPUT_FILES) {
    const payload = buildErrorMeta(
      `Too many files. Maximum supported is ${MAX_INPUT_FILES}.`,
      'too_many_files',
      requestId
    );
    return jsonResponse(400, payload, requestId);
  }

  if (!search) {
    const payload = buildErrorMeta('Search pattern is required', 'missing_search', requestId);
    return jsonResponse(400, payload, requestId);
  }

  // Validate that all file URLs are safe
  for (const file of files) {
    if (file.blobUrl && !isSafeUrl(file.blobUrl)) {
      const payload = buildErrorMeta(`Unsafe URL detected in file: ${file.blobUrl}`, 'unsafe_url', requestId);
      return jsonResponse(400, payload, requestId);
    }
  }

  let mdOutputs;
  try {
    mdOutputs = await callConvertToMarkdown(
      request,
      files.map((f) => ({ blobUrl: f.blobUrl, name: f.name })),
      requestId
    );
  } catch (err) {
    const note = err && err.note ? String(err.note) : (err && err.message) || 'convert_failed';
    const payload = buildErrorMeta('Conversion to text failed', note, requestId);
    return jsonResponse(502, payload, requestId);
  }

  if (!mdOutputs.length) {
    const payload = buildErrorMeta(
      'No convertible documents were found in the upload',
      'no_md_outputs',
      requestId
    );
    return jsonResponse(400, payload, requestId);
  }

  const encoder = new TextEncoder();
  const fileResults = [];
  const zipEntries = [];
  let changedCount = 0;

  for (const out of mdOutputs) {
    const displayName = String(out.name || 'document.md');

    let originalText;
    try {
      originalText = await loadTextFromBlobUrl(out.blobUrl);
    } catch (err) {
      const payload = buildErrorMeta(
        `Failed to download converted text for ${displayName}`,
        (err && err.message) || 'blob_download_failed',
        requestId
      );
      return jsonResponse(502, payload, requestId);
    }

    let replaced;
    try {
      replaced = applySearchReplace(originalText, search, replace, mode, flags);
    } catch (err) {
      if (err && err.code === 'invalid_regex') {
        const payload = buildErrorMeta('Invalid regular expression', 'invalid_regex', requestId);
        return jsonResponse(400, payload, requestId);
      }
      const payload = buildErrorMeta('Search and replace failed', 'search_replace_failed', requestId);
      return jsonResponse(500, payload, requestId);
    }

    const changed = replaced.matches > 0 && replaced.text !== originalText;
    const diff = buildLineDiff(originalText, replaced.text);

    // Check diff line count to prevent excessive output
    if (!diff.truncated && diff.lines.length > MAX_DIFF_LINES) {
      const payload = buildErrorMeta(
        `Diff output too large. Maximum ${MAX_DIFF_LINES} lines allowed.`,
        'diff_too_large',
        requestId
      );
      return jsonResponse(400, payload, requestId);
    }

    fileResults.push({
      name: displayName,
      matches: replaced.matches,
      changed,
      diff
    });

    if (changed) {
      if (!includeNames.size || includeNames.has(displayName)) {
        changedCount += 1;  // Always count changed files, even in preview mode
      }
      if (!previewOnly) {  // Only create zip entries when not in preview mode
        if (!includeNames.size || includeNames.has(displayName)) {
          const ext = exportFormat === 'txt' ? '.txt' : '.md';
          const exportName = ensureExtension(displayName, ext);
          const bytes = encoder.encode(replaced.text);
          zipEntries.push({ name: exportName, bytes });
        }
      }
    }
  }

  let zipMeta = null;
  if (!previewOnly && zipEntries.length) {
    const zipBytes = makeZip(zipEntries);
    const base64 = encodeBase64(zipBytes);
    zipMeta = {
      name: 'tinyutils-multi-file-replace.zip',
      contentType: 'application/zip',
      size: zipBytes.length,
      blobUrl: `data:application/zip;base64,${base64}`
    };
  }

  const payload = {
    ok: true,
    meta: {
      requestId,
      totalFiles: fileResults.length,
      changedFiles: changedCount,
      exportFormat,
      previewOnly,
      zip: zipMeta
    },
    files: fileResults
  };

  return jsonResponse(200, payload, requestId);
}