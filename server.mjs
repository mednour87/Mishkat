// Local server (no dependencies): serves public/ and the same /api routes as
// the Cloudflare Pages Functions, with the same security headers and limits.
//   node server.mjs [port]      (reads GROQ_API_KEY etc. from env or .dev.vars)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { select, expand, health, transcribe } from './functions/_lib/selector.js';
import { hadithSearch, tafsirPages } from './functions/_lib/sources.js';
import { fiqhSearch } from './functions/_lib/fiqh.js';
import { encycSearch } from './functions/_lib/encyc.js';
import { mosquesNear } from './functions/_lib/mosques.js';
import { pick } from './functions/api/pick.js';
import { storeFeedback } from './functions/_lib/feedback.js';
import { appendFileSync, mkdirSync } from 'node:fs';
import { embedQuery } from './functions/_lib/dense.js';
import { answer } from './functions/_lib/answer.js';
import { speak, speakPassage } from './functions/_lib/tts.js';
import { rateLimited, foreignOrigin, LIMITS, refusedText } from './functions/_lib/guard.js';
import { SECURITY_HEADERS } from './functions/_lib/csp.js';

const ROOT = fileURLToPath(new URL('./public/', import.meta.url));
const PORT = +(process.argv[2] || process.env.PORT || 8787);
const env = { ...process.env };
const dv = fileURLToPath(new URL('./.dev.vars', import.meta.url));
if (existsSync(dv)) for (const line of readFileSync(dv, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2];
}
// FREE_ONLY=1 (evaluations): the paid provider is removed, only Groq's free tier is called
if (process.env.FREE_ONLY === '1') for (const k of ['PRIMARY_URL', 'PRIMARY_KEY', 'PRIMARY_MODELS']) delete env[k];
// static files for functions that read them (Cloudflare's env.ASSETS)
// /api/feedback: the KV namespace exists only online; locally the entries go to .wrangler/feedback_local.jsonl
env.FEEDBACK = { put: async (k, v) => { mkdirSync(fileURLToPath(new URL('./.wrangler/', import.meta.url)), { recursive: true }); appendFileSync(fileURLToPath(new URL('./.wrangler/feedback_local.jsonl', import.meta.url)), JSON.stringify({ key: k, ...JSON.parse(v) }) + '\n'); } };
env.ASSETS = { fetch: async (req) => { const f = ROOT + decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, ''); return existsSync(f) ? new Response(readFileSync(f)) : new Response('', { status: 404 }); } };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.bin': 'application/octet-stream', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.mp3': 'audio/mpeg' };
const cache = new Map(), ttsCache = new Map();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const ip = req.socket.remoteAddress;
    if (url.pathname.startsWith('/api/')) {
      if (foreignOrigin(req.headers.origin, req.headers.host, req.method)) return send(res, 403, '{"ok":false,"error":"forbidden origin"}', '.json');
      if (url.pathname === '/api/health') return send(res, 200, JSON.stringify(health(env)), '.json');
      const name = url.pathname.slice(5);
      if (req.method !== 'POST' || !['select', 'expand', 'transcribe', 'hadith', 'fatwa', 'encyc', 'pick', 'answer', 'dense', 'tafsir', 'tts', 'mosques', 'feedback'].includes(name)) return send(res, 404, '{"ok":false}', '.json');
      if (rateLimited(ip, name, LIMITS[name])) return send(res, 429, '{"ok":false,"error":"too many requests"}', '.json');
      const chunks = []; let size = 0;
      const max = name === 'transcribe' ? LIMITS.maxAudioBytes : name === 'tts' ? 4096 : LIMITS.maxJsonBytes;
      for await (const c of req) { size += c.length; if (size > max) return send(res, 413, '{"ok":false,"error":"too large"}', '.json'); chunks.push(c); }
      const body = Buffer.concat(chunks);
      if (name === 'transcribe') {
        const form = await new Request('http://x/', { method: 'POST', headers: { 'content-type': req.headers['content-type'] || '' }, body }).formData();
        const out = await transcribe(form.get('audio'), String(form.get('lang') || '').slice(0, 2), env, fetch, form.get('mode') === 'recite' ? 'recite' : 'search');
        return send(res, 200, JSON.stringify(out), '.json');
      }
      if (name === 'tts') {
        const k = body.toString('utf8');
        let hit = ttsCache.get(k);
        if (!hit) {
          let out;
          try { out = await speakPassage(JSON.parse(k), env, async (book, s) => JSON.parse(await readFile(join(ROOT, 'data', 'tts', book, `${s}.json`), 'utf8'))); } catch (e) { out = { ok: false, error: 'bad request', code: 'bad' }; }
          if (!out.ok) return send(res, 200, JSON.stringify(out), '.json');
          hit = Object.assign(Buffer.from(out.audio), { mime: out.type || 'audio/wav' });
          ttsCache.set(k, hit);
          if (ttsCache.size > 300) ttsCache.delete(ttsCache.keys().next().value);
        }
        res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': hit.mime || 'audio/wav', 'cache-control': 'no-store' });
        return res.end(hit);
      }
      if (name === 'feedback') { let fbo; try { fbo = await storeFeedback(JSON.parse(body.toString('utf8')), env); } catch (e) { fbo = { ok: false, error: 'bad request' }; } return send(res, fbo.ok ? 200 : 400, JSON.stringify(fbo), '.json'); }
      const key = name + body.toString('utf8');
      if (cache.has(key)) return send(res, 200, cache.get(key), '.json');
      try {
        const fn = { select, expand, hadith: hadithSearch, fatwa: fiqhSearch, encyc: encycSearch, pick, answer, dense: embedQuery, tafsir: tafsirPages, mosques: mosquesNear }[name];
        const parsed = JSON.parse(body.toString('utf8'));
        if (refusedText(name, parsed)) return send(res, 400, JSON.stringify({ ok: false, error: 'instruction-like text refused' }), '.json');
        const out = JSON.stringify(await fn(parsed, env));
        if (JSON.parse(out).ok) cache.set(key, out);
        return send(res, 200, out, '.json');
      } catch (e) { return send(res, 400, JSON.stringify({ ok: false, error: 'bad request' }), '.json'); }
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(normalize(ROOT)) || /[\\/]\./.test(p) || p.includes('_headers')) return send(res, 403, 'forbidden', '.txt');
    const st = await stat(file).catch(() => null);
    if (!st || !st.isFile()) return send(res, 404, 'not found', '.txt');
    const data = await readFile(file);
    const gz = /gzip/.test(req.headers['accept-encoding'] || '') && data.length > 1024 && !['.png', '.woff2'].includes(extname(file));
    res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': TYPES[extname(file)] || 'application/octet-stream', ...(gz ? { 'content-encoding': 'gzip' } : {}) });
    res.end(gz ? gzipSync(data) : data);
  } catch (e) { send(res, 500, 'error', '.txt'); }
}).listen(PORT, '127.0.0.1', () => console.log(`Mishkat on http://127.0.0.1:${PORT}  (LLM: ${health(env).llm ? health(env).model : 'off'})`));

function send(res, code, body, ext) {
  res.writeHead(code, { ...SECURITY_HEADERS, 'content-type': TYPES[ext] || 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}
