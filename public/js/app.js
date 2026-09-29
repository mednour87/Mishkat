import { createEngine, detectLang, SOURCES_NEEDED, TAFSIR_FOR, TRANSLATION_FOR, normAr } from './engine.js';
import { UI, ABOUT } from './i18n.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AUDIO_BASE = 'https://verses.quran.com/';
const REPORT_URL = 'https://github.com/mishkat-quran/mishkat/issues/new';
const arNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const HAS_LETTER = /[ء-يٱ]/;

const state = {
  lang: 'ar', engine: null, galaxy: null, core: null, llm: null, llmModel: null,
  result: null, reader: { sura: null, cur: null, hits: new Set(), srcTab: null },
  audio: null, playing: false, continuous: true, timing: new Map(), saadi: new Map(), raf: 0,
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
  $('#btnLayout').textContent = state.galaxy && state.galaxy.layout === 1 ? t.layoutNuzul : t.layoutMushaf;
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
  applyLang(state.lang);
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
  const sp = new URL(location.href).searchParams;
  if (sp.get('q')) { $('#q').value = sp.get('q'); run(sp.get('q')); }
  else if (sp.get('s')) openReader(+sp.get('s'), null);
}

// ------------------------------------------------------------ search
async function run(query, mode = 'auto') {
  const t = T();
  $('#status').textContent = t.thinking; $('#status').classList.add('on');
  const qLang = detectLang(query, state.lang);
  await ensureSources(qLang);
  if (qLang !== 'ar') await ensureSources(qLang === 'en' ? 'fr' : 'en');
  let res;
  try { res = await state.engine.ask(query, { uiLang: state.lang, llm: state.llm, mode }); }
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
  let h = badgeFor(res);
  const texts = res.answer.filter(a => a.kind === 'text');
  const quotes = res.answer.filter(a => a.kind === 'quote');
  const notes = res.answer.filter(a => a.kind === 'note');
  for (const a of texts) h += `<p class="lead" dir="${dir}">${esc(a.text)}</p>`;
  if (res.verdict === 'near' && res.diffWords && res.diffWords.length) {
    const diff = new Set(res.diffWords);
    const words = (res.checked || res.query).split(/\s+/).map(w => diff.has(normAr(w)) ? `<mark class="diff">${esc(w)}</mark>` : esc(w)).join(' ');
    h += `<p class="note" dir="${dir}">${esc(t.yourText)}</p><p class="ayah">${words}</p>`;
  }
  // explanatory paragraph: verbatim sentences, consecutive sentences of a verse merged
  if (quotes.length && !['verse', 'range', 'sura'].includes(res.type)) {
    const groups = [];
    for (const q of quotes) {
      const last = groups[groups.length - 1];
      if (last && last.idx === q.idx) last.texts.push(q.text); else groups.push({ idx: q.idx, source: q.source, texts: [q.text] });
    }
    const srcIds = [...new Set(quotes.map(q => q.source))];
    h += `<h3 class="sec">${esc(t.paraTitle)}</h3><div class="para" dir="${dir}">` +
      groups.map(g => `<span class="sent">${esc(g.texts.join(' '))}</span><span class="cite" data-idx="${g.idx}">${esc(refLabel(g.idx, res.lang))}</span>`).join(' ') +
      `</div><div class="src">${srcIds.map(id => { const s = e.sources[id] || {}; return `<a href="${esc(s.url || 'https://quranenc.com')}" target="_blank" rel="noopener">${esc(s.title || id)}</a>`; }).join(' · ')}` +
      (res.paragraphBy ? ` · <span class="ai-tag">${esc(t.paraBy[res.paragraphBy])}</span>` : '') + '</div>';
  }
  for (const a of notes) h += `<p class="note" dir="${dir}">${esc(a.text)}</p>`;
  if (res.alt && res.alt.mode === 'topic') h += `<p><button class="btn alt" id="altBtn">${esc(t.asTopic(res.alt.query))}</button></p>`;
  if (res.alt && res.alt.mode === 'sura') h += `<p><button class="btn alt" id="altBtn">${esc(t.asSura(res.alt.name))}</button></p>`;

  // surahs ranked by relevance (topics) / verse list (verification)
  if (res.suras && res.suras.length && (res.type === 'topic' || res.verdict === 'notverse')) {
    h += `<h3 class="sec">${esc(t.surasTitle)}</h3>` + res.suras.map((g, k) => suraCard(g, k)).join('');
  } else if (res.verses.length && res.type !== 'sura') {
    h += `<h3 class="sec">${esc(t.versesTitle)} (${res.verses.filter(v => !v.closestOnly).length})</h3><ul class="vlist">` +
      res.verses.slice(0, 60).map(v => {
        const tr = e.translation(state.lang, v.idx).replace(/\[\d+\]/g, '');
        return `<li data-idx="${v.idx}"><div class="li-head"><b>${esc(refLabel(v.idx))}</b>${v.to ? `<span>→ ${esc(v.to)}</span>` : ''}</div>
          <div class="ayah">${esc(e.verses[v.idx])}</div>${tr ? `<div class="tr">${esc(tr)}</div>` : ''}</li>`;
      }).join('') + '</ul>';
  }
  if (res.type === 'sura') h += `<p><button class="btn gold" id="openSura">${esc(t.readSura)}</button> <button class="btn play" id="playSura">${esc(t.listen)}</button></p>`;
  const v = $('#viewRes');
  v.innerHTML = h;
  v.scrollTop = 0;
  v.querySelectorAll('.cite').forEach(el => el.onclick = () => focusVerse(+el.dataset.idx, { card: true }));
  v.querySelectorAll('.vlist li').forEach(li => li.onclick = () => openReader(e.suraOf[+li.dataset.idx], +li.dataset.idx));
  v.querySelectorAll('.sc-refs button').forEach(b => b.onclick = () => focusVerse(+b.dataset.idx, { card: true }));
  v.querySelectorAll('[data-read]').forEach(b => b.onclick = () => openReader(+b.dataset.read, +b.dataset.first));
  v.querySelectorAll('[data-listen]').forEach(b => b.onclick = () => openReader(+b.dataset.listen, +b.dataset.first, true));
  const ab = $('#altBtn');
  if (ab) ab.onclick = () => res.alt.mode === 'topic' ? run(res.alt.query, 'topic') : openReader(res.alt.sura, null);
  const os = $('#openSura'); if (os) os.onclick = () => openReader(res.sura, res.focus);
  const ps = $('#playSura'); if (ps) ps.onclick = () => openReader(res.sura, res.focus, true);
}

