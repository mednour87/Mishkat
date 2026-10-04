# Deploy Mishkat — Cloudflare Pages (free plan)

## 1. Repository
```bash
git clone https://github.com/mednour87/Mishkat.git && cd Mishkat
npm test                      # must be green before any deployment
```
`.dev.vars` (keys) is git-ignored — check with `git status` that it is never listed.

## 2. Cloudflare Pages (static site + Functions)
```bash
npx wrangler login
npx wrangler pages deploy public --project-name mishkat --branch main
```
No build step: the output directory is `public`; the `functions/` folder gives the `/api/*` routes. `wrangler.toml` declares the Workers AI binding (`[ai]`, bge-m3 for `/api/dense`).

## 3. Secrets
Put them in `.dev.vars` (local) and send them once: `npx wrangler pages secret bulk .dev.vars --project-name mishkat`.

| Name | Needed | Role |
|---|---|---|
| `GROQ_API_KEY` | yes | free tier: every AI task first, Whisper, Orpheus |
| `PRIMARY_URL`, `PRIMARY_KEY`, `PRIMARY_MODELS` | optional | paid backup (OpenRouter, `https://openrouter.ai/api/v1/chat/completions`, `openai/gpt-oss-120b,openai/gpt-oss-20b`) |
| `PRIMARY_MAX_PRICE`, `DAILY_AI_CALLS` | optional | price cap per million tokens (default `0.2,0.8`), daily ceiling of paid calls (default 1,500) |
| `AZURE_TTS_KEY`, `AZURE_TTS_REGION` | optional | Azure Speech instead of Orpheus (not used today) |
| `SITE_PASS` | only while the site is private | password gate (`functions/_middleware.js`); **delete it to open the site**: `npx wrangler pages secret delete SITE_PASS --project-name mishkat`, then redeploy |

## 4. Check
- `https://<project>.pages.dev/api/health` → `{"ok":true,"llm":true,"free":true,…}`
- Private window and a phone: `الصبر`, `2:255`, `هل هذه آية: النظافة من الإيمان`, `ما حكم التدخين`, `how to deal with anxiety`, `كم بقي على صلاة العصر`; open a surah and press ▶.
- Without any key the site still works in deterministic mode (badge «بحث بالكلمات (دون تأكيد الذكاء الاصطناعي)» / «Keyword search (not confirmed by AI)»).

## Local server
```bash
node server.mjs 8787               # same API, reads .dev.vars
FREE_ONLY=1 node server.mjs 8791   # free tier only (evaluations)
```
