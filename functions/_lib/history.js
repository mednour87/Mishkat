// T122 (6 Oct 2026) — Sira and Islamic history from an APPROVED source of the challenge's reference pack only:
// dorar.net/history, «الموسوعة التاريخية» of Ad-Durar As-Saniyyah («السيرة والتاريخ: … أو منصة dorar.net/history»).
// Its search page returns whole events: title, Hijri year and month, Gregorian year, details. Mishkat shows the
// event as the encyclopedia writes it (verbatim, cut at a sentence end when long, with the link) — never a text of
// its own. The words of the question choose the events by their TITLE; an AI model may only keep numbers from that
// closed list (functions/_lib/selector.js pickRelevant), it writes nothing.
import { pickRelevant } from './selector.js';
import { fiqhWords } from './fiqh.js';

const UA = 'Mishkat/1.0 (Islamic AI Challenge - Quran search; contact: mohamednourbouali87@gmail.com)';
const DORAR = 'https://dorar.net';
export const HISTORY_SOURCE = 'الموسوعة التاريخية — الدرر السنية (dorar.net/history)، من المراجع المعتمدة في حزمة التحدي';
export const HISTORY_SOURCE_EN = 'The History Encyclopedia of Ad-Durar As-Saniyyah (dorar.net/history), an approved reference of the challenge pack';
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const plain = (h) => decode(String(h || '').replace(/<[^>]*>/g, ' ')).normalize('NFC').replace(/\s+/g, ' ').replace(/\s+([،.؛:)])/g, '$1').trim();