function suraCard(g, k) {
  const t = T(), S = state.core.suras[g.sura - 1], e = state.engine;
  const refs = g.verses.slice().sort((a, b) => a - b);
  return `<div class="sura-card"><div class="sc-head"><span class="sc-rank">${k + 1}</span>
    <div class="sc-name"><b>${esc(S.ar)}</b><small>${esc(S.tr)} · ${S.n} · ${esc(S.type === 'meccan' ? t.meccan : t.medinan)} · ${esc(t.matched(g.verses.length))}</small></div></div>
    <div class="sc-refs">${refs.slice(0, 14).map(i => `<button data-idx="${i}">${e.ayaOf[i]}</button>`).join('')}${refs.length > 14 ? '<span>…</span>' : ''}</div>
    <div class="sc-btns"><button class="btn gold" data-read="${S.n}" data-first="${g.verses[0]}">${esc(t.readSura)}</button>
    <button class="btn play" data-listen="${S.n}" data-first="${g.verses[0]}">${esc(t.listen)}</button></div></div>`;
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
  $('#tabRead').disabled = !state.reader.sura;
  state.galaxy && state.galaxy.setCardVisible(which !== 'read');
}

function focusVerse(idx, { card = false, dist } = {}) {
  state.galaxy.flyToVerse(idx, dist);
  state.galaxy.showLabels(card ? idx : null, null, state.engine.verses[idx], refLabel(idx));
  document.querySelectorAll('.sc-refs button').forEach(b => b.classList.toggle('on', +b.dataset.idx === idx));
}

