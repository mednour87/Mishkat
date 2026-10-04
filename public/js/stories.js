// Stories of the prophets in the Quran — without a single generated word.
// «قصة يوسف», "story of Moses", «النبي يونس» → a story card built only from sources of the challenge's
// reference pack and the Mushaf:
//   - summary  : the opening paragraph and the aims («مقاصدها») of the surah that narrates the story, from
//                Al-Jamhara «علوم السور» (islamic-content.com), verbatim, with the work it cites
//   - episodes : Al-Jamhara's topics of each surah («موضوعاتها») that name the prophet — or every topic of
//                the surah named after him when the whole surah narrates his story (Yusuf) —, in Mushaf order,
//                each with its verse range, read in the reader with Alafasy's recitation
//   - verses   : the verses that NAME him (Tanzil text; reviewed lists where the name is also an ordinary
//                word: «صالح», «هود», «يحيى») and the verses that speak of him without naming him, from the
//                human-curated subject index of Quranpedia (its entry for the prophet and every sub-entry)
// Built by data_build/build_surah_sciences.py (public/data/surah_sciences.json).
import { normAr, normLatin } from './engine.js';

// forms: written forms of the name in the imla'i text (searched as whole words, with و ف ب ل ك يا prefixes)
// named: reviewed list of the verses that name him, when a form is also an ordinary word
// index: names of his entries in Quranpedia's subject index; sura: the surah named after him;
// whole: that surah narrates his whole story; aliases: his other names in the titles of the episodes
export const PROPHETS = [
  { id: 'adam', ar: 'آدم', en: 'Adam', latin: ['adam'], forms: ['آدم'], index: ['آدم عليه السلام', 'آدم'] },
  { id: 'idris', ar: 'إدريس', en: 'Idris (Enoch)', latin: ['idris', 'enoch'], forms: ['إدريس'], index: ['إدريس عليه السلام', 'إدريس'] },
  { id: 'nuh', ar: 'نوح', en: 'Noah (Nuh)', latin: ['nuh', 'nouh', 'noah', 'noh'], forms: ['نوح', 'نوحا'], index: ['نوح عليه السلام', 'نوح'], sura: 71, whole: true },
  { id: 'hud', ar: 'هود', en: 'Hud', latin: ['hud', 'houd', 'hood'], named: ['7:65', '11:50', '11:53', '11:58', '11:60', '11:89', '26:124'], index: ['هود عليه السلام', 'هود'], sura: 11 },
  { id: 'salih', ar: 'صالح', en: 'Salih', latin: ['salih', 'saleh', 'salah'], named: ['7:73', '7:75', '7:77', '11:61', '11:62', '11:66', '11:89', '26:142', '27:45'], index: ['صالح عليه السلام', 'صالح'] },
  { id: 'ibrahim', ar: 'إبراهيم', en: 'Abraham (Ibrahim)', latin: ['ibrahim', 'ebrahim', 'abraham', 'ibraheem'], forms: ['إبراهيم'], index: ['إبراهيم عليه السلام', 'إبراهيم'], sura: 14 },
  { id: 'lut', ar: 'لوط', en: 'Lot (Lut)', latin: ['lut', 'lout', 'loot', 'lot'], forms: ['لوط', 'لوطا'], index: ['لوط عليه السلام', 'لوط'] },
  { id: 'ismail', ar: 'إسماعيل', en: 'Ishmael (Ismail)', latin: ['ismail', 'ismael', 'ishmael', 'ismaeel'], forms: ['إسماعيل'], index: ['إسماعيل عليه السلام', 'إسماعيل'] },
  { id: 'ishaq', ar: 'إسحاق', en: 'Isaac (Ishaq)', latin: ['ishaq', 'ishak', 'isaac'], forms: ['إسحاق'], index: ['إسحاق عليه السلام', 'إسحاق'] },
  { id: 'yaqub', ar: 'يعقوب', en: 'Jacob (Yaqub)', latin: ['yaqub', 'yacoub', 'yakub', 'jacob', 'yaqoob'], forms: ['يعقوب'], index: ['يعقوب أبو يوسف عليهما السلام', 'يعقوب عليه السلام', 'يعقوب'] },
  { id: 'yusuf', ar: 'يوسف', en: 'Joseph (Yusuf)', latin: ['yusuf', 'yousef', 'youssef', 'yousuf', 'yusef', 'joseph'], forms: ['يوسف'], index: ['يوسف عليه السلام', 'يوسف'], sura: 12, whole: true },
  { id: 'ayyub', ar: 'أيوب', en: 'Job (Ayyub)', latin: ['ayyub', 'ayoub', 'ayub', 'job'], forms: ['أيوب'], index: ['أيوب عليه السلام', 'أيوب'] },
  { id: 'shuayb', ar: 'شعيب', en: 'Shuayb', latin: ['shuayb', 'shuaib', 'shoaib', 'shoaib', 'chouaib'], forms: ['شعيب', 'شعيبا'], index: ['شعيب عليه السلام', 'شعيب'] },
  { id: 'musa', ar: 'موسى', en: 'Moses (Musa)', latin: ['musa', 'moussa', 'mousa', 'moses'], forms: ['موسى'], index: ['موسى عليه السلام', 'موسى'] },
  { id: 'harun', ar: 'هارون', en: 'Aaron (Harun)', latin: ['harun', 'haroun', 'haroon', 'aaron'], forms: ['هارون'], index: ['هارون عليه السلام', 'هارون'] },
  { id: 'dhulkifl', ar: 'ذو الكفل', en: 'Dhul-Kifl', latin: ['dhul kifl', 'dhulkifl', 'zulkifl', 'thul kifl'], forms: ['الكفل'], index: ['ذو الكفل عليه السلام', 'ذو الكفل'] },
  { id: 'dawud', ar: 'داود', en: 'David (Dawud)', latin: ['dawud', 'dawood', 'daoud', 'david'], forms: ['داود'], index: ['داود عليه السلام', 'داود'] },
  { id: 'sulayman', ar: 'سليمان', en: 'Solomon (Sulayman)', latin: ['sulayman', 'sulaiman', 'soliman', 'suleiman', 'solomon'], forms: ['سليمان'], index: ['سليمان عليه السلام', 'سليمان'] },
  { id: 'ilyas', ar: 'إلياس', en: 'Elijah (Ilyas)', latin: ['ilyas', 'elias', 'elijah'], forms: ['إلياس'], index: ['إلياس عليه السلام', 'إلياس'] },
  { id: 'alyasa', ar: 'اليسع', en: 'Elisha (Al-Yasa)', latin: ['alyasa', 'al yasa', 'elisha'], forms: ['اليسع'], index: ['اليسع عليه السلام', 'اليسع'] },
  { id: 'yunus', ar: 'يونس', en: 'Jonah (Yunus)', latin: ['yunus', 'younes', 'younis', 'jonah'], forms: ['يونس'], named: ['4:163', '6:86', '10:98', '21:87', '37:139', '68:48'], aliases: ['ذا النون', 'ذو النون', 'صاحب الحوت'], index: ['يونس عليه السلام', 'يونس', 'ذو النون'], sura: 10 },
  { id: 'zakariya', ar: 'زكريا', en: 'Zechariah (Zakariya)', latin: ['zakariya', 'zakaria', 'zakariyya', 'zechariah'], forms: ['زكريا'], index: ['زكريا عليه السلام', 'زكريا'] },
  { id: 'yahya', ar: 'يحيى', en: 'John (Yahya)', latin: ['yahya', 'yahia', 'yehia'], named: ['3:39', '6:85', '19:7', '19:12', '21:90'], index: ['يحيى عليه السلام', 'يحيى'] },
  { id: 'isa', ar: 'عيسى', en: 'Jesus (Isa)', latin: ['isa', 'issa', 'aissa', 'jesus'], forms: ['عيسى'], index: ['عيسى عليه السلام', 'عيسى'] },
  { id: 'maryam', ar: 'مريم', en: 'Mary (Maryam)', latin: ['maryam', 'mariam', 'meryem', 'mary'], forms: ['مريم'], index: ['مريم عليها السلام', 'مريم'], sura: 19, notProphet: true },
];

