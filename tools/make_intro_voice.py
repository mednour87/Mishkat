"""Narration of the presentation film (public/audio/intro/{ar,en}/*.mp3), hand-written, never a verse.
Arabic in Modern Standard Arabic (fusha) with full vowels, voice ar-SA-HamedNeural; English en-US-GuyNeural.
Generated with edge-tts (Microsoft Edge read-aloud voices, declared in TOOLS.md):  python tools/make_intro_voice.py
(6 Oct) The lines are read from public/js/intro.js (IN.*.feats, bridge, greet — export `lines`), the one source of
the cards and of the voice: they can no longer drift apart."""
import asyncio, json, pathlib, subprocess
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
JS = ("globalThis.matchMedia=()=>({matches:false});"
      "const m=await import('./public/js/intro.js');"
      "console.log(JSON.stringify({ar:m.lines('ar'),en:m.lines('en')}));")
LINES = json.loads(subprocess.run(['node', '--input-type=module', '-e', JS], cwd=ROOT, capture_output=True, check=True,
                                  text=True, encoding='utf-8').stdout)
VOICE = {'ar': 'ar-SA-HamedNeural', 'en': 'en-US-GuyNeural'}
RATE = {'ar': '-2%', 'en': '+0%'}

async def main():
    meta = {}
    for lang, lines in LINES.items():
        out = ROOT / 'public' / 'audio' / 'intro' / lang
        out.mkdir(parents=True, exist_ok=True)
        meta[lang] = {}
        for k, text in lines.items():
            f = out / f'{k}.mp3'
            await edge_tts.Communicate(text, VOICE[lang], rate=RATE[lang]).save(str(f))
            meta[lang][k] = text
            print(lang, k, f.stat().st_size)
    (ROOT / 'public' / 'audio' / 'intro' / 'lines.json').write_text(json.dumps({'voices': VOICE, 'lines': meta}, ensure_ascii=False, indent=1), encoding='utf-8')

asyncio.run(main())
