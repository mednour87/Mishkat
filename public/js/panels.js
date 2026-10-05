// Tool panels (khatma, calendar, links, settings…): ONE panel open at a time. A click on a dock
// button opens its panel; a click on another button closes the first and opens the second; a
// second click on the same button closes it; Escape or ✕ closes. The galaxy stays visible behind.
// Opening/closing animates height and opacity (none when the visitor prefers reduced motion).
//   dock: element holding buttons [data-panel="id"]; tray: element that receives the panels
//   renderers: { id: async (bodyEl, args) => {} } draw the content each time the panel opens

const ICON_MAX = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const ICON_MIN = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
export function createPanels({ dock, tray, titles = {}, closeLabel = () => '✕', maxLabel = (on) => on ? 'Restore' : 'Enlarge', renderers = {}, onOpen = () => {}, onClose = () => {} }) {
  let current = null, seq = 0;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const btn = (id) => dock.querySelector(`[data-panel="${id}"]`);

  function frame(id) {
    let p = tray.querySelector(`#p-${id}`);
    if (p) return p;
    p = document.createElement('section');
    p.id = 'p-' + id; p.className = 'panel'; p.hidden = true;
    p.setAttribute('role', 'region'); p.setAttribute('aria-labelledby', `p-${id}-t`);
    p.innerHTML = `<header class="p-head"><h2 id="p-${id}-t"></h2><span class="p-btns"><button type="button" class="icon p-max" aria-pressed="false"></button><button type="button" class="icon p-x"></button></span></header><div class="p-body"></div>`;
    p.querySelector('.p-x').onclick = () => close();
    // (5 Oct) enlarge: the panel takes all the room under the top bar; a second press puts it back
    p.querySelector('.p-max').onclick = () => setMax(!tray.classList.contains('max'));
    tray.appendChild(p);
    return p;
  }
  function setMax(on) {
    tray.classList.toggle('max', on);
    tray.querySelectorAll('.p-max').forEach(b => { b.setAttribute('aria-pressed', String(on)); b.innerHTML = on ? ICON_MIN : ICON_MAX; const l = maxLabel(on); b.title = l; b.setAttribute('aria-label', l); });
  }
  function collapse(id) {
    const p = tray.querySelector(`#p-${id}`), b = btn(id);
    b && b.setAttribute('aria-expanded', 'false');
    if (!p || p.hidden) return;
    tray.classList.remove('on');
    if (reduced()) { p.hidden = true; p.classList.remove('open'); }
    else {
      p.style.height = p.offsetHeight + 'px';
      requestAnimationFrame(() => { p.style.height = '0px'; p.classList.remove('open'); });
      setTimeout(() => { if (current !== id) { p.hidden = true; p.style.height = ''; } }, 300);
    }
    onClose(id);
  }
  async function expand(id, args = {}) {
    const p = frame(id), b = btn(id), my = ++seq;
    p.querySelector('h2').textContent = titles[id] ? titles[id]() : id;
    const x = p.querySelector('.p-x'); x.textContent = '✕'; x.setAttribute('aria-label', closeLabel()); x.title = closeLabel();
    { const m = p.querySelector('.p-max'), on = tray.classList.contains('max'); m.innerHTML = on ? ICON_MIN : ICON_MAX; m.title = maxLabel(on); m.setAttribute('aria-label', maxLabel(on)); m.setAttribute('aria-pressed', String(on)); }
    if (renderers[id]) await renderers[id](p.querySelector('.p-body'), args);
    if (my !== seq || current !== id) return;        // another panel was asked for meanwhile
    p.hidden = false; tray.classList.add('on');
    b && b.setAttribute('aria-expanded', 'true');
    if (reduced()) p.classList.add('open');
    else {
      p.style.height = '0px';
      requestAnimationFrame(() => { p.style.height = p.scrollHeight + 'px'; p.classList.add('open'); });
      setTimeout(() => { if (current === id) p.style.height = ''; }, 300);
    }
    const f = p.querySelector('.p-body [autofocus]') || p.querySelector('h2');
    if (f) { f.tabIndex = -1; f.focus({ preventScroll: true }); }
    onOpen(id, args);
  }
  async function open(id, args) {
    if (current === id && !args) return close();
    if (current && current !== id) collapse(current);
    current = id;
    await expand(id, args);
  }
  function close() { const id = current; current = null; if (id) collapse(id); setMax(false); return id; }
  // redraw the open panel (language change, new data)
  async function refresh() { if (current) { const id = current; await expand(id); } }

  dock.addEventListener('click', (ev) => { const b = ev.target.closest('[data-panel]'); if (b) open(b.dataset.panel); });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !current) return;
    if (ev.target.closest && ev.target.closest('dialog[open]')) return;
    const id = close(); const b = btn(id); b && b.focus();
  });
  return { open, close, refresh, setMax, get current() { return current; } };
}
