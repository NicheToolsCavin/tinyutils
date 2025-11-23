export const config = { runtime: 'edge' };

const MAX_INPUT_FILES = 64;
const MAX_MD_OUTPUTS = 256;
const CONVERT_TIMEOUT_MS = 120000;
const BLOB_TIMEOUT_MS = 60000;
const TEXT_PREVIEW_MAX_CHARS = 600;
const MAX_TEXT_CHARS = 250000; // hard cap for pasted text
const MAX_BLOB_BYTES = 2 * 1024 * 1024; // per-blob cap (~2MB) for decoded content

function rid() {
  return Math.random().toString(16).slice(2, 10);
}

function jsonResponse(status, payload, requestId, extraHeaders) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  if (requestId) headers.set('x-request-id', requestId);
  if (extraHeaders && typeof extraHeaders === 'object') {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value);
    }
  }
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
    text: null,
    files: []
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptions(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};

  const autoRepair = src.autoRepair !== false;
  const smartPunctuation = src.smartPunctuation !== false;

  let normalizeForm = null;
  if (typeof src.normalizeForm === 'string') {
    const form = src.normalizeForm.trim().toUpperCase();
    if (form === 'NFC' || form === 'NFKC') {
      normalizeForm = form;
    } else if (form === 'NONE' || form === 'OFF' || form === 'DISABLED') {
      normalizeForm = null;
    }
  }

  // Default: NFC normalization if nothing explicitly requested.
  if (normalizeForm === null && !Object.prototype.hasOwnProperty.call(src, 'normalizeForm')) {
    normalizeForm = 'NFC';
  }

  return { autoRepair, normalizeForm, smartPunctuation };
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
  if (bytes.length > MAX_BLOB_BYTES) {
    const err = new Error('blob_payload_too_large');
    err.code = 'blob_payload_too_large';
    throw err;
  }
  const dec = new TextDecoder('utf-8', { fatal: false });
  return dec.decode(bytes);
}

function isPrivateHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function assertSafeBlobHttpUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    const err = new Error('invalid_blob_url');
    err.code = 'invalid_blob_url';
    throw err;
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    const err = new Error('unsupported_blob_scheme');
    err.code = 'unsupported_blob_scheme';
    throw err;
  }

  const host = url.hostname.toLowerCase();
  if (isPrivateHost(host)) {
    const err = new Error('disallowed_blob_host');
    err.code = 'disallowed_blob_host';
    throw err;
  }

  const allowed =
    host === 'tinyutils.net' ||
    host === 'www.tinyutils.net' ||
    host.endsWith('.tinyutils.net') ||
    host.endsWith('.vercel.app');

  if (!allowed) {
    const err = new Error('disallowed_blob_host');
    err.code = 'disallowed_blob_host';
    throw err;
  }
}

async function loadTextFromBlobUrl(url, timeoutMs = BLOB_TIMEOUT_MS) {
  const value = String(url || '');
  if (!value) throw new Error('missing_blob_url');

  if (value.startsWith('data:')) {
    return decodeDataUrlToText(value);
  }

  assertSafeBlobHttpUrl(value);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(value, { signal: controller.signal });
    if (!res.ok) throw new Error(`blob_fetch_${res.status}`);
    const contentLength = Number(res.headers.get('content-length') || '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_BLOB_BYTES) {
      const err = new Error('blob_payload_too_large');
      err.code = 'blob_payload_too_large';
      throw err;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BLOB_BYTES) {
      const err = new Error('blob_payload_too_large');
      err.code = 'blob_payload_too_large';
      throw err;
    }
    const dec = new TextDecoder('utf-8', { fatal: false });
    return dec.decode(buf);
  } finally {
    clearTimeout(timeoutId);
  }
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

