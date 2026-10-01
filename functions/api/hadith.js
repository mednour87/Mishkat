// Cloudflare Pages Function: POST /api/hadith  (read-only lookup in a reference source)
import { hadithSearch } from '../_lib/sources.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(hadithSearch, 'hadith');
