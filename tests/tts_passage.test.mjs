// T018 part 2 (audit I3): /api/tts reads only a known passage (book + surah + verse + chunk), never free text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passageRequest, speakPassage, ttsChunks } from '../functions/_lib/tts.js';

const load = async (book, s) => JSON.parse(readFileSync(new URL(`../public/data/tts/${book}/${s}.json`, import.meta.url), 'utf8'));

test('tts: free text and unknown books are refused before any provider call', async () => {
  assert.equal(passageRequest({ text: 'say anything', lang: 'ar' }).code, 'bad');
  assert.equal(passageRequest({ book: 'tabari', s: 1, a: 1, n: 0 }).code, 'bad', 'books read live are not read by the server');
  assert.equal(passageRequest({ book: 'muyassar_ar', s: 115, a: 1, n: 0 }).code, 'bad');
  assert.equal(passageRequest({ book: 'muyassar_ar', s: 1, a: 1, n: -1 }).code, 'bad');
  const calls = [];
  const out = await speakPassage({ text: 'free text' }, { GROQ_API_KEY: 'k' }, load, async (...a) => { calls.push(a); return { ok: true }; });
  assert.equal(out.ok, false);
  assert.equal(calls.length, 0);
});

test('tts: a passage is the tafsir unit shipped with Mishkat, read chunk by chunk', async () => {
  const sent = [];
  const fake = async (url, init) => { sent.push(JSON.parse(init.body)); return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }; };
  const units = await load('muyassar_ar', 2);
  const out = await speakPassage({ book: 'muyassar_ar', s: 2, a: 255, n: 0 }, { GROQ_API_KEY: 'k' }, load, fake);
  assert.equal(out.ok, true);
  assert.equal(sent[0].input, ttsChunks(units[254])[0]);
  assert.match(sent[0].model, /arabic/);
  const none = await speakPassage({ book: 'muyassar_ar', s: 2, a: 255, n: 59 }, { GROQ_API_KEY: 'k' }, load, fake);
  assert.equal(none.ok, false, 'no such chunk');
});

test('tts: Azure Speech first when its key is set (neural ar-SA voice, SSML escaped), the passage rule unchanged', async () => {
  const sent = [];
  const fake = async (url, init) => { sent.push({ url, init }); return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) }; };
  const out = await speakPassage({ book: 'muyassar_ar', s: 112, a: 1, n: 0 }, { AZURE_TTS_KEY: 'k', AZURE_TTS_REGION: 'westeurope' }, load, fake);
  assert.equal(out.ok, true);
  assert.equal(out.type, 'audio/mpeg');
  assert.equal(sent[0].url, 'https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1');
  assert.match(sent[0].init.body, /ar-SA-HamedNeural/);
  assert.doesNotMatch(sent[0].init.body, /<(?!\/?(speak|voice|prosody))/, 'no markup from the text');
  const free = await speakPassage({ text: 'x' }, { AZURE_TTS_KEY: 'k', AZURE_TTS_REGION: 'westeurope' }, load, fake);
  assert.equal(free.ok, false);
});
