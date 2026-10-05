// T096 — the visitor's engagement as a small 3D world in the style of the galaxy: three luminous terraces, one per
// level (غرسة مباركة · زيتونة مباركة · كوكب دري — names from the verse of light, all positive), the last 28 days as
// beads of light spiralling up, and the visitor as a glowing star placed at their level. A tiny pseudo-3D version
// (2D canvas, no WebGL) reminds the visitor of their level once a day, and lives in the top bar as a button.
// Data: js/progress.js (this browser only).
import { LEVELS } from './progress.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LEVEL_COLORS = ['#7FE0A8', '#B8E07A', '#FFD66B'];       // sapling green · olive · golden star
const RADII = [5.2, 3.8, 2.4], HEIGHTS = [0, 2.6, 5.2];

export const EG = {
  ar: { title: 'خريطة التزامك', close: 'إغلاق', level: 'مستواك', points: 'نقاط الالتزام (آخر ٢٨ يومًا)', days: 'أيام نشيطة', minutes: 'دقائق تكرار', units: 'وحدات حفظ', verses: 'آيات مقروءة',
    score: 'علامتك', monthRead: 'قراءة هذا الشهر', monthHifz: 'حفظ وتكرار هذا الشهر', khatmas: 'الختمات', week: 'هذا الأسبوع', weekRead: 'قراءة', weekTk: 'تكرار',
    next: (n, name) => `بقي ${n} نقطة لتبلغ «${name}»`, top: 'بلغت أعلى مستوى — نور على نور', hint: 'اسحب للتدوير · كل حبّة ضوء على الدرج الحلزوني يوم من أيامك الأخيرة، تكبر بقدر نشاطك', canvas: 'خريطة ثلاثية الأبعاد لالتزامك',
    remind: (name) => `مستواك اليوم: «${name}» — بارك الله في وقتك`, open: 'افتح خريطة التزامك', private: 'تُحسب في متصفحك فقط، ولا تُرسل إلى أي خادم.' },
  en: { title: 'Your engagement map', close: 'Close', level: 'Your level', points: 'Engagement points (last 28 days)', days: 'Active days', minutes: 'Repetition minutes', units: 'Memorising units', verses: 'Verses read',
    score: 'Your mark', monthRead: 'Read this month', monthHifz: 'Repeated this month', khatmas: 'Khatmas', week: 'This week', weekRead: 'Reading', weekTk: 'Repetition',
    next: (n, name) => `${n} points to reach “${name}”`, top: 'You reached the highest level — light upon light', hint: 'Drag to turn · each bead of light on the spiral is one of your recent days, larger when you did more', canvas: '3D map of your engagement',
    remind: (name) => `Your level today: “${name}” — may Allah bless your time`, open: 'Open your engagement map', private: 'Computed in your browser only, never sent to any server.' },
};

// the visitor's height on the terraces: level 1..3 plus the progress inside it
const starPos = (eng) => { const k = eng.level - 1, h0 = HEIGHTS[k], h1 = k < 2 ? HEIGHTS[k + 1] : HEIGHTS[2] + 1.6; return h0 + (h1 - h0) * eng.within * 0.9 + 0.5; };

