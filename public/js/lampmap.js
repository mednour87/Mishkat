// T069 — the khatma inside the logo: the 114 surahs are lights inside the glass of the Mishkat lamp.
// A surah read to its end lights up (gold), a surah partly read glows in proportion, the others stay dim.
// Two views share one layout:
//   - miniLamp(): small dots drawn over the logo's glass (front view), always visible next to the galaxy;
//   - openLampMap(): a 3D view of the same glass (a solid of revolution with the logo's own profile),
//     every surah with its name, turning slowly, dragged with the mouse or a finger; order of the path:
//     Mushaf order, order of revelation (Tanzil metadata), length, or Meccan then Medinan.
// Nothing here touches religious text: names come from core.json (Tanzil metadata), progress from the
// visitor's own reading log (this browser only).

// profile of the glass in the logo's 120×120 viewBox (lamp.js): [y, half-width]
const PROFILE = [[22.5, 12.5], [27, 10.5], [31, 8], [37, 5.5], [41, 11], [45, 16.5], [51, 20.5], [61, 22.5], [69, 20], [74, 15.5], [79.5, 6]];
const Y0 = 24, Y1 = 78.5;
export function radiusAt(y) {
  if (y <= PROFILE[0][0]) return PROFILE[0][1];
  for (let k = 1; k < PROFILE.length; k++) {
    const [ya, ra] = PROFILE[k - 1], [yb, rb] = PROFILE[k];
    if (y <= yb) { const t = (y - ya) / (yb - ya), s = t * t * (3 - 2 * t); return ra + (rb - ra) * s; }
  }
  return PROFILE[PROFILE.length - 1][1];
}

export const ORDERS = ['mushaf', 'nuzul', 'length', 'place'];
// surah numbers in the chosen order
export function orderSuras(suras, order = 'mushaf') {
  const list = suras.map(s => s.n);
  const by = (f) => list.slice().sort((a, b) => f(suras[a - 1], suras[b - 1]) || a - b);
  if (order === 'nuzul') return by((a, b) => (a.order || 999) - (b.order || 999));
  if (order === 'length') return by((a, b) => b.ayas - a.ayas);
  if (order === 'place') return by((a, b) => (a.type === b.type ? 0 : a.type === 'meccan' ? -1 : 1) || (a.order || 999) - (b.order || 999));
  return list;
}

// position of the k-th light (0..113) on a helix that follows the glass from the neck to the foot; the lights
// are spread by the girth of the glass (fewer in the narrow neck, more in the round body), so names do not pile up
const TURNS = 7;
export function layout(n = 114) {
  const STEPS = 400, cum = [0];
  for (let k = 1; k <= STEPS; k++) { const y = Y0 + (Y1 - Y0) * (k - 0.5) / STEPS; cum.push(cum[k - 1] + radiusAt(y) + 2); }
  const total = cum[STEPS], out = [];
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0 : k / (n - 1), goal = t * total;
    let a = 0; while (a < STEPS && cum[a + 1] < goal) a++;
    const f = a >= STEPS ? 1 : (goal - cum[a]) / Math.max(1e-9, cum[a + 1] - cum[a]);
    const y = Y0 + (Y1 - Y0) * (a + f) / STEPS;
    out.push({ y, th: 2 * Math.PI * TURNS * t, r: radiusAt(y) * 0.86 });
  }
  return out;
}

