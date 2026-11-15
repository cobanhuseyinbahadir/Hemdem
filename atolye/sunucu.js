'use strict';
// Hemdem Atölyesi — salt okuyan küçük yerel sunucu.
// Claude Code'un Hemdem oturum kayıtlarından (alt ajan meta + transkript kuyruğu) ve bugünkü
// gunluk/<tarih>/durum.md dosyasından masanın durumunu çıkarır. Hiçbir ajanı başlatmaz, hiçbir dosyaya yazmaz.
// Ön yüze: ajan türü, görev başlığı, araç adı + kısa hedef (dosya adı vb.), yazılan dosya adları, zamanlar,
// durum tablosu ve biten ajanın Şef'e bıraktığı teslim notu gider. Prompt, Şef'le konuşman ve dosya içeriği gönderilmez.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const KOK = path.resolve(__dirname, '..');
const PORT = Number(process.env.ATOLYE_PORT) || 8797;
const PROJE = process.env.ATOLYE_PROJE ||
  path.join(os.homedir(), '.claude', 'projects', KOK.replace(/[^A-Za-z0-9]/g, '-'));
const GUNLUK = path.join(KOK, 'gunluk');

const AJANLAR = ['sef', 'konu-avcisi', 'senarist', 'dogrulayici', 'gorsel-yonetmen', 'ses-yonetmeni', 'video-uretici'];
const CALISIYOR_SN = 30 * 60;   // bitmemiş ve son 30 dk içinde yazılmış alt ajan "çalışıyor" sayılır
const SEF_AKTIF_SN = 90;        // ana oturum son 90 sn içinde yazıldıysa Şef "çalışıyor"
const KUYRUK = 900000;          // büyük Write içerikleri kuyruğu doldurabiliyor; son adımları yakalamak için geniş
const BAS = 8000;

// ---------- yardımcılar ----------
const kisalt = (s, n = 60) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};
const yerelTarih = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function parcaOku(dosya, bas, uzunluk) {
  const fd = fs.openSync(dosya, 'r');
  try {
    const buf = Buffer.alloc(uzunluk);
    const n = fs.readSync(fd, buf, 0, uzunluk, bas);
    return buf.subarray(0, n).toString('utf8');
  } finally { fs.closeSync(fd); }
}

function satirlar(metin, ilkiAt) {
  const s = metin.split('\n');
  if (ilkiAt) s.shift();
  const out = [];
  for (const l of s) {
    if (!l.trim()) continue;
    try { out.push(JSON.parse(l)); } catch { /* yarım satır */ }
  }
  return out;
}

function hedef(ad, g) {
  g = g || {};
  if (g.file_path) return path.basename(String(g.file_path));
  if (g.notebook_path) return path.basename(String(g.notebook_path));
  if (ad === 'Bash' || ad === 'PowerShell') {
    if (g.description) return kisalt(g.description, 50);
    const ilk = String(g.command || '').trim().split(/\s+/).find(w => !/^\w+=/.test(w));
    return kisalt(ilk || '', 30);
  }
  if (ad === 'Agent' || ad === 'Task') return kisalt(g.subagent_type || g.description, 40);
  if (ad === 'Skill') return kisalt(g.skill, 30);
  if (g.url) { try { return new URL(g.url).hostname; } catch { return ''; } }
  if (g.pattern) return kisalt(g.pattern, 40);
  if (g.query) return kisalt(g.query, 50);
  if (g.description) return kisalt(g.description, 50);
  return '';
}

// Transkript kuyruğundan son araç ve son yazılan dosya.
function kuyrukOzeti(dosya, boyut) {
  const bas = Math.max(0, boyut - KUYRUK);
  const kayitlar = satirlar(parcaOku(dosya, bas, boyut - bas), bas > 0);
  let arac = null, sonDosya = null, sonZaman = null, teslim = '', sonMetin = '';
  const adimlar = [], dosyalar = [];
  for (const k of kayitlar) {
    if (k.timestamp) sonZaman = k.timestamp;
    const icerik = k.type === 'assistant' && k.message && Array.isArray(k.message.content) ? k.message.content : [];
    for (const b of icerik) {
      if (b.type === 'text' && b.text && b.text.trim()) sonMetin = b.text;
      if (b.type !== 'tool_use') continue;
      if (b.name === 'SubagentHandback' && b.input && b.input.message) teslim = String(b.input.message);
      arac = { ad: b.name, hedef: hedef(b.name, b.input), zaman: k.timestamp || null };
      adimlar.push(arac);
      if ((b.name === 'Write' || b.name === 'Edit') && b.input && b.input.file_path) {
        sonDosya = path.basename(String(b.input.file_path));
        const i = dosyalar.indexOf(sonDosya);
        if (i >= 0) dosyalar.splice(i, 1);
        dosyalar.push(sonDosya);
      }
    }
  }
  // Teslim notu: ajanın Şef'e bıraktığı rapor (yoksa son yazdığı metin).
  teslim = (teslim || sonMetin).trim();
  if (teslim.length > 1800) teslim = teslim.slice(0, 1799) + '…';
  return { arac, sonDosya, sonZaman, adimlar: adimlar.slice(-12), dosyalar: dosyalar.slice(-10), teslim };
}

