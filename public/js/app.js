import { createEngine, detectLang, guardCheck, SOURCES_NEEDED, TAFSIR_FOR, TRANSLATION_FOR, PARAGRAPH_FOR, normAr, tokens, isCrisis, isSensitiveText } from './engine.js';
import { routeTool } from './tools.js';
import { socialHTML } from './social.js';
import { glowOf, glowLevel, addListen, addTasbih, addName, paintGlow, ray } from './glow.js';
import { createAsma, AS as ASMA_S } from './asma.js';
import { createPrayerBreak, resumesWithBasmala } from './prayerbreak.js';
import { wordFacts } from './dwell.js';
import { UI, ABOUT, WELCOME, INTEREST } from './i18n.js';
import { SHAPES, ORDERS, buildLayout } from './layouts.js';
import { isBasmala } from './basmala.js';
import { lampSVG, setLampWord } from './lamp.js';
import { listen, stopListening, cancelListening, voiceSupported } from './voice.js?v=t122';
import { encycKinds, ENC_S } from './encyc.js';
import { createSpeaker, browserVoice } from './speech.js';
import { PALETTE } from './galaxy.js';
import { createPanels } from './panels.js';
import { createToolPanels, S as TOOL_S } from './toolpanels.js';
import { loadPrefs, savePrefs } from './prefs.js';
import { decodeRead, encodeRead, markRead, isRead, surasRead, ymd, addRecord, countRead } from './khatma.js';
import { miniLamp, openLampMap, progressOf } from './lampmap.js';
import { createPractical, PS as PRACT_S, qiblaBearing } from './practical.js';
import { createAthkar, AS as ATHKAR_S } from './athkar.js';
import qrcode from '../vendor/qrcode/qrcode.js';
import { mapQuestion, islamicRest, normQ, SCOPE_S } from './scope.js';
import { noteRead, checkKhatma, rollMonth, monthPct, weekly, rewardScore, engagement, hifzProgress } from './progress.js';
import { createTekrar, TK } from './tekrar.js';
import { createTasbih, TS as TASBIH_S } from './tasbih.js';
import { createStats, ST } from './stats.js';
import { drawMini, animateMini, EG } from './engage3d.js';
import { setupPWA, openInstall, canPrompt, isStandalone, onInstallChange, PW } from './pwa.js';
import { setupWake } from './wake.js';
import { toHijri, formatHijri } from './hijri.js';
import { colourToken, tokenOffsets, GROUPS as TJ_GROUPS, TJ_S, RULE_INFO, verseRules } from './tajweed.js';

// strings of the features added on 4 October (T090–T098), Arabic + English
const X = {
  ar: {
    childTitle: 'سؤال جميل — بارك الله فيك', child: 'ما زلت صغيرًا، والفتوى يتولّاها العلماء الذين ختموا القرآن وتعلّموا تفسيره وأحكامه. «مشكاة» تساعدك الآن على أن تحفظ القرآن وتفهم معانيه خطوة بخطوة.',
    childAsk: 'أيّ سورة تحبّ أن تحفظ؟', childGo: 'ابدأ الحفظ', childKhatma: 'أو ابدأ خطة ختمة', childParent: 'ويمكنك أن تسأل والديك أو معلّمك عن هذا السؤال.',
    khatmaDone: (n) => `مبارك! أتممت ختم القرآن الكريم — هذه ختمتك رقم ${n}. تقبّل الله منك، والختمة الجديدة تبدأ الآن.`, khCount: (n) => `${n} ختمة`, khTitle: 'عدد الختمات',
    hudRead: 'قراءة الشهر', hudHifz: 'حفظ الشهر', hudWeek: (r, g, a, h) => `هذا الأسبوع — قراءة: ${r} من ${g} آية · تكرار: ${a} من ${h} آية`, hudOpen: 'افتح خريطة التزامك',
    placeTitle: 'أين أنت؟', placeLead: 'اختر بلدك ومدينتك، أو اسمح باستعمال موقعك، ليُضبط التقويم ومواقيت الصلاة والمساجد القريبة والتذكير. يُحفظ في متصفحك فقط.', placeLater: 'لاحقًا', placeOk: (p) => `تم: ${p}`,
    svcTitle: 'خدمات مشكاة لهذه السورة:', svcTekrar: '↻ احفظها بالتكرار', svcStats: '📊 إحصاءاتها',
    engBtn: 'مستوى التزامك', install: 'ثبّت', age: 'العمر', childAge: 'أقل من ١٨', adultAge: '١٨ فأكثر',
    rdFold: 'اطوِ شريط القراءة إلى سطر واحد / افتحه', readFull: 'قراءة فقط', readFullT: 'المصحف بملء الشاشة (اضغط مرة أخرى لإظهار المجرّة)', galaxyBack: 'أظهر المجرّة', tjClose: 'أغلق أحكام التجويد (تبقى الألوان)', pMax: 'كبّر اللوحة', pMin: 'أعدها إلى حجمها',
    suraEnd: (n) => `نهاية سورة ${n}`, suraDone: 'أتممت السورة ✓', suraDoneOk: 'سُجّلت السورة مقروءة ✓', suraDoneHelp: 'تُسجَّل في الختمة وفي سجلّ قراءتك، ويُعاد توزيع الباقي من خطتك.', nextSura: (n) => `السورة التالية: ${n}`, firstSura: 'ابدأ من الفاتحة',
  },
  en: {
    childTitle: 'A lovely question — may Allah bless you', child: 'You are still young, and fatwas belong to scholars who completed the Quran and learned its explanation and rulings. Mishkat helps you now to memorise the Quran and understand its meanings step by step.',
    childAsk: 'Which surah would you like to memorise?', childGo: 'Start memorising', childKhatma: 'or start a khatma plan', childParent: 'You can also ask your parents or your teacher about this question.',
    khatmaDone: (n) => `Mabrook! You completed the whole Quran — this is your khatma number ${n}. May Allah accept it from you; the new khatma starts now.`, khCount: (n) => `${n} khatma${n === 1 ? '' : 's'}`, khTitle: 'Khatmas',
    hudRead: 'read this month', hudHifz: 'memorised', hudWeek: (r, g, a, h) => `This week — reading: ${r} of ${g} verses · repetition: ${a} of ${h} verses`, hudOpen: 'Open your engagement map',
    placeTitle: 'Where are you?', placeLead: 'Choose your country and city, or allow your location, to set the calendar, prayer times, nearby mosques and reminders. Kept in your browser only.', placeLater: 'Later', placeOk: (p) => `Done: ${p}`,
    svcTitle: 'Mishkat services for this surah:', svcTekrar: '↻ Memorise it by repetition', svcStats: '📊 Its statistics',
    engBtn: 'Your engagement level', install: 'Install', age: 'Age', childAge: 'Under 18', adultAge: '18 or over',
    rdFold: 'Fold the reading bar to one line / unfold it', readFull: 'Reading only', readFullT: 'The Mushaf full screen (press again to see the galaxy)', galaxyBack: 'Show the galaxy', tjClose: 'Close the tajweed rules (the colours stay)', pMax: 'Enlarge the panel', pMin: 'Back to the normal size',
    suraEnd: (n) => `End of surah ${n}`, suraDone: 'I finished this surah ✓', suraDoneOk: 'Surah recorded as read ✓', suraDoneHelp: 'It counts in your khatma and in your reading record; the rest of your plan is spread again.', nextSura: (n) => `Next surah: ${n}`, firstSura: 'Start again from al-Fatiha',
  },
};
const XS = () => X[state.lang] || X.ar;
try { if (localStorage.getItem('mishkat.rdFold') === '1') document.body.classList.add('rd-folded'); } catch (e) { /* storage blocked */ }

// Three moments, one current verse (body[data-mode]):
//   home    — the galaxy alone, with a suggestion card in the middle (can be closed);
//   answers — after a question: the answers, large, beside the galaxy where the
//             surahs of the answer light up, each in its own colour, with clickable labels;
//   study   — after choosing a verse: galaxy above, the Mushaf with the recitation
//             below, the tafsir at the side; the answers fold into a bar above the
//             tafsir (hover or click to unfold them — the tafsir then folds).
// Choosing a verse anywhere (answer, galaxy star or label, Mushaf, tafsir arrows)
// moves the reader, the tafsir and the camera together.

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AUDIO_BASE = 'https://verses.quran.com/';
const arNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const HAS_LETTER = /[ء-يٱ]/;
const LANGS = ['ar', 'en'];
const store = {
  get(k, d = null) { try { const v = localStorage.getItem('mishkat.' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mishkat.' + k, String(v)); } catch (e) { /* private mode */ } },
};

let metaP = null;   // data/mushaf_meta.json (first verse of each of the 604 pages, juz…), 3 KB, loaded at start
const state = {
  lang: 'ar', engine: null, galaxy: null, core: null, llm: null, llmModel: null, words: null,
  result: null, reader: { sura: null, cur: null, hits: new Set() },
  taf: { book: null, text: '', lang: 'ar', tok: 0, idx: null },
  audio: null, playing: false, continuous: store.get('auto', '1') === '1', timing: new Map(), saadi: new Map(), translit: new Map(), raf: 0,
  repeat: 1, repeatLeft: null, speed: +store.get('speed', '1') || 1,
  qs: +store.get('qs', '1') || 1, ts: +store.get('ts', '1') || 1,
  showTranslit: store.get('tl', '1') === '1', showTr: store.get('tr', '1') === '1',
  pane: 'r', tts: false, mode: 'home', playMode: 'one', suggestClosed: false, colorOf: new Map(),
  panels: null, tools: null, prefs: loadPrefs(),     // prefs + khatma: this browser only (js/prefs.js)
  dwell: null,                                        // hover-dwell on a word of the galaxy (D1)
  tjOn: store.get('tj', '0') === '1', tajweedData: new Map(),   // T099 tajweed colours in the reader
};

// ------------------------------------------------------------------ i18n
function pickLang() {
  const url = new URL(location.href).searchParams.get('lang');
  // (5 Oct) first visit: Arabic by default; English only when the browser's first language is English of a country
  // whose usual language is English (en-US, en-GB…). An Arab, French or Turkish visitor starts in Arabic and may switch.
  const first = String((navigator.languages && navigator.languages[0]) || navigator.language || 'ar');
  const EN_LANDS = ['US', 'GB', 'AU', 'NZ', 'IE', 'CA', 'ZA', 'JM', 'TT', 'BS', 'BB', 'BZ', 'GY', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'SG', 'PH', 'NG', 'GH', 'KE', 'UG', 'ZM', 'ZW', 'BW', 'MW', 'SL', 'LR', 'GM', 'FJ', 'PG'];
  const m = first.match(/^en[-_]([A-Za-z]{2})/);
  const nav = m && EN_LANDS.includes(m[1].toUpperCase()) ? 'en' : 'ar';
  return [url, store.get('lang'), nav].find(l => LANGS.includes(l)) || 'ar';
}
const T = () => UI[state.lang];

function heroSlice() {
  // 24:35, words 5–9 — taken from the Tanzil text, never typed by hand
  if (!state.core) return '';
  const S = state.core.suras[23];
  return state.core.verses[S.first + 34].split(' ').slice(4, 9).join(' ');
}

function applyLang(lang) {
  state.lang = lang;
  const t = UI[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = t.dir;
  store.set('lang', lang);
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t[el.dataset.i18nPh]; });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t[el.dataset.i18nAria]); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t[el.dataset.i18nTitle]; });
  document.querySelectorAll('.langs button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  { const l = $('#themeBtn .tl2'); if (l) l.textContent = t[document.documentElement.dataset.theme === 'light' ? 'themeLight' : 'themeDark']; }
  fillViewPickers();
  $('#legendBox').innerHTML = t.legendItems.map(([c, x]) => `<div><i style="background:${c};color:${c}"></i>${esc(x)}</div>`).join('');
  $('#aboutBody').innerHTML = ABOUT[lang].replace(/\{\{V24_35\}\}/g, esc(heroSlice())) + socialHTML(lang, esc) + `<p class="rights">${esc(T().rights)} · <a href="https://mishkatquran.org">mishkatquran.org</a></p>`;
  { const r = $('#ndSocialRow'); if (r) r.innerHTML = socialHTML(lang, esc); }
  $('#aiBadge').textContent = t.ai(state.llmModel);
  labelDock();
  if (state.core) refreshHud();
  if (state.panels) state.panels.refresh();
  if (!$('#welcome').hidden && state.core) openWelcome();
  if (state.engine) {
    renderSide();
    ensureSources(lang).then(() => {
      renderSide();
      if (state.reader.sura) { if (lang === 'en' || document.querySelector('#mushaf.en')) renderReader(); state.taf.idx = null; selectVerse(state.reader.cur, { fly: false, scroll: true, keepAudio: true }); }
    });
  }
}

// ------------------------------------------------------------ data
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
}
const loading = new Map();
function loadSource(id) {
  if (state.engine.hasSource(id)) return Promise.resolve();
  if (!loading.has(id)) loading.set(id, getJSON(`data/tafsir_${id}.json`).then(p => state.engine.addSource(id, p)));
  return loading.get(id);
}
const ensureSources = (lang) => Promise.all(SOURCES_NEEDED[lang].map(loadSource));
async function suraFile(kind, n) {
  const m = state[kind];
  if (!m.has(n)) m.set(n, getJSON(`data/${kind}/${n}.json`));
  return m.get(n);
}

// ------------------------------------------------------------ search worker
// The engine's indexes and every query run in a Web Worker (js/search-worker.js), so the
// page never freezes. If workers are unavailable, the same engine runs here as before.
const pending = new Map();
let wseq = 0;
function startSearchWorker() {
  try {
    // ?v= : a returning visitor's browser may keep a JS file a day (stale-while-revalidate); the version makes it fetch the new one
    const w = new Worker(new URL('./search-worker.js?v=t122', import.meta.url), { type: 'module' });
    w.onmessage = async (ev) => {
      const m = ev.data || {};
      if (m.op === 'llm') {   // the worker asks the AI layer (cache, live API, circuit breaker)
        try { const f = state.llm && state.llm[m.kind]; if (!f) throw new Error('no AI'); w.postMessage({ op: 'llm-reply', id: m.id, ok: true, value: await f(m.payload) }); }
        catch (e) { w.postMessage({ op: 'llm-reply', id: m.id, ok: false, error: String(e && e.message || e) }); }
        return;
      }
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.ok) p.resolve(m.value); else p.reject(new Error(m.error));
    };
    w.onerror = () => { state.worker = null; for (const p of pending.values()) p.reject(new Error('worker failed')); pending.clear(); };
    state.worker = w;
  } catch (e) { state.worker = null; }
}
function workerCall(msg) {
  if (!state.worker) return Promise.reject(new Error('no worker'));
  const id = ++wseq;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); state.worker.postMessage({ ...msg, id }); });
}
async function askEngine(query, opts) {
  if (state.worker) {
    try { return await workerCall({ op: 'ask', query, opts: { ...opts, ai: !!state.llm, dense: !!(state.llm && state.llm.dense) } }); }
    catch (e) { if (state.worker) throw e; }   // a real error is reported; a dead worker falls back below
  }
  // fallback: same engine on the page
  const e = state.engine, qLang = detectLang(query, state.lang);
  if (!state.refReady) state.refReady = Promise.all([
    getJSON('data/qp_topics.json').then(d => e.addTopicIndex(d)).catch(() => {}),
    getJSON('data/bayenat_index.json').then(d => e.addBayenat(d)).catch(() => {}),
  ]);
  if (qLang !== 'ar' && !state.latinP) state.latinP = getJSON('data/latin_index.json').then(d => e.addLatinIndex(d)).catch(() => {});
  await Promise.all([state.refReady, state.latinP, ensureSources(qLang), qLang !== 'ar' && ensureSources('ar')]);
  return e.ask(query, { ...opts, llm: state.llm });
}

function setLoad(i) { $('#loadMsg').textContent = T().loading[i]; const b = document.querySelector('#loader .lbar i'); if (b) b.style.setProperty('--lp', `${Math.round(100 * (i + 1) / (T().loading.length + 1))}%`); }

async function boot() {
  setupPWA();
  // the phone's screen stays on during a recitation, the film or the repetition counter, and a few minutes after the
  // last touch (wake.js)
  state.wake = setupWake(() => !!state.playing || !!document.getElementById('intro') || !!document.querySelector('#p-tekrar:not([hidden])'));
  applyChild();
  applyLang(pickLang());
  setLoad(0);
  const [core, searchAr] = await Promise.all([getJSON('data/core.json'), getJSON('data/search_ar.json'), (metaP = metaP || getJSON('data/mushaf_meta.json')).then(m => { state.meta = m; }).catch(() => {})]);
  state.core = core;
  state.engine = createEngine({ core, searchAr });   // display copy; searching runs in a Web Worker
  startSearchWorker();
  applyLang(state.lang);
  const gateDone = gate();
  setLoad(1);
  const { createGalaxy } = await import('./galaxy.js');
  state.galaxy = await createGalaxy($('#galaxy'), {
    binUrl: 'data/galaxy.bin', suras: core.suras,
    onHover: hover, onPick: (p) => goVerse(p.verse, { pane: 'r' }), onLabelVerse: (v) => goVerse(v, { pane: 'r' }),
    wordText: (i) => (state.words ? state.words[i] : ''),
    suraLabel: (n) => suraName(n),
  });
  state.galaxy.setShift(state.mode === 'home' && isPhone() ? 0.2 : 0);
  // the galaxy drawn in the browser (smooth arms, a bulge at the core) replaces the precomputed layouts 0 and 1
  // (5 Oct) only the shape shown at start is awaited; the revelation-order galaxy is computed afterwards, in the
  // background (the loader stayed up for both on a phone)
  const galaxyJob = async (L, order) => {
    const lay = await layoutJob('galaxy', order);
    state.galaxy.replaceLayout(L, lay.positions, lay.view, lay.spine);
    layoutNote[`galaxy|${order}`] = lay.note;
  };
  await galaxyJob(0, 'mushaf');
  setTimeout(() => galaxyJob(1, 'nuzul').catch(() => {}), 1500);
  // (6 Oct, author's choice) the site opens on «وردة السور» (rose of surahs); a shape the visitor picks later is
  // remembered (key 'shapePick', written only by a choice of the visitor, never by the film or by the start)
  { const v0 = startView(); if (v0.shape !== 'galaxy' || v0.order !== 'mushaf') await setView(v0.shape, v0.order, { quiet: true }).catch(() => {}); }
  state.wordsP = getJSON('data/words.json').then(w => { state.words = w; return w; });
  setTimeout(prepareLayouts, 8000);
  setupTools();
  setupLongPress();
  setLoad(3);
  $('#loader').classList.add('done');
  // the tafsir files (several MB) are not needed to show the galaxy: they load after the
  // first paint, only for the interface language; a search waits for them if needed and
  // another language loads only when chosen
  // (5 Oct) on a phone the page itself loads none of them at start (≈ 4 MB of JSON parsed on the main thread made the
  // first seconds stutter): the tafsir view loads its book when shown, a search loads what it needs; only the English
  // reader needs its translation at once. Only the English reader is redrawn (the Arabic Mushaf has no translation)
  (window.requestIdleCallback || setTimeout)(() => {
    workerCall({ op: 'warm', lang: state.lang }).catch(() => {});
    const need = isPhone() ? (state.lang === 'en' && TRANSLATION_FOR.en ? [TRANSLATION_FOR.en] : []) : SOURCES_NEEDED[state.lang];
    Promise.all(need.map(loadSource)).then(() => {
      // redrawn with the translations: the page keeps where the reader was (it jumped back to the first verse)
      if (state.reader.sura && state.lang === 'en') { renderReader(); state.taf.idx = null; selectVerse(state.reader.cur, { fly: false, scroll: true, keepAudio: true }); }
    }).catch(() => {});
  });
  // AI layer: 1) pre-computed answers for frequent questions (verified again by
  // the engine like any live answer), 2) live API, 3) deterministic fallback.
  const [cache, health] = await Promise.all([
    getJSON('data/llm_cache.json').catch(() => ({ expand: {}, select: {} })),
    fetch('api/health').then(r => r.ok ? r.json() : null).catch(() => null),
  ]);
  const live = health && health.llm;
  state.stt = !!(health && health.stt);
  state.tts = !!(health && health.tts);
  setupMic();
  state.llmModel = live ? health.model : (Object.keys(cache.select).length ? 'cache' : null);
  const key = (p) => `${p.lang}|${String(p.query).trim().toLowerCase()}`;
  // circuit breaker (E7): only after 3 failures in a row, and for 1 minute — a single slow answer no
  // longer switches the AI off for 5 minutes (the server already falls back to its backup provider)
  let aiDownUntil = 0, aiFails = 0;
  const call = (kind, path) => async (payload) => {
    const hit = cache[kind][key(payload)];
    if (hit) return hit;
    if (!live || Date.now() < aiDownUntil) throw new Error('live AI unavailable');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    let j = null;
    try {
      const r = await fetch(path, { method: 'POST', signal: ctrl.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      j = r.ok ? await r.json() : null;
    } catch (e) { j = null; } finally { clearTimeout(timer); }
    if (!j || j.ok === false) { if (++aiFails >= 3) { aiDownUntil = Date.now() + 60 * 1000; aiFails = 0; } throw new Error(path + ' unavailable'); }
    aiFails = 0;
    return j;
  };
  // side services (semantic neighbours, relevance filter of hadiths): each has its own breaker,
  // so their failure never switches off the main AI search
  const side = (path) => {
    let downUntil = 0;
    return async (payload) => {
      if (!live || Date.now() < downUntil) throw new Error(path + ' unavailable');
      try {
        const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        const j = r.ok ? await r.json() : null;
        if (!j || !j.ok) throw new Error(path + ' failed');
        return j;
      } catch (e) { downUntil = Date.now() + 2 * 60 * 1000; throw e; }
    };
  };
  if (state.llmModel) state.llm = { expand: call('expand', 'api/expand'), select: call('select', 'api/select'), pick: side('api/pick'), answer: side('api/answer'), ...(health && health.dense ? { dense: side('api/dense') } : {}) };
  $('#aiBadge').textContent = T().ai(state.llmModel);
  await gateDone;
  $('#lampSlot').innerHTML = lampSVG({ size: 132, word: true, title: 'Mishkat' });
  refreshMiniLamp();
  $('#lampSlot').onclick = () => openKhatmaMap();
  refreshHud();
  setupHeaderExtras();
  setNames(store.get('names', '1') === '1');
  const sp = new URL(location.href).searchParams;
  setMode('home');
  renderSide();
  if (sp.get('q')) { $('#q').value = sp.get('q'); await run(sp.get('q')); }
  if (sp.get('s')) {
    // a shared link to a verse opens it directly
    const s0 = Math.min(114, Math.max(1, +sp.get('s') || 1)), S0 = core.suras[s0 - 1];
    const a0 = Math.min(S0.ayas, Math.max(1, +sp.get('a') || 1));
    openReader(s0, S0.first + a0 - 1, { fly: true });
  } else if (!sp.get('q')) {
    // the reference view once the galaxy zone has its final size (the first one used a provisional size)
    state.galaxy.home();
    if (!sp.get('tool') && !sp.get('tk')) onboarding();
  }
  // a link to a tool (the QR code of the qibla on a computer opens the qibla on the phone)
  if (sp.get('tool') && state.panels && (state.toolIds || []).includes(sp.get('tool'))) state.panels.open(sp.get('tool'));
  // (6 Oct) a friend's invitation to memorise: ?tk=surah.from.count opens the repetition on those verses
  if (sp.get('tk') && state.panels) {
    const [ts, tf, tc] = sp.get('tk').split('.').map(Number), S1 = core.suras[Math.min(114, Math.max(1, ts || 1)) - 1];
    const from = Math.min(S1.ayas, Math.max(1, tf || 1));
    state.panels.open('tekrar', { sura: S1.n, from, count: Math.min(S1.ayas - from + 1, Math.max(1, tc || 1)) });
  }
}

// ------------------------------------------------------------ entry gate
// "سمِّ الله": the visitor writes, pastes or says the basmala to enter.
function gate() {
  if (store.get('bismillah') === '1') return Promise.resolve();
  const g = $('#gate'), t = () => T();
  $('#gateBasmala').textContent = state.core.verses[0];
  $('#gateLamp').innerHTML = lampSVG({ size: 124, title: 'Mishkat' });
  g.hidden = false;
  document.body.classList.add('gated');
  setTimeout(() => $('#gateInput').focus(), 50);
  return new Promise(resolve => {
    let accepted = false;   // typing the last letter accepts, and Enter would accept a second time (welcome heard twice)
    const accept = () => {
      if (accepted) return;
      accepted = true;
      store.set('bismillah', '1');
      welcomeVoice();
      $('#gateMsg').textContent = t().gateOk; $('#gateMsg').className = 'gmsg ok';
      g.classList.add('leaving');
      setTimeout(() => { g.hidden = true; g.classList.remove('leaving'); document.body.classList.remove('gated'); resolve(); }, 750);
    };
    const check = (txt) => {
      if (isBasmala(txt)) return accept();
      $('#gateMsg').textContent = t().gateWrong; $('#gateMsg').className = 'gmsg bad';
    };
    $('#gateForm').onsubmit = (ev) => { ev.preventDefault(); check($('#gateInput').value); };
    $('#gateInput').oninput = () => { if (isBasmala($('#gateInput').value)) accept(); };
    $('#gateCopy').onclick = async () => {
      const txt = state.core.verses[0];
      try { await navigator.clipboard.writeText(txt); $('#gateCopy').textContent = t().copied; $('#gateInput').focus(); }
      catch (e) { $('#gateInput').value = txt; check(txt); }
    };
    // (5 Oct) one tap: the basmala is written into the field letter by letter (the Tanzil text of 1:1), then the gate opens
    $('#gatePaste').onclick = () => {
      if (accepted) return;
      const txt = state.core.verses[0], inp = $('#gateInput'), chars = [...txt];
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { inp.value = txt; return check(txt); }
      let n = 0; inp.value = '';
      const step = () => { n = Math.min(chars.length, n + 2); inp.value = chars.slice(0, n).join(''); if (n < chars.length) setTimeout(step, 28); else check(txt); };
      step();
    };
    $('#gateMic').onclick = async () => {
      try {
        if ($('#gateMic').classList.contains('rec')) { stopListening(); return; }
        const txt = await listen({ lang: 'ar', serverStt: state.stt, maxMs: 9000,
          onState: (st) => { $('#gateMsg').textContent = st === 'listening' ? t().listening : st === 'processing' ? t().processing : ''; $('#gateMsg').className = 'gmsg'; $('#gateMic').classList.toggle('rec', st === 'listening'); },
          onPartial: (p) => { $('#gateInput').value = p; } });
        $('#gateInput').value = txt;
        check(txt);
      } catch (e) { $('#gateMsg').textContent = e.code === 'denied' ? t().vDenied : e.code === 'nospeech' ? t().vNoSpeech : t().voiceError; $('#gateMsg').className = 'gmsg bad'; }
    };
  });
}

// ------------------------------------------------------------ voice search
// A small dialog: speak (level meter, stops by itself at the pause) → the text heard
// is shown and can be corrected → search. The spoken language is chosen explicitly.
function voiceLang() {
  const l = store.get('voiceLang');
  return LANGS.includes(l) ? l : state.lang;
}
function setupMic() {
  const b = $('#mic');
  if (!voiceSupported(state.stt)) { b.hidden = true; return; }
  b.hidden = false;
  b.onclick = () => openVoice();
}
function openVoice() {
  const box = $('#voice'), t = T();
  let lang = voiceLang(), mode = store.get('voiceMode', 'search');
  const markMode = () => { box.querySelectorAll('[data-vm]').forEach(x => x.setAttribute('aria-pressed', x.dataset.vm === mode)); box.dataset.mode = mode; };
  box.querySelectorAll('[data-vm]').forEach(x => x.onclick = () => { mode = x.dataset.vm; markMode(); store.set('voiceMode', mode); if (box.dataset.st === 'rec') { cancelListening(); start(); } });
  markMode();
  const markLang = () => box.querySelectorAll('[data-vl]').forEach(x => x.setAttribute('aria-pressed', x.dataset.vl === lang));
  box.querySelectorAll('[data-vl]').forEach(x => x.onclick = () => { lang = x.dataset.vl; markLang(); store.set('voiceLang', lang); });
  markLang();
  const ui = (st, msg) => {
    box.dataset.st = st;
    $('#vTitle').textContent = st === 'rec' ? t.vTitle : st === 'proc' ? t.vProc : st === 'done' ? t.vHeard : st === 'err' ? msg : t.vTitle;
    $('#vHint').textContent = st === 'rec' ? (mode === 'recite' ? t.vHintRecite : t.vHint) : '';
    $('#vText').hidden = st !== 'done';
    $('#vMain').textContent = st === 'rec' ? t.vStop : st === 'done' ? t.vSearch : t.vRetry;
    $('#vAlt').textContent = st === 'done' ? t.vRetry : t.vCancel;
    $('#vMain').disabled = st === 'proc';
  };
  const close = () => { cancelListening(); box.hidden = true; $('#mic').classList.remove('rec'); $('#q').focus(); };
  const start = async () => {
    ui('rec');
    $('#mic').classList.add('rec');
    try {
      const txt = await listen({
        lang: () => mode === 'recite' ? 'ar' : lang, serverStt: state.stt, mode, maxMs: mode === 'recite' ? 25000 : 15000, silenceMs: mode === 'recite' ? 2200 : 1500,
        onState: (st) => { if (st === 'processing') ui('proc'); },
        onLevel: (v) => box.style.setProperty('--lvl', v.toFixed(3)),
        onPartial: (p) => { $('#vHint').textContent = p; },
      });
      if (box.hidden) return;
      if (!txt) return ui('err', t.vNoSpeech);
      $('#vText').value = txt; ui('done');
      $('#vText').dir = /[؀-ۿ]/.test(txt) ? 'rtl' : 'ltr';
      $('#vMain').focus();
    } catch (e) {
      if (!box.hidden) ui('err', e.code === 'denied' ? t.vDenied : e.code === 'nospeech' ? t.vNoSpeech : t.vFail);
    } finally { $('#mic').classList.remove('rec'); }
  };
  // a recited verse is searched as a quotation: the engine checks it word by word against the Mushaf (exact,
  // close, or not a verse) and the verse found opens in the reader — the transcript itself is never shown as a verse
  const search = () => { const q = $('#vText').value.trim(); if (!q) return; box.hidden = true;
    if (mode === 'recite') { const qq = `«${q.replace(/[«»"]/g, '')}»`; $('#q').value = qq; run(qq).then(() => { const r = state.result; if (r && r.type === 'verify' && ['exact', 'near'].includes(r.verdict) && r.verses && r.verses.length) goVerse(r.verses[0].idx, { pane: 'r' }); }); }
    else { $('#q').value = q; run(q); } };
  $('#vMain').onclick = () => { const st = box.dataset.st; if (st === 'rec') stopListening(); else if (st === 'done') search(); else start(); };
  $('#vAlt').onclick = () => { if (box.dataset.st === 'done') start(); else close(); };
  $('#vText').onkeydown = (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); search(); } };
  // Escape closes this dialog only (not also the open tool panel behind it)
  box.onkeydown = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
  box.onclick = (ev) => { if (ev.target === box) close(); };
  box.hidden = false;
  start();
}

