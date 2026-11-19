// Kullanım:  node render.mjs [--out intro.mp4] [--still 3.2] [--fps 60]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, '../motor/package.json'));
const puppeteer = require('puppeteer-core');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const out = resolve(opt('out', resolve(here, 'intro.mp4')));
const still = opt('still');

const chrome = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);

const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--allow-file-access-from-files', '--font-render-hinting=none', '--force-color-profile=srgb'] });
const page = await browser.newPage();
page.on('pageerror', e => console.error('Sayfa hatası:', e.message));
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve(here, 'index.html')).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const info = await page.evaluate(() => window.ready);
const fps = parseInt(opt('fps', String(info.fps)), 10);
const shot = async t => { await page.evaluate(t => window.renderFrame(t), t); return page.screenshot({ type: 'png' }); };

if (still) {
  const f = resolve(opt('out', resolve(here, `kare-${still}.png`)));
  writeFileSync(f, await shot(parseFloat(still)));
  console.log('Kare:', f);
} else {
  mkdirSync(dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(info.duration * fps);
  for (let i = 0; i < n; i++) {
    const buf = await shot(i / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stdout.write(`\r${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('\nVideo:', out);
}
await browser.close();
