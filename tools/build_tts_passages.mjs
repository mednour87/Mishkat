// T018 (part 2): the server voice reads only KNOWN passages. The tafsir books shipped with Mishkat are split
// by surah (public/data/tts/{book}/{s}.json = the verse units, as shown in the reader) so that /api/tts can
// read «book + surah + verse + chunk number» without any free text, with a small file per request.
// usage: node tools/build_tts_passages.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const D = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const core = JSON.parse(readFileSync(join(D, 'core.json'), 'utf8'));
export const TTS_BOOKS = ['muyassar_ar', 'mukhtasar_ar', 'mukhtasar_en'];
for (const book of TTS_BOOKS) {
  const src = JSON.parse(readFileSync(join(D, `tafsir_${book}.json`), 'utf8'));
  mkdirSync(join(D, 'tts', book), { recursive: true });
  for (const s of core.suras) {
    const units = [];
    for (let a = 0; a < s.ayas; a++) units.push(String(src.text[s.first + a] || '').replace(/^\d+\.\s*/, ''));
    writeFileSync(join(D, 'tts', book, `${s.n}.json`), JSON.stringify(units));
  }
}
console.log('written', TTS_BOOKS.length * 114, 'files');
