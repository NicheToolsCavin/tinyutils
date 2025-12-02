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

  // Spot-check: verify structure through metrics (not just counts)
  assert.ok(summary.metrics.codeBlocks.total > 0, 'should have code blocks');
  assert.ok(summary.metrics.lists.ordered > 0, 'should have ordered lists');
  assert.ok(summary.metrics.lists.bullet > 0 || summary.metrics.lists.ordered > 1,
            'should have multiple list structures');
});

test('converter fidelity – lists.docx metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'lists.docx');
  const summary = await runFixture({ input: fixture, fromFormat: 'docx', targets: ['md'] });
  assert.strictEqual(summary.name, 'lists.docx');
  assert.ok(Array.isArray(summary.outputs));
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('lists_docx.metrics.json');
  assert.deepStrictEqual(summary.metrics, golden);

  // Spot-check: verify nested list structure through depth metrics
  assert.ok(summary.metrics.lists.maxDepth >= 2, 'should have nested lists (depth >= 2)');
  assert.ok(summary.metrics.lists.ordered > 0, 'should have ordered lists');
  assert.ok(summary.metrics.lists.bullet > 0, 'should have bullet lists');
  assert.ok(summary.metrics.lists.ordered + summary.metrics.lists.bullet >= 3,
            'should have multiple list structures');
});

test('converter fidelity – images.docx metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'images.docx');
  const summary = await runFixture({ input: fixture, fromFormat: 'docx', targets: ['md'] });
  assert.strictEqual(summary.name, 'images.docx');
  assert.ok(Array.isArray(summary.outputs));
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('images_docx.metrics.json');
  assert.deepStrictEqual(summary.metrics, golden);

  // Spot-check: verify image metrics structure exists (extraction may or may not find images)
  assert.ok(typeof summary.metrics.images === 'object', 'should have images metrics object');
  assert.ok(typeof summary.metrics.images.total === 'number', 'should have numeric image count');
});

test('converter fidelity – html_input.html metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'html_input.html');
  const summary = await runFixture({ input: fixture, fromFormat: 'html', targets: ['md'] });
  assert.strictEqual(summary.name, 'html_input.html');
  assert.ok(Array.isArray(summary.outputs) || summary.error);
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('html_input.metrics.json');
  assert.deepStrictEqual(summary.metrics, golden);

  // Spot-check: verify HTML conversion preserved structures
  assert.ok(summary.metrics.codeBlocks.total > 0, 'should preserve code blocks from <pre><code>');
  assert.ok(summary.metrics.lists.ordered > 0 || summary.metrics.lists.bullet > 0,
            'should preserve lists from HTML');
  // Verify data URL sanitization didn't crash conversion (no error field)
  assert.ok(!summary.error, 'should not have conversion errors from data URLs');
});

test('converter fidelity – November 16-30.odt metrics stable (ODT→Markdown)', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'November 16-30.odt');
  const summary = await runFixture({ input: fixture, fromFormat: 'odt', targets: ['md'] });
  assert.strictEqual(summary.name, 'November 16-30.odt');
  assert.ok(Array.isArray(summary.outputs), 'should have outputs array');
  assert.ok(!summary.error, 'should not have conversion errors');
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('november_16_30_odt.metrics.json');
  const expectedMetrics = {
    lists: golden.conversions.to_markdown.lists,
    codeBlocks: golden.conversions.to_markdown.codeBlocks,
    images: golden.conversions.to_markdown.images
  };
  assert.deepStrictEqual(summary.metrics, expectedMetrics);

  // Spot-check: validate critical non-blank output for ODT→DOCX bug fix
  assert.ok(summary.outputs[0].size >= golden.conversions.to_markdown.min_output_bytes,
            'markdown output should meet minimum size threshold (validates no blank output)');
  assert.ok(summary.outputs[0].size > 0, 'should not produce blank output');
});

test('converter fidelity – blog_post.docx metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'blog_post.docx');
  const summary = await runFixture({ input: fixture, fromFormat: 'docx', targets: ['md'] });
  assert.strictEqual(summary.name, 'blog_post.docx');
  assert.ok(Array.isArray(summary.outputs), 'should have outputs array');
  assert.ok(!summary.error, 'should not have conversion errors');
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('blog_post_docx.metrics.json');
  assert.deepStrictEqual(summary.metrics, golden);

  // Spot-check: verify rich document structure preservation
  assert.ok(summary.metrics.codeBlocks.total > 0, 'should preserve code blocks');
  assert.ok(summary.metrics.lists.bullet > 0, 'should preserve bullet lists');
  assert.ok(summary.metrics.lists.ordered > 0, 'should preserve ordered lists');
});

test('converter fidelity – report_2025_annual.docx metrics stable', async () => {
  const fixture = join(__dirname, 'fixtures', 'converter', 'report_2025_annual.docx');
  const summary = await runFixture({ input: fixture, fromFormat: 'docx', targets: ['md'] });
  assert.strictEqual(summary.name, 'report_2025_annual.docx');
  assert.ok(Array.isArray(summary.outputs), 'should have outputs array');
  assert.ok(!summary.error, 'should not have conversion errors');
  assert.ok(summary.metrics, 'expected metrics on summary');

  const golden = loadGoldenMetrics('report_2025_annual_docx.metrics.json');
  assert.deepStrictEqual(summary.metrics, golden);

  // Spot-check: verify complex document structure (nested lists, many items)
  assert.ok(summary.metrics.lists.bullet >= 10, 'should preserve many bullet items');
  assert.ok(summary.metrics.lists.ordered >= 2, 'should preserve ordered lists');
  assert.ok(summary.metrics.lists.maxDepth >= 2, 'should preserve nested lists');
});
