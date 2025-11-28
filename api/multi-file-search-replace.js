export const config = { runtime: 'edge' };

function rid() {
	try {
		return crypto.randomUUID();
	} catch (err) {
		return Math.random().toString(16).slice(2, 10);
	}
}

function json(status, payload, requestId) {
	const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
	if (requestId) headers.set('x-request-id', requestId);
	return new Response(JSON.stringify(payload), { status, headers });
}

export default async function handler(request) {
	const requestId = (request.headers.get('x-request-id') || '').trim() || rid();

	if (request.method !== 'POST') {
		return json(405, { ok: false, meta: { error: 'method_not_allowed', requestId } }, requestId);
	}

	let body;
	try {
		body = await request.json();
	} catch (err) {
		return json(400, { ok: false, meta: { error: 'invalid_json', requestId } }, requestId);
	}

	return json(
		200,
		{
			ok: true,
			meta: {
				requestId,
				note: 'stub_multi_file_search_replace_edge',
				previewOnly: true
			},
			files: Array.isArray(body?.files) ? body.files : []
		},
		requestId
	);
}
