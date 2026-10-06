// The light of the month — the visitor's worship of this month brightens the logo.
//
// Each completed act sends a ray of light from where it happened to the lamp of the logo, and the lamp keeps a
// little more light until the end of the month. The share of each act in the full light:
//
//   reading the Quran (verses read this month, out of the whole Quran)   60 %
//   listening to the recitation (minutes heard, goal 120 min)             10 %
//   memorising (verses repeated to the end in «التكرار», goal 100)        10 %
//   tasbih and dhikr (counts, goal 3,000 — about 100 a day)               10 %
//   the Most Beautiful Names (names heard or learnt, goal 99)             10 %
//
// Everything stays in this browser (prefs.glow) and starts again on the first day of each month.
// Pure functions first (the tests import them), then the drawing.
import { monthKey } from './progress.js';

export const SHARES = { read: 0.60, listen: 0.10, hifz: 0.10, tasbih: 0.10, asma: 0.10 };
export const GOALS = { listen: 120 * 60, hifz: 100, tasbih: 3000, asma: 99 };

// this month's record, new when the month changes
export function glowOf(P, now = new Date()) {
  const m = monthKey(now);
  if (!P.glow || P.glow.month !== m) P.glow = { month: m, listenSec: 0, tasbih: 0, asma: [] };
  return P.glow;
}

// what each act adds (the reading and memorising parts are read from the monthly bits kept by progress.js)
export function addListen(P, seconds, now) { const g = glowOf(P, now); g.listenSec += Math.max(0, Math.min(600, seconds || 0)); }
export function addTasbih(P, n = 1, now) { glowOf(P, now).tasbih += n; }
export function addName(P, n, now) {
  const g = glowOf(P, now);
  if (g.asma.includes(n)) return false;
  g.asma.push(n);
  return true;
}

// the parts, each between 0 and 1, and the total light between 0 and 1
export function glowLevel(P, monthPct, now = new Date()) {
  const g = glowOf(P, now);
  const m = monthPct(P, now);
  const parts = {
    read: Math.min(1, m.read / 100),
    listen: Math.min(1, g.listenSec / GOALS.listen),
    hifz: Math.min(1, (m.hifz / 100) * 6236 / GOALS.hifz),
    tasbih: Math.min(1, g.tasbih / GOALS.tasbih),
    asma: Math.min(1, g.asma.length / GOALS.asma),
  };
  const total = Object.entries(SHARES).reduce((s, [k, w]) => s + w * parts[k], 0);
  return { parts, total };
}

// ---------------------------------------------------------------- drawing

// the logo that receives the light: the big lamp beside the galaxy when it is on screen, otherwise the one in the header
function target() {
  const big = document.querySelector('#lampSlot');
  if (big && big.offsetParent) {
    const r = big.getBoundingClientRect();
    if (r.width && r.bottom > 0 && r.top < innerHeight) return big;
  }
  return document.querySelector('#top .brand img');
}

// the logo's brightness: the lamp keeps its own drawing and gains light and a golden halo
export function paintGlow(level) {
  const g = Math.max(0, Math.min(1, level));
  document.documentElement.style.setProperty('--glow', g.toFixed(3));
}

let lastRay = 0;
// a ray of light from an element (or a point) to the logo; `strong` for a completed surah, khatma or count
export function ray(from, { strong = false } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const now = performance.now();
  if (!strong && now - lastRay < 1200) return;         // one ray at a time for frequent acts (verse after verse)
  lastRay = now;
  const to = target();
  if (!to || !from) return;
  const a = from.getBoundingClientRect ? from.getBoundingClientRect() : { left: from.x, top: from.y, width: 0, height: 0 };
  const b = to.getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 20) return;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'glow-ray');
  svg.setAttribute('aria-hidden', 'true');
  // a gentle curve, bending away from the straight line
  const mx = (x0 + x1) / 2 - (y1 - y0) * 0.18, my = (y0 + y1) / 2 + (x1 - x0) * 0.18;
  const d = `M${x0},${y0} Q${mx},${my} ${x1},${y1}`;
  svg.innerHTML = `<defs><linearGradient id="grg" gradientUnits="userSpaceOnUse" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}">
      <stop offset="0" stop-color="#fff6c8" stop-opacity="0"/><stop offset=".7" stop-color="#ffd27a"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
    <path d="${d}" class="gr-trail" stroke="url(#grg)" stroke-width="${strong ? 4 : 2.5}" fill="none" stroke-linecap="round"/>
    <circle r="${strong ? 7 : 5}" class="gr-head"><animateMotion dur="0.9s" fill="freeze" path="${d}" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".4 0 .2 1"/></circle>`;
  document.body.appendChild(svg);
  const trail = svg.querySelector('.gr-trail');
  const L = trail.getTotalLength();
  trail.style.strokeDasharray = `${L * 0.35} ${L}`;
  trail.animate([{ strokeDashoffset: L * 0.35 }, { strokeDashoffset: -L }], { duration: 900, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  setTimeout(() => {
    to.classList.remove('glow-hit'); void to.offsetWidth; to.classList.add('glow-hit');
    setTimeout(() => to.classList.remove('glow-hit'), 900);
  }, 850);
  setTimeout(() => svg.remove(), 1300);
}
