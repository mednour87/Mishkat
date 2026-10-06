// Cloudflare Pages Function: POST /api/feedback {q, lang, vote: up|down|report, route, refs[], note?} → {ok, stored}
// (6 Oct, T118) see functions/_lib/feedback.js — no model is called, nothing personal is stored.
import { storeFeedback } from '../_lib/feedback.js';
import { rateLimited, foreignOrigin, deny, LIMITS } from '../_lib/guard.js';

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (foreignOrigin(request.headers.get('origin'), url.host)) return deny(403, 'forbidden origin');
  if (rateLimited(request.headers.get('cf-connecting-ip'), 'feedback', LIMITS.feedback)) return deny(429, 'too many requests');
  let body;
  try {
    const txt = await request.text();
    if (txt.length > 4096) return deny(413, 'payload too large');
    body = JSON.parse(txt);
  } catch (e) { return deny(400, 'bad json'); }
  try {
    const out = await storeFeedback(body, env);
    return new Response(JSON.stringify(out), { status: out.ok ? 200 : 400, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  } catch (e) { return deny(500, 'storage unavailable'); }
}
