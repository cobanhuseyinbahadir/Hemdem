// Seslendirme kaydını temizler ve yayına hazırlar; kalite ölçümlerini raporlar.
//
// Kullanım: node ses-temizle.js <ham-kayit.(wav|m4a|mp3|...)> <temiz.wav> [--gurultu -25] [--json rapor.json]
//
// Zincir: mono 48 kHz → 80 Hz altı kesme → gürültü azaltma → sert "s" yumuşatma → hafif sıkıştırma
//         → baştaki/sondaki sessizliği 0.3 sn'ye indir → konuşma için -16 LUFS.
// (Videodaki son karışım birlestir.js'te -14 LUFS'a çekilir.)
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const [inp, out] = args;
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!inp || !out || !existsSync(inp)) { console.error('Kullanım: node ses-temizle.js <ham> <temiz.wav>'); process.exit(1); }
const nf = opt('gurultu', '-25');

const stats = f => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'astats=metadata=0:reset=0,ebur128=framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' });
  const s = r.stderr;
  const num = re => { const m = s.match(re); return m ? parseFloat(m[1]) : null; };
  return {
    tepe_dB: num(/Peak level dB:\s*(-?[\d.]+|-inf)/),
    gurultu_tabani_dB: num(/Noise floor dB:\s*(-?[\d.]+)/),
    kirpilmis_ornek: num(/Number of clipped samples:\s*([\d.]+)/) ?? num(/Peak count:\s*([\d.]+)/),
    yukseklik_LUFS: num(/I:\s*(-?[\d.]+) LUFS/),
    sure: parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.toString()),
  };
};

const before = stats(inp);
const chain = [
  'aformat=sample_rates=48000:channel_layouts=mono',
  'highpass=f=80',
  `afftdn=nf=${nf}:tn=1`,
  'deesser=i=0.4:m=0.5:f=0.5',
  'acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2',
  // yalnızca baştaki ve sondaki sessizlik kırpılır (ortadaki duraklar korunur): ters çevir, baştan kırp, geri çevir
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.3:detection=rms',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.3:detection=rms',
  'areverse',
  'loudnorm=I=-16:TP=-1.5:LRA=11',
  'aresample=48000',
].join(',');
const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', inp, '-af', chain, '-c:a', 'pcm_s24le', out], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
const after = stats(out);

const uyarilar = [];
if ((before.tepe_dB ?? -99) > -0.3) uyarilar.push('Ham kayıtta tepe 0 dB\'ye çok yakın: kırpılma (cızırtı) olabilir. Telefonu biraz uzak tut ya da daha sakin oku.');
if ((before.gurultu_tabani_dB ?? -99) > -50) uyarilar.push(`Ortam gürültüsü yüksek (${before.gurultu_tabani_dB} dB). Daha sessiz bir oda, kapalı pencere, kumaşlı bir ortam (dolap önü, yatak odası) daha iyi olur.`);
if ((before.yukseklik_LUFS ?? -99) < -35) uyarilar.push('Kayıt çok kısık. Telefonu ağzına 15–20 cm yakın tut.');
const rapor = { once: before, sonra: after, uyarilar };
const j = opt('json'); if (j) writeFileSync(j, JSON.stringify(rapor, null, 2));
console.log('Temizlendi:', out);
console.log('Önce :', JSON.stringify(before));
console.log('Sonra:', JSON.stringify(after));
uyarilar.forEach(u => console.log('UYARI:', u));
