// The whole answer pipeline of the page, run in Node for evaluations (same steps as app.js + search-worker.js):
// engine + AI selection → level/route → for a ruling: published fatwas (Arabic keywords from the AI for a
// non-Arabic question) → closed list → /api/answer composer + judge → fixed rules (rag.js).
// Keys from .dev.vars (never printed).
import { readFileSync } from 'node:fs';
import { loadEngine } from '../tests/load.mjs';
import { select, expand, pickRelevant } from '../functions/_lib/selector.js';
import { answer } from '../functions/_lib/answer.js';
import { fatwaSearch } from '../functions/_lib/fatwa.js';
import { buildClosedList, applyAnswer, questionTypeOf, forModels } from '../public/js/rag.js';

export const env = {};
for (const line of readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const { engine: E, core } = loadEngine();
E.addTopicIndex(JSON.parse(readFileSync(new URL('../public/data/qp_topics.json', import.meta.url), 'utf8')));
E.addLatinIndex(JSON.parse(readFileSync(new URL('../public/data/latin_index.json', import.meta.url), 'utf8')));
E.addBayenat(JSON.parse(readFileSync(new URL('../public/data/bayenat_index.json', import.meta.url), 'utf8')));
export const engine = E;
const KW = new Map();
const llm = {
  expand: async (p) => { const j = await expand(p, env); if (!j.ok) throw new Error('AI'); KW.set(p.query, j.keywords); return j; },
  select: async (p) => { const j = await select(p, env); if (!j.ok) throw new Error('AI'); return j; },
};
const HAD = {};
const hadIdx = (lang) => HAD[lang] || (HAD[lang] = JSON.parse(readFileSync(new URL(`../public/data/hadeeth/idx_${lang}.json`, import.meta.url), 'utf8')));
async function hadithsFor(q, lang) {
  const d = hadIdx(lang), words = q.split(/\s+/).filter(w => w.length > 2).map(w => w.replace(/^ال/, ''));
  const scored = d.doc.map((doc, i) => ({ i, s: words.filter(w => doc.includes(w)).length })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 10);
  if (!scored.length) return [];
  const keep = await pickRelevant(q, scored.map(x => d.doc[x.i].slice(0, 300)), env, { what: 'hadith', max: 3 }).catch(() => null);
  return (keep || []).map(k => d.ids[scored[k].i]).map(id => { const p = d.ids.indexOf(id); return { ...JSON.parse(readFileSync(new URL(`../public/data/hadeeth/${lang}/${Math.floor(p / d.chunk)}.json`, import.meta.url), 'utf8'))[p % d.chunk], lang }; })
    .filter(h => /صحيح|حسن|authentic|good|sahih|hasan/i.test(h.grade || '') && !/ضعيف|موضوع|منكر|weak|fabricated/i.test(h.grade || ''));
}

export async function runQuestion(q, { uiLang = 'ar' } = {}) {
  const t0 = Date.now();
  const r = await E.ask(q, { uiLang, llm });
  const L = r.lang === 'en' ? 'en' : 'ar';
  const qtype = questionTypeOf({ ...r, query: q });
  const row = { q, lang: L, qtype, type: r.type, reason: r.reason || null, level: r.level, pack: r.pack || null, sensitive: !!r.sensitive, polemic: !!r.polemic,
    confirmedBy: r.confirmedBy || null, route: r.meta && r.meta.route, verses: (r.verses || []).slice(0, 6).map(v => v.ref),
    contextPack: (r.answer || []).filter(a => a.kind === 'quote' && a.role === 'context').map(a => a.ref),
    notes: (r.answer || []).filter(a => a.kind === 'note').map(a => a.text.slice(0, 80)), bayenat: (r.bayenat || []).length };
  let list = [];
  if (qtype === 'ruling' && r.blood) row.blood = true;
  else if (qtype === 'ruling') {
    let kw = [];
    if (!/[؀-ۿ]/.test(q)) { if (!KW.has(q)) await llm.expand({ query: q, lang: L }).catch(() => null); kw = (((KW.get(q) || {}).fatwa || []).length ? KW.get(q).fatwa : ((KW.get(q) || {}).ar || [])).filter(w => /^[؀-ۿ\s_]+$/.test(w)).map(w => w.replace(/_/g, ' ')).slice(0, 4); row.kw = kw; }
    const s = await fatwaSearch(kw.length ? { q, kw } : { q }, env).catch(() => null);
    const full = s && s.ok ? (await Promise.all(s.items.slice(0, 3).map(x => fatwaSearch({ id: x.id }, env).catch(() => null)))).filter(f => f && f.ok) : [];
    row.fatwaTitles = full.map(f => f.title);
    list = buildClosedList({ fatwas: full.map(f => ({ id: f.id, title: f.title, question: f.question, answer: f.answer, url: f.url, mufti: f.mufti, source: f.source })), qtype });
  } else if (['topic', 'term'].includes(r.type) && (r.confirmedBy === 'ai' || (r.pack && r.pack !== 'crisis')) && qtype !== 'story' && !r.crisis) {
    const vs = r.verses.filter(v => v.ai), ord = vs.filter(v => !v.aiRelated).concat(vs.filter(v => v.aiRelated));
    const ctxIdx = new Set((r.answer || []).filter(a => a.kind === 'quote' && a.role === 'context').map(a => a.idx));
    const verses = r.verses.filter(v => ctxIdx.has(v.idx) && !v.ai).map(v => ({ ...v, ctx: true })).concat(ord).map(v => { const c = E.cardOf(L, v.idx, 'answer'); return c && { idx: v.idx, ref: E.ref(v.idx), direct: !v.aiRelated, ctx: !!v.ctx, verseText: core.verses[v.idx], text: c.text, source: c.source, sourceTitle: c.sourceTitle }; }).filter(Boolean);
    list = buildClosedList({ verses, hadiths: await hadithsFor(q, L), qtype });
  }
  if (list.length) {
    const out = await answer({ query: q, lang: L, qtype, sentences: forModels(list) }, env);
    const b = applyAnswer(list, out, q, qtype, { violence: !!(r.polemic || r.pack === 'violence'), balanced: list.some(x => x.ctx) });
    Object.assign(row, { answerable: b ? b.answerable : (out.ok ? 'no-judge' : 'error:' + out.error), judge: out.judge || null,
      points: b ? b.points.map(p => ({ concept: p.concept, items: p.items.map(x => ({ sid: x.sid, kind: x.kind, text: x.text })) })) : [],
      uncovered: b ? b.uncovered.map(u => u.concept) : [], dropped: b ? b.dropped : [] });
  }
  row.ms = Date.now() - t0;
  return row;
}
