// Shape × order layouts (public/js/layouts.js). 'quran' needs a canvas → covered in the browser only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readJson } from './load.mjs';
import { SHAPES, ORDERS, buildLayout, suraSequence, countLetters } from '../public/js/layouts.js';

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
  petals: (x, y) => ((Math.PI / 2 - Math.atan2(y, x)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), // clockwise angle
};
const runs = (() => { // [start, end) word range of each surah (Mushaf storage order)
  const r = Array.from({ length: 115 }, () => [Infinity, -1]);
  for (let w = 0; w < N; w++) { const s = suraOfVerse[wordVerse[w]]; r[s][0] = Math.min(r[s][0], w); r[s][1] = w + 1; }
  return r;
})();
function checkProgress(shape, lay, tag) {
  const P = lay.positions, f = PROGRESS[shape];
  const pr = (w) => f(P[w * 3], P[w * 3 + 1], P[w * 3 + 2]);
  // 1) each surah is one contiguous run of words (words.json / galaxy.bin are in Mushaf order)
  for (let s = 1; s <= 114; s++) assert.equal(runs[s][1] - runs[s][0], wordsOf[s], `${tag} surah ${s} contiguous`);
  // 2) surahs advance along the shape in the order of the sequence
  const mean = lay.sequence.map((s) => { let t = 0; for (let w = runs[s][0]; w < runs[s][1]; w++) t += pr(w); return t / wordsOf[s]; });
  if (shape === 'galaxy') { // random verse offsets (σ ≤ 29) blur the radius of tiny neighbouring surahs
    const rank = (v) => { const o = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(v.length); o.forEach(([, i], k) => { r[i] = k; }); return r; };
    const r = rank(mean); let d2 = 0; r.forEach((x, k) => { d2 += (x - k) ** 2; });
    const rho = 1 - (6 * d2) / (114 * (114 * 114 - 1));
    assert.ok(rho > 0.97, `${tag} Spearman ${rho}`);
  } else {
    for (let k = 1; k < 114; k++) assert.ok(mean[k] > mean[k - 1], `${tag}: surah ${lay.sequence[k]} before ${lay.sequence[k - 1]}`);
  }
  // 3) inside a surah, words keep Mushaf order: they move outward along a petal, or clockwise
  //    (rose rings, dome circuit) — checked on consecutive words
  if (shape === 'galaxy') return;
  const cw = (w) => Math.PI / 2 - Math.atan2(P[w * 3 + 1], P[w * 3]);
  let ok = 0, all = 0;
  for (let s = 1; s <= 114; s++) for (let w = runs[s][0]; w + 1 < runs[s][1]; w++) {
    all++;
    if (shape === 'petals') { if (Math.hypot(P[w * 3 + 3], P[w * 3 + 4]) - Math.hypot(P[w * 3], P[w * 3 + 1]) > -2.5) ok++; }
    else { const d = (((cw(w + 1) - cw(w)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); if (d < Math.PI) ok++; }
  }
  assert.ok(ok / all > 0.98, `${tag}: only ${(100 * ok / all).toFixed(1)}% of consecutive words advance`);
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

test('galaxy + mushaf reproduces the precomputed galaxy (layout 0 of galaxy.bin)', async () => {
  const scale = dv.getFloat32(8, true);
  const q = new Int16Array(ab, 12, N * 3 * nL);
  const g = await buildLayout({ shape: 'galaxy', order: 'mushaf', wordVerse, suras });
  // same spiral skeleton; only the random verse offsets differ (σ ≤ 29)
  let d = 0;
  for (let i = 0; i < N; i++) d += Math.hypot(g.positions[i * 3] - q[i * 3] * scale, g.positions[i * 3 + 1] - q[i * 3 + 1] * scale);
  assert.ok(d / N < 45, `mean distance ${(d / N).toFixed(1)}`);
});

test('bad input is rejected', async () => {
  await assert.rejects(buildLayout({ shape: 'nope', order: 'mushaf', wordVerse, suras }));
  await assert.rejects(buildLayout({ shape: 'galaxy', order: 'nope', wordVerse, suras }));
});
