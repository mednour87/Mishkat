// T064–T066: prayer times (Aladhan, method shown), qibla (great circle, computed locally), nearby mosques
// (OpenStreetMap) — and the position never goes to Mishkat's server.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { qiblaBearing, distanceKm, methodFor, METHODS, parseCalendar, nextPrayer, hms, overpassQuery, parseMosques, headingOf, countryFromTz, KAABA, PLACES } from '../public/js/practical.js';
import { toolIntent } from '../public/js/tools.js';
import { SECURITY_HEADERS } from '../functions/_lib/csp.js';

test('qibla: great-circle bearing and distance to the Kaaba', () => {
  // reference values (great-circle formula): Tunis ≈ 112°, London ≈ 119°, New York ≈ 58.5°, Jakarta ≈ 295°
  const near = (a, b, d = 1) => assert.ok(Math.abs(a - b) <= d, `${a} vs ${b}`);
  near(qiblaBearing(36.8065, 10.1815), 112.6);
  near(qiblaBearing(51.5074, -0.1278), 118.99);
  near(qiblaBearing(40.7128, -74.006), 58.48);
  near(qiblaBearing(-6.2088, 106.8456), 295.15);
  near(distanceKm({ lat: 36.8065, lon: 10.1815 }, KAABA), 3330, 40);
  near(distanceKm(KAABA, KAABA), 0, 1e-9);
  assert.equal(headingOf({ webkitCompassHeading: 42 }), 42);
  assert.equal(headingOf({ absolute: true, alpha: 90 }), 270);
  assert.equal(headingOf({ absolute: false, alpha: 90 }), null, 'a relative alpha is not a compass');
});

test('prayer: method proposed from the country (Tunisia = 18), named, editable', () => {
  assert.equal(methodFor('TN'), 18);
  assert.equal(methodFor('SA'), 4);
  assert.equal(methodFor('xx'), 3, 'Muslim World League by default');
  for (const id of [1, 2, 3, 4, 5, 18, 21, 23]) assert.ok(METHODS[id].ar && METHODS[id].en, id);
  assert.equal(countryFromTz('Africa/Tunis'), 'TN');
  for (const p of PLACES) assert.ok(Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 && p.ar && p.en && p.cc, p.id);
});

test('prayer: an Aladhan calendar (iso8601) gives the next prayer and the countdown', () => {
  const day = (d, f) => ({ date: { gregorian: { date: d } }, meta: { timezone: 'Africa/Tunis', method: { id: 18 } }, timings: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, `${v} (CET)`])) });
  const j = { code: 200, data: [
    day('04-10-2026', { Fajr: '2026-10-04T04:48:00+01:00', Sunrise: '2026-10-04T06:13:00+01:00', Dhuhr: '2026-10-04T12:04:00+01:00', Asr: '2026-10-04T15:25:00+01:00', Maghrib: '2026-10-04T17:55:00+01:00', Isha: '2026-10-04T19:20:00+01:00' }),
    day('05-10-2026', { Fajr: '2026-10-05T04:49:00+01:00', Sunrise: '2026-10-05T06:14:00+01:00', Dhuhr: '2026-10-05T12:04:00+01:00', Asr: '2026-10-05T15:24:00+01:00', Maghrib: '2026-10-05T17:54:00+01:00', Isha: '2026-10-05T19:18:00+01:00' })] };
  const days = parseCalendar(j);
  assert.equal(days[0].date, '2026-10-04');
  const n1 = nextPrayer(days, Date.parse('2026-10-04T13:00:00+01:00'));
  assert.equal(n1.next.name, 'Asr');
  assert.equal(hms(n1.left), '02:25:00');
  const n2 = nextPrayer(days, Date.parse('2026-10-04T20:00:00+01:00'));
  assert.equal(n2.next.name, 'Fajr'); assert.equal(n2.next.date, '2026-10-05');
  assert.throws(() => parseCalendar({ code: 400 }));
});

test('mosques: Overpass query around the point, sorted by distance, duplicates removed, Google Maps link', () => {
  const q = overpassQuery(35.5047, 11.0622, 2000);
  assert.match(q, /"amenity"="place_of_worship"\]\["religion"="muslim"\]\(around:2000,35\.50470,11\.06220\)/);
  assert.match(overpassQuery(0, 0, 999999), /around:20000,/, 'radius capped');
  const from = { lat: 35.5047, lon: 11.0622 };
  const list = parseMosques({ elements: [
    { type: 'way', id: 2, center: { lat: 35.5055, lon: 11.0640 }, tags: { name: 'الجامع الكبير' } },
    { type: 'node', id: 1, lat: 35.5056, lon: 11.0641, tags: { name: 'الجامع الكبير', 'name:en': 'Great Mosque' } },
    { type: 'node', id: 3, lat: 35.5100, lon: 11.0700, tags: {} },
    { type: 'node', id: 4, tags: {} }] }, from, 'ar');
  assert.equal(list.length, 2, 'the same mosque twice and an element without position are dropped');
  assert.ok(list[0].km < list[1].km);
  assert.match(list[0].maps, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=35\.505/);
  assert.equal(list[1].name, '');
});

test('tools: «كم بقي على صلاة العصر», "next prayer", «اتجاه القبلة», "nearest mosque" open the right tool', () => {
  assert.deepEqual(toolIntent('كم بقي على صلاة العصر'), { tool: 'prayer', args: { prayer: 'Asr' } });
  assert.deepEqual(toolIntent('next prayer'), { tool: 'prayer', args: {} });
  assert.equal(toolIntent('اتجاه القبلة').tool, 'qibla');
  assert.equal(toolIntent('أقرب مسجد').tool, 'mosques');
  assert.equal(toolIntent('nearest mosque').tool, 'mosques');
  assert.equal(toolIntent('ما حكم الصلاة في المسجد'), null);
});

test('privacy: the position goes only to the public services the browser calls, never to our API', () => {
  const csp = SECURITY_HEADERS['Content-Security-Policy'];
  for (const h of ['https://api.aladhan.com', 'https://overpass-api.de', 'https://nominatim.openstreetmap.org']) assert.ok(csp.includes(h), h);
  assert.match(SECURITY_HEADERS['Permissions-Policy'], /geolocation=\(self\)/);
  const src = fs.readFileSync(new URL('../public/js/practical.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /fetch\(\s*['"`]\/?api\//, 'no call to Mishkat\'s API with a position');
  assert.match(src, /getCurrentPosition\(/);
  assert.ok(src.indexOf('getCurrentPosition') > src.indexOf("el.querySelector('[data-pos]').onclick"), 'the position is asked only after a click');
});