// ------------------------------------------------------------ search
async function run(query, mode = 'auto') {
  const t = T();
  // T091–T093: the question is mapped before any search (js/scope.js) — a person in crisis always reaches the engine
  if (mode === 'auto' && !isCrisis(query)) {
    if (state.prefs.age === 'child' && childBlocked(query)) return showCard(query, childCard());
    // T122: a factual question («كم عدد آيات القرآن», «أركان الإيمان», «كم مرة ذكر اسم موسى») gets its exact answer,
    // counted from the Mushaf data or stated by an authentic hadith (js/facts.js) — before any search
    if (state.worker) {
      const f = await workerCall({ op: 'fact', query, lang: detectLang(query, state.lang) === 'ar' ? 'ar' : 'en', digits: digitsPref() }).catch(() => null);
      if (f) return showFact(query, f);
    }
    const m = mapQuestion(query);
    if (m && m.kind === 'now') return showCard(query, nowCard());
    if (m && m.kind === 'offtopic') return showCard(query, offCard(query, m.topic));
    if (m && m.kind === 'feature') return openFeature(m, query);
  }
  // a practical request («متى رمضان», «خطة لختم القرآن في شهر», "hijri date") opens its tool, never the AI;
  // the guard runs first, so «ما حكم صيام يوم عرفة» stays a question (js/tools.js)
  const tool = mode === 'auto' && state.panels ? routeTool(query, { available: state.toolIds, guard: guardCheck }) : null;
  // a khatma plan asked in the search bar: the khatma service opens with a proposed plan (30 days unless said) that
  // the visitor adapts to their commitments
  if (tool && tool.tool === 'khatma') tool.args = { ...tool.args, days: tool.args.days || 30 };
  if (tool) { state.panels.open(tool.tool, tool.args); return; }
  if (state.panels) state.panels.close();          // the answers take the place of the open tool panel
  $('#status').textContent = t.thinking; $('#status').classList.add('on');
  const qLang = detectLang(query, state.lang);
  // the texts to display load here while the worker searches
  const shownP = ensureSources(qLang).then(() => qLang !== 'ar' && ensureSources('ar'));
  let res;
  try { res = await askEngine(query, { uiLang: state.lang, mode: mode === 'raw' ? 'auto' : mode, noCorrect: mode === 'raw' }); await shownP; }
  finally { $('#status').classList.remove('on'); }
  state.result = res;
  const url = new URL(location.href); url.searchParams.set('q', query); url.searchParams.delete('s'); url.searchParams.delete('a'); history.replaceState(null, '', url);
  stopAudio(true); stopSpeech();
  colorResults(res);
  setMode('answers');
  renderSide();
  // the answer on the map: its surahs light up in their colours, with a label each
  const shown = answerVerses();
  applyHighlight();
  state.galaxy.setGroups(answerGroups(res));
  state.galaxy.setFocusVerse(null);
  markHits();
  if (shown.length) state.galaxy.fitVerses(shown);
  else state.galaxy.home();
}

