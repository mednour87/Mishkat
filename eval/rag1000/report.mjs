// Report of the 1,000-question RAG test: routes, faithfulness (verbatim), known expectations, and the independent
// relevance grades (grade.mjs). Bootstrap 95 % intervals (2,000 resamples, seed 42) for the main rates.
//   node eval/rag1000/report.mjs v1 [v2]   → REPORT_v1.md (or a comparison REPORT_v1_v2.md) + summary_<v>.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const load = (f) => existsSync(new URL(f, import.meta.url)) ? readFileSync(new URL(f, import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse) : [];
const DET = (r) => ['verse', 'range', 'sura', 'verify', 'invalid_ref'].includes(r.type);
const safe = (t) => t.replace(/:/g, '-');
const famGroup = (f) => f.startsWith('ar_') ? 'ar_natural' : f.replace(/[-_]\d+$/, '').replace(/^(route|verify|safety|spoken)_.*/, '$1');

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function ci(values, B = 2000) {             // percentile bootstrap of a mean (values 0/1 or numbers)
  if (!values.length) return [null, null, null];
  const r = rng(42), n = values.length, m = values.reduce((a, b) => a + b, 0) / n, ms = [];
  for (let b = 0; b < B; b++) { let s = 0; for (let k = 0; k < n; k++) s += values[Math.floor(r() * n)]; ms.push(s / n); }
  ms.sort((a, b) => a - b);
  return [m, ms[Math.floor(0.025 * B)], ms[Math.floor(0.975 * B)]];
}
const pct = (x) => x == null ? '—' : (100 * x).toFixed(1) + ' %';
const fmt = ([m, lo, hi]) => m == null ? '—' : `${pct(m)} [${pct(lo)}–${pct(hi)}]`;
const g0 = (v) => Math.max(0, Math.min(2, Number.isFinite(+v) ? +v : 0));

