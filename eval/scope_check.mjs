// T091: how many questions of the project's question sets the off-topic map would refuse (over-refusal check).
//   node eval/scope_check.mjs        → counts per set + the refused questions (each must really be off-topic)
import fs from 'node:fs';
import { mapQuestion } from '../public/js/scope.js';

const texts = (j) => {
  const out = [];
  const walk = (x) => { if (!x) return; if (typeof x === 'string') return; if (Array.isArray(x)) return x.forEach(walk);
    if (typeof x === 'object') { for (const k of ['q', 'query', 'question', 'text']) if (typeof x[k] === 'string') out.push(x[k]); for (const v of Object.values(x)) if (typeof v === 'object') walk(v); } };
  walk(j);
  return [...new Set(out)];
};
let all = 0, off = 0;
for (const f of ['eval/map1000/map.json', 'eval/overrefusal.json', 'eval/forum_questions.json', 'eval/spoken_queries.json']) {
  const qs = texts(JSON.parse(fs.readFileSync(f, 'utf8')));
  const hits = qs.map(q => [q, mapQuestion(q)]).filter(([, m]) => m && m.kind === 'offtopic');
  const kinds = {};
  for (const q of qs) { const m = mapQuestion(q); const k = m ? (m.kind === 'feature' ? 'feature:' + m.feature : m.kind) : 'search'; kinds[k] = (kinds[k] || 0) + 1; }
  console.log(`${f}: ${qs.length} questions · ${JSON.stringify(kinds)}`);
  for (const [q, m] of hits) console.log(`   offtopic/${m.topic}: ${q}`);
  all += qs.length; off += hits.length;
}
console.log(`total ${all}, mapped off-topic ${off}`);