// ------------------------------------------------------------ T091–T093: answers that are not a search
const dig = (n) => { let d = 'arab'; try { d = JSON.parse(localStorage.getItem('mishkat.digits') || '"arab"'); } catch (e) { /* default */ } return state.lang === 'ar' && d === 'arab' ? arNum(n) : String(n); };
const pctTxt = (x) => dig(x > 0 && x < 10 ? x.toFixed(1) : Math.round(x)) + (state.lang === 'ar' ? '٪' : '%');
// a child (under 18) gets no fatwa: rulings, takfir, penalties and other sensitive questions get a kind redirection
function childBlocked(q) { const g = guardCheck(q); return g === 'ruling' || g === 'takfir' || isSensitiveText(q) || /فتو[ىي]|مفتي|\bfatwa\b/i.test(q); }
function showCard(query, card) {
  if (state.panels) state.panels.close();
  state.result = { type: 'card', query, lang: detectLang(query, state.lang), card, verses: [], answer: [], suras: [] };
  const url = new URL(location.href); url.searchParams.set('q', query); url.searchParams.delete('s'); url.searchParams.delete('a'); history.replaceState(null, '', url);
  stopAudio(true); stopSpeech();
  state.colorOf = new Map();
  setMode('answers');
  renderSide();
  applyHighlight();
  state.galaxy.setGroups([]); state.galaxy.setFocusVerse(null); markHits(); state.galaxy.home();
}
// ------------------------------------------------ T122: verified answers (js/facts.js)
const FACT_S = {
  ar: { title: 'جواب موثَّق', how: 'كيف عرفنا', verses: 'من المصحف', hadith: 'من السنة الصحيحة', grade: 'الدرجة', openH: 'افتح الحديث في موسوعة الأحاديث', stats: 'افتح الإحصاءات',
    read: (n) => `اقرأ سورة ${n}`, tool: { asma: 'أسماء الله الحسنى', prayer: 'مواقيت الصلاة' }, search: 'ابحث في القرآن عن هذا السؤال', more: (n) => `و${n} آية أخرى تضيء على الخريطة` },
  en: { title: 'Verified answer', how: 'How we know', verses: 'From the Mushaf', hadith: 'From the authentic Sunnah', grade: 'Grade', openH: 'Open the hadith in HadeethEnc', stats: 'Open the statistics',
    read: (n) => `Read Surah ${n}`, tool: { asma: 'The Most Beautiful Names', prayer: 'Prayer times' }, search: 'Search the Quran for this question', more: (n) => `and ${n} more verses lit on the map` },
};
function digitsPref() { try { return JSON.parse(localStorage.getItem('mishkat.digits') || '"arab"'); } catch (e) { return 'arab'; } }
function factCard(f) {
  const S = FACT_S[f.lang] || FACT_S.ar, e = state.engine, dir = f.lang === 'ar' ? 'rtl' : 'ltr';
  const many = f.verses.length > 8, shown = f.verses.slice(0, many ? 0 : 8);
  const vli = (i) => { const tr = f.lang === 'en' ? e.translation('en', i).replace(/\[\d+\]/g, '') : '';
    return `<li data-idx="${i}"><div class="li-head"><b>${esc(refLabel(i, f.lang))}</b><button class="mini" data-playv="${i}" aria-label="▶">▶</button></div><div class="ayah">${esc(e.verses[i])}</div>${tr ? `<div class="tr">${esc(tr)}</div>` : ''}</li>`; };
  const hli = (x) => `<li dir="${x.lang === 'ar' ? 'rtl' : 'ltr'}"><div class="h-text">${esc(x.text)}</div><div class="h-meta">${x.by ? `<span>${esc(x.by)}</span>` : ''}${x.grade ? `<span class="h-grade"><small>${esc(S.grade)}:</small> <b>${esc(x.grade)}</b></span>` : ''}</div>
    <a class="mini" href="https://hadeethenc.com/${esc(x.lang)}/browse/hadith/${esc(x.id)}" target="_blank" rel="noopener">${esc(S.openH)}</a></li>`;
  const act = (a) => a.kind === 'stats' ? `<button type="button" class="mini gold" data-fstats="${a.sura || ''}" data-fword="${esc(a.word || '')}">📊 ${esc(S.stats)}</button>`
    : a.kind === 'read' ? `<button type="button" class="mini gold" data-fread="${a.sura}">📖 ${esc(S.read(suraName(a.sura, f.lang)))}</button>`
    : a.kind === 'tool' ? `<button type="button" class="mini gold" data-ftool="${a.tool}">${esc(S.tool[a.tool] || a.tool)}</button>` : '';
  const html = `<section class="factbox" dir="${dir}"><h3>✓ ${esc(S.title)}</h3><p class="fact-a">${esc(f.answer)}</p>
    ${f.details.length ? `<ul class="fact-d">${f.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
    ${(f.hadithRecs || []).length ? `<h4 class="sec">${esc(S.hadith)}</h4><ol class="hlist">${f.hadithRecs.map(hli).join('')}</ol>` : ''}
    ${shown.length ? `<h4 class="sec">${esc(S.verses)}</h4><ul class="vlist">${shown.map(vli).join('')}</ul>` : ''}
    ${many ? `<div class="fact-refs">${f.verses.slice(0, 40).map(i => `<button type="button" class="mini" data-idx="${i}">${esc(refLabel(i, f.lang))}</button>`).join('')}</div>` : ''}
    <p class="note fact-how"><b>${esc(S.how)}:</b> ${esc(f.method)}${f.note ? ' ' + esc(f.note) : ''}</p>
    <div class="p-row">${f.actions.map(act).join('')}<button type="button" class="mini" id="factSearch">🔎 ${esc(S.search)}</button></div></section>` + feedbackBar();
  return { kind: 'fact', html, wire: (v) => {
    v.querySelectorAll('.vlist li').forEach(li => li.onclick = () => goVerse(+li.dataset.idx, { pane: 'r' }));
    v.querySelectorAll('.fact-refs [data-idx]').forEach(b => b.onclick = () => goVerse(+b.dataset.idx, { pane: 'r' }));
    v.querySelectorAll('[data-playv]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); goVerse(+b.dataset.playv, { play: 'one', pane: 'r' }); });
    v.querySelectorAll('[data-fstats]').forEach(b => b.onclick = () => state.panels.open('stats', { sura: +b.dataset.fstats || null, word: b.dataset.fword || null }));
    v.querySelectorAll('[data-fread]').forEach(b => b.onclick = () => openReader(+b.dataset.fread, null, { pane: 'r' }));
    v.querySelectorAll('[data-ftool]').forEach(b => b.onclick = () => state.panels.open(b.dataset.ftool));
    const fs = v.querySelector('#factSearch'); if (fs) fs.onclick = () => run(state.result.query, 'topic');
    wireFeedback(v, state.result);
  } };
}
function showFact(query, f) {
  showCard(query, factCard(f));
  state.result.fact = f.id;
  state.result.verses = f.verses.map(idx => ({ idx, ref: `${state.engine.suraOf[idx]}:${state.engine.ayaOf[idx]}` }));
  applyHighlight(); markHits();
  const shown = answerVerses();
  if (shown.length) state.galaxy.fitVerses(shown);
}
const SHORT_SURAS = [1, 112, 113, 114, 108, 103, 97, 67];
function childCard() {
  const x = XS(), name = (n) => suraName(n);
  return { kind: 'child', html: `<section class="kidbox"><h3>${esc(x.childTitle)}</h3><p>${esc(x.child)}</p><p class="kid-q"><b>${esc(x.childAsk)}</b></p>
      <div class="chips">${SHORT_SURAS.map(n => `<button type="button" class="mini" data-kid="${n}">${esc(name(n))}</button>`).join('')}</div>
      <div class="p-row"><select id="kidSel" aria-label="${esc(x.childAsk)}">${suraOptions(67)}</select><button type="button" class="btn gold" id="kidGo">${esc(x.childGo)}</button></div>
      <p><button type="button" class="mini" id="kidKh">📖 ${esc(x.childKhatma)}</button></p><p class="note">${esc(x.childParent)}</p></section>`,
    wire: (v) => {
      v.querySelectorAll('[data-kid]').forEach(b => b.onclick = () => state.panels.open('tekrar', { sura: +b.dataset.kid }));
      v.querySelector('#kidGo').onclick = () => state.panels.open('tekrar', { sura: +v.querySelector('#kidSel').value });
      v.querySelector('#kidKh').onclick = () => state.panels.open('khatma', { days: 60 });
    } };
}
function nowCard() {
  const S = SCOPE_S[state.lang] || SCOPE_S.ar, ar = state.lang === 'ar', now = new Date();
  const loc = ar ? (dig(1) === '1' ? 'ar-u-nu-latn' : 'ar-u-nu-arab') : 'en-GB';
  const g = now.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tm = now.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  const h = formatHijri(toHijri(now, +state.prefs.hijriAdjust || 0), state.lang);
  return { kind: 'now', html: `<section class="nowbox"><div class="now-d">${esc(g)}</div><div class="now-h">${esc(h)} <small>${esc(S.nowHijri)}</small></div>
      <div class="now-t"><small>${esc(S.nowTime)}</small> <b dir="ltr">${esc(tm)}</b></div>
      <div class="p-row"><button type="button" class="mini gold" data-tool="prayer">🕌 ${esc(S.openPrayer)}</button><button type="button" class="mini" data-tool="hijri">🗓 ${esc(S.openCal)}</button></div></section>`,
    wire: (v) => v.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => state.panels.open(b.dataset.tool)) };
}
function offCard(query, topic) {
  const S = SCOPE_S[state.lang] || SCOPE_S.ar, rest = islamicRest(query);
  const acts = ['search', 'read', 'tekrar', 'khatma', 'prayer'];
  return { kind: 'off', html: `<section class="offbox"><h3>${esc(S.offTitle)}</h3><p><b>${esc(S.off[topic] || '')}</b> ${esc(S.offWhy)}</p>
      ${rest ? `<p><button type="button" class="btn gold" id="offRest">${esc(S.offSearch(rest))}</button></p>` : ''}
      <p class="off-can">${esc(S.offCan)}</p><ul class="off-list">${S.can.map((c, k) => `<li><button type="button" class="mini" data-act="${acts[k]}">${esc(c)}</button></li>`).join('')}</ul></section>`,
    wire: (v) => {
      const r = v.querySelector('#offRest'); if (r) r.onclick = () => { $('#q').value = rest; run(rest, 'topic'); };
      v.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
        const a = b.dataset.act;
        if (a === 'search') { $('#q').value = ''; $('#q').focus(); }
        else if (a === 'read') openReader(lastSura(), null, { pane: 'r' });
        else state.panels.open(a, a === 'khatma' ? { days: 30 } : {});
      });
    } };
}
// a surah named in the request («احفظ سورة الملك», "stats of surah al-kahf")
function suraFromText(q) {
  const n = ' ' + normQ(q) + ' ';
  let best = null;
  for (const S of state.core.suras) {
    const names = [normQ(S.ar), normQ(S.tr).replace(/^(al|an|ar|as|at|ad|adh|az|ash|ath)[- ]/, '').replace(/-/g, ' '), normQ(S.tr).replace(/-/g, ' ')];
    for (const nm of names) {
      if (nm.length < 2) continue;
      if (n.includes(' ' + nm + ' ') && (!best || nm.length > best.len)) best = { n: S.n, len: nm.length };
    }
  }
  return best && best.n;
}
function openFeature(m, query) {
  const sura = m.sura || suraFromText(query);
  if (m.feature === 'tekrar') return state.panels.open('tekrar', sura ? { sura } : {});
  if (m.feature === 'stats') return state.panels.open('stats', { sura: sura || null, word: m.word || null });
  if (m.feature === 'engage') return openEngage();
  if (m.feature === 'install') return openInstall(state.lang);
}

// What the galaxy lights up: the completed surahs in green while the khatma panel is open (Settings may turn it
// off), otherwise the verses of the current answer. Hover-dwell (T050) borrows the highlight and calls this
// again to give it back.
function answerVerses() {
  const res = state.result;
  if (!res) return [];
  const list = [...new Set([...(res.wordHits || []), ...res.verses.filter(v => !v.closestOnly).map(v => v.idx)])];
  return list.length > 400 ? [] : list;
}
function greenVerses() {
  // body[data-panel] (set by onOpen, cleared by onClose) and not panels.current, which still names the old
  // panel while it collapses when another one is opened
  if (document.body.dataset.panel !== 'khatma' || !state.prefs.showReadOnGalaxy) return null;
  const out = [];
  for (const n of surasRead(decodeRead(state.prefs.read), state.core.suras)) { const S = state.core.suras[n - 1]; for (let k = 0; k < S.ayas; k++) out.push(S.first + k); }
  return out;
}
// T095: while the repetition panel is open, the verses repeated to the end light up in blue (PALETTE[2])
function blueVerses() {
  if (document.body.dataset.panel !== 'tekrar') return null;
  const b = decodeRead(state.prefs.hifz), out = [];
  for (let i = 0; i < state.core.verses.length; i++) if (isRead(b, i)) out.push(i);
  return out;
}
function applyHighlight() {
  if (!state.galaxy) return;
  const green = greenVerses(), blue = green ? null : blueVerses();
  if (blue) state.galaxy.highlightVerses(blue, () => 3);
  else if (green) state.galaxy.highlightVerses(green, () => 2);           // PALETTE[1], green
  else state.galaxy.highlightVerses(answerVerses(), (v) => state.colorOf.get(state.engine.suraOf[v]) || 1);
}

// one colour per surah of the answer, in the order of the answer (same colours on the map and in the list)
function colorResults(res) {
  state.colorOf = new Map();
  const order = res.suras && res.suras.length ? res.suras.map(g => g.sura) : res.verses.filter(v => !v.closestOnly).map(v => state.engine.suraOf[v.idx]);
  for (const sn of order) if (!state.colorOf.has(sn)) state.colorOf.set(sn, (state.colorOf.size % PALETTE.length) + 1);
}
function answerGroups(res) {
  const e = state.engine, by = new Map();
  for (const v of res.verses) { if (v.closestOnly) continue; const sn = e.suraOf[v.idx]; if (!by.has(sn)) by.set(sn, []); by.get(sn).push(v.idx); }
  return [...by.entries()].slice(0, 10).map(([sn, vs]) => {
    const verses = vs.sort((a, b) => a - b).slice(0, 12);
    return { sura: sn, verses, ayas: verses.map(i => state.lang === 'ar' ? arNum(e.ayaOf[i]) : e.ayaOf[i]), title: suraName(sn), color: PALETTE[(state.colorOf.get(sn) || 1) - 1] };
  });
}
const colorVar = (sn) => { const k = state.colorOf.get(sn); return k ? ` style="--c:${PALETTE[k - 1]}"` : ''; };

function clearResults() {
  state.result = null;
  state.colorOf = new Map();
  applyHighlight();
  state.galaxy.setGroups([]);
  markHits();
  const url = new URL(location.href); url.searchParams.delete('q'); history.replaceState(null, '', url);
  $('#q').value = '';
  if (state.mode === 'answers') { setMode('home'); state.galaxy.home(); } else setMode(state.mode);
  renderSide();
}

function lastSura() { const n = +store.get('lastSura', '1'); return n >= 1 && n <= 114 ? n : 1; }

function suraName(n, lang = state.lang) { const S = state.core.suras[n - 1]; return lang === 'ar' ? S.ar : S.tr; }
function refLabel(idx, lang = state.lang) {
  const e = state.engine;
  return `${suraName(e.suraOf[idx], lang)} ${e.suraOf[idx]}:${e.ayaOf[idx]}`;
}

function badgeFor(res) {
  const B = T().badges;
  let key = res.type, cls = 'ok';
  if (res.type === 'verify') { key = res.verdict; cls = res.verdict === 'exact' ? 'ok' : 'warn'; }
  if (res.type === 'abstain') cls = 'stop';
  if (res.type === 'notfound') { key = 'notfoundTopic'; cls = 'stop'; }
  if (res.type === 'invalid_ref') cls = 'warn';
  if (res.type === 'empty') return '';
  // X1: ONE confidence badge for a topic answer, from who vouches for the verses
  if (res.type === 'topic') {
    const word = res.meta && res.meta.route === 'word';
    if (res.confirmedBy === 'ai') key = 'topic';
    else if (res.confirmedBy === 'index') { key = 'topicIndex'; cls = 'warn'; }
    else if (res.confirmedBy === 'context') key = 'topicContext';
    else if (word) key = 'topicWord';
    else if (res.verses.length) { key = 'topicLexical'; cls = 'warn'; }
  }
  return `<span class="badge ${cls}">${esc(B[key] || key)}</span>`;
}

// the answers zone shows either the answer to the last question, or the home page
function renderSide() {
  if (!state.core) return;
  renderHome();
  if (state.result) renderResults(); else $('#viewRes').innerHTML = '';
  $('#ansCount').textContent = state.result ? `(${state.result.verses.filter(v => !v.closestOnly).length})` : '';
}

function renderResults() {
  const res = state.result, t = T(), e = state.engine;
  if (!res) return;
  // T092: a ruling reached by another way still never shows a fatwa to a child
  if (res.type !== 'card' && state.prefs.age === 'child' && (isRulingRes(res) || res.type === 'khilaf' || ['takfir', 'personal'].includes(res.reason) || res.polemic)) res.card = childCard(), res.type = 'card';
  if (res.type === 'card') {
    const v = $('#viewRes');
    v.innerHTML = `<p class="qline" dir="auto">«${esc(res.query)}»</p>` + res.card.html;
    v.scrollTop = 0;
    if (res.card.wire) res.card.wire(v);
    return;
  }
  const dir = res.lang === 'ar' ? 'rtl' : 'ltr';
  let h = `<p class="qline" dir="auto">«${esc(res.query)}»</p>` + levelBadge(res) + badgeFor(res);
  // T081: sensitive questions open with a red banner (and, for a ruling, the approved encyclopedia's statement)
  if (isRulingRes(res) || res.sensitive || res.polemic || res.type === 'khilaf' || ['takfir', 'personal'].includes(res.reason)) h += sensitiveBanner(res);
  // a person in crisis: where to find help, first, before anything else
  if (res.crisis) h += `<p class="crisis-help"><a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a> — ${esc(t.crisisLink)}</p>`;
  const texts = res.answer.filter(a => a.kind === 'text');
  const quotes = res.answer.filter(a => a.kind === 'quote');
  const notes = res.answer.filter(a => a.kind === 'note');
  // «هل تقصد…؟» — the closest words of the Quran to a misspelt word
  if (res.correctedFrom) h += `<div class="suggest-box"><span>${esc(t.correctedTo(res.query, res.correctedFrom))}</span> <button class="sugg" data-sq-raw="${esc(res.correctedFrom)}">${esc(t.searchAsTyped(res.correctedFrom))}</button></div>`;
  if (res.suggest && res.suggest.length) {
    h += `<div class="suggest-box"><span>${esc(res.suggestFor ? t.notQuranWord(res.suggestFor) : t.maybeAlso)}</span> ${res.suggest.map(x => `<button class="sugg" data-sq="${esc(x.q || x.word)}"><b>${esc(x.word)}</b> <small>${esc(t.inVerses(x.count))}</small></button>`).join('')}</div>`;
  }
  // 1 — the short answer: glossary definition and/or 2–3 sentences copied from the vetted tafsir
  //     of the verses that answer (each with its verse), never generated
  const ragOn = ragWanted(res);
  if (res.term || ragOn || (res.brief && res.brief.items.length)) {
    h += `<section class="brief" id="briefBox" dir="${dir}"><h3 class="sec">${esc(t.briefTitle)} <button type="button" class="mini" id="ansTts" title="${esc(t.listenAnswer)}" aria-label="${esc(t.listenAnswer)}">🔊</button></h3>`;
    if (res.term) h += termCard(res.term);
    if (ragOn) h += `<div id="ragBox" aria-live="polite"><p class="note rag-wait">${esc(t.ragLoading)}</p></div>`;
    else if (res.brief && res.brief.items.length) {
      h += `<p class="brief-p">${res.brief.items.map(x => `${esc(x.text)} <button class="cite" data-idx="${x.idx}">(${esc(refLabel(x.idx))})</button>`).join(' ')}</p>
        <p class="note">${esc(t.briefNote(res.brief.sourceTitle || ''))}</p>`;
    }
    h += `</section>`;
  }
  // 2 — the Quran: a rare word's verses, the key verses with their tafsir, the other verses
  const shownIdx = new Set();
  if (res.wordHits && res.wordHits.length) {
    const terms = new Set(res.wordTerms || []);
    h += `<h3 class="sec">${esc(t.wordTitle(res.wordQuery || res.query))}</h3><ul class="vlist wordhits">` + res.wordHits.map(i => {
      shownIdx.add(i);
      const tr = state.lang === 'en' ? e.translation('en', i).replace(/\[\d+\]/g, '') : '';
      return `<li data-idx="${i}"${colorVar(e.suraOf[i])}><div class="li-head"><b><i class="dot"></i>${esc(refLabel(i))}</b><span><button class="mini" data-playv="${i}" aria-label="${esc(t.listen)}">▶</button></span></div>
        <div class="ayah">${markWords(i, [...terms])}</div>${tr ? `<div class="tr">${esc(tr)}</div>` : ''}</li>`;
    }).join('') + '</ul>';
  }
  for (const a of texts) h += `<p class="lead" dir="${dir}">${esc(a.text)}</p>`;
  if (res.story) h += storyBox(res);
  if (res.verdict === 'near' && res.diffWords && res.diffWords.length) {
    const diff = new Set(res.diffWords);
    const words = (res.checked || res.query).split(/\s+/).map(w => diff.has(normAr(w)) ? `<mark class="diff">${esc(w)}</mark>` : esc(w)).join(' ');
    h += `<p class="note" dir="${dir}">${esc(t.yourText)}</p><p class="ayah">${words}</p>`;
  }
  // explanation: one card per verse = verse text + COMPLETE tafsir unit (never a fragment)
  if (quotes.length && !['verse', 'range', 'sura'].includes(res.type)) {
    const ctxQ = quotes.filter(q => q.role === 'context'), ansQ = quotes.filter(q => q.role !== 'context');
    if (ctxQ.length) h += `<h3 class="sec">${esc(t.contextTitle)}</h3>` + ctxQ.map(q => verseCard(q, res.lang)).join('');
    // the key verses first (the AI's order), the other explanations folded
    const KEY = 3, key = ansQ.slice(0, KEY), more = ansQ.slice(KEY);
    if (key.length) h += `<h3 class="sec">${esc(t.keyTitle)}</h3>` + key.map(q => verseCard(q, res.lang)).join('');
    if (more.length) h += `<details class="more-ex"><summary>${esc(t.moreEx(more.length))}</summary>${more.map(q => verseCard(q, res.lang)).join('')}</details>`;
    for (const q of quotes) shownIdx.add(q.idx);
    const srcIds = [...new Set(quotes.map(q => q.source))];
    h += `<div class="src">${srcIds.map(id => { const s0 = e.sources[id] || {}; return `<a href="${esc(s0.url || 'https://quranenc.com')}" target="_blank" rel="noopener">${esc(s0.title || id)}</a>`; }).join(' · ')}` +
      (res.paragraphBy && t.paraBy[res.paragraphBy] ? ` · <span class="ai-tag">${esc(t.paraBy[res.paragraphBy])}</span>` : '') + '</div>';
  }
  if (res.topicIndex) h += topicIndexBox(res.topicIndex);
  for (const a of notes) h += `<p class="note" dir="${dir}">${esc(a.text)}</p>`;
  if (res.alt && res.alt.mode === 'topic') h += `<p><button class="btn alt" id="altBtn">${esc(res.alt.person ? t.asPerson(res.alt.person) : t.asTopic(res.alt.query))}</button></p>`;
  if (res.alt && res.alt.mode === 'sura') h += `<p><button class="btn alt" id="altBtn">${esc(t.asSura(res.alt.name))}</button></p>`;

  // surahs ranked by relevance (topics) / verse list (verification)
  if (res.suras && res.suras.length && (res.type === 'topic' || res.type === 'story' || res.verdict === 'notverse')) {
    // the other verses, surah by surah — those already explained above are not repeated
    const rest = res.suras.map(g => ({ ...g, verses: g.verses.filter(i => !shownIdx.has(i)) })).filter(g => g.verses.length);
    if (rest.length) h += `<h3 class="sec">${esc(shownIdx.size ? t.otherVerses : t.surasTitle)}</h3><p class="sc-note">${esc(t.surasNote)}</p>` + rest.map((g, k) => suraCard(g, k)).join('');
  } else if (res.verses.length && res.type !== 'sura') {
    const relOnly = res.verses.length && res.verses.every(v => v.relatedOnly);
    h += `<h3 class="sec">${esc(relOnly ? t.relatedNotFatwa : t.versesTitle)} (${res.verses.filter(v => !v.closestOnly).length})</h3><ul class="vlist">` +
      res.verses.slice(0, 60).map(v => {
        const tr = state.lang === 'en' ? e.translation('en', v.idx).replace(/\[\d+\]/g, '') : '';
        return `<li data-idx="${v.idx}"${colorVar(e.suraOf[v.idx])}><div class="li-head"><b><i class="dot"></i>${esc(refLabel(v.idx))}</b><span>${v.to ? `→ ${esc(v.to)} ` : ''}<button class="mini" data-playv="${v.idx}" aria-label="${esc(t.listen)}">▶</button></span></div>
          <div class="ayah">${esc(e.verses[v.idx])}</div>${tr ? `<div class="tr">${esc(tr)}</div>` : ''}</li>`;
      }).join('') + '</ul>';
  }
  if (res.type === 'sura') h += `<p><button class="btn gold" id="openSura">${esc(t.readSura)}</button> <button class="btn play" id="playSura">${esc(t.listen)}</button></p>`;
  // 3 — after the Quran: the Sunnah, then (fatwa requests) the official references and published fatwas
  // T122: the approved encyclopedias (creed, Sira and history) — also when no verse answers the question
  if (encycKinds(res, res.query).length) h += `<section class="hbox encbox" id="encBox" aria-live="polite" hidden></section>`;
  if (res.type === 'topic' || res.type === 'term' || res.type === 'notfound') h += `<section class="hbox sbox" id="sunnahBox" aria-live="polite" hidden></section>`;
  if (res.type === 'hadith' || res.hadithCheck) h += `<section class="hbox" id="hadithBox" aria-live="polite"></section>`;
  // fatwa requests: official sources
  if (res.links && res.links.length) {
    h += `<div class="links">${res.links.map(l => `<a class="btn gold" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(t.links[l.id] || l.id)}</a>`).join('')}</div>`;
  }
  // published fatwas of a recognised scholar on the same question (verbatim, linked) — never a ruling by Mishkat
  if (res.bayenat && res.bayenat.length) h += `<section class="bay"><h3 class="sec">${esc(t.bayTitle)}</h3><ul>${res.bayenat.map(b => `<li><a href="${esc(b.url)}" target="_blank" rel="noopener" dir="rtl">${esc(b.q)}</a> <small>${esc(b.cat || '')}</small></li>`).join('')}</ul><p class="note">${esc(t.bayNote)}</p></section>`;
  // T093: the services of Mishkat linked to the answer (memorise this surah, its statistics)
  if (['sura', 'verse', 'range'].includes(res.type) && res.verses.length) {
    const s0 = e.suraOf[res.verses[0].idx], a0 = e.ayaOf[res.verses[0].idx];
    h += `<div class="svc"><span>${esc(XS().svcTitle)}</span><button class="mini gold" data-svc="tekrar" data-s="${s0}" data-a="${res.type === 'sura' ? 1 : a0}">${esc(XS().svcTekrar)}</button><button class="mini" data-svc="stats" data-s="${s0}">${esc(XS().svcStats)}</button></div>`;
  }
  if (res.type !== 'empty') h += feedbackBar() + `<p class="disclose">${esc(t.disclosure)}</p>`;
  const v = $('#viewRes');
  v.innerHTML = h;
  v.scrollTop = 0;
  v.querySelectorAll('.cite').forEach(el => el.onclick = (ev) => { ev.stopPropagation(); goVerse(+el.dataset.idx, { pane: 'r' }); });
  v.querySelectorAll('[data-sq]').forEach(b => b.onclick = () => { $('#q').value = b.dataset.sq; run(b.dataset.sq); });
  v.querySelectorAll('[data-sq-raw]').forEach(b => b.onclick = () => run(b.dataset.sqRaw, 'raw'));
  v.querySelectorAll('[data-svc]').forEach(b => b.onclick = () => state.panels.open(b.dataset.svc, { sura: +b.dataset.s, from: +b.dataset.a || 1 }));
  v.querySelectorAll('[data-ctx]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); toggleContext(b); });
  v.querySelectorAll('.vcardx').forEach(c => c.onclick = (ev) => { if (ev.target.closest('button,a,.ctxbox')) return; goVerse(+c.dataset.idx, { pane: 'r' }); });
  v.querySelectorAll('[data-playv]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); goVerse(+b.dataset.playv, { play: 'one', pane: 'r' }); });
  v.querySelectorAll('[data-open]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); goVerse(+b.dataset.open, { pane: 'r' }); });
  const at = $('#ansTts'); if (at) at.onclick = () => speakAnswer(res.lang);
  wireFeedback(v, res);
  v.querySelectorAll('[data-playfrom]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); goVerse(+b.dataset.playfrom, { play: 'all', pane: 'r' }); });
  if (res.sensitive) { const first = v.querySelector('[data-ctx]'); if (first) toggleContext(first); }
  v.querySelectorAll('.vlist li').forEach(li => li.onclick = () => goVerse(+li.dataset.idx, { pane: 'r' }));
  v.querySelectorAll('.sc-v').forEach(li => li.onclick = () => goVerse(+li.dataset.idx, { pane: 'r' }));
  v.querySelectorAll('.sc-more').forEach(b => b.onclick = () => { b.closest('.sura-card').querySelectorAll('.sc-v[hidden]').forEach(x => { x.hidden = false; }); b.remove(); });
  v.querySelectorAll('[data-read]').forEach(b => b.onclick = () => goVerse(+b.dataset.first, { pane: 'r' }));
  v.querySelectorAll('[data-listen]').forEach(b => b.onclick = () => goVerse(+b.dataset.first, { play: 'all', pane: 'r' }));
  const ab = $('#altBtn');
  if (ab) ab.onclick = () => res.alt.mode === 'topic' ? run(res.alt.query, 'topic') : openReader(res.alt.sura, null, { pane: 'r' });
  const os = $('#openSura'); if (os) os.onclick = () => openReader(res.sura, res.focus, { pane: 'r' });
  const ps = $('#playSura'); if (ps) ps.onclick = () => openReader(res.sura, res.focus, { autoplay: 'all', pane: 'r' });
  v.querySelectorAll('.tix [data-idx]').forEach(b => b.onclick = () => goVerse(+b.dataset.idx));
  v.querySelectorAll('details.sc-info').forEach(d => d.ontoggle = () => { if (d.open) fillSuraInfo(d.querySelector('.sc-info-b'), +d.dataset.info, true); });
  if ((res.type === 'topic' || res.type === 'term' || res.type === 'notfound') && state.worker) loadSunnah(res).finally(() => loadRag(res));
  if (encycKinds(res, res.query).length) loadEncyc(res, encycKinds(res, res.query));
  // the AI's Arabic fiqh search terms (never shown) when available; else the words of an Arabic question
  if (isRulingRes(res) && res.reason === 'ruling') {
    if (state.llm && state.worker) workerCall({ op: 'kw', query: res.query, lang: res.lang }).catch(() => []).then(kw => {
      if (!(kw && kw.length) && !/[؀-ۿ]/.test(res.query || '')) { const fb = $('#fiqhBox'); if (fb) fb.innerHTML = `<p class="note">${esc(t.fiqhNeedAi)}</p>`; return; }
      loadFiqh(res.query, kw || []);
    });
    else if (/[؀-ۿ]/.test(res.query || '')) loadFiqh(res.query);
    else { const fb = $('#fiqhBox'); if (fb) fb.innerHTML = `<p class="note">${esc(t.fiqhNeedAi)}</p>`; }
  }
  if (res.type === 'hadith' || res.hadithCheck) loadHadith(res.type === 'hadith' ? res.hadith.q : res.hadithCheck, res.type !== 'hadith');
  markCurrentInResults();
}

// ------------------------------------------------ reference-pack blocks
function levelBadge(res) {
  if (!res.level) return '';
  const [short, long] = T().levels[res.level];
  return `<span class="lvl lvl-${res.level}" title="${esc(long)}">${esc(short)}</span><span class="lvl-t">${esc(long)}</span>`;
}
function termCard(g) {
  const t = T();
  return `<article class="term"><header><span class="term-k">${esc(t.termTitle)}</span><b dir="rtl">${esc(g.ar)}</b>
    ${g.en ? `<span class="term-en"><small>${esc(t.termEn)}</small> ${esc(g.en)}</span>` : ''}${g.translit ? `<span class="term-en"><small>${esc(t.termTr)}</small> ${esc(g.translit)}</span>` : ''}</header>
    <div class="term-r"><small>${esc(t.termRule)}</small><p dir="rtl">${esc(g.rule)}</p></div>
    <footer><small>${esc(t.termSrc)}: ${esc(g.src)}</small> · <a href="${esc(g.more)}" target="_blank" rel="noopener">${esc(t.termMore)}</a></footer></article>`;
}
function topicIndexBox(x) {
  const t = T(), e = state.engine;
  const sub = x.groups.length > 1 || (x.groups[0] && x.groups[0].name !== x.name);
  const ref = (i) => `<button data-idx="${i}">${e.suraOf[i]}:${e.ayaOf[i]}</button>`;
  return `<section class="tix"><div class="tix-h"><span>${esc(t.tixTitle)}</span> <b dir="rtl">«${esc(x.name)}»</b></div>
    ${sub ? `<details><summary>${esc(t.tixSub(x.groups.length))}</summary><ul>${x.groups.map(g => `<li><span dir="rtl">${esc(g.name)}</span> ${g.ids.map(ref).join('')}</li>`).join('')}</ul></details>` : ''}
    <small><a href="https://quranpedia.net" target="_blank" rel="noopener">Quranpedia.net</a></small></section>`;
}
// Dorar Hadith Encyclopedia: results shown verbatim (text, narrator, muhaddith, source, verdict)
async function loadHadith(q, isCheck) {
  const box = $('#hadithBox'), t = T();
  if (!box) return;
  const head = `<h3 class="sec">${esc(isCheck ? t.hadithCheckTitle : t.hadithTitle)}</h3>`;
  if (!q) { box.innerHTML = head + `<p><a class="btn gold" href="https://dorar.net/hadith" target="_blank" rel="noopener">${esc(t.hadithOpen)}</a></p>`; return; }
  box.innerHTML = head + `<p class="note">${esc(t.hadithLoading)}</p>`;
  const link = `https://dorar.net/hadith/search?q=${encodeURIComponent(q)}`;
  let j = null;
  try {
    const r = await fetch('api/hadith', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) });
    j = r.ok ? await r.json() : null;
  } catch (e) { j = null; }
  if (!$('#hadithBox') || box !== $('#hadithBox')) return;
  if (!j || !j.ok) { box.innerHTML = head + `<p class="note">${esc(t.hadithFail)}</p><p><a class="btn gold" href="${esc(link)}" target="_blank" rel="noopener">${esc(t.hadithOpen)}</a></p>`; return; }
  if (!j.items.length) { box.innerHTML = head + `<p class="lead">${esc(t.hadithNone)}</p><p><a class="mini" href="${esc(j.url)}" target="_blank" rel="noopener">${esc(t.hadithOpen)}</a></p>`; return; }
  const row = (k, v) => v ? `<span><small>${esc(k)}:</small> ${esc(v)}</span>` : '';
  box.innerHTML = head + `<p class="note">${esc(t.hadithNote)}</p><ol class="hlist">${j.items.map(x => `<li dir="rtl"><div class="h-text">${esc(x.text)}</div>
    <div class="h-meta">${row(t.hadithRawi, x.rawi)}${row(t.hadithMuh, x.muhaddith)}${row(t.hadithSrc, x.source)}${row(t.hadithPage, x.page)}</div>
    ${x.grade ? `<div class="h-grade"><small>${esc(t.hadithGrade)}:</small> <b>${esc(x.grade)}</b></div>` : ''}</li>`).join('')}</ol>
    <p><a class="mini" href="${esc(j.url)}" target="_blank" rel="noopener">${esc(t.hadithOpen)}</a> · <small>${esc(j.source)}</small></p>`;
}
// From the Sunnah: hadiths of HadeethEnc chosen by the search worker (AI filter on a closed list),
// shown verbatim with attribution, grade, the encyclopedia's explanation and the link. Asked after
// the answer is displayed, so it never delays it.
const hadChunks = new Map();
async function loadSunnah(res) {
  const box = $('#sunnahBox'), t = T();
  if (!box) return;
  // (RAG test, 5 Oct) a trap question about violence: no hadith listed on its own, out of its context (the verses come
  // with their context pack; «Did the Prophet call to kill non-Muslims?» listed «أمرت أن أقاتل الناس» alone)
  if (res.polemic || res.pack === 'violence') { res._sunnah = []; box.hidden = true; return; }
  let s = null;
  try { s = await workerCall({ op: 'sunnah', res: { type: res.type, lang: res.lang, query: res.query, meta: res.meta }, opts: { ai: !!state.llm } }); } catch (e) { s = null; }
  res._sunnah = s && s.by === 'ai' ? s.ids.slice(0, 3) : [];
  if (!s || !s.ids || !s.ids.length || box !== $('#sunnahBox')) return;
  const items = [];
  for (const p of s.pos) {
    if (p < 0) continue;
    const k = Math.floor(p / s.chunk), key = s.lang + k;
    if (!hadChunks.has(key)) hadChunks.set(key, getJSON(`data/hadeeth/${s.lang}/${k}.json`).catch(() => []));
    const part = await hadChunks.get(key);
    if (part[p % s.chunk]) items.push(part[p % s.chunk]);
  }
  if (!items.length || box !== $('#sunnahBox')) return;
  const dir = s.lang === 'ar' ? 'rtl' : 'ltr';
  const link = (id) => `https://hadeethenc.com/${s.lang}/browse/hadith/${id}`;
  box.innerHTML = `<h3 class="sec">${esc(t.sunnahTitle)}</h3><p class="note">${esc(s.by === 'ai' ? t.sunnahNoteAi : t.sunnahNote)}</p>
    <ol class="hlist">${items.map(x => `<li dir="${dir}"><div class="h-text">${esc(x.text)}</div>
      <div class="h-meta">${x.by ? `<span>${esc(x.by)}</span>` : ''}${x.grade ? `<span class="h-grade"><small>${esc(t.sunnahGrade)}:</small> <b>${esc(x.grade)}</b></span>` : ''}</div>
      ${x.expl ? `<details><summary>${esc(t.sunnahExpl)}</summary><p>${esc(x.expl)}</p>${x.hints && x.hints.length ? `<ul>${x.hints.map(hn => `<li>${esc(hn)}</li>`).join('')}</ul>` : ''}${x.ref ? `<p class="f-src"><small>${esc(x.ref)}</small></p>` : ''}</details>` : ''}
      <a class="mini" href="${esc(link(x.id))}" target="_blank" rel="noopener">${esc(t.sunnahOpen)}</a></li>`).join('')}</ol>
    <p><small><a href="https://hadeethenc.com" target="_blank" rel="noopener">HadeethEnc.com</a> — ${esc(t.sunnahSrc)}</small></p>`;
  box.hidden = false;
  softenNotFound(res);
}
// «الجواب باختصار» v5 (extractive, evidence-bound, public/js/rag.js): the worker builds a closed list of
// passages from the sources of truth — verse text (Tanzil), tafsir, authentic hadiths, and for a ruling
// question only published ruling texts (rulings are shown from the Fiqh Encyclopedia of Dorar since T081) —, the server's composer and independent judge return
// passage IDs only, fixed rules check them again, and the passages are shown verbatim with their source.
// A concept of the question with no evidence is said so. If the service fails: the previous short answer.
// a story («قصة يوسف») is answered by its verses in order, not by two sentences
const STORY_Q = /^(قصة|قصه)\s|\bstory of\b/i;
const isRulingRes = (res) => res.type === 'abstain' && res.reason === 'ruling';
function ragWanted(res) {
  if (!(state.llm && state.llm.answer && state.worker)) return false;
  if (res.crisis || isRulingRes(res)) return false;    // fixed support message / rulings: the encyclopedia's own statement (T081)
  return ['topic', 'term'].includes(res.type) && (res.confirmedBy === 'ai' || !!res.pack) && !STORY_Q.test(res.query || '');
}
function ragItem(x, res, t) {
  if (x.kind === 'quran') return `<span class="rag-s rag-q" dir="rtl">﴿${esc(x.text)}﴾</span> <button class="cite" data-idx="${x.idx}">(${esc(refLabel(x.idx))})</button>`;
  if (x.kind === 'tafsir') return `<span class="rag-s">${esc(x.text)}</span> <button class="cite" data-idx="${x.idx}">(${esc(refLabel(x.idx))})</button>`;
  if (x.kind === 'hadith') return `<span class="rag-s rag-h">${esc(x.text)}</span> <a class="cite" href="https://hadeethenc.com/${esc(x.lang || res.lang)}/browse/hadith/${esc(x.id)}" target="_blank" rel="noopener">(${esc(x.part === 'expl' ? t.ragExpl : t.ragHadith)} · ${esc(x.grade)})</a>`;
  return x.part === 'question' ? `<span class="rag-fq"><small>${esc(t.fatwaQ)}</small> ${esc(x.text)}</span>` : `<span class="rag-s rag-f">${esc(x.text)}</span>`;
}
async function loadRag(res, fatwas = []) {
  const box = $('#ragBox'), t = T();
  if (!box || !ragWanted(res)) return;
  const ctxIdx = new Set((res.answer || []).filter(a => a.kind === 'quote' && a.role === 'context').map(a => a.idx));
  let b = null;
  try {
    b = await workerCall({ op: 'rag', res: { type: res.type, reason: res.reason, lang: res.lang, query: res.query, confirmedBy: res.confirmedBy,
      polemic: !!res.polemic, pack: res.pack || null,
      verses: (res.verses || []).map(v => ({ idx: v.idx, ai: !!v.ai, aiRelated: !!v.aiRelated, ctx: ctxIdx.has(v.idx) })) }, hadIds: res._sunnah || [], fatwas });
  } catch (e) { b = null; }
  if (box !== $('#ragBox')) return;          // another question meanwhile
  res.rag = b;
  const dir = (b && b.lang || res.lang) === 'ar' ? 'rtl' : 'ltr';
  if (!b) {                                  // service unavailable: the previous short answer, if any
    box.innerHTML = res.brief && res.brief.items.length
      ? `<p class="brief-p">${res.brief.items.map(x => `${esc(x.text)} <button class="cite" data-idx="${x.idx}">(${esc(refLabel(x.idx))})</button>`).join(' ')}</p><p class="note">${esc(t.briefNote(res.brief.sourceTitle || ''))}</p>`
      : `<p class="note">${esc(isRulingRes(res) ? t.ragNoFatwa : t.ragUnavailable)}</p>`;
  } else if (!b.points.length) {
    box.innerHTML = `<p class="note">${esc(isRulingRes(res) ? t.ragNoFatwa : t.ragNone)}</p>`;
  } else if (b.qtype === 'ruling') {
    // a published fatwa: its question, then the paragraphs that state the answer, verbatim, with the link
    box.innerHTML = b.points.map(p => { const f = p.items[0];
      return `<blockquote class="rag-fatwa" dir="rtl">${p.items.map(x => ragItem(x, res, t)).join(' ')}
        <footer><small>${esc(f.mufti || '')} — <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.title || f.source || 'dorar.net/feqhia')}</a></small></footer></blockquote>`; }).join('')
      + `<p class="note rag-gap">${esc(t.ragFatwaNote)}${res.lang === 'en' ? ' ' + esc(t.ragFatwaArabicOnly) : ''}</p>`;
  } else {
    const srcs = [...new Set(b.points.flatMap(p => p.items.map(x => x.kind === 'tafsir' ? x.sourceTitle : x.kind === 'quran' ? t.ragQuranSrc : t.ragHadithSrc)))].filter(Boolean);
    box.innerHTML = `<ul class="rag-points" dir="${dir}">${b.points.map(p => `<li>${p.shown && b.points.length > 1 ? `<b class="rag-c">«${esc(p.concept)}»</b> ` : ''}${p.items.map(x => ragItem(x, res, t)).join(' ')}</li>`).join('')}</ul>
      ${b.uncovered.length ? `<p class="note rag-gap">${esc(b.uncovered.some(u => u.shown) ? t.ragGap(b.uncovered.filter(u => u.shown).map(u => u.concept)) : t.ragGapPart)}</p>` : ''}
      <p class="note">${esc(t.ragNote(srcs.join(' · ')))}</p>`;
  }
  box.querySelectorAll('button.cite').forEach(el => el.onclick = (ev) => { ev.stopPropagation(); goVerse(+el.dataset.idx, { pane: 'r' }); });
}
// Rulings (T081): only the statement of the ruling in the Fiqh Encyclopedia of Ad-Durar As-Saniyyah
// (dorar.net/feqhia, an approved reference of the challenge pack), verbatim with its link, a flag when the
// encyclopedia reports a consensus or a difference of opinion, and the Saudi official bodies it names.
// The AI may only filter the encyclopedia's own search results (closed list); it never writes the ruling.
const postJSON = (u, body) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  .then(r => r.ok ? r.json() : null).catch(() => null);
function fiqhCard(f, t) {
  const tags = [];
  if (f.consensus) tags.push(`<span class="fq-tag fq-${esc(f.consensus)}">${esc(t.fiqhCons[f.consensus])}</span>`);
  for (const a of f.authorities || []) tags.push(`<span class="fq-tag fq-auth">${esc(t.fiqhAuth[a] || a)}</span>`);
  return `<article class="fiqh" dir="rtl"><h4>${esc(f.title)}</h4>${f.path && f.path.length ? `<p class="fq-path">${esc(f.path.join(' › '))}</p>` : ''}
    ${tags.length ? `<p class="fq-tags">${tags.join(' ')}</p>` : ''}
    ${f.ruling.map(p => `<p class="fq-r">${esc(p)}</p>`).join('')}
    ${f.consensus === 'khilaf' ? `<p class="note" dir="${state.lang === 'ar' ? 'rtl' : 'ltr'}">${esc(t.fiqhKhilafNote)}</p>` : ''}
    <footer><small><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(t.fiqhRead)}</a> · ${esc(state.lang === 'ar' ? f.source : f.sourceEn || f.source)}</small></footer></article>`;
}
async function loadFiqh(q, kw = []) {
  const box = $('#fiqhBox'), t = T();
  if (!box) return;
  box.innerHTML = `<p class="note">${esc(t.fiqhLoading)}</p>`;
  const j = await postJSON('api/fatwa', kw.length ? { q, kw } : { q });
  if (box !== $('#fiqhBox')) return;
  const more = `https://dorar.net/feqhia/search?q=${encodeURIComponent(q)}`;
  if (!j || !j.ok || !j.items.length) {
    box.innerHTML = `<p class="lead">${esc(j && j.ok ? t.fiqhNone : t.fiqhFail)}</p><p><a class="mini" href="${esc(j && j.url || more)}" target="_blank" rel="noopener">${esc(t.fiqhSearchSite)}</a></p>`;
    return;
  }
  // up to four sections are read (a section may have no statement of its own); the first two with one are shown
  const docs = (await Promise.all(j.items.slice(0, 4).map(x => postJSON('api/fatwa', kw.length ? { id: +x.id, q, kw } : { id: +x.id, q })))).filter(f => f && f.ok).filter((f, k, a) => a.findIndex(g => g.id === f.id) === k).slice(0, 2);
  if (box !== $('#fiqhBox')) return;
  if (!docs.length) { box.innerHTML = `<p class="lead">${esc(t.fiqhFail)}</p><p><a class="mini" href="${esc(j.url)}" target="_blank" rel="noopener">${esc(t.fiqhSearchSite)}</a></p>`; return; }
  box.innerHTML = (state.lang === 'en' ? `<p class="note">${esc(t.fiqhArabicOnly)}</p>` : '') + docs.map(f => fiqhCard(f, t)).join('')
    + `<p class="note">${j.by === 'ai' ? esc(t.fiqhByAi) + ' · ' : ''}<a href="${esc(j.url)}" target="_blank" rel="noopener">${esc(t.fiqhSearchSite)}</a></p>`;
}
// T122: creed (dorar.net/aqeeda) and Sira/history (dorar.net/history) — the encyclopedia's own text, verbatim, with
// its link; the AI only chose among the encyclopedia's own search results. Shown only when something was found.
async function loadEncyc(res, kinds) {
  const box = $('#encBox'), S = ENC_S[state.lang] || ENC_S.ar;
  if (!box) return;
  const ar = /[؀-ۿ]/.test(res.query || '');
  // the AI's Arabic search terms (never shown): needed for a question in English, useful for an Arabic one
  let kw = [];
  if (state.llm && state.worker) kw = await workerCall({ op: 'kw', query: res.query, lang: res.lang }).catch(() => []) || [];
  if (box !== $('#encBox')) return;
  if (!ar && !kw.length) return;
  const body = (enc, extra = {}) => ({ enc, q: res.query, ...(kw.length ? { kw } : {}), ...extra });
  const parts = await Promise.all(kinds.map(async (enc) => {
    const j = await postJSON('api/encyc', body(enc));
    if (!j || !j.ok || !j.items || !j.items.length) return null;
    if (enc === 'history') return { enc, j, docs: j.items.slice(0, 2) };
    const docs = (await Promise.all(j.items.slice(0, 4).map(x => postJSON('api/encyc', body(enc, { id: +x.id }))))).filter(f => f && f.ok && f.ruling && f.ruling.length)
      .filter((f, k, a) => a.findIndex(g => g.id === f.id) === k).slice(0, 2);
    return docs.length ? { enc, j, docs } : null;
  }));
  if (box !== $('#encBox')) return;
  const found = parts.filter(Boolean);
  if (!found.length) return;
  const srcOf = (j) => state.lang === 'ar' ? j.source : j.sourceEn || j.source;
  const aqCard = (f) => `<article class="fiqh enc" dir="rtl"><h4>${esc(f.title)}</h4>${f.path && f.path.length ? `<p class="fq-path">${esc(f.path.join(' › '))}</p>` : ''}
    ${f.ruling.map(p => `<p class="fq-r">${esc(p)}</p>`).join('')}
    <footer><small><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(S.read)}</a></small></footer></article>`;
  const hiCard = (x) => `<article class="fiqh enc enc-h" dir="rtl"><h4>${esc(x.title)}</h4><p class="fq-path">${esc(S.date(x))}</p>
    ${x.text.map(p => `<p class="fq-r">${esc(p)}</p>`).join('')}${x.cut ? `<p class="note">${esc(S.cut)}</p>` : ''}
    <footer><small><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(S.readEvent)}</a></small></footer></article>`;
  box.innerHTML = `<h3 class="sec">${esc(S.title)}</h3>${state.lang === 'en' && S.arabicOnly ? `<p class="note">${esc(S.arabicOnly)}</p>` : ''}` + found.map(p => `<h4 class="fq-h">${esc(S[p.enc])}</h4>`
    + p.docs.map(d => p.enc === 'history' ? hiCard(d) : aqCard(d)).join('')
    + `<p class="note">${esc(p.j.by === 'ai' ? S.byAi : S.bySearch)} · <a href="${esc(p.j.url)}" target="_blank" rel="noopener">${esc(S.searchSite)}</a> · <small>${esc(srcOf(p.j))}</small></p>`).join('');
  box.hidden = false;
  softenNotFound(res);
}
// a question with no verse that answers it, but an approved source that does (encyclopedia, authentic hadith): the
// «abstained» badge and message would contradict what follows — they now say where the answer comes from
const SOFT = {
  ar: { badge: 'من المصادر المعتمدة', lead: 'لا آية في المصحف تجيب عن هذا السؤال مباشرة؛ وهذا ما في المصادر المعتمدة، منقولًا بنصه مع رابطه:' },
  en: { badge: 'From the approved sources', lead: 'No verse of the Quran answers this question directly; here is what the approved sources say, quoted as written with their link:' },
};
function softenNotFound(res) {
  if (!res || res.type !== 'notfound' || res.softened) return;
  const v = $('#viewRes'), S = SOFT[state.lang] || SOFT.ar;
  const b = v && v.querySelector('.badge.stop'), p = v && v.querySelector('p.lead');
  if (b) { b.textContent = S.badge; b.className = 'badge ok'; }
  if (p) p.textContent = S.lead;
  res.softened = true;
}
// the red banner of sensitive questions: rulings, matters of life and blood, disputed or hostile subjects
function sensitiveBanner(res) {
  const t = T(), ruling = isRulingRes(res);
  const fiqh = ruling && res.reason === 'ruling';
  return `<section class="sens" role="note" dir="${state.lang === 'ar' ? 'rtl' : 'ltr'}"><h3>⚠ ${esc(t.sensTitle)}</h3>
    <p>${esc(ruling ? (res.blood ? t.sensBlood : t.sensRuling) : t.sensOther)}</p>
    ${fiqh ? `<h4 class="fq-h">${esc(t.fiqhTitle)}</h4><div id="fiqhBox" aria-live="polite"></div>` : ''}
    ${(res.links || []).some(l => l.id === 'alifta') ? '' : `<p class="sens-refer"><a href="https://alifta.gov.sa/ar/home" target="_blank" rel="noopener">${esc(t.links.alifta)}</a></p>`}</section>`;
}
// «عن السورة» in its own window over the reader, with a close button (Escape closes it too)
function openSuraInfo(n) {
  let w = $('#sInfoWin');
  if (w) w.remove();
  const t = T(), S = state.core.suras[n - 1];
  w = document.createElement('section');
  w.id = 'sInfoWin'; w.className = 'sinfo-win'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', t.aboutSura);
  w.innerHTML = `<header><h3>${esc(t.aboutSura)} — ${esc(state.lang === 'ar' ? S.ar : S.tr)}</h3><button type="button" class="icon" data-x aria-label="${esc(t.close)}" title="${esc(t.close)}">✕</button></header><div class="sinfo" id="sInfo">…</div>`;
  $('#rzone').appendChild(w);
  const close = () => { w.remove(); $('#rInfo') && $('#rInfo').setAttribute('aria-expanded', 'false'); document.removeEventListener('keydown', esc1); };
  const esc1 = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
  w.querySelector('[data-x]').onclick = close;
  document.addEventListener('keydown', esc1);
  $('#rInfo') && $('#rInfo').setAttribute('aria-expanded', 'true');
  fillSuraInfo(w.querySelector('#sInfo'), n);
  w.querySelector('[data-x]').focus({ preventScroll: true });
}
// Quranpedia surah information (Arabic): introduction, topics, purposes
async function suraInfo(n) {
  if (!state.suraInfoP) state.suraInfoP = getJSON('data/qp_surahs.json');
  const d = await state.suraInfoP;
  return { ...(d.items[n] || d.items[String(n)] || {}), version: d.version };
}
async function fillSuraInfo(el, n, short = false) {
  if (!el || el.dataset.done) return;
  const t = T();
  try {
    const x = await suraInfo(n);
    const para = (s) => esc(s || '').split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('');
    const part = (k, v) => v ? `<h4>${esc(k)}</h4>${para(v)}` : '';
    el.innerHTML = `<div dir="rtl" class="sinfo-t">${part(t.sInfoIntro, x.intro)}${short ? '' : part(t.sInfoTopics, x.topics) + part(t.sInfoNames, x.names)}${part(t.sInfoPurposes, x.purposes)}</div>
      <small><a href="https://quranpedia.net" target="_blank" rel="noopener">${esc(t.sInfoSrc)}</a>${x.version ? ` · ${esc(x.version)}` : ''}</small>`;
    el.dataset.done = '1';
  } catch (e) { el.textContent = t.tafFail; }
}

