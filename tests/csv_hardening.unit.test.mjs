import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dlfHtmlPath = path.resolve(__dirname, '..', 'tools', 'dead-link-finder', 'index.html');

let cachedHelpers;

async function loadCsvHelpers() {
  if (cachedHelpers) return cachedHelpers;
  const source = await readFile(dlfHtmlPath, 'utf8');
  const protect = extractFunction(source, 'protectCSVCell');
  const csvVariants = extractBlock(source, 'const CSV_VARIANTS', 'function buildCSV');
  const buildCsv = extractFunction(source, 'buildCSV');
  const toCsv = extractFunction(source, 'toCSV');
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${protect}\n${csvVariants}\n${buildCsv}\n${toCsv}\nthis.helpers = { protectCSVCell, toCSV };`, context);
  cachedHelpers = context.helpers;
  return cachedHelpers;
}

function extractFunction(source, name) {
  const needle = `function ${name}`;
  const start = source.indexOf(needle);
  if (start === -1) {
    throw new Error(`Unable to locate function ${name} in ${dlfHtmlPath}`);
  }
  let braceIndex = source.indexOf('{', start);
  if (braceIndex === -1) {
    throw new Error(`Function ${name} missing opening brace in ${dlfHtmlPath}`);
  }
  braceIndex += 1;
  let depth = 1;
  let pos = braceIndex;
  while (depth > 0 && pos < source.length) {
    const char = source[pos];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    pos += 1;
  }
  return source.slice(start, pos);
}

function extractBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Unable to locate block starting with ${startMarker} in ${dlfHtmlPath}`);
  }
  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(`Unable to locate block end marker ${endMarker} in ${dlfHtmlPath}`);
  }
  return source.slice(start, end);
}

test('protectCSVCell guards spreadsheet formula prefixes', async () => {
  const { protectCSVCell } = await loadCsvHelpers();
  assert.strictEqual(protectCSVCell('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.strictEqual(protectCSVCell('+SUM'), "'+SUM");
  assert.strictEqual(protectCSVCell('-DELETE'), "'-DELETE");
  assert.strictEqual(protectCSVCell('@cmd'), "'@cmd");
  assert.strictEqual(protectCSVCell('  =cmd'), "'  =cmd");
  assert.strictEqual(protectCSVCell('safe value'), 'safe value');
});

test('toCSV prefixes risky cells and meta rows while keeping shape', async () => {
  const { toCSV } = await loadCsvHelpers();
  const csv = toCSV([
    {
      url: '=HYPERLINK("https://mal.example/")',
      status: 404,
      ok: false,
      finalUrl: '',
      archive: { url: 'https://web.archive.org/web/20240101000000/https://mal.example/' },
      note: '@alert',
      chain: 2
    }
  ], {
    requestId: '=RID42',
    warning: '-=oops'
  });

  assert.ok(csv.startsWith('\ufeff'));
  const rows = csv.slice(1).split('\n').filter(Boolean);
  assert.ok(rows[0].startsWith('url,status,ok'));
  const bodyRow = rows[1];
  assert.ok(bodyRow.includes("'=HYPERLINK"));
  assert.ok(bodyRow.includes("'@alert"));

  const metaSectionIndex = rows.findIndex((line) => line === '"meta_key","meta_value"');
  assert.notStrictEqual(metaSectionIndex, -1);
  const metaRows = rows.slice(metaSectionIndex + 1);
  assert.ok(metaRows.includes('"requestId","\'=RID42"'));
  assert.ok(metaRows.includes('"warning","\'-=oops"'));
});
