import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  buildDlfPayload,
  statusGroup,
  buildCsv,
  summarizeRows
} from '../src/lib/tools/dead-link-finder/utils.js';

test('statusGroup buckets HTTP statuses correctly', () => {
  assert.equal(statusGroup(200), '2');
  assert.equal(statusGroup(204), '2');
  assert.equal(statusGroup(301), '3');
  assert.equal(statusGroup(404), '4');
  assert.equal(statusGroup(503), '5');
  assert.equal(statusGroup(null), 'null');
  assert.equal(statusGroup(undefined), 'null');
  assert.equal(statusGroup(700), 'null');
});

test('buildDlfPayload uses list mode when URLs list is present and caps at 200', () => {
  const list = Array.from({ length: 250 }, (_, i) => `example.com/${i}`).join('\n');
  const payload = buildDlfPayload({
    urlsList: list,
    pageUrl: 'example.com/page',
    respectRobots: true,
    scope: 'internal',
    includeAssets: false,
    headFirst: true,
    retryHttp: false,
    includeArchive: false,
    timeout: 5000,
    concurrency: 5
  });

  assert.equal(payload.mode, 'list');
  const lines = String(payload.list || '').split('\n').filter(Boolean);
  assert.equal(lines.length, 200);
});

test('buildDlfPayload falls back to crawl mode and coerces URL to https', () => {
  const payload = buildDlfPayload({
    pageUrl: 'example.com/legacy',
    urlsList: '',
    respectRobots: true,
    scope: 'all'
  });

  assert.equal(payload.mode, 'crawl');
  assert.equal(payload.pageUrl.startsWith('https://'), true);
});

test('buildCsv includes header and BOM', () => {
  const rows = [
    {
      url: 'https://example.com/',
      status: 200,
      ok: true,
      finalUrl: 'https://example.com/',
      archive: { url: 'https://web.archive.org/web/20240101000000/https://example.com/' },
      note: 'ok',
      chain: 0
    }
  ];

  const csv = buildCsv(rows, { totalChecked: 1 });
  assert.ok(csv.startsWith('\ufeff'));
  const lines = csv.slice(1).split('\n');
  assert.equal(lines[0], 'url,status,ok,finalUrl,archiveUrl,note,chain');
  assert.equal(lines[1].startsWith('"https://example.com/"'), true);
});

test('summarizeRows reports counts and robots/truncated flags', () => {
  const rows = [
    { url: 'a', status: 200, ok: true },
    { url: 'b', status: 404, ok: false },
    { url: 'c', status: null, ok: false }
  ];
  const meta = { robotsStatus: 'applied', truncated: true };

  const summary = summarizeRows(rows, meta);
  assert.ok(summary.includes('Checked 3 URL'));
  assert.ok(summary.includes('OK: 1'));
  assert.ok(summary.includes('Broken: 2'));
  assert.ok(summary.includes('Robots: applied'));
  assert.ok(summary.includes('Truncated'));
});
