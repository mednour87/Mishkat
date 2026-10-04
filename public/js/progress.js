// T095–T096 — the visitor's progress, kept in this browser only (prefs.js), never sent anywhere:
//   · monthly percentages: Quran read this month in the reader, and verses repeated to the end in the
//     repetition (tekrar) mode — both start again at the beginning of each month; the count of khatmas stays;
//   · two weekly bars (last 7 days) tied to the rewards: verses read, verses repeated;
//   · an encouraging mark out of 10 that starts at 7 and only grows with perseverance, time given, regularity
//     and engagement — never a bad mark;
//   · three levels of engagement, each with a positive name taken from the verse of light (24:35).
// Pure functions (the tests import them); the page saves the prefs.
import { N_VERSES, newRead, isRead, markRead, countRead, encodeRead, decodeRead, ymd } from './khatma.js';

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// the monthly counters start again with a new month (the khatma count and the all-time bits stay)
export function rollMonth(P, now = new Date()) {
  const m = monthKey(now);
  if (P.month !== m) { P.month = m; P.mRead = ''; P.mHifz = ''; return true; }
  return false;
}

// a verse read in the reader (recited to its end or read by scrolling): monthly bits
export function noteRead(P, i, now = new Date()) {
  rollMonth(P, now);
  const b = decodeRead(P.mRead);
  if (isRead(b, i)) return false;
  markRead(b, i); P.mRead = encodeRead(b);
  return true;
}

// a khatma is complete when every verse is read: the count grows, the bits start again for the next one
export function checkKhatma(P) {
  const b = decodeRead(P.read);
  if (countRead(b) < N_VERSES) return false;
  P.khatmas = (P.khatmas || 0) + 1;
  P.read = encodeRead(newRead());
  if (P.khatma) P.khatma = { ...P.khatma, active: false };
  return true;
}

// a unit of verses repeated to the end in the tekrar mode
export function noteTekrar(P, { from, to, reps, sec, calm = reps }, now = new Date()) {
  rollMonth(P, now);
  const m = decodeRead(P.mHifz), all = decodeRead(P.hifz);
  markRead(m, from, to); markRead(all, from, to);
  P.mHifz = encodeRead(m); P.hifz = encodeRead(all);
  const k = ymd(now);
  P.tk = P.tk || {}; P.tk.log = P.tk.log || {};
  const d = P.tk.log[k] || { reps: 0, ayas: 0, sec: 0, units: 0, calm: 0 };
  d.reps += reps; d.ayas += to - from + 1; d.sec += Math.round(sec || 0); d.units += 1; d.calm += calm;
  P.tk.log[k] = d;
  // keep 120 days of daily lines
  const keys = Object.keys(P.tk.log).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - 120))) delete P.tk.log[old];
}
export function noteSession(P, now = new Date()) {
  const k = ymd(now);
  P.tk = P.tk || {}; P.tk.log = P.tk.log || {};
  const d = P.tk.log[k] || { reps: 0, ayas: 0, sec: 0, units: 0, calm: 0 };
  d.sessions = (d.sessions || 0) + 1;
  P.tk.log[k] = d;
}

export function monthPct(P, now = new Date()) {
  const same = P.month === monthKey(now);
  return { read: same ? 100 * countRead(decodeRead(P.mRead)) / N_VERSES : 0, hifz: same ? 100 * countRead(decodeRead(P.mHifz)) / N_VERSES : 0 };
}

const lastDays = (n, now = new Date()) => Array.from({ length: n }, (_, k) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - k)));

// last 7 days, against goals: reading follows the khatma plan when there is one
export function weekly(P, now = new Date()) {
  const days = lastDays(7, now), log = P.log || {}, tk = (P.tk && P.tk.log) || {};
  const read = days.reduce((s, d) => s + (log[d] || 0), 0);
  const ayas = days.reduce((s, d) => s + ((tk[d] && tk[d].ayas) || 0), 0);
  const planDaily = P.khatma && P.khatma.active && P.khatma.days ? Math.ceil(N_VERSES / P.khatma.days) : 20;
  const goals = P.goals || {};
  const readGoal = Math.max(7, goals.read || planDaily * 7), tkGoal = Math.max(3, goals.tekrar || 21);
  return { read, readGoal, readF: Math.min(1, read / readGoal), ayas, tkGoal, tkF: Math.min(1, ayas / tkGoal) };
}

const active = (P, d) => ((P.log || {})[d] || 0) > 0 || !!((P.tk && P.tk.log && P.tk.log[d]) && P.tk.log[d].units);

// consecutive active days ending today (or yesterday, so the day is not lost before it starts)
export function activeStreak(P, now = new Date()) {
  const days = lastDays(400, now);
  let k = active(P, days[0]) ? 0 : 1, n = 0;
  while (k < days.length && active(P, days[k])) { n++; k++; }
  return n;
}