function ilkZaman(dosya) {
  const k = satirlar(parcaOku(dosya, 0, BAS), false);
  for (const s of k) if (s.timestamp) return s.timestamp;
  return null;
}

// ---------- alt ajan taraması ----------
const onbellek = new Map(); // jsonl yolu -> {anahtar, ozet}

function altAjanlariTara() {
  const kosular = [];
  let oturumlar = [];
  try { oturumlar = fs.readdirSync(PROJE, { withFileTypes: true }).filter(d => d.isDirectory()); } catch { return kosular; }
  const bugun = yerelTarih();
  for (const o of oturumlar) {
    const klasor = path.join(PROJE, o.name, 'subagents');
    let dosyalar;
    try { dosyalar = fs.readdirSync(klasor); } catch { continue; }
    for (const ad of dosyalar) {
      if (!ad.endsWith('.meta.json')) continue;
      const metaYol = path.join(klasor, ad);
      const jsonl = metaYol.replace(/\.meta\.json$/, '.jsonl');
      let st, mst;
      try { st = fs.statSync(jsonl); mst = fs.statSync(metaYol); } catch { continue; }
      if (yerelTarih(st.mtime) !== bugun) continue; // yalnız bugün yazılmış koşular
      const anahtar = `${st.mtimeMs}:${st.size}:${mst.mtimeMs}`;
      let kayit = onbellek.get(jsonl);
      if (!kayit || kayit.anahtar !== anahtar) {
        let meta = {};
        try { meta = JSON.parse(fs.readFileSync(metaYol, 'utf8')); } catch { /* yazılıyor olabilir */ }
        const ky = kuyrukOzeti(jsonl, st.size);
        const bas = (kayit && kayit.ozet.bas) || ilkZaman(jsonl) || st.birthtime.toISOString();
        kayit = {
          anahtar,
          ozet: {
            id: ad.replace(/\.meta\.json$/, ''),
            tur: String(meta.agentType || 'alt-ajan'),
            gorev: kisalt(meta.description, 90),
            bitti: meta.finished === true,
            bas,
            son: ky.sonZaman || st.mtime.toISOString(),
            arac: ky.arac,
            sonDosya: ky.sonDosya,
            adimlar: ky.adimlar,
            dosyalar: ky.dosyalar,
            teslim: ky.teslim,
            mtime: st.mtimeMs,
          },
        };
        onbellek.set(jsonl, kayit);
      }
      kosular.push(kayit.ozet);
    }
  }
  return kosular;
}

// ---------- Şef (ana oturum) ----------
let sefOnbellek = { anahtar: '', ozet: null };
function sefTara() {
  let enYeni = null;
  try {
    for (const ad of fs.readdirSync(PROJE)) {
      if (!ad.endsWith('.jsonl')) continue;
      const yol = path.join(PROJE, ad);
      const st = fs.statSync(yol);
      if (!enYeni || st.mtimeMs > enYeni.st.mtimeMs) enYeni = { yol, st };
    }
  } catch { return null; }
  if (!enYeni) return null;
  const anahtar = `${enYeni.yol}:${enYeni.st.mtimeMs}:${enYeni.st.size}`;
  if (sefOnbellek.anahtar !== anahtar) {
    sefOnbellek = { anahtar, ozet: { ...kuyrukOzeti(enYeni.yol, enYeni.st.size), mtime: enYeni.st.mtimeMs } };
  }
  return sefOnbellek.ozet;
}

