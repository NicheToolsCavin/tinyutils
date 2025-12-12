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

function pythonImport(moduleName, relPath, expr) {
	const code = `import json, importlib.util; ` +
		`spec = importlib.util.spec_from_file_location("${moduleName}", "${relPath}"); ` +
		`mod = importlib.util.module_from_spec(spec); ` +
		`spec.loader.exec_module(mod); ` +
		`value = ${expr}; ` +
		`print(json.dumps(value))`;
	return JSON.parse(runPython(code));
}

test('csv_join._harden_row prefixes spreadsheet-style prefixes', { skip: !PYTHON_AVAILABLE }, () => {
	const result = pythonImport(
		'csv_join',
		'api/csv_join.py',
		"mod._harden_row(['=SUM(A1:A2)', '+PLUS', '-MINUS', '@CMD', 'safe', ''])"
	);
	assert.deepEqual(result, ["'=SUM(A1:A2)", "'+PLUS", "'-MINUS", "'@CMD", 'safe', '']);
});

test('json_tools._harden_cell matches CSV hardening rules', { skip: !PYTHON_AVAILABLE }, () => {
	const values = ['=X', '+X', '-X', '@X', ' ok', '', null];
	const hardened = pythonImport(
		'json_tools',
		'api/json_tools.py',
		"[mod._harden_cell(v) for v in ['=X', '+X', '-X', '@X', ' ok', '', None]]"
	);
	assert.deepEqual(hardened, ["'=X", "'+X", "'-X", "'@X", ' ok', '', '']);
});

test('flatten_json flattens nested objects and arrays reliably', { skip: !PYTHON_AVAILABLE }, () => {
	const flattened = pythonImport(
		'json_tools',
		'api/json_tools.py',
		"mod.flatten_json({'user': {'id': 1, 'name': 'Cavin'}, 'meta': {'tags': ['a', 'b'], 'active': True}})"
	);
	// Keys should use dotted notation and arrays should be pipe-joined strings.
	assert.equal(flattened['user.id'], 1);
	assert.equal(flattened['user.name'], 'Cavin');
	assert.equal(flattened['meta.active'], true);
	assert.equal(flattened['meta.tags'], 'a|b');
});
