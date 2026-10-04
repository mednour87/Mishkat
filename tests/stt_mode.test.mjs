// T040–T041: Whisper large-v3-turbo with a vocabulary prompt by context; «recite» mode forces Arabic and a
// Quran prompt. The transcript of a recitation is only a QUOTATION to check against the Mushaf.
import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribe } from '../functions/_lib/selector.js';
import { loadEngine } from './load.mjs';

const fake = (seen) => async (url, init) => {
  seen.push(Object.fromEntries(init.body.entries()));
  return { ok: true, json: async () => ({ text: 'الحمد لله رب العالمين الرحمن الرحيم', segments: [{ text: 'الحمد لله رب العالمين الرحمن الرحيم', avg_logprob: -0.2, no_speech_prob: 0.01 }] }) };
};
const blob = new Blob([new Uint8Array(400)], { type: 'audio/webm' });

test('stt: turbo model, Arabic search prompt names surahs and terms; recite mode = Arabic + Quran prompt', async () => {
  const seen = [];
  const a = await transcribe(blob, 'ar', { GROQ_API_KEY: 'k' }, fake(seen));
  assert.equal(a.ok, true);
  assert.equal(seen[0].model, 'whisper-large-v3-turbo');
  assert.match(seen[0].prompt, /الكهف/);
  const b = await transcribe(blob, 'en', { GROQ_API_KEY: 'k' }, fake(seen), 'recite');
  assert.equal(b.ok, true);
  assert.equal(seen[1].language, 'ar', 'a recitation is Arabic whatever the interface language');
  assert.match(seen[1].prompt, /بسم الله الرحمن الرحيم/);
});

test('recite: the transcript is checked against the Mushaf as a quotation', async () => {
  const { engine: E } = loadEngine();
  const r = await E.ask('«الحمد لله رب العالمين الرحمن الرحيم»', { uiLang: 'ar' });
  assert.equal(r.type, 'verify');
  assert.ok(['exact', 'near'].includes(r.verdict));
  assert.ok(r.verses.some(v => v.ref === '1:2'));
  const no = await E.ask('«ربنا آتنا في الحاسوب حسنة وفي الهاتف حسنة»', { uiLang: 'ar' });
  assert.notEqual(no.verdict, 'exact', 'altered wording is never confirmed as a verse');
});
