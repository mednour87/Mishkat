# Mishkat (مِشكاة) — user and developer guide

*State of 6 October 2026. It replaces the French guide of 2 October.*

Mishkat is a "grounded" Quran search engine. It answers a question with **exact verses** (Tanzil text) and **tafsir quoted word for word**, places them in a **3D sky of the 77,433 words of the Quran**, and offers a **word-synchronised recitation**. The AI never writes religious content: it understands the question and chooses from closed lists. What Mishkat cannot base on a source, it says, and it abstains. Interface languages: **Arabic** and **English**.

How the search engine works in detail: [RAG_ENGINE.md](RAG_ENGINE.md). Why the 3D sky is drawn as it is: [DESIGN_3D.md](DESIGN_3D.md).

---

## 1. The journey in three moments

| Moment | What the visitor sees | How to get there | How to leave |
|---|---|---|---|
| **Home** | The 3D sky full width, suggestions in the middle (example questions or the chosen interests) | Opening the site, after the «سمِّ الله» gate (write, paste or say the basmala) | Ask a question (search bar, microphone, suggestion) or click a star |
| **Answers** | The answers large; in the sky the verses found light up, one colour per surah, with a clickable label per surah | A question | A verse (list or label) → Study; ✕ → Home |
| **Study** | Sky above, **Mushaf** below with the recitation, **tafsir** beside it; the answers fold into a bar | A verse chosen | ✕ of the reader or Escape |

On a phone the sky takes the top of the screen; in Study two tabs switch between the **Mushaf** and the **Tafsir**.

