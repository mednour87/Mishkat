// Requests of 5 October: screen kept on (wake.js), mosques through Mishkat's server with mirrors + Google Maps in the
// page, brief tajweed box + dedicated page, one statistics button, no ring in reading mode, lighter start on phones.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setupWake, IDLE_MS } from '../public/js/wake.js';
import { mosquesNear, compact, OVERPASS } from '../functions/_lib/mosques.js';
import { SECURITY_HEADERS } from '../functions/_lib/csp.js';
import { TJ_S, RULE_INFO } from '../public/js/tajweed.js';

test('wake lock: held while busy or recently touched, released when idle, asked again', async () => {
  let t = 0, held = 0, released = 0, busy = false;
  const listeners = {};
  globalThis.addEventListener = globalThis.addEventListener || (() => {});
  const nav = { wakeLock: { request: async () => { held++; const l = { _r: [], addEventListener: (e, f) => l._r.push(f), release: async () => { released++; l._r.forEach(f => f()); } }; return l; } } };
  const doc = { visibilityState: 'visible', addEventListener: (e, f) => { listeners[e] = f; } };
  const realSet = globalThis.setInterval; globalThis.setInterval = () => 0;
  try {
    const w = setupWake(() => busy, { nav, doc, now: () => t });
    await new Promise(r => setTimeout(r, 0));
    assert.equal(held, 1); assert.ok(w.active());
    t = IDLE_MS + 1; w.tick(); await new Promise(r => setTimeout(r, 0));
    assert.equal(released, 1); assert.ok(!w.active(), 'idle: the phone setting applies again');
    busy = true; w.tick(); await new Promise(r => setTimeout(r, 0));
    assert.equal(held, 2, 'a recitation keeps the screen on however long');
    assert.equal(typeof listeners.visibilitychange, 'function');
    // without the API nothing happens
    assert.equal(setupWake(() => true, { nav: {}, doc, now: () => 0 }).active(), false);
  } finally { globalThis.setInterval = realSet; }
});

test('mosques: identified request, first good mirror wins, place rounded, answer reduced', async () => {
  const seen = [];
  const fake = async (url, opt) => {
    seen.push({ url, ua: opt.headers['user-agent'] });
    if (url.startsWith(OVERPASS[0])) return { ok: false, status: 504 };
    return { ok: true, json: async () => ({ elements: [{ type: 'node', id: 1, lat: 35.5, lon: 11.06, tags: { name: 'جامع', amenity: 'place_of_worship', phone: 'x' } }, { type: 'way', id: 2, center: { lat: 35.51, lon: 11.07 }, tags: {} }, { type: 'node', id: 3 }] }) };
  };
  const r = await mosquesNear({ lat: 35.504712, lon: 11.062234, r: 2000 }, {}, fake);
  assert.ok(r.ok);
  assert.equal(r.elements.length, 2);
  assert.deepEqual(r.elements[0].tags, { name: 'جامع' }, 'only the names are kept');
  assert.ok(seen.every(x => /^Mishkat\//.test(x.ua)), 'identified User-Agent');
  assert.ok(seen.every(x => decodeURIComponent(x.url).includes('35.50500,11.06200')), 'place rounded to ~100 m');
  assert.equal((await mosquesNear({ lat: 'x', lon: 1 }, {}, fake)).ok, false);
  const down = await mosquesNear({ lat: 1, lon: 1, r: 500 }, {}, async () => { throw new Error('down'); });
  assert.deepEqual(down, { ok: false, error: 'map servers unavailable' });
  assert.equal(compact(null).length, 0);
});

test('Google Maps inside the page: the CSP allows its frame (local server and Cloudflare headers alike)', () => {
  const csp = SECURITY_HEADERS['Content-Security-Policy'];
  assert.match(csp, /frame-src https:\/\/www\.google\.com https:\/\/maps\.google\.com/);
  assert.ok(fs.readFileSync('public/_headers', 'utf8').includes(csp), '_headers and csp.js are the same');
  const pr = fs.readFileSync('public/js/practical.js', 'utf8');
  assert.match(pr, /output=embed/);
  assert.match(pr, /api\/mosques/);
  assert.match(pr, /maps\/dir\/\?api=1&destination=/);
  assert.ok(fs.existsSync('functions/api/mosques.js'));
  assert.match(fs.readFileSync('server.mjs', 'utf8'), /mosques: mosquesNear/);
});

test('tajweed: brief box in the reader, every rule on its own page', () => {
  const app = fs.readFileSync('public/js/app.js', 'utf8');
  assert.match(app, /tj-brief/);
  assert.match(app, /tajweed\.html\?lang=/);
  assert.ok(!/<details class="tj-all"/.test(app), 'the full list is no longer in the reader');
  const page = fs.readFileSync('public/tajweed.html', 'utf8');
  assert.match(page, /js\/tajweed-page\.js/);
  assert.ok(!/<script>(?!<\/script>)/.test(page), 'no inline script (CSP)');
  assert.ok(TJ_S.ar.all && TJ_S.en.all);
  assert.equal(RULE_INFO.length, 18);
});

test('one statistics button (reading bar), no ring or turning rays on the recited word', () => {
  const html = fs.readFileSync('public/index.html', 'utf8'), app = fs.readFileSync('public/js/app.js', 'utf8'), gal = fs.readFileSync('public/js/galaxy.js', 'utf8');
  assert.ok(!html.includes('id="gStats"'));
  assert.equal((app.match(/id="rStats"/g) || []).length, 1);
  assert.ok(!/ring\.visible = true/.test(gal), 'the selection ring is never shown');
  assert.ok(!/rays\.material\.rotation \+=/.test(gal), 'the rays no longer turn');
  assert.match(gal, /camStep\(/);
  assert.match(gal, /IntersectionObserver/, 'nothing drawn while the galaxy is off screen');
});

test('phone start: no tafsir parsed on the main thread at start; the Arabic Mushaf is not redrawn when they arrive', () => {
  const app = fs.readFileSync('public/js/app.js', 'utf8');
  assert.match(app, /const need = isPhone\(\) \?/);
  assert.match(app, /state\.reader\.sura && state\.lang === 'en'\) \{ renderReader\(\)/);
  assert.match(app, /setupWake\(/);
});