function verseCard(q, lang) {
  const t = T(), e = state.engine, i = q.idx, dir = lang === 'ar' ? 'rtl' : 'ltr';
  const tr = lang === 'en' ? e.translation('en', i).replace(/\[\d+\]/g, '') : '';
  return `<article class="vcardx${q.role === 'context' ? ' ctx' : ''}" data-idx="${i}" data-src="${esc(q.source || '')}"${colorVar(e.suraOf[i])}>
    <header><button class="cite" data-idx="${i}">${esc(refLabel(i, lang))}</button>
      <span class="vc-btns"><button class="mini" data-playv="${i}" aria-label="${esc(t.listen)}">▶</button><button class="mini" data-ctx="${i}" aria-expanded="false">${esc(t.ctxBtn)}</button><button class="mini" data-open="${i}">${esc(t.readHere)}</button></span></header>
    <div class="ayah">${esc(e.verses[i])}</div>
    ${tr ? `<div class="tr">${esc(tr)}</div>` : ''}
    <div class="tafsir" dir="${dir}">${esc(q.text)}</div>
    <div class="ctxbox" hidden></div></article>`;
}

// verses before/after with their complete tafsir
function toggleContext(btn) {
  const i = +btn.dataset.ctx, box = btn.closest('.vcardx').querySelector('.ctxbox'), e = state.engine, t = T();
  const open = box.hidden;
  box.hidden = !open; btn.setAttribute('aria-expanded', open);
  if (!open || box.dataset.done) return;
  const lang = state.result ? state.result.lang : state.lang;
  const srcId = PARAGRAPH_FOR[lang] in e.sources ? PARAGRAPH_FOR[lang] : TAFSIR_FOR[lang];
  box.innerHTML = `<div class="ctx-title">${esc(t.ctxTitle)}</div>` + e.context(i, 2).map(k => {
    const taf = (e.text(srcId, k) || '').replace(/^\d+\.\s*/, '');
    return `<div class="ctx-v${k === i ? ' me' : ''}"><b>${esc(refLabel(k, lang))}</b><div class="ayah">${esc(e.verses[k])}</div>${taf ? `<div class="tafsir" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${esc(taf)}</div>` : ''}</div>`;
  }).join('');
  box.dataset.done = '1';
}

// highlight the occurrences of a word of the Quran inside a verse (positions found by the engine)
function markWords(i, forms) {
  const pos = new Set(state.engine.wordPositions(i, forms));
  let k = -1;
  return state.engine.verses[i].split(' ').map(w => { if (/[ء-ي]/.test(normAr(w))) k++; return pos.has(k) && /[ء-ي]/.test(normAr(w)) ? `<mark class="hit">${esc(w)}</mark>` : esc(w); }).join(' ');
}
// highlight the words of the search inside a text (same tokenizer as the engine)
function markTerms(text, lang, terms) {
  if (!terms || !terms.size) return esc(text);
  return text.split(/(\s+)/).map(w => /\S/.test(w) && tokens(w, lang).some(x => terms.has(x)) ? `<mark class="hit">${esc(w)}</mark>` : esc(w)).join('');
}

// one card per surah, listing ITS verses from the results, so the link with the search is visible
// the story of a prophet: an approved summary (Al-Jamhara, verbatim), the episodes with their verse ranges,
// Quran quotations of the source shown from Tanzil ({{Q:s:a}} markers)
function withQuran(text) {
  const e = state.engine;
  return esc(text).replace(/\{\{Q:(\d+):(\d+)\}\}/g, (m, s0, a0) => {
    const i = e.idxOf(+s0, +a0);
    return i < 0 ? '' : `<span class="ayah-in">﴿${esc(e.verses[i])}﴾</span> <button class="cite" data-idx="${i}">(${esc(refLabel(i))})</button>`;
  });
}
function storyBox(res) {
  const t = T(), st = res.story, e = state.engine;
  let h = `<section class="story" dir="rtl">`;
  if (st.summary) {
    const S = state.core.suras[st.summary.sura - 1];
    h += `<h3 class="sec">${esc(t.storySummary)}</h3>${res.lang === 'en' ? `<p class="note" dir="ltr">${esc(t.storyArabicOnly)}</p>` : ''}
      <p class="st-intro">${withQuran(st.summary.intro)}</p>
      ${st.summary.aims.map(p => `<p class="st-aims">${withQuran(p)}</p>`).join('')}
      <p class="note">${esc(st.summary.aimsCite)}${st.summary.aimsCite ? ' — ' : ''}<a href="${esc(st.summary.url)}" target="_blank" rel="noopener">${esc(t.storySrc(S.ar))}</a></p>`;
  }
  if (st.episodes.length) {
    h += `<h3 class="sec">${esc(t.storyEpisodes(st.episodes.length))}</h3><ol class="st-eps">` + st.episodes.map(ep => {
      const S = state.core.suras[ep.sura - 1];
      const rg = ep.ranges.map(([a, b]) => a === b ? `${a}` : `${a}–${b}`).join('، ');
      const first = e.idxOf(ep.sura, ep.ranges[0][0]);
      return `<li${colorVar(ep.sura)}><span class="st-t">${esc(ep.title)}</span> <small>${esc(S.ar)} ${esc(rg)}</small>
        <span class="st-b"><button class="mini" data-open="${first}">${esc(t.readHere)}</button><button class="mini" data-playfrom="${first}" aria-label="${esc(t.listen)}">▶</button></span></li>`;
    }).join('') + `</ol><p class="note">${esc([...new Set(st.episodes.map(x => x.cite).filter(Boolean))].join(' · '))} — ${esc(t.storyEpSrc)}</p>`;
  }
  if (!st.summary && !st.episodes.length) h += `<p class="note">${esc(t.storyNoSummary)}</p>`;
  return h + `</section>`;
}
function suraCard(g, k) {
  const t = T(), S = state.core.suras[g.sura - 1], e = state.engine, res = state.result;
  const terms = new Set(res.terms || []), qLang = res.lang;
  const refs = g.verses.slice().sort((a, b) => a - b);
  const SHOW = 4;
  const row = (i, n) => {
    const tr = state.lang === 'en' ? e.translation('en', i).replace(/\[\d+\]/g, '') : '';
    const ar = qLang === 'ar' ? markTerms(e.verses[i], 'ar', terms) : esc(e.verses[i]);
    const trH = tr ? (qLang === 'en' ? markTerms(tr, 'en', terms) : esc(tr)) : '';
    const sv = res.story ? (res.verses || []).find(v => v.idx === i) : null;
    const stag = sv ? `<small class="st-tag${sv.named ? ' named' : ''}">${esc(sv.named ? t.storyNamed : t.storyIndexed)}</small>` : '';
    return `<li class="sc-v" data-idx="${i}"${n >= SHOW ? ' hidden' : ''}><div class="li-head"><button class="cite" data-idx="${i}">${esc(S.ar)} ${S.n}:${e.ayaOf[i]}</button>${stag}
      <span><button class="mini" data-playv="${i}" aria-label="${esc(t.listen)}">▶</button> <button class="mini" data-open="${i}">${esc(t.readHere)}</button></span></div>
      <div class="ayah">${ar}</div>${trH ? `<div class="tr">${trH}</div>` : ''}</li>`;
  };
  return `<div class="sura-card"${colorVar(S.n)}><div class="sc-head"><span class="sc-rank">${k + 1}</span>
    <div class="sc-name"><b>${esc(S.ar)}</b><small>${esc(S.tr)} · ${S.n} · ${esc(S.type === 'meccan' ? t.meccan : t.medinan)} · ${esc(t.matched(g.verses.length))}</small></div>
    <span class="sc-btns"><button class="btn gold sm" data-read="${S.n}" data-first="${refs[0]}">${esc(t.readSura)}</button><button class="btn play sm" data-listen="${S.n}" data-first="${refs[0]}" aria-label="${esc(t.listen)}">▶</button></span></div>
    <details class="sc-info" data-info="${S.n}"><summary>${esc(t.aboutSura)}</summary><div class="sc-info-b">…</div></details>
    <ul class="sc-list">${refs.map(row).join('')}</ul>
    ${refs.length > SHOW ? `<button class="mini sc-more">${esc(t.moreV(refs.length - SHOW))}</button>` : ''}</div>`;
}
function markCurrentInResults() {
  const i = state.reader.cur;
  document.querySelectorAll('#viewRes .sc-v, #viewRes .vcardx, #viewRes .vlist li').forEach(b => b.classList.toggle('on', +b.dataset.idx === i));
}

// ------------------------------------------------------------ modes, zones & panes
function setMode(m) {
  state.mode = m;
  document.body.dataset.mode = m;
  if (state.galaxy) state.galaxy.setGroupsVisible(m === 'answers');
  if (state.galaxy && state.galaxy.setShift) state.galaxy.setShift(m === 'home' && isPhone() ? 0.2 : 0);
  document.body.classList.remove('ans-open', 'ans-peek');
  $('#ansToggle').setAttribute('aria-expanded', m !== 'study');
  $('#suggest').hidden = m !== 'home' || state.suggestClosed;
  $('#sgOpen').hidden = m !== 'home' || !state.suggestClosed;
  $('#szone').hidden = m === 'home' || !state.result;
  document.body.classList.toggle('has-res', !!state.result);
  $('#mtabs [data-pane=s]').hidden = !state.result;
  if (m === 'study' && !['r', 't', 's'].includes(state.pane)) showPane('r');
  if (m === 'study' && state.pane === 's' && !state.result) showPane('r');
}
// T090: the tafsir zone can be closed (✕ in its bar) and reopened (📖 in the Mushaf bar). On a computer the answers,
// or the Mushaf and the galaxy when there are no answers, take its place; on a phone the Mushaf tab is shown.
function setTafsirOpen(on) {
  state.tafClosed = !on;
  document.body.classList.toggle('taf-closed', !on);
  document.body.classList.toggle('has-res', !!state.result);
  if (!on) { stopSpeech(); document.body.classList.remove('taf-full'); if (state.pane === 't') showPane('r'); }
  else { if (isPhone()) showPane('t'); if (state.reader.cur != null && state.taf.idx !== state.reader.cur) renderTafsir(state.reader.cur); }
  if (state.galaxy && state.galaxy.resize) setTimeout(() => state.galaxy.resize(), 520);
}
// in the study view: unfold the answers (the tafsir folds), or fold them back
function openAnswers(on) {
  document.body.classList.toggle('ans-open', on);
  document.body.classList.remove('ans-peek');
  $('#ansToggle').setAttribute('aria-expanded', on);
}
function showPane(p) {
  state.pane = p;
  document.body.dataset.pane = p;
  document.querySelectorAll('#mtabs [data-pane]').forEach(b => b.setAttribute('aria-selected', b.dataset.pane === p));
}
// draggable separator between the two zones of a column (ratio kept in the browser)
function setupSplit(handle, col, key) {
  const apply = (r) => { col.style.setProperty('--a', `${r}fr`); col.style.setProperty('--b', `${1 - r}fr`); };
  let r = +store.get(key, '0.5'); if (!(r > 0.15 && r < 0.85)) r = 0.5;
  apply(r);
  const set = (v) => { r = Math.min(0.82, Math.max(0.18, v)); apply(r); };
  handle.onpointerdown = (ev) => {
    handle.setPointerCapture(ev.pointerId); handle.classList.add('drag');
    const move = (e2) => { const b = col.getBoundingClientRect(); set((e2.clientY - b.top) / b.height); };
    const up = () => { handle.classList.remove('drag'); handle.removeEventListener('pointermove', move); store.set(key, r.toFixed(3)); };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up, { once: true });
    handle.addEventListener('pointercancel', up, { once: true });
  };
  handle.onkeydown = (ev) => {
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') { ev.preventDefault(); set(r + (ev.key === 'ArrowUp' ? -0.04 : 0.04)); store.set(key, r.toFixed(3)); }
  };
  handle.ondblclick = () => { set(0.5); store.set(key, '0.5'); };
}

// ------------------------------------------------------------ the current verse
// goVerse: the single entry point to "go to this verse" from anywhere.
function goVerse(i, { play: autoplay = false, pane = null, fly = true } = {}) {
  openReader(state.engine.suraOf[i], i, { autoplay, fly, pane });
}

async function openReader(sura, idx, { autoplay = false, fly = true, pane = null } = {}) {
  const e = state.engine, S = state.core.suras[sura - 1];
  const i = idx == null ? S.first : idx;
  if (state.mode !== 'study') setMode('study');
  else if (document.body.classList.contains('ans-open')) openAnswers(false);
  if (state.reader.sura !== sura) {
    stopAudio(true);
    state.reader = { sura, cur: i, hits: new Set() };
    renderReader();
    store.set('lastSura', sura);
  }
  markHits();
  if (pane) showPane(pane);
  if (autoplay) { state.playMode = autoplay === 'one' ? 'one' : 'all'; selectVerse(i, { fly, scroll: true, keepAudio: true }); play(i, true); }
  else selectVerse(i, { fly, scroll: true });
  void e;
}

function markHits() {
  const e = state.engine, sura = state.reader.sura;
  state.reader.hits = new Set((state.result && state.result.verses || []).filter(v => e.suraOf[v.idx] === sura).map(v => v.idx));
  document.querySelectorAll('#mushaf .v').forEach(el => el.classList.toggle('hit', state.reader.hits.has(+el.dataset.i)));
}

