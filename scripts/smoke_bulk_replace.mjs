#!/usr/bin/env node
/**
 * Smoke test for Bulk Find & Replace API
 * Tests: ZIP upload, preview, regex mode, case sensitivity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.PREVIEW_URL || 'https://tinyutils-6mxfc4anw-cavins-projects-7b0e00bb.vercel.app';
const API_ENDPOINT = `${API_BASE}/api/bulk-replace`;

console.log('\n🔍 Bulk Find & Replace Smoke Test');
console.log(`Testing: ${API_ENDPOINT}\n`);

// Create test ZIP file
const testDir = path.join(__dirname, '../.test-tmp/smoke-bulk-replace');
if (!fs.existsSync(testDir)) {
	fs.mkdirSync(testDir, { recursive: true });
}

// Create test files
const testFiles = {
	'test.html': '<html><body>Copyright 2023 Test Corp</body></html>',
	'test.txt': 'Copyright 2023\nAnother line with Copyright 2023',
	'nested/file.md': '# Header\nCopyright 2023 in markdown'
};

Object.entries(testFiles).forEach(([filename, content]) => {
	const filePath = path.join(testDir, filename);
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.writeFileSync(filePath, content);
});

// Create ZIP
const zipPath = path.join(testDir, 'test.zip');
execSync(`cd ${testDir} && zip -r test.zip ${Object.keys(testFiles).join(' ')}`, {
	stdio: 'ignore'
});

console.log('✅ Created test ZIP with 3 files\n');

// Test 1: Simple text mode
console.log('Test 1: Simple text replacement (Copyright 2023 → Copyright 2025)');
try {
	const formData = new FormData();
	const fileBlob = new Blob([fs.readFileSync(zipPath)], { type: 'application/zip' });
	formData.append('file', fileBlob, 'test.zip');
	formData.append('mode', 'simple');
	formData.append('action', 'preview');
	formData.append('find', 'Copyright 2023');
	formData.append('replace', 'Copyright 2025');
	formData.append('case_sensitive', 'true');

	const response = await fetch(API_ENDPOINT, {
		method: 'POST',
		body: formData
	});

	const json = await response.json();

	if (!response.ok) {
		console.error('❌ API returned error:', json);
		process.exit(1);
	}

	if (!json.ok) {
		console.error('❌ Response envelope not ok:', json);
		process.exit(1);
	}

	// Validate response structure
	if (!json.data || !json.data.diffs || !json.data.stats) {
		console.error('❌ Missing required fields in response:', json);
		process.exit(1);
	}

	console.log(`✅ Stats: ${json.data.stats.filesScanned} scanned, ${json.data.stats.filesModified} modified, ${json.data.stats.totalReplacements} replacements`);

	// Should have modified all 3 files (4 total replacements)
	if (json.data.stats.filesModified !== 3 || json.data.stats.totalReplacements !== 4) {
		console.error('❌ Expected 3 modified files with 4 replacements, got:', json.data.stats);
		process.exit(1);
	}

	console.log('✅ Simple text mode passed\n');
} catch (err) {
	console.error('❌ Test 1 failed:', err.message);
	process.exit(1);
}

// Test 2: Regex mode
console.log('Test 2: Regex mode (Copyright \\d{4} → Copyright 2025)');
try {
	const formData = new FormData();
	const fileBlob = new Blob([fs.readFileSync(zipPath)], { type: 'application/zip' });
	formData.append('file', fileBlob, 'test.zip');
	formData.append('mode', 'regex');
	formData.append('action', 'preview');
	formData.append('find', 'Copyright \\d{4}');
	formData.append('replace', 'Copyright 2025');
	formData.append('case_sensitive', 'true');

	const response = await fetch(API_ENDPOINT, {
		method: 'POST',
		body: formData
	});

	const json = await response.json();

	if (!response.ok || !json.ok) {
		console.error('❌ Regex mode failed:', json);
		process.exit(1);
	}

	console.log(`✅ Stats: ${json.data.stats.filesScanned} scanned, ${json.data.stats.filesModified} modified, ${json.data.stats.totalReplacements} replacements`);
	console.log('✅ Regex mode passed\n');
} catch (err) {
	console.error('❌ Test 2 failed:', err.message);
	process.exit(1);
}

// Test 3: Download action
console.log('Test 3: Download modified ZIP');
try {
	const formData = new FormData();
	const fileBlob = new Blob([fs.readFileSync(zipPath)], { type: 'application/zip' });
	formData.append('file', fileBlob, 'test.zip');
	formData.append('mode', 'simple');
	formData.append('action', 'download');
	formData.append('find', 'Copyright 2023');
	formData.append('replace', 'Copyright 2025');
	formData.append('case_sensitive', 'true');

	const response = await fetch(API_ENDPOINT, {
		method: 'POST',
		body: formData
	});

	if (!response.ok) {
		console.error('❌ Download failed:', response.status, response.statusText);
		process.exit(1);
	}

	const contentType = response.headers.get('content-type');
	if (contentType !== 'application/zip') {
		console.error('❌ Expected application/zip, got:', contentType);
		process.exit(1);
	}

	const buffer = await response.arrayBuffer();
	if (buffer.byteLength < 100) {
		console.error('❌ Downloaded ZIP too small:', buffer.byteLength, 'bytes');
		process.exit(1);
	}

	console.log(`✅ Downloaded ZIP: ${buffer.byteLength} bytes`);
	console.log('✅ Download mode passed\n');
} catch (err) {
	console.error('❌ Test 3 failed:', err.message);
	process.exit(1);
}

// Test 4: Case insensitivity
console.log('Test 4: Case insensitive search');
try {
	const formData = new FormData();
	const fileBlob = new Blob([fs.readFileSync(zipPath)], { type: 'application/zip' });
	formData.append('file', fileBlob, 'test.zip');
	formData.append('mode', 'simple');
	formData.append('action', 'preview');
	formData.append('find', 'COPYRIGHT 2023'); // All caps
	formData.append('replace', 'Copyright 2025');
	formData.append('case_sensitive', 'false');

	const response = await fetch(API_ENDPOINT, {
		method: 'POST',
		body: formData
	});

	const json = await response.json();

	if (!response.ok || !json.ok) {
		console.error('❌ Case insensitive mode failed:', json);
		process.exit(1);
	}

	// Should still find "Copyright 2023" even though we searched for "COPYRIGHT 2023"
	if (json.data.stats.totalReplacements !== 4) {
		console.error('❌ Expected 4 replacements with case insensitive, got:', json.data.stats.totalReplacements);
		process.exit(1);
	}

	console.log(`✅ Case insensitive search found ${json.data.stats.totalReplacements} matches`);
	console.log('✅ Case insensitivity passed\n');
} catch (err) {
	console.error('❌ Test 4 failed:', err.message);
	process.exit(1);
}

// Cleanup
fs.rmSync(testDir, { recursive: true, force: true });

console.log('✅ All smoke tests passed!');
console.log('\n📊 Summary:');
console.log('  ✅ Simple text mode');
console.log('  ✅ Regex mode');
console.log('  ✅ Download action');
console.log('  ✅ Case insensitivity');
console.log('\n🎉 Bulk Find & Replace is ready for production!\n');
