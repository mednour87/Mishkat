// While a surah is recited, the view must move calmly in ONE direction (author's request, 3 Oct) AND keep the recited
// word in the frame (author's request, 5 Oct): the reading camera of galaxy.js (readcam.js, simulated in
// reading_camera.mjs) is run over the whole Quran for every shape × every order of the surahs: reversals (a camera
// move opposite to the previous one) stay under 1 %, the word stays on average within half of the half-view and is
// near the edge (> 0.9 half-view) less than 1 % of the time. The rule of 3 Oct (follow the arm's middle curve with
// a 30 % slack) left the word 1.1 half-views from the centre in the galaxy — out of the frame.
// («قرآن» needs a canvas to rasterise its letters: it is checked in the browser.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildLayout, SHAPES, ORDERS } from '../public/js/layouts.js';
import { readingCamera } from './reading_camera.mjs';
import { readJson } from './load.mjs';

const buf = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'galaxy.bin'));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), dv = new DataView(ab);
const N = dv.getUint32(0, true), nL = dv.getUint32(4, true);
const wordVerse = new Uint16Array(ab.slice(12 + N * 3 * nL * 2, 12 + N * 3 * nL * 2 + N * 2));
const core = readJson('core.json'), words = readJson('words.json');
const suraOf = new Int16Array(6236);
core.suras.forEach(S => { for (let a = 0; a < S.ayas; a++) suraOf[S.first + a] = S.n; });

for (const shape of SHAPES.filter(s => s.id !== 'quran')) {
  test(`reading: the view moves in one direction — ${shape.id} × every order`, async () => {
    for (const order of ORDERS) {
      const lay = await buildLayout({ shape: shape.id, order: order.id, wordVerse, suras: core.suras, words });
      const r = readingCamera(lay.positions, lay.spine || null, wordVerse, suraOf);   // what galaxy.js follows
      assert.ok(r.moves > 500, `${shape.id}/${order.id}: ${r.moves} moves`);
      assert.ok(r.rate < 0.01, `${shape.id}/${order.id}: ${(100 * r.rate).toFixed(1)} % of the camera moves go back`);
      assert.ok(r.meanOff < 0.5, `${shape.id}/${order.id}: the word is ${r.meanOff.toFixed(2)} half-views from the centre`);
      assert.ok(r.outRate < 0.01, `${shape.id}/${order.id}: the word is near the edge ${(100 * r.outRate).toFixed(1)} % of the time`);
    }
  });
}
