// Keep the phone's screen on while Mishkat is being used (5 Oct, author: «the phone screen goes off quickly, I have to
// unlock it again»). The Screen Wake Lock API holds the screen on:
//   • while a recitation, the presentation film or the repetition counter runs (busy()), however long;
//   • and for IDLE_MS after the last touch, key or scroll (reading by scrolling the Mushaf counts).
// After that the phone's own setting applies again (no battery drain when the phone is put down). The lock is lost
// when the page is hidden; it is asked again when the page comes back. Nothing happens where the API is missing.
export const IDLE_MS = 4 * 60 * 1000;

export function setupWake(busy = () => false, { nav = typeof navigator !== 'undefined' ? navigator : null, doc = typeof document !== 'undefined' ? document : null, now = () => performance.now() } = {}) {
  if (!nav || !doc || !('wakeLock' in nav)) return { active: () => false, tick() {} };
  let lock = null, asking = false, lastAct = now();
  const want = async () => {
    if (lock || asking || doc.visibilityState !== 'visible') return;
    asking = true;
    try {
      lock = await nav.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch (e) { lock = null; }   // refused (battery saver, not allowed): the phone's setting applies
    asking = false;
  };
  const tick = () => {
    if (busy() || now() - lastAct < IDLE_MS) want();
    else if (lock) { const l = lock; lock = null; l.release().catch(() => {}); }
  };
  const act = () => { lastAct = now(); if (!lock) want(); };
  for (const ev of ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart']) addEventListener(ev, act, { passive: true, capture: true });
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') act(); });
  setInterval(tick, 15000);
  want();
  return { active: () => !!lock, tick };
}
