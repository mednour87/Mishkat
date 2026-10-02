#!/bin/sh
# Qur'an QA 2023 Task A data and official scorer (CC BY-NC-ND 4.0 — downloaded, never modified or redistributed)
B="https://gitlab.com/bigirqu/quran-qa-2023/-/raw/main"
cd "$(dirname "$0")"
for f in LICENSE README.md Task-A/data/QQA23_TaskA_ayatec_v1.2_test.tsv Task-A/data/QQA23_TaskA_ayatec_v1.2_dev.tsv \
  Task-A/data/Thematic_QPC/QQA23_TaskA_QPC_v1.1.tsv Task-A/data/qrels/QQA23_TaskA_ayatec_v1.2_qrels_test.gold \
  Task-A/data/qrels/QQA23_TaskA_ayatec_v1.2_qrels_dev.gold Task-A/code/QQA23_TaskA_eval.py \
  Task-A/code/QQA23_TaskA_submission_checker.py Task-A/data/runs/bigIR_BM25.tsv; do
  curl -s -o "$(basename "$f")" "$B/$f"
done
echo "pip install pandas pytrec-eval-terrier   # then: python QQA23_TaskA_eval.py -r runs/<run>.tsv -q QQA23_TaskA_ayatec_v1.2_qrels_test.gold"
