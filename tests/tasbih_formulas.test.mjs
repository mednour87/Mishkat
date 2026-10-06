// T120: every tasbih formula is a verbatim slice of a graded hadith of the site's adhkar file; the counter goes on
// past the suggested number; undo never goes below zero
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { addCount } from '../public/js/tasbih.js';

const athkar = JSON.parse(fs.readFileSync('public/data/athkar.json', 'utf8'));
const tasbih = JSON.parse(fs.readFileSync('public/data/tasbih.json', 'utf8'));
const byId = new Map(athkar.items.map(x => [x.id, x]));

test('tasbih formulas: cut word for word from a graded source', () => {
  const keys = tasbih.formulas.map(f => f.key);
  for (const k of ['subhan', 'hamd', 'takbir', 'tahlil', 'istighfar', 'salat', 'hawqala']) assert.ok(keys.includes(k), k);
  for (const f of tasbih.formulas) {
    const src = byId.get(f.source);
    assert.ok(src, f.source);
    assert.ok(src.text.includes(f.text), `${f.key} is a slice of ${f.source}`);
    assert.match(f.grade, /صحيح|حسن/, `${f.key} graded`);
    assert.ok(f.count > 0 && f.url.startsWith('https://'));
  }
});

test('tasbih count: undo, a new day, never negative', () => {
  let c = addCount(null, '2026-10-06');
  c = addCount(c, '2026-10-06', -1);
  c = addCount(c, '2026-10-06', -1);
  assert.deepEqual(c, { day: '2026-10-06', today: 0, total: 0 });
  const src = fs.readFileSync('public/js/tasbih.js', 'utf8');
  assert.doesNotMatch(src, /if \(goal && k >= goal\) return/, 'the counter no longer stops at the goal');
  assert.match(src, /'Backspace'/);
});
