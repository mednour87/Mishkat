// T122 (6 Oct 2026): verified answers (public/js/facts.js) and the approved encyclopedias of creed and history
// (functions/_lib/fiqh.js with enc 'aqeeda', functions/_lib/history.js, public/js/encyc.js). Every figure is
// computed from the data, every hadith exists in HadeethEnc with grade صحيح, every prophet's verse names him.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { factAnswer, PROPHETS } from '../public/js/facts.js';
import { suraOfIndex } from '../public/js/stats.js';
import { normAr } from '../public/js/engine.js';
import { encycKinds } from '../public/js/encyc.js';
import { parseHistorySearch, historyQuery, excerpt } from '../functions/_lib/history.js';
import { parseDorarSearch } from '../functions/_lib/fiqh.js';

const J = (p) => JSON.parse(readFileSync(new URL('../public/data/' + p, import.meta.url), 'utf8'));
const core = J('core.json'), plain = J('search_ar.json'), meta = J('mushaf_meta.json'), suraOf = suraOfIndex(core);
const ctx = (lang = 'ar') => ({ core, plain, meta, suraOf, lang });
const ask = (q) => factAnswer(q, ctx(/[ء-ي]/.test(q) ? 'ar' : 'en'));
const idx = (r) => { const [s, a] = r.split(':').map(Number); return core.suras[s - 1].first + a - 1; };

test('facts: the questions the author reported («the number of verses, of surahs») are answered exactly', () => {
  const cases = [
    ['كم عدد آيات القرآن', 'verses_count', /6236/], ['كم سورة في القرآن', 'suras_count', /114/], ['كم عدد سور القرآن الكريم', 'suras_count', /86 مكية و28 مدنية/],
    ['شحال من آية في القرآن', 'verses_count', /6236/], ['how many verses are in the quran', 'verses_count', /6236/], ['how many surahs are in the quran', 'suras_count', /114/],
    ['كم عدد آيات سورة البقرة', 'sura_verses', /286/], ['كم آية في البقرة', 'sura_verses', /286/], ['how many verses in surah al-kahf', 'sura_verses', /110/],
    ['سورة الكهف مكية أم مدنية', 'sura_type', /مكية/], ['is surah al-mulk meccan or medinan', 'sura_type', /Meccan/], ['ما هي السورة رقم 18', 'sura_by_number', /الكهف/],
    ['في أي جزء سورة الملك', 'sura_juz', /29/], ['كم عدد أجزاء القرآن', 'juz_count', /30/], ['كم عدد الأحزاب', 'hizb_count', /60/], ['كم عدد صفحات المصحف', 'pages_count', /604/],
    ['كم عدد سجدات التلاوة', 'sajdas', /15/], ['كم سورة تبدأ بالحروف المقطعة', 'muqattaat', /29/], ['ما السورة التي لا تبدأ بالبسملة', 'no_basmala', /التوبة/],
    ['ما السورة التي فيها البسملة مرتين', 'basmala_twice', /النمل/], ['كم مرة وردت البسملة', 'basmala_count', /114/], ['ما أطول سورة في القرآن', 'longest_sura', /البقرة/],
    ['ما هي أقصر سورة', 'shortest_sura', /الكوثر/], ['ما أطول آية', 'longest_verse', /282/], ['كم مرة ذكر اسم موسى في القرآن', 'word_count', /«موسى» 136/],
    ['كام مرة اتذكر اسم موسى في القرآن', 'word_count', /136/], ['how many times is musa mentioned in the quran', 'word_count', /136/], ['كم مرة ذكرت الجنة', 'word_count', /«الجنة»/],
    ['كم عدد الأنبياء المذكورين في القرآن', 'prophets_count', /25/], ['how many prophets are mentioned in the quran', 'prophets_count', /25/],
  ];
  for (const [q, id, re] of cases) { const f = ask(q); assert.ok(f, q); assert.equal(f.id, id, q); assert.match(f.answer, re, q); }
});

test('facts: hadith answers cite an authentic HadeethEnc hadith that contains the stated words', () => {
  const all = [];
  for (const f of readdirSync(new URL('../public/data/hadeeth/ar/', import.meta.url))) all.push(...JSON.parse(readFileSync(new URL('../public/data/hadeeth/ar/' + f, import.meta.url), 'utf8')));
  const bare = (s) => normAr(s).replace(/\s+/g, ' ');
  const cases = [['ما هي أركان الإسلام', 'pillars_islam', 'بني الاسلام علي خمس'], ['أركان الإيمان', 'pillars_iman', 'ان تومن بالله وملايكته وكتبه ورسله واليوم الاخر'],
    ['ما هو الإحسان', 'ihsan', 'ان تعبد الله كانك تراه'], ['ما أعظم سورة في القرآن', 'greatest_sura', 'اعظم سوره في القران'], ['ما هي أعظم آية', 'greatest_verse', 'اي ايه من كتاب الله معك اعظم'],
    ['سورة الإخلاص تعدل ثلث القرآن', 'third_quran', 'ثلث القران'], ['أول سورة نزلت', 'first_revealed', 'اقرا باسم ربك الذي خلق'], ['كم عدد أسماء الله الحسنى', 'names_99', 'تسعه وتسعون اسما'],
    ['كم عدد الصلوات المفروضة', 'daily_prayers', 'خمس صلوات في كل يوم وليله'], ['what are the five pillars of islam', 'pillars_islam', 'بني الاسلام علي خمس']];
  for (const [q, id, words] of cases) {
    const f = ask(q); assert.ok(f, q); assert.equal(f.id, id, q); assert.ok(f.hadiths.length, q);
    const h = all.filter(x => f.hadiths.includes(x.id));
    assert.equal(h.length, f.hadiths.length, `${q}: every hadith exists`);
    assert.ok(h.every(x => /صحيح/.test(x.grade)), `${q}: authentic`);
    assert.ok(h.some(x => bare(x.text).replace(/ة/g, 'ه').includes(words.replace(/ة/g, 'ه'))), `${q}: the hadith states «${words}»`);
  }
});

