"""Modern Standard Arabic (fusha) narration of the video: the same hand-written lines as narration.json (never a verse),
read by ar-SA-HamedNeural (edge-tts), saved as 24 kHz mono PCM WAV for build.mjs.
    python tools/video/voice_fusha.py <video-dir>          → <video-dir>/voice_fusha/<id>.wav
Lines may carry a fully vowelled form in "ar_fusha" (better pronunciation); otherwise "ar" is read."""
import asyncio, json, pathlib, subprocess, sys
import edge_tts

D = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '../04_LIVRABLES/video').resolve()
FF = 'C:/Users/ASUS/AppData/Local/Programs/Python/Python313/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
N = json.loads((D / 'narration.json').read_text(encoding='utf-8'))
out = D / 'voice_fusha'; out.mkdir(exist_ok=True)

# (6 Oct, author's remark) the voice misread the name: for the voice only it is written as said in pause, «مِشكاه»
# (checked with a speech-to-text pass, as tools/make_intro_voice.py); the subtitles keep the correct spelling
import re
def spoken(t):
    t = re.sub(r"الْ?مِ?شْ?كَ?اة[ًٌٍَُِ]?", "المِشكاه", t)
    return re.sub(r"مِ?شْ?كَ?اة[ًٌٍَُِ]?", "مِشكاه", t)

async def main():
    for l in N['lines']:
        mp3 = out / f"{l['id']}.mp3"
        await edge_tts.Communicate(spoken(l.get('ar_fusha') or l['ar']), 'ar-SA-HamedNeural', rate='+4%').save(str(mp3))
        wav = out / f"{l['id']}.wav"
        subprocess.run([FF, '-y', '-loglevel', 'error', '-i', str(mp3), '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', str(wav)], check=True)
        b = wav.read_bytes()
        # build.mjs reads the data size at byte 40: ffmpeg may add a LIST chunk, so rewrite a plain 44-byte header
        k = b.find(b'data') + 8; pcm = b[k:]
        import struct
        h = b'RIFF' + struct.pack('<I', 36 + len(pcm)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 1, 24000, 48000, 2, 16) + b'data' + struct.pack('<I', len(pcm))
        wav.write_bytes(h + pcm); mp3.unlink()
        print(l['id'], round(len(pcm) / 48000, 2))

asyncio.run(main())
