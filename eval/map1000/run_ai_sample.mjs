// Phase B of the 1,000-question map: the WHOLE pipeline with AI on a sample of weak points, using ONLY the free
// Groq tier (the paid key is removed from the environment: cost 0). Paced for Groq's per-minute token quota.
//   FREE_ONLY=1 node eval/map1000/run_ai_sample.mjs [n=30]   → eval/map1000/ai_sample.json + AI_SAMPLE.md
import { readFileSync, writeFileSync } from 'node:fs';
if (process.env.FREE_ONLY !== '1') { console.error('refusing to run without FREE_ONLY=1 (it would spend paid credit)'); process.exit(1); }
const { runQuestion, env } = await import('../rag_pipeline.mjs');
if (env.PRIMARY_KEY) { console.error('paid key still present'); process.exit(1); }
const map = JSON.parse(readFileSync(new URL('./map.json', import.meta.url), 'utf8'));
const N = +(process.argv[2] || 30), PACE = +(process.env.PACE_MS || 75000);
const pick = (id, k, f = () => true) => (map.weak.find(w => w.id === id) || { examples: [] }).examples.filter(f).slice(0, k).map(e => ({ q: e.q, weak: id }));
const sample = [...pick('W5', 9), ...pick('W2', 8, e => /[؀-ۿ]/.test(e.q)), ...pick('W1', 6, e => !/sourate|dois/.test(e.q)), ...pick('W3', 4), ...pick('W9', 3)]
  .filter((x, i, a) => a.findIndex(y => y.q === x.q) === i).slice(0, N);
const rows = [];
for (const [k, it] of sample.entries()) {
  let row;
  try { row = await runQuestion(it.q); } catch (e) { row = { q: it.q, error: String(e.message || e) }; }
  row.weak = it.weak;
  rows.push(row);
  console.log(`${k + 1}/${sample.length} [${it.weak}] ${it.q.slice(0, 60)} | ${row.type}/${row.reason || ''} by ${row.confirmedBy || '-'} | v ${(row.verses || []).slice(0, 4).join(' ')} | rag ${row.answerable || '-'} | ${row.ms} ms`);
  writeFileSync(new URL('./ai_sample.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), freeOnly: true, rows }, null, 1));
  if (k + 1 < sample.length) await new Promise(r => setTimeout(r, PACE));
}
const ok = rows.filter(r => r.confirmedBy === 'ai' || r.type === 'abstain' || r.crisis || r.pack).length;
const md = ['# AI sample of the weak points (Groq free tier only, cost 0)', '', `${new Date().toISOString()} · ${rows.length} questions · answered with AI confirmation, a reviewed pack or a justified referral: ${ok}/${rows.length}`, ''];
for (const r of rows) {
  md.push(`## [${r.weak}] ${r.q}`, `- ${r.type}${r.reason ? '/' + r.reason : ''} · level ${r.level} · by ${r.confirmedBy || '—'} · verses ${(r.verses || []).join(', ') || '—'}`, `- short answer: ${r.answerable || '—'}`);
  for (const p of r.points || []) for (const x of p.items) md.push(`  - \`${x.sid}\` ${x.text.slice(0, 220).replace(/\s+/g, ' ')}`);
  md.push('');
}
writeFileSync(new URL('./AI_SAMPLE.md', import.meta.url), md.join('\n'));
console.log('done', ok, '/', rows.length);
