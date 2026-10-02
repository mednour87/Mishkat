import test from 'node:test';
import assert from 'node:assert/strict';
import { allowed, onRequest } from '../functions/_middleware.js';

const req = (auth) => new Request('https://x.dev/', { headers: auth ? { authorization: auth } : {} });
const basic = (u, p) => 'Basic ' + btoa(`${u}:${p}`);

test('private mode: open when no password is set', () => {
  assert.equal(allowed(req(), undefined), true);
});
test('private mode: wrong or missing password refused, right one accepted', () => {
  assert.equal(allowed(req(), 'abc'), false);
  assert.equal(allowed(req(basic('a', 'abd')), 'abc'), false);
  assert.equal(allowed(req('Basic !!!'), 'abc'), false);
  assert.equal(allowed(req(basic('any', 'abc')), 'abc'), true);
});
test('private mode: 401 with a login prompt, and noindex on served pages', async () => {
  const r = await onRequest({ request: req(), env: { SITE_PASS: 'abc' }, next: async () => new Response('ok') });
  assert.equal(r.status, 401);
  assert.match(r.headers.get('www-authenticate'), /Basic/);
  const ok = await onRequest({ request: req(basic('u', 'abc')), env: { SITE_PASS: 'abc' }, next: async () => new Response('ok', { headers: { 'cache-control': 'public, max-age=86400' } }) });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('x-robots-tag'), /noindex/);
  assert.equal(ok.headers.get('cache-control'), 'private, max-age=86400');
});
