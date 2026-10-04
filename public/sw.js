// T097 — service worker of the installable app. Pages, scripts and styles: network first (a new deployment is used
// at once), the cached copy when offline. Data files, fonts, images, libraries: cached copy first, refreshed in the
// background. The API (/api/*) and other sites (recitation audio, prayer times, maps) are never cached here: answers
// stay live and the visitor's place never passes through this file.
const VERSION = 'mishkat-2026-10-04b';
const SHELL = ['./', 'index.html', 'css/app.css', 'css/features.css', 'fonts/fonts.css', 'img/logo.svg', 'img/icon-192.png', 'manifest.webmanifest',
  'js/app.js', 'js/engine.js', 'js/i18n.js', 'js/galaxy.js', 'js/layouts.js', 'js/lamp.js', 'js/lampmap.js', 'js/search-worker.js',
  'vendor/three/three.module.min.js', 'data/core.json', 'data/search_ar.json', 'data/galaxy.bin'];

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // one by one: a file that fails (private preview, offline) never blocks the installation
    await Promise.all(SHELL.map(u => fetch(u, { credentials: 'same-origin', cache: 'reload' }).then(r => r.ok ? c.put(u, r) : null).catch(() => null)));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

const networkFirst = async (req) => {
  const c = await caches.open(VERSION);
  try {
    const r = await fetch(req);
    if (r.ok && r.type === 'basic') c.put(req, r.clone());
    return r;
  } catch (e) {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' }) || (req.mode === 'navigate' ? await c.match('index.html') : null);
    if (hit) return hit;
    throw e;
  }
};
const cacheFirst = async (req, ev) => {
  const c = await caches.open(VERSION);
  const hit = await c.match(req);
  const refresh = fetch(req).then(r => { if (r.ok && r.type === 'basic') c.put(req, r.clone()); return r; }).catch(() => null);
  if (hit) { ev.waitUntil(refresh); return hit; }
  const r = await refresh;
  return r || Response.error();
};

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                 // audio, prayer times, maps: the browser as usual
  if (url.pathname.includes('/api/')) return;                       // live answers, never stored here
  if (req.headers.has('range')) return;                             // media byte ranges
  if (req.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname)) { ev.respondWith(networkFirst(req)); return; }
  if (/\/(data|fonts|img|vendor|audio)\//.test(url.pathname)) { ev.respondWith(cacheFirst(req, ev)); return; }
});
