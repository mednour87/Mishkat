// Scores the filled blind rating sheet(s): unblinds with rating_key.json, then per system the mean relevance,
// the share of answers with a religious error, preferences — with 95 % bootstrap CIs (2,000, seed 42).
// With two sheets (two raters), also Cohen's κ on «religious error» and on relevance.
//   node eval/human/score_sheet.mjs rater1.csv [rater2.csv]   → results.json + a table on stdout
import { readFileSync, writeFileSync } from 'node:fs';

const here = (f) => new URL(f, import.meta.url);
const key = JSON.parse(readFileSync(here('rating_key.json'), 'utf8'));
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === ',' || c === ';') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function read(file) {
  const [head, ...rows] = parseCsv(readFileSync(file, 'utf8'));
  const col = (name) => head.findIndex(h => h.startsWith(name));
  const out = [];
  for (const r of rows) {
    const n = +r[0], k = key.find(x => x.row === n);
    if (!k) continue;
    const g = (name) => r[col(name)] === '' || r[col(name)] == null ? null : r[col(name)].trim();
    const sys = { A: k.A, B: k.B };
    const one = (s) => ({ rel: g(`${s} relevance`) == null ? null : +g(`${s} relevance`), err: g(`${s} religious error`) == null ? null : +g(`${s} religious error`) });
    const pref = (g('preferred') || '').toUpperCase();
    out.push({ row: n, [sys.A]: one('A'), [sys.B]: one('B'), pref: pref === '=' ? '=' : pref === 'A' ? sys.A : pref === 'B' ? sys.B : null });
  }
  return out;
}
let seed = 42; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
function ci(vals) {
  const v = vals.filter(x => x != null && !Number.isNaN(x)); if (!v.length) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length, bs = [];
  for (let b = 0; b < 2000; b++) { let s = 0; for (let i = 0; i < v.length; i++) s += v[Math.floor(rnd() * v.length)]; bs.push(s / v.length); }
  bs.sort((a, b) => a - b);
  return { n: v.length, mean: +mean.toFixed(3), ci95: [+bs[49].toFixed(3), +bs[1949].toFixed(3)] };
}
function kappa(a, b) {
  const pairs = a.map((x, i) => [x, b[i]]).filter(([x, y]) => x != null && y != null);
  if (!pairs.length) return null;
  const cats = [...new Set(pairs.flat())], n = pairs.length;
  const po = pairs.filter(([x, y]) => x === y).length / n;
  const pe = cats.reduce((s, c) => s + (pairs.filter(([x]) => x === c).length / n) * (pairs.filter(([, y]) => y === c).length / n), 0);
  return pe === 1 ? 1 : +((po - pe) / (1 - pe)).toFixed(3);
}
const files = process.argv.slice(2);
if (!files.length) { console.log('usage: node eval/human/score_sheet.mjs rater1.csv [rater2.csv]'); process.exit(1); }
const R = files.map(read), base = R[0];
const res = { raters: files.length, rows: base.length, systems: {} };
for (const s of ['mishkat', 'chatbot']) {
  res.systems[s] = { relevance: ci(base.map(r => r[s].rel)), religiousErrorRate: ci(base.map(r => r[s].err)) };
}
res.preferred = { mishkat: base.filter(r => r.pref === 'mishkat').length, chatbot: base.filter(r => r.pref === 'chatbot').length, equal: base.filter(r => r.pref === '=').length };
if (R.length > 1) res.kappa = { religiousError: kappa(R[0].flatMap(r => [r.mishkat.err, r.chatbot.err]), R[1].flatMap(r => [r.mishkat.err, r.chatbot.err])),
  relevance: kappa(R[0].flatMap(r => [r.mishkat.rel, r.chatbot.rel]), R[1].flatMap(r => [r.mishkat.rel, r.chatbot.rel])) };
writeFileSync(here('results.json'), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
