// Published fatwas (level د of the challenge's reference pack): Mishkat never issues a ruling.
// It shows fatwas ALREADY PUBLISHED by recognised scholars, verbatim, with their link:
//   binbaz.org.sa — official site of Sheikh Abd al-Aziz ibn Baz (d. 1420 AH), Grand Mufti of
//   Saudi Arabia, head of the Council of Senior Scholars and of the Permanent Committee for
//   Scholarly Research and Ifta. Its own search service (/api/search) is queried; the fatwa page
//   is reduced to plain text (question, answer, audio file of the Sheikh when published).
// An AI model may only REORDER/FILTER the search results (closed list of numbers); it never
// writes text. Every card says it is a published fatwa, not an answer to the reader's own case.
import { pickRelevant } from './selector.js';

const UA = 'Mishkat/1.0 (Islamic AI Challenge - Quran search; contact: mohamednourbouali87@gmail.com)';
const BINBAZ = 'https://binbaz.org.sa';
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const plain = (h) => decode(String(h || '').replace(/<[^>]*>/g, ' ')).replace(/[ \t ]+/g, ' ').trim();

// what the reader asked, without the ruling words («ما حكم», «هل يجوز»…): the search service
// matches words, and these words are in every fatwa
const RULING = /(^|\s)(ما|وما|هل|فما)?\s*(حكم|الحكم في|يجوز|يحل|يحرم|حرام|حلال|جائز|مشروع|مشروعية|فتوى|فتاوى|افتوني|افتني|الشرع في|رأي الدين في|رأي الشرع في|في الإسلام|في الاسلام|شرعا|شرعًا)(\s|$)/g;
export function fatwaQuery(q) {
  let s = String(q || '').replace(/[؟،؛«»]/g, ' ').replace(/[^؀-ۿ\s]/g, ' ').replace(/[ً-ْٰ]/g, '');
  for (let k = 0; k < 3; k++) s = s.replace(RULING, ' ');
  s = s.replace(/(^|\s)(ما|هل|في|عن|من|على|إلى|الى|أن|ان|او|أو)(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  return s.slice(0, 80);
}

const linkOf = (id) => `${BINBAZ}/fatwas/${id}`;

async function searchBinbaz(q, operator, fetchImpl) {
  const url = `${BINBAZ}/api/search?q=${encodeURIComponent(q)}&type=fatwa&operator=${operator}&page=1`;
  const r = await fetchImpl(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!r.ok) throw new Error(`binbaz HTTP ${r.status}`);
  const j = await r.json();
  const S = (j && j.Search) || {};
  return { total: +S.total || 0, items: (S.results || []).map(x => ({
    id: x.id, title: plain(x.title), snippet: plain(((x.searchHighlights || {}).description || [])[0] || '').slice(0, 260), url: linkOf(x.id),
  })).filter(x => x.id && x.title) };
}

// one fatwa page → {title, question, answer[], audio}
export function parseBinbazFatwa(html) {
  const h = String(html || '');
  const title = plain((h.match(/<h1 class="article-title[^"]*">([\s\S]*?)<\/h1>/) || [])[1] || '');
  const qm = h.match(/article-title__question[^>]*>([\s\S]*?)<\/h2>/);
  const question = qm ? plain(qm[1]).replace(/^السؤال\s*:\s*/, '') : '';
  const am = h.match(/<div itemprop="articleBody" class="article-content">([\s\S]*?)<\/div>/);
  const answer = am ? am[1].split(/<\/p>|<br\s*\/?>/i).map(plain).filter(Boolean) : [];
  if (answer.length && /^الجواب\s*:?$/.test(answer[0])) answer.shift();
  const audio = (h.match(/https:\\?\/\\?\/files\.zadapps\.info[^"&\s]+?\.mp3/) || [])[0];
  return { title, question, answer, audio: audio ? audio.replace(/\\\//g, '/') : null };
}

export async function fatwaSearch(body, env, fetchImpl = fetch) {
  // a single fatwa, in full
  if (body && body.id != null) {
    const id = +body.id;
    if (!Number.isInteger(id) || id < 1 || id > 1e7) return { ok: false, error: 'bad id' };
    const r = await fetchImpl(linkOf(id), { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
    if (!r.ok) return { ok: false, error: `binbaz HTTP ${r.status}` };
    const f = parseBinbazFatwa(await r.text());
    if (!f.answer.length) return { ok: false, error: 'no answer found on the page' };
    return { ok: true, id, ...f, answer: f.answer.slice(0, 80).map(p => p.slice(0, 3000)), url: r.url || linkOf(id),
      mufti: 'الشيخ عبد العزيز بن باز', source: 'الموقع الرسمي لسماحة الشيخ ابن باز — binbaz.org.sa' };
  }
  // search
  const q0 = String(body && body.q || '').slice(0, 300);
  const q = fatwaQuery(q0);
  if (q.replace(/\s/g, '').length < 3) return { ok: false, error: 'query too short' };
  let res = await searchBinbaz(q, 'AND_ONLY', fetchImpl);
  if (res.items.length < 3 && q.includes(' ')) {
    const or = await searchBinbaz(q, 'OR', fetchImpl);
    const seen = new Set(res.items.map(x => x.id));
    res = { total: res.total + or.total, items: res.items.concat(or.items.filter(x => !seen.has(x.id))) };
  }
  let items = res.items.slice(0, 10), by = 'search';
  if (items.length > 1 && body.ai !== false) {
    const keep = await pickRelevant(q0, items.map(x => `${x.title} — ${x.snippet}`), env, { max: 4, what: 'fatwa', fetchImpl }).catch(() => null);
    if (keep) { items = keep.map(i => items[i]); by = 'ai'; }
  }
  if (by === 'search') items = items.slice(0, 4);
  return { ok: true, q, total: res.total, items, by, source: 'الموقع الرسمي لسماحة الشيخ ابن باز — binbaz.org.sa',
    url: `${BINBAZ}/search?q=${encodeURIComponent(q)}` };
}
