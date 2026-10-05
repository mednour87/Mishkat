// Refonte of 4–5 October: menu drawer, folded toolbars, statistics of the verse being read, tajweed rules and their
// keys, layouts computed in a worker — nothing of the earlier controls removed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readJson } from './load.mjs';
import { verseStats, suraOfIndex } from '../public/js/stats.js';
import { RULE_INFO, RULES, verseRules, TJ_S } from '../public/js/tajweed.js';

const html = fs.readFileSync('public/index.html', 'utf8');
const app = fs.readFileSync('public/js/app.js', 'utf8');

test('top bar + drawer: every former control is still on the page', () => {
  for (const id of ['navBtn', 'navDrawer', 'navClose', 'navScrim', 'dock', 'engBtn', 'khCount', 'btnInstall', 'btnMenu', 'btnAbout', 'themeBtn', 'gMore',
    'gHome', 'gIn', 'gOut', 'gRot', 'gNames', 'shapeSel', 'orderSel', 'gLegend', 'gFull', 'gcam'])
    assert.ok(html.includes(`id="${id}"`), id);
  assert.equal((html.match(/data-lang="ar"/g) || []).length, 3, 'language switch: top bar (computer), drawer, gate');
  assert.ok(html.includes('css/refonte.css'));
  // the reading bar and the tafsir bar keep all their buttons (some behind ⋯)
  for (const id of ['rPlayOne', 'rPlayAll', 'rPrev', 'rNext', 'rSura', 'rSel', 'rTaf', 'rMore', 'rClose', 'rFirst', 'rRep', 'rSpeed', 'rFm', 'rFp', 'rTj', 'rInfo', 'rStats', 'rCopy', 'rShare',
    'tBook', 'tPrev', 'tNext', 'tMore', 'tClose', 'tTts', 'tFm', 'tFp', 'tCopy'])
    assert.ok(app.includes(`id="${id}"`), id);
});

test('statistics of the verse being read: 24:35 counted on the Tanzil text', async () => {
  const core = readJson('core.json'), meta = readJson('mushaf_meta.json'), so = suraOfIndex(core);
  const i = core.suras[23].first + 34, r = verseStats(core, meta, i, so);
  assert.equal(r.aya, 35); assert.equal(r.words, 48); assert.equal(r.letters, 199);
  assert.equal(r.list.length, 48);
  assert.ok(r.rank >= 1 && r.rank <= 64);
  assert.ok(r.page > 340 && r.page < 360, `page ${r.page}`); assert.equal(r.juz, 18);
});

test('tajweed: every rule has a name, a definition and its keys, in both languages', () => {
  assert.equal(RULE_INFO.length, RULES.length);
  for (const R of RULE_INFO) for (const k of ['ar', 'en', 'kar', 'ken', 'dar', 'den']) assert.ok(R[k] && R[k].length, k);
  assert.equal(RULE_INFO[RULES.indexOf('qalqalah')].kar, 'قُطْبُ جَدٍّ');
  assert.equal(RULE_INFO[RULES.indexOf('idghaam_ghunnah')].kar, 'ينمو');
  assert.ok(TJ_S.ar.srcRules.includes('تحفة الأطفال'));
  // the rules of a verse point at the word that carries them
  const core = readJson('core.json'), ann = readJson('tajweed/24.json')[34], v = core.verses[core.suras[23].first + 34];
  const toks = v.split(' '), rs = verseRules(v, ann);
  assert.ok(rs.length > 5);
  for (const { word } of rs) assert.ok(word >= 0 && word < toks.length);
});

test('layouts in a worker; the service worker knows the new files', () => {
  const w = fs.readFileSync('public/js/layout-worker.js', 'utf8'), sw = fs.readFileSync('public/sw.js', 'utf8');
  assert.match(w, /import \{ buildLayout \} from '\.\/layouts\.js'/);
  assert.match(app, /new Worker\(new URL\('\.\/layout-worker\.js', import\.meta\.url\), \{ type: 'module' \}\)/);
  for (const f of ['css/refonte.css', 'js/layout-worker.js', 'js/letters3d.js']) assert.ok(sw.includes(`'${f}'`), f);
});
