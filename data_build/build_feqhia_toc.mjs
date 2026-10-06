// T123 — the table of contents of the worship books of the Fiqh Encyclopedia of Ad-Durar As-Saniyyah (dorar.net/feqhia,
// an approved reference of the challenge pack): purification, prayer, zakat, fasting, hajj and umrah.
//
//   node data_build/build_feqhia_toc.mjs        → public/data/feqhia_toc.json
//
// Why: a practical question («شروط الصلاة», «كيف أتوضأ», «نواقض الوضوء») has no «حكم» in it, and the encyclopedia's own
// search returned neighbouring sections (a footnote that mentions «شروط الصلاة» inside the chapter on circumcision).
// The encyclopedia's own headings say exactly where each subject is: Mishkat now goes to the section whose heading
// names the subject, and shows its sub-headings as they are written, each linked to the encyclopedia.
// Only titles and numbers are kept (no article text); robots.txt of dorar.net allows everything; 4 requests at a time.
import { writeFileSync } from 'node:fs';

const UA = 'Mishkat/1.0 (Islamic AI Challenge - Quran search; contact: mohamednourbouali87@gmail.com)';
const BOOKS = [[2, 600, 'كتاب الطهارة'], [669, 2000, 'كتاب الصلاة'], [2086, 2622, 'كتاب الزكاة'], [2623, 2873, 'كتاب الصيام'], [2874, 3130, 'كتاب الحج']];
const MAX_DEPTH = 4;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clean = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function page(id) {
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch(`https://dorar.net/feqhia/${id}`, { headers: { 'user-agent': UA, accept: 'text/html' } });
      if (r.ok) return await r.text();
    } catch (e) { /* retry */ }
    await sleep(1500 * (k + 1));
  }
  throw new Error('dorar ' + id);
}
// the sub-headings of a section: its own list comes first, then the site-wide list of chapters (which starts again
// from the first chapter of the encyclopedia, a smaller number): the own list stops there
function children(html, id) {
  const out = [];
  for (const m of html.matchAll(/<a href="\/feqhia\/(\d+)" class="flex-grow-1">\s*<span class="title-text">([^<]*)<\/span>/g)) {
    const c = +m[1];
    if (c <= id) break;
    out.push({ id: c, t: clean(m[2]) });
  }
  return out;
}
const top = children(await page(1), 0);       // the site-wide list of chapters (from any page)
const nodes = [];
const queue = [];
for (const [a, b, book] of BOOKS) for (const c of top.filter(x => x.id >= a && x.id <= b)) { nodes.push({ id: c.id, t: c.t, p: 0, b: book, d: 1 }); queue.push(nodes[nodes.length - 1]); }
console.log('chapters', queue.length);
let done = 0;
async function worker() {
  while (queue.length) {
    const n = queue.shift();
    if (n.d >= MAX_DEPTH) continue;
    const kids = children(await page(n.id), n.id);
    for (const c of kids) { const x = { id: c.id, t: c.t, p: n.id, b: n.b, d: n.d + 1 }; nodes.push(x); queue.push(x); }
    if (++done % 50 === 0) console.log(done, 'pages,', nodes.length, 'sections');
    await sleep(250);
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
nodes.sort((a, b) => a.id - b.id);
writeFileSync('public/data/feqhia_toc.json', JSON.stringify({
  source: 'الموسوعة الفقهية — الدرر السنية (dorar.net/feqhia): عناوين الأبواب والفصول والمباحث كما هي في الموسوعة، مع أرقامها',
  sourceEn: 'Fiqh Encyclopedia of Ad-Durar As-Saniyyah (dorar.net/feqhia): headings of its chapters and sections as written, with their numbers',
  built: new Date().toISOString().slice(0, 10),
  nodes: nodes.map(({ id, t, p, d }) => ({ id, t, p, d })),
}));
console.log('sections', nodes.length);
