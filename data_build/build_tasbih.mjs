// Builds public/data/tasbih.json — the formulas of the tasbih counter.
//
//   node data_build/build_tasbih.mjs
//
// Nothing is typed here: each formula is CUT from the verbatim text of a graded hadith of the site's adhkar file
// (public/data/athkar.json: HadeethEnc, and Hisn al-Muslim checked on the Dorar Hadith Encyclopedia). A formula is
// given by its source and by the first and last words to keep; the script fails if they are not found.
import { readFileSync, writeFileSync } from 'node:fs';

const athkar = JSON.parse(readFileSync('public/data/athkar.json', 'utf8'));
const byId = new Map(athkar.items.map(x => [x.id, x]));

// key, source id, first words, last words, count suggested, transliteration (for the English interface)
const FORMULAS = [
  ['subhan', 'he:5475', 'سُبْحَانَ اللهِ', 'سُبْحَانَ اللهِ', 33, 'Subḥān Allāh'],
  ['hamd', 'he:5475', 'الْحَمْدُ لِلهِ', 'الْحَمْدُ لِلهِ', 33, 'Al-ḥamdu lillāh'],
  ['takbir', 'he:5475', 'اللهُ أَكْبَرُ', 'اللهُ أَكْبَرُ', 34, 'Allāhu akbar'],
  ['tahlil', 'he:3567', 'لَا إِلَهَ إِلَّا اللهُ', 'لَا إِلَهَ إِلَّا اللهُ', 100, 'Lā ilāha illā Allāh'],
  ['tahlil10', 'he:5517', 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ', 'عَلَى كُلِّ شَيْءٍ قَدِيرٌ', 10, 'Lā ilāha illā Allāh waḥdahu lā sharīka lah…'],
  ['istighfar', 'hm:96', 'أَسْتَغْفِرُ اللَّهَ', 'وَأَتُوبُ إِلَيْهِ', 100, 'Astaghfiru Allāha wa atūbu ilayh'],
  ['salat', 'hm:53', 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', 'إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ', 10, 'Allāhumma ṣalli ʿalā Muḥammad…'],
  ['subhanbihamdihi', 'hm:91', 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', 100, 'Subḥān Allāhi wa biḥamdih'],
  ['kalimatan', 'hm:256', 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', 'سُبْحانَ اللَّهِ الْعَظِيمِ', 33, 'Subḥān Allāhi wa biḥamdih, subḥān Allāhi l-ʿaẓīm'],
  ['baqiyat', 'he:5475', 'سُبْحَانَ اللهِ', 'وَاللهُ أَكْبَرُ', 33, 'Subḥān Allāh, wal-ḥamdu lillāh, wa lā ilāha illā Allāh, wa Allāhu akbar'],
  ['hawqala', 'hm:22', 'لاَ حَوْلَ', 'إِلاَّ بِاللَّهِ', 33, 'Lā ḥawla wa lā quwwata illā billāh'],
  ['hasbi', 'hm:83', 'حَسْبِيَ اللَّهُ', 'رَبُّ الْعَرْشِ الْعَظِيمِ', 7, 'Ḥasbiya Allāhu lā ilāha illā Huwa…'],
];

const grade = (x) => (x.dorar && x.dorar.grade) || x.grade || '';
const link = (x) => (x.dorar && x.dorar.url) || x.url || '';

// the markers are compared without vowel marks (the sources do not all write them in the same order); the slice is
// taken from the ORIGINAL text, vowels and all
const MARK = /[ً-ٰٟـ]/;
const fold = (c) => c.replace(/[أإآٱ]/, 'ا').replace('ى', 'ي');
function plainWithMap(text) {
  let plain = ''; const map = [];
  for (let i = 0; i < text.length; i++) { if (MARK.test(text[i])) continue; plain += fold(text[i]); map.push(i); }
  return { plain, map };
}
const plainOf = (s) => plainWithMap(s).plain;
// [start, end) of a marker in the original text, at or after `from` (an index of the original text)
function locate(text, marker, from = 0) {
  const { plain, map } = plainWithMap(text);
  const startPlain = map.findIndex(i => i >= from);
  const k = plain.indexOf(plainOf(marker), Math.max(0, startPlain));
  if (k < 0) return null;
  const last = map[k + plainOf(marker).length - 1];
  let end = last + 1;
  while (end < text.length && MARK.test(text[end])) end++;          // keep the vowels of the last letter
  return [map[k], end];
}

const out = FORMULAS.map(([key, id, from, to, count, tr]) => {
  const src = byId.get(id);
  if (!src) throw new Error(`${key}: source ${id} missing`);
  const a = locate(src.text, from);
  if (!a) throw new Error(`${key}: «${from}» not in ${id}`);
  const b = from === to ? a : locate(src.text, to, a[1]);
  if (!b) throw new Error(`${key}: «${to}» not in ${id} after «${from}»`);
  const text = src.text.slice(a[0], b[1]);
  return { key, text, count, tr, source: id, grade: grade(src), url: link(src),
    by: src.src === 'hisn' ? 'حصن المسلم' : 'HadeethEnc', hadith: src.text.length > text.length + 4 ? src.text : null };
});
writeFileSync('public/data/tasbih.json', JSON.stringify({ note: 'Each formula is cut from the verbatim text of its source (data_build/build_tasbih.mjs).', formulas: out }, null, 1));
for (const f of out) console.log(f.key.padEnd(16), f.count, f.grade, '|', f.text.slice(0, 70));
