// Cloudflare Pages Function: POST /api/encyc  {enc: 'aqeeda'|'history', q, kw?} → sections / events of the approved
// encyclopedias of dorar.net · {enc: 'aqeeda', id} → one section, verbatim (T122)
import { encycSearch } from '../_lib/encyc.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(encycSearch, 'encyc');
