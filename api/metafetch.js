export const config = { runtime: 'edge' };

const UA = 'TinyUtils-DeadLinkChecker/1.0 (+https://tinyutils.net; hello@tinyutils.net)';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  try {
    const { url } = await req.json();
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
    const desc = (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
    return new Response(JSON.stringify({ title, description: desc }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ title: '', description: '', error: String(e) }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  }
}