function verseTokens(i) {
  // display tokens of a verse; verse 1 carries the basmala in the Tanzil text (except 1 and 9)
  const e = state.engine, s = e.suraOf[i], a = e.ayaOf[i];
  const toks = e.verses[i].split(' ');
  const skip = (a === 1 && s !== 1 && s !== 9) ? 4 : 0;
  return { skip, toks };
}
// words of one verse as numbered spans (the basmala Tanzil prefixes to verse 1 is shown apart)
// T099: with the tajweed colours on, each word is drawn in coloured runs (the text itself is unchanged)
function verseWordsHtml(i) {
  const { skip, toks } = verseTokens(i);
  const e = state.engine, tjFile = state.tjOn ? state.tajweedData.get(e.suraOf[i]) : null;
  const ann = tjFile ? tjFile[e.ayaOf[i] - 1] : null, offs = ann ? tokenOffsets(e.verses[i]) : null;
  const show = (tok, k) => ann ? colourToken(tok, offs[k], ann) : esc(tok);
  let w = 0, html = '';
  toks.forEach((tok, k) => {
    if (k < skip) return;
    if (HAS_LETTER.test(tok)) { w++; html += `<span class="w" data-w="${w}">${show(tok, k)}</span> `; } else html += `${esc(tok)} `;
  });
  return html;
}
// the tajweed box above the Mushaf — kept BRIEF while reading (5 Oct, author's request): one line with the rules of the
// verse being read (tap one: its definition), one line of colour key, and a link to the dedicated page tajweed.html
// where every rule has its letters, its definition and examples from the Mushaf
function tajweedLegend() {
  const L = state.lang === 'ar' ? 'ar' : 'en', X = TJ_S[L], cur = state.reader.cur, e = state.engine;
  const from = cur != null ? `&from=${e.suraOf[cur]}:${e.ayaOf[cur]}` : '';
  return `<div class="tj-legend tj-brief" id="tjLegend"><button type="button" class="icon tj-x" id="tjClose" title="${esc(XS().tjClose)}" aria-label="${esc(XS().tjClose)}">✕</button>
    <div class="tj-here"><b>${esc(X.here)}</b><div id="tjVerse" class="tj-verse"></div></div>
    <div id="tjInfo" class="tj-info" hidden></div>
    <div class="tj-foot"><p class="tj-key">${TJ_GROUPS.map(g => `<span><span class="tj tj-${g.id}">●</span> ${esc(g[L].split(/[(،/]/)[0].trim())}</span>`).join('')}</p>
      <a class="tj-more" href="tajweed.html?lang=${L}${from}" target="_blank" rel="noopener">${esc(X.all)} ${L === 'ar' ? '←' : '→'}</a></div></div>`;
}
function tjRuleInfo(r) {
  const L = state.lang === 'ar' ? 'ar' : 'en', R = RULE_INFO[r], X = TJ_S[L], g = (TJ_GROUPS.find(x => x.rules.includes(r)) || {}).id;
  return `<span class="tj tj-${g} tj-n">${esc(R[L])}</span> — ${esc(L === 'ar' ? R.dar : R.den)} <small>${esc(X.keys)}: <b dir="rtl">${esc(L === 'ar' ? R.kar : R.ken)}</b></small>`;
}
// the rules of the verse being read: one line per rule, with the words where it occurs
function fillTajweedVerse(i) {
  const box = $('#tjVerse');
  if (!box) return;
  const e = state.engine, f = state.tajweedData.get(e.suraOf[i]), ann = f ? f[e.ayaOf[i] - 1] : null, L = state.lang === 'ar' ? 'ar' : 'en';
  $('#tjInfo').hidden = true;
  { const m = $('#tjLegend .tj-more'); if (m) m.href = `tajweed.html?lang=${L}&from=${e.suraOf[i]}:${e.ayaOf[i]}`; }
  if (!f) { box.innerHTML = ''; return; }
  if (!ann || !ann.length) { box.innerHTML = `<small class="muted">${esc(TJ_S[L].none)}</small>`; return; }
  const toks = e.verses[i].split(' '), by = new Map();
  for (const { r, word } of verseRules(e.verses[i], ann)) { if (!by.has(r)) by.set(r, []); const w = toks[word]; if (!by.get(r).includes(w)) by.get(r).push(w); }
  box.innerHTML = [...by.entries()].sort((a, b) => a[0] - b[0]).map(([r, ws]) => {
    const g = (TJ_GROUPS.find(x => x.rules.includes(r)) || {}).id;
    return `<button type="button" class="tj-chip" data-rule="${r}"><span class="tj tj-${g}">●</span> ${esc(RULE_INFO[r][L])} <span class="tj-ws" dir="rtl">${ws.map(esc).join('، ')}</span></button>`;
  }).join('');
  box.querySelectorAll('[data-rule]').forEach(b => b.onclick = () => { const x = $('#tjInfo'); x.innerHTML = tjRuleInfo(+b.dataset.rule); x.hidden = false; });
}

// the Mushaf page (1..604) of a verse index, from mushaf_meta.json (first verse of each page)
function pageOfVerse(i) {
  const P = state.meta.pages; let lo = 0, hi = P.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (P[m] <= i) lo = m; else hi = m - 1; }
  return lo + 1;
}
const SPEEDS = [0.75, 1, 1.25, 1.5];
// the reading options (⋯): open by default on a computer, folded on a phone; each remembered apart
const rdMoreOpen = () => store.get(isPhone() ? 'rdMoreM' : 'rdMoreD', isPhone() ? '0' : '1') === '1';
function renderReader() {
  const t = T(), e = state.engine, { sura } = state.reader, S = state.core.suras[sura - 1];
  if (!sura) return;
  const en = state.lang === 'en';
  const basmala = (sura !== 1 && sura !== 9) ? `<div class="basmala">${esc(e.verses[S.first].split(' ').slice(0, 4).join(' '))}</div>` : '';
  let body = '';
  // (5 Oct) the Arabic Mushaf in its real pages (Tanzil's 604 pages): each page is a block the browser lays out only
  // when it comes near the screen (content-visibility) — laying out a whole long surah at once (Amiri Quran shaping)
  // took ≈ 0.6 s on a phone and froze the start; a thin page number marks each page, as in a printed Mushaf
  const pages = !en && state.meta && state.meta.pages ? state.meta.pages : null;
  let pg = pages ? pageOfVerse(S.first) : 0;
  if (pages) body += `<div class="pg" data-pg="${pg}">`;
  for (let a = 1; a <= S.ayas; a++) {
    const i = S.first + a - 1;
    if (pages && a > 1 && pageOfVerse(i) !== pg) { body += `<span class="pg-n" aria-hidden="true">${arNum(pg)}</span></div><div class="pg" data-pg="${pg = pageOfVerse(i)}">`; }
    if (en) {
      // English: verse by verse — Arabic, word-by-word transliteration, translation
      const tr = state.showTr ? e.translation('en', i).replace(/\[\d+\]/g, '') : '';
      body += `<div class="v vb" data-i="${i}"><div class="vb-h"><button class="vplay" data-play="${i}" aria-label="${esc(t.playAya(a))}">▶</button><span class="vb-n">${sura}:${a}</span></div>
        <div class="ayah">${verseWordsHtml(i)}<span class="end">﴿${arNum(a)}﴾</span></div>
        ${state.showTranslit ? `<div class="tl" dir="ltr" data-tl="${a}"></div>` : ''}${tr ? `<div class="tr" dir="ltr">${esc(tr)}</div>` : ''}</div>`;
    } else {
      // Arabic: the Mushaf text only, as one flowing page
      body += `<span class="v" data-i="${i}"><button class="vplay" data-play="${i}" aria-label="${esc(t.playAya(a))}">▶</button>${verseWordsHtml(i)}<span class="end">﴿${arNum(a)}﴾</span></span> `;
    }
  }
  if (pages) body += `<span class="pg-n" aria-hidden="true">${arNum(pg)}</span></div>`;
  const rep = state.repeat || 1;
  const trSrc = TRANSLATION_FOR.en ? e.sources[TRANSLATION_FOR.en] : null;
  const moreOpen = rdMoreOpen();
  $('#viewRead').innerHTML = `<div class="rd-head">
    <div class="rd-row rd-main">
      <button class="btn play rd-p1" id="rPlayOne" title="${esc(t.playOneT)}"></button>
      <button class="btn play rd-p2" id="rPlayAll" title="${esc(t.playAllT)}"></button>
      <span class="grp rd-nav"><button class="btn icon-b" id="rPrev" aria-label="${esc(t.prevA)}" title="${esc(t.prevA)}">${state.lang === 'ar' ? '›' : '‹'}</button><button class="btn icon-b" id="rNext" aria-label="${esc(t.nextA)}" title="${esc(t.nextA)}">${state.lang === 'ar' ? '‹' : '›'}</button></span>
      <label class="rd-sura"><span class="sr">${esc(t.suraPick)}</span><select id="rSura" aria-label="${esc(t.suraPick)}">${state.core.suras.map(x => `<option value="${x.n}"${x.n === sura ? ' selected' : ''}>${x.n}. ${esc(en ? x.tr : x.ar)}</option>`).join('')}</select></label>
      <label class="rd-aya"><span class="rd-al">${esc(t.ayaN)}</span> <select id="rSel" aria-label="${esc(t.ayaN)}">${Array.from({ length: S.ayas }, (_, k) => `<option value="${S.first + k}">${k + 1}</option>`).join('')}</select></label>
      <span class="rd-meta">${esc(S.type === 'meccan' ? t.meccan : t.medinan)} · ${esc(t.ayas(S.ayas))}</span>
      <button class="mini" id="rTaf" title="${esc(t.openTafsir)}">📖 ${esc(t.zTafsir)}</button>
      <button class="icon rd-more" id="rMore" aria-expanded="${moreOpen}" aria-controls="rOpts" title="${esc(t.readMore)}" aria-label="${esc(t.readMore)}">⋯</button>
      <button class="icon rd-fold" id="rFold" aria-pressed="${document.body.classList.contains('rd-folded')}" title="${esc(XS().rdFold)}" aria-label="${esc(XS().rdFold)}"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 14l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="icon" id="rClose" title="${esc(t.closeReader)}" aria-label="${esc(t.closeReader)}">✕</button>
    </div>
    <div class="rd-ctrl" id="rOpts" role="toolbar" aria-label="${esc(t.readMore)}"${moreOpen ? '' : ' hidden'}>
      <button class="btn icon-b" id="rFirst" title="${esc(t.firstA)}" aria-label="${esc(t.firstA)}"><span class="pi" aria-hidden="true">${ICON.first}</span></button>
      <label class="btn rep" title="${esc(t.repeatTitle)}">${esc(t.repeat)} <select id="rRep" aria-label="${esc(t.repeatTitle)}">${[1, 3, 5, 10, 0].map(n => `<option value="${n}"${(rep === n || (rep === Infinity && n === 0)) ? ' selected' : ''}>${n ? '×' + n : '∞'}</option>`).join('')}</select></label>
      <label class="btn rep" title="${esc(t.speed)}">${esc(t.speed)} <select id="rSpeed" aria-label="${esc(t.speed)}">${SPEEDS.map(x => `<option value="${x}"${x === state.speed ? ' selected' : ''}>×${x}</option>`).join('')}</select></label>
      <span class="grp"><button class="btn icon-b sm" id="rFm" aria-label="${esc(t.fontSmaller)}" title="${esc(t.fontSmaller)}">A−</button><button class="btn icon-b sm" id="rFp" aria-label="${esc(t.fontLarger)}" title="${esc(t.fontLarger)}">A+</button></span>
      ${en ? `<button class="btn ${state.showTranslit ? 'on' : ''}" id="rTl" aria-pressed="${state.showTranslit}">${esc(t.translit)}</button><button class="btn ${state.showTr ? 'on' : ''}" id="rTr" aria-pressed="${state.showTr}">${esc(t.translationBtn)}</button>` : ''}
      <button class="btn ${state.tjOn ? 'on' : ''}" id="rTj" aria-pressed="${!!state.tjOn}" title="${esc(TJ_S[state.lang === 'ar' ? 'ar' : 'en'].btn)}">🎨 ${esc(TJ_S[state.lang === 'ar' ? 'ar' : 'en'].btn)}</button>
      <button class="btn" id="rInfo" aria-expanded="false">ℹ ${esc(t.aboutSura)}</button>
      <button class="btn" id="rStats" title="${esc(t.statsNow)}">📊 ${esc(t.statsShort)}</button>
      <button class="btn" id="rFull" aria-pressed="${document.body.classList.contains('read-full')}" title="${esc(XS().readFullT)}">⛶ ${esc(XS().readFull)}</button>
      <button class="btn icon-b" id="rCopy" title="${esc(t.copyVerse)}" aria-label="${esc(t.copyVerse)}">⧉</button>
      <button class="btn icon-b" id="rShare" title="${esc(t.shareVerse)}" aria-label="${esc(t.shareVerse)}">🔗</button>
    </div></div>
    <div class="rd-body" id="rdBody">
      ${state.tjOn && !state.tjBoxHidden ? tajweedLegend() : ''}
      <div class="mushaf${en ? ' en' : ''}" id="mushaf">${basmala}${body}</div>
      ${suraEndHtml(sura)}
      ${en && state.showTr && trSrc ? `<p class="rd-src">${esc(trSrc.title)} · QuranEnc.com</p>` : ''}
    </div>`;
  $('#rzone').style.setProperty('--qs', state.qs);
  $('#rPrev').onclick = () => step(-1);
  $('#rNext').onclick = () => step(1);
  $('#rPlayOne').onclick = () => togglePlay('one');
  $('#rPlayAll').onclick = () => togglePlay('all');
  $('#rFirst').onclick = () => { const was = state.playing; selectVerse(S.first, { scroll: true, keepAudio: true }); if (was) play(S.first, true); };
  $('#rClose').onclick = closeReader;
  $('#rTaf').onclick = () => { if (document.body.classList.contains('read-full')) setTafFull(!document.body.classList.contains('taf-full')); else setTafsirOpen(true); };
  wireSuraEnd(sura);
  $('#rMore').onclick = () => { const o = $('#rOpts').hidden; $('#rOpts').hidden = !o; $('#rMore').setAttribute('aria-expanded', o); store.set(isPhone() ? 'rdMoreM' : 'rdMoreD', o ? '1' : '0'); };
  $('#rStats').onclick = () => openVerseStats();
  $('#rFull').onclick = () => setReadFull(!document.body.classList.contains('read-full'));
  $('#rFold').onclick = () => { const on = !document.body.classList.contains('rd-folded'); document.body.classList.toggle('rd-folded', on); $('#rFold').setAttribute('aria-pressed', on); store.set('rdFold', on ? '1' : '0'); if (state.galaxy && state.galaxy.resize) setTimeout(() => state.galaxy.resize(), 60); };
  $('#rTj').onclick = () => {
    if (state.tjOn && state.tjBoxHidden) { state.tjBoxHidden = false; rerenderReader(); return; }   // colours on, box closed: reopen the box
    state.tjOn = !state.tjOn; state.tjBoxHidden = false; store.set('tj', state.tjOn ? '1' : '0'); rerenderReader();
  };
  { const x = $('#tjClose'); if (x) x.onclick = () => { state.tjBoxHidden = true; const l = $('#tjLegend'); if (l) l.remove(); }; }
  // the colours of this surah load once, then the page is drawn again with them
  if (state.tjOn && !state.tajweedData.has(sura)) getJSON(`data/tajweed/${sura}.json`).then(d => { state.tajweedData.set(sura, d); if (state.reader.sura === sura && state.tjOn) rerenderReader(); }).catch(() => {});
  playButtons();
  $('#rRep').onchange = (ev) => { const n = +ev.target.value; state.repeat = n || Infinity; state.repeatLeft = state.repeat; };
  $('#rSpeed').onchange = (ev) => { state.speed = +ev.target.value; store.set('speed', state.speed); if (state.audio) state.audio.playbackRate = state.speed; };
  const font = (d) => { state.qs = Math.round(Math.min(1.8, Math.max(0.7, state.qs + d)) * 10) / 10; store.set('qs', state.qs); $('#rzone').style.setProperty('--qs', state.qs); };
  $('#rFm').onclick = () => font(-0.1);
  $('#rFp').onclick = () => font(0.1);
  if (en) {
    $('#rTl').onclick = () => { state.showTranslit = !state.showTranslit; store.set('tl', state.showTranslit ? '1' : '0'); rerenderReader(); };
    $('#rTr').onclick = () => { state.showTr = !state.showTr; store.set('tr', state.showTr ? '1' : '0'); rerenderReader(); };
  }
  $('#rCopy').onclick = async () => { const i = state.reader.cur; try { await navigator.clipboard.writeText(`${e.verses[i]} [${refLabel(i, 'ar')}]`); alertNote(t.copied); } catch (err) { /* blocked */ } };
  $('#rShare').onclick = async () => { try { await navigator.clipboard.writeText(verseUrl(state.reader.cur)); alertNote(t.linkCopied); } catch (err) { /* blocked */ } };
  $('#mushaf').querySelectorAll('.vplay').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); play(+b.dataset.play, true); });
  $('#rSura').onchange = (ev) => openReader(+ev.target.value, null);
  $('#rSel').onchange = (ev) => selectVerse(+ev.target.value, { scroll: true });
  $('#rInfo').onclick = () => openSuraInfo(sura);
  $('#mushaf').querySelectorAll('.v').forEach(el => el.onclick = (ev) => {
    // a tapped coloured letter: its rule is told in the tajweed box
    const tj = state.tjOn && ev.target.closest && ev.target.closest('.tj[data-r]');
    selectVerse(+el.dataset.i, { scroll: false });
    if (tj && $('#tjInfo')) { $('#tjInfo').innerHTML = tjRuleInfo(+tj.dataset.r); $('#tjInfo').hidden = false; }
  });
  if (state.tjOn) $('#mushaf').querySelectorAll('.tj[data-r]').forEach(el => { el.title = RULE_INFO[+el.dataset.r][state.lang === 'ar' ? 'ar' : 'en']; });
  markHits();
  if (en && state.showTranslit) fillTranslit(sura);
  scrollRead.cur = null;
  $('#rdBody').addEventListener('scroll', onReaderScroll, { passive: true });
}
// ------------------------------------------------------------ reading by scrolling (no recitation)
// The verse at the reading line (a third of the way down the Mushaf) lights up as if it were recited. When the
// reader scrolls on to the next verses, the verses passed count as read for the khatma (Settings: «count a verse
// as read when read by scrolling») only if they stayed long enough to be read: 0.3 s a word, at least 1.5 s.
// Jumps (a chosen verse, more than 8 verses at once) never count.
const scrollRead = { cur: null, since: 0, t: 0, jumpAt: 0 };
function onReaderScroll() {
  if (state.playing) return;
  clearTimeout(scrollRead.t);
  scrollRead.t = setTimeout(readingLine, 90);
}
function verseAtReadingLine() {
  const b = $('#rdBody');
  if (!b) return null;
  const r = b.getBoundingClientRect(), y = r.top + b.clientHeight * 0.33;
  for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) {
    const el = document.elementFromPoint(r.left + r.width * fx, y);
    const v = el && el.closest && el.closest('#mushaf .v');
    if (v) return +v.dataset.i;
  }
  return null;
}
const wordsIn = (v) => { const [a, b] = state.galaxy.wordsOfVerse(v); return Math.max(1, b - a); };
function readingLine() {
  if (state.playing) return;
  // a scroll made by the page itself (a chosen verse brought into view) is not reading: the chosen verse stays the one
  // shown (the reading line could fall on the end of the verse before it, which shares its first line)
  if (performance.now() - scrollRead.jumpAt < 1500) { scrollRead.cur = state.reader.cur; scrollRead.since = performance.now(); return; }
  const i = verseAtReadingLine();
  if (i == null || i === scrollRead.cur) return;
  const prev = scrollRead.cur, now = performance.now();
  if (prev != null && i > prev && i - prev <= 8 && now - scrollRead.jumpAt > 1200) {
    let words = 0; for (let v = prev; v < i; v++) words += wordsIn(v);
    if (now - scrollRead.since >= Math.max(1500, 300 * words)) for (let v = prev; v < i; v++) markRecited(v, 'scroll');
  }
  scrollRead.cur = i; scrollRead.since = now;
  litVerse(i);
  $('#lampRef').textContent = refLabel(i);
}
function litVerse(i) {
  document.querySelectorAll('#mushaf .v.lit').forEach(el => el.classList.remove('lit'));
  if (i != null) document.querySelectorAll(`#mushaf .v[data-i="${i}"]`).forEach(el => el.classList.add('lit'));
}

// ▶ this verse only · ⏵⏵ from this verse onwards (continuous); pressing the playing one pauses
function togglePlay(mode) {
  if (state.playing && state.playMode === mode) { stopAudio(true); return; }
  state.playMode = mode;
  play(state.reader.cur, true);
}
// (5 Oct) icons drawn as SVG: symbols such as ⏵⏵ or ⏮ have no glyph on many phones (crossed boxes); in Arabic the
// arrows point to the left, the direction of reading
const ICON = {
  play: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
  playAll: '<svg viewBox="0 0 28 24" width="20" height="16"><path d="M3 4.5v15l10-7.5zM14 4.5v15l10-7.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 4.5h4v15H6zM14 4.5h4v15h-4z" fill="currentColor"/></svg>',
  first: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 4.5h3v15H5zM20 4.5v15L9 12z" fill="currentColor"/></svg>',
};
function playButtons() {
  const t = T(), one = $('#rPlayOne'), all = $('#rPlayAll');
  if (!one) return;
  const p1 = state.playing && state.playMode === 'one', p2 = state.playing && state.playMode === 'all';
  // the symbol stays, the word hides on a phone (its name is in aria-label and title)
  one.innerHTML = `<span class="pi" aria-hidden="true">${p1 ? ICON.pause : ICON.play}</span> <span class="bl">${esc(t.playOne)}</span>`; one.classList.toggle('on', p1); one.setAttribute('aria-pressed', p1); one.setAttribute('aria-label', t.playOneT);
  all.innerHTML = `<span class="pi" aria-hidden="true">${p2 ? ICON.pause : ICON.playAll}</span> <span class="bl">${esc(t.playAll)}</span>`; all.classList.toggle('on', p2); all.setAttribute('aria-pressed', p2); all.setAttribute('aria-label', t.playAllT);
}
function closeReader() {
  stopAudio(true); stopSpeech();
  state.galaxy.setFocusVerse(null);
  if (state.result) {
    setMode('answers');
    const list = state.result.verses.filter(v => !v.closestOnly).map(v => v.idx);
    if (list.length && list.length <= 400) state.galaxy.fitVerses(list); else state.galaxy.home();
  } else { setMode('home'); state.galaxy.home(); }
  const url = new URL(location.href); url.searchParams.delete('s'); url.searchParams.delete('a'); history.replaceState(null, '', url);
}

function rerenderReader() { renderReader(); selectVerse(state.reader.cur, { fly: false, scroll: true, keepAudio: true }); }
function verseUrl(i) {
  const u = new URL(location.href); u.search = '';
  u.searchParams.set('s', state.engine.suraOf[i]); u.searchParams.set('a', state.engine.ayaOf[i]);
  return u.toString();
}
// word-by-word transliteration (Quran.com), English mode only
function fillTranslit(sura) {
  suraFile('translit', sura).then(f => {
    if (state.reader.sura !== sura) return;
    document.querySelectorAll('#mushaf .tl[data-tl]').forEach(el => {
      const ws = f.words[+el.dataset.tl - 1] || [];
      el.innerHTML = ws.map((w, k) => `<span class="w" data-w="${k + 1}">${esc(w)}</span>`).join(' ');
    });
  }).catch(() => { /* optional */ });
}

function selectVerse(i, { scroll = true, fly = true, keepAudio = false } = {}) {
  const e = state.engine;
  if (i == null) return;
  if (e.suraOf[i] !== state.reader.sura) return openReader(e.suraOf[i], i, { fly });
  const changed = state.reader.cur !== i;
  const wasPlaying = state.playing && changed && !keepAudio;
  state.reader.cur = i;
  if (state.tjOn) fillTajweedVerse(i);
  document.querySelectorAll('#mushaf .v').forEach(el => el.classList.toggle('cur', +el.dataset.i === i));
  const sel = $('#rSel'); if (sel) sel.value = i;
  const el = $(`#mushaf .v[data-i="${i}"]`), b = $('#rdBody');
  if (el && b && scroll) { scrollRead.jumpAt = performance.now(); scrollToVerse(el, b, changed ? 'smooth' : 'auto'); }
  state.galaxy.setFocusVerse(i);
  if (fly) state.galaxy.flyToVerse(i, 70);
  if (!state.playing) $('#lampRef').textContent = refLabel(i);
  const url = new URL(location.href); url.searchParams.set('s', e.suraOf[i]); url.searchParams.set('a', e.ayaOf[i]); history.replaceState(null, '', url);
  if (changed || state.taf.idx !== i) renderTafsir(i);
  markCurrentInResults();
  if (wasPlaying) play(i, true);
}
// the pages far from the screen are not laid out yet (estimated height): once the scroll ends, the real place of the
// verse is checked again and corrected (twice at most)
function scrollToVerse(el, b, behavior) {
  const top = () => el.getBoundingClientRect().top - b.getBoundingClientRect().top + b.scrollTop - b.clientHeight * 0.3;
  b.scrollTo({ top: Math.max(0, top()), behavior });
  let n = 0;
  const fix = () => {
    if (!el.isConnected || ++n > 2) return;
    const off = el.getBoundingClientRect().top - b.getBoundingClientRect().top;
    if (off < 0 || off > b.clientHeight * 0.75) { scrollRead.jumpAt = performance.now(); b.scrollTo({ top: Math.max(0, top()), behavior: 'auto' }); setTimeout(fix, 250); }
  };
  setTimeout(fix, behavior === 'smooth' ? 700 : 120);
}
function step(d) {
  const i = state.reader.cur + d, S = state.core.suras[state.reader.sura - 1];
  if (i < S.first || i >= S.first + S.ayas) return;
  selectVerse(i, { scroll: true });
}

// ------------------------------------------------------------ tafsir zone
// Local books (static files): Al-Muyassar, Al-Mukhtasar (ar/en), As-Sa'di.
// Live books (api/tafsir): At-Tabari (Quranpedia), Ibn Kathir (ar/en), Al-Baghawi, Al-Qurtubi (Quran.com).
const BOOKS = {
  muyassar_ar: { kind: 'local', lang: 'ar' }, mukhtasar_ar: { kind: 'local', lang: 'ar' }, saadi_ar: { kind: 'saadi', lang: 'ar' },
  tabari: { kind: 'live', lang: 'ar' }, ibnkathir: { kind: 'live', lang: 'ar' }, baghawi: { kind: 'live', lang: 'ar' }, qurtubi: { kind: 'live', lang: 'ar' },
  mukhtasar_en: { kind: 'local', lang: 'en' }, ibnkathir_en: { kind: 'live', lang: 'en' },
};
const BOOK_ORDER = {
  ar: ['muyassar_ar', 'mukhtasar_ar', 'saadi_ar', 'tabari', 'ibnkathir', 'baghawi', 'qurtubi'],
  en: ['mukhtasar_en', 'ibnkathir_en', 'muyassar_ar', 'mukhtasar_ar', 'saadi_ar', 'tabari', 'ibnkathir', 'baghawi', 'qurtubi'],
};
const speaker = createSpeaker({ server: () => state.tts, onState: (st, info) => ttsState(st, info) });

