// Shape × order layouts (public/js/layouts.js). 'quran' needs a canvas → covered in the browser only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readJson } from './load.mjs';
import { SHAPES, ORDERS, buildLayout, suraSequence, countLetters } from '../public/js/layouts.js';
import { threadStats } from './thread.mjs';

const core = readJson('core.json');
const words = readJson('words.json');
const suras = core.suras;
// galaxy.bin: header (N, nLayouts, scale) + Int16 positions + Uint16 wordVerse + Uint8 classes
const buf = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'galaxy.bin'));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
const dv = new DataView(ab);
const N = dv.getUint32(0, true), nL = dv.getUint32(4, true);
const off = 12 + N * 3 * nL * 2;
const wordVerse = new Uint16Array(ab.slice(off, off + N * 2));
const suraOfVerse = new Uint8Array(6236);
for (const s of suras) for (let a = 0; a < s.ayas; a++) suraOfVerse[s.first + a] = s.n;
const wordsOf = new Int32Array(115);
for (let w = 0; w < N; w++) wordsOf[suraOfVerse[wordVerse[w]]]++;

const S = (n) => suras[n - 1];
const isPerm = (seq) => seq.length === 114 && new Set(seq).size === 114 && seq.every((n) => n >= 1 && n <= 114);
const nonIncreasing = (seq, f) => seq.every((n, k) => k === 0 || f(seq[k - 1]) >= f(n));

test('data sanity', () => {
  assert.equal(N, 77433);
  assert.equal(words.length, N);
  assert.equal(SHAPES[0].id, 'galaxy');
  assert.ok(SHAPES.some((s) => s.id === 'quran'));
  for (const x of [...SHAPES, ...ORDERS]) assert.ok(x.id && x.ar && x.en);
  assert.equal(countLetters('بِسْمِ'), 3);
  assert.equal(countLetters('ٱلرَّحْمَٰنِ'), 6); // alif wasla counts, superscript alif does not
});

test('order sequences', () => {
  const letters = new Int32Array(115);
  for (let w = 0; w < N; w++) letters[suraOfVerse[wordVerse[w]]] += countLetters(words[w]);
  const seq = (o) => suraSequence(o, { suras, count: wordsOf, letters });
  for (const o of ORDERS) assert.ok(isPerm(seq(o.id)), o.id);
  assert.deepEqual(seq('mushaf'), suras.map((s) => s.n));
  const nz = seq('nuzul');
  assert.equal(nz[0], 96); assert.equal(nz[113], 110);
  assert.ok(nz.every((n, k) => S(n).order === k + 1));
  const pl = seq('place');
  const nMec = suras.filter((s) => s.type === 'meccan').length;
  assert.ok(pl.slice(0, nMec).every((n) => S(n).type === 'meccan'));
  assert.ok(pl.slice(nMec).every((n) => S(n).type === 'medinan'));
  assert.equal(pl[0], 96);
  assert.equal(seq('length')[0], 2);
  assert.ok(nonIncreasing(seq('length'), (n) => wordsOf[n]));
  assert.ok(nonIncreasing(seq('letters'), (n) => letters[n]));
  assert.equal(seq('letters')[0], 2);
  assert.ok(nonIncreasing(seq('ayas'), (n) => S(n).ayas));
  assert.equal(seq('ayas')[0], 2);
  assert.ok(nonIncreasing(seq('versel'), (n) => wordsOf[n] / S(n).ayas));
});


