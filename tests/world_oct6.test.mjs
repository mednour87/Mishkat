// (6 Oct) worldwide correctness of the practical tools and the default 3D shape
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { qiblaBearing, qiblaMagnetic, nearestCountry, countryOfTz, monthIn } from '../public/js/practical.js';
import { tabularHijri, toHijri, CALENDAR } from '../public/js/hijri.js';

const P = JSON.parse(fs.readFileSync(new URL('../public/data/places.json', import.meta.url), 'utf8'));

test('qibla: same as Aladhan qibla API on every continent (checked live on 6 Oct, eval/world)', () => {
  const j = JSON.parse(fs.readFileSync(new URL('../eval/world/check_world_2026-10-06.json', import.meta.url), 'utf8'));
  assert.ok(j.places.length >= 30);
  for (const r of j.places) {
    if (r.km > 1) assert.ok(Math.abs(((qiblaBearing(r.lat, r.lon) - r.aladhanQibla + 540) % 360) - 180) < 0.01, r.name);
    assert.equal(r.todayFound, true, r.name); assert.equal(r.ordered, true, r.name);
  }
});

test('qibla: the magnetic declination is applied (Auckland ≈ +20°, Iqaluit ≈ −24°); blackout near the magnetic pole', () => {
  const d = new Date(Date.UTC(2026, 9, 6));
  assert.ok(Math.abs(qiblaMagnetic(-36.8485, 174.7633, d).decl - 20.3) < 0.5);
  assert.ok(Math.abs(qiblaMagnetic(63.7467, -68.517, d).decl + 23.9) < 0.5);
  const m = qiblaMagnetic(-36.8485, 174.7633, d);
  assert.ok(Math.abs(((qiblaBearing(-36.8485, 174.7633) - m.decl - m.magnetic + 540) % 360) - 180) < 1e-6);
  // near the north magnetic pole (≈ 86 N, 140 E in 2026) the horizontal field is too weak
  assert.equal(qiblaMagnetic(86, 140, d).zone, 'blackout');
  const src = fs.readFileSync(new URL('../public/js/practical.js', import.meta.url), 'utf8');
  assert.match(src, /h = \(h \+ ang \+ decl \+ 720\) % 360/);
});

test('country of any position or time zone of the world (method proposal)', () => {
  assert.equal(nearestCountry(P, -6.2088, 106.8456).cc, 'ID');
  assert.equal(nearestCountry(P, 49.2827, -123.1207).cc, 'CA');
  assert.equal(nearestCountry(P, -36.8485, 174.7633).cc, 'NZ');
  assert.equal(countryOfTz(P, 'Asia/Makassar'), 'ID');
  assert.equal(countryOfTz(P, 'America/Toronto'), 'CA');
  assert.equal(countryOfTz(P, 'Africa/Tunis'), 'TN');
});

test('prayer month = the month of the PLACE (a city across the date line may be in another month)', () => {
  const t = new Date(Date.UTC(2026, 9, 31, 20, 0));   // 31 Oct 20:00 UTC
  assert.deepEqual(monthIn('Pacific/Kiritimati', t), { y: 2026, m: 11 });
  assert.deepEqual(monthIn('Pacific/Honolulu', t), { y: 2026, m: 10 });
  const src = fs.readFileSync(new URL('../public/js/practical.js', import.meta.url), 'utf8');
  assert.match(src, /latitudeAdjustmentMethod=3/);
});

test('Hijri: Umm al-Qura in Node; tabular fallback within one day of it', () => {
  assert.equal(CALENDAR, 'umalqura');
  const h = toHijri(new Date(2026, 9, 6));
  assert.deepEqual(h, { y: 1448, m: 4, d: 25 });
  for (let k = 0; k < 400; k++) {
    const t = Date.UTC(2026, 0, 1) + k * 7 * 86400000, dt = new Date(t);
    const a = toHijri(new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())), b = tabularHijri(t);
    const n = (x) => x.y * 354.367 + (x.m - 1) * 29.53 + x.d;
    assert.ok(Math.abs(n(a) - n(b)) <= 2.1, `${dt.toISOString()} ${JSON.stringify(a)} ${JSON.stringify(b)}`);
  }
});

test('the site opens on the rose of surahs; a shape picked by the visitor is remembered', () => {
  const app = fs.readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /const DEFAULT_SHAPE = 'rose';/);
  assert.match(app, /if \(!quiet\) store\.set\('shapePick', shape \+ '\|' \+ order\);/);
  assert.match(app, /await galaxyJob\(0, 'mushaf'\);[\s\S]{0,400}const v0 = startView\(\);/);
});
