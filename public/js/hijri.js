// Hijri calendar without any server: the browser's own Umm al-Qura calendar (Intl, `islamic-umalqura`),
// with a local adjustment of ± 2 days (the start of a month follows the moon sighting announced in each
// country). Conversion both ways, and a REVIEWED list of remarkable days, each backed by an authentic
// hadith of HadeethEnc (shown verbatim with its grade by the page) or a verse — nothing else.
// Not listed: commemorations whose date or practice is disputed (al-Isra' wal-Mi'raj, the mawlid…);
// the «holidays» list of other calendar APIs is never shown (it contains Sufi commemorations).

const FMT = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
const DAY = 86400000;

// gregorian Date (local day) → { y, m, d } Hijri; adjust in days (+1 = the month started one day later here)
export function toHijri(date = new Date(), adjust = 0) {
  const t = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - adjust * DAY;
  const p = Object.fromEntries(FMT.formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return { y: parseInt(p.year, 10), m: parseInt(p.month, 10), d: parseInt(p.day, 10) };
}

// { y, m, d } Hijri → gregorian Date (local midnight); null if that day does not exist in Umm al-Qura
export function toGregorian(y, m, d, adjust = 0) {
  // first estimate from the mean lengths, then walk day by day (at most a few steps)
  const est = Date.UTC(622, 6, 16) + Math.round(((y - 1) * 354.36707 + (m - 1) * 29.530589 + (d - 1)) * DAY);
  const key = (h) => h.y * 400 + h.m * 31 + h.d, want = y * 400 + m * 31 + d;
  let t = est;
  for (let i = 0; i < 60; i++) {
    const g = new Date(t), h = toHijri(new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate()), 0), k = key(h);
    if (k === want) { const r = new Date(t + adjust * DAY); return new Date(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate()); }
    t += (k < want ? 1 : -1) * DAY * (Math.abs(k - want) > 40 ? 15 : 1);
  }
  return null;
}

export const MONTHS = {
  ar: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'],
  en: ['Muharram', 'Safar', 'Rabi‘ al-Awwal', 'Rabi‘ al-Akhir', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Sha‘ban', 'Ramadan', 'Shawwal', 'Dhu al-Qa‘dah', 'Dhu al-Hijjah'],
};

// m/d = Hijri month/day; `days` = length of the period; `had` = HadeethEnc ids (the page shows the text,
// grade and link); `refs` = verses. Text here is only a short title (ar + en), not religious content.
export const REMARKABLE = [
  { id: 'ramadan', m: 9, d: 1, days: 30, ar: 'شهر رمضان', en: 'The month of Ramadan', had: [4196], refs: ['2:183', '2:185'] },
  { id: 'lastten', m: 9, d: 21, days: 10, ar: 'العشر الأواخر من رمضان وليلة القدر', en: 'The last ten nights of Ramadan and Laylat al-Qadr', had: [3755, 4202], refs: ['97:1', '97:3'] },
  { id: 'fitr', m: 10, d: 1, days: 1, ar: 'عيد الفطر', en: 'Eid al-Fitr', had: [4527, 65523], refs: [] },
  { id: 'dhulhijja', m: 12, d: 1, days: 10, ar: 'العشر الأوائل من ذي الحجة', en: 'The first ten days of Dhu al-Hijjah', had: [6255], refs: [] },
  { id: 'arafah', m: 12, d: 9, days: 1, ar: 'يوم عرفة', en: 'The Day of ‘Arafah', had: [65874], refs: [] },
  { id: 'adha', m: 12, d: 10, days: 1, ar: 'عيد الأضحى', en: 'Eid al-Adha', had: [4527], refs: [] },
  { id: 'tasua', m: 1, d: 9, days: 1, ar: 'تاسوعاء', en: 'Tasu‘a (9 Muharram)', had: [6217], refs: [] },
  { id: 'ashura', m: 1, d: 10, days: 1, ar: 'عاشوراء', en: '‘Ashura (10 Muharram)', had: [10121, 65874], refs: [] },
];
export const MONTHLY = { id: 'white', days: [13, 14, 15], ar: 'الأيام البيض (13، 14، 15 من كل شهر)', en: 'The white days (13th, 14th, 15th of each month)', had: [10108] };
export const WEEKLY = { id: 'monthu', weekdays: [1, 4], ar: 'صيام الاثنين والخميس', en: 'Fasting on Mondays and Thursdays', had: [5908] };
// a few events are asked under another name
const ALIAS = { eid: 'fitr' };

const midnight = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / DAY);

// next occurrence (or current one) of a remarkable day; { ...event, start, end, inDays, ongoing }
export function nextEvent(id, from = new Date(), adjust = 0) {
  const ev = REMARKABLE.find(e => e.id === (ALIAS[id] || id));
  if (!ev) return null;
  const h = toHijri(from, adjust);
  for (const y of [h.y - 1, h.y, h.y + 1]) {
    const start = toGregorian(y, ev.m, ev.d, adjust);
    if (!start) continue;
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + ev.days - 1);
    if (daysBetween(from, end) >= 0) return { ...ev, hy: y, start, end, inDays: Math.max(0, daysBetween(from, start)), ongoing: daysBetween(from, start) <= 0 };
  }
  return null;
}

// the next remarkable days from a date, nearest first (the year's list)
export function upcoming(from = new Date(), adjust = 0, n = 8) {
  return REMARKABLE.map(e => nextEvent(e.id, from, adjust)).filter(Boolean).sort((a, b) => a.start - b.start).slice(0, n);
}

// the white days of the current or next Hijri month
export function nextWhiteDays(from = new Date(), adjust = 0) {
  const h = toHijri(from, adjust);
  for (const [y, m] of [[h.y, h.m], h.m === 12 ? [h.y + 1, 1] : [h.y, h.m + 1]]) {
    const start = toGregorian(y, m, 13, adjust);
    if (start && daysBetween(from, new Date(start.getFullYear(), start.getMonth(), start.getDate() + 2)) >= 0) return { start, inDays: Math.max(0, daysBetween(from, start)), hy: y, hm: m };
  }
  return null;
}

export function formatHijri({ y, m, d }, lang = 'ar') {
  const n = (x) => lang === 'ar' ? String(x).replace(/\d/g, c => '٠١٢٣٤٥٦٧٨٩'[c]) : String(x);
  return lang === 'ar' ? `${n(d)} ${MONTHS.ar[m - 1]} ${n(y)} هـ` : `${d} ${MONTHS.en[m - 1]} ${y} AH`;
}
