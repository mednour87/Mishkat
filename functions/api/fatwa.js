// Cloudflare Pages Function: POST /api/fatwa  {q, kw?} → sections of the Fiqh Encyclopedia (dorar.net/feqhia)
// · {id} → one section's statement of the ruling, verbatim (T081: approved source of the challenge pack)
import { fiqhSearch } from '../_lib/fiqh.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(fiqhSearch, 'fatwa');
