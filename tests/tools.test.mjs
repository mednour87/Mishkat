// T032: the search bar opens a tool panel for practical requests, AFTER the guard: a question about a
// ruling, a story or a theme stays a Quran search. Only the tools wired in the page are offered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTool } from '../public/js/tools.js';
import { guardCheck } from '../public/js/engine.js';

const ON = ['khatma', 'hijri', 'links', 'settings'];
const route = (q) => routeTool(q, { available: ON, guard: guardCheck });

test('tools: practical requests open their panel (ar + en)', () => {
  const cases = [
    ['متى رمضان', 'hijri', { event: 'ramadan' }],
    ['متى رمضان؟', 'hijri', { event: 'ramadan' }],
    ['كم بقي على العيد', 'hijri', { event: 'eid' }],
    ['موعد يوم عرفة', 'hijri', { event: 'arafah' }],
    ['التاريخ الهجري اليوم', 'hijri', {}],
    ['تحويل التاريخ من الهجري', 'hijri', {}],
    ['when is ramadan', 'hijri', { event: 'ramadan' }],
    ['how many days until eid', 'hijri', { event: 'eid' }],
    ['hijri date', 'hijri', {}],
    ['خطة لختم القرآن في شهر', 'khatma', { days: 30 }],
    ['أريد أن أختم القرآن في ١٠ أيام', 'khatma', { days: 10 }],
    ['كم بقي لي على الختمة', 'khatma', {}],
    ['الختمة', 'khatma', {}],
    ['plan to finish the quran in 2 weeks', 'khatma', { days: 14 }],
    ['khatma', 'khatma', {}],
    ['روابط مفيدة', 'links', {}],
    ['useful links', 'links', {}],
    ['الإعدادات', 'settings', {}],
    ['settings', 'settings', {}],
  ];
  for (const [q, tool, args] of cases) {
    const r = route(q);
    assert.ok(r, `«${q}» should open ${tool}`);
    assert.equal(r.tool, tool, q);
    for (const k of Object.keys(args)) assert.equal(r.args[k], args[k], `${q} → ${k}`);
  }
});

test('tools: questions stay Quran searches (guard first, no tool by keyword alone)', () => {
  for (const q of [
    'الصلاة', 'قصة موسى', 'ما حكم صلاة الجماعة', 'ما حكم صيام يوم عرفة', 'هل يجوز صيام يوم عاشوراء وحده',
    'فضل صيام عاشوراء', 'رمضان', 'ليلة القدر', 'سورة الكهف', 'الصبر', 'is fasting on arafah haram',
    'what does the quran say about ramadan', 'story of moses', 'patience',
    'متى المغرب', 'اتجاه القبلة',              // prayer and qibla panels are not wired yet: still a search
  ]) assert.equal(route(q), null, `«${q}» must stay a search`);
});

test('tools: a tool that is not wired is never opened', () => {
  assert.equal(routeTool('متى رمضان', { available: ['khatma'], guard: guardCheck }), null);
  assert.equal(routeTool('روابط مفيدة', { available: [], guard: guardCheck }), null);
});
