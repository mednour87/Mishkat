// Live check of the extractive short answer (plan v5, lot B) on hard questions of the 2026-10-03 audit.
// Runs the engine with the real AI (keys from .dev.vars, never printed), then the composer + judge on the
// closed list of tafsir sentences of the AI-selected verses, exactly as the search worker does.
//   node eval/run_rag.mjs [question …]     → eval/results/rag_live.json + a table on stdout
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEngine } from '../tests/load.mjs';
import { select, expand } from '../functions/_lib/selector.js';
import { answer } from '../functions/_lib/answer.js';
import { buildClosedList, applyAnswer } from '../public/js/rag.js';

const env = {};
for (const line of readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const { engine: E } = loadEngine();
E.addTopicIndex(JSON.parse(readFileSync(new URL('../public/data/qp_topics.json', import.meta.url), 'utf8')));
const wrap = (f) => async (p) => { const j = await f(p, env); if (!j.ok) throw new Error('AI'); return j; };
const llm = { expand: wrap(expand), select: wrap(select) };

const QS = process.argv.slice(2).length ? process.argv.slice(2) : [
  'الصبر والشكر', 'الحجاب', 'how to deal with anxiety', 'ماذا أفعل إذا شعرت بالحزن', 'ما عقوبة الزنا', 'بر الوالدين',
  'patience and gratitude', 'what does the quran say about orphans', 'فضل الصدقة', 'التوبة', 'الجار', 'قصة يوسف',
];
const rows = [];
for (const q of QS) {
  const r = await E.ask(q, { uiLang: 'ar', llm });
  const row = { q, type: r.type, confirmedBy: r.confirmedBy, verses: r.verses.slice(0, 6).map(v => v.ref) };
  if (r.confirmedBy === 'ai') {
    const lang = r.lang === 'en' ? 'en' : 'ar';
    const vs = r.verses.filter(v => v.ai), ord = vs.filter(v => !v.aiRelated).concat(vs.filter(v => v.aiRelated));
    const list = buildClosedList({ verses: ord.map(v => { const c = E.cardOf(lang, v.idx, 'answer'); return c && { idx: v.idx, ref: E.ref(v.idx), text: c.text, source: c.source, sourceTitle: c.sourceTitle }; }).filter(Boolean) });
    const t0 = Date.now();
    const out = await answer({ query: q, lang, sentences: list.map(s => ({ sid: s.sid, text: s.text })) }, env);
    const b = applyAnswer(list, out, q);
    Object.assign(row, { ms: Date.now() - t0, listSize: list.length, answerable: b ? b.answerable : 'error', model: out.model, judge: out.judge,
      points: b ? b.points.map(p => ({ concept: p.concept, shown: p.shown, refs: p.items.map(x => x.ref), texts: p.items.map(x => x.text) })) : [],
      uncovered: b ? b.uncovered : [], old: r.brief ? r.brief.items.map(x => x.ref) : [] });
  }
  rows.push(row);
  console.log(`${q} | ${row.confirmedBy} | ${row.answerable || '-'} | ${(row.points || []).map(p => `${p.concept}:${p.refs.join(',')}`).join(' ; ')} | uncovered: ${(row.uncovered || []).map(u => u.concept).join(',')} | old brief: ${(row.old || []).join(',')} | ${row.ms || ''} ms`);
  await new Promise(res => setTimeout(res, 1500));
}
writeFileSync(new URL('./results/rag_live.json', import.meta.url), JSON.stringify({ date: new Date().toISOString(), rows }, null, 1));
