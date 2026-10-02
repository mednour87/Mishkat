# Mishkat — evaluation report

Generated 2026-10-02T06:10:12.429Z · 298 synthetic items (`eval/golden.jsonl`, seeded, no user data). The AI-augmented mode is run on the items where the LLM acts (topics and safety).

| Category | n | Keyword search (baseline) | Mishkat (deterministic) | Mishkat + AI |
|---|---|---|---|---|
| Verse references (7 formats, ar/en/fr, Arabic digits) | 28 | 0.0 % | 100.0 % | — |
| Surah names (3 languages, typos) | 24 | 0.0 % | 95.8 % | — |
| Well-known verse names | 5 | 0.0 % | 100.0 % | — |
| Non-existent references | 8 | 0.0 % | 100.0 % | — |
| Exact quotes (imla'i fragments) | 30 | 3.3 % | 100.0 % | — |
| Full verses pasted in Uthmani script | 15 | 100.0 % | 100.0 % | — |
| Misquotes (1 word changed) | 30 | 0.0 % | 100.0 % | — |
| Two verses merged | 15 | 0.0 % | 100.0 % | — |
| Sayings wrongly attributed to the Quran (Arabic) | 20 | 100.0 % | 100.0 % | — |
| Translated sayings wrongly attributed to the Quran | 5 | 0.0 % | 100.0 % | — |
| Fatwa / personal / dream questions → abstain | 35 | 0.0 % | 100.0 % | 100.0 % |
| Sensitive words in legitimate topics → must NOT abstain | 13 | 100.0 % | 100.0 % | 100.0 % |
| Out-of-scope / gibberish → no verses | 10 | 100.0 % | 100.0 % | — |
| Topics — Arabic (hit@10) | 30 | 0.0 % | 80.0 % | 96.7 % |
| Topics — English (hit@10) | 30 | 50.0 % | 73.3 % | 90.0 % |
| **All items evaluated in the mode** | | **24.8 %** (n=298) | **95.0 %** (n=298) | **96.3 %** (n=108) |

## Topic retrieval detail (recall@30 / MRR)

| Language | Keyword search (baseline) | Mishkat (deterministic) | Mishkat + AI |
|---|---|---|---|
| ar | 0.00 / 0.00 | 0.40 / 0.58 | 0.61 / 0.84 |
| en | 0.29 / 0.34 | 0.34 / 0.46 | 0.58 / 0.82 |
| fr | — | — | — |

## Safety & grounding (target 0)

| Metric | Keyword search (baseline) | Mishkat (deterministic) | Mishkat + AI |
|---|---|---|---|
| Unsafe outputs (misquote accepted as exact, saying attributed to the Quran, fatwa answered, fake reference shown) | 40 | 0 | 0 |
| References outside the 6,236 verses | 0 | 0 | 0 |
| Answer sentences not verbatim from the cited tafsir | 0 | 0 | 0 |
| Latency p50 / p95 (ms, in-process; AI mode includes network) | 2 / 5 | 1 / 36 | 792 / 1302 |

**Stability:** 298/298 items return identical verse lists over 3 repeated runs of the deterministic engine.

**AI-augmented mode** (chain openai/gpt-oss-120b → openai/gpt-oss-20b → openai/gpt-oss-120b → qwen/qwen3.8-27b → openai/gpt-oss-20b; 108 topic & safety items): LLM used on 70 items (openai/gpt-oss-120b: 69), paragraph chosen by the LLM on 69, 0 out-of-list ids rejected by the verifier, 0 provider errors (each fell back to the deterministic path). Pass on these items: deterministic 94/108 → AI-augmented 104/108.

### Remaining failures — Mishkat (deterministic) (15)

- `route_sura-023` kahff → notfound 
- `topic_en-002` kindness to parents → topic 19:14, 17:25
- `topic_en-008` mercy of Allah → topic 7:151, 4:96, 24:20, 55:1, 23:118
- `topic_en-011` Maryam → sura 19:1, 19:2, 19:3, 19:4, 19:5
- `topic_ar-013` إبراهيم → topic 37:104, 26:69, 87:19, 15:51, 21:60
- `topic_en-013` Abraham → topic 15:51, 37:104, 22:43, 26:69, 21:62
- `topic_ar-014` نوح والطوفان → topic 17:3, 36:41, 25:37, 11:43, 71:21
- `topic_ar-018` الجنة → topic 59:20, 26:90, 88:10, 26:85, 69:22
- `topic_en-018` paradise → topic 89:30, 81:13, 59:20, 76:18, 43:72
- `topic_ar-019` النار جهنم → topic 52:13, 35:36, 9:68, 9:63, 98:6
- `topic_en-019` hellfire → topic 102:6, 56:94, 26:91, 69:31, 79:39
- `topic_ar-025` الشورى → sura 42:1, 42:2, 42:3, 42:4, 42:5
- `topic_ar-027` الملائكة → topic 15:30, 15:8, 37:150, 38:73, 15:7
- `topic_en-027` angels → topic 74:30, 77:5, 50:23, 80:15, 37:1
- `topic_en-029` truthfulness → topic 5:119, 33:8, 27:27, 21:38, 34:29

### Remaining failures — Mishkat + AI (4)

- `topic_en-009` story of Joseph → topic 12:10, 12:18, 12:36, 12:41, 12:43
- `topic_en-011` Maryam → sura 19:1, 19:2, 19:3, 19:4, 19:5
- `topic_ar-025` الشورى → sura 42:1, 42:2, 42:3, 42:4, 42:5
- `topic_en-025` consultation → notfound 

