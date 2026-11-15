import fs from 'node:fs'; import { execSync } from 'node:child_process';
const res = JSON.parse(fs.readFileSync('sonuc.json'));
for (const r of res) {
  const a = JSON.parse(fs.readFileSync(r.f.replace('.mp3','.json')));
  const s = a.characters.join(''); const close = s.indexOf(']');
  const tagDur = close>0 ? (a.character_end_times_seconds[close]-a.character_start_times_seconds[0]) : 0;
  let i = close>0 ? close+1 : 0; while (a.characters[i]===' ') i++;
  const firstChar = a.character_start_times_seconds[i];
  const e = execSync(`ffmpeg -hide_banner -i ${r.f} -af "silencedetect=n=-40dB:d=0.15,volumedetect" -f null - 2>&1`).toString();
  const sil = [...e.matchAll(/silence_end: ([\d.]+)/g)].map(m=>+m[1]);
  const onset = sil[0] ?? 0; const mean = e.match(/mean_volume: ([-\d.]+)/)?.[1]; const dur = e.match(/Duration: 00:00:([\d.]+)/)?.[1];
  console.log(r.f.padEnd(28), 'süre', dur, '| ort.ses', mean, 'dB | etiket süresi', tagDur.toFixed(2), '| hizadaki ilk harf', firstChar.toFixed(2), '| gerçek ilk ses', onset.toFixed(2));
}
