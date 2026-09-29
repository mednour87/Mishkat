# Baseline disclosure · الإفصاح عن نسخة الأساس

The challenge rules allow pre-existing work if its baseline is disclosed before 4 October 2026; only work done during the challenge (4–6 October 2026) is evaluated. This file documents, honestly and with fingerprints, what existed before.

## 1. Pre-existing project: “Quran Cartography” (author’s own, July–August 2026)
- A letter- and word-level database of the Quran (`quran.db`: 6,236 verses, 77,433 words, 326,159 letters) built from the Tanzil text, with a semantic colour layer (names of Allah, prophets, angels, Satan).
- An atlas of static figures and 14 interactive Plotly 3D “galaxies” with audio, served as a local static website.
- **No AI component, no search, no tafsir, no translations, no online deployment.**
- Fingerprints: `quran.db` SHA-256 `28a57cd5d6a12d443745c71a33bd6a93c6b0797032e112bcc78feeac812f5309`; Tanzil text `bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8`.

## 2. Mishkat prototype written before the challenge window (28–29 September 2026)
For full transparency: a first version of this repository (engine, WebGL galaxy, UI, tests, evaluation, documentation) was written on 28–29 September 2026 while preparing the application. It is part of the declared baseline. Snapshot generated 2026-09-29 (49 files):

| File | Bytes | SHA-256 (prefix) |
|---|---|---|
| `CHANGELOG.md` | 396 | `e867397cfa7c684d…` |
| `data_build/baseline_snapshot.py` | 2,444 | `23b8b9aa07affae1…` |
| `data_build/build_data.py` | 11,999 | `ad7c39112239f855…` |
| `data_build/fetch_extra.py` | 3,487 | `0d79e5652140a11d…` |
| `data_build/fetch_sources.py` | 4,189 | `e84e100321480310…` |
| `data_build/quran-uthmani.txt` | 1,370,878 | `bf4f57b968d03f41…` |
| `DEPLOY.md` | 1,493 | `4c40fac3b6981fe7…` |
| `docs/make_deck.py` | 15,905 | `d71b70a0356277c8…` |
| `eval/bench_llm.mjs` | 3,042 | `2590049a1a4dd808…` |
| `eval/make_golden.mjs` | 12,178 | `267f88cf94388981…` |
| `eval/report.mjs` | 4,618 | `5ec4ccd550eacd83…` |
| `eval/results/bench_llm.json` | 999 | `5fa3b56b0affa10d…` |
| `eval/results/REPORT.md` | 5,834 | `b91f30d6389825f8…` |
| `eval/results/results.json` | 345,626 | `afc09e0a0fd6d131…` |
| `eval/run_eval.mjs` | 8,435 | `a0e11fe21d0a04b2…` |
| `functions/_lib/handler.js` | 1,343 | `587b00c87fd2480c…` |
| `functions/_lib/selector.js` | 8,200 | `05d6c6a936cd325d…` |
| `functions/api/expand.js` | 204 | `972ddb618b045055…` |
| `functions/api/health.js` | 269 | `849cfb01fcd2757d…` |
| `functions/api/select.js` | 204 | `78858e4055b6f329…` |
| `package.json` | 485 | `c089863a0c833739…` |
| `public/css/app.css` | 17,093 | `d05d9e9d3036cff1…` |
| `public/data/build_info.json` | 2,737 | `fd45a5571ed5af25…` |
| `public/data/core.json` | 1,361,623 | `4de8b86c65997541…` |
| `public/data/galaxy.bin` | 1,161,507 | `bef498e119939c06…` |
| `public/data/search_ar.json` | 1,318,106 | `667b744cfde9395c…` |
| `public/data/tafsir_mukhtasar_ar.json` | 1,923,246 | `5271c233ff8664f6…` |
| `public/data/tafsir_mukhtasar_en.json` | 1,782,041 | `837c42ef788733b6…` |
| `public/data/tafsir_mukhtasar_fr.json` | 1,911,749 | `d6d1a0328fbc399c…` |
| `public/data/tafsir_muyassar_ar.json` | 2,520,160 | `0d053a08d8f30f01…` |
| `public/data/tafsir_rashid_fr.json` | 1,218,213 | `49d21261e52dfef9…` |
| `public/data/tafsir_saheeh_en.json` | 1,073,719 | `53366a1e34847e68…` |
| `public/data/words.json` | 1,478,976 | `ef3686cce81be452…` |
| `public/img/logo.svg` | 2,533 | `2769a597ee358e21…` |
| `public/img/logo_render.html` | 176 | `ae47f19966b40328…` |
| `public/index.html` | 3,464 | `dc3cd1aa7a38aad9…` |
| `public/js/app.js` | 24,219 | `38cb05001162cc64…` |
| `public/js/engine.js` | 54,230 | `4c0a940b950b2131…` |
| `public/js/galaxy.js` | 14,142 | `a33842c368b4c860…` |
| `public/js/i18n.js` | 17,675 | `ea2a6c6633ebfadc…` |
| `public/vendor/three/addons/OrbitControls.js` | 29,868 | `5a44a9e86a2a0fb1…` |
| `public/vendor/three/three.module.min.js` | 670,681 | `3e690ac7d180b0aa…` |
| `README.md` | 6,740 | `5fd7d5fff4748dbe…` |
| `server.mjs` | 3,112 | `a0d100d4f82ecd63…` |
| `SOURCES.md` | 4,260 | `925867ad7d2c5f1e…` |
| `tests/engine.test.mjs` | 16,117 | `277f9ebb5e7a66b3…` |
| `tests/load.mjs` | 716 | `0f412c503dff1ec8…` |
| `TOOLS.md` | 1,806 | `e5d8ea2898f7e3f0…` |
| `wrangler.toml` | 85 | `5894441c5a2a0085…` |

## 3. Work during 4–6 October 2026 (evaluated)
Recorded in `CHANGELOG.md` and in dated git commits from 4 October 2026.
