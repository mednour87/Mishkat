import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fatwaQuery, parseBinbazFatwa, fatwaSearch } from '../functions/_lib/fatwa.js';
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

test('a fatwa page is reduced to its question, answer paragraphs and audio, verbatim', () => {
  const html = `<article class="fatwa"><h1 class="article-title article-title--primary"> حكم كذا </h1>
    <h2 class="article-title article-title__question article-title--primary" itemprop="alternativeHeadline"><i></i><p><strong>السؤال:</strong></p><p>ما حكم كذا؟</p></h2>
    <div class="row audio"><div id="jp" data-files="[{&quot;link&quot;:&quot;https:\\/\\/files.zadapps.info\\/binbaz.org.sa\\/fatawa\\/x\\/y.mp3&quot;}]"></div></div>
    <div itemprop="articleBody" class="article-content"><p><strong>الجواب:</strong></p><p>الجواب الأول.</p><p>والثاني <a href="#">رابط</a>.</p></div>`;
  const f = parseBinbazFatwa(html);
  assert.equal(f.title, 'حكم كذا');
  assert.equal(f.question, 'ما حكم كذا؟');
  assert.deepEqual(f.answer, ['الجواب الأول.', 'والثاني رابط .']);
  assert.equal(f.audio, 'https://files.zadapps.info/binbaz.org.sa/fatawa/x/y.mp3');
});

test('fatwa search: only the site results are returned, an AI-free fallback keeps the site order', async () => {
  const fake = async (url) => ({ ok: true, json: async () => ({ Search: { total: 2, results: [
    { id: 7, title: 'حكم الأغاني والموسيقى', searchHighlights: { description: ['<em>الموسيقى</em> محرمة'] } },
    { id: 9, title: 'سماع الموسيقى الهادئة', searchHighlights: {} }] } }) });
  const r = await fatwaSearch({ q: 'ما حكم الموسيقى', ai: false }, {}, fake);
  assert.equal(r.ok, true);
  assert.deepEqual(r.items.map(x => x.id), [7, 9]);
  assert.equal(r.items[0].url, 'https://binbaz.org.sa/fatwas/7');
  assert.equal(r.items[0].snippet, 'الموسيقى محرمة');
  const bad = await fatwaSearch({ id: 'x' }, {}, fake);
  assert.equal(bad.ok, false);
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
