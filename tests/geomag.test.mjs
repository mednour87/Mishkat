// WMM2025 against the official test values of NOAA (WMM2025COF/WMM2025_TestValues.txt, 100 points, 2025.0–2029.5)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { magField, compassZone, decimalYear } from '../public/js/geomag.js';

const rows = readFileSync(new URL('./data/wmm2025_testvalues.txt', import.meta.url), 'utf8').split('\n')
  .filter(l => l.trim() && !l.startsWith('#')).map(l => l.trim().split(/\s+/).map(Number));

test('WMM2025: 100 official test values (declination ±0.01°, H/X/Y/Z ±1 nT)', () => {
  assert.equal(rows.length, 100);
  for (const [yr, alt, lat, lon, D, I, H, X, Y, Z] of rows) {
    const f = magField(lat, lon, alt, yr);
    const dd = Math.abs(((f.decl - D + 540) % 360) - 180);
    assert.ok(dd < 0.01, `D at ${lat},${lon},${yr}: ${f.decl} vs ${D}`);
    assert.ok(Math.abs(f.incl - I) < 0.01, `I at ${lat},${lon}`);
    for (const [a, b, k] of [[f.H, H, 'H'], [f.X, X, 'X'], [f.Y, Y, 'Y'], [f.Z, Z, 'Z']]) assert.ok(Math.abs(a - b) < 1, `${k} at ${lat},${lon},${yr}: ${a} vs ${b}`);
  }
});

test('WMM2025: validity window and blackout zone', () => {
  assert.equal(magField(10, 10, 0, 2024.9), null);
  assert.equal(magField(10, 10, 0, 2030.0), null);
  assert.ok(magField(10, 10, 0, 2026.76));
  assert.equal(compassZone(1500), 'blackout'); assert.equal(compassZone(4000), 'caution'); assert.equal(compassZone(30000), 'ok');
  assert.ok(Math.abs(decimalYear(new Date(Date.UTC(2026, 0, 1))) - 2026) < 1e-9);
});
