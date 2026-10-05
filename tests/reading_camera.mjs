// Simulation of the reading camera of js/galaxy.js (readcam.js, 5 Oct): the aim glides towards the recited word
// (between the arm's middle curve and the word), frame by frame (24 frames a second, 0.5 s a word). Measures, while
// reading surah by surah:
//   • SYNC — how far the recited word is from the middle of the view, in half-views (1 = at the edge of the frame);
//   • REVERSALS — two consecutive half-second camera moves in opposite directions (angle > 120°), the back-and-forth
//     the eye feels.
import { verseDist, camStep, HALF } from '../public/js/readcam.js';

export function readingCamera(P, S, wordVerse, suraOfVerse, { fps = 24, perWord = 12 } = {}) {
  const N = wordVerse.length, vs = new Int32Array(6236).fill(-1), ve = new Int32Array(6236);
  for (let w = 0; w < N; w++) { if (vs[wordVerse[w]] < 0) vs[wordVerse[w]] = w; ve[wordVerse[w]] = w + 1; }
  const dt = 1 / fps, at = (A, w) => [A[w * 3], A[w * 3 + 1], A[w * 3 + 2]];
  let target = null, goal = null, dist = 60, curV = -1, sura = -1, win = null, last = null, frame = 0;
  let moves = 0, reversals = 0, sum = 0, n = 0, over = 0;
  for (let w = 0; w < N; w++) {
    const v = wordVerse[w], p = at(P, w), s = S ? at(S, w) : null;
    if (suraOfVerse[v] !== sura) {                       // a new surah: the camera starts on its first word
      sura = suraOfVerse[v]; target = p.slice(); goal = p.slice(); win = p.slice(); last = null; curV = -1;
    }
    if (v !== curV) { curV = v; dist = verseDist(P, S, vs[v], ve[v]); }
    for (let f = 0; f < perWord; f++, frame++) {
      const off = camStep(target, goal, p, s, dist, dt);
      sum += off; n++; if (off > 0.9) over++;
      if (frame % 12 === 11) {
        const m = [target[0] - win[0], target[1] - win[1], target[2] - win[2]], len = Math.hypot(...m);
        if (len > 0.02 * dist * HALF) {
          if (last) { const c = (m[0] * last[0] + m[1] * last[1] + m[2] * last[2]) / (len * Math.hypot(...last)); if (c < -0.5) reversals++; }
          moves++; last = m;
        }
        win = target.slice();
      }
    }
  }
  return { moves, reversals, rate: moves ? reversals / moves : 0, meanOff: sum / n, outRate: over / n };
}
