import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fatwaQuery, parseDorarFiqh, parseDorarSearch, fiqhSearch, consensusOf, authoritiesOf } from '../functions/_lib/fiqh.js';
import { topK } from '../functions/_lib/dense.js';
import { pick } from '../functions/api/pick.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('every JavaScript file of the site and of the API parses', () => {
  const files = [];
  for (const dir of ['public/js', 'functions', 'functions/_lib', 'functions/api']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) if (f.endsWith('.js')) files.push(path.join(ROOT, dir, f));
  }
  for (const f of files) execFileSync(process.execPath, ['--check', f]);
  assert.ok(files.length > 15);
});

test('fatwa query keeps the subject and drops the ruling words', () => {
  assert.equal(fatwaQuery('ما حكم الموسيقى؟'), 'الموسيقى');
  assert.equal(fatwaQuery('هل يجوز الجمع بين الصلاتين للمسافر'), 'الجمع بين الصلاتين للمسافر');
  assert.equal(fatwaQuery('What is the ruling on music?'), '');
});

// T081: rulings come only from the Fiqh Encyclopedia of Ad-Durar As-Saniyyah (dorar.net/feqhia, approved by the
// challenge pack) — never from binbaz.org.sa (not in the pack). Fixtures = real pages saved on 4 October 2026.
const FX = (n) => fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', `dorar_feqhia_${n}.html`), 'utf8');

test('fiqh: an encyclopedia section is reduced to its title, path and statement of the ruling, verbatim', () => {
  const smoke = parseDorarFiqh(FX('3401'));
  assert.equal(smoke.title, 'المطلب الأوَّل: حكمُ شرب التبغِ (الدخان)'.normalize('NFC'));
  assert.equal(smoke.path[0], 'كتاب الأشربة');
  assert.equal(smoke.ruling.length, 1, 'the evidence («الأدلة»…) is not part of the statement');
  assert.match(smoke.ruling[0], /^يَحرُمُ شُربُ التَّبغِ \(الدخان\)/);
  assert.match(smoke.ruling[0], /وبه أفتَتِ اللَّجنةُ الدَّائِمةُ$/);
  assert.doesNotMatch(smoke.ruling[0], /\[\d+\]|الدر المختار/, 'footnotes are kept apart');
  assert.ok(smoke.refs.length > 0);
  assert.deepEqual(smoke.authorities, ['committee', 'binbaz', 'uthaymin']);
  const shamma = parseDorarFiqh(FX('3403'));
  assert.equal(shamma.title, 'المطلب الثَّاني: حُكمُ تَناوُلِ الشَّمَّةِ'.normalize('NFC'), 'a footnote inside the title is removed');
  const dance = parseDorarFiqh(FX('4437'));
  assert.match(dance.ruling[0], /^يُباحُ الرَّقصُ للرِّجالِ/);
});

test('fiqh: consensus and difference are read from the encyclopedia’s own words', () => {
  assert.equal(consensusOf('يَحرُمُ استِعمالُ المعازِفِ إلَّا ما استَثناه الشَّرعُ، وهذا باتِّفاقِ المَذاهِبِ الفِقهيَّةِ الأربَعةِ'), 'ijma');
  assert.equal(consensusOf('يجب كذا، ونقل الإجماع على ذلك ابن المنذر'), 'ijma');
  assert.equal(consensusOf('اختلف العلماء في كذا على قولين'), 'khilaf');
  assert.equal(consensusOf('وهو مذهب الجمهور'), 'jumhur');
  assert.equal(consensusOf('يُباحُ الرَّقصُ للرِّجالِ'), null);
  assert.deepEqual(authoritiesOf('وبه صدرت فتوى هيئة كبار العلماء'), ['council']);
});

test('fiqh search: results of the encyclopedia only; without AI only sections whose path names the subject', async () => {
  const items = parseDorarSearch(FX('search'));
  assert.equal(items[0].id, 3403);
  assert.equal(items[0].path, 'كتاب الأشربة - المبحث الثَّاني: حكمُ تناولِ التَّبْغِ'.normalize('NFC'));
  const urls = [];
  const fake = async (url) => { urls.push(url); return { ok: true, url, text: async () => FX('search') }; };
  const r = await fiqhSearch({ q: 'ما حكم التدخين', kw: ['التبغ'], ai: false }, {}, fake);
  assert.equal(r.ok, true);
  assert.ok(urls.every(u => u.startsWith('https://dorar.net/feqhia/')), 'only dorar.net/feqhia is queried');
  assert.ok(r.items.length >= 1 && r.items.every(x => /التبغ|التَّبْغِ|التَّبغِ/.test(x.path + x.snippet)));
  assert.ok(!r.items.some(x => x.id === 12898), '«تبغي» (to transgress) is not tobacco');
  const none = await fiqhSearch({ q: 'ما حكم الموسيقى', ai: false }, {}, fake);
  assert.deepEqual(none.items, [], 'a word only in a footnote is not an answer: abstain');
  const bad = await fiqhSearch({ id: 'x' }, {}, fake);
  assert.equal(bad.ok, false);
  const blocked = await fiqhSearch({ id: 5 }, {}, async () => ({ ok: true, text: async () => '<title>Attention Required! | Cloudflare</title>' })).catch(e => ({ ok: false, error: e.message }));
  assert.equal(blocked.ok, false);
});

test('fiqh: no source outside the reference pack in the rulings code', () => {
  const src = fs.readFileSync(path.join(ROOT, 'functions', '_lib', 'fiqh.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /binbaz\.org\.sa|islamqa|islamweb/);
  const app = fs.readFileSync(path.join(ROOT, 'public', 'js', 'app.js'), 'utf8');
  assert.doesNotMatch(app, /binbaz\.org\.sa\/search|loadFatwas/);
});

test('semantic neighbours: int8 cosine ranks the closest vectors first', () => {
  const DIM = 1024, n = 3, v = new Int8Array(n * DIM);
  v[0] = 127; v[DIM + 1] = 127; v[2 * DIM] = 90; v[2 * DIM + 1] = 90;
  const q = new Float32Array(DIM); q[1] = 1;
  const top = topK(v, q, 3);
  assert.deepEqual(top.map(x => x.i), [1, 2, 0]);
  assert.ok(Math.abs(top[0].s - 1) < 1e-6);
});

test('pick: without an AI model, nothing is invented (error, no selection)', async () => {
  const r = await pick({ query: 'الصبر', items: ['أ', 'ب'] }, {});
  assert.equal(r.ok, false);
});
