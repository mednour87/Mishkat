#!/bin/sh
# T070: three runs of Qur'an QA 2023 (test) on Groq's FREE tier only, spaced for its quotas
# (8,000 tokens/min per model: one question every 20 s; 5 min between runs).
# Needs the local API started with FREE_ONLY=1:   FREE_ONLY=1 node server.mjs 8791
# Then: python eval/qqa23/score_free3.py
cd "$(dirname "$0")/../.."
mkdir -p eval/qqa23/runs/free3
export MISHKAT_API=${MISHKAT_API:-http://localhost:8791} EVAL_DELAY_MS=${EVAL_DELAY_MS:-20000}
export CF_ACCOUNT=${CF_ACCOUNT:-0e83a92effbff0745b491591dd8371d2}
for k in ${RUNS:-1 2 3}; do
  npx wrangler whoami >/dev/null 2>&1      # refreshes the OAuth token used for Workers AI (bge-m3)
  export CF_AI_TOKEN=$(grep '^oauth_token' "$APPDATA/xdg.config/.wrangler/config/default.toml" | sed 's/.*= *"\(.*\)"/\1/')
  node eval/run_qqa23.mjs ai_dense test 2>&1 | tail -1 | tee eval/qqa23/runs/free3/run$k.log
  cp eval/qqa23/runs/test/Mishkat_aidense.tsv eval/qqa23/runs/free3/run$k.tsv
  if [ "$k" != 3 ]; then sleep 300; fi
done
