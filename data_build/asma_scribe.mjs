// T123: word timings of the names recording (the original Wikimedia .ogg, path in ASMA_OGG) from ElevenLabs Scribe.
// The Whisper timings (asma_stt.json, taken on the original .ogg) drift by about 4 s at the end: the last names fell
// on the silence that closes the file. Output: data_build/cache/asma/asma_scribe.json (used by build_asma.mjs).
//
//   ASMA_OGG=/path/Asma_Ul_Husna.ogg node data_build/asma_scribe.mjs        (reads ELEVENLABS_API_KEY from .dev.vars, never prints it)
import { readFileSync, writeFileSync } from 'node:fs';

const vars = Object.fromEntries(readFileSync('.dev.vars', 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const key = process.env.ELEVENLABS_API_KEY || vars.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY missing');

const fd = new FormData();
fd.append('model_id', 'scribe_v1');
fd.append('language_code', 'ara');
fd.append('timestamps_granularity', 'word');
fd.append('tag_audio_events', 'false');
if (!process.env.ASMA_OGG) throw new Error('ASMA_OGG missing');
fd.append('file', new Blob([readFileSync(process.env.ASMA_OGG)], { type: 'audio/ogg' }), 'asma.ogg');
const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body: fd });
if (!r.ok) throw new Error('scribe ' + r.status + ' ' + (await r.text()).slice(0, 300));
const j = await r.json();
const words = (j.words || []).filter(w => w.type === 'word').map(w => ({ word: w.text, start: w.start, end: w.end }));
writeFileSync('data_build/cache/asma/asma_scribe.json', JSON.stringify({ source: 'ElevenLabs Scribe, word timestamps, on the original Asma_Ul_Husna.ogg (Wikimedia Commons, CC0)', words }, null, 1));
console.log(words.length, 'words; last:', words.slice(-4).map(w => `${w.word}@${w.start}-${w.end}`).join(' '));
