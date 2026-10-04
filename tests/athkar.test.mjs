// T062: every dhikr shown has a صحيح/حسن grade from an approved source; Hisn al-Muslim items only with a
// Dorar verdict; the search bar opens the right theme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './load.mjs';
import { athkarQuery, filterAthkar } from '../public/js/athkar.js';
import { toolIntent } from '../public/js/tools.js';

const D = readJson('athkar.json');

test('adhkar: only plainly sahih/hasan grades; every Hisn al-Muslim item carries a Dorar verdict', () => {
  assert.ok(D.items.length > 150);
  for (const x of D.items) {
    if (x.src === 'hadeethenc') {
      assert.match(x.grade, /^(صحيح|حسن|إسناده|الحديثان|صحيحان|صحيحة)/, x.id);
      assert.doesNotMatch(x.grade, /ضعيف|دون|إلا|موقوف/, x.id);
      assert.match(x.url, /^https:\/\/hadeethenc\.com\//);
    } else {
      assert.equal(x.src, 'hisn');
      assert.ok(x.dorar && x.dorar.muhaddith && x.dorar.grade, x.id);
      assert.match(x.dorar.grade, /صحيح|حسن/, x.id);
      assert.doesNotMatch(x.dorar.grade, /ضعيف|منكر|موضوع|لا يصح|ليس بصحيح|لولا|مدلس|منقطع|مجهول|لكن/, x.id);
      assert.match(x.dorar.url, /^https:\/\/dorar\.net\//);
      assert.ok(!x.audio || x.audio.startsWith('https://www.hisnmuslim.com/'), x.id);
    }
    assert.ok(D.themes.some(t => t.id === x.theme), x.id);
  }
});

test('adhkar: «أذكار النوم», «ماذا أقول في التشهد», "morning adhkar" → the right items', () => {
  for (const [q, theme] of [['أذكار النوم', 'sleep'], ['ماذا أقول في التشهد', 'prayer'], ['morning adhkar', 'morning'], ['دعاء السفر', 'travel']]) {
    assert.equal(toolIntent(q).tool, 'athkar', q);
    const aq = athkarQuery(q);
    assert.equal(aq.theme, theme, q);
    const list = filterAthkar(D.items, aq);
    assert.ok(list.length > 0, q);
    assert.ok(list.every(x => x.theme === theme), q);
  }
  const tash = filterAthkar(D.items, athkarQuery('ماذا أقول في التشهد'));
  assert.ok(tash.some(x => /التحيات/.test(x.text.replace(/[ً-ٰٟ]/g, ''))), 'the tashahhud itself');
});
