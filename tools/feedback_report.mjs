// (6 Oct, T118) Visitors' feedback report: reads the FEEDBACK KV namespace (or a local JSONL file) and writes the share
// of useful answers per route, with a 95 % Wilson interval, and the list of reported errors to review by hand.
//   node tools/feedback_report.mjs                 (online KV, needs `npx wrangler login`)
//   node tools/feedback_report.mjs .wrangler/feedback_local.jsonl
// Output: docs/FEEDBACK_REPORT.md
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const NS = 'f8822beae5f846ebbfe57f2aad2e784d';
const sh = (c) => execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 });
let rows = [];
if (process.argv[2]) rows = readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
else {
  const keys = JSON.parse(sh(`npx wrangler kv key list --namespace-id ${NS} --remote`));
  for (const k of keys) rows.push(JSON.parse(sh(`npx wrangler kv key get "${k.name}" --namespace-id ${NS} --remote`)));
}
const wilson = (k, n) => {
  if (!n) return [0, 0];
  const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [(c - m) / d, (c + m) / d];
};
const pct = (x) => (100 * x).toFixed(1) + ' %';
const by = new Map();
for (const r of rows) { const g = by.get(r.route || '?') || { up: 0, down: 0, report: 0 }; g[r.vote]++; by.set(r.route || '?', g); }
const all = rows.reduce((g, r) => (g[r.vote]++, g), { up: 0, down: 0, report: 0 });
const line = (name, g) => { const n = g.up + g.down + g.report, [lo, hi] = wilson(g.up, n); return `| ${name} | ${n} | ${g.up} | ${g.down} | ${g.report} | ${n ? pct(g.up / n) : '—'} | ${n ? `${pct(lo)}–${pct(hi)}` : '—'} |`; };
let md = `# Visitors' feedback on Mishkat's answers\n\nGenerated ${new Date().toISOString()} by \`tools/feedback_report.mjs\` from ${process.argv[2] ? '`' + process.argv[2] + '`' : 'the FEEDBACK KV namespace'}.\nEach entry is a button pressed by a visitor under an answer (no identifier stored). Interval: Wilson 95 %.\n\n`;
md += `| Route | votes | useful | not useful | error reported | useful share | 95 % CI |\n|---|---|---|---|---|---|---|\n${line('**all**', all)}\n${[...by].sort((a, b) => b[1].up + b[1].down + b[1].report - a[1].up - a[1].down - a[1].report).map(([k, g]) => line(k, g)).join('\n')}\n\n`;
const rep = rows.filter(r => r.vote !== 'up');
md += `## Reports and «not useful» to review (${rep.length})\n\n` + (rep.map(r => `- ${r.at.slice(0, 16)} · ${r.vote} · «${r.q}» (${r.lang}, ${r.route}) · refs ${r.refs.join(' ') || '—'}${r.note ? ` · note: ${r.note}` : ''}`).join('\n') || '_none yet_') + '\n';
writeFileSync('docs/FEEDBACK_REPORT.md', md);
console.log(md.slice(0, 1500));
