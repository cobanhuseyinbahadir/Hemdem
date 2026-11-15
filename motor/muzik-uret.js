// Hemdem fon müziğini ElevenLabs Music ile üretir (sözsüz).
//
// Kullanım:
//   node muzik-uret.js <klasor> --sure 48 [--istem "<ek tarif>"] [--dene]
//
//   <klasor>  Çıktı klasörü (ör. gunluk/<tarih>/04-video-<kod>). İçine şunlar yazılır:
//               muzik-vN.mp3 + muzik-vN.json   her sürüm (silinmez; json'da istem ve harcanan kredi)
//               muzik.mp3                       kullanılacak sürümün kopyası (en yenisi)
//   --sure    Müziğin süresi (sn). Videonun toplam süresi + 1 sn verilir. (10–300)
//   --istem   Hemdem kalıbına eklenecek kısa tarif: o videonun duygusu (ör. "slightly melancholic, a hint of hope at the end").
//   --dene    İstek atmadan istemi ve kalan krediyi yazar.
//
// API anahtarı Windows kullanıcı ortam değişkeni ELEVENLABS_API_KEY'den okunur; hiçbir yere yazılmaz.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// Hemdem müzik kalıbı (içerik sahibinin seçimi, 15 Kasım 2026: solo ud)
const KALIP = 'Instrumental background score for a quiet, reflective spoken-word video. Solo Turkish oud playing a slow, gentle taksim in a warm makam, sparse notes with long pauses, intimate and nostalgic, like late evening in an old Istanbul coffeehouse. Very soft dynamics, no percussion, no vocals, no sudden changes, steady calm mood throughout, gentle fade at the end.';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const DIR = args[0];
const SURE = parseFloat(flag('--sure') || '0');
const EK = flag('--istem');
const DENE = args.includes('--dene');
if (!DIR || DIR.startsWith('--') || !(SURE >= 10 && SURE <= 300)) { console.error('Kullanım: node muzik-uret.js <klasor> --sure <10–300> [--istem "..."] [--dene]'); process.exit(1); }

const key = () => process.env.ELEVENLABS_API_KEY?.trim() ||
  execSync(`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY','User')"`).toString().trim();
const K = key();
if (!K.startsWith('sk_')) { console.error('ELEVENLABS_API_KEY bulunamadı ya da geçersiz.'); process.exit(1); }
const kalan = async () => { try { const s = await (await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': K } })).json(); return s.character_limit - s.character_count; } catch { return null; } };

const prompt = EK ? `${KALIP} Mood for this piece: ${EK}` : KALIP;
const once = await kalan();
console.log(`İstem: ${prompt}\nSüre: ${SURE} sn · Kalan kredi: ${once}`);
if (DENE) process.exit(0);

fs.mkdirSync(DIR, { recursive: true });
const vs = fs.readdirSync(DIR).map((f) => f.match(/^muzik-v(\d+)\.mp3$/)).filter(Boolean).map((m) => +m[1]);
const v = (vs.length ? Math.max(...vs) : 0) + 1;
const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
  method: 'POST', headers: { 'xi-api-key': K, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, music_length_ms: Math.round(SURE * 1000), model_id: 'music_v1', force_instrumental: true }),
});
if (!r.ok) { console.error('HATA', r.status, (await r.text()).slice(0, 400)); process.exit(1); }
const buf = Buffer.from(await r.arrayBuffer());
const f = path.join(DIR, `muzik-v${v}.mp3`);
fs.writeFileSync(f, buf);
fs.copyFileSync(f, path.join(DIR, 'muzik.mp3'));
const sonra = await kalan();
fs.writeFileSync(path.join(DIR, `muzik-v${v}.json`), JSON.stringify({ prompt, sure: SURE, kredi: once != null && sonra != null ? once - sonra : null, tarih: new Date().toISOString() }, null, 1));
console.log(`muzik-v${v}.mp3 → muzik.mp3 · kalan ${sonra} (müzik kredisi hesaba birkaç dakika gecikmeyle yansıyabilir; ~70 sn ≈ 450 kredi)`);
