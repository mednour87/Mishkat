# RAG test on 1,000 questions (5 October 2026)

The whole answer path of the page, run in Node on 1,000 questions and requests (Arabic and English), graded by an
independent model of another family. Final report: [`REPORT_v1-v1j2_v4-v4j2.md`](REPORT_v1-v1j2_v4-v4j2.md).

| File | Role |
|---|---|
| `questions.mjs`, `questions_ar_natural.json` | The 1,000 questions: the set of the 1,000-question map (`eval/map1000`) with 150 index keywords replaced by 150 everyday Arabic questions and requests (10 families × 15) |
| `pipeline.mjs` | The page's path: question map and tools (`scope.js`, `tools.js`, adhkar) → engine with AI (expand, closed-list select, bge-m3 neighbours) → Sunnah section → «الجواب باختصار» (closed list → composer + judge → `rag.js` rules) or, for a ruling, the Fiqh Encyclopedia of Dorar |
| `run.mjs` | Runs the 1,000 questions (resumable); checks every quoted passage **word for word against the source files** and the known expectations |
| `grade.mjs` | Independent judge (DeepSeek-V3.2 via OpenRouter, never the selecting models): relevance 0/1/2 of each verse shown, of the short answer, of the hadiths, of the encyclopedia section; whether the decision (answer / refer / refuse / tool) was right; severity |
| `report.mjs` | Rates with 95 % bootstrap intervals (2,000 resamples, seed 42), by family, list of flagged cases |

Runs: `v1` = code before the test; `v2` = fixes of the first analysis; `v3`, `v4` = fiqh and safety fixes, re-run on the
affected questions only (rulings, violence polemics) — the other rows are those of v2 (same code path).
`j2` = the judge's final instructions; v1 was re-graded with them so that the comparison uses one judge.

| Measure | v1 | v4 (final) |
|---|---|---|
| Technical errors | 0 | 0 |
| Quoted passages not found word for word in their source | 0 / 1,055 | 0 / 1,058 |
| Known expectations met | 495/522 | 501/522 |
| First verse answers directly (judge) | 81.1 % [78.1–84.1] | 84.5 % [81.9–87.1] |
| First verse relevant | 90.3 % | 92.3 % |
| Short answer on topic | 98.6 % | 99.5 % |
| Encyclopedia: right section (when one is shown) | 61.4 % (n=57) | 73.3 % (n=45) |
| Right decision | 76.6 % | 79.5 % |
| Critical cases (could mislead about the religion) | 15 | 2 |

Limits, stated: one automatic judge (no human grading yet — `eval/human/`); the forum questions (islam.stackexchange
titles) remain the weakest family (history, sects, hadith criticism: often outside what verses can answer); fewer
encyclopedia sections are shown (it says «not found» rather than show another subject). Cost of the whole test (5 runs and 4 gradings): about
$3.8 of OpenRouter credit (pipeline fallback when the free tier was saturated, and the judge).

    CF_ACCOUNT=<id> node eval/rag1000/run.mjs --out rows_vN.jsonl --conc 3
    node eval/rag1000/grade.mjs rows_vN.jsonl --out grades_vNj2.jsonl --conc 24
    node eval/rag1000/report.mjs v1:v1j2 vN:vNj2