export function summarize(tag) {
  const [rt, gt] = tag.split(':');               // «v1:v1j2» = rows of v1 graded in grades_v1j2.jsonl
  const rows = load(`rows_${rt}.jsonl`), grades = new Map(load(`grades_${gt || rt}.jsonl`).filter(g => !g.error).map(g => [g.id, g]));
  const S = { tag, questions: rows.length, errors: rows.filter(r => r.error).length };
  S.byType = rows.reduce((m, r) => (m[r.type + (r.reason ? '/' + r.reason : '')] = (m[r.type + (r.reason ? '/' + r.reason : '')] || 0) + 1, m), {});
  // faithfulness: every quoted passage found verbatim in its source file
  const quoted = rows.flatMap(r => (r.points || []).flatMap(p => p.items));
  S.verbatim = { passages: quoted.length, notFound: rows.reduce((s, r) => s + (r.verbatimBad || []).length, 0) };
  S.briefs = { shown: rows.filter(r => r.rag === 'shown').length, attempted: rows.filter(r => r.rag && !['not-wanted', 'story', 'crisis'].includes(r.rag)).length };
  // expectations
  const ex = rows.filter(r => r.expectOk !== null && r.expectOk !== undefined);
  S.expect = { checked: ex.length, met: ex.filter(r => r.expectOk).length, ci: ci(ex.map(r => r.expectOk ? 1 : 0)) };
  // AI health
  S.ai = { used: rows.filter(r => r.llm && r.llm.used).length, errors: rows.filter(r => r.llm && r.llm.error).length, dense: rows.filter(r => r.dense > 0).length };
  // relevance (graded rows)
  const G = rows.filter(r => grades.has(r.id)).map(r => ({ r, g: grades.get(r.id) }));
  const withV = G.filter(x => Array.isArray(x.g.verses) && x.g.verses.length && (x.r.verses || []).length);
  const p1 = withV.map(x => g0(x.g.verses[0]) === 2 ? 1 : 0);
  const p1any = withV.map(x => g0(x.g.verses[0]) >= 1 ? 1 : 0);
  const prec5 = withV.map(x => { const v = x.g.verses.slice(0, 5).map(g0); return v.filter(g => g >= 1).length / v.length; });
  const ndcg = withV.map(x => { const v = x.g.verses.slice(0, 5).map(g0); const dcg = v.reduce((s, g, k) => s + (2 ** g - 1) / Math.log2(k + 2), 0); const ideal = [...v].sort((a, b) => b - a).reduce((s, g, k) => s + (2 ** g - 1) / Math.log2(k + 2), 0); return ideal ? dcg / ideal : 0; });
  const ans = G.filter(x => x.g.answer != null && x.r.points && x.r.points.length);
  const fiq = G.filter(x => x.g.fiqh != null && x.r.fiqh && x.r.fiqh.length);
  S.graded = G.length;
  S.relevance = {
    versesGraded: withV.length, top1Direct: ci(p1), top1Relevant: ci(p1any), precision5: ci(prec5), ndcg5: ci(ndcg),
    briefGraded: ans.length, briefAnswers: ci(ans.map(x => g0(x.g.answer) === 2 ? 1 : 0)), briefOnTopic: ci(ans.map(x => g0(x.g.answer) >= 1 ? 1 : 0)),
    fiqhGraded: fiq.length, fiqhRight: ci(fiq.map(x => g0(x.g.fiqh) === 2 ? 1 : 0)),
    decisionOk: ci(G.map(x => x.g.decision_ok ? 1 : 0)),
    severity: G.reduce((m, x) => (m[x.g.severity || 'none'] = (m[x.g.severity || 'none'] || 0) + 1, m), {}),
  };
  // by family group
  S.byFamily = {};
  for (const f of [...new Set(rows.map(r => famGroup(r.fam)))]) {
    const R = rows.filter(r => famGroup(r.fam) === f), GG = G.filter(x => famGroup(x.r.fam) === f), V = GG.filter(x => Array.isArray(x.g.verses) && x.g.verses.length && (x.r.verses || []).length);
    S.byFamily[f] = { n: R.length, graded: GG.length, notfound: R.filter(r => r.type === 'notfound').length, abstain: R.filter(r => r.type === 'abstain').length,
      top1Direct: V.length ? V.filter(x => g0(x.g.verses[0]) === 2).length / V.length : null,
      decisionOk: GG.length ? GG.filter(x => x.g.decision_ok).length / GG.length : null,
      major: GG.filter(x => ['major', 'critical'].includes(x.g.severity)).length,
      expect: R.filter(r => r.expectOk !== null && r.expectOk !== undefined).length ? `${R.filter(r => r.expectOk).length}/${R.filter(r => r.expectOk !== null && r.expectOk !== undefined).length}` : '—' };
  }
  S.problems = G.filter(x => ['major', 'critical'].includes(x.g.severity) || !x.g.decision_ok).map(x => ({ id: x.r.id, fam: x.r.fam, q: x.r.q, type: x.r.type + (x.r.reason ? '/' + x.r.reason : ''), by: x.r.confirmedBy, model: x.r.llm && x.r.llm.model, verses: (x.r.verses || []).slice(0, 5), grades: x.g.verses, answer: x.g.answer, fiqh: x.g.fiqh, severity: x.g.severity, decision: x.g.decision_ok, issue: x.g.issue }));
  S.expectFails = rows.filter(r => r.expectOk === false).map(r => ({ id: r.id, fam: r.fam, q: r.q, type: r.type, verses: (r.verses || []).slice(0, 5), fails: r.expectFails }));
  return S;
}

