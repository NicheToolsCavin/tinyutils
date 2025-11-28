import test from 'node:test';
import assert from 'node:assert/strict';

const PREVIEW_URL = process.env.PREVIEW_URL || '';
const BYPASS_TOKEN =
	process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
	process.env.PREVIEW_BYPASS_TOKEN ||
	process.env.BYPASS_TOKEN ||
	'';

const HAS_PREVIEW = !!PREVIEW_URL && !!BYPASS_TOKEN;

function makeHeaders() {
	if (!BYPASS_TOKEN) return {};
	return {
		'x-vercel-protection-bypass': BYPASS_TOKEN,
		'x-vercel-set-bypass-cookie': 'true',
		cookie: `vercel-protection-bypass=${BYPASS_TOKEN}`
	};
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

	const res = await fetch(`${PREVIEW_URL}/api/json_tools`, {
		method: 'POST',
		headers: makeHeaders(),
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

	const res = await fetch(`${PREVIEW_URL}/api/json_tools`, {
		method: 'POST',
		headers: makeHeaders(),
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

	const res = await fetch(`${PREVIEW_URL}/api/pdf_extract`, {
		method: 'POST',
		headers: makeHeaders(),
		body: fd
	});

	assert.ok([400, 422].includes(res.status), `expected 400/422, got ${res.status}`);
	const contentType = res.headers.get('content-type') || '';
	assert.ok(contentType.includes('application/json'), `expected JSON but got ${contentType}`);
	const body = await res.json();
	assert.ok(body && typeof body.error === 'string', 'expected error message in body');
});
