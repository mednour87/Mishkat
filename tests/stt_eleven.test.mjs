// T122 (6 Oct 2026): speech-to-text = ElevenLabs Scribe with Mishkat's vocabulary first, then Groq Whisper turbo,
// then Whisper large v3 — the next engine on an error or a 429; «صورة» heard for «سورة» in a surah question.
import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribe, fixTranscript } from '../functions/_lib/selector.js';
import { STT_TERMS } from '../functions/_lib/stt_terms.js';
import { readFileSync } from 'node:fs';

const blob = new Blob([new Uint8Array(400)], { type: 'audio/webm' });
const core = JSON.parse(readFileSync(new URL('../public/data/core.json', import.meta.url), 'utf8'));

test('stt vocabulary: the 114 surah names come from core.json, no character Scribe refuses', () => {
  assert.deepEqual(STT_TERMS.ar.slice(0, 114), core.suras.map(s => s.ar));
  for (const k of [...STT_TERMS.ar, ...STT_TERMS.en]) { assert.ok(k.length <= 40, k); assert.doesNotMatch(k, /["'’\[\]{}]/, k); }
});

test('stt: Scribe first with language and keyterms; recitation gets no keyterms', async () => {
  const seen = [];
  const fake = async (url, init) => { seen.push({ url, form: init.body, headers: init.headers }); return { ok: true, json: async () => ({ text: 'كم عدد آيات القرآن' }) }; };
  const a = await transcribe(blob, 'ar', { ELEVENLABS_API_KEY: 'e', GROQ_API_KEY: 'g' }, fake);
  assert.deepEqual(a, { ok: true, text: 'كم عدد آيات القرآن', via: 'scribe' });
  assert.match(seen[0].url, /elevenlabs\.io\/v1\/speech-to-text/);
  assert.equal(seen[0].form.get('model_id'), 'scribe_v2');
  assert.equal(seen[0].form.get('language_code'), 'ar');
  assert.ok(seen[0].form.getAll('keyterms').includes('الكهف'));
  await transcribe(blob, 'ar', { ELEVENLABS_API_KEY: 'e' }, fake, 'recite');
  assert.equal(seen[1].form.getAll('keyterms').length, 0);
});

test('stt: Scribe down or Whisper turbo rate-limited → the next engine answers', async () => {
  const calls = [];
  const fake = async (url, init) => {
    const who = /elevenlabs/.test(url) ? 'scribe' : init.body.get('model');
    calls.push(who);
    if (who === 'scribe') return { ok: false, status: 500, json: async () => ({}) };
    if (who === 'whisper-large-v3-turbo') return { ok: false, status: 429, json: async () => ({}) };
    return { ok: true, json: async () => ({ text: 'آيات الصبر', segments: [{ text: 'آيات الصبر', avg_logprob: -0.2, no_speech_prob: 0.01 }] }) };
  };
  const out = await transcribe(blob, 'ar', { ELEVENLABS_API_KEY: 'e', GROQ_API_KEY: 'g' }, fake);
  assert.deepEqual(out, { ok: true, text: 'آيات الصبر', via: 'whisper-large-v3' });
  assert.deepEqual(calls, ['scribe', 'whisper-large-v3-turbo', 'whisper-large-v3']);
  const none = await transcribe(blob, 'ar', { ELEVENLABS_API_KEY: 'e' }, async () => ({ ok: false, status: 401 }));
  assert.equal(none.ok, false);
});

test('stt: audio events and ghosts written by Scribe are removed', async () => {
  const fake = async () => ({ ok: true, json: async () => ({ text: '(موسيقى)' }) });
  assert.deepEqual(await transcribe(blob, 'ar', { ELEVENLABS_API_KEY: 'e' }, fake), { ok: true, text: '', via: 'scribe' });
});

test('stt: «صورة» → «سورة» only in a question about a surah', () => {
  assert.equal(fixTranscript('واش هي أول صورة نزلت؟', 'ar'), 'واش هي أول سورة نزلت؟');
  assert.equal(fixTranscript('تفسير صورة الكهف', 'ar'), 'تفسير سورة الكهف');
  assert.equal(fixTranscript('ما حكم تعليق الصورة في البيت', 'ar'), 'ما حكم تعليق الصورة في البيت');
  assert.equal(fixTranscript('الصورة', 'ar'), 'الصورة');
  assert.equal(fixTranscript('picture of surah', 'en'), 'picture of surah');
});
