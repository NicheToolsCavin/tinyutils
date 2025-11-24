// Utility helpers for the Dead Link Finder front-end.
// Mirrors legacy behavior so /api/check receives the same payloads/exports.

const MAX_URLS = 200;
const TIMEOUT_MIN = 1000;
const TIMEOUT_MAX = 30000;
const CONCURRENCY_MIN = 1;
const CONCURRENCY_MAX = 10;

/** Clamp a value with defaults and bounds. */
export function clampNumber(value, min, max, defaultValue) {
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultValue;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/** Strip trailing inline comments introduced by '#' or '//'. */
export function stripInlineComments(line) {
  return String(line || '')
    .replace(/\s+#.*$/, '')
    .replace(/\s+\/\/.*$/, '')
    .trim();
}

/** Normalize loose URL input into an https:// URL when needed. */
export function coerceUrl(input) {
  let s = String(input || '').trim();
  if (!s) return '';
  if (s.startsWith('//')) s = 'https:' + s;
  if (!/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(s)) s = 'https://' + s;
  return s;
}

/** Split newline/comma/semicolon separated values into unique URLs. */
export function splitMulti(value) {
  return String(value || '')
    .split(/[\r\n,;]+/)
    .map(stripInlineComments)
    .map(coerceUrl)
    .filter(Boolean);
}

/**
 * Build the payload the Dead Link Finder Edge API expects.
 * Prefers list mode when a URL list is provided; otherwise crawl mode.
 */
export function buildDlfPayload(input) {
  const base = {
    respectRobots: input.respectRobots !== false,
    scope: input.scope || 'internal',
    includeAssets: !!input.includeAssets,
    headFirst: input.headFirst !== false,
    retryHttp: !!input.retryHttp,
    includeArchive: !!input.includeArchive,
    timeout: clampNumber(input.timeout ?? 10000, TIMEOUT_MIN, TIMEOUT_MAX, 10000),
    concurrency: clampNumber(input.concurrency ?? 10, CONCURRENCY_MIN, CONCURRENCY_MAX, 10)
  };

  const rawTargets = input.urlsList ?? '';
  let urls = splitMulti(rawTargets);
  const unique = Array.from(new Set(urls));
  if (unique.length > MAX_URLS) {
    urls = unique.slice(0, MAX_URLS);
  } else {
    urls = unique;
  }

  if (urls.length > 0) {
    return { ...base, mode: 'list', list: urls.join('\n') };
  }

  const rawPage = input.pageUrl ?? '';
  const cleanedPage = stripInlineComments(rawPage);
  const pageUrl = coerceUrl(cleanedPage);

  if (!pageUrl) {
    throw new Error('Please enter a valid page URL.');
  }

  return { ...base, mode: 'crawl', pageUrl };
}

/** Group HTTP status into UI buckets. */
export function statusGroup(status) {
  if (status == null) return 'null';
  const n = Number(status);
  if (n >= 200 && n < 300) return '2';
  if (n >= 300 && n < 400) return '3';
  if (n >= 400 && n < 500) return '4';
  if (n >= 500 && n < 600) return '5';
  return 'null';
}

/** Protect potentially dangerous CSV cells from being interpreted as formulas. */
export function protectCsvCell(value) {
  const str = String(value ?? '');
  const trimmed = str.trimStart();
  return /^[=+\-@]/.test(trimmed) ? "'" + str : str;
}

/** Escape a single CSV cell including quotes. */
export function escapeCsvCell(value) {
  return `"${protectCsvCell(String(value ?? '')).replace(/"/g, '""')}"`;
}

/** Build a CSV string (UTF-8 with BOM) of core DLF columns, optional meta block. */
export function buildCsv(rows, meta, includeMetaSection = true) {
  const header = ['url', 'status', 'ok', 'finalUrl', 'archiveUrl', 'note', 'chain'];
  const lines = [header.join(',')];

  (rows || []).forEach((row) => {
    const archiveUrl = row && row.archive && row.archive.url ? row.archive.url : '';
    lines.push(
      [
        row?.url ?? '',
        row?.status ?? '',
        row?.ok ? 'true' : 'false',
        row?.finalUrl ?? '',
        archiveUrl ?? '',
        row?.note ?? '',
        row?.chain ?? 0
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  if (includeMetaSection && meta && typeof meta === 'object') {
    const compact = {};
    for (const [key, value] of Object.entries(meta)) {
      if (value === undefined) continue;
      compact[key] = value;
    }
    const metaKeys = Object.keys(compact);
    if (metaKeys.length > 0) {
      lines.push('');
      lines.push(['meta_key', 'meta_value'].map(escapeCsvCell).join(','));
      for (const key of metaKeys) {
        const value = compact[key];
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        lines.push([key, serialized].map(escapeCsvCell).join(','));
      }
    }
  }

  const csv = lines.join('\n');
  return `\ufeff${csv}`; // BOM so Excel behaves
}

/** Build a human-readable one-line summary of results. */
export function summarizeRows(rows, meta) {
  const list = rows || [];
  if (list.length === 0) return 'No results yet. Run a check to see broken links.';

  let okCount = 0;
  let brokenCount = 0;
  const groups = { '2': 0, '3': 0, '4': 0, '5': 0, null: 0 };

  for (const row of list) {
    if (row?.ok) okCount += 1;
    else brokenCount += 1;
    const g = statusGroup(row?.status ?? null);
    if (g in groups) {
      groups[g] += 1;
    } else {
      groups.null += 1;
    }
  }

  const parts = [];
  parts.push(`Checked ${list.length} URL${list.length === 1 ? '' : 's'}`);
  parts.push(`OK: ${okCount}`);
  parts.push(`Broken: ${brokenCount}`);
  parts.push(
    `2xx: ${groups['2']}, 3xx: ${groups['3']}, 4xx: ${groups['4']}, 5xx: ${groups['5']}${
      groups.null ? `, other/null: ${groups.null}` : ''
    }`
  );

  if (meta?.robotsStatus) parts.push(`Robots: ${meta.robotsStatus}`);
  if (meta?.truncated) parts.push('Truncated (politeness limits)');

  return parts.join(' · ');
}

/** Make a dated filename like dead-link-finder-2025-10-08.csv. */
export function makeDatedFilename(base, ext) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base}-${stamp}.${ext}`;
}
