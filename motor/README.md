# Hemdem Motoru

Görsel planı kodla çizip dikey MP4'e çeviren motor. Her kare kodla çizilir; bilgisayardaki Chrome (ya da Edge) kareleri görüntüye çevirir, ffmpeg videoya toplar. İki stil var:

- **Hemdem Minyatür** (`minyatur.js`, 15 Kasım 2026'dan itibaren **geçerli stil**): tek bir minyatür resmi, tezhip bordürü, ışıkla parlayan altın varak, sabit parşömen altyazı. İlham: Lemo-Opuscar "Gilded Illumination" (MIT) ve Osmanlı minyatür / tezhip geleneği.
- **Hemdem Eskiz** (`eskiz.js`, eski): tonlu kâğıda titrek mürekkep, suluboya, el yazısı. İlham: Lemo-Opuscar "Urban Sketch · Pen & Wash" (MIT). Yalnızca eski videolar için.

İki motor da Hemdem için sıfırdan yazıldı, Opuscar kodu içermez. Referanslar: `../tasarim/REFERANSLAR.md`.

## Minyatür

Film dosyasında `style: 'minyatur'` yazınca motor kâğıt çizmez; film resmin tamamını çizer, motor her karenin üstüne sabit parşömen altyazıyı (`M.drawSubs`) ve tezhip bordürünü (`M.border`) ekler.

```js
window.FILM = {
  style: 'minyatur',
  duration: 42, fps: 30, seed: 11,
  subs: [{ a: 0.4, b: 2.4, text: 'Kahveni içtin.' } /* ... */],
  timeMap: null,
  render(g, t, M) {            // dünya koordinatı: 1080×1920 resim
    const cam = M.track([[0, [672, 1150, 2.3]], [5.6, [540, 960, 1]]], t);
    M.camera(g, { x: cam[0], y: cam[1], zoom: cam[2] });
    M.sky(g, 72, 72, 936, 900);
    // ... resmin tamamı
  },
  overlay(g, t, M) {           // ekran koordinatı: kartuş vb.
    M.cartouche(g, ['Bir fincan kahvenin', { text: 'kırk yıl hatırı vardır.', italic: true }], M.clamp((t - 5) / 1.2));
  },
};
```

Başlıca araçlar (`minyatur.js`):

| Araç | Ne yapar |
|---|---|
| `M.shape(g, yol, renk, koyuBant)` | Minyatür kalıbı: düz renk + içte koyu bant + mürekkep kontur |
| `M.hiLine`, `M.triad`, `M.pearls` | Üstübeç çizgi, üçlü nokta, inci dizisi |
| `M.gold(g, yol, lit)` | Altın varak; `lit = {x, y, r, k}` ışığın yeri ve gücü (`k` 0 sönük, 1 parlak) |
| `M.lantern`, `M.glow`, `M.rings`, `M.flash` | Kandil, ışık halesi, altından yayılan halkalar, parıltı |
| `M.seated`, `M.standing`, `M.head` | Oturan (bağdaş) ve ayakta figür (`dir`, `scale`, `hand`, `lean`, `step`, `cap`, `hair`, `beard`, `scarf`, `longHair`) |
| `M.sky`, `M.stars`, `M.cloud`, `M.rock`, `M.ground` | Lacivert gök, sönük altın yıldızlar, çin bulutu, süngerimsi kaya, eğik zemin |
| `M.cypress`, `M.crown`, `M.tulip`, `M.arch`, `M.cup`, `M.chain` | Servi, yaprak kümesi, lale, sivri kemer, fincan, zincir |
| `M.camera`, `M.track`, `M.prog`, `M.pop` | Resmin içinde kamera; anahtar karelerden değer; yumuşak ilerleme; yaylanarak beliriş |
| `M.cartouche` | Üst kartuş (Sav, kelime), kalemle açılır |
| `M.C`, `M.PAT` | Pigment paleti; desenler (altın varak, granüllü lacivert, adaçayı, parşömen) |

Örnek kurgu: **`ornekler/minyatur-sahneli.js`** (5 çekim, 4 geçiş; yeni filmler bu yapıyla yazılır). `ornekler/minyatur-kahvehane.js` yalnızca çizim araçlarının örneğidir (tek resim; kurgu örneği değil).

## Eskiz (eski)

Gerekenler: Node 20+, ffmpeg, Chrome ya da Edge. Kurulum: bu klasörde `npm install`.

## Dosyalar

| Dosya | Görevi |
|---|---|
| `minyatur.js` | Minyatür çizim araçları (tarayıcıda çalışır, `window.M`) — geçerli stil |
| `eskiz.js` | Eskiz çizim araçları (tarayıcıda çalışır, `window.E`) — eski stil |
| `sahne.html` | Film dosyasını yükler, fontları hazırlar, kareyi çizer |
| `render.js` | Tek kare (PNG) ya da video (MP4) üretir |
| `birlestir.js` | Video parçalarını birleştirir, ses ve müzik ekler. Müziği ölçüp sesin 20 LU altına oturtur (`--music-db`), son karışımı -14 LUFS'a ayarlar ve ölçümü yazar |
| `muzik-uret.js` | Hemdem fon müziğini (solo ud) ElevenLabs Music ile sözsüz üretir; `muzik.mp3` |
| `ses-uret.js` | **Seslendirme (15 Kasım'dan itibaren):** ElevenLabs ile cümle cümle üretir, duraklarla birleştirir; `ses.wav`, `hizalama.json` (cümle ve kelime gerçek zamanları), `dinleme.md` |
| `ses-analiz.js` | *(eski, insan kaydı için)* Ses kaydındaki konuşma bölümlerini ve duraklamaları bulur |
| `ses-temizle.js` | *(eski, insan kaydı için)* Ham kaydı temizler (gürültü, sert "s", sıkıştırma, baş/son sessizlik, -16 LUFS) ve kalite raporu verir |
| `okuma-sablon.html` | *(eski)* Okuma kartı şablonu |
| `ornekler/` | Örnek film dosyaları |

## Komutlar

Hepsi `motor/` klasöründen çalıştırılır.

```bash
# tek kare
node render.js <film.js> --still 4.5 --out kare.png

# video (sessiz). Uzun videoları 15 sn'lik parçalar halinde üret (her parça ~3 dk sürer)
node render.js <film.js> --from 0 --to 15 --out parca-1.mp4
node render.js <film.js> --from 15 --to 30 --out parca-2.mp4

# hızlı taslak: yarı çözünürlük, 24 kare/sn (yaklaşık 4 kat hızlı)
node render.js <film.js> --scale 0.5 --fps 24 --out taslak.mp4

# parçaları birleştir (+ ses + müzik)
node birlestir.js final.mp4 parca-1.mp4 parca-2.mp4 parca-3.mp4 parca-4.mp4 --voice ses.wav --music muzik.mp3 [--music-db -20]

# fon müziği üret (ElevenLabs Music, solo ud kalıbı)
node muzik-uret.js <klasor> --sure 48 [--istem "slightly melancholic, a hint of hope"]

# seslendirme üret (ElevenLabs; anahtar Windows'taki ELEVENLABS_API_KEY değişkeninden okunur)
node ses-uret.js <yonerge.json> <klasor> --dene        # yalnızca harcanacak karakteri ve kalan kotayı gösterir
node ses-uret.js <yonerge.json> <klasor>               # değişen ya da eksik cümleleri üretir, birleştirir
node ses-uret.js <yonerge.json> <klasor> --sadece 4,7  # bu cümleleri aynı ayarla yeniden dener

# (eski) insan kaydını çözümle
node ses-analiz.js ses.wav --json ses-analiz.json
```

Hız: 1080×1920, 30 kare/sn'de 1 sn video ≈ 10–12 sn üretim süresi.

## Film dosyası

Her video bir `film.js` dosyasıdır ve `window.FILM` nesnesini tanımlar:

```js
window.FILM = {
  duration: 58,            // plan zamanına göre toplam süre (sn)
  fps: 30,
  paper: '#1F2A3A',        // kâğıt rengi (MARKA.md paletinden)
  ink: '#EDE7DE',          // mürekkep ve yazı rengi
  accent: '#E2A65A',       // renkli nesnenin rengi
  seed: 12,                // kâğıt dokusu tohumu
  subs: [                  // altyazılar (plan zamanı). hidden: true olanlar çizilmez
    { a: 0.0, b: 1.3, text: 'Mesajı yazdın.' },
    { a: 23.4, b: 26.0, text: '...', hidden: true },
  ],
  timeMap: null,           // gerçek ses kaydına uydurmak için (aşağıda)
  setup(E) { /* çizimleri bir kez hazırla: this.x = E.drawing(...) */ },
  render(g, t, E) { /* t anındaki kareyi çiz (t = plan zamanı) */ },
};
```

- `setup` bir kez çalışır. Bütün `E.drawing`, `E.wash` nesnelerini burada üret (pahalıdır).
- `render` her karede çalışır. Kâğıt otomatik çizilir, altyazılar otomatik eklenir.
- `render` içinde `E.camera(g, {x, y, zoom})` ile dünya koordinatlarına geç; ekran koordinatında yazı için `g.setTransform(1,0,0,1,0,0)`.
- Ekran 1080×1920. Altyazı alanı alttan ~300 px (y ≈ 1620). Önemli çizimleri y < 1500 tut.
- Örnek: `ornekler/figur-denemesi.js` ve `gunluk/2026-11-12/04-video-Z3/stil-karesi.js`.

## Çekimler ve geçişler (15 Kasım 2026)

Video tek resim değildir: 5–9 çekim, her çekimde aksiyon ve hareket eden kamera, çekimler arası tasarlanmış geçişler.

```js
render(g, t, M) {
  const oda = (g, t) => { M.camera(g, {...}); /* odanın dünyası */ };
  const ani = (g, t) => { M.camera(g, {...}); /* anının dünyası */ };
  M.cekimler(g, t, [
    { a: 0,          b: M.c(5).bas, ciz: oda, gecis: { tur: 'esles' } },
    { a: M.c(5).bas, b: M.c(6).bas, ciz: ani, gecis: { tur: 'silme', d: 1.0, on: 'servi' } },
    { a: M.c(6).bas, b: 99,         ciz: ic },
  ]);
}
```

| Geçiş | Ne yapar | Ayarlar |
|---|---|---|
| `kesme` | sert kesme | — |
| `esles` | eşleşen şekil kesmesi + kısa altın parıltı; şekillerin aynı yerde, aynı büyüklükte olmasını çekimlerin kameraları sağlar | — |
| `silme` | önden geniş bir ön plan (servi sırası / bulut) geçer, arkasında sahne değişir; kesme anı tam ortada | `d` (sn), `on: 'servi' \| 'bulut' \| fn(g, x0, w, t)` |
| `cerceve` | kamera A'daki bir açıklığın (kapı, kemer, pencere) içine dalar; açıklıkta B görünür; A o anda donar | `d`, `delik` (Path2D, A'nın ekran koordinatı), `kutu: [x, y, w, h]` |
| (kesintisiz) | aynı çekim içinde `M.track` ile kamera yolculuğu | — |

Hareket araçları: `M.yuru(t, t0, d, x0, x1)` → `{x, step, bob}` (ayakta figüre `step`, `bob` ver), `M.gul(t, t0, d)` → `{bob, tilt, agiz}` (figüre aynen ver), figürlerde `lean` (eğilme), `hand` (`M.track` ile el yolu), `tilt` (baş), `agiz` (gülen ağız). `M.cupR(g, x, y, rot, {gold, lit, kahve})` fincanı açıyla çizer (π = ters), `M.saucer` tabağı. Kamera yaklaştıkça konturlar otomatik incelir (`M.lwK`).

`sonCumle: N` filmi ilk N cümleyle sınırlar (deneme için); bu durumda `ses.wav`'ı da N. cümlenin sonunda kes (`ffmpeg -af atrim=0:<son>`), yoksa sonraki cümlenin başı videoya taşar.

## Ses zamanı (15 Kasım 2026'dan itibaren)

Ses videodan önce üretilir (`ses-uret.js`). `render.js`, film dosyasının klasöründe `hizalama.json` varsa onu sayfaya verir (başka bir dosya için `--hizalama <yol>`). Film bütün zamanlarını sesten alır; elle saniye yazılmaz.

| Araç | Ne verir |
|---|---|
| `M.c(n)` | n. cümle: `{ bas, son, metin, kelimeler }` (gerçek saniye, 1'den başlar) |
| `M.k(n, 'kelime', sira?)` | n. cümlede o kelimenin başladığı saniye (büyük/küçük harf, noktalama önemsiz; ek almış hâli de bulur) |
| `M.sesSure` | seslendirmenin toplam süresi |
| `subs: 'ses'` | altyazılar cümlelerden otomatik kurulur; parşömene sığmayan cümle kelime sınırından ikiye bölünür, her parça kendi kelimesinin söylendiği anda gelir |
| `gizli: [12]` | bu cümleler altyazıda gösterilmez (ör. Sav kartuşta yazılırken) |
| `kapanis: 2.5` | son cümleden sonra ekranda kalma süresi; `duration` verilmezse süre = ses + kapanış |

```js
window.FILM = {
  style: 'minyatur', subs: 'ses', kapanis: 2.5,
  render(g, t, M) {
    const lamba = M.prog(t, M.c(3).bas, 1.2);               // 3. cümle başlarken kandil yanar
    const altin = M.prog(t, M.k(5, 'fincanı'), 1.0);         // "fincanı" denildiği an ışık fincana değer
    const cam = M.track([[0, [672, 1150, 2.3]], [M.c(9).bas - 0.6, [672, 1150, 2.3]], [M.c(9).bas + 0.3, [540, 960, 1]]], t);
    // ...
  },
};
```

Ses `duzelt` turunda değişirse `hizalama.json` yenilenir; film kendiliğinden yeni sese oturur.

### (Eski) Zaman eşleme (`timeMap`)
İnsan kaydı dönemindeki filmler plan zamanıyla yazılıp `timeMap: [[planSn, gercekSn], ...]` ile kayda kaydırılıyordu. Yeni filmlerde kullanılmaz.

## Araçlar (`E`)

### Zaman ve matematik
- `E.prog(t, a, b, easing?)` → t'nin [a,b] aralığındaki ilerlemesi 0..1 (varsayılan yumuşak). Doğrusal için `x => x`.
- `E.lerp(a, b, p)`, `E.clamp(v)`, `E.ease`, `E.easeOut`, `E.rng(seed)`, `E.noise1(x, seed)`
- `E.camLerp(camA, camB, p)` → iki kamera arası.

### Geometri (nokta dizisi döndürür)
- `E.line(x1,y1,x2,y2)`, `E.curve([[x,y],...])` (noktalardan geçen yumuşak eğri), `E.ellipse(cx,cy,rx,ry,a0?,a1?)`
- `E.rectLines(x,y,w,h)` (dört ayrı çizgi, listeyi yay: `...E.rectLines()`), `E.roundRect(x,y,w,h,r)`

### Hazır figür ve eşyalar (nokta dizisi **listesi** döndürür)
- `E.bustBack(x, y, s, {tilt, slump, bun})` → sırtı dönük baş ve omuz (s=1: ~260×300 px; x,y başın tepesi). `slump` 0..1 omuz düşüklüğü (yorgunluk: 0.6–0.9), `tilt` başın eğimi, `bun: true` topuz (yaşlı bir kadın figürü). Dolgu için `E.bustBackFill` aynı seçeneklerle `{body, head, bun}` verir.
- `E.sittingBack(x, y, s, {tilt, slump})` → oturan, sırtı dönük figür (s=1: ~300×520 px)
- `E.teaGlass(x, y, s)` → ince belli çay bardağı ve tabak (x,y tabağın ortası)
- `E.phone(x, y, w, h)` → telefon; `.screen` ekran dikdörtgenini verir
- `E.windowFrame(x, y, w, h)`, `E.railing(x, y, w, h, n)`, `E.speechBubble(x, y, w, h, 'left'|'right')`

Yüz asla çizilmez. Gerçek kişiler portre olarak çizilmez.

### Çizim
- `E.stroke(points, {width, wobble, color, gaps, overshoot, seed})` → tek çizgi
- `E.drawing(listOfPoints, {seed, width})` → çizim; `.draw(g, p, {boil})` p (0..1) kadarını **çizim sırasıyla** çizer
- `E.drawStroke(g, stroke, p, {boil})`
- `boil`: çizgilerin hafif kıpırdaması. Her karede `1 + (Math.floor(t * 12) % 4)` ver.

### Suluboya
- `E.wash(shape, {color, alpha, rough, reserve, glow, offset, origin, seed})` → leke. `shape`: kapalı nokta dizisi ya da `{cx, cy, r}` / `{cx, cy, rx, ry}`.
  - `alpha` 0.5–0.9; `rough` kenar pürüzü (küçük nesne 5–10, büyük alan 25–45); `glow` 0..1 koyu kâğıtta ışık etkisi; `origin` rengin yayıldığı nokta.
- `.draw(g, reveal, alpha)` → `reveal` 0..1 rengin gelişi (origin'den yayılır); geri çekilme için `reveal`'i 1'den 0'a indir; `alpha` ile solma.
- Büyük alanlar için `E.wash` değil **`E.bloom`** kullan (aşağıda).

### Büyük renk yayılımı
- `E.bloom({cx, cy, rx, ry}, {color, alpha, glow, origin, seed, count, dabs, holes})` → sayfanın büyük bir bölümüne yayılan suluboya: üst üste binen düzensiz lekeler, kenarda dağılan damlalar, içeride kâğıdın göründüğü küçük boşluklar. "Renk bütün sayfaya yayılıyor", "renk camdan taşıyor" gibi anlar için. `alpha` 0.6–0.8.
- `.draw(g, reveal, alpha)` → `reveal` 0..1, `origin`'den yumuşak kenarlı bir ıslak cepheyle yayılır.

### Dolgu (siluet)
- `E.fillPoly(g, points, color?, alpha?)` → kapalı şekli kâğıt rengiyle doldurur, arkasındaki çizgi ve rengi örter. Önce dolgu, sonra figürün çizgileri.
- `E.bustBackFill(x, y, s, opts)` → `bustBack` ile aynı parametreler; `{body, head}` dolgu şekillerini verir. Figürlerin önündeki/arkasındaki çizgilerden ayrışması ve **siluet olarak okunması** için insan figürlerinde her zaman kullan.

### Yazı
- `E.hand(g, lines, x, y, {size, align, p, color, lineHeight})` → el yazısı (Caveat). `p` 0..1 soldan sağa yazılış. Satır başına en fazla ~22 karakter (size 70).
- `E.subtitle(g, text, {y, alpha})` → elle altyazı (normalde `subs` yeterli).
- `E.signature(g, alpha)` → ortada "Hemdem" imzası (Fraunces).

### Geçiş
- `E.pageTurn(g, p, drawOld, drawNew)` → sağdan sola sayfa çevirme. `drawOld`/`drawNew` fonksiyonları kendi kamera ayarlarını yapmalı.

## Bilinen sınırlar
- Kalem sesi ve ortam sesi motor tarafından üretilmez. Müzik `muzik-uret.js` ile üretilir.
- El ve parmak, kalabalık, yüz ifadesi, hızlı aksiyon çizilmez (görsel planda yedeğe düş).
- Figürler basit ve sembolik; amaç tanınmak değil, kendini koyabileceğin bir yer bırakmak.
