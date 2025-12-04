import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_API_URL = process.env.LOCAL_API_URL || 'http://localhost:3000';
const FIXTURES_PATH = path.resolve(__dirname, '../../fixtures/converter');

// Check if local server is available before running tests
async function isServerAvailable() {
  try {
    const res = await fetch(`${LOCAL_API_URL}/api/convert/health`, {
      signal: AbortSignal.timeout(2000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function uploadFileAndConvert(filePath, options = {}, targetFormat = 'md') {
  const fileContent = fs.readFileSync(filePath);
  const filename = path.basename(filePath);

  const formData = new FormData();
  formData.append('inputs', JSON.stringify([{ name: filename, blobUrl: null }]));
  formData.append('from', 'docx');
  formData.append('to', targetFormat);
  formData.append('options', JSON.stringify(options));
  formData.append(
    'file',
    new Blob([
      fileContent,
    ], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    filename,
  );

  const url = `${LOCAL_API_URL}/api/convert`;
  const res = await fetch(url, { method: 'POST', body: formData });

  return res;
}

async function testDocxToMarkdownBasic() {
  console.log('Running testDocxToMarkdownBasic...');
  const docxFilePath = path.join(FIXTURES_PATH, 'alignment_color_sample.docx');
  const response = await uploadFileAndConvert(docxFilePath);

  assert.equal(response.status, 200, 'Expected 200 OK for basic DOCX to MD conversion');

  const contentType = response.headers.get('content-type');
  assert.ok(
    contentType && contentType.includes('application/json'),
    `Expected content-type to be application/json, got ${contentType}`,
  );

  const jsonResponse = await response.json();
  assert.ok(jsonResponse.ok, 'Expected response.ok to be true');
  assert.ok(jsonResponse.outputs && jsonResponse.outputs.length > 0, 'Expected at least one output');
  assert.equal(jsonResponse.outputs[0].target, 'md', 'Expected output target to be md');

  const markdownContent = jsonResponse.outputs[0].data;
  assert.ok(markdownContent, 'Expected markdown content to be non-empty');
  assert.equal(typeof markdownContent, 'string', 'Expected markdown content to be a string');

  // Generic sanity checks for a DOCX→MD conversion.
  assert.ok(
    /# |## |### /.test(markdownContent) || /\*\*|__|\*_/.test(markdownContent),
    'Expected markdown content to contain headings or bold/italic formatting',
  );

  console.log('testDocxToMarkdownBasic PASSED');
}

async function testAlignmentColorStylingHtml() {
  console.log('Running testAlignmentColorStylingHtml...');
  const docxFilePath = path.join(FIXTURES_PATH, 'alignment_color_sample.docx');

  // Phase 3/5: when LibreOffice integration is wired, callers can opt in
  // via options.use_libreoffice/preserve_*; for now we just exercise the
  // HTML path and look for generic styling hints.
  const optionsWithStyling = {
    use_libreoffice: true,
    preserve_colors: true,
    preserve_alignment: true,
  };

  const response = await uploadFileAndConvert(docxFilePath, optionsWithStyling, 'html');

  assert.equal(response.status, 200, 'Expected 200 OK for styling test');

  const contentType = response.headers.get('content-type');
  assert.ok(
    contentType && contentType.includes('application/json'),
    `Expected content-type to be application/json, got ${contentType}`,
  );

  const jsonResponse = await response.json();
  assert.ok(jsonResponse.ok, 'Expected response.ok to be true');
  assert.ok(jsonResponse.outputs && jsonResponse.outputs.length > 0, 'Expected at least one output');
  assert.equal(jsonResponse.outputs[0].target, 'html', 'Expected output target to be html');

  const htmlContent = jsonResponse.outputs[0].data;
  assert.ok(htmlContent, 'Expected HTML content to be non-empty');
  assert.equal(typeof htmlContent, 'string', 'Expected HTML content to be a string');

  // Look for generic inline style usage that would be indicative of
  // color/alignment styling. This is intentionally loose.
  assert.ok(
    /style=\"[^\"]*color:[^;]+;[^\"]*\"/.test(htmlContent)
      || /style=\"[^\"]*text-align:[^;]+;[^\"]*\"/.test(htmlContent),
    'Expected HTML content to contain color or text-alignment styling markers',
  );

  console.log('testAlignmentColorStylingHtml PASSED');
}

async function main() {
  // Skip tests if local server is not available (e.g., in CI without a local server)
  const serverAvailable = await isServerAvailable();
  if (!serverAvailable) {
    console.log('SKIP: Local converter server not available at', LOCAL_API_URL);
    console.log('Set LOCAL_API_URL env var if running against a different server.');
    process.exit(0); // Exit cleanly - this is expected in CI
  }

  try {
    await testDocxToMarkdownBasic();
    await testAlignmentColorStylingHtml();
    console.log('\nAll Phase 5 Local E2E Converter Tests PASSED');
  } catch (error) {
    console.error('\nPhase 5 Local E2E Converter Tests FAILED:', error.message);
    process.exit(1);
  }
}

main();

