// Local server (no dependencies): serves public/ and the same /api routes as
// the Cloudflare Pages Functions.  Usage:  node server.mjs [port]
// Reads GROQ_API_KEY etc. from the environment or from a local .dev.vars file.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { select, expand, health } from './functions/_lib/selector.js';

const ROOT = fileURLToPath(new URL('./public/', import.meta.url));
const PORT = +(process.argv[2] || process.env.PORT || 8787);
const env = { ...process.env };
const dv = fileURLToPath(new URL('./.dev.vars', import.meta.url));
if (existsSync(dv)) for (const line of readFileSync(dv, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/); if (m) env[m[1]] = m[2];
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.bin': 'application/octet-stream', '.svg': 'image/svg+xml', '.png': 'image/png' };
const cache = new Map();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/health') return send(res, 200, JSON.stringify(health(env)), '.json');
    const apiFn = { '/api/select': select, '/api/expand': expand }[url.pathname];
    if (apiFn && req.method === 'POST') {
      let body = ''; for await (const c of req) body += c;
      const key = url.pathname + body;
      if (cache.has(key)) return send(res, 200, cache.get(key), '.json');
      try {
        const out = JSON.stringify(await apiFn(JSON.parse(body), env));
        if (JSON.parse(out).ok) cache.set(key, out);
        return send(res, 200, out, '.json');
      } catch (e) { return send(res, 400, JSON.stringify({ ok: false, error: e.message }), '.json'); }
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(normalize(ROOT))) return send(res, 403, 'forbidden', '.txt');
    const st = await stat(file).catch(() => null);
    if (!st || !st.isFile()) return send(res, 404, 'not found', '.txt');
    const data = await readFile(file);
    const gz = /gzip/.test(req.headers['accept-encoding'] || '') && data.length > 1024 && extname(file) !== '.png';
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', ...(gz ? { 'content-encoding': 'gzip' } : {}) });
    res.end(gz ? gzipSync(data) : data);
  } catch (e) { send(res, 500, String(e), '.txt'); }
}).listen(PORT, '127.0.0.1', () => console.log(`Mishkat on http://127.0.0.1:${PORT}  (LLM: ${health(env).llm ? health(env).model : 'off'})`));

function send(res, code, body, ext) {
  res.writeHead(code, { 'content-type': TYPES[ext] || 'text/plain; charset=utf-8' });
  res.end(body);
}