const PREFIX = '(و|ف|ب|ل|ك|يا|أ|ا)?';
const STORY_AR = /^(ما\s+(هي\s+)?)?(قصة|قصه|قصص|حكاية|حكايه|سيرة|سيره|احكي\s+لي\s+قصة|احك\s+لي\s+قصة|حدثني\s+عن|من\s+هو|من\s+هي)\s+/;
const HONOR_AR = /^(النبي|نبي\s+الله|سيدنا|سيدتنا|السيدة|السيده|رسول\s+الله)\s+/;
const TAIL_AR = /\s+(عليه|عليها)\s+(الصلاة\s+و)?السلام$|\s+(في\s+القران(\s+الكريم)?)$|\s+(مع\s+.+)$/;
const STORY_EN = /^(what is |tell me |tell me about |the )?(the )?(story|stories|life|tale) of\s+|^who (is|was)\s+|^tell me about\s+/;
const HONOR_EN = /^(the )?(prophet|messenger|lady|saint)\s+/;
const TAIL_EN = /\s+(in (the )?(quran|koran))$|\s+(peace be upon (him|her)|pbuh|as)$/;

// built on first use (engine.js imports this module: normAr is not usable while the modules load)
let AR_NAMES = null, LAT_NAMES = null;
function names() {
  if (AR_NAMES) return;
  AR_NAMES = new Map(); LAT_NAMES = new Map();
  for (const p of PROPHETS) {
    AR_NAMES.set(normAr(p.ar), p);
    for (const l of p.latin) LAT_NAMES.set(normLatin(l), p);
  }
}

