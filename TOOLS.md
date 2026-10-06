# Tools & components inventory

## AI models and providers (order of use)
| Component | Version / tier | Role | Licence / terms |
|---|---|---|---|
| **Groq API** — `openai/gpt-oss-120b` | free tier, tried **first** | verse selection from a closed list, RAG composer (sentence IDs), independent judge | Groq terms; open-weight model (Apache-2.0) |
| **Groq API** — `openai/gpt-oss-20b` | free tier (separate quota) | light tasks: intent + retrieval keywords (`expand`), hadith/encyclopedia result filter (`pick`) | same |
| **Groq API** — `qwen/qwen3.8-27b` | free tier | last free fallback | model licence |
| **OpenRouter API** — `openai/gpt-oss-120b`, `openai/gpt-oss-20b` | pay per token, prepaid; **backup only** (Groq 429 / failure); `max_price` 0.2 / 0.8 $ per million tokens, `data_collection: deny`, JSON mode | same tasks as above | OpenRouter terms |
| **ElevenLabs Scribe v2** (`scribe_v2`, speech to text) | author's Creator plan (same account as the narration voice) | **first** speech-to-text engine since 6 Oct 2026 (T122): the spoken question, with Mishkat's vocabulary as `keyterms` (114 surah names from core.json + common words, `data_build/build_stt_terms.mjs` → `functions/_lib/stt_terms.js`); a recited verse without hints; audio not kept | ElevenLabs terms; declared external tool |
| **Groq `whisper-large-v3-turbo`**, then **`whisper-large-v3`** | free tier (two separate quotas) | backups of Scribe for speech to text (an error, a 429 or 9 s without answer → the next one); measured alone 20/30 on `eval/stt` (free-tier 429s and dialects), the chain 30/30 | Groq terms |
| **Groq Orpheus** `canopylabs/orpheus-arabic-saudi` | Groq (terms accepted by the account owner on 4 Oct 2026) | reads a tafsir unit shipped with Mishkat when the browser has no Arabic voice (`/api/tts`, known passages only); the Arabic spoken welcome, generated once (`tools/make_welcome_audio.py` → `public/audio/welcome_ar.mp3`) | Groq terms |
| **ElevenLabs** text-to-speech (`eleven_multilingual_v2`; Arabic voice «Mo Wiseman», Modern Standard Arabic, from the ElevenLabs voice library; English voice «George») | ElevenLabs Inc. (author's paid Creator plan, commercial licence) | added 6 Oct 2026: the narration of the 2-minute video, of the presentation film (`public/audio/intro/{ar,en}/*.mp3`) and the spoken welcome (`public/audio/welcome_ar.mp3`) — hand-written, fully vowelled lines, **never a verse** (the Quran is always Sheikh Alafasy's recitation); the voice was chosen by a speech-to-text check of six Arabic voices (`tools/voice_pick.mjs`) and every line is heard back and compared word by word (`tools/voice_check.mjs`); the name is written «مِشْكَاهْ» for the voice only | generated once and shipped as files (`tools/voice_eleven.mjs`, key in `.dev.vars`, never in the code); no visitor data is sent; declared external tool (challenge terms, clause 9/15) |
| **Microsoft Edge read-aloud voices** via `edge-tts` (`ar-SA-HamedNeural` Modern Standard Arabic, `en-US-GuyNeural`) | Microsoft (free read-aloud service used by the Edge browser) | added 5 Oct 2026: the narration of the presentation film (`public/audio/intro/{ar,en}/*.mp3`, `tools/make_intro_voice.py`) and of the fusha version of the video (`tools/video/voice_fusha.py`; the video itself is composed by `tools/video/build3.mjs` + `overlay3.html`, headless Chrome and ffmpeg) — hand-written, fully vowelled lines, **never a verse** (the Quran is always Sheikh Alafasy's recitation) | generated once and shipped as files; declared external tool (challenge terms, clause 9/15) |
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
| Overpass API (z./lz4.overpass-api.de, overpass-api.de, kumi.systems, private.coffee — through `/api/mosques`) / Nominatim | nearby mosques, city search | ODbL data, OSM usage policies (identified User-Agent, cached answers) |
| Google Maps embed (iframe, no key) | the map of the nearby mosques inside the panel, a mosque shown on it, «route» link | Google Maps terms; the chosen place is sent to Google to draw the map (stated) |
| verses.quran.com | Alafasy recitation audio (streamed) | Quran.com |
| Aladhan qibla API (`/v1/qibla`) | **evaluation only**: independent check of Mishkat's qibla bearing at 33 places (`tools/check_world.mjs`, 6 Oct 2026); never called by the page | free public API |

## Models embedded in the page
| Component | Version | Role | Licence |
|---|---|---|---|
| World Magnetic Model (NOAA NCEI / BGS) | WMM2025 (2025.0–2030.0) | magnetic declination for the qibla compass (`public/js/geomag.js`), checked on the 100 official test values | public domain |

## Software
| Component | Version | Role | Licence |
|---|---|---|---|
| three.js | 0.160.0 (vendored, `public/vendor/three/`) | WebGL galaxy, lamp map, 3D scenes | MIT |
| qrcode-generator (Kazuhiko Arase) | 1.4.4 (vendored, ES-module export added) | QR code of the qibla page on a computer | MIT |
| Fonts: Amiri Quran, Amiri, Inter (self-hosted) | — | typography | SIL OFL 1.1 |
| Node.js | ≥ 18 | tests, evaluation, local server (no npm dependencies) | MIT |
| Python 3 + `requests`, `numpy`, `lameenc` (MP3 of the welcome) ; `pandas`, `pytrec-eval-terrier` (official Qur'an QA scorer) | 3.13 | data build, evaluation | PSF / BSD / LGPL / MIT |
| Cloudflare Pages + Pages Functions, Wrangler | free plan | hosting, serverless API (keys kept as secrets) | Cloudflare terms |
| Cloudflare Workers KV (namespace `FEEDBACK`, T118) | free plan (1,000 writes/day) | visitors' «useful / not useful / report an error» on answers, no identifier, one-year expiry (`functions/_lib/feedback.js`, report `tools/feedback_report.mjs`) | Cloudflare terms |
| python-pptx | — | presentation (`docs/make_deck.py`) | MIT |
| Claude (Anthropic) — AI coding assistant | — | assisted the author with code, tests and documentation (disclosed per the challenge's transparency rules); not part of the product | — |

## Running costs (measured)
- **Hosting**: Cloudflare Pages free plan (static + Functions).
- **AI, normal case: 0** — Groq's free tier first for every task. Measured quotas per model: 1,000 requests/day, 8,000 tokens/min and — the real bound — **200,000 tokens/day** (seen on 4 Oct: a selection request is ≈ 3,500 tokens, so the free 120b model serves a few dozen full answers a day); the light tasks use a second model with its own quota. Beyond that the paid backup answers.
- **AI, backup**: OpenRouter pay per token only when Groq refuses (429) or fails: ≈ **$0.0014 per question** measured (`eval/cost_per_question.mjs`), price cap per token, daily ceiling of paid calls per server instance (`DAILY_AI_CALLS`, default 1,500), credit limit on the key. Prepaid balance 6.99 $ on 3 Oct 2026.
- **Caching**: identical AI requests and speech are cached at the edge (Cache API, 7–30 days); ~140 frequent questions are pre-computed in `public/data/llm_cache.json` and re-verified like live answers.
- **Without AI**: the deterministic engine answers (subject index, keywords, verification, guards), still grounded and abstaining.
- **Evaluations**: always `FREE_ONLY=1` (the paid key is removed), cost 0.
