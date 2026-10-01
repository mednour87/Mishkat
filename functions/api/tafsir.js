// Cloudflare Pages Function: POST /api/tafsir  (read-only lookup in a reference source)
import { tafsirPages } from '../_lib/sources.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(tafsirPages, 'tafsir');
