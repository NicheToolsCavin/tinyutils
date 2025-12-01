#!/usr/bin/env node
// Preview smoke for new data tools: /api/json_tools and /api/pdf_extract
//
// Usage (from tinyutils root):
//   export PREVIEW_URL="https://tinyutils-...vercel.app"
//   export VERCEL_AUTOMATION_BYPASS_SECRET="..."  # or PREVIEW_BYPASS_TOKEN/BYPASS_TOKEN
//   node scripts/smoke_data_tools_preview.mjs
//
// The script will:
//   - Exercise json_to_csv and csv_to_json modes on /api/json_tools
//   - Upload a ZIP containing a real PDF fixture to /api/pdf_extract
//   - Use the same protection-bypass handshake pattern as preview_smoke.mjs

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const BASE_URL = process.env.PREVIEW_URL;
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';
const BYPASS_CANDIDATES = [
	process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
	process.env.PREVIEW_BYPASS_TOKEN,
	process.env.BYPASS_TOKEN
].filter(Boolean);

if (!BASE_URL) {
	console.log('⚠️  PREVIEW_URL not set - skipping data tools preview smoke.');
	process.exit(0);
}

// --- Bypass helpers (mirrored from scripts/preview_smoke.mjs) -----------------

function buildUrl(pathFragment, token) {
	const url = new URL(pathFragment, BASE_URL);
	if (token) {
		url.searchParams.set('x-vercel-set-bypass-cookie', 'true');
		url.searchParams.set('x-vercel-protection-bypass', token);
	}
	return url.toString();
}

function buildHeaders(token, extraHeaders = {}, cookies = []) {
	const headers = { ...extraHeaders };
	if (token) {
		headers['x-vercel-protection-bypass'] = token;
		headers['x-vercel-set-bypass-cookie'] = 'true';
		headers['Cookie'] = `vercel-protection-bypass=${token}`;
	}
	if (cookies.length) {
		const handshake = cookies.join('; ');
		headers['Cookie'] = headers['Cookie']
			? `${headers['Cookie']}; ${handshake}`
			: handshake;
	}
	if (PREVIEW_SECRET) {
		headers['x-preview-secret'] = PREVIEW_SECRET;
	}
	return headers;
}

function parseHandshakeCookie(setCookieHeader) {
	if (!setCookieHeader) return null;
	const fragments = setCookieHeader.split('\n');
	for (const fragment of fragments) {
		const trimmed = fragment.trim();
		if (!trimmed) continue;
		const [cookiePair] = trimmed.split(';');
		if (cookiePair.startsWith('_vercel_jwt=')) {
			return cookiePair;
		}
	}
	return null;
}

async function attemptFetch(url, token, options, cookies = [], tries = 0) {
	const headers = buildHeaders(token, options.headers, cookies);
	const response = await fetch(url, { ...options, headers, redirect: 'manual' });
	const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
	if (isRedirect && token && tries === 0) {
		const handshakeCookie = parseHandshakeCookie(response.headers.get('set-cookie'));
		if (handshakeCookie) {
			return attemptFetch(url, token, options, [...cookies, handshakeCookie], tries + 1);
		}
	}
	return response;
}

