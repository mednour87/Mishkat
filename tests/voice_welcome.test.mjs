// T042 (end): the Arabic welcome is a shipped MP3 of the hand-written sentence (Groq Orpheus, generated once);
// the gate accepts once (the welcome was heard twice: last letter typed + Enter); without a browser voice,
// «listen to the answer» reads only known tafsir passages through the server voice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const R = (p) => readFileSync(new URL('../' + p, import.meta.url));
const app = R('public/js/app.js').toString();

test('welcome_ar.mp3 is a small MP3 file', () => {
  const b = R('public/audio/welcome_ar.mp3');
  assert.ok(b.length > 5000 && b.length < 200000, 'size ' + b.length);
  assert.ok(b.slice(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0), 'MP3 header');
});

test('the welcome generator reads the hand-written sentence of i18n.js (no other text)', () => {
  const py = R('tools/make_welcome_audio.py').toString();
  assert.match(py, /welcomeSpoken/);
  assert.doesNotMatch(py, /core\.json|verses/);
});

test('the gate accepts the basmala only once', () => {
  const gate = app.slice(app.indexOf('function gate()'), app.indexOf('function gate()') + 1500);
  assert.match(gate, /if \(accepted\) return;/);
});

test('answer read by the server voice: only tafsir books shipped in public/data/tts, never a verse text', () => {
  const fn = app.slice(app.indexOf('async function answerPassages'), app.indexOf('let ansRun'));
  assert.match(fn, /data\/tts\/\$\{book\}/);
  assert.match(app, /const TTS_BOOK_IDS = \['muyassar_ar', 'mukhtasar_ar', 'mukhtasar_en'\]/);
  assert.doesNotMatch(fn, /e\.verses|engine\.verses/);
  for (const b of ['muyassar_ar', 'mukhtasar_ar', 'mukhtasar_en']) assert.ok(statSync(new URL(`../public/data/tts/${b}/1.json`, import.meta.url)).size > 0);
});
