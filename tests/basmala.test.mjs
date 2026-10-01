import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBasmala } from '../public/js/basmala.js';
import { readJson } from './load.mjs';

test('basmala accepted in all common written and spoken forms', () => {
  const core = readJson('core.json');
  const ok = [
    core.verses[0],                                   // Uthmani (Tanzil 1:1)
    'بسم الله الرحمن الرحيم', 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', 'بسم الله الرحمان الرحيم', 'بسم الله الرحمن الرحيم.',
    'باسم الله الرحمن الرحيم', 'وبسم الله الرحمن الرحيم', 'بسمِ اللهِ', 'بسم الله', 'باسم الله', 'بسم اللہ الرحمن الرحیم',
    '  بسم   الله   الرحمن  الرحيم  ', 'بسم الله الرحمن الرحيم،', 'بسم الله الرحمن الرحيم صدق الله العظيم'.split(' صدق')[0],
    'Bismillah', 'bismillah', 'Bismillahi', 'Bismillah ar-Rahman ar-Rahim', 'Bismillahir Rahmanir Rahim', 'bismillahirrahmanirrahim',
    'Bismi Allah', 'bismillah al rahman al rahim', 'Bismillāhi r-raḥmāni r-raḥīm', 'BISMILLAH',
  ];
  for (const t of ok) assert.ok(isBasmala(t), `should accept: ${t}`);
});

test('other texts are rejected', () => {
  const bad = ['', 'الحمد لله رب العالمين', 'الله', 'بسم', 'قل هو الله أحد', 'hello', 'password', 'bismark', 'الرحمن الرحيم',
    'سبحان الله', 'Allahu akbar', '123456', 'بسمة', 'in the name'];
  for (const t of bad) assert.ok(!isBasmala(t), `should reject: ${t}`);
});
