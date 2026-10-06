// T123 (6 Oct 2026, author's requests): practical fiqh from the Fiqh Encyclopedia's own headings, the last Names of
// Allah audible, the slow thin sweep of the galaxy, the pure view (logo, way back, ray from the last word), reminders
// on the phone and the computer, the muezzins named without «أذان».
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { practicalTopic, findSection, practicalHtml } from '../public/js/fiqhpractical.js';
import { encycKinds } from '../public/js/encyc.js';
import { reminders, remindersIcs, NOTIFY_DEFAULTS } from '../public/js/notify.js';
import { ADHAN_VOICES } from '../public/js/practical.js';

const toc = JSON.parse(readFileSync('public/data/feqhia_toc.json', 'utf8'));
const bare = (s) => s.replace(/[ً-ٰ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');

test('practical questions are recognised; ruling questions and plain subjects are not', () => {
  for (const q of ['شروط الصلاة', 'ما هي شروط الصلاة؟', 'كيف أتوضأ', 'نواقض الوضوء', 'مفسدات الصيام', 'أركان الحج', 'كيف أصلي', 'مبطلات الصلاة', 'how to perform wudu', 'what are the conditions of prayer'])
    assert.ok(practicalTopic(q), q);
  for (const q of ['ما حكم صلاة الجماعة', 'هل يجوز الفطر للمسافر', 'الصلاة', 'الصبر', 'ماذا يقول القرآن عن بر الوالدين'])
    assert.equal(practicalTopic(q), null, q);
});

test('the index of the encyclopedia covers the worship books, with headings and numbers only', () => {
  assert.ok(toc.nodes.length > 300, 'sections: ' + toc.nodes.length);
  const ids = new Set(toc.nodes.map(n => n.id));
  for (const n of toc.nodes) { assert.ok(Number.isInteger(n.id) && n.t && n.t.length < 300); if (n.p) assert.ok(ids.has(n.p), 'parent ' + n.p); }
});

test('each practical question reaches the section whose heading names its subject and aspect', () => {
  const cases = [
    ['شروط الصلاة', /شروط الصلاه/], ['نواقض الوضوء', /نواقض الوضوء/], ['كيف أتوضأ', /الوضوء/], ['مفسدات الصيام', /مفسدات الصيام/],
    ['أركان الصيام', /اركان الصيام/], ['كيف أصلي', /صفه الصلاه/], ['what are the conditions of prayer', /شروط الصلاه/], ['شروط الوضوء', /شروط الوضوء/],
  ];
  for (const [q, re] of cases) {
    const hit = findSection(toc, q);
    assert.ok(hit, 'no section for ' + q);
    const where = bare([...hit.path, hit.node].map(n => n.t).join(' › '));
    assert.match(where, re, `${q} → ${where}`);
    // «شروط الصلاة» is not the conditions of the Friday or the Eid prayer
    if (q === 'شروط الصلاة') assert.doesNotMatch(bare(hit.node.t), /الجمعه|العيد|الخوف|قصر/);
    if (q === 'كيف أتوضأ') assert.doesNotMatch(bare(hit.node.t), /مسح الراس/);
    const html = practicalHtml(hit, 'ar');
    assert.ok(html.includes(`https://dorar.net/feqhia/${hit.node.id}`));
  }
});

test('a practical question no longer asks the Creed Encyclopedia (it answered «شروط» with the shahada)', () => {
  assert.deepEqual(encycKinds({ type: 'topic', query: 'شروط الصلاة' }, 'شروط الصلاة'), []);
  assert.deepEqual(encycKinds({ type: 'notfound', query: 'نواقض الوضوء' }, 'نواقض الوضوء'), []);
  assert.ok(encycKinds({ type: 'topic', query: 'ما هو التوحيد' }, 'ما هو التوحيد').includes('aqeeda'));
});

test('every Name of Allah falls inside the recording (the last three fell on silence)', () => {
  const d = JSON.parse(readFileSync('public/data/asma.json', 'utf8'));
  assert.equal(d.names.length, 99);
  // 80 kb/s constant bit rate: the duration from the size
  const dur = statSync('public/audio/asma/asma_husna.mp3').size * 8 / 80000;
  for (let i = 1; i < 99; i++) assert.ok(d.names[i].start >= d.names[i - 1].start, 'order ' + (i + 1));
  assert.ok(d.names[98].end <= dur + 0.2 && d.names[98].start < dur - 1, `last name ${d.names[98].start}–${d.names[98].end} in ${dur.toFixed(1)} s`);
  const b = readFileSync('data_build/build_asma.mjs', 'utf8');
  assert.match(b, /'-ss', String\(CUT_FROM\), '-i'/, 'seek on the input (the fade was on the original clock)');
});

test('the sweep turns once a minute, crosses only the stars under the bar, and keeps their colour', () => {
  const g = readFileSync('public/js/galaxy.js', 'utf8');
  assert.match(g, /Math\.PI \* 2 \/ 60\)/);
  assert.match(g, /across \/ 0\.0075/);
  assert.doesNotMatch(g, /vec3\(1\.0, 0\.93, 0\.75\), 0\.45 \* vSweep/);
});

test('the pure view: logo with its name, a labelled way back, the ray from the last recited word', () => {
  const h = readFileSync('public/index.html', 'utf8'), a = readFileSync('public/js/app.js', 'utf8'), gl = readFileSync('public/js/glow.js', 'utf8');
  assert.match(h, /id="pureBrand"[^>]*><img src="img\/logo\.svg"[^>]*><span class="name" data-i18n="brand">/);
  assert.match(h, /id="pureExit"[\s\S]{0,200}data-i18n="pureBack"/);
  assert.match(a, /wordPoint\(end - 1\)/);
  assert.match(gl, /#pureBrand img/);
});

test('reminders: prayers (at the time or before), remarkable days, khatma moments — each once', () => {
  const day = new Date(2026, 9, 7), at = (h, m) => new Date(2026, 9, 7, h, m).getTime();
  const data = { months: [{ days: [{ date: '2026-10-07', times: { Fajr: at(5, 0), Dhuhr: at(12, 30), Asr: at(15, 45), Maghrib: at(18, 20), Isha: at(19, 40) } }] }],
    place: 'المهدية', khatma: { active: true, moments: [{ id: 'fajr', time: '05:30' }] }, adjust: 0 };
  const all = reminders({ ...NOTIFY_DEFAULTS }, data, day.getTime(), day.getTime() + 86400000, 'ar');
  const p = all.filter(r => r.kind === 'prayer');
  assert.equal(p.length, 5);
  assert.equal(p[0].at, at(5, 0));
  assert.match(p[0].title, /الفجر/);
  assert.ok(all.some(r => r.kind === 'khatma' && r.at === at(5, 30)));
  assert.equal(new Set(all.map(r => r.key)).size, all.length);
  const before = reminders({ ...NOTIFY_DEFAULTS, before: 10 }, data, day.getTime(), day.getTime() + 86400000, 'en').filter(r => r.kind === 'prayer');
  assert.equal(before[1].at, at(12, 20));
  assert.match(before[1].title, /10 minutes to Dhuhr/);
  // the eve and the day of a remarkable day within a year
  const year = reminders({ ...NOTIFY_DEFAULTS, prayers: false, khatma: false }, data, day.getTime(), day.getTime() + 366 * 86400000, 'ar');
  assert.ok(year.some(r => /عرفة/.test(r.title)) && year.some(r => /غدًا/.test(r.title)));
  // the calendar file: one event per prayer still to come, alarms, folded lines
  const ics = remindersIcs({ ...NOTIFY_DEFAULTS }, data, at(4, 0), 'ar').text;
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length >= 5 + 1, true);
  assert.match(ics, /BEGIN:VALARM\r\nACTION:DISPLAY/);
  assert.match(ics, /RRULE:FREQ=DAILY;COUNT=30/);
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
});

test('the muezzins are named by their name only (no «أذان» before it)', () => {
  for (const v of ADHAN_VOICES) { assert.doesNotMatch(v.ar, /^(ال)?أذان/); assert.doesNotMatch(v.en, /^(the )?(adhan|previous)/i); }
  assert.ok(ADHAN_VOICES.some(v => v.ar === 'عاقب عزيز'));
});
