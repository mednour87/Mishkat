// While a surah is recited, the view must move calmly in ONE direction (author's request): the reading camera of
// galaxy.js (simulated in reading_camera.mjs) is run over the whole Quran for every shape × every order of the
// surahs; reversals (a camera move opposite to the previous one) stay under 1 %. Before this fix the galaxy of
// galaxy.bin gave 57.5 %. («قرآن» needs a canvas to rasterise its letters: it is checked in the browser.)
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
      const r = readingCamera(lay.spine || lay.positions, wordVerse, suraOf);   // what galaxy.js follows
      assert.ok(r.moves > 500, `${shape.id}/${order.id}: ${r.moves} moves`);
      assert.ok(r.rate < 0.01, `${shape.id}/${order.id}: ${(100 * r.rate).toFixed(1)} % of the camera moves go back`);
    }
  });
}
