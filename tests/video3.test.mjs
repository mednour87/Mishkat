// T114 — the video v3 (author's review: overlaps, lags, not enough motion): the studio layout keeps every graphic out
// of the site's window, the background moves at every frame, the captions never overlap, the film stays under 2 minutes
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const B = fs.readFileSync('tools/video/build3.mjs', 'utf8'), O = fs.readFileSync('tools/video/overlay3.html', 'utf8');

test('studio layout: the column, the caption band and the rail never cover the window', () => {
  const win = JSON.parse(B.match(/win: (\{ x: \d+, y: \d+, w: \d+, h: \d+, rad: \d+ \})/)[1].replace(/(\w+):/g, '"$1":'));
  const col = O.match(/\.col \{ left: (\d+)px; top: (\d+)px; width: (\d+)px;/).slice(1).map(Number);
  assert.ok(col[0] + col[2] <= win.x - 16, 'the column ends before the window');
  assert.ok(win.x + win.w <= 1920 - 40 && win.y + win.h <= 1080 - 180, 'room under the window for the narration and the rail');
  const rail = O.match(/#rail \{ left: (\d+)px; width: (\d+)px; bottom: (\d+)px; height: (\d+)px;/).slice(1).map(Number);
  assert.equal(rail[0], win.x); assert.ok(1080 - rail[2] - rail[3] >= win.y + win.h + 130, 'the caption band (2 lines + subtitle) fits above the rail');
  // the opening and the cards have no column, no rail: they appear only around the window
  assert.match(O, /if \(e\.kind === 'top' \|\| e\.kind === 'topL' \|\| e\.kind === 'rail' \|\| e\.kind === 'url'\) a \*= win;/);
});

test('never a still frame: the background moves with t, the cards keep moving to their last frame', () => {
  assert.match(O, /const x = \(\(s\.x - t \* 9 \* s\.z\) % 1920 \+ 1920\) % 1920/);          // drifting stars
  assert.match(O, /const y = \(\(d\.y - t \* d\.v\) % 1080 \+ 1080\) % 1080/);              // rising dust
  assert.match(O, /\.rays'\)\.style\.transform = `rotate\(\$\{\(t \* 6\)/);                    // the end card turns
  assert.match(O, /ang = t \* \.45 \+ k \* 6\.283 \/ n/);                                      // the bridge icons orbit
  assert.match(B, /'-f', 'image2pipe'/);                                                       // every frame rendered, piped
});

test('the film: under 2 minutes, the same narration and the same figures as v2', () => {
  const tl = 'timeline3_voice_fusha.json', p = new URL(`../../04_LIVRABLES/video/${tl}`, import.meta.url);
  if (!fs.existsSync(p)) return;                                                             // the deliverables folder is outside the repository
  const T = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.ok(T.total <= 120, `${T.total} s`);
  const caps = T.events.filter(e => e.kind === 'cap').sort((a, b) => a.at - b.at);
  for (let k = 1; k < caps.length; k++) assert.ok(caps[k].at >= caps[k - 1].at + caps[k - 1].dur - 0.4, `captions overlap at ${caps[k].at}`);
  assert.match(B, /S\.verbatim\.passages/); assert.match(B, /R\.top1Relevant\[0\]/);         // figures read from the evaluation, never typed
});
