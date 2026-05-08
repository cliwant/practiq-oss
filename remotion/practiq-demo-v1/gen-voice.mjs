// Generate the practiq demo-v1 voiceover via ElevenLabs.
// Voice: Sarah (EXAVITQu4vr4xnSDxMaL) — calm professional, builder tone.
// Model: eleven_turbo_v2_5, output 44.1kHz mp3.
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('Missing ELEVENLABS_API_KEY');
  process.exit(1);
}

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const MODEL = 'eleven_turbo_v2_5';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const raw = fs.readFileSync(path.join(here, 'voiceover.txt'), 'utf8').trim();
// Insert deliberate scene-boundary breaks so the voiceover has rhythm
// and the runtime stretches into the 58-62s window. Each \n\n in the
// source script is a scene boundary; replace with a 600ms break.
const text = raw.split(/\n\s*\n/).join(' <break time="0.7s" /> ');

const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
const body = {
  text,
  model_id: MODEL,
  voice_settings: {
    stability: 0.55,            // a bit of natural variation
    similarity_boost: 0.75,
    style: 0.15,                // low — keep it calm, builder-y
    use_speaker_boost: true,
  },
};

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'xi-api-key': KEY,
    'Content-Type': 'application/json',
    Accept: 'audio/mpeg',
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const t = await res.text();
  console.error('ElevenLabs error', res.status, t);
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
const out = path.join(here, 'audio.mp3');
fs.writeFileSync(out, buf);
console.log('wrote', out, buf.length, 'bytes');
