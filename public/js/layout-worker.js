// Shapes of the galaxy computed off the main thread (js/layouts.js), so that a change of shape — even while a
// verse is recited — never freezes the page. «قرآن» needs its letters rasterised: the page sends the raster once.
import { buildLayout } from './layouts.js';
import { contourPath } from './letters3d.js';

let wordVerse = null, suras = null, words = null, quranPath = null;
self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.init) { wordVerse = m.wordVerse; suras = m.suras; return; }
  try {
    if (m.words) words = m.words;
    if (m.raster && !quranPath) quranPath = contourPath(m.raster, m.W, m.H);
    const lay = await buildLayout({ shape: m.shape, order: m.order, wordVerse, suras, words, quranPath });
    const transfer = [lay.positions.buffer];
    if (lay.spine) transfer.push(lay.spine.buffer);
    self.postMessage({ id: m.id, positions: lay.positions, spine: lay.spine || null, view: lay.view, note: lay.note }, transfer);
  } catch (e) {
    self.postMessage({ id: m.id, error: String(e && e.message || e) });
  }
};
