// API protection shared by the Cloudflare Functions and the local server:
//  - same-origin only (another website cannot spend our AI quota with our key)
//  - per-IP rate limit (sliding 1-minute window, per isolate)
//  - request size limit
import { injectionKind } from '../../public/js/injection.js';
import { mapQuestion } from '../../public/js/scope.js';

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

// daily ceiling of paid AI calls per server instance (env DAILY_AI_CALLS, default 1500): with the
// measured ≈ $0.0006 per call it caps the spend of one instance at about $1 a day. The real hard cap is
// the credit limit set on the OpenRouter key (its dashboard); this one stops a runaway loop earlier.
const AI_ROUTES = new Set(['expand', 'select', 'pick', 'answer', 'fatwa']);
let day = '', calls = 0;
export function dailyCapReached(name, env = {}, now = new Date()) {
  if (!AI_ROUTES.has(name)) return false;
  const d = now.toISOString().slice(0, 10);
  if (d !== day) { day = d; calls = 0; }
  calls++;
  return calls > (+env.DAILY_AI_CALLS || 1500);
}

export const LIMITS = { expand: 40, select: 40, transcribe: 12, hadith: 30, fatwa: 30, encyc: 30, pick: 40, answer: 30, dense: 40, tafsir: 60, tts: 40, mosques: 20, feedback: 10, maxJsonBytes: 64 * 1024, maxAudioBytes: 4 * 1024 * 1024 };

// T082: the routes that put the visitor's text in a model prompt refuse instruction-like text even when a
// script calls them directly (the page never sends it: the engine answers it without AI)
const TEXT_ROUTES = new Set(['expand', 'select', 'pick', 'answer', 'fatwa', 'encyc', 'dense']);
export function refusedText(name, body) {
  if (!TEXT_ROUTES.has(name) || !body || typeof body !== 'object') return null;
  const text = [body.query, body.q, body.question].filter(x => typeof x === 'string').join(' \n ');
  // T091: a request outside Mishkat's subject (recipe, prices, code, essays…) never reaches a model, even from a script
  const m = mapQuestion(text);
  return injectionKind(text) || (m && m.kind === 'offtopic' ? 'offtopic' : null);
}

export function deny(status, error) {
  return new Response(JSON.stringify({ ok: false, error }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