// the prophet whose story is asked, or null. A bare name («يوسف») stays a word search; the story frame
// («قصة», «سيرة», «من هو», "story of", "who was") or an honorific («النبي يونس», "prophet Jonah") is required.
export function storyQuery(q) {
  names();
  const a = normAr(q).replace(/[؟?!.]/g, ' ').trim();
  if (/[ء-ي]/.test(a)) {
    let s = a, framed = false;
    if (STORY_AR.test(s)) { s = s.replace(STORY_AR, ''); framed = true; }
    if (HONOR_AR.test(s)) { s = s.replace(HONOR_AR, ''); framed = true; }
    for (let k = 0; k < 2; k++) s = s.replace(TAIL_AR, '').trim();
    const p = AR_NAMES.get(s);
    return framed && p ? p : null;
  }
  let s = normLatin(q), framed = false;
  if (STORY_EN.test(s)) { s = s.replace(STORY_EN, ''); framed = true; }
  if (HONOR_EN.test(s)) { s = s.replace(HONOR_EN, ''); framed = true; }
  for (let k = 0; k < 2; k++) s = s.replace(TAIL_EN, '').trim();
  s = s.replace(/^(the )?(prophet|messenger) /, '');
  const p = LAT_NAMES.get(s) || LAT_NAMES.get(s.replace(/\s/g, ''));
  return framed && p ? p : null;
}

// verses naming the prophet: idx list (Mushaf order)
export function namedVerses(p, { searchAr, idxOf }) {
  if (p.named) return p.named.map(r => { const [s, a] = r.split(':').map(Number); return idxOf(s, a); }).filter(i => i >= 0).sort((x, y) => x - y);
  const alt = p.forms.map(f => normAr(f)).join('|');
  const re = new RegExp(`(^| )${PREFIX}(${alt})( |$)`);
  const out = [];
  searchAr.forEach((v, i) => { if (re.test(normAr(v))) out.push(i); });
  return out;
}

// verses of his entries in the human-curated subject index (entry + every sub-entry)
export function indexVerses(p, topics) {
  if (!topics || !Array.isArray(topics.items)) return [];
  const items = topics.items, kids = new Map();
  for (const x of items) { const k = kids.get(x[2]); if (k) k.push(x); else kids.set(x[2], [x]); }
  const names = new Set(p.index.map(normAr));
  const roots = items.filter(x => names.has(normAr(x[1])));
  const out = new Set(), seen = new Set();
  const walk = (x, depth) => {
    if (seen.has(x[0]) || depth > 6) return;
    seen.add(x[0]);
    for (const i of x[3] || []) out.add(i);
    for (const c of kids.get(x[0]) || []) walk(c, depth + 1);
  };
  roots.forEach(r => walk(r, 0));
  return [...out].sort((a, b) => a - b);
}

// episodes: Al-Jamhara topics that name him (all topics of his surah when it narrates only his story)
export function episodes(p, sci) {
  if (!sci || !Array.isArray(sci.suras)) return [];
  const alt = [p.ar, ...(p.aliases || [])].map(normAr).join('|'), re = new RegExp(`(^| )${PREFIX}(${alt})( |$)`);
  const out = [];
  for (const s of sci.suras) {
    const whole = p.whole && s.sura === p.sura;
    for (const t of s.topics || []) {
      if (whole || re.test(normAr(t.title))) out.push({ sura: s.sura, title: t.title, ranges: t.ranges, cite: s.topicsCite || '', url: s.url });
    }
  }
  return out;
}

// the whole story card
export function storyOf(p, { sci, topics, searchAr, idxOf }) {
  const S = sci && p.sura ? (sci.suras || []).find(s => s.sura === p.sura) : null;
  // a summary is quoted only for a surah that narrates his story from beginning to end (Yusuf, Nuh): the
  // page of a surah merely named after him (Hud, Ibrahim, Yunus…) describes the surah, not his story
  const summary = S && p.whole && S.intro && normAr(S.intro).includes(normAr(p.ar))
    ? { sura: S.sura, intro: S.intro, aims: S.aims || [], aimsCite: S.aimsCite || '', url: S.url } : null;
  const named = namedVerses(p, { searchAr, idxOf });
  const namedSet = new Set(named);
  const indexed = indexVerses(p, topics).filter(i => !namedSet.has(i));
  return { prophet: p, summary, episodes: episodes(p, sci), named, indexed, source: sci && sci.source, sourceEn: sci && sci.sourceEn };
}
