// Tool panels (khatma, calendar, links, settings…): ONE panel open at a time. A click on a dock
// button opens its panel; a click on another button closes the first and opens the second; a
// second click on the same button closes it; Escape or ✕ closes. The galaxy stays visible behind.
// Opening/closing animates height and opacity (none when the visitor prefers reduced motion).
//   dock: element holding buttons [data-panel="id"]; tray: element that receives the panels
//   renderers: { id: async (bodyEl, args) => {} } draw the content each time the panel opens

export function createPanels({ dock, tray, titles = {}, closeLabel = () => '✕', renderers = {}, onOpen = () => {}, onClose = () => {} }) {
  let current = null, seq = 0;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const btn = (id) => dock.querySelector(`[data-panel="${id}"]`);

  function frame(id) {
    let p = tray.querySelector(`#p-${id}`);
    if (p) return p;
    p = document.createElement('section');
    p.id = 'p-' + id; p.className = 'panel'; p.hidden = true;
    p.setAttribute('role', 'region'); p.setAttribute('aria-labelledby', `p-${id}-t`);
    p.innerHTML = `<header class="p-head"><h2 id="p-${id}-t"></h2><button type="button" class="icon p-x"></button></header><div class="p-body"></div>`;
    p.querySelector('.p-x').onclick = () => close();
    tray.appendChild(p);
    return p;
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
  function close() { const id = current; current = null; if (id) collapse(id); return id; }
  // redraw the open panel (language change, new data)
  async function refresh() { if (current) { const id = current; await expand(id); } }

  dock.addEventListener('click', (ev) => { const b = ev.target.closest('[data-panel]'); if (b) open(b.dataset.panel); });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !current) return;
    if (ev.target.closest && ev.target.closest('dialog[open]')) return;
    const id = close(); const b = btn(id); b && b.focus();
  });
  return { open, close, refresh, get current() { return current; } };
}
