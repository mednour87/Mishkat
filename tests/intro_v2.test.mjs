// T102 — intro v2: chapters, the search path, example questions, the film hands the chosen question to the search
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('T102 intro strings: chapters, search steps and example questions in Arabic and English', async () => {
  globalThis.matchMedia ??= () => ({ matches: false });
  const { IN, CH, DUR } = await import('../public/js/intro.js');
  for (const l of ['ar', 'en']) {
    assert.equal(IN[l].chapters.length, CH.length, l);
    assert.equal(IN[l].steps.length, 4, l);
    assert.equal(IN[l].tryQ.length, 3, l);
    assert.equal(IN[l].feats.length, DUR.length, l);
  }
  // the search card is the longest: it is the heart of the site
  assert.equal(Math.max(...DUR), DUR[0]);
  // (5 Oct, evening, author's request) the services come AFTER the whole verse, each narrated: the film is longer
  // (basmala ≈ 6 s + the whole verse ≈ 80 s + seven narrated cards) but stays under 3 minutes, and is skippable
  const total = 6 + 80 + DUR.reduce((a, b) => a + b, 0) / 1000;
  assert.ok(total < 180, `film ${total.toFixed(0)} s`);
  const { existsSync } = await import('node:fs');
  for (const l of ['ar', 'en']) for (const [id] of IN[l].feats.concat([['greet']])) assert.ok(existsSync(new URL(`../public/audio/intro/${l}/${id}.mp3`, import.meta.url)), `${l}/${id}.mp3`);
});
test('T102 the question chosen at the end of the film starts a real search', () => {
  const app = fs.readFileSync('public/js/app.js', 'utf8');
  assert.match(app, /const q = await runIntro\(\);[\s\S]{0,80}if \(q\) \{ \$\('#q'\)\.value = q; run\(q\); return; \}/);
  assert.match(app, /onDone: \(q\) => \{[\s\S]{0,120}resolve\(q \|\| ''\)/);
  const js = fs.readFileSync('public/js/intro.js', 'utf8');
  assert.match(js, /ctx\.onDone && ctx\.onDone\(query\)/);
  // religious text in the film: Tanzil verses and the QuranEnc translation only, footnote marks removed
  assert.ok(js.includes(String.raw`.replace(/\[\d+\]/g, '')`));
});
