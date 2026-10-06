// (6 Oct) worldwide check of the practical tools: for places on every continent (polar, date line, southern
// hemisphere), the qibla computed in the browser is compared with Aladhan's own qibla API (an independent
// computation), the magnetic declination (WMM2025) is shown, and the prayer calendar of the place's month is loaded
// and parsed exactly as the page does (parseCalendar, nextPrayer, monthIn). Network needed.
// node tools/check_world.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { qiblaBearing, qiblaMagnetic, parseCalendar, nextPrayer, monthIn, methodFor, distanceKm, KAABA } from '../public/js/practical.js';
import { toHijri, formatHijri } from '../public/js/hijri.js';

const PLACES = [
  ['Mahdia', 35.5047, 11.0622, 'TN'], ['Makkah (Haram)', 21.4225, 39.8262, 'SA'], ['Jakarta', -6.2088, 106.8456, 'ID'],
  ['Karachi', 24.8607, 67.0011, 'PK'], ['Dhaka', 23.8103, 90.4125, 'BD'], ['Istanbul', 41.0082, 28.9784, 'TR'],
  ['Cairo', 30.0444, 31.2357, 'EG'], ['Lagos', 6.5244, 3.3792, 'NG'], ['Nairobi', -1.2921, 36.8219, 'KE'],
  ['Cape Town', -33.9249, 18.4241, 'ZA'], ['London', 51.5074, -0.1278, 'GB'], ['Paris', 48.8566, 2.3522, 'FR'],
  ['Moscow', 55.7558, 37.6173, 'RU'], ['Kazan', 55.7963, 49.1088, 'RU'], ['Reykjavik', 64.1466, -21.9426, 'IS'],
  ['Tromsø', 69.6492, 18.9553, 'NO'], ['Longyearbyen', 78.2232, 15.6267, 'SJ'], ['New York', 40.7128, -74.006, 'US'],
  ['Toronto', 43.6532, -79.3832, 'CA'], ['Vancouver', 49.2827, -123.1207, 'CA'], ['Anchorage', 61.2181, -149.9003, 'US'],
  ['Iqaluit', 63.7467, -68.517, 'CA'], ['Mexico City', 19.4326, -99.1332, 'MX'], ['São Paulo', -23.5505, -46.6333, 'BR'],
  ['Buenos Aires', -34.6037, -58.3816, 'AR'], ['Ushuaia', -54.8019, -68.303, 'AR'], ['Tokyo', 35.6762, 139.6503, 'JP'],
  ['Kuala Lumpur', 3.139, 101.6869, 'MY'], ['Sydney', -33.8688, 151.2093, 'AU'], ['Auckland', -36.8485, 174.7633, 'NZ'],
  ['Honolulu', 21.3069, -157.8583, 'US'], ['Apia (UTC+13)', -13.8507, -171.7514, 'WS'], ['Kiritimati (UTC+14)', 1.8721, -157.4278, 'KI'],
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const out = [];
let worstQ = 0;
for (const [name, lat, lon, cc] of PLACES) {
  const row = { name, lat, lon, cc };
  const b = qiblaBearing(lat, lon);
  row.qibla = +b.toFixed(2);
  row.km = Math.round(distanceKm({ lat, lon }, KAABA));
  const m = qiblaMagnetic(lat, lon);
  row.decl = m && +m.decl.toFixed(2); row.qiblaMagnetic = m && +m.magnetic.toFixed(2); row.compass = m && m.zone;
  try {
    const j = await (await fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lon}`)).json();
    row.aladhanQibla = +(+j.data.direction).toFixed(2);
    if (row.km > 1) { const d = Math.abs(((b - j.data.direction + 540) % 360) - 180); row.qiblaDiff = +d.toFixed(3); worstQ = Math.max(worstQ, d); }
  } catch (e) { row.aladhanQibla = 'error ' + e.message; }
  await sleep(400);
  try {
    const method = methodFor(cc);
    const ym = monthIn(undefined);
    const r = await fetch(`https://api.aladhan.com/v1/calendar/${ym.y}/${ym.m}?latitude=${lat}&longitude=${lon}&method=${method}&school=0&latitudeAdjustmentMethod=3&iso8601=true`);
    const days = parseCalendar(await r.json());
    const tz = days[0].tz, here = monthIn(tz);
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    const today = days.find(d => d.date === todayKey);
    const fmt = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
    const nx = nextPrayer(days);
    row.tz = tz; row.method = method; row.placeMonth = `${here.y}-${here.m}`; row.todayFound = !!today;
    row.today = today && Object.fromEntries(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(k => [k, fmt(today.times[k])]));
    // order of the day must be strictly increasing (a broken high-latitude day would show here)
    row.ordered = !!today && ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].every((k, i, a) => i === 0 || today.times[a[i - 1]] < today.times[k]);
    row.next = nx && `${nx.next.name} ${fmt(nx.next.at)}`;
    row.localTime = new Date().toLocaleString('en-GB', { timeZone: tz });
    row.hijri = formatHijri(toHijri(new Date(new Date().toLocaleString('en-US', { timeZone: tz }))), 'en');
  } catch (e) { row.prayerError = e.message; }
  out.push(row);
  console.log(`${name.padEnd(20)} qibla ${row.qibla}° (Aladhan ${row.aladhanQibla}°, Δ ${row.qiblaDiff ?? '-'}) decl ${row.decl}° mag ${row.qiblaMagnetic}° [${row.compass}] | ${row.tz} today:${row.todayFound} ordered:${row.ordered} ${row.today ? Object.values(row.today).join(' ') : row.prayerError} | ${row.hijri}`);
  await sleep(400);
}
console.log(`\nworst qibla difference with Aladhan: ${worstQ.toFixed(3)}°`);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ date: new Date().toISOString(), worstQiblaDiff: worstQ, places: out }, null, 1));
