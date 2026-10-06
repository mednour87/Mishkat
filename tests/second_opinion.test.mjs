// T118: when the selection keeps no candidate, the engine asks once for a second opinion, which the server sends to a
// model of another family first (not gpt-oss)
import test from 'node:test';
import assert from 'node:assert/strict';
import { select, resetCoolDown } from '../functions/_lib/selector.js';

const env = { GROQ_API_KEY: 'test-key', GROQ_MODELS: 'openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b' };
const body = { query: 'حق الجار', lang: 'ar', candidates: [{ id: '4:36', text: 'والجار ذي القربى' }] };
function fakeFetch(seen) {
  return async (url, init) => {
    const m = JSON.parse(init.body).model; seen.push(m);
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"intent":"topic","ids":["4:36"],"scores":{"4:36":2},"confidence":"high"}' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

test('second opinion: another model family is asked first', async () => {
  resetCoolDown();
  const a = [], b = [];
  await select(body, env, fakeFetch(a));
  await select({ ...body, second: true }, env, fakeFetch(b));
  assert.equal(a[0], 'openai/gpt-oss-120b');
  assert.equal(b[0], 'qwen/qwen3.8-27b');
});
