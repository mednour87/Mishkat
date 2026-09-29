// Cloudflare Pages Function: POST /api/expand
import { expand } from '../_lib/selector.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(expand, 'expand');
