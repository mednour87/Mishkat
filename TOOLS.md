# Tools & components inventory

| Component | Version | Role | Licence |
|---|---|---|---|
| **Groq API** — `openai/gpt-oss-120b` (primary), `qwen/qwen3.8-27b`, `openai/gpt-oss-20b` (fallbacks) | free tier | intent classification, retrieval keywords, closed-list selection of verse ids and tafsir-sentence ids | Groq terms; open-weight models (Apache-2.0 / model licences) |
| ALLaM-2-7B (SDAIA) | free tier on Groq | benchmarked; rejected for the selection step (context too short for the payload) — see `eval/results/bench_llm.json` | model licence |
| three.js | 0.160.0 (vendored in `public/vendor/three/`) | WebGL galaxy | MIT |
| Google Fonts: Amiri Quran, Amiri, Inter | — | Quran and UI typography | SIL OFL 1.1 |
| Node.js | ≥ 18 | tests, evaluation, local server (no npm dependencies) | MIT |
| Python 3 + `requests`, `numpy` | 3.13 | data download & build scripts | PSF / Apache-2.0 / BSD |
| Cloudflare Pages + Pages Functions | free plan | hosting + serverless API (key kept as a secret) | Cloudflare terms |
| Claude (Anthropic) — AI coding assistant | — | assisted the author in writing code, tests and documentation during development (disclosed per the challenge’s transparency rules) | — |

## Running costs
- Hosting: Cloudflare Pages free plan (static + Functions, 100k requests/day).
- LLM: Groq free tier — per model ≈ 1,000 requests/day and 200k tokens/day; each AI-augmented query uses 2 calls (~0.4k + ~2k tokens). Identical queries are cached at the edge for 7 days. When quotas are exhausted the engine silently uses the deterministic path (still grounded, still abstaining).
- Upgrade path if usage grows: Groq paid tier (≈ $0.15–0.75 per million tokens for these models) or any OpenAI-compatible endpoint via `FALLBACK_URL/FALLBACK_KEY/FALLBACK_MODEL`.
