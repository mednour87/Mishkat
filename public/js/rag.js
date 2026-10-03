// Extractive, evidence-bound short answer (plan v5, lot B) — browser side.
//
// Golden rule: the AI never writes. This module builds a CLOSED list of numbered passages copied
// from the sources of truth the page already holds — the Quran (Tanzil text), the vetted tafsir
// (Al-Muyassar in Arabic, Al-Mukhtasar in English), authentic hadiths (HadeethEnc, graded صحيح/حسن),
// and, for questions of ruling (أحكام), fatwas PUBLISHED by Sheikh Ibn Baz (official site) — sends
// ids + texts to /api/answer (composer + independent judge, functions/_lib/answer.js), then checks
// the returned ids again with fixed rules (below) and returns the passages VERBATIM with their source.
//
// Rules applied here, whatever the models said:
//  R1  only ids of the closed list; each passage at most once; near-duplicates removed
//  R2  the judge must have run (no judge → no short answer)
//  R3  a ruling question gets ONLY passages of a published fatwa (never a tafsir sentence presented as a
//      ruling); any other question gets NO fatwa passage
//  R4  a passage from a verse the AI only marked «related» must share a word with the question
//  R5  register: a person in distress (sadness, anxiety, fear, grief…) gets no passage about punishment,
//      Hell or torment unless the question itself mentions it
//  R6  caps: 3 points, 2 passages per point (3 for one fatwa), 1,200 characters (1,600 for a fatwa)
//  R7  concept labels written by the model are shown only when they are words of the question
//  R8  a passage is a whole sentence (short fragments are joined to their sentence), cut only at sentence
//      ends; a long fatwa paragraph is shown in sentence groups, never cut inside a sentence
import { normAr, normLatin, tokens } from './engine.js';

export const LIMITS = { verses: 8, quranTexts: 4, perVerse: 4, hadiths: 4, fatwas: 3, fatwaUnits: 4, unitChars: 600,
  points: 3, perPoint: 2, perFatwaPoint: 3, chars: 1200, fatwaChars: 1600 };

// ---------------------------------------------------------------- question type (deterministic)
const QT = [
  ['ruling', /(^|\s)(ما\s+حكم|حكم|هل\s+يجوز|يجوز|حلال|حرام|مكروه|بدعه|فتوي|جايز|مباح|واجب)(\s|$)|\b(halal|haram|permissible|allowed|forbidden|ruling|fatwa|is it (a )?sin)\b/],
  ['comfort', /(^|\s)(و|ف|ب|ل)?(ال)?(حزن|حزين|حزينه|قلق|خوف|خايف|خايفه|اكتئاب|ضيق|غم|كرب|هموم|ياس|وحده|وحيد|وحيده|مصيبه|ابتلاء|بلاء|فقدت|توفي|توفيت|فراق)(ي|ه|ها|نا)?(\s|$)|(^|\s)(و|ف|ب)?الهم(\s|$)|(^|\s)همي(\s|$)|ضاق\s+صدري|\b(sad|sadness|grief|grieving|anxious|anxiety|depress\w*|afraid|fear|lonely|hopeless|worried|worry|stress\w*|loss|lost my|died|death of)\b/],
  ['virtue', /(فضل|ثواب|اجر|جزاء|منزله|مكانه)\s|\b(virtue|reward|merit|benefits? of)\b/],
  ['howto', /(^|\s)(كيف|طريقه|خطوات|ماذا\s+افعل|ماذا\s+اقول|ماذا\s+اقرا)(\s|$)|\b(how (to|do|can|should)|what should i (do|say|read)|steps)\b/],
  ['why', /(^|\s)(لماذا|لم|ما\s+الحكمه|ما\s+سبب|علل)(\s|$)|\b(why|wisdom behind|reason for)\b/],
  ['definition', /(^|\s)(ما\s+هو|ما\s+هي|ما\s+معني|معني|تعريف|من\s+هو|من\s+هم)(\s|$)|\b(what is|what are|meaning of|definition|who (is|was|were))\b/],
  ['story', /(^|\s)(قصه)(\s|$)|\bstory of\b/],
];
const qnorm = (q) => /[؀-ۿ]/.test(q) ? normAr(q).replace(/ة/g, 'ه') : normLatin(q);
// «الخوف من الله», "fear of Allah": a virtue to study, not distress (its verses of warning stay)
const GOD_FEAR = /(خوف|الخوف|خشيه|الخشيه)\s+(من\s+)?(الله|عذاب|النار|ربي|الرب)|\bfear(ing)? (of )?(allah|god|the lord|hell|punishment)\b/;
const MY_WORRY = /(^|\s)(عندي|بي|في\s+قلبي)\s+(هم|غم|حزن|ضيق|قلق)(\s|$)/;
export function questionType(q) {
  const n = qnorm(String(q || ''));
  for (const [t, re] of QT) {
    if (t === 'comfort' && GOD_FEAR.test(n)) continue;
    if (re.test(n) || (t === 'comfort' && MY_WORRY.test(n))) return t;
  }
  return 'topic';
}

