// The reading camera (5 Oct): while a verse is recited, the view follows the recited word itself — smoothly.
// The previous rule followed the middle curve of the arm (the spine) and moved only when it passed 30 % of the
// half-view; but in the galaxy each verse is one helix turn AROUND that curve, so the recited word was on average
// 1.1 half-views from the centre — at the edge or out of the frame (author: «the word being read is not in sync
// with the camera»). Now:
//   • the distance shows the whole helix turn of the verse (measured on the words, not on the spine);
//   • the aim is a point between the spine and the word (MIX), filtered twice (no jolt from word to word, no
//     back-and-forth: the words advance in one direction);
//   • if the word drifts past BOOST of the half-view, the camera catches up faster.
// Pure functions on [x, y, z] arrays: galaxy.js uses them, tests/reading_camera.mjs simulates the whole Quran.
export const CAM = { mix: 0.4, a: 2.5, b: 3.5, boost: 0.55, kBoost: 8, fit: 1.2, minD: 34, maxD: 180 };
export const HALF = Math.tan(55 * Math.PI / 360);   // half of the vertical field of view (camera fov 55°)

// the reading distance of a verse: its words (P) around the middle of its spine (S, or the words)
export function verseDist(P, S, from, to, half = HALF) {
  const R = S || P, m = (from + to - 1) >> 1;
  const mx = R[m * 3], my = R[m * 3 + 1], mz = R[m * 3 + 2];
  let r = 0;
  for (let k = from; k < to; k++) r = Math.max(r, Math.hypot(P[k * 3] - mx, P[k * 3 + 1] - my, P[k * 3 + 2] - mz));
  return Math.min(CAM.maxD, Math.max(CAM.minD, r / half * CAM.fit + 8));
}

// one frame: goal and target ([x,y,z], changed in place) glide towards the recited word p (spine point s)
export function camStep(target, goal, p, s, dist, dt, half = HALF) {
  const k1 = 1 - Math.exp(-dt * CAM.a);
  for (let j = 0; j < 3; j++) { const src = s ? s[j] + (p[j] - s[j]) * CAM.mix : p[j]; goal[j] += (src - goal[j]) * k1; }
  const off = Math.hypot(p[0] - target[0], p[1] - target[1], p[2] - target[2]) / (dist * half);
  const k2 = 1 - Math.exp(-dt * (off > CAM.boost ? CAM.kBoost : CAM.b));
  for (let j = 0; j < 3; j++) target[j] += (goal[j] - target[j]) * k2;
  return off;
}