// ------------------------------------------------------------------ the tiny version (2D canvas, pseudo 3D)
export function drawMini(cv, eng, t = 0) {
  const ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || 44, h = cv.clientHeight || 44;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const cx = w / 2, base = h * 0.84, sc = w / 13, tilt = 0.32;
  for (let k = 0; k < 3; k++) {
    const on = k < eng.level, y = base - HEIGHTS[k] * sc * 0.95, r = RADII[k] * sc;
    ctx.beginPath(); ctx.ellipse(cx, y, r, r * tilt, 0, 0, Math.PI * 2);
    ctx.strokeStyle = on ? LEVEL_COLORS[k] : 'rgba(170,185,215,.28)'; ctx.lineWidth = on ? 1.6 : 1; ctx.stroke();
    // a few points turning on the ring
    for (let j = 0; j < 6; j++) { const a = t * 0.0012 * (k % 2 ? -1 : 1) + j * Math.PI / 3; ctx.beginPath(); ctx.arc(cx + r * Math.cos(a), y + r * tilt * Math.sin(a), on ? 1.3 : 0.8, 0, 7); ctx.fillStyle = on ? LEVEL_COLORS[k] : 'rgba(170,185,215,.35)'; ctx.fill(); }
  }
  const sy = base - starPos(eng) * sc * 0.95, g = ctx.createRadialGradient(cx, sy, 0, cx, sy, sc * 2.4);
  g.addColorStop(0, 'rgba(255,248,220,1)'); g.addColorStop(0.35, LEVEL_COLORS[eng.level - 1]); g.addColorStop(1, 'rgba(255,214,107,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, sy, sc * 2.4, 0, 7); ctx.fill();
}
export function animateMini(cv, getEng) {
  let raf = 0, alive = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop = (ts) => { if (!alive || !cv.isConnected) return; drawMini(cv, getEng(), ts); if (!reduced) raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  return () => { alive = false; cancelAnimationFrame(raf); };
}

// ------------------------------------------------------------------ the full map (three.js)
// info: { eng, score, month: { read, hifz }, khatmas, week }
export async function openEngageMap({ lang = 'ar', info, digits = String, onClose }) {
  const T = EG[lang] || EG.ar, LV = LEVELS[lang] || LEVELS.ar, eng = info.eng;
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/OrbitControls.js');
  document.getElementById('engMap')?.remove();
  const root = document.createElement('div');
  root.id = 'engMap'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', T.title);
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  const lv = LV[eng.level - 1], nextName = eng.level < 3 ? LV[eng.level].name : null;
  const pct = (x) => digits(x < 10 ? x.toFixed(1) : Math.round(x)) + (lang === 'ar' ? '٪' : '%');
  root.innerHTML = `<div class="lm-head"><h2>${esc(T.title)}</h2><p class="lm-sum">${esc(T.private)}</p><button type="button" class="lm-close" aria-label="${esc(T.close)}">✕</button></div>
    <div class="eg-main"><canvas class="lm-canvas" tabindex="0" aria-label="${esc(T.canvas)}"></canvas><div class="eg-labels" aria-hidden="true"></div>
    <aside class="eg-card"><div class="eg-lv" style="--c:${LEVEL_COLORS[eng.level - 1]}"><small>${esc(T.level)}</small><b>${esc(lv.name)}</b><p>${esc(lv.desc)}</p></div>
      <div class="eg-bar"><i style="width:${(100 * eng.within).toFixed(0)}%;background:${LEVEL_COLORS[eng.level - 1]}"></i></div>
      <p class="p-small">${esc(nextName ? T.next(digits(Math.max(1, Math.ceil([0, 30, 90][eng.level] - eng.points))), nextName) : T.top)}</p>
      <dl class="k-stats"><div><dt>${esc(T.score)}</dt><dd>${esc(digits(info.score.toFixed(1)))}/${esc(digits(10))}</dd></div><div><dt>${esc(T.points)}</dt><dd>${esc(digits(eng.points))}</dd></div>
        <div><dt>${esc(T.days)}</dt><dd>${esc(digits(eng.activeDays))}</dd></div><div><dt>${esc(T.minutes)}</dt><dd>${esc(digits(eng.minutes))}</dd></div>
        <div><dt>${esc(T.units)}</dt><dd>${esc(digits(eng.units))}</dd></div><div><dt>${esc(T.verses)}</dt><dd>${esc(digits(eng.verses))}</dd></div>
        <div><dt>${esc(T.monthRead)}</dt><dd>${esc(pct(info.month.read))}</dd></div><div><dt>${esc(T.monthHifz)}</dt><dd>${esc(pct(info.month.hifz))}</dd></div>
        <div><dt>${esc(T.khatmas)}</dt><dd>${esc(digits(info.khatmas))}</dd></div></dl>
      <div class="wk"><span>${esc(T.weekRead)} ${esc(digits(info.week.read))}/${esc(digits(info.week.readGoal))}</span><i style="--f:${info.week.readF.toFixed(3)}"></i></div>
      <div class="wk tk"><span>${esc(T.weekTk)} ${esc(digits(info.week.ayas))}/${esc(digits(info.week.tkGoal))}</span><i style="--f:${info.week.tkF.toFixed(3)}"></i></div></aside></div>
    <p class="lm-legend">${LV.map((l, k) => `<span class="lg" style="background:${LEVEL_COLORS[k]}"></span>${esc(l.name)}`).join(' ')} · ${esc(T.hint)}</p>`;
  document.body.appendChild(root);
  const cv = root.querySelector('canvas'), labels = root.querySelector('.eg-labels');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(9, 7.5, 12);
  const controls = new OrbitControls(camera, cv);
  controls.target.set(0, 2.6, 0); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 7; controls.maxDistance = 30;
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed = 0.6;
  // soft round point sprite (the same luminous dots as the galaxy)
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const pts = (positions, colors, size) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  };
  // stars far away
  { const p = [], c = []; for (let k = 0; k < 900; k++) { const r = 40 + Math.random() * 40, a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1); p.push(r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)); const v = 0.35 + Math.random() * 0.4; c.push(v, v, v * 1.1); } scene.add(pts(p, c, 0.35)); }
  // the three terraces: rings of light points (bright when reached)
  const ringGroup = new THREE.Group(); scene.add(ringGroup);
  const col = (hex) => new THREE.Color(hex);
  for (let k = 0; k < 3; k++) {
    const on = k < eng.level, c0 = col(LEVEL_COLORS[k]), p = [], c = [];
    const n = 220 - k * 50;
    for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2, r = RADII[k] + (Math.random() - 0.5) * 0.25; p.push(r * Math.cos(a), HEIGHTS[k] + (Math.random() - 0.5) * 0.12, r * Math.sin(a)); const f = on ? 1 : 0.25; c.push(c0.r * f, c0.g * f, c0.b * f); }
    ringGroup.add(pts(p, c, on ? 0.22 : 0.14));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(RADII[k], 64), new THREE.MeshBasicMaterial({ color: c0, transparent: true, opacity: on ? 0.07 : 0.025, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = HEIGHTS[k]; scene.add(disc);
  }
  // the last 28 days: beads of light on a spiral that climbs the terraces (oldest at the bottom); a bead is larger
  // and brighter when the day was more active, a faint dot when it was quiet — no vertical bars any more
  { const p = [], c = [];
    eng.daily.forEach((v, d) => {
      const t = d / 27, a = t * Math.PI * 4.2, r = RADII[0] - (RADII[0] - RADII[2]) * t + 0.9, y0 = t * HEIGHTS[2] + 0.15;
      const cx = r * Math.cos(a), cz = r * Math.sin(a), cc = v > 0 ? col(LEVEL_COLORS[Math.min(2, Math.floor(t * 3))]) : col('#5a6a8a');
      const n = v > 0 ? 6 + Math.round(v * 14) : 1, rad = v > 0 ? 0.05 + v * 0.16 : 0;
      for (let k = 0; k < n; k++) {
        const u = k * 2.39996, w = Math.acos(1 - 2 * ((k + 0.5) / n));   // golden-angle points on a small sphere
        p.push(cx + rad * Math.sin(w) * Math.cos(u), y0 + rad * Math.cos(w), cz + rad * Math.sin(w) * Math.sin(u));
        const f = v > 0 ? 0.7 + 0.3 * v : 0.35; c.push(cc.r * f, cc.g * f, cc.b * f);
      }
    });
    scene.add(pts(p, c, 0.2)); }
  // the spiral path itself, a thin dotted line joining the days
  { const p = [], c = []; for (let k = 0; k <= 540; k++) { const t = k / 540, a = t * Math.PI * 4.2, r = RADII[0] - (RADII[0] - RADII[2]) * t + 0.9; p.push(r * Math.cos(a), t * HEIGHTS[2] + 0.15, r * Math.sin(a)); c.push(0.22, 0.24, 0.3); } scene.add(pts(p, c, 0.06)); }
  // the visitor's star
  const sy = starPos(eng);
  const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: col(LEVEL_COLORS[eng.level - 1]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  star.position.set(0, sy, 0); star.scale.set(2.4, 2.4, 1); scene.add(star);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  core.position.copy(star.position); core.scale.set(0.9, 0.9, 1); scene.add(core);
  // (no vertical thread from the ground: the star floats above its terrace)
  // HTML labels of the terraces, placed every frame
  labels.innerHTML = LV.map((l, k) => `<span class="eg-l${k < eng.level ? ' on' : ''}" style="--c:${LEVEL_COLORS[k]}">${esc(l.name)}</span>`).join('');
  const lab = [...labels.children];
  const resize = () => { const r = cv.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
  let alive = true, raf = 0;
  const v3 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const loop = (ts) => {
    if (!alive) return;
    controls.update();
    const pulse = 1 + 0.08 * Math.sin(ts * 0.003); star.scale.set(2.4 * pulse, 2.4 * pulse, 1);
    ringGroup.rotation.y += 0.0015;
    renderer.render(scene, camera);
    const r = cv.getBoundingClientRect();
    lab.forEach((el, k) => { v3.set(RADII[k] + 0.4, HEIGHTS[k], 0).applyAxisAngle(UP, Math.atan2(camera.position.x, camera.position.z)).project(camera);   // the ring's right edge as seen by the camera
      const x = Math.max(4, Math.min(r.width - el.offsetWidth - 4, (v3.x + 1) / 2 * r.width - el.offsetWidth / 2));   // always inside the view
      el.style.transform = `translate(${x.toFixed(1)}px, ${((1 - v3.y) / 2 * r.height - 12).toFixed(1)}px)`; });
    raf = requestAnimationFrame(loop);
  };
  const onKey = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
  const close = () => { if (!alive) return; alive = false; cancelAnimationFrame(raf); controls.dispose(); renderer.dispose(); window.removeEventListener('resize', resize); document.removeEventListener('keydown', onKey, true); root.remove(); onClose && onClose(); };
  root.querySelector('.lm-close').onclick = close;
  window.addEventListener('resize', resize);
  document.addEventListener('keydown', onKey, true);
  resize(); raf = requestAnimationFrame(loop);
  root.querySelector('.lm-close').focus();
  return { close };
}