// ---------------------------------------------------------------- verbatim units (R8)
// sentence spans of the original text; a span shorter than 30 characters, or one that starts in lower case
// (English), is joined to the previous one; the unit is text.slice(start, end): always an exact substring
export function units(text, max = LIMITS.unitChars) {
  const t = String(text || '');
  const spans = [];
  const re = /[^.!?؟؛;]+[.!?؟؛;]*/g;
  let m;
  while ((m = re.exec(t))) {
    const raw = m[0], a = m.index + (raw.length - raw.trimStart().length), b = m.index + raw.trimEnd().length;
    if (b - a < 2 || /^\d+\.?$/.test(t.slice(a, b))) continue;
    const s = t.slice(a, b);
    const prev = spans[spans.length - 1];
    if (prev && (s.length < 30 || /^[a-z(,]/.test(s) || prev.b - prev.a < 30) && b - prev.a <= max) prev.b = b;
    else spans.push({ a, b });
  }
  return spans.map(({ a, b }) => t.slice(a, b).replace(/^\d+\.\s*/, '')).filter(s => s.length >= 12 && s.length <= max);
}

// ---------------------------------------------------------------- closed list
// verses: [{ idx, ref, direct, verseText (Tanzil), text (tafsir unit), source, sourceTitle }] — AI-selected, best first
// hadiths: [{ id, text, expl, grade, by, lang }]   fatwas: [{ id, title, question, answer:[paragraphs], url, mufti, source }]
export function buildClosedList({ verses = [], hadiths = [], fatwas = [], qtype = 'topic' }) {
  const list = [];
  if (qtype === 'ruling') {
    for (const f of fatwas.slice(0, LIMITS.fatwas)) {
      const base = { kind: 'fatwa', id: String(f.id), url: f.url, title: f.title || '', mufti: f.mufti || '', source: f.source || '', question: f.question || '' };
      if (f.question) list.push({ ...base, sid: `F:${f.id}#q`, part: 'question', text: String(f.question).slice(0, LIMITS.unitChars) });
      const paras = (f.answer || []).flatMap(p => String(p).length <= LIMITS.unitChars ? [String(p)] : units(p));
      paras.filter(p => p.trim().length >= 20).slice(0, LIMITS.fatwaUnits).forEach((p, k) => list.push({ ...base, sid: `F:${f.id}#a${k + 1}`, part: 'answer', n: k + 1, text: p.trim() }));
    }
    return list;
  }
  for (const v of verses.slice(0, LIMITS.verses)) {
    const base = { idx: v.idx, ref: v.ref, direct: !!v.direct };
    if (v.direct && v.verseText && list.filter(x => x.kind === 'quran').length < LIMITS.quranTexts)
      list.push({ ...base, sid: `V:${v.ref}`, kind: 'quran', text: v.verseText, source: 'tanzil', sourceTitle: v.quranTitle || 'Tanzil' });
    units(v.text).slice(0, LIMITS.perVerse).forEach((s, k) => list.push({ ...base, sid: `Q:${v.ref}#${k + 1}`, kind: 'tafsir', text: s, source: v.source, sourceTitle: v.sourceTitle }));
  }
  for (const h of hadiths.slice(0, LIMITS.hadiths)) {
    const base = { kind: 'hadith', id: String(h.id), grade: h.grade || '', by: h.by || '', lang: h.lang };
    units(h.text).slice(0, 2).forEach((s, k) => list.push({ ...base, sid: `H:${h.id}#t${k + 1}`, part: 'text', text: s }));
    units(h.expl).slice(0, 2).forEach((s, k) => list.push({ ...base, sid: `H:${h.id}#e${k + 1}`, part: 'expl', text: s }));
  }
  return list;
}

// ---------------------------------------------------------------- rules after the models
const bare = (w) => w.replace(/^(و|ف)?(بال|كال|لل|ال)/, '').replace(/ة$/, 'ه');
const words = (x) => { const ar = /[؀-ۿ]/.test(x); return (ar ? normAr(x) : normLatin(x)).split(' ').filter(Boolean).map(w => ar ? bare(w) : w.replace(/s$/, '')); };
export function inQuery(concept, query) {          // R7
  const q = new Set(words(query)), c = words(concept);
  return c.length > 0 && c.every(w => q.has(w));
}
const PUNISH = /(عذاب|العذاب|جهنم|النار|سعير|الجحيم|عقاب|العقاب|عقوبه|نكال|الهلاك|اهلك|اهلكنا|ويل|لعن|غضب\s+الله)|\b(hell|hellfire|punish\w*|torment\w*|chastise\w*|curse\w*|wrath|destroy\w*|doom)\b/;
const dupKey = (s) => qnorm(s).replace(/[^ء-يa-z0-9]/g, '');

export function applyAnswer(list, out, query = '') {
  if (!out || out.ok === false) return null;
  if (!out.judge) return null;                                               // R2
  const qtype = questionType(query), qn = qnorm(query);
  const distress = qtype === 'comfort' && !PUNISH.test(qn);
  const lang = /[؀-ۿ]/.test(query) ? 'ar' : 'en';
  const qtok = new Set(tokens(query, lang));
  const S = new Map(list.map(s => [s.sid, s]));
  const used = new Set(), seen = new Set(), points = [], dropped = [];
  let chars = 0;
  const ok = (s) => {
    if (qtype === 'ruling' ? s.kind !== 'fatwa' : s.kind === 'fatwa') return 'R3';
    if (s.kind === 'tafsir' && !s.direct && !tokens(s.text, lang).some(t => qtok.has(t))) return 'R4';
    if (distress && PUNISH.test(qnorm(s.text))) return 'R5';
    const k = dupKey(s.text);
    if (seen.has(k) || [...seen].some(x => x.length > 40 && (x.includes(k) || k.includes(x)))) return 'R1';
    return null;
  };
  for (const p of Array.isArray(out.points) ? out.points : []) {
    const c = String(p && p.concept || '').slice(0, 40);
    const items = [];
    for (const sid of (Array.isArray(p && p.sids) ? p.sids : []).map(String)) {
      const s = S.get(sid);
      if (!s || used.has(sid)) continue;                                     // R1
      const why = ok(s);
      if (why) { dropped.push({ sid, rule: why }); continue; }
      const cap = s.kind === 'fatwa' ? LIMITS.fatwaChars : LIMITS.chars;
      if (chars + s.text.length > cap && chars > 0) { dropped.push({ sid, rule: 'R6' }); continue; }
      // one fatwa per point: its passages stay together, with the fatwa's question first
      if (s.kind === 'fatwa' && items.length && items[0].id !== s.id) { dropped.push({ sid, rule: 'R6' }); continue; }
      used.add(sid); seen.add(dupKey(s.text)); chars += s.text.length; items.push(s);
      if (items.length >= (s.kind === 'fatwa' ? LIMITS.perFatwaPoint : LIMITS.perPoint)) break;
    }
    if (!items.length) continue;
    if (items[0].kind === 'fatwa') items.sort((a, b) => (a.part === 'question' ? -1 : b.part === 'question' ? 1 : (a.n || 0) - (b.n || 0)));
    const same = points.find(x => x.concept === c && x.items[0].kind !== 'fatwa' && items[0].kind !== 'fatwa');
    if (same) same.items.push(...items.slice(0, LIMITS.perPoint + 1 - same.items.length));
    else points.push({ concept: c, shown: inQuery(c, query), items });
    if (points.length >= LIMITS.points) break;
  }
  const concepts = (Array.isArray(out.concepts) ? out.concepts : []).map(c => String(c).slice(0, 40)).slice(0, 3);
  const covered = new Set(points.map(p => p.concept));
  const uncovered = concepts.filter(c => !covered.has(c)).map(c => ({ concept: c, shown: inQuery(c, query) }));
  return { by: 'rag', qtype, answerable: points.length ? (uncovered.length ? 'partial' : 'yes') : 'no', points, uncovered, concepts, dropped,
    model: String(out.model || ''), judge: String(out.judge) };
}
