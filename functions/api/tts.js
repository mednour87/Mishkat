// Cloudflare Pages Function: POST /api/tts  { text, lang } → audio/wav
// Reads aloud a tafsir passage already shown on screen (see functions/_lib/tts.js).
import { speakPassage, passageRequest } from '../_lib/tts.js';
import { rateLimited, foreignOrigin, LIMITS, deny } from '../_lib/guard.js';

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (foreignOrigin(request.headers.get('origin'), url.host)) return deny(403, 'forbidden origin');
  if (rateLimited(request.headers.get('cf-connecting-ip'), 'tts', LIMITS.tts)) return deny(429, 'too many requests');
  if (+(request.headers.get('content-length') || 0) > 4096) return deny(413, 'payload too large');
  let body;
  try { body = JSON.parse(await request.text()); } catch (e) { return deny(400, 'bad json'); }
  const pr = passageRequest(body);
  if (pr.error) return new Response(JSON.stringify({ ok: false, error: pr.error, code: pr.code }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  // the same passage read again is served from the edge cache
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([pr.book, pr.s, pr.a, pr.n])));
  const key = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  const cacheReq = new Request(new URL(`/api/_cache/tts/${key}`, request.url).toString());
  const hit = await caches.default.match(cacheReq);
  if (hit) return hit;
  // the passage comes from the site's own files (public/data/tts), not from the request
  const loadSura = async (book, s) => { const r = await (env.ASSETS ? env.ASSETS.fetch(new URL(`/data/tts/${book}/${s}.json`, request.url)) : fetch(new URL(`/data/tts/${book}/${s}.json`, request.url))); return r.ok ? r.json() : null; };
  const out = await speakPassage(pr, env, loadSura);
  if (!out.ok) return new Response(JSON.stringify(out), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  const res = new Response(out.audio, { headers: { 'content-type': out.type, 'cache-control': 'public, max-age=2592000' } });
  await caches.default.put(cacheReq, res.clone());
  return res;
}
