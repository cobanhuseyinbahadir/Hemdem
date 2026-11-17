// Hemdem render: film dosyasını kare kare çizip MP4'e (ya da tek kareyi PNG'ye) çevirir.
//
// Kullanım:
//   node render.js <film.js> --still 4.5 --out kare.png          tek kare
//   node render.js <film.js> --out taslak.mp4 [--fps 30] [--scale 0.5] [--from 0 --to 5]
//   node render.js <film.js> --out final.mp4 --voice ses.wav [--music muzik.mp3] [--voice-delay 0]
//
// Ses varsa: seslendirme önde, müzik -24 dB civarında altında, son karışım -14 LUFS.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const film = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!film || !existsSync(film)) { console.error('Film dosyası bulunamadı:', film); process.exit(1); }

const out = resolve(opt('out', 'cikti.mp4'));
const still = opt('still');
const scale = parseFloat(opt('scale', '1'));
const voice = opt('voice'), music = opt('music');
const voiceDelay = parseFloat(opt('voice-delay', '0'));
mkdirSync(dirname(out), { recursive: true });

const chromes = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const executablePath = process.env.CHROME_PATH || chromes.find(existsSync);
if (!executablePath) { console.error('Chrome ya da Edge bulunamadı. CHROME_PATH ile yol verin.'); process.exit(1); }

const browser = await puppeteer.launch({
  executablePath, headless: true,
  args: ['--allow-file-access-from-files', '--disable-web-security', '--font-render-hinting=none', '--force-color-profile=srgb'],
});
const page = await browser.newPage();
page.on('pageerror', e => console.error('Sayfa hatası:', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('Konsol:', m.text()); });
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: scale });
// film klasöründe hizalama.json varsa (ElevenLabs sesinin cümle/kelime zamanları) sayfaya verilir: M.c(), M.k(), subs: 'ses'
const hizPath = opt('hizalama', resolve(dirname(resolve(film)), 'hizalama.json'));
if (existsSync(hizPath)) {
  const hiz = readFileSync(hizPath, 'utf8');
  await page.evaluateOnNewDocument(`window.HIZALAMA = ${hiz};`);
}
// --maske: Instagram'ın kırptığı ve arayüzle kapladığı alanlar kareye kırmızı çizilir (yalnızca denetim; videoya konmaz)
if (args.includes('--maske')) await page.evaluateOnNewDocument('window.INSTA_MASKE = true;');
const url = pathToFileURL(resolve(here, 'sahne.html')).href + '?film=' + encodeURIComponent(pathToFileURL(resolve(film)).href);
await page.goto(url, { waitUntil: 'load' });
const info = await page.evaluate(() => window.ready);
const fps = parseInt(opt('fps', String(info.fps)), 10);

async function frame(t) {
  await page.evaluate(t => window.renderFrame(t), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 }, optimizeForSpeed: true });
}

if (still !== undefined) {
  const buf = await frame(parseFloat(still));
  writeFileSync(out, buf);
  console.log('Kare yazıldı:', out);
  await browser.close();
  process.exit(0);
}

const t0 = parseFloat(opt('from', '0')), t1 = parseFloat(opt('to', String(info.duration)));
const n = Math.round((t1 - t0) * fps);
const W = Math.round(1080 * scale / 2) * 2, H = Math.round(1920 * scale / 2) * 2;

const ff = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
if (voice) ff.push('-itsoffset', String(voiceDelay), '-i', voice);
if (music) ff.push('-i', music);
const vf = `scale=${W}:${H}:flags=lanczos,format=yuv420p`;
if (voice || music) {
  const parts = []; let mix = [];
  let idx = 1;
  if (voice) { parts.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=70[v]`); mix.push('[v]'); idx++; }
  if (music) { parts.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-22dB,atrim=0:${t1 - t0},afade=t=out:st=${Math.max(0, t1 - t0 - 1.5)}:d=1.5[m]`); mix.push('[m]'); }
  parts.push(`${mix.join('')}amix=inputs=${mix.length}:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]`);
  ff.push('-filter_complex', parts.join(';'), '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k');
}
ff.push('-vf', vf, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(fps), '-t', String(t1 - t0), '-movflags', '+faststart', out);

const proc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
const started = Date.now();
for (let i = 0; i < n; i++) {
  const buf = await frame(t0 + i / fps);
  if (!proc.stdin.write(buf)) await new Promise(r => proc.stdin.once('drain', r));
  if (i % fps === 0) process.stdout.write(`\r${Math.round((i / n) * 100)}%  (${i}/${n} kare, ${((Date.now() - started) / 1000).toFixed(0)} sn)`);
}
proc.stdin.end();
await new Promise(r => proc.on('close', r));
await browser.close();
console.log(`\nVideo yazıldı: ${out}  (${n} kare, ${((Date.now() - started) / 1000).toFixed(0)} sn)`);
