// Cloudflare Pages Function: POST /api/dense  {query, lang} → nearest verses by meaning (references only)
import { denseSearch } from '../_lib/dense.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(denseSearch, 'dense');
