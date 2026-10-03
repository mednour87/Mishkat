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
// Item ids: V:2:153 (the verse, Tanzil) · Q:2:153#1 (tafsir sentence) · H:4196#t1 / #e1 (hadith text /
// explanation, HadeethEnc, graded) · F:1234#q / #a1 (question / answer paragraph of a fatwa published
// by Sheikh Ibn Baz). A ruling question gets only F items; every other question gets no F item.
// POST /api/answer {query, lang, qtype, sentences:[{sid, text}] ≤ 48}
//   → {ok, answerable:'yes'|'partial'|'no', concepts, points:[{concept, sids}], uncovered, model, judge}
import { providers, callOpenAICompat, cooling, trip } from './selector.js';

const SID = /^(V:\d{1,3}:\d{1,3}|Q:\d{1,3}:\d{1,3}#\d{1,2}|H:\d{1,7}#[te]\d|F:\d{1,7}#(q|a\d{1,2}))$/;
const MAX = 48, TEXT_MAX = 650;
export const QTYPES = ['ruling', 'comfort', 'virtue', 'howto', 'why', 'definition', 'story', 'topic'];
// what a good answer looks like for each kind of question (passed to both models)
const HOW = {
  ruling: 'The visitor asks for a RULING. Only F items (a fatwa published by Sheikh Ibn Baz) may be used, and only a fatwa whose question is about the SAME act in the SAME situation; select its question (F:id#q) and the answer paragraph(s) that state the ruling and its evidence. Never use a fatwa on a different act or a different case. If no fatwa addresses the same matter: answerable "no".',
  comfort: 'The visitor is distressed. Choose passages of hope, mercy, patience, remembrance of Allah, relief after hardship and practical guidance; never passages about punishment, Hell or the fate of disbelievers.',
  virtue: 'The visitor asks about a virtue or reward: choose passages that state the reward or merit itself.',
  howto: 'The visitor asks how to do something: choose passages that state what to do (guidance, steps, words to say).',
  why: 'The visitor asks why: choose passages that state the reason or wisdom, not merely the fact.',
  definition: 'The visitor asks what something is or who someone is: choose passages that define or describe it.',
  story: 'The visitor asks for a story: choose the passages that narrate its main events.',
  topic: 'The visitor asks what the sources say about a subject: choose passages that state the teaching on that subject.',
};

const SYS_COMPOSE = `You select evidence for a Quran and Sunnah search engine. You NEVER write explanations, rulings, translations or any religious text. Output JSON only.
Input: a question, its type, and a numbered list of passages taken word for word from the sources of truth: the Quran itself "V:sura:aya", the vetted tafsir of a verse "Q:sura:aya#n", an authentic hadith "H:id#t1" and its explanation "H:id#e1", a fatwa published by Sheikh Ibn Baz "F:id#q" (its question) and "F:id#a1" (its answer paragraphs).
Passages are listed with the most relevant verses first. A verse text (V) may be selected together with the tafsir sentence that explains it.
1. concepts: the 1 to 3 distinct things the question asks about, as short nouns in the language of the question (e.g. «الصبر», «الشكر»; "patience", "gratitude").
2. answerable: "yes" if sentences of the list directly answer the question, "partial" if they answer only some of the concepts, "no" otherwise.
3. points: at most 3, one per concept that the list answers. Each point = {"concept": one of the concepts, "ids": 1 or 2 sentence ids that DIRECTLY state the answer for that concept}.
   - Judge by meaning, not by shared words. Reject homonyms and other senses of a word (e.g. «حجاب» meaning the barrier between Paradise and Hell is NOT the covering of women; «الجاريات» = ships, not neighbours).
   - Match the register of the question: a person asking for comfort (sadness, anxiety, grief) needs sentences of hope, mercy and remedy, not of punishment.
   - Prefer the sentence that states the answer itself over one that only mentions the subject.
   - Follow the instruction for the question type given with the question.
   - Use ONLY ids from the list. Never invent an id. If nothing answers, answerable "no" and points [].
Return {"concepts":[...],"answerable":"yes|partial|no","points":[{"concept":"...","ids":["Q:2:153#1"]}]}`;

const SYS_JUDGE = `You check relevance only, for a Quran search engine. Given a question, its type and numbered passages, keep a passage only if it DIRECTLY answers the question, with the words in the SAME sense as in the question (not a homonym, not a different subject, not merely sharing a word) and in a fitting register (comfort for someone distressed, never threats). For a ruling question, keep a fatwa passage only if the fatwa is about the SAME act in the SAME situation as the question (a fatwa on a neighbouring matter must be removed). A verse text may be kept if it states the answer. Output JSON {"keep":[numbers]} only, possibly empty.`;

export function sanitizeAnswer(body) {
  if (!body || typeof body !== 'object') throw new Error('bad body');
  const query = String(body.query || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!query) throw new Error('empty query');
  const lang = body.lang === 'en' ? 'en' : 'ar';
  const qtype = QTYPES.includes(body.qtype) ? body.qtype : 'topic';
  const seen = new Set(), sentences = [];
  for (const s of Array.isArray(body.sentences) ? body.sentences : []) {
    const sid = String(s && s.sid || ''), text = String(s && s.text || '').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX);
    if (!SID.test(sid) || !text || seen.has(sid)) continue;
    // R3 on the server too: a ruling question gets fatwa passages only, any other question none
    if ((qtype === 'ruling') !== sid.startsWith('F:')) continue;
    seen.add(sid); sentences.push({ sid, text });
    if (sentences.length >= MAX) break;
  }
  return { query, lang, qtype, sentences };
}

const parseJSON = (raw) => JSON.parse(String(raw).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));

// composer output → only ids of the list, ≤ 3 points, ≤ 2 ids each, concepts ≤ 3
export function validateCompose(obj, list) {
  const ok = new Set(list.map(s => s.sid));
  const answerable = ['yes', 'partial', 'no'].includes(obj && obj.answerable) ? obj.answerable : 'no';
  const concepts = [...new Set((Array.isArray(obj && obj.concepts) ? obj.concepts : []).map(c => String(c).replace(/\s+/g, ' ').trim().slice(0, 40)).filter(Boolean))].slice(0, 3);
  const points = [], used = new Set();
  for (const p of Array.isArray(obj && obj.points) ? obj.points : []) {
    const all = (Array.isArray(p && p.ids) ? p.ids : []).map(String).filter(x => ok.has(x) && !used.has(x));
    const sids = all.slice(0, all.length && all.every(x => x.startsWith('F:')) ? 3 : 2);
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
      comp = validateCompose(await callJSON(pr, [{ role: 'system', content: SYS_COMPOSE }, { role: 'user', content: `Question (${p.lang}): ${p.query}${nl}Question type: ${p.qtype} — ${HOW[p.qtype]}${nl}${nl}Passages:${nl}${numbered}` }], Math.min(4500, left), fetchImpl), p.sentences);
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
      const j = await callJSON(pr, [{ role: 'system', content: SYS_JUDGE }, { role: 'user', content: `Question: ${p.query}${nl}Question type: ${p.qtype}${nl}${nl}` + flat.map((sid, k) => `[${k + 1}] ${byId.get(sid)}`).join(nl) }], 3500, fetchImpl);
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
