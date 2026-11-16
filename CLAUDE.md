# Hemdem — Reels Üretim Sistemi

Psikoloji ve felsefe temalı, Türkçe Instagram reels üretim hattı. Marka, ton ve kırmızı çizgiler için önce **MARKA.md** okunur.

## Şef

**Bu projede ana oturum her zaman Şef'tir.** İçerik sahibiyle sadece Şef konuşur (`.claude/skills/sef/SKILL.md`). Agent'lar çıktılarını Şef'e teslim eder; Şef içerik üretmez, çıktıları `sef-kriterleri.md` dosyasındaki kriterlere göre değerlendirir, öneri sunar, onayı içerik sahibinden alır ve `gunluk/<tarih>/durum.md` dosyasına kaydeder. Sistemin kendisinde (agent talimatları, motor, marka rehberi) değişiklik istendiğinde Şef bunu içerik sahibinin açık isteğiyle yapar.

## Üretim hattı

Her agent bir adım üretir. Bir sonraki adıma ancak içerik sahibi onay verince geçilir. *(16 Kasım 2026: kare dizisi ayrı onay kapısı olmaktan çıktı; konu haftada bir toplu gelir.)*

| # | Agent | Çıktı | Onay |
|---|---|---|---|
| 1 | `konu-avcisi` | **Haftada bir** `gunluk/<hafta-başı-tarihi>/01-konular-hafta.md` (10–14 zamansız öneri, Z ve K karışık; özel güne 1–2 gün kala Ö için kısa ek çalıştırma → `01-konu-Ö.md`). Günlük işte Şef bu listeden ve `arsiv/saklanan-oneriler.md`'den seçtirir | Bir konu seçilir |
| 2 | `senarist` | `gunluk/<tarih>/02-metin-<kod>.md` (40–45 sn'lik video için seslendirme metni, en fazla 50 sn) | — |
| 2b | `dogrulayici` | `gunluk/<tarih>/02b-dogrulama-<kod>.md` (söz, telif, olgu, kırmızı çizgi denetimi) | Doğrulanmış metin onaylanır |
| 3 | `ses-yonetmeni` (yönerge) | `gunluk/<tarih>/02c-seslendirme-<kod>.md` + `04-video-<kod>/yonerge.json` (her cümleye ton etiketi ve durak) | Yönerge onaylanır |
| 3b | `ses-yonetmeni` (üret / düzelt / müzik) | `04-video-<kod>/ses.wav`, `hizalama.json`, `dinleme.md`, `muzik.mp3` (solo ud), `ses-notu.md` (ElevenLabs) | İçerik sahibi dinler: onay ya da cümle numarasıyla not → yalnızca o cümleler yeniden üretilir |
| 3c | `gorsel-yonetmen` | `gunluk/<tarih>/03-gorsel-plan-<kod>.md` (kurgu: 5–9 çekim, her çekimde aksiyon ve kamera hareketi, çekimler arası geçişler, cümlelere bağlı; "Hemdem Minyatür" stilinde) | Plan onaylanır |
| 4 | `video-uretici` (ön izleme; kare dizisi ve kurgu tablosu bu işin içinde) | `04-video-<kod>/film.js`, `onizleme.mp4` (yarım çözünürlük, ses + müzik), `kareler/dizi.png` (storyboard; ön izlemeyle birlikte sunulur), `kareler/cekim-*.png` | Ön izleme (+ dizi) onaylanır |
| 4c | `video-uretici` (final) | `04-video-<kod>/final.mp4` + 10 MB altı `final-instagram.mp4` (ffmpeg 2 geçiş, ~1400k video, 128k ses) | Son kontrol |
| 5 | `yayinci` | `05-yayin-<kod>.md` (Instagram açıklaması, 3–5 etiket, alt metin, kapak yazısı, paylaşım saati) | Paket onaylanır → **Şef paylaşır** (Claude in Chrome, içerik sahibinin Instagram oturumu; "Paylaş"tan önce ekranı gösterip açık onay alır) |

## Günlük ritim ve oturumlar (16 Kasım 2026)

İçerik sahibi bir videoda 5 saatlik kullanım limitini dolduruyordu (Z1: agent'larda ~1,24M token). Hedef **günde 2 video**; bunun için:

- **Günde 2 video:** öğlen **12:30–13:30** hafif (genelde K: kelime), akşam **21:00–22:00** derin (genelde Z: söz ve duygu).
- **Her video (ve akşam paylaşımı gibi ayrı işler) yeni bir oturumda yürür.** Şef gün başında `gunluk/<tarih>/durum.md`'den devam eder; uzun oturum her turu pahalandırır.
- **Konu haftada bir** toplu gelir (10–14 öneri); günlük işte Şef bu listeden ve `arsiv/saklanan-oneriler.md`'den seçtirir.
- **Agent modelleri:** `konu-avcisi`, `dogrulayici`, `yayinci`, `ses-yonetmeni` → `sonnet` (frontmatter `model: sonnet`); `senarist`, `gorsel-yonetmen`, `video-uretici` güçlü modelde kalır.
- **Müzik kütüphanesi:** `motor/muzik/KATALOG.md`. Konu çok farklı değilse eski parça kullanılır; yeni müzik yalnızca duygu belirgin farklıysa ya da uygun parça yoksa, en fazla 2 denemeyle.
- **Ses notları tek turda** toplanır. **Kare dizisi onay kapısı yok.**

`<kod>` Konu Avcısı'nın öneri kodudur (ör. `Z3`, `K1`, `Ö`). Eski günlerde görülen `G1–G4` kodları kaldırılan gündem önerileridir.

Ses (3, 3b) metin onaylanır onaylanmaz hazırlanır ve görsel planla (3c) paralel ilerleyebilir. Video ses onaylandıktan sonra üretilir; bütün zamanlarını sesten (`hizalama.json`) alır, bu yüzden sessiz taslak ve zaman haritası yoktur.

## Motor

Videolar `motor/` klasöründeki motorla kodla üretilir (Node + Chrome + ffmpeg). 15 Kasım 2026'dan itibaren stil **Hemdem Minyatür**'dür (`motor/minyatur.js`, film dosyasında `style: 'minyatur'`); eski Hemdem Eskiz motoru (`motor/eskiz.js`) yalnızca eski videolar için durur. Hazır parçalar (`M.parcalar(g)`: defter, sandık, mendil, telefon, nazarlık, bebek, oturan figür…) ve müzik kütüphanesi (`motor/muzik/`) için kılavuz: `motor/README.md`. Görsel referanslar: `tasarim/REFERANSLAR.md`.

`<tarih>` her zaman `YYYY-AA-GG` biçimindedir (ör. `2026-11-12`).

## Arşivler

- `arsiv/islenen-konular.md`: Seçilen ve işlenen her konu. Tekrarı önlemek için agent'lar bunu okur.
- `arsiv/savlar.md`: Yayınlanan her videonun Sav'ı ve kapanış cümlesi. İleride ürün ve kitap için kullanılacak.
- `arsiv/dersler.md`: Sisteme dair kalıcı kararlar ve hatalardan çıkan dersler. Şef her gün başlarken okur; bir ders ancak ilgili talimat dosyasına işlenince `işlendi` olur.
- `arsiv/olcumler.md`: Her videonun ~48. saatteki Instagram rakamları (geçilme, izlenme süresi, gönderme, kaydetme…). Şef içerik sahibinin onayıyla okur ve yazar; her 5 videoda bir özetler.

## Kurallar

- Bir konu seçildiğinde `arsiv/islenen-konular.md` dosyasına satır eklenir (durum: `seçildi`). Video yayınlanınca durum `yayınlandı` olarak güncellenir.
- Bir video yayınlandığında Sav ve kapanış sorusu `arsiv/savlar.md` dosyasına eklenir.
- Agent'lar önceki adımların dosyalarını okur, onları değiştirmez. Düzeltme gerekiyorsa içerik sahibine sorulur.
- Paylaşımı **Şef yapar** (Claude in Chrome, içerik sahibinin kendi Instagram oturumu): yükler, açıklama ve kapağı koyar, "Paylaş"a basmadan önce ekranı gösterip içerik sahibinden açık onay alır. Yükleme için 10 MB altı `final-instagram.mp4` kullanılır. Yayıncı yalnızca paketi hazırlar, paylaşmaz.
- Seslendirme 15 Kasım 2026'dan itibaren **ElevenLabs** ile yapılır (Hemdem sesi: Hasan Yasin, `motor/ses-uret.js`). İçerik sahibi kaydetmez; dinler ve not verir. API anahtarı Windows'taki `ELEVENLABS_API_KEY` değişkenindedir; hiçbir dosyaya yazılmaz. Metinler sesli okunmaya uygun yazılır.
