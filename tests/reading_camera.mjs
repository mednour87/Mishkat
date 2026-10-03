// Simulation of the reading camera of js/galaxy.js (lookAtWord): the view stays still while the recited word is
// near its centre and moves to the word when it nears the edge. Counts, while reading surah by surah, the
// REVERSALS (two consecutive camera moves in opposite directions, angle > 120°) — the back-and-forth the eye feels.
export function readingCamera(P, wordVerse, suraOfVerse, { half = Math.tan(55 * Math.PI / 360) } = {}) {
  const N = wordVerse.length, vs = new Int32Array(6236).fill(-1), ve = new Int32Array(6236);
  for (let w = 0; w < N; w++) { if (vs[wordVerse[w]] < 0) vs[wordVerse[w]] = w; ve[wordVerse[w]] = w + 1; }
  const at = (w) => [P[w * 3], P[w * 3 + 1], P[w * 3 + 2]];
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  let moves = 0, reversals = 0, travel = 0, target = null, last = null, curV = -1, dist = 60, sura = -1;
  for (let w = 0; w < N; w++) {
    const v = wordVerse[w], p = at(w);
    if (suraOfVerse[v] !== sura) { sura = suraOfVerse[v]; target = p; last = null; curV = -1; continue; }   // a new surah: a new start
    if (v !== curV) {
      curV = v;
      const m = at((vs[v] + ve[v] - 1) >> 1);
      let r = 0; for (let k = vs[v]; k < ve[v]; k++) r = Math.max(r, d(at(k), m));
      dist = Math.min(110, Math.max(34, r / half * 1.15 + 8));
    }
    if (d(p, target) > 0.3 * dist * half) {                 // FOLLOW_SLACK of galaxy.js
      const mv = [p[0] - target[0], p[1] - target[1], p[2] - target[2]];
      const len = Math.hypot(...mv);
      if (last) { const c = (mv[0] * last[0] + mv[1] * last[1] + mv[2] * last[2]) / (len * Math.hypot(...last)); if (c < -0.5) reversals++; }
      moves++; travel += len; last = mv; target = p;
    }
  }
  return { moves, reversals, rate: moves ? reversals / moves : 0, travel };
}