## 2. Search and answers
- One bar for everything: an idea, a question, a surah name, a reference (2:255), a fragment of a verse, a quotation or a hadith to check, an exact word of the Quran (with its clitics, in Uthmani spelling or in Latin letters), by voice too (Whisper on the server, or the browser).
- Answer order: spelling correction or suggestions → **«الجواب باختصار»** (verbatim sentences, each with its verse or hadith) → the key verses with their **complete** tafsir → the other verses surah by surah → the Sunnah (graded HadeethEnc hadiths) → for a ruling, the **Fiqh Encyclopedia of Ad-Durar As-Saniyyah** verbatim under a red «سؤال حساس» banner.
- An answer level (أ/ب/ج/د, after the challenge's reference pack), a verification badge, and the transparency note.
- Under every answer: **«هل أفادك هذا الجواب؟»** — useful / not useful / **report an error** (stored without any identifier, `functions/_lib/feedback.js`).
- Fixed answers without AI: off-topic requests, instruction injections, requests to «write a verse / a hadith», a person in crisis (support message first), child mode (no fatwa).

## 3. The 3D sky
- **Shape** (key V): galaxy, «قرآن», rose of surahs (default), dome, petals, the flower of the challenge; **order** (key O): Mushaf, revelation, Meccan then Medinan, length… Each change is a 2.2 s morph.
- During a recitation the camera glides from word to word; only the recited word is written, in a luminous disc on its star.
- **At rest** (nothing recited) a bar of light turns slowly around the centre of the shape and the stars it crosses light up — it fades as soon as a recitation starts.
- **✧ Pure view**: full screen, only the stars and the recited words, no interface (one click in, ✕ or Escape out; computer and phone).
- ⤢ wide view · ⌂ overview · ＋/－ · ⟲ rotation · ﺱ surah names · ◐ legend; hover 3 s (long press on a phone) on a word: its verse, rank and occurrences.

## 4. Reader and tafsir
- Alafasy's recitation synchronised word by word (Mushaf, sky and lamp together); one verse, continuous, repetition ×1–∞, speed, text size, copy, link; tajweed colours (optional) with the rules explained.
- Arabic: the Mushaf text only. English: verse by verse with word-by-word transliteration and translation.
- Tafsir tabs: الميسر · المختصر · السعدي · الطبري · ابن كثير · البغوي · القرطبي (live), English Al-Mukhtasar and Ibn Kathir.
- **Time of prayer during a recitation**: the verse is finished, the recitation pauses, a card says it is time for the prayer with verse 2:238, the adhan is played if chosen (it can be skipped), then the recitation resumes with the basmala recited by the same reciter (not in Surah at-Tawbah, nor before a verse 1 that carries it) and the next verse. «Stop the recitation to pray» ends it.

## 5. Tools (the dock in the header; on a phone, the ☰ menu)
| Tool | What it does |
|---|---|
| Adhkar | Hisn al-Muslim (checked in the Dorar Hadith Encyclopedia) and HadeethEnc, by moment |
| Tasbih | A menu of formulas (subḥān Allāh, al-ḥamdu lillāh, Allāhu akbar, lā ilāha illā Allāh, istighfār, blessings on the Prophet ﷺ, ḥawqala, ḥasbiya Allāh…) **each cut word for word from a graded hadith** (`data_build/build_tasbih.mjs`), and the counted adhkar of Hisn al-Muslim; the count goes on past the suggested number; Space / Enter / + count, Backspace undoes |
| The Most Beautiful Names | The 99 names (narration of at-Tirmidhi; transliteration and meaning), a tap plays a name and offers a Quran search; **listen to them all** in a full-screen stage where each name appears as it is said; **learn** them group by group (names per group, repetitions, a test that hides the name until it is said) |
| Prayer times, qibla, nearby mosques | Aladhan times of the place (method of the country), qibla corrected by the magnetic declination (WMM2025), mosques from OpenStreetMap; the adhan at the time (three openly licensed recordings, the Prophet's Mosque by default) |
| Khatma | A plan (pages, verses or surahs; by duration or amount; «اختر لي»), reading record, the surahs read light up in the 3D lamp |
| Repetition (tekrar) | Memorisation verse by verse with repetitions, tajweed rules and an optional test |
| Statistics, Hijri calendar, useful links, settings | — |

## 6. The light of the month
Each completed act — a verse read or heard, a count of tasbih reached, a unit memorised, a Name heard or learnt — sends a **ray of light** from where it happened to the logo, and the logo keeps a little more light until the end of the month (`public/js/glow.js`): reading the Quran 60 %, listening 10 %, memorising 10 %, tasbih 10 %, the Names 10 %. It is kept in the browser only and starts again on the first day of each month.

## 7. Architecture
```
public/                 static site (no build step)
  js/app.js             orchestration: modes, search, answers, reader, tafsir, tools
  js/engine.js          grounded search engine (router, verification, BM25, guards, levels)
  js/search-worker.js   the engine in a Web Worker
  js/rag.js             closed list of sentences and the rules R1–R13
  js/galaxy.js          WebGL (three.js) sky: points, colours, labels, camera, resting sweep
  js/layouts.js         shapes × orders of the 3D view (see DESIGN_3D.md)
  js/glow.js            light of the month and rays          js/asma.js        the Most Beautiful Names
  js/tasbih.js          tasbih                               js/prayerbreak.js prayer during a recitation
  js/practical.js       prayer, qibla, mosques               js/khatma.js, tekrar.js, toolpanels.js …
  data/                 Quran, tafsirs, timings, indexes, vectors, adhkar, names (see TRACEABILITY.md)
functions/              Cloudflare Pages Functions (the same code serves the local server)
  _lib/selector.js      the only place where a language model is called
  _lib/answer.js        composer + judge of the short answer
  _lib/fiqh.js          Dorar Fiqh Encyclopedia      _lib/feedback.js  visitors' feedback (KV)
server.mjs              dependency-free local server (same routes)
tests/, eval/, tools/   tests, benchmarks, builders (traceability, deck, project file, Drive folder)
```

## 8. Reliability rules (red line: no invented religious content)
1. **Quran text**: only `core.verses` (Tanzil, SHA-256 checked), never retyped.
2. **Explanations**: complete tafsir units quoted word for word with their source.
3. **AI**: proposes keywords and an intent, then **chooses identifiers** from a closed list; everything it returns is validated on the server and in the browser; no word written by a model is shown.
4. **Abstention** when evidence is missing, and for personal fatwas, private cases and dreams (level د).
5. **Hadith, dhikr, rulings**: never produced — quoted from their sources with grade and link.
6. **Voice**: the Quran is only recited by a human reciter; synthetic voices read interface lines or a tafsir already shown, labelled as such.
7. **Privacy**: no account, no tracking; preferences stay in the browser; what each service receives is declared in «About».

## 9. Run, test, deploy
- Local: `node server.mjs 8787` (keys in `.dev.vars`, ignored by git) · tests: `npm test` · traceability: `node tools/trace.mjs`.
- Deployment: Cloudflare Pages (`DEPLOY.md`); secrets with `wrangler pages secret bulk .dev.vars`.
- Builders of data: `data_build/` (each script says its source and what it checks).

## 10. Known limits
- Topic search may miss a passage expressed with other words: «related verses», never «all the verses».
- Live tafsirs, the Dorar, voices and transcription depend on the network and on the providers' quotas; each failure is shown, never hidden.
- The revelation order is a well-known scholarly ordering, shown for visual exploration only.
- The recording of the Names comes from Wikimedia Commons (CC0) and its reciter is not named; its timings come from an automatic transcription aligned to the list.

---
© 2026 Mohamed Nour Bou Ali — Mishkat. All rights reserved.
