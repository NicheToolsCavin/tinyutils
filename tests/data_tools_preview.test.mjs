import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PREVIEW_URL = process.env.PREVIEW_URL || '';
const PREVIEW_SECRET = process.env.PREVIEW_SECRET || '';
const BYPASS_TOKEN =
	process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
	process.env.PREVIEW_BYPASS_TOKEN ||
	process.env.BYPASS_TOKEN ||
	'';

const HAS_PREVIEW = !!PREVIEW_URL && !!BYPASS_TOKEN;

function buildUrl(pathFragment, token) {
	const url = new URL(pathFragment, PREVIEW_URL);
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
		headers.cookie = `vercel-protection-bypass=${token}`;
	}
	if (cookies.length) {
		const handshake = cookies.join('; ');
		headers.cookie = headers.cookie ? `${headers.cookie}; ${handshake}` : handshake;
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
	if (!HAS_PREVIEW) {
		throw new Error('PREVIEW_URL/BYPASS_TOKEN not set');
	}
	const url = buildUrl(pathFragment, BYPASS_TOKEN);
	return attemptFetch(url, BYPASS_TOKEN, options);
}

function skipOpts() {
	return { skip: !HAS_PREVIEW };
}

test('json_tools json_to_csv returns CSV with flattened columns', skipOpts(), async () => {
	const fd = new FormData();
	const payload = {
		user: { id: 1, name: 'Cavin' },
		meta: { tags: ['a', 'b'], active: true }
	};
	fd.append('mode', 'json_to_csv');
	fd.append('file', new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'data.json');

	const res = await fetchWithBypass('/api/json_tools', {
		method: 'POST',
		body: fd
	});

	assert.equal(res.status, 200, `expected 200, got ${res.status}`);
	const contentType = res.headers.get('content-type') || '';
	assert.ok(contentType.includes('text/csv'), `expected CSV but got ${contentType}`);

	const text = await res.text();
	// Should contain flattened keys
	assert.ok(text.includes('user.id'), 'missing user.id header');
	assert.ok(text.includes('user.name'), 'missing user.name header');
});

test('json_tools csv_to_json returns JSON array', skipOpts(), async () => {
	const csv = 'id,name\n1,Cavin\n2,Alex\n';
	const fd = new FormData();
	fd.append('mode', 'csv_to_json');
	fd.append('file', new Blob([csv], { type: 'text/csv' }), 'data.csv');

	const res = await fetchWithBypass('/api/json_tools', {
		method: 'POST',
		body: fd
	});

	assert.equal(res.status, 200, `expected 200, got ${res.status}`);
	const contentType = res.headers.get('content-type') || '';
	assert.ok(contentType.includes('application/json'), `expected JSON but got ${contentType}`);

	const data = await res.json();
	assert.ok(Array.isArray(data), 'expected JSON array');
	assert.equal(data.length, 2);
	assert.equal(data[0].id, '1');
	assert.equal(data[0].name, 'Cavin');
});

test('pdf_extract returns JSON error for invalid ZIP', skipOpts(), async () => {
	const fd = new FormData();
	fd.append('file', new Blob(['not-a-zip'], { type: 'application/octet-stream' }), 'fake.zip');

	const res = await fetchWithBypass('/api/pdf_extract', {
		method: 'POST',
		body: fd
	});

	assert.ok([400, 422].includes(res.status), `expected 400/422, got ${res.status}`);
	const contentType = res.headers.get('content-type') || '';
	assert.ok(contentType.includes('application/json'), `expected JSON but got ${contentType}`);
	const body = await res.json();
	assert.ok(body && typeof body.error === 'string', 'expected error message in body');
});

test('pdf_extract accepts single PDF upload and returns ZIP', skipOpts(), async () => {
	// Use the same fixture path convention as smoke_data_tools_preview.mjs
	const fixturesRoot = process.env.DATA_TOOLS_FIXTURES_DIR || path.join(os.homedir(), 'dev', 'TinyUtils', 'fixtures');
	const pdfPath = path.join(fixturesRoot, 'pdf', 'dummy_w3c.pdf');
	if (!fs.existsSync(pdfPath)) {
		// Fixture not available in this environment; treat as a no-op pass.
		return;
	}

	const pdfBuffer = fs.readFileSync(pdfPath);
	const fd = new FormData();
	fd.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'dummy_w3c.pdf');

	const res = await fetchWithBypass('/api/pdf_extract', {
		method: 'POST',
		body: fd
	});

	assert.equal(res.status, 200, `expected 200, got ${res.status}`);
	const contentType = res.headers.get('content-type') || '';
	assert.ok(contentType.includes('application/zip'), `expected application/zip but got ${contentType}`);
	const disposition = res.headers.get('content-disposition') || '';
	assert.ok(disposition.includes('extracted_text.zip'), 'expected extracted_text.zip download name');
});
