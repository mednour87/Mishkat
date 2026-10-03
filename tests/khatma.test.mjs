// T063: khatma plan on the real Tanzil page boundaries (604 pages), catch-up, surahs completed (green on the
// galaxy), stats, and a valid .ics file (RFC 5545: CRLF, lines of at most 75 octets, one event per moment/day).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './load.mjs';
import { N_PAGES, N_VERSES, newRead, markRead, countRead, encodeRead, decodeRead, pageRange, pageOf, pagesRead, todayPortion, surasRead, streak, planToIcs } from '../public/js/khatma.js';

const core = readJson('core.json');
const pages = readJson('mushaf_meta.json').pages;
const plan = (days, start = '2026-10-03', moments = [{ id: 'fajr', label: 'After Fajr', time: '05:30' }, { id: 'night', label: 'Before sleeping', time: '22:00' }]) => ({ start, days, moments });

test('khatma: Tanzil pages cover the 6,236 verses in order', () => {
  assert.equal(pages.length, N_PAGES);
  assert.equal(pages[0], 0);
  assert.deepEqual(pageRange(pages, 1), [0, 6]);                   // al-Fatiha is page 1
  assert.equal(pageRange(pages, N_PAGES)[1], N_VERSES - 1);
  for (let p = 2; p <= N_PAGES; p++) assert.ok(pages[p - 1] > pages[p - 2]);
  assert.equal(pageOf(pages, 7), 2);                                // 2:1
});

test('khatma: a 30-day plan gives about 20 pages a day split over the moments; missed days are caught up', () => {
  const bits = newRead();
  const d1 = todayPortion(plan(30), bits, pages, new Date(2026, 9, 3));
  assert.equal(d1.day, 1); assert.equal(d1.from, 1); assert.equal(d1.pages, 21);
  assert.equal(d1.parts.length, 2); assert.equal(d1.parts[0].from, 1); assert.equal(d1.parts[1].to, 21);
  // nothing read for 10 days: the rest is spread over the 20 days left
  const d11 = todayPortion(plan(30), bits, pages, new Date(2026, 9, 13));
  assert.equal(d11.daysLeft, 20); assert.equal(d11.pagesPerDay, Math.ceil(604 / 20)); assert.ok(d11.behind > 190);
  // the first portion read: tomorrow starts after it
  const [a, b] = [pageRange(pages, 1)[0], pageRange(pages, 21)[1]];
  markRead(bits, a, b);
  assert.equal(pagesRead(bits, pages), 21);
  assert.equal(todayPortion(plan(30), bits, pages, new Date(2026, 9, 4)).from, 22);
});

test('khatma: surahs completed, read verses survive the browser storage, finished plan', () => {
  const bits = newRead();
  markRead(bits, 0, 6);                                             // al-Fatiha
  const ikhlas = core.suras[111];
  markRead(bits, ikhlas.first, ikhlas.first + ikhlas.ayas - 2);     // al-Ikhlas but its last verse
  assert.deepEqual(surasRead(bits, core.suras), [1]);
  markRead(bits, ikhlas.first + ikhlas.ayas - 1);
  assert.deepEqual(surasRead(bits, core.suras), [1, 112]);
  assert.equal(countRead(decodeRead(encodeRead(bits))), 7 + ikhlas.ayas);
  const all = markRead(newRead(), 0, N_VERSES - 1);
  assert.equal(todayPortion(plan(30), all, pages).finished, true);
  assert.equal(surasRead(all, core.suras).length, 114);
});

test('khatma panel: Arabic counted nouns agree with the number («٧ أيام», not «٧ يومًا»)', async () => {
  const { arCount, S } = await import('../public/js/toolpanels.js');
  const D = ['يوم واحد', 'يومان', 'أيام', 'يومًا', 'يوم'];
  assert.equal(arCount(1, D), 'يوم واحد'); assert.equal(arCount(2, D), 'يومان');
  assert.equal(arCount(7, D), '٧ أيام'); assert.equal(arCount('١٠', D), '١٠ أيام');
  assert.equal(arCount(30, D), '٣٠ يومًا'); assert.equal(arCount(100, D), '١٠٠ يوم');
  assert.equal(S.ar.kDaysN('٧'), '٧ أيام');
  assert.equal(S.ar.hIn(2), 'بعد يومين'); assert.equal(S.ar.hIn(5), 'بعد ٥ أيام'); assert.equal(S.ar.hIn(45), 'بعد ٤٥ يومًا');
  assert.match(S.ar.kBehind('٣'), /^فاتك ٣ صفحات:/);
  assert.match(S.en.kBehind('1'), /^1 page behind/);
});

test('khatma: days in a row', () => {
  const now = new Date(2026, 9, 3);
  assert.equal(streak({ '2026-10-01': 3, '2026-10-02': 5, '2026-10-03': 1 }, now), 3);
  assert.equal(streak({ '2026-10-01': 3, '2026-10-02': 5 }, now), 2, 'today not read yet: the streak is still alive');
  assert.equal(streak({ '2026-09-30': 3 }, now), 0);
});

test('khatma: the .ics reminders are a valid calendar (CRLF, folded lines, one event per moment and day)', () => {
  const ics = planToIcs(plan(7), pages, { title: 'مشكاة — وِرد الختمة', describe: (p) => `${p.moment.label}: الصفحات ${p.from}–${p.to} (اليوم ${p.day})`, url: 'https://example.org/' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'every line ends with CRLF');
  const enc = new TextEncoder();
  for (const line of ics.split('\r\n')) assert.ok(enc.encode(line).length <= 75, 'line longer than 75 octets: ' + line);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 14);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 14);
  assert.match(ics, /DTSTART:20261003T053000/);
  assert.match(ics, /DTSTART:20261009T220000/);
  // the 7 days together cover the 604 pages
  const unfolded = ics.replace(/\r\n /g, '');
  assert.match(unfolded, /الصفحات 1–/); assert.match(unfolded, /–604 \(اليوم 7\)/);
});
