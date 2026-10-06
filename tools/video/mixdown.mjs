// The soundtrack of the video, mixed sample by sample (6 Oct 2026). ffmpeg's amix, fed by a slow pipe of overlay
// frames, dropped every voice between 53.5 s and 106.8 s of v3 (the author: «the sound stops at the statistics and
// comes back at the end»). Here each sound is decoded once to 48 kHz stereo float, its gain and fade applied, placed at
// its time, summed, softly limited, and written as one WAV; then every narration is CHECKED to be audible at its place.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const SR = 48000;
// sounds: [{ file, at (s), gain, fadeOut?: { at (s, from the sound's start), d } }]
export function mixdown(FFMPEG, sounds, total, out, { voiceDir = '' } = {}) {
  const n = Math.ceil(total * SR), L = new Float32Array(n), R = new Float32Array(n);
  for (const s of sounds) {
    const raw = execFileSync(FFMPEG, ['-v', 'error', '-i', s.file, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
    const f = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), m = f.length / 2, o = Math.round(s.at * SR);
    for (let i = 0; i < m && o + i < n; i++) {
      if (o + i < 0) continue;
      let g = s.gain;
      if (s.fadeOut) { const t = i / SR; if (t > s.fadeOut.at) g *= Math.max(0, 1 - (t - s.fadeOut.at) / s.fadeOut.d); }
      L[o + i] += f[2 * i] * g; R[o + i] += f[2 * i + 1] * g;
    }
  }
  // a soft limiter (tanh above -1 dBFS): no clipping where two sounds meet
  const lim = (x) => { const a = Math.abs(x), k = 0.89; return a <= k ? x : Math.sign(x) * (k + (1 - k) * Math.tanh((a - k) / (1 - k))); };
  const pcm = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) { pcm.writeInt16LE(Math.round(lim(L[i]) * 32767), 4 * i); pcm.writeInt16LE(Math.round(lim(R[i]) * 32767), 4 * i + 2); }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(out, Buffer.concat([h, pcm]));
  // the check: every narration is heard where it was placed (RMS of its first 2 s above -40 dBFS)
  const quiet = [];
  for (const s of sounds) {
    if (voiceDir && !s.file.includes(voiceDir)) continue;
    const a = Math.round(s.at * SR), b = Math.min(n, a + 2 * SR); let e = 0;
    for (let i = a; i < b; i++) e += L[i] * L[i] + R[i] * R[i];
    const db = 10 * Math.log10(e / Math.max(1, 2 * (b - a)) + 1e-12);
    if (db < -40) quiet.push(`${s.file.split(/[\\/]/).pop()} @${s.at.toFixed(1)}s ${db.toFixed(1)} dB`);
  }
  if (quiet.length) throw new Error('narration not heard: ' + quiet.join(', '));
  return out;
}
