// Practical tools (T064 prayer times, T065 qibla, T066 nearby mosques) — rule 9 of the project: each result
// shows its method and authority and is never presented as a religious decision; rule 17: the visitor's
// position is optional, asked only after a click, kept in this browser, and NEVER sent to Mishkat's server.
// The browser calls the public services directly (Aladhan for prayer times, OpenStreetMap's Overpass for
// mosques, Nominatim to find a city by name); the qibla is computed here.
//
// Pure functions are exported for the tests; createPractical(ctx) returns the panel renderers.

import { magField, compassZone } from './geomag.js';

export const KAABA = { lat: 21.4225, lon: 39.8262 };

// Aladhan calculation methods (https://aladhan.com/calculation-methods), proposed from the country
export const METHOD_BY_COUNTRY = {
  TN: 18, DZ: 19, MA: 21, SA: 4, EG: 5, AE: 16, KW: 9, QA: 10, JO: 23, TR: 13, FR: 12, MY: 17, ID: 20, SG: 11, RU: 14, PT: 22,
  US: 2, CA: 2, GB: 15, BH: 8, OM: 8, YE: 4, IQ: 3, SY: 3, LB: 3, PS: 3, LY: 3, SD: 5, PK: 1, IN: 1, BD: 1,
};
export const METHODS = {
  1: { ar: 'جامعة العلوم الإسلامية بكراتشي', en: 'University of Islamic Sciences, Karachi' }, 2: { ar: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)', en: 'Islamic Society of North America (ISNA)' },
  3: { ar: 'رابطة العالم الإسلامي', en: 'Muslim World League' }, 4: { ar: 'تقويم أم القرى، مكة المكرمة', en: 'Umm al-Qura University, Makkah' },
  5: { ar: 'الهيئة المصرية العامة للمساحة', en: 'Egyptian General Authority of Survey' }, 8: { ar: 'منطقة الخليج', en: 'Gulf Region' }, 9: { ar: 'الكويت', en: 'Kuwait' },
  10: { ar: 'قطر', en: 'Qatar' }, 11: { ar: 'المجلس الإسلامي في سنغافورة', en: 'Majlis Ugama Islam Singapura' }, 12: { ar: 'اتحاد المنظمات الإسلامية في فرنسا', en: 'Union des Organisations Islamiques de France' },
  13: { ar: 'رئاسة الشؤون الدينية التركية', en: 'Diyanet İşleri Başkanlığı, Turkey' }, 14: { ar: 'الإدارة الدينية لمسلمي روسيا', en: 'Spiritual Administration of Muslims of Russia' },
  15: { ar: 'لجنة رؤية الهلال', en: 'Moonsighting Committee Worldwide' }, 16: { ar: 'دبي', en: 'Dubai' }, 17: { ar: 'إدارة التنمية الإسلامية بماليزيا (JAKIM)', en: 'JAKIM, Malaysia' },
  18: { ar: 'تونس', en: 'Tunisia' }, 19: { ar: 'الجزائر', en: 'Algeria' }, 20: { ar: 'وزارة الشؤون الدينية الإندونيسية', en: 'Kemenag, Indonesia' },
  21: { ar: 'المغرب', en: 'Morocco' }, 22: { ar: 'الجالية الإسلامية في لشبونة', en: 'Comunidade Islamica de Lisboa' }, 23: { ar: 'وزارة الأوقاف الأردنية', en: 'Ministry of Awqaf, Jordan' },
};
export const HANAFI_DEFAULT = new Set(['TR', 'PK', 'IN', 'BD', 'AF']);
export const methodFor = (country) => METHOD_BY_COUNTRY[String(country || '').toUpperCase()] || 3;

// a few places that need no search (centre of the city; the Kaaba for Makkah)
export const PLACES = [
  { id: 'tunis', ar: 'تونس العاصمة', en: 'Tunis', lat: 36.8065, lon: 10.1815, cc: 'TN' },
  { id: 'sousse', ar: 'سوسة', en: 'Sousse', lat: 35.8256, lon: 10.6360, cc: 'TN' },
  { id: 'mahdia', ar: 'المهدية', en: 'Mahdia', lat: 35.5047, lon: 11.0622, cc: 'TN' },
  { id: 'monastir', ar: 'المنستير', en: 'Monastir', lat: 35.7643, lon: 10.8113, cc: 'TN' },
  { id: 'sfax', ar: 'صفاقس', en: 'Sfax', lat: 34.7406, lon: 10.7603, cc: 'TN' },
  { id: 'kairouan', ar: 'القيروان', en: 'Kairouan', lat: 35.6781, lon: 10.0963, cc: 'TN' },
  { id: 'makkah', ar: 'مكة المكرمة', en: 'Makkah', lat: 21.4225, lon: 39.8262, cc: 'SA' },
  { id: 'madinah', ar: 'المدينة المنورة', en: 'Madinah', lat: 24.4672, lon: 39.6111, cc: 'SA' },
  { id: 'riyadh', ar: 'الرياض', en: 'Riyadh', lat: 24.7136, lon: 46.6753, cc: 'SA' },
  { id: 'cairo', ar: 'القاهرة', en: 'Cairo', lat: 30.0444, lon: 31.2357, cc: 'EG' },
  { id: 'paris', ar: 'باريس', en: 'Paris', lat: 48.8566, lon: 2.3522, cc: 'FR' },
  { id: 'london', ar: 'لندن', en: 'London', lat: 51.5074, lon: -0.1278, cc: 'GB' },
];
// country from the browser's time zone (no location request): a proposal, always editable
const TZ_CC = { 'Africa/Tunis': 'TN', 'Africa/Algiers': 'DZ', 'Africa/Casablanca': 'MA', 'Asia/Riyadh': 'SA', 'Africa/Cairo': 'EG', 'Asia/Dubai': 'AE', 'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW', 'Asia/Amman': 'JO', 'Europe/Istanbul': 'TR', 'Europe/Paris': 'FR', 'Europe/London': 'GB', 'Asia/Karachi': 'PK', 'Asia/Jakarta': 'ID', 'Asia/Kuala_Lumpur': 'MY',
  'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM', 'Asia/Baghdad': 'IQ', 'Asia/Damascus': 'SY', 'Asia/Beirut': 'LB', 'Africa/Tripoli': 'LY', 'Africa/Khartoum': 'SD', 'Asia/Dhaka': 'BD' };
export const countryFromTz = (tz) => TZ_CC[tz] || '';

