// Cloudflare Pages Function: POST /api/dense  {query} → the question's bge-m3 vector projected on 256 axes (the browser ranks the verses)
import { embedQuery } from '../_lib/dense.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(embedQuery, 'dense');
