// User test (protocol §2): task success and SUS score, from usertest.csv (one row per tester, anonymous).
//   node eval/human/score_usertest.mjs [usertest.csv]   → usertest_results.json + a summary on stdout
// Columns: tester, profile, lang, device, t1..t5 (yes/partly/no), t1_s..t5_s (seconds), sus1..sus10 (1–5), remark
// SUS: odd items (score − 1), even items (5 − score), sum × 2.5 → 0–100 (68 = average usability).
// Mean SUS with a 95 % bootstrap CI (2,000 samples, seed 42) — with 5–8 testers the interval is wide: report it.
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2] || new URL('usertest.csv', import.meta.url);
const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
const lines = text.split(/\r?\n/).filter(l => l.trim());
const split = (l) => l.split(/[;,](?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
const head = split(lines[0]);
const rows = lines.slice(1).map(split).map(r => Object.fromEntries(head.map((h, k) => [h, r[k] ?? ''])))
  .filter(r => r.sus1 !== '' && r.sus1 != null);
if (!rows.length) { console.log('usertest.csv has no filled row yet (fill one row per tester, then run again)'); process.exit(0); }

const sus = (r) => {
  let s = 0;
  for (let k = 1; k <= 10; k++) {
    const v = +r['sus' + k];
    if (!(v >= 1 && v <= 5)) throw new Error(`tester ${r.tester}: sus${k} must be 1–5`);
    s += k % 2 ? v - 1 : 5 - v;
  }
  return s * 2.5;
};
const scores = rows.map(sus);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
let seed = 42; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const boots = [];
for (let b = 0; b < 2000; b++) boots.push(mean(scores.map(() => scores[Math.floor(rnd() * scores.length)])));
boots.sort((a, b) => a - b);
const tasks = {};
for (let t = 1; t <= 5; t++) {
  const vals = rows.map(r => String(r['t' + t]).toLowerCase()).filter(Boolean);
  const secs = rows.map(r => +r[`t${t}_s`]).filter(x => x > 0).sort((a, b) => a - b);
  tasks['task' + t] = { yes: vals.filter(v => v === 'yes').length, partly: vals.filter(v => v === 'partly').length, no: vals.filter(v => v === 'no').length,
    medianSeconds: secs.length ? secs[Math.floor(secs.length / 2)] : null };
}
const out = { testers: rows.length, sus: { mean: +mean(scores).toFixed(1), ci95: [+boots[49].toFixed(1), +boots[1949].toFixed(1)], min: Math.min(...scores), max: Math.max(...scores), each: scores },
  tasks, remarks: rows.map(r => r.remark).filter(Boolean) };
writeFileSync(new URL('usertest_results.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`testers ${out.testers} · SUS ${out.sus.mean} [95 % CI ${out.sus.ci95.join('–')}], range ${out.sus.min}–${out.sus.max}`);
for (const [k, v] of Object.entries(tasks)) console.log(k, `yes ${v.yes} · partly ${v.partly} · no ${v.no} · median ${v.medianSeconds ?? '—'} s`);
