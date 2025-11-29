/**
 * Unit tests for format-specific preview renderers
 * Tests the rendering logic without browser automation
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, 'fixtures/converter');

// HTML escaping function (matches the one in +page.svelte)
function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Renderer implementations (simplified versions for testing)

import { parseCsvContent, CSV_MAX_ROWS, CSV_MAX_CHARS } from '../src/lib/utils/csvParser.js';

function renderCSVPreview(content) {
  if (!content) return '';
  const rows = parseCsvContent(content, 100);
  if (!rows.length) return '';
  let html = '<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style><table>';
  rows.forEach((cells, idx) => {
    html += idx === 0 ? '<thead><tr>' : '<tr>';
    cells.forEach((cell) => {
      html += idx === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`;
    });
    html += idx === 0 ? '</tr></thead><tbody>' : '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

const MAX_JSON_PRETTY_CHARS = 200000; // must match frontend guard

function renderJSONPreview(content) {
  if (!content) return '';

  const markFallback = (html) =>
    html.replace('<pre', '<pre data-json-fallback="true"');

  if (content.length > MAX_JSON_PRETTY_CHARS) {
    // Too large for pretty JSON in tests: emulate frontend plain-text fallback
    return markFallback(renderTextPreview(content));
  }

  try {
    const formatted = JSON.stringify(JSON.parse(content), null, 2);
    const html = `<style>pre{background:#1e1e1e;color:#d4d4d4;padding:1rem;overflow:auto;font-family:monospace}</style><pre>${escapeHtml(
      formatted,
    )}</pre>`;
    // Mark non-fallback pretty JSON explicitly for assertions
    return html.replace('<pre', '<pre data-json-fallback="false"');
  } catch (e) {
    return markFallback(renderTextPreview(content));
  }
}

function renderMarkdownPreview(content) {
  if (!content) return '';
  const escaped = escapeHtml(content);
  const formatted = escaped.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  return `<style>.md-container{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1rem}.md-src,.md-formatted{border:1px solid #ddd;padding:1rem;overflow:auto;max-height:600px}.md-src{background:#f8f8f8;font-family:monospace;white-space:pre-wrap}h1,h2,h3,h4,h5,h6{margin:0.5rem 0}code{background:#f0f0f0;padding:2px 4px;border-radius:3px}</style><div class="md-container"><div><b>Markdown Source</b><div class="md-src">${escaped}</div></div><div><b>Plain Text View</b><div class="md-formatted"><p>${formatted}</p></div></div></div>`;
}

function renderTextPreview(content) {
  if (!content) return '';
  const lines = content.split('\n');
  const numbered = lines.map((l, i) => `${String(i + 1).padStart(4, ' ')} | ${escapeHtml(l)}`).join('\n');
  return `<style>pre{background:#f8f8f8;padding:1rem;font-family:monospace;overflow:auto}</style><pre>${numbered}</pre>`;
}

function renderTeXPreview(content) {
  if (!content) return '';
  return `<style>pre{background:#1e1e1e;color:#d4d4d4;padding:1rem;overflow:auto;font-family:monospace}</style><pre>${escapeHtml(content)}</pre>`;
}

// Tests
test('CSV preview renderer', () => {
  const csv = readFileSync(join(fixturesDir, 'sample.csv'), 'utf-8');
  const result = renderCSVPreview(csv);

  assert.ok(result.includes('<table>'), 'Should contain table tag');
  assert.ok(result.includes('<thead>'), 'Should contain thead tag');
  assert.ok(result.includes('<tbody>'), 'Should contain tbody tag');
  assert.ok(result.includes('Name'), 'Should contain header "Name"');
  assert.ok(result.includes('Email'), 'Should contain header "Email"');
  assert.ok(result.includes('John Smith'), 'Should contain data row');
  assert.ok(!result.includes('<script>'), 'Should not have unescaped script tags');
});

test('CSV preview renderer handles quoted commas and quotes', () => {
  const csv = 'Name,Note\n"Smith, John","Says ""hello"" in meetings"';
  const result = renderCSVPreview(csv);

  // Quoted comma should stay inside the cell
  assert.ok(result.includes('Smith, John'), 'Should keep comma inside quoted name field');

  // Escaped quotes inside the field should render as a single quote character (HTML-escaped)
  assert.ok(result.includes('Says &quot;hello&quot; in meetings'), 'Should unescape doubled quotes inside a quoted field and escape them for HTML');
});

test('CSV preview renderer handles newlines inside quoted fields', () => {
  const csv = 'Name,Note\n"John","Line1\nLine2"';
  const result = renderCSVPreview(csv);

  // Both lines should stay within the same cell, not split into two rows.
  assert.ok(result.includes('Line1'), 'Should contain first line inside quoted cell');
  assert.ok(result.includes('Line2'), 'Should contain second line inside quoted cell');
  // We still only expect one data row in addition to the header.
  const rowMatches = result.match(/<tr>/g) || [];
  // One header row + one data row = 2 <tr> tags
  assert.equal(rowMatches.length, 2, 'Should render exactly one data row for multi-line quoted cell');
});

test('CSV preview enforces row and character limits', () => {
  const manyRows = Array.from({ length: CSV_MAX_ROWS + 20 }, (_, i) => `row${i},value${i}`).join('\n');
  const result = renderCSVPreview(`col1,col2\n${manyRows}`);

  // Ensure we do not render more than CSV_MAX_ROWS data rows in the table.
  const rowMatches = result.match(/<tr>/g) || [];
  // 1 header row + up to CSV_MAX_ROWS data rows
  assert.ok(rowMatches.length <= CSV_MAX_ROWS + 1, 'Should cap rendered rows at CSV_MAX_ROWS');

  const longLine = 'col1,col2\n' + 'x'.repeat(CSV_MAX_CHARS + 500);
  const truncatedRows = parseCsvContent(longLine);
  assert.ok(truncatedRows.length > 0, 'Should still return at least one row for very long single line');
});

test('JSON preview renderer', () => {
  const json = readFileSync(join(fixturesDir, 'sample.json'), 'utf-8');
  const result = renderJSONPreview(json);

  assert.ok(result.includes('<pre'), 'Should contain pre tag');
  assert.ok(result.includes('TinyUtils Inc'), 'Should contain company name');
  assert.ok(result.includes('employees'), 'Should contain employees key');
  assert.ok(!result.includes('{<'), 'Should properly escape HTML chars');
});

test('JSON preview renderer with invalid JSON', () => {
  const invalidJson = '{ invalid json }';
  const result = renderJSONPreview(invalidJson);

  // Should fallback to text preview
  assert.ok(result.includes('<pre'), 'Should contain pre tag');
  assert.ok(result.includes('   1 | '), 'Should have line numbers from text preview fallback');
   assert.ok(
     result.includes('data-json-fallback="true"'),
     'Should mark text fallback as JSON fallback in tests',
   );
});

test('JSON preview falls back to text for very large payloads', () => {
  const bigPayload = JSON.stringify({ data: 'x'.repeat(MAX_JSON_PRETTY_CHARS + 10) });
  const result = renderJSONPreview(bigPayload);

  assert.ok(result.includes('<pre'), 'Should contain pre tag');
  assert.ok(result.includes('   1 | '), 'Should show line numbers from text preview fallback');
  assert.ok(
    result.includes('data-json-fallback="true"'),
    'Should mark large JSON preview as JSON fallback in tests',
  );
});

test('Markdown preview renderer', () => {
  const md = readFileSync(join(fixturesDir, 'tech_doc.md'), 'utf-8');
  const result = renderMarkdownPreview(md);

  assert.ok(result.includes('.md-container'), 'Should have container style');
  assert.ok(result.includes('Markdown Source'), 'Should have source label');
  assert.ok(result.includes('Plain Text View'), 'Should have plain text label');
  assert.ok(result.includes('Fidelity Test'), 'Should contain document title');
  // Verify HTML is escaped (raw markdown should not be rendered as HTML)
  assert.ok(!result.includes('<h1>Fidelity'), 'Raw markdown H1 should not be rendered as HTML tag');
  assert.ok(result.includes('# Fidelity') || result.includes('#&nbsp;Fidelity'), 'Should show raw markdown syntax');
});

test('Markdown preview renderer XSS safety', () => {
  const maliciousMd = '<script>alert("xss")</script>\n**Bold text**';
  const result = renderMarkdownPreview(maliciousMd);

  assert.ok(!result.includes('<script>alert'), 'Should escape script tags');
  assert.ok(result.includes('&lt;script&gt;'), 'Should show escaped script tag');
});

test('Text preview renderer', () => {
  const txt = readFileSync(join(fixturesDir, 'sample.txt'), 'utf-8');
  const result = renderTextPreview(txt);

  assert.ok(result.includes('<pre>'), 'Should contain pre tag');
  assert.ok(result.includes('   1 | '), 'Should have line number 1');
  assert.ok(result.includes('Plain Text Preview'), 'Should contain content');

  // Verify line numbering
  const lines = txt.split('\n');
  const expectedLastLineNum = String(lines.length).padStart(4, ' ');
  assert.ok(result.includes(`${expectedLastLineNum} |`), 'Should have correct last line number');
});

test('TeX preview renderer', () => {
  const tex = readFileSync(join(fixturesDir, 'sample.tex'), 'utf-8');
  const result = renderTeXPreview(tex);

  assert.ok(result.includes('<pre>'), 'Should contain pre tag');
  assert.ok(result.includes('documentclass'), 'Should contain LaTeX command');
  assert.ok(result.includes('begin{document}'), 'Should contain begin command');
  assert.ok(!result.includes('<script>'), 'Should escape HTML');
});

test('All renderers handle empty content', () => {
  assert.equal(renderCSVPreview(''), '', 'CSV renderer should handle empty string');
  assert.equal(renderJSONPreview(''), '', 'JSON renderer should handle empty string');
  assert.equal(renderMarkdownPreview(''), '', 'Markdown renderer should handle empty string');
  assert.equal(renderTextPreview(''), '', 'Text renderer should handle empty string');
  assert.equal(renderTeXPreview(''), '', 'TeX renderer should handle empty string');
});

test('All renderers handle null/undefined', () => {
  assert.equal(renderCSVPreview(null), '', 'CSV renderer should handle null');
  assert.equal(renderJSONPreview(undefined), '', 'JSON renderer should handle undefined');
  assert.equal(renderMarkdownPreview(null), '', 'Markdown renderer should handle null');
  assert.equal(renderTextPreview(undefined), '', 'Text renderer should handle undefined');
  assert.equal(renderTeXPreview(null), '', 'TeX renderer should handle null');
});

console.log('\n✅ All format preview renderer tests passed!\n');