// fraction read of every surah (0..1) from the reading bits
export function progressOf(bits, suras, isRead) {
  return suras.map(s => { let n = 0; for (let a = 0; a < s.ayas; a++) n += isRead(bits, s.first + a); return n / s.ayas; });
}

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// small dots over the logo's glass (front view); returns an SVG string in the logo's viewBox
export function miniLamp(prog, suras, order = 'mushaf') {
  const ord = orderSuras(suras, order), pos = layout(ord.length);
  let dots = '';
  ord.forEach((n, k) => {
    const p = pos[k], f = prog[n - 1] || 0, front = Math.cos(p.th);
    const x = 60 + p.r * Math.sin(p.th), on = f >= 1;
    if (!on && f <= 0) { if (front > 0.2) dots += `<circle cx="${x.toFixed(2)}" cy="${p.y.toFixed(2)}" r=".55" fill="#fff3d6" opacity=".18"/>`; return; }
    const o = on ? 0.95 : 0.25 + 0.5 * f;
    dots += `<circle cx="${x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${on ? 1.05 : 0.8}" fill="${on ? '#fffbe6' : '#ffe08a'}" opacity="${(o * (front > 0 ? 1 : 0.55)).toFixed(2)}"/>`;
  });
  return `<svg class="kmini" viewBox="0 0 120 120" aria-hidden="true"><g filter="url(#kminiGlow)">${dots}</g>
    <defs><filter id="kminiGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>`;
}

