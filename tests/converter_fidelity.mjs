import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to invoke the Python fixture runner. It returns a summary that
// includes a compact "metrics" object describing lists, code blocks, and
// images for the primary markdown output.
function runFixture({ input, fromFormat, targets = ['md'] }) {
  return new Promise((resolve, reject) => {
    const script = join(__dirname, 'converter', 'fixture_runner.py');
    const args = ['-m', 'tests.converter.fixture_runner', '--input', input];
    if (fromFormat) {
      args.push('--from-format', fromFormat);
    }
    if (targets && targets.length) {
      args.push('--targets', targets.join(','));
    }

    const child = spawn('python3', args, { cwd: join(__dirname, '..') });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`fixture_runner exited with ${code}: ${err}`));
      }
      try {
        const parsed = JSON.parse(out);
        resolve(parsed);
      } catch (e) {
        reject(new Error(`failed to parse fixture_runner output: ${e}\nstdout:\n${out}\nstderr:\n${err}`));
      }
    });
  });
}

function loadGoldenMetrics(file) {
  const goldenPath = join(__dirname, 'golden', 'converter', file);
  const raw = readFileSync(goldenPath, 'utf8');
  return JSON.parse(raw);
}

test('converter fidelity – tech_doc.docx metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'tech_doc.docx');
  const summary = await runFixture({ input: fixture, fromFormat: 'docx', targets: ['md'] });
  assert.strictEqual(summary.name, 'tech_doc.docx');
  assert.ok(Array.isArray(summary.outputs));
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('tech_doc_docx.metrics.json');
  assert.deepStrictEqual(summary.metrics, golden);
});

test('converter fidelity – lists.docx metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'lists.docx');
  const summary = await runFixture({ input: fixture, fromFormat: 'docx', targets: ['md'] });
  assert.strictEqual(summary.name, 'lists.docx');
  assert.ok(Array.isArray(summary.outputs));
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('lists_docx.metrics.json');
  assert.deepStrictEqual(summary.metrics, golden);
});

test('converter fidelity – images.docx metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'images.docx');
  const summary = await runFixture({ input: fixture, fromFormat: 'docx', targets: ['md'] });
  assert.strictEqual(summary.name, 'images.docx');
  assert.ok(Array.isArray(summary.outputs));
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('images_docx.metrics.json');
  assert.deepStrictEqual(summary.metrics, golden);
});

test('converter fidelity – html_input.html metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'html_input.html');
  const summary = await runFixture({ input: fixture, fromFormat: 'html', targets: ['md'] });
  assert.strictEqual(summary.name, 'html_input.html');
  assert.ok(Array.isArray(summary.outputs) || summary.error);
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('html_input.metrics.json');
  assert.deepStrictEqual(summary.metrics, golden);
});
