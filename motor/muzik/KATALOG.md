# Hemdem — Ud müzik kütüphanesi

Hemdem müziği solo ud taksimidir (sözsüz, perkusyonsuz). Her videoya yeni parça üretmek yerine önce bu kataloğa bakılır; duygu uyuyorsa parça yeniden kullanılır (içerik sahibinin kararı, 16 Kasım 2026: "Konu çok farklı değilse eskisini kullanabilirsin").

**Seçim:** parçanın süresi videodan (`toplamSure` + kapanış payı) kısa olmamalı. Uzunsa `birlestir.js` videoda keser, girişte solar, çıkışta 2 sn solar. Duygu belirgin farklıysa ya da uygun parça yoksa yeni üretilir (en fazla 2 deneme, `--sure` videodan ~5 sn uzun); iyi çıkan parça buraya eklenir (dosya adı: `ud-<duygu>-<tempo>-<sn>s.mp3`).

| Dosya | Duygu | Tempo | Süre | LUFS | LRA | Kullanıldığı videolar | Not |
|---|---|---|---|---|---|---|---|
| `ud-sicak-ninni-53s.mp3` | sıcak, şefkatli, ninni gibi | çok yavaş | 53.1 sn | -13.6 | 9.9 | 2026-11-16 Z1 (babaannenin defteri) | Kesintisiz çalar, sona kadar solmaz, son cümle havada kalır. Kaynak: `gunluk/2026-11-16/04-video-Z1/muzik.mp3` (= muzik-v6) |

Boş duygular (ihtiyaç doğunca üretilir): hüzünlü-özlem, merak/hafif gerilim, hafif ve ışıklı (K videoları), ağır-yüzleşme.
