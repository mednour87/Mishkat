// Extractive, evidence-bound answer («الجواب باختصار», plan v5 lot B).
// The model NEVER writes religious text. The page's search worker sends the question and a closed,
// numbered list of sentences it took from vetted sources (tafsir of the verses the AI selected,
// text and explanation of authentic HadeethEnc hadiths). Two independent passes:
//   1. composer (large model): the concepts of the question, whether the list answers it, and for
//      each concept at most 2 sentence IDS that state the answer;
//   2. judge (smaller model, its own prompt): keeps only the sentences that answer the question in
//      the same sense of the words (homonyms, other topics, wrong register removed).
// Only IDs come back; the worker displays its own copy of those sentences, verbatim, with their
// source. A concept without evidence is returned as «uncovered» and shown as such, never filled in.
//
// POST /api/answer {query, lang, sentences:[{sid, text}] ≤ 48}
//   → {ok, answerable:'yes'|'partial'|'no', concepts, points:[{concept, sids}], uncovered, model, judge}
import { providers, callOpenAICompat, cooling, trip } from './selector.js';

const SID = /^(Q:\d{1,3}:\d{1,3}#\d{1,2}|H:\d{1,7}#[te]\d)$/;
const MAX = 48;

const SYS_COMPOSE = `You select evidence for a Quran and Sunnah search engine. You NEVER write explanations, rulings, translations or any religious text. Output JSON only.
Input: a question and a numbered list of sentences taken word for word from vetted sources (tafsir of Quran verses "Q:sura:aya#n", authentic hadith text "H:id#t1" and its explanation "H:id#e1").
1. concepts: the 1 to 3 distinct things the question asks about, as short nouns in the language of the question (e.g. «الصبر», «الشكر»; "patience", "gratitude").
2. answerable: "yes" if sentences of the list directly answer the question, "partial" if they answer only some of the concepts, "no" otherwise.
3. points: at most 3, one per concept that the list answers. Each point = {"concept": one of the concepts, "ids": 1 or 2 sentence ids that DIRECTLY state the answer for that concept}.
   - Judge by meaning, not by shared words. Reject homonyms and other senses of a word (e.g. «حجاب» meaning the barrier between Paradise and Hell is NOT the covering of women; «الجاريات» = ships, not neighbours).
   - Match the register of the question: a person asking for comfort (sadness, anxiety, grief) needs sentences of hope, mercy and remedy, not of punishment.
   - Prefer the sentence that states the answer itself over one that only mentions the subject.
   - If the question asks whether something is halal or haram, or asks for a fatwa: answerable "no", points [].
   - Use ONLY ids from the list. Never invent an id. If nothing answers, answerable "no" and points [].
Return {"concepts":[...],"answerable":"yes|partial|no","points":[{"concept":"...","ids":["Q:2:153#1"]}]}`;

const SYS_JUDGE = `You check relevance only, for a Quran search engine. Given a question and numbered sentences, keep a sentence only if it DIRECTLY answers the question, with the words in the SAME sense as in the question (not a homonym, not a different subject, not merely sharing a word) and in a fitting register (comfort for someone distressed, not threats). Output JSON {"keep":[numbers]} only, possibly empty.`;

export function sanitizeAnswer(body) {
  if (!body || typeof body !== 'object') throw new Error('bad body');
  const query = String(body.query || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!query) throw new Error('empty query');
  const lang = body.lang === 'en' ? 'en' : 'ar';
  const seen = new Set(), sentences = [];
  for (const s of Array.isArray(body.sentences) ? body.sentences : []) {
    const sid = String(s && s.sid || ''), text = String(s && s.text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!SID.test(sid) || !text || seen.has(sid)) continue;
    seen.add(sid); sentences.push({ sid, text });
    if (sentences.length >= MAX) break;
  }
  return { query, lang, sentences };
}

const parseJSON = (raw) => JSON.parse(String(raw).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));

