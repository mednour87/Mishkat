# Tools & components inventory

| Component | Version | Role | Licence |
|---|---|---|---|
| **OpenRouter API** (paid, pay per token, prepaid credits) — `openai/gpt-oss-120b` (primary), `openai/gpt-oss-20b`; fastest hosts first (e.g. Cerebras), JSON mode required, `data_collection: deny` | ≈ $0.04 in / $0.18 out per million tokens | same role as below: intent, retrieval keywords, closed-list selection only — the AI never writes religious text | OpenRouter terms; open-weight models (Apache-2.0) |
| **Cloudflare Workers AI — `@cf/baai/bge-m3`** | free daily allocation (10,000 neurons) | meaning vectors of the verses (once) and of each question (live) for the semantic candidates | Workers AI terms; model MIT |
| **Groq API** — `openai/gpt-oss-120b` (primary), `qwen/qwen3.8-27b`, `openai/gpt-oss-20b` (fallbacks) | free tier — backup LLM, speech-to-text (Whisper), tafsir voice (Orpheus) | intent classification, retrieval keywords, closed-list selection of verse ids and tafsir-sentence ids | Groq terms; open-weight models (Apache-2.0 / model licences) |
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
- Since 2 October 2026 a paid provider (OpenRouter, pay per token, prepaid) is tried first; Groq free stays as automatic backup (Groq's paid tier was closed to new sign-ups that day).
- Other upgrade paths: Groq paid tier (≈ $0.15–0.75 per million tokens for these models) or any OpenAI-compatible endpoint via `FALLBACK_URL/FALLBACK_KEY/FALLBACK_MODEL`.
