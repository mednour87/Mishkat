// Cloudflare Pages Function: POST /api/select
import { select } from '../_lib/selector.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(select, 'select');
