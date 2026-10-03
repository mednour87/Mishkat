// API protection shared by the Cloudflare Functions and the local server:
//  - same-origin only (another website cannot spend our AI quota with our key)
//  - per-IP rate limit (sliding 1-minute window, per isolate)
//  - request size limit
const buckets = new Map();

export function rateLimited(ip, key, max, windowMs = 60000) {
  const k = key + '|' + (ip || 'unknown'), now = Date.now();
  let b = buckets.get(k);
  if (!b || now - b.t > windowMs) { b = { t: now, n: 0 }; buckets.set(k, b); }
  b.n++;
  if (buckets.size > 5000) for (const [kk, bb] of buckets) if (now - bb.t > windowMs) buckets.delete(kk);
  return b.n > max;
}

// origin: value of the Origin header; host: request host. Browsers always send Origin on a POST
// (fetch from our pages), so a POST without it is a script spending the AI credit: refused (I2).
// A same-origin GET may come without it.
export function foreignOrigin(origin, host, method = 'POST') {
  if (!origin) return String(method).toUpperCase() !== 'GET';
  try { return new URL(origin).host !== host; } catch (e) { return true; }
}

export const LIMITS = { expand: 40, select: 40, transcribe: 12, hadith: 30, fatwa: 30, pick: 40, dense: 40, tafsir: 60, tts: 40, maxJsonBytes: 64 * 1024, maxAudioBytes: 4 * 1024 * 1024 };

export function deny(status, error) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
