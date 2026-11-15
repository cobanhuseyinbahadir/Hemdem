// Parça parça üretilmiş sessiz videoları birleştirir; isteğe bağlı ses ve müzik ekler, sesi -14 LUFS'a ayarlar.
//
// Kullanım:
//   node birlestir.js <cikti.mp4> <parca1.mp4> <parca2.mp4> ... [--voice ses.wav] [--voice-delay 0] [--music muzik.mp3] [--music-db -20]
//
// Seslendirme önde. Müzik ölçülür ve seslendirmenin --music-db kadar altına (varsayılan 20 LU) oturtulur;
// 1 sn'de açılır, sonda 2 sn'de söner. Son karışım -14 LUFS / TP -1.5; ölçüm sonunda yazılır.
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
const flag = k => { const i = args.indexOf('--' + k); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const voice = flag('voice'), music = flag('music'), delay = parseFloat(flag('voice-delay') ?? '0'), musicDb = parseFloat(flag('music-db') ?? '-20');
const [out, ...parts] = args;
if (!out || !parts.length) { console.error('Kullanım: node birlestir.js <cikti.mp4> <parca1.mp4> ...'); process.exit(1); }
for (const p of parts) if (!existsSync(p)) { console.error('Parça yok:', p); process.exit(1); }

const run = a => { const r = spawnSync('ffmpeg', ['-nostdin', ...a], { stdio: ['ignore', 'inherit', 'inherit'] }); if (r.status) process.exit(r.status); };
// Integrated LUFS ve True Peak ölçümü
const olc = f => { const e = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const I = [...e.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1), P = [...e.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].at(-1);
  return { lufs: I ? +I[1] : null, tp: P ? +P[1] : null }; };
const dur = f => parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.toString());

const tmp = mkdtempSync(join(tmpdir(), 'hemdem-'));
const list = join(tmp, 'liste.txt');
writeFileSync(list, parts.map(p => `file '${resolve(p).replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'));
const joined = (voice || music) ? join(tmp, 'goruntu.mp4') : resolve(out);
run(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);

if (voice || music) {
  const D = dur(joined);
  const a = ['-y', '-loglevel', 'error', '-i', joined];
  const fc = [], mix = []; let i = 1;
  const vL = voice ? olc(voice).lufs : -16;
  let gain = -22;
  if (music) { const mL = olc(music).lufs; if (mL != null && vL != null) gain = +(vL + musicDb - mL).toFixed(1); console.log(`Müzik: ${mL} LUFS → ${gain} dB (sesin ${-musicDb} LU altı)`); }
  if (voice) { a.push('-i', voice); fc.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=70,adelay=${Math.round(delay * 1000)}|${Math.round(delay * 1000)},apad=whole_dur=${D}[v]`); mix.push('[v]'); i++; }
  if (music) { a.push('-i', music); fc.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gain}dB,atrim=0:${D},afade=t=in:d=1,afade=t=out:st=${Math.max(0, D - 2)}:d=2,apad=whole_dur=${D}[m]`); mix.push('[m]'); }
  fc.push(`${mix.join('')}amix=inputs=${mix.length}:duration=shortest:normalize=0,atrim=0:${D},loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000[a]`);
  a.push('-filter_complex', fc.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', resolve(out));
  run(a);
}
const son = (voice || music) ? olc(resolve(out)) : null;
console.log('Birleştirildi:', resolve(out), `(${dur(resolve(out)).toFixed(2)} sn)`, son ? `· ${son.lufs} LUFS · TP ${son.tp} dBTP` : '');