// Common mojibake sequences: UTF-8 decoded as Latin-1/Windows-1252.
// This is intentionally not exhaustive; it's a curated subset of frequent glitches.
const MOJIBAKE_LETTERS = {
  'Ã€': 'À',
  'Ã': 'Á',
  'Ã‚': 'Â',
  'Ãƒ': 'Ã',
  'Ã„': 'Ä',
  'Ã…': 'Å',
  'Ã†': 'Æ',
  'Ã‡': 'Ç',
  'Ãˆ': 'È',
  'Ã‰': 'É',
  'ÃŠ': 'Ê',
  'Ã‹': 'Ë',
  'ÃŒ': 'Ì',
  'Ã': 'Í',
  'ÃŽ': 'Î',
  'Ã': 'Ï',
  'Ã‘': 'Ñ',
  'Ã’': 'Ò',
  'Ã“': 'Ó',
  'Ã”': 'Ô',
  'Ã•': 'Õ',
  'Ã–': 'Ö',
  'Ã™': 'Ù',
  'Ãš': 'Ú',
  'Ã›': 'Û',
  'Ãœ': 'Ü',
  'ÃŸ': 'ß',
  'Ã ': 'à',
  'Ã¡': 'á',
  'Ã¢': 'â',
  'Ã£': 'ã',
  'Ã¤': 'ä',
  'Ã¥': 'å',
  'Ã¦': 'æ',
  'Ã§': 'ç',
  'Ã¨': 'è',
  'Ã©': 'é',
  'Ãª': 'ê',
  'Ã«': 'ë',
  'Ã¬': 'ì',
  'Ã­': 'í',
  'Ã®': 'î',
  'Ã¯': 'ï',
  'Ã°': 'ð',
  'Ã±': 'ñ',
  'Ã²': 'ò',
  'Ã³': 'ó',
  'Ã´': 'ô',
  'Ãµ': 'õ',
  'Ã¶': 'ö',
  'Ã·': '÷',
  'Ã¸': 'ø',
  'Ã¹': 'ù',
  'Ãº': 'ú',
  'Ã»': 'û',
  'Ã¼': 'ü',
  'Ã½': 'ý',
  'Ã¾': 'þ',
  'Ã¿': 'ÿ'
};

// Mojibake for smart punctuation: mis-decoded UTF-8 curly quotes/dashes/ellipsis.
const MOJIBAKE_QUOTES = {
  'â€œ': '“',
  'â€': '”',
  'â€˜': '‘',
  'â€™': '’'
};

const MOJIBAKE_DASHES = {
  'â€“': '–',
  'â€”': '—'
};

const MOJIBAKE_MISC = {
  'â€¦': '…',
  'â€¢': '•'
};

function replaceAllSimple(input, search, replacement) {
  const source = String(input || '');
  const needle = String(search || '');
  if (!needle) return { text: source, count: 0 };

  let idx = source.indexOf(needle);
  if (idx === -1) return { text: source, count: 0 };

  let out = '';
  let last = 0;
  let count = 0;

  while (idx !== -1) {
    out += source.slice(last, idx) + replacement;
    last = idx + needle.length;
    count += 1;
    idx = source.indexOf(needle, last);
  }

  out += source.slice(last);
  return { text: out, count };
}

function replaceRegexWithCount(input, regex, replacer) {
  const source = String(input || '');
  if (!regex) return { text: source, count: 0 };

  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const re = new RegExp(regex.source, flags);
  let count = 0;

  const out = source.replace(re, (...args) => {
    count += 1;
    if (typeof replacer === 'function') {
      return replacer(...args);
    }
    return replacer;
  });

  return { text: out, count };
}

function applyMojibakeMap(text, map, stats, extraStats) {
  let current = text;
  for (const [bad, good] of Object.entries(map)) {
    const { text: next, count } = replaceAllSimple(current, bad, good);
    current = next;
    if (count > 0) {
      stats.mojibakeSequencesFixed += count;
      if (extraStats && Array.isArray(extraStats)) {
        for (const key of extraStats) {
          stats[key] += count;
        }
      }
    }
  }
  return current;
}

