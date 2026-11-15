// ElevenLabs Türkçe ton testi: aynı cümleler etiketsiz ve etiketli, v4 ve v3 ile.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const KEY = execSync(`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY','User')"`).toString().trim();
const VOICE = 'tILIOdKERNNbBHVEXk7I';
const LINES = [
  ['1-sakin',   '[calm, quietly to himself]', 'Kahveni içtin. Fincanı tabağına ters çevirdin, alışkanlıktan.'],
  ['2-fisilti', '[whispers]',                 'Sonra durdun. Gösterecek kimse yoktu artık.'],
  ['3-sicak',   '[warmly, smiling]',          'Gelir, fincanına bakardı. Saatlerce gülerdiniz.'],
  ['4-kaygi',   '[anxious, hesitant]',        'Fincanın dibinde kalan hep o soru: Kabahat bende mi?'],
  ['5-agir',    '[slowly, thoughtfully]',     'Peki sende kalan hatır… hangi fincanın?'],
];
const RUNS = [
  ['v4-etiketsiz', 'eleven_v4', false],
  ['v4-etiketli',  'eleven_v4', true],
  ['v3-etiketli',  'eleven_v3', true],
];
const out = [];
for (const [id, tag, text] of LINES) for (const [run, model, tagged] of RUNS) {
  const body = { text: tagged ? `${tag} ${text}` : text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } };
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`,
    { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) { console.log(id, run, 'HATA', r.status, JSON.stringify(j.detail).slice(0, 200)); continue; }
  const f = `${id}_${run}.mp3`;
  fs.writeFileSync(path.join(DIR, f), Buffer.from(j.audio_base64, 'base64'));
  const a = j.normalized_alignment || j.alignment;
  const end = a ? a.character_end_times_seconds.at(-1) : null;
  const tagLeak = a ? a.characters.join('').includes('[') : null;
  fs.writeFileSync(path.join(DIR, `${id}_${run}.json`), JSON.stringify(a));
  out.push({ id, run, f, chars: a?.characters.length, end, tagLeak });
  console.log(id, run, 'ok', 'son harf', end?.toFixed(2), 'sn', 'etiket hizada:', tagLeak);
}
fs.writeFileSync(path.join(DIR, 'sonuc.json'), JSON.stringify(out, null, 1));
