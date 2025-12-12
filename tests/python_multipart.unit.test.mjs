import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let PYTHON_AVAILABLE = true;
try {
	execFileSync('python3', ['--version'], { cwd: ROOT, encoding: 'utf8' });
} catch {
	PYTHON_AVAILABLE = false;
}

function runPython(code) {
	const out = execFileSync('python3', ['-c', code], {
		cwd: ROOT,
		encoding: 'utf8'
	});
	return out.trim();
}

test('python multipart parser extracts fields and file bytes', { skip: !PYTHON_AVAILABLE }, () => {
	const boundary = '----tinyutilsboundary';
	const fileText = 'col1,col2\n1,2';

	const body = Buffer.from(
		[
			`--${boundary}\r\n`,
			`Content-Disposition: form-data; name="action"\r\n\r\n`,
			`scan\r\n`,
			`--${boundary}\r\n`,
			`Content-Disposition: form-data; name="file"; filename="a.csv"\r\n`,
			`Content-Type: text/csv\r\n\r\n`,
			fileText,
			`\r\n--${boundary}--\r\n`
		].join(''),
		'utf8'
	);

	const code = `
import base64, io, json
from api._lib.multipart import parse_multipart_form
body = base64.b64decode("${body.toString('base64')}")
headers = {
  "content-type": "multipart/form-data; boundary=${boundary}",
  "content-length": str(len(body)),
}
form = parse_multipart_form(headers, io.BytesIO(body))
file_part = (form.get("file") or [b""])[0]
res = {
  "action": (form.get("action") or [None])[0],
  "file_type": type(file_part).__name__,
  "file_text": file_part.decode("utf-8", errors="replace"),
}
print(json.dumps(res))
`;

	const parsed = JSON.parse(runPython(code));
	assert.equal(parsed.action, 'scan');
	assert.equal(parsed.file_type, 'bytes');
	assert.ok(parsed.file_text.includes('col1,col2'));
	assert.ok(parsed.file_text.includes('1,2'));
	assert.ok(!parsed.file_text.includes(boundary));
});

