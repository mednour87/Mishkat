import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { rateLimited, foreignOrigin } from '../functions/_lib/guard.js';
import { SECURITY_HEADERS } from '../functions/_lib/csp.js';

test('rate limiter blocks after the limit within the window', () => {
  let blocked = 0;
  for (let i = 0; i < 45; i++) if (rateLimited('1.2.3.4', 'selectT', 40)) blocked++;
  assert.equal(blocked, 5);
  assert.equal(rateLimited('5.6.7.8', 'selectT', 40), false);
});

test('foreign origins are rejected, same origin accepted', () => {
  assert.equal(foreignOrigin('https://evil.example', 'mishkat.pages.dev'), true);
  assert.equal(foreignOrigin('https://mishkat.pages.dev', 'mishkat.pages.dev'), false);
  assert.equal(foreignOrigin(undefined, 'mishkat.pages.dev', 'GET'), false);
  assert.equal(foreignOrigin(undefined, 'mishkat.pages.dev'), true);          // I2: a POST without Origin is a script
  assert.equal(foreignOrigin(undefined, 'mishkat.pages.dev', 'POST'), true);
  assert.equal(foreignOrigin('null', 'mishkat.pages.dev'), true);
});

test('CSP allows only our inline importmap (hash matches index.html) and no remote scripts', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const im = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
  const h = createHash('sha256').update(im, 'utf8').digest('base64');
  const csp = SECURITY_HEADERS['Content-Security-Policy'];
  assert.ok(csp.includes(`'sha256-${h}'`));
  assert.ok(!/script-src[^;]*https?:/.test(csp));
  assert.ok(!/unsafe-eval/.test(csp));
  assert.ok(csp.includes("frame-ancestors 'none'"));
  // only one inline script and no inline event handlers in the page
  assert.equal((html.match(/<script(?![^>]*src=)/g) || []).length, 1);
  assert.ok(!/\son[a-z]+=/i.test(html));
  // _headers (Cloudflare) and the local server use the same CSP
  const hdr = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.ok(hdr.includes(csp));
});

test('no secret is shipped in public files', () => {
  const files = ['index.html', 'js/app.js', 'js/engine.js', 'js/voice.js', 'js/galaxy.js', 'js/i18n.js'];
  for (const f of files) assert.ok(!/gsk_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{20,}/.test(readFileSync(new URL('../public/' + f, import.meta.url), 'utf8')), f);
});
