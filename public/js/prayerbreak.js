// The time of prayer comes while the Quran is being recited in the reader.
//
// The verse being recited is finished first; then the recitation pauses, a card says that it is the time of prayer
// with a verse that encourages it (2:238, from the Tanzil text), and the adhan is played (when the visitor chose the
// adhan in the prayer panel). The adhan can be skipped. Afterwards the recitation resumes with the basmala recited by
// the same reciter (never in Surah at-Tawbah, which has no basmala), then the next verse.
// The visitor can also stop the recitation to go and pray.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const PRAYER_NAMES = {
  ar: { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
  en: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
};
const S = {
  ar: { title: (p) => `حان وقت صلاة ${p}`, lead: 'توقّفت التلاوة بعد تمام الآية.', skip: 'تخطَّ الأذان', resume: 'استأنف التلاوة الآن', stop: 'أوقف التلاوة لأصلّي',
    after: 'تُستأنف التلاوة بعد الأذان بالبسملة ثم الآية التالية.', afterTawba: 'تُستأنف التلاوة بعد الأذان بالآية التالية.' },
  en: { title: (p) => `It is time for ${p} prayer`, lead: 'The recitation paused at the end of the verse.', skip: 'Skip the adhan', resume: 'Resume the recitation now', stop: 'Stop the recitation to pray',
    after: 'After the adhan the recitation resumes with the basmala, then the next verse.', afterTawba: 'After the adhan the recitation resumes with the next verse.' },
};

// which surah needs no basmala when the recitation resumes in it
export const resumesWithBasmala = (sura) => sura !== 9;

// ctx: { lang(), verse(sura, aya) → text, refLabel(sura, aya), playAdhan(onEnd) → stop(), playBasmala() → Promise,
//        resume(next), stop() }
export function createPrayerBreak(ctx) {
  let card = null, stopAdhan = null;

  function close() {
    if (stopAdhan) { stopAdhan(); stopAdhan = null; }
    if (card) { card.remove(); card = null; }
  }

  // prayer: the key of the prayer (Fajr…), next: the index of the next verse, basmala: whether to recite it before,
  // withAdhan: the visitor's choice in the prayer panel
  function open({ prayer, next, basmala, withAdhan }) {
    close();
    const lg = ctx.lang(), t = S[lg] || S.ar, name = (PRAYER_NAMES[lg] || PRAYER_NAMES.ar)[prayer] || prayer;
    card = document.createElement('div');
    card.className = 'prayer-break';
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-labelledby', 'pbTitle');
    card.dir = lg === 'en' ? 'ltr' : 'rtl';
    card.innerHTML = `<h3 id="pbTitle">🕌 ${esc(t.title(name))}</h3>
      <p class="p-small">${esc(t.lead)}</p>
      <p class="pb-ayah" dir="rtl" lang="ar">﴿${esc(ctx.verse(2, 238))}﴾ <small>(${esc(ctx.refLabel(2, 238))})</small></p>
      <p class="p-small">${esc(basmala ? t.after : t.afterTawba)}</p>
      <div class="pb-btns">
        ${withAdhan ? `<button type="button" class="btn" data-pb="skip">${esc(t.skip)}</button>` : ''}
        <button type="button" class="btn gold" data-pb="resume">${esc(t.resume)}</button>
        <button type="button" class="btn" data-pb="stop">${esc(t.stop)}</button>
      </div>`;
    document.body.appendChild(card);

    let resumed = false;
    const resume = async () => {
      if (resumed) return;
      resumed = true;
      close();
      if (basmala) await ctx.playBasmala().catch(() => {});
      ctx.resume(next);
    };
    card.querySelector('[data-pb=resume]').onclick = resume;
    card.querySelector('[data-pb=stop]').onclick = () => { resumed = true; close(); ctx.stop(); };
    const skip = card.querySelector('[data-pb=skip]');
    if (skip) skip.onclick = () => { if (stopAdhan) { stopAdhan(); stopAdhan = null; } skip.remove(); };
    if (withAdhan) stopAdhan = ctx.playAdhan(() => { stopAdhan = null; resume(); });
    card.querySelector('[data-pb=resume]').focus();
  }

  return { open, close };
}
