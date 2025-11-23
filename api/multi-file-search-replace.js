export const config = { runtime: 'edge' };

const MAX_INPUT_FILES = 64;
const MAX_MD_OUTPUTS = 256;
const MAX_DIFF_LINES = 1500;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB cap across all decoded inputs
const MAX_PATTERN_LENGTH = 4096;
const CONVERT_TIMEOUT_MS = 120000;
const BLOB_TIMEOUT_MS = 60000;
const RETRY_BACKOFF_MS = 300; // jitter base for retry

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
  const value = (raw || '').toString().toLowerCase().trim();
  if (!value || value === 'md' || value === 'markdown' || value === 'text/markdown') return 'md';
  if (value === 'txt' || value === 'text' || value === 'text/plain') return 'txt';

  const err = new Error('invalid_export_format');
  err.code = 'invalid_export_format';
  throw err;
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
  let raw = String(name || '').trim();

  if (!raw) {
    return `document${cleanExt}`;
  }

  // Strip simple Windows drive prefixes like C:\ or C:/.
  raw = raw.replace(/^[a-zA-Z]:[\\/]/, '');

  // Normalise path separators and strip leading slashes.
  let str = raw.replace(/\\/g, '/');
  str = str.replace(/^\/+/, '');

  const parts = str.split('/');
  const safeParts = [];

  for (const rawPart of parts) {
    const part = String(rawPart || '').trim();
    if (!part || part === '.' || part === '..') continue;
    safeParts.push(part);
  }

  const lastSeg = safeParts.length ? safeParts[safeParts.length - 1] : 'document';
  const dot = lastSeg.lastIndexOf('.');
  const base = dot > 0 ? lastSeg.slice(0, dot) : lastSeg;
  const safeBase = base || 'document';
  const dirParts = safeParts.length > 1 ? safeParts.slice(0, -1) : [];
  const fileName = safeBase + cleanExt;

  if (!dirParts.length) return fileName;
  return `${dirParts.join('/')}/${fileName}`;
}

function isPrivateHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === '0.0.0.0'
  );
}

function assertPublicHttp(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    const err = new Error('invalid_url');
    err.code = 'invalid_url';
    throw err;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    const err = new Error('unsupported_scheme');
    err.code = 'unsupported_scheme';
    throw err;
  }

  if (isPrivateHost(parsed.hostname)) {
    const err = new Error('disallowed_host');
    err.code = 'disallowed_host';
    throw err;
  }
}

function jitter(ms) {
  const delta = Math.floor(Math.random() * 50);
  return ms + delta;
}

async function loadTextFromBlobUrl(url, timeoutMs = BLOB_TIMEOUT_MS) {
  const value = String(url || '');
  if (!value) throw new Error('missing_blob_url');

  if (value.startsWith('data:')) {
    return decodeDataUrlToText(value);
  }

  assertPublicHttp(value);

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

  assertPublicHttp(value);

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
    localParts.push(data);

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

function buildBypassHeaders(request) {
  const headers = {};
  const bypass =
    request.headers.get('x-vercel-protection-bypass') ||
    request.headers.get('x-vercel-bypass-token');
  const previewSecret = request.headers.get('x-preview-secret');
  const cookie = request.headers.get('cookie');

  if (bypass) {
    headers['x-vercel-protection-bypass'] = bypass;
  }
  if (previewSecret) {
    headers['x-preview-secret'] = previewSecret;
  }
  if (cookie && /vercel-protection-bypass=/.test(cookie)) {
    headers['Cookie'] = cookie;
  }

  return headers;
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

  const baseHeaders = {
    'content-type': 'application/json',
    'x-request-id': requestId,
    ...buildBypassHeaders(request)
  };

  async function attempt() {
    return fetch(url.toString(), {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  }

  let res;
  try {
    res = await attempt();
    if (res && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, jitter(RETRY_BACKOFF_MS)));
      res = await attempt();
    }
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
  let exportFormat;
  try {
    exportFormat = normalizeExportFormat(body.exportFormat);
  } catch (err) {
    if (err && err.code === 'invalid_export_format') {
      const payload = buildErrorMeta('Unsupported export format', 'invalid_export_format', requestId);
      return jsonResponse(400, payload, requestId);
    }
    const payload = buildErrorMeta('Invalid export format', 'export_format_error', requestId);
    return jsonResponse(400, payload, requestId);
  }
  const previewOnly = !!body.previewOnly;

  const includeNames = new Set(
    safeArray(body.includeNames)
      .map((n) => String(n || '').trim())
      .filter(Boolean)
  );

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

  if (search.length > MAX_PATTERN_LENGTH || replace.length > MAX_PATTERN_LENGTH) {
    const payload = buildErrorMeta('Input too large', 'pattern_too_large', requestId);
    return jsonResponse(413, payload, requestId);
  }

  let mdOutputs;
  // Fast path for preview-only requests with inline data: URLs. Avoids relying on
  // /api/convert during protected preview deployments, which can return 5xx and
  // break smoke checks.
  const allDataUrls = files.every((f) => f.blobUrl && f.blobUrl.startsWith('data:'));
  if (previewOnly && allDataUrls) {
    mdOutputs = files.map((f) => ({ name: f.name || 'document.md', blobUrl: f.blobUrl }));
  } else {
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
  let totalBytes = 0;

  for (const out of mdOutputs) {
    const displayName = String(out.name || 'document.md');

    let originalText;
    try {
      originalText = await loadTextFromBlobUrl(out.blobUrl);
    } catch (err) {
      if (err && (err.code === 'disallowed_host' || err.code === 'unsupported_scheme' || err.code === 'invalid_url')) {
        const payload = buildErrorMeta('Source URL is not allowed', err.code, requestId);
        return jsonResponse(400, payload, requestId);
      }
      const payload = buildErrorMeta(
        `Failed to download converted text for ${displayName}`,
        (err && err.message) || 'blob_download_failed',
        requestId
      );
      return jsonResponse(502, payload, requestId);
    }

    const byteLength = encoder.encode(originalText).length;
    totalBytes += byteLength;
    if (totalBytes > MAX_TOTAL_BYTES) {
      const payload = buildErrorMeta('Total input too large', 'too_large', requestId);
      return jsonResponse(413, payload, requestId);
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

    fileResults.push({
      name: displayName,
      matches: replaced.matches,
      changed,
      diff
    });

    if (changed) {
      changedCount += 1;
      if (!previewOnly) {
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
