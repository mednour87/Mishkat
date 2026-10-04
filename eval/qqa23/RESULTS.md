# Mishkat on a public benchmark — Qur'an QA 2023, Task A (passage retrieval)

## Latest measure — 4 October 2026, Groq free tier only (cost 0)

The deployed pipeline (engine + AI expansion + closed-list selection + bge-m3 neighbours), run three times,
5 minutes apart, on **Groq's free tier only** (`FREE_ONLY=1`: the paid provider removed; one question every 20 s
to stay inside the free quota of 8,000 tokens/min), `eval/qqa23/run_free3.sh`, scored by `score_free3.py`
(official per-question scores, bootstrap 2,000 × seed 42) → `ci_free3.json`. **51 scored questions**: the test
split has 52 questions but question 504 has no judgement in the official gold file, so the official scorer (and
every figure below, as on 2–3 October) covers 51.

| Run | MAP@10 [95 % CI] | MRR@10 [95 % CI] | abstentions | failed AI calls |
|---|---|---|---|---|
| run 1 | 0.295 [0.207–0.398] | 0.620 [0.493–0.747] | 5 | 0 |
| run 2 | 0.295 [0.207–0.398] | 0.620 [0.493–0.747] | 5 | 0 |
| run 3 | 0.310 [0.220–0.415] | 0.609 [0.480–0.739] | 5 | 1 |
| **mean of the 3 runs (per question)** | **0.300 [0.210–0.402]** | **0.616 [0.490–0.742]** | | |
| best published (arXiv 2412.11431) | 0.313 | 0.576 | | |

**Reading (honest):** the published best lies **inside** both intervals: Mishkat is **comparable** to the best
fine-tuned systems, **not** shown to be better. The free tier gives the same level as the paid run of 2 October
(MRR 0.609, MAP 0.266 — MAP is higher today, inside the same intervals).
**Limits:** runs 1 and 2 are identical because the local API caches identical AI requests, as the deployed edge
cache does — the spread between runs (MRR 0.609–0.620) therefore understates the variance of the models; run 3
differs where the day's engine fixes changed the candidate lists. The test questions were seen during development
(no tuning on them, but not a blind test). 51 questions, Arabic only.

---

**Benchmark.** Qur'an QA 2023 shared task (bigIR, Qatar University), Task A: given a question in Modern
Standard Arabic, return up to 10 Qur'anic passages that answer it; some questions have **no answer** in the
Qur'an (the system must then return only `-1`). Test split: **52 questions** (7 without an answer; 51 have a judgement in the gold file and are scored), gold answers
annotated by Qur'an scholars. Official scorer `QQA23_TaskA_eval.py` (pytrec_eval): **MAP@10** and **MRR@10**.
Data: CC BY-NC-ND 4.0 — downloaded by `get_data.sh`, used unmodified, not redistributed.

**How Mishkat is run.** `node eval/run_qqa23.mjs <mode> test` asks the product's own engine each question
(`ask()`, Arabic interface) and maps every verse it shows, in order, to the thematic passage containing it
(first 10 distinct passages). If the engine shows no verse, the run contains `-1` (abstention).
Nothing is tuned on the test questions; the engine is the one deployed.

## Earlier results (test split, 2 October 2026, OpenRouter)

| Run | What it uses | MAP@10 | MRR@10 | abstentions (7 expected) |
|---|---|---|---|---|
| `Mishkat_lex` | engine without AI (words, thesaurus, subject index) | 0.167 | 0.176 | 47 |
| `Mishkat_dense` | bge-m3 semantic neighbours alone (ablation, not a product mode) | 0.119 | 0.305 | 0 |
| `Mishkat_ai` | + AI expansion and closed-list selection (gpt-oss-120b via OpenRouter) | 0.262 | 0.597 | 9 |
| **`Mishkat_aidense`** | **+ semantic neighbours as candidates and as a check of AI-proposed verses (deployed product)** | **0.266** | **0.609** | 4 |

For reference (published, same test set, as reported by their authors):

| System | MAP@10 | MRR@10 |
|---|---|---|
| bigIR BM25 baseline (organisers' run, scored here on the dev split) | 0.170 | 0.313 |
| Best 2023 systems / later fine-tuned ensembles (arXiv 2412.11431) | 0.313 | 0.576 |
| LLMs used directly as retrievers (ArabicNLP 2025) | higher, but they *write* references, which may be inaccurate | |

## 95 % confidence intervals (added 3 October 2026, audit V2)

| Run | MAP@10 [95 % CI] | MRR@10 [95 % CI] |
|---|---|---|
| `Mishkat_ai` | 0.262 [0.174–0.360] | 0.597 [0.467–0.721] |
| `Mishkat_aidense` | 0.266 [0.181–0.361] | 0.609 [0.485–0.725] |
| `Mishkat_dense` | 0.119 [0.061–0.190] | 0.305 [0.212–0.414] |
| `Mishkat_lex` | 0.167 [0.069–0.284] | 0.176 [0.078–0.294] |

Published best (MAP 0.313, MRR 0.576) is inside the intervals of `Mishkat_ai` and `Mishkat_aidense`: the difference is not significant on 51 scored questions.

## Reading

- **MRR@10 0.609, 95 % CI [0.485–0.725]** (bootstrap, 2,000 samples of the 51 scored questions, seed 42, `bootstrap_ci.py` → `ci_test.json`): the published best (0.576) lies **inside** this interval, so Mishkat is **comparable** to the best fine-tuned systems, **not** shown to be better — with no training on Qur'an QA data, every verse coming from the verified text and chosen from a closed list. One run only; the test questions were seen before later commits (no tuning on them, but not a blind test).
- **MAP@10 is lower (0.266 vs 0.313)** by design: Mishkat shows only the verses the AI confirms
  (a few, with their full tafsir) instead of ten passages; recall of *all* gold passages is not its goal.
- **AI is the main gain** (MAP +57 %, MRR ×3.4 over the engine without AI); semantic neighbours add a little
  on top (MRR +0.012, paired 95 % CI [-0.067, 0.094]: **not significant**) and halve the wrong abstentions (9 → 4).
- **Abstention**: 4 abstentions on 52 questions (7 expected); questions with no answer in the Qur'an
  (e.g. «من هم العشرة المبشرين بالجنة؟») are only rewarded if the system says nothing — Mishkat may still show
  related verses, which the benchmark counts as wrong.
- **Limits**: one run (LLM answers vary slightly between runs); 51 scored questions; the AI's temperature is 0.

## Reproduce

```bash
sh eval/qqa23/get_data.sh
pip install pandas pytrec-eval-terrier
node server.mjs 8790                          # local API with the AI keys of .dev.vars
CF_ACCOUNT=... CF_AI_TOKEN=... node eval/run_qqa23.mjs ai_dense test
cd eval/qqa23 && python QQA23_TaskA_eval.py -r runs/test/Mishkat_aidense.tsv -q QQA23_TaskA_ayatec_v1.2_qrels_test.gold
```
