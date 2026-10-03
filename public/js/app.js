import { createEngine, detectLang, guardCheck, SOURCES_NEEDED, TAFSIR_FOR, TRANSLATION_FOR, PARAGRAPH_FOR, normAr, tokens } from './engine.js';
import { routeTool } from './tools.js';
import { wordFacts } from './dwell.js';
import { UI, ABOUT, WELCOME, INTEREST } from './i18n.js';
import { SHAPES, ORDERS, buildLayout } from './layouts.js';
import { isBasmala } from './basmala.js';
import { lampSVG, setLampWord } from './lamp.js';
import { listen, stopListening, cancelListening, voiceSupported } from './voice.js';
import { createSpeaker } from './speech.js';
import { PALETTE } from './galaxy.js';
import { createPanels } from './panels.js';
import { createToolPanels, S as TOOL_S } from './toolpanels.js';
import { loadPrefs, savePrefs } from './prefs.js';
import { decodeRead, encodeRead, markRead, isRead, surasRead, ymd } from './khatma.js';

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
};

// ------------------------------------------------------------------ i18n
function pickLang() {
  const url = new URL(location.href).searchParams.get('lang');
  const nav = (navigator.language || 'ar').slice(0, 2);
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
  fillViewPickers();
  $('#legendBox').innerHTML = t.legendItems.map(([c, x]) => `<div><i style="background:${c};color:${c}"></i>${esc(x)}</div>`).join('');
  $('#aboutBody').innerHTML = ABOUT[lang].replace(/\{\{V24_35\}\}/g, esc(heroSlice()));
  $('#aiBadge').textContent = t.ai(state.llmModel);
  labelDock();
  if (state.panels) state.panels.refresh();
  if (!$('#welcome').hidden && state.core) openWelcome();
  if (state.engine) {
    renderSide();
    ensureSources(lang).then(() => {
      renderSide();
      if (state.reader.sura) { renderReader(); state.taf.idx = null; selectVerse(state.reader.cur, { fly: false, scroll: true, keepAudio: true }); }
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
    const w = new Worker(new URL('./search-worker.js', import.meta.url), { type: 'module' });
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

function setLoad(i) { $('#loadMsg').textContent = T().loading[i]; }

async function boot() {
  applyLang(pickLang());
  setLoad(0);
  const [core, searchAr] = await Promise.all([getJSON('data/core.json'), getJSON('data/search_ar.json')]);
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
  state.wordsP = getJSON('data/words.json').then(w => { state.words = w; return w; });
  setupTools();
  setupLongPress();
  setLoad(3);
  $('#loader').classList.add('done');
  // the tafsir files (several MB) are not needed to show the galaxy: they load after the
  // first paint, only for the interface language; a search waits for them if needed and
  // another language loads only when chosen
  (window.requestIdleCallback || setTimeout)(() => { workerCall({ op: 'warm', lang: state.lang }).catch(() => {}); ensureSources(state.lang).then(() => {
    if (state.reader.sura) { renderReader(); state.taf.idx = null; selectVerse(state.reader.cur, { fly: false, scroll: false, keepAudio: true }); }
  }); });
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
  { const sh = store.get('shape', 'galaxy'), od = store.get('order', 'mushaf'); if (sh !== 'galaxy' || od !== 'mushaf') setView(sh, od, { quiet: true }); }
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
  } else if (!sp.get('q') && store.get('welcomed') !== '1') openWelcome();
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
    const accept = () => {
      store.set('bismillah', '1');
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
  let lang = voiceLang();
  const markLang = () => box.querySelectorAll('[data-vl]').forEach(x => x.setAttribute('aria-pressed', x.dataset.vl === lang));
  box.querySelectorAll('[data-vl]').forEach(x => x.onclick = () => { lang = x.dataset.vl; markLang(); store.set('voiceLang', lang); });
  markLang();
  const ui = (st, msg) => {
    box.dataset.st = st;
    $('#vTitle').textContent = st === 'rec' ? t.vTitle : st === 'proc' ? t.vProc : st === 'done' ? t.vHeard : st === 'err' ? msg : t.vTitle;
    $('#vHint').textContent = st === 'rec' ? t.vHint : '';
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
        lang: () => lang, serverStt: state.stt,
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
  const search = () => { const q = $('#vText').value.trim(); if (!q) return; box.hidden = true; $('#q').value = q; run(q); };
  $('#vMain').onclick = () => { const st = box.dataset.st; if (st === 'rec') stopListening(); else if (st === 'done') search(); else start(); };
  $('#vAlt').onclick = () => { if (box.dataset.st === 'done') start(); else close(); };
  $('#vText').onkeydown = (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); search(); } };
  box.onkeydown = (ev) => { if (ev.key === 'Escape') close(); };
  box.onclick = (ev) => { if (ev.target === box) close(); };
  box.hidden = false;
  start();
}

// ------------------------------------------------------------ search
async function run(query, mode = 'auto') {
  const t = T();
  // a practical request («متى رمضان», «خطة لختم القرآن في شهر», "hijri date") opens its tool, never the AI;
  // the guard runs first, so «ما حكم صيام يوم عرفة» stays a question (js/tools.js)
  const tool = mode === 'auto' && state.panels ? routeTool(query, { available: state.toolIds, guard: guardCheck }) : null;
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
function applyHighlight() {
  if (!state.galaxy) return;
  const green = greenVerses();
  if (green) state.galaxy.highlightVerses(green, () => 2);           // PALETTE[1], green
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
  const dir = res.lang === 'ar' ? 'rtl' : 'ltr';
  let h = `<p class="qline" dir="auto">«${esc(res.query)}»</p>` + levelBadge(res) + badgeFor(res);
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
    h += `<section class="brief" id="briefBox" dir="${dir}"><h3 class="sec">${esc(isRulingRes(res) ? t.ragFatwaTitle : t.briefTitle)}</h3>`;
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
  if (res.alt && res.alt.mode === 'topic') h += `<p><button class="btn alt" id="altBtn">${esc(t.asTopic(res.alt.query))}</button></p>`;
  if (res.alt && res.alt.mode === 'sura') h += `<p><button class="btn alt" id="altBtn">${esc(t.asSura(res.alt.name))}</button></p>`;

  // surahs ranked by relevance (topics) / verse list (verification)
  if (res.suras && res.suras.length && (res.type === 'topic' || res.verdict === 'notverse')) {
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
  if (res.type === 'topic' || res.type === 'term') h += `<section class="hbox sbox" id="sunnahBox" aria-live="polite" hidden></section>`;
  if (res.type === 'hadith' || res.hadithCheck) h += `<section class="hbox" id="hadithBox" aria-live="polite"></section>`;
  // fatwa requests: official sources
  if (res.links && res.links.length) {
    h += `<div class="links">${res.links.map(l => `<a class="btn gold" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(t.links[l.id] || l.id)}</a>`).join('')}</div>`;
  }
  // published fatwas of a recognised scholar on the same question (verbatim, linked) — never a ruling by Mishkat
  if (res.reason === 'ruling' && !res.blood && (/[؀-ۿ]/.test(res.query || '') || state.llm)) h += `<section class="hbox fbox" id="fatwaBox" aria-live="polite"></section>`;
  if (res.bayenat && res.bayenat.length) h += `<section class="bay"><h3 class="sec">${esc(t.bayTitle)}</h3><ul>${res.bayenat.map(b => `<li><a href="${esc(b.url)}" target="_blank" rel="noopener" dir="rtl">${esc(b.q)}</a> <small>${esc(b.cat || '')}</small></li>`).join('')}</ul><p class="note">${esc(t.bayNote)}</p></section>`;
  if (res.type !== 'empty') h += `<p class="disclose">${esc(t.disclosure)}</p>`;
  const v = $('#viewRes');
  v.innerHTML = h;
  v.scrollTop = 0;
  v.querySelectorAll('.cite').forEach(el => el.onclick = (ev) => { ev.stopPropagation(); goVerse(+el.dataset.idx, { pane: 'r' }); });
  v.querySelectorAll('[data-sq]').forEach(b => b.onclick = () => { $('#q').value = b.dataset.sq; run(b.dataset.sq); });
  v.querySelectorAll('[data-sq-raw]').forEach(b => b.onclick = () => run(b.dataset.sqRaw, 'raw'));
  v.querySelectorAll('[data-ctx]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); toggleContext(b); });
  v.querySelectorAll('.vcardx').forEach(c => c.onclick = (ev) => { if (ev.target.closest('button,a,.ctxbox')) return; goVerse(+c.dataset.idx, { pane: 'r' }); });
  v.querySelectorAll('[data-playv]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); goVerse(+b.dataset.playv, { play: 'one', pane: 'r' }); });
  v.querySelectorAll('[data-open]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); goVerse(+b.dataset.open, { pane: 'r' }); });
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
  if ((res.type === 'topic' || res.type === 'term') && state.worker) loadSunnah(res).finally(() => loadRag(res));
  if (res.reason === 'ruling' && !res.blood && /[؀-ۿ]/.test(res.query || '')) loadFatwas(res.query);
  else if (res.reason === 'ruling' && !res.blood && state.llm && state.worker) workerCall({ op: 'kw', query: res.query, lang: res.lang }).catch(() => []).then(kw => loadFatwas(res.query, kw || []));
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
}
// «الجواب باختصار» v5 (extractive, evidence-bound, public/js/rag.js): the worker builds a closed list of
// passages from the sources of truth — verse text (Tanzil), tafsir, authentic hadiths, and for a ruling
// question only the fatwas published by Sheikh Ibn Baz —, the server's composer and independent judge return
// passage IDs only, fixed rules check them again, and the passages are shown verbatim with their source.
// A concept of the question with no evidence is said so. If the service fails: the previous short answer.
// a story («قصة يوسف») is answered by its verses in order, not by two sentences
const STORY_Q = /^(قصة|قصه)\s|\bstory of\b/i;
const isRulingRes = (res) => res.type === 'abstain' && res.reason === 'ruling';
function ragWanted(res) {
  if (!(state.llm && state.llm.answer && state.worker)) return false;
  if (res.crisis || res.blood) return false;          // fixed support message / no fatwa extract on blood
  if (isRulingRes(res)) return true;
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
        <footer><small>${esc(f.mufti || '')} — <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.title || f.source || 'binbaz.org.sa')}</a></small></footer></blockquote>`; }).join('')
      + `<p class="note rag-gap">${esc(t.ragFatwaNote)}${res.lang === 'en' ? ' ' + esc(t.ragFatwaArabicOnly) : ''}</p>`;
  } else {
    const srcs = [...new Set(b.points.flatMap(p => p.items.map(x => x.kind === 'tafsir' ? x.sourceTitle : x.kind === 'quran' ? t.ragQuranSrc : t.ragHadithSrc)))].filter(Boolean);
    box.innerHTML = `<ul class="rag-points" dir="${dir}">${b.points.map(p => `<li>${p.shown && b.points.length > 1 ? `<b class="rag-c">«${esc(p.concept)}»</b> ` : ''}${p.items.map(x => ragItem(x, res, t)).join(' ')}</li>`).join('')}</ul>
      ${b.uncovered.length ? `<p class="note rag-gap">${esc(b.uncovered.some(u => u.shown) ? t.ragGap(b.uncovered.filter(u => u.shown).map(u => u.concept)) : t.ragGapPart)}</p>` : ''}
      <p class="note">${esc(t.ragNote(srcs.join(' · ')))}</p>`;
  }
  box.querySelectorAll('button.cite').forEach(el => el.onclick = (ev) => { ev.stopPropagation(); goVerse(+el.dataset.idx, { pane: 'r' }); });
}
// Published fatwas (binbaz.org.sa, official site of Sheikh Ibn Baz): titles chosen among the site's own
// search results (the AI may only filter that closed list), each opened in full on demand, verbatim.
async function loadFatwas(q, kw = []) {
  const box = $('#fatwaBox'), t = T();
  if (!box) return;
  const head = `<h3 class="sec">${esc(t.fatwaTitle)}</h3><p class="note">${esc(t.fatwaNote)}</p>`;
  box.innerHTML = head + `<p class="note">${esc(t.fatwaLoading)}</p>`;
  let j = null;
  try {
    const r = await fetch('api/fatwa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(kw.length ? { q, kw } : { q }) });
    j = r.ok ? await r.json() : null;
  } catch (e) { j = null; }
  if (box !== $('#fatwaBox')) return;
  const more = `https://binbaz.org.sa/search?q=${encodeURIComponent(q)}`;
  if (!j || !j.ok || !j.items.length) { const rb = $('#ragBox'); if (rb) rb.innerHTML = '<p class="note">' + esc(t.ragNoFatwa) + '</p>'; box.innerHTML = head + `<p class="lead">${esc(j && j.ok ? t.fatwaNone : t.fatwaFail)}</p><p><a class="mini" href="${esc(j && j.url || more)}" target="_blank" rel="noopener">${esc(t.fatwaOpen)}</a></p>`; return; }
  box.innerHTML = head + `<ol class="flist">${j.items.map(x => `<li><b dir="rtl">${esc(x.title)}</b>${x.snippet ? `<div class="f-snip" dir="rtl">${esc(x.snippet)}…</div>` : ''}
      <div class="f-act"><button class="mini" data-fatwa="${+x.id}">${esc(t.fatwaRead)}</button> <a class="mini" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(t.fatwaSite)}</a></div><div class="f-full"></div></li>`).join('')}</ol>
    <p><a class="mini" href="${esc(j.url)}" target="_blank" rel="noopener">${esc(t.fatwaOpen)}</a> · <small>${esc(j.source)}${j.by === 'ai' ? ' · ' + esc(t.fatwaByAi) : ''}</small></p>`;
  if (state.result && isRulingRes(state.result) && ragWanted(state.result)) {
    const res0 = state.result;
    Promise.all(j.items.slice(0, 3).map(x => fetch('api/fatwa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: +x.id }) })
      .then(r => r.ok ? r.json() : null).catch(() => null)))
      .then(fs => loadRag(res0, fs.filter(f => f && f.ok).map(f => ({ id: f.id, title: f.title, question: f.question, answer: f.answer, url: f.url, mufti: f.mufti, source: f.source }))));
  }
  box.querySelectorAll('[data-fatwa]').forEach(b => b.onclick = async () => {
    const out = b.closest('li').querySelector('.f-full');
    if (out.dataset.done) { out.hidden = !out.hidden; return; }
    b.disabled = true; out.innerHTML = `<p class="note">${esc(t.fatwaLoading)}</p>`;
    let f = null;
    try { const r = await fetch('api/fatwa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: +b.dataset.fatwa }) }); f = r.ok ? await r.json() : null; } catch (e) { f = null; }
    b.disabled = false;
    if (!f || !f.ok) { out.innerHTML = `<p class="note">${esc(t.fatwaFail)}</p>`; return; }
    out.dataset.done = '1';
    out.innerHTML = `<div class="fatwa-doc" dir="rtl">${f.question ? `<p class="f-q"><small>${esc(t.fatwaQ)}</small> ${esc(f.question)}</p>` : ''}
      <div class="f-a"><small>${esc(t.fatwaA)}</small>${f.answer.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      ${f.audio ? `<audio controls preload="none" src="${esc(f.audio)}"></audio>` : ''}
      <p class="f-src"><small>${esc(f.mufti)} — <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.source)}</a></small></p></div>`;
  });
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
  return `<article class="vcardx${q.role === 'context' ? ' ctx' : ''}" data-idx="${i}"${colorVar(e.suraOf[i])}>
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
function suraCard(g, k) {
  const t = T(), S = state.core.suras[g.sura - 1], e = state.engine, res = state.result;
  const terms = new Set(res.terms || []), qLang = res.lang;
  const refs = g.verses.slice().sort((a, b) => a - b);
  const SHOW = 4;
  const row = (i, n) => {
    const tr = state.lang === 'en' ? e.translation('en', i).replace(/\[\d+\]/g, '') : '';
    const ar = qLang === 'ar' ? markTerms(e.verses[i], 'ar', terms) : esc(e.verses[i]);
    const trH = tr ? (qLang === 'en' ? markTerms(tr, 'en', terms) : esc(tr)) : '';
    return `<li class="sc-v" data-idx="${i}"${n >= SHOW ? ' hidden' : ''}><div class="li-head"><button class="cite" data-idx="${i}">${esc(S.ar)} ${S.n}:${e.ayaOf[i]}</button>
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
  document.body.classList.remove('ans-open', 'ans-peek');
  $('#ansToggle').setAttribute('aria-expanded', m !== 'study');
  $('#suggest').hidden = m !== 'home' || state.suggestClosed;
  $('#sgOpen').hidden = m !== 'home' || !state.suggestClosed;
  $('#szone').hidden = m === 'home' || !state.result;
  $('#mtabs [data-pane=s]').hidden = !state.result;
  if (m === 'study' && !['r', 't', 's'].includes(state.pane)) showPane('r');
  if (m === 'study' && state.pane === 's' && !state.result) showPane('r');
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
function verseWordsHtml(i) {
  const { skip, toks } = verseTokens(i);
  let w = 0, html = '';
  toks.forEach((tok, k) => {
    if (k < skip) return;
    if (HAS_LETTER.test(tok)) { w++; html += `<span class="w" data-w="${w}">${esc(tok)}</span> `; } else html += `${esc(tok)} `;
  });
  return html;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];
function renderReader() {
  const t = T(), e = state.engine, { sura } = state.reader, S = state.core.suras[sura - 1];
  if (!sura) return;
  const en = state.lang === 'en';
  const basmala = (sura !== 1 && sura !== 9) ? `<div class="basmala">${esc(e.verses[S.first].split(' ').slice(0, 4).join(' '))}</div>` : '';
  let body = '';
  for (let a = 1; a <= S.ayas; a++) {
    const i = S.first + a - 1;
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
  const rep = state.repeat || 1;
  const trSrc = TRANSLATION_FOR.en ? e.sources[TRANSLATION_FOR.en] : null;
  $('#viewRead').innerHTML = `<div class="rd-head">
    <div class="rd-row">
      <label class="rd-sura"><span class="sr">${esc(t.suraPick)}</span><select id="rSura" aria-label="${esc(t.suraPick)}">${state.core.suras.map(x => `<option value="${x.n}"${x.n === sura ? ' selected' : ''}>${x.n}. ${esc(en ? x.tr : x.ar)}</option>`).join('')}</select></label>
      <span class="rd-meta">${esc(S.type === 'meccan' ? t.meccan : t.medinan)} · ${esc(t.ayas(S.ayas))}</span>
      <label class="rd-aya">${esc(t.ayaN)} <select id="rSel">${Array.from({ length: S.ayas }, (_, k) => `<option value="${S.first + k}">${k + 1}</option>`).join('')}</select></label>
      <button class="mini" id="rInfo" aria-expanded="false">ℹ ${esc(t.aboutSura)}</button>
      <button class="icon" id="rClose" title="${esc(t.closeReader)}" aria-label="${esc(t.closeReader)}">✕</button>
    </div>
    <div class="rd-ctrl" role="toolbar" aria-label="${esc(t.listen)}">
      <button class="btn icon-b" id="rFirst" title="${esc(t.firstA)}" aria-label="${esc(t.firstA)}">⏮</button>
      <button class="btn icon-b" id="rPrev" aria-label="${esc(t.prevA)}" title="${esc(t.prevA)}">${state.lang === 'ar' ? '›' : '‹'}</button>
      <button class="btn play" id="rPlayOne" title="${esc(t.playOneT)}">${esc(t.play)} ${esc(t.playOne)}</button>
      <button class="btn play" id="rPlayAll" title="${esc(t.playAllT)}">⏵⏵ ${esc(t.playAll)}</button>
      <button class="btn icon-b" id="rNext" aria-label="${esc(t.nextA)}" title="${esc(t.nextA)}">${state.lang === 'ar' ? '‹' : '›'}</button>
      <label class="btn rep" title="${esc(t.repeatTitle)}">${esc(t.repeat)} <select id="rRep" aria-label="${esc(t.repeatTitle)}">${[1, 3, 5, 10, 0].map(n => `<option value="${n}"${(rep === n || (rep === Infinity && n === 0)) ? ' selected' : ''}>${n ? '×' + n : '∞'}</option>`).join('')}</select></label>
      <label class="btn rep" title="${esc(t.speed)}">${esc(t.speed)} <select id="rSpeed" aria-label="${esc(t.speed)}">${SPEEDS.map(x => `<option value="${x}"${x === state.speed ? ' selected' : ''}>×${x}</option>`).join('')}</select></label>
      <span class="grp"><button class="btn icon-b sm" id="rFm" aria-label="${esc(t.fontSmaller)}" title="${esc(t.fontSmaller)}">A−</button><button class="btn icon-b sm" id="rFp" aria-label="${esc(t.fontLarger)}" title="${esc(t.fontLarger)}">A+</button></span>
      ${en ? `<button class="btn ${state.showTranslit ? 'on' : ''}" id="rTl" aria-pressed="${state.showTranslit}">${esc(t.translit)}</button><button class="btn ${state.showTr ? 'on' : ''}" id="rTr" aria-pressed="${state.showTr}">${esc(t.translationBtn)}</button>` : ''}
      <button class="btn icon-b" id="rCopy" title="${esc(t.copyVerse)}" aria-label="${esc(t.copyVerse)}">⧉</button>
      <button class="btn icon-b" id="rShare" title="${esc(t.shareVerse)}" aria-label="${esc(t.shareVerse)}">🔗</button>
    </div></div>
    <div class="rd-body" id="rdBody">
      <section class="sinfo" id="sInfo" hidden></section>
      <div class="mushaf${en ? ' en' : ''}" id="mushaf">${basmala}${body}</div>
      ${en && state.showTr && trSrc ? `<p class="rd-src">${esc(trSrc.title)} · QuranEnc.com</p>` : ''}
    </div>`;
  $('#rzone').style.setProperty('--qs', state.qs);
  $('#rPrev').onclick = () => step(-1);
  $('#rNext').onclick = () => step(1);
  $('#rPlayOne').onclick = () => togglePlay('one');
  $('#rPlayAll').onclick = () => togglePlay('all');
  $('#rFirst').onclick = () => { const was = state.playing; selectVerse(S.first, { scroll: true, keepAudio: true }); if (was) play(S.first, true); };
  $('#rClose').onclick = closeReader;
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
  $('#rInfo').onclick = () => { const p = $('#sInfo'), open = p.hidden; p.hidden = !open; $('#rInfo').setAttribute('aria-expanded', open); if (open) fillSuraInfo(p, sura); };
  $('#mushaf').querySelectorAll('.v').forEach(el => el.onclick = () => selectVerse(+el.dataset.i, { scroll: false }));
  markHits();
  if (en && state.showTranslit) fillTranslit(sura);
}
// ▶ this verse only · ⏵⏵ from this verse onwards (continuous); pressing the playing one pauses
function togglePlay(mode) {
  if (state.playing && state.playMode === mode) { stopAudio(true); return; }
  state.playMode = mode;
  play(state.reader.cur, true);
}
function playButtons() {
  const t = T(), one = $('#rPlayOne'), all = $('#rPlayAll');
  if (!one) return;
  const p1 = state.playing && state.playMode === 'one', p2 = state.playing && state.playMode === 'all';
  one.textContent = `${p1 ? t.pause : t.play} ${t.playOne}`; one.classList.toggle('on', p1); one.setAttribute('aria-pressed', p1);
  all.textContent = `${p2 ? t.pause : '⏵⏵'} ${t.playAll}`; all.classList.toggle('on', p2); all.setAttribute('aria-pressed', p2);
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
  document.querySelectorAll('#mushaf .v').forEach(el => el.classList.toggle('cur', +el.dataset.i === i));
  const sel = $('#rSel'); if (sel) sel.value = i;
  const el = $(`#mushaf .v[data-i="${i}"]`), b = $('#rdBody');
  if (el && b && scroll) b.scrollTo({ top: Math.max(0, el.offsetTop - b.clientHeight * 0.3), behavior: changed ? 'smooth' : 'auto' });
  state.galaxy.setFocusVerse(i);
  if (fly) state.galaxy.flyToVerse(i, 70);
  if (!state.playing) $('#lampRef').textContent = refLabel(i);
  const url = new URL(location.href); url.searchParams.set('s', e.suraOf[i]); url.searchParams.set('a', e.ayaOf[i]); history.replaceState(null, '', url);
  if (changed || state.taf.idx !== i) renderTafsir(i);
  markCurrentInResults();
  if (wasPlaying) play(i, true);
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
  state.taf.idx = i; state.taf.text = ''; state.taf.lang = BOOKS[book].lang;
  const prev = lang === 'ar' ? '›' : '‹', next = lang === 'ar' ? '‹' : '›';
  $('#viewTaf').innerHTML = `<div class="zhead tz-head"><h2>${esc(t.zTafsir)}</h2><span class="tz-ref">${esc(refLabel(i))}</span>
      <span class="tz-nav"><button class="icon" id="tPrev" aria-label="${esc(t.prevA)}" title="${esc(t.prevA)}">${prev}</button><button class="icon" id="tNext" aria-label="${esc(t.nextA)}" title="${esc(t.nextA)}">${next}</button></span></div>
    <div class="tz-books" role="tablist" aria-label="${esc(t.zTafsir)}">${books.map(id => `<button role="tab" data-book="${id}" aria-selected="${id === book}"${BOOKS[id].kind === 'live' ? ' class="live"' : ''}>${esc(t.srcNames[id] || id)}</button>`).join('')}</div>
    <div class="tz-tools">
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
  $('#viewTaf .tz-head').onclick = () => { if (document.body.classList.contains('ans-open')) openAnswers(false); };
  $('#viewTaf').querySelectorAll('[data-book]').forEach(b => b.onclick = () => { state.taf.book = b.dataset.book; store.set('book', b.dataset.book); renderTafsir(i); });
  const tfont = (d) => { state.ts = Math.round(Math.min(1.8, Math.max(0.7, state.ts + d)) * 10) / 10; store.set('ts', state.ts); $('#tzone').style.setProperty('--ts', state.ts); };
  $('#tFm').onclick = () => tfont(-0.1);
  $('#tFp').onclick = () => tfont(0.1);
  $('#tTts').onclick = () => { if ($('#tTts').getAttribute('aria-pressed') === 'true') { speaker.stop(); ttsState('idle'); } else if (state.taf.text) { stopAudio(true); speaker.speak(state.taf.text, state.taf.lang); } };
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
    stopAudio(true);
    markRecited(i);
    if (state.repeatLeft > 1) { state.repeatLeft--; play(i); return; }       // تكرار
    state.repeatLeft = state.repeat || 1;
    if (state.continuous && i + 1 < S.first + S.ayas) { selectVerse(i + 1, { scroll: true, fly: false, keepAudio: true }); play(i + 1); }
  };
  au.play().catch(() => { stopAudio(true); alertNote(T().audioError); });
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
  showTip(p);
  armDwell(p);
}
function showTip(p) {
  const tt = $('#tooltip');
  if (!p || !state.words) { tt.style.display = 'none'; return; }
  const e = state.engine;
  tt.innerHTML = `<div class="w">${esc(state.words[p.word])}</div><div>${esc(T().hoverAya(suraName(e.suraOf[p.verse]), e.ayaOf[p.verse]))}</div>`;
  tt.style.display = 'block';
  tt.style.left = Math.min(innerWidth - 270, p.x + 14) + 'px';
  tt.style.top = Math.min(innerHeight - 90, p.y + 14) + 'px';
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
const DOCK = ['khatma', 'hijri', 'links', 'settings'];
const DOCK_ICON = {
  khatma: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z',
  hijri: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  links: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
};
const TS = () => TOOL_S[state.lang] || TOOL_S.ar;
const isPhone = () => matchMedia('(max-width: 860px)').matches;
let metaP = null;
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
    onReadChange: () => applyHighlight(),
    // hadiths of the remarkable days, by HadeethEnc id, verbatim from the local files (search worker)
    hadiths: (ids, lang) => workerCall({ op: 'hadiths', ids, lang }),
    status: alertNote,
  });
  const renderers = {
    khatma: (body, args) => state.tools.khatma(body, args),
    hijri: (body, args) => state.tools.hijri(body, args),
    links: (body) => state.tools.links(body),
    settings: (body) => state.tools.settings(body),
  };
  const ids = state.toolIds = DOCK.filter(id => renderers[id]);     // also what the search bar may open (T032)
  $('#dock').innerHTML = ids.map(id => `<button type="button" data-panel="${id}" aria-expanded="false"><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path d="${DOCK_ICON[id]}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`).join('');
  $('#dock').hidden = !ids.length;
  state.panels = createPanels({
    dock: $('#dock'), tray: $('#tray'), renderers,
    titles: Object.fromEntries(DOCK.map(id => [id, () => TS()[id]])), closeLabel: () => TS().close,
    onOpen: (id) => { document.body.dataset.panel = id; if (id === 'khatma') applyHighlight(); },
    onClose: (id) => { delete document.body.dataset.panel; if (id === 'khatma') applyHighlight(); },
  });
  labelDock();
}
// a verse recited to its end in the reader counts as read (Settings: «count a verse as read…»), in this browser only
function markRecited(i) {
  const P = state.prefs;
  if (!P.autoMark) return;
  const bits = decodeRead(P.read);
  if (isRead(bits, i)) return;
  const before = surasRead(bits, state.core.suras).length;
  markRead(bits, i);
  P.read = encodeRead(bits);
  const day = ymd(new Date());
  P.log = P.log || {}; P.log[day] = (P.log[day] || 0) + 1;
  savePrefs(P);
  if (state.panels.current === 'khatma') {
    const body = $('#p-khatma .p-body'), top = body.scrollTop;
    state.tools.khatma(body).then(() => { body.scrollTop = top; });
  }
  if (surasRead(bits, state.core.suras).length !== before) applyHighlight();   // a surah just turned green
}
function labelDock() {
  $('#dock').setAttribute('aria-label', TS().dock);
  document.querySelectorAll('#dock [data-panel]').forEach(b => { const s = TS()[b.dataset.panel]; b.setAttribute('aria-label', s); b.title = s; });
}

// ------------------------------------------------------------- galaxy toolbar
// Two keys for the 3D view: the SHAPE (galaxy, «قرآن», rose, dome, petals) and the
// ORDER in which the surahs are laid along it (Mushaf, revelation, place, length,
// letters, verses, verse length). Layouts are computed once, then morphed.
const layoutIdx = { 'galaxy|mushaf': 0, 'galaxy|nuzul': 1 };
const layoutNote = {};
const view = { shape: 'galaxy', order: 'mushaf' };
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
  if (!(key in layoutIdx) || !layoutNote[key]) {
    const lay = await buildLayout({ shape, order, wordVerse: state.galaxy.wordVerse, suras: state.core.suras, words: order === 'letters' ? await state.wordsP : null });
    if (!(key in layoutIdx)) layoutIdx[key] = state.galaxy.addLayout(lay.positions, lay.view);
    layoutNote[key] = lay.note;
  }
  if (view.shape !== shape || view.order !== order) return; // another choice was made meanwhile
  // restoring the visitor's view at start must not pull the camera away from a verse or an answer
  state.galaxy.setLayout(layoutIdx[key], !(quiet && state.mode !== 'home'));
  store.set('shape', shape); store.set('order', order);
  const note = $('#viewNote');
  clearTimeout(setView.timer);
  if (!quiet) {
    note.textContent = layoutNote[key][state.lang];
    note.hidden = false;
    setView.timer = setTimeout(() => { note.hidden = true; }, 7000);
  }
}
const cycle = (list, cur, d = 1) => list[(list.findIndex(x => x.id === cur) + d + list.length) % list.length].id;
function setNames(v) { state.galaxy.setNames(v); $('#gNames').setAttribute('aria-pressed', v); store.set('names', v ? '1' : '0'); }
$('#shapeSel').onchange = (ev) => setView(ev.target.value, view.order);
$('#orderSel').onchange = (ev) => setView(view.shape, ev.target.value);
$('#gHome').onclick = () => state.galaxy.home();
$('#gIn').onclick = () => state.galaxy.zoom(0.6);
$('#gOut').onclick = () => state.galaxy.zoom(1.6);
$('#gRot').onclick = () => { const v = !state.galaxy.autoRotate; state.galaxy.setAutoRotate(v); $('#gRot').setAttribute('aria-pressed', v); };
$('#gNames').onclick = () => setNames($('#gNames').getAttribute('aria-pressed') !== 'true');
$('#gLegend').onclick = () => { const b = $('#legendBox'); b.hidden = !b.hidden; $('#gLegend').setAttribute('aria-expanded', !b.hidden); };
$('#gFull').onclick = () => { const on = !document.body.classList.contains('gfull'); document.body.classList.toggle('gfull', on); $('#gFull').setAttribute('aria-pressed', on); };

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
$('#btnMenu').onclick = () => openWelcome();
$('#btnAbout').onclick = () => $('#about').showModal();
$('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
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
  $('#themeBtn').textContent = th === 'light' ? '☀' : '☾';
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

function openWelcome() {
  const I = INTEREST[state.lang], w = $('#welcome'), chosen = new Set(interests());
  $('#wLamp').innerHTML = lampSVG({ size: 92, title: 'Mishkat' });
  $('#wOptions').innerHTML = INTERESTS.map(k => `<button type="button" class="wtile" data-k="${k}" aria-pressed="${chosen.has(k)}">
    <span class="wi">${icon(k)}</span><b>${esc(I[k].title)}</b><small>${esc(I[k].desc)}</small><span class="wcheck" aria-hidden="true"></span></button>`).join('');
  const count = () => { const n = w.querySelectorAll('.wtile[aria-pressed=true]').length; $('#wCount').textContent = n ? `(${n})` : ''; };
  w.querySelectorAll('.wtile').forEach(b => b.onclick = () => { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); count(); });
  count();
  w.hidden = false;
  $('#wGo').onclick = () => {
    const ks = [...w.querySelectorAll('.wtile[aria-pressed=true]')].map(b => b.dataset.k);
    store.set('interests', JSON.stringify(ks));
    closeWelcome(); renderSide();
  };
  $('#wClose').onclick = () => { closeWelcome(); renderSide(); };
  w.onkeydown = (ev) => { if (ev.key === 'Escape') { closeWelcome(); renderSide(); } };
  setTimeout(() => { const first = w.querySelector('.wtile'); if (first) first.focus(); }, 50);
}
function closeWelcome() { $('#welcome').hidden = true; store.set('welcomed', '1'); }

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
