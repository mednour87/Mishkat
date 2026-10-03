// Khatma (reading the whole Quran) — a personal plan and its follow-up, computed in the browser.
// Plan: the 604 pages of the Madina Mushaf (Tanzil page boundaries, data/mushaf_meta.json) spread over
// the chosen number of days, each day split over the reader's moments (after Fajr, before sleeping…);
// when days are missed, the rest is spread again over the days left (automatic catch-up).
// Follow-up: the verses marked as read (a bitset kept in this browser only), whole surahs read,
// pages/verses/words, days of reading in a row. Reminders: an .ics calendar file (one event per
// moment and per day), which every phone calendar imports — no server, no account.
// Pure functions: the page keeps the state (localStorage) and draws the panel.

export const N_VERSES = 6236, N_PAGES = 604;
const DAY = 86400000;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const dayIndex = (start, date) => Math.round((midnight(date) - midnight(new Date(start))) / DAY);

// ---------------------------------------------------------------- read verses (bitset)
export function newRead() { return new Uint8Array(Math.ceil(N_VERSES / 8)); }
export const isRead = (bits, i) => (bits[i >> 3] >> (i & 7)) & 1;
export function markRead(bits, from, to = from) { for (let i = Math.max(0, from); i <= Math.min(N_VERSES - 1, to); i++) bits[i >> 3] |= 1 << (i & 7); return bits; }
export function unmarkRead(bits, from, to = from) { for (let i = Math.max(0, from); i <= Math.min(N_VERSES - 1, to); i++) bits[i >> 3] &= ~(1 << (i & 7)); return bits; }
export function countRead(bits, from = 0, to = N_VERSES - 1) { let n = 0; for (let i = from; i <= to; i++) n += isRead(bits, i); return n; }
export function encodeRead(bits) { let s = ''; for (const b of bits) s += String.fromCharCode(b); return btoa(s); }
export function decodeRead(str) { const out = newRead(); try { const s = atob(str || ''); for (let i = 0; i < Math.min(s.length, out.length); i++) out[i] = s.charCodeAt(i); } catch (e) { /* corrupted → empty */ } return out; }

// ---------------------------------------------------------------- pages
// pageStarts: index of the first verse of each page (604). Verses of page p (1-based): [start, end]
export function pageRange(pageStarts, p) { return [pageStarts[p - 1], p < N_PAGES ? pageStarts[p] - 1 : N_VERSES - 1]; }
export function pageOf(pageStarts, i) { let lo = 0, hi = N_PAGES - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (pageStarts[m] <= i) lo = m; else hi = m - 1; } return lo + 1; }
// a page counts as read when all its verses are read
export function pagesRead(bits, pageStarts) { let n = 0; for (let p = 1; p <= N_PAGES; p++) { const [a, b] = pageRange(pageStarts, p); if (countRead(bits, a, b) === b - a + 1) n++; } return n; }
export function firstUnreadPage(bits, pageStarts) { for (let p = 1; p <= N_PAGES; p++) { const [a, b] = pageRange(pageStarts, p); if (countRead(bits, a, b) < b - a + 1) return p; } return null; }

// ---------------------------------------------------------------- plan
// plan = { start: 'YYYY-MM-DD', days, moments: [{ id, label, time:'HH:MM' }] }
// today's portion = (pages left) / (days left), from the first unread page, split over the moments
export function todayPortion(plan, bits, pageStarts, date = new Date()) {
  const k = dayIndex(plan.start, date);
  const daysLeft = Math.max(1, plan.days - Math.max(0, k));
  const done = pagesRead(bits, pageStarts), left = N_PAGES - done;
  if (left <= 0) return { finished: true, day: k + 1, daysLeft: 0, pages: 0, parts: [] };
  const from = firstUnreadPage(bits, pageStarts);
  const per = Math.ceil(left / daysLeft), to = Math.min(N_PAGES, from + per - 1);
  const ms = plan.moments && plan.moments.length ? plan.moments : [{ id: 'any', label: '', time: '' }];
  // split the day's pages over the moments as evenly as possible
  const parts = [], n = to - from + 1;
  let p = from;
  ms.forEach((m, j) => {
    const cnt = Math.floor(n / ms.length) + (j < n % ms.length ? 1 : 0);
    if (cnt > 0) { parts.push({ moment: m, from: p, to: p + cnt - 1, verses: [pageRange(pageStarts, p)[0], pageRange(pageStarts, p + cnt - 1)[1]] }); p += cnt; }
  });
  const expected = Math.min(N_PAGES, Math.round(N_PAGES * Math.min(plan.days, Math.max(0, k)) / plan.days));
  return { finished: false, day: k + 1, daysLeft, pagesPerDay: per, from, to, pages: n, parts, done, left, behind: Math.max(0, expected - done) };
}

// surahs whose every verse is read (shown green in the list and on the galaxy)
export function surasRead(bits, suras) { return suras.filter(s => countRead(bits, s.first, s.first + s.ayas - 1) === s.ayas).map(s => s.n); }

// days in a row with at least one verse read, from a log { 'YYYY-MM-DD': versesRead }
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function streak(log, date = new Date()) {
  let n = 0, d = midnight(date);
  if (!log[ymd(d)]) d = new Date(d - DAY);            // today not read yet: the streak is still alive
  while (log[ymd(d)] > 0) { n++; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); }
  return n;
}

// ---------------------------------------------------------------- .ics reminders
const icsEsc = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\r?\n/g, '\\n');
const stamp = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
// one event per moment and per day (the portion of each day is in its text), local "floating" times
export function planToIcs(plan, pageStarts, { title = 'Mishkat', describe = (part) => `${part.from}–${part.to}`, url = '' } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mishkat//Khatma//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const start = new Date(plan.start + 'T00:00:00'), now = new Date();
  const per = N_PAGES / plan.days;
  const ms = (plan.moments || []).filter(m => /^\d{1,2}:\d{2}$/.test(m.time || ''));
  for (let k = 0; k < plan.days; k++) {
    const from = Math.floor(k * per) + 1, to = Math.max(from, Math.floor((k + 1) * per));
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k), n = to - from + 1;
    let p = from;
    ms.forEach((m, j) => {
      const cnt = Math.floor(n / ms.length) + (j < n % ms.length ? 1 : 0);
      if (cnt <= 0) return;
      const part = { from: p, to: p + cnt - 1, moment: m, day: k + 1 };
      p += cnt;
      const [hh, mm] = m.time.split(':').map(Number);
      const t = `${stamp(day)}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
      lines.push('BEGIN:VEVENT', `UID:mishkat-khatma-${plan.start}-${k}-${j}@mishkat`, `DTSTAMP:${stamp(now)}T000000Z`, `DTSTART:${t}`, 'DURATION:PT20M',
        `SUMMARY:${icsEsc(title + ' — ' + describe(part))}`, ...(url ? [`URL:${url}`] : []),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${icsEsc(describe(part))}`, 'END:VALARM', 'END:VEVENT');
    });
  }
  lines.push('END:VCALENDAR');
  // lines of at most 75 octets (RFC 5545 folding), CRLF
  return lines.map(fold).join('\r\n') + '\r\n';
}
function fold(line) {
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return line;
  const out = []; let cur = '';
  for (const ch of line) { if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ''; } cur += ch; }
  out.push(cur);
  return out.join('\r\n ');
}