function repairText(input, options) {
  const stats = {
    mojibakeSequencesFixed: 0,
    quotesFixed: 0,
    dashesFixed: 0,
    whitespaceNormalized: 0,
    normalizationApplied: false,
    latin1FallbackApplied: false
  };

  let text = String(input || '');

   // Optional latin1->UTF-8 fallback when strong mojibake signals are present.
  if (options.autoRepair) {
    const original = text;
    const maybeDecoded = maybeDecodeLatin1ToUtf8(original);
    if (maybeDecoded !== original) {
      text = maybeDecoded;
      stats.latin1FallbackApplied = true;
    }
  }

  // 1) Mojibake repair (letters + punctuation).
  if (options.autoRepair) {
    text = applyMojibakeMap(text, MOJIBAKE_LETTERS, stats);
    text = applyMojibakeMap(text, MOJIBAKE_QUOTES, stats, ['quotesFixed']);
    text = applyMojibakeMap(text, MOJIBAKE_DASHES, stats, ['dashesFixed']);
    text = applyMojibakeMap(text, MOJIBAKE_MISC, stats);
  }

  // 2) Unicode normalization.
  if (options.normalizeForm && typeof ''.normalize === 'function') {
    const normalized = text.normalize(options.normalizeForm);
    if (normalized !== text) {
      text = normalized;
      stats.normalizationApplied = true;
    }
  }

  // 3) Smart punctuation & whitespace.
  if (options.smartPunctuation) {
    // Curly apostrophes in words: don't → don’t
    const apostropheRe = /([A-Za-zÀ-ÖØ-öø-ÿ])'([A-Za-zÀ-ÖØ-öø-ÿ])/g;
    let result = replaceRegexWithCount(text, apostropheRe, (_m, a, b) => `${a}’${b}`);
    text = result.text;
    stats.quotesFixed += result.count;

    // ASCII double-hyphen between spaces → em dash
    result = replaceRegexWithCount(text, /(\s)--(\s)/g, (_m, before, after) => `${before}—${after}`);
    text = result.text;
    stats.dashesFixed += result.count;

    // Long runs of hyphens between spaces → em dash
    result = replaceRegexWithCount(text, /(\s)-{3,}(\s)/g, (_m, before, after) => `${before}—${after}`);
    text = result.text;
    stats.dashesFixed += result.count;

    // Triple dots → ellipsis
    result = replaceAllSimple(text, '...', '…');
    text = result.text;
    if (result.count > 0) {
      stats.whitespaceNormalized += result.count;
    }

    // Non-breaking and narrow spaces → regular space
    result = replaceRegexWithCount(text, /[\u00A0\u2007\u202F]/g, ' ');
    text = result.text;
    stats.whitespaceNormalized += result.count;

    // Trim trailing spaces before newlines
    result = replaceRegexWithCount(text, /[ \t]+(\r?\n)/g, (_m, newline) => newline);
    text = result.text;
    stats.whitespaceNormalized += result.count;
  }

  return { text, stats };
}

function countMojibakeSignals(value) {
  const source = String(value || '');
  if (!source) return 0;
  let count = 0;
  for (const bad of Object.keys(MOJIBAKE_LETTERS)) {
    if (source.includes(bad)) {
      count += 1;
      if (count >= 4) break;
    }
  }
  return count;
}

function maybeDecodeLatin1ToUtf8(value) {
  const source = String(value || '');
  if (!source) return source;

  const signals = countMojibakeSignals(source);
  if (signals < 4) return source;

  const bytes = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    bytes[i] = source.charCodeAt(i) & 0xff;
  }

  let decoded;
  try {
    const dec = new TextDecoder('utf-8', { fatal: false });
    decoded = dec.decode(bytes);
  } catch {
    return source;
  }

  const beforeSignals = countMojibakeSignals(source);
  const afterSignals = countMojibakeSignals(decoded);
  if (afterSignals < beforeSignals) {
    return decoded;
  }
  return source;
}

function buildSummary(stats, options) {
  const parts = [];
  const s = stats || {};

  if (s.mojibakeSequencesFixed) {
    parts.push(
      `fixed ${s.mojibakeSequencesFixed} mojibake sequence${s.mojibakeSequencesFixed === 1 ? '' : 's'}`
    );
  }

  if (s.quotesFixed) {
    parts.push(
      `normalized ${s.quotesFixed} quote${s.quotesFixed === 1 ? '' : 's'}`
    );
  }

  if (s.dashesFixed) {
    parts.push(
      `normalized ${s.dashesFixed} dash${s.dashesFixed === 1 ? '' : 'es'}`
    );
  }

  if (s.whitespaceNormalized) {
    parts.push(
      `cleaned up whitespace in ${s.whitespaceNormalized} place${s.whitespaceNormalized === 1 ? '' : 's'}`
    );
  }

  if (options.normalizeForm && s.normalizationApplied) {
    parts.push(`applied ${options.normalizeForm} normalization`);
  }

  if (s.latin1FallbackApplied) {
    parts.push('redecoded text from Latin-1/Windows-1252');
  }

  if (!parts.length) {
    if (options.autoRepair || options.smartPunctuation || options.normalizeForm) {
      return 'No obvious encoding issues were found with the current settings.';
    }
    return 'No transformations were applied.';
  }

  const [first, ...rest] = parts;
  let summary = first.charAt(0).toUpperCase() + first.slice(1);
  if (rest.length === 1) {
    summary += ` and ${rest[0]}`;
  } else if (rest.length > 1) {
    summary += `, ${rest.slice(0, -1).join(', ')}, and ${rest[rest.length - 1]}`;
  }

  return `${summary}.`;
}

