// T097 — install Mishkat as an app on a phone or a computer, from the site open in the browser.
//   Chrome, Edge, Opera, Samsung Internet (Android, Windows, macOS, Linux): the browser's own install prompt,
//   offered by our button once the browser says the app is installable (beforeinstallprompt);
//   Safari on iPhone/iPad: Share ⬆ → «Add to Home Screen» (explained, Safari has no prompt);
//   Safari on macOS: File → «Add to Dock»; Firefox desktop: no install (explained).
// The service worker (sw.js) keeps the app usable offline for what was already opened.
let deferred = null;
const listeners = new Set();
export const PW = {
  ar: { install: 'ثبّت التطبيق', title: 'تثبيت «مشكاة» كتطبيق', installed: 'مشكاة مثبّت على هذا الجهاز — افتحه من الشاشة الرئيسية أو قائمة التطبيقات.',
    ready: 'اضغط «ثبّت» لإضافة مشكاة إلى شاشتك الرئيسية أو قائمة تطبيقاتك. يعمل التطبيق في نافذته الخاصة، ويحفظ ما فتحته للاستعمال دون اتصال.',
    ios: 'في Safari: اضغط زر المشاركة ⬆ أسفل الشاشة، ثم «إضافة إلى الشاشة الرئيسية»، ثم «إضافة».', mac: 'في Safari على الماك: قائمة «ملف» ← «إضافة إلى Dock».',
    firefox: 'متصفح Firefox على الحاسوب لا يثبّت التطبيقات؛ افتح الموقع في Chrome أو Edge أو Opera ثم اضغط «ثبّت». على Android يمكنك من قائمة Firefox ⋮ اختيار «تثبيت».',
    other: 'من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». إن لم يظهر الخيار، افتح الموقع في Chrome أو Edge.', go: 'ثبّت', close: 'إغلاق', done: 'تم التثبيت — بارك الله فيك.' },
  en: { install: 'Install the app', title: 'Install Mishkat as an app', installed: 'Mishkat is installed on this device — open it from your home screen or app list.',
    ready: 'Press “Install” to add Mishkat to your home screen or app list. It runs in its own window and keeps what you opened for offline use.',
    ios: 'In Safari: tap the Share button ⬆, then “Add to Home Screen”, then “Add”.', mac: 'In Safari on a Mac: File menu → “Add to Dock”.',
    firefox: 'Firefox on a computer does not install apps; open the site in Chrome, Edge or Opera and press “Install”. On Android, Firefox’s ⋮ menu has “Install”.',
    other: 'In the browser menu ⋮ choose “Install app” or “Add to Home screen”. If it is missing, open the site in Chrome or Edge.', go: 'Install', close: 'Close', done: 'Installed — may Allah bless you.' },
};
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone === true;
export const canPrompt = () => !!deferred;
export function onInstallChange(f) { listeners.add(f); return () => listeners.delete(f); }
const notify = () => listeners.forEach(f => { try { f(); } catch (e) { /* ignore */ } });

export function setupPWA() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => { /* private preview or blocked */ }));
  }
  window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); deferred = ev; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
}

function platform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Firefox\//.test(ua) && !/Android/.test(ua)) return 'firefox';
  if (/Safari\//.test(ua) && /Macintosh/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua)) return 'mac';
  return 'other';
}

// the install dialog (or the browser's prompt directly when it is available)
export async function openInstall(lang = 'ar') {
  const t = PW[lang] || PW.ar;
  if (deferred) {
    const ev = deferred; deferred = null;
    ev.prompt();
    const r = await ev.userChoice.catch(() => null);
    notify();
    return r && r.outcome;
  }
  const d = document.createElement('dialog');
  d.className = 'pwa-dlg'; d.dir = lang === 'ar' ? 'rtl' : 'ltr';
  const msg = isStandalone() ? t.installed : t[platform()];
  d.innerHTML = `<h3><img src="img/icon-192.png" alt="" width="40" height="40"> ${t.title}</h3><p>${msg}</p><form method="dialog"><button class="btn gold">${t.close}</button></form>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.showModal();
  return 'shown';
}