// the mark: 7 at the start, up to 10 — perseverance (streak), time given (minutes over 7 days), regularity
// (active days over 7) and engagement (units repeated to the end + verses read), each 0..1
export function rewardScore(P, now = new Date()) {
  const days = lastDays(7, now), tk = (P.tk && P.tk.log) || {}, log = P.log || {};
  const minutes = days.reduce((s, d) => s + ((tk[d] && tk[d].sec) || 0), 0) / 60 + days.reduce((s, d) => s + (log[d] || 0), 0) * 0.1;
  const units = days.reduce((s, d) => s + ((tk[d] && tk[d].units) || 0), 0), verses = days.reduce((s, d) => s + (log[d] || 0), 0);
  const parts = {
    perseverance: Math.min(1, activeStreak(P, now) / 7),
    time: Math.min(1, minutes / 70),
    regularity: days.filter(d => active(P, d)).length / 7,
    engagement: Math.min(1, units / 10 + verses / 300),
  };
  const v = 7 + 3 * (0.3 * parts.perseverance + 0.25 * parts.time + 0.2 * parts.regularity + 0.25 * parts.engagement);
  return { score: Math.round(Math.min(10, Math.max(7, v)) * 10) / 10, parts, minutes: Math.round(minutes) };
}

// engagement over 28 days → level 1..3 (all positive) and the position inside the level (0..1)
export const LEVEL_POINTS = [0, 30, 90];
export function engagement(P, now = new Date()) {
  const days = lastDays(28, now), tk = (P.tk && P.tk.log) || {}, log = P.log || {};
  const activeDays = days.filter(d => active(P, d)).length;
  const minutes = days.reduce((s, d) => s + ((tk[d] && tk[d].sec) || 0), 0) / 60;
  const units = days.reduce((s, d) => s + ((tk[d] && tk[d].units) || 0), 0);
  const verses = days.reduce((s, d) => s + (log[d] || 0), 0);
  const points = activeDays * 2 + minutes / 10 + units * 3 + verses / 20 + (P.khatmas || 0) * 10;
  const level = points >= LEVEL_POINTS[2] ? 3 : points >= LEVEL_POINTS[1] ? 2 : 1;
  const lo = LEVEL_POINTS[level - 1], hi = level < 3 ? LEVEL_POINTS[level] : LEVEL_POINTS[2] * 2;
  // the last 28 days, oldest first, for the map (0..1 each)
  const daily = days.slice().reverse().map(d => Math.min(1, ((log[d] || 0) / 40) + (((tk[d] && tk[d].sec) || 0) / 900)));
  return { level, points: Math.round(points), within: Math.min(1, (points - lo) / (hi - lo)), activeDays, minutes: Math.round(minutes), units, verses, daily };
}

// surah fractions of the all-time tekrar bits (for the 3D map and the galaxy)
export function hifzProgress(P, suras) {
  const b = decodeRead(P.hifz);
  return suras.map(s => countRead(b, s.first, s.first + s.ayas - 1) / s.ayas);
}

// the minimal time before the next repetition counts: 70 % of the reciter's time for the same verses
// (a verse read by the sheikh in 20 s → 14 s), never under 2 s; without timings, about 0.45 s per word
export function minRepeatMs(reciterMs, words = 0) {
  const base = reciterMs > 0 ? reciterMs : words * 450;
  return Math.max(2000, Math.round(base * 0.7));
}

// ------------------------------------------------------------------ texts (ar + en): only encouragement
export const LEVELS = {
  ar: [
    { name: 'غَرْسة مباركة', desc: 'بداية طيبة: كل آية تقرؤها أو تكررها تسقي هذه الغرسة.' },
    { name: 'زيتونة مباركة', desc: 'التزام جميل يكبر يومًا بعد يوم، فهنيئًا لك.' },
    { name: 'كوكب دُرّي', desc: 'نور على نور: التزام مضيء، بارك الله فيك.' },
  ],
  en: [
    { name: 'Blessed sapling', desc: 'A good beginning: every verse you read or repeat waters this sapling.' },
    { name: 'Blessed olive tree', desc: 'A lovely commitment that grows day after day — well done.' },
    { name: 'Shining star', desc: 'Light upon light: a radiant commitment, may Allah bless you.' },
  ],
};
export const CHEERS = {
  ar: ['أحسنت! واصل', 'ما شاء الله، تكرار جميل', 'بارك الله فيك', 'ثبّتك الله', 'خطوة بعد خطوة', 'رائع! الهدوء في التكرار يثبّت الحفظ', 'نور على نور'],
  en: ['Well done! Keep going', 'Beautiful repetition', 'May Allah bless you', 'Step by step', 'Great — a calm pace fixes the memory', 'Light upon light', 'You are doing great'],
};
export function scoreWords(score, lang = 'ar') {
  const ar = lang === 'ar';
  if (score >= 9.5) return ar ? 'ممتاز — التزام مضيء' : 'Excellent — a radiant commitment';
  if (score >= 8.5) return ar ? 'رائع جدًّا — استمر' : 'Very good — keep it up';
  if (score >= 7.5) return ar ? 'جيد جدًّا — أنت على الطريق' : 'Good — you are on the way';
  return ar ? 'بداية مباركة — كل يوم يضيف نورًا' : 'A blessed start — each day adds light';
}
