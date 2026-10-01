// Cloudflare Pages Function: POST /api/transcribe  (multipart: audio, lang)
import { transcribe } from '../_lib/selector.js';
import { rateLimited, foreignOrigin, LIMITS, deny } from '../_lib/guard.js';

export async function onRequestPost({ request, env }) {
  const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  const url = new URL(request.url);
  if (foreignOrigin(request.headers.get('origin'), url.host)) return deny(403, 'forbidden origin');
  if (rateLimited(request.headers.get('cf-connecting-ip'), 'transcribe', LIMITS.transcribe)) return deny(429, 'too many requests');
  if (+(request.headers.get('content-length') || 0) > LIMITS.maxAudioBytes) return deny(413, 'audio too large');
  try {
    const form = await request.formData();
    const audio = form.get('audio');
    if (!audio || typeof audio === 'string' || audio.size > LIMITS.maxAudioBytes || !/^audio\/|^video\/webm/.test(audio.type || 'audio/webm')) return deny(400, 'bad audio');
    const lang = String(form.get('lang') || '').slice(0, 2);
    const out = await transcribe(audio, lang, env);
    return new Response(JSON.stringify(out), { headers: H });
  } catch (e) {
    return deny(400, 'bad request');
  }
}
