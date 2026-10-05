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
