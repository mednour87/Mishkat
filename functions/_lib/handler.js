// Shared Cloudflare Pages Function handler: JSON in, JSON out, edge cache for
// identical requests (saves free-tier quota and makes answers stable),
// same-origin check, per-IP rate limit and size limit.
import { rateLimited, foreignOrigin, LIMITS, deny, dailyCapReached } from './guard.js';

const HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function makeHandler(fn, name) {
  return async function onRequestPost({ request, env }) {
    const url = new URL(request.url);
    if (foreignOrigin(request.headers.get('origin'), url.host)) return deny(403, 'forbidden origin');
    if (rateLimited(request.headers.get('cf-connecting-ip'), name, LIMITS[name] || 30)) return deny(429, 'too many requests');
    if (dailyCapReached(name, env)) return deny(429, 'daily AI budget reached');
    const len = +(request.headers.get('content-length') || 0);
    if (len > LIMITS.maxJsonBytes) return deny(413, 'payload too large');
    let body;
    try {
      const txt = await request.text();
      if (txt.length > LIMITS.maxJsonBytes) return deny(413, 'payload too large');
      body = JSON.parse(txt);
    } catch (e) { return deny(400, 'bad json'); }
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
      return deny(400, String(e.message || e).slice(0, 120));
    }
  };
}

async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
