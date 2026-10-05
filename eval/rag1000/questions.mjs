// The 1,000 questions of the RAG test (5 October 2026): the set of the 1,000-question map (eval/map1000/run_map.mjs —
// internal golden set, spoken queries, over-refusal set, sensitive questions, islam.stackexchange titles, Quranpedia
// index keywords) with 150 index keywords replaced by 150 everyday Arabic questions and requests
// (questions_ar_natural.json): the map had almost no natural Arabic question, which is exactly what the RAG answers.
import { readFileSync } from 'node:fs';

const R = (f) => new URL(`../../${f}`, import.meta.url);
const J = (f) => JSON.parse(readFileSync(R(f), 'utf8'));
const FR = /[àâçéèêëîïôûùüÿœ]|\b(sourate|verset|est[- ]ce|que dit|le coran|qu ?est|dois[- ]je|puis[- ]je|mon mari|ma femme|orphelins|le jugement)\b/i;

export async function buildQuestions() {
  const set = [], seen = new Set();
  const add = (q, fam, src, expect = null) => { q = String(q || '').trim(); const k = q.toLowerCase(); if (!q || seen.has(k) || set.length >= 1000) return; seen.add(k); set.push({ q, fam, src, expect }); };
  for (const g of readFileSync(R('eval/golden.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)) if (g.cat !== 'topic_fr' && !FR.test(g.q)) add(g.q, g.cat, 'golden', g.expect);
  for (const s of J('eval/spoken_queries.json').items) add(s.q, 'spoken_' + s.kind, 'spoken', s.core ? { keys: s.core } : null);
  for (const q of J('eval/overrefusal.json').questions) add(q, 'overrefusal', 'overrefusal', { notAbstain: true });
  const { SENSITIVE_QS } = await import('../sensitive_questions.mjs');
  for (const q of (SENSITIVE_QS || [])) add(q, 'sensitive', 'sensitive');
  for (const f of J('eval/forum_questions.json').questions.slice(0, 260)) add(f.q, 'forum_en', 'islam.stackexchange (titles, CC BY-SA)');
  const nat = J('eval/rag1000/questions_ar_natural.json').families;
  for (const [fam, qs] of Object.entries(nat)) for (const q of qs) add(q, fam, 'written for this test');
  const topics = J('public/data/qp_topics.json').items.filter(x => x[3] && x[3].length >= 2).map(x => String(x[1]).replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim()).filter(t => t && t.split(' ').length <= 3);
  const step = Math.max(1, Math.floor(topics.length / 400));
  for (let i = 0; set.length < 1000 && i < topics.length; i += step) add(topics[i], 'keyword_qp', 'Quranpedia index', { indexTopic: true });
  return set.map((x, i) => ({ id: i + 1, ...x }));
}

// the same checks as the map (known expectations only)
export function checkExpect(row) {
  const x = row.expect; if (!x) return null;
  const top = row.verses || [];
  const fails = [];
  if (x.type && row.type !== x.type && !(x.type === 'verse' && ['verse', 'range'].includes(row.type))) fails.push(`type ${row.type}≠${x.type}`);
  if (x.reason && row.reason !== x.reason) fails.push(`reason ${row.reason}≠${x.reason}`);
  if (x.verdict && row.verdict !== x.verdict) fails.push(`verdict ${row.verdict}≠${x.verdict}`);
  if (x.refs && !x.refs.every(r => top.slice(0, 5).includes(r) || (top[0] && row.type === 'range'))) fails.push(`refs missing ${x.refs.filter(r => !top.includes(r)).join(',')}`);
  if (x.keys && !x.keys.some(k => top.slice(0, 5).includes(k))) fails.push('no key verse in top 5');
  if (x.notAbstain && row.type === 'abstain') fails.push(`refused (${row.reason})`);
  if (x.indexTopic && !top.length && !['abstain', 'hadith'].includes(row.type)) fails.push('index topic gives nothing');
  return fails;
}