// "Progress" of a point along each shape: the coordinate that grows as the reading advances.
const PROGRESS = {
  galaxy: (x, y) => Math.hypot(x, y),                      // spiral radius
  rose: (x, y) => Math.hypot(x, y),                        // ring radius
  dome: (x, y, z) => z,                                    // height on the dome
  petals: (x, y) => ((Math.PI / 2 - Math.atan2(y, x)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), // clockwise angle from 12 o'clock
};
const runs = (() => { // [start, end) word range of each surah (Mushaf storage order)
  const r = Array.from({ length: 115 }, () => [Infinity, -1]);
  for (let w = 0; w < N; w++) { const s = suraOfVerse[wordVerse[w]]; r[s][0] = Math.min(r[s][0], w); r[s][1] = w + 1; }
  return r;
})();
function checkProgress(shape, lay, tag) {
  const P = lay.positions, f = PROGRESS[shape];
  // 1) each surah is one contiguous run of words (words.json / galaxy.bin are in Mushaf order)
  for (let s = 1; s <= 114; s++) assert.equal(runs[s][1] - runs[s][0], wordsOf[s], `${tag} surah ${s} contiguous`);
  // 2) the reading thread (refonte, 4 Oct): walking the words in reading order, the path never turns back
  //    (reversal = a step turning by more than 120°) and turns gently (few steps over 60°)
  const order = [];
  for (const s of lay.sequence) for (let w = runs[s][0]; w < runs[s][1]; w++) order.push(w);
  const sOf = (w) => suraOfVerse[wordVerse[w]];
  const t = threadStats(P, order, (k) => sOf(order[k]) !== sOf(order[k - 1]));
  assert.ok(t.rev < 0.005, `${tag}: ${(100 * t.rev).toFixed(2)} % of the steps turn back`);
  assert.ok(t.sharp < 0.08, `${tag}: ${(100 * t.sharp).toFixed(2)} % of the steps turn by more than 60°`);
  // 3) the surahs follow each other along the shape in the order of the sequence
  if (shape === 'galaxy') {
    // the spine (Fermat spiral read in one stroke) only moves forward
    const S = lay.spine;
    assert.ok(S && S.length === P.length, `${tag} spine`);
    const ts = threadStats(S, order);
    assert.ok(ts.rev < 0.001, `${tag}: the spine turns back (${(100 * ts.rev).toFixed(2)} %)`);
    return;
  }
  // petals overlap like a real flower's: a petal is placed by its axis (the direction of the sum of its words, symmetric on each loop), the others by their mean
  const mean = lay.sequence.map((s) => { if (shape === 'petals') { let x = 0, y = 0; for (let w = runs[s][0]; w < runs[s][1]; w++) { x += P[w * 3]; y += P[w * 3 + 1]; } return f(x, y); }
    let v = 0; for (let w = runs[s][0]; w < runs[s][1]; w++) v += f(P[w * 3], P[w * 3 + 1], P[w * 3 + 2]); return v / wordsOf[s]; });
  // (the rose's rings ruffle in five lobes: a thin ring may sit a few units inside its neighbour on average)
  const tol = shape === 'rose' ? 6 : 0;
  for (let k = 1; k < 114; k++) assert.ok(mean[k] > mean[k - 1] - tol, `${tag}: surah ${lay.sequence[k]} before ${lay.sequence[k - 1]}`);
}

for (const shape of SHAPES.filter((s) => s.id !== 'quran')) {
  test(`shape ${shape.id} × every order`, async () => {
    for (const order of ORDERS) {
      const p = { shape: shape.id, order: order.id, wordVerse, suras, words };
      const t0 = performance.now();
      const a = await buildLayout(p);
      const ms = performance.now() - t0;
      const b = await buildLayout(p);
      const tag = `${shape.id}/${order.id}`;
      assert.ok(a.positions instanceof Float32Array, tag);
      assert.equal(a.positions.length, N * 3, tag);
      let maxAbs = 0;
      for (let i = 0; i < a.positions.length; i++) {
        assert.ok(Number.isFinite(a.positions[i]), `${tag} non-finite at ${i}`);
        maxAbs = Math.max(maxAbs, Math.abs(a.positions[i]));
      }
      assert.ok(maxAbs > 100 && maxAbs < 1300, `${tag} scale ${maxAbs}`);
      assert.deepEqual(a.positions, b.positions, `${tag} deterministic`);
      assert.ok(isPerm(a.sequence), tag);
      assert.deepEqual(a.sequence, suraSequence(order.id, { suras, count: wordsOf, letters: order.id === 'letters' ? (() => {
        const L = new Int32Array(115); for (let w = 0; w < N; w++) L[suraOfVerse[wordVerse[w]]] += countLetters(words[w]); return L; })() : null }), tag);
      if (order.id === 'nuzul') assert.equal(a.sequence[0], 96);
      assert.ok(a.view.pos.length === 3 && a.view.target.length === 3, tag);
      const d = Math.hypot(...a.view.pos.map((v, i) => v - a.view.target[i]));
      assert.ok(d > 25 && d < 2600, `${tag} view distance ${d}`);
      assert.ok(a.note.ar.length > 20 && a.note.en.length > 20, tag);
      assert.ok(ms < 1500, `${tag} took ${ms.toFixed(0)} ms`);
      checkProgress(shape.id, a, tag);
    }
  });
}

// the galaxy: a round bulge at the core, a thin disc at the rim
test('galaxy: a bulge at the core and a thin disc', async () => {
  const g = await buildLayout({ shape: 'galaxy', order: 'mushaf', wordVerse, suras });
  const P = g.positions;
  const thick = (lo, hi) => { let n = 0, z = 0; for (let w = 0; w < N; w++) { const r = Math.hypot(P[w * 3], P[w * 3 + 1]); if (r >= lo && r < hi) { n++; z += Math.abs(P[w * 3 + 2]); } } return z / n; };
  assert.ok(thick(0, 120) > 3 * thick(450, 700), 'a bulge at the core, a thin disc at the rim');
});

test('bad input is rejected', async () => {
  await assert.rejects(buildLayout({ shape: 'nope', order: 'mushaf', wordVerse, suras }));
  await assert.rejects(buildLayout({ shape: 'galaxy', order: 'nope', wordVerse, suras }));
});

// «قرآن»: contours parallel to the letters' outlines, one thread; checked on a raster drawn here (a ring and a bar)
test('«قرآن»: the thread of contours fills the letters without turning back', async () => {
  const { contourPath, quranWordLayout } = await import('../public/js/letters3d.js');
  const W = 600, H = 300, img = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d2 = (x - 450) ** 2 + (y - 150) ** 2;
    if ((d2 < 90 ** 2 && d2 > 40 ** 2) || (x > 80 && x < 300 && y > 100 && y < 200)) img[(y * W + x) * 4 + 3] = 255;
  }
  const path = contourPath(img, W, H);
  assert.ok(path.length > 2000);
  // the right-hand letter (the ring) comes first: reading from right to left
  assert.ok(path[0][0] > 0, 'starts on the right');
  const n = 5000, wv = new Uint16Array(n).map((_, i) => Math.floor(i / 10));
  const so = new Uint8Array(6236).map((_, v) => v < 250 ? 1 : 2);
  const lay = await quranWordLayout({ wordVerse: wv, suraOf: so, suras: [{ n: 1, order: 1, type: 'meccan' }, { n: 2, order: 2, type: 'meccan' }], path });
  const t = threadStats(lay.positions, [...Array(n).keys()]);
  assert.ok(t.rev < 0.01, `${(100 * t.rev).toFixed(2)} % of the steps turn back`);
});
