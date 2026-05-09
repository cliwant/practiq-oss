// Generate a per-vertical Practiq demo voiceover via ElevenLabs.
// Voice: Sarah (EXAVITQu4vr4xnSDxMaL) — same voice/settings as v1-honest / B2.
// Usage: node gen-voice-vertical.mjs --vertical=cpa
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('Missing ELEVENLABS_API_KEY');
  process.exit(1);
}

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const MODEL = 'eleven_turbo_v2_5';

const verticalArg = process.argv.find((a) => a.startsWith('--vertical='));
if (!verticalArg) {
  console.error('Usage: node gen-voice-vertical.mjs --vertical=cpa|law|hr');
  process.exit(1);
}
const vertical = verticalArg.split('=')[1];
if (!['cpa', 'law', 'hr'].includes(vertical)) {
  console.error(`Invalid vertical: ${vertical}. Must be cpa, law, or hr.`);
  process.exit(1);
}

const SCRIPTS = {
  cpa: `Practiq is the AI ops layer for boutique CPA firms shipping redlined Word memos to clients.

Drop in your draft Word doc — close memo, tax-position memo, engagement letter — plus the firm's prior memos for that client. Practiq reads what's been said before.

Cross-checking phrasing, structure, what gets emphasized — across the firm's voice, not a generic template.

Back comes a Word doc with native tracked changes. Open in Word, accept or reject inside Word. Every change cites which prior memo it pulled the rationale from.

Pre-launch and looking for the first design partners — boutique CPA firms in the fifty to two-hundred client range. Fifteen dollars per client per month at launch. No annual contract.

Try it yourself at practiq dot dev slash demo, or reply yes.`,
  law: `Practiq is the AI ops layer for boutique law firms shipping redlined Word memos to clients.

Drop in your draft — engagement letter, opinion memo, transactional memo — plus the firm's prior memos for that client. Practiq reads what's been said before.

Cross-checking phrasing, citations, the partner's voice — not a generic template.

Back comes a Word doc with native tracked changes. Open in Word, accept or reject inside Word. Every change cites which prior memo it pulled the rationale from.

Pre-launch and opening the first boutique-law design-partner cohort — firms in the fifty to two-hundred client range. Fifteen dollars per client per month at launch. No annual contract.

Try it yourself at practiq dot dev slash demo, or reply yes.`,
  hr: `Practiq is the AI ops layer for boutique HR consulting firms shipping redlined Word memos to clients.

Drop in your draft — handbook revision, policy memo, investigation report — plus the firm's prior memos for that client. Practiq reads what's been said before.

Cross-checking phrasing, multi-state nuances, the firm's voice — not a generic compliance template.

Back comes a Word doc with native tracked changes. Open in Word, accept or reject inside Word. Every change cites which prior memo it pulled the rationale from.

Pre-launch and opening the first boutique HR consulting design-partner cohort — firms in the fifty to two-hundred client range. Fifteen dollars per client per month at launch. No annual contract.

Try it yourself at practiq dot dev slash demo, or reply yes.`,
};

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const raw = SCRIPTS[vertical];
const text = raw.split(/\n\s*\n/).join(' <break time="0.7s" /> ');

const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
const body = {
  text,
  model_id: MODEL,
  voice_settings: {
    stability: 0.55,
    similarity_boost: 0.75,
    style: 0.15,
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
const outName = `audio-${vertical}.mp3`;
const outDir = path.join(here, 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, outName);
fs.writeFileSync(out, buf);
console.log('wrote', out, buf.length, 'bytes');
