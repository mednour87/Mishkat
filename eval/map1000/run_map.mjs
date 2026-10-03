// Map of 1,000 questions / keywords through Mishkat (phase A: the engine WITHOUT AI — free, complete,
// reproducible). Builds the tree language → family → route → answer type → level → who vouches, checks
// every known expectation, and detects weak points automatically. Phase B (AI on a sample, Groq free tier
// only) is eval/map1000/run_ai_sample.mjs.
//   node eval/map1000/run_map.mjs   → eval/map1000/map.json + eval/map1000/MAP_REPORT.md
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEngine } from '../../tests/load.mjs';

const R = (f) => new URL(`../../${f}`, import.meta.url);
const J = (f) => JSON.parse(readFileSync(R(f), 'utf8'));
const { engine: E } = loadEngine();
E.addTopicIndex(J('public/data/qp_topics.json'));
E.addLatinIndex(J('public/data/latin_index.json'));
E.addBayenat(J('public/data/bayenat_index.json'));

// ------------------------------------------------------------------ the 1,000 questions
const FR = /[àâçéèêëîïôûùüÿœ]|\b(sourate|verset|est[- ]ce|que dit|le coran|qu ?est)\b/i;
const set = [], seen = new Set();
const add = (q, fam, src, expect = null) => { q = String(q || '').trim(); const k = q.toLowerCase(); if (!q || seen.has(k) || set.length >= 1000) return; seen.add(k); set.push({ q, fam, src, expect }); };
for (const g of readFileSync(R('eval/golden.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)) if (g.cat !== 'topic_fr' && !FR.test(g.q)) add(g.q, g.cat, 'golden', g.expect);
for (const s of J('eval/spoken_queries.json').items) add(s.q, 'spoken_' + s.kind, 'spoken', s.core ? { keys: s.core } : null);
for (const q of J('eval/overrefusal.json').questions) add(q, 'overrefusal', 'overrefusal', { notAbstain: true });
const { SENSITIVE_QS } = await import('../sensitive_questions.mjs');
for (const q of (SENSITIVE_QS || [])) add(q, 'sensitive', 'sensitive');
for (const f of J('eval/forum_questions.json').questions.slice(0, 260)) add(f.q, 'forum_en', 'islam.stackexchange (titles, CC BY-SA)');
// Quranpedia subject index: topic names (bracket notes removed), short ones first, evenly spread → keywords
const topics = J('public/data/qp_topics.json').items.filter(x => x[3] && x[3].length >= 2).map(x => String(x[1]).replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim()).filter(t => t && t.split(' ').length <= 3);
const step = Math.max(1, Math.floor(topics.length / 400));
for (let i = 0; set.length < 1000 && i < topics.length; i += step) add(topics[i], 'keyword_qp', 'Quranpedia index', { indexTopic: true });

// ------------------------------------------------------------------ run
const rows = [];
for (const it of set) {
  const t0 = performance.now();
  let r;
  try { r = await E.ask(it.q, { uiLang: 'ar' }); } catch (e) { r = { type: 'error', error: String(e.message) }; }
  const ms = Math.round(performance.now() - t0);
  const vs = (r.verses || []).filter(v => !v.closestOnly).map(v => v.ref);
  rows.push({ ...it, lang: /[؀-ۿ]/.test(it.q) ? 'ar' : 'en', route: (r.meta && r.meta.route) || r.type, type: r.type, reason: r.reason || null, verdict: r.verdict || null,
    level: r.level || null, by: r.confirmedBy || null, pack: r.pack || null, sensitive: !!r.sensitive, crisis: !!r.crisis, blood: !!r.blood,
    n: vs.length, top: vs.slice(0, 5), suggest: (r.suggest || []).map(s => s.q || s.word), corrected: r.correctedFrom || null, term: r.term ? r.term.ar : null, ms });
}

// ------------------------------------------------------------------ expectations
const check = (row) => {
  const x = row.expect; if (!x) return null;
  const fails = [];
  if (x.type && row.type !== x.type && !(x.type === 'verse' && ['verse', 'range'].includes(row.type))) fails.push(`type ${row.type}≠${x.type}`);
  if (x.reason && row.reason !== x.reason) fails.push(`reason ${row.reason}≠${x.reason}`);
  if (x.verdict && row.verdict !== x.verdict) fails.push(`verdict ${row.verdict}≠${x.verdict}`);
  if (x.refs && !x.refs.every(r => row.top.includes(r) || (row.top[0] && row.type === 'range'))) fails.push(`refs missing ${x.refs.filter(r => !row.top.includes(r)).join(',')}`);
  if (x.keys && !x.keys.some(k => row.top.includes(k))) fails.push('no key verse in top 5');
  if (x.notAbstain && row.type === 'abstain') fails.push(`refused (${row.reason})`);
  if (x.indexTopic && (row.n === 0)) fails.push('index topic gives nothing');
  return fails;
};
for (const r of rows) { const f = check(r); r.ok = f ? f.length === 0 : null; r.fails = f || []; }

// ------------------------------------------------------------------ tree
const tree = {};
const bump = (path) => { let n = tree; for (const k of path) { n[k] = n[k] || { _n: 0 }; n[k]._n++; n = n[k]; } };
for (const r of rows) bump([r.lang, r.fam.replace(/[-_]\d+$/, ''), r.route, r.type + (r.reason ? '/' + r.reason : ''), 'level ' + (r.level || '—'), 'by ' + (r.by || 'nobody')]);

// ------------------------------------------------------------------ weak points
const W = [];
const weak = (id, title, list, advice) => W.push({ id, title, count: list.length, examples: list.slice(0, 15).map(r => ({ q: r.q, fam: r.fam, type: r.type, reason: r.reason, by: r.by, top: r.top, n: r.n, fails: r.fails, suggest: r.suggest })), advice });
weak('W1', 'Known expectation not met (internal set, spoken set, over-refusal, index topics)', rows.filter(r => r.ok === false), 'Read each case; fix routing or ranking; add the case to the tests.');
weak('W2', 'No verse at all (notfound/empty) for a question that is not a ruling, a personal case or out of scope', rows.filter(r => ['notfound', 'empty'].includes(r.type)), 'Without AI the engine abstains often: check if these are truly unanswerable, else improve lexical recall (roots/lemmas, thesaurus).');
weak('W3', 'Answer vouched by nobody (keyword match only, no AI, no index, no pack) with many verses', rows.filter(r => r.type === 'topic' && !r.by && r.n >= 6), 'These rely on the AI in production; without AI they are shown as «keyword search». Candidates for index/thesaurus entries.');
weak('W4', 'Spelling suggestion on a question that is probably valid', rows.filter(r => r.suggest.length && r.n > 0), 'Check each suggestion; raise the threshold or add the word to the known vocabulary.');
weak('W5', 'English question with no verse', rows.filter(r => r.lang === 'en' && r.n === 0 && !['abstain', 'hadith', 'invalid_ref'].includes(r.type)), 'English recall without AI is weak: English thesaurus, translation-based BM25, dense search on the client.');
weak('W6', 'Refusal (abstain) of a question that may be legitimate', rows.filter(r => r.type === 'abstain' && ['forum_en', 'keyword_qp', 'overrefusal', 'spoken_topic'].includes(r.fam)), 'Over-refusal: check the guard patterns.');
weak('W7', 'Glossary route («term») used', rows.filter(r => r.type === 'term'), 'Check the term is really what is asked.');
weak('W8', 'Slow (> 400 ms, engine only)', rows.filter(r => r.ms > 400), 'Profile; precompute.');
weak('W9', 'Sensitive subject not flagged (level C/D) — words of penalties, fighting, women, other religions', rows.filter(r => /(حد|حدود|رجم|جلد|قصاص|قتال|قتل|جهاد|يهود|نصارى|كفار|مرتد|ردة|ضرب|طلاق|ميراث|تعدد|kill|jihad|jews|christians|apostas|stoning|lash|beat|polygam|inherit)/i.test(r.q) && !['C', 'D'].includes(r.level) && r.type !== 'verse'), 'Decide case by case whether the level must be C.');

const by = (f) => rows.reduce((m, r) => (m[f(r)] = (m[f(r)] || 0) + 1, m), {});
const summary = { questions: rows.length, byFamily: by(r => r.fam.replace(/[-_]\d+$/, '')), byLang: by(r => r.lang), byType: by(r => r.type + (r.reason ? '/' + r.reason : '')), byLevel: by(r => r.level || '—'), byVouch: by(r => r.by || 'nobody'),
  expectations: { checked: rows.filter(r => r.ok !== null).length, met: rows.filter(r => r.ok === true).length }, medianMs: rows.map(r => r.ms).sort((a, b) => a - b)[Math.floor(rows.length / 2)] };
writeFileSync(new URL('./map.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), mode: 'engine without AI', summary, tree, weak: W, rows }, null, 1));

// ------------------------------------------------------------------ report
const md = [`# Map of 1,000 questions through Mishkat (engine without AI)`, '', `${new Date().toISOString()} · phase A: deterministic engine, no AI call, no cost. Phase B (AI sample, Groq free tier) in \`AI_SAMPLE.md\`.`, '',
  '## Summary', '', '```json', JSON.stringify(summary, null, 1), '```', '', '## Tree (language → family → route → answer → level → who vouches)', '', '```'];
const draw = (n, d) => { for (const [k, v] of Object.entries(n).filter(([k]) => k !== '_n').sort((a, b) => b[1]._n - a[1]._n)) { md.push(`${'  '.repeat(d)}${k} (${v._n})`); draw(v, d + 1); } };
draw(tree, 0);
md.push('```', '', '## Weak points', '');
for (const w of W) {
  md.push(`### ${w.id} — ${w.title}: ${w.count}`, '', `*${w.advice}*`, '');
  for (const e of w.examples) md.push(`- \`${e.fam}\` «${e.q}» → ${e.type}${e.reason ? '/' + e.reason : ''} · by ${e.by || '—'} · ${e.n} verses ${e.top.join(' ')}${e.fails.length ? ' · **' + e.fails.join('; ') + '**' : ''}${e.suggest.length ? ' · suggests ' + e.suggest.join('، ') : ''}`);
  md.push('');
}
writeFileSync(new URL('./MAP_REPORT.md', import.meta.url), md.join('\n'));
console.log(JSON.stringify(summary, null, 1));
console.log(W.map(w => `${w.id} ${w.count} — ${w.title}`).join('\n'));
