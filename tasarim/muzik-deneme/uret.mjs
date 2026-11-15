import { execSync } from 'node:child_process'; import fs from 'node:fs';
const K = execSync(`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY','User')"`).toString().trim();
const kota = async () => { const s = await (await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': K } })).json(); return s.character_limit - s.character_count; };
const P = [
  ['1-ud', 'Instrumental background score for a quiet, reflective spoken-word video. Solo Turkish oud playing a slow, gentle taksim in a warm makam, sparse notes with long pauses, intimate and nostalgic, like late evening in an old Istanbul coffeehouse. Very soft dynamics, no percussion, no vocals, no sudden changes, steady calm mood throughout, gentle fade at the end.'],
  ['2-ney-kanun', 'Instrumental background score for a quiet, reflective spoken-word video. A distant, breathy Turkish ney flute playing long, slow phrases, with a soft kanun gently plucking sparse notes underneath. Melancholic but warm and consoling, spacious, airy, meditative. Very soft dynamics, no percussion, no vocals, no drama, steady calm mood throughout, gentle fade at the end.'],
];
console.log('kalan önce', await kota());
for (const [ad, prompt] of P) {
  const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', { method: 'POST', headers: { 'xi-api-key': K, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, music_length_ms: 70000, model_id: 'music_v1', force_instrumental: true }) });
  if (!r.ok) { console.log(ad, 'HATA', r.status, (await r.text()).slice(0, 400)); continue; }
  fs.writeFileSync(`${ad}.mp3`, Buffer.from(await r.arrayBuffer())); console.log(ad, 'ok');
}
console.log('kalan sonra', await kota());