// (6 Oct) the country of a position = the country of the nearest city of GeoNames cities15000 (data/places.json, every
// country of the world): the browser's time zone alone left most of the world on the default (and a traveller's
// phone may keep the time zone of home). Used only to PROPOSE a calculation method, always editable.
export function nearestCountry(P, lat, lon) {
  let best = null, bd = Infinity;
  for (const [cc, list] of Object.entries((P && P.countries) || {})) for (const c of list) {
    const d = distanceKm({ lat, lon }, { lat: c[2], lon: c[3] });
    if (d < bd) { bd = d; best = cc; }
  }
  return best ? { cc: best, km: bd } : null;
}
// the country of a time zone, from the same list (every zone that has a city in it)
export function countryOfTz(P, tz) {
  if (!tz) return '';
  if (TZ_CC[tz]) return TZ_CC[tz];
  for (const [cc, list] of Object.entries((P && P.countries) || {})) if (list.some(c => c[4] === tz)) return cc;
  return '';
}
// the calendar month (year, month) of a date in a time zone (the place's own today, not the visitor's)
export function monthIn(tz, date = new Date()) {
  try {
    const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone: tz || undefined, year: 'numeric', month: '2-digit' }).format(date).split('-').map(Number);
    if (y && m) return { y, m };
  } catch (e) { /* unknown zone */ }
  return { y: date.getFullYear(), m: date.getMonth() + 1 };
}
// the magnetic correction of the qibla at a place (WMM2025): the bearing to read on a magnetic compass is the true
// bearing minus the declination (east positive); null outside the model's years
export function qiblaMagnetic(lat, lon, date = new Date()) {
  const y = date.getUTCFullYear(), a = Date.UTC(y, 0, 1), b = Date.UTC(y + 1, 0, 1);
  const f = magField(lat, lon, 0, y + (date.getTime() - a) / (b - a));
  if (!f) return null;
  const tb = qiblaBearing(lat, lon);
  return { decl: f.decl, H: f.H, zone: compassZone(f.H), magnetic: ((tb - f.decl) % 360 + 360) % 360 };
}

const R = Math.PI / 180;
// initial great-circle bearing from a point to the Kaaba, degrees clockwise from true north
export function qiblaBearing(lat, lon) {
  const p1 = lat * R, p2 = KAABA.lat * R, dl = (KAABA.lon - lon) * R;
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / R + 360) % 360;
}
export function distanceKm(a, b) {
  const dp = (b.lat - a.lat) * R, dl = (b.lon - a.lon) * R;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin(dl / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
}
// heading of the phone from a deviceorientation event (iOS webkitCompassHeading, else absolute alpha)
export function headingOf(ev) {
  if (ev && typeof ev.webkitCompassHeading === 'number') return ev.webkitCompassHeading;
  if (ev && ev.absolute && typeof ev.alpha === 'number') return (360 - ev.alpha) % 360;
  return null;
}

export const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
// Aladhan calendar (iso8601=true) → [{ date:'YYYY-MM-DD', times:{Fajr:ms,…,Sunrise}, hijri }]
export function parseCalendar(j) {
  if (!j || j.code !== 200 || !Array.isArray(j.data)) throw new Error('bad calendar');
  return j.data.map(d => {
    const [dd, mm, yy] = d.date.gregorian.date.split('-');
    const times = {};
    for (const k of [...PRAYERS, 'Sunrise']) { const t = Date.parse(String(d.timings[k]).replace(/\s*\(.*\)$/, '')); if (!Number.isFinite(t)) throw new Error('bad time'); times[k] = t; }
    return { date: `${yy}-${mm}-${dd}`, times, tz: d.meta && d.meta.timezone, method: d.meta && d.meta.method && d.meta.method.id };
  });
}
// the next prayer after `now` across the cached days, and the previous one
export function nextPrayer(days, now = Date.now()) {
  const all = [];
  for (const d of days) for (const k of PRAYERS) all.push({ name: k, at: d.times[k], date: d.date });
  all.sort((a, b) => a.at - b.at);
  const i = all.findIndex(x => x.at > now);
  return i < 0 ? null : { next: all[i], prev: i > 0 ? all[i - 1] : null, left: all[i].at - now };
}
export const hms = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':'); };

// Overpass query for mosques around a point; elements → sorted list
export function overpassQuery(lat, lon, radius) {
  const r = Math.max(200, Math.min(20000, Math.round(radius)));
  const a = `(around:${r},${lat.toFixed(5)},${lon.toFixed(5)})`;
  return `[out:json][timeout:25];(node["amenity"="place_of_worship"]["religion"="muslim"]${a};way["amenity"="place_of_worship"]["religion"="muslim"]${a};relation["amenity"="place_of_worship"]["religion"="muslim"]${a};);out center 80;`;
}
export function parseMosques(j, from, lang = 'ar') {
  const out = [];
  for (const e of (j && j.elements) || []) {
    const lat = e.lat != null ? e.lat : e.center && e.center.lat, lon = e.lon != null ? e.lon : e.center && e.center.lon;
    if (lat == null || lon == null) continue;
    const tg = e.tags || {};
    const name = (lang === 'ar' ? tg['name:ar'] || tg.name : tg['name:en'] || tg.name) || tg.name || '';
    out.push({ id: `${e.type}/${e.id}`, name, lat, lon, km: distanceKm(from, { lat, lon }),
      maps: `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`, osm: `https://www.openstreetmap.org/${e.type}/${e.id}` });
  }
  out.sort((a, b) => a.km - b.km);
  // the same mosque mapped twice (a point and the outline of the building): same name, less than 80 m apart
  return out.filter((m, i) => !out.slice(0, i).some(o => (o.name || '') === (m.name || '') && distanceKm(o, m) < 0.08));
}