function renderTafsir(i) {
  const t = T(), e = state.engine, lang = state.lang, books = BOOK_ORDER[lang];
  if (i == null) return;
  speaker.stop(); ttsState('idle');
  const book = books.includes(state.taf.book) ? state.taf.book : books[0];
  const s = e.suraOf[i], a = e.ayaOf[i];
  const tok = ++state.taf.tok;
  state.taf.idx = i; state.taf.text = ''; state.taf.lang = BOOKS[book].lang; state.taf.ref = null;
  const prev = lang === 'ar' ? '›' : '‹', next = lang === 'ar' ? '‹' : '›';
  const moreOpen = store.get(isPhone() ? 'tzMoreM' : 'tzMoreD', isPhone() ? '0' : '1') === '1';
  // one bar: the book (a menu on a phone, tabs below on a computer), the verse, ‹ ›, ⋯ (tools), ✕
  $('#viewTaf').innerHTML = `<div class="zhead tz-head"><h2>${esc(t.zTafsir)}</h2>
      <label class="tz-pick"><span class="sr">${esc(t.tafBook)}</span><select id="tBook" aria-label="${esc(t.tafBook)}">${books.map(id => `<option value="${id}"${id === book ? ' selected' : ''}>${esc(t.srcNames[id] || id)}${BOOKS[id].kind === 'live' ? ' ↗' : ''}</option>`).join('')}</select></label>
      <span class="tz-ref">${esc(refLabel(i))}</span>
      <span class="tz-nav"><button class="icon" id="tPrev" aria-label="${esc(t.prevA)}" title="${esc(t.prevA)}">${prev}</button><button class="icon" id="tNext" aria-label="${esc(t.nextA)}" title="${esc(t.nextA)}">${next}</button><button class="icon tz-more" id="tMore" aria-expanded="${moreOpen}" aria-controls="tTools" aria-label="${esc(t.tafMore)}" title="${esc(t.tafMore)}">⋯</button><button class="icon tz-x" id="tClose" aria-label="${esc(t.closeTafsir)}" title="${esc(t.closeTafsir)}">✕</button></span></div>
    <div class="tz-books" role="tablist" aria-label="${esc(t.zTafsir)}">${books.map(id => `<button role="tab" data-book="${id}" aria-selected="${id === book}"${BOOKS[id].kind === 'live' ? ' class="live"' : ''}>${esc(t.srcNames[id] || id)}</button>`).join('')}</div>
    <div class="tz-tools" id="tTools"${moreOpen ? '' : ' hidden'}>
      <button class="btn tts" id="tTts" aria-pressed="false">🔊 ${esc(t.readTafsir)}</button>
      <span class="grp"><button class="btn icon-b sm" id="tFm" aria-label="${esc(t.fontSmaller)}" title="${esc(t.fontSmaller)}">A−</button><button class="btn icon-b sm" id="tFp" aria-label="${esc(t.fontLarger)}" title="${esc(t.fontLarger)}">A+</button></span>
      <button class="mini" id="tCopy">${esc(t.copy)}</button>
      <a class="mini" href="https://quran.com/${s}/${a}" target="_blank" rel="noopener">${esc(t.verifyExt)}</a>
      <a class="mini" href="https://dorar.net/tafseer/${s}" target="_blank" rel="noopener">${esc(t.dorarTafsir)}</a>
    </div>
    <p class="tts-note" id="ttsNote" hidden></p>
    <div class="zbody tz-body" id="tafBody" dir="${BOOKS[book].lang === 'ar' ? 'rtl' : 'ltr'}"><p class="muted">${esc(t.loadingTafsir)}</p></div>`;
  $('#tzone').style.setProperty('--ts', state.ts);
  $('#tPrev').onclick = (ev) => { ev.stopPropagation(); step(-1); };
  $('#tNext').onclick = (ev) => { ev.stopPropagation(); step(1); };
  $('#tClose').onclick = (ev) => { ev.stopPropagation(); setTafsirOpen(false); };
  $('#viewTaf .tz-head').onclick = () => { if (document.body.classList.contains('ans-open')) openAnswers(false); };
  $('#viewTaf').querySelectorAll('[data-book]').forEach(b => b.onclick = () => { state.taf.book = b.dataset.book; store.set('book', b.dataset.book); renderTafsir(i); });
  $('#tBook').onclick = (ev) => ev.stopPropagation();
  $('#tBook').onchange = (ev) => { state.taf.book = ev.target.value; store.set('book', ev.target.value); renderTafsir(i); };
  $('#tMore').onclick = (ev) => { ev.stopPropagation(); const o = $('#tTools').hidden; $('#tTools').hidden = !o; $('#tMore').setAttribute('aria-expanded', o); store.set(isPhone() ? 'tzMoreM' : 'tzMoreD', o ? '1' : '0'); };
  const tfont = (d) => { state.ts = Math.round(Math.min(1.8, Math.max(0.7, state.ts + d)) * 10) / 10; store.set('ts', state.ts); $('#tzone').style.setProperty('--ts', state.ts); };
  $('#tFm').onclick = () => tfont(-0.1);
  $('#tFp').onclick = () => tfont(0.1);
  $('#tTts').onclick = () => { if ($('#tTts').getAttribute('aria-pressed') === 'true') { speaker.stop(); ttsState('idle'); } else if (state.taf.text) { stopAudio(true); speaker.speak(state.taf.text, state.taf.lang, state.taf.ref); } };
  $('#tCopy').onclick = async () => { if (!state.taf.text) return; try { await navigator.clipboard.writeText(`${state.taf.text}\n— ${state.taf.src || ''} [${refLabel(i, 'ar')}]`); alertNote(t.copied); } catch (err) { /* blocked */ } };
  loadTafsir(book, i, tok);
}

async function loadTafsir(book, i, tok) {
  const t = T(), e = state.engine, s = e.suraOf[i], a = e.ayaOf[i], B = BOOKS[book];
  let paras = [], src = '', note = '', text = '';
  try {
    if (B.kind === 'local') {
      await loadSource(book);
      const so = e.sources[book];
      text = (so.text[i] || '').replace(/^\d+\.\s*/, '');
      paras = text ? [{ t: text }] : [];
      src = `${t.bookAbout[book] || so.title} · QuranEnc.com`;
      state.taf.ref = ['muyassar_ar', 'mukhtasar_ar', 'mukhtasar_en'].includes(book) ? { book, s, a } : null;
    } else if (B.kind === 'saadi') {
      const f = await suraFile('saadi', s);
      let k = a - 1;
      text = f.text[k];
      if (!text) { while (k > 0 && !f.text[k]) k--; if (f.text[k]) { note = t.groupWithPrev; text = f.text[k]; } }
      paras = text ? [{ t: text }] : [];
      src = `${t.bookAbout.saadi_ar} · Quran.com`;
    } else {
      const r = await fetch('api/tafsir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s, a, book }) });
      const j = r.ok ? await r.json() : null;
      if (!j || !j.ok) throw new Error('live');
      if (j.empty || !j.lines.length) { paras = []; }
      else {
        const MAX = book === 'tabari' ? 40 : 160;
        paras = j.lines.slice(0, MAX);
        text = paras.map(l => l.t).join('\n');
        if (book === 'tabari' && !j.exact) note = t.tafPages;
        if (j.verses && j.verses.length > 1) note = t.tafGroup(j.verses.join('، '));
        const refs = (j.ref || []).map(r0 => { const [v, p] = r0.split('/'); return `${t.vol} ${v} ${t.pg} ${p}`; }).join('، ');
        const by = B.lang === 'ar' ? `${j.book.name} — ${j.book.author} (ت ${j.book.died}هـ)` : `${j.book.name} — ${j.book.author} (d. ${j.book.died} AH)`;
        src = `${by}${refs ? ' · ' + refs : ''} · <a href="${esc(j.url)}" target="_blank" rel="noopener">${esc(j.lines.length > MAX ? t.tafMore : j.source)}</a>`;
      }
    }
  } catch (err) {
    if (tok !== state.taf.tok) return;
    $('#tafBody').innerHTML = `<p>${esc(t.tafFail)}</p>`;
    return;
  }
  if (tok !== state.taf.tok) return;
  const body = $('#tafBody');
  if (!paras.length) { body.innerHTML = `<p class="muted">${esc(t.tafEmpty)}</p>`; return; }
  state.taf.text = text; state.taf.src = src.replace(/<[^>]+>/g, '');
  body.innerHTML = (note ? `<p class="note">${esc(note)}</p>` : '') +
    paras.map(l => l.h ? `<h4>${esc(l.t)}</h4>` : `<p>${esc(l.t)}</p>`).join('') +
    `<div class="src">${src.includes('<a ') ? src : esc(src)}</div>`;
  body.scrollTop = 0;
}

// the listen button of the tafsir zone follows the speaker
function ttsState(st, info) {
  const t = T(), b = $('#tTts'), n = $('#ttsNote');
  if (!b) return;
  const on = st === 'loading' || st === 'speaking';
  b.setAttribute('aria-pressed', on);
  b.classList.toggle('on', on);
  b.textContent = st === 'loading' ? `⏳ ${t.ttsLoading}` : st === 'speaking' ? `■ ${t.ttsStop}` : `🔊 ${t.readTafsir}`;
  if (n) {
    n.hidden = !(on || st === 'error');
    n.className = 'tts-note' + (st === 'error' ? ' bad' : '');
    if (st === 'error') n.textContent = info === 'terms' ? t.ttsTerms : info === 'quota' ? t.ttsQuota : info === 'novoice' ? t.ttsNoVoice : t.ttsFail;
    else if (on) n.textContent = t.ttsNote + (info && info.trimmed ? ' ' + t.ttsTrimmed : '');
  }
}
function stopSpeech() { speaker.stop(); ttsState('idle'); }
function alertNote(msg) {
  $('#status').textContent = msg; $('#status').classList.add('on');
  clearTimeout(alertNote.t);
  alertNote.t = setTimeout(() => $('#status').classList.remove('on'), 3000);
}

// ------------------------------------------------ synchronised recitation
// The recited word: inside the Mishkat lamp at the edge of the galaxy, and inside
// a luminous disc on its own star in the galaxy (no third copy elsewhere).
function showLampWord(w, ref) {
  const svg = $('#lampSlot svg');
  if (svg) setLampWord(svg, w);
  if (ref !== undefined) $('#lampRef').textContent = ref;
}

// play(i, fromUser): fromUser resets the repetition counter
async function play(i, fromUser = false) {
  endDwell();                                       // the recited verse takes the light back
  litVerse(null); scrollRead.cur = null;
  stopAudio();
  stopSpeech();
  if (fromUser || state.repeatLeft == null) state.repeatLeft = state.repeat || 1;
  const e = state.engine, s = e.suraOf[i], a = e.ayaOf[i];
  if (state.reader.cur !== i) selectVerse(i, { scroll: true, fly: false, keepAudio: true });
  const tim = (await suraFile('timing', s))[a - 1];
  const au = new Audio(AUDIO_BASE + tim.u);
  au.playbackRate = state.speed;
  state.audio = au; state.playing = true;
  state.continuous = state.playMode === 'all';
  playButtons();
  state.galaxy.setReciting(true);
  const groups = () => [...document.querySelectorAll(`#mushaf .v[data-i="${i}"]`)];
  const [w0] = state.galaxy.wordsOfVerse(i);
  showLampWord('', refLabel(i));
  let last = -1;
  // word sync: every animation frame, and on 'timeupdate' too (animation frames stop in hidden windows)
  const tick = () => { if (state.audio !== au) return; update(); state.raf = requestAnimationFrame(tick); };
  const update = () => {
    if (state.audio !== au) return;
    if (tim.t) {
      const ms = au.currentTime * 1000;
      let k = -1;
      for (let j = 0; j < tim.t.length / 2; j++) if (ms >= tim.t[2 * j] && ms <= tim.t[2 * j + 1] + 120) { k = j; break; }
      if (k !== last) {
        let arWord = '';
        for (const g of groups()) {
          g.querySelectorAll('.w.now').forEach(x => x.classList.remove('now'));
          if (k >= 0) g.querySelectorAll(`.w[data-w="${k + 1}"]`).forEach(x => { x.classList.add('now'); if (!arWord && x.closest('.ayah, span.v')) arWord = x.textContent; });
        }
        showLampWord(arWord || '');
        if (k >= 0) { state.galaxy.setActiveWord(w0 + k, arWord); state.galaxy.lookAtWord(w0 + k); } else state.galaxy.setActiveWord(null);
        const cur = groups()[0] && groups()[0].querySelector('.w.now'), b = $('#rdBody');
        if (cur && b) { const r = cur.getBoundingClientRect(), rb = b.getBoundingClientRect(); if (r.top < rb.top + 10 || r.bottom > rb.bottom - 10) b.scrollTo({ top: b.scrollTop + r.top - rb.top - b.clientHeight * 0.35, behavior: 'smooth' }); }
        last = k;
      }
    }
  };
  au.ontimeupdate = update;
  au.onplay = () => { cancelAnimationFrame(state.raf); document.body.classList.add('reciting'); tick(); };
  au.onended = () => {
    if (state.audio !== au) return;
    const S = state.core.suras[s - 1];
    const heard = au.duration;
    stopAudio(true);
    addListen(state.prefs, heard); savePrefs(state.prefs);
    markRecited(i);
    ray(document.querySelector(`#mushaf .v[data-i="${i}"]`) || $('#rdBody'));
    refreshGlow();
    // the time of prayer came during this verse: pause now, the adhan, then the basmala and the next verse
    if (state.prayerDue) {
      const due = state.prayerDue, next = i + 1 < S.first + S.ayas ? i + 1 : (i + 1 < state.core.verses.length ? i + 1 : i);
      state.prayerDue = null;
      const nextSura = state.engine.suraOf[next], firstVerse = state.core.suras[nextSura - 1].first === next;
      state.prayerBreak.open({ prayer: due.prayer, next, withAdhan: due.withAdhan,
        basmala: !firstVerse && resumesWithBasmala(nextSura) });   // a verse 1 carries its own basmala
      return;
    }
    if (state.repeatLeft > 1) { state.repeatLeft--; play(i); return; }       // تكرار
    state.repeatLeft = state.repeat || 1;
    if (state.continuous && i + 1 < S.first + S.ayas) { selectVerse(i + 1, { scroll: true, fly: false, keepAudio: true }); play(i + 1); }
    else if (state.continuous && i + 1 === S.first + S.ayas) { const e = $('#rdEnd'); if (e) e.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  };
  au.play().catch(() => { stopAudio(true); alertNote(T().audioError); });
}
// the basmala before the recitation resumes after the prayer break: verse 1:1, recited by the same reciter
async function playBasmala() {
  const tim = (await suraFile('timing', 1))[0];
  const au = new Audio(AUDIO_BASE + tim.u);
  au.playbackRate = state.speed;
  await new Promise((resolve) => { au.onended = resolve; au.onerror = resolve; au.play().catch(resolve); });
}
function stopAudio(updateBtn) {
  cancelAnimationFrame(state.raf);
  if (state.audio) { state.audio.onended = state.audio.ontimeupdate = null; state.audio.pause(); }
  state.audio = null; state.playing = false;
  document.body.classList.remove('reciting'); showLampWord('');
  document.querySelectorAll('.w.now').forEach(w => w.classList.remove('now'));
  if (state.galaxy) { state.galaxy.setActiveWord(null); state.galaxy.setReciting(false); }
  if (updateBtn) playButtons();
}

// ------------------------------------------------------------- hover (+ dwell, D1)
// The cursor resting 3 s on the same word (or a 600 ms long press on a touch screen): its verse shines
// strongly, its surah softly, and the word goes into the lamp with its verse, its rank and how often its
// form occurs. The highlight of the answer (or of the khatma) comes back when the cursor leaves. Not
// during a recitation: the recited verse keeps the light.
const DWELL_MS = 3000, LONG_PRESS_MS = 600;
let dwellT = 0, dwellWord = null;
function hover(p) {
  // during a recitation the recited word alone is shown (in the lamp and in the middle of the view)
  if (state.playing) p = null;
  showTip(p);
  armDwell(p);
}
// the tooltip is placed inside the galaxy zone, beside the star under the cursor, and kept inside the zone
// (it is absolutely positioned in #gzone: as «fixed» it was offset whenever the zone was not at the page origin)
function showTip(p) {
  const tt = $('#tooltip');
  if (!p || !state.words) { tt.style.display = 'none'; return; }
  const e = state.engine, z = $('#gzone').getBoundingClientRect();
  tt.innerHTML = `<div class="w">${esc(state.words[p.word])}</div><div>${esc(T().hoverAya(suraName(e.suraOf[p.verse]), e.ayaOf[p.verse]))}</div>`;
  tt.style.display = 'block';
  const w = tt.offsetWidth, h = tt.offsetHeight, x = p.x - z.left, y = p.y - z.top;
  const left = x + 14 + w > z.width - 6 ? x - 14 - w : x + 14;            // flip to the other side near the edge
  const top = y + 14 + h > z.height - 6 ? y - 14 - h : y + 14;
  tt.style.left = Math.max(6, left) + 'px';
  tt.style.top = Math.max(6, top) + 'px';
}
function armDwell(p) {
  const w = p ? p.word : null;
  if (w === dwellWord) return;                  // still on the same word: the clock keeps running
  clearTimeout(dwellT);
  dwellWord = w;
  endDwell();
  if (p) dwellT = setTimeout(() => startDwell(p), DWELL_MS);
}
function startDwell(p) {
  if (state.playing || !state.words || (state.dwell && state.dwell.word === p.word)) return;
  const e = state.engine, v = p.verse, sn = e.suraOf[v], S = state.core.suras[sn - 1];
  const f = wordFacts(state.words, p.word, state.galaxy.wordsOfVerse(v), state.galaxy.wordsOfVerse(S.first)[0]);
  const text = T().dwellInfo(refLabel(v), f.inVerse, f.verseWords, f.inSura, f.occurrences);
  state.dwell = { word: p.word, before: $('#lampRef').textContent, text };
  state.galaxy.highlightVerses([v], () => state.colorOf.get(sn) || 1);     // verse strong, its surah soft
  showLampWord(f.word, text);
  $('#lampRef').classList.add('dwell');
}
function endDwell() {
  const d = state.dwell;
  if (!d) return;
  state.dwell = null;
  $('#lampRef').classList.remove('dwell');
  applyHighlight();
  if (!state.playing) {
    showLampWord('');
    if ($('#lampRef').textContent === d.text) $('#lampRef').textContent = d.before;   // unless a verse was opened meanwhile
  }
}
// touch screens: a long press is the dwell; the next touch ends it
function setupLongPress() {
  const cv = $('#galaxy');
  let t = 0, at = null;
  cv.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse') return;
    clearTimeout(t); showTip(null); endDwell();
    at = { x: ev.clientX, y: ev.clientY };
    t = setTimeout(() => {
      const p = at && state.galaxy.pickAt(at.x, at.y);
      if (!p) return;
      state.galaxy.cancelPick();                 // lifting the finger must not open the verse
      showTip(p); startDwell(p);
    }, LONG_PRESS_MS);
  });
  const stop = (ev) => { if (ev.type === 'pointermove' && at && Math.hypot(ev.clientX - at.x, ev.clientY - at.y) < 8) return; clearTimeout(t); at = null; };
  ['pointermove', 'pointerup', 'pointercancel'].forEach(k => cv.addEventListener(k, stop));
}

// ------------------------------------------------------------- tools: dock + exclusive panels
// A dock of icon buttons under the search bar opens the tool panels (js/panels.js): one panel at a time,
// a second click or Escape closes it, the galaxy stays visible. Contents: js/toolpanels.js (ar + en).
const DOCK = ['athkar', 'tasbih', 'asma', 'prayer', 'qibla', 'mosques', 'khatma', 'tekrar', 'stats', 'hijri', 'links', 'settings'];
const DOCK_ICON = {
  tekrar: 'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4M10 9.5l4 2.5-4 2.5z',
  stats: 'M4 20V11M10 20V5M16 20v-6M21 20H3',
  // a string of prayer beads with its tassel (tasbih); a book of supplications (adhkar); an eight-pointed star (the Names)
  tasbih: 'M12 3.5a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11zM12 14.5v3.5M10.3 21l1.7-3 1.7 3M12 3.5v.01M6.5 9v.01M17.5 9v.01M8.1 5.1v.01M15.9 5.1v.01M8.1 12.9v.01M15.9 12.9v.01',
  khatma: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z',
  hijri: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  prayer: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2',
  athkar: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6M9 11h4',
  asma: 'M7 7h10v10H7zM12 4.9l7.1 7.1-7.1 7.1L4.9 12zM12 10.2v.01',
  qibla: 'M12 2l3 7h-6zM12 2v20M5 12h14M8 18h8v4H8z',
  mosques: 'M4 21V11a8 8 0 0 1 16 0v10zM12 3v2M9 21v-5a3 3 0 0 1 6 0v5M2 21h20',
  links: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
};
const TS = () => TOOL_S[state.lang] || TOOL_S.ar;
const toolTitle = (id) => id === 'asma' ? (ASMA_S[state.lang] || ASMA_S.ar).title : id === 'tekrar' ? (TK[state.lang] || TK.ar).title : id === 'tasbih' ? (TASBIH_S[state.lang] || TASBIH_S.ar).title : id === 'stats' ? (ST[state.lang] || ST.ar).title
  : TS()[id] || (PRACT_S[state.lang] || PRACT_S.ar)[id] || (id === 'athkar' ? (ATHKAR_S[state.lang] || ATHKAR_S.ar).title : id);
