# Mishkat on a public benchmark — Qur'an QA 2023, Task A (passage retrieval)

**Benchmark.** Qur'an QA 2023 shared task (bigIR, Qatar University), Task A: given a question in Modern
Standard Arabic, return up to 10 Qur'anic passages that answer it; some questions have **no answer** in the
Qur'an (the system must then return only `-1`). Test split: **52 questions** (7 without an answer), gold answers
annotated by Qur'an scholars. Official scorer `QQA23_TaskA_eval.py` (pytrec_eval): **MAP@10** and **MRR@10**.
Data: CC BY-NC-ND 4.0 — downloaded by `get_data.sh`, used unmodified, not redistributed.

**How Mishkat is run.** `node eval/run_qqa23.mjs <mode> test` asks the product's own engine each question
(`ask()`, Arabic interface) and maps every verse it shows, in order, to the thematic passage containing it
(first 10 distinct passages). If the engine shows no verse, the run contains `-1` (abstention).
Nothing is tuned on the test questions; the engine is the one deployed.

## Results (test split, 2 October 2026)

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

## Reading

- **MRR@10 0.609**: the first passage Mishkat shows is right more often than with the best published
  fine-tuned systems (0.576), with **no training on Qur'an QA data** and while every verse shown comes from the
  verified text, chosen from a closed list.
- **MAP@10 is lower (0.266 vs 0.313)** by design: Mishkat shows only the verses the AI confirms
  (a few, with their full tafsir) instead of ten passages; recall of *all* gold passages is not its goal.
- **AI is the main gain** (MAP +57 %, MRR ×3.4 over the engine without AI); semantic neighbours add a little
  on top and halve the wrong abstentions (9 → 4).
- **Abstention**: 4 abstentions on 52 questions (7 expected); questions with no answer in the Qur'an
  (e.g. «من هم العشرة المبشرين بالجنة؟») are only rewarded if the system says nothing — Mishkat may still show
  related verses, which the benchmark counts as wrong.
- **Limits**: one run (LLM answers vary slightly between runs); 52 questions; the AI's temperature is 0.

## Reproduce

```bash
sh eval/qqa23/get_data.sh
pip install pandas pytrec-eval-terrier
node server.mjs 8790                          # local API with the AI keys of .dev.vars
CF_ACCOUNT=... CF_AI_TOKEN=... node eval/run_qqa23.mjs ai_dense test
cd eval/qqa23 && python QQA23_TaskA_eval.py -r runs/test/Mishkat_aidense.tsv -q QQA23_TaskA_ayatec_v1.2_qrels_test.gold
```
