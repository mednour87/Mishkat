// Battery of SENSITIVE subjects (Arabic + English), run through the whole live pipeline (eval/rag_pipeline.mjs).
// For each question: route, level (A–D), context pack, verses, published fatwas, short answer passages.
// Writes eval/results/sensitive_live.json and eval/results/SENSITIVE_REVIEW.md (to read and check by hand).
//   node eval/run_sensitive.mjs [question …]
import { writeFileSync } from 'node:fs';
import { runQuestion } from './rag_pipeline.mjs';
import { SENSITIVE_QS } from './sensitive_questions.mjs';

export { SENSITIVE_QS };

const QS = process.argv.slice(2).length ? process.argv.slice(2) : SENSITIVE_QS;
const rows = [];
for (const q of QS) {
  let row;
  try { row = await runQuestion(q); } catch (e) { row = { q, error: String(e.message || e) }; }
  rows.push(row);
  console.log(`${q} | ${row.type}/${row.reason || ''} L${row.level || '-'} pack=${row.pack || '-'} | v ${(row.verses || []).join(' ')} | fatwas ${(row.fatwaTitles || []).length} | rag ${row.answerable || '-'} ${(row.points || []).map(p => p.items.map(x => x.sid).join('+')).join(' ; ')} | ${row.ms} ms`);
  await new Promise(res => setTimeout(res, 1500));
}
writeFileSync(new URL('./results/sensitive_live.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), rows }, null, 1));
const md = ['# Sensitive subjects — live review', '', `Run ${new Date().toISOString()} · ${rows.length} questions · each answer to be read by a person.`, ''];
for (const r of rows) {
  md.push(`## ${r.q}`, `- route: ${r.route} · type: ${r.type}${r.reason ? '/' + r.reason : ''} · level: ${r.level} · pack: ${r.pack || '—'} · sensitive: ${r.sensitive} · polemic: ${r.polemic}`,
    `- verses: ${(r.verses || []).join(', ') || '—'}${r.contextPack && r.contextPack.length ? ' · context pack: ' + r.contextPack.join(', ') : ''}`,
    r.fatwaTitles ? `- published fatwas: ${r.fatwaTitles.join(' | ') || '—'}${r.kw ? ' (search keywords: ' + r.kw.join(' ') + ')' : ''}` : '',
    `- short answer: ${r.answerable || '—'}`);
  for (const p of r.points || []) for (const x of p.items) md.push(`  - \`${x.sid}\` ${x.text.slice(0, 260).replace(/\s+/g, ' ')}`);
  md.push('');
}
writeFileSync(new URL('./results/SENSITIVE_REVIEW.md', import.meta.url), md.filter(l => l !== '').join('\n').replace(/\n## /g, '\n\n## ') + '\n');
