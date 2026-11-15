// Ses kaydındaki konuşma bölümlerini ve duraklamaları bulur (ffmpeg silencedetect).
// Çıktı, görsel planın zamanlarını gerçek kayda eşlemek (FILM.timeMap) için kullanılır.
//
// Kullanım: node ses-analiz.js <ses.wav> [--esik -38] [--min 0.18] [--json cikti.json]
//   --esik: sessizlik eşiği (dB). Gürültülü kayıtta -32, sessiz odada -40 civarı.
//   --min : sessizlik sayılacak en kısa süre (sn). Plandaki "/" kısa durak ~0.2–0.35, "//" uzun durak ~0.5+.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const f = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!f) { console.error('Kullanım: node ses-analiz.js <ses.wav>'); process.exit(1); }
const th = opt('esik', '-38'), min = opt('min', '0.18');

const dur = parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.toString());
const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', `silencedetect=noise=${th}dB:d=${min}`, '-f', 'null', '-'], { encoding: 'utf8' });
const log = r.stderr;
const sil = [];
let cur = null;
for (const line of log.split(/\r?\n/)) {
  let m = line.match(/silence_start: ([\d.]+)/); if (m) cur = { a: parseFloat(m[1]) };
  m = line.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/); if (m && cur) { cur.b = parseFloat(m[1]); cur.d = parseFloat(m[2]); sil.push(cur); cur = null; }
}
if (cur) { cur.b = dur; cur.d = dur - cur.a; sil.push(cur); }

// konuşma bölümleri = sessizliklerin arası
const speech = []; let t = 0;
for (const s of sil) { if (s.a - t > 0.05) speech.push({ a: +t.toFixed(3), b: +s.a.toFixed(3) }); t = s.b; }
if (dur - t > 0.05) speech.push({ a: +t.toFixed(3), b: +dur.toFixed(3) });

const res = {
  dosya: f, sure: +dur.toFixed(3),
  ilkSes: speech.length ? speech[0].a : 0,
  sonSes: speech.length ? speech[speech.length - 1].b : dur,
  konusma: speech,
  duraklar: sil.map(s => ({ a: +s.a.toFixed(3), b: +s.b.toFixed(3), sure: +s.d.toFixed(3), tur: s.d >= 0.5 ? 'uzun' : 'kisa' })),
};
const out = opt('json');
if (out) writeFileSync(out, JSON.stringify(res, null, 2));
console.log(`Süre ${res.sure} sn · ilk ses ${res.ilkSes} sn · son ses ${res.sonSes} sn · ${speech.length} konuşma bölümü · ${res.duraklar.filter(d => d.tur === 'uzun').length} uzun durak`);
speech.forEach((s, i) => console.log(`${String(i + 1).padStart(3)}  ${s.a.toFixed(2)} – ${s.b.toFixed(2)}`));
