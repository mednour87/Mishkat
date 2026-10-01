import { createEngine, detectLang, SOURCES_NEEDED, TAFSIR_FOR, TRANSLATION_FOR, PARAGRAPH_FOR, normAr, tokens } from './engine.js';
import { UI, ABOUT, WELCOME, INTEREST } from './i18n.js';
import { quranWordLayout } from './letters3d.js';
import { isBasmala } from './basmala.js';
import { lampSVG, setLampWord } from './lamp.js';
import { listen, stopListening, cancelListening, voiceSupported } from './voice.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AUDIO_BASE = 'https://verses.quran.com/';
const REPORT_URL = 'https://github.com/mishkat-quran/mishkat/issues/new';
const arNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const HAS_LETTER = /[ء-يٱ]/;

const state = {
  lang: 'ar', engine: null, galaxy: null, core: null, llm: null, llmModel: null,
  result: null, reader: { sura: null, cur: null, hits: new Set(), srcTab: null },
  audio: null, playing: false, continuous: true, timing: new Map(), saadi: new Map(), translit: new Map(), raf: 0, repeat: 1, repeatLeft: null,
};

// ------------------------------------------------------------------ i18n
function pickLang() {
  const url = new URL(location.href).searchParams.get('lang');
  let saved = null; try { saved = localStorage.getItem('mishkat.lang'); } catch (e) { /* private mode */ }
  const nav = (navigator.language || 'ar').slice(0, 2);
  return [url, saved, nav].find(l => ['ar', 'en', 'fr'].includes(l)) || 'ar';
}
const T = () => UI[state.lang];

function heroSlice() {
  // 24:35, words 5–16 — taken from the Tanzil text, never typed by hand
  if (!state.core) return '';
  const S = state.core.suras[23];
  return state.core.verses[S.first + 34].split(' ').slice(4, 9).join(' ');
}