// ------------------------------------------------------------ reader
async function openReader(sura, idx, autoplay = false) {
  const e = state.engine, S = state.core.suras[sura - 1];
  const hits = new Set((state.result && state.result.verses || []).filter(v => e.suraOf[v.idx] === sura).map(v => v.idx));
  state.reader = { sura, cur: idx == null ? S.first : idx, hits, srcTab: state.reader.srcTab };
  stopAudio();
  showPanel('read');
  renderReader(true);
  const url = new URL(location.href); url.searchParams.set('s', sura); history.replaceState(null, '', url);
  if (autoplay) play(state.reader.cur);
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
    const { skip, toks } = verseTokens(i);
    let w = 0, html = '';
    toks.forEach((tok, k) => {
      if (k < skip) return;
      if (HAS_LETTER.test(tok)) { w++; html += `<span class="w" data-w="${w}">${esc(tok)}</span> `; } else html += `${esc(tok)} `;
    });
    words += `<span class="v${i === cur ? ' cur' : ''}${state.reader.hits.has(i) ? ' hit' : ''}" data-i="${i}">${html}<span class="end">﴿${arNum(a)}﴾</span></span> `;
  }
  const basmala = (sura !== 1 && sura !== 9) ? `<div class="basmala">${esc(e.verses[S.first].split(' ').slice(0, 4).join(' '))}</div>` : '';
  v.innerHTML = `<div class="rd-head"><div class="rd-title"><b>سورة ${esc(S.ar)}</b><small>${esc(S.tr)} · ${esc(S.type === 'meccan' ? t.meccan : t.medinan)} · ${esc(t.ayas(S.ayas))}</small></div>
    <div class="rd-ctrl">
      <button class="btn" id="rPrev" aria-label="${esc(t.prevA)}">${state.lang === 'ar' ? '→' : '←'} ${esc(t.prevA)}</button>
      <button class="btn play" id="rPlay">${state.playing ? t.pause : t.play}</button>
      <button class="btn" id="rNext" aria-label="${esc(t.nextA)}">${esc(t.nextA)} ${state.lang === 'ar' ? '←' : '→'}</button>
      <button class="btn ${state.continuous ? 'on' : ''}" id="rAuto">⟳ ${esc(t.auto)}</button>
      <label>${esc(t.ayaN)} <select id="rSel">${Array.from({ length: S.ayas }, (_, k) => `<option value="${S.first + k}"${S.first + k === cur ? ' selected' : ''}>${k + 1}</option>`).join('')}</select></label>
    </div></div>
    <div class="mushaf" id="mushaf">${basmala}${words}</div>
    <div class="rd-detail" id="rDetail"></div>`;
  $('#rPrev').onclick = () => step(-1);
  $('#rNext').onclick = () => step(1);
  $('#rPlay').onclick = () => state.playing ? stopAudio(true) : play(state.reader.cur);
  $('#rAuto').onclick = () => { state.continuous = !state.continuous; $('#rAuto').classList.toggle('on', state.continuous); };
  $('#rSel').onchange = (ev) => selectVerse(+ev.target.value, true);
  $('#mushaf').querySelectorAll('.v').forEach(el => el.onclick = () => selectVerse(+el.dataset.i, true));
  selectVerse(cur, scrollToCur, true);
}

function selectVerse(i, scroll, initial = false) {
  const e = state.engine;
  if (e.suraOf[i] !== state.reader.sura) return openReader(e.suraOf[i], i);
  const wasPlaying = state.playing && !initial;
  state.reader.cur = i;
  document.querySelectorAll('#mushaf .v').forEach(el => el.classList.toggle('cur', +el.dataset.i === i));
  const sel = $('#rSel'); if (sel) sel.value = i;
  const el = $(`#mushaf .v[data-i="${i}"]`);
  if (el && scroll) el.scrollIntoView({ behavior: initial ? 'auto' : 'smooth', block: 'center' });
  focusVerse(i, { dist: 90 });
  renderDetail(i);
  if (wasPlaying) play(i);
}
function step(d) {
  const i = state.reader.cur + d, S = state.core.suras[state.reader.sura - 1];
  if (i < S.first || i >= S.first + S.ayas) return;
  selectVerse(i, true);
}

