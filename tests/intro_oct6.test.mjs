// T111 — the author's review of the film (6 Oct): English card on screen and full screen, no white circle, shapes on
// the recited words and turning, a human narration fully vowelled for the voice, the logo never under the translation
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.matchMedia ??= () => ({ matches: false });
const { IN, CUES, lines, plain } = await import('../public/js/intro.js');
const js = fs.readFileSync('public/js/intro.js', 'utf8');
const css = fs.readFileSync('public/css/features.css', 'utf8');

test('the services card fills the screen in both directions (no inset-inline-start: auto after left: 50%)', () => {
  const rules = [...css.matchAll(/#intro\.feat \.in-stage \{([^}]*)\}/g)].map(m => m[1]);
  assert.ok(rules.some(r => /inset: 70px 18px 62px/.test(r) && /transform: none/.test(r)));
  assert.match(rules[rules.length - 1], /inset: 62px 8px 46px/);   // the phone, last
  assert.match(css, /#intro\.feat \.in-card \{[^}]*height: 100%/);
});

test('the shapes change on recited words of 24:35, and keep turning', () => {
  const core = JSON.parse(fs.readFileSync('public/data/core.json', 'utf8'));
  const w = core.verses[core.suras[23].first + 34].split(' ');
  const bare = (x) => x.replace(/[ً-ْٰۖ-ۭ]/g, '');
  assert.equal(bare(w[CUES[0].at]), 'ويضرب');
  assert.equal(bare(w[CUES[1].at]), 'وٱلله');
  assert.deepEqual(CUES.map(c => c.shape), ['rose', 'zahra']);
  assert.match(js, /setAutoRotate\(true, 1\.6\)/);
  assert.match(fs.readFileSync('public/js/galaxy.js', 'utf8'), /setAutoRotate\(v, speed\) \{ controls\.autoRotate = v; if \(speed\) controls\.autoRotateSpeed = speed; \}/);
});

test('no white circle: the 2D points fade out and the verse thread is hidden during the film', () => {
  assert.match(js, /const fade = leaving \? Math\.max\(0, 1 - \(performance\.now\(\) - leaveT0\) \/ 2500\) : 1;/);
  assert.match(js, /if \(fade <= 0\) \{ parts = \[\]; txtCv = null; return; \}/);
  assert.match(js, /ctx\.galaxy\.setFocusVerse\(null\)/);
  assert.match(js, /if \(focus0 != null\) ctx\.galaxy\.setFocusVerse\(focus0\)/);
});

test('the narration: one source for the cards and the voice, a bridge line, Arabic fully vowelled', () => {
  for (const l of ['ar', 'en']) {
    const L = lines(l);
    assert.deepEqual(Object.keys(L), [...IN[l].feats.map(f => f[0]), 'galaxy', 'greet']);
    for (const id of Object.keys(L)) assert.ok(fs.existsSync(`public/audio/intro/${l}/${id}.mp3`), `${l}/${id}.mp3`);
    const saved = JSON.parse(fs.readFileSync('public/audio/intro/lines.json', 'utf8')).lines[l];
    assert.deepEqual(saved, L, `${l}: the mp3 files were made from these very lines`);
  }
  for (const [id, text] of Object.entries(lines('ar'))) {
    const letters = text.replace(/[^ء-ي]/g, '').length, marks = text.replace(/[^ً-ْ]/g, '').length;
    assert.ok(marks / letters > 0.6, `${id}: vowelled for the voice (${marks}/${letters})`);
  }
  // the card shows the line without the short vowels, the shadda kept
  assert.equal(plain('الصَّلَاةِ'), 'الصّلاة');
  assert.match(js, /<p>\$\{esc\(ar \? plain\(p\) : p\)\}<\/p>/);
  // never a verse in the narration (the verses come from core.json only)
  assert.ok(!/﴿|﴾/.test(JSON.stringify(lines('ar'))));
});

test('the logo is placed between the verse and the measured translation, never under it', () => {
  assert.match(js, /function placeLogo\(\)/);
  assert.match(js, /trEl\.offsetHeight \+ 10/);
  assert.match(css, /\.in-logo\.tight \.in-labels \{ display: none; \}/);
});
