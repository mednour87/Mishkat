// Cloudflare Pages Function: GET /api/health  (same origin only, like the other routes)
import { health } from '../_lib/selector.js';
import { foreignOrigin, deny } from '../_lib/guard.js';

export function onRequestGet({ request, env }) {
  if (foreignOrigin(request.headers.get('origin'), new URL(request.url).host, 'GET')) return deny(403, 'forbidden origin');
  return new Response(JSON.stringify(health(env)), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