async function fetchWithBypass(pathFragment, options = {}) {
	const tokens = BYPASS_CANDIDATES.length ? BYPASS_CANDIDATES : [null];
	let lastError = null;
	for (const token of tokens) {
		const url = buildUrl(pathFragment, token);
		try {
			const res = await attemptFetch(url, token, options);
			return res;
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError || new Error('fetch failed');
}

// --- JSON tools smokes -------------------------------------------------

async function smokeJsonToolsJsonToCsv() {
	const payload = {
		user: { id: 1, name: 'Cavin' },
		meta: { tags: ['a', 'b'], active: true }
	};
	const fd = new FormData();
	fd.append('mode', 'json_to_csv');
	fd.append('file', new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'data.json');

	const res = await fetchWithBypass('/api/json_tools', {
		method: 'POST',
		body: fd
	});

	const contentType = res.headers.get('content-type') || '';
	const ok = res.status === 200 && contentType.includes('text/csv');
	const body = await res.text();
	return {
		name: 'json_tools json_to_csv',
		status: res.status,
		ok,
		contentType,
		preview: body.slice(0, 200)
	};
}

async function smokeJsonToolsCsvToJson() {
	const csv = 'id,name\n1,Cavin\n2,Alex\n';
	const fd = new FormData();
	fd.append('mode', 'csv_to_json');
	fd.append('file', new Blob([csv], { type: 'text/csv' }), 'data.csv');

	const res = await fetchWithBypass('/api/json_tools', {
		method: 'POST',
		body: fd
	});

	const contentType = res.headers.get('content-type') || '';
	let parsed = null;
	try {
		parsed = await res.json();
	} catch {
		parsed = null;
	}
	const ok =
		res.status === 200 &&
		contentType.includes('application/json') &&
		Array.isArray(parsed) &&
		parsed.length === 2;

	return {
		name: 'json_tools csv_to_json',
		status: res.status,
		ok,
		contentType,
		sample: parsed && parsed[0]
	};
}

// --- PDF extractor smoke -----------------------------------------------

function buildPdfZipFixture() {
	const fixturesRoot = process.env.DATA_TOOLS_FIXTURES_DIR || path.join(os.homedir(), 'dev', 'TinyUtils', 'fixtures');
	const pdfPath = path.join(fixturesRoot, 'pdf', 'dummy_w3c.pdf');
	if (!fs.existsSync(pdfPath)) {
		throw new Error(`PDF fixture not found at ${pdfPath}`);
	}

	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tinyutils-data-tools-'));
	const zipPath = path.join(tmpDir, 'dummy_pdf.zip');

	// -j: junk paths so the PDF is at the root of the archive
	execFileSync('zip', ['-j', zipPath, pdfPath], { stdio: 'ignore' });
	const buf = fs.readFileSync(zipPath);
	return buf;
}

function buildPdfFixtureBuffer() {
	const fixturesRoot = process.env.DATA_TOOLS_FIXTURES_DIR || path.join(os.homedir(), 'dev', 'TinyUtils', 'fixtures');
	const pdfPath = path.join(fixturesRoot, 'pdf', 'dummy_w3c.pdf');
	if (!fs.existsSync(pdfPath)) {
		throw new Error(`PDF fixture not found at ${pdfPath}`);
	}
	return fs.readFileSync(pdfPath);
}

async function smokePdfExtract() {
	let zipBuffer;
	try {
		zipBuffer = buildPdfZipFixture();
	} catch (error) {
		return {
			name: 'pdf_extract (fixture)',
			status: 'fixture_error',
			ok: false,
			contentType: '',
			message: error.message
		};
	}

	const fd = new FormData();
	fd.append('file', new Blob([zipBuffer], { type: 'application/zip' }), 'dummy_pdf.zip');

	const res = await fetchWithBypass('/api/pdf_extract', {
		method: 'POST',
		body: fd
	});

	const contentType = res.headers.get('content-type') || '';
	const disposition = res.headers.get('content-disposition') || '';
	// Happy path: 200 application/zip with extracted_text.zip download name
	const ok =
		res.status === 200 &&
		contentType.includes('application/zip') &&
		disposition.includes('extracted_text.zip');

	// We do not attempt to parse the ZIP here; contract-level checks are enough.

	return {
		name: 'pdf_extract',
		status: res.status,
		ok,
		contentType,
		disposition
	};
}

async function smokePdfExtractSinglePdf() {
	let pdfBuffer;
	try {
		pdfBuffer = buildPdfFixtureBuffer();
	} catch (error) {
		return {
			name: 'pdf_extract (single pdf fixture)',
			status: 'fixture_error',
			ok: false,
			contentType: '',
			message: error.message
		};
	}

	const fd = new FormData();
	fd.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'dummy_w3c.pdf');

	const res = await fetchWithBypass('/api/pdf_extract', {
		method: 'POST',
		body: fd
	});

	const contentType = res.headers.get('content-type') || '';
	const disposition = res.headers.get('content-disposition') || '';
	const ok =
		res.status === 200 &&
		contentType.includes('application/zip') &&
		disposition.includes('extracted_text.zip');

	return {
		name: 'pdf_extract (single pdf)',
		status: res.status,
		ok,
		contentType,
		disposition
	};
}

async function smokePdfExtractorAccept() {
	// Prefer the canonical path without trailing slash to avoid 308
	// redirects; the bypass helpers already handle protection cookies.
	const res = await fetchWithBypass('/tools/pdf-text-extractor', { method: 'GET' });
	const status = res.status;
	const html = await res.text();

	// Look for the upload input and its accept attribute.
	const inputMatch = html.match(/<input[^>]+data-testid="pdf-extract-upload-input"[^>]*>/i)
		|| html.match(/<input[^>]+type="file"[^>]*>/i);
	let accept = '';
	if (inputMatch) {
		const tag = inputMatch[0];
		const acceptMatch = tag.match(/accept="([^"]*)"/i);
		if (acceptMatch) accept = acceptMatch[1];
	}

	const acceptLower = accept.toLowerCase();
	const hasZip = acceptLower.includes('.zip') || acceptLower.includes('application/zip');
	const hasPdfExt = acceptLower.includes('.pdf');
	const hasPdfMime = acceptLower.includes('application/pdf');

	const ok = status === 200 && hasZip && hasPdfExt;

	return {
		name: 'pdf-text-extractor accept',
		status,
		ok,
		accept,
		hasZip,
		hasPdfExt,
		hasPdfMime
	};
}

