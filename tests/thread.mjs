// The reading thread: walking the words in reading order (surah after surah of the sequence), measures how the
// path turns from one step to the next. reversals = steps that turn back (> 120°) — the back-and-forth the eye
// feels; sharp = steps that turn by more than 60°; jumps = steps longer than 12 × the median step (moves between
// surahs or between letters are allowed, they go forward).
export function threadStats(P, order, isBreak = () => false) {
  const steps = [];
  for (let k = 1; k < order.length; k++) {
    const a = order[k - 1] * 3, b = order[k] * 3;
    steps.push([P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2], isBreak(k)]);
  }
  const len = steps.map(s => Math.hypot(s[0], s[1], s[2])).sort((x, y) => x - y), med = len[len.length >> 1] || 1;
  let rev = 0, sharp = 0, n = 0, jumps = 0, turn = 0;
  for (let k = 1; k < steps.length; k++) {
    const s = steps[k], t = steps[k - 1];
    const ls = Math.hypot(s[0], s[1], s[2]), lt = Math.hypot(t[0], t[1], t[2]);
    if (s[3] || t[3] || ls < 1e-6 || lt < 1e-6) continue;
    if (ls > 12 * med) { jumps++; continue; }
    if (lt > 12 * med) continue;
    const c = (s[0] * t[0] + s[1] * t[1] + s[2] * t[2]) / (ls * lt), ang = Math.acos(Math.max(-1, Math.min(1, c)));
    n++; turn += ang;
    if (ang > 2 * Math.PI / 3) rev++;
    if (ang > Math.PI / 3) sharp++;
  }
  return { n, rev: rev / n, sharp: sharp / n, jumps, meanTurn: turn / n * 180 / Math.PI, median: med };
}
