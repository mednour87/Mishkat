// Live, read-only lookups in reference sources named by the challenge's
// scientific reference pack («المرجعية والحزمة العلمية والبيانات»):
//  - الموسوعة الحديثية — الدرر السنية (dorar.net): its public API, offered to
//    websites to show hadith search results with the muhaddith's verdict.
//  - الموسوعة القرآنية — Quranpedia.net: classical tafsir books, page by page.
// Nothing is generated: the text is returned as published, with its reference.
// No HTML is passed to the browser (everything is reduced to plain text here).

const UA = 'Mishkat/1.0 (Islamic AI Challenge - Quran search; contact: mohamednourbouali87@gmail.com)';

// Tafsir books offered in the reader, fetched live verse by verse (the local
// tafsirs — Al-Muyassar, Al-Mukhtasar, As-Sa'di — are served as static files).
// The reference pack asks for sources of the first three centuries (or
// dorar.net/tafseer): At-Tabari is the main one; the classical works of
// Ibn Kathir, Al-Baghawi and Al-Qurtubi are offered next to it, each shown with
// its author and death date so the reader knows what they are reading.
//   via 'quranpedia': api.quranpedia.net/v1/ayah/{s}/{a}/book/{id} (pages of the printed book)
//   via 'qurancom'  : api.quran.com/api/v4/tafsirs/{id}/by_ayah/{s}:{a} (verse or verse group)
export const TAFSIR_BOOKS = {
  tabari: { via: 'quranpedia', ref: 4, lang: 'ar', short: 'الطبري', name: 'جامع البيان في تأويل آي القرآن', author: 'محمد بن جرير الطبري', died: 310 },
  ibnkathir: { via: 'qurancom', ref: 14, lang: 'ar', short: 'ابن كثير', name: 'تفسير القرآن العظيم', author: 'إسماعيل بن عمر بن كثير', died: 774 },
  baghawi: { via: 'qurancom', ref: 94, lang: 'ar', short: 'البغوي', name: 'معالم التنزيل', author: 'الحسين بن مسعود البغوي', died: 516 },
  qurtubi: { via: 'qurancom', ref: 90, lang: 'ar', short: 'القرطبي', name: 'الجامع لأحكام القرآن', author: 'محمد بن أحمد القرطبي', died: 671 },
  ibnkathir_en: { via: 'qurancom', ref: 169, lang: 'en', short: 'Ibn Kathir', name: 'Tafsir Ibn Kathir (abridged)', author: 'Ibn Kathir', died: 774 },
  // Ibn Abi Hatim (Quranpedia 149) was tested and left out: its pages have no per-verse headings,
  // so the text of a neighbouring verse could be shown under the wrong verse.
};
const BOOK_ALIAS = { 4: 'tabari' }; // older clients sent the Quranpedia id

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

// Quran.com tafsir text (HTML) → lines; headings kept as heading lines.
export function htmlLines(html) {
  const s = String(html || '').replace(/<h[1-4][^>]*>/gi, '\n\u0001').replace(/<\/h[1-4]>/gi, '\n')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<p[^>]*>|<div[^>]*>/gi, '\n');
  return s.split('\n').map(l => ({ h: l.includes('\u0001'), t: plain(l.replace('\u0001', '')) })).filter(l => l.t);
}

export async function tafsirPages(body, env, fetchImpl = fetch) {
  const s = +(body && body.s), a = +(body && body.a);
  const id = BOOK_ALIAS[body && body.book] || String(body && body.book || '');
  if (!Number.isInteger(s) || s < 1 || s > 114 || !Number.isInteger(a) || a < 1 || a > 286) return { ok: false, error: 'bad verse' };
  const B = Object.prototype.hasOwnProperty.call(TAFSIR_BOOKS, id) ? TAFSIR_BOOKS[id] : null;
  if (!B) return { ok: false, error: 'book not offered' };
  const book = { id, short: B.short, name: B.name, author: B.author, died: B.died, lang: B.lang };
  if (B.via === 'qurancom') {
    const r = await fetchImpl(`https://api.quran.com/api/v4/tafsirs/${B.ref}/by_ayah/${s}:${a}`, { headers: { 'user-agent': UA, accept: 'application/json' } });
    if (!r.ok) return { ok: false, error: `quran.com HTTP ${r.status}` };
    const j = await r.json();
    const t = (j && j.tafsir) || {};
    const lines = htmlLines(t.text);
    if (!lines.length) return { ok: true, empty: true, book, lines: [] };
    const verses = Object.keys(t.verses || {}).filter(k => /^\d+:\d+$/.test(k));
    return { ok: true, exact: true, book, lines: lines.slice(0, 400).map(l => ({ h: l.h, t: l.t.slice(0, 4000) })), verses,
      url: `https://quran.com/${s}:${a}/tafsirs/${encodeURIComponent(t.slug || '')}`, source: 'Quran.com' };
  }
  const r = await fetchImpl(`https://api.quranpedia.net/v1/ayah/${s}/${a}/book/${B.ref}`, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!r.ok) return { ok: false, error: `quranpedia HTTP ${r.status}` };
  const j = await r.json();
  const { exact, lines } = cutToVerse(j && j.content, a);
  if (!lines.length) return { ok: true, empty: true, book, lines: [] };
  const pages = [...new Set(lines.map(l => `${l.part}/${l.page}`))];
  return { ok: true, exact, book, lines: lines.slice(0, 400).map(l => ({ h: l.h, t: l.t.slice(0, 4000) })),
    ref: pages, url: `https://quranpedia.net/surah/1/${s}?ayah_id=${a}`, source: 'الموسوعة القرآنية — Quranpedia.net' };
}
