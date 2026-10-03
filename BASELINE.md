# Baseline disclosure · الإفصاح عن نسخة الأساس

The challenge rules allow pre-existing work if its baseline is disclosed before 4 October 2026; only work done during the challenge (4 October 09:00 – 6 October 23:59, Riyadh time) is evaluated. This file documents, honestly and with fingerprints, **everything** that existed before the window.

**Last commit before this disclosure: `d71fa90`**; the git tag `baseline-2026-10-03` is placed on the commit that adds this file. Every commit after that tag is challenge work.

## 1. Pre-existing project: “Quran Cartography” (author’s own, July–August 2026)
- A letter- and word-level database of the Quran (`quran.db`: 6,236 verses, 77,433 words, 326,159 letters) built from the Tanzil text, with a semantic colour layer (names of Allah, prophets, angels, Satan).
- An atlas of static figures and 14 interactive Plotly 3D “galaxies” with audio, served as a local static website.
- **No AI component, no search, no tafsir, no translations, no online deployment.**
- Fingerprints: `quran.db` SHA-256 `28a57cd5d6a12d443745c71a33bd6a93c6b0797032e112bcc78feeac812f5309`; Tanzil text `bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8`.

## 2. Mishkat, written before the challenge window (28 September – 3 October 2026)
For full transparency: this repository was written and deployed (private preview) **before** the window, while preparing the application and after its acceptance. All of it is part of the declared baseline and is not presented as challenge work:
- 28–29 Sep: engine (routing, BM25, guard, closed-list AI selection, quote verifier), WebGL galaxy, reader with synchronised recitation, tests, evaluation, documentation (v2).
- 1–2 Oct: v3–v8 interface (three moments, Mushaf + tafsir study, logo), spoken queries, reference-pack integration (answer levels A–D, Quranpedia subject index, glossary), Web Worker search, published fatwas (binbaz.org.sa), Sunnah section (HadeethEnc), hybrid semantic search (bge-m3), Qur'an QA 2023 benchmark, deck, OpenRouter provider, private deployment on Cloudflare Pages.
- 3 Oct: audit of errors (`01_PLAN/CARTOGRAPHIE_ERREURS_ET_AMELIORATIONS.md`), plan v5, execution files and code drafts (`05_EXECUTION/`), and the first corrections of that audit (tasks T010–T020: AI selection always runs, status questions without «هل», over-refusal bench, short answer only when AI-confirmed, circuit breakers, semantic ranking moved to the browser, sensitivity levels, spelling suggestions, Origin check, single confidence badge).

