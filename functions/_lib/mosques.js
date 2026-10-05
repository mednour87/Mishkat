// Nearby mosques (5 Oct): the browser called the public Overpass server directly, and the search failed — the main
// server answers browsers with «406 Not Acceptable» or «504 timeout» when it is busy (measured on 5 Oct). The query
// now goes through Mishkat's server: an identified User-Agent (Overpass's usage policy), several mirrors tried one
// after the other, the answer reduced to what the list shows and cached at the edge (rounded place, same radius).
// The position sent is rounded to ~100 m and never stored; nothing else about the visitor is sent.
import { overpassQuery } from '../../public/js/practical.js';

export const OVERPASS = ['https://z.overpass-api.de/api/interpreter', 'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const UA = 'Mishkat/1.0 (Quran guide; +https://mishkat-4m1.pages.dev)';

// only the fields the list uses (type, id, position, names)
export function compact(j) {
  const out = [];
  for (const e of (j && j.elements) || []) {
    const lat = e.lat != null ? e.lat : e.center && e.center.lat, lon = e.lon != null ? e.lon : e.center && e.center.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    const tg = e.tags || {}, tags = {};
    for (const k of ['name', 'name:ar', 'name:en']) if (typeof tg[k] === 'string') tags[k] = tg[k].slice(0, 120);
    out.push({ type: String(e.type).slice(0, 10), id: +e.id, lat: +lat.toFixed(6), lon: +lon.toFixed(6), tags });
  }
  return out;
}

export async function mosquesNear(body, env, fetchFn = fetch, { timeoutMs = 9000 } = {}) {
  const lat = +body.lat, lon = +body.lon, r = +body.r;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { ok: false, error: 'bad place' };
  const radius = [500, 1000, 2000, 5000, 10000].includes(r) ? r : 2000;
  const q = overpassQuery(Math.round(lat * 1000) / 1000, Math.round(lon * 1000) / 1000, radius);
  // two mirrors at once, then the others at once: the first good answer wins (one slow mirror no longer holds the list)
  const one = async (host) => {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchFn(`${host}?data=${encodeURIComponent(q)}`, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      if (!j || !Array.isArray(j.elements) || (j.remark && /runtime error|timed out/i.test(j.remark))) throw new Error('bad answer');
      return j;
    } finally { clearTimeout(t); }
  };
  for (const group of [OVERPASS.slice(0, 2), OVERPASS.slice(2)]) {
    try {
      const j = await Promise.any(group.map(one));
      return { ok: true, elements: compact(j), source: 'OpenStreetMap (ODbL) via Overpass' };
    } catch (e) { /* every mirror of the group failed: the next group */ }
  }
  return { ok: false, error: 'map servers unavailable' };
}
