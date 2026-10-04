# T042: the spoken welcome, generated ONCE with Groq Orpheus (canopylabs/orpheus-arabic-saudi) from the
# hand-written welcome sentence of public/js/i18n.js (welcomeSpoken) — never a verse, never AI-written text —
# and shipped as a small MP3, so the welcome is heard even where the browser has no Arabic voice.
# English: the Orpheus English model is not enabled on the account → the browser's voice is used.
#   python tools/make_welcome_audio.py           (reads GROQ_API_KEY from .dev.vars, never prints it)
import json, os, re, sys, urllib.request
sys.stdout.reconfigure(encoding="utf-8")
import lameenc

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
env = {}
for line in open(os.path.join(ROOT, '.dev.vars'), encoding='utf-8'):
    m = re.match(r'^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$', line)
    if m: env[m.group(1)] = m.group(2)

i18n = open(os.path.join(ROOT, 'public', 'js', 'i18n.js'), encoding='utf-8').read()
TEXT = re.search(r"welcomeSpoken: '([^']+)'", i18n).group(1)          # the Arabic block comes first
assert re.search(r'[؀-ۿ]', TEXT), 'expected the Arabic welcome sentence'

req = urllib.request.Request('https://api.groq.com/openai/v1/audio/speech', method='POST',
    data=json.dumps({'model': 'canopylabs/orpheus-arabic-saudi', 'input': TEXT, 'voice': sys.argv[1] if len(sys.argv) > 1 else 'fahad', 'response_format': 'wav'}).encode(),
    headers={'content-type': 'application/json', 'authorization': 'Bearer ' + env['GROQ_API_KEY'], 'user-agent': 'Mishkat/1.0'})
wav = urllib.request.urlopen(req, timeout=60).read()
# Orpheus streams a WAV whose size fields are unset: the PCM starts after the 'data' chunk header
k = wav.index(b'data') + 8
rate = int.from_bytes(wav[24:28], 'little')
enc = lameenc.Encoder()
enc.set_bit_rate(48); enc.set_in_sample_rate(rate); enc.set_channels(1); enc.set_quality(2)
mp3 = enc.encode(wav[k:]) + enc.flush()
out = os.path.join(ROOT, 'public', 'audio', 'welcome_ar.mp3')
open(out, 'wb').write(mp3)
print('written', out, len(mp3), 'bytes,', round((len(wav) - k) / (2 * rate), 1), 's —', TEXT)
