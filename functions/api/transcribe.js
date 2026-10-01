// Cloudflare Pages Function: POST /api/transcribe  (multipart: audio, lang)
import { transcribe } from '../_lib/selector.js';

export async function onRequestPost({ request, env }) {
  const H = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  try {
    const form = await request.formData();
    const audio = form.get('audio');
    if (!audio || audio.size > 4 * 1024 * 1024) return new Response('{"ok":false,"error":"bad audio"}', { status: 400, headers: H });
    const out = await transcribe(audio, String(form.get('lang') || ''), env);
    return new Response(JSON.stringify(out), { headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e.message || e) }), { status: 400, headers: H });
  }
}
