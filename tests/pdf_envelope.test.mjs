import test from 'node:test';
import assert from 'node:assert/strict';
// Local import of handler if you test in-process; otherwise hit fetch to preview.
// Here we do shape checks assuming an HTTP call.
const PREVIEW_URL = process.env.PREVIEW_URL;

test('PDF response carries ok/meta', { skip: !PREVIEW_URL }, async () => {
  const res = await fetch(`${PREVIEW_URL}/api/convert`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify({ inputs:[{ text:"# Hi"}], from:"markdown", to:["pdf"] })
  });
  assert.equal(res.headers.get('content-type')?.includes('application/json'), true);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.meta?.requestId);
  assert.ok(body.meta?.pdfExternalAvailable !== undefined);
  assert.equal(typeof body.meta?.pdfEngine, 'string');
  assert.ok((body.meta?.pdfEngine || '').length > 0);
});
