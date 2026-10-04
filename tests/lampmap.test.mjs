// T069: the khatma inside the logo — 114 lights inside the glass, in the chosen order, lit by the reading log.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './load.mjs';
import { orderSuras, layout, radiusAt, progressOf, miniLamp, ORDERS } from '../public/js/lampmap.js';
import { newRead, markRead, isRead } from '../public/js/khatma.js';

const core = readJson('core.json');

test('lamp map: every order is a permutation of the 114 surahs; revelation order from Tanzil metadata', () => {
  for (const o of ORDERS) { const l = orderSuras(core.suras, o); assert.equal(new Set(l).size, 114, o); }
  assert.deepEqual(orderSuras(core.suras, 'mushaf').slice(0, 3), [1, 2, 3]);
  const nz = orderSuras(core.suras, 'nuzul');
  assert.equal(nz[0], 96, 'al-Alaq first revealed');
  assert.equal(nz[1], 68);
  assert.equal(orderSuras(core.suras, 'length')[0], 2);
  const pl = orderSuras(core.suras, 'place');
  const firstMedinan = pl.findIndex(n => core.suras[n - 1].type !== 'meccan');
  assert.ok(pl.slice(firstMedinan).every(n => core.suras[n - 1].type !== 'meccan'), 'Meccan then Medinan');
});

test('lamp map: lights stay inside the glass of the logo, from the neck down to the foot', () => {
  const pos = layout(114);
  assert.equal(pos.length, 114);
  for (let k = 1; k < 114; k++) assert.ok(pos[k].y > pos[k - 1].y, 'path goes down');
  for (const p of pos) { assert.ok(p.r <= radiusAt(p.y) + 1e-9); assert.ok(p.y >= 22.5 && p.y <= 79.5); }
  // fewer lights in the narrow neck than in the round body
  const neck = pos.filter(p => p.y < 40).length, body = pos.filter(p => p.y >= 45 && p.y < 70).length;
  assert.ok(body > 2 * neck, `${neck} in the neck, ${body} in the body`);
});

test('lamp map: a surah read to its end is lit, a partly read one glows, the mini view marks them', () => {
  const bits = newRead();
  const S = (n) => core.suras[n - 1];
  markRead(bits, S(112).first, S(112).first + S(112).ayas - 1);
  markRead(bits, S(2).first, S(2).first + 9);
  const prog = progressOf(bits, core.suras, isRead);
  assert.equal(prog[111], 1);
  assert.ok(prog[1] > 0 && prog[1] < 1);
  assert.equal(prog[0], 0);
  const svg = miniLamp(prog, core.suras);
  assert.equal((svg.match(/fill="#fffbe6"/g) || []).length, 1, 'one surah fully lit');
  assert.equal((svg.match(/fill="#ffe08a"/g) || []).length, 1, 'one surah partly lit');
});
