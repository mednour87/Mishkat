# Tools & components inventory

## AI models and providers (order of use)
| Component | Version / tier | Role | Licence / terms |
|---|---|---|---|
| **Groq API** — `openai/gpt-oss-120b` | free tier, tried **first** | verse selection from a closed list, RAG composer (sentence IDs), independent judge | Groq terms; open-weight model (Apache-2.0) |
| **Groq API** — `openai/gpt-oss-20b` | free tier (separate quota) | light tasks: intent + retrieval keywords (`expand`), hadith/encyclopedia result filter (`pick`) | same |
| **Groq API** — `qwen/qwen3.8-27b` | free tier | last free fallback | model licence |
| **OpenRouter API** — `openai/gpt-oss-120b`, `openai/gpt-oss-20b` | pay per token, prepaid; **backup only** (Groq 429 / failure); `max_price` 0.2 / 0.8 $ per million tokens, `data_collection: deny`, JSON mode | same tasks as above | OpenRouter terms |
| **Groq `whisper-large-v3-turbo`** | free tier | speech to text (question, recitation to find a verse); audio not kept | Groq terms |
| **Groq Orpheus** `canopylabs/orpheus-arabic-saudi` | Groq (terms accepted by the account owner on 4 Oct 2026) | reads a tafsir unit shipped with Mishkat when the browser has no Arabic voice (`/api/tts`, known passages only); the Arabic spoken welcome, generated once (`tools/make_welcome_audio.py` → `public/audio/welcome_ar.mp3`) | Groq terms |
| `canopylabs/orpheus-v1-english` | not enabled on the account | English is read by the browser's voice | — |
| Azure Speech (`ar-SA-HamedNeural`, `en-US-AndrewNeural`) | code ready (`functions/_lib/tts.js`), **not used**: no key (the Azure subscription could not be opened) | — | — |
| **Cloudflare Workers AI** — `@cf/baai/bge-m3` | free daily allocation | meaning vectors of the verses (once) and of each question (live, projected to 256 d; ranking in the browser) | Workers AI terms; model MIT |
| ALLaM-2-7B (SDAIA) | Groq free tier | benchmarked, rejected for selection (context too short) — `eval/results/bench_llm.json` | model licence |
| Browser Web Speech (speechSynthesis / SpeechRecognition) | — | English welcome, answer read aloud when the browser has a voice; voice input fallback — never the Quran | — |

The AI never writes text shown to the visitor: it returns IDs (verses, sentences, hadiths, encyclopedia sections) from closed lists, checked on the server and again in the browser.

## Public services called by the browser
| Service | Role | Terms |
|---|---|---|
| Aladhan API v1 | prayer times (method and authority shown) | free public API |
| Overpass API (overpass-api.de, mirror kumi.systems) / Nominatim | nearby mosques, city search | ODbL data, OSM usage policies |
| verses.quran.com | Alafasy recitation audio (streamed) | Quran.com |

## Software
| Component | Version | Role | Licence |
|---|---|---|---|
| three.js | 0.160.0 (vendored, `public/vendor/three/`) | WebGL galaxy, lamp map, 3D scenes | MIT |
| qrcode-generator (Kazuhiko Arase) | 1.4.4 (vendored, ES-module export added) | QR code of the qibla page on a computer | MIT |
| Fonts: Amiri Quran, Amiri, Inter (self-hosted) | — | typography | SIL OFL 1.1 |
| Node.js | ≥ 18 | tests, evaluation, local server (no npm dependencies) | MIT |
| Python 3 + `requests`, `numpy`, `lameenc` (MP3 of the welcome) ; `pandas`, `pytrec-eval-terrier` (official Qur'an QA scorer) | 3.13 | data build, evaluation | PSF / BSD / LGPL / MIT |
| Cloudflare Pages + Pages Functions, Wrangler | free plan | hosting, serverless API (keys kept as secrets) | Cloudflare terms |
| python-pptx | — | presentation (`docs/make_deck.py`) | MIT |
| Claude (Anthropic) — AI coding assistant | — | assisted the author with code, tests and documentation (disclosed per the challenge's transparency rules); not part of the product | — |

## Running costs (measured)
- **Hosting**: Cloudflare Pages free plan (static + Functions).
- **AI, normal case: 0** — Groq's free tier first for every task (measured quotas: about 1,000 requests/day and 8,000 tokens/min per model; the light tasks use a second model with its own quota).
- **AI, backup**: OpenRouter pay per token only when Groq refuses (429) or fails: ≈ **$0.0014 per question** measured (`eval/cost_per_question.mjs`), price cap per token, daily ceiling of paid calls per server instance (`DAILY_AI_CALLS`, default 1,500), credit limit on the key. Prepaid balance 6.99 $ on 3 Oct 2026.
- **Caching**: identical AI requests and speech are cached at the edge (Cache API, 7–30 days); ~140 frequent questions are pre-computed in `public/data/llm_cache.json` and re-verified like live answers.
- **Without AI**: the deterministic engine answers (subject index, keywords, verification, guards), still grounded and abstaining.
- **Evaluations**: always `FREE_ONLY=1` (the paid key is removed), cost 0.
