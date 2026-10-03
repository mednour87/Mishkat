# Changelog

## Baseline (declared) — 28–29 September 2026
See BASELINE.md: Quran Cartography database + Mishkat v2 prototype (engine, AI pipeline, reader with synchronised recitation, WebGL galaxy, tests, evaluation, docs).

## Preparation (declared in the baseline) — 3 October 2026
Audit of 3 October (`01_PLAN/CARTOGRAPHIE_ERREURS_ET_AMELIORATIONS.md`) and first corrections, done before the window and declared:
- T010–T014 (E1, E2, E3, E4, E5, E8): the AI's closed-list selection always runs (a subject-index topic is only a candidate list); status words without «هل» («الموسيقى حرام», "music haram") are fatwa requests; the «personal case» guard only fires on a decision about a relative/spouse/employer; the short answer only when the AI confirmed and never with a sentence lacking a word of the question; regex `(?=\S)` restored. Tests `tests/fixes_v5.test.mjs` + over-refusal bench `eval/overrefusal.json` (50 questions).
- T015 (E7): circuit breakers per provider:model; 401/402 → 30 min; server budget 7.5 s so the free backup is reached; the page cuts the AI only after 3 failures in a row, for 60 s.
- T016 (E9, E11): sensitivity (level C) from the text or the context pack actually used; penalties list widened; quoted war verses flagged with their context.
- T017 (E12, E13): no suggestion for words the tafsirs use often; sure one-letter misspellings corrected («الزكات» → «الزكاة»).
- T018 part 1 (I2): POST requests without an Origin header refused.
- T019 (I1): semantic search ranked in the browser (Web Worker, 6,236 × 256 int8 vectors, 1.6 MB); the API only embeds and projects the question (< 1 ms CPU, inside the free plan's 10 ms); `/api/dense` called only when the server has an embedding model. Select prompt: every subject of «X و Y» covered; English translation named correctly.
- T020 (X1, X3): one confidence badge per answer; galaxy toolbar fully visible at 375 px.
- Tests: 93/93.
- Later on 3 October, at the author's request (also declared): tool modules not yet wired (Hijri calendar, khatma plan with .ics, panels, local preferences; Tanzil page/juz metadata); **extractive RAG short answer** (`/api/answer`: composer returns sentence IDs per concept from a closed list built in the browser, independent judge model, uncovered concepts reported, verbatim display; `tests/answer.test.mjs`, live check `eval/results/rag_live.json`); honest benchmark figures (bootstrap 95 % CIs, `eval/qqa23/bootstrap_ci.py`: comparable to the published best, not significantly better); benefit-measurement kit (`eval/human/`: blind A/B rating sheet Mishkat vs a general chatbot, automatic count of invented/altered Quran quotations, user-test protocol with SUS ar/en, scoring script).
- RAG v5.1 (evening of 3 October, declared): closed list from all sources of truth — verse text (Tanzil), tafsir units (whole sentences, no fragments), graded hadiths, and for ruling questions only fatwas published by Sheikh Ibn Baz (question + answer paragraphs, verbatim, link, disclaimer); question types (ruling, comfort, virtue, how-to, why, definition, story, topic) with per-type instructions to composer and judge; fixed rules after the models (R1 closed list & dedupe, R2 judge required, R3 ruling ⇔ fatwa only, R4 related verse needs a shared word, R5 no punishment passages for a distressed visitor, R6 caps, R7 model labels only if in the question, R8 whole sentences, R9 a verse always with its tafsir, a fatwa always with its question); cost caps (OpenRouter max_price 0.2/0.8 $/M tokens: measured $0.0014 per question instead of $0.0028; daily ceiling of AI calls; worker cache). Tests 114/114 (`tests/rag_rules.test.mjs`); live run on 17 questions `eval/results/rag_live.json`.

## Challenge — 4 October 2026
- (to be filled with the work done during the challenge window)

## Challenge — 5 October 2026
-

## Challenge — 6 October 2026
-
