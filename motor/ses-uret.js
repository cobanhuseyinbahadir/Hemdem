// Seslendirmeyi ElevenLabs ile cümle cümle üretir, cümleleri kontrollü duraklarla birleştirir
// ve her cümlenin, her kelimenin gerçek zamanını çıkarır.
//
// Kullanım:
//   node ses-uret.js <yonerge.json> <klasor> [--sadece 3,7] [--dene]
//
//   <yonerge.json> Ses Yönetmeni'nin seslendirme yönergesi (biçim aşağıda).
//   <klasor>       Çıktı klasörü (ör. gunluk/<tarih>/04-video-<kod>). İçine şunlar yazılır:
//                    ses-cumleler/cNN-vM.mp3 + .json   her cümlenin her sürümü (silinmez)
//                    ses.wav                           birleşik, temiz ses (-16 LUFS, TP ≤ -1.5)
//                    hizalama.json                     cümle ve kelime zamanları (gerçek saniye)
//                    dinleme.md                        içerik sahibinin dinleyip not vereceği liste
//   --sadece 3,7   Bu cümleleri ayarları değişmemiş olsa bile yeniden üretir (yeni sürüm).
//   --dene         Hiçbir şey üretmeden ne üretileceğini ve kaç karakter harcanacağını yazar.
//
// Kural: Bir cümlenin metni, etiketi ya da ayarı yönergede değiştiyse o cümle kendiliğinden yeniden üretilir;
// değişmeyen cümlelere dokunulmaz. Böylece geri bildirimde yalnızca sorunlu cümle yenilenir.
//
// API anahtarı Windows kullanıcı ortam değişkeninden okunur: ELEVENLABS_API_KEY. Anahtar hiçbir yere yazılmaz.
//
// yonerge.json:
// {
//   "ses": "tILIOdKERNNbBHVEXk7I",        // Hemdem sesi (MARKA.md)
//   "model": "eleven_v4",                 // varsayılan; cümle bazında "eleven_v3" denenebilir
//   "stability": 0.5, "similarity": 0.75, // varsayılan ses ayarları
//   "hiz": null,                          // isteğe bağlı konuşma hızı (0.7–1.2; boşsa sesin doğal hızı)
//   "basSessizlik": 0.3,                  // ilk cümleden önce (sn)
//   "sonPay": 0.6,                        // son cümleden sonra (sn)
//   "cumleler": [
//     { "metin": "Kahveni içtin.",         // altyazıdaki biçim; onaylı metinle birebir
//       "etiket": "[calm, quietly]",       // ElevenLabs ses etiketi (İngilizce, köşeli parantez)
//       "soyle": null,                     // okunuşu farklıysa sese giden biçim (ör. yabancı kelime)
//       "durak": 0.6,                      // bu cümleden sonraki sessizlik (sn)
//       "model": null, "stability": null, "hiz": null,  // isteğe bağlı cümle ayarı
//       "surum": null }                    // kullanılacak sürüm (boşsa en yenisi)
//   ]
// }

import fs from 'node:fs';
import path from 'node:path';
import { execSync, execFileSync, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] ?? true) : null; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--sadece'].includes(args[i - 1])));
if (pos.length < 2) { console.error('Kullanım: node ses-uret.js <yonerge.json> <klasor> [--sadece 3,7] [--dene]'); process.exit(1); }
const [YON, DIR] = pos;
const SADECE = new Set(String(flag('--sadece') || '').split(',').filter(Boolean).map(Number));
const DENE = args.includes('--dene');

const Y = JSON.parse(fs.readFileSync(YON, 'utf8'));
const CDIR = path.join(DIR, 'ses-cumleler');
fs.mkdirSync(CDIR, { recursive: true });
const pad = (n) => String(n).padStart(2, '0');
const ff = (a) => execFileSync('ffmpeg', ['-hide_banner', '-y', ...a], { stdio: ['ignore', 'pipe', 'pipe'] });
const ffInfo = (a) => spawnSync('ffmpeg', ['-hide_banner', ...a], { encoding: 'utf8' }).stderr;

function key() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  try { return execSync(`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY','User')"`).toString().trim(); } catch { return ''; }
}

