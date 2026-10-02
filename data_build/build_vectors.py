"""Meaning vectors of the 6,236 verses for the semantic search (bge-m3, Cloudflare Workers AI).

Each verse is embedded together with its Al-Mukhtasar tafsir (modern Arabic, like the questions
people ask): «verse — tafsir». Vectors are L2-normalised and quantised to int8 (×127):
6,236 × 1,024 bytes ≈ 6.4 MB, served to the API function only (functions/_lib/dense.js),
never downloaded by the browser.

Run once (needs a Cloudflare API token with Workers AI rights, e.g. `npx wrangler login`):
  CF_ACCOUNT=<id> CF_TOKEN=<token> python data_build/build_vectors.py
Output: public/data/vec/bge_m3_int8.bin  (+ vec/meta.json)
"""
import json, os, sys, time, urllib.request
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'public', 'data')
OUT = os.path.join(DATA, 'vec')
CACHE = os.path.join(ROOT, 'data_build', 'cache', 'vec_f32.npy')
MODEL = '@cf/baai/bge-m3'
ACC, TOK = os.environ.get('CF_ACCOUNT'), os.environ.get('CF_TOKEN')


def embed(texts):
    url = f'https://api.cloudflare.com/client/v4/accounts/{ACC}/ai/run/{MODEL}'
    body = json.dumps({'text': texts}).encode()
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, data=body, headers={'Authorization': f'Bearer {TOK}', 'content-type': 'application/json'})
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
            if d.get('success'):
                return d['result']['data']
            print('error', d.get('errors'), file=sys.stderr)
        except Exception as e:
            print('retry', attempt, e, file=sys.stderr)
        time.sleep(3 + 5 * attempt)
    raise RuntimeError('embedding failed')


def main():
    with open(os.path.join(DATA, 'search_ar.json'), encoding='utf-8') as fh:
        verses = json.load(fh)
    with open(os.path.join(DATA, 'tafsir_mukhtasar_ar.json'), encoding='utf-8') as fh:
        taf = json.load(fh)['text']
    texts = [f"{v} — {str(t or '').strip()[:500]}" for v, t in zip(verses, taf)]
    n = len(texts)
    vec = np.load(CACHE) if os.path.exists(CACHE) else np.zeros((n, 1024), np.float32)
    done = np.abs(vec).sum(1) > 0
    B = 10
    for k in range(0, n, B):
        if done[k:k + B].all():
            continue
        vec[k:k + B] = np.array(embed(texts[k:k + B]), np.float32)
        np.save(CACHE, vec)
        print(k + B, '/', n, file=sys.stderr)
    vec /= np.linalg.norm(vec, axis=1, keepdims=True)
    q = np.clip(np.round(vec * 127), -127, 127).astype(np.int8)
    os.makedirs(OUT, exist_ok=True)
    q.tofile(os.path.join(OUT, 'bge_m3_int8.bin'))
    with open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8') as fh:
        json.dump({'model': MODEL, 'n': n, 'dim': 1024, 'dtype': 'int8', 'scale': 127,
                   'text': 'imla\'i verse + " — " + Al-Mukhtasar (first 500 chars)', 'built': time.strftime('%Y-%m-%d')}, fh)
    print('saved', q.shape)


if __name__ == '__main__':
    main()