// ------------------------------------------------------------------ strings
export const PS = {
  ar: {
    prayer: 'مواقيت الصلاة', qibla: 'اتجاه القبلة', mosques: 'المساجد القريبة',
    place: 'المكان', placeNone: 'اختر مدينتك أو استعمل موقعك لعرض المواقيت.', usePos: 'استعمل موقعي', posNote: 'يُطلب الموقع بعد ضغطك فقط، ويُحفظ في هذا المتصفح. تُرسل الإحداثيات إلى خدمة المواقيت (Aladhan) وإلى خريطة Google Maps المعروضة في الصفحة، وإلى خادم «مشكاة» مقرَّبةً (نحو ١٠٠ م) للبحث عن المساجد دون حفظها.',
    posFail: 'تعذّر الحصول على موقعك (لم يُسمح أو غير متاح). اختر مدينة من القائمة أو ابحث عنها.', posHere: 'موقعي الحالي', cityPh: 'ابحث عن مدينة…', find: 'بحث', choose: 'اختر مدينة', cityNone: 'لم أجد مدينة بهذا الاسم.',
    method: 'طريقة الحساب', methodAuto: (n) => `مقترحة حسب البلد: ${n}`, school: 'العصر', schoolStd: 'الجمهور (ظل المثل)', schoolHanafi: 'الحنفية (ظل المثلين)',
    by: (m, id) => `حسب: ${m} — طريقة Aladhan رقم ${id}. المواقيت حساب فلكي تقريبي، والمعتمد تقويم الجهة الرسمية في بلدك.`,
    highLat: 'في العروض العالية (الصيف القطبي) قد لا يغيب الشفق، فتُقدَّر مواقيت الفجر والعشاء بطريقة «الزاوية» (Angle Based) في خدمة Aladhan؛ ارجع إلى المركز الإسلامي في مدينتك.',
    names: { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
    next: (p) => `الصلاة القادمة: ${p}`, until: (p) => `بقي على صلاة ${p}:`, left: 'الوقت المتبقي', today: 'اليوم', loading: 'جارٍ جلب المواقيت…', fail: 'تعذّر جلب المواقيت (لا اتصال؟).', cached: 'محفوظة لهذا الشهر في متصفحك.',
    tone: '', toneNote: '', sound: 'عند دخول الوقت (والصفحة مفتوحة)', soundNone: 'بلا صوت', soundTone: 'تنبيه هادئ', soundAdhan: 'الأذان', adhanTry: 'استمع إلى الأذان',
    adhanNote: 'تسجيل أذان برخصة مفتوحة من', digits: 'الأرقام', country: 'البلد', city: 'المدينة', mAllMaps: 'كل المساجد القريبة في Google Maps',
    placesSrc: 'قائمة المدن: GeoNames (رخصة CC BY 4.0). يُحفظ اسم المدينة والبلد فقط في ملف تعريف ارتباط (cookie) في متصفحك لسنة، دون الإحداثيات.',
    qDeg: (d) => `القبلة على ${d}° من الشمال الجغرافي`, qDist: (k) => `المسافة إلى الكعبة المشرفة: ${k} كم`, qCompass: 'تفعيل البوصلة', qAlign: 'وجّه أعلى الهاتف حتى يصير السهم الذهبي إلى الأعلى.',
    qCalib: 'البوصلة الإلكترونية تتأثر بالمعادن والمغناطيس: حرّك الهاتف على شكل ٨ لمعايرتها، وتحقّق بعلامة معروفة (محراب مسجد).', qNoSensor: 'لا تتوفر بوصلة في هذا الجهاز؛ استعمل الزاوية المعروضة أو افتح الصفحة على هاتفك:', qNoAbs: 'لم يُرسل الهاتف اتجاهًا مطلقًا من البوصلة، فلن نُدير القرص حتى لا نُريك اتجاهًا خاطئًا. استعمل الزاوية المكتوبة مع بوصلة الهاتف أو علامة معروفة.',
    qQr: 'امسح الرمز لفتح القبلة على هاتفك', qHow: 'الحساب: اتجاه الدائرة العظمى من موقعك إلى الكعبة (21.4225، 39.8262)، يُحسب في متصفحك.',
    qMag: (m, d, east) => `على البوصلة المغناطيسية: ${m}°، والانحراف المغناطيسي هنا ${d}° ${east ? 'شرقًا' : 'غربًا'}`, qMagHow: 'البوصلة تشير إلى الشمال المغناطيسي؛ يُصحَّح القرص تلقائيًا بالانحراف المغناطيسي لمكانك حسب النموذج المغناطيسي العالمي WMM2025 (الإدارة الوطنية الأمريكية للمحيطات والغلاف الجوي NOAA وهيئة المسح الجيولوجي البريطانية).',
    qBlack: 'أنت قرب القطب المغناطيسي: المجال الأفقي ضعيف جدًا ولا يُعتمد على أي بوصلة هنا، فلن نُدير القرص. استعمل الزاوية من الشمال الجغرافي مع الشمس أو علامة معروفة.', qCaution: 'تنبيه: المجال المغناطيسي الأفقي ضعيف في مكانك، فقد تنحرف البوصلة؛ تحقّق بعلامة معروفة.',
    qNoModel: 'خارج سنوات النموذج المغناطيسي (2025–2030): لم يُصحَّح الانحراف المغناطيسي.', qHere: 'أنت في المسجد الحرام أو قريب جدًا من الكعبة المشرفة: استقبل الكعبة بالمعاينة.',
    mRadius: 'نصف القطر', mSearch: 'ابحث عن المساجد', mNone: 'لم تُسجَّل مساجد في هذا النطاق على خريطة OpenStreetMap؛ وسّع النطاق.', mFail: 'تعذّر الوصول إلى خريطة OpenStreetMap الآن.',
    mOnMap: 'على الخريطة', mRoute: 'المسار', mAllMap: 'كل المساجد على الخريطة', mMapTitle: 'خريطة المساجد القريبة (Google Maps)', mMapNote: 'الخريطة من Google Maps داخل الصفحة: تُرسل إليها إحداثيات المكان المختار لعرضه. القائمة من OpenStreetMap عبر خادم «مشكاة» (الموقع مقرَّبًا إلى ١٠٠ م تقريبًا، لا يُحفظ).', mCount: (n) => `${n} مسجدًا في هذا النطاق`,
    mLoading: 'جارٍ البحث…', mMaps: 'Google Maps', mOsm: 'الخريطة', mUnnamed: 'مسجد (بلا اسم في الخريطة)', mSrc: 'البيانات: © مساهمو OpenStreetMap (ODbL) عبر Overpass؛ قد لا تكون كاملة.', km: (k) => `${k} كم`,
  },
  en: {
    prayer: 'Prayer times', qibla: 'Qibla direction', mosques: 'Nearby mosques',
    place: 'Place', placeNone: 'Choose your city or use your location to show the times.', usePos: 'Use my location', posNote: 'Your location is asked only after your click and kept in this browser. The coordinates go to the prayer-time service (Aladhan), to the Google Maps map shown in the page, and — rounded to about 100 m, never stored — to Mishkat’s server to find mosques.',
    posFail: 'Your location could not be read (not allowed or unavailable). Choose a city from the list or search for it.', posHere: 'My current location', cityPh: 'Search a city…', find: 'Search', choose: 'Choose a city', cityNone: 'No city found with this name.',
    method: 'Calculation method', methodAuto: (n) => `proposed for the country: ${n}`, school: 'Asr', schoolStd: 'Majority (shadow = 1×)', schoolHanafi: 'Hanafi (shadow = 2×)',
    by: (m, id) => `According to: ${m} — Aladhan method ${id}. Times are an astronomical approximation; the official calendar of your country prevails.`,
    highLat: 'At high latitudes (polar summer) twilight may never end: Fajr and Isha are then estimated with the «angle-based» rule of the Aladhan service; follow the Islamic centre of your city.',
    names: { Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
    next: (p) => `Next prayer: ${p}`, until: (p) => `Time left until ${p}:`, left: 'Time left', today: 'Today', loading: 'Loading the times…', fail: 'The times could not be loaded (offline?).', cached: 'Saved for this month in your browser.',
    tone: '', toneNote: '', sound: 'When the time comes (page open)', soundNone: 'No sound', soundTone: 'Calm tone', soundAdhan: 'Adhan', adhanTry: 'Listen to the adhan',
    adhanNote: 'Openly licensed adhan recording from', digits: 'Digits', country: 'Country', city: 'City', mAllMaps: 'All nearby mosques in Google Maps',
    placesSrc: 'City list: GeoNames (CC BY 4.0). Only the city and country names are kept in a cookie in your browser for one year, never the coordinates.',
    qDeg: (d) => `Qibla at ${d}° from true north`, qDist: (k) => `Distance to the Kaaba: ${k} km`, qCompass: 'Turn on the compass', qAlign: 'Turn the top of the phone until the golden arrow points up.',
    qCalib: 'Phone compasses are disturbed by metal and magnets: move the phone in a figure 8 to calibrate it, and check against a known mark (a mosque’s mihrab).', qNoSensor: 'This device has no compass; use the angle shown or open the page on your phone:', qNoAbs: 'The phone sent no absolute compass heading, so the dial is not turned (it would show a wrong direction). Use the angle above with the phone’s compass app or a known mark.',
    qQr: 'Scan to open the qibla on your phone', qHow: 'Computation: great-circle direction from your position to the Kaaba (21.4225, 39.8262), computed in your browser.',
    qMag: (m, d, east) => `On a magnetic compass: ${m}° (magnetic declination here ${d}° ${east ? 'E' : 'W'})`, qMagHow: 'A compass points to magnetic north; the dial is corrected automatically by the magnetic declination of your place, from the World Magnetic Model WMM2025 (NOAA and the British Geological Survey).',
    qBlack: 'You are near the magnetic pole: the horizontal field is too weak for any compass here, so the dial is not turned. Use the angle from true north with the sun or a known mark.', qCaution: 'Caution: the horizontal magnetic field is weak at your place, a compass may stray; check against a known mark.',
    qNoModel: 'Outside the years of the magnetic model (2025–2030): the magnetic declination is not corrected.', qHere: 'You are in al-Masjid al-Haram or very close to the Kaaba: face the Kaaba by sight.',
    mRadius: 'Radius', mSearch: 'Find mosques', mNone: 'No mosque is mapped in this area on OpenStreetMap; widen the radius.', mFail: 'OpenStreetMap cannot be reached now.',
    mOnMap: 'On the map', mRoute: 'Route', mAllMap: 'All mosques on the map', mMapTitle: 'Map of the nearby mosques (Google Maps)', mMapNote: 'The map is Google Maps inside the page: the chosen place’s coordinates are sent to it to show the area. The list comes from OpenStreetMap through Mishkat’s server (place rounded to about 100 m, never stored).', mCount: (n) => `${n} mosques in this radius`,
    mLoading: 'Searching…', mMaps: 'Google Maps', mOsm: 'Map', mUnnamed: 'Mosque (no name on the map)', mSrc: 'Data: © OpenStreetMap contributors (ODbL) via Overpass; it may be incomplete.', km: (k) => `${k} km`,
  },
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('mishkat.' + k) || 'null'); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mishkat.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

// ctx: { lang(), qrcode, fetch }
export function createPractical(ctx) {
  const L = () => PS[ctx.lang()] || PS.ar;
  const ar = () => ctx.lang() === 'ar';
  const indic = () => ar() && store.get('digits', 'arab') === 'arab';
  const num = (n) => indic() ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n);
  const doFetch = ctx.fetch || ((...a) => fetch(...a));
  let timer = 0, gen = 0;   // gen: bumped by stop(); a render that started before is abandoned
  // the chosen place, shared by prayer, qibla and mosques: kept in this browser (localStorage), and its CITY and
  // COUNTRY names also in a first-party cookie (1 year, SameSite=Lax) so the choice survives a cleared storage —
  // never the coordinates, never read by Mishkat's server
  const COOKIE = 'mishkat_place';
  const writeCookie = (p) => { try { document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify({ cc: p.cc || '', en: p.en || '', ar: p.ar || '' }))}; max-age=31536000; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch (e) { /* blocked */ } };
  const readCookie = () => { try { const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`)); return m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch (e) { return null; } };
  const place = () => store.get('place', null);
  const setPlace = (p) => { store.set('place', p); if (p.id !== 'here') writeCookie(p); };
  // storage cleared but the cookie is there: find the city again in the list of places
  async function restorePlace() {
    if (place()) return place();
    const c = readCookie();
    if (!c || !c.cc || !c.en) return null;
    const P = await places();
    const hit = P && (P.countries[c.cc] || []).find(x => x[0] === c.en);
    if (!hit) return null;
    const pl = { id: `gn:${c.cc}:${hit[0]}`, en: hit[0], ar: hit[1] || hit[0], lat: hit[2], lon: hit[3], cc: c.cc, tz: hit[4] };
    store.set('place', pl);
    return pl;
  }
  const placeName = (p) => p ? (p.id === 'here' ? L().posHere : (ar() ? p.ar || p.en : p.en || p.ar)) : '';

  // the place picker shared by the three tools; done(place) is called when a place is chosen
  // countries and their main cities (GeoNames, data/places.json); country names from the browser (Intl)
  let placesP = null;
  const places = () => (placesP = placesP || doFetch('data/places.json').then(r => r.ok ? r.json() : null).catch(() => null));
  const countryName = (cc) => { try { return new Intl.DisplayNames([ar() ? 'ar' : 'en'], { type: 'region' }).of(cc) || cc; } catch (e) { return cc; } };
  function picker(el, done) {
    const t = L(), cur = place();
    const tz0 = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    let guess = (cur && cur.cc) || countryFromTz(tz0) || '';
    el.innerHTML = `<div class="pr-place"><p class="p-small">${esc(t.placeNone)}</p>
      <div class="p-row"><button type="button" class="mini gold" data-pos>${esc(t.usePos)}</button></div>
      <div class="p-row pr-sel"><label>${esc(t.country)} <select data-cc aria-label="${esc(t.country)}"><option>…</option></select></label>
      <label>${esc(t.city)} <select data-city aria-label="${esc(t.city)}"><option value="">…</option></select></label></div>
      <form class="p-row" data-find><input type="search" data-q placeholder="${esc(t.cityPh)}" maxlength="80" aria-label="${esc(t.cityPh)}"><button type="submit" class="mini">${esc(t.find)}</button></form>
      <ul class="pr-found"></ul><p class="note">${esc(t.posNote)}</p><p class="p-small">${esc(t.placesSrc)}</p></div>`;
    const ccSel = el.querySelector('[data-cc]'), citySel = el.querySelector('[data-city]');
    places().then(P => {
      if (!P) { ccSel.innerHTML = `<option value="">—</option>`; return; }
      guess = guess || countryOfTz(P, tz0) || 'SA';
      const ccs = Object.keys(P.countries).map(cc => [cc, countryName(cc)]).sort((a, b) => a[1].localeCompare(b[1], ar() ? 'ar' : 'en'));
      ccSel.innerHTML = ccs.map(([cc, n]) => `<option value="${cc}" ${cc === guess ? 'selected' : ''}>${esc(n)}</option>`).join('');
      const fill = () => {
        const list = P.countries[ccSel.value] || [];
        citySel.innerHTML = `<option value="">${esc(t.choose)}</option>` + list.map((c, k) => [c, k]).sort((x, y) => (y[1] === 0) - (x[1] === 0) || (ar() && x[0][1] ? x[0][1] : x[0][0]).localeCompare(ar() && y[0][1] ? y[0][1] : y[0][0], ar() ? 'ar' : 'en')).map(([c, k]) => `<option value="${k}" ${cur && cur.cc === ccSel.value && (cur.en === c[0]) ? 'selected' : ''}>${esc(ar() && c[1] ? c[1] : c[0])}</option>`).join('');
      };
      fill();
      ccSel.onchange = fill;
      citySel.onchange = () => {
        const c = (P.countries[ccSel.value] || [])[+citySel.value];
        if (!c || citySel.value === '') return;
        const pl = { id: `gn:${ccSel.value}:${c[0]}`, en: c[0], ar: c[1] || c[0], lat: c[2], lon: c[3], cc: ccSel.value, tz: c[4] };
        setPlace(pl); done(pl);
      };
    });
    el.querySelector('[data-pos]').onclick = () => {
      if (!navigator.geolocation) { el.querySelector('.pr-found').innerHTML = `<li class="note">${esc(t.posFail)}</li>`; return; }
      navigator.geolocation.getCurrentPosition((pos) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const lat = +pos.coords.latitude.toFixed(4), lon = +pos.coords.longitude.toFixed(4);
        places().then(P => {
          const near = nearestCountry(P, lat, lon);
          const pl = { id: 'here', lat, lon, cc: (near && near.km < 300 ? near.cc : '') || countryOfTz(P, tz) || '' };
          setPlace(pl); done(pl);
        });
      }, () => { el.querySelector('.pr-found').innerHTML = `<li class="note">${esc(t.posFail)}</li>`; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    };
    el.querySelector('[data-find]').onsubmit = async (ev) => {
      ev.preventDefault();
      const q = el.querySelector('[data-q]').value.trim(), ul = el.querySelector('.pr-found');
      if (q.length < 2) return;
      ul.innerHTML = `<li class="note">…</li>`;
      let list = [];
      try {
        const cc = ccSel.value ? `&countrycodes=${ccSel.value.toLowerCase()}` : '';
        const r = await doFetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=${ar() ? 'ar' : 'en'}${cc}&q=${encodeURIComponent(q)}`);
        list = r.ok ? await r.json() : [];
      } catch (e) { list = []; }
      if (!list.length) { ul.innerHTML = `<li class="note">${esc(t.cityNone)}</li>`; return; }
      ul.innerHTML = list.map((x, k) => `<li><button type="button" class="mini" data-k="${k}">${esc(x.display_name)}</button></li>`).join('');
      ul.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const x = list[+b.dataset.k], a = x.address || {};
        const pl = { id: 'osm:' + x.osm_id, ar: a.city || a.town || a.village || x.name, en: a.city || a.town || a.village || x.name, lat: +(+x.lat).toFixed(4), lon: +(+x.lon).toFixed(4), cc: String(a.country_code || '').toUpperCase() };
        setPlace(pl); done(pl);
      });
    };
  }
  const placeLine = (p, again) => `<p class="p-row pr-at"><b>${esc(L().place)}:</b> ${esc(placeName(p))} <small dir="ltr">(${p.lat.toFixed(3)}, ${p.lon.toFixed(3)})</small> <button type="button" class="mini" data-change>${esc(L().choose)}</button></p>`;

  // ------------------------------------------------------------------ T064 prayer times
  async function loadMonth(p, method, school, date = new Date(), ym = null) {
    const { y, m } = ym || monthIn(p.tz, date);
    const key = `${p.lat.toFixed(3)},${p.lon.toFixed(3)},${method},${school},${y}-${m}`;
    // two months kept (this one and, at the end of a month, the next): the rollover no longer evicts this month
    const cached = monthsCached().find(c => c.key === key);
    if (cached) return cached.days;
    const r = await doFetch(`https://api.aladhan.com/v1/calendar/${y}/${m}?latitude=${p.lat}&longitude=${p.lon}&method=${method}&school=${school}&latitudeAdjustmentMethod=3&iso8601=true`);
    if (!r.ok) throw new Error('aladhan ' + r.status);
    const days = parseCalendar(await r.json());
    store.set('prayerCache', { months: [{ key, days }, ...monthsCached().filter(c => c.key !== key)].slice(0, 2) });
    return days;
  }
  function monthsCached() {
    const c = store.get('prayerCache', null);
    if (!c) return [];
    if (Array.isArray(c.months)) return c.months.filter(x => x && Array.isArray(x.days));
    return c.key && Array.isArray(c.days) ? [{ key: c.key, days: c.days }] : [];   // format before 4 Oct
  }
  // prayer times already past when the page opened are never announced
  let lastTone = Date.now();
  let adhanAudio = null;
  function adhan(toggle = false) {
    if (adhanAudio && !adhanAudio.paused) { adhanAudio.pause(); if (toggle) return; }
    adhanAudio = new Audio('audio/adhan.mp3');
    adhanAudio.play().catch(() => tone());
  }
  function tone() {
    try {
      const A = new (window.AudioContext || window.webkitAudioContext)(), o = A.createOscillator(), g = A.createGain();
      o.type = 'sine'; o.frequency.value = 528; g.gain.setValueAtTime(0.0001, A.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, A.currentTime + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + 2.6);
      o.connect(g).connect(A.destination); o.start(); o.stop(A.currentTime + 2.7);
    } catch (e) { /* no audio */ }
  }
  async function prayer(body, args = {}) {
    clearInterval(timer);
    const my = ++gen;
    await restorePlace();
    const t = L(), p = place();
    if (!p) { picker(body, () => prayer(body, args)); return; }
    const cc = p.cc || '';
    const pr = store.get('prayerPrefs', {});
    const method = pr.method || methodFor(cc), school = pr.school != null ? pr.school : (HANAFI_DEFAULT.has(cc) ? 1 : 0);
    const mName = (id) => (METHODS[id] || {})[ar() ? 'ar' : 'en'] || String(id);
    body.innerHTML = placeLine(p) + `<p class="note">${esc(t.loading)}</p>`;
    body.querySelector('[data-change]').onclick = () => picker(body, () => prayer(body));
    let days;
    try {
      days = await loadMonth(p, method, school);
      // (6 Oct) the place's own date: a city chosen in another time zone may already be in the next month (or still in
      // the previous one) — its month is loaded too, so «today» is always the place's today
      const tzp = days[0] && days[0].tz;
      const here = monthIn(tzp), key = `${here.y}-${String(here.m).padStart(2, '0')}`;
      if (tzp && !days.some(d => d.date.startsWith(key))) days = days.concat(await loadMonth(p, method, school, new Date(), here));
      days.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      if (!nextPrayer(days)) { const last = days[days.length - 1].date.split('-').map(Number); days = days.concat(await loadMonth(p, method, school, new Date(), last[1] === 12 ? { y: last[0] + 1, m: 1 } : { y: last[0], m: last[1] + 1 })); }
    } catch (e) { body.innerHTML = placeLine(p) + `<p class="note">${esc(t.fail)}</p>`; body.querySelector('[data-change]').onclick = () => picker(body, () => prayer(body)); return; }
    if (my !== gen) return;
    const tz = days[0].tz || undefined;
    const fmt = (ms) => new Date(ms).toLocaleTimeString(ar() ? (indic() ? 'ar-u-nu-arab' : 'ar-u-nu-latn') : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    const today = days.find(d => d.date === todayKey) || days[0];
    const draw = () => {
      const nx = nextPrayer(days);
      const now = Date.now();
      const box = body.querySelector('.pr-next');
      if (box && nx) box.innerHTML = `<span>${esc(t.next(t.names[nx.next.name]))} — ${esc(fmt(nx.next.at))}</span><b class="pr-count" dir="ltr">${esc(num(hms(nx.left)))}</b><small>${esc(t.left)}</small>`;
      // «كم بقي على صلاة العصر»: the asked prayer's own countdown (today's, or tomorrow's once it has passed)
      const ask = body.querySelector('.pr-ask');
      if (ask && args.prayer) {
        const at = days.map(d => d.times[args.prayer]).find(x => x > now);
        ask.innerHTML = at ? `${esc(t.until(t.names[args.prayer]))} <b dir="ltr">${esc(num(hms(at - now)))}</b> (${esc(fmt(at))})` : '';
      }
    };
    body.innerHTML = placeLine(p) + `${args.prayer ? '<p class="pr-ask"></p>' : ''}<div class="pr-next" aria-live="off"></div>
      <table class="pr-table"><caption>${esc(t.today)} — ${esc(new Date(today.times.Fajr).toLocaleDateString(ar() ? 'ar-u-nu-arab' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }))}</caption>
      ${['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(k => `<tr class="${k === 'Sunrise' ? 'pr-sun' : ''}" data-k="${k}"><th>${esc(t.names[k])}</th><td>${esc(fmt(today.times[k]))}</td></tr>`).join('')}</table>
      <p class="pr-by">${esc(t.by(mName(method), method))}</p>${Math.abs(p.lat) >= 48 ? `<p class="p-small">${esc(t.highLat)}</p>` : ''}
      <div class="p-row"><label>${esc(t.method)} <select data-method>${Object.keys(METHODS).map(id => `<option value="${id}" ${+id === +method ? 'selected' : ''}>${esc(mName(id))}</option>`).join('')}</select></label></div>
      <p class="p-small">${esc(t.methodAuto(mName(methodFor(cc))))}</p>
      <div class="p-row"><label>${esc(t.school)} <select data-school><option value="0" ${!school ? 'selected' : ''}>${esc(t.schoolStd)}</option><option value="1" ${school ? 'selected' : ''}>${esc(t.schoolHanafi)}</option></select></label></div>
      <div class="p-row"><label>${esc(t.sound)} <select data-sound>${[['none', t.soundNone], ['tone', t.soundTone], ['adhan', t.soundAdhan]].map(([v, l]) => `<option value="${v}" ${store.get('prayerSound', store.get('prayerTone', false) ? 'tone' : 'none') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <button type="button" class="mini" data-listen-adhan>▶ ${esc(t.adhanTry)}</button></div>
      <p class="p-small">${esc(t.adhanNote)} <a href="https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3" target="_blank" rel="noopener">Wikimedia Commons</a> · CC BY-SA 4.0</p>
      ${ar() ? `<div class="p-row"><span>${esc(t.digits)}</span> <span class="seg" role="group"><button type="button" data-dg="arab" aria-pressed="${indic()}">١٢٣</button><button type="button" data-dg="latn" aria-pressed="${!indic()}">123</button></span></div>` : ''}
      <p class="p-small">${esc(t.cached)} · <a href="https://aladhan.com/calculation-methods" target="_blank" rel="noopener">aladhan.com</a></p>`;
    const nx0 = nextPrayer(days);
    // T051: the five prayers as beams of light on a 24-hour ring around the galaxy (times of the place)
    if (ctx.scene) {
      const frac = (ms) => { const [h, m] = new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).split(':').map(Number); return ((h % 24) * 60 + m) / 1440; };
      ctx.scene('prayer', { times: PRAYERS.map(k => ({ name: k, frac: frac(today.times[k]), next: !!(nx0 && nx0.next.name === k && nx0.next.date === today.date) })), now: frac(Date.now()) });
    }
    if (nx0) { const row = body.querySelector(`tr[data-k="${nx0.next.name}"]`); if (row && nx0.next.date === today.date) row.classList.add('on'); }
    body.querySelector('[data-change]').onclick = () => picker(body, () => prayer(body));
    body.querySelector('[data-method]').onchange = (ev) => { store.set('prayerPrefs', { ...pr, method: +ev.target.value }); prayer(body); };
    body.querySelector('[data-school]').onchange = (ev) => { store.set('prayerPrefs', { ...pr, school: +ev.target.value }); prayer(body); };
    body.querySelector('[data-sound]').onchange = (ev) => store.set('prayerSound', ev.target.value);
    body.querySelector('[data-listen-adhan]').onclick = () => adhan(true);
    body.querySelectorAll('[data-dg]').forEach(b => b.onclick = () => { store.set('digits', b.dataset.dg); prayer(body, args); });
    draw();
    timer = setInterval(() => { if (!body.isConnected || !body.querySelector('.pr-next')) { clearInterval(timer); return; } draw(); }, 1000);
  }

  // ------------------------------------------------------------------ T065 qibla
  let orient = null;
  async function qibla(body) {
    clearInterval(timer);
    await restorePlace();
    const t = L(), p = place();
    if (orient) { window.removeEventListener('deviceorientationabsolute', orient); window.removeEventListener('deviceorientation', orient); orient = null; }
    if (!p) { picker(body, () => qibla(body)); return; }
    const b = qiblaBearing(p.lat, p.lon), km = Math.round(distanceKm(p, KAABA));
    const mag = qiblaMagnetic(p.lat, p.lon), decl = mag ? mag.decl : 0;
    if (ctx.scene) ctx.scene('qibla', { bearing: b });
    const touch = matchMedia('(pointer: coarse)').matches;
    body.innerHTML = placeLine(p) + `<div class="qb-wrap"><svg class="qb-dial" viewBox="0 0 200 200" role="img" aria-label="${esc(t.qDeg(Math.round(b)))}">
        <g class="qb-rose"><circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,214,107,.35)" stroke-width="1.5"/>
        ${Array.from({ length: 36 }, (_, k) => `<line x1="100" y1="${k % 9 ? 12 : 6}" x2="100" y2="18" stroke="rgba(255,255,255,${k % 9 ? .25 : .7})" transform="rotate(${k * 10} 100 100)"/>`).join('')}
        <text x="100" y="32" text-anchor="middle" class="qb-n">N</text>
        <g transform="rotate(${b.toFixed(1)} 100 100)"><path d="M100 30 L108 92 L100 86 L92 92 Z" fill="#ffd66b"/><rect x="93" y="22" width="14" height="14" rx="1.5" fill="#111" stroke="#ffd66b" stroke-width="1.2"/><line x1="93" y1="27" x2="107" y2="27" stroke="#ffd66b" stroke-width="1.2"/></g></g>
        <circle cx="100" cy="100" r="4" fill="#ffd66b"/><path d="M100 2 L104 12 L96 12 Z" fill="#fff" class="qb-top"/></svg>
      <p class="qb-deg"><b>${esc(t.qDeg(num(b.toFixed(1))))}</b></p>${mag ? `<p class="qb-mag">${esc(t.qMag(num(mag.magnetic.toFixed(1)), num(Math.abs(decl).toFixed(1)), decl >= 0))}</p>` : ''}<p>${esc(t.qDist(num(km)))}</p></div>
      ${km < 2 ? `<p class="note">${esc(t.qHere)}</p>` : ''}${mag && mag.zone === 'blackout' ? `<p class="note">${esc(t.qBlack)}</p>` : mag && mag.zone === 'caution' ? `<p class="note">${esc(t.qCaution)}</p>` : ''}${mag ? '' : `<p class="note">${esc(t.qNoModel)}</p>`}
      ${touch ? `<p><button type="button" class="mini gold" data-compass>${esc(t.qCompass)}</button></p><p class="p-small">${esc(t.qAlign)}</p>` : ''}
      <p class="note">${esc(t.qCalib)}</p>
      ${touch ? '' : `<p class="p-small">${esc(t.qNoSensor)}</p><div class="qb-qr" aria-label="${esc(t.qQr)}"></div><p class="p-small">${esc(t.qQr)}</p>`}
      <p class="p-small">${esc(t.qHow)}</p>${mag ? `<p class="p-small">${esc(t.qMagHow)}</p>` : ''}`;
    body.querySelector('[data-change]').onclick = () => picker(body, () => qibla(body));
    const qr = body.querySelector('.qb-qr');
    if (qr && ctx.qrcode) {
      try {
        const url = `${location.origin}${location.pathname}?tool=qibla`;
        const q = ctx.qrcode(0, 'M'); q.addData(url); q.make();
        const n = q.getModuleCount(), cell = 4, size = (n + 8) * cell;
        let rects = '';
        for (let r0 = 0; r0 < n; r0++) for (let c0 = 0; c0 < n; c0++) if (q.isDark(r0, c0)) rects += `M${(c0 + 4) * cell} ${(r0 + 4) * cell}h${cell}v${cell}h-${cell}z`;
        qr.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="168" height="168"><rect width="${size}" height="${size}" fill="#fff"/><path d="${rects}" fill="#000"/></svg>`;
      } catch (e) { qr.remove(); }
    }
    const cb = body.querySelector('[data-compass]');
    if (cb && mag && mag.zone === 'blackout') cb.disabled = true;
    if (cb) cb.onclick = async () => {
      try { if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') { const s = await DeviceOrientationEvent.requestPermission(); if (s !== 'granted') throw new Error('denied'); } } catch (e) { cb.insertAdjacentHTML('afterend', `<p class="note">${esc(t.qNoSensor)}</p>`); return; }
      const rose = body.querySelector('.qb-rose');
      // (5 Oct) the heading is corrected for a phone held sideways (screen angle), smoothed on the circle (no jitter),
      // and if no ABSOLUTE heading arrives within 3 s the dial is not turned at all: a relative sensor would point anywhere
      let sx = null, sy = null, got = false;
      orient = (ev) => {
        let h = headingOf(ev); if (h == null || !rose.isConnected) return;
        const ang = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (typeof window.orientation === 'number' ? window.orientation : 0);
        // magnetic heading of the phone → true heading (declination of the place, WMM2025)
        h = (h + ang + decl + 720) % 360;
        const cx = Math.cos(h * R), cy = Math.sin(h * R);
        sx = sx == null ? cx : sx * 0.8 + cx * 0.2; sy = sy == null ? cy : sy * 0.8 + cy * 0.2;
        const hs = (Math.atan2(sy, sx) / R + 360) % 360;
        got = true;
        rose.setAttribute('transform', `rotate(${(-hs).toFixed(1)} 100 100)`);
        const off = Math.abs(((b - hs + 540) % 360) - 180); body.querySelector('.qb-dial').classList.toggle('aligned', off < 4);
      };
      setTimeout(() => { if (!got && rose.isConnected) cb.insertAdjacentHTML('afterend', `<p class="note">${esc(t.qNoAbs)}</p>`); }, 3000);
      window.addEventListener('deviceorientationabsolute', orient);
      window.addEventListener('deviceorientation', orient);
      cb.disabled = true;
    };
  }

  // ------------------------------------------------------------------ T066 nearby mosques
  // (5 Oct) the map is IN the page (Google Maps embed, no key) and the list comes from Mishkat's server (/api/mosques:
  // Overpass with an identified User-Agent and several mirrors — the public server refused browsers with 406/504);
  // the search starts at once, a mosque of the list is shown on the map, «route» opens Google Maps' directions
  const ZOOM = { 500: 16, 1000: 15, 2000: 14, 5000: 13, 10000: 12 };
  const mapSrc = (q, lat, lon, z) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&ll=${lat.toFixed(5)},${lon.toFixed(5)}&z=${z}&output=embed&hl=${ar() ? 'ar' : 'en'}`;
  async function findMosques(p, r) {
    try {
      const res = await doFetch('api/mosques', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lat: p.lat, lon: p.lon, r }) });
      const j = res.ok ? await res.json() : null;
      if (j && j.ok) return parseMosques(j, p, ctx.lang());
    } catch (e) { /* the browser tries a mirror itself below */ }
    try {
      const res = await doFetch('https://z.overpass-api.de/api/interpreter?data=' + encodeURIComponent(overpassQuery(p.lat, p.lon, r)));
      if (res.ok) return parseMosques(await res.json(), p, ctx.lang());
    } catch (e) { /* unavailable */ }
    return null;
  }
  async function mosques(body) {
    clearInterval(timer);
    await restorePlace();
    const t = L(), p = place();
    if (!p) { picker(body, () => mosques(body)); return; }
    const radius = store.get('mosqueRadius', 2000), my = gen;
    const allQ = ar() ? 'مسجد' : 'mosque';
    body.innerHTML = placeLine(p) + `<div class="mq-map"><iframe title="${esc(t.mMapTitle)}" src="${esc(mapSrc(allQ, p.lat, p.lon, ZOOM[radius] || 14))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
      <div class="p-row mq-bar"><label>${esc(t.mRadius)} <select data-r>${[500, 1000, 2000, 5000, 10000].map(r => `<option value="${r}" ${r === radius ? 'selected' : ''}>${esc(t.km(num(r / 1000)))}</option>`).join('')}</select></label>
      <button type="button" class="mini" data-all>${esc(t.mAllMap)}</button>
      <a class="mini" href="https://www.google.com/maps/search/${encodeURIComponent(allQ)}/@${p.lat},${p.lon},15z" target="_blank" rel="noopener">↗ ${esc(t.mMaps)}</a></div>
      <p class="mq-count note" aria-live="polite"></p><ol class="mq-list"></ol><p class="p-small">${esc(t.mMapNote)} ${esc(t.mSrc)}</p>`;
    const frame = body.querySelector('.mq-map iframe'), show = (src) => { if (frame.src !== src) frame.src = src; };
    body.querySelector('[data-change]').onclick = () => picker(body, () => mosques(body));
    body.querySelector('[data-all]').onclick = () => { body.querySelectorAll('.mq-list li.on').forEach(x => x.classList.remove('on')); show(mapSrc(allQ, p.lat, p.lon, ZOOM[+body.querySelector('[data-r]').value] || 14)); };
    const search = async () => {
      const ol = body.querySelector('.mq-list'), cnt = body.querySelector('.mq-count'), r = +body.querySelector('[data-r]').value;
      cnt.textContent = t.mLoading; ol.innerHTML = '';
      const list = await findMosques(p, r);
      if (my !== gen || !ol.isConnected) return;
      if (!list) { cnt.textContent = t.mFail; return; }
      if (!list.length) { cnt.textContent = t.mNone; return; }
      cnt.textContent = t.mCount(num(list.length));
      ol.innerHTML = list.slice(0, 40).map((m, k) => `<li data-k="${k}"><button type="button" class="mq-name" data-map="${k}"><b>${esc(m.name || t.mUnnamed)}</b> <small>${esc(t.km(num(m.km < 1 ? m.km.toFixed(2) : m.km.toFixed(1))))}</small></button>
        <span class="mq-a"><button type="button" class="mini" data-map="${k}">📍 ${esc(t.mOnMap)}</button><a class="mini" href="https://www.google.com/maps/dir/?api=1&destination=${m.lat.toFixed(6)},${m.lon.toFixed(6)}" target="_blank" rel="noopener">🧭 ${esc(t.mRoute)}</a> <a class="mini" href="${esc(m.osm)}" target="_blank" rel="noopener">${esc(t.mOsm)}</a></span></li>`).join('');
      ol.querySelectorAll('[data-map]').forEach(b => b.onclick = () => {
        const m = list[+b.dataset.map];
        ol.querySelectorAll('li.on').forEach(x => x.classList.remove('on')); b.closest('li').classList.add('on');
        show(mapSrc(`${m.lat.toFixed(6)},${m.lon.toFixed(6)}`, m.lat, m.lon, 17));
        frame.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    };
    body.querySelector('[data-r]').onchange = (ev) => { store.set('mosqueRadius', +ev.target.value); body.querySelector('[data-all]').click(); search(); };
    search();
  }

  // the adhan (or the tone) at the time of each prayer while the page is open, panel open or not: it reads the
  // month already saved by the prayer panel; nothing is fetched here
  setInterval(() => {
    const mode = store.get('prayerSound', store.get('prayerTone', false) ? 'tone' : 'none');
    if (mode === 'none') return;
    const now = Date.now();
    // within 2 minutes after the time: a tab in the background has its timers slowed to about once a minute
    // (with 15 s the adhan was usually missed there)
    for (const c of monthsCached()) for (const d of c.days) for (const k of PRAYERS) {
      const at = d.times[k];
      if (at <= now && now - at < 120000 && at > lastTone) { lastTone = at; mode === 'adhan' ? adhan() : tone(); return; }
    }
  }, 5000);

  // T098: the same place picker in the first-visit step (before the presentation film), and the chosen place for others
  const pickPlace = async (el, done) => { await restorePlace(); picker(el, done); };
  const current = () => place();
  return { prayer, qibla, mosques, pickPlace, place: current, placeName: () => placeName(place()), stop: () => { gen++; clearInterval(timer); if (ctx.scene) ctx.scene(null); if (orient) { window.removeEventListener('deviceorientationabsolute', orient); window.removeEventListener('deviceorientation', orient); orient = null; } } };
}
