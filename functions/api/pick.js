// Cloudflare Pages Function: POST /api/pick  {query, items[], what} → {keep:[indices]}
// Closed-list relevance only (used for the Sunnah section): the model returns numbers, never text.
import { pickRelevant } from '../_lib/selector.js';
import { makeHandler } from '../_lib/handler.js';

export async function pick(body, env) {
  const items = (Array.isArray(body && body.items) ? body.items : []).slice(0, 12).map(x => String(x).slice(0, 400));
  const q = String(body && body.query || '').slice(0, 300);
  const what = body && body.what === 'hadith' ? 'hadith' : 'document';
  if (!q || !items.length) return { ok: false, error: 'empty' };
  const keep = await pickRelevant(q, items, env, { max: 3, what });
  return keep ? { ok: true, keep } : { ok: false, error: 'no AI model available' };
}
export const onRequestPost = makeHandler(pick, 'pick');
