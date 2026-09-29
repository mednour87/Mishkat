// Relevance audit: prints, for common questions, what the user would see
// (paragraph + top verses with a tafsir excerpt) so a human can judge it.
//   node eval/audit_relevance.mjs [--no-llm] > eval/results/audit.txt
import { readFileSync, existsSync } from 'node:fs';
import { loadEngine } from '../tests/load.mjs';
import { select, expand, providers } from '../functions/_lib/selector.js';

const env = { ...process.env };
const dv = new URL('../.dev.vars', import.meta.url);
if (existsSync(dv)) for (const line of readFileSync(dv, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const useLLM = !process.argv.includes('--no-llm') && providers(env).length;
const llm = useLLM ? { expand: (p) => expand(p, env), select: (p) => select(p, env) } : null;
const { engine: E, sources } = loadEngine();
const QUERIES = (process.argv.find(a => a.startsWith('--q=')) || '').slice(4).split('|').filter(Boolean);
const DEFAULT = ['الصبر', 'كيف أتعامل مع الحزن', 'بر الوالدين', 'الجنة', 'النار', 'الموت', 'الشكر', 'الملائكة', 'الصدق', 'رحمة الله',
  'التوبة من الذنوب', 'الصلاة', 'الصيام', 'قصة موسى', 'مريم', 'الرزق', 'الظلم', 'الأمانة', 'اليتيم', 'الإنفاق في سبيل الله',
  'patience', 'mercy of Allah', 'paradise', 'hellfire', 'death', 'gratitude', 'angels', 'honesty',
  'la patience', 'le paradis', "l'enfer", 'la mort', 'les anges', 'la prière', 'le pardon'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (const q of QUERIES.length ? QUERIES : DEFAULT) {
  const r = await E.ask(q, { uiLang: 'ar', llm, llmTimeoutMs: 20000 });
  const L = r.lang;
  const taf = sources[L === 'ar' ? 'muyassar_ar' : `mukhtasar_${L}`];
  console.log(`\n=== ${q}  [${r.type}] llm=${JSON.stringify(r.meta.llm && { used: r.meta.llm.used, model: r.meta.llm.model })} n=${r.verses.length}`);
  for (const a of r.answer.filter(a => a.kind === 'quote')) console.log(`  ¶ ${a.ref}: ${a.text.slice(0, 160)}`);
  for (const v of r.verses.slice(0, 10)) console.log(`  - ${v.ref.padEnd(7)} ${(taf.text[v.idx] || '').replace(/^\d+\.\s*/, '').slice(0, 110)}`);
  if (llm) await sleep(1500);
}
