// Magnetic declination from the World Magnetic Model WMM2025 (NOAA NCEI / British Geological Survey), valid
// 2025.0–2030.0. A phone compass (Android's absolute orientation, iOS webkitCompassHeading) points to MAGNETIC
// north; the qibla bearing is computed from TRUE north. The difference (declination) is a few degrees in the Arab
// countries but reaches 15–20° in Canada, New Zealand or Siberia, so the qibla dial adds it back everywhere.
//
// Coefficients: WMM.COF of WMM2025COF.zip, https://www.ncei.noaa.gov/products/world-magnetic-model (public domain,
// U.S. Government work), copied verbatim (n, m, g, h, dg/dt, dh/dt). The method is the one of the WMM technical
// report (NOAA Technical Report NESDIS/NCEI, «The US/UK World Magnetic Model for 2025–2030»): geodetic → geocentric
// coordinates, Schmidt semi-normalised associated Legendre functions, field rotated back to the geodetic frame.
// tests/geomag.test.mjs checks it against the 100 official test values shipped with the coefficients.

export const WMM_EPOCH = 2025.0, WMM_END = 2030.0;
// [n, m, g, h, gdot, hdot] in nT and nT/year
const COF = [
  [1, 0, -29351.8, 0.0, 12.0, 0.0],
  [1, 1, -1410.8, 4545.4, 9.7, -21.5],
  [2, 0, -2556.6, 0.0, -11.6, 0.0],
  [2, 1, 2951.1, -3133.6, -5.2, -27.7],
  [2, 2, 1649.3, -815.1, -8.0, -12.1],
  [3, 0, 1361.0, 0.0, -1.3, 0.0],
  [3, 1, -2404.1, -56.6, -4.2, 4.0],
  [3, 2, 1243.8, 237.5, 0.4, -0.3],
  [3, 3, 453.6, -549.5, -15.6, -4.1],
  [4, 0, 895.0, 0.0, -1.6, 0.0],
  [4, 1, 799.5, 278.6, -2.4, -1.1],
  [4, 2, 55.7, -133.9, -6.0, 4.1],
  [4, 3, -281.1, 212.0, 5.6, 1.6],
  [4, 4, 12.1, -375.6, -7.0, -4.4],
  [5, 0, -233.2, 0.0, 0.6, 0.0],
  [5, 1, 368.9, 45.4, 1.4, -0.5],
  [5, 2, 187.2, 220.2, 0.0, 2.2],
  [5, 3, -138.7, -122.9, 0.6, 0.4],
  [5, 4, -142.0, 43.0, 2.2, 1.7],
  [5, 5, 20.9, 106.1, 0.9, 1.9],
  [6, 0, 64.4, 0.0, -0.2, 0.0],
  [6, 1, 63.8, -18.4, -0.4, 0.3],
  [6, 2, 76.9, 16.8, 0.9, -1.6],
  [6, 3, -115.7, 48.8, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.9, 0.9],
  [6, 5, 14.9, 10.9, 0.3, 0.7],
  [6, 6, -60.7, 72.7, 0.9, 0.9],
  [7, 0, 79.5, 0.0, -0.0, 0.0],
  [7, 1, -77.0, -48.9, -0.1, 0.6],
  [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1.0, 0.5, -0.8],
  [7, 4, 15.8, 23.4, -0.1, 0.0],
  [7, 5, 2.5, -7.4, -0.8, -1.0],
  [7, 6, -11.1, -25.1, -0.8, 0.6],
  [7, 7, 14.2, -2.3, 0.8, -0.2],
  [8, 0, 23.2, 0.0, -0.1, 0.0],
  [8, 1, 10.8, 7.1, 0.2, -0.2],
  [8, 2, -17.5, -12.6, 0.0, 0.5],
  [8, 3, 2.0, 11.4, 0.5, -0.4],
  [8, 4, -21.7, -9.7, -0.1, 0.4],
  [8, 5, 16.9, 12.7, 0.3, -0.5],
  [8, 6, 15.0, 0.7, 0.2, -0.6],
  [8, 7, -16.8, -5.2, -0.0, 0.3],
  [8, 8, 0.9, 3.9, 0.2, 0.2],
  [9, 0, 4.6, 0.0, -0.0, 0.0],
  [9, 1, 7.8, -24.8, -0.1, -0.3],
  [9, 2, 3.0, 12.2, 0.1, 0.3],
  [9, 3, -0.2, 8.3, 0.3, -0.3],
  [9, 4, -2.5, -3.3, -0.3, 0.3],
  [9, 5, -13.1, -5.2, 0.0, 0.2],
  [9, 6, 2.4, 7.2, 0.3, -0.1],
  [9, 7, 8.6, -0.6, -0.1, -0.2],
  [9, 8, -8.7, 0.8, 0.1, 0.4],
  [9, 9, -12.9, 10.0, -0.1, 0.1],
  [10, 0, -1.3, 0.0, 0.1, 0.0],
  [10, 1, -6.4, 3.3, 0.0, 0.0],
  [10, 2, 0.2, 0.0, 0.1, -0.0],
  [10, 3, 2.0, 2.4, 0.1, -0.2],
  [10, 4, -1.0, 5.3, -0.0, 0.1],
  [10, 5, -0.6, -9.1, -0.3, -0.1],
  [10, 6, -0.9, 0.4, 0.0, 0.1],
  [10, 7, 1.5, -4.2, -0.1, 0.0],
  [10, 8, 0.9, -3.8, -0.1, -0.1],
  [10, 9, -2.7, 0.9, -0.0, 0.2],
  [10, 10, -3.9, -9.1, -0.0, -0.0],
  [11, 0, 2.9, 0.0, 0.0, 0.0],
  [11, 1, -1.5, 0.0, -0.0, -0.0],
  [11, 2, -2.5, 2.9, 0.0, 0.1],
  [11, 3, 2.4, -0.6, 0.0, -0.0],
  [11, 4, -0.6, 0.2, 0.0, 0.1],
  [11, 5, -0.1, 0.5, -0.1, -0.0],
  [11, 6, -0.6, -0.3, 0.0, -0.0],
  [11, 7, -0.1, -1.2, -0.0, 0.1],
  [11, 8, 1.1, -1.7, -0.1, -0.0],
  [11, 9, -1.0, -2.9, -0.1, 0.0],
  [11, 10, -0.2, -1.8, -0.1, 0.0],
  [11, 11, 2.6, -2.3, -0.1, 0.0],
  [12, 0, -2.0, 0.0, 0.0, 0.0],
  [12, 1, -0.2, -1.3, 0.0, -0.0],
  [12, 2, 0.3, 0.7, -0.0, 0.0],
  [12, 3, 1.2, 1.0, -0.0, -0.1],
  [12, 4, -1.3, -1.4, -0.0, 0.1],
  [12, 5, 0.6, -0.0, -0.0, -0.0],
  [12, 6, 0.6, 0.6, 0.1, -0.0],
  [12, 7, 0.5, -0.1, -0.0, -0.0],
  [12, 8, -0.1, 0.8, 0.0, 0.0],
  [12, 9, -0.4, 0.1, 0.0, -0.0],
  [12, 10, -0.2, -1.0, -0.1, -0.0],
  [12, 11, -1.3, 0.1, -0.0, 0.0],
  [12, 12, -0.7, 0.2, -0.1, -0.1]
];
const N = 12;
const A = 6378.137, F = 1 / 298.257223563, E2 = F * (2 - F), RE = 6371.2;   // WGS-84 ellipsoid; WMM reference radius
const D2R = Math.PI / 180;

