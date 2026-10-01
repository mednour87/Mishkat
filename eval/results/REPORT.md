# Mishkat — evaluation report

Generated 2026-10-01T06:29:05.651Z · 338 synthetic items (`eval/golden.jsonl`, seeded, no user data). The AI-augmented mode is run on the items where the LLM acts (topics and safety).

| Category | n | Keyword search (baseline) | Mishkat (deterministic) |
|---|---|---|---|
| Verse references (7 formats, ar/en/fr, Arabic digits) | 28 | 0.0 % | 100.0 % |
| Surah names (3 languages, typos) | 25 | 0.0 % | 96.0 % |
| Well-known verse names | 6 | 0.0 % | 100.0 % |
| Non-existent references | 8 | 0.0 % | 100.0 % |
| Exact quotes (imla'i fragments) | 30 | 3.3 % | 100.0 % |
| Full verses pasted in Uthmani script | 15 | 100.0 % | 100.0 % |
| Misquotes (1 word changed) | 30 | 0.0 % | 100.0 % |
| Two verses merged | 15 | 0.0 % | 100.0 % |
| Sayings wrongly attributed to the Quran (Arabic) | 20 | 100.0 % | 100.0 % |
| Translated sayings wrongly attributed to the Quran | 6 | 0.0 % | 100.0 % |
| Fatwa / personal / dream questions → abstain | 40 | 0.0 % | 100.0 % |
| Sensitive words in legitimate topics → must NOT abstain | 15 | 100.0 % | 100.0 % |
| Out-of-scope / gibberish → no verses | 10 | 100.0 % | 100.0 % |
| Topics — Arabic (hit@10) | 30 | 0.0 % | 76.7 % |
| Topics — English (hit@10) | 30 | 50.0 % | 76.7 % |
| Topics — French (hit@10) | 30 | 63.3 % | 73.3 % |
| **All items evaluated in the mode** | | **28.1 %** (n=338) | **93.2 %** (n=338) |

## Topic retrieval detail (recall@30 / MRR)

| Language | Keyword search (baseline) | Mishkat (deterministic) |
|---|---|---|
| ar | 0.00 / 0.00 | 0.40 / 0.57 |
| en | 0.31 / 0.34 | 0.44 / 0.50 |
| fr | 0.32 / 0.47 | 0.33 / 0.47 |

## Safety & grounding (target 0)

| Metric | Keyword search (baseline) | Mishkat (deterministic) |
|---|---|---|
| Unsafe outputs (misquote accepted as exact, saying attributed to the Quran, fatwa answered, fake reference shown) | 46 | 0 |
| References outside the 6,236 verses | 0 | 0 |
| Answer sentences not verbatim from the cited tafsir | 0 | 0 |
| Latency p50 / p95 (ms, in-process; AI mode includes network) | 2 / 12 | 0 / 15 |

**Stability:** 338/338 items return identical verse lists over 3 repeated runs of the deterministic engine.

**AI-augmented mode:** not run (no GROQ_API_KEY).

### Remaining failures — Mishkat (deterministic) (23)

- `route_sura-023` kahff → notfound 
- `topic_en-002` kindness to parents → topic 31:15
- `topic_en-008` mercy of Allah → topic 27:77, 31:3, 23:118, 19:2, 15:56
- `topic_en-011` Maryam → sura 19:1, 19:2, 19:3, 19:4, 19:5
- `topic_fr-011` Marie mère de Jésus → topic 5:17, 23:50, 5:75, 5:116, 5:110
- `topic_ar-013` إبراهيم → topic 37:104, 26:69, 87:19, 15:51, 21:60
- `topic_ar-014` نوح والطوفان → topic 17:3, 36:41, 25:37, 11:43, 71:21
- `topic_ar-018` الجنة → topic 59:20, 26:90, 88:10, 26:85, 69:22
- `topic_fr-018` le paradis → topic 74:40, 70:35, 79:41, 69:22, 13:35
- `topic_ar-019` النار جهنم → topic 52:13, 35:36, 9:68, 9:63, 98:6
- `topic_en-019` hellfire → topic 102:6, 56:94, 26:91, 69:31, 79:39
- `topic_fr-019` l’enfer → topic 74:35, 74:42, 84:12, 81:12, 5:10
- `topic_fr-020` la mort → topic 79:14, 44:56, 53:44, 77:26, 44:35
- `topic_en-021` gratitude → topic 25:62, 76:9, 27:40, 34:13, 2:243
- `topic_ar-025` الشورى → sura 42:1, 42:2, 42:3, 42:4, 42:5
- `topic_fr-025` la consultation → sura 42:1, 42:2, 42:3, 42:4, 42:5
- `topic_ar-027` الملائكة → topic 15:30, 15:8, 37:150, 38:73, 15:7
- `topic_en-027` angels → topic 74:30, 77:5, 50:23, 80:15, 37:1
- `topic_fr-027` les anges → topic 77:5, 37:3, 51:4, 25:22, 37:1
- `topic_ar-029` الصدق → topic 29:3, 39:33, 75:31, 46:16, 3:95
- `topic_en-029` truthfulness → topic 5:119, 26:31, 44:13, 37:14, 81:22
- `topic_fr-029` la véracité → topic 49:6, 24:15, 38:88, 26:30, 37:14
- `topic_fr-030` dépenser dans le sentier d’Allah → topic 8:37

