// 5 Oct, evening — the author's remarks: domain, licence, logo after 24:35, gate button, khatma map, ⤢ with the tafsir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequest } from '../functions/_middleware.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('www.mishkatquran.org redirects to mishkatquran.org (path and query kept)', async () => {
  const res = await onRequest({ request: new Request('https://www.mishkatquran.org/?q=%D8%A7%D9%84%D8%B5%D8%A8%D8%B1'), env: {}, next: async () => new Response('page') });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://mishkatquran.org/?q=%D8%A7%D9%84%D8%B5%D8%A8%D8%B1');
  const ok = await onRequest({ request: new Request('https://mishkatquran.org/'), env: {}, next: async () => new Response('page') });
  assert.equal(await ok.text(), 'page');
});

test('licence: all rights reserved, no open licence (challenge terms 13/7), third-party terms kept', () => {
  const L = read('LICENSE');
  assert.match(L, /All Rights Reserved/);
  assert.match(L, /جميع الحقوق محفوظة/);
  assert.doesNotMatch(L, /Permission is hereby granted, free of charge/);
  assert.match(L, /clause 13/);
  assert.match(read('NOTICE.md'), /SOURCES\.md/);
  assert.equal(JSON.parse(read('package.json')).license, 'SEE LICENSE IN LICENSE');
  assert.match(read('public/index.html'), /All Rights Reserved/);
});

test('logo after 24:35: the glass itself shines like a star, a lit lamp inside it, no separate planet', () => {
  const svg = read('public/img/logo.svg');
  assert.doesNotMatch(svg, /lmp2p/, 'the planet sphere is gone');
  assert.match(svg, /class="flame"/, 'the lamp (مصباح) is lit inside the glass');
  const lamp = read('public/js/lamp.js');
  assert.match(lamp, /class="flame"/);
  assert.match(lamp, /y=\\?"69\\?"/, 'the recited word sits in the oil, under the flame');
});

test('entry gate: one tap pastes the basmala and enters; no turning circle while loading', () => {
  const html = read('public/index.html');
  assert.match(html, /id="gatePaste"/);
  assert.doesNotMatch(html, /class="spin"/);
  assert.match(read('public/js/app.js'), /\$\('#gatePaste'\)\.onclick/);
});

test('khatma map: once zoomed, a vertical drag moves along the glass within limits', () => {
  const s = read('public/js/lampmap.js');
  assert.match(s, /const clampPan = \(v\) => zoom <= 1\.02 \? 0 : Math\.max\(-30, Math\.min\(31, v\)\)/);
  assert.match(s, /if \(zoom > 1\.02\) \{ panBy\(/);
});

test('⤢ on a phone works in every reading pane (the tafsir rule no longer wins)', () => {
  const css = read('public/css/refonte.css');
  assert.match(css, /body\.gfull\[data-mode=study\]\[data-pane\] #work \{ grid-template-rows: 60vh/);
  assert.match(css, /body\.gfull\[data-mode=study\]\[data-pane=t\] #tzone \{ display: flex !important; \}/);
});

test('khatma v2: whole Quran by pages = 604, short surahs first starts at an-Nas, daily amount, choose-for-me', async () => {
  const k = await import('../public/js/khatma.js');
  const core = JSON.parse(read('public/data/core.json')), pages = JSON.parse(read('public/data/mushaf_meta.json')).pages;
  const U = k.planUnits({}, core.suras, pages);
  assert.equal(Math.round(k.planTotal(U)), 604);
  const tp = k.todayPortion2({ start: '2026-10-05', days: 30, moments: [{ id: 'fajr' }, { id: 'night' }] }, k.newRead(), U, new Date(2026, 9, 5));
  assert.equal(tp.parts.length, 2); assert.ok(Math.abs(tp.w - 604 / 30) < 1.5);
  const S = k.planUnits({ unit: 'ayas', scope: 'suras', suras: [67, 112, 113, 114], order: 'short' }, core.suras, pages);
  assert.equal(S[0].sura, 114); assert.equal(S.length, 30 + 4 + 5 + 6);
  assert.equal(k.planDays({ mode: 'amount', perDay: 5 }, S), 9);
  const r = k.suggestPlan({ minutes: 20, pace: 'medium', deadline: 60, moments: [] }, '2026-10-05');
  assert.equal(r.days, 60); assert.ok(r.fits);
  assert.equal(k.suggestPlan({ minutes: 5, pace: 'slow', deadline: 30 }, '2026-10-05').fits, false);
});

test('qibla bearings match published values (great circle)', async () => {
  const q = await import('../public/js/practical.js');
  const near = (a, b) => Math.abs(a - b) < 0.3;
  assert.ok(near(q.qiblaBearing(51.5074, -0.1278), 119.0)); assert.ok(near(q.qiblaBearing(40.7128, -74.006), 58.5));
  assert.ok(near(q.qiblaBearing(-6.2088, 106.8456), 295.1)); assert.ok(near(q.qiblaBearing(35.5047, 11.0622), 111.5));
});

test('phone review (5 Oct night): SVG play icons, tajweed close keeps colours, panel enlarge, readable lists, Arabic first', () => {
  const app = read('public/js/app.js');
  assert.doesNotMatch(app, /'⏵⏵'/);
  assert.match(app, /state\.tjBoxHidden = true/);
  assert.match(read('public/js/panels.js'), /p-max/);
  assert.match(read('public/css/refonte.css'), /select option, select optgroup \{ background: #0f1424; color: #f3eedf; \}/);
  assert.match(app, /const nav = m && EN_LANDS\.includes\(m\[1\]\.toUpperCase\(\)\) \? 'en' : 'ar';/);
});
