// Builds eval/results/REPORT.md from eval/results/results.json (no API calls).
//   node eval/report.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const R = JSON.parse(readFileSync(new URL('./results/results.json', import.meta.url), 'utf8'));
const { summary, rows, llm: llmInfo, stability } = R;
const CAT_LABEL = {
  route_ref: 'Verse references (7 formats, ar/en/fr, Arabic digits)', route_sura: 'Surah names (3 languages, typos)',
  route_famous: 'Well-known verse names', route_invalid: 'Non-existent references',
  verify_exact: 'Exact quotes (imla\'i fragments)', verify_uthmani: 'Full verses pasted in Uthmani script',
  verify_misquote: 'Misquotes (1 word changed)', verify_merged: 'Two verses merged', verify_notquran: 'Sayings wrongly attributed to the Quran (Arabic)',
  verify_notquran_tr: 'Translated sayings wrongly attributed to the Quran', safety_critical: 'Fatwa / personal / dream questions → abstain',
  safety_benign: 'Sensitive words in legitimate topics → must NOT abstain', out_of_scope: 'Out-of-scope / gibberish → no verses',
  topic_ar: 'Topics — Arabic (hit@10)', topic_en: 'Topics — English (hit@10)', topic_fr: 'Topics — French (hit@10)' };
const LABEL = { baseline_keyword: 'Keyword search (baseline)', mishkat: 'Mishkat (deterministic)', mishkat_llm: 'Mishkat + AI' };
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + ' %' : '—';
const names = Object.keys(summary);
const cell = (m, c, f) => summary[m].cats[c] ? f(summary[m].cats[c]) : '—';

let md = `# Mishkat — evaluation report\n\nGenerated ${R.date} · ${R.n} synthetic items (\`eval/golden.jsonl\`, seeded, no user data). `;
md += `The AI-augmented mode is run on the items where the LLM acts (topics and safety).\n\n`;
md += `| Category | n | ${names.map(m => LABEL[m] || m).join(' | ')} |\n|---|---|${names.map(() => '---').join('|')}|\n`;
for (const c of Object.keys(CAT_LABEL)) {
  const n = summary[names[0]].cats[c]?.n || 0;
  if (!n) continue;
  md += `| ${CAT_LABEL[c]} | ${n} | ${names.map(m => cell(m, c, x => pct(x.pass, x.n))).join(' | ')} |\n`;
}
md += `| **All items evaluated in the mode** | | ${names.map(m => `**${pct(summary[m].pass, summary[m].total)}** (n=${summary[m].total})`).join(' | ')} |\n\n`;
md += `## Topic retrieval detail (recall@30 / MRR)\n\n| Language | ${names.map(m => LABEL[m] || m).join(' | ')} |\n|---|${names.map(() => '---').join('|')}|\n`;
for (const c of ['topic_ar', 'topic_en', 'topic_fr']) md += `| ${c.slice(-2)} | ${names.map(m => cell(m, c, x => `${(x.recall / x.n).toFixed(2)} / ${(x.rr / x.n).toFixed(2)}`)).join(' | ')} |\n`;
md += `\n## Safety & grounding (target 0)\n\n| Metric | ${names.map(m => LABEL[m] || m).join(' | ')} |\n|---|${names.map(() => '---').join('|')}|\n`;
md += `| Unsafe outputs (misquote accepted as exact, saying attributed to the Quran, fatwa answered, fake reference shown) | ${names.map(m => summary[m].unsafe).join(' | ')} |\n`;
md += `| References outside the 6,236 verses | ${names.map(m => summary[m].badRef).join(' | ')} |\n`;
md += `| Answer sentences not verbatim from the cited tafsir | ${names.map(m => summary[m].badQuote).join(' | ')} |\n`;
md += `| Latency p50 / p95 (ms, in-process; AI mode includes network) | ${names.map(m => summary[m].p50.toFixed(0) + ' / ' + summary[m].p95.toFixed(0)).join(' | ')} |\n\n`;
md += `**Stability:** ${stability.identical}/${R.n} items return identical verse lists over ${stability.runs} repeated runs of the deterministic engine.\n\n`;
if (llmInfo) md += `**AI-augmented mode** (chain ${llmInfo.models.join(' → ')}; ${llmInfo.n} topic & safety items): LLM used on ${llmInfo.used} items (${Object.entries(llmInfo.modelUse).map(([k, v]) => `${k}: ${v}`).join(', ')}), paragraph chosen by the LLM on ${llmInfo.paragraphByLLM}, ${llmInfo.rejected} out-of-list ids rejected by the verifier, ${llmInfo.errors} provider errors (each fell back to the deterministic path). Pass on these items: deterministic ${llmInfo.detPassSameItems}/${llmInfo.n} → AI-augmented ${llmInfo.llmPass}/${llmInfo.n}.\n\n`;
else md += `**AI-augmented mode:** not run (no GROQ_API_KEY).\n\n`;
if (llmInfo && llmInfo.note) md += `> ${llmInfo.note}\n\n`;
for (const m of names.filter(x => x !== 'baseline_keyword')) {
  const fails = rows[m].filter(r => !r.pass);
  md += `### Remaining failures — ${LABEL[m] || m} (${fails.length})\n\n`;
  md += fails.length ? fails.map(r => `- \`${r.id}\` ${r.q.slice(0, 70)} → ${r.type}${r.verdict ? '/' + r.verdict : ''}${r.unsafe ? ' ⚠️ unsafe' : ''} ${r.refs.slice(0, 5).join(', ')}`).join('\n') + '\n\n' : '- none\n\n';
}
writeFileSync(new URL('./results/REPORT.md', import.meta.url), md);
console.log(md);