// decimal year of a date (UTC)
export function decimalYear(date = new Date()) {
  const y = date.getUTCFullYear(), a = Date.UTC(y, 0, 1), b = Date.UTC(y + 1, 0, 1);
  return y + (date.getTime() - a) / (b - a);
}

// Schmidt semi-normalisation factors S(n, m)
const S = Array.from({ length: N + 1 }, () => new Float64Array(N + 1));
S[0][0] = 1;
for (let n = 1; n <= N; n++) {
  S[n][0] = S[n - 1][0] * (2 * n - 1) / n;
  for (let m = 1; m <= n; m++) S[n][m] = S[n][m - 1] * Math.sqrt((n - m + 1) * (m === 1 ? 2 : 1) / (n + m));
}

// { decl (deg, east positive), incl (deg), H, X, Y, Z, F (nT) } at a geodetic latitude/longitude (deg), height (km
// above the WGS-84 ellipsoid) and decimal year; null outside the model's validity (the caller then says so)
export function magField(lat, lon, hKm = 0, year = decimalYear()) {
  if (!(year >= WMM_EPOCH && year < WMM_END) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const dt = year - WMM_EPOCH;
  const g = Array.from({ length: N + 1 }, () => new Float64Array(N + 1)), h = Array.from({ length: N + 1 }, () => new Float64Array(N + 1));
  for (const [n, m, gg, hh, gd, hd] of COF) { g[n][m] = gg + dt * gd; h[n][m] = hh + dt * hd; }
  // geodetic → geocentric spherical
  const phi = lat * D2R, sp = Math.sin(phi), cp = Math.cos(phi);
  const Rc = A / Math.sqrt(1 - E2 * sp * sp);
  const p = (Rc + hKm) * cp, z = (Rc * (1 - E2) + hKm) * sp;
  const r = Math.hypot(p, z), phic = Math.asin(z / r);
  // colatitude θ: cos θ = sin φ', sin θ = cos φ' (kept away from 0 at the poles)
  const ct = Math.sin(phic), st = Math.max(1e-10, Math.cos(phic));
  // Gauss-normalised P(n,m) and dP/dθ by recursion, then Schmidt factors
  const P = Array.from({ length: N + 1 }, () => new Float64Array(N + 1)), dP = Array.from({ length: N + 1 }, () => new Float64Array(N + 1));
  P[0][0] = 1; dP[0][0] = 0;
  for (let n = 1; n <= N; n++) for (let m = 0; m <= n; m++) {
    if (n === m) { P[n][m] = st * P[n - 1][m - 1]; dP[n][m] = st * dP[n - 1][m - 1] + ct * P[n - 1][m - 1]; }
    else {
      const K = n > 1 ? ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3)) : 0;
      const P2 = n > 1 ? P[n - 2][m] : 0, dP2 = n > 1 ? dP[n - 2][m] : 0;
      P[n][m] = ct * P[n - 1][m] - K * P2;
      dP[n][m] = ct * dP[n - 1][m] - st * P[n - 1][m] - K * dP2;
    }
  }
  const lam = lon * D2R;
  let Br = 0, Bt = 0, Bp = 0;
  for (let n = 1; n <= N; n++) {
    const ar = Math.pow(RE / r, n + 2);
    for (let m = 0; m <= n; m++) {
      const cm = Math.cos(m * lam), sm = Math.sin(m * lam), Ps = S[n][m] * P[n][m], dPs = S[n][m] * dP[n][m];
      const gh = g[n][m] * cm + h[n][m] * sm;
      Br += ar * (n + 1) * gh * Ps;
      Bt -= ar * gh * dPs;
      Bp += ar * m * (g[n][m] * sm - h[n][m] * cm) * Ps;
    }
  }
  Bp /= st;
  // geocentric north, east, down → geodetic
  const Xc = -Bt, Yc = Bp, Zc = -Br, psi = phic - phi;
  const X = Xc * Math.cos(psi) - Zc * Math.sin(psi), Y = Yc, Z = Xc * Math.sin(psi) + Zc * Math.cos(psi);
  const H = Math.hypot(X, Y);
  return { decl: Math.atan2(Y, X) / D2R, incl: Math.atan2(Z, H) / D2R, H, X, Y, Z, F: Math.hypot(H, Z) };
}

// the WMM «blackout zone»: near the magnetic poles the horizontal field is too weak for a compass
// (H < 2000 nT: unreliable; 2000–6000 nT: caution), as defined with the model
export function compassZone(H) { return H < 2000 ? 'blackout' : H < 6000 ? 'caution' : 'ok'; }