const isPhone = () => matchMedia('(max-width: 860px)').matches;
// the test of the repetition: a recitation turned into text (Whisper on the server, or the browser)
const listenRecite = (onPartial) => listen({ lang: 'ar', serverStt: state.stt, mode: 'recite', maxMs: 30000, silenceMs: 2200, onPartial });
function setupTools() {
  state.tools = createToolPanels({
    lang: () => state.lang, core: state.core,
    get prefs() { return state.prefs; },
    save: () => savePrefs(state.prefs),
    replace: (p) => { state.prefs = p; savePrefs(p); },
    // Tanzil page boundaries of the Madina Mushaf (604 pages), for the khatma plan
    meta: () => (metaP = metaP || getJSON('data/mushaf_meta.json')),
    // on a phone the sheet would hide the Mushaf: it closes; on a computer the drawer stays beside it
    openVerse: (i) => { if (isPhone()) state.panels.close(); goVerse(i, { pane: 'r' }); },
    readerVerse: () => (state.mode === 'study' && state.reader.sura ? state.reader.cur : null),
    onReadChange: () => { if (checkKhatma(state.prefs)) { savePrefs(state.prefs); celebrateKhatma(); } applyHighlight(); refreshMiniLamp(); refreshHud(); },
    openLampMap: () => openKhatmaMap(),
    // (5 Oct, evening) a new khatma plan: its surahs light up one by one in the 3D lamp, then «how would you like to read?»
    planReveal: (seq, opts) => openKhatmaMap({ reveal: { seq, ...opts } }),
    startReading: (i, how) => startReading(i, how),
    // hadiths of the remarkable days, by HadeethEnc id, verbatim from the local files (search worker)
    hadiths: (ids, lang) => workerCall({ op: 'hadiths', ids, lang }),
    status: alertNote,
    // the page's own controls, offered in the Settings panel too
    ui: {
      setLang: (l) => applyLang(l),
      theme: () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', setTheme: (th) => setTheme(th),
      names: () => $('#gNames').getAttribute('aria-pressed') === 'true', setNames: (v) => setNames(v),
      rotate: () => !!state.galaxy.autoRotate, setRotate: (v) => { state.galaxy.setAutoRotate(v); $('#gRot').setAttribute('aria-pressed', v); },
      speed: () => state.speed,
      setSpeed: (v) => { state.speed = v; store.set('speed', v); if (state.audio) state.audio.playbackRate = v; const s = $('#rSpeed'); if (s) s.value = v; },
      font: (d) => { state.qs = Math.round(Math.min(1.8, Math.max(0.7, state.qs + d)) * 10) / 10; store.set('qs', state.qs); $('#rzone').style.setProperty('--qs', state.qs); },
      open: (id) => state.panels.open(id),
      age: () => state.prefs.age, setAge: (v) => { state.prefs.age = v; savePrefs(state.prefs); applyChild(); },
      replayIntro: () => { state.panels.close(); runIntro().then(q => { if (q) { $('#q').value = q; run(q); } }); }, install: () => openInstall(state.lang),
    },
  });
  const renderers = {
    khatma: (body, args) => state.tools.khatma(body, args),
    hijri: (body, args) => state.tools.hijri(body, args),
    links: (body) => state.tools.links(body),
    settings: (body) => state.tools.settings(body),
    // T064–T066: prayer times (Aladhan), qibla (computed here), nearby mosques (OpenStreetMap) — the position
    // stays in the browser and goes only to those public services, never to Mishkat's server
    prayer: (body, args) => state.practical.prayer(body, args),
    qibla: (body) => state.practical.qibla(body),
    mosques: (body) => state.practical.mosques(body),
    // T062: adhkar with a known grade (HadeethEnc; Hisn al-Muslim checked on Dorar)
    athkar: (body, args) => state.athkar(body, args || {}),
    // T095 repetition, T094 statistics
    tekrar: (body, args) => state.tekrar.render(body, args || {}),
    tasbih: (body, args) => state.tasbih.render(body, args || {}),
    asma: (body) => state.asma.render(body),
    stats: (body, args) => state.stats.render(body, args || {}),
  };
  state.tekrar = createTekrar({ lang: () => state.lang, core: state.core, get prefs() { return state.prefs; }, save: () => savePrefs(state.prefs),
    timing: (s) => suraFile('timing', s), audioBase: AUDIO_BASE, digits: dig,
    onProgress: () => { applyHighlight(); refreshHud(); refreshMiniLamp(); ray($('#p-tekrar .p-body') || $('#tray'), { strong: true }); },
    focus: (i) => { try { state.galaxy.setFocusVerse(i); } catch (e) { /* ignore */ } },
    // (6 Oct) the tajweed rules of the verses repeated, the test (simple spelling, voice), sharing and inviting
    tajweed: (s) => state.tajweedData.has(s) ? Promise.resolve(state.tajweedData.get(s)) : getJSON(`data/tajweed/${s}.json`).then(d => { state.tajweedData.set(s, d); return d; }),
    plain: () => (state.plainP = state.plainP || getJSON('data/search_ar.json')),
    get listen() { return voiceSupported(state.stt) ? listenRecite : null; },
    stopListen: () => stopListening(), note: alertNote, site: () => 'https://mishkatquran.org/' });
  state.tasbih = createTasbih({ lang: () => state.lang, get prefs() { return state.prefs; }, save: () => savePrefs(state.prefs), digits: dig, ymd: () => ymd(new Date()),
    onCount: (n) => { addTasbih(state.prefs, n); savePrefs(state.prefs); refreshGlow(); },
    onGoal: (el) => ray(el, { strong: true }) });
  state.asma = createAsma({ lang: () => state.lang, get prefs() { return state.prefs; }, save: () => savePrefs(state.prefs), digits: dig,
    search: (q) => { if (isPhone()) state.panels.close(); $('#q').value = q; run(q); },
    learntCount: () => glowOf(state.prefs).asma.length,
    onName: (n, el) => { if (addName(state.prefs, n)) { savePrefs(state.prefs); refreshGlow(); } ray(el); } });
  state.stats = createStats({ lang: () => state.lang, core: state.core, digits: dig,
    plain: () => (state.plainP = state.plainP || getJSON('data/search_ar.json')), meta: () => (metaP = metaP || getJSON('data/mushaf_meta.json')),
    openVerse: (i) => { if (isPhone()) state.panels.close(); goVerse(i, { pane: 'r' }); }, search: (q) => { $('#q').value = q; run(q, 'topic'); },
    current: () => (state.mode === 'study' && state.reader.sura ? state.reader.cur : null) });
  state.athkar = createAthkar({ lang: () => state.lang });
  state.practical = createPractical({ lang: () => state.lang, qrcode, scene: (k, o) => state.galaxy && state.galaxy.setScene && state.galaxy.setScene(k, o),
    // the time of prayer during a recitation: the verse is finished first (play → onended → prayerBreak)
    onPrayerTime: (prayer, mode) => {
      if (!state.playing || !state.continuous) return false;
      state.prayerDue = { prayer, withAdhan: mode === 'adhan' };
      return true;
    } });
  state.prayerBreak = createPrayerBreak({
    lang: () => state.lang,
    verse: (sura, aya) => state.core.verses[state.core.suras[sura - 1].first + aya - 1],
    refLabel: (sura, aya) => refLabel(state.core.suras[sura - 1].first + aya - 1),
    playAdhan: (onEnd) => state.practical.adhan(onEnd),
    playBasmala: () => playBasmala(),
    resume: (next) => { state.playMode = 'all'; selectVerse(next, { scroll: true, fly: false, keepAudio: true }); play(next); },
    stop: () => { stopAudio(true); },
  });
  const ids = state.toolIds = DOCK.filter(id => renderers[id]);     // also what the search bar may open (T032)
  $('#dock').innerHTML = ids.map(id => `<button type="button" data-panel="${id}" aria-expanded="false"><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path d="${DOCK_ICON[id]}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="dl"></span></button>`).join('');
  $('#dock').hidden = !ids.length;
  state.panels = createPanels({
    dock: $('#dock'), tray: $('#tray'), renderers,
    titles: Object.fromEntries(DOCK.map(id => [id, () => toolTitle(id)])), closeLabel: () => TS().close, maxLabel: (on) => on ? XS().pMin : XS().pMax,
    // (6 Oct, author's request) repetition opens full size (the ⤢ button of the panel makes it smaller)
    onOpen: (id) => { document.body.dataset.panel = id; state.panels.setMax(id === 'tekrar'); if (id === 'khatma' || id === 'tekrar') applyHighlight(); },
    onClose: (id) => { delete document.body.dataset.panel; if (id === 'khatma' || id === 'tekrar') applyHighlight(); if (id === 'tekrar') state.tekrar.stop(); if (id === 'tasbih') state.tasbih.stop(); if (id === 'asma') state.asma.stop(); state.practical.stop(); },
  });
  labelDock();
}
// a verse recited to its end, or read by scrolling, counts as read (Settings), in this browser only
function markRecited(i, how = 'audio') {
  const P = state.prefs;
  if (how === 'audio' ? !P.autoMark : !P.scrollMark) return;
  const bits = decodeRead(P.read);
  if (isRead(bits, i)) return;
  const before = surasRead(bits, state.core.suras).length;
  markRead(bits, i);
  P.read = encodeRead(bits);
  P.khRec = addRecord(P.khRec, [i]);                 // (6 Oct) the reading record of the khatma panel
  const day = ymd(new Date());
  P.log = P.log || {}; P.log[day] = (P.log[day] || 0) + 1;
  noteRead(P, i);                                    // this month's percentage (reader mode)
  const finished = checkKhatma(P);                   // the whole Quran read: one more khatma
  savePrefs(P);
  refreshHud();
  if (finished) celebrateKhatma();
  if (state.panels.current === 'khatma') {
    const body = $('#p-khatma .p-body'), top = body.scrollTop;
    state.tools.khatma(body).then(() => { body.scrollTop = top; });
  }
  if (surasRead(bits, state.core.suras).length !== before) applyHighlight();   // a surah just turned green
  refreshMiniLamp();
}
// T069: the khatma inside the logo — the surahs read light up in the glass of the lamp (mini view) and in a
// 3D map of the 114 surahs with their names (Mushaf / revelation / length / Meccan-Medinan order)
// T042: the voice of the application — a short welcome after the basmala (the visitor's gesture allows sound),
// and the short answer read aloud on request; both with the BROWSER's voice (free, local), and never the Quran:
// verse texts are left out of what is read (the Quran is only recited by a human reciter).
// Arabic: the hand-written welcome sentence, generated once with Groq Orpheus (tools/make_welcome_audio.py) and
// shipped as audio/welcome_ar.mp3, so it is heard even where the browser has no Arabic voice; English: the
// browser's voice.
async function welcomeVoice() {
  if (!state.prefs.welcomeVoice) return;
  const lang = state.lang === 'en' ? 'en' : 'ar';
  const byBrowser = async () => {
    if (!window.speechSynthesis) return;
    const v = await browserVoice(lang);
    if (!v) return;
    const u = new SpeechSynthesisUtterance(T().welcomeSpoken);
    u.voice = v; u.lang = v.lang; u.rate = lang === 'ar' ? 0.95 : 1;
    speechSynthesis.speak(u);
  };
  try {
    if (lang === 'ar') { const au = new Audio('audio/welcome_ar.mp3'); au.volume = 0.9; await au.play(); return; }
  } catch (e) { /* blocked or missing: the browser's voice */ }
  try { await byBrowser(); } catch (e) { /* no voice */ }
}
function answerText() {
  const box = $('#briefBox');
  if (!box) return '';
  const c = box.cloneNode(true);
  c.querySelectorAll('h3, .cite, .rag-q, .ayah-in, .note, button, a.cite').forEach(x => x.remove());
  return c.textContent.replace(/\s+/g, ' ').trim();
}
// the tafsir units of the key verses of the answer, as shipped in public/data/tts (the only texts the server
// voice may read, T018): used when the browser has no voice for the language
const TTS_BOOK_IDS = ['muyassar_ar', 'mukhtasar_ar', 'mukhtasar_en'];
async function answerPassages(lang) {
  const seen = new Set(), picks = [];
  // the verses the short answer cites, then the key verse cards (with the tafsir book shown on them)
  for (const b of document.querySelectorAll('#briefBox .cite[data-idx]')) picks.push({ i: +b.dataset.idx, book: null });
  for (const c of document.querySelectorAll('#view article.vcardx:not(.ctx)')) picks.push({ i: +c.dataset.idx, book: c.dataset.src });
  const chosen = picks.filter(p => Number.isInteger(p.i) && !seen.has(p.i) && seen.add(p.i)).slice(0, 3).map(p => {
    const book = TTS_BOOK_IDS.includes(p.book) ? p.book : (lang === 'en' ? 'mukhtasar_en' : 'muyassar_ar');
    const [s, a] = state.engine.ref(p.i).split(':').map(Number);
    return { book, s, a };
  });
  // the files are fetched together (one per surah), the order of the answer is kept
  const units = await Promise.all(chosen.map(c => fetch(`data/tts/${c.book}/${c.s}.json`).then(r => r.json()).catch(() => null)));
  return chosen.map((c, k) => units[k] && units[k][c.a - 1] ? { text: units[k][c.a - 1], ref: c } : null).filter(Boolean);
}
// a one-line status under the title of the short answer
function toastMsg(msg) {
  const box = $('#briefBox');
  if (!box || !msg) return;
  let p = box.querySelector('.ans-voice');
  if (!p) { p = document.createElement('p'); p.className = 'note ans-voice'; p.setAttribute('role', 'status'); box.querySelector('h3')?.after(p); }
  p.textContent = msg;
}
let ansRun = 0;
async function speakAnswer(lang) {
  const b = $('#ansTts');
  if (b && b.classList.contains('on')) { ansRun++; speaker.stop(); b.classList.remove('on'); return; }
  lang = lang === 'en' ? 'en' : 'ar';
  const my = ++ansRun;
  stopAudio(true);
  if (b) b.classList.add('on');
  try {
    if (await browserVoice(lang)) { const text = answerText(); if (text) await speaker.speak(text, lang, null); return; }
    // no voice for this language in the browser: the server voice reads the tafsir of the key verses
    const items = state.tts ? await answerPassages(lang) : [];
    if (!items.length) { toastMsg(T().ansNoVoice); return; }
    toastMsg(T().ansServerVoice);
    for (const it of items) {
      if (my !== ansRun) break;
      if (await speaker.speak(it.text, lang, it.ref) !== 'done') break;
    }
  } finally { if (my === ansRun && b) b.classList.remove('on'); }
}
function refreshMiniLamp() {
  const slot = $('#lampSlot');
  if (!slot || !state.core) return;
  const prog = progressOf(decodeRead(state.prefs.read), state.core.suras, isRead);
  slot.querySelector('.kmini')?.remove();
  slot.insertAdjacentHTML('beforeend', miniLamp(prog, state.core.suras, store.get('kmapOrder', 'mushaf')));
  const n = prog.filter(f => f >= 1).length;
  slot.title = T().lm.slotTitle(n);
  slot.setAttribute('role', 'button'); slot.tabIndex = 0; slot.setAttribute('aria-label', T().lm.slotTitle(n));
  slot.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openKhatmaMap(); } };
}
// reading the day's portion: with the reciter and the galaxy, reading only (the Mushaf full screen), or listening only
function startReading(i, how) {
  if (state.panels) state.panels.close();
  goVerse(i, { pane: 'r' });
  setReadFull(how === 'only' || how === 'listen');
  if (how === 'with' || how === 'listen') setTimeout(() => { state.playMode = 'all'; play(i, true); }, 700);
}
// (6 Oct, author's request) the end of a surah in the reader: «I finished this surah ✓» (recorded in the khatma, its
// record and this month's reading — an explicit choice, whatever the automatic settings) and the next surah
function suraEndHtml(sura) {
  const x = XS(), S = state.core.suras[sura - 1], en = state.lang === 'en', nm = (s) => en ? s.tr : s.ar;
  const all = countRead(decodeRead(state.prefs.read), S.first, S.first + S.ayas - 1) === S.ayas;
  const nx = state.core.suras[sura] || null;
  return `<div class="rd-end" id="rdEnd"><p class="rd-end-t">✦ ${esc(x.suraEnd(nm(S)))}</p>
    <div class="rd-end-b"><button type="button" class="btn ${all ? 'on' : 'gold'}" id="rDoneSura" ${all ? 'disabled' : ''}>${esc(all ? x.suraDoneOk : x.suraDone)}</button>
    <button type="button" class="btn ${all ? 'gold' : ''}" id="rNextSura">${esc(nx ? x.nextSura(nm(nx)) : x.firstSura)} ${state.lang === 'ar' ? '←' : '→'}</button></div>
    <p class="p-small">${esc(x.suraDoneHelp)}</p></div>`;
}
function markSuraRead(sura) {
  const P = state.prefs, S = state.core.suras[sura - 1], bits = decodeRead(P.read), nw = [];
  for (let i = S.first; i < S.first + S.ayas; i++) if (!isRead(bits, i)) nw.push(i);
  if (!nw.length) return;
  markRead(bits, S.first, S.first + S.ayas - 1);
  P.read = encodeRead(bits);
  P.khRec = addRecord(P.khRec, nw);
  const day = ymd(new Date()); P.log = P.log || {}; P.log[day] = (P.log[day] || 0) + nw.length;
  for (const i of nw) noteRead(P, i);
  const finished = checkKhatma(P);
  savePrefs(P); refreshHud(); refreshMiniLamp(); applyHighlight();
  if (finished) celebrateKhatma();
  if (state.panels.current === 'khatma') state.tools.khatma($('#p-khatma .p-body'));
}
function wireSuraEnd(sura) {
  const d = $('#rDoneSura'), n = $('#rNextSura');
  if (d) d.onclick = () => { markSuraRead(sura); const box = $('#rdEnd'); if (box) { box.outerHTML = suraEndHtml(sura); wireSuraEnd(sura); } $('#rNextSura') && $('#rNextSura').focus(); };
  if (n) n.onclick = () => { const was = state.playing && state.continuous; const to = sura < 114 ? sura + 1 : 1; openReader(to, null, { autoplay: was ? 'all' : false }); };
}
// (6 Oct) the tafsir while reading full screen: a side sheet (a bottom sheet on a phone) over the Mushaf
function setTafFull(on) {
  document.body.classList.toggle('taf-full', on);
  if (on) { state.tafClosed = false; document.body.classList.remove('taf-closed'); if (state.reader.cur != null) renderTafsir(state.reader.cur); }
}
function setReadFull(on) {
  document.body.classList.toggle('read-full', on);
  if (!on) document.body.classList.remove('taf-full');
  const b = $('#rFull'); if (b) b.setAttribute('aria-pressed', String(on));
  if (state.galaxy && state.galaxy.resize) setTimeout(() => state.galaxy.resize(), 80);
}
function openKhatmaMap(extraOpts = {}) {
  if (!state.core) return;
  const prog = progressOf(decodeRead(state.prefs.read), state.core.suras, isRead);
  const P = state.prefs, m = monthPct(P), x = XS();
  openLampMap({ core: state.core, prog, lang: state.lang, order: store.get('kmapOrder', 'mushaf'), strings: T().lm,
    hifz: hifzProgress(P, state.core.suras), extra: `${x.hudRead} ${pctTxt(m.read)} · ${x.hudHifz} ${pctTxt(m.hifz)} · ${x.khTitle}: ${dig(P.khatmas || 0)}`,
    onPick: (n) => openReader(n, null, { pane: 'r' }),
    onOrder: (o) => { store.set('kmapOrder', o); refreshMiniLamp(); }, ...extraOpts });
}
// T100 — the small 📊 button (galaxy and reading options): statistics of the verse being read, then its surah
function openVerseStats() {
  const i = state.reader.cur;
  if (!state.panels) return;
  closeNav();
  state.panels.open('stats', i != null && state.mode === 'study' ? { verse: i } : {});
}
function labelDock() {
  $('#dock').setAttribute('aria-label', TS().dock);
  document.querySelectorAll('#dock [data-panel]').forEach(b => { const s = toolTitle(b.dataset.panel); b.setAttribute('aria-label', s); b.title = s; const l = b.querySelector('.dl'); if (l) l.textContent = s; });
}

// ------------------------------------------------------------- galaxy toolbar
// Two keys for the 3D view: the SHAPE (galaxy, «قرآن», rose, dome, petals) and the
// ORDER in which the surahs are laid along it (Mushaf, revelation, place, length,
// letters, verses, verse length). Layouts are computed once, then morphed.
const layoutIdx = { 'galaxy|mushaf': 0, 'galaxy|nuzul': 1 };
const layoutNote = {};
const view = { shape: 'galaxy', order: 'mushaf' };
const DEFAULT_SHAPE = 'rose';
// the view at start: the visitor's own last choice, else the rose of surahs in the Mushaf order
function startView() {
  const [shape, order] = String(store.get('shapePick', '') || '').split('|');
  return shape ? { shape, order: order || 'mushaf' } : { shape: DEFAULT_SHAPE, order: 'mushaf' };
}
function fillViewPickers() {
  const L = state.lang;
  $('#shapeSel').innerHTML = SHAPES.map(x => `<option value="${x.id}">${esc(x[L])}</option>`).join('');
  $('#orderSel').innerHTML = ORDERS.map(x => `<option value="${x.id}">${esc(x[L])}</option>`).join('');
  $('#shapeSel').value = view.shape; $('#orderSel').value = view.order;
  const k = view.shape + '|' + view.order;
  if (!$('#viewNote').hidden && layoutNote[k]) $('#viewNote').textContent = layoutNote[k][L];
}
async function setView(shape, order, { quiet = false } = {}) {
  if (!SHAPES.some(x => x.id === shape)) shape = 'galaxy';
  if (!ORDERS.some(x => x.id === order)) order = 'mushaf';
  const key = shape + '|' + order;
  view.shape = shape; view.order = order;
  $('#shapeSel').value = shape; $('#orderSel').value = order;
  if (!(key in layoutIdx) || !layoutNote[key]) await ensureLayout(shape, order);
  if (view.shape !== shape || view.order !== order) return; // another choice was made meanwhile
  // restoring the visitor's view at start must not pull the camera away from a verse or an answer
  state.galaxy.setLayout(layoutIdx[key], !(quiet && state.mode !== 'home'));
  store.set('shape', shape); store.set('order', order);
  if (!quiet) store.set('shapePick', shape + '|' + order);
  const note = $('#viewNote');
  clearTimeout(setView.timer);
  if (!quiet) {
    note.textContent = layoutNote[key][state.lang];
    note.hidden = false;
    setView.timer = setTimeout(() => { note.hidden = true; }, 7000);
  }
}
// the shapes are computed in a Web Worker (js/layout-worker.js): changing the shape never freezes the page, even
// while a verse is recited; the other shapes of the current order are prepared in the background, after start
let lw = null, lwSeq = 0, lwRaster = null, lwWords = false;
const lwWait = new Map();
async function layoutJob(shape, order) {
  const params = { shape, order, wordVerse: state.galaxy.wordVerse, suras: state.core.suras };
  try {
    if (!lw) {
      lw = new Worker(new URL('./layout-worker.js', import.meta.url), { type: 'module' });
      lw.onmessage = (ev) => { const w = lwWait.get(ev.data.id); if (w) { lwWait.delete(ev.data.id); ev.data.error ? w.rej(new Error(ev.data.error)) : w.res(ev.data); } };
      lw.postMessage({ init: true, wordVerse: params.wordVerse, suras: params.suras });
    }
    const msg = { id: ++lwSeq, shape, order };
    if (order === 'letters' && !lwWords) { msg.words = await state.wordsP; lwWords = true; }
    if (shape === 'quran' && !lwRaster) { const { glyphRaster } = await import('./letters3d.js'); lwRaster = await glyphRaster(); Object.assign(msg, lwRaster); }
    return await new Promise((res, rej) => { lwWait.set(msg.id, { res, rej }); lw.postMessage(msg); });
  } catch (e) {
    // no module workers (old browser): computed here
    return buildLayout({ ...params, words: order === 'letters' ? await state.wordsP : null });
  }
}
const layoutPending = {};
function ensureLayout(shape, order) {
  const key = shape + '|' + order;
  if (key in layoutIdx && layoutNote[key]) return Promise.resolve();
  return (layoutPending[key] = layoutPending[key] || layoutJob(shape, order).then(lay => {
    if (!(key in layoutIdx)) layoutIdx[key] = state.galaxy.addLayout(lay.positions, lay.view, lay.spine);
    layoutNote[key] = lay.note;
  }).finally(() => { delete layoutPending[key]; }));
}
// after start, one shape at a time when the page is idle
function prepareLayouts() {
  // (5 Oct) not on a phone: the other shapes are computed when chosen (in the layout worker) — precomputing them all
  // 8 s after the start (with the letters of «قرآن» drawn on the page) was one of the «sometimes it lags» moments
  if (isPhone() || matchMedia('(pointer: coarse)').matches) return;
  const todo = SHAPES.map(x => x.id).filter(id => !((id + '|' + view.order) in layoutIdx));
  const next = () => { const id = todo.shift(); if (!id) return; ensureLayout(id, view.order).catch(() => {}).then(() => (window.requestIdleCallback || setTimeout)(next, { timeout: 4000 })); };
  (window.requestIdleCallback || setTimeout)(next, { timeout: 6000 });
}
const cycle = (list, cur, d = 1) => list[(list.findIndex(x => x.id === cur) + d + list.length) % list.length].id;
function setNames(v) { state.galaxy.setNames(v); $('#gNames').setAttribute('aria-pressed', v); store.set('names', v ? '1' : '0'); }
$('#shapeSel').onchange = (ev) => setView(ev.target.value, view.order);
$('#orderSel').onchange = (ev) => setView(view.shape, ev.target.value);
$('#gHome').onclick = () => state.galaxy.home();
// camera buttons: a click (or Enter) turns/tilts by one eased step; held down, the camera moves continuously
{
  const STEP = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  let hold = 0, held = false;
  const stopHold = () => { clearInterval(hold); hold = 0; };
  document.querySelectorAll('#gcam [data-cam]').forEach(b => {
    const [a, e] = STEP[b.dataset.cam];
    b.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); held = false; stopHold();
      hold = setTimeout(() => { held = true; hold = setInterval(() => state.galaxy.orbit(a * 0.025, e * 0.018), 30); }, 260);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => b.addEventListener(k, stopHold));
    b.addEventListener('click', () => { if (!held) state.galaxy.orbit(a * 0.26, e * 0.17, 450); held = false; });
  });
}
$('#gIn').onclick = () => state.galaxy.zoom(0.6);
// ⋯ on a phone: the toolbar shows ⌂, the shape and ⤢; ⋯ unfolds zoom, rotation, names, order, legend and the camera pad
$('#gMore').onclick = () => { const on = !$('#gzone').classList.contains('gt-open'); $('#gzone').classList.toggle('gt-open', on); $('#gMore').setAttribute('aria-expanded', on); };
$('#gOut').onclick = () => state.galaxy.zoom(1.6);
$('#gRot').onclick = () => { const v = !state.galaxy.autoRotate; state.galaxy.setAutoRotate(v); $('#gRot').setAttribute('aria-pressed', v); };
$('#gNames').onclick = () => setNames($('#gNames').getAttribute('aria-pressed') !== 'true');
$('#gLegend').onclick = () => { const b = $('#legendBox'); b.hidden = !b.hidden; $('#gLegend').setAttribute('aria-expanded', !b.hidden); };
function setPure(on) {
  document.body.classList.toggle('gpure', on);
  // centred on the whole screen (on a phone the home view is shifted up to leave room for the suggestions)
  state.galaxy.setShift(on ? 0 : state.mode === 'home' && isPhone() ? 0.2 : 0);
  $('#gPure').setAttribute('aria-pressed', on);
  if (on) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (state.galaxy && state.galaxy.resize) { requestAnimationFrame(() => state.galaxy.resize()); setTimeout(() => state.galaxy.resize(), 400); }
}
$('#gPure').onclick = () => setPure(!document.body.classList.contains('gpure'));
$('#pureExit').onclick = () => setPure(false);
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('gpure')) setPure(false); });
$('#gFull').onclick = () => { const on = !document.body.classList.contains('gfull'); document.body.classList.toggle('gfull', on); $('#gFull').setAttribute('aria-pressed', on); if (state.galaxy && state.galaxy.resize) { requestAnimationFrame(() => state.galaxy.resize()); setTimeout(() => state.galaxy.resize(), 400); } };

// ------------------------------------------------------------- wiring
$('#searchForm').addEventListener('submit', (ev) => { ev.preventDefault(); const q = $('#q').value.trim(); if (q) run(q); });
document.querySelectorAll('.langs button').forEach(b => b.onclick = () => applyLang(b.dataset.lang));
$('#resClose').onclick = clearResults;
$('#ansToggle').onclick = () => { if (state.mode === 'study') openAnswers(!document.body.classList.contains('ans-open')); };
// hovering the folded answers bar unfolds them for a look; leaving the side column folds them back
let peekT = 0;
$('#sHead').addEventListener('mouseenter', () => { if (state.mode === 'study' && !document.body.classList.contains('ans-open')) peekT = setTimeout(() => document.body.classList.add('ans-peek'), 260); });
$('#sHead').addEventListener('mouseleave', () => clearTimeout(peekT));
$('.col-side').addEventListener('mouseleave', () => { clearTimeout(peekT); document.body.classList.remove('ans-peek'); });
$('#sgClose').onclick = () => { state.suggestClosed = true; setMode(state.mode); };
$('#sgOpen').onclick = () => { state.suggestClosed = false; setMode(state.mode); };
document.querySelectorAll('#mtabs [data-pane]').forEach(b => b.onclick = () => showPane(b.dataset.pane));
setupSplit($('#splitMain'), $('.col-main'), 'splitMain');
setupSplit($('#splitSide'), $('.col-side'), 'splitSide');
showPane('r');
state.taf.book = store.get('book');
$('#btnMenu').onclick = () => { closeNav(); openWelcome(); };
$('#btnAbout').onclick = () => { closeNav(); $('#about').showModal(); };
$('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');

