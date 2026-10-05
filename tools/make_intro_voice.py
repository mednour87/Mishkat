"""Narration of the presentation film (public/audio/intro/{ar,en}/*.mp3), hand-written, never a verse.
Arabic in Modern Standard Arabic (fusha) with full vowels, voice ar-SA-HamedNeural; English en-US-GuyNeural.
Generated with edge-tts (Microsoft Edge read-aloud voices, declared in TOOLS.md):  python tools/make_intro_voice.py
The same lines are shown on the cards (public/js/intro.js, IN.*.say) — keep both in step."""
import asyncio, json, pathlib
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
LINES = {
    'ar': {
        'search': 'اسألْ بكلماتِك أو بصوتِك، فيختارُ الذكاءُ الاصطناعيُّ من قائمةٍ مغلقةٍ من آياتِ المصحفِ وجُمَلِ التفسيرِ المعتمَد، ولا يكتبُ حرفًا من عندِه، ثمّ يتحقّقُ نموذجٌ ثانٍ من الجواب.',
        'recite': 'واقرأْ بتلاوةِ الشيخِ مشاري العفاسي، فتضيءُ الكلمةُ المتلوّةُ في المصحفِ وفي المجرّة.',
        'khatma': 'وضَعْ خطّةَ ختمتِك على أيّامِك وأوقاتِك، والسُّوَرُ التي تقرؤها تضيءُ داخلَ المِشكاة.',
        'tekrar': 'واحفَظْ بالتَّكرار: عدّادٌ لكلِّ تكرار، ووقتٌ أدنى قريبٌ من وقتِ الشيخ، وتشجيعٌ دائم.',
        'prayer': 'ومواقيتُ الصلاةِ في مدينتِك، والقِبلةُ بالبوصلة، والمساجدُ القريبةُ على الخريطة.',
        'child': 'ووضعٌ آمنٌ للأطفال: لا فتاوى ولا موضوعاتٍ حسّاسة، بل توجيهٌ لطيفٌ إلى الحِفظ.',
        'install': 'وثبِّتْ مِشكاة على هاتفِك وحاسوبِك مباشرةً من المتصفِّح، بلا إعلاناتٍ ولا تتبُّع.',
        'greet': 'أهلًا بك في مِشكاة. كيف يمكنُني أن أساعدَك اليوم؟',
    },
    'en': {
        'search': 'Ask in your own words, or by voice. The AI picks from a closed list of Mushaf verses and vetted tafsir sentences, never writes a word of its own, and a second model checks the answer.',
        'recite': 'Read with the recitation of Sheikh Mishary Alafasy: the recited word lights up in the Mushaf and in the galaxy.',
        'khatma': 'Plan your khatma on your own days and times; the surahs you read light up inside the lamp.',
        'tekrar': 'Memorise by repetition: a counter for each repetition, a minimal time close to the reciter’s, and constant encouragement.',
        'prayer': 'Prayer times in your city, the qibla with the compass, and nearby mosques on the map.',
        'child': 'A safe mode for children: no fatwas, no sensitive subjects, a gentle path to memorising.',
        'install': 'Install Mishkat on your phone and computer straight from the browser. No ads, no tracking.',
        'greet': 'Welcome to Mishkat. How can I help you today?',
    },
}
VOICE = {'ar': 'ar-SA-HamedNeural', 'en': 'en-US-GuyNeural'}

async def main():
    meta = {}
    for lang, lines in LINES.items():
        out = ROOT / 'public' / 'audio' / 'intro' / lang
        out.mkdir(parents=True, exist_ok=True)
        meta[lang] = {}
        for k, text in lines.items():
            f = out / f'{k}.mp3'
            await edge_tts.Communicate(text, VOICE[lang], rate='-4%').save(str(f))
            meta[lang][k] = text
            print(lang, k, f.stat().st_size)
    (ROOT / 'public' / 'audio' / 'intro' / 'lines.json').write_text(json.dumps({'voices': VOICE, 'lines': meta}, ensure_ascii=False, indent=1), encoding='utf-8')

asyncio.run(main())
