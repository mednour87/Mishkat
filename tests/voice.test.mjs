import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTranscript, transcribe } from '../functions/_lib/selector.js';

// Real questions are kept, in every language and script.
test('stt: genuine questions are kept (Arabic letters are not "punctuation")', () => {
  for (const [t, l] of [['الصبر', 'ar'], ['قصة يوسف', 'ar'], ['ما حكم الموسيقى؟', 'ar'], ['What about patience?', 'en'], ['what does the quran say about being patient', 'en']]) {
    assert.equal(cleanTranscript({ text: t }, l), t);
  }
});

// Text Whisper invents on silence or noise is dropped.
test('stt: ghosts, silence and prompt echo are dropped', () => {
  for (const [t, l] of [['ترجمة نانسي قنقر', 'ar'], ['موسيقى', 'ar'], ['you', 'en'], ['Thank you.', 'en'], ['...', 'en'],
    ['Sous-titrage ST\' 501', 'en'], ['Thanks for watching!', 'en'], ['سؤال عن القرآن الكريم: آية، سورة، تفسير', 'ar'], ['', 'ar']]) {
    assert.equal(cleanTranscript({ text: t }, l), '', t);
  }
});

test('stt: low-confidence / no-speech segments are removed', () => {
  const j = { segments: [{ text: ' الصبر', no_speech_prob: 0.1, avg_logprob: -0.3 }, { text: ' شيء', no_speech_prob: 0.9, avg_logprob: -1 }] };
  assert.equal(cleanTranscript(j, 'ar'), 'الصبر');
});

test('stt: language hint, prompt, real file extension; auto-detect retry when the language did not fit', async () => {
  const calls = [];
  const fake = async (url, { body }) => {
    calls.push({ lang: body.get('language'), prompt: body.get('prompt'), name: body.get('file').name });
    const text = calls.length === 1 ? 'xx' : 'What does the Quran say about patience?';
    const seg = calls.length === 1 ? { no_speech_prob: 0.1, avg_logprob: -2 } : { no_speech_prob: 0.01, avg_logprob: -0.2 };
    return { ok: true, json: async () => ({ text, segments: [{ text, ...seg }] }) };
  };
  const blob = new Blob([new Uint8Array(10)], { type: 'audio/mp4' });
  const out = await transcribe(blob, 'ar', { GROQ_API_KEY: 'k' }, fake);
  assert.deepEqual(out, { ok: true, text: 'What does the Quran say about patience?', via: 'whisper-large-v3-turbo' });
  assert.equal(calls[0].lang, 'ar'); assert.ok(calls[0].prompt.includes('القرآن')); assert.equal(calls[0].name, 'speech.m4a');
  assert.equal(calls[1].lang, null);
});
