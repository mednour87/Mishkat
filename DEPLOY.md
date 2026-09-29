# Deploy Mishkat (free) — GitHub + Cloudflare Pages

## 1. Public GitHub repository
```bash
git init && git add . && git commit -m "Mishkat — Quran Galaxy Guide"
git branch -M main
git remote add origin https://github.com/<your-user>/mishkat.git
git push -u origin main
```
`.dev.vars` (your Groq key) is git-ignored — check with `git status` that it is **not** listed before pushing.

## 2. Cloudflare Pages (static site + Functions)
Option A — dashboard: Cloudflare → Workers & Pages → Create → Pages → *Connect to Git* → select the repo.
- Build command: *(none)* · Build output directory: `public` · Root directory: `/`
- The `functions/` folder is picked up automatically (routes `/api/expand`, `/api/select`, `/api/health`).

Option B — CLI:
```bash
npx wrangler pages deploy public --project-name mishkat
```

## 3. Secret key
Cloudflare → your Pages project → Settings → Variables and Secrets → add **`GROQ_API_KEY`** (type *Secret*) for Production. Optional: `GROQ_MODELS=openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b`. Redeploy.

## 4. Check
- `https://<project>.pages.dev/api/health` → `{"ok":true,"llm":true,"model":"openai/gpt-oss-120b"}`
- Open the site in a private window and on a phone; try: `الصبر`, `2:255`, `هل هذه آية: النظافة من الإيمان`, `ما حكم الموسيقى؟`, open a surah and press ▶.
- Without the secret, the site still works in deterministic mode (badge “Deterministic mode”).
