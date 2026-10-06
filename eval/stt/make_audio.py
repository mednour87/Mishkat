# Speech-to-text benchmark audio (6 Oct 2026): spoken questions synthesised with Microsoft neural voices
# (edge-tts, several Arabic dialects + English), then degraded like a phone/laptop microphone
# (speed, room noise, 16 kHz mono Opus 24 kb/s in WebM — what MediaRecorder sends).
#   python eval/stt/make_audio.py        → eval/stt/audio/<id>.webm  (+ items.json is the reference)
import asyncio, json, os, subprocess, sys
import edge_tts, imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'audio')
os.makedirs(OUT, exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()
ITEMS = json.load(open(os.path.join(HERE, 'items.json'), encoding='utf-8'))['items']

async def one(it):
    mp3 = os.path.join(OUT, it['id'] + '.mp3')
    dst = os.path.join(OUT, it['id'] + '.webm')
    if os.path.exists(dst):
        return
    await edge_tts.Communicate(it['text'], it['voice'], rate=it.get('rate', '+0%')).save(mp3)
    noise = it.get('noise', 0.004)
    # 0.6 s of silence before (the visitor starts speaking late), pink noise mixed under the voice
    flt = (f"[0:a]adelay=600|600,apad=pad_dur=0.8,aresample=16000,pan=mono|c0=c0[v];"
           f"anoisesrc=color=pink:amplitude={noise}:sample_rate=16000[n];"
           f"[v][n]amix=inputs=2:duration=first:normalize=0[a]")
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', mp3, '-filter_complex', flt, '-map', '[a]',
                    '-c:a', 'libopus', '-b:a', '24k', dst], check=True)
    os.remove(mp3)

async def main():
    for it in ITEMS:
        await one(it)
        print(it['id'], 'ok')

asyncio.run(main())
