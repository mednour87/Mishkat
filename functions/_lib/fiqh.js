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

// T122 (6 Oct 2026): the same reader serves the Creed Encyclopedia of the same site (dorar.net/aqeeda, named by the
// challenge pack for creed: «أو منصة dorar.net/aqeeda») — same page layout, same search, same closed-list AI filter
export const AQEEDA_SOURCE = 'الموسوعة العقدية — الدرر السنية (dorar.net/aqeeda)، من المراجع المعتمدة في حزمة التحدي';
export const AQEEDA_SOURCE_EN = 'The Creed Encyclopedia of Ad-Durar As-Saniyyah (dorar.net/aqeeda), an approved reference of the challenge pack';
const AQEEDA_STRICT = 'Keep a section ONLY if its title is about exactly what is asked (the same article of faith, the same topic, its definition, its pillars or its kinds). A section that only mentions the word in passing, or treats a neighbouring topic, must be excluded. When no section matches, return {"keep":[]}.';
const ENC = {
  feqhia: () => ({ src: FIQH_SOURCE, srcEn: FIQH_SOURCE_EN, strict: FIQH_STRICT, what: 'fiqh encyclopedia section', prefer: /حكم/ }),
  aqeeda: () => ({ src: AQEEDA_SOURCE, srcEn: AQEEDA_SOURCE_EN, strict: AQEEDA_STRICT, what: 'creed encyclopedia section', prefer: /تعريف|معني|اركان|اقسام|انواع|حكم|المراد/ }),
};
const encOf = (body) => (body && body.enc === 'aqeeda' ? 'aqeeda' : 'feqhia');
const linkOf = (id, enc = 'feqhia') => `${DORAR}/${enc}/${id}`;

// light stem for matching the words of a question with the titles of the encyclopedia: no «ال» and attached
// particles, no final «ة/ه» or plural ending, no long vowels — «تارك» = «ترك», «الصيام» = «الصوم», «المريض» = «مرض»
export function fiqhStem(w) {
  let s = bare(w).replace(/[^ء-ي]/g, '');
  if (s.length > 4) s = s.replace(/^(وال|فال|بال|كال|لل)/, '');
  if (s.length > 3) s = s.replace(/^ال/, '');
  if (s.length > 4) s = s.replace(/(ات|ون|ين|ان|يه)$/, ''); else if (s.length > 3) s = s.replace(/ه$/, '');
  const k = s.replace(/[اويء]/g, '');
  const out = k.length >= 2 ? k : s;
  return FIQH_SYN[out] || out;
}
// the encyclopedia's own word for the same thing (stems): «الزواج / تزوج» → «النكاح»
const FIQH_SYN = { 'زج': 'نكح', 'تزج': 'نكح' };
// the subject words of a ruling question (generic words of the fiqh vocabulary set aside)
const FIQH_GENERIC = new Set(['حكم', 'الحكم', 'الاسلام', 'الشرع', 'شرعا', 'المسلم', 'المسلمين', 'الدين', 'يجوز', 'جواز', 'مشروعيه',
  'لمن', 'كيف', 'متي', 'اذا', 'الذي', 'التي', 'علي', 'عند', 'بعد', 'قبل', 'هذا', 'هذه', 'ذلك', 'وما', 'وهل', 'فهل', 'لماذا']);
