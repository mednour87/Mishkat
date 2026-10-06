// T118: visitors' feedback — only the three verdicts, clipped fields, no personal identifier, stored in KV when bound
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanFeedback, storeFeedback } from '../functions/_lib/feedback.js';

test('feedback: verdicts and fields are checked and clipped', () => {
  assert.equal(cleanFeedback({ vote: 'love', q: 'الصبر' }), null);
  assert.equal(cleanFeedback({ vote: 'up', q: '' }), null);
  const f = cleanFeedback({ vote: 'report', q: 'x'.repeat(900), lang: 'fr', route: 'topic<script>', refs: ['2:153', 'bad ref!', '94:5'], note: 'n'.repeat(900), ip: '1.2.3.4' });
  assert.equal(f.q.length, 300);
  assert.equal(f.note.length, 500);
  assert.equal(f.lang, 'ar');
  assert.equal(f.route, 'topicscript');
  assert.deepEqual(f.refs, ['2:153', '94:5']);
  assert.equal(f.ip, undefined);
  assert.equal(cleanFeedback({ vote: 'up', q: 'a', note: 'kept?' }).note, '', 'a «useful» vote carries no note');
});

test('feedback: stored in the KV namespace when bound, accepted without storage otherwise', async () => {
  const kv = new Map();
  const env = { FEEDBACK: { put: async (k, v, o) => { kv.set(k, { v: JSON.parse(v), o }); } } };
  assert.deepEqual(await storeFeedback({ vote: 'down', q: 'حق الجار', refs: ['4:36'] }, env), { ok: true, stored: true });
  const [k, e] = [...kv.entries()][0];
  assert.match(k, /^fb:\d{4}-\d{2}-\d{2}:down:/);
  assert.equal(e.v.q, 'حق الجار');
  assert.equal(e.o.expirationTtl, 365 * 24 * 3600);
  assert.deepEqual(await storeFeedback({ vote: 'up', q: 'x' }, {}), { ok: true, stored: false });
  assert.equal((await storeFeedback({ vote: 'up' }, env)).ok, false);
});
