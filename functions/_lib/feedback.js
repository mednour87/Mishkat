// (6 Oct, T118) Visitors' verdict on an answer: «useful» / «not useful» / «report an error».
// Measures the benefit after launch (share of useful answers per route) and gives a channel to report a wrong
// passage — reviewed by a person, never fed back to a model automatically.
// Stored ONLY when the visitor presses a button: the question, the route, the references shown (verse numbers and
// source ids), the verdict and an optional short note. No IP address, no identifier, no cookie.
// Storage: Cloudflare KV namespace bound as FEEDBACK (free tier); entries expire after one year.
const VOTES = new Set(['up', 'down', 'report']);
const clip = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, n);

export function cleanFeedback(body) {
  if (!body || typeof body !== 'object') return null;
  const vote = String(body.vote || '');
  if (!VOTES.has(vote)) return null;
  const q = clip(body.q, 300);
  if (!q) return null;
  const refs = (Array.isArray(body.refs) ? body.refs : []).slice(0, 20).map(r => clip(r, 24)).filter(r => /^[\w:.\-]+$/.test(r));
  return {
    vote, q,
    lang: body.lang === 'en' ? 'en' : 'ar',
    route: clip(body.route, 24).replace(/[^\w/-]/g, ''),
    refs,
    note: vote === 'up' ? '' : clip(body.note, 500),
    model: clip(body.model, 60),
    at: new Date().toISOString(),
  };
}

export async function storeFeedback(body, env) {
  const fb = cleanFeedback(body);
  if (!fb) return { ok: false, error: 'bad feedback' };
  if (!env.FEEDBACK || typeof env.FEEDBACK.put !== 'function') return { ok: true, stored: false };
  const key = `fb:${fb.at.slice(0, 10)}:${fb.vote}:${fb.at.slice(11, 19).replace(/:/g, '')}-${Math.random().toString(36).slice(2, 8)}`;
  await env.FEEDBACK.put(key, JSON.stringify(fb), { expirationTtl: 365 * 24 * 3600 });
  return { ok: true, stored: true };
}