// ------------------------------------------------------------------ the 3D view
// hifz: fraction of each surah repeated to the end in the tekrar mode (blue ring); extra: a line under the title
// (this month's percentages and the number of khatmas)
export function openLampMap({ core, prog, hifz = null, extra = '', lang = 'ar', order = 'mushaf', strings, onPick, onOrder, onClose }) {
  const T = strings;
  const old = document.getElementById('lampMap');
  if (old) old.remove();
  const root = document.createElement('div');
  root.id = 'lampMap';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', T.title);
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  const nRead = prog.filter(f => f >= 1).length, nPart = prog.filter(f => f > 0 && f < 1).length;
  root.innerHTML = `<div class="lm-head"><h2>${esc(T.title)}</h2>
      <p class="lm-sum">${esc(T.summary(nRead, nPart))}</p>${extra ? `<p class="lm-sum lm-extra">${esc(extra)}</p>` : ''}
      <div class="lm-orders" role="radiogroup" aria-label="${esc(T.orderLabel)}">${ORDERS.map(o => `<button type="button" role="radio" data-order="${o}" aria-checked="${o === order}">${esc(T.orders[o])}</button>`).join('')}</div>
      <button type="button" class="lm-close" aria-label="${esc(T.close)}">✕</button></div>
    <canvas class="lm-canvas" tabindex="0" aria-label="${esc(T.canvas)}"></canvas>
    <div class="lm-ctrl" role="toolbar" aria-label="${esc(T.controls)}">
      <button type="button" data-c="speed" title="${esc(T.speed)}" aria-label="${esc(T.speed)}">⏩ <b>×1</b></button>
      <button type="button" data-c="up" title="${esc(T.up)}" aria-label="${esc(T.up)}">▲</button>
      <button type="button" data-c="down" title="${esc(T.down)}" aria-label="${esc(T.down)}">▼</button>
      <button type="button" data-c="in" title="${esc(T.zoomIn)}" aria-label="${esc(T.zoomIn)}">＋</button>
      <button type="button" data-c="out" title="${esc(T.zoomOut)}" aria-label="${esc(T.zoomOut)}">－</button>
      <button type="button" data-c="reset" title="${esc(T.reset)}" aria-label="${esc(T.reset)}">⟲</button></div>
    <div class="lm-tip" hidden></div>
    <p class="lm-legend"><span class="lg on"></span>${esc(T.read)} <span class="lg part"></span>${esc(T.partly)} <span class="lg off"></span>${esc(T.unread)}${hifz ? ` <span class="lg hz"></span>${esc(T.hifz || '')}` : ''} · ${esc(T.hint)}</p>`;
  document.body.appendChild(root);
  const cv = root.querySelector('canvas'), tip = root.querySelector('.lm-tip');
  const ctx2 = cv.getContext('2d');
  let ord = orderSuras(core.suras, order), pos = layout(ord.length);
  let rot = 0, tilt = 0.18, auto = !matchMedia('(prefers-reduced-motion: reduce)').matches, drag = null, raf = 0, hover = -1, alive = true;
  let W = 0, H = 0, S = 1, CX = 0, CY = 0, DPR = 1, pts = [], hits = [];
  // speed of the turn (0 = still), zoom, and a pause while the pointer is over a surah (a moving target was
  // the cause of clicks opening the neighbour)
  const SPEEDS = [1, 2, 4, 0];
  let speedK = 0, zoom = 1, over = false, panY = 0;
  const pinch = new Map();
  const resize = () => {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    S = Math.min(W / 50, H / 66) * zoom; CX = W / 2; CY = H / 2 + panY;   // the glass centre (y 51 in the logo) in the middle
  };
  const proj = (x, y, z) => {
    // rotate about the vertical axis, then tilt
    const cr = Math.cos(rot), sr = Math.sin(rot);
    let X = x * cr + z * sr, Z = -x * sr + z * cr, Y = y;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const Y2 = Y * ct - Z * st, Z2 = Y * st + Z * ct;
    const p = 140 / (140 - Z2);
    return { x: CX + X * S * p, y: CY + Y2 * S * p, z: Z2, p };
  };
  const draw = () => {
    if (!alive) return;
    if (auto && !drag && !over) rot += 0.0035 * SPEEDS[speedK];
    ctx2.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx2.clearRect(0, 0, W, H);
    // halo of the lamp («نور على نور»)
    const g = ctx2.createRadialGradient(CX, CY + 6 * S, 2, CX, CY + 6 * S, 34 * S);
    g.addColorStop(0, `rgba(255,214,107,${0.10 + 0.25 * (nRead / 114)})`); g.addColorStop(1, 'rgba(255,214,107,0)');
    ctx2.fillStyle = g; ctx2.fillRect(0, 0, W, H);
    // the glass: rings and meridians of the solid of revolution
    ctx2.lineWidth = 1;
    for (let y = 23; y <= 79.5; y += 3.5) {
      const r = radiusAt(y);
      ctx2.beginPath();
      for (let a = 0; a <= 48; a++) { const th = a / 48 * 2 * Math.PI, q = proj(r * Math.sin(th), y - 51, r * Math.cos(th)); a ? ctx2.lineTo(q.x, q.y) : ctx2.moveTo(q.x, q.y); }
      ctx2.strokeStyle = 'rgba(255,211,110,.10)'; ctx2.stroke();
    }
    for (let m = 0; m < 12; m++) {
      const th = m / 12 * 2 * Math.PI;
      ctx2.beginPath();
      for (let y = 22.5; y <= 79.5; y += 1.5) { const r = radiusAt(y), q = proj(r * Math.sin(th), y - 51, r * Math.cos(th)); y === 22.5 ? ctx2.moveTo(q.x, q.y) : ctx2.lineTo(q.x, q.y); }
      ctx2.strokeStyle = 'rgba(255,211,110,.08)'; ctx2.stroke();
    }
    // the path of the chosen order
    pts = ord.map((n, k) => { const p = pos[k]; return { n, k, ...proj(p.r * Math.sin(p.th), p.y - 51, p.r * Math.cos(p.th)), f: prog[n - 1] || 0 }; });
    ctx2.beginPath();
    pts.forEach((q, k) => k ? ctx2.lineTo(q.x, q.y) : ctx2.moveTo(q.x, q.y));
    ctx2.strokeStyle = 'rgba(142,197,240,.16)'; ctx2.stroke();
    // lights, back to front
    const sorted = pts.slice().sort((a, b) => a.z - b.z);
    hits = [];
    ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
    for (const q of sorted) {
      const depth = (q.z + 25) / 50, on = q.f >= 1, part = q.f > 0 && !on;
      const rad = (on ? 4.2 : part ? 3.2 : 2.2) * q.p * Math.max(0.8, S / 7);
      if (on || part) {
        const gl = ctx2.createRadialGradient(q.x, q.y, 0, q.x, q.y, rad * 4);
        gl.addColorStop(0, on ? 'rgba(255,240,180,.75)' : `rgba(255,214,107,${0.2 + 0.4 * q.f})`); gl.addColorStop(1, 'rgba(255,214,107,0)');
        ctx2.fillStyle = gl; ctx2.beginPath(); ctx2.arc(q.x, q.y, rad * 4, 0, 7); ctx2.fill();
      }
      ctx2.beginPath(); ctx2.arc(q.x, q.y, rad, 0, 7);
      ctx2.fillStyle = on ? '#fffbe6' : part ? `rgba(255,214,107,${0.45 + 0.5 * q.f})` : `rgba(160,175,205,${0.25 + 0.35 * depth})`;
      ctx2.fill();
      hits.push({ n: q.n, z: q.z, x0: q.x - rad - 5, x1: q.x + rad + 5, y0: q.y - rad - 5, y1: q.y + rad + 5, k: q });
      if (part) { ctx2.beginPath(); ctx2.arc(q.x, q.y, rad + 2, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * q.f); ctx2.strokeStyle = '#ffd66b'; ctx2.lineWidth = 1.4; ctx2.stroke(); }
      // T095: repeated in the tekrar mode — a blue ring (full when the whole surah was repeated)
      const hf = hifz ? hifz[q.n - 1] || 0 : 0;
      if (hf > 0) {
        if (hf >= 1) { const gb = ctx2.createRadialGradient(q.x, q.y, 0, q.x, q.y, rad * 3); gb.addColorStop(0, 'rgba(143,211,255,.45)'); gb.addColorStop(1, 'rgba(143,211,255,0)'); ctx2.fillStyle = gb; ctx2.beginPath(); ctx2.arc(q.x, q.y, rad * 3, 0, 7); ctx2.fill(); }
        ctx2.beginPath(); ctx2.arc(q.x, q.y, rad + 3.6, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.min(1, hf)); ctx2.strokeStyle = '#8FD3FF'; ctx2.lineWidth = hf >= 1 ? 2 : 1.3; ctx2.stroke();
      }
      // names: front half, or always for read surahs and the hovered one
      if (q.z > 3 || (on && q.z > -12) || q.n === hover) {
        const s = core.suras[q.n - 1];
        const fs = Math.max(9, Math.min(15, 10.5 * q.p * S / 7));
        ctx2.font = `${on ? 600 : 400} ${fs}px Amiri, 'Noto Naskh Arabic', serif`;
        ctx2.fillStyle = on ? `rgba(255,236,170,${0.6 + 0.4 * depth})` : `rgba(220,228,245,${0.25 + 0.55 * depth})`;
        const label = lang === 'ar' ? s.ar : s.tr, ly = q.y - rad - fs * 0.75, lw = ctx2.measureText(label).width;
        ctx2.fillText(label, q.x, ly);
        // the name belongs to its own light: clicking the name opens that surah, not the closest dot
        hits.push({ n: q.n, z: q.z + 0.01, x0: q.x - lw / 2 - 2, x1: q.x + lw / 2 + 2, y0: ly - fs * 0.6, y1: ly + fs * 0.6, k: q });
      }
    }
    raf = requestAnimationFrame(draw);
  };
  // what is under the pointer: the last thing drawn there (front-most light or name), as it was drawn
  const at = (ev) => {
    const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h.k; }
    return null;
  };
  const showTip = (q, ev) => {
    if (!q) { tip.hidden = true; hover = -1; return; }
    hover = q.n;
    const s = core.suras[q.n - 1];
    tip.innerHTML = `<b>${esc(lang === 'ar' ? s.ar : s.tr)}</b> · ${esc(T.tipLine(s.n, s.order, s.ayas, s.type, Math.round(100 * q.f)))}`;
    const r = root.getBoundingClientRect();
    tip.style.left = Math.min(r.width - 220, Math.max(8, ev.clientX - r.left + 12)) + 'px';
    tip.style.top = Math.max(8, ev.clientY - r.top - 36) + 'px';
    tip.hidden = false;
  };
  const setZoom = (z) => { zoom = Math.max(0.6, Math.min(3.5, z)); resize(); };
  cv.addEventListener('pointerdown', (ev) => {
    pinch.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    drag = { x: ev.clientX, y: ev.clientY, rot, tilt, moved: pinch.size > 1, pick: at(ev) };
    cv.setPointerCapture(ev.pointerId);
  });
  cv.addEventListener('pointermove', (ev) => {
    if (pinch.has(ev.pointerId) && pinch.size === 2) {
      const [a, b] = [...pinch.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y);
      pinch.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const [c, e] = [...pinch.values()], d1 = Math.hypot(c.x - e.x, c.y - e.y);
      if (d0 > 0) setZoom(zoom * d1 / d0);
      if (drag) drag.moved = true;
      return;
    }
    if (drag) {
      const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      rot = drag.rot + dx * 0.01; tilt = Math.max(-0.7, Math.min(0.9, drag.tilt + dy * 0.006));
    } else { const q = at(ev); over = !!q; showTip(q, ev); }
  });
  cv.addEventListener('pointerup', (ev) => {
    pinch.delete(ev.pointerId);
    const d = drag; drag = null;
    if (ev.pointerType !== 'mouse') showTip(null);
    // the surah under the finger when it went DOWN (the lamp may have turned a little since)
    if (d && !d.moved) { const q = d.pick || at(ev); if (q) { close(); onPick && onPick(q.n); } }
  });
  cv.addEventListener('pointercancel', (ev) => { pinch.delete(ev.pointerId); drag = null; });
  cv.addEventListener('pointerleave', () => { over = false; showTip(null); });
  cv.addEventListener('wheel', (ev) => { ev.preventDefault(); setZoom(zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });
  root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    const c = b.dataset.c;
    if (c === 'speed') { speedK = (speedK + 1) % SPEEDS.length; auto = true; b.querySelector('b').textContent = SPEEDS[speedK] ? '×' + SPEEDS[speedK] : '⏸'; }
    else if (c === 'up') tilt = Math.max(-0.7, tilt - 0.15);
    else if (c === 'down') tilt = Math.min(0.9, tilt + 0.15);
    else if (c === 'in') setZoom(zoom * 1.25);
    else if (c === 'out') setZoom(zoom / 1.25);
    else { zoom = 1; tilt = 0.18; rot = 0; panY = 0; resize(); }
  });
  cv.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') rot -= 0.2; else if (ev.key === 'ArrowRight') rot += 0.2;
    else if (ev.key === 'ArrowUp') tilt = Math.max(-0.7, tilt - 0.15); else if (ev.key === 'ArrowDown') tilt = Math.min(0.9, tilt + 0.15);
    else if (ev.key === '+' || ev.key === '=') setZoom(zoom * 1.25); else if (ev.key === '-') setZoom(zoom / 1.25);
    else if (ev.key === ' ') { auto = !auto; ev.preventDefault(); }
  });
  root.querySelectorAll('[data-order]').forEach(b => b.onclick = () => {
    order = b.dataset.order;
    ord = orderSuras(core.suras, order); pos = layout(ord.length);
    root.querySelectorAll('[data-order]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    onOrder && onOrder(order);
  });
  const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
  const close = () => {
    if (!alive) return;
    alive = false; cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize); document.removeEventListener('keydown', onKey, true);
    root.remove(); onClose && onClose();
  };
  root.querySelector('.lm-close').onclick = close;
  window.addEventListener('resize', resize);
  document.addEventListener('keydown', onKey, true);
  resize(); draw();
  cv.focus();
  return { close };
}
