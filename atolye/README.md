# Hemdem Atölyesi

Hemdem ajanlarını bir atölye masasında, çıkartma tarzı minik karakterler olarak gösteren yerel sayfa. Boştaki karakter
uyur (gözler kapalı, renk soluk, "z z"); bir ajan çalışmaya başlayınca uyanır, rengi gelir, arkasına suluboya lekesi yayılır
ve elindeki aletle çalışır. Karakterler Hemdem'e özgüdür.

| Ajan | Karakter |
|---|---|
| Şef | Yelekli, gözlüklü, bıyıklı usta; elinde çay bardağı (onay beklerken altında not çıkar) |
| Konu Avcısı | Kırmızı bereli, trençkotlu; boynunda dürbün, koltuğunun altında gazete |
| Senarist | Dağınık saçlı, kulağında kalem; elinde defter |
| Doğrulayıcı | Topuzlu, yarım ay gözlüklü; elinde büyüteç |
| Görsel Yönetmen | Ressam bereli, boya lekeli önlüklü; elinde fırça |
| Ses Yönetmeni | Kıvırcık saçlı, kulaklıklı; elinde mikrofon |
| Video Üretici | Ters şapkalı, kızıl saçlı; elinde klaket |

## Açmak

`Atolyeyi-ac.cmd` dosyasına çift tıkla (sunucuyu başlatır, tarayıcıda açar). Ya da:

```
node atolye/sunucu.js
```

Sonra `http://127.0.0.1:8797` adresini aç. Demo için: `http://127.0.0.1:8797/?demo=1` (uydurma veri, `&hiz=1500` ile hızlanır).
Gereken tek şey Node (motor için zaten kurulu). Ek paket yok.

## Ne okur, ne okumaz

Sunucu **salt okur**, hiçbir ajanı başlatmaz, hiçbir dosyaya yazmaz:

- `~/.claude/projects/C--Users-Admin-Documents-Hemdem/*/subagents/agent-*.meta.json`: ajan türü, görev başlığı, bitti mi.
- Aynı klasördeki transkriptlerin **kuyruğu**: attığı son adımlar (araç adı + kısa hedef: dosya adı, komut açıklaması),
  yazdığı dosyaların adları ve biten ajanın Şef'e bıraktığı **teslim notu**. Prompt, Şef'le konuşman ve dosya içeriği
  sayfaya gönderilmez.

Bir nesneye tıklayınca kart açılır: şu an ne yaptığı ve son adımları, bugünkü her işi (süre, yazdığı dosyalar, teslim notu).
- `gunluk/<bugün>/durum.md`: seçilen konu, üretim hattı tablosu (son "Adım" tablosu güncel sayılır), son karar.
  Bugünün klasörü yoksa en son gün gösterilir.

Sunucu yalnız `127.0.0.1`'e bağlanır ve başka adresten gelen istekleri reddeder.

## Kurallar

- Bitmemiş ve son 30 dakikada yazılmış alt ajan "çalışıyor" sayılır. Şef, ana oturum son 90 saniyede yazıldıysa "çalışıyor"dur.
- Hemdem ajanı olmayan alt ajanlar (Explore, web-fetch vb.) Şef'in yardımcısı olarak sayılır.
- Kalem sesi kapalı başlar; sağ üstten açılır. Kâğıt rengi Şeftali (açık) ve Kestane (koyu), sistem temasını izler.

Port değiştirmek için: `ATOLYE_PORT=8800`. Oturum klasörü farklıysa: `ATOLYE_PROJE=<yol>`.
