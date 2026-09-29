// Cloudflare Pages Function: GET /api/health
import { health } from '../_lib/selector.js';

export function onRequestGet({ env }) {
  return new Response(JSON.stringify(health(env)), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