function applyLang(lang) {
  state.lang = lang;
  const t = UI[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = t.dir;
  try { localStorage.setItem('mishkat.lang', lang); } catch (e) { /* ignore */ }
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t[el.dataset.i18nPh]; });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t[el.dataset.i18nAria]); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t[el.dataset.i18nTitle]; });
  document.querySelectorAll('.langs button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  $('#chips').innerHTML = t.chips.map(c => `<button type="button">${esc(c)}</button>`).join('');
  $('#chips').querySelectorAll('button').forEach(b => b.onclick = () => { $('#q').value = b.textContent; run(b.textContent); });
  const vs = $('#viewSel');
  if (vs && !$("#viewNote").hidden && vs.value.startsWith('q-')) $('#viewNote').textContent = t.viewNote(t['ord_' + vs.value.slice(2)]);
  if (!$('#welcome').hidden && state.core) openWelcome();
  if (state.core) renderHome();
  $('#legendBox').innerHTML = t.legendItems.map(([c, x]) => `<div><i style="background:${c};color:${c}"></i>${esc(x)}</div>`).join('');
  $('#aboutBody').innerHTML = ABOUT[lang].replace(/\{\{V24_35\}\}/g, esc(heroSlice()));
  $('#aiBadge').textContent = t.ai(state.llmModel);
  if (state.core) {
    $('#heroVerse').textContent = `﴿${heroSlice()} …﴾`;
    $('#heroRef').textContent = lang === 'ar' ? 'سورة النور · 35' : 'An-Nur · 24:35';
  }
  if (state.engine) ensureSources(lang).then(() => { if (state.result) renderResults(); if (state.reader.sura) renderReader(false); });
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

function setLoad(i) { $('#loadMsg').textContent = T().loading[i]; }

async function boot() {
  applyLang(pickLang());
  setLoad(0);
  const [core, searchAr] = await Promise.all([getJSON('data/core.json'), getJSON('data/search_ar.json')]);
  state.core = core;
  state.engine = createEngine({ core, searchAr });
  // reference-pack data: Quranpedia subject index, Bayyinat question index (optional)
  state.refReady = Promise.all([
    getJSON('data/qp_topics.json').then(d => state.engine.addTopicIndex(d)).catch(() => {}),
    getJSON('data/bayenat_index.json').then(d => state.engine.addBayenat(d)).catch(() => {}),
  ]);
  applyLang(state.lang);
  const gateDone = gate();
  setLoad(1);
  const { createGalaxy } = await import('./galaxy.js');
  state.galaxy = await createGalaxy($('#galaxy'), {
    binUrl: 'data/galaxy.bin', suras: core.suras,
    onHover: hover, onPick: (p) => openReader(state.engine.suraOf[p.verse], p.verse),
  });
  getJSON('data/words.json').then(w => { state.words = w; });
  setLoad(2);
  await ensureSources(state.lang);
  setLoad(3);
  $('#loader').classList.add('done');
  (window.requestIdleCallback || setTimeout)(() => ['ar', 'en', 'fr'].forEach(l => ensureSources(l)));
  // AI layer: 1) pre-computed answers for frequent questions (verified again by
  // the engine like any live answer), 2) live API, 3) deterministic fallback.
  const [cache, health] = await Promise.all([
    getJSON('data/llm_cache.json').catch(() => ({ expand: {}, select: {} })),
    fetch('api/health').then(r => r.ok ? r.json() : null).catch(() => null),
  ]);
  const live = health && health.llm;
  state.stt = !!(health && health.stt);
  setupMic();
  state.llmModel = live ? health.model : (Object.keys(cache.select).length ? 'cache' : null);
  const key = (p) => `${p.lang}|${String(p.query).trim().toLowerCase()}`;
  // circuit breaker: after a failure (quota…), skip the live API for 5 minutes
  let aiDownUntil = 0;
  const call = (kind, path) => async (payload) => {
    const hit = cache[kind][key(payload)];
    if (hit) return hit;
    if (!live || Date.now() < aiDownUntil) throw new Error('live AI unavailable');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    let j = null;
    try {
      const r = await fetch(path, { method: 'POST', signal: ctrl.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      j = r.ok ? await r.json() : null;
    } catch (e) { j = null; } finally { clearTimeout(timer); }
    if (!j || j.ok === false) { aiDownUntil = Date.now() + 5 * 60 * 1000; throw new Error(path + ' unavailable'); }
    return j;
  };
  if (state.llmModel) state.llm = { expand: call('expand', 'api/expand'), select: call('select', 'api/select') };
  $('#aiBadge').textContent = T().ai(state.llmModel);
  await gateDone;
  $('#stage .st-lamp').innerHTML = lampSVG({ size: 230, word: true, title: 'Mishkat' });
  let firstTime = true; try { firstTime = localStorage.getItem('mishkat.welcomed') !== '1'; } catch (e) { /* ignore */ }
  try { const v = localStorage.getItem('mishkat.view'); if (v && v !== 'g0') setView(v); } catch (e) { /* ignore */ }
  const sp = new URL(location.href).searchParams;
  if (sp.get('q')) { $('#q').value = sp.get('q'); run(sp.get('q')); }
  else if (firstTime && !sp.get('s')) openWelcome();
  else if (sp.get('s')) openReader(+sp.get('s'), null);
  renderHome();
}

// ------------------------------------------------------------ entry gate
// "سمِّ الله": the visitor writes, pastes or says the basmala to enter.
function gate() {
  let ok = false;
  try { ok = localStorage.getItem('mishkat.bismillah') === '1'; } catch (e) { /* private mode */ }
  if (ok) return Promise.resolve();
  const g = $('#gate'), t = () => T();
  $('#gateBasmala').textContent = state.core.verses[0];
  $('#gateLamp').innerHTML = lampSVG({ size: 124, title: 'Mishkat' });
  g.hidden = false;
  document.body.classList.add('gated');
  setTimeout(() => $('#gateInput').focus(), 50);
  return new Promise(resolve => {
    const accept = () => {
      try { localStorage.setItem('mishkat.bismillah', '1'); } catch (e) { /* ignore */ }
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
  let l = null; try { l = localStorage.getItem('mishkat.voiceLang'); } catch (e) { /* ignore */ }
  return ['ar', 'en', 'fr'].includes(l) ? l : state.lang;
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
  box.querySelectorAll('[data-vl]').forEach(x => x.onclick = () => {
    lang = x.dataset.vl; markLang();
    try { localStorage.setItem('mishkat.voiceLang', lang); } catch (e) { /* ignore */ }
  });
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
  $('#status').textContent = t.thinking; $('#status').classList.add('on');
  const qLang = detectLang(query, state.lang);
  await ensureSources(qLang);
  if (qLang !== 'ar') await ensureSources('ar'); // glossary terms and the subject index are explained from the Arabic tafsir
  if (qLang !== 'ar') await ensureSources(qLang === 'en' ? 'fr' : 'en');
  let res;
  try { await state.refReady; res = await state.engine.ask(query, { uiLang: state.lang, llm: state.llm, mode }); }
  finally { $('#status').classList.remove('on'); }
  state.result = res;
  const url = new URL(location.href); url.searchParams.set('q', query); url.searchParams.delete('s');
  history.replaceState(null, '', url);
  showPanel('res');
  renderResults();
  const list = res.verses.filter(v => !v.closestOnly).map(v => v.idx);
  state.galaxy.highlightVerses(list.length > 400 ? [] : list);
  if (res.focus != null) focusVerse(res.focus, { card: true });
  else { state.galaxy.home(); state.galaxy.showLabels(null); }
}

function lastSura() { let n = 1; try { n = +localStorage.getItem('mishkat.lastSura') || 1; } catch (e) { /* ignore */ } return n >= 1 && n <= 114 ? n : 1; }

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
  return `<span class="badge ${cls}">${esc(B[key] || key)}</span>`;
}

function renderResults() {
  const res = state.result, t = T(), e = state.engine;
  if (!res) return;
  const dir = res.lang === 'ar' ? 'rtl' : 'ltr';
  let h = levelBadge(res) + badgeFor(res);
  const texts = res.answer.filter(a => a.kind === 'text');
  const quotes = res.answer.filter(a => a.kind === 'quote');
  const notes = res.answer.filter(a => a.kind === 'note');
  for (const a of texts) h += `<p class="lead" dir="${dir}">${esc(a.text)}</p>`;
  if (res.term) h += termCard(res.term);
  if (res.type === 'hadith' || res.hadithCheck) h += `<section class="hbox" id="hadithBox" aria-live="polite"></section>`;
  if (res.verdict === 'near' && res.diffWords && res.diffWords.length) {
    const diff = new Set(res.diffWords);
    const words = (res.checked || res.query).split(/\s+/).map(w => diff.has(normAr(w)) ? `<mark class="diff">${esc(w)}</mark>` : esc(w)).join(' ');
    h += `<p class="note" dir="${dir}">${esc(t.yourText)}</p><p class="ayah">${words}</p>`;
  }
  // explanation: one card per verse = verse text + COMPLETE tafsir unit (never a fragment)
  if (quotes.length && !['verse', 'range', 'sura'].includes(res.type)) {
    const ctxQ = quotes.filter(q => q.role === 'context'), ansQ = quotes.filter(q => q.role !== 'context');
    if (ctxQ.length) h += `<h3 class="sec">${esc(t.contextTitle)}</h3>` + ctxQ.map(q => verseCard(q, res.lang)).join('');
    if (ansQ.length) h += `<h3 class="sec">${esc(t.paraTitle)}</h3>` + ansQ.map(q => verseCard(q, res.lang)).join('');
    const srcIds = [...new Set(quotes.map(q => q.source))];
    h += `<div class="src">${srcIds.map(id => { const s0 = e.sources[id] || {}; return `<a href="${esc(s0.url || 'https://quranenc.com')}" target="_blank" rel="noopener">${esc(s0.title || id)}</a>`; }).join(' · ')}` +
      (res.paragraphBy && t.paraBy[res.paragraphBy] ? ` · <span class="ai-tag">${esc(t.paraBy[res.paragraphBy])}</span>` : '') + '</div>';
  }
  if (res.topicIndex) h += topicIndexBox(res.topicIndex);
  // fatwa requests: official sources
  if (res.links && res.links.length) {
    h += `<div class="links">${res.links.map(l => `<a class="btn gold" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(t.links[l.id] || l.id)}</a>`).join('')}</div>`;
  }
  for (const a of notes) h += `<p class="note" dir="${dir}">${esc(a.text)}</p>`;
  if (res.alt && res.alt.mode === 'topic') h += `<p><button class="btn alt" id="altBtn">${esc(t.asTopic(res.alt.query))}</button></p>`;
  if (res.alt && res.alt.mode === 'sura') h += `<p><button class="btn alt" id="altBtn">${esc(t.asSura(res.alt.name))}</button></p>`;

  // surahs ranked by relevance (topics) / verse list (verification)
  if (res.suras && res.suras.length && (res.type === 'topic' || res.verdict === 'notverse')) {
    h += `<h3 class="sec">${esc(t.surasTitle)}</h3><p class="sc-note">${esc(t.surasNote)}</p>` + res.suras.map((g, k) => suraCard(g, k)).join('');
  } else if (res.verses.length && res.type !== 'sura') {
    const relOnly = res.verses.length && res.verses.every(v => v.relatedOnly);
    h += `<h3 class="sec">${esc(relOnly ? t.relatedNotFatwa : t.versesTitle)} (${res.verses.filter(v => !v.closestOnly).length})</h3><ul class="vlist">` +
      res.verses.slice(0, 60).map(v => {
        const tr = e.translation(state.lang, v.idx).replace(/\[\d+\]/g, '');
        return `<li data-idx="${v.idx}"><div class="li-head"><b>${esc(refLabel(v.idx))}</b><span>${v.to ? `→ ${esc(v.to)} ` : ''}<button class="mini" data-playv="${v.idx}" aria-label="${esc(t.listen)}">▶</button></span></div>
          <div class="ayah">${esc(e.verses[v.idx])}</div>${tr ? `<div class="tr">${esc(tr)}</div>` : ''}</li>`;
      }).join('') + '</ul>';
  }
  if (res.type === 'sura') h += `<p><button class="btn gold" id="openSura">${esc(t.readSura)}</button> <button class="btn play" id="playSura">${esc(t.listen)}</button></p>`;
  if (res.bayenat && res.bayenat.length) h += `<section class="bay"><h3 class="sec">${esc(t.bayTitle)}</h3><ul>${res.bayenat.map(b => `<li><a href="${esc(b.url)}" target="_blank" rel="noopener" dir="rtl">${esc(b.q)}</a> <small>${esc(b.cat || '')}</small></li>`).join('')}</ul><p class="note">${esc(t.bayNote)}</p></section>`;
  if (res.type !== 'empty') h += `<p class="disclose">${esc(t.disclosure)}</p>`;
  const v = $('#viewRes');
  v.innerHTML = h;
  v.scrollTop = 0;
  v.querySelectorAll('.cite').forEach(el => el.onclick = () => focusVerse(+el.dataset.idx, { card: true }));
  v.querySelectorAll('[data-ctx]').forEach(b => b.onclick = () => toggleContext(b));
  v.querySelectorAll('[data-playv]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); const i = +b.dataset.playv; openReader(e.suraOf[i], i, true); });
  v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openReader(e.suraOf[+b.dataset.open], +b.dataset.open));
  if (res.sensitive) { const first = v.querySelector('[data-ctx]'); if (first) toggleContext(first); }
  v.querySelectorAll('.vlist li').forEach(li => li.onclick = () => openReader(e.suraOf[+li.dataset.idx], +li.dataset.idx));
  v.querySelectorAll('.sc-v').forEach(li => li.onclick = () => focusVerse(+li.dataset.idx, { card: true }));
  v.querySelectorAll('.sc-more').forEach(b => b.onclick = () => { b.closest('.sura-card').querySelectorAll('.sc-v[hidden]').forEach(x => { x.hidden = false; }); b.remove(); });
  v.querySelectorAll('[data-read]').forEach(b => b.onclick = () => openReader(+b.dataset.read, +b.dataset.first));
  v.querySelectorAll('[data-listen]').forEach(b => b.onclick = () => openReader(+b.dataset.listen, +b.dataset.first, true));
  const ab = $('#altBtn');
  if (ab) ab.onclick = () => res.alt.mode === 'topic' ? run(res.alt.query, 'topic') : openReader(res.alt.sura, null);
  const os = $('#openSura'); if (os) os.onclick = () => openReader(res.sura, res.focus);
  const ps = $('#playSura'); if (ps) ps.onclick = () => openReader(res.sura, res.focus, true);
  v.querySelectorAll('.tix [data-idx]').forEach(b => b.onclick = () => focusVerse(+b.dataset.idx, { card: true }));
  v.querySelectorAll('details.sc-info').forEach(d => d.ontoggle = () => { if (d.open) fillSuraInfo(d.querySelector('.sc-info-b'), +d.dataset.info, true); });
  if (res.type === 'hadith' || res.hadithCheck) loadHadith(res.type === 'hadith' ? res.hadith.q : res.hadithCheck, res.type !== 'hadith');
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
  const tr = e.translation(lang, i).replace(/\[\d+\]/g, '');
  return `<article class="vcardx${q.role === 'context' ? ' ctx' : ''}" data-idx="${i}">
    <header><span class="cite" data-idx="${i}">${esc(refLabel(i, lang))}</span>
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
    const tr = state.lang !== 'ar' ? e.translation(state.lang, i).replace(/\[\d+\]/g, '') : '';
    const ar = qLang === 'ar' ? markTerms(e.verses[i], 'ar', terms) : esc(e.verses[i]);
    const trH = tr ? (qLang === state.lang ? markTerms(tr, qLang, terms) : esc(tr)) : '';
    return `<li class="sc-v" data-idx="${i}"${n >= SHOW ? ' hidden' : ''}><div class="li-head"><button class="cite" data-idx="${i}">${esc(S.ar)} ${S.n}:${e.ayaOf[i]}</button>
      <span><button class="mini" data-playv="${i}" aria-label="${esc(t.listen)}">▶</button> <button class="mini" data-open="${i}">${esc(t.readHere)}</button></span></div>
      <div class="ayah">${ar}</div>${trH ? `<div class="tr">${trH}</div>` : ''}</li>`;
  };
  return `<div class="sura-card"><div class="sc-head"><span class="sc-rank">${k + 1}</span>
    <div class="sc-name"><b>${esc(S.ar)}</b><small>${esc(S.tr)} · ${S.n} · ${esc(S.type === 'meccan' ? t.meccan : t.medinan)} · ${esc(t.matched(g.verses.length))}</small></div>
    <span class="sc-btns"><button class="btn gold sm" data-read="${S.n}" data-first="${refs[0]}">${esc(t.readSura)}</button><button class="btn play sm" data-listen="${S.n}" data-first="${refs[0]}" aria-label="${esc(t.listen)}">▶</button></span></div>
    <details class="sc-info" data-info="${S.n}"><summary>${esc(t.aboutSura)}</summary><div class="sc-info-b">…</div></details>
    <ul class="sc-list">${refs.map(row).join('')}</ul>
    ${refs.length > SHOW ? `<button class="mini sc-more">${esc(t.moreV(refs.length - SHOW))}</button>` : ''}</div>`;
}

// ------------------------------------------------------------ panel
function showPanel(which) {
  $('#panel').hidden = false;
  document.body.classList.add('has-panel');
  $('#viewRes').hidden = which !== 'res';
  $('#viewRead').hidden = which !== 'read';
  $('#tabRes').setAttribute('aria-selected', which === 'res');
  $('#tabRead').setAttribute('aria-selected', which === 'read');
  $('#tabRes').disabled = !state.result;
  state.galaxy && state.galaxy.setCardVisible(which !== 'read');
}

function focusVerse(idx, { card = false, dist } = {}) {
  state.galaxy.flyToVerse(idx, dist);
  state.galaxy.showLabels(card ? idx : null, null, state.engine.verses[idx], refLabel(idx));
  document.querySelectorAll('.sc-v, .vcardx').forEach(b => b.classList.toggle('on', +b.dataset.idx === idx));
}

// ------------------------------------------------------------ reader
async function openReader(sura, idx, autoplay = false) {
  stopSpeech();
  const e = state.engine, S = state.core.suras[sura - 1];
  const hits = new Set((state.result && state.result.verses || []).filter(v => e.suraOf[v.idx] === sura).map(v => v.idx));
  state.reader = { sura, cur: idx == null ? S.first : idx, hits, srcTab: state.reader.srcTab };
  stopAudio();
  showPanel('read');
  renderReader(true);
  const url = new URL(location.href); url.searchParams.set('s', sura); history.replaceState(null, '', url);
  if (autoplay) play(state.reader.cur, true);
}

function verseTokens(i) {
  // display tokens of a verse; verse 1 carries the basmala in the Tanzil text (except 1 and 9)
  const e = state.engine, s = e.suraOf[i], a = e.ayaOf[i];
  const toks = e.verses[i].split(' ');
  const skip = (a === 1 && s !== 1 && s !== 9) ? 4 : 0;
  return { skip, toks };
}

function renderReader(scrollToCur) {
  const t = T(), e = state.engine, { sura, cur } = state.reader, S = state.core.suras[sura - 1];
  const v = $('#viewRead');
  let words = '';
  for (let a = 1; a <= S.ayas; a++) {
    const i = S.first + a - 1;
    words += `<span class="v${i === cur ? ' cur' : ''}${state.reader.hits.has(i) ? ' hit' : ''}" data-i="${i}"><button class="vplay" data-play="${i}" aria-label="${esc(t.playAya(a))}">▶</button>${verseWordsHtml(i)}<span class="end">﴿${arNum(a)}﴾</span></span> `;
  }
  const basmala = (sura !== 1 && sura !== 9) ? `<div class="basmala">${esc(e.verses[S.first].split(' ').slice(0, 4).join(' '))}</div>` : '';
  const rep = state.repeat || 1;
  v.innerHTML = `<div class="rd-head"><div class="rd-top"><div class="rd-lamp" id="rdLamp" aria-hidden="true">${lampSVG({ size: 96, word: true })}</div>
    <div class="rd-title"><b>سورة ${esc(S.ar)}</b><small>${esc(S.tr)} · ${esc(S.type === 'meccan' ? t.meccan : t.medinan)} · ${esc(t.ayas(S.ayas))}</small></div>
    <label class="rd-aya">${esc(t.ayaN)} <select id="rSel">${Array.from({ length: S.ayas }, (_, k) => `<option value="${S.first + k}"${S.first + k === cur ? ' selected' : ''}>${k + 1}</option>`).join('')}</select></label></div>
    <div class="rd-ctrl" role="toolbar" aria-label="${esc(t.listen)}">
      <button class="btn icon-b" id="rPrev" aria-label="${esc(t.prevA)}" title="${esc(t.prevA)}">${state.lang === 'ar' ? '›' : '‹'}</button>
      <button class="btn icon-b" id="rRestart" title="${esc(t.restartA)}" aria-label="${esc(t.restartA)}">⏮</button>
      <button class="btn play big" id="rPlay" aria-label="${esc(t.listen)}">${state.playing ? t.pause : t.play}</button>
      <button class="btn icon-b" id="rNext" aria-label="${esc(t.nextA)}" title="${esc(t.nextA)}">${state.lang === 'ar' ? '‹' : '›'}</button>
      <label class="btn rep" title="${esc(t.repeatTitle)}">${esc(t.repeat)} <select id="rRep" aria-label="${esc(t.repeatTitle)}">${[1, 3, 5, 10, 0].map(n => `<option value="${n}"${(rep === n || (rep === Infinity && n === 0)) ? ' selected' : ''}>${n ? '×' + n : '∞'}</option>`).join('')}</select></label>
      <button class="btn ${state.continuous ? 'on' : ''}" id="rAuto" aria-pressed="${state.continuous}">⟳ ${esc(t.auto)}</button>
      <button class="btn" id="rInfo" aria-expanded="false">ℹ ${esc(t.aboutSura)}</button>
    </div></div>
    <div class="rd-body" id="rdBody">
      <section class="sinfo" id="sInfo" hidden></section>
      <section class="focus" id="focus" aria-live="polite"></section>
      <details class="fulltext" open><summary>${esc(t.fullSura)}</summary><div class="mushaf" id="mushaf">${basmala}${words}</div></details>
    </div>`;
  $('#rPrev').onclick = () => step(-1);
  $('#rNext').onclick = () => step(1);
  $('#rPlay').onclick = () => state.playing ? stopAudio(true) : play(state.reader.cur, true);
  $('#rRestart').onclick = () => play(state.reader.cur, true);
  $('#rRep').onchange = (ev) => { const n = +ev.target.value; state.repeat = n || Infinity; state.repeatLeft = state.repeat; };
  $('#mushaf').querySelectorAll('.vplay').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); play(+b.dataset.play, true); });
  try { localStorage.setItem('mishkat.lastSura', String(sura)); } catch (e2) { /* ignore */ }
  $('#rAuto').onclick = () => { state.continuous = !state.continuous; $('#rAuto').classList.toggle('on', state.continuous); $('#rAuto').setAttribute('aria-pressed', state.continuous); };
  $('#rSel').onchange = (ev) => selectVerse(+ev.target.value, true);
  $('#rInfo').onclick = () => { const p = $('#sInfo'), open = p.hidden; p.hidden = !open; $('#rInfo').setAttribute('aria-expanded', open); if (open) fillSuraInfo(p, sura); };
  $('#mushaf').querySelectorAll('.v').forEach(el => el.onclick = () => selectVerse(+el.dataset.i, true));
  selectVerse(cur, scrollToCur, true);
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

function selectVerse(i, scroll, initial = false) {
  const e = state.engine;
  if (e.suraOf[i] !== state.reader.sura) return openReader(e.suraOf[i], i);
  const wasPlaying = state.playing && !initial;
  state.reader.cur = i;
  document.querySelectorAll('#mushaf .v').forEach(el => el.classList.toggle('cur', +el.dataset.i === i));
  const sel = $('#rSel'); if (sel) sel.value = i;
  const el = $(`#mushaf .v[data-i="${i}"]`);
  if (el && scroll && !initial) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  focusVerse(i, { dist: 70 });
  renderFocus(i);
  if (scroll) { const b = $('#rdBody'); if (b) b.scrollTo({ top: 0, behavior: initial ? 'auto' : 'smooth' }); }
  if (wasPlaying) play(i, true);
}
function step(d) {
  const i = state.reader.cur + d, S = state.core.suras[state.reader.sura - 1];
  if (i < S.first || i >= S.first + S.ayas) return;
  selectVerse(i, true);
}

// The current verse in the middle of the reader: Arabic, word-by-word transliteration,
// translation, then the tafsir — large, with a button to listen to it.
async function renderFocus(i) {
  const t = T(), e = state.engine, box = $('#focus');
  if (!box) return;
  stopSpeech();
  const s = e.suraOf[i], a = e.ayaOf[i], lang = state.lang;
  const tabs = lang === 'ar' ? ['muyassar_ar', 'mukhtasar_ar', 'saadi_ar', 'tabari'] : [TAFSIR_FOR[lang], 'muyassar_ar', 'saadi_ar', 'tabari'];
  const tab = tabs.includes(state.reader.srcTab) ? state.reader.srcTab : tabs[0];
  const tr = e.translation(lang, i).replace(/\[\d+\]/g, '');
  const trSrc = TRANSLATION_FOR[lang] ? e.sources[TRANSLATION_FOR[lang]] : null;
  box.innerHTML = `<div class="f-head"><span class="f-ref">${esc(refLabel(i))}</span>
      <span class="f-tools"><button class="mini" id="fCopy">${esc(t.copy)}</button><a class="mini" href="https://quran.com/${s}/${a}" target="_blank" rel="noopener">${esc(t.verifyExt)}</a><a class="mini" href="https://dorar.net/tafseer/${s}" target="_blank" rel="noopener">${esc(t.dorarTafsir)}</a></span></div>
    <div class="f-ayah ayah" id="fAyah">${verseWordsHtml(i)}<span class="end">﴿${arNum(a)}﴾</span></div>
    <div class="f-translit" id="fTranslit" dir="ltr" ${state.showTranslit === false ? 'hidden' : ''}></div>
    ${tr ? `<div class="f-trans" dir="ltr">${esc(tr)}<small>${esc(trSrc ? trSrc.title : '')}</small></div>` : ''}
    <div class="f-taf">
      <div class="f-taf-head"><span class="srcTabs" role="tablist">${tabs.map(id => `<button role="tab" aria-selected="${id === tab}" data-src="${id}" class="${id === tab ? 'on' : ''}">${esc(t.srcNames[id] || id)}</button>`).join('')}</span>
        <button class="btn tts" id="fTts" aria-pressed="false">🔊 ${esc(t.readTafsir)}</button></div>
      <div class="f-taf-body" id="tafBody">${esc(t.loadingTafsir)}</div>
    </div>`;
  box.querySelectorAll('[data-src]').forEach(b => b.onclick = () => { state.reader.srcTab = b.dataset.src; renderFocus(i); });
  $('#fCopy').onclick = async () => { try { await navigator.clipboard.writeText(`${e.verses[i]} [${refLabel(i, 'ar')}]`); $('#fCopy').textContent = t.copied; } catch (err) { /* blocked */ } };
  suraFile('translit', s).then(f => {
    const ws = (f.words[a - 1] || []);
    const el = $('#fTranslit');
    if (el && state.reader.cur === i) el.innerHTML = ws.map((w, k) => `<span class="w" data-w="${k + 1}">${esc(w)}</span>`).join(' ');
  }).catch(() => { /* optional */ });
  let text = '', dir = 'rtl', srcLine = '', ttsLang = 'ar';
  if (tab === 'tabari') return renderTabari(i, s, a);
  if (tab === 'saadi_ar') {
    const f = await suraFile('saadi', s);
    let k = a - 1;
    text = f.text[k];
    if (!text) { while (k > 0 && !f.text[k]) k--; text = f.text[k] ? `${t.saadiGroup} ${f.text[k]}` : ''; }
    srcLine = f.title;
  } else {
    await loadSource(tab);
    const src = e.sources[tab];
    text = (src.text[i] || '').replace(/^\d+\.\s*/, '');
    dir = tab.endsWith('_ar') ? 'rtl' : 'ltr';
    ttsLang = tab.slice(-2);
    srcLine = `${src.title} · QuranEnc.com`;
  }
  if (state.reader.cur !== i) return;
  const body = $('#tafBody');
  body.dir = dir;
  body.innerHTML = `<p>${esc(text)}</p><div class="src">${esc(srcLine)}</div>`;
  $('#fTts').onclick = () => toggleSpeech(text, ttsLang, $('#fTts'));
}

// At-Tabari, «جامع البيان» (d. 310 AH), page by page from Quranpedia, with volume/page
async function renderTabari(i, s, a) {
  const t = T();
  let j = null;
  try {
    const r = await fetch('api/tafsir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s, a, book: 4 }) });
    j = r.ok ? await r.json() : null;
  } catch (e) { j = null; }
  if (state.reader.cur !== i) return;
  const body = $('#tafBody');
  if (!body) return;
  body.dir = 'rtl';
  const more = `https://quranpedia.net/surah/1/${s}?ayah_id=${a}`;
  if (!j || !j.ok) { body.innerHTML = `<p>${esc(t.tafFail)}</p><div class="src"><a href="${more}" target="_blank" rel="noopener">${esc(t.tafMore)}</a></div>`; return; }
  if (j.empty || !j.lines.length) { body.innerHTML = `<p>${esc(t.tafEmpty)}</p>`; return; }
  const MAX = 40, lines = j.lines.slice(0, MAX);
  const refs = (j.ref || []).map(r => { const [v, p] = r.split('/'); return `${t.vol} ${v} ${t.pg} ${p}`; }).join('، ');
  body.innerHTML = (j.exact ? '' : `<p class="note">${esc(t.tafPages)}</p>`) +
    lines.map(l => l.h ? `<h4>${esc(l.t)}</h4>` : `<p>${esc(l.t)}</p>`).join('') +
    `<div class="src">${esc(j.book.name)} — ${esc(j.book.author)} (ت ${j.book.died}هـ) · ${esc(refs)} · <a href="${more}" target="_blank" rel="noopener">${esc(j.lines.length > MAX ? t.tafMore : j.source)}</a></div>`;
  const text = lines.map(l => l.t).join('\n');
  $('#fTts').onclick = () => toggleSpeech(text, 'ar', $('#fTts'));
}

// ------------------------------------------------ listening to the tafsir (browser speech synthesis)
const TTS_LANG = { ar: 'ar', en: 'en', fr: 'fr' };
function toggleSpeech(text, lang, btn) {
  const ss = window.speechSynthesis;
  if (!ss) { alertNote(T().ttsUnavailable); return; }
  if (ss.speaking) { stopSpeech(); return; }
  const voices = ss.getVoices();
  const voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(TTS_LANG[lang]));
  if (!voice && voices.length) { alertNote(T().ttsNoVoice); return; }
  stopAudio(true);
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : ({ ar: 'ar-SA', en: 'en-US', fr: 'fr-FR' })[lang];
  u.rate = lang === 'ar' ? 0.9 : 1;
  u.onend = u.onerror = () => { btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); };
  btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true');
  ss.speak(u);
}
function stopSpeech() {
  if (window.speechSynthesis && window.speechSynthesis.speaking) window.speechSynthesis.cancel();
  const b = $('#fTts'); if (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }
}
function alertNote(msg) {
  $('#status').textContent = msg; $('#status').classList.add('on');
  setTimeout(() => $('#status').classList.remove('on'), 3500);
}

// ------------------------------------------------ synchronised recitation
function showLampWord(w, ref) {
  document.querySelectorAll('#stage svg, #rdLamp svg').forEach(svg => setLampWord(svg, w));
  const big = $('#stageWord');
  if (big) {
    big.textContent = w || '';
    big.classList.remove('pop'); void big.offsetWidth; if (w) big.classList.add('pop');
  }
  if (ref !== undefined) { const r = $('#stageRef'); if (r) r.textContent = ref; }
}

// play(i, fromUser): fromUser resets the repetition counter
async function play(i, fromUser = false) {
  stopAudio();
  stopSpeech();
  if (fromUser || state.repeatLeft == null) state.repeatLeft = state.repeat || 1;
  const e = state.engine, s = e.suraOf[i], a = e.ayaOf[i];
  const tim = (await suraFile('timing', s))[a - 1];
  if (state.reader.cur !== i) selectVerse(i, false);
  const au = new Audio(AUDIO_BASE + tim.u);
  state.audio = au; state.playing = true;
  const btn = $('#rPlay'); if (btn) btn.textContent = T().pause;
  const groups = () => [...document.querySelectorAll(`#mushaf .v[data-i="${i}"], #fAyah, #fTranslit`)];
  const [w0] = state.galaxy.wordsOfVerse(i);
  showLampWord('', refLabel(i));
  let last = -1;
  const tick = () => {
    if (state.audio !== au) return;
    if (tim.t) {
      const ms = au.currentTime * 1000;
      let k = -1;
      for (let j = 0; j < tim.t.length / 2; j++) if (ms >= tim.t[2 * j] && ms <= tim.t[2 * j + 1] + 120) { k = j; break; }
      if (k !== last) {
        for (const g of groups()) {
          g.querySelectorAll('.w.now').forEach(x => x.classList.remove('now'));
          if (k >= 0) { const x = g.querySelector(`.w[data-w="${k + 1}"]`); if (x) x.classList.add('now'); }
        }
        const arWord = k >= 0 ? (($('#fAyah') && $('#fAyah').querySelector(`.w[data-w="${k + 1}"]`)) || {}).textContent : '';
        showLampWord(arWord || '');
        if (k >= 0) { state.galaxy.setActiveWord(w0 + k); state.galaxy.lookAtWord(w0 + k); } else state.galaxy.setActiveWord(null);
        last = k;
      }
    }
    state.raf = requestAnimationFrame(tick);
  };
  au.onplay = () => { cancelAnimationFrame(state.raf); document.body.classList.add('reciting'); tick(); };
  au.onended = () => {
    if (state.audio !== au) return;
    const S = state.core.suras[s - 1];
    stopAudio(true);
    if (state.repeatLeft > 1) { state.repeatLeft--; play(i); return; }       // تكرار
    state.repeatLeft = state.repeat || 1;
    if (state.continuous && i + 1 < S.first + S.ayas) { selectVerse(i + 1, false); play(i + 1); }
  };
  au.play().catch(() => { stopAudio(true); alertNote(T().audioError); });
}
function stopAudio(updateBtn) {
  cancelAnimationFrame(state.raf);
  if (state.audio) { state.audio.onended = null; state.audio.pause(); }
  state.audio = null; state.playing = false;
  document.body.classList.remove('reciting'); showLampWord('');
  document.querySelectorAll('.w.now').forEach(w => w.classList.remove('now'));
  if (state.galaxy) state.galaxy.setActiveWord(null);
  if (updateBtn) { const b = $('#rPlay'); if (b) b.textContent = T().play; }
}

// ------------------------------------------------------------- hover
function hover(p) {
  const tt = $('#tooltip');
  if (!p || !state.words) { tt.style.display = 'none'; return; }
  const e = state.engine;
  tt.innerHTML = `<div class="w">${esc(state.words[p.word])}</div><div>${esc(T().hoverAya(suraName(e.suraOf[p.verse]), e.ayaOf[p.verse]))}</div>`;
  tt.style.display = 'block';
  tt.style.left = Math.min(innerWidth - 270, p.x + 14) + 'px';
  tt.style.top = Math.min(innerHeight - 90, p.y + 14) + 'px';
}

// ------------------------------------------------------------- wiring
$('#searchForm').addEventListener('submit', (ev) => { ev.preventDefault(); const q = $('#q').value.trim(); if (q) run(q); });
document.querySelectorAll('.langs button').forEach(b => b.onclick = () => applyLang(b.dataset.lang));
$('#tabRes').onclick = () => state.result && showPanel('res');
$('#tabRead').onclick = () => state.reader.sura ? showPanel('read') : openReader(lastSura(), null);
$('#closePanel').onclick = () => {
  stopAudio(true);
  $('#panel').hidden = true; document.body.classList.remove('has-panel');
  state.result = null; state.reader = { sura: null, cur: null, hits: new Set(), srcTab: state.reader.srcTab };
  state.galaxy.highlightVerses([]); state.galaxy.showLabels(null); state.galaxy.home();
  const url = new URL(location.href); url.search = ''; history.replaceState(null, '', url);
};
$('#btnHome').onclick = () => state.galaxy.home();
const viewIdx = { g0: 0, g1: 1 };
async function setView(v) {
  if (!(v in viewIdx)) {
    const order = v.slice(2);
    const lay = await quranWordLayout({ wordVerse: state.galaxy.wordVerse, suraOf: state.engine.suraOf, suras: state.core.suras, order });
    viewIdx[v] = state.galaxy.addLayout(lay.positions, lay.view);
  }
  state.galaxy.setLayout(viewIdx[v]);
  $('#viewSel').value = v;
  document.body.classList.toggle('qview', v.startsWith('q-'));
  const note = $('#viewNote');
  note.hidden = v.startsWith('g');
  clearTimeout(setView.timer);
  if (!note.hidden) {
    note.textContent = T().viewNote(T()['ord_' + v.slice(2)]);
    // the explanation is shown for a while, then gets out of the way of the home page
    setView.timer = setTimeout(() => { note.hidden = true; }, 9000);
  }
  try { localStorage.setItem('mishkat.view', v); } catch (e) { /* ignore */ }
}
$('#viewSel').onchange = (ev) => setView(ev.target.value);
$('#btnMenu').onclick = () => openWelcome();
$('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
document.addEventListener('keydown', (ev) => {
  if (ev.target.closest && ev.target.closest('input,select,textarea')) return;
  if (ev.key === 'v' || ev.key === 'V') {
    const opts = [...$('#viewSel').options].map(o => o.value);
    setView(opts[(opts.indexOf($('#viewSel').value) + 1) % opts.length]);
  }
});

function setTheme(th) {
  document.documentElement.dataset.theme = th;
  $('#themeBtn').textContent = th === 'light' ? '☀' : '☾';
  try { localStorage.setItem('mishkat.theme', th); } catch (e) { /* ignore */ }
}
(function initTheme() { let th = 'dark'; try { th = localStorage.getItem('mishkat.theme') || 'dark'; } catch (e) { /* ignore */ } setTheme(th); })();

// ------------------------------------------------------------ welcome & feature chooser
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
  try { return (JSON.parse(localStorage.getItem('mishkat.interests') || '[]') || []).filter(k => INTERESTS.includes(k)); } catch (e) { return []; }
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
    try { localStorage.setItem('mishkat.interests', JSON.stringify(ks)); } catch (e) { /* ignore */ }
    closeWelcome(); renderHome();
  };
  $('#wClose').onclick = () => { closeWelcome(); renderHome(); };
  setTimeout(() => { const first = w.querySelector('.wtile'); if (first) first.focus(); }, 50);
}
function closeWelcome() { $('#welcome').hidden = true; try { localStorage.setItem('mishkat.welcomed', '1'); } catch (e) { /* ignore */ } }

// home page: suggestion groups for the chosen interests (default chips otherwise)
function renderHome() {
  const box = $('#forYou'), I = INTEREST[state.lang], chosen = interests(), L = state.lang;
  if (!state.core || !box) return;
  $('#chips').hidden = chosen.length > 0;
  $('#heroLead').hidden = chosen.length > 0;
  if (!chosen.length) {
    box.hidden = false;
    box.className = 'fy-empty';
    box.innerHTML = `<button type="button" class="fy-edit">${esc(I.personalise)}</button>`;
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
    box.hidden = false;
    box.className = '';
    box.innerHTML = `<div class="fy-head"><b>${esc(I.forYou)}</b><button type="button" class="fy-edit">${esc(I.edit)}</button></div>` + chosen.map(group).join('');
  }
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
  if (d.act === 'tafsir') state.reader.srcTab = state.lang === 'ar' ? 'muyassar_ar' : TAFSIR_FOR[state.lang];
  if (d.act === 'learn') { state.repeat = 3; state.repeatLeft = 3; }
  openReader(S.n, i, d.act === 'listen' || d.act === 'learn');
}
$('#btnLegend').onclick = () => { $('#legendBox').hidden = !$('#legendBox').hidden; };
$('#btnAbout').onclick = () => $('#about').showModal();
document.addEventListener('keydown', (ev) => {
  if (ev.target === $('#q') || ev.target.tagName === 'SELECT') return;
  if (ev.key === '/') { ev.preventDefault(); $('#q').focus(); return; }
  if (!state.reader.sura || $('#viewRead').hidden) return;
  const rtl = document.documentElement.dir === 'rtl';
  if (ev.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) step(1);
  if (ev.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) step(-1);
  if (ev.key === ' ') { ev.preventDefault(); state.playing ? stopAudio(true) : play(state.reader.cur); }
});

boot().catch(err => { $('#loadMsg').textContent = 'Error: ' + err.message; console.error(err); });
