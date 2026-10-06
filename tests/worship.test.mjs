// T120: the light of the month, the Most Beautiful Names, the prayer break of the reader, the adhan recordings
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { glowOf, glowLevel, addListen, addTasbih, addName, SHARES } from '../public/js/glow.js';
import { learnQueue } from '../public/js/asma.js';
import { resumesWithBasmala } from '../public/js/prayerbreak.js';
import { monthPct } from '../public/js/progress.js';

test('light of the month: shares add up to 1, each part capped, a new month starts again', () => {
  assert.equal(Object.values(SHARES).reduce((a, b) => a + b, 0).toFixed(6), '1.000000');
  const P = {}, oct = new Date(2026, 9, 6), nov = new Date(2026, 10, 1);
  addListen(P, 600, oct); addTasbih(P, 6000, oct); addName(P, 1, oct); addName(P, 1, oct);
  const g = glowLevel(P, monthPct, oct);
  assert.equal(g.parts.tasbih, 1, 'capped');
  assert.equal(glowOf(P, oct).asma.length, 1, 'a name counts once');
  assert.ok(g.total > 0.1 && g.total < 0.25);
  assert.equal(glowLevel(P, monthPct, nov).total, 0, 'the first day of the month starts from the drawing of the logo');
});

test('the Names: 99 names in order, times inside the recording, the learning queue', () => {
  const d = JSON.parse(fs.readFileSync('public/data/asma.json', 'utf8'));
  assert.equal(d.names.length, 99);
  d.names.forEach((x, i) => { assert.equal(x.n, i + 1); assert.ok(x.end > x.start, x.ar); if (i) assert.ok(x.start >= d.names[i - 1].start); });
  assert.ok(fs.existsSync('public/' + d.audio));
  assert.deepEqual(learnQueue(1, 3, 2), [1, 1, 2, 2, 3, 3, 1, 2, 3]);
  assert.deepEqual(learnQueue(97, 5, 1), [97, 98, 99, 97, 98, 99], 'never beyond 99');
});

test('prayer break: no basmala when resuming in Surah at-Tawbah; three licensed adhans exist', () => {
  assert.equal(resumesWithBasmala(9), false);
  assert.equal(resumesWithBasmala(2), true);
  for (const f of ['adhan_madinah.mp3', 'adhan_clear.mp3', 'adhan.mp3']) assert.ok(fs.existsSync('public/audio/' + f), f);
  const lic = fs.readFileSync('public/audio/LICENSE-adhan.txt', 'utf8');
  for (const l of ['CC BY 3.0', 'CC0', 'CC BY-SA 4.0']) assert.ok(lic.includes(l));
  const app = fs.readFileSync('public/js/app.js', 'utf8');
  assert.match(app, /state\.prayerDue/, 'the verse is finished before the break');
});

test('the judges\' guide is not linked from the site (it is linked from GitHub)', () => {
  for (const f of ['public/index.html', 'public/js/app.js']) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /judges\.html/);
});

test('every verse quoted in the documents of the 3D design is a slice of the Tanzil text', () => {
  const core = JSON.parse(fs.readFileSync('public/data/core.json', 'utf8')), all = core.verses.join('\n');
  for (const f of ['docs/DESIGN_3D.md', 'docs/DESIGN_3D_AR.md']) {
    const quotes = [...fs.readFileSync(f, 'utf8').matchAll(/﴿([^﴾]+)﴾/g)].map(m => m[1].replace(/^…|…$/g, '').trim());
    assert.ok(quotes.length >= 3, f);
    for (const q of quotes) assert.ok(all.includes(q), `${f}: ${q}`);
  }
});
