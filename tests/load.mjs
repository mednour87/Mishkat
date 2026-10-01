import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createEngine } from '../public/js/engine.js';
const D = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
export const readJson = (f) => JSON.parse(readFileSync(join(D, f), 'utf8'));
export function loadEngine() {
  const core = readJson('core.json');
  const searchAr = readJson('search_ar.json');
  const sources = {};
  for (const id of ['mukhtasar_ar', 'muyassar_ar', 'mukhtasar_en', 'saheeh_en'])
    sources[id] = readJson(`tafsir_${id}.json`);
  return { engine: createEngine({ core, searchAr, sources }), core, sources };
}