// ---------- durum.md ----------
const ISTASYONLAR = [
  { k: 'konu', ad: 'Konu', re: /konu/i, ajan: 'konu-avcisi' },
  { k: 'metin', ad: 'Metin', re: /metin/i, ajan: 'senarist' },
  { k: 'dogrulama', ad: 'Doğrulama', re: /doğrula/i, ajan: 'dogrulayici' },
  { k: 'gorsel', ad: 'Görsel plan', re: /kurgu|görsel/i, ajan: 'gorsel-yonetmen' },
  { k: 'okuma', ad: 'Okuma kartı', re: /okuma/i, ajan: 'ses-yonetmeni' },
  { k: 'taslak', ad: 'Taslak', re: /taslak/i, ajan: 'video-uretici' },
  { k: 'ses', ad: 'Ses', re: /^ses|ses işle/i, ajan: 'ses-yonetmeni' },
  { k: 'final', ad: 'Final', re: /final/i, ajan: 'video-uretici' },
  { k: 'yayin', ad: 'Yayın', re: /yayın/i, ajan: null },
];

function durumSinifi(s) {
  if (!s) return 'bekliyor';
  if (/✅/.test(s)) return 'tamam';
  if (/🟡|⏳|bekli/i.test(s)) return 'onay';
  if (/⏸/.test(s)) return 'durdu';
  if (/⛔|kurulmadı|iptal/i.test(s)) return 'yok';
  if (/🔄|sürüyor|üretiliyor|yazılıyor/i.test(s)) return 'suruyor';
  return 'bekliyor';
}

