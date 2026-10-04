// Rulings (أحكام) from an APPROVED source of the challenge's reference pack only:
//   dorar.net/feqhia — «الموسوعة الفقهية» of Ad-Durar As-Saniyyah, named by the pack for general fiqh
//   («أي كتاب معتمد في الفقه على أحد المذاهب الفقهية الأربعة أو منصة dorar.net/feqhia»). Its articles state
//   the ruling, who holds it (the four schools, the Permanent Committee for Ifta of Saudi Arabia, Ibn Baz,
//   Ibn Uthaymin…), whether it is agreed upon, then the evidence, with references.
// Mishkat never issues a ruling: it shows the encyclopedia's own statement of the ruling, verbatim, with its
// link, a flag saying whether the text reports a consensus or a difference of opinion, and a referral to
// the General Presidency of Scholarly Research and Ifta (alifta.gov.sa) for a personal case.
// (Until 4 October 2026 this module quoted binbaz.org.sa, which is not in the reference pack.)
// An AI model may only REORDER/FILTER the search results (closed list of numbers); it never writes text.
import { pickRelevant } from './selector.js';

const UA = 'Mishkat/1.0 (Islamic AI Challenge - Quran search; contact: mohamednourbouali87@gmail.com)';
const DORAR = 'https://dorar.net';
export const FIQH_SOURCE = 'الموسوعة الفقهية — الدرر السنية (dorar.net/feqhia)، من المراجع المعتمدة في حزمة التحدي';
export const FIQH_SOURCE_EN = 'The Fiqh Encyclopedia of Ad-Durar As-Saniyyah (dorar.net/feqhia), an approved reference of the challenge pack';
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const plain = (h) => decode(String(h || '').replace(/<[^>]*>/g, ' ')).normalize('NFC').replace(/[ \t ]+/g, ' ').replace(/\s+([،.؛:)])/g, '$1').trim();
const bare = (s) => String(s || '').replace(/[ً-ْٰـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

// what the reader asked, without the ruling words («ما حكم», «هل يجوز»…): the search matches words
const RULING = /(^|\s)(ما|وما|هل|فما)?\s*(حكم|الحكم في|يجوز|يحل|يحرم|حرام|حلال|جائز|مشروع|مشروعية|فتوى|فتاوى|افتوني|افتني|الشرع في|رأي الدين في|رأي الشرع في|في الإسلام|في الاسلام|شرعا|شرعًا)(\s|$)/g;
export function fatwaQuery(q) {
  let s = String(q || '').replace(/[؟،؛«»]/g, ' ').replace(/[^؀-ۿ\s]/g, ' ').replace(/[ً-ْٰ]/g, '');
  for (let k = 0; k < 3; k++) s = s.replace(RULING, ' ');
  s = s.replace(/(^|\s)(ما|هل|في|عن|من|على|إلى|الى|أن|ان|او|أو)(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  return s.slice(0, 80);
}

const linkOf = (id) => `${DORAR}/feqhia/${id}`;
export const FIQH_TERMS = { 'الموسيقى': 'المعازف', 'موسيقى': 'المعازف', 'الأغاني': 'الغناء', 'الاغاني': 'الغناء', 'التدخين': 'التبغ', 'الدخان': 'التبغ',
  'السجائر': 'التبغ', 'الشيشة': 'التبغ', 'فوائد البنوك': 'الربا', 'الفوائد البنكية': 'الربا', 'الفائدة البنكية': 'الربا', 'القروض': 'القرض',
  'الكحول': 'الخمر', 'المخدرات': 'المخدرات', 'الحشيش': 'المخدرات', 'التأمين': 'التأمين', 'الوشم': 'الوشم', 'الحجاب': 'الحجاب' };

// search page → [{id, title, path, snippet}] (one per article)
export function parseDorarSearch(html) {
  const out = [], seen = new Set();
  for (const m of String(html || '').matchAll(/<article class="border-bottom py-4">([\s\S]*?)<\/article>/g)) {
    const a = m[1];
    const id = +((a.match(/href="\/feqhia\/(\d+)"/) || [])[1] || 0);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const snippet = plain((a.match(/<h5[^>]*>([\s\S]*?)<\/h5>/) || [])[1] || '').replace(/^\d+\s*-\s*/, '').slice(0, 260);
    // breadcrumb of the article: «كتاب الأشربة - المبحث الثاني: حكم تناول التبغ [202] footnote…»
    const path = plain((a.match(/<span class="text-muted"[^>]*>([\s\S]*?)<\/span>\s*<\/article>|<span class="text-muted"[^>]*>([\s\S]*)$/) || []).slice(1).find(Boolean) || '')
      .replace(/\s*\[\d+\][\s\S]*$/, '').slice(0, 200);
    out.push({ id, snippet, path, url: linkOf(id) });
  }
  return out;
}

// a statement reports agreement / disagreement (the encyclopedia's own words)
export function consensusOf(text) {
  const t = bare(text);
  if (/باتفاق المذاهب|بالاجماع|الاجماع علي|نقل الاجماع|نقل ابن \S+ الاجماع|حكي الاجماع|بلا خلاف|لا خلاف (فيه|في ذلك|بين)|اجماعا|اتفق العلماء|اتفق الفقهاء/.test(t)) return 'ijma';
  if (/اختلف (العلماء|اهل العلم|الفقهاء)|علي قولين|علي اقوال|علي ثلاثه اقوال|القول الاول|القول الثاني/.test(t)) return 'khilaf';
  if (/الجمهور|جمهور (العلماء|الفقهاء)/.test(t)) return 'jumhur';
  return null;
}

// one article → {title, path[], ruling[] (paragraphs before the evidence), refs, consensus}
export function parseDorarFiqh(html) {
  const h = String(html || '');
  const i = h.indexOf('id="cntnt"');
  const title = plain(((h.slice(Math.max(0, i)).match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<span class="tip">[\s\S]*?<\/span>/g, ''));
  const ol = (h.match(/<ol class="breadcrumb[^"]*">([\s\S]*?)<\/ol>/) || [])[1] || '';
  const path = [...ol.matchAll(/<span class="title-text">([^<]*)/g)].map(m => plain(m[1])).filter(Boolean);
  const start = h.indexOf('<div class="w-100 mt-4">', i);
  const end = h.indexOf('<h3 id="more-titles"', start) > 0 ? h.indexOf('<h3 id="more-titles"', start) : h.indexOf('card-meta', start);
  let body = start > 0 ? h.slice(start, end > start ? end : start + 60000) : '';
  // footnotes are references, kept apart; the statement is read without them
  const refs = [...body.matchAll(/<span class="tip">([\s\S]*?)<\/span>/g)].map(m => plain(m[1]).replace(/^\[\d+\]\s*/, '')).filter(Boolean).slice(0, 12);
  body = body.replace(/<span class="tip">[\s\S]*?<\/span>/g, '').replace(/<a [^>]*id="enc-tip"[\s\S]*?<\/a>/g, '');
  // the ruling = everything before the first heading of evidence («الأدلة», «الدليل», «أولًا: من الكتاب»)
  let cut = -1;
  for (const m of body.matchAll(/<span class="title-2">([\s\S]*?)<\/span>/g)) {
    if (/^(الادله|الدليل|اولا|ثانيا|من الكتاب|من السنه)/.test(bare(plain(m[1])))) { cut = m.index; break; }
  }
  const head = cut > 0 ? body.slice(0, cut) : body;
  const ruling = head.split(/<br\s*\/?>|<\/p>|<span class="title-2">/i).map(plain).filter(p => p.replace(/\s/g, '').length >= 12).slice(0, 6).map(p => p.slice(0, 1500));
  return { title, path, ruling, refs, consensus: consensusOf(ruling.join(' ')), authorities: authoritiesOf(ruling.join(' ')) };
}

// the Saudi official bodies and their muftis named in the statement (the encyclopedia's own words)
const AUTH = [['committee', /اللجنه الدايمه|اللجنه الدائمه/], ['council', /هييه كبار العلماء|هيئه كبار العلماء/], ['binbaz', /ابن باز/], ['uthaymin', /ابن عثيمين/]];
export function authoritiesOf(text) {
  const t = bare(text).replace(/ئ/g, 'ي');
  return AUTH.filter(([, re]) => re.test(t)).map(([k]) => k);
}

async function getText(url, fetchImpl) {
  const r = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
  if (!r.ok) throw new Error(`dorar HTTP ${r.status}`);
  const t = await r.text();
  if (/<title>\s*Attention Required/i.test(t)) throw new Error('dorar: blocked');
  return { text: t, url: r.url };
}

export async function fiqhSearch(body, env, fetchImpl = fetch) {
  // one article, in full
  if (body && body.id != null) {
    const id = +body.id;
    if (!Number.isInteger(id) || id < 1 || id > 1e7) return { ok: false, error: 'bad id' };
    const { text, url } = await getText(linkOf(id), fetchImpl);
    const f = parseDorarFiqh(text);
    if (!f.ruling.length) return { ok: false, error: 'no ruling statement on the page' };
    return { ok: true, id, ...f, url: url || linkOf(id), source: FIQH_SOURCE, sourceEn: FIQH_SOURCE_EN };
  }
  const q0 = String(body && body.q || '').slice(0, 300);
  // the AI's Arabic fiqh search terms (2–4 words, Arabic letters only): search terms, never displayed
  const kw = Array.isArray(body && body.kw) ? body.kw.map(w => String(w).replace(/[^؀-ۿ\s]/g, ' ').replace(/\s+/g, ' ').trim()).filter(w => w && w.length <= 30).slice(0, 4) : [];
  const base = [/[؀-ۿ]/.test(q0) ? fatwaQuery(q0) : '', ...kw];
  // reviewed equivalents in the vocabulary of fiqh books (the encyclopedia titles «المعازف», not «الموسيقى»)
  const extra = base.flatMap(t => Object.entries(FIQH_TERMS).filter(([k]) => bare(t).includes(bare(k))).map(([, v]) => v));
  const qs = [...new Set([...base, ...extra].filter(s => s.replace(/\s/g, '').length >= 3))].slice(0, 5);
  if (!qs.length) return { ok: false, error: 'query too short' };
  let items = [];
  const seen = new Set();
  for (const q of qs) {
    const { text } = await getText(`${DORAR}/feqhia/search?q=${encodeURIComponent(q)}`, fetchImpl);
    for (const x of parseDorarSearch(text).slice(0, 10)) if (!seen.has(x.id)) { seen.add(x.id); items.push(x); }
  }
  // a hit inside a footnote or an example is not the section's subject: the words of the question (or of one
  // search term) must be in the section's path, or in the heading the search returned — with or without AI
  // (before: «ما حكم الموسيقى» got the section on dancing, whose footnote mentions music)
  const wordsOf = (q) => bare(q).split(' ').filter(w => w.length > 2).map(w => w.replace(/^(ال|وال|بال)/, ''));
  const heading = (x) => /^(المطلب|المبحث|الفصل|الباب|الفرع|المساله|المسأله|كتاب)/.test(bare(x.snippet)) ? x.snippet : '';
  items = items.filter(x => qs.some(q => { const w = wordsOf(q); return w.length && w.every(v => bare(x.path + ' ' + heading(x)).includes(v)); })).slice(0, 12);
  let by = 'search';
  if (items.length > 1 && body.ai !== false) {
    const keep = await pickRelevant(q0, items.map(x => `${x.path} — ${x.snippet}`), env, { max: 3, what: 'fiqh encyclopedia section', fetchImpl }).catch(() => null);
    if (keep) { items = keep.map(i => items[i]); by = 'ai'; }
  }
  if (by === 'search') items = items.slice(0, 3);
  return { ok: true, q: qs[0], items, by, source: FIQH_SOURCE, sourceEn: FIQH_SOURCE_EN, url: `${DORAR}/feqhia/search?q=${encodeURIComponent(qs[0])}` };
}