// ------------------------------------------------------------ the menu drawer (☰)
// The top bar keeps the search, the tools (on a computer) and ☰. The drawer holds the rest: interests, install,
// about, language, theme — and on a phone the tools (with their names), the engagement level and the khatma count,
// moved there from the top bar (the bar had ten icons in two rows at 390 px). Nothing is removed, only placed.
function placeNav() {
  const phone = isPhone(), dock = $('#dock'), eng = $('#engBtn'), kc = $('#khCount'), hr = $('#hright');
  if (phone) {
    if (dock.parentElement.id !== 'ndDock') $('#ndDock').appendChild(dock);
    if (eng.parentElement.id !== 'ndEng') { $('#ndEng').appendChild(eng); $('#ndEng').appendChild(kc); }
  } else {
    const ref = hr.querySelector('.hlangs');
    if (kc.parentElement !== hr) hr.insertBefore(kc, ref);
    if (dock.parentElement !== hr) hr.insertBefore(dock, ref);
    if (eng.parentElement !== hr) hr.insertBefore(eng, ref);
  }
  $('#ndTools').hidden = !phone;
  $('#ndMine').hidden = !phone;
}
function openNav() {
  const d = $('#navDrawer');
  d.hidden = false; $('#navScrim').hidden = false;
  requestAnimationFrame(() => { d.classList.add('open'); $('#navScrim').classList.add('open'); });
  $('#navBtn').setAttribute('aria-expanded', 'true');
  document.body.classList.add('nav-open');
  setTimeout(() => $('#navClose').focus({ preventScroll: true }), 60);
}
function closeNav(focusBack = false) {
  const d = $('#navDrawer');
  if (d.hidden) return;
  d.classList.remove('open'); $('#navScrim').classList.remove('open');
  $('#navBtn').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
  setTimeout(() => { if (!d.classList.contains('open')) { d.hidden = true; $('#navScrim').hidden = true; } }, 260);
  if (focusBack) $('#navBtn').focus({ preventScroll: true });
}
$('#navBtn').onclick = () => ($('#navDrawer').hidden ? openNav() : closeNav());
$('#navClose').onclick = () => closeNav(true);
$('#navScrim').onclick = () => closeNav();
// a tool, the engagement map or the khatma map opened from the drawer: the drawer steps aside
$('#navDrawer').addEventListener('click', (ev) => { if (ev.target.closest('[data-panel], #engBtn, #khCount')) closeNav(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('#navDrawer').hidden) { ev.stopPropagation(); closeNav(true); } }, true);
matchMedia('(max-width: 860px)').addEventListener('change', () => { placeNav(); closeNav(); });
placeNav();
document.addEventListener('keydown', (ev) => {
  if (ev.target.closest && ev.target.closest('input,select,textarea,[contenteditable]')) return;
  if (!$('#gate').hidden || !$('#welcome').hidden || !$('#voice').hidden || $('#about').open) return;
  // inside a tool panel, keys belong to the panel; Escape closes the panel only (js/panels.js), not the reader
  if (ev.target.closest && ev.target.closest('#tray')) return;
  if (ev.key === 'Escape' && state.panels && state.panels.current) return;
  if (ev.key === '/') { ev.preventDefault(); $('#q').focus(); return; }
  if (ev.key === 'v' || ev.key === 'V') { setView(cycle(SHAPES, view.shape, ev.shiftKey ? -1 : 1), view.order); return; }
  if (ev.key === 'o' || ev.key === 'O') { setView(view.shape, cycle(ORDERS, view.order, ev.shiftKey ? -1 : 1)); return; }
  if (ev.target.closest && ev.target.closest('[role=separator]')) return;
  if (ev.key === ' ' && ev.target.closest && ev.target.closest('button,a,summary')) return; // native activation
  if (!state.reader.sura || state.mode !== 'study') return;
  const rtl = document.documentElement.dir === 'rtl';
  if (ev.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) step(1);
  if (ev.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) step(-1);
  if (ev.key === ' ' && state.mode === 'study') { ev.preventDefault(); togglePlay(state.playMode); }
  if (ev.key === 'Escape' && state.mode === 'study') closeReader();
});

function setTheme(th) {
  document.documentElement.dataset.theme = th;
  $('#themeBtn .ti').textContent = th === 'light' ? '☀' : '☾';
  $('#themeBtn .tl2').textContent = (UI[state.lang] || UI.ar)[th === 'light' ? 'themeLight' : 'themeDark'];
  store.set('theme', th);
}
setTheme(store.get('theme', 'dark'));

// ------------------------------------------------------------ welcome → interests → personalised home
const INTERESTS = ['ahkam', 'stories', 'akhlaq', 'tafsir', 'recite', 'suras', 'memorize', 'verify'];
const ICONS = {
  ahkam: 'M12 3v17M6 20h12M4 7h16M7 7l-3 6a3 3 0 0 0 6 0zM17 7l-3 6a3 3 0 0 0 6 0z',
  stories: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z',
  akhlaq: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  tafsir: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z',
  recite: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4zM17 15h3v5h-3z',
  suras: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  memorize: 'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4',
  verify: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5',
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${ICONS[k]}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PICKS = {
  tafsir: [[2, 255], [24, 35], [2, 285], [1, 1], [103, 1], [59, 22]],
  recite: [1, 18, 36, 55, 67, 56],
  suras: [2, 3, 12, 18, 19, 36],
  memorize: [112, 113, 114, 108, 103, 1],
};
const VERIFY_EX = ['النظافة من الإيمان', 'إن الله مع الصابرين', 'اطلبوا العلم ولو في الصين', 'وقل رب زدني علما'];
function suraOptions(sel = 1) {
  return state.core.suras.map(S => `<option value="${S.n}"${S.n === sel ? ' selected' : ''}>${S.n}. ${esc(state.lang === 'ar' ? S.ar : S.tr)}</option>`).join('');
}
function interests() {
  try { return (JSON.parse(store.get('interests', '[]')) || []).filter(k => INTERESTS.includes(k)); } catch (e) { return []; }
}

const WPREF = {
  ar: { theme: 'المظهر', dark: 'داكن', light: 'فاتح', digits: 'الأرقام', voice: 'الترحيب الصوتي', on: 'نعم', off: 'لا', age: 'العمر', child: 'أقل من ١٨', adult: '١٨ فأكثر' },
  en: { theme: 'Theme', dark: 'Dark', light: 'Light', digits: 'Digits', voice: 'Spoken welcome', on: 'On', off: 'Off', age: 'Age', child: 'Under 18', adult: '18 or over' },
};
function openWelcome() {
  const I = INTEREST[state.lang], w = $('#welcome'), chosen = new Set(interests());
  $('#wLamp').innerHTML = lampSVG({ size: 92, title: 'Mishkat' });
  $('#wOptions').innerHTML = INTERESTS.map(k => `<button type="button" class="wtile" data-k="${k}" aria-pressed="${chosen.has(k)}">
    <span class="wi">${icon(k)}</span><b>${esc(I[k].title)}</b><small>${esc(I[k].desc)}</small><span class="wcheck" aria-hidden="true"></span></button>`).join('');
  const count = () => { const n = w.querySelectorAll('.wtile[aria-pressed=true]').length; $('#wCount').textContent = n ? `(${n})` : ''; };
  w.querySelectorAll('.wtile').forEach(b => b.onclick = () => { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); count(); });
  count();
  // T061: the first preferences, here at the first visit (all of them stay in Settings): theme, digits, spoken welcome
  const P0 = WPREF[state.lang] || WPREF.ar, dark = document.documentElement.dataset.theme !== 'light';
  let dg = 'arab'; try { dg = JSON.parse(localStorage.getItem('mishkat.digits') || '"arab"'); } catch (e) { /* default */ }
  const seg = (k, opts) => `<span class="seg" role="group" aria-label="${esc(P0[k])}">${opts.map(([v, label, on]) => `<button type="button" data-wp="${k}" data-v="${v}" aria-pressed="${on}">${esc(label)}</button>`).join('')}</span>`;
  $('#wPrefs').innerHTML = `<span class="wp"><span>${esc(P0.theme)}</span>${seg('theme', [['dark', P0.dark, dark], ['light', P0.light, !dark]])}</span>` +
    (state.lang === 'ar' ? `<span class="wp"><span>${esc(P0.digits)}</span>${seg('digits', [['arab', '١٢٣', dg === 'arab'], ['latn', '123', dg !== 'arab']])}</span>` : '') +
    `<span class="wp"><span>${esc(P0.voice)}</span>${seg('voice', [['1', P0.on, state.prefs.welcomeVoice !== false], ['0', P0.off, state.prefs.welcomeVoice === false]])}</span>` +
    `<span class="wp"><span>${esc(P0.age)}</span>${seg('age', [['child', P0.child, state.prefs.age === 'child'], ['adult', P0.adult, state.prefs.age === 'adult']])}</span>`;
  $('#wPrefs').querySelectorAll('[data-wp]').forEach(b => b.onclick = () => {
    const k = b.dataset.wp, v = b.dataset.v;
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    if (k === 'theme') setTheme(v);
    if (k === 'digits') { try { localStorage.setItem('mishkat.digits', JSON.stringify(v)); } catch (e) { /* private mode */ } }
    if (k === 'voice') { state.prefs.welcomeVoice = v === '1'; savePrefs(state.prefs); }
    if (k === 'age') { state.prefs.age = v; savePrefs(state.prefs); applyChild(); }
  });
  w.hidden = false;
  $('#wGo').onclick = () => {
    const ks = [...w.querySelectorAll('.wtile[aria-pressed=true]')].map(b => b.dataset.k);
    store.set('interests', JSON.stringify(ks));
    closeWelcome(); renderSide();
  };
  $('#wClose').onclick = () => { closeWelcome(); renderSide(); };
  w.onkeydown = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); closeWelcome(); renderSide(); } };
  setTimeout(() => { const first = w.querySelector('.wtile'); if (first) first.focus(); }, 50);
}
function closeWelcome() { $('#welcome').hidden = true; store.set('welcomed', '1'); remindEngagement(); }

// ------------------------------------------------------------ T098 first visit: place → presentation film → welcome
async function onboarding() {
  const P = state.prefs;
  if (!P.intro) {
    if (state.practical && !state.practical.place()) await placeStep();
    const q = await runIntro();
    P.intro = true; savePrefs(P);
    if (q) { $('#q').value = q; run(q); return; }     // the visitor asked a question at the end of the film
  }
  if (store.get('welcomed') !== '1') openWelcome(); else remindEngagement();
}
function placeStep() {
  return new Promise(resolve => {
    const x = XS(), d = document.createElement('div');
    d.id = 'placeStep'; d.className = 'onb'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'psT');
    d.innerHTML = `<div class="wbox"><header class="w-head"><div class="ob-lamp">${lampSVG({ size: 72, title: 'Mishkat' })}</div><div><h2 id="psT">${esc(x.placeTitle)}</h2><p>${esc(x.placeLead)}</p></div></header>
      <div class="ob-pick"></div><div class="wfoot"><button type="button" class="btn ghost" data-later>${esc(x.placeLater)}</button></div></div>`;
    document.body.appendChild(d);
    const end = () => { d.remove(); resolve(); };
    d.querySelector('[data-later]').onclick = end;
    d.onkeydown = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); end(); } };
    state.practical.pickPlace(d.querySelector('.ob-pick'), () => {
      d.querySelector('.ob-pick').innerHTML = `<p class="k-ok">${esc(x.placeOk(state.practical.placeName()))}</p>`;
      setTimeout(end, 900);
    });
    setTimeout(() => { const f = d.querySelector('[data-pos]'); if (f) f.focus(); }, 60);
  });
}
async function runIntro() {
  const { playIntro } = await import('./intro.js');
  const before = { ...view };
  return new Promise(resolve => playIntro({
    lang: () => state.lang, core: state.core, galaxy: state.galaxy, audioBase: AUDIO_BASE, timing: suraFile('timing', 24), timingBasmala: suraFile('timing', 1),
    placeName: () => (state.practical ? state.practical.placeName() : ''),
    setView: (sh, od) => setView(sh, od, { quiet: true }),
    // (6 Oct) the shapes of the film are computed while the verse is recited, so that each one comes on its word
    prepare: (sh, od) => ensureLayout(sh, od).catch(() => {}),
    qibla: () => { const pl = state.practical && state.practical.place(); return pl ? qiblaBearing(pl.lat, pl.lon) : null; },
    // English: the reader's own translation (QuranEnc) under the verses of the film
    translation: (i) => state.lang === 'en' && TRANSLATION_FOR.en ? loadSource(TRANSLATION_FOR.en).then(() => state.engine.translation('en', i)) : '',
    // T102: the last screen of the film offers example questions — the chosen one starts a real search
    onDone: (q) => { setView(before.shape, before.order, { quiet: true }); resolve(q || ''); },
  }));
}

// ------------------------------------------------------------ T092 child mode, T095–T096 progress in the page
function applyChild() { document.body.classList.toggle('child', state.prefs.age === 'child'); }
// the logo gains light with this month's worship (js/glow.js); its tooltip says how much
function refreshGlow() {
  if (!state.core) return;
  const g = glowLevel(state.prefs, monthPct);
  paintGlow(g.total);
  const pct = Math.round(100 * g.total), label = state.lang === 'en' ? `Light of the month: ${pct} %` : `نور الشهر: ${dig(pct)}٪`;
  const brand = $('#top .brand'); if (brand) brand.title = label;
  const slot = $('#lampSlot'); if (slot) slot.dataset.glow = label;
}
function refreshHud() {
  refreshGlow();
  const box = $('#hud');
  if (!box || !state.core) return;
  const P = state.prefs, x = XS();
  if (rollMonth(P)) savePrefs(P);
  const m = monthPct(P), w = weekly(P);
  const wk = x.hudWeek(dig(w.read), dig(w.readGoal), dig(w.ayas), dig(w.tkGoal));
  box.innerHTML = `<button type="button" class="hud-in" title="${esc(wk + ' — ' + x.hudOpen)}" aria-label="${esc(wk + ' — ' + x.hudOpen)}">
      <span class="hud-m"><span><b>${esc(pctTxt(m.read))}</b><small>${esc(x.hudRead)}</small></span><span class="hz"><b>${esc(pctTxt(m.hifz))}</b><small>${esc(x.hudHifz)}</small></span></span>
      <span class="hud-w"><i style="--f:${w.readF.toFixed(3)}"></i><i class="tk" style="--f:${w.tkF.toFixed(3)}"></i></span></button>`;
  box.hidden = false;
  box.querySelector('button').onclick = () => openEngage();
  const k = $('#khCount');
  if (k) { const n = P.khatmas || 0; k.hidden = !n; k.textContent = `✦ ${x.khCount(dig(n))}`; k.title = x.khTitle; }
}
function celebrateKhatma() {
  const x = XS(), n = state.prefs.khatmas || 1;
  const d = document.createElement('dialog');
  d.className = 'kh-done'; d.dir = T().dir;
  d.innerHTML = `<div class="kh-lamp">${lampSVG({ size: 120, title: 'Mishkat' })}</div><h3>${esc(x.khatmaDone(dig(n)))}</h3><form method="dialog"><button class="btn gold">${esc(T().close)}</button></form>`;
  document.body.appendChild(d); d.addEventListener('close', () => d.remove()); d.showModal();
  refreshHud(); refreshMiniLamp();
}
async function openEngage() {
  const { openEngageMap } = await import('./engage3d.js');
  const P = state.prefs;
  openEngageMap({ lang: state.lang, digits: dig, info: { eng: engagement(P), score: rewardScore(P).score, month: monthPct(P), khatmas: P.khatmas || 0, week: weekly(P) } });
}
// once a day, a small reminder of the visitor's level (always positive), with a tiny 3D-like picture
function remindEngagement() {
  const P = state.prefs, today = ymd(new Date());
  if (P.remindDay === today || !$('#gate').hidden || document.getElementById('intro')) return;
  P.remindDay = today; savePrefs(P);
  const eng = engagement(P), E = EG[state.lang] || EG.ar;
  const name = (state.lang === 'ar' ? ['غَرْسة مباركة', 'زيتونة مباركة', 'كوكب دُرّي'] : ['Blessed sapling', 'Blessed olive tree', 'Shining star'])[eng.level - 1];
  const el = document.createElement('div');
  el.id = 'engToast'; el.setAttribute('role', 'status');
  el.innerHTML = `<canvas width="56" height="56" aria-hidden="true"></canvas><div><b>${esc(E.remind(name))}</b><button type="button" class="mini gold">${esc(E.open)}</button></div><button type="button" class="icon et-x" aria-label="${esc(T().close)}">✕</button>`;
  document.body.appendChild(el);
  const stop = animateMini(el.querySelector('canvas'), () => eng);
  const close = () => { stop(); el.classList.add('leaving'); setTimeout(() => el.remove(), 400); };
  el.querySelector('.mini').onclick = () => { close(); openEngage(); };
  el.querySelector('.et-x').onclick = close;
  setTimeout(close, 10000);
}
// the top bar: the khatma count, the engagement button (a tiny 3D picture of the level), the install button
function setupHeaderExtras() {
  const x = XS(), eb = $('#engBtn');
  if (eb) {
    eb.title = x.engBtn; eb.setAttribute('aria-label', x.engBtn); eb.onclick = () => openEngage();
    const draw = () => drawMini(eb.querySelector('canvas'), engagement(state.prefs), 0);
    draw(); state.drawEngBtn = draw;
  }
  const ib = $('#btnInstall');
  if (ib) {
    const show = () => { ib.hidden = isStandalone() || !(canPrompt() || /iPhone|iPad|iPod/.test(navigator.userAgent)); };
    ib.onclick = () => openInstall(state.lang).then(show);
    onInstallChange(show); show();
  }
  const kc = $('#khCount'); if (kc) kc.onclick = () => openKhatmaMap();
}

// home of the answers zone: the verse of the lamp, a short guide, suggestions
function renderHome() {
  const box = $('#viewHome'), I = INTEREST[state.lang], t = T(), chosen = interests(), L = state.lang;
  if (!state.core || !box) return;
  // a quiet bar of suggestions: what to ask, or the visitor's chosen interests
  let h = `<div class="home">`;
  if (!chosen.length) {
    h += `<div class="fy-chips h-chips">${t.chips.map(c => `<button type="button" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <p class="h-pers"><button type="button" class="fy-edit">${esc(I.personalise)}</button></p>`;
  } else {
    const name = (n) => L === 'ar' ? state.core.suras[n - 1].ar : state.core.suras[n - 1].tr;
    const chip = (attrs, label, ar) => `<button type="button" ${attrs}${ar ? ' class="ar"' : ''}>${esc(label)}</button>`;
    const picker = (act, btn) => `<div class="fy-pick"><select data-pick aria-label="${esc(WELCOME[L].sura)}">${suraOptions()}</select><input type="number" min="1" max="7" value="1" aria-label="${esc(WELCOME[L].aya)}"><button type="button" class="btn gold sm" data-pickgo="${act}">${esc(btn)}</button></div>`;
    const group = (k) => {
      let body = '';
      if (I[k].q) body = I[k].q.map(q => chip(`data-q="${esc(q)}"`, q, L === 'ar')).join('');
      if (k === 'tafsir') body = PICKS.tafsir.map(([s0, a], j) => chip(`data-s="${s0}" data-a="${a}" data-act="tafsir"`, I.tafsir.labels[j], L === 'ar')).join('');
      if (k === 'recite' || k === 'suras' || k === 'memorize') {
        const act = { recite: 'listen', suras: 'read', memorize: 'learn' }[k];
        body = PICKS[k].map(n => chip(`data-s="${n}" data-act="${act}"`, (k === 'recite' ? '▶ ' : k === 'memorize' ? '↻ ' : '') + name(n), L === 'ar')).join('');
      }
      if (k === 'verify') body = VERIFY_EX.map(v => chip(`data-v="${esc(v)}"`, `«${v}»`, true)).join('');
      let extra = '';
      if (k === 'tafsir') extra = picker('tafsir', I.show);
      if (k === 'suras') extra = picker('read', I.go);
      if (k === 'verify') extra = `<form class="fy-pick" data-verify><input type="text" dir="auto" placeholder="${esc(I.checkPh)}"><button class="btn gold sm">${esc(I.check)}</button></form>`;
      return `<section class="fy-g"><div class="fy-t">${icon(k)}<span>${esc(I[k].title)}</span>${I[k].note ? `<small class="fy-note">${esc(I[k].note)}</small>` : ''}</div>
        <div class="fy-chips">${body}</div>${extra}</section>`;
    };
    h += `<div class="fy-head"><b>${esc(I.forYou)}</b><button type="button" class="fy-edit">${esc(I.edit)}</button></div>` + chosen.map(group).join('');
  }
  box.innerHTML = h + `</div>`;
  box.querySelectorAll('.fy-edit').forEach(b => b.onclick = openWelcome);
  box.querySelectorAll('.fy-chips button').forEach(b => b.onclick = () => doPick(b.dataset));
  box.querySelectorAll('select[data-pick]').forEach(sel => sel.onchange = () => {
    const inp = sel.parentElement.querySelector('input[type=number]');
    inp.max = state.core.suras[+sel.value - 1].ayas; if (+inp.value > +inp.max) inp.value = 1;
  });
  box.querySelectorAll('[data-pickgo]').forEach(b => b.onclick = () => {
    const f = b.parentElement, s0 = +f.querySelector('select').value, S = state.core.suras[s0 - 1];
    doPick({ s: s0, a: Math.min(Math.max(1, +f.querySelector('input').value || 1), S.ayas), act: b.dataset.pickgo });
  });
  box.querySelectorAll('form[data-verify]').forEach(f => f.onsubmit = (ev) => {
    ev.preventDefault(); const v = f.querySelector('input').value.trim(); if (v) doPick({ v }); else f.querySelector('input').focus();
  });
}
function doPick(d) {
  if (d.q) { $('#q').value = d.q; run(d.q); return; }
  if (d.v) { const q = `${WELCOME[state.lang].verifyPrefix} ${d.v}`; $('#q').value = q; run(q); return; }
  const S = state.core.suras[+d.s - 1], i = S.first + (+d.a || 1) - 1;
  if (d.act === 'tafsir') state.taf.book = state.lang === 'ar' ? 'muyassar_ar' : 'mukhtasar_en';
  if (d.act === 'learn') { state.repeat = 3; state.repeatLeft = 3; }
  goVerse(i, { play: d.act === 'listen' || d.act === 'learn' ? 'all' : false, pane: d.act === 'tafsir' ? 't' : 'r' });
  if (d.act === 'learn') { const r = $('#rRep'); if (r) r.value = '3'; }
}

boot().catch(err => { $('#loadMsg').textContent = 'Error: ' + err.message; console.error(err); });

// ------------------------------------------------------------ feedback (6 Oct, T118)
// «هل أفادك هذا الجواب؟» under every answer: useful / not useful / report an error (with a short note). Sent only when
// pressed: the question, the route, the references shown and the verdict — no identifier (functions/_lib/feedback.js).
const FB = {
  ar: { ask: 'هل أفادك هذا الجواب؟', up: 'نعم، أفادني', down: 'لم يُفدني', report: 'أبلغ عن خطأ', notePh: 'ما الخطأ؟ (آية في غير موضعها، نص غير مطابق، جواب خارج السؤال…)', send: 'أرسل', thanks: 'جزاك الله خيرًا — وصل تقييمك وسيراجعه صاحب المشروع.', thanksLocal: 'شكرًا لك.', fail: 'تعذّر الإرسال الآن؛ حاول لاحقًا.', privacy: 'يُرسل السؤال ومراجع الجواب وتقييمك فقط، دون أي معرّف شخصي.' },
  en: { ask: 'Was this answer useful?', up: 'Yes, useful', down: 'Not useful', report: 'Report an error', notePh: 'What is wrong? (verse out of place, text not matching, answer off the question…)', send: 'Send', thanks: 'Thank you — your feedback was received and will be reviewed by the author.', thanksLocal: 'Thank you.', fail: 'Could not send now; please try later.', privacy: 'Only the question, the references of the answer and your verdict are sent — no personal identifier.' },
};
function feedbackBar() {
  const f = FB[state.lang] || FB.ar;
  return `<section class="fb" id="fbBox" aria-label="${esc(f.ask)}"><span class="fb-q">${esc(f.ask)}</span>
    <button type="button" class="mini fb-b" data-fb="up">👍 ${esc(f.up)}</button><button type="button" class="mini fb-b" data-fb="down">👎 ${esc(f.down)}</button><button type="button" class="mini fb-b fb-rep" data-fb="report">⚑ ${esc(f.report)}</button>
    <form class="fb-note" hidden><textarea maxlength="500" rows="2" placeholder="${esc(f.notePh)}" aria-label="${esc(f.notePh)}"></textarea><button type="submit" class="mini gold">${esc(f.send)}</button></form>
    <p class="fb-msg note" aria-live="polite"></p><p class="fb-priv">${esc(f.privacy)}</p></section>`;
}
function wireFeedback(v, res) {
  const box = v.querySelector('#fbBox'); if (!box) return;
  const f = FB[state.lang] || FB.ar, form = box.querySelector('.fb-note'), msg = box.querySelector('.fb-msg');
  const refs = () => [...new Set([...v.querySelectorAll('[data-idx]')].map(el => { const i = +el.dataset.idx; return state.engine ? `${state.engine.suraOf[i]}:${state.engine.ayaOf[i]}` : ''; }).filter(Boolean))].slice(0, 20);
  let vote = null;
  const send = async (note = '') => {
    box.querySelectorAll('.fb-b').forEach(b => { b.disabled = true; b.classList.toggle('on', b.dataset.fb === vote); });
    form.hidden = true;
    try {
      const r = await fetch('api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: res.query, lang: res.lang || state.lang, vote, route: res.type || '', refs: refs(), note, model: state.llmModel || '' }) });
      const j = r.ok ? await r.json() : null;
      msg.textContent = j && j.ok ? (j.stored ? f.thanks : f.thanksLocal) : f.fail;
    } catch (e) { msg.textContent = f.fail; }
  };
  box.querySelectorAll('.fb-b').forEach(b => b.onclick = () => {
    vote = b.dataset.fb;
    if (vote === 'up') return send();
    form.hidden = false; form.querySelector('textarea').focus();
  });
  form.onsubmit = (ev) => { ev.preventDefault(); send(form.querySelector('textarea').value); };
}