function durumOku() {
  let gunler = [];
  try { gunler = fs.readdirSync(GUNLUK).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort(); } catch { /* yok */ }
  const bugun = yerelTarih();
  const gun = gunler.includes(bugun) ? bugun : gunler[gunler.length - 1];
  const sonuc = { gun: gun || bugun, bugunMu: gun === bugun, konu: '', sonKarar: '', istasyonlar: [] };
  let metin = '';
  if (gun) { try { metin = fs.readFileSync(path.join(GUNLUK, gun, 'durum.md'), 'utf8'); } catch { /* yok */ } }
  const konu = metin.match(/\*\*Seçilen konu:\*\*\s*(.+)/);
  if (konu) sonuc.konu = kisalt(konu[1].replace(/\*/g, ''), 140);

  // "Adım" sütunlu tabloların sonuncusu güncel hâldir (iptal sonrası yeni tablo açılabiliyor).
  const satir = metin.split(/\r?\n/);
  let tablolar = [], blok = [];
  for (const l of satir) {
    if (l.trim().startsWith('|')) blok.push(l);
    else if (blok.length) { tablolar.push(blok); blok = []; }
  }
  if (blok.length) tablolar.push(blok);
  tablolar = tablolar.filter(b => /Adım/.test(b[0]));
  const son = tablolar[tablolar.length - 1] || [];
  const hucre = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const baslik = son.length ? hucre(son[0]) : [];
  const iAdim = baslik.findIndex(c => /Adım/.test(c));
  const iDurum = baslik.findIndex(c => /Durum/.test(c));
  const iNot = baslik.findIndex(c => /Not/.test(c));
  const iDosya = baslik.findIndex(c => /Dosya/.test(c));
  const satirlarT = son.slice(2).map(hucre);

  for (const ist of ISTASYONLAR) {
    const r = satirlarT.find(c => ist.re.test(c[iAdim] || ''));
    sonuc.istasyonlar.push({
      k: ist.k, ad: ist.ad, ajan: ist.ajan,
      durum: r ? durumSinifi(r[iDurum]) : 'bekliyor',
      etiket: r ? kisalt((r[iDurum] || '').replace(/[✅🟡⏳⏸️⛔🔄]/gu, ''), 40) : '',
      not: r && iNot >= 0 ? kisalt(r[iNot], 120) : '',
      dosya: r && iDosya >= 0 ? kisalt(r[iDosya], 60) : '',
    });
  }

  const kIdx = metin.lastIndexOf('## Kararlar');
  if (kIdx >= 0) {
    const sonra = metin.slice(kIdx).split(/\r?\n/).slice(1);
    let sonMadde = '';
    for (const l of sonra) {
      if (/^##\s/.test(l)) break;
      if (/^-\s/.test(l)) sonMadde = l.slice(2);
    }
    sonuc.sonKarar = kisalt(sonMadde.replace(/\*/g, ''), 220);
  }
  return sonuc;
}

// ---------- birleşik durum + olay günlüğü ----------
let olaylar = [];
let oncekiKosu = new Map(); // id -> bitti
let ilkTur = true;

function olayEkle(o) {
  olaylar.push(o);
  olaylar.sort((a, b) => (a.zaman < b.zaman ? -1 : 1));
  if (olaylar.length > 80) olaylar = olaylar.slice(-80);
}

function anlikDurum() {
  const simdi = Date.now();
  const kosular = altAjanlariTara();
  const ajanlar = {};
  for (const id of AJANLAR) ajanlar[id] = { id, durum: 'bosta', kosu: null, bugun: [], yardimci: 0 };

  for (const k of kosular) {
    const id = AJANLAR.includes(k.tur) && k.tur !== 'sef' ? k.tur : 'sef';
    const calisiyor = !k.bitti && (simdi - k.mtime) / 1000 < CALISIYOR_SN;
    const ozet = { gorev: k.gorev, bas: k.bas, son: k.son, bitti: k.bitti, calisiyor, arac: k.arac, sonDosya: k.sonDosya,
      adimlar: k.adimlar, dosyalar: k.dosyalar, teslim: k.bitti ? k.teslim : '', tur: k.tur };
    if (id === 'sef') { ajanlar.sef.yardimci++; if (calisiyor) ajanlar.sef.yardimciCalisiyor = true; }
    else {
      ajanlar[id].bugun.push(ozet);
      if (calisiyor) { ajanlar[id].durum = 'calisiyor'; if (!ajanlar[id].kosu || ozet.son > ajanlar[id].kosu.son) ajanlar[id].kosu = ozet; }
    }

    const onceki = oncekiKosu.get(k.id);
    const kim = id === 'sef' ? `Şef'in yardımcısı (${k.tur})` : id;
    if (onceki === undefined) {
      olayEkle({ zaman: k.bas, ajan: id, tur: 'basladi', metin: k.gorev, kim, sessiz: ilkTur });
      if (k.bitti) olayEkle({ zaman: k.son, ajan: id, tur: 'bitti', metin: k.gorev, kim, sessiz: ilkTur });
    } else if (!onceki && k.bitti) {
      olayEkle({ zaman: k.son, ajan: id, tur: 'bitti', metin: k.gorev, kim });
    }
    oncekiKosu.set(k.id, k.bitti);
  }
  ilkTur = false;
  for (const id of AJANLAR) ajanlar[id].bugun.sort((a, b) => (a.bas < b.bas ? 1 : -1));

  const sef = sefTara();
  if (sef) {
    const aktif = (simdi - sef.mtime) / 1000 < SEF_AKTIF_SN;
    ajanlar.sef.durum = aktif ? 'calisiyor' : 'bosta';
    // Şef'in konuşma metni gönderilmez; yalnız attığı adımlar.
    ajanlar.sef.kosu = { arac: sef.arac, sonDosya: sef.sonDosya, son: sef.sonZaman, calisiyor: aktif, adimlar: sef.adimlar, dosyalar: sef.dosyalar };
  }

  return { simdi: new Date(simdi).toISOString(), ...durumOku(), ajanlar, olaylar };
}

// ---------- HTTP ----------
const STATIK = { '/': 'index.html', '/index.html': 'index.html' };
const IZINLI_HOST = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

const sunucu = http.createServer((req, res) => {
  if (!IZINLI_HOST.has(String(req.headers.host || ''))) { res.writeHead(403); return res.end('yasak'); }
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  const yol = new URL(req.url, 'http://x').pathname;
  const ortak = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (yol === '/api/durum') {
    let govde;
    try { govde = JSON.stringify(anlikDurum()); }
    catch (e) { res.writeHead(500, ortak); return res.end(JSON.stringify({ hata: String(e.message) })); }
    res.writeHead(200, { ...ortak, 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(govde);
  }
  if (STATIK[yol]) {
    fs.readFile(path.join(__dirname, STATIK[yol]), (e, veri) => {
      if (e) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { ...ortak, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(veri);
    });
    return;
  }
  res.writeHead(404); res.end();
});

sunucu.listen(PORT, '127.0.0.1', () => {
  console.log(`Hemdem Atölyesi: http://127.0.0.1:${PORT}`);
  console.log(`Oturum kayıtları: ${PROJE}${fs.existsSync(PROJE) ? '' : '  (bulunamadı!)'}`);
});