async function renderDetail(i) {
  const t = T(), e = state.engine, box = $('#rDetail');
  const s = e.suraOf[i], a = e.ayaOf[i];
  const tabs = state.lang === 'ar' ? ['muyassar_ar', 'mukhtasar_ar', 'saadi_ar'] : [TAFSIR_FOR[state.lang], 'muyassar_ar', 'saadi_ar'];
  let tab = tabs.includes(state.reader.srcTab) ? state.reader.srcTab : tabs[0];
  const tr = e.translation(state.lang, i).replace(/\[\d+\]/g, '');
  const trSrc = TRANSLATION_FOR[state.lang] ? e.sources[TRANSLATION_FOR[state.lang]] : null;
  const head = `${tr ? `<h4><span>${esc(t.translation)}</span><small>${esc(trSrc ? trSrc.title : '')}</small></h4><div class="tafsir">${esc(tr)}</div>` : ''}
    <h4><span>${esc(t.tafsirTitle)} · ${esc(refLabel(i))}</span><span class="srcTabs">${tabs.map(id => `<button data-src="${id}" class="${id === tab ? 'on' : ''}">${esc(t.srcNames[id] || id)}</button>`).join('')}</span></h4>`;
  box.innerHTML = head + `<div class="tafsir" id="tafBody">${esc(t.loadingTafsir)}</div>` +
    `<div class="rd-links"><button class="btn" id="rCopy">${esc(t.copy)}</button><a class="btn" href="https://quran.com/${s}/${a}" target="_blank" rel="noopener">${esc(t.verifyExt)}</a>` +
    `<a class="btn" href="${REPORT_URL}?title=${encodeURIComponent('Report ' + s + ':' + a)}" target="_blank" rel="noopener">${esc(t.report)}</a></div>`;
  box.querySelectorAll('[data-src]').forEach(b => b.onclick = () => { state.reader.srcTab = b.dataset.src; renderDetail(i); });
  $('#rCopy').onclick = async () => { try { await navigator.clipboard.writeText(`${e.verses[i]} [${refLabel(i, 'ar')}]`); $('#rCopy').textContent = t.copied; } catch (err) { /* blocked */ } };
  let text = '', dir = 'rtl', srcLine = '';
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
    srcLine = `${src.title} · QuranEnc.com`;
  }
  if (state.reader.cur !== i) return;
  const body = $('#tafBody');
  body.dir = dir;
  body.innerHTML = `${esc(text)}<div class="src">${esc(srcLine)}</div>`;
}

// ------------------------------------------------ synchronised recitation
async function play(i) {
  stopAudio();
  const e = state.engine, s = e.suraOf[i], a = e.ayaOf[i];
  const tim = (await suraFile('timing', s))[a - 1];
  if (state.reader.cur !== i) selectVerse(i, true);
  const au = new Audio(AUDIO_BASE + tim.u);
  state.audio = au; state.playing = true;
  const btn = $('#rPlay'); if (btn) btn.textContent = T().pause;
  const words = [...document.querySelectorAll(`#mushaf .v[data-i="${i}"] .w`)];
  const [w0] = state.galaxy.wordsOfVerse(i);
  let last = -1;
  const tick = () => {
    if (state.audio !== au) return;
    if (tim.t) {
      const ms = au.currentTime * 1000;
      let k = -1;
      for (let j = 0; j < tim.t.length / 2; j++) if (ms >= tim.t[2 * j] && ms <= tim.t[2 * j + 1] + 120) { k = j; break; }
      if (k !== last) {
        if (last >= 0 && words[last]) words[last].classList.remove('now');
        if (k >= 0 && words[k]) words[k].classList.add('now');
        state.galaxy.setActiveWord(k >= 0 ? w0 + k : null);
        last = k;
      }
    }
    state.raf = requestAnimationFrame(tick);
  };
  au.onplay = () => { cancelAnimationFrame(state.raf); tick(); };
  au.onended = () => {
    if (state.audio !== au) return;
    const S = state.core.suras[s - 1];
    stopAudio(true);
    if (state.continuous && i + 1 < S.first + S.ayas) { selectVerse(i + 1, true); play(i + 1); }
  };
  au.play().catch(() => stopAudio(true));
}
function stopAudio(updateBtn) {
  cancelAnimationFrame(state.raf);
  if (state.audio) { state.audio.onended = null; state.audio.pause(); }
  state.audio = null; state.playing = false;
  document.querySelectorAll('#mushaf .w.now').forEach(w => w.classList.remove('now'));
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
$('#tabRead').onclick = () => state.reader.sura && showPanel('read');
$('#closePanel').onclick = () => {
  stopAudio(true);
  $('#panel').hidden = true; document.body.classList.remove('has-panel');
  state.result = null; state.reader = { sura: null, cur: null, hits: new Set(), srcTab: state.reader.srcTab };
  state.galaxy.highlightVerses([]); state.galaxy.showLabels(null); state.galaxy.home();
  const url = new URL(location.href); url.search = ''; history.replaceState(null, '', url);
};
$('#btnHome').onclick = () => state.galaxy.home();
$('#btnLayout').onclick = () => {
  const L = state.galaxy.layout === 0 ? 1 : 0;
  state.galaxy.setLayout(L);
  $('#btnLayout').textContent = L === 1 ? T().layoutNuzul : T().layoutMushaf;
};
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
