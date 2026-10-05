// Cloudflare Pages Function: POST /api/mosques  {lat, lon, r} → mosques of OpenStreetMap around the place
import { mosquesNear } from '../_lib/mosques.js';
import { makeHandler } from '../_lib/handler.js';

export const onRequestPost = makeHandler(mosquesNear, 'mosques');
