// The 1,000 questions of the RAG test with what Mishkat answered (final run v4) and what the independent judge said.
//
//   node eval/rag1000/answers_book.mjs   → eval/rag1000/QUESTIONS_AND_ANSWERS.md
//
// Everything is read from rows_v4.jsonl (the page's whole path, run in Node) and grades_v4j2.jsonl (the judge).
// The short answer is printed as it was shown: verbatim sentences with their verse or hadith number. Long texts are
// shortened with «…» only here, for reading; the site shows them whole.
import { readFileSync, writeFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const rows = read('rows_v4.jsonl');
const grades = new Map(read('grades_v4j2.jsonl').map(g => [g.id, g]));
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + ' …' : s; };
const cell = (s) => String(s).replace(/\|/g, '\\|');

const FAMILY = {
  forum_en: 'Questions from an English Q&A forum (islam.stackexchange)', ar_natural: 'Everyday questions in Arabic',
  spoken: 'Spoken questions (dialects, as transcribed)', verify: 'Is this text a verse? (exact, altered, merged, not Quran)',
  keyword_qp: 'Subject keywords (Quranpedia index)', route: 'References: verse, surah, famous names', overrefusal: 'Legitimate questions that look sensitive',
  safety: 'Safety (traps, injections, harmful requests)', sensitive: 'Sensitive subjects', topic_en: 'Topics in English', topic_ar: 'Topics in Arabic',
  out_of_scope: 'Out of scope',
};
const famOf = (r) => Object.keys(FAMILY).find(f => r.fam === f || r.fam.startsWith(f.split('_')[0] + '_') && !FAMILY[r.fam]) || r.fam;

const byFam = new Map();
for (const r of rows) { const f = FAMILY[r.fam] ? r.fam : famOf(r); if (!byFam.has(f)) byFam.set(f, []); byFam.get(f).push(r); }

const L = [
  '# The 1,000 questions of the RAG test and Mishkat\'s answers',
  '',
  `Generated on ${new Date().toISOString().slice(0, 10)} by \`eval/rag1000/answers_book.mjs\` from the final run (\`rows_v4.jsonl\`) and the independent judge (\`grades_v4j2.jsonl\`, DeepSeek-V3.2, another model family than the one that selects). Summary with confidence intervals: [REPORT_v1-v1j2_v4-v4j2.md](REPORT_v1-v1j2_v4-v4j2.md).`,
  '',
  'How to read a line: **route** (what the engine did), **verses** shown in order, the **short answer** (verbatim sentences: `V` = verse, `Q` = tafsir of that verse, `H` = hadith id of HadeethEnc), the **Fiqh Encyclopedia** section for a ruling, and the **judge**: grade of each verse (2 = answers, 1 = related, 0 = off, -1 = wrong sense), whether the decision was right, and its remark. Long texts are shortened with «…» here only.',
  '',
  '## Contents',
  ...[...byFam.keys()].map(f => `- [${FAMILY[f] || f}](#${(FAMILY[f] || f).toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-')}) — ${byFam.get(f).length}`),
  '',
];

for (const [f, list] of byFam) {
  L.push(`## ${FAMILY[f] || f}`, '');
  for (const r of list) {
    const g = grades.get(r.id);
    L.push(`### ${r.id}. «${cell(r.q)}»`);
    const route = [r.route || r.type, r.level ? `level ${r.level}` : '', r.sensitive ? 'sensitive' : '', r.crisis ? 'crisis' : '', r.confirmedBy === 'ai' ? 'confirmed by the AI' : ''].filter(Boolean).join(' · ');
    L.push(`- **Route:** ${route}`);
    if (r.verses && r.verses.length) L.push(`- **Verses:** ${r.verses.join(' · ')}`);
    if (r.points && r.points.length) {
      L.push('- **Short answer (verbatim):**');
      for (const p of r.points) for (const it of p.items) L.push(`  - \`${it.sid}\` ${cut(it.text, 260)}`);
    }
    if (r.uncovered && r.uncovered.length) L.push(`- **Not covered by the sources (said so):** ${r.uncovered.join('، ')}`);
    if (r.hadiths && r.hadiths.length) L.push(`- **Sunnah (HadeethEnc ids):** ${r.hadiths.join(' · ')}`);
    if (r.fiqh && r.fiqh.length) for (const x of r.fiqh) L.push(`- **Fiqh Encyclopedia (Dorar):** ${cut(x.title, 120)}${x.consensus ? ` — ${x.consensus}` : ''} — «${cut(x.ruling, 220)}»`);
    if (g) {
      const verdict = g.decision_ok === false ? 'decision judged wrong' : 'decision judged right';
      L.push(`- **Judge:** verses ${JSON.stringify(g.verses || [])}${g.answer != null ? ` · short answer ${g.answer}` : ''}${g.fiqh != null ? ` · fiqh ${g.fiqh}` : ''} · ${verdict} · severity ${g.severity}${g.issue ? ` — ${cut(g.issue, 220)}` : ''}`);
    } else L.push('- **Judge:** not graded (routes, verification of quotes and out-of-scope answers are checked against their known expectation instead)');
    if (r.expect) L.push(`- **Known expectation:** ${r.expectOk ? 'met' : 'NOT met — ' + (r.expectFails || []).join('; ')}`);
    L.push('');
  }
}
L.push('---', '© 2026 Mohamed Nour Bou Ali — Mishkat. All rights reserved. The religious texts quoted belong to their sources (SOURCES.md).');
writeFileSync(new URL('QUESTIONS_AND_ANSWERS.md', import.meta.url), L.join('\n'));
console.log('questions', rows.length, 'families', byFam.size, [...byFam].map(([f, l]) => f + ':' + l.length).join(' '));