### 2.1 Dated commits before the window (39)
| Commit | Date | Message |
|---|---|---|
| `f0b1b80` | 2026-09-29 | Mishkat v2 — declared baseline before the challenge window (29 Sep 2026) |
| `6bd8633` | 2026-09-29 | Relevance audit fixes: verified AI recall, precision-first display, ta marbuta & stemming fixes, circuit breakers, pre-computed AI cache, upload tutorial |
| `d74d462` | 2026-10-01 | v3 (pre-challenge, declared): full-tafsir verse cards, paragraph only when AI-confirmed, verified context packs for trap questions, sensitive-topic context mode, fatwa questions → official sources (binbaz/alifta) + related verse… |
| `cbc159c` | 2026-10-01 | v3.1 (declared baseline): animated Mishkat lamp logo with recited word inside the bottle, 3D «قرآن» view with 4 orders, welcome screen + feature chooser, reader fixes (▶ per verse, restart, reader tab), light theme, security har… |
| `96e5311` | 2026-10-01 | design v4: IBM Plex Sans Arabic UI (self-hosted, OFL), 44px touch targets, larger recitation lamps; double-click PC bundle builder |
| `af1761b` | 2026-10-01 | Reader v5: focus card (verse, word-by-word transliteration, translation, large tafsir with listen button), repeat (تكرار), word-synced highlight on Arabic + transliteration, recited word centred in the galaxy with transitions an… |
| `0dd2856` | 2026-10-01 | Results: verses listed inside each surah card with search words highlighted; lead counts verses AND surahs (no more '12 found / 2 shown') |
| `24da68b` | 2026-10-01 | Gate v2 (luminous card, lamp, pill field, language switch, fade-out) and welcome v2: interests personalise the home page with verified suggestions (rulings as verses-not-fatwa, stories, values, tafsir, recitation, surahs, memori… |
| `608a20a` | 2026-10-01 | Voice v2: recording dialog with level meter, auto-stop at the pause (timer, works in background tabs), explicit spoken language, editable transcript before searching; server: Quranic vocabulary prompt, real file extension, no-sp… |
| `cca405e` | 2026-10-01 | Reference pack integration: answer levels A-D, Quranpedia subject index (6,100 human-curated topics) and surah information, At-Tabari tafsir page by page (live, verse heading cut), Dorar hadith encyclopedia lookups (verbatim wit… |
| `0f3e6b5` | 2026-10-01 | Keep Quranpedia raw dumps local only (translations remain their authors' property) |
| `8d35f7f` | 2026-10-01 | Docs: sources S11-S16 from the challenge reference pack, answer levels as defined by the pack; reader: surah info button in the controls row |
| `8955dff` | 2026-10-01 | v6 WIP (pre-challenge preparation, to be declared as baseline): four-zone work area, live tafsir books (Ibn Kathir ar/en, Al-Baghawi, Al-Qurtubi), server TTS (Groq Orpheus) with browser-voice fallback, French removed, recited wo… |
| `ee86382` | 2026-10-01 | v7 UI (pre-challenge preparation, to be declared as baseline): three moments (home bar -> large answers with coloured surahs on the 3D map -> study: Mushaf + tafsir), smooth word following with reading zoom and only the recited … |
| `a997890` | 2026-10-02 | Search for spoken queries (pre-challenge preparation, to be declared as baseline): spoken-query cleaning (dialect fillers, Whisper repairs), spoken surah/verse requests, stricter no-AI path, better expand/select prompts, 139-que… |
| `69587d2` | 2026-10-02 | Logo after As-Sa'di on 24:35 (niche > shining glass like a brilliant star > lamp, olive oil, central olive tree); answers keep the sky visible (soft surah tint, brighter verses); narrower tafsir; full view = 3D + Mushaf; exact Q… |
| `bd85d5a` | 2026-10-02 | AI search: subject index only for bare topics, candidates show the verse/translation, Arabic keywords for English questions, scored selection (direct vs related); points never blur near the camera; view restore keeps the camera;… |
| `ea77675` | 2026-10-02 | French data files removed; sources registry S17-S19 (classical tafsirs, transliteration index, server voice); guide with search metrics; traceability regenerated; crash fix for multi-word queries whose words never meet |
| `261aa82` | 2026-10-02 | Traceability regenerated at HEAD |
| `7673d58` | 2026-10-02 | Logo v8 (pre-challenge preparation, part of the declared baseline): clear glass mosque lamp filled with self-glowing olive oil (no flame), eight-ray star, triple halo, small centred olive sprig, mihrab niche |
| `564bd58` | 2026-10-02 | AI provider: OpenRouter (pay per token) supported as PRIMARY — reasoning field, fastest hosts, JSON mode required, no data collection (pre-challenge preparation, declared baseline) |
| `6523d87` | 2026-10-02 | Tools registry: OpenRouter paid provider declared (pre-challenge preparation) |
| `8fd6701` | 2026-10-02 | Private preview (password via SITE_PASS secret, noindex/noarchive, robots.txt), lighter start (tafsir files after first paint, interface language only, cache headers), logo v9 (soft neon breathing, no chains, separate planet and… |
| `8341b3f` | 2026-10-02 | No more freezes: search engine runs in a Web Worker (indexes and queries off the main thread; AI calls relayed to the page; same engine as fallback), lazy quote-verification indexes, adaptive render resolution, no picking while … |
| `eb5d1ef` | 2026-10-02 | Published fatwas from the official site of Sheikh Ibn Baz (binbaz.org.sa search service; AI may only filter the closed list; full fatwa verbatim with the Sheikh's audio and link; level D notice), generic pickRelevant(); HadeethE… |
| `6e11883` | 2026-10-02 | Sunnah section: 3,572 authentic hadiths of HadeethEnc (verbatim text, attribution, grade, explanation, references, link), searched in the worker, AI filter on a closed list (/api/pick), strict lexical rule without AI; fatwa box … |
| `de95a88` | 2026-10-02 | Hybrid search: bge-m3 semantic neighbours (Workers AI, int8 vectors of verse + Al-Mukhtasar) fused into the AI's closed-list candidates and used to confirm AI-proposed verses; fatwa requests keep AI-selected related verses; side… |
| `cfffa3e` | 2026-10-02 | Public benchmark results (Qur'an QA 2023: MRR@10 0.609, MAP@10 0.266), deck slide from scores, internal eval without French, README/journal |
| `f2b8300` | 2026-10-02 | Deck: shorter benchmark slide title |
| `f39ab78` | 2026-10-02 | Answer order: (1) «in short» — glossary definition and 2-3 sentences copied verbatim from the vetted tafsir of the verses that answer (each with its verse; only when the AI, the subject index or a reviewed pack vouches for them)… |
| `2193069` | 2026-10-03 | T010-T014: AI selection always runs; status without «هل»; no over-refusal; short answer only when AI-confirmed; restore (?=\S) |
| `3d56c6e` | 2026-10-03 | T015: circuit breakers per provider:model, 401/402 long cool-down, 7.5 s server budget with backup reached, client trips only after 3 failures for 60 s (E7) |
| `173c651` | 2026-10-03 | T019: semantic search ranked in the browser — server only embeds and projects the question to 256 dims (<1 ms CPU, free-plan 10 ms limit), Web Worker ranks 6,236 x 256 int8 vectors (1.6 MB, top-40 overlap 0.92 with 1024-d) (I1) |
| `6346ae3` | 2026-10-03 | T016: sensitivity from the text or the pack actually used; penalties list widened; quoted war verses flagged with context (E9, E11) |
| `9ca5a6f` | 2026-10-03 | T017: no suggestion for words the tafsirs use often; sure one-letter misspellings corrected even when a base form exists (E12, E13) |
| `f087fff` | 2026-10-03 | T018 (part 1): POST without Origin refused — scripts can no longer spend the AI credit (I2); daily cap and TTS passage check postponed to the voice/KV lot |
| `473c20a` | 2026-10-03 | T019b/E15: dense only when the server has an embedding model (health.dense, no vector download otherwise); select prompt covers every subject of «X و Y»; English translation named correctly (Noor International) |
| `6a7089b` | 2026-10-03 | T020: one confidence badge per topic answer from confirmedBy (AI / subject index / context / word / keywords) (X1); galaxy toolbar wraps on phones, nothing off-screen at 375 px (X3) |
| `d71fa90` | 2026-10-03 | Changelog of the pre-window corrections; baseline snapshot covers 28 Sep - 3 Oct (repo, dated commits, plans and drafts) |

### 2.2 Repository files at the baseline commit (318 files, snapshot 2026-10-03)
| File | Bytes | SHA-256 (prefix) |
|---|---|---|
| `CHANGELOG.md` | 2,134 | `a32bb0f6f8dc496e…` |
| `data_build/baseline_snapshot.py` | 5,477 | `5ea3ba59bb1b7ae1…` |
| `data_build/build_data.py` | 11,923 | `beccc50f574d6b7a…` |
| `data_build/build_hadeeth.py` | 2,650 | `fc7cade2b0475cf3…` |
| `data_build/build_latin_index.py` | 2,143 | `87955a6ffbbced35…` |
| `data_build/build_pca.py` | 2,515 | `6242ce5049e35039…` |
| `data_build/build_quranpedia_data.py` | 4,027 | `b397211150727653…` |
| `data_build/build_vectors.py` | 3,001 | `db65adf9cf264828…` |
| `data_build/fetch_bayenat_index.py` | 2,909 | `86dbaa8bba0f6b57…` |
| `data_build/fetch_extra.py` | 3,487 | `0d79e5652140a11d…` |
| `data_build/fetch_hadeethenc.py` | 4,873 | `4510cb4174c271ab…` |
| `data_build/fetch_sources.py` | 4,189 | `e84e100321480310…` |
| `data_build/fetch_translit.py` | 2,846 | `98051a6a865023cb…` |
| `data_build/hadeeth_raw/hadeeth_ar.json` | 12,524,674 | `47bbbf0d4cf90d09…` |
| `data_build/hadeeth_raw/hadeeth_en.json` | 4,929,945 | `d862c563e4dc4b40…` |
| `data_build/make_pc_bundle.py` | 2,729 | `e3d47d50510f28d1…` |
| `data_build/quran-uthmani.txt` | 1,370,878 | `bf4f57b968d03f41…` |
| `DEPLOY.md` | 1,493 | `4c40fac3b6981fe7…` |
| `docs/GUIDE_DETAILLE.md` | 18,251 | `b43fa8256191bc72…` |
| `docs/make_deck.py` | 16,904 | `7e02feb5353c2830…` |
| `docs/traceability.html` | 155,362 | `6948e650ccb269de…` |
| `docs/TRACEABILITY.md` | 72,060 | `541f4320c7fee4bd…` |
| `eval/audit_relevance.mjs` | 2,290 | `02e04f67c1e0fc8f…` |
| `eval/bench_llm.mjs` | 3,042 | `2590049a1a4dd808…` |
| `eval/collect_forum.py` | 1,489 | `71c15a0bf5e1ecc3…` |
| `eval/forum_questions.json` | 37,429 | `14d506c6e132a9e3…` |
| `eval/golden.jsonl` | 61,480 | `538d77ac1c89a23e…` |
| `eval/make_golden.mjs` | 12,178 | `267f88cf94388981…` |
| `eval/overrefusal.json` | 2,005 | `46db1567cf6945a9…` |
| `eval/precompute_cache.mjs` | 4,061 | `33b6ba0710adbd58…` |
| `eval/qqa23/QQA23_TaskA_eval.py` | 6,884 | `39f98576783fbb41…` |
| `eval/qqa23/QQA23_TaskA_submission_checker.py` | 4,931 | `ea322f186c7ea9a3…` |
| `eval/qqa23/README.md` | 8,327 | `5aac9406218c2de6…` |
| `eval/qqa23/RESULTS.md` | 3,395 | `f53607af7c2d6aa7…` |
| `eval/qqa23/score_all.py` | 1,180 | `e1ff7ff72260ebe0…` |
| `eval/qqa23/scores_test.json` | 518 | `14129407cdefee9e…` |
| `eval/report.mjs` | 4,678 | `ecf41dc74d79b0b7…` |
| `eval/results/audit2.txt` | 28,568 | `84849fa8660739f4…` |
| `eval/results/audit3.txt` | 17,736 | `608c938e0b6ac3b5…` |
| `eval/results/audit_crit.txt` | 29,338 | `6db930e9e1ffffb8…` |
| `eval/results/audit_llm.txt` | 81,864 | `761e3c7815b5af78…` |
| `eval/results/bench_llm.json` | 999 | `5fa3b56b0affa10d…` |
| `eval/results/REPORT.md` | 4,171 | `c31685745dcc4dcb…` |
| `eval/results/results.json` | 291,505 | `e74a8bcbb0b02c0b…` |
| `eval/results/SPOKEN_MAP.json` | 206,337 | `b1812bac8cde87fc…` |
| `eval/results/SPOKEN_MAP.md` | 39,606 | `76212aa5f1c6f4e3…` |
| `eval/results/SPOKEN_MAP_before.json` | 112,136 | `396efc15efb264f8…` |
| `eval/results/SPOKEN_MAP_before.md` | 33,495 | `fa1f62ef9a520c3f…` |
| `eval/results/SPOKEN_MAP_det71.json` | 206,337 | `78383b5b9f450a04…` |
| `eval/results/SPOKEN_MAP_det71.md` | 39,614 | `959654ec7e5260b2…` |
| `eval/results/SPOKEN_MAP_dev.json` | 35,296 | `157b61f7e29e2eff…` |
| `eval/results/SPOKEN_MAP_dev.md` | 5,180 | `20bf12f7eb24f094…` |
| `eval/results/SPOKEN_MAP_t1.json` | 29,266 | `72a8d090eb05058a…` |
| `eval/results/SPOKEN_MAP_t1.md` | 4,559 | `c7a6901f3cf5d024…` |
| `eval/results/SPOKEN_MAP_t2.json` | 23,592 | `efd11e082faee33b…` |
| `eval/results/SPOKEN_MAP_t2.md` | 3,381 | `875f266dc1ce7a61…` |
| `eval/results/SPOKEN_MAP_v71.json` | 107,938 | `7d02c755d3312e12…` |
| `eval/results/SPOKEN_MAP_v71.md` | 14,081 | `097bd403d962d687…` |
| `eval/run_eval.mjs` | 8,736 | `986c162707f3b316…` |
| `eval/run_qqa23.mjs` | 4,843 | `44b73b6642e1058a…` |
| `eval/run_spoken.mjs` | 18,436 | `9786c02f4f28cd35…` |
| `eval/spoken_queries.json` | 50,624 | `ebcbf470c8ff5f0a…` |
| `functions/_lib/csp.js` | 822 | `8d9602741d640913…` |
| `functions/_lib/dense.js` | 4,823 | `a07026ac462ece51…` |
| `functions/_lib/fatwa.js` | 5,565 | `d9d8f36dccaac309…` |
| `functions/_lib/guard.js` | 1,472 | `df14d524219bdbb1…` |
| `functions/_lib/handler.js` | 1,899 | `6a4375bb8547fc33…` |
| `functions/_lib/selector.js` | 19,431 | `af2ba267ab9f810d…` |
| `functions/_lib/sources.js` | 8,836 | `33421f11d4ac5c92…` |
| `functions/_lib/tts.js` | 4,192 | `4ede1359af5eb8b8…` |
| `functions/_middleware.js` | 1,681 | `e300158e5db0a41c…` |
| `functions/api/dense.js` | 302 | `62084a59a61afda2…` |
| `functions/api/expand.js` | 204 | `972ddb618b045055…` |
| `functions/api/fatwa.js` | 281 | `ffc2a3fd555ad6d8…` |
| `functions/api/hadith.js` | 262 | `59d1b0bf31d89652…` |
| `functions/api/health.js` | 501 | `032390c93fd00dc7…` |
| `functions/api/pick.js` | 857 | `122d5f1223b88487…` |
| `functions/api/select.js` | 204 | `78858e4055b6f329…` |
| `functions/api/tafsir.js` | 260 | `2da91dbb645182e5…` |
| `functions/api/transcribe.js` | 1,255 | `5e02456dec44ed1c…` |
| `functions/api/tts.js` | 1,636 | `7f05979cc94541f4…` |
| `package.json` | 485 | `c089863a0c833739…` |
| `public/css/app.css` | 62,969 | `eb3aa1afc6529b8b…` |
| `public/data/bayenat_index.json` | 205,638 | `2cb47793398d78f8…` |
| `public/data/build_info.json` | 2,737 | `fd45a5571ed5af25…` |
| `public/data/core.json` | 1,361,623 | `4de8b86c65997541…` |
| `public/data/galaxy.bin` | 1,161,507 | `bef498e119939c06…` |
| `public/data/hadeeth/ar/0.json` | 352,140 | `a3718e90a2be4c51…` |
| `public/data/hadeeth/ar/1.json` | 373,089 | `d911d83808305299…` |
| `public/data/hadeeth/ar/10.json` | 333,283 | `56bb2bef232380a5…` |
| `public/data/hadeeth/ar/11.json` | 401,709 | `63cfb32a80e2f016…` |
| `public/data/hadeeth/ar/12.json` | 367,019 | `292059411697e457…` |
| `public/data/hadeeth/ar/13.json` | 449,693 | `7716a83e09eab213…` |
| `public/data/hadeeth/ar/14.json` | 472,434 | `14f4e69b3e0b20d3…` |
| `public/data/hadeeth/ar/15.json` | 432,375 | `4fccb23e600e76e2…` |
| `public/data/hadeeth/ar/16.json` | 509,411 | `bfa2d4573b8d6e01…` |
| `public/data/hadeeth/ar/17.json` | 464,879 | `10d81d6ca10d991d…` |
| `public/data/hadeeth/ar/18.json` | 313,040 | `8b17fe0f060c8d58…` |
| `public/data/hadeeth/ar/19.json` | 395,680 | `44164157e1a5fbfb…` |
| `public/data/hadeeth/ar/2.json` | 390,499 | `7e312bae57c86779…` |
| `public/data/hadeeth/ar/20.json` | 431,991 | `dc9fc09a5d51c82c…` |
| `public/data/hadeeth/ar/21.json` | 343,820 | `225c891d8ce394ff…` |
| `public/data/hadeeth/ar/22.json` | 280,668 | `65086ab13096a166…` |
| `public/data/hadeeth/ar/23.json` | 262,597 | `df2723a139d0baf0…` |
| `public/data/hadeeth/ar/24.json` | 285,505 | `539d752f6efa938e…` |
| `public/data/hadeeth/ar/25.json` | 235,643 | `ca83066f43568f62…` |
| `public/data/hadeeth/ar/26.json` | 237,109 | `b68be30a212e7601…` |
| `public/data/hadeeth/ar/27.json` | 249,173 | `a3fe85588ea547d6…` |
| `public/data/hadeeth/ar/28.json` | 236,835 | `0ba62dbbf4f782e3…` |
| `public/data/hadeeth/ar/29.json` | 333,557 | `4863d3b9a25a102c…` |
| `public/data/hadeeth/ar/3.json` | 370,167 | `f61f1a8ff5b3f64c…` |
| `public/data/hadeeth/ar/30.json` | 274,353 | `ba9de0c537adbc63…` |
| `public/data/hadeeth/ar/31.json` | 225,442 | `2a0d8e90c1b6b2df…` |
| `public/data/hadeeth/ar/32.json` | 233,793 | `833b6475eb0a8cd9…` |
| `public/data/hadeeth/ar/33.json` | 249,439 | `2f452e0c0dbadb4d…` |
| `public/data/hadeeth/ar/34.json` | 605,486 | `1cbdd4568cdd5aac…` |
| `public/data/hadeeth/ar/35.json` | 274,076 | `e367f6bbb700af1c…` |
| `public/data/hadeeth/ar/4.json` | 361,369 | `2aff381517329c56…` |
| `public/data/hadeeth/ar/5.json` | 380,753 | `607bb0b1f658a09d…` |
| `public/data/hadeeth/ar/6.json` | 366,994 | `2939691aebebd915…` |
| `public/data/hadeeth/ar/7.json` | 404,049 | `d415effd4ce500e6…` |
| `public/data/hadeeth/ar/8.json` | 312,979 | `68e0613eab862657…` |
| `public/data/hadeeth/ar/9.json` | 302,349 | `eb0995f4a93f9724…` |
| `public/data/hadeeth/en/0.json` | 185,860 | `0dbddc1bcb2ecbf8…` |
| `public/data/hadeeth/en/1.json` | 195,965 | `d98e1f6a70c89e7e…` |
| `public/data/hadeeth/en/10.json` | 208,444 | `151e904fd31618a6…` |
| `public/data/hadeeth/en/11.json` | 222,246 | `9d5307f176903188…` |
| `public/data/hadeeth/en/12.json` | 192,002 | `c3e44598825e7f88…` |
| `public/data/hadeeth/en/13.json` | 333,768 | `72099789512bf67d…` |
| `public/data/hadeeth/en/14.json` | 178,729 | `0b9e66e14b79c1a1…` |
| `public/data/hadeeth/en/15.json` | 263,723 | `01cb9a9c75c54f07…` |
| `public/data/hadeeth/en/16.json` | 244,112 | `fd143e85feb44415…` |
| `public/data/hadeeth/en/17.json` | 191,012 | `a17367b1e30f6bc2…` |
| `public/data/hadeeth/en/18.json` | 182,412 | `2e4cadd037587142…` |
| `public/data/hadeeth/en/19.json` | 174,043 | `d3e36d1111effeff…` |
| `public/data/hadeeth/en/2.json` | 233,395 | `d48cc6160da86db4…` |
| `public/data/hadeeth/en/20.json` | 163,605 | `68b35d6281fbd67a…` |
| `public/data/hadeeth/en/21.json` | 204,646 | `91572c0a1083d45c…` |
| `public/data/hadeeth/en/22.json` | 230,279 | `09b0cca332f83f73…` |
| `public/data/hadeeth/en/23.json` | 76,689 | `8f6c7d4056e6efbf…` |
| `public/data/hadeeth/en/3.json` | 219,455 | `7907854a26a80c5f…` |
| `public/data/hadeeth/en/4.json` | 216,559 | `47da3445352098d0…` |
| `public/data/hadeeth/en/5.json` | 198,782 | `5d1e77db58e16c52…` |
| `public/data/hadeeth/en/6.json` | 218,809 | `ea2349640fbdfabc…` |
| `public/data/hadeeth/en/7.json` | 246,018 | `257bac9932a47d24…` |
| `public/data/hadeeth/en/8.json` | 167,585 | `2d917fac2a75484a…` |
| `public/data/hadeeth/en/9.json` | 181,666 | `41f691123daae0cf…` |
| `public/data/hadeeth/idx_ar.json` | 4,299,611 | `b79fa054bd184a1d…` |
| `public/data/hadeeth/idx_en.json` | 2,507,922 | `233c776fa6eaac4c…` |
| `public/data/latin_index.json` | 752,869 | `5da0caafc12ecf94…` |
| `public/data/llm_cache.json` | 4,482 | `ee1143f91a6cdce9…` |
| `public/data/qp_surahs.json` | 308,543 | `57e759c5e5645f03…` |
| `public/data/qp_topics.json` | 438,104 | `c5c7979e3609253c…` |
| `public/data/search_ar.json` | 1,318,106 | `667b744cfde9395c…` |
| `public/data/tafsir_mukhtasar_ar.json` | 1,923,246 | `5271c233ff8664f6…` |
| `public/data/tafsir_mukhtasar_en.json` | 1,782,041 | `837c42ef788733b6…` |
| `public/data/tafsir_muyassar_ar.json` | 2,520,160 | `0d053a08d8f30f01…` |
| `public/data/tafsir_saheeh_en.json` | 1,073,719 | `53366a1e34847e68…` |
| `public/data/translit/1.json` | 439 | `7cfe46fc84dff80e…` |
| `public/data/translit/10.json` | 19,403 | `3016de4541848de0…` |
| `public/data/translit/100.json` | 548 | `5bbafb2da56fb2a5…` |
| `public/data/translit/101.json` | 489 | `f2a79f07b99c4701…` |
| `public/data/translit/102.json` | 407 | `6aa2c939f4ff17b1…` |
| `public/data/translit/103.json` | 251 | `42975bc8624f506e…` |
| `public/data/translit/104.json` | 456 | `78f95787f8f67af3…` |
| `public/data/translit/105.json` | 333 | `1f2eaf6c85b2953d…` |
| `public/data/translit/106.json` | 271 | `d96a39ea9f721938…` |
| `public/data/translit/107.json` | 383 | `33707c5b373984ea…` |
| `public/data/translit/108.json` | 191 | `d28d2a6c9e53913a…` |
| `public/data/translit/109.json` | 328 | `29048feb2e430019…` |
| `public/data/translit/11.json` | 20,246 | `bdf12d5ddf6eacb7…` |
| `public/data/translit/110.json` | 279 | `5c1b589487215a8a…` |
| `public/data/translit/111.json` | 309 | `7da0067c09c6257f…` |
| `public/data/translit/112.json` | 211 | `3f5209a56a2c66a0…` |
| `public/data/translit/113.json` | 297 | `4ff752c62b50e0c0…` |
| `public/data/translit/114.json` | 281 | `bd9e051d4c7fe7fe…` |
| `public/data/translit/12.json` | 18,825 | `c598d7819ca2277a…` |
| `public/data/translit/13.json` | 9,146 | `c996159f4a379239…` |
| `public/data/translit/14.json` | 9,094 | `d6bc5ee95f3df722…` |
| `public/data/translit/15.json` | 7,460 | `2021e29464363327…` |
| `public/data/translit/16.json` | 20,077 | `150105457b320785…` |
| `public/data/translit/17.json` | 16,859 | `61a34892483c6815…` |
| `public/data/translit/18.json` | 16,987 | `7c72a7db8001770c…` |
| `public/data/translit/19.json` | 10,455 | `9c87a57a495592e0…` |
| `public/data/translit/2.json` | 66,226 | `bc1740ff58708f10…` |
| `public/data/translit/20.json` | 14,187 | `940a8bd4e709a7f7…` |
| `public/data/translit/21.json` | 12,939 | `0d55683b886fa3c3…` |
| `public/data/translit/22.json` | 13,810 | `ace8194a08b3f4bb…` |
| `public/data/translit/23.json` | 11,633 | `748095c2730ccfe2…` |
| `public/data/translit/24.json` | 14,584 | `3ca0c21df1b3d286…` |
| `public/data/translit/25.json` | 9,891 | `e55ed8e75a1672b9…` |
| `public/data/translit/26.json` | 14,681 | `b4e37b19bd2938f0…` |
| `public/data/translit/27.json` | 12,399 | `81d8624263919236…` |
| `public/data/translit/28.json` | 15,192 | `70533f92da7f21bf…` |
| `public/data/translit/29.json` | 10,808 | `e7f1375d87412b4f…` |
| `public/data/translit/3.json` | 37,686 | `797d75346c049de0…` |
| `public/data/translit/30.json` | 8,937 | `58a4a621c2754334…` |
| `public/data/translit/31.json` | 5,799 | `2a449886d00a10b3…` |
| `public/data/translit/32.json` | 4,019 | `8bccd291e34687a2…` |
| `public/data/translit/33.json` | 14,296 | `fa7ea5bcf58607c7…` |
| `public/data/translit/34.json` | 9,296 | `f68ec8fc9f8069e5…` |
| `public/data/translit/35.json` | 8,375 | `a4253b3a65d9cfa1…` |
| `public/data/translit/36.json` | 7,956 | `c44bf676029b06a9…` |
| `public/data/translit/37.json` | 10,114 | `568cc6f8b200683a…` |
| `public/data/translit/38.json` | 8,151 | `e6660b25dcc9c100…` |
| `public/data/translit/39.json` | 12,565 | `d5c3aae2a73872a4…` |
| `public/data/translit/4.json` | 40,633 | `ddfaf7316b4fa6ea…` |
| `public/data/translit/40.json` | 13,085 | `e7eab4b3170df617…` |
| `public/data/translit/41.json` | 8,663 | `0a21fa2aafe26009…` |
| `public/data/translit/42.json` | 9,175 | `2a2ea3ce75ade6ad…` |
| `public/data/translit/43.json` | 9,362 | `28d3bd0c05b7470f…` |
| `public/data/translit/44.json` | 3,863 | `247c81f62a7c7ace…` |
| `public/data/translit/45.json` | 5,374 | `ad023550f7d56845…` |
| `public/data/translit/46.json` | 6,821 | `157613f085d56b8a…` |
| `public/data/translit/47.json` | 6,097 | `fa04f94e23dcbd52…` |
| `public/data/translit/48.json` | 6,321 | `d85597458f4e55da…` |
| `public/data/translit/49.json` | 3,835 | `d4a4857d3d460af6…` |
| `public/data/translit/5.json` | 30,403 | `5c8860c1436a2945…` |
| `public/data/translit/50.json` | 4,104 | `9052e8210f71792b…` |
| `public/data/translit/51.json` | 4,051 | `693a37905297df39…` |
| `public/data/translit/52.json` | 3,518 | `ee31a74756424126…` |
| `public/data/translit/53.json` | 3,823 | `1580588d4e656f3e…` |
| `public/data/translit/54.json` | 3,988 | `d779face498fd1f7…` |
| `public/data/translit/55.json` | 4,349 | `ba0073150ef93d72…` |
| `public/data/translit/56.json` | 4,631 | `90dec7e8d5025b80…` |
| `public/data/translit/57.json` | 6,385 | `0128d0358390e6b5…` |
| `public/data/translit/58.json` | 5,165 | `1616f632f52cf673…` |
| `public/data/translit/59.json` | 4,942 | `96381c5a4bdcb064…` |
| `public/data/translit/6.json` | 32,695 | `527816e6e4b8ec41…` |
| `public/data/translit/60.json` | 3,855 | `9a9dfee54891a6bb…` |
| `public/data/translit/61.json` | 2,473 | `855feefcd8f3ca9f…` |
| `public/data/translit/62.json` | 1,972 | `8e7c6841f38119e1…` |
| `public/data/translit/63.json` | 2,045 | `a3e45a3535c02daf…` |
| `public/data/translit/64.json` | 2,808 | `158036fe5f29adf8…` |
| `public/data/translit/65.json` | 3,173 | `1de0e7020178cf54…` |
| `public/data/translit/66.json` | 2,854 | `0433ca0ac3c86cb7…` |
| `public/data/translit/67.json` | 3,578 | `b262085d6da01d8a…` |
| `public/data/translit/68.json` | 3,463 | `ef78f5268c8c2103…` |
| `public/data/translit/69.json` | 3,099 | `72de53f6de36dfb2…` |
| `public/data/translit/7.json` | 36,326 | `1140bfc049eaae10…` |
| `public/data/translit/70.json` | 2,614 | `d73fb264dcae4a7a…` |
| `public/data/translit/71.json` | 2,508 | `bd9f13def843afd4…` |
| `public/data/translit/72.json` | 3,026 | `e033991872eb1585…` |
| `public/data/translit/73.json` | 2,243 | `5f54f6f0b086afb8…` |
| `public/data/translit/74.json` | 2,877 | `0293a353a917512b…` |
| `public/data/translit/75.json` | 1,898 | `6fa36b908fb27e7e…` |
| `public/data/translit/76.json` | 2,849 | `181b6f8033a2003f…` |
| `public/data/translit/77.json` | 2,278 | `f4877639006011e5…` |
| `public/data/translit/78.json` | 2,079 | `c12e2c752784b0a2…` |
| `public/data/translit/79.json` | 2,118 | `fc91f2a3078ae88a…` |
| `public/data/translit/8.json` | 13,591 | `233b57b5188e939d…` |
| `public/data/translit/80.json` | 1,622 | `e9e4560331445d60…` |
| `public/data/translit/81.json` | 1,261 | `a7c88964b5acab1f…` |
| `public/data/translit/82.json` | 947 | `f735cf9b2e9874d7…` |
| `public/data/translit/83.json` | 1,996 | `c66571c442b0c817…` |
| `public/data/translit/84.json` | 1,256 | `8e529db76e58b709…` |
| `public/data/translit/85.json` | 1,290 | `9622d85ba87b42f6…` |
| `public/data/translit/86.json` | 743 | `47ea3963b331d429…` |
| `public/data/translit/87.json` | 878 | `5c854106ec4faaf8…` |
| `public/data/translit/88.json` | 1,144 | `d0a7422815ae883e…` |
| `public/data/translit/89.json` | 1,647 | `e597e3180604944d…` |
| `public/data/translit/9.json` | 27,588 | `5e9c3631a10f6b07…` |
| `public/data/translit/90.json` | 981 | `4e915de9ec4bfe99…` |
| `public/data/translit/91.json` | 714 | `a08df33514dde4ce…` |
| `public/data/translit/92.json` | 914 | `56170f09786b07e7…` |
| `public/data/translit/93.json` | 524 | `e5d7f3e351109e26…` |
| `public/data/translit/94.json` | 374 | `8306e005770c24a8…` |
| `public/data/translit/95.json` | 471 | `3ff1849e7c2536a1…` |
| `public/data/translit/96.json` | 844 | `547743590d66c28d…` |
| `public/data/translit/97.json` | 373 | `3c69727451e94e32…` |
| `public/data/translit/98.json` | 1,081 | `ef6e803c9e0d157d…` |
| `public/data/translit/99.json` | 488 | `18849cbc1127071b…` |
| `public/data/vec/bge_m3_int8.bin` | 6,385,664 | `d66acec0a760d873…` |
| `public/data/vec/bge_m3_p256_int8.bin` | 1,596,416 | `92155e38d72ca045…` |
| `public/data/vec/bge_m3_p256_proj.bin` | 1,048,576 | `c01c95a85cd9ab2b…` |
| `public/data/vec/meta.json` | 178 | `f883084fb697e8e6…` |
| `public/data/vec/meta_p256.json` | 294 | `924e2c8af2b21f0c…` |
| `public/data/words.json` | 1,478,976 | `ef3686cce81be452…` |
| `public/fonts/fonts.css` | 11,162 | `c978b4acbcc51199…` |
| `public/fonts/LICENSE-FONTS.txt` | 300 | `4ab02f1f04201fee…` |
| `public/img/logo.svg` | 8,228 | `db0631b8835cd416…` |
| `public/img/logo_render.html` | 322 | `540da67f19db5baf…` |
| `public/index.html` | 10,068 | `947fbf1345f2bc6d…` |
| `public/js/app.js` | 88,527 | `5311226f844dd840…` |
| `public/js/basmala.js` | 2,055 | `1327d1d9a44d52c4…` |
| `public/js/dense-rank.js` | 1,948 | `a0b7e7a6b2089141…` |
| `public/js/engine.js` | 124,540 | `0025b5f0cb80bb5c…` |
| `public/js/galaxy.js` | 26,490 | `1308fe28ebe65ffe…` |
| `public/js/glossary.js` | 5,807 | `af51eb753255844e…` |
| `public/js/i18n.js` | 48,762 | `890ab672dac03288…` |
| `public/js/lamp.js` | 10,822 | `fe3b006a8fc4c52b…` |
| `public/js/layouts.js` | 15,887 | `03820da8249823de…` |
| `public/js/letters3d.js` | 3,743 | `f2f0618612440af5…` |
| `public/js/search-worker.js` | 7,969 | `a6cd0d3a50c3b4e2…` |
| `public/js/speech.js` | 5,631 | `a5272f35e914b97a…` |
| `public/js/voice.js` | 6,473 | `6ca59cb06a778a66…` |
| `public/robots.txt` | 26 | `331ea9090db0c9f6…` |
| `public/vendor/three/addons/OrbitControls.js` | 29,868 | `5a44a9e86a2a0fb1…` |
| `public/vendor/three/three.module.min.js` | 670,681 | `3e690ac7d180b0aa…` |
| `README.md` | 10,613 | `be508a614d2d515f…` |
| `server.mjs` | 5,949 | `c55b13495db5c6ef…` |
| `SOURCES.md` | 12,533 | `2813fff296a413d8…` |
| `tests/basmala.test.mjs` | 1,682 | `ec860ab122113b12…` |
| `tests/dense_client.test.mjs` | 2,986 | `9296b113fac6915e…` |
| `tests/engine.test.mjs` | 18,815 | `b72497f6d9dcead6…` |
| `tests/fixes_v5.test.mjs` | 6,795 | `d1ed8ca0d4d57730…` |
| `tests/layouts.test.mjs` | 8,205 | `62f6920a7c826f68…` |
| `tests/load.mjs` | 687 | `e6ba9bf27ba35a62…` |
| `tests/middleware.test.mjs` | 1,381 | `ed21e805e271962e…` |
| `tests/pack.test.mjs` | 8,297 | `8970326633f2d222…` |
| `tests/security.test.mjs` | 2,407 | `1157fbae463b4a39…` |
| `tests/sources2.test.mjs` | 3,732 | `95eb3eb9968ec800…` |
| `tests/voice.test.mjs` | 2,339 | `463011f9c18e4b45…` |
| `tests/words.test.mjs` | 2,292 | `ed849411eadbb0f2…` |
| `tools/make_lamp.py` | 3,461 | `5d09ec9e9e985a2c…` |
| `tools/trace.mjs` | 60,064 | `09ed6fd0d4b0be5d…` |
| `TOOLS.md` | 2,701 | `56bc6658b601a007…` |
| `wrangler.toml` | 106 | `6fbdf536952ae413…` |

### 2.3 Planning documents and code drafts kept next to the repository (15 files)
Plans and drafts written before the window. Draft code in `05_EXECUTION/code_drafts/` is **not** integrated in the repository at the baseline commit; when parts of it are integrated during the window, the commit says so.

| File | Bytes | SHA-256 (prefix) |
|---|---|---|
| `01_PLAN/CARTOGRAPHIE_ERREURS_ET_AMELIORATIONS.md` | 18,046 | `a7d16108cbd2018e…` |
| `01_PLAN/ETUDE_MOTEURS_ET_PLAN_v4.md` | 7,312 | `431c4c6b94d40628…` |
| `01_PLAN/PLAN_AMELIORATION_v3.md` | 17,591 | `9959cfe65dd4af03…` |
| `01_PLAN/PLAN_PROJET.md` | 11,049 | `3fdcee25d5d14ffa…` |
| `01_PLAN/PLAN_v5_CORRECTION_ET_EVOLUTION.md` | 21,088 | `87d3f081f72e0270…` |
| `05_EXECUTION/code_drafts/build_evidence.py` | 2,424 | `28273a8eb23fd33a…` |
| `05_EXECUTION/code_drafts/engine_fixes.md` | 10,585 | `48d76a6162209c69…` |
| `05_EXECUTION/code_drafts/panels.js` | 3,791 | `f270606f743fad00…` |
| `05_EXECUTION/code_drafts/prefs.js` | 3,859 | `60370040d28450a0…` |
| `05_EXECUTION/code_drafts/rag_answer.js` | 9,636 | `6a07789f81e21c25…` |
| `05_EXECUTION/code_drafts/tools_router.js` | 4,924 | `05547f5fbc087819…` |
| `05_EXECUTION/MEMOIRE_PROJET.md` | 2,637 | `a25597c99559be23…` |
| `05_EXECUTION/PROGRESSION.md` | 3,336 | `37551a5e238b21ae…` |
| `05_EXECUTION/REGLES.md` | 2,972 | `6b1d1804f73a2f20…` |
| `05_EXECUTION/TACHES.md` | 4,720 | `68ae2e5242dfa480…` |

## 3. Work during 4–6 October 2026 (evaluated)
Recorded in `CHANGELOG.md` and in dated git commits after the tag `baseline-2026-10-03` (`git log baseline-2026-10-03..HEAD`).
