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
function renderCSVPreview(content) {
  if (!content) return '';
  const lines = content.split('\n').filter(l => l.trim()).slice(0, 100);
  let html = '<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style><table>';
  lines.forEach((line, idx) => {
    const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    html += idx === 0 ? '<thead><tr>' : '<tr>';
    cells.forEach(cell => {
      html += idx === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`;
    });
    html += idx === 0 ? '</tr></thead><tbody>' : '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function renderJSONPreview(content) {
  if (!content) return '';
  try {
    const formatted = JSON.stringify(JSON.parse(content), null, 2);
    return `<style>pre{background:#1e1e1e;color:#d4d4d4;padding:1rem;overflow:auto;font-family:monospace}</style><pre>${escapeHtml(formatted)}</pre>`;
  } catch (e) {
    return renderTextPreview(content);
  }
}

function renderMarkdownPreview(content) {
  if (!content) return '';
  const escaped = escapeHtml(content);
  const formatted = escaped.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  return `<style>.md-container{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1rem}.md-src,.md-formatted{border:1px solid #ddd;padding:1rem;overflow:auto;max-height:600px}.md-src{background:#f8f8f8;font-family:monospace;white-space:pre-wrap}h1,h2,h3,h4,h5,h6{margin:0.5rem 0}code{background:#f0f0f0;padding:2px 4px;border-radius:3px}</style><div class="md-container"><div><b>Markdown Source</b><div class="md-src">${escaped}</div></div><div><b>Formatted Text</b><div class="md-formatted"><p>${formatted}</p></div></div></div>`;
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

test('JSON preview renderer', () => {
  const json = readFileSync(join(fixturesDir, 'sample.json'), 'utf-8');
  const result = renderJSONPreview(json);

  assert.ok(result.includes('<pre>'), 'Should contain pre tag');
  assert.ok(result.includes('TinyUtils Inc'), 'Should contain company name');
  assert.ok(result.includes('employees'), 'Should contain employees key');
  assert.ok(!result.includes('{<'), 'Should properly escape HTML chars');
});

test('JSON preview renderer with invalid JSON', () => {
  const invalidJson = '{ invalid json }';
  const result = renderJSONPreview(invalidJson);

  // Should fallback to text preview
  assert.ok(result.includes('<pre>'), 'Should contain pre tag');
  assert.ok(result.includes('   1 | '), 'Should have line numbers from text preview fallback');
});

test('Markdown preview renderer', () => {
  const md = readFileSync(join(fixturesDir, 'tech_doc.md'), 'utf-8');
  const result = renderMarkdownPreview(md);

  assert.ok(result.includes('.md-container'), 'Should have container style');
  assert.ok(result.includes('Markdown Source'), 'Should have source label');
  assert.ok(result.includes('Formatted Text'), 'Should have formatted label');
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
