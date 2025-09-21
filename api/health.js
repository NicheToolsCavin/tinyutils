// File: /api/health.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const reqId = Math.random().toString(36).slice(2, 8);
  const body = JSON.stringify({
    ok: true,
    time: new Date().toISOString(),
  });

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'x-request-id': reqId,
    },
  });
}