// composer output → only ids of the list, ≤ 3 points, ≤ 2 ids each, concepts ≤ 3
export function validateCompose(obj, list) {
  const ok = new Set(list.map(s => s.sid));
  const answerable = ['yes', 'partial', 'no'].includes(obj && obj.answerable) ? obj.answerable : 'no';
  const concepts = [...new Set((Array.isArray(obj && obj.concepts) ? obj.concepts : []).map(c => String(c).replace(/\s+/g, ' ').trim().slice(0, 40)).filter(Boolean))].slice(0, 3);
  const points = [], used = new Set();
  for (const p of Array.isArray(obj && obj.points) ? obj.points : []) {
    const sids = (Array.isArray(p && p.ids) ? p.ids : []).map(String).filter(x => ok.has(x) && !used.has(x)).slice(0, 2);
    if (!sids.length) continue;
    sids.forEach(x => used.add(x));
    let concept = String(p.concept || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!concepts.includes(concept)) concept = concepts[points.length] || concept;
    points.push({ concept, sids });
    if (points.length >= 3) break;
  }
  return { answerable: points.length ? answerable : 'no', concepts, points };
}

async function callJSON(pr, messages, timeoutMs, fetchImpl) {
  return parseJSON(await callOpenAICompat({ ...pr, messages, timeoutMs, fetchImpl }));
}

export async function answer(body, env, fetchImpl = fetch) {
  let p;
  try { p = sanitizeAnswer(body); } catch (e) { return { ok: false, error: String(e.message) }; }
  if (!p.sentences.length) return { ok: false, error: 'no evidence' };
  const pv = providers(env).filter(pr => !cooling(pr));
  if (!pv.length) return { ok: false, error: 'no model' };
  const nl = String.fromCharCode(10);
  const numbered = p.sentences.map(s => `[${s.sid}] ${s.text}`).join(nl);

  // 1. composer: the first provider that answers (large model first)
  let comp = null, model = null;
  const t0 = Date.now();
  for (const pr of pv) {
    const left = 7000 - (Date.now() - t0);
    if (left < 1500) break;
    try {
      comp = validateCompose(await callJSON(pr, [{ role: 'system', content: SYS_COMPOSE }, { role: 'user', content: `Question (${p.lang}): ${p.query}${nl}${nl}Sentences:${nl}${numbered}` }], Math.min(4500, left), fetchImpl), p.sentences);
      model = pr.model; break;
    } catch (e) { trip(pr, e); }
  }
  if (!comp) return { ok: false, error: 'compose failed' };
  if (!comp.points.length) return { ok: true, answerable: 'no', concepts: comp.concepts, points: [], uncovered: comp.concepts, model, judge: null };

  // 2. judge: a smaller model when there is one, independent prompt, sentences renumbered 1..n
  const flat = comp.points.flatMap(x => x.sids);
  const byId = new Map(p.sentences.map(s => [s.sid, s.text]));
  const SMALL = /(?<![0-9])(20|8|9)b|mini|small/i;   // «gpt-oss-20b», not «gpt-oss-120b»
  const judges = pv.filter(pr => SMALL.test(pr.model)).concat(pv.filter(pr => !SMALL.test(pr.model)));
  let keep = null, judge = null;
  for (const pr of judges) {
    try {
      const j = await callJSON(pr, [{ role: 'system', content: SYS_JUDGE }, { role: 'user', content: `Question: ${p.query}${nl}${nl}` + flat.map((sid, k) => `[${k + 1}] ${byId.get(sid)}`).join(nl) }], 3500, fetchImpl);
      const k = new Set((Array.isArray(j && j.keep) ? j.keep : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= flat.length));
      keep = new Set(flat.filter((_, i) => k.has(i + 1)));
      judge = pr.model; break;
    } catch (e) { trip(pr, e); }
    if (Date.now() - t0 > 9000) break;
  }
  // no judge reachable: nothing unjudged is shown as an answer
  if (!keep) return { ok: true, answerable: 'no', concepts: comp.concepts, points: [], uncovered: comp.concepts, model, judge: null, unjudged: true };
  const points = comp.points.map(x => ({ concept: x.concept, sids: x.sids.filter(s => keep.has(s)) })).filter(x => x.sids.length);
  const covered = new Set(points.map(x => x.concept));
  const uncovered = comp.concepts.filter(c => !covered.has(c));
  const answerable = !points.length ? 'no' : uncovered.length ? 'partial' : 'yes';
  return { ok: true, answerable, concepts: comp.concepts, points, uncovered, model, judge };
}
