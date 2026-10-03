// Closed evidence list and display of the extractive answer (plan v5, lot B) — browser side.
// The list is built here from the page's own vetted texts; the server (functions/_lib/answer.js)
// returns only sentence IDs; applyAnswer() checks them again against this list and returns the
// sentences VERBATIM with their verse/hadith and source. Nothing the server writes is displayed.
import { sentences, normAr, normLatin } from './engine.js';

export const PER_VERSE = 4, MAX_VERSES = 8, MAX_HADITHS = 4;

// verses: [{ idx, ref:'2:153', text: full tafsir unit, source, sourceTitle }] (AI-confirmed, best first)
// hadiths: [{ id, text, expl, grade, by }] (HadeethEnc, graded, chosen for the question)
export function buildClosedList({ verses = [], hadiths = [] }) {
  const list = [];
  for (const v of verses.slice(0, MAX_VERSES)) {
    sentences(String(v.text || '').replace(/^\d+\.\s*/, '')).slice(0, PER_VERSE).forEach((t, k) => {
      const s = t.replace(/^\d+\.\s*/, '').trim();
      if (s.length >= 12) list.push({ sid: `Q:${v.ref}#${k + 1}`, kind: 'verse', idx: v.idx, ref: v.ref, text: s, source: v.source, sourceTitle: v.sourceTitle });
    });
  }
  for (const h of hadiths.slice(0, MAX_HADITHS)) {
    const base = { kind: 'hadith', id: String(h.id), grade: h.grade || '', by: h.by || '', lang: h.lang };
    sentences(h.text || '').slice(0, 2).forEach((t, k) => { if (t.trim().length >= 12) list.push({ ...base, sid: `H:${h.id}#t${k + 1}`, part: 'text', text: t.trim() }); });
    sentences(h.expl || '').slice(0, 2).forEach((t, k) => { if (t.trim().length >= 12) list.push({ ...base, sid: `H:${h.id}#e${k + 1}`, part: 'expl', text: t.trim() }); });
  }
  return list;
}

// server answer → { by:'rag', answerable, points:[{concept, items:[closed-list entries]}], uncovered, model, judge }
// any id not in the list is dropped; a point with no valid id is dropped; at most 3 points × 2 sentences
// a concept named by the AI is shown only if its words are words of the question itself
// (it is then the visitor's own wording, not text written by the model)
const bare = (w) => w.replace(/^(و|ف)?(بال|كال|لل|ال)/, '').replace(/ة$/, 'ه');
export function inQuery(concept, query) {
  const ar = /[؀-ۿ]/.test(concept);
  const n = (x) => (ar ? normAr(x) : normLatin(x)).split(' ').filter(Boolean).map(w => ar ? bare(w) : w.replace(/s$/, ''));
  const q = new Set(n(query)), c = n(concept);
  return c.length > 0 && c.every(w => q.has(w));
}

export function applyAnswer(list, out, query = '') {
  if (!out || out.ok === false) return null;
  const S = new Map(list.map(s => [s.sid, s]));
  const used = new Set(), points = [];
  for (const p of Array.isArray(out.points) ? out.points : []) {
    const items = (Array.isArray(p && p.sids) ? p.sids : []).map(String).filter(x => S.has(x) && !used.has(x)).slice(0, 2).map(x => { used.add(x); return S.get(x); });
    const c = String(p.concept || '').slice(0, 40);
    const same = points.find(x => x.concept === c);   // two points on the same concept: one point
    if (items.length && same) same.items.push(...items.slice(0, 3 - same.items.length));
    else if (items.length) points.push({ concept: c, shown: inQuery(c, query), items });
    if (points.length >= 3) break;
  }
  const concepts = (Array.isArray(out.concepts) ? out.concepts : []).map(c => String(c).slice(0, 40)).slice(0, 3);
  const covered = new Set(points.map(p => p.concept));
  const uncovered = concepts.filter(c => !covered.has(c)).map(c => ({ concept: c, shown: inQuery(c, query) }));
  return { by: 'rag', answerable: points.length ? (uncovered.length ? 'partial' : 'yes') : 'no', points, uncovered, concepts,
    model: String(out.model || ''), judge: out.judge ? String(out.judge) : null };
}
