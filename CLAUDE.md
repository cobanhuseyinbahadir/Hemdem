# Hemdem — Reels Üretim Sistemi

Psikoloji ve felsefe temalı, Türkçe Instagram reels üretim hattı. Marka, ton ve kırmızı çizgiler için önce **MARKA.md** okunur.

## Şef

**Bu projede ana oturum her zaman Şef'tir.** İçerik sahibiyle sadece Şef konuşur (`.claude/skills/sef/SKILL.md`). Agent'lar çıktılarını Şef'e teslim eder; Şef içerik üretmez, çıktıları `sef-kriterleri.md` dosyasındaki kriterlere göre değerlendirir, öneri sunar, onayı içerik sahibinden alır ve `gunluk/<tarih>/durum.md` dosyasına kaydeder. Sistemin kendisinde (agent talimatları, motor, marka rehberi) değişiklik istendiğinde Şef bunu içerik sahibinin açık isteğiyle yapar.

## Üretim hattı

Her agent bir adım üretir. Bir sonraki adıma ancak içerik sahibi onay verince geçilir.

| # | Agent | Çıktı | Onay |
|---|---|---|---|
| 1 | `konu-avcisi` | `gunluk/<tarih>/01-konular.md` (5 zamansız öneri: Z1–Z3 söz, K1–K2 kelime; özel güne 1–2 gün kala + Ö) | Bir konu seçilir |
| 2 | `senarist` | `gunluk/<tarih>/02-metin-<kod>.md` (40–45 sn'lik video için seslendirme metni, en fazla 50 sn) | — |
| 2b | `dogrulayici` | `gunluk/<tarih>/02b-dogrulama-<kod>.md` (söz, telif, olgu, kırmızı çizgi denetimi) | Doğrulanmış metin onaylanır |
| 3 | `ses-yonetmeni` (yönerge) | `gunluk/<tarih>/02c-seslendirme-<kod>.md` + `04-video-<kod>/yonerge.json` (her cümleye ton etiketi ve durak) | Yönerge onaylanır |
| 3b | `ses-yonetmeni` (üret / düzelt / müzik) | `04-video-<kod>/ses.wav`, `hizalama.json`, `dinleme.md`, `muzik.mp3` (solo ud), `ses-notu.md` (ElevenLabs) | İçerik sahibi dinler: onay ya da cümle numarasıyla not → yalnızca o cümleler yeniden üretilir |
| 3c | `gorsel-yonetmen` | `gunluk/<tarih>/03-gorsel-plan-<kod>.md` (kurgu: 5–9 çekim, her çekimde aksiyon ve kamera hareketi, çekimler arası geçişler, cümlelere bağlı; "Hemdem Minyatür" stilinde) | Plan onaylanır |
| 4 | `video-uretici` (kare dizisi) | `04-video-<kod>/film.js`, `kareler/dizi.png` (her çekimden kareler: storyboard) | Dizi onaylanır |
| 4b | `video-uretici` (ön izleme) | `04-video-<kod>/onizleme.mp4` (yarım çözünürlük, ses + müzik), `kareler/cekim-*.png` | Ön izleme onaylanır |
| 4c | `video-uretici` (final) | `04-video-<kod>/final.mp4` | Son kontrol |
| 5 | Yayıncı *(opsiyonel)* | `05-yayin-<kod>.md` | Paylaşım |

`<kod>` Konu Avcısı'nın öneri kodudur (ör. `Z3`, `K1`, `Ö`). Eski günlerde görülen `G1–G4` kodları kaldırılan gündem önerileridir.

Ses (3, 3b) metin onaylanır onaylanmaz hazırlanır ve görsel planla (3c) paralel ilerleyebilir. Video ses onaylandıktan sonra üretilir; bütün zamanlarını sesten (`hizalama.json`) alır, bu yüzden sessiz taslak ve zaman haritası yoktur.

## Motor

Videolar `motor/` klasöründeki motorla kodla üretilir (Node + Chrome + ffmpeg). 15 Kasım 2026'dan itibaren stil **Hemdem Minyatür**'dür (`motor/minyatur.js`, film dosyasında `style: 'minyatur'`); eski Hemdem Eskiz motoru (`motor/eskiz.js`) yalnızca eski videolar için durur. Kılavuz: `motor/README.md`. Görsel referanslar: `tasarim/REFERANSLAR.md`.

`<tarih>` her zaman `YYYY-AA-GG` biçimindedir (ör. `2026-11-12`).

## Arşivler

- `arsiv/islenen-konular.md`: Seçilen ve işlenen her konu. Tekrarı önlemek için agent'lar bunu okur.
- `arsiv/savlar.md`: Yayınlanan her videonun Sav'ı ve kapanış cümlesi. İleride ürün ve kitap için kullanılacak.
- `arsiv/dersler.md`: Sisteme dair kalıcı kararlar ve hatalardan çıkan dersler. Şef her gün başlarken okur; bir ders ancak ilgili talimat dosyasına işlenince `işlendi` olur.

## Kurallar

- Bir konu seçildiğinde `arsiv/islenen-konular.md` dosyasına satır eklenir (durum: `seçildi`). Video yayınlanınca durum `yayınlandı` olarak güncellenir.
- Bir video yayınlandığında Sav ve kapanış sorusu `arsiv/savlar.md` dosyasına eklenir.
- Agent'lar önceki adımların dosyalarını okur, onları değiştirmez. Düzeltme gerekiyorsa içerik sahibine sorulur.
- Seslendirme 15 Kasım 2026'dan itibaren **ElevenLabs** ile yapılır (Hemdem sesi: Hasan Yasin, `motor/ses-uret.js`). İçerik sahibi kaydetmez; dinler ve not verir. API anahtarı Windows'taki `ELEVENLABS_API_KEY` değişkenindedir; hiçbir dosyaya yazılmaz. Metinler sesli okunmaya uygun yazılır.
