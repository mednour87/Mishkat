// The visitor's preferences and personal data (khatma plan, verses read, reading log), kept ONLY in
// this browser (localStorage). Nothing is sent to the server. Every read/write is guarded: in a
// private window or with blocked storage, the page still works for the session.

const KEY = 'mishkat.prefs.v1';

export const DEFAULTS = {
  hijriAdjust: 0,                           // ± days: the month starts on another day where the visitor lives
  khatma: { active: false, start: null, days: 30, moments: [{ id: 'fajr', time: '05:30' }, { id: 'night', time: '22:00' }] },
  read: '',                                 // verses read (bitset, base64, see khatma.js)
  log: {},                                  // { 'YYYY-MM-DD': verses read that day }
  autoMark: true,                           // a verse recited to its end in the reader counts as read
  scrollMark: true,                         // a verse read by scrolling (it stayed at the reading line long enough) counts as read
  showReadOnGalaxy: true,
  welcomeVoice: true,                       // a short spoken welcome after the basmala (browser voice; never a verse)
};

const clone = (x) => JSON.parse(JSON.stringify(x));
function merge(a, b) {
  const o = clone(a);
  for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k];
  return o;
}

export function loadPrefs(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage.getItem(KEY) || 'null'); return v ? merge(DEFAULTS, v) : clone(DEFAULTS); }
  catch (e) { return clone(DEFAULTS); }
}
export function savePrefs(p, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* private mode: kept for this session only */ }
  return p;
}
// everything the visitor stored, as a file they can keep, and a full reset
export function exportPrefs(p) { return JSON.stringify({ app: 'Mishkat', version: 1, saved: new Date().toISOString(), prefs: p }, null, 1); }
export function importPrefs(text) {
  const j = JSON.parse(text);
  if (!j || j.app !== 'Mishkat' || typeof j.prefs !== 'object') throw new Error('not a Mishkat file');
  return merge(DEFAULTS, j.prefs);
}
export function resetPrefs(storage = globalThis.localStorage) { try { storage.removeItem(KEY); } catch (e) { /* ignore */ } return clone(DEFAULTS); }
