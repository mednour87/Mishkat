// T061: the visitor's settings and khatma data stay in the browser; export / import / erase work,
// a foreign file is refused, and a blocked storage (private window) never breaks the page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, loadPrefs, savePrefs, exportPrefs, importPrefs, resetPrefs } from '../public/js/prefs.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };

test('prefs: defaults, save and load in the same browser', () => {
  const s = mem();
  const p = loadPrefs(s);
  assert.deepEqual(p, DEFAULTS);
  p.hijriAdjust = -1; p.khatma.days = 15; p.autoMark = false;
  savePrefs(p, s);
  const q = loadPrefs(s);
  assert.equal(q.hijriAdjust, -1); assert.equal(q.khatma.days, 15); assert.equal(q.autoMark, false);
  assert.equal(q.showReadOnGalaxy, true, 'missing keys come from the defaults');
});

test('prefs: export then import gives the same data; a foreign file is refused', () => {
  const p = loadPrefs(mem()); p.read = 'AQ=='; p.log = { '2026-10-03': 7 }; p.khatma = { ...p.khatma, active: true, start: '2026-10-03', days: 30 };
  const back = importPrefs(exportPrefs(p));
  assert.equal(back.read, 'AQ=='); assert.deepEqual(back.log, { '2026-10-03': 7 }); assert.equal(back.khatma.active, true);
  assert.throws(() => importPrefs('{"app":"other","prefs":{}}'));
  assert.throws(() => importPrefs('not json'));
});

test('prefs: erase removes everything; blocked storage never throws', () => {
  const s = mem(); const p = loadPrefs(s); p.hijriAdjust = 2; savePrefs(p, s);
  assert.deepEqual(resetPrefs(s), DEFAULTS);
  assert.deepEqual(loadPrefs(s), DEFAULTS);
  assert.deepEqual(loadPrefs(blocked), DEFAULTS);
  assert.doesNotThrow(() => savePrefs(p, blocked));
  assert.doesNotThrow(() => resetPrefs(blocked));
});