// --- Main ---------------------------------------------------------------

(async () => {
	const results = [];

	try {
		results.push(await smokeJsonToolsJsonToCsv());
	} catch (error) {
		results.push({ name: 'json_tools json_to_csv', status: 'error', ok: false, message: error.message });
	}

	try {
		results.push(await smokeJsonToolsCsvToJson());
	} catch (error) {
		results.push({ name: 'json_tools csv_to_json', status: 'error', ok: false, message: error.message });
	}

	try {
		results.push(await smokePdfExtract());
	} catch (error) {
		results.push({ name: 'pdf_extract', status: 'error', ok: false, message: error.message });
	}

	try {
		results.push(await smokePdfExtractSinglePdf());
	} catch (error) {
		results.push({ name: 'pdf_extract (single pdf)', status: 'error', ok: false, message: error.message });
	}

	try {
		results.push(await smokePdfExtractorAccept());
	} catch (error) {
		results.push({ name: 'pdf-text-extractor accept', status: 'error', ok: false, message: error.message });
	}

	console.log(`Data tools preview smoke for ${BASE_URL}`);
	results.forEach((r) => {
		const extra = [];
		if (r.contentType) extra.push(`CT=${r.contentType}`);
		if (r.disposition) extra.push(`CD=${r.disposition}`);
		if (r.sample) extra.push(`sample=${JSON.stringify(r.sample)}`);
		if (r.preview) extra.push(`preview=${JSON.stringify(r.preview)}`);
		if (r.message) extra.push(`msg=${r.message}`);
		console.log(`  ${r.name} -> ${r.status} ${r.ok ? 'OK' : 'FAIL'}${extra.length ? ' [' + extra.join(', ') + ']' : ''}`);
	});

	const failures = results.filter((r) => !r.ok);
	if (failures.length === 0) {
		console.log('Data tools preview smoke: PASS');
		process.exit(0);
	}

	console.log('Data tools preview smoke: FAIL');
	process.exit(1);
})().catch((error) => {
	console.error('Data tools preview smoke encountered an error:', error);
	process.exit(1);
});
