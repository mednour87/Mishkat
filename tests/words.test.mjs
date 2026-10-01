// Exact words of the Quran, Latin transliteration, spelling help.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine, readJson } from './load.mjs';

const { engine } = loadEngine();
engine.addLatinIndex(readJson('latin_index.json'));
const ask = (q) => engine.ask(q, { uiLang: 'ar' });
const refs = (r) => r.verses.map(v => v.ref);

test('a rare word of the Quran brings its verse first, whatever its clitics or spelling', async () => {
  for (const q of ['مشكاة', 'كمشكاة', 'مشكوة', 'mishkat', 'mishkaat']) {
    const r = await ask(q);
    assert.equal(refs(r)[0], '24:35', q);
  }
  const r = await ask('سجيل');
  for (const x of ['11:82', '15:74', '105:4']) assert.ok(r.wordHits.map(i => engine.ref(i)).includes(x), x);
});

test('the word is highlighted at its place in the Uthmani text', () => {
  const v = engine.idxOf(24, 35);
  assert.deepEqual(engine.wordPositions(v, ['مشكاة']), [6]);
});

test('a misspelt word: a sure correction is applied and announced; otherwise suggestions', async () => {
  const r = await ask('الصبرر');
  assert.equal(r.correctedFrom, 'الصبرر');
  assert.ok(refs(r).includes('2:153'));
  const y = await ask('يوسوف');
  assert.equal(y.correctedFrom, 'يوسوف');
  assert.equal(y.sura, 12);
  const z = await engine.ask('الصبرر', { uiLang: 'ar', noCorrect: true });
  assert.ok(z.suggest && z.suggest[0].q.includes('صبر'), 'suggestions when searching as typed');
});

test('real words that are not in the Quran are not "corrected"', async () => {
  for (const q of ['الجهاد', 'الاخلاق']) {
    const r = await ask(q);
    assert.ok(!r.correctedFrom && !r.suggestFor, q);
  }
  assert.ok((await ask('الجهاد')).sensitive);
});

test('ta marbuta / ta / ha as the last letter only (يتم is not يهم)', () => {
  const s = engine.suggestWords('الزكات');
  assert.equal(s[0].q, 'الزكاة');
  assert.ok(!engine.suggestWords('اليتم').some(x => x.q === 'اليهم'));
});
