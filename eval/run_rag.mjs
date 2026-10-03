// Live check of the extractive short answer (plan v5, lot B) on hard questions: same path as the search
// worker (public/js/search-worker.js ragFor): engine + AI selection, closed list from the sources of truth
// (verse text, tafsir, hadiths kept by the AI; for a ruling question only fatwas published by Ibn Baz),
// composer + judge (/api/answer), fixed rules (rag.js). Keys from .dev.vars, never printed.
//   node eval/run_rag.mjs [question …]   → eval/results/rag_live.json + a table on stdout
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEngine } from '../tests/load.mjs';
import { select, expand, pickRelevant } from '../functions/_lib/selector.js';
import { answer } from '../functions/_lib/answer.js';
import { fatwaSearch } from '../functions/_lib/fatwa.js';
import { buildClosedList, applyAnswer, questionTypeOf } from '../public/js/rag.js';

const env = {};
for (const line of readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const { engine: E, core } = loadEngine();
E.addTopicIndex(JSON.parse(readFileSync(new URL('../public/data/qp_topics.json', import.meta.url), 'utf8')));
E.addLatinIndex(JSON.parse(readFileSync(new URL('../public/data/latin_index.json', import.meta.url), 'utf8')));
const wrap = (f) => async (p) => { const j = await f(p, env); if (!j.ok) throw new Error('AI'); return j; };
const llm = { expand: wrap(expand), select: wrap(select) };

// hadiths: HadeethEnc index (same files as the worker), BM25 on the query words, AI filter on a closed list
const HAD = {};
function hadIdx(lang) {
  if (HAD[lang]) return HAD[lang];
  const d = JSON.parse(readFileSync(new URL(`../public/data/hadeeth/idx_${lang}.json`, import.meta.url), 'utf8'));
  return (HAD[lang] = d);
}
async function hadithsFor(q, lang) {
  const d = hadIdx(lang), words = q.split(/\s+/).filter(w => w.length > 2);
  const scored = d.doc.map((doc, i) => ({ i, s: words.filter(w => doc.includes(w.replace(/^ال/, ''))).length })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 10);
  if (!scored.length) return [];
  const keep = await pickRelevant(q, scored.map(x => d.doc[x.i].slice(0, 300)), env, { what: 'hadith', max: 3 }).catch(() => null);
  const ids = (keep || []).map(k => d.ids[scored[k].i]);
  return ids.map(id => { const p = d.ids.indexOf(id); const rec = JSON.parse(readFileSync(new URL(`../public/data/hadeeth/${lang}/${Math.floor(p / d.chunk)}.json`, import.meta.url), 'utf8'))[p % d.chunk]; return { ...rec, lang }; })
    .filter(h => /صحيح|حسن|authentic|good|sahih|hasan/i.test(h.grade || '') && !/ضعيف|موضوع|منكر|weak|fabricated/i.test(h.grade || ''));
}

const QS = process.argv.slice(2).length ? process.argv.slice(2) : [
  'الصبر والشكر', 'الحجاب', 'how to deal with anxiety', 'ماذا أفعل إذا شعرت بالحزن', 'ما عقوبة الزنا', 'بر الوالدين',
  'patience and gratitude', 'فضل الصدقة', 'كيف أتوب إلى الله', 'لماذا خلق الله الإنسان', 'ما هي التقوى', 'الخوف من الله',
  'الموسيقى حرام', 'ما حكم التدخين', 'هل يجوز الاحتفال بالمولد النبوي', 'ما حكم صلاة الجماعة', 'is music haram',
];
const rows = [];
for (const q of QS) {
  const t0 = Date.now();
  const r = await E.ask(q, { uiLang: 'ar', llm });
  const qtype = questionTypeOf({ ...r, query: q });
  const L = r.lang === 'en' ? 'en' : 'ar';
  const row = { q, qtype, type: r.type, reason: r.reason, confirmedBy: r.confirmedBy, verses: (r.verses || []).slice(0, 6).map(v => v.ref) };
  let list = [];
  if (qtype === 'ruling') {
    if (L === 'ar') {
      const s = await fatwaSearch({ q }, env).catch(() => null);
      const full = s && s.ok ? (await Promise.all(s.items.slice(0, 3).map(x => fatwaSearch({ id: x.id }, env).catch(() => null)))).filter(f => f && f.ok) : [];
      list = buildClosedList({ fatwas: full.map(f => ({ id: f.id, title: f.title, question: f.question, answer: f.answer, url: f.url, mufti: f.mufti, source: f.source })), qtype });
      row.fatwas = full.map(f => f.title);
    }
  } else if (r.confirmedBy === 'ai' && !/^(قصة|قصه)\s|\bstory of\b/i.test(q)) {
    const vs = r.verses.filter(v => v.ai), ord = vs.filter(v => !v.aiRelated).concat(vs.filter(v => v.aiRelated));
    const verses = ord.map(v => { const c = E.cardOf(L, v.idx, 'answer'); return c && { idx: v.idx, ref: E.ref(v.idx), direct: !v.aiRelated, verseText: core.verses[v.idx], text: c.text, source: c.source, sourceTitle: c.sourceTitle }; }).filter(Boolean);
    list = buildClosedList({ verses, hadiths: await hadithsFor(q, L), qtype });
  }
  if (list.length) {
    const out = await answer({ query: q, lang: L, qtype, sentences: list.map(s => ({ sid: s.sid, text: s.text })) }, env);
    const b = applyAnswer(list, out, q, qtype);
    Object.assign(row, { ms: Date.now() - t0, listSize: list.length, answerable: b ? b.answerable : (out.ok ? 'no-judge' : 'error:' + out.error), model: out.model, judge: out.judge,
      points: b ? b.points.map(p => ({ concept: p.concept, shown: p.shown, items: p.items.map(x => ({ sid: x.sid, kind: x.kind, text: x.text })) })) : [],
      uncovered: b ? b.uncovered : [], dropped: b ? b.dropped : [] });
  }
  rows.push(row);
  console.log(`${q} [${qtype}] | ${row.answerable || '-'} | ${(row.points || []).map(p => `${p.concept}: ${p.items.map(x => x.sid).join(',')}`).join(' ; ')} | dropped ${(row.dropped || []).map(d => d.sid + ':' + d.rule).join(',')} | ${row.ms || ''} ms`);
  await new Promise(res => setTimeout(res, 1200));
}
writeFileSync(new URL('./results/rag_live.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), rows }, null, 1));