test('facts: each prophet named with a verse that names him; evidence verses exist', () => {
  assert.equal(PROPHETS.length, 25);
  // the Uthmani script writes some long alifs as a small (dagger) alif: «إبرٰهيم», «سليمٰن» — compared without alif
  const noAlif = (s) => s.replace(/ا/g, '');
  const stem = (n) => noAlif(normAr(n).replace(/^ال/, '').replace(/^ذو /, '').replace(/ي$/, ''));
  for (const [ar, , ref] of PROPHETS) {
    const v = noAlif(normAr(core.verses[idx(ref)]));
    // «إبرٰهـۧم» also writes its ya small: the consonant skeleton is compared when the alif-less form is not found
    const skel = (s) => s.replace(/[وي]/g, '');
    assert.ok(v.includes(stem(ar)) || (stem(ar).length >= 4 && skel(v).includes(skel(stem(ar)))), `${ar} in ${ref}`);
  }
  const short = ask('ما هي أقصر آية في القرآن');
  for (const r of ['20:1', '36:1', '55:64']) assert.ok(short.verses.includes(idx(r)), r);
});

test('facts: no answer when the question is not a fact (the search engine keeps it)', () => {
  for (const q of ['الصبر', 'تفسير سورة الكهف', 'آية الكرسي', 'كم سورة حفظت', 'اطول اية في سورة ال عمران', 'ما حكم الموسيقى', 'قصة يوسف', 'how to be patient']) assert.equal(ask(q), null, q);
});

test('encyclopedias: which box completes which answer', () => {
  assert.deepEqual(encycKinds({ type: 'notfound' }, 'من هو أول الخلفاء الراشدين'), ['aqeeda', 'history']);
  assert.deepEqual(encycKinds({ type: 'topic' }, 'متى كانت غزوة بدر'), ['history']);
  assert.deepEqual(encycKinds({ type: 'term' }, 'ما هو التوحيد'), ['aqeeda']);
  assert.deepEqual(encycKinds({ type: 'topic' }, 'الصبر'), []);
  assert.deepEqual(encycKinds({ type: 'topic', crisis: true }, 'عذاب القبر'), []);
  assert.deepEqual(encycKinds({ type: 'topic', polemic: true }, 'غزوة بدر'), []);
  assert.deepEqual(encycKinds({ type: 'sura' }, 'سورة الكهف'), []);
  assert.deepEqual(encycKinds({ type: 'topic' }, 'قصة يوسف'), []);
});

test('history: the question words, the event page parsed verbatim, long events cut at a sentence end', () => {
  assert.equal(historyQuery('متى كانت غزوة بدر'), 'غزوة بدر');
  assert.equal(historyQuery('متى توفي النبي صلى الله عليه وسلم'), 'وفاة النبي');
  const html = `<div class="event-container" data-event-id="99"><h6><div> <i class="fa fa-history px-2" aria-hidden="true"></i> غَزوةُ بدرٍ (الكُبرى) . </div></h6>
    <strong> العام الهجري : <span class="primary-text-color"> 2 </span> </strong><strong class="px-3"> الشهر القمري : <span class="primary-text-color"> رمضان</span> </strong>
    <strong class="px-3"> العام الميلادي : <span class="primary-text-color">624</span> </strong><h6 class="mt-3 font-weight-bold">تفاصيل الحدث:</h6> <p> ندَب رسولُ الله صلى الله عليه وسلم نَفرًا. <br /> ثم كان ما كان. </p></div>`;
  const [e] = parseHistorySearch(html);
  assert.deepEqual({ id: e.id, title: e.title, hijri: e.hijri, month: e.month, greg: e.greg, text: e.text }, { id: 99, title: 'غَزوةُ بدرٍ (الكُبرى)', hijri: '2', month: 'رمضان', greg: '624', text: ['ندَب رسولُ الله صلى الله عليه وسلم نَفرًا.', 'ثم كان ما كان.'] });
  const long = excerpt(['أ'.repeat(200) + '. ' + 'ب'.repeat(2000)], 400);
  assert.equal(long.cut, true); assert.ok(long.paras[0].endsWith('. …'));
});

test('creed encyclopedia: the search page of dorar.net/aqeeda is read like the fiqh one', () => {
  const html = '<article class="border-bottom py-4"><h5>1 - المَطلَبُ الثَّالِثُ: العَشَرةُ المُبَشِّرُونَ بالجَنَّةِ.</h5><a href="/aqeeda/2321">x</a><span class="text-muted">الكتاب - المبحث</span></article>';
  const [x] = parseDorarSearch(html, 'aqeeda');
  assert.equal(x.id, 2321); assert.equal(x.url, 'https://dorar.net/aqeeda/2321');
  assert.equal(parseDorarSearch(html).length, 0, 'the fiqh reader does not take a creed link');
});