function buildPreview(text, maxChars = TEXT_PREVIEW_MAX_CHARS) {
  const source = String(text || '');
  if (source.length <= maxChars) return source;
  return `${source.slice(0, maxChars).replace(/\s+$/u, '')}…`;
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

  const rawText = typeof body.text === 'string' ? body.text : '';
  const files = safeArray(body.files)
    .map((f) => ({
      name: String(f && f.name ? f.name : 'input'),
      blobUrl: String(f && f.blobUrl ? f.blobUrl : '')
    }))
    .filter((f) => !!f.blobUrl);

  const options = normalizeOptions(body.options);
  const textTrimmed = trimOrEmpty(rawText);
  const hasText = textTrimmed.length > 0;
  const hasFiles = files.length > 0;

  if (!hasText && !hasFiles) {
    const payload = buildErrorMeta(
      'Paste some text or add at least one file.',
      'missing_input',
      requestId
    );
    return jsonResponse(400, payload, requestId);
  }

  if (hasText && rawText.length > MAX_TEXT_CHARS) {
    const payload = buildErrorMeta(
      `Text input is too large. Maximum supported length is ${MAX_TEXT_CHARS} characters.`,
      'text_too_large',
      requestId
    );
    return jsonResponse(413, payload, requestId);
  }

  if (files.length > MAX_INPUT_FILES) {
    const payload = buildErrorMeta(
      `Too many files. Maximum supported is ${MAX_INPUT_FILES}.`,
      'too_many_files',
      requestId
    );
    return jsonResponse(400, payload, requestId);
  }

  const encoder = new TextEncoder();
  const textBlock = {
    original: '',
    fixed: '',
    summary: ''
  };
  const fileResults = [];

  // Text-only path (does not require converter).
  if (hasText) {
    const { text: fixed, stats } = repairText(rawText, options);
    textBlock.original = buildPreview(rawText);
    textBlock.fixed = fixed;
    textBlock.summary = buildSummary(stats, options);
  }

  // File path: convert to Markdown, repair, and expose as data URLs.
  if (hasFiles) {
    let mdOutputs;
    try {
      mdOutputs = await callConvertToMarkdown(
        request,
        files.map((f) => ({ name: f.name, blobUrl: f.blobUrl })),
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

    for (const out of mdOutputs) {
      const displayName = String(out.name || 'document.md');

      let originalText;
      try {
        originalText = await loadTextFromBlobUrl(out.blobUrl);
      } catch (err) {
        const code = err && err.code;
        if (code === 'blob_payload_too_large') {
          const payload = buildErrorMeta(
            `Converted text for ${displayName} is too large to process safely.`,
            'blob_payload_too_large',
            requestId
          );
          return jsonResponse(413, payload, requestId);
        }
        if (
          code === 'invalid_blob_url' ||
          code === 'unsupported_blob_scheme' ||
          code === 'disallowed_blob_host'
        ) {
          const payload = buildErrorMeta(
            `Invalid or disallowed blobUrl for ${displayName}.`,
            code,
            requestId
          );
          return jsonResponse(400, payload, requestId);
        }
        const payload = buildErrorMeta(
          `Failed to download converted text for ${displayName}`,
          (err && err.message) || 'blob_download_failed',
          requestId
        );
        return jsonResponse(502, payload, requestId);
      }

      const { text: fixedText, stats } = repairText(originalText, options);
      const summary = buildSummary(stats, options);

      const previewOriginal = buildPreview(originalText);
      const previewFixed = buildPreview(fixedText);

      const bytes = encoder.encode(fixedText);
      const base64 = encodeBase64(bytes);
      const contentType = 'text/markdown; charset=utf-8';
      const blobUrl = `data:text/markdown;base64,${base64}`;

      fileResults.push({
        name: displayName,
        summary,
        previewOriginal,
        previewFixed,
        blobUrl,
        contentType
      });
    }
  }

  const payload = {
    ok: true,
    meta: {
      requestId,
      textIncluded: hasText,
      fileCount: fileResults.length,
      options: {
        autoRepair: options.autoRepair,
        normalizeForm: options.normalizeForm,
        smartPunctuation: options.smartPunctuation
      }
    },
    text: textBlock,
    files: fileResults
  };

  return jsonResponse(200, payload, requestId);
}
