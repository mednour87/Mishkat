// Shared Cloudflare Pages Function handler: JSON in, JSON out, edge cache for
// identical requests (saves free-tier quota and makes answers stable).
const HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function makeHandler(fn, name) {
  return async function onRequestPost({ request, env }) {
    let body;
    try { body = await request.json(); } catch (e) { return new Response('{"ok":false}', { status: 400, headers: HEADERS }); }
    const key = await sha256(name + JSON.stringify(body));
    const cache = caches.default;
    const cacheReq = new Request(new URL(`/api/_cache/${name}/${key}`, request.url).toString());
    const hit = await cache.match(cacheReq);
    if (hit) return hit;
    try {
      const out = await fn(body, env);
      const res = new Response(JSON.stringify(out), { headers: { ...HEADERS, 'cache-control': out.ok ? 'public, max-age=604800' : 'no-store' } });
      if (out.ok) await cache.put(cacheReq, res.clone());
      return res;
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e.message || e) }), { status: 400, headers: HEADERS });
    }
  };
}

async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