// the closed-list check of the sections: the same act, the same people, the same case — or nothing
const FIQH_STRICT = 'Keep a section ONLY if its title states the ruling of exactly what is asked: the same act, the same people (men / women), the same case. A section on a neighbouring case of the same subject must be excluded (e.g. a gold ring for men when the question is about chains for women; two rakaat after wudu when the question is about praying without wudu; how much is given to the poor when the question is who receives zakat). When no section matches exactly, return {"keep":[]}.';
export function fiqhWords(text) {
  return bare(String(text || '')).replace(/[^ء-ي\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !FIQH_GENERIC.has(w)).map(fiqhStem).filter(s => s.length >= 2);
}
// the words of a section's path and heading, without the markers of its place in the book («كتاب», «المبحث الأول»…)
const MARKERS = /(^|\s-\s|\s)(كتاب|الباب|باب|الفصل|فصل|المبحث|مبحث|المطلب|مطلب|الفرع|فرع|المساله|مساله|تمهيد|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)(?=\s|:|$)/g;
function sectionWords(text) {
  return new Set(bare(String(text || '')).replace(/[^ء-ي\s-]/g, ' ').replace(MARKERS, ' ').split(/[\s-]+/).filter(w => w.length > 2).map(fiqhStem));
}
export const FIQH_TERMS = { 'الموسيقى': 'المعازف', 'موسيقى': 'المعازف', 'الأغاني': 'الغناء', 'الاغاني': 'الغناء', 'التدخين': 'التبغ', 'الدخان': 'التبغ',
  'السجائر': 'التبغ', 'الشيشة': 'التبغ', 'الزواج': 'النكاح', 'زواج': 'النكاح', 'فوائد البنوك': 'الربا', 'الفوائد البنكية': 'الربا', 'الفائدة البنكية': 'الربا', 'القروض': 'القرض',
  'الكحول': 'الخمر', 'المخدرات': 'المخدرات', 'الحشيش': 'المخدرات', 'التأمين': 'التأمين', 'الوشم': 'الوشم', 'الحجاب': 'الحجاب',
  // (T122) the Creed Encyclopedia's own words
  'علامات الساعة': 'أشراط الساعة', 'علامات القيامة': 'أشراط الساعة', 'علامات يوم القيامة': 'أشراط الساعة' };

// search page → [{id, title, path, snippet}] (one per article)
export function parseDorarSearch(html, enc = 'feqhia') {
  const out = [], seen = new Set();
  const HREF = new RegExp(`href="/${enc}/(\\d+)"`);
  for (const m of String(html || '').matchAll(/<article class="border-bottom py-4">([\s\S]*?)<\/article>/g)) {
    const a = m[1];
    const id = +((a.match(HREF) || [])[1] || 0);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const snippet = plain((a.match(/<h5[^>]*>([\s\S]*?)<\/h5>/) || [])[1] || '').replace(/^\d+\s*-\s*/, '').slice(0, 260);
    // breadcrumb of the article: «كتاب الأشربة - المبحث الثاني: حكم تناول التبغ [202] footnote…»
    const path = plain((a.match(/<span class="text-muted"[^>]*>([\s\S]*?)<\/span>\s*<\/article>|<span class="text-muted"[^>]*>([\s\S]*)$/) || []).slice(1).find(Boolean) || '')
      .replace(/\s*\[\d+\][\s\S]*$/, '').slice(0, 200);
    out.push({ id, snippet, path, url: linkOf(id, enc) });
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

// the words of a ruling question: the question itself (Arabic), the AI's Arabic fiqh terms (search terms, never
// displayed; 2–4 words, Arabic letters only), and the reviewed equivalents in the vocabulary of fiqh books
function termsOf(body) {
  const q0 = String(body && body.q || '').slice(0, 300);
  const kw = Array.isArray(body && body.kw) ? body.kw.map(w => String(w).replace(/[^؀-ۿ\s]/g, ' ').replace(/\s+/g, ' ').trim()).filter(w => w && w.length <= 30).slice(0, 4) : [];
  const fq = /[؀-ۿ]/.test(q0) ? fatwaQuery(q0) : '';
  // (5 Oct, RAG test) the AI's terms are also searched together («الفطر المريض»): the encyclopedia's search ranks
  // the section that names both first
  const base = [fq, ...kw, kw.length > 1 ? kw.slice(0, 3).join(' ') : ''];
  // reviewed equivalents (the encyclopedia titles «المعازف», not «الموسيقى»; «التبغ», not «التدخين»)
  const extra = base.flatMap(t => Object.entries(FIQH_TERMS).filter(([k]) => bare(t).includes(bare(k))).map(([, v]) => v));
  return { kw, fq, base, extra };
}
// (second pass of the test) the subject: an Arabic question is its own subject — the AI's terms only stand in for a
// question in English — plus the reviewed equivalents; each as a set of light stems
function subjectsOf(body) {
  if (!body || (!body.q && !body.kw)) return [];
  const { kw, fq, extra } = termsOf(body);
  return [fq || kw.join(' '), ...new Set(extra)].map(t => [...new Set(fiqhWords(t))]).filter(s => s.length);
}

export async function fiqhSearch(body, env, fetchImpl = fetch) {
  // one article, in full
  if (body && body.id != null) {
    const id = +body.id;
    if (!Number.isInteger(id) || id < 1 || id > 1e7) return { ok: false, error: 'bad id' };
    const enc = encOf(body), E = ENC[enc]();
    const { text, url } = await getText(linkOf(id, enc), fetchImpl);
    const f = parseDorarFiqh(text);
    if (!f.ruling.length) {
      // (5 Oct, RAG test) a section that has sub-sections («المطلب الأول: حكم شرب الخمر», «الفصل الأول: المريض») shows only
      // a table of contents; its statement is in its first sub-section, the next article («الفرع الأول: حكم الخمر
      // المتخذة من العنب», «المبحث الأول: حكم فطر المريض»). It is read only if its breadcrumb names this section.
      // (the title may carry its footnote as escaped HTML: «حكم تناول التبغ<span class="tip">[202] …</span>»)
      const parent = bare(plain(decode((String(text).match(/name="title" value="([^"]+)"/) || [])[1] || '').replace(/<span class="tip">[\s\S]*?<\/span>/g, ''))).replace(/\s+/g, ' ').trim();
      const sameSection = (p) => { const a = bare(p).replace(/\s+/g, ' ').trim(); return a === parent || (a.length >= 12 && parent.startsWith(a)) || (parent.length >= 12 && a.startsWith(parent)); };
      // … and, when the question is given, only a sub-section that names its subject (a chapter «المخدرات والتبغ…»
      // opens on «حكم تناول المخدرات», not on the tobacco asked about)
      const subj = subjectsOf(body);
      const about = (g) => !subj.length || subj.some(s => s.some(w => sectionWords(g.title || '').has(w)));
      for (let k = 1; parent && k <= 2; k++) {
        const c = await getText(linkOf(id + k, enc), fetchImpl).catch(() => null);
        const g = c && parseDorarFiqh(c.text);
        if (g && g.ruling.length && g.path.some(sameSection) && about(g)) return { ok: true, enc, id: id + k, via: id, ...g, url: c.url || linkOf(id + k, enc), source: E.src, sourceEn: E.srcEn };
      }
      return { ok: false, error: 'no ruling statement on the page' };
    }
    return { ok: true, enc, id, ...f, url: url || linkOf(id, enc), source: E.src, sourceEn: E.srcEn };
  }
  const q0 = String(body && body.q || '').slice(0, 300);
  const { kw, fq, base, extra } = termsOf(body);
  const enc = encOf(body), E = ENC[enc]();
  const qs = [...new Set([...base, ...extra].filter(s => s.replace(/\s/g, '').length >= 3))].slice(0, 6);
  if (!qs.length) return { ok: false, error: 'query too short' };
  let items = [];
  const seen = new Set();
  // the searches run together; one that fails (HTTP error, challenge page) no longer discards the others
  const pages = await Promise.allSettled(qs.map(q => getText(`${DORAR}/${enc}/search?q=${encodeURIComponent(q)}`, fetchImpl)));
  if (pages.every(p => p.status === 'rejected')) throw pages[0].reason;
  for (const p of pages) {
    if (p.status !== 'fulfilled') continue;
    for (const x of parseDorarSearch(p.value.text, enc).slice(0, 10)) if (!seen.has(x.id)) { seen.add(x.id); items.push(x); }
  }
  // a hit inside a footnote or an example is not the section's subject: the words of the question (or of one
  // search term) must be in the section's path, or in the heading the search returned — with or without AI
  // (before: «ما حكم الموسيقى» got the section on dancing, whose footnote mentions music)
  const heading = (x) => /^(المطلب|المبحث|الفصل|الباب|الفرع|المساله|كتاب)/.test(bare(x.snippet)) ? x.snippet : '';
  // (5 Oct, RAG test) the subject is ALL the words of the question (or, for a question in English, of the AI's terms),
  // matched word by word on a light stem: «ترك الصلاة» finds «حكم تارك الصلاة», «المريض» finds «المريض». A section must
  // name (in its path or heading) every word of a two-word subject, two thirds of a longer one. Before, one word of
  // one AI term was enough: «هل يجوز الفطر للمريض في رمضان؟» got «تعجيل الفطر» (breaking the fast at sunset).
  // the subject as asked, the AI's terms taken together, and the reviewed equivalents («التدخين» → «التبغ»)
  // (second pass of the test) an Arabic question is its own subject — the AI's terms only stand in for a question in
  // English — and a one-word subject must be in the section's own heading, not only in its path: «الكذب» alone found
  // the section on witnesses who lied, «الذهب» the gold rings of men for a question on women's chains
  const subjects = subjectsOf(body);
  const cover = (set, head) => subjects.reduce((best, s) => {
    const hit = s.filter(w => set.has(w)).length, need = s.length <= 2 ? s.length : Math.ceil(s.length * 2 / 3);
    if (s.length === 1 && !head.has(s[0])) return best;
    return hit >= need && hit / s.length > best ? hit / s.length : best;
  }, 0);
  const scored = items.map((x, k) => {
    const all = sectionWords(x.path + ' - ' + heading(x)), head = sectionWords(heading(x) || '');
    const hit = cover(all, head), hitH = cover(head, head);
    const h = bare(heading(x) || x.snippet), leaf = /^(المطلب|المبحث|المساله|الفرع)/.test(h);
    // a chapter heading («الباب», «الفصل», «كتاب») has no statement of the ruling on its own page — it is in its
    // sub-sections («المبحث الأول: حكم الربا»): leaf sections first, those named «حكم…» before them all
    return { x, k, hit, hitH, r: (leaf ? 0 : 2) + (E.prefer.test(h) ? 0 : 1) };
  }).filter(o => o.hit > 0);
  items = scored.sort((a, b) => b.hitH - a.hitH || a.r - b.r || b.hit - a.hit || a.k - b.k).map(o => o.x).slice(0, 12);
  let by = 'search';
  // the large model checks even a single section (a ruling shown on the wrong subject is the worst error here)
  if (items.length >= 1 && body.ai !== false) {
    const keep = await pickRelevant(q0, items.map(x => `${x.path} — ${x.snippet}`), env, { max: 3, what: E.what, fetchImpl, task: 'select', strict: E.strict }).catch(() => null);
    if (keep) { items = keep.map(i => items[i]); by = 'ai'; }
  }
  if (by === 'search') items = items.slice(0, 3);
  return { ok: true, enc, q: qs[0], items, by, source: E.src, sourceEn: E.srcEn, url: `${DORAR}/${enc}/search?q=${encodeURIComponent(qs[0])}` };
}
