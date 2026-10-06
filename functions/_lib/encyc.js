// T122 (6 Oct 2026): POST /api/encyc — the approved encyclopedias of Ad-Durar As-Saniyyah for questions of creed
// (dorar.net/aqeeda, read like the Fiqh Encyclopedia: functions/_lib/fiqh.js) and of Sira and history
// (dorar.net/history: functions/_lib/history.js). Same contract as /api/fatwa: {q, kw?} → items · {id} → one section.
import { fiqhSearch, fatwaQuery } from './fiqh.js';
import { historySearch } from './history.js';

// «ما هو التوحيد», "what is tawhid": the encyclopedia's DEFINITION section is searched too («تعريف التوحيد») — before, the
// search ranked a section on the evidence of one kind of tawhid first
const DEF = /(^|\s)(ما هو|ما هي|ماهو|ماهي|ما معنى|ما معني|معنى|معني|تعريف|عرف)(\s|$)|\bwhat (is|are)\b|\bmeaning of\b|\bdefine\b/i;
export function encycSearch(body, env, fetchImpl = fetch) {
  if (body && body.enc === 'history') return historySearch(body, env, fetchImpl);
  const b = { ...(body || {}), enc: 'aqeeda' };
  if (b.id == null && DEF.test(String(b.q || ''))) {
    const kw = Array.isArray(b.kw) ? b.kw.slice(0, 3) : [];
    const subj = /[؀-ۿ]/.test(String(b.q)) ? fatwaQuery(b.q).replace(/(^|\s)(هو|هي|معنى|معني|تعريف)(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim() : String(kw[0] || '');
    if (subj && subj.split(' ').length <= 3) b.kw = [...kw, 'تعريف ' + subj];
  }
  return fiqhSearch(b, env, fetchImpl);
}
