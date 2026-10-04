// Phone layout (375 px), found on 4 Oct while taking the screenshots of the presentation:
//  - the nine tool icons pushed the language switch 69 px off screen → the dock scrolls sideways, the fixed
//    buttons never shrink;
//  - answer labels of the galaxy showed through the toolbar → the controls are obstacles for every label,
//    and an answer label with no free place is hidden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../public/css/app.css', import.meta.url), 'utf8');
const gal = readFileSync(new URL('../public/js/galaxy.js', import.meta.url), 'utf8');

test('phone header: the dock scrolls, the language/theme/about buttons keep their size', () => {
  const m = css.slice(css.indexOf('@media (max-width: 860px)'));
  assert.match(m, /#dock \{[^}]*overflow-x: auto/);
  assert.match(m, /\.hright > :not\(#dock\) \{ flex: 0 0 auto; \}/);
  assert.match(m, /\.hright \{[^}]*min-width: 0/);
});

test('galaxy labels keep out of the toolbar, the camera pad and the lamp', () => {
  assert.match(gal, /#gtools, :scope > #gcam, :scope > #lampDock/);
  assert.match(gal, /const boxes = \[\.\.\.controlBoxes\(\)\];/);
  assert.match(gal, /g\.el\.hidden = y == null;/);
});
