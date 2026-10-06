// T123 — reminders on the phone and the computer (author's request): the prayer times, the remarkable days of the
// Hijri calendar and the khatma's reading moments, as system notifications, with a sound and a vibration.
//
// Two ways, both without any server or account:
//   · notifications of the browser (Notification API, shown by the service worker so that a phone shows them too)
//     while Mishkat is open — in a tab, even in the background, or installed as an app. A web page cannot wake a
//     closed browser at a given time (no web standard allows it without a push server), so:
//   · a calendar file (.ics) of the same reminders, which the phone's or the computer's calendar rings even when
//     Mishkat is closed (prayers of the coming days, the remarkable days of the year, the khatma moments).
// Nothing leaves the browser: the times are those already computed by the prayer panel (Aladhan, kept locally).
//
// Pure functions first (the tests import them), then the browser part.
import { REMARKABLE, nextEvent, nextWhiteDays } from './hijri.js';

export const PRAYER_NAMES = {
  ar: { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
  en: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
};
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const NOTIFY_DEFAULTS = { on: false, prayers: true, before: 0, days: true, white: true, monthu: false, khatma: true, sound: 'system', vibrate: true };

export const NS = {
  ar: {
    title: 'التنبيهات على الهاتف والحاسوب', lead: 'تذكير بمواقيت الصلاة، والأيام الفاضلة، ومواعيد وِردك من الختمة، بإشعار من الجهاز مع صوت واهتزاز.',
    enable: 'فعّل التنبيهات', enabled: 'التنبيهات مفعّلة ✓', disable: 'أوقف التنبيهات', denied: 'رفض المتصفح الإشعارات لهذا الموقع: افتح إعدادات الموقع في المتصفح (رمز القفل بجانب العنوان) واسمح بالإشعارات.',
    unsupported: 'هذا المتصفح لا يعرض الإشعارات. استعمل ملف التقويم أدناه.', ios: 'على iPhone وiPad: أضف مشكاة إلى الشاشة الرئيسية (مشاركة ← «إضافة إلى الشاشة الرئيسية») ثم فعّل التنبيهات من التطبيق.',
    prayers: 'مواقيت الصلاة', before: 'التنبيه', atTime: 'عند دخول الوقت', minBefore: (n) => `قبله بـ ${n} دقائق`,
    days: 'الأيام الفاضلة (رمضان، العيدان، عرفة، العشر، عاشوراء…)', white: 'الأيام البيض (13، 14، 15)', monthu: 'صيام الاثنين والخميس (مساء الأحد والأربعاء)', khatma: 'مواعيد وِرد الختمة',
    sound: 'الصوت', sSystem: 'صوت إشعار الجهاز', sTone: 'نغمة هادئة من الصفحة أيضًا', sNone: 'بلا صوت', vibrate: 'اهتزاز (الهاتف)',
    test: 'جرّب تنبيهًا الآن', testT: 'مِشكاة — تنبيه تجريبي', testB: 'هكذا يصلك التذكير.',
    open: 'تعمل الإشعارات ما دام مشكاة مفتوحًا (ولو في الخلفية أو مثبّتًا كتطبيق). ولتنبيهات تصل والموقع مغلق: أضف ملف التقويم إلى تقويم هاتفك أو حاسوبك، فهو الذي يرنّ.',
    ics: 'أضف التنبيهات إلى تقويمي (.ics)', icsHelp: (n) => `ملف واحد فيه مواقيت الصلاة للأيام المحفوظة (${n} يومًا)، والأيام الفاضلة لعام، ومواعيد الختمة لثلاثين يومًا؛ افتحه على الهاتف أو الحاسوب.`,
    noPrayer: 'لم تُحسب مواقيت الصلاة بعد: افتح «مواقيت الصلاة» مرة واختر مدينتك.', openPrayer: 'افتح مواقيت الصلاة', adhanNote: 'صوت الأذان عند دخول الوقت يُختار في لوحة «مواقيت الصلاة».',
    pNow: (p) => `حان الآن وقت صلاة ${p}`, pSoon: (p, n) => `بقي ${n} دقائق على صلاة ${p}`, pBody: (time, place) => `الساعة ${time}${place ? ' — ' + place : ''}`,
    dTomorrow: (e) => `غدًا: ${e}`, dToday: (e) => `اليوم: ${e}`, dBody: 'من التقويم الهجري في مِشكاة (التاريخ يتبع رؤية الهلال في بلدك).',
    whiteT: 'غدًا تبدأ الأيام البيض', monthuT: (d) => `غدًا ${d}: صيام الاثنين والخميس`, mon: 'الاثنين', thu: 'الخميس',
    kT: 'موعد وِردك من الختمة', kB: (t) => `حان موعد قراءتك (${t}). افتح مِشكاة لتقرأ نصيب اليوم.`,
  },
  en: {
    title: 'Reminders on your phone and computer', lead: 'Prayer times, the remarkable days and your khatma reading moments, as a notification of your device with a sound and a vibration.',
    enable: 'Turn reminders on', enabled: 'Reminders are on ✓', disable: 'Turn reminders off', denied: 'The browser blocked notifications for this site: open the site settings (the lock next to the address) and allow notifications.',
    unsupported: 'This browser does not show notifications. Use the calendar file below.', ios: 'On iPhone and iPad: add Mishkat to the Home Screen (Share → «Add to Home Screen»), then turn reminders on from the app.',
    prayers: 'Prayer times', before: 'Remind', atTime: 'at the time', minBefore: (n) => `${n} minutes before`,
    days: 'Remarkable days (Ramadan, the two Eids, ‘Arafah, the ten days, ‘Ashura…)', white: 'The white days (13, 14, 15)', monthu: 'Fasting on Monday and Thursday (Sunday and Wednesday evening)', khatma: 'Khatma reading moments',
    sound: 'Sound', sSystem: 'The device’s notification sound', sTone: 'A calm tone from the page too', sNone: 'Silent', vibrate: 'Vibrate (phone)',
    test: 'Try a reminder now', testT: 'Mishkat — test reminder', testB: 'This is how a reminder reaches you.',
    open: 'Notifications work while Mishkat is open (even in the background, or installed as an app). For reminders while the site is closed, add the calendar file to your phone or computer calendar: the calendar rings.',
    ics: 'Add the reminders to my calendar (.ics)', icsHelp: (n) => `One file with the prayer times of the saved days (${n} days), the remarkable days of a year and the khatma moments for thirty days; open it on your phone or computer.`,
    noPrayer: 'The prayer times are not computed yet: open «Prayer times» once and choose your city.', openPrayer: 'Open prayer times', adhanNote: 'The adhan at the time of prayer is chosen in the «Prayer times» panel.',
    pNow: (p) => `It is time for ${p} prayer`, pSoon: (p, n) => `${n} minutes to ${p} prayer`, pBody: (time, place) => `At ${time}${place ? ' — ' + place : ''}`,
    dTomorrow: (e) => `Tomorrow: ${e}`, dToday: (e) => `Today: ${e}`, dBody: 'From Mishkat’s Hijri calendar (the date follows the moon sighting in your country).',
    whiteT: 'The white days start tomorrow', monthuT: (d) => `Tomorrow is ${d}: fasting on Monday and Thursday`, mon: 'Monday', thu: 'Thursday',
    kT: 'Your khatma reading', kB: (t) => `Time for your reading (${t}). Open Mishkat to read today’s portion.`,
  },
};

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const at = (day, h, m = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// every reminder between `from` and `to` (ms): [{ key, at, kind, title, body, url }]
//   data = { months: [{ days: [{ date, times: { Fajr: ms… } }] }], place: 'name', khatma: { active, moments: [{ id, time }] }, adjust }
export function reminders(cfg, data, from, to, lang = 'ar') {
  const c = { ...NOTIFY_DEFAULTS, ...cfg }, t = NS[lang] || NS.ar, names = PRAYER_NAMES[lang] || PRAYER_NAMES.ar, out = [];
  const push = (key, when, kind, title, body, url) => { if (when > from && when <= to) out.push({ key, at: when, kind, title, body, url }); };
  if (c.prayers) for (const mo of data.months || []) for (const d of mo.days || []) for (const k of PRAYERS) {
    const ms = d.times && d.times[k];
    if (!ms) continue;
    const before = Math.max(0, +c.before || 0);
    push(`p:${d.date}:${k}:${before}`, ms - before * 60000, 'prayer', before ? t.pSoon(names[k], before) : t.pNow(names[k]), t.pBody(hhmm(ms), data.place || ''), '?tool=prayer');
  }
  const start = new Date(from), adj = +data.adjust || 0;
  if (c.days) for (const ev of REMARKABLE) {
    const n = nextEvent(ev.id, addDays(start, -1), adj);
    if (!n) continue;
    const label = lang === 'en' ? ev.en : ev.ar;
    push(`d:${ev.id}:${n.hy}:eve`, at(addDays(n.start, -1), 20), 'day', t.dTomorrow(label), t.dBody, '?tool=hijri');
    push(`d:${ev.id}:${n.hy}:day`, at(n.start, 8), 'day', t.dToday(label), t.dBody, '?tool=hijri');
  }
  if (c.white) {
    const w = nextWhiteDays(addDays(start, -1), adj);
    if (w) push(`w:${w.hy}:${w.hm}`, at(addDays(w.start, -1), 20), 'day', t.whiteT, t.dBody, '?tool=hijri');
  }
  if (c.monthu) for (let k = 0; k <= Math.ceil((to - from) / 86400000) + 1; k++) {
    const day = addDays(start, k), wd = day.getDay();
    if (wd === 0 || wd === 3) push(`m:${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`, at(day, 20), 'day', t.monthuT(wd === 0 ? t.mon : t.thu), t.dBody, '?tool=hijri');
  }
  const kh = data.khatma;
  if (c.khatma && kh && kh.active !== false && Array.isArray(kh.moments)) {
    for (let k = -1; k <= Math.ceil((to - from) / 86400000) + 1; k++) {
      const day = addDays(start, k);
      for (const m of kh.moments) {
        if (!/^\d{1,2}:\d{2}$/.test(m.time || '')) continue;
        const [h, mi] = m.time.split(':').map(Number);
        push(`k:${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}:${m.id}`, at(day, h, mi), 'khatma', t.kT, t.kB(m.time), '?tool=khatma');
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

// ---------------------------------------------------------------- calendar file (rings while the site is closed)
const icsEsc = (s) => String(s).replace(/[\\;,]/g, (ch) => '\\' + ch).replace(/\r?\n/g, '\\n');
const utc = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
const dateOnly = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
function fold(line) {
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return line;
  const out = []; let cur = '';
  for (const ch of line) { if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ''; } cur += ch; }
  out.push(cur);
  return out.join('\r\n ');
}
// alarms: a displayed reminder and a sound (calendars that know ACTION:AUDIO ring with their default sound)
const alarm = (trigger, text) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:${trigger}`, `DESCRIPTION:${icsEsc(text)}`, 'END:VALARM',
  'BEGIN:VALARM', 'ACTION:AUDIO', `TRIGGER:${trigger}`, 'END:VALARM'];
export function remindersIcs(cfg, data, now = Date.now(), lang = 'ar', site = 'https://mishkatquran.org/') {
  const c = { ...NOTIFY_DEFAULTS, ...cfg }, t = NS[lang] || NS.ar, names = PRAYER_NAMES[lang] || PRAYER_NAMES.ar;
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mishkat//Reminders//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsEsc(lang === 'en' ? 'Mishkat' : 'مِشكاة')}`];
  const stamp = utc(now), ev = (uid, head, summary, desc, alarms) => L.push('BEGIN:VEVENT', `UID:${uid}@mishkatquran.org`, `DTSTAMP:${stamp}`, ...head, `SUMMARY:${icsEsc(summary)}`,
    `DESCRIPTION:${icsEsc(desc)}`, `URL:${site}`, ...alarms, 'END:VEVENT');
  let nDays = 0;
  if (c.prayers) for (const mo of data.months || []) for (const d of mo.days || []) {
    if (!d.times || !PRAYERS.some(k => d.times[k] > now)) continue;
    nDays++;
    for (const k of PRAYERS) {
      const ms = d.times[k]; if (!(ms > now)) continue;
      ev(`mishkat-p-${d.date}-${k}`, [`DTSTART:${utc(ms)}`, 'DURATION:PT15M'], t.pNow(names[k]), t.pBody(hhmm(ms), data.place || ''), alarm(`-PT${Math.max(0, +c.before || 0)}M`, t.pNow(names[k])));
    }
  }
  const adj = +data.adjust || 0;
  if (c.days) {
    // the remarkable days of the coming year (each event's next occurrence, then the one after it)
    const seen = new Set();
    for (const e of REMARKABLE) for (let from = new Date(now), i = 0; i < 2; i++) {
      const n = nextEvent(e.id, from, adj); if (!n) break;
      from = addDays(n.end, 1);
      if (n.start - now > 370 * 86400000 || seen.has(e.id + n.hy)) continue;
      seen.add(e.id + n.hy);
      const label = lang === 'en' ? e.en : e.ar;
      ev(`mishkat-d-${e.id}-${n.hy}`, [`DTSTART;VALUE=DATE:${dateOnly(n.start)}`, `DTEND;VALUE=DATE:${dateOnly(addDays(n.start, 1))}`, 'TRANSP:TRANSPARENT'], label, t.dBody,
        [...alarm('-PT4H', t.dTomorrow(label)), ...alarm('PT8H', t.dToday(label))]);
    }
  }
  const kh = data.khatma;
  if (c.khatma && kh && kh.active !== false && Array.isArray(kh.moments)) {
    const today = new Date(now);
    for (const m of kh.moments) {
      if (!/^\d{1,2}:\d{2}$/.test(m.time || '')) continue;
      const [h, mi] = m.time.split(':').map(Number);
      let first = at(today, h, mi); if (first <= now) first = at(addDays(today, 1), h, mi);
      const f = new Date(first);
      ev(`mishkat-k-${m.id}-${dateOnly(f)}`, [`DTSTART:${dateOnly(f)}T${pad(h)}${pad(mi)}00`, 'DURATION:PT20M', 'RRULE:FREQ=DAILY;COUNT=30'], t.kT, t.kB(m.time), alarm('PT0M', t.kT));
    }
  }
  L.push('END:VCALENDAR');
  return { text: L.map(fold).join('\r\n') + '\r\n', prayerDays: nDays };
}

// ---------------------------------------------------------------- the browser part
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('mishkat.' + k) || 'null'); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mishkat.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window;

// ctx: { lang(), prefs (getter), tone(), open(tool) }
export function createNotify(ctx) {
  const cfg = () => ({ ...NOTIFY_DEFAULTS, ...store.get('notify', {}) });
  const setCfg = (p) => store.set('notify', { ...cfg(), ...p });
  const L = () => NS[ctx.lang()] || NS.ar;
  const data = () => {
    const c = store.get('prayerCache', null), place = store.get('place', null), P = ctx.prefs || {};
    const months = !c ? [] : Array.isArray(c.months) ? c.months : (c.days ? [{ days: c.days }] : []);
    return { months, place: place ? (ctx.lang() === 'en' ? place.en : place.ar) || '' : '', khatma: P.khatma || null, adjust: +P.hijriAdjust || 0 };
  };

  async function show(r) {
    const c = cfg(), en = ctx.lang() === 'en';
    const opts = { body: r.body, icon: 'img/icon-192.png', badge: 'img/icon-192.png', tag: r.key, renotify: true, lang: en ? 'en' : 'ar', dir: en ? 'ltr' : 'rtl',
      silent: c.sound === 'none', requireInteraction: r.kind === 'prayer', data: { url: r.url || './' }, ...(c.vibrate ? { vibrate: [300, 120, 300, 120, 300] } : {}) };
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
      if (reg && reg.showNotification) await reg.showNotification(r.title, opts);
      else { const n = new Notification(r.title, opts); n.onclick = () => { focus(); if (r.url) ctx.open && ctx.open(new URLSearchParams(r.url.slice(1)).get('tool')); n.close(); }; }
    } catch (e) { /* blocked */ }
    if (c.sound === 'tone' && ctx.tone) ctx.tone();
    if (c.vibrate && navigator.vibrate) { try { navigator.vibrate([300, 120, 300, 120, 300]); } catch (e) { /* ignore */ } }
  }

  // every 20 s (a background tab is slowed to about once a minute: a reminder is still shown within 3 minutes);
  // a reminder already shown — by this tab or another one — is never shown again
  let last = Date.now();
  function tick() {
    const c = cfg();
    if (!c.on || !notifySupported() || Notification.permission !== 'granted') { last = Date.now(); return; }
    const now = Date.now(), from = Math.max(last, now - 180000);
    last = now;
    const fired = store.get('notifyFired', {});
    for (const k of Object.keys(fired)) if (now - fired[k] > 3 * 86400000) delete fired[k];
    for (const r of reminders(c, data(), from, now, ctx.lang())) {
      if (fired[r.key]) continue;
      fired[r.key] = now;
      show(r);
    }
    store.set('notifyFired', fired);
  }
  setInterval(tick, 20000);
  // a tap on a reminder while Mishkat is open: the service worker asks for the panel (sw.js, notificationclick)
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (ev) => {
    if (ev.data && ev.data.type === 'mishkat-open-tool' && ctx.open) ctx.open(ev.data.tool);
  });

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // the settings block (Settings panel)
  function render(el) {
    const t = L(), c = cfg(), sup = notifySupported(), perm = sup ? Notification.permission : 'unsupported';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('Notification' in window);
    const d = data(), nDays = remindersIcs(c, d, Date.now(), ctx.lang()).prayerDays;
    const ck = (id, on, label) => `<label class="p-row"><input type="checkbox" data-n="${id}" ${on ? 'checked' : ''}> ${esc(label)}</label>`;
    el.innerHTML = `<p class="p-small">${esc(t.lead)}</p>
      ${!sup ? `<p class="p-small warn">${esc(isIOS ? t.ios : t.unsupported)}</p>` : perm === 'denied' ? `<p class="p-small warn">${esc(t.denied)}</p>` : ''}
      ${sup && perm !== 'denied' ? `<div class="k-btns"><button type="button" class="mini ${c.on && perm === 'granted' ? 'on' : 'gold'}" id="nOn">🔔 ${esc(c.on && perm === 'granted' ? t.enabled : t.enable)}</button>
        ${c.on && perm === 'granted' ? `<button type="button" class="mini" id="nOff">${esc(t.disable)}</button><button type="button" class="mini" id="nTest">${esc(t.test)}</button>` : ''}</div>` : ''}
      ${ck('prayers', c.prayers, t.prayers)}
      <label class="p-row">${esc(t.before)} <select data-n="before">${[0, 5, 10, 15, 30].map(n => `<option value="${n}" ${+c.before === n ? 'selected' : ''}>${esc(n ? t.minBefore(n) : t.atTime)}</option>`).join('')}</select></label>
      ${d.months.length ? '' : `<p class="p-small">${esc(t.noPrayer)} <button type="button" class="mini" id="nPr">${esc(t.openPrayer)}</button></p>`}
      ${ck('days', c.days, t.days)}${ck('white', c.white, t.white)}${ck('monthu', c.monthu, t.monthu)}${ck('khatma', c.khatma, t.khatma)}
      <label class="p-row">${esc(t.sound)} <select data-n="sound">${[['system', t.sSystem], ['tone', t.sTone], ['none', t.sNone]].map(([v, l]) => `<option value="${v}" ${c.sound === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      ${ck('vibrate', c.vibrate, t.vibrate)}
      <p class="p-small">${esc(t.adhanNote)}</p>
      <p class="p-small">${esc(t.open)}</p>
      <div class="k-btns"><button type="button" class="mini gold" id="nIcs">📅 ${esc(t.ics)}</button></div>
      <p class="p-small">${esc(t.icsHelp(nDays))}</p>`;
    const $ = (s) => el.querySelector(s);
    el.querySelectorAll('[data-n]').forEach(x => x.onchange = () => {
      const k = x.dataset.n;
      setCfg({ [k]: x.type === 'checkbox' ? x.checked : k === 'before' ? +x.value : x.value });
      if (k === 'before') store.set('notifyFired', {});
    });
    const on = $('#nOn');
    if (on) on.onclick = async () => {
      let p = Notification.permission;
      if (p === 'default') { try { p = await Notification.requestPermission(); } catch (e) { p = 'denied'; } }
      if (p === 'granted') { setCfg({ on: true }); last = Date.now(); }
      render(el);
    };
    if ($('#nOff')) $('#nOff').onclick = () => { setCfg({ on: false }); render(el); };
    if ($('#nTest')) $('#nTest').onclick = () => show({ key: 'test-' + Date.now(), kind: 'test', title: t.testT, body: t.testB, url: './' });
    if ($('#nPr')) $('#nPr').onclick = () => ctx.open && ctx.open('prayer');
    $('#nIcs').onclick = () => download('mishkat-reminders.ics', remindersIcs(cfg(), data(), Date.now(), ctx.lang()).text);
  }

  return { render, tick, show };
}
