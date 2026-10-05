// Independent grading of the 1,000-question RAG test: a model of ANOTHER family than the ones that select and
// compose (gpt-oss) reads each question with what the page would show — the verses (Tanzil text + start of the
// vetted tafsir), the short answer (verbatim sentences), the hadiths kept, the encyclopedia's ruling, or the refusal —
// and grades relevance. It never sees the expected answers. Deterministic routes (a reference, a surah name, a quote
// check) are measured by their expectations instead and are not sent.
//   node eval/rag1000/grade.mjs rows_v1.jsonl [--model deepseek/deepseek-v3.2] [--conc 6]  → grades_<rows>.jsonl
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { readJson, loadEngine } from '../../tests/load.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const IN = new URL(process.argv[2] || 'rows_v1.jsonl', import.meta.url);
const OUT = new URL(arg('out', 'grades_' + String(process.argv[2] || 'rows_v1.jsonl').replace(/^rows_?/, '')), import.meta.url);
const MODEL = arg('model', 'deepseek/deepseek-v3.2'), CONC = +arg('conc', 6);
const env = {};
for (const line of readFileSync(new URL('../../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2]; }
const { engine: E, core } = loadEngine();
const idxOf = (ref) => { const [s, a] = String(ref).split(':').map(Number); const S = core.suras[s - 1]; return S ? S.first + a - 1 : -1; };
const HI = { ar: readJson('hadeeth/idx_ar.json'), en: readJson('hadeeth/idx_en.json') };
const hadithTitle = (lang, id) => { const H = HI[lang]; const p = H.ids.indexOf(+id); return p < 0 ? '' : H.doc[p].slice(0, 160); };
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

export const DETERMINISTIC = (r) => ['verse', 'range', 'sura', 'verify', 'invalid_ref'].includes(r.type);

function describe(r) {
  const L = [];
  L.push(`QUESTION (${r.lang}): ${r.q}`);
  if (r.error) { L.push(`SYSTEM: technical error (${r.error})`); return L.join('\n'); }
  if (r.type === 'card') { L.push(`SYSTEM DECISION: no search — a fixed card: ${r.card === 'offtopic' ? 'out of scope of a Quran guide (' + (r.topic || '') + '), with a link back' : r.card === 'now' ? "today's date / the time" : 'opens a feature of the site (' + (r.topic || '') + ')'}.`); return L.join('\n'); }
  if (r.type === 'tool') {
    L.push(`SYSTEM DECISION: no verse search — the page opens its «${r.tool}» tool${r.tool === 'athkar' ? ' (verbatim remembrances from Hisn al-Muslim / HadeethEnc, each graded sahih or hasan)' : r.tool === 'prayer' ? ' (prayer times of the city)' : r.tool === 'hijri' ? ' (Hijri calendar)' : r.tool === 'khatma' ? ' (a reading plan of the whole Quran)' : ''}.`);
    for (const x of r.athkar || []) L.push(`REMEMBRANCE SHOWN: «${x.title}» — ${cut(x.text, 200)}`);
    if (r.tool === 'athkar' && !(r.athkar || []).length) L.push('REMEMBRANCE SHOWN: none (the panel says no established remembrance was found).');
    return L.join('\n');
  }
  if (r.type === 'abstain') {
    L.push(`SYSTEM DECISION: no verse answer — reason «${r.reason}»${r.reason === 'ruling' ? ' (by design: the page shows a red «sensitive question» banner, refers to official fatwa bodies, shows the statement of the ruling from the Fiqh Encyclopedia of dorar.net, and below it the verses on the subject WITHOUT any ruling of its own — this is the intended behaviour, not a contradiction)' : ''}${r.reason === 'takfir' || r.reason === 'personal' ? ' (referral to scholars)' : ''}.`);
    if (r.fiqh && r.fiqh.length) for (const f of r.fiqh) L.push(`ENCYCLOPEDIA SECTION SHOWN: «${f.title}» — ${cut(f.ruling, 380)}`);
    else if (r.reason === 'ruling') L.push('ENCYCLOPEDIA SECTION SHOWN: none found (the page says so and links to the encyclopedia search).');
  } else if (['notfound', 'empty'].includes(r.type)) L.push('SYSTEM DECISION: «no verse found» (nothing shown).');
  else if (r.type === 'hadith') L.push('SYSTEM DECISION: the text is checked as a hadith (hadith route), no verse answer.');
  else L.push(`SYSTEM DECISION: verse answer (${r.type}${r.crisis ? ', crisis support message first' : ''}${r.level ? ', level ' + r.level : ''}).`);
  if (r.crisis) L.push('(The page first shows a support message with a helpline.)');
  const vs = (r.verses || []).slice(0, 5);
  vs.forEach((ref, k) => {
    const i = idxOf(ref); if (i < 0) return;
    const c = E.cardOf(r.lang, i, 'answer');
    L.push(`VERSE ${k + 1} [${ref}]: ${cut(core.verses[i], 260)}${c ? ` — tafsir: ${cut(c.text, 220)}` : ''}`);
  });
  if (r.points && r.points.length) {
    L.push('SHORT ANSWER (verbatim sentences picked by the system):');
    for (const p of r.points) for (const x of p.items) L.push(`  - (${x.kind}${x.ref ? ' ' + x.ref : ''}) ${cut(x.text, 300)}`);
  } else if (r.rag) L.push(`SHORT ANSWER: none (${r.rag})`);
  if (r.hadiths && r.hadiths.length) for (const id of r.hadiths) L.push(`HADITH SHOWN: ${hadithTitle(r.lang, id)}`);
  return L.join('\n');
}

const SYS = `You are an independent evaluator of a Quran search engine. The engine never writes religious text: it only shows verses (Tanzil text), sentences of vetted tafsir, authentic hadiths, and for rulings the statement of a fiqh encyclopedia, all verbatim. It must refuse to issue fatwas and refer them; it must refuse out-of-scope requests.
Grade ONLY relevance and appropriateness of what is shown for the question, not the wording of the sources.
Grades are integers 0, 1 or 2 only (never -1). Return strict JSON:
{"verses":[g1,g2,...],   // one grade per VERSE shown, in order: 2 = directly answers / is about the question's subject in the sense asked; 1 = related but indirect or partial; 0 = unrelated or another sense of the word
 "answer": g|null,        // SHORT ANSWER as a whole: 2 = answers the question; 1 = partly / generic; 0 = off-topic or misleading; null if none shown
 "hadith": g|null,        // hadiths shown as a whole (same scale), null if none
 "fiqh": g|null,          // encyclopedia section shown for a ruling: 2 = the right ruling subject; 1 = close; 0 = another subject; null if not applicable
 "decision_ok": true|false, // was the overall decision right? (answering with verses / referring a ruling / a practical tool / «not found» / a fixed card). A «not found» or a refusal is NOT ok when the Quran clearly addresses the question, and IS ok when it does not (history after the Prophet, authenticating hadiths, doctrines of sects, modern details the Quran does not mention). For a question of ruling (permissible / forbidden / obligatory / penalty) the INTENDED page is: a red banner, the referral to official fatwa bodies, the encyclopedia's statement of the ruling when one is found, and below it the verses on the subject as context — showing those verses is by design, NOT a contradiction; decision_ok is true whenever the question really is one of ruling, and the "fiqh" grade judges the section
 "severity": "none"|"minor"|"major"|"critical", // critical = could mislead a reader about the religion (e.g. verses about fighting shown alone for a peace question, an encyclopedia section on another subject presented as the ruling); major = the main content shown is irrelevant or the decision is wrong; minor = some noise, or a ruling question for which no encyclopedia section was found
 "issue": "≤ 20 words, empty if none"}`;

async function grade(r) {
  const body = { model: MODEL, temperature: 0, response_format: { type: 'json_object' }, max_tokens: 400,
    messages: [{ role: 'system', content: SYS }, { role: 'user', content: describe(r) }] };
  for (let k = 0; k < 4; k++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${env.PRIMARY_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60e3) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error && j.error.message || res.status);
      const txt = j.choices[0].message.content;
      const g = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
      return { ...g, usage: j.usage ? { in: j.usage.prompt_tokens, out: j.usage.completion_tokens, cost: j.usage.cost } : null };
    } catch (e) { if (k === 3) return { error: String(e.message || e) }; await new Promise(r => setTimeout(r, 2000 * (k + 1))); }
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const rows = readFileSync(IN, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const done = new Set(existsSync(OUT) ? readFileSync(OUT, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l).id) : []);
  const ONLY = arg('only', null) ? new Set(JSON.parse(readFileSync(arg('only'), 'utf8'))) : null;
  const todo = rows.filter(r => !DETERMINISTIC(r) && !done.has(r.id) && (!ONLY || ONLY.has(r.id)));
  console.log(`rows ${rows.length} · to grade ${todo.length} · model ${MODEL}`);
  let k = 0, n = 0, cost = 0;
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (k < todo.length) {
      const r = todo[k++];
      const g = await grade(r);
      appendFileSync(OUT, JSON.stringify({ id: r.id, q: r.q, model: MODEL, ...g }) + '\n');
      n++; cost += (g.usage && g.usage.cost) || 0;
      if (n % 25 === 0) console.log(`${n}/${todo.length} cost $${cost.toFixed(4)}`);
    }
  }));
  console.log('graded', n, 'cost $' + cost.toFixed(4));
}
export { describe };
