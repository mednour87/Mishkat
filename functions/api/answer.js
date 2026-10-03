// Cloudflare Pages Function: POST /api/answer — extractive answer: sentence IDs chosen by a composer, checked by a judge (functions/_lib/answer.js)
import { answer } from '../_lib/answer.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(answer, 'answer');