// the question without its question words: «متى كانت غزوة بدر» → «غزوة بدر», «من هو أول الخلفاء» → «أول الخلفاء»
const QWORDS = /(^|\s)(متى|متي|كانت|كان|وقعت|وقع|حدثت|حدث|من|هو|هي|هم|ما|ماذا|ماهي|ماهو|اين|أين|كيف|لماذا|في|عن|اي|أي|عام|سنة|سنه|تاريخ|قصة|قصه|حدثني|اخبرني|أخبرني)(?=\s|$)/g;
export function historyQuery(q) {
  let s = String(q || '').replace(/[؟?،,.!«»"]/g, ' ').replace(/[^؀-ۿ\s]/g, ' ').replace(/[ً-ْٰ]/g, '');
  // honorifics are not the subject; «توفي/مات» and «ولد» are titled «وفاة» and «ولادة» in the encyclopedia
  s = s.replace(/صلى الله عليه وسلم|عليه الصلاة والسلام|عليه السلام|عليها السلام|رضي الله عنهما|رضي الله عنهم|رضي الله عنها|رضي الله عنه/g, ' ')
    .replace(/(^|\s)(توفي|توفيت|مات|ماتت|وفاه)(?=\s|$)/g, '$1وفاة').replace(/(^|\s)(ولد|ولدت|مولد)(?=\s|$)/g, '$1ولادة');
  for (let k = 0; k < 2; k++) s = s.replace(QWORDS, ' ');
  return s.replace(/\s+/g, ' ').trim().slice(0, 60);
}

// search page → [{id, title, hijri, month, greg, text}]
export function parseHistorySearch(html) {
  const out = [], seen = new Set();
  const parts = String(html || '').split('<div class="event-container" data-event-id="').slice(1);
  for (const p of parts) {
    const id = +((p.match(/^(\d+)"/) || [])[1] || 0);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const title = plain((p.match(/<i class="fa fa-history[^"]*"[^>]*><\/i>([\s\S]*?)<\/div>/) || [])[1] || '').replace(/\s*\.\s*$/, '');
    const val = (label) => plain((p.match(new RegExp(label + '\\s*:\\s*<span class="primary-text-color">([\\s\\S]*?)<\\/span>')) || [])[1] || '');
    const body = (p.match(/تفاصيل الحدث:<\/h6>\s*<p>([\s\S]*?)<\/p>/) || [])[1] || '';
    const text = body.split(/<br\s*\/?>/i).map(plain).filter(x => x.replace(/\s/g, '').length > 3);
    if (!title || !text.length) continue;
    out.push({ id, title, hijri: val('العام الهجري'), month: val('الشهر القمري'), greg: val('العام الميلادي'), text, url: `${DORAR}/history/event/${id}` });
  }
  return out;
}
// a long event is cut at the end of a sentence (still the encyclopedia's own words; the link gives the rest)
export function excerpt(paras, max = 1400) {
  const out = []; let n = 0;
  for (const p of paras) {
    if (n + p.length <= max) { out.push(p); n += p.length; continue; }
    const cut = p.slice(0, Math.max(0, max - n)), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('، '), cut.lastIndexOf('.'));
    if (end > 120) out.push(cut.slice(0, end + 1) + ' …');
    return { paras: out, cut: true };
  }
  return { paras: out, cut: false };
}

export async function historySearch(body, env, fetchImpl = fetch) {
  const q0 = String(body && body.q || '').slice(0, 300);
  const kw = Array.isArray(body && body.kw) ? body.kw.map(w => String(w).replace(/[^؀-ۿ\s]/g, ' ').replace(/\s+/g, ' ').trim()).filter(w => w && w.length <= 30).slice(0, 3) : [];
  const hq = /[؀-ۿ]/.test(q0) ? historyQuery(q0) : '';
  // «النبي» is titled «رسول الله» in many events («وفاة رسول الله صلى الله عليه وسلم»): both are searched
  const alt = /(^|\s)(ال)?نبي(\s|$)/.test(hq) ? hq.replace(/(^|\s)(ال)?نبي(?=\s|$)/, '$1رسول الله') : '';
  // «أبو بكر» is written «أبي بكر» after «وفاة», «خلافة»… (the genitive of the titles)
  const abi = /(^|\s)أبو\s/.test(hq) ? hq.replace(/(^|\s)أبو(?=\s)/g, '$1أبي') : '';
  const qs = [...new Set([hq, alt, abi, kw.join(' '), ...kw].filter(s => s.replace(/\s/g, '').length >= 3))].slice(0, 5);
  if (!qs.length) return { ok: false, error: 'query too short' };
  // the encyclopedia's search in event TITLES (t=1): its default search (titles and details, oldest first) returns the
  // first 15 events of 1,027 for «فتح مكة», none of them the conquest of Mecca
  // all the words (st=w) in the title; the default «any word» search lists 15 events oldest first, and «وفاة النبي»
  // returned the deaths of his mother and grandfather — «any word» is only a second try when nothing came back
  const get = (q, st = 'w') => fetchImpl(`${DORAR}/history/search?t=1&st=${st}&q=${encodeURIComponent(q)}`, { headers: { 'user-agent': UA, accept: 'text/html' } })
    .then(r => { if (!r.ok) throw new Error(`dorar HTTP ${r.status}`); return r.text(); });
  let pages = await Promise.allSettled(qs.map(q => get(q)));
  if (!pages.some(p => p.status === 'fulfilled' && parseHistorySearch(p.value).length)) pages = await Promise.allSettled(qs.slice(0, 2).map(q => get(q, 'a')));
  if (pages.every(p => p.status === 'rejected')) throw pages[0].reason;
  const seen = new Set(); let items = [];
  for (const p of pages) if (p.status === 'fulfilled') for (const x of parseHistorySearch(p.value).slice(0, 30)) if (!seen.has(x.id)) { seen.add(x.id); items.push(x); }
  // the subject words must be in the event's TITLE (a battle named in passing in another event is not its subject):
  // the words of the question, or (a question in English, or one whose words are not in the titles) the AI's terms
  const subjects = [hq, kw.join(' '), ...kw].map(t => [...new Set(fiqhWords(t))]).filter(s => s.length);
  if (!subjects.length) return { ok: true, items: [], by: 'search', source: HISTORY_SOURCE, sourceEn: HISTORY_SOURCE_EN, url: `${DORAR}/history/search?q=${encodeURIComponent(qs[0])}` };
  // «النبي» = «رسول الله» = «محمد» in the titles («وفاة رسول الله صلى الله عليه وسلم»)
  const canon = (w) => (w === 'رسل' || w === 'محمد' ? 'نب' : w);
  for (const s of subjects) for (let k = 0; k < s.length; k++) s[k] = canon(s[k]);
  const cover = (tw) => subjects.reduce((best, s) => { const hit = s.filter(w => tw.has(w)).length, need = s.length <= 2 ? s.length : Math.ceil(s.length * 2 / 3); return hit >= need && hit / s.length > best ? hit / s.length : best; }, 0);
  items = items.map((x, k) => ({ x, k, hit: cover(new Set(fiqhWords(x.title).map(canon))) }))
    .filter(o => o.hit > 0).sort((a, b) => b.hit - a.hit || a.k - b.k).map(o => o.x).slice(0, 10);
  let by = 'search';
  if (items.length && body.ai !== false) {
    const keep = await pickRelevant(q0, items.map(x => `${x.title} (${x.hijri} هـ)`), env, { max: 2, what: 'event of the history encyclopedia', fetchImpl, task: 'select',
      strict: 'Keep an event ONLY if it is exactly the event, person or period asked about (e.g. the battle of Badr itself, not another battle where Badr is mentioned). When none matches, return {"keep":[]}.' }).catch(() => null);
    if (keep) { items = keep.map(i => items[i]); by = 'ai'; }
  }
  if (by === 'search') items = items.slice(0, 2);
  return { ok: true, items: items.map(x => { const e = excerpt(x.text); return { ...x, text: e.paras, cut: e.cut }; }), by, source: HISTORY_SOURCE, sourceEn: HISTORY_SOURCE_EN,
    url: `${DORAR}/history/search?q=${encodeURIComponent(qs[0])}` };
}
