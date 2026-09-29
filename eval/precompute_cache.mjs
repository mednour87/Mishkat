// Pre-computes the LLM outputs (expand + select) for frequent questions and
// ships them in public/data/llm_cache.json. At run time the browser uses the
// cache first; every cached output is still verified by the engine against the
// closed candidate lists, exactly like a live answer.
//   node eval/precompute_cache.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadEngine } from '../tests/load.mjs';
import { select, expand, providers } from '../functions/_lib/selector.js';
import { UI } from '../public/js/i18n.js';

const env = { ...process.env };
const dv = new URL('../.dev.vars', import.meta.url);
if (existsSync(dv)) for (const line of readFileSync(dv, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
if (!providers(env).length) { console.log('No GROQ_API_KEY'); process.exit(1); }
const { engine: E } = loadEngine();
const OUT = new URL('../public/data/llm_cache.json', import.meta.url);
const cache = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { expand: {}, select: {} };
export const cacheKey = (p) => `${p.lang}|${String(p.query).trim().toLowerCase()}`;

const TOPICS = {
  ar: ['الصبر', 'كيف أتعامل مع الحزن', 'بر الوالدين', 'قصة يوسف', 'الجنة', 'النار', 'الموت', 'الشكر', 'الملائكة', 'الصدق', 'رحمة الله', 'التوبة',
    'الصلاة', 'الصيام', 'الزكاة', 'الحج', 'قصة موسى', 'قصة إبراهيم', 'قصة نوح', 'مريم', 'عيسى', 'آدم', 'الرزق', 'الظلم', 'الأمانة', 'اليتيم',
    'الإنفاق في سبيل الله', 'العدل', 'الدعاء', 'الذكر', 'التوكل على الله', 'القرآن', 'يوم القيامة', 'الخوف من الله', 'الأخلاق', 'الزواج',
    'العلم', 'الكبر', 'الغيبة', 'الحسد', 'الربا', 'الخمر', 'الشيطان', 'الأنبياء', 'التقوى', 'النفاق', 'الإحسان', 'الجهاد', 'الهداية'],
  en: ['patience', 'how to deal with sadness', 'kindness to parents', 'Moses and Pharaoh', 'paradise', 'hellfire', 'death', 'gratitude', 'angels',
    'honesty', 'mercy of Allah', 'repentance', 'prayer', 'fasting', 'charity', 'story of Joseph', 'Jesus', 'Abraham', 'Noah', 'knowledge',
    'justice', 'forgiveness', 'trust in Allah', 'Day of Judgment', 'orphans', 'marriage', 'supplication', 'pride', 'hypocrisy', 'guidance'],
  fr: ['la patience', 'comment surmonter la tristesse', 'les parents', 'Moïse et Pharaon', 'le paradis', "l'enfer", 'la mort', 'la gratitude',
    'les anges', 'la miséricorde', 'le repentir', 'la prière', 'le jeûne', "l'aumône", "l'histoire de Joseph", 'Jésus', 'Abraham', 'Noé',
    'la science', 'la justice', 'le pardon', 'la confiance en Allah', 'le jour du jugement', 'les orphelins', 'le mariage', "l'invocation", 'Marie'],
};
const queries = new Set();
for (const l of ['ar', 'en', 'fr']) { for (const q of UI[l].chips) queries.add(q); for (const q of TOPICS[l]) queries.add(q); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let n = 0, fresh = 0;
for (const q of queries) {
  let used = false;
  const llm = {
    expand: async (p) => { const k = cacheKey(p); if (cache.expand[k]) return cache.expand[k]; used = true; const o = await expand(p, env); if (o.ok) cache.expand[k] = o; return o; },
    select: async (p) => { const k = cacheKey(p); if (cache.select[k]) return cache.select[k]; used = true; const o = await select(p, env); if (o.ok) cache.select[k] = o; return o; },
  };
  const r = await E.ask(q, { uiLang: 'ar', llm, llmTimeoutMs: 25000 });
  n++; if (used) fresh++;
  console.log(`${n}/${queries.size} ${r.type} ${r.paragraphBy || ''} ${q} → ${r.verses.slice(0, 5).map(v => v.ref).join(' ')}`);
  writeFileSync(OUT, JSON.stringify(cache));
  if (used) await sleep(2500);
}
console.log('cache entries', Object.keys(cache.expand).length, Object.keys(cache.select).length, 'fresh queries', fresh);
