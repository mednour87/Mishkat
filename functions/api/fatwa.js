// Cloudflare Pages Function: POST /api/fatwa  {q} → published fatwas (titles, links) · {id} → one fatwa in full
import { fatwaSearch } from '../_lib/fatwa.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(fatwaSearch, 'fatwa');
