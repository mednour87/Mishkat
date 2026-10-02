// Private mode (before the public submission): when the secret SITE_PASS is set, every
// page, file and API call asks for a password (HTTP Basic, any user name) and nothing is
// indexed by search engines. Delete the secret (and redeploy) to open the site to everyone.
const enc = new TextEncoder();

function same(a, b) { // constant-time comparison
  const x = enc.encode(a), y = enc.encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

export function allowed(request, pass) {
  if (!pass) return true;
  const h = request.headers.get('authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let txt = '';
  try { txt = atob(h.slice(6)); } catch (e) { return false; }
  const k = txt.indexOf(':');
  return k >= 0 && same(txt.slice(k + 1), pass);
}

export async function onRequest({ request, env, next }) {
  const pass = env.SITE_PASS;
  if (!allowed(request, pass)) {
    return new Response('Mishkat — private preview', {
      status: 401,
      headers: { 'www-authenticate': 'Basic realm="Mishkat", charset="UTF-8"', 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' },
    });
  }
  const res = await next();
  if (!pass) return res;
  const out = new Response(res.body, res);
  out.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  // private pages must not sit in shared caches
  if (!/max-age=\d{5,}/.test(out.headers.get('cache-control') || '')) out.headers.set('cache-control', 'private, no-cache');
  else out.headers.set('cache-control', out.headers.get('cache-control').replace('public', 'private'));
  return out;
}