// her cümle için istek
const istek = (c) => ({
  text: `${c.etiket ? c.etiket.trim() + ' ' : ''}${(c.soyle || c.metin).trim()}`,
  model_id: c.model || Y.model || 'eleven_v4',
  voice_settings: { stability: c.stability ?? Y.stability ?? 0.5, similarity_boost: Y.similarity ?? 0.75,
    ...((c.hiz ?? Y.hiz) ? { speed: c.hiz ?? Y.hiz } : {}) },
});
const surumler = (no) => fs.readdirSync(CDIR).map((f) => f.match(new RegExp(`^c${pad(no)}-v(\\d+)\\.json$`))).filter(Boolean).map((m) => +m[1]).sort((a, b) => a - b);
const oku = (no, v) => JSON.parse(fs.readFileSync(path.join(CDIR, `c${pad(no)}-v${v}.json`), 'utf8'));

(async () => {
  const K = DENE ? '' : key();
  if (!DENE && !K.startsWith('sk_')) { console.error('ELEVENLABS_API_KEY bulunamadı ya da geçersiz (sk_ ile başlamalı).'); process.exit(1); }

  // 1) gerekli cümleleri üret
  let harcanan = 0;
  for (let i = 0; i < Y.cumleler.length; i++) {
    const no = i + 1, c = Y.cumleler[i], req = istek(c), vs = surumler(no);
    const son = vs.length ? oku(no, vs.at(-1)) : null;
    const degisti = !son || JSON.stringify(son.istek) !== JSON.stringify(req);
    if (!degisti && !SADECE.has(no)) continue;
    const v = (vs.at(-1) || 0) + 1;
    harcanan += req.text.length;
    console.log(`${DENE ? '[dene] ' : ''}c${pad(no)}-v${v}  ${req.model_id}  ${req.text}`);
    if (DENE) continue;
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${Y.ses}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': K, 'Content-Type': 'application/json' }, body: JSON.stringify(req),
    });
    const j = await r.json();
    if (!r.ok) { console.error(`c${pad(no)} HATA ${r.status}: ${JSON.stringify(j.detail)}`); process.exit(1); }
    fs.writeFileSync(path.join(CDIR, `c${pad(no)}-v${v}.mp3`), Buffer.from(j.audio_base64, 'base64'));
    fs.writeFileSync(path.join(CDIR, `c${pad(no)}-v${v}.json`), JSON.stringify({ istek: req, metin: c.metin, hizalama: j.normalized_alignment || j.alignment, tarih: new Date().toISOString() }));
    if (c.surum) console.log(`  not: c${pad(no)} yönergede v${c.surum}'e sabitli; yeni sürüm kullanılmayacak.`);
  }
  let kalan = null;
  try {
    const kk = K || key();
    const s = await (await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': kk } })).json();
    if (s.character_limit) kalan = s.character_limit - s.character_count;
  } catch {}
  console.log(`Karakter: ${harcanan}${kalan != null ? ` · Aylık kalan: ${kalan}` : ''}`);
  if (DENE) return;

  // 2) her cümleyi gerçek ses sınırlarından kırp, duraklarla birleştir
  const TMP = path.join(DIR, 'ses-cumleler', '_tmp');
  fs.mkdirSync(TMP, { recursive: true });
  const parts = [], out = [];
  let t = 0;
  const sessiz = (sn, ad) => { const f = path.join(TMP, ad); ff(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', sn.toFixed(3), '-c:a', 'pcm_s16le', f]); parts.push(f); t += sn; };
  sessiz(Y.basSessizlik ?? 0.3, 'bas.wav');

  for (let i = 0; i < Y.cumleler.length; i++) {
    const no = i + 1, c = Y.cumleler[i];
    const v = c.surum || surumler(no).at(-1);
    const d = oku(no, v), a = d.hizalama;
    const mp3 = path.join(CDIR, `c${pad(no)}-v${v}.mp3`);
    const chars = a.characters, S = a.character_start_times_seconds, E = a.character_end_times_seconds;
    // etiketi atla
    let k = 0; const s = chars.join('');
    if (s.trimStart().startsWith('[')) { k = s.indexOf(']') + 1; }
    while (k < chars.length && /\s/.test(chars[k])) k++;
    let last = chars.length - 1; while (last > k && /\s/.test(chars[last])) last--;
    // gerçek ses sınırları (sessizlik algılama)
    const info = ffInfo(['-i', mp3, '-af', 'silencedetect=n=-45dB:d=0.08', '-f', 'null', '-']);
    const dur = +(info.match(/Duration: (\d+):(\d+):([\d.]+)/) || []).slice(1).reduce((x, y, j) => j === 0 ? +y * 3600 : x + (j === 1 ? +y * 60 : +y), 0);
    const st = [...info.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
    const en = [...info.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
    let a0 = Math.max(0, S[k] - 0.04);
    if (st.length && st[0] < 0.02 && en[0] && en[0] < S[k] + 0.3) a0 = Math.max(0, en[0] - 0.03);
    if (c.kesBas != null) a0 = c.kesBas; // elle kesim başlangıcı (hizalama ilk kelimeyi geç gösterdiğinde, ör. Z11 'Ya')
    let a1 = Math.min(dur, E[last] + 0.12);
    const tail = st.at(-1); if (tail && tail > S[last] && (en.length < st.length || en.at(-1) >= dur - 0.05)) a1 = Math.min(a1, tail + 0.06);
    const f = path.join(TMP, `c${pad(no)}.wav`);
    ff(['-i', mp3, '-af', `atrim=${a0.toFixed(3)}:${a1.toFixed(3)},asetpts=N/SR/TB,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, a1 - a0 - 0.015).toFixed(3)}:d=0.015`, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', f]);
    parts.push(f);
    // kelimeler (gerçek zaman)
    const kel = []; let w = null;
    for (let j = k; j <= last; j++) {
      if (/\s/.test(chars[j])) { if (w) { kel.push(w); w = null; } continue; }
      const bs = t + (S[j] - a0), bt = t + (E[j] - a0);
      if (!w) w = { k: chars[j], bas: bs, son: bt }; else { w.k += chars[j]; w.son = bt; }
    }
    if (w) kel.push(w);
    if (c.kesBas != null && kel[0]) kel[0].bas = t;
    kel.forEach((x) => { x.bas = +x.bas.toFixed(3); x.son = +Math.min(x.son, t + (a1 - a0)).toFixed(3); });
    out.push({ no, metin: c.metin, etiket: c.etiket || '', model: d.istek.model_id, surum: v, bas: +(c.kesBas != null ? t : t + (S[k] - a0)).toFixed(3), son: +(t + (a1 - a0)).toFixed(3), kelimeler: kel });
    t += a1 - a0;
    const durak = i === Y.cumleler.length - 1 ? (Y.sonPay ?? 0.6) : (c.durak ?? 0.6);
    sessiz(durak, `d${pad(no)}.wav`);
  }

  // 3) birleştir ve -16 LUFS'a çek (finalde birlestir.js -14'e çeker)
  const list = path.join(TMP, 'liste.txt');
  fs.writeFileSync(list, parts.map((p) => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));
  const ham = path.join(TMP, 'birlesik.wav');
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'pcm_s16le', ham]);
  const m1 = ffInfo(['-i', ham, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
  const L = JSON.parse(m1.slice(m1.lastIndexOf('{'), m1.lastIndexOf('}') + 1));
  const sesWav = path.join(DIR, 'ses.wav');
  ff(['-i', ham, '-af', `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${L.input_i}:measured_TP=${L.input_tp}:measured_LRA=${L.input_lra}:measured_thresh=${L.input_thresh}:offset=${L.target_offset}:linear=true`, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', sesWav]);
  const m2 = ffInfo(['-i', sesWav, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const lufs = +(m2.match(/I:\s+(-?[\d.]+) LUFS/g) || ['']).at(-1).replace(/[^-\d.]/g, '');
  const tp = +(m2.match(/Peak:\s+(-?[\d.]+) dBFS/g) || ['']).at(-1).replace(/[^-\d.]/g, '');
  fs.rmSync(TMP, { recursive: true, force: true });

  const toplam = +t.toFixed(3);
  fs.writeFileSync(path.join(DIR, 'hizalama.json'), JSON.stringify({ toplamSure: toplam, lufs, truePeak: tp, cumleler: out }, null, 1));

  // 4) dinleme listesi
  const md = [
    `# Dinleme listesi`, '',
    `Ses: \`${Y.ses}\` · Toplam ${toplam.toFixed(1)} sn · ${lufs} LUFS · TP ${tp} dBTP`, '',
    `Düzeltmek istediğin cümlenin numarasını ve ne istediğini söylemen yeterli (ör. "4 daha kaygılı", "7 daha yavaş", "2'yi bir daha dene").`, '',
    '| # | Saniye | Ton (etiket) | Cümle | Sürüm |', '|---|---|---|---|---|',
    ...out.map((c) => `| ${c.no} | ${c.bas.toFixed(1)} | ${c.etiket.replace(/\|/g, '/')} | ${c.metin.replace(/\|/g, '/')} | v${c.surum}${c.model !== (Y.model || 'eleven_v4') ? ' · ' + c.model : ''} |`),
  ].join('\n');
  fs.writeFileSync(path.join(DIR, 'dinleme.md'), md + '\n');
  console.log(`ses.wav ${toplam.toFixed(2)} sn · ${lufs} LUFS · TP ${tp} dBTP · ${out.length} cümle`);
})();
