// Live, read-only lookups in reference sources named by the challenge's
// scientific reference pack («المرجعية والحزمة العلمية والبيانات»):
//  - الموسوعة الحديثية — الدرر السنية (dorar.net): its public API, offered to
//    websites to show hadith search results with the muhaddith's verdict.
//  - الموسوعة القرآنية — Quranpedia.net: classical tafsir books, page by page.
// Nothing is generated: the text is returned as published, with its reference.
// No HTML is passed to the browser (everything is reduced to plain text here).

const UA = 'Mishkat/1.0 (Islamic AI Challenge - Quran search; contact: mohamednourbouali87@gmail.com)';

// Tafsir books offered in the reader. The reference pack asks for sources of the
// first three centuries (or dorar.net/tafseer) when a verse is explained.
export const TAFSIR_BOOKS = {
  4: { short: 'الطبري', name: 'جامع البيان في تأويل آي القرآن', author: 'محمد بن جرير الطبري', died: 310 },
  // Ibn Abi Hatim (149) was tested and left out: its pages have no per-verse headings,
  // so the text of a neighbouring verse could be shown under the wrong verse.
};

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const plain = (h) => decode(String(h || '').replace(/<[^>]*>/g, ' ')).replace(/[ \t ]+/g, ' ').trim();

// ------------------------------------------------------------------ Dorar hadith search
// Only Arabic letters and spaces are sent (the API searches Arabic text).
export function hadithQuery(q) {
  return String(q || '').replace(/[^؀-ۿ\s]/g, ' ').replace(/[ً-ٰٟ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

// The API returns an HTML fragment: one <div class="hadith"> + <div class="hadith-info"> per result.
export function parseDorar(html) {
  const out = [];
  const parts = String(html || '').split(/<div class="hadith"[^>]*>/).slice(1);
  for (const p of parts) {
    const [textPart, infoPart = ''] = p.split(/<div class="hadith-info"[^>]*>/);
    const text = plain(textPart.split('</div>')[0]).replace(/^\d+\s*-\s*/, '').replace(/\s+\.$/, '.').trim();
    const field = (label) => {
      const m = infoPart.match(new RegExp(`<span class="info-subtitle">\\s*${label}:?\\s*</span>([\\s\\S]*?)(?=<span class="info-subtitle">|</div>|$)`));
      return m ? plain(m[1]).replace(/^-$/, '') : '';
    };
    if (!text) continue;
    out.push({ text, rawi: field('الراوي'), muhaddith: field('المحدث'), source: field('المصدر'), page: field('الصفحة أو الرقم'), grade: field('خلاصة حكم المحدث') });
  }
  return out;
}

export async function hadithSearch(body, env, fetchImpl = fetch) {
  const q = hadithQuery(body && body.q);
  if (q.replace(/\s/g, '').length < 3) return { ok: false, error: 'query too short' };
  const url = `https://dorar.net/dorar_api.json?skey=${encodeURIComponent(q)}`;
  const r = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!r.ok) return { ok: false, error: `dorar HTTP ${r.status}` };
  const j = await r.json();
  const items = parseDorar(j && j.ahadith && j.ahadith.result).slice(0, 15);
  return { ok: true, q, items, source: 'الموسوعة الحديثية — الدرر السنية', url: `https://dorar.net/hadith/search?q=${encodeURIComponent(q)}` };
}

// ------------------------------------------------------------------ Quranpedia tafsir pages
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arNum = (n) => String(n).replace(/\d/g, d => AR_DIGITS[d]);

// One book page → lines; <h3> headings are kept as heading lines.
function pageLines(html) {
  const s = String(html || '').replace(/<h3[^>]*>/gi, '\n\u0001').replace(/<\/h3>/gi, '\n').replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n');
  return s.split('\n').map(l => ({ h: l.includes('\u0001'), t: plain(l.replace('\u0001', '')) })).filter(l => l.t);
}

// The book's pages around the verse; when the verse's own heading
// («القول في تأويل قوله تعالى … (١٥٣)») is found, the text starts there and
// stops at the next verse heading, so nothing of another verse is shown.
export function cutToVerse(content, aya) {
  const lines = [];
  for (const c of content || []) for (const l of pageLines(c.text)) lines.push({ ...l, part: c.part, page: c.page });
  const tag = `(${arNum(aya)})`;
  const start = lines.findIndex(l => l.h && l.t.includes(tag));
  if (start < 0) return { exact: false, lines };
  let end = lines.length;
  for (let k = start + 1; k < lines.length; k++) if (lines[k].h && /\([٠-٩]+\)/.test(lines[k].t) && !lines[k].t.includes(tag)) { end = k; break; }
  return { exact: true, lines: lines.slice(start, end) };
}

export async function tafsirPages(body, env, fetchImpl = fetch) {
  const s = +(body && body.s), a = +(body && body.a), book = +(body && body.book);
  if (!Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1 || a > 286) return { ok: false, error: 'bad verse' };
  if (!TAFSIR_BOOKS[book]) return { ok: false, error: 'book not offered' };
  const r = await fetchImpl(`https://api.quranpedia.net/v1/ayah/${s}/${a}/book/${book}`, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!r.ok) return { ok: false, error: `quranpedia HTTP ${r.status}` };
  const j = await r.json();
  const { exact, lines } = cutToVerse(j && j.content, a);
  if (!lines.length) return { ok: true, empty: true, book: TAFSIR_BOOKS[book], lines: [] };
  const pages = [...new Set(lines.map(l => `${l.part}/${l.page}`))];
  return { ok: true, exact, book: { id: book, ...TAFSIR_BOOKS[book] }, lines: lines.slice(0, 400).map(l => ({ h: l.h, t: l.t.slice(0, 4000) })),
    ref: pages, url: `https://quranpedia.net/surah/1/${s}?ayah_id=${a}`, source: 'الموسوعة القرآنية — Quranpedia.net' };
}