function md(S, T) {
  const L = [`# Test RAG sur 1 000 questions — ${S.tag}${T ? ' vs ' + T.tag : ''}`, '', `Généré le ${new Date().toISOString()} par \`eval/rag1000/report.mjs\`. Pipeline : \`eval/rag1000/pipeline.mjs\` (chemin complet de la page). Juge : modèle d'une autre famille (\`grade.mjs\`), sans les réponses attendues. IC 95 % bootstrap (2 000 tirages, graine 42).`, ''];
  const col = (f) => T ? ` | ${f(T)}` : '';
  L.push(`| Mesure | ${S.tag}${T ? ' | ' + T.tag : ''} |`, `|---|---|${T ? '---|' : ''}`);
  const line = (name, f) => L.push(`| ${name} | ${f(S)}${col(f)} |`);
  line('Questions', s => s.questions);
  line('Erreurs techniques', s => s.errors);
  line('Passages cités / introuvables mot pour mot dans la source', s => `${s.verbatim.passages} / ${s.verbatim.notFound}`);
  line('«الجواب باختصار» affiché / tenté', s => `${s.briefs.shown} / ${s.briefs.attempted}`);
  line('Attentes connues tenues', s => `${s.expect.met}/${s.expect.checked} — ${fmt(s.expect.ci)}`);
  line('Questions notées par le juge', s => s.graded);
  line('1er verset répond directement (note 2)', s => fmt(s.relevance.top1Direct));
  line('1er verset pertinent (note ≥ 1)', s => fmt(s.relevance.top1Relevant));
  line('Précision@5 (note ≥ 1)', s => fmt(s.relevance.precision5));
  line('nDCG@5 (notes du juge)', s => fmt(s.relevance.ndcg5));
  line('Réponse courte qui répond (note 2)', s => `${fmt(s.relevance.briefAnswers)} (n=${s.relevance.briefGraded})`);
  line('Réponse courte dans le sujet (note ≥ 1)', s => fmt(s.relevance.briefOnTopic));
  line('Encyclopédie : bonne section (note 2)', s => `${fmt(s.relevance.fiqhRight)} (n=${s.relevance.fiqhGraded})`);
  line('Bonne décision (répondre / renvoyer / refuser)', s => fmt(s.relevance.decisionOk));
  line('Gravité major / critical', s => `${s.relevance.severity.major || 0} / ${s.relevance.severity.critical || 0}`);
  line('IA : appels / erreurs / voisins sémantiques', s => `${s.ai.used} / ${s.ai.errors} / ${s.ai.dense}`);
  L.push('', '## Par famille de questions', '', `| Famille | n | notées | «aucun verset» | refus | 1er verset direct | bonne décision | major+ | attentes${T ? ' | 1er direct ' + T.tag + ' | bonne décision ' + T.tag + ' | major+ ' + T.tag : ''} |`, `|---|---|---|---|---|---|---|---|---|${T ? '---|---|---|' : ''}`);
  for (const [f, x] of Object.entries(S.byFamily).sort((a, b) => b[1].n - a[1].n)) {
    const y = T && T.byFamily[f];
    L.push(`| ${f} | ${x.n} | ${x.graded} | ${x.notfound} | ${x.abstain} | ${pct(x.top1Direct)} | ${pct(x.decisionOk)} | ${x.major} | ${x.expect}${T ? ` | ${y ? pct(y.top1Direct) : '—'} | ${y ? pct(y.decisionOk) : '—'} | ${y ? y.major : '—'}` : ''} |`);
  }
  L.push('', '## Routes', '', '```json', JSON.stringify(S.byType, null, 1), '```', '');
  const P = (T || S);
  L.push(`## Cas signalés par le juge (${P.tag}) : ${P.problems.length}`, '');
  for (const p of P.problems) L.push(`- **${p.id}** \`${p.fam}\` «${p.q}» → ${p.type} · ${p.by || '—'}${p.model ? ' · ' + p.model : ''} · ${p.verses.join(' ')} · notes ${JSON.stringify(p.grades)} · réponse ${p.answer ?? '—'} · fiqh ${p.fiqh ?? '—'} · ${p.severity}${p.decision ? '' : ' · **décision**'} — ${p.issue || ''}`);
  L.push('', `## Attentes non tenues (${P.tag}) : ${P.expectFails.length}`, '');
  for (const p of P.expectFails) L.push(`- **${p.id}** \`${p.fam}\` «${p.q}» → ${p.type} · ${p.verses.join(' ')} — ${p.fails.join('; ')}`);
  return L.join('\n');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const [a, b2] = process.argv.slice(2);
  const S = summarize(a || 'v1'), T = b2 ? summarize(b2) : null;
  writeFileSync(new URL(`summary_${safe(S.tag)}.json`, import.meta.url), JSON.stringify(S, null, 1));
  if (T) writeFileSync(new URL(`summary_${safe(T.tag)}.json`, import.meta.url), JSON.stringify(T, null, 1));
  writeFileSync(new URL(`REPORT_${safe(S.tag)}${T ? '_' + safe(T.tag) : ''}.md`, import.meta.url), md(S, T));
  const show = (s) => console.log(s.tag, JSON.stringify({ errors: s.errors, verbatim: s.verbatim, briefs: s.briefs, expect: `${s.expect.met}/${s.expect.checked}`, graded: s.graded, top1Direct: pct(s.relevance.top1Direct[0]), top1Rel: pct(s.relevance.top1Relevant[0]), p5: pct(s.relevance.precision5[0]), ndcg5: pct(s.relevance.ndcg5[0]), brief: pct(s.relevance.briefAnswers[0]), fiqh: pct(s.relevance.fiqhRight[0]), decision: pct(s.relevance.decisionOk[0]), sev: s.relevance.severity }));
  show(S); if (T) show(T);
}
