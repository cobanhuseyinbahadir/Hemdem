// Hemdem Minyatür — çizim araçları (tarayıcıda çalışır, window.M)
// İlham: Lemo-Opuscar "Gilded Illumination" (kod MIT) ve Osmanlı minyatür / tezhip geleneği.
// Bu dosya Hemdem için sıfırdan yazıldı, Opuscar kodu içermez.
//
// Kalıp: düz pigment + içte koyu bant + kalın mürekkep kontur + üstübeç çizgi ve noktalar.
// Altın bir malzemedir: varak kareleriyle döşenir, sönük durur, resmin içindeki bir ışık
// üstünden geçince parlar. Bütün video tek bir boyanmış resmin (plaka) içinde geçer;
// kamera bu resmin üstünde gezinir.
(function () {
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const M = { W, H, TAU };

  // ---- pigmentler (her biri: gövde / koyu bant) ----
  M.C = {
    INK: '#2a1a10',
    LAPIS: '#22379a', LAPIS_D: '#141f5a', LAPIS_L: '#3a52b8',
    VERM: '#c8321f', VERM_D: '#8c1f12',
    VERD: '#3f8f7a', VERD_D: '#2a5f51',
    TURQ: '#3b9ea6', TURQ_D: '#24676d',
    ROSE: '#e2b3a3', ROSE_D: '#b98172',
    LILAC: '#b3a3c4', LILAC_D: '#8676a0',
    SAGE: '#b9c99a', SAGE_D: '#8fa572',
    LEAF: '#4f8a45', LEAF_D: '#2f5c2c',
    CYPRESS: '#2f6b48', CYPRESS_D: '#1d4a30',
    WOOD: '#9a6a43', WOOD_D: '#6b4426',
    COPPER: '#c27a45', COPPER_D: '#8a4f28',
    SAFFRON: '#e9c46a', SAFFRON_D: '#b8902f',
    SKIN: '#ecc9a5', SKIN_D: '#c99a76',
    WHITE: '#f6efe0', VELLUM: '#efe2c4', VELLUM_D: '#d6c39c',
  };
  const C = M.C;

  // ---- sabit tohumlu rastgele ----
  M.rng = function (seed = 1) {
    let s = seed | 0;
    const f = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.r = (a, b) => a + f() * (b - a);
    return f;
  };

  // ---- zaman yardımcıları ----
  M.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  M.ease = (x) => { x = M.clamp(x); return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  M.easeOut = (x) => 1 - Math.pow(1 - M.clamp(x), 3);
  // t0'da başlayıp d saniyede 0→1 giden yumuşak ilerleme
  M.prog = (t, t0, d) => M.ease((t - t0) / d);
  // küçük şeylerin belirişi: hafif yaylanan ölçek (0→1, biraz aşıp oturur)
  M.pop = (t, t0, d = .5) => { const x = M.clamp((t - t0) / d); if (x <= 0) return 0; return 1 + Math.sin(x * Math.PI) * .12 * (1 - x) - (1 - M.easeOut(x)); };
  // anahtar karelerden değer: keys = [[t, v], ...] (v sayı ya da sayı dizisi)
  M.track = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) { const k = M.ease((t - t0) / (t1 - t0)); return Array.isArray(v0) ? v0.map((a, j) => a + (v1[j] - a) * k) : v0 + (v1 - v0) * k; }
    }
    return keys[keys.length - 1][1];
  };

  // ---- dokular (setup'ta bir kez) ----
  function canvasOf(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  // ---- ses zamanı (15 Kasım 2026) ----
  // render.js, film dosyasının yanında hizalama.json varsa onu window.HIZALAMA olarak verir.
  // M.c(n)          → n. cümle {bas, son, metin} (gerçek saniye; 1'den başlar)
  // M.k(n, 'kelime')→ n. cümlede o kelimenin başladığı saniye (büyük/küçük harf ve noktalama önemsiz)
  // M.sesSure       → seslendirmenin toplam süresi
  // film.subs: 'ses' → altyazılar cümlelerden otomatik kurulur (uzun cümleler kelime sınırından ikiye bölünür)
  const norm = (s) => s.toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]/gu, '');
  M.ses = null;
  M.c = (n) => { const c = M.ses && M.ses.cumleler[n - 1]; if (!c) throw new Error(`Hizalamada ${n}. cümle yok`); return c; };
  M.k = (n, w, sira = 1) => {
    const c = M.c(n), hedef = norm(w); let say = 0;
    for (const x of c.kelimeler) if (norm(x.k) === hedef && ++say === sira) return x.bas;
    for (const x of c.kelimeler) if (norm(x.k).startsWith(hedef)) return x.bas;
    throw new Error(`${n}. cümlede "${w}" kelimesi yok`);
  };
  M.sesSubs = function (g, maxW, kapanis) {
    const out = [], cs = M.ses.cumleler;
    g.save(); g.font = M.subFont;
    cs.forEach((c, i) => {
      const words = c.metin.split(/\s+/).filter(Boolean);
      const sameWords = words.length === c.kelimeler.length; // "soyle" kullanılmadıysa kelimeler eşleşir
      // sığmayan cümle, her parça maxW'ye sığana kadar en dengeli noktalardan bölünür
      // (17 Kasım 2026: altyazı Instagram'ın sağ düğme sütununa girmesin diye maxW daraldı;
      // bir cümle artık 3 parçaya da bölünebilir). Virgül/iki nokta sonrası tercih edilir.
      const wOf = (s, e) => g.measureText(words.slice(s, e).join(' ')).width;
      const split = (s, e) => {
        if (!sameWords || e - s < 2 || wOf(s, e) <= maxW) return [[s, e]];
        let best = null;
        for (let j = s + 1; j < e; j++) {
          const score = Math.max(wOf(s, j), wOf(j, e)) - (/[,:;]$/.test(words[j - 1]) ? 120 : 0);
          if (!best || score < best.s) best = { j, s: score };
        }
        return [...split(s, best.j), ...split(best.j, e)];
      };
      const parts = split(0, words.length);
      parts.forEach(([s, e]) => out.push({ text: words.slice(s, e).join(' '), a: sameWords ? c.kelimeler[s].bas : c.bas, cumle: i + 1 }));
    });
    g.restore();
    out.forEach((s, i) => {
      const n = out[i + 1], c = cs[s.cumle - 1];
      const end = (n && n.cumle === s.cumle) ? n.a : c.son;
      s.b = n ? Math.max(end, Math.min(n.a, s.a + 1.2)) : c.son + kapanis;
      if (n && s.b > n.a) s.b = n.a;
    });
    return out;
  };

  M.setup = function (g, film = {}) {
    M.ses = window.HIZALAMA || null;
    // sonCumle: N → film yalnızca ilk N cümleyi kapsar (deneme ve parça üretimi için)
    if (M.ses && film.sonCumle) { const cs = M.ses.cumleler.slice(0, film.sonCumle); M.ses = { ...M.ses, cumleler: cs, toplamSure: cs[cs.length - 1].son }; }
    if (M.ses) M.sesSure = M.ses.toplamSure;
    if (film.subs === 'ses') {
      if (!M.ses) throw new Error("subs: 'ses' için film klasöründe hizalama.json gerekli");
      film.subs = M.sesSubs(g, M.SUB_MAXW - 110, film.kapanis ?? 2.5);
      // gizli: [12] → 12. cümle altyazıda görünmez (ör. Sav kartuşta yazılırken)
      for (const s of film.subs) if ((film.gizli || []).includes(s.cumle)) s.hidden = true;
    }
    if (typeof film.duration === 'function') film.duration = film.duration(M);
    else if (film.duration == null && M.ses) film.duration = M.ses.toplamSure + (film.kapanis ?? 2.5);
    const R = M.rng(film.seed || 11);
    const granular = (base, dark, light, n = 9000, sz = 256) => g.createPattern(canvasOf(sz, sz, (q) => {
      q.fillStyle = base; q.fillRect(0, 0, sz, sz);
      for (let i = 0; i < n; i++) { q.fillStyle = R() < .55 ? dark : light; q.globalAlpha = R.r(.12, .38); q.beginPath(); q.arc(R.r(0, sz), R.r(0, sz), R.r(.5, 1.6), 0, TAU); q.fill(); }
    }), 'repeat');
    const goldCanvas = canvasOf(240, 240, (q, w, h) => {
      const S = 40;
      for (let y = 0; y < h; y += S) for (let x = -S; x < w + S; x += S) {
        const ox = (y / S) % 2 ? S / 2 : 0, k = R.r(-.10, .10);
        const c = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + k))));
        q.fillStyle = `rgb(${c(201)},${c(154)},${c(62)})`; q.fillRect(x + ox, y, S, S);
        q.strokeStyle = 'rgba(90,55,10,.55)'; q.lineWidth = 1; q.strokeRect(x + ox + .5, y + .5, S - 1, S - 1);
        q.strokeStyle = 'rgba(255,230,160,.35)'; q.beginPath(); q.moveTo(x + ox + 2, y + 2); q.lineTo(x + ox + S - 2, y + 2); q.stroke();
      }
      for (let i = 0; i < 26; i++) { q.fillStyle = 'rgba(150,45,25,.55)'; q.beginPath(); q.arc(R.r(0, w), R.r(0, h), R.r(.6, 1.8), 0, TAU); q.fill(); }
      for (let i = 0; i < 10; i++) { q.strokeStyle = 'rgba(80,45,10,.4)'; q.beginPath(); let x = R.r(0, w), y = R.r(0, h); q.moveTo(x, y); for (let j = 0; j < 4; j++) { x += R.r(-8, 8); y += R.r(-8, 8); q.lineTo(x, y); } q.stroke(); }
    });
    M.PAT = {
      GOLD: g.createPattern(goldCanvas, 'repeat'),
      LAPIS: granular(C.LAPIS, C.LAPIS_D, C.LAPIS_L),
      SAGE: granular(C.SAGE, C.SAGE_D, '#dfe8c8', 7000),
      VELLUM: granular(C.VELLUM, C.VELLUM_D, '#fbf4e2', 5000),
      ROSE: granular(C.ROSE, C.ROSE_D, '#f3d6cb', 5000),
      SAND: granular('#e6d3a8', '#bfa678', '#f5e8c8', 6000),
    };
    // altyazı parşömeninin sabit genişliği: filmdeki en uzun satıra göre bir kez belirlenir
    g.save(); g.font = M.subFont;
    const longest = Math.max(0, ...(film.subs || []).filter(s => !s.hidden).map(s => g.measureText(s.text).width));
    g.restore();
    M.scrollW = Math.min(M.SUB_MAXW, Math.max(460, longest + 110));
  };

  // ---- yol yardımcıları ----
  M.P = (fn) => { const p = new Path2D(); fn(p); return p; };
  M.smooth = function (pts) {
    return M.P(p => {
      const n = pts.length, m = (i) => { const a = pts[i % n], b = pts[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
      const s = m(n - 1); p.moveTo(s[0], s[1]);
      for (let i = 0; i < n; i++) { const c = pts[i], e = m(i); p.quadraticCurveTo(c[0], c[1], e[0], e[1]); }
      p.closePath();
    });
  };
  M.poly = (pts) => M.P(p => { pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); });

  // ---- minyatür kalıbı ----
  // düz renk + içte koyu bant + mürekkep kontur
  M.shape = function (g, path, fill, rim, lw = 3, rimW = 10) {
    g.fillStyle = fill; g.fill(path);
    if (rim) { g.save(); g.clip(path); g.lineWidth = rimW; g.strokeStyle = rim; g.globalAlpha *= .55; g.stroke(path); g.restore(); }
    g.lineWidth = lw; g.strokeStyle = C.INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(path);
  };
  // üstübeç çizgi
  M.hiLine = function (g, fn, w = 2.2, a = .85) { g.save(); g.strokeStyle = C.WHITE; g.globalAlpha *= a; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); fn(g); g.stroke(); g.restore(); };
  // üçlü nokta (yaprak, kaya, çimen)
  M.triad = function (g, x, y, r = 2.6, c = C.WHITE) { g.fillStyle = c; for (const [dx, dy] of [[0, -r * 1.3], [-r * 1.2, r * .8], [r * 1.2, r * .8]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); } };
  // inci dizisi
  M.pearls = function (g, x0, y0, x1, y1, n, r = 3) { g.fillStyle = C.WHITE; for (let i = 0; i <= n; i++) { const t = i / n; g.beginPath(); g.arc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, 0, TAU); g.fill(); } };

  // altın varak. lit: {x, y, r, k} — resmin içindeki ışığın konumu ve gücü (k 0..1). lit yoksa sönük.
  M.gold = function (g, path, lit = null, lw = 3) {
    g.save(); g.clip(path);
    g.fillStyle = M.PAT.GOLD; g.fill(path);
    const k = lit ? (lit.k ?? 1) : 0;
    if (k < 1) { g.globalAlpha = .28 * (1 - k); g.fillStyle = 'rgb(60,30,5)'; g.fill(path); g.globalAlpha = 1; }
    if (k > 0) {
      const gr = g.createRadialGradient(lit.x, lit.y, 0, lit.x, lit.y, lit.r);
      gr.addColorStop(0, `rgba(255,226,150,${.85 * k})`); gr.addColorStop(.5, `rgba(240,190,90,${.35 * k})`); gr.addColorStop(1, 'rgba(240,190,90,0)');
      g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fill(path);
    }
    g.restore();
    g.lineWidth = lw; g.strokeStyle = C.INK; g.stroke(path);
  };
  // varak üstünde parıltı (yıldız biçimli)
  M.flash = function (g, x, y, r, a = 1) {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a; g.strokeStyle = '#fff3cf'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
    g.lineWidth = 1.2; const d = r * .5; g.beginPath(); g.moveTo(x - d, y - d); g.lineTo(x + d, y + d); g.moveTo(x - d, y + d); g.lineTo(x + d, y - d); g.stroke(); g.restore();
  };
  // altına ışık değdiğinde yayılan iki ince halka. p: 0..1 ilerleme
  M.rings = function (g, x, y, p, r0 = 30, r1 = 90) {
    if (p <= 0 || p >= 1) return;
    g.save(); g.strokeStyle = '#f1c86e'; g.lineWidth = 2;
    for (const [lag, a] of [[0, .85], [.25, .45]]) { const q = M.clamp((p - lag) / (1 - lag)); if (q <= 0) continue; g.globalAlpha = a * (1 - q); g.beginPath(); g.arc(x, y, r0 + (r1 - r0) * q, 0, TAU); g.stroke(); }
    g.restore();
  };
  // içerden gelen ışık halesi (kandil, güneş) — sadece kaynağın çevresinde, küçük
  M.glow = function (g, x, y, r, a = .4) {
    if (a <= 0) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255,214,130,${a})`); gr.addColorStop(1, 'rgba(255,214,130,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  };

  // ---- hazır öğeler (dünya koordinatında) ----
  M.star8 = (x, y, r) => M.P(p => { for (let i = 0; i < 16; i++) { const a = i / 16 * TAU - Math.PI / 2, rad = i % 2 ? r * .45 : r; const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; i ? p.lineTo(px, py) : p.moveTo(px, py); } p.closePath(); });

  M.sky = function (g, x, y, w, h) { g.fillStyle = M.PAT.LAPIS; g.fillRect(x, y, w, h); };
  M.stars = function (g, n, box, seed = 3, lit = null) { const R = M.rng(seed); for (let i = 0; i < n; i++) { const x = R.r(box[0], box[0] + box[2]), y = R.r(box[1], box[1] + box[3]), r = R.r(5, 11); M.gold(g, M.star8(x, y, r), lit, 1.4); } };

  // çin bulutu
  M.cloud = function (g, x, y, w, n = 4) {
    const p = M.P(p => {
      const step = w / n; p.moveTo(x, y);
      for (let i = 0; i < n; i++) { const cx = x + step * (i + .5), r = step / 2 * (i % 2 ? .9 : 1.15); p.arc(cx, y, r, Math.PI, 0); }
      p.quadraticCurveTo(x + w + 14, y + 12, x + w - 6, y + 16);
      for (let i = n - 1; i >= 0; i--) { const cx = x + step * (i + .5); p.quadraticCurveTo(cx + step * .2, y + 26, cx - step * .5, y + 16); }
      p.quadraticCurveTo(x - 16, y + 12, x, y);
    });
    M.shape(g, p, C.WHITE, '#9fb0d8', 2.2, 8);
    M.hiLine(g, q => { for (let i = 0; i < n; i++) { const cx = x + w / n * (i + .5); q.moveTo(cx - 8, y + 4); q.quadraticCurveTo(cx, y - 2, cx + 8, y + 4); } }, 1.4, .5);
  };

  // süngerimsi minyatür kayası
  M.rock = function (g, cx, cy, rx, ry, fill = C.LILAC, rim = C.LILAC_D, seed = 5) {
    const R = M.rng(seed), n = 11, pts = [];
    for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI, k = R.r(.78, 1.12); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    pts.push([cx + rx, cy + ry * .25]); pts.push([cx - rx, cy + ry * .25]);
    M.shape(g, M.smooth(pts), fill, rim, 2.6, 12);
    for (let i = 0; i < 5; i++) M.triad(g, cx + R.r(-rx * .6, rx * .6), cy + R.r(-ry * .6, 0), 2.2);
  };

  // eğik zemin (yukarıdan bakılmış gibi), üstünde çiçek noktaları
  M.ground = function (g, y, box, seed = 8, avoid = []) {
    const [x0, , x1, y1] = box;
    const p = M.P(p => { p.moveTo(x0, y); p.bezierCurveTo(x0 + (x1 - x0) * .25, y - 40, x0 + (x1 - x0) * .65, y + 20, x1, y - 20); p.lineTo(x1, y1); p.lineTo(x0, y1); p.closePath(); });
    g.fillStyle = M.PAT.SAGE; g.fill(p); g.lineWidth = 3; g.strokeStyle = C.INK; g.stroke(p);
    const R = M.rng(seed);
    for (let i = 0; i < 80; i++) { const x = R.r(x0 + 20, x1 - 20), yy = R.r(y + 40, y1 - 20); if (avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && yy > ay && yy < ay + ah)) continue; M.triad(g, x, yy, 2.2, R() < .5 ? C.WHITE : '#e4867a'); }
  };

  // servi
  M.cypress = function (g, x, top, bot, w = 45) {
    const p = M.smooth([[x, top], [x + w * .65, top + (bot - top) * .37], [x + w, top + (bot - top) * .74], [x + w * .8, bot], [x - w * .8, bot], [x - w, top + (bot - top) * .74], [x - w * .65, top + (bot - top) * .37]]);
    M.shape(g, p, C.CYPRESS, C.CYPRESS_D, 3, 14);
    M.hiLine(g, q => { for (let y = top + 60; y < bot - 20; y += 34) { q.moveTo(x - w * .3, y); q.lineTo(x + w * .3, y + 14); } }, 1.6, .55);
  };

  // yaprak kümesi (çınar, ağaç tacı)
  M.crown = function (g, cx, cy, r, seed = 2) {
    const R = M.rng(seed), n = 22, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, k = i % 2 ? .86 : 1.04; pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * .82]); }
    M.shape(g, M.smooth(pts), C.LEAF, C.LEAF_D, 2.8, 16);
    for (let i = 0; i < 9; i++) { const a = R.r(0, TAU), d = R.r(0, r * .7); M.triad(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * .8, 2.4); }
  };

  // sivri kemer yolu
  M.arch = (x, w, top, bot) => M.P(p => { p.moveTo(x, bot); p.lineTo(x, top + w * .55); p.quadraticCurveTo(x, top + w * .1, x + w / 2, top); p.quadraticCurveTo(x + w, top + w * .1, x + w, top + w * .55); p.lineTo(x + w, bot); p.closePath(); });

  // lale
  M.tulip = function (g, x, y, h, c = C.VERM, cd = C.VERM_D) {
    g.strokeStyle = C.LEAF_D; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y - h * .5, x, y - h); g.stroke();
    M.shape(g, M.P(p => { p.moveTo(x, y - 6); p.quadraticCurveTo(x - 26, y - h * .45, x - 8, y - h * .7); p.quadraticCurveTo(x - 6, y - h * .35, x, y - 6); p.closePath(); }), C.LEAF, C.LEAF_D, 2, 4);
    const fl = M.P(p => { p.moveTo(x - 13, y - h - 30); p.lineTo(x - 6, y - h - 14); p.lineTo(x, y - h - 34); p.lineTo(x + 6, y - h - 14); p.lineTo(x + 13, y - h - 30); p.quadraticCurveTo(x + 16, y - h + 2, x, y - h + 2); p.quadraticCurveTo(x - 16, y - h + 2, x - 13, y - h - 30); p.closePath(); });
    M.shape(g, fl, c, cd, 2.4, 6);
    M.hiLine(g, q => { q.moveTo(x - 7, y - h - 4); q.lineTo(x - 5, y - h - 18); }, 1.6, .7);
  };

  // kandil (asılı). lit 0..1
  M.lantern = function (g, x, y, lit = 1) {
    M.glow(g, x, y, 170, .4 * lit);
    const L = { x, y, r: 60, k: lit };
    M.gold(g, M.poly([[x - 16, y - 33], [x + 16, y - 33], [x + 24, y - 21], [x - 24, y - 21]]), L, 2);
    M.gold(g, M.poly([[x - 22, y - 21], [x + 22, y - 21], [x + 28, y + 13], [x, y + 37], [x - 28, y + 13]]), L, 2.4);
    if (lit > 0) { g.save(); g.globalAlpha = .9 * lit; g.fillStyle = '#fff0c8'; g.beginPath(); g.ellipse(x, y + 1, 7, 11, 0, 0, TAU); g.fill(); g.restore(); M.flash(g, x, y + 1, 18, .9 * lit); }
  };
  M.chain = function (g, x, y0, y1) { g.strokeStyle = C.INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); for (let y = y0 + 8; y < y1; y += 10) { g.beginPath(); g.ellipse(x, y, 2.5, 4, 0, 0, TAU); g.stroke(); } };

  // fincan (tabaklı). gold: altın varaklı mı, lit: ışık nesnesi
  M.cup = function (g, x, y, o = {}) {
    const cup = M.poly([[x - 20, y], [x + 20, y], [x + 14, y + 34], [x - 14, y + 34]]);
    const handle = M.P(p => { p.arc(x - 22, y + 15, 9, Math.PI * .5, Math.PI * 1.5); p.arc(x - 22, y + 15, 4, Math.PI * 1.5, Math.PI * .5, true); p.closePath(); });
    const saucer = M.P(p => p.ellipse(x, y + 36, 28, 7, 0, 0, TAU));
    if (o.gold) { M.gold(g, saucer, o.lit, 2.2); M.gold(g, handle, o.lit, 1.8); M.gold(g, cup, o.lit, 2.6); M.pearls(g, x - 18, y + 4, x + 18, y + 4, 6, 1.8); }
    else { M.shape(g, saucer, C.WHITE, '#bfc8dd', 2); M.shape(g, handle, C.WHITE, null, 1.8); M.shape(g, cup, C.WHITE, '#bfc8dd', 2.2, 4); g.fillStyle = C.LAPIS; g.fillRect(x - 17, y + 8, 34, 6); }
  };

  // oturan figür (bağdaş). Yerel koordinat: (0,0) oturduğu yerin ortası, sağa bakar.
  // o: { x, y, dir (1 sağa / -1 sola), scale, coat, coatD, sash, cap, hair, beard, scarf,
  //      hand: [hx, hy] (yerel), lean (öne eğilme, radyan) }
  M.seated = function (g, o) {
    g.save(); g.translate(o.x, o.y); g.scale((o.dir || 1) * (o.scale || 1), o.scale || 1); g.rotate(o.lean || 0);
    const hx = (o.hand || [150, -96])[0], hy = (o.hand || [150, -96])[1];
    const body = M.P(p => {
      p.moveTo(-58, -200); p.bezierCurveTo(-72, -142, -96, -82, -120, -30); p.quadraticCurveTo(-128, 4, -96, 4);
      p.lineTo(104, 4); p.quadraticCurveTo(136, 2, 118, -36); p.bezierCurveTo(96, -78, 74, -142, 60, -200); p.quadraticCurveTo(0, -220, -58, -200); p.closePath();
    });
    M.shape(g, body, o.coat || C.VERD, o.coatD || C.VERD_D, 3, 18);
    M.hiLine(g, q => { q.moveTo(8, -196); q.bezierCurveTo(14, -132, 6, -72, 18, 0); }, 2.4, .8);
    if (o.sash !== null) { M.shape(g, M.P(p => { p.moveTo(-66, -102); p.quadraticCurveTo(0, -86, 70, -104); p.lineTo(74, -86); p.quadraticCurveTo(0, -66, -70, -84); p.closePath(); }), o.sash || C.SAFFRON, null, 2.2); M.pearls(g, -60, -93, 64, -95, 10, 2); }
    const arm = M.P(p => { p.moveTo(40, -190); p.bezierCurveTo(90, -172, 120, -142, hx - 10, hy - 6); p.lineTo(hx - 12, hy + 16); p.bezierCurveTo(100, -112, 70, -132, 34, -152); p.closePath(); });
    M.shape(g, arm, o.coat || C.VERD, o.coatD || C.VERD_D, 2.8, 10);
    M.shape(g, M.P(p => p.ellipse(hx, hy + 5, 12, 10, 0, 0, TAU)), C.SKIN, C.SKIN_D, 2.2, 5);
    M.head(g, 0, -262, o);
    g.restore();
  };
  // ayakta figür. Yerel (0,0) ayak hizası, sağa bakar. step: yürüyüş evresi (0..1, döngü)
  M.standing = function (g, o) {
    g.save(); g.translate(o.x, o.y); g.scale((o.dir || 1) * (o.scale || 1), o.scale || 1); g.rotate(o.lean || 0);
    const sw = o.step != null ? Math.sin(o.step * TAU) * 14 : 0;
    // bacaklar / ayaklar (etek altında görünür)
    for (const [dx, k] of [[-18, 1], [18, -1]]) { M.shape(g, M.P(p => p.ellipse(dx + sw * k, -4, 20, 8, 0, 0, TAU)), '#3a2f2a', null, 2.2); }
    const body = M.P(p => { p.moveTo(-40, -300); p.bezierCurveTo(-56, -220, -70, -120, -78, -12); p.lineTo(78, -12); p.bezierCurveTo(70, -120, 56, -220, 40, -300); p.quadraticCurveTo(0, -318, -40, -300); p.closePath(); });
    M.shape(g, body, o.coat || C.VERM, o.coatD || C.VERM_D, 3, 18);
    M.hiLine(g, q => { q.moveTo(6, -296); q.bezierCurveTo(10, -200, 4, -100, 12, -14); }, 2.4, .8);
    if (o.sash !== null) { M.shape(g, M.P(p => { p.moveTo(-50, -190); p.quadraticCurveTo(0, -178, 52, -192); p.lineTo(54, -174); p.quadraticCurveTo(0, -160, -52, -172); p.closePath(); }), o.sash || C.SAFFRON, null, 2.2); }
    const hx = (o.hand || [70, -170])[0], hy = (o.hand || [70, -170])[1];
    if (o.kolInce) M.kolInce(g, [22, -284], [hx, hy], 24, [o.coat || C.VERM, o.coatD || C.VERM_D]);
    else {
      const arm = M.P(p => { p.moveTo(26, -292); p.bezierCurveTo(56, -270, 66, -220, hx - 6, hy - 8); p.lineTo(hx - 10, hy + 12); p.bezierCurveTo(50, -214, 40, -250, 18, -262); p.closePath(); });
      M.shape(g, arm, o.coat || C.VERM, o.coatD || C.VERM_D, 2.8, 10);
      M.shape(g, M.P(p => p.ellipse(hx, hy + 2, 11, 10, 0, 0, TAU)), C.SKIN, C.SKIN_D, 2.2, 5);
    }
    M.head(g, 0, -352, o);
    g.restore();
  };
  // ince, zarif kol (17 Kasım 2026, Z7'de çizildi): omuz s=[x,y] → el h=[x,y] (yerel), iki dirsekli;
  // kol bileğe doğru incelir, dirsek kıvrımı, bilekte altın manşet, ince el. w: omuz genişliği, r: [renk, koyu].
  // M.standing'de `kolInce: true` ile açılır (varsayılan kapalı); kendi figürünü çizen film doğrudan da çağırabilir.
  M.kolInce = function (g, s, h, w = 24, r = [C.VERM, C.VERM_D]) {
    const seg = (a, b, w0, w1) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const p = M.poly([[a[0] + nx * w0 / 2, a[1] + ny * w0 / 2], [b[0] + nx * w1 / 2, b[1] + ny * w1 / 2], [b[0] - nx * w1 / 2, b[1] - ny * w1 / 2], [a[0] - nx * w0 / 2, a[1] - ny * w0 / 2]]);
      M.shape(g, p, r[0], r[1], 2.4, 6); return p;
    };
    const Lu = 80, Lf = 104, [sx, sy] = s, [hx, hy] = h;
    const d = Math.max(1, Math.hypot(hx - sx, hy - sy)), dd = Math.min(d, Lu + Lf - 2), th = Math.atan2(hy - sy, hx - sx);
    let el;
    if (d < 105) el = [sx + 30, sy + 74];   // el omza yakınken (yakayı tutma) dirsek aşağıda ve öne doğru
    else {
      const a = Math.acos(Math.max(-1, Math.min(1, (Lu * Lu + dd * dd - Lf * Lf) / (2 * Lu * dd))));
      const e1 = [sx + Lu * Math.cos(th + a), sy + Lu * Math.sin(th + a)], e2 = [sx + Lu * Math.cos(th - a), sy + Lu * Math.sin(th - a)];
      el = e1[1] > e2[1] ? e1 : e2;
    }
    const wu = w * .72, we = w * .5, ww = w * .36;
    const p1 = seg([sx, sy], el, wu, we);
    M.shape(g, M.P(p => p.arc(el[0], el[1], we * .5, 0, TAU)), r[0], null, 0);
    const fdx = hx - el[0], fdy = hy - el[1], fl = Math.hypot(fdx, fdy) || 1, ux = fdx / fl, uy = fdy / fl;
    const wr = [hx - ux * 9, hy - uy * 9];
    const p2 = seg(el, wr, we, ww);
    M.hiLine(g, q => { q.moveTo(el[0] - ux * 6 - uy * 3, el[1] - uy * 6 + ux * 3); q.quadraticCurveTo(el[0] + 4, el[1] + 2, el[0] + ux * 8, el[1] + uy * 8); }, 1.6 * (M.lwK || 1), .7);
    const nx = -uy, ny = ux, mw = ww * .62 + 2, mc = [wr[0] - ux * 5, wr[1] - uy * 5];
    M.shape(g, M.poly([[mc[0] + nx * mw - ux * 3.5, mc[1] + ny * mw - uy * 3.5], [mc[0] + nx * mw + ux * 3.5, mc[1] + ny * mw + uy * 3.5], [mc[0] - nx * mw + ux * 3.5, mc[1] - ny * mw + uy * 3.5], [mc[0] - nx * mw - ux * 3.5, mc[1] - ny * mw - uy * 3.5]]), C.SAFFRON, C.SAFFRON_D, 1.8, 3);
    g.save(); g.translate(hx, hy); g.rotate(Math.atan2(uy, ux));
    M.shape(g, M.P(p => { p.moveTo(-9, -4); p.quadraticCurveTo(2, -8, 10, -5); p.quadraticCurveTo(15, 0, 10, 5); p.quadraticCurveTo(2, 8, -9, 4); p.closePath(); }), C.SKIN, C.SKIN_D, 1.8, 4);
    M.shape(g, M.P(p => { p.moveTo(-2, -5); p.quadraticCurveTo(4, -12, 9, -10); p.quadraticCurveTo(6, -6, 2, -3); p.closePath(); }), C.SKIN, C.SKIN_D, 1.4, 3);
    g.restore();
    return [p1, p2];
  };
  // baş ve sade minyatür yüzü (üç çeyrek, sağa bakar; yerel koordinatta çağrılır)
  M.head = function (g, x, y, o = {}) {
    M.shape(g, M.P(p => p.rect(x - 12, y + 30, 24, 32)), C.SKIN, C.SKIN_D, 2.4, 5);
    if (o.scarf) { M.shape(g, M.P(p => { p.moveTo(x - 44, y + 46); p.quadraticCurveTo(x - 52, y - 44, x + 4, y - 50); p.quadraticCurveTo(x + 52, y - 46, x + 46, y + 10); p.lineTo(x + 40, y + 52); p.quadraticCurveTo(x, y + 66, x - 44, y + 46); p.closePath(); }), o.scarf, null, 2.6); }
    M.shape(g, M.P(p => p.ellipse(x + 4, y, 36, 40, 0, 0, TAU)), C.SKIN, C.SKIN_D, 2.8, 8);
    const ex = x + 18, ey = y - 6;
    g.strokeStyle = C.INK; g.lineWidth = 2.2; g.beginPath(); g.moveTo(ex - 9, ey); g.quadraticCurveTo(ex, ey - 5, ex + 9, ey); g.stroke();
    if (!o.eyesClosed) { g.fillStyle = C.INK; g.beginPath(); g.arc(ex + 2, ey, 2.6, 0, TAU); g.fill(); }
    g.lineWidth = 2; g.beginPath(); g.moveTo(ex - 10, ey - 12); g.quadraticCurveTo(ex, ey - 18, ex + 11, ey - 12); g.stroke();
    g.beginPath(); g.moveTo(x + 34, y - 4); g.lineTo(x + 40, y + 10); g.lineTo(x + 32, y + 12); g.stroke();
    g.strokeStyle = '#a5523e'; g.beginPath(); g.moveTo(x + 22, y + 24); g.lineTo(x + 32, y + 23); g.stroke();
    if (o.beard) M.shape(g, M.P(p => { p.moveTo(x - 20, y + 10); p.quadraticCurveTo(x - 6, y + 70, x + 18, y + 64); p.quadraticCurveTo(x + 40, y + 50, x + 38, y + 28); p.quadraticCurveTo(x + 20, y + 36, x - 2, y + 20); p.closePath(); }), C.WHITE, '#c9c2b4', 2.4, 6);
    if (o.cap) { M.shape(g, M.P(p => { p.moveTo(x - 32, y - 18); p.quadraticCurveTo(x - 30, y - 52, x + 6, y - 54); p.quadraticCurveTo(x + 40, y - 52, x + 42, y - 26); p.lineTo(x + 58, y - 20); p.quadraticCurveTo(x + 30, y - 14, x - 32, y - 18); p.closePath(); }), o.cap, '#000', 2.6, 6); }
    if (o.hair && !o.scarf) M.shape(g, M.P(p => { p.moveTo(x - 32, y - 4); p.quadraticCurveTo(x - 34, y - 46, x + 6, y - 42); p.quadraticCurveTo(x + 36, y - 40, x + 38, y - 24); p.quadraticCurveTo(x + 10, y - 32, x - 18, y + 6); p.closePath(); }), o.hair, null, 2.4);
    if (o.longHair && !o.scarf) M.shape(g, M.P(p => { p.moveTo(x - 30, y - 30); p.quadraticCurveTo(x - 10, y - 50, x + 30, y - 34); p.quadraticCurveTo(x + 10, y - 30, x - 4, y - 10); p.quadraticCurveTo(x - 20, y + 30, x - 26, y + 70); p.quadraticCurveTo(x - 46, y + 40, x - 30, y - 30); p.closePath(); }), o.longHair, null, 2.4);
  };

  // ---- kamera: resmin (plakanın) içinde gezinme ----
  // cam: { x, y, zoom, rot } — dünya noktası (x, y) ekranın ortasına gelir
  M.camera = function (g, cam = {}) {
    const z = cam.zoom || 1;
    g.translate(W / 2, H / 2); if (cam.rot) g.rotate(cam.rot); g.scale(z, z); g.translate(-(cam.x ?? W / 2), -(cam.y ?? H / 2));
  };

  // ---- ekrandaki yazılar ----
  M.subFont = '500 38px "Fraunces Variable"';
  // üst kartuş (Sav ya da kelime). lines: ['satır', {text, italic}], p: kalemle sağa doğru açılma (0..1)
  // 17 Kasım 2026: kartuş daraldı (gövde 220–860, kıvrımlarla 170–910). Instagram'ın üstteki
  // geri oku (x ≈ 130–160) ve kamera simgesi (x ≈ 915–970), y ≈ 180–260'ta kartuşun uçlarına biniyordu.
  // Sığmayan satırın yazısı kendiliğinden küçülür.
  M.cartouche = function (g, lines, p = 1, y = 118, h = 158) {
    if (p <= 0) return;
    const L = 220, R = 860, cx = (L + R) / 2;
    const cart = M.P(q => { q.moveTo(L, y); q.lineTo(R, y); q.quadraticCurveTo(R + 50, y + h / 2, R, y + h); q.lineTo(L, y + h); q.quadraticCurveTo(L - 50, y + h / 2, L, y); q.closePath(); });
    g.save();
    g.beginPath(); g.rect(L - 60, y - 20, (R - L + 110) * M.ease(p) + 10, h + 40); g.clip();
    g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 10; g.fillStyle = M.PAT.VELLUM; g.fill(cart); g.restore();
    g.save(); g.clip(cart); g.lineWidth = 14; g.strokeStyle = M.PAT.GOLD; g.stroke(cart); g.restore();
    g.lineWidth = 3; g.strokeStyle = C.INK; g.stroke(cart);
    const inner = M.P(q => { q.moveTo(L + 16, y + 16); q.lineTo(R - 16, y + 16); q.quadraticCurveTo(R + 26, y + h / 2, R - 16, y + h - 16); q.lineTo(L + 16, y + h - 16); q.quadraticCurveTo(L - 26, y + h / 2, L + 16, y + 16); q.closePath(); });
    g.lineWidth = 1.4; g.stroke(inner);
    g.fillStyle = C.INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = lines.length, lh = n > 1 ? 54 : 0, y0 = y + h / 2 - lh * (n - 1) / 2, maxT = R - L - 30;
    lines.forEach((l, i) => {
      const o = typeof l === 'string' ? { text: l } : l, font = (s) => `${o.italic ? 'italic ' : ''}500 ${s}px "Fraunces Variable"`;
      let s = o.size || 50; g.font = font(s);
      const tw = g.measureText(o.text).width; if (tw > maxT) { s = Math.floor(s * maxT / tw); g.font = font(s); }
      g.fillText(o.text, cx, y0 + i * lh);
    });
    g.restore();
  };

  // sabit parşömen altyazı (yeri ve genişliği film boyunca değişmez)
  // M.subY: parşömenin üst kenarı. 1440: Instagram'ın alttaki kullanıcı adı/açıklama alanının
  // (y ≈ 1650 ve aşağısı) üstünde kalır. 16 Kasım 2026'ya kadar 1690'dı ve o alanla çakışıyordu.
  // Film dosyasında `subY: <sayı>` ile değiştirilebilir.
  M.subY = 1440;
  M.drawSubs = function (g, subs, t) {
    if (!subs || !subs.length) return;
    const vis = subs.filter(s => !s.hidden);
    if (!vis.length) return;
    // subKapat: true → görünür altyazılar arasında 1 sn'den uzun boşluk (gizli cümle) varsa parşömen orada kapanır, sonraki altyazıyla yeniden açılır
    // varsayılan (kapalı): parşömen ilk görünür altyazıdan sonuncuya kadar açık kalır (eski filmler)
    const groups = [];
    for (const s of vis) {
      const gr = groups[groups.length - 1];
      if (M.subKapat && gr && s.a - gr.b <= 1) gr.b = Math.max(gr.b, s.b); else if (!M.subKapat && gr) gr.b = Math.max(gr.b, s.b); else groups.push({ a: s.a, b: s.b });
    }
    let open = 0;
    for (const gr of groups) open = Math.max(open, M.clamp((t - gr.a + .3) / .35) * (1 - M.clamp((t - gr.b - .2) / .35)));
    if (open <= 0) return;
    const sy = M.subY, sh = 96, w = M.scrollW * M.easeOut(open), sx0 = 540 - w / 2, sx1 = 540 + w / 2;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const scroll = M.P(p => { p.moveTo(sx0, sy); p.lineTo(sx1, sy); p.quadraticCurveTo(sx1 + 26, sy + sh / 2, sx1, sy + sh); p.lineTo(sx0, sy + sh); p.quadraticCurveTo(sx0 - 26, sy + sh / 2, sx0, sy); p.closePath(); });
    g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 10; g.fillStyle = M.PAT.VELLUM; g.fill(scroll); g.restore();
    g.lineWidth = 3; g.strokeStyle = C.INK; g.stroke(scroll);
    for (const [x, d] of [[sx0, -1], [sx1, 1]]) M.shape(g, M.P(p => p.ellipse(x + d * 8, sy + sh / 2, 12, sh / 2 + 6, 0, 0, TAU)), C.VELLUM_D, '#a88f62', 2.6, 6);
    const cur = vis.find(s => t >= s.a && t < s.b + .3);
    if (cur && open >= 1) {
      const fadeIn = M.clamp((t - cur.a) / .25), fadeOut = 1 - M.clamp((t - cur.b) / .3);
      g.save(); g.beginPath(); g.rect(sx0, sy, w * M.easeOut((t - cur.a) / .35), sh); g.clip();
      g.globalAlpha = Math.min(fadeIn, fadeOut); g.fillStyle = C.INK; g.font = M.subFont; g.textAlign = 'center'; g.textBaseline = 'middle';
      // bölünemeyen (elle yazılmış) uzun satır parşömenden taşmasın: yazı küçülür
      const tw = g.measureText(cur.text).width, maxT = w - 60;
      if (tw > maxT) g.font = M.subFont.replace(/\d+px/, Math.floor(38 * maxT / tw) + 'px');
      g.fillText(cur.text, 540, sy + sh / 2 + 2); g.restore();
    }
    g.restore();
  };

  // tezhip bordürü (ekran koordinatında, her karenin üstüne)
  // =====================================================================
  // INSTAGRAM GÜVENLİ ALANI (17 Kasım 2026)
  // Instagram Reels'i telefonda ekranı dolduracak kadar büyütür: K1'in gerçek karesiyle
  // telefon ekran görüntüsü karşılaştırıldı → her iki yandan ~55 px, üstten ve alttan ~10–15 px
  // gidiyor (iPhone, 19.5:9). Bordür eskiden kenara dayalıydı ve yarısı kesiliyordu.
  // Artık bordür içeri alınır; dışında kesilse de olur düz lacivert bir pay kalır.
  //   M.PAY: bordürün dışındaki düz pay (yan / üst-alt)
  //   M.SUB_MAXW: altyazı parşömeninin en büyük genişliği. Sağdaki beğeni/yorum/gönder sütunu
  //     videoda x ≈ 890–1000, y ≈ 880–1720 aralığına düşer; parşömen (kıvrımlarıyla) x ≤ 860'ta biter.
  //   M.KOR: Instagram arayüzünün üstüne bindiği alanlar (önemli öğe, yazı, yüz konmaz).
  //     Film dosyasında `instaMaske: true` yazınca kareye yarı saydam kırmızı olarak çizilir (yalnızca denetim için).
  M.PAY = { x: 60, y: 22 };
  M.BW = 72; // bordürün kalınlığı
  M.SUB_MAXW = 620;
  M.KOR = [
    { ad: 'kırpılan sol kenar', x: 0, y: 0, w: 60, h: H },
    { ad: 'kırpılan sağ kenar', x: W - 60, y: 0, w: 60, h: H },
    { ad: 'durum çubuğu', x: 0, y: 0, w: W, h: 110 },
    { ad: 'geri oku', x: 0, y: 160, w: 175, h: 110 },
    { ad: 'kamera', x: W - 180, y: 160, w: 180, h: 110 },
    { ad: 'beğeni·yorum·paylaş·gönder·kaydet', x: 885, y: 860, w: W - 885, h: 900 },
    { ad: 'kullanıcı adı ve açıklama', x: 0, y: 1690, w: W, h: H - 1690 },
  ];
  M.instaMaske = function (g) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = 'rgba(230,30,30,.28)'; g.strokeStyle = 'rgba(200,0,0,.9)'; g.lineWidth = 2;
    g.font = '600 22px sans-serif'; g.textBaseline = 'top';
    for (const k of M.KOR) { g.fillStyle = 'rgba(230,30,30,.28)'; g.fillRect(k.x, k.y, k.w, k.h); g.strokeRect(k.x, k.y, k.w, k.h); }
    for (const k of M.KOR) if (k.w > 150 && k.h > 80) { g.fillStyle = '#fff'; g.fillText(k.ad, k.x + 8, k.y + 8); }
    g.restore();
  };

  M.border = function (g, signature = 'Hemdem') {
    const px = M.PAY.x, py = M.PAY.y;
    // düz pay (kırpılırsa kaybolan kısım)
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = C.LAPIS_D; g.fill(M.P(p => { p.rect(0, 0, W, H); p.rect(px, py, W - 2 * px, H - 2 * py); }), 'evenodd');
    g.restore();
    // bordür, payın içine eskisiyle aynı çizimle yerleşir
    M._border(g, signature, px, py, W - 2 * px, H - 2 * py);
  };
  M._border = function (g, signature, ox, oy, W, H) {
    const X0 = 72, Y0 = 72, X1 = W - 72, Y1 = H - 72;
    g.save(); g.setTransform(1, 0, 0, 1, ox, oy);
    const outer = M.P(p => { p.rect(0, 0, W, H); p.rect(X0, Y0, X1 - X0, Y1 - Y0); });
    g.fillStyle = M.PAT.LAPIS; g.fill(outer, 'evenodd');
    const rule = (m, w, c) => { g.lineWidth = w; g.strokeStyle = c; g.strokeRect(m, m, W - 2 * m, H - 2 * m); };
    g.lineWidth = 8; g.strokeStyle = M.PAT.GOLD; g.strokeRect(X0 - 5, Y0 - 5, X1 - X0 + 10, Y1 - Y0 + 10);
    rule(X0 - 10, 2, C.INK); rule(X0, 2.6, C.INK); rule(12, 2, C.INK);
    g.lineWidth = 6; g.strokeStyle = M.PAT.GOLD; g.strokeRect(16, 16, W - 32, H - 32); rule(20, 1.6, C.INK);
    const rosette = (x, y) => { const p = M.P(p => { for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; p.moveTo(x, y); p.ellipse(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 8, 4.5, a, 0, TAU); } }); M.gold(g, p, null, 1.4); g.fillStyle = C.VERM; g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); };
    const mid = (24 + X0 - 10) / 2;
    for (let x = 60; x < W - 40; x += 58) { rosette(x, mid); rosette(x, H - mid); M.triad(g, x + 29, mid, 1.8); M.triad(g, x + 29, H - mid, 1.8); }
    for (let y = 118; y < H - 90; y += 58) { rosette(mid, y); rosette(W - mid, y); M.triad(g, mid, y + 29, 1.8); M.triad(g, W - mid, y + 29, 1.8); }
    for (const [x, y] of [[mid, mid], [W - mid, mid], [mid, H - mid], [W - mid, H - mid]]) { M.gold(g, M.P(p => p.rect(x - 22, y - 22, 44, 44)), { x: x - 6, y: y - 6, r: 40, k: 1 }, 2); g.fillStyle = C.VERM; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.strokeStyle = C.INK; g.lineWidth = 1.6; g.stroke(); }
    if (signature) { g.fillStyle = C.VELLUM; g.font = '600 24px "Fraunces Variable"'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(signature, X1 - 8, Y1 + 34); }
    g.restore();
  };
  // resim alanı (bordürün içi)
  // 17 Kasım 2026: bordür içeri alındığı için resim alanı daraldı (x 132–948, y 94–1826)
  M.PIC = { x: M.PAY.x + M.BW, y: M.PAY.y + M.BW, w: W - 2 * (M.PAY.x + M.BW), h: H - 2 * (M.PAY.y + M.BW) };

  // =====================================================================
  // ÇEKİMLER VE GEÇİŞLER (15 Kasım 2026)
  // Video tek resim değil, sahne sahne akan çekimlerdir. Her çekim kendi dünyasını
  // kendi kamerasıyla çizer; çekimler arası beş geçiş vardır:
  //   'kesme'   sert kesme (vuruşta ya da cümle başında)
  //   'esles'   eşleşen şekil kesmesi: A'nın son karesindeki şekil (yuvarlak, kemer) B'nin ilk
  //             karesinde aynı yerde ve aynı büyüklükte durur; çekimler kendi kameralarıyla bunu kurar.
  //             Kesme anında kısa bir altın parıltısı olur.
  //   'silme'   ön plan silmesi: kadrajdan geniş bir ön plan (servi sırası, sütun, bulut) sağdan sola
  //             geçer; arkasında sahne değişir. { tur:'silme', d:1.0, on:'servi'|'bulut'|fn(g,x0,x1,t) }
  //   'cerceve' çerçeveden içeri geçiş: kamera A'daki bir kapının/pencerenin içinden geçer; açıklıkta
  //             B görünür. { tur:'cerceve', d:0.8, delik: Path2D (A'nın ekran koordinatında), x, y }
  //   (kesintisiz kamera yolculuğu bir geçiş değildir: aynı çekim içinde M.track ile yapılır)
  //
  // M.cekimler(g, t, [{ a, b, ciz(g, t), gecis? }, ...])  — gecis, o çekimden sonrakine geçişi tanımlar.
  // =====================================================================
  M.TAU = TAU; M.W = W; M.H = H;
  M.lwK = 1;   // kontur ölçeği: kamera yaklaştıkça çizgiler orantısız kalınlaşmasın
  const _cam = M.camera;
  M.camera = function (g, cam = {}) { _cam(g, cam); M.lwK = 1 / Math.pow(cam.zoom || 1, .55); };
  const _shape = M.shape;
  M.shape = function (g, path, fill, rim, lw = 3, rimW = 10) { _shape(g, path, fill, rim, lw * M.lwK, rimW * Math.sqrt(M.lwK)); };
  const _gold = M.gold;
  M.gold = function (g, path, lit = null, lw = 3) { _gold(g, path, lit, lw * M.lwK); };

  const base = (g) => g.getTransform();
  function silmeOn(g, x0, w, kind) {
    // ön plan: içi dolu bant, iki kenarı servi silüeti
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    if (kind === 'bulut') {
      g.fillStyle = C.WHITE; g.fillRect(x0 + 120, 0, w - 240, H);
      for (let y = -60; y < H + 120; y += 170) { M.lwK = 1; M.cloud(g, x0 - 40, y, 360, 4); M.cloud(g, x0 + w - 320, y + 80, 360, 4); }
    } else {
      g.fillStyle = M.PAT.LAPIS; g.fillRect(x0 + 160, 0, w - 320, H);
      const n = Math.ceil(w / 150);
      M.lwK = 1;
      for (let i = 0; i <= n; i++) { const x = x0 + i * (w / n); M.cypress(g, x, -200 + (i % 2) * 140, H + 40, 150); }
    }
    g.restore();
  }
  M.cekimler = function (g, t, list) {
    const B0 = base(g);
    const draw = (s, tt) => { g.save(); M.lwK = 1; s.ciz(g, tt); g.restore(); };
    let i = list.findIndex(s => t < s.b); if (i < 0) i = list.length - 1;
    // geçiş penceresinde miyiz? (önceki çekimin geçişi b'den sonra da sürebilir)
    for (let j = Math.max(0, i - 1); j <= Math.min(i, list.length - 2); j++) {
      const A = list[j], Bs = list[j + 1], gc = A.gecis; if (!gc) continue;
      const b = A.b, d = gc.d ?? .8;
      if (gc.tur === 'silme' && t >= b - d / 2 && t < b + d / 2) {
        const u = M.ease((t - (b - d / 2)) / d), ow = W * 1.45, x0 = W - u * (W + ow);
        g.save(); g.beginPath(); g.rect(-1e4, -1e4, 1e4 + Math.max(0, x0) * 1, 3e4); g.clip(); draw(A, t); g.restore();
        g.save(); g.beginPath(); g.rect(x0 + ow, -1e4, 1e5, 3e4); g.clip(); draw(Bs, t); g.restore();
        if (typeof gc.on === 'function') gc.on(g, x0, ow, t); else silmeOn(g, x0, ow, gc.on || 'servi');
        return;
      }
      if (gc.tur === 'cerceve' && t >= b - d && t < b) {
        const u = M.ease((t - (b - d)) / d);
        const bb = gc.kutu || [gc.x - 60, gc.y - 100, 120, 200]; // deliğin ekran kutusu [x,y,w,h]
        const zmax = Math.max(W / bb[2], H / bb[3]) * 1.35, z = Math.exp(Math.log(zmax) * u);
        const fx = gc.x ?? bb[0] + bb[2] / 2, fy = gc.y ?? bb[1] + bb[3] / 2;
        g.save(); g.translate(fx, fy); g.scale(z, z); g.translate(-fx, -fy);
        draw(A, b - d); // A çerçeve anında donar, kamera içine dalar
        g.clip(gc.delik);
        g.setTransform(B0);
        draw(Bs, t);
        g.restore();
        return;
      }
      if (gc.tur === 'esles' && t >= b && t < b + .25) {
        draw(Bs, t);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = .55 * (1 - (t - b) / .25); g.fillStyle = '#f6dc9a'; g.fillRect(0, 0, W, H); g.restore();
        return;
      }
    }
    draw(list[i], t);
  };

  // ---- hareketli figür yardımcıları ----
  // yürüyüş: x0'dan x1'e, t0'dan başlayıp d saniyede; döndürür {x, step, bob}
  M.yuru = (t, t0, d, x0, x1, adim = 1.6) => {
    const u = M.clamp((t - t0) / d), x = x0 + (x1 - x0) * u;
    const moving = u > 0 && u < 1, step = moving ? ((t - t0) * adim) % 1 : 0;
    return { x, step: moving ? step : null, bob: moving ? Math.abs(Math.sin(step * TAU)) * -8 : 0, gidiyor: moving };
  };
  // iki el pozu arasında yumuşak geçiş
  M.el = (t, keys) => M.track(keys, t);
  // gülme: omuz sarsıntısı ve baş geriye
  M.gul = (t, t0, d = 1.6) => { const u = M.clamp((t - t0) / d); if (u <= 0 || u >= 1) return { bob: 0, tilt: 0, agiz: 0 }; const env = Math.sin(u * Math.PI); return { bob: Math.sin((t - t0) * 22) * 5 * env, tilt: -.22 * env, agiz: env }; };

  // fincan, istenen açıyla (rot radyan; π = ters) ve tabaksız da çizilebilir
  M.cupR = function (g, x, y, rot = 0, o = {}) {
    g.save(); g.translate(x, y + 17); g.rotate(rot); g.translate(-x, -(y + 17));
    const cup = M.poly([[x - 20, y], [x + 20, y], [x + 14, y + 34], [x - 14, y + 34]]);
    const handle = M.P(p => { p.arc(x - 22, y + 15, 9, Math.PI * .5, Math.PI * 1.5); p.arc(x - 22, y + 15, 4, Math.PI * 1.5, Math.PI * .5, true); p.closePath(); });
    if (o.gold) { M.gold(g, handle, o.lit, 1.8); M.gold(g, cup, o.lit, 2.6); M.pearls(g, x - 18, y + 4, x + 18, y + 4, 6, 1.8); }
    else { M.shape(g, handle, C.WHITE, null, 1.8); M.shape(g, cup, C.WHITE, '#bfc8dd', 2.2, 4); g.fillStyle = C.LAPIS; g.fillRect(x - 17, y + 8, 34, 6); }
    if (o.kahve && Math.abs(rot) < .4) { g.fillStyle = '#3b2314'; g.beginPath(); g.ellipse(x, y + 2, 18, 4, 0, 0, TAU); g.fill(); }
    g.restore();
  };
  M.saucer = function (g, x, y, o = {}) { const s = M.P(p => p.ellipse(x, y, 28, 7, 0, 0, TAU)); o.gold ? M.gold(g, s, o.lit, 2.2) : M.shape(g, s, C.WHITE, '#bfc8dd', 2); };

  // ---- baş: dönme (tilt), gülen ağız ----
  const _head = M.head;
  M.head = function (g, x, y, o = {}) {
    g.save(); g.translate(x, y + 40); g.rotate(o.tilt || 0); g.translate(-x, -(y + 40));
    _head(g, x, y, o);
    if (o.agiz > .15) { g.fillStyle = '#7a2a1c'; g.beginPath(); g.ellipse(x + 27, y + 24, 6, 5 * o.agiz, 0, 0, TAU); g.fill(); g.strokeStyle = C.INK; g.lineWidth = 1.6; g.stroke(); }
    if (o.gulus > 0) M.gulus(g, x, y, o.gulus, o.gulusAc || 0);
    g.restore();
  };
  // belirgin gülüş (17 Kasım 2026, Z7'de çizildi): kıvrık gülen göz, köşeleri kalkık açık gülümseme, yanak allığı.
  // M.head(g, x, y, { gulus: 0..1 (görünürlük; yüz yavaşça gülüşe döner), gulusAc: 0..1 (ağız açıklığı) }).
  // Küçük ölçekte gülüş en iyi kapalı göz + kalkık köşeli ağızla okunur. Varsayılan kapalı.
  M.gulus = function (g, x, y, k = 1, ac = 0) {
    g.save(); g.globalAlpha *= M.clamp(k);
    const ex = x + 18, ey = y - 6;
    // eski göz ve ağzı ten rengiyle ört
    g.fillStyle = C.SKIN;
    g.beginPath(); g.ellipse(ex + 1, ey + 1, 12, 7, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(x + 27, y + 24, 9, 8, 0, 0, TAU); g.fill();
    // yanak allığı
    g.save(); g.globalAlpha *= .45; g.fillStyle = C.ROSE_D; g.beginPath(); g.ellipse(x + 13, y + 13, 9, 6, 0, 0, TAU); g.fill(); g.restore();
    // gülen göz: yukarı kıvrık yay
    g.strokeStyle = C.INK; g.lineWidth = 2.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ex - 9, ey + 2); g.quadraticCurveTo(ex + 1, ey - 8, ex + 10, ey + 1); g.stroke();
    g.lineWidth = 1.6; g.beginPath(); g.moveTo(ex - 6, ey + 6); g.quadraticCurveTo(ex + 1, ey + 8, ex + 7, ey + 5); g.stroke();
    // açık gülümseme: köşeleri yukarıda hilal
    const op = 5 + 5 * ac;
    const m = M.P(p => { p.moveTo(x + 16, y + 17); p.quadraticCurveTo(x + 26, y + 20, x + 37, y + 15); p.quadraticCurveTo(x + 32, y + 22 + op, x + 22, y + 21 + op * .8); p.quadraticCurveTo(x + 17, y + 20, x + 16, y + 17); p.closePath(); });
    g.fillStyle = '#7a2a1c'; g.fill(m);
    g.save(); g.clip(m); g.fillStyle = '#f6efe0'; g.fillRect(x + 15, y + 14, 24, 6); g.restore();
    g.lineWidth = 2; g.strokeStyle = C.INK; g.stroke(m);
    // gülümseme kıvrımı (yanak çizgisi)
    g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 13, y + 12); g.quadraticCurveTo(x + 12, y + 18, x + 15, y + 21); g.stroke();
    g.restore();
  };
  // oturan ve ayakta figüre gövde sarsıntısı (bob) ekle
  const _seated = M.seated, _standing = M.standing;
  M.seated = function (g, o) { _seated(g, { ...o, y: o.y + (o.bob || 0) }); };
  M.standing = function (g, o) { _standing(g, { ...o, y: o.y + (o.bob || 0) }); };


  // ---- hazır parçalar (16 Kasım 2026, Z1'de çizildi): defter, sandık, mendil, telefon, nazarlık, bebek, oturan figür + kol, kalem, lale, kilim ----
  // Kullanım (film.js içinde): const P = M.parcalar(g);  P.defter(...), P.sandik(...) ... Kılavuz: README.md → Hazır parçalar.
  M.parcalar = function (g) {
  const C = M.C, P = {};
  P.KURSUN = '#7a7671';
  P.BABA = { coat: C.VERD, coatD: C.VERD_D, sash: C.SAFFRON, scarf: C.WHITE };
  P.TORUN = { coat: C.VERM, coatD: C.VERM_D, sash: C.TURQ, hair: '#3a2418', longHair: '#3a2418' };
  P.lerp = (a, b, k) => a + (b - a) * k;

  // figür dönüşümü (M.seated / M.standing ile aynı)
  P.figT = (o) => { g.translate(o.x, o.y + (o.bob || 0)); g.scale((o.dir || 1) * (o.scale || 1), o.scale || 1); g.rotate(o.lean || 0); };
  P.ek = (o, fn) => { g.save(); P.figT(o); fn(); g.restore(); };
  P.yerel = (o, wx, wy) => {
    const s = o.scale || 1, d = o.dir || 1, a = -(o.lean || 0);
    const lx = (wx - o.x) / (d * s), ly = (wy - o.y - (o.bob || 0)) / s;
    return [lx * Math.cos(a) - ly * Math.sin(a), lx * Math.sin(a) + ly * Math.cos(a)];
  };
  P.dunya = (o, lx, ly) => {
    const a = o.lean || 0, s = o.scale || 1, d = o.dir || 1;
    const rx = lx * Math.cos(a) - ly * Math.sin(a), ry = lx * Math.sin(a) + ly * Math.cos(a);
    return [o.x + d * s * rx, o.y + (o.bob || 0) + s * ry];
  };
  // oturan figürün kolunu (aynı biçimle) yeniden çiz: el bir nesnenin üstünde kalsın diye
  P.kolCiz = (o, hx, hy) => P.kol(34, -182, hx, hy + 5, o.coat, o.coatD, 40, 24);
  P.kolUst = (o) => P.ek(o, () => { const [hx, hy] = o.hand || [150, -96]; P.kolCiz(o, hx, hy); });
  // oturan figür (M.seated'in kopyası; kol kalın ve konik, uzanınca incelmez)
  P.oturan = (o) => {
    g.save(); P.figT(o);
    const [hx, hy] = o.hand || [150, -96];
    const body = M.P(p => {
      p.moveTo(-58, -200); p.bezierCurveTo(-72, -142, -96, -82, -120, -30); p.quadraticCurveTo(-128, 4, -96, 4);
      p.lineTo(104, 4); p.quadraticCurveTo(136, 2, 118, -36); p.bezierCurveTo(96, -78, 74, -142, 60, -200); p.quadraticCurveTo(0, -220, -58, -200); p.closePath();
    });
    M.shape(g, body, o.coat, o.coatD, 3, 18);
    M.hiLine(g, q => { q.moveTo(8, -196); q.bezierCurveTo(14, -132, 6, -72, 18, 0); }, 2.4 * M.lwK, .8);
    M.shape(g, M.P(p => { p.moveTo(-66, -102); p.quadraticCurveTo(0, -86, 70, -104); p.lineTo(74, -86); p.quadraticCurveTo(0, -66, -70, -84); p.closePath(); }), o.sash, null, 2.2); M.pearls(g, -60, -93, 64, -95, 10, 2);
    P.kolCiz(o, hx, hy);
    M.head(g, 0, -262, o);
    g.restore();
  };
  // ikinci kol (yerel koordinatta): omuz (sx,sy) → el (hx,hy)
  P.kol = (sx, sy, hx, hy, coat, coatD, w = 34, w1 = 22) => {
    const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const mx = (sx + hx) / 2 + nx * 8, my = (sy + hy) / 2 + ny * 8;
    const p = M.P(q => {
      q.moveTo(sx + nx * w / 2, sy + ny * w / 2);
      const wm = (w + w1) / 4;
      q.quadraticCurveTo(mx + nx * wm, my + ny * wm, hx + nx * w1 / 2, hy + ny * w1 / 2);
      q.lineTo(hx - nx * w1 / 2, hy - ny * w1 / 2);
      q.quadraticCurveTo(mx - nx * wm, my - ny * wm, sx - nx * w / 2, sy - ny * w / 2); q.closePath();
    });
    M.shape(g, p, coat, coatD, 2.8, 10);
    M.shape(g, M.P(q => q.ellipse(hx, hy, 12, 10, 0, 0, TAU)), C.SKIN, C.SKIN_D, 2.2, 5);
  };
  // dünya koordinatında el (avuç)
  P.el = (x, y, s = 1.1) => M.shape(g, M.P(q => q.ellipse(x, y, 13 * s, 10 * s, 0, 0, TAU)), C.SKIN, C.SKIN_D, 2.2, 5);

  // kurşun kalem: uç (x,y), gövde a açısıyla
  P.kalem = (x, y, a = -1.0, L = 50) => {
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, w = 3.6;
    const b0 = [x + ux * 11, y + uy * 11], b1 = [x + ux * L, y + uy * L];
    M.shape(g, M.poly([[b0[0] + nx * w, b0[1] + ny * w], [b1[0] + nx * w, b1[1] + ny * w], [b1[0] - nx * w, b1[1] - ny * w], [b0[0] - nx * w, b0[1] - ny * w]]), C.SAFFRON, C.SAFFRON_D, 1.6, 2);
    M.shape(g, M.poly([[x, y], [b0[0] + nx * w, b0[1] + ny * w], [b0[0] - nx * w, b0[1] - ny * w]]), C.VELLUM, null, 1.4);
    g.fillStyle = C.INK; g.beginPath(); g.moveTo(x, y); g.lineTo(x + ux * 4 + nx * 1.4, y + uy * 4 + ny * 1.4); g.lineTo(x + ux * 4 - nx * 1.4, y + uy * 4 - ny * 1.4); g.closePath(); g.fill();
  };

  // DEFTER. sx: sırt x, cy: orta y, s: ölçek. o: { ac 0 kapalı..1 açık, lit, satir 0..1 (sağ sayfadaki satır),
  // cevir 0..n (dönen sayfalar), yat (dikey basıklık) }. Kapalıyken [sx, sx+90s] × 120s.
  P.defter = (sx, cy, s = 1, o = {}) => {
    const W = 90 * s, H = 120 * s * (o.yat ?? 1), y0 = cy - H / 2, lit = o.lit || null, ac = M.clamp(o.ac ?? 0);
    const satirCiz = (xa, ww, p) => {
      if (p <= 0 || ww < W * .3) return;
      const yy = y0 + H * .34, k = ww / W;
      g.save(); g.strokeStyle = P.KURSUN; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(.7, 2.6 * s * M.lwK);
      g.beginPath(); g.moveTo(xa + ww * .1, yy); g.lineTo(xa + ww * .19, yy); g.stroke();
      const xs = xa + ww * .26, xe = xs + ww * .64 * p;
      g.beginPath(); g.moveTo(xs, yy);
      for (let x = xs; x <= xe; x += Math.max(.6, 1.2 * s)) { const u = (x - xs) / (s * k); g.lineTo(x, yy + Math.sin(u * .62) * 2.3 * s * (o.yat ?? 1) + Math.sin(u * 1.9 + 1) * 1.0 * s); }
      g.stroke(); g.restore();
    };
    const ins = 7 * s * (o.yat ?? 1);
    const sayfa = (x0, w, p = 1) => {
      const xa = Math.min(x0, x0 + w), ww = Math.abs(w); if (ww < .5) return;
      const r = M.P(q => q.rect(xa, y0 + ins, ww, H - 2 * ins));
      M.shape(g, r, C.VELLUM, C.VELLUM_D, 1.8, 5 * s);
      g.save(); g.fillStyle = M.PAT.GOLD; g.fillRect(xa, y0 + ins, ww, 3 * s); g.fillRect(xa, y0 + H - ins - 3 * s, ww, 3 * s); g.restore();
      satirCiz(xa, ww, p);
    };
    const kapakDis = (x0, w) => {
      const xa = Math.min(x0, x0 + w), ww = Math.abs(w); if (ww < .5) return;
      M.gold(g, M.P(q => q.rect(xa, y0, ww, H)), lit, 2.6);
      const kk = ww / W, sw = 9 * s * kk;
      g.fillStyle = C.INK; g.fillRect(w > 0 ? xa : xa + ww - sw, y0, sw, H);
      if (kk > .3) {
        const ex = w > 0 ? xa + ww - 8 * s * kk : xa + 8 * s * kk;
        M.pearls(g, ex, y0 + 12 * s, ex, y0 + H - 12 * s, 7, 2.2 * s * Math.min(1, kk + .2));
        const mx = xa + ww * (w > 0 ? .53 : .47);
        g.save(); g.strokeStyle = 'rgba(70,40,10,.65)'; g.lineWidth = 1.8 * M.lwK; g.beginPath(); g.ellipse(mx, cy, ww * .22, H * .2, 0, 0, TAU); g.stroke();
        g.beginPath(); g.ellipse(mx, cy, ww * .1, H * .09, 0, 0, TAU); g.stroke(); g.restore();
      }
    };
    const kapakIc = (x0, w) => {
      const xa = Math.min(x0, x0 + w), ww = Math.abs(w); if (ww < .5) return;
      M.gold(g, M.P(q => q.rect(xa, y0, ww, H)), lit, 2.4);
      sayfa(x0, w * .9, 1);
    };
    M.gold(g, M.P(q => q.rect(sx - 1, y0, W + 1, H)), lit, 2.4);
    sayfa(sx, W - 8 * s, o.satir ?? 1);
    const fw = W * Math.cos(Math.PI * ac);
    const flap = () => { if (fw >= 0) kapakDis(sx, fw); else kapakIc(sx, fw); };
    if (ac >= .5) flap();
    const cv = o.cevir || 0;
    for (let i = 0; i < Math.ceil(cv - 1e-6); i++) {
      const q = M.clamp(cv - i), pw = (W - 8 * s) * Math.cos(Math.PI * q);
      sayfa(sx, pw, 1);
      if (q > 0 && q < 1) M.flash(g, sx + pw, y0 + 4 * s, 10 * s, Math.sin(Math.PI * q));
    }
    if (ac < .5) flap();
    // isik (0..1): açık defterin sayfaları ve kapağı içerden altınla yanar (Ç2 "sensin")
    const is = M.clamp(o.isik || 0);
    if (is > 0 && ac > .5) {
      const bx = sx - W, bw = 2 * W;
      const box = M.P(q => q.rect(bx, y0, bw, H));
      g.save(); g.clip(box);
      const gr = g.createRadialGradient(sx, cy, 0, sx, cy, W * 1.15);
      gr.addColorStop(0, `rgba(255,224,140,${.85 * is})`); gr.addColorStop(.6, `rgba(244,190,80,${.6 * is})`); gr.addColorStop(1, `rgba(214,150,50,${.45 * is})`);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(236,180,70,${.55 * is})`; g.fill(box);
      g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fill(box);
      g.restore();
      // yaldızlı sayfa kenarları ve sırt
      g.save(); g.globalAlpha = is; g.fillStyle = M.PAT.GOLD;
      g.fillRect(bx, y0, bw, 8 * s); g.fillRect(bx, y0 + H - 8 * s, bw, 8 * s); g.fillRect(sx - 4 * s, y0, 8 * s, H);
      g.restore();
      g.strokeStyle = C.INK; g.lineWidth = 2.2 * M.lwK; g.strokeRect(bx, y0, bw, H);
      g.beginPath(); g.moveTo(sx, y0); g.lineTo(sx, y0 + H); g.stroke();
    }
    g.strokeStyle = C.INK; g.lineWidth = 2 * M.lwK; g.beginPath(); g.moveTo(sx, y0 - 2 * s); g.lineTo(sx, y0 + H + 2 * s); g.stroke();
  };

  // küçük lale nakşı
  P.lale = (x, y, s = 1) => {
    g.strokeStyle = C.LEAF_D; g.lineWidth = 1.8 * M.lwK; g.beginPath(); g.moveTo(x, y + 4 * s); g.lineTo(x, y + 13 * s); g.stroke();
    const fl = M.P(p => { p.moveTo(x - 7 * s, y - 9 * s); p.lineTo(x - 3 * s, y - 3 * s); p.lineTo(x, y - 11 * s); p.lineTo(x + 3 * s, y - 3 * s); p.lineTo(x + 7 * s, y - 9 * s); p.quadraticCurveTo(x + 8 * s, y + 5 * s, x, y + 5 * s); p.quadraticCurveTo(x - 8 * s, y + 5 * s, x - 7 * s, y - 9 * s); p.closePath(); });
    M.shape(g, fl, C.VERM, C.VERM_D, 1.4, 3);
  };

  // MENDİL: eşkenar dörtgen (yerde basık). o: { ry, kanat 0..1 (dört köşe ortaya katlanır), iz: [w,h] defter izi, ic(): kanatlardan önce }
  P.mendil = (cx, cy, r, o = {}) => {
    const ry = o.ry ?? .5, kn = M.clamp(o.kanat || 0), ctr = [cx, cy];
    const K = { L: [cx - r, cy], T: [cx, cy - r * ry], R: [cx + r, cy], B: [cx, cy + r * ry] };
    const ord = ['L', 'T', 'R', 'B'];
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], lp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const fo = { L: 0, R: 1, T: 2, B: 3 }, q = {};
    for (const c of ord) q[c] = M.ease((kn - fo[c] * .18) / .46);
    const pts = [];
    ord.forEach((c, i) => { const pv = K[ord[(i + 3) % 4]], nx = K[ord[(i + 1) % 4]]; pts.push(lp(K[c], mid(K[c], pv), q[c])); pts.push(lp(K[c], mid(K[c], nx), q[c])); });
    const base = M.poly(pts);
    M.shape(g, base, C.WHITE, '#d3c8b2', 2.4, 8);
    g.save(); g.clip(base);
    g.strokeStyle = C.SAFFRON; g.lineWidth = 4 * M.lwK;
    g.beginPath(); ord.forEach((c, i) => { const p = lp(K[c], ctr, .1); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.stroke();
    g.restore();
    if (q.B < .5) P.lale(...lp(K.B, ctr, .17), r / 105);
    if (o.iz) { g.save(); g.strokeStyle = 'rgba(150,140,120,.8)'; g.lineWidth = 1.6 * M.lwK; g.setLineDash([5 * M.lwK, 4 * M.lwK]); g.strokeRect(cx - o.iz[0] / 2, cy - o.iz[1] / 2, o.iz[0], o.iz[1]); g.restore(); }
    if (o.ic) o.ic();
    for (const c of ['L', 'R', 'T', 'B']) {
      if (q[c] <= 0) continue;
      const i = ord.indexOf(c), m1 = mid(K[c], K[ord[(i + 3) % 4]]), m2 = mid(K[c], K[ord[(i + 1) % 4]]), tip = lp(K[c], ctr, q[c]);
      const tri = M.poly([m1, m2, tip]);
      M.shape(g, tri, '#fbf5e8', '#d3c8b2', 2.2, 6);
      g.save(); g.clip(tri); g.strokeStyle = C.SAFFRON; g.lineWidth = 4 * M.lwK;
      const a = lp(m1, tip, .0), b = lp(m2, tip, .0); const ti = lp(tip, mid(m1, m2), .12), a2 = lp(m1, mid(m1, m2), .12), b2 = lp(m2, mid(m1, m2), .12);
      g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(ti[0], ti[1]); g.lineTo(b2[0], b2[1]); g.stroke(); g.restore();
      if (c === 'B' && q.B >= .5) P.lale(...lp(tip, mid(m1, m2), .3), r / 110);
    }
  };

  // SANDIK. Ön yüz x0..x0+w × yOn..yOn+h, ağız derinliği d (yukarı), a kapak açıklığı 0..1.
  // o.ic(): ağzın içinde (kırpılmış), o.icUst(): ağızdan taşan (ön yüzün arkasında)
  P.sandik = (x0, yOn, w, h, d, a, o = {}) => {
    const x1 = x0 + w, yB = yOn - d, xm = (x0 + x1) / 2;
    const ang = M.clamp(a) * Math.PI * .56;
    const yF = yB + d * Math.cos(ang) - d * 1.15 * Math.sin(ang);
    const mouth = M.poly([[x0 + 4, yOn], [x0 + 16, yB], [x1 - 16, yB], [x1 - 4, yOn]]);
    M.shape(g, mouth, '#4a2c17', '#2b170a', 2.6, 18);
    g.save(); g.clip(mouth);
    M.shape(g, M.P(p => p.rect(x0 + 22, yOn - 36, w * .4, 34)), C.VERM, C.VERM_D, 2, 6);
    M.shape(g, M.P(p => p.rect(x0 + 30 + w * .4, yOn - 32, w * .44, 30)), C.TURQ, C.TURQ_D, 2, 6);
    M.hiLine(g, q => { q.moveTo(x0 + 30, yOn - 22); q.lineTo(x0 + 16 + w * .4, yOn - 22); q.moveTo(x0 + 40 + w * .4, yOn - 18); q.lineTo(x0 + 22 + w * .84, yOn - 18); }, 1.8 * M.lwK, .6);
    if (o.ic) o.ic();
    g.restore();
    const lidIc = () => {
      const lid = M.poly([[x0 + 12, yB], [x0 + 2, yF], [x1 - 2, yF], [x1 - 12, yB]]);
      M.shape(g, lid, C.WOOD_D, '#4a2c17', 3, 14);
      const hh = yB - yF;
      if (hh > 30) { M.shape(g, M.P(p => p.rect(x0 + 24, yF + hh * .45, w - 48, 9)), C.COPPER, C.COPPER_D, 1.6, 3); }
    };
    const lidDis = () => {
      const k = (yF - yB) / d, bulge = 26 * k;
      const lid = M.P(p => { p.moveTo(x0 - 5, yF); p.lineTo(x0 + 8, yB); p.quadraticCurveTo(xm, yB - bulge, x1 - 8, yB); p.lineTo(x1 + 5, yF); p.closePath(); });
      M.shape(g, lid, C.WOOD, C.WOOD_D, 3, 14);
      g.save(); g.clip(lid);
      M.shape(g, M.P(p => p.rect(x0 - 10, yF - 20 * k, w + 20, 20 * k + 2)), C.WOOD_D, null, 2);
      g.restore();
      // kapağın üstünde iki bakır kuşak ve önde safran şerit
      g.save(); g.clip(lid);
      for (const u of [.3, .7]) { const xx = x0 + w * u; M.shape(g, M.P(p => p.rect(xx - 8, yB - 40, 16, yF - yB + 40)), C.COPPER, C.COPPER_D, 1.8, 3); }
      M.shape(g, M.P(p => p.rect(x0 - 10, yF - 20 * k - 12 * k, w + 20, 10 * k)), C.SAFFRON, C.SAFFRON_D, 1.6, 3);
      g.restore();
      for (const [cx2, s2] of [[x0 - 5, 1], [x1 + 5, -1]]) M.shape(g, M.poly([[cx2, yF], [cx2 + 30 * s2, yF], [cx2 + 8 * s2, yF - 26 * k]]), C.COPPER, C.COPPER_D, 1.8, 4);
      if (k > .7) { M.shape(g, M.P(p => p.rect(xm - 12, yF - 4, 24, 26)), C.COPPER, C.COPPER_D, 1.8, 3); }
    };
    if (yF < yB - 1) lidIc();
    if (o.icUst) o.icUst();
    M.shape(g, M.P(p => p.rect(x0, yOn, w, h)), C.WOOD, C.WOOD_D, 3, 16);
    g.save(); g.strokeStyle = C.WOOD_D; g.lineWidth = 2 * M.lwK; g.beginPath(); g.moveTo(x0 + 10, yOn + h * .3); g.lineTo(x1 - 10, yOn + h * .3); g.stroke(); g.restore();
    M.shape(g, M.P(p => p.rect(x0, yOn + h * .56, w, h * .15)), C.SAFFRON, C.SAFFRON_D, 2, 4);
    for (const [cx2, cy2, a2, b2] of [[x0, yOn, 1, 1], [x1, yOn, -1, 1], [x0, yOn + h, 1, -1], [x1, yOn + h, -1, -1]]) M.shape(g, M.poly([[cx2, cy2], [cx2 + 36 * a2, cy2], [cx2, cy2 + 36 * b2]]), C.COPPER, C.COPPER_D, 2, 5);
    M.shape(g, M.P(p => p.rect(xm - 19, yOn + 4, 38, 46)), C.COPPER, C.COPPER_D, 2.2, 5);
    g.fillStyle = C.INK; g.beginPath(); g.arc(xm, yOn + 22, 4.5, 0, TAU); g.fill(); g.fillRect(xm - 1.8, yOn + 22, 3.6, 14);
    if (yF >= yB - 1) lidDis();
  };

  // TELEFON. (cx,cy) orta. o: { ekran 0..1, ters 0..1 (yüzüstü), rot, yat }
  P.telefon = (cx, cy, s = 1, o = {}) => {
    const w = 46 * s, h = 84 * s, ters = M.clamp(o.ters || 0), sy = Math.cos(Math.PI * ters);
    const on = sy > 0 ? (o.ekran || 0) : 0;
    if (on > 0) { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 130 * s); gr.addColorStop(0, `rgba(205,240,236,${.38 * on})`); gr.addColorStop(1, 'rgba(205,240,236,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 130 * s, 0, TAU); g.fill(); }
    // yüzüstü yatarken: altından sızan soğuk ekran ışığı (rayın üstüne) ve görünen metal kenar
    const yatik = M.clamp((ters - .5) * 2);
    if (yatik > 0) {
      const lk = yatik * (.35 + .65 * (o.ekran || 0));
      const L2 = h * .5 + 16 * s, Y2 = (w * .5) * (o.yat ?? 1) + 10 * s;
      const gr2 = g.createRadialGradient(cx, cy + 6 * s, 0, cx, cy + 6 * s, L2 * 1.3);
      gr2.addColorStop(0, `rgba(190,236,232,${.55 * lk})`); gr2.addColorStop(.55, `rgba(160,220,222,${.28 * lk})`); gr2.addColorStop(1, 'rgba(160,220,222,0)');
      g.save(); g.fillStyle = gr2; g.beginPath(); g.ellipse(cx, cy + 6 * s, L2 * 1.3, Y2 * 1.6, 0, 0, TAU); g.fill(); g.restore();
      // telefonun kalınlığı: alt kenarda ince açık metal bant, ışık bandı altında
      const ex = h / 2, ey = (w / 2) * (o.yat ?? 1);
      g.save(); g.globalAlpha = yatik;
      M.shape(g, M.P(p => p.roundRect(cx - ex, cy - ey + 6 * s, 2 * ex, 2 * ey, 7 * s)), '#a7a29b', '#6d6862', 2, 3);
      g.strokeStyle = `rgba(200,244,240,${.9 * lk})`; g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(cx - ex + 8 * s, cy + ey + 6 * s + 2.5 * s); g.lineTo(cx + ex - 8 * s, cy + ey + 6 * s + 2.5 * s); g.stroke();
      g.restore();
    }
    g.save(); g.translate(cx, cy); g.scale(1, o.yat ?? 1); if (o.rot) g.rotate(o.rot); g.scale(1, Math.max(.06, Math.abs(sy)));
    M.shape(g, M.P(p => p.roundRect(-w / 2, -h / 2, w, h, 8 * s)), '#2c2622', '#14100d', 2.6, 6);
    // ince metal çerçeve
    g.save(); g.strokeStyle = '#8f8a84'; g.lineWidth = 2.2 * s; g.beginPath(); g.roundRect(-w / 2 + 2.2 * s, -h / 2 + 2.2 * s, w - 4.4 * s, h - 4.4 * s, 6.5 * s); g.stroke(); g.restore();
    if (sy > 0) {
      const scr = M.P(p => p.roundRect(-w / 2 + 4 * s, -h / 2 + 10 * s, w - 8 * s, h - 20 * s, 3 * s));
      const r0 = [29, 38, 64], r1 = [214, 240, 236], mix = r0.map((v, i) => Math.round(v + (r1[i] - v) * on));
      g.fillStyle = `rgb(${mix})`; g.fill(scr);
      if (on > .3) {
        g.save(); g.globalAlpha = M.clamp((on - .3) / .5); g.strokeStyle = '#8b9593'; g.lineCap = 'round'; g.lineWidth = Math.max(.8, 2.6 * s * M.lwK);
        const yy = -h * .18; g.beginPath(); g.moveTo(-w * .3, yy);
        for (let x = -w * .3; x <= w * .24; x += .8 * s) g.lineTo(x, yy + Math.sin((x + w) / s * .7) * 1.4 * s);
        g.stroke(); g.restore();
      }
      g.fillStyle = '#56504a'; g.fillRect(-6 * s, -h / 2 + 4 * s, 12 * s, 2.4 * s);
    } else {
      // arka yüz: kamera adası (iki mercek) ve hafif parlaklık
      M.shape(g, M.P(p => p.roundRect(-w / 2 + 6 * s, -h / 2 + 6 * s, 20 * s, 26 * s, 5 * s)), '#47413b', null, 1.6);
      for (const yy of [-h / 2 + 13 * s, -h / 2 + 25 * s]) { g.fillStyle = '#121010'; g.beginPath(); g.arc(-w / 2 + 16 * s, yy, 4.4 * s, 0, TAU); g.fill(); g.strokeStyle = '#8f8a84'; g.lineWidth = 1.2 * s; g.stroke(); }
      M.hiLine(g, q => { q.moveTo(w * .32, -h * .3); q.lineTo(w * .32, h * .3); }, 1.6 * M.lwK, .3);
    }
    g.restore();
  };

  // NAZARLIK (1 adet): (x,y) çengel; ip, boncuk, püskül. sw: sallanma açısı
  P.nazarlik = (x, y, r = 22, sw = 0) => {
    g.save(); g.translate(x, y); g.rotate(sw);
    g.strokeStyle = C.VERM; g.lineWidth = 2.4 * M.lwK; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 16); g.stroke();
    const by = 16 + r;
    g.strokeStyle = C.TURQ_D; g.lineWidth = 2 * M.lwK; g.beginPath(); g.moveTo(0, by + r); g.lineTo(0, by + r + 8); g.stroke();
    M.shape(g, M.P(p => { p.moveTo(0, by + r + 6); p.quadraticCurveTo(7, by + r + 16, 4, by + r + 24); p.lineTo(-4, by + r + 24); p.quadraticCurveTo(-7, by + r + 16, 0, by + r + 6); p.closePath(); }), C.TURQ, C.TURQ_D, 1.6, 3);
    M.shape(g, M.P(p => p.arc(0, by, r, 0, TAU)), C.LAPIS, C.LAPIS_D, 2.4, 6);
    g.fillStyle = C.WHITE; g.beginPath(); g.arc(0, by, r * .64, 0, TAU); g.fill();
    g.fillStyle = C.TURQ; g.beginPath(); g.arc(0, by, r * .42, 0, TAU); g.fill();
    g.fillStyle = C.INK; g.beginPath(); g.arc(0, by, r * .2, 0, TAU); g.fill();
    M.hiLine(g, q => { q.arc(0, by, r * .82, -2.4, -1.5); }, 1.6 * M.lwK, .7);
    g.restore();
  };

  // BEBEK (~1 yaş): iri baş, kısa gövde, kısa bacaklar, kollar yana-yukarı. Yerel (0,0) ayak hizası, sağa bakar.
  // o: { x, y, dir, scale, step, bob, sway, oturur 0..1, kol 0 (aşağı) .. 1 (açık, yukarı) }
  P.bebek = (o) => {
    g.save(); g.translate(o.x, o.y + (o.bob || 0)); g.scale((o.dir || 1) * (o.scale || 1), o.scale || 1); g.rotate(o.sway || 0);
    const ot = M.clamp(o.oturur || 0), kol = o.kol ?? 1;
    const sw = o.step != null ? Math.sin(o.step * TAU) * 9 : 0;
    // bacaklar ya da oturunca öne uzanan ayaklar
    if (ot < .5) {
      for (const [dx, kk] of [[-13, 1], [13, -1]]) {
        const lx = dx + sw * kk * .5;
        M.shape(g, M.P(p => p.roundRect(lx - 8, -46, 16, 40, 6)), C.SKIN, C.SKIN_D, 2.2, 4);
        M.shape(g, M.P(p => p.ellipse(lx + 4, -5, 13, 7, 0, 0, TAU)), C.WHITE, '#cfc6b4', 2, 3);
      }
    } else {
      M.shape(g, M.P(p => p.ellipse(30, -6, 16, 8, 0, 0, TAU)), C.WHITE, '#cfc6b4', 2, 3);
      M.shape(g, M.P(p => p.ellipse(52, -2, 14, 8, 0, 0, TAU)), C.WHITE, '#cfc6b4', 2, 3);
    }
    g.translate(0, ot * 34);
    // arka kol
    const ka = (side) => { const sx = 14 * side, sy = -104; const hx = side * (P.lerp(30, 60, kol)) + 6, hy = P.lerp(-58, -152, kol); M.shape(g, M.P(p => { p.moveTo(sx - 9, sy); p.quadraticCurveTo((sx + hx) / 2 - 6, (sy + hy) / 2 - 4 * side, hx - 7, hy); p.lineTo(hx + 7, hy + 4); p.quadraticCurveTo((sx + hx) / 2 + 6, (sy + hy) / 2 + 8, sx + 9, sy + 12); p.closePath(); }), C.VERM, C.VERM_D, 2.4, 6); M.shape(g, M.P(p => p.arc(hx, hy, 9, 0, TAU)), C.SKIN, C.SKIN_D, 2, 3); };
    ka(-1);
    const dress = M.P(p => { p.moveTo(-22, -118); p.quadraticCurveTo(0, -126, 22, -118); p.quadraticCurveTo(34, -80, 46, -40); p.quadraticCurveTo(0, -30, -46, -40); p.quadraticCurveTo(-34, -80, -22, -118); p.closePath(); });
    M.shape(g, dress, C.VERM, C.VERM_D, 2.8, 12);
    M.pearls(g, -40, -44, 40, -44, 8, 2.2);
    ka(1);
    M.head(g, 0, -158, { hair: '#6b4426', tilt: o.tilt || 0, agiz: o.agiz || 0 });
    g.restore();
  };

  // ---- ortak zemin parçaları ----
  P.kilim = (x0, y0, x1, y1) => {
    const r = M.P(p => p.rect(x0, y0, x1 - x0, y1 - y0));
    M.shape(g, r, C.VERM, C.VERM_D, 3, 16);
    g.save(); g.clip(r);
    for (let y = y0 + 50; y < y1; y += 90) for (let x = x0 + 40 + ((y / 90) % 2) * 45; x < x1; x += 90) {
      const dd = M.poly([[x, y - 22], [x + 22, y], [x, y + 22], [x - 22, y]]);
      g.fillStyle = '#f0d9a6'; g.fill(dd); g.strokeStyle = C.INK; g.lineWidth = 1.4 * M.lwK; g.stroke(dd);
      g.fillStyle = C.LAPIS; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
    }
    g.restore();
  };
  // --- K1'de çizildi (16 Kasım 2026): çay bardağı, tabak, çaydanlık, demlik, akış, buhar ---
  const TAU = M.TAU;
  const PROF = [[0, 1], [.16, .93], [.42, .7], [.6, .76], [.8, .88], [.92, .84], [1, .74]];
  const hw = (u) => M.track(PROF, u);
  P.bardakYol = (x, y0, R, H) => M.P(p => {
    const ry = R * .28, n = 22;
    p.moveTo(x + R, y0);
    for (let i = 1; i <= n; i++) { const u = i / n; p.lineTo(x + R * hw(u), y0 + H * u); }
    p.ellipse(x, y0 + H, R * .74, ry * .74, 0, 0, Math.PI);
    for (let i = n; i >= 0; i--) { const u = i / n; p.lineTo(x - R * hw(u), y0 + H * u); }
    p.ellipse(x, y0, R, ry, 0, Math.PI, TAU);
    p.closePath();
  });
  P.bardak = (x, yb, o = {}) => {
    const s = o.s || 1, R = 23 * s, H = 72 * s, y0 = yb - H, ry = R * .28, f = M.clamp(o.f ?? 0);
    g.save();
    if (o.rot) { g.translate(x, yb); g.rotate(o.rot); g.translate(-x, -yb); }
    const yol = P.bardakYol(x, y0, R, H);
    // cam: soluk, yarı saydam
    g.fillStyle = 'rgba(222,240,236,.42)'; g.fill(yol);
    // çay
    if (f > 0) {
      const yt = y0 + 5 * s + (H - 7 * s) * (1 - f);
      g.save(); g.clip(yol);
      g.fillStyle = '#9a2c12'; g.fillRect(x - R - 4, yt, 2 * R + 8, H + 20);
      g.fillStyle = 'rgba(60,12,4,.35)'; g.fillRect(x - R - 4, y0 + H * .82, 2 * R + 8, H);
      const w = R * hw((yt - y0) / H) * .98;
      g.fillStyle = '#c4522a'; g.beginPath(); g.ellipse(x, yt, w, ry * w / R, 0, 0, TAU); g.fill();
      g.restore();
    }
    // camın içteki açık firuze çizgisi ve kontur
    g.save(); g.clip(yol); g.strokeStyle = 'rgba(150,205,205,.9)'; g.lineWidth = 3.2 * s * M.lwK; g.stroke(yol); g.restore();
    g.strokeStyle = C.INK; g.lineWidth = 1.7 * s * M.lwK; g.lineJoin = 'round'; g.stroke(yol);
    // ağzın ön kenarı
    g.strokeStyle = C.INK; g.lineWidth = 1.3 * s * M.lwK; g.beginPath(); g.ellipse(x, y0, R, ry, 0, 0, Math.PI); g.stroke();
    // üstübeç ışık çizgisi
    M.hiLine(g, q => { q.moveTo(x - R * .62, y0 + H * .12); q.lineTo(x - R * .5, y0 + H * .38); q.moveTo(x - R * .55, y0 + H * .62); q.lineTo(x - R * .62, y0 + H * .84); }, 2.2 * s * M.lwK, .9);
    // kenar: altın varak ya da firuze şerit (arka halka + ön bant)
    const bh = 5.5 * s;
    const halka = M.P(p => { p.ellipse(x, y0, R, ry, 0, 0, TAU); p.ellipse(x, y0, R - 2.4 * s, ry - 1.3 * s, 0, 0, TAU, true); });
    const bant = M.P(p => { p.ellipse(x, y0, R, ry, 0, 0, Math.PI); p.lineTo(x - R * .985, y0 + bh); p.ellipse(x, y0 + bh, R * .985, ry, 0, Math.PI, 0, true); p.closePath(); });
    if (o.kenar === 'altin') { M.gold(g, halka, o.lit || null, 1.1 * s); M.gold(g, bant, o.lit || null, 1.3 * s); }
    else if (o.kenar === 'firuze') { M.shape(g, halka, C.TURQ, null, 1.1 * s); M.shape(g, bant, C.TURQ, C.TURQ_D, 1.3 * s, 2 * s); }
    // çatlak: kenarı kesen küçük zikzak
    if (o.catlak != null && Math.sin(o.catlak) > .08) {
      const th = o.catlak, k = Math.sin(th), cx = x + R * Math.cos(th), cy = y0 + ry * Math.sin(th);
      const pts = [[0, -1.5], [2.6, 3.5], [-1.8, 7], [2.2, 10.5], [-.6, 14.5]].map(([dx, dy]) => [cx + dx * s * k, cy + dy * s]);
      const ca = M.clamp(o.catlakAltin || 0);
      const yolC = () => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); };
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (ca > 0) { g.save(); g.strokeStyle = `rgba(255,214,120,${.45 * ca})`; g.lineWidth = 5 * s * M.lwK; yolC(); g.stroke(); g.restore(); }
      g.strokeStyle = C.INK; g.lineWidth = 1.8 * s * M.lwK; yolC(); g.stroke();
      if (ca > 0) { g.save(); g.globalAlpha = ca; g.strokeStyle = '#ffd77a'; g.lineWidth = 1.5 * s * M.lwK; yolC(); g.stroke(); g.restore(); }
    }
    g.restore();
  };
  P.tabak = (x, y, s = 1) => {
    M.shape(g, M.P(p => p.ellipse(x, y, 40 * s, 10 * s, 0, 0, TAU)), C.WHITE, '#c6cfdc', 2.2, 4);
    g.strokeStyle = C.TURQ; g.lineWidth = 1.6 * s * M.lwK; g.beginPath(); g.ellipse(x, y - 1 * s, 30 * s, 6.5 * s, 0, 0, TAU); g.stroke();
  };
  P.caydanlik = (x, yb, s = 1) => {
    // yan kulp (sağda)
    M.shape(g, M.P(p => { p.moveTo(x + 30 * s, yb - 46 * s); p.bezierCurveTo(x + 62 * s, yb - 50 * s, x + 62 * s, yb - 14 * s, x + 34 * s, yb - 12 * s); p.lineTo(x + 34 * s, yb - 19 * s); p.bezierCurveTo(x + 52 * s, yb - 21 * s, x + 52 * s, yb - 42 * s, x + 30 * s, yb - 38 * s); p.closePath(); }), C.COPPER_D, null, 2);
    // emzik (solda)
    M.shape(g, M.P(p => { p.moveTo(x - 30 * s, yb - 30 * s); p.quadraticCurveTo(x - 52 * s, yb - 34 * s, x - 62 * s, yb - 54 * s); p.lineTo(x - 55 * s, yb - 57 * s); p.quadraticCurveTo(x - 46 * s, yb - 44 * s, x - 28 * s, yb - 42 * s); p.closePath(); }), C.COPPER, C.COPPER_D, 2.2, 4);
    const body = M.P(p => { p.moveTo(x - 30 * s, yb); p.bezierCurveTo(x - 46 * s, yb - 10 * s, x - 44 * s, yb - 44 * s, x - 22 * s, yb - 54 * s); p.lineTo(x + 22 * s, yb - 54 * s); p.bezierCurveTo(x + 44 * s, yb - 44 * s, x + 46 * s, yb - 10 * s, x + 30 * s, yb); p.closePath(); });
    M.shape(g, body, C.COPPER, C.COPPER_D, 2.8, 10);
    M.shape(g, M.P(p => p.ellipse(x, yb - 55 * s, 23 * s, 5 * s, 0, 0, TAU)), C.COPPER_D, null, 2);
    M.hiLine(g, q => { q.moveTo(x - 26 * s, yb - 40 * s); q.quadraticCurveTo(x - 32 * s, yb - 24 * s, x - 24 * s, yb - 8 * s); }, 2.4 * M.lwK, .75);
    M.pearls(g, x - 26 * s, yb - 28 * s, x + 26 * s, yb - 28 * s, 6, 1.8 * s);
  };
  const DTIP = [-46, -31], DKULP = [31, -18];
  P.demlik = (o) => {
    const s = o.s || 1, a = o.a || 0;
    g.save();
    if (o.el) { g.translate(o.el[0], o.el[1]); g.rotate(a); g.scale(s, s); g.translate(-DKULP[0], -DKULP[1]); }
    else { g.translate(o.x, o.y); g.scale(s, s); }
    const lw = M.lwK; M.lwK = lw / s; // ölçekli çizimde kontur sabit kalsın
    M.shape(g, M.P(p => { p.moveTo(18, -29); p.bezierCurveTo(36, -32, 38, -6, 20, -6); p.lineTo(20, -11); p.bezierCurveTo(31, -12, 30, -25, 18, -23); p.closePath(); }), C.WHITE, null, 2);
    M.shape(g, M.P(p => { p.moveTo(-18, -10); p.quadraticCurveTo(-34, -14, -47, -33); p.lineTo(-42, -35); p.quadraticCurveTo(-32, -22, -16, -22); p.closePath(); }), C.WHITE, '#c6cfdc', 2, 3);
    const body = M.P(p => { p.moveTo(-17, 0); p.bezierCurveTo(-28, -6, -27, -30, -14, -34); p.lineTo(14, -34); p.bezierCurveTo(27, -30, 28, -6, 17, 0); p.closePath(); });
    M.shape(g, body, C.WHITE, '#c6cfdc', 2.6, 7);
    M.shape(g, M.P(p => p.ellipse(0, -35, 15, 4, 0, 0, TAU)), C.WHITE, '#c6cfdc', 2);
    M.shape(g, M.P(p => p.arc(0, -41, 4.5, 0, TAU)), C.VERM, C.VERM_D, 1.6, 2);
    P.lale(0, -18, .95);
    M.lwK = lw;
    g.restore();
    if (o.el) {
      const dx = (DTIP[0] - DKULP[0]) * s, dy = (DTIP[1] - DKULP[1]) * s, c = Math.cos(a), sn = Math.sin(a);
      return [o.el[0] + dx * c - dy * sn, o.el[1] + dx * sn + dy * c];
    }
    return [o.x + DTIP[0] * s, o.y + DTIP[1] * s];
  };
  P.demlikKulp = (x, y, s = 1) => [x + DKULP[0] * s, y + DKULP[1] * s];
  P.akis = (x0, y0, x1, y1, bas, son, s = 1) => {
    if (bas <= son) return;
    const pt = (u) => { const mx = x0 - 4 * s, my = (y0 + y1) / 2; const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u; return [a * x0 + b * mx + c * x1, a * y0 + b * my + c * y1]; };
    g.save(); g.lineCap = 'round';
    for (const [w, col] of [[3.6 * s, '#7a200c'], [1.4 * s, '#d0643a']]) {
      g.strokeStyle = col; g.lineWidth = w * Math.max(.6, M.lwK * 1.4); g.beginPath();
      for (let i = 0; i <= 16; i++) { const u = son + (bas - son) * i / 16, [a, b] = pt(u); i ? g.lineTo(a, b) : g.moveTo(a, b); }
      g.stroke();
    }
    g.restore();
  };
  // buhar: iki ince iplik (birleşme yok; K1'deki birleşen buhar filmde kaldı)
  P.buhar = (x, y, t, o = {}) => {
    const h = o.h || 70, a = o.a ?? .6, kal = o.kal || 1;
    if (a <= 0) return;
    g.save(); g.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 2; i++) {
      g.strokeStyle = pass ? '#fdf9f0' : 'rgba(110,120,140,.5)';
      const x0 = x + (i ? 6 : -6), N = 24;
      let px = x0, py = y;
      for (let j = 1; j <= N; j++) {
        const v = j / N;
        const sway = Math.sin(t * 1.4 + v * 5.5 + i * 2.1) * 7 * v + Math.sin(t * .7 + i) * 3 * v;
        const nx = x0 + sway, ny = y - v * h;
        g.globalAlpha = a * (1 - v * .75);
        g.lineWidth = ((2.6 + 2.2 * v) * kal + (pass ? 0 : 2.2)) * M.lwK;
        g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
        px = nx; py = ny;
      }
    }
    g.restore();
  };

  // ---- hazır parçalar (17 Kasım 2026, K4 "Yadigâr"da çizildi): mutfak, eski ev, iskele ----
  //   P.ocak(x0, x1, yTezgah, o)   iki gözlü ocak (o.beyaz: eski ev; o.alev: alevin x'i; o.t: titreşim zamanı)
  //   P.tava(cx, yTaban, o)        tava; o: renk, renkD, sap (-1 sol / 1 sağ), sapL, rot, icRenk, icerik [[x,y,tur,a]] (ağız merkezine göre)
  //   P.parca(x, y, tur, a)        doğranmış parça: 'sogan' | 'domates' | 'biber'
  //   P.tahta(x0, x1, yTezgah)     kesme tahtası (üst yüz yTezgah-20)
  //   P.yarimSogan(cx, cy, r, o)   kesik yüzü dönük yarım soğan; halkalar altın varak; o.isik 0..1 (içten dışa), o.k
  //   P.butunSogan(cx, cy, r)      bütün soğan
  //   P.bicak(x, y, a, s)          bıçak; (x,y) sapın ucu (el), a bıçağın yönü
  //   P.kasik(hx, hy, bx, by)      tahta kaşık; el → kaşık ağzı
  //   P.radyo(cx, cy, o)           eski masa radyosu; o: renk, renkD, dugme (açı), ibre (-1..1)
  //   P.pencere(x0, y0, x1, y1, ic) beyaz pervazlı iki kanatlı pencere; ic() camın içini çizer
  //   P.nis(cx, top, bot, w, o)    sivri kemerli niş; o.dol 0..1 altın zemin + o.ic() küçük minyatür, o.k
  //   P.kase(x, y, a)              firuze kâse (eğik)
  //   P.mini(x, y, coat, o)        uzaktan baş-omuz (o.scarf, o.hair)
  //   P.vapur(x, ySu, o)           çift katlı İstanbul vapuru; o: s (ölçek), kafalar (güvertede üç baş, 0..1)
  //   P.duman(x, y, t, kal)        baca dumanı (kal 0..1: kalınlaşıp yayılma)
  //   P.deniz(x0, x1, y0, y1, t)   dalgalı deniz bandı
  P.IRON = '#3d3532'; P.IRON_D = '#1f1a18'; P.HAIR = '#3a2418';
  const lwk = (w) => w * M.lwK;
  P.ocak = (x0, x1, yT, o = {}) => {
    const pl = o.beyaz ? C.WHITE : '#4a3c34', plD = o.beyaz ? '#c9c2b4' : '#2a201b';
    if (o.alev != null) {
      for (const dx of [-84, -70, 70, 84]) {
        const h = 16 + 5 * Math.sin((o.t || 0) * 13 + dx);
        M.shape(g, M.poly([[o.alev + dx - 6, yT - 34], [o.alev + dx + 6, yT - 34], [o.alev + dx, yT - 34 - h]]), Math.abs(dx) > 75 ? C.TURQ : C.SAFFRON, null, 1.4);
      }
    }
    M.shape(g, M.P(p => p.rect(x0, yT - 30, x1 - x0, 30)), pl, plD, 2.6, 8);
    M.shape(g, M.P(p => p.rect(x0 - 6, yT - 38, x1 - x0 + 12, 9)), o.beyaz ? '#e6ddca' : '#5d4c42', null, 2);
    for (const u of [.18, .38, .62, .82]) M.shape(g, M.P(p => p.arc(x0 + (x1 - x0) * u, yT - 14, 6, 0, TAU)), o.beyaz ? '#b7ad99' : '#c9c2b4', null, 1.6);
  };

  P.parca = (x, y, tur, a = 0) => {
    g.save(); g.translate(x, y); g.rotate(a);
    if (tur === 'sogan') M.shape(g, M.P(p => { p.arc(0, 2, 8, Math.PI * 1.08, Math.PI * 1.92); p.arc(0, 4, 5, Math.PI * 1.88, Math.PI * 1.12, true); p.closePath(); }), '#f6eed6', '#d8c69a', 1.4, 2);
    else if (tur === 'domates') M.shape(g, M.P(p => p.ellipse(0, 0, 7.5, 5.5, 0, 0, TAU)), C.VERM, C.VERM_D, 1.4, 3);
    else M.shape(g, M.P(p => p.roundRect(-8, -3.5, 16, 7, 3)), C.LEAF, C.LEAF_D, 1.4, 2);
    g.restore();
  };

  P.tava = (cx, yb, o = {}) => {
    const R = 80, r0 = 64, H = 30, ry = 20, rc = yb - H, s = o.sap || -1;
    const col = o.renk || P.IRON, colD = o.renkD || P.IRON_D;
    g.save(); g.translate(cx, yb); g.rotate(o.rot || 0); g.translate(-cx, -yb);
    // sap: ağzın yanından yukarı-yana
    const ax = cx + s * (R - 8), ay = rc + 6, bx = cx + s * (o.sapL || 168), by = rc - 26;
    const nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny), ux = nx / nl, uy = ny / nl;
    M.shape(g, M.poly([[ax + ux * 6, ay + uy * 6], [bx + ux * 5, by + uy * 5], [bx - ux * 5, by - uy * 5], [ax - ux * 6, ay - uy * 6]]), col, colD, 2.4, 3);
    const gx = ax + (bx - ax) * .5, gy = ay + (by - ay) * .5;
    M.shape(g, M.poly([[gx + ux * 8, gy + uy * 8], [bx + s * 8 + ux * 8, by + uy * 8 - 2], [bx + s * 8 - ux * 8, by - uy * 8 - 2], [gx - ux * 8, gy - uy * 8]]), C.WOOD, C.WOOD_D, 2.2, 4);
    // iç (yağlı karanlık) ve içerik
    const ic = M.P(p => p.ellipse(cx, rc, R, ry, 0, 0, TAU));
    M.shape(g, ic, o.icRenk || '#2b211c', null, 2.6);
    g.save(); g.clip(M.P(p => p.ellipse(cx, rc, R - 7, ry - 4, 0, 0, TAU)));
    g.fillStyle = 'rgba(214,160,60,.25)'; g.beginPath(); g.ellipse(cx, rc + 2, R - 12, ry - 7, 0, 0, TAU); g.fill();
    for (const [x, y, tur, a] of (o.icerik || [])) P.parca(cx + x, rc + y, tur, a || 0);
    g.restore();
    // gövde (ön yüz)
    const body = M.P(p => { p.moveTo(cx - R, rc); p.lineTo(cx - r0, yb); p.ellipse(cx, yb, r0, ry * .7, 0, Math.PI, 0, true); p.lineTo(cx + R, rc); p.ellipse(cx, rc, R, ry, 0, 0, Math.PI, false); p.closePath(); });
    M.shape(g, body, col, colD, 2.8, 10);
    M.hiLine(g, q => { q.moveTo(cx - R + 14, rc + 10); q.quadraticCurveTo(cx - R + 26, rc + 22, cx - R + 40, rc + 25); }, lwk(2.2), .55);
    g.strokeStyle = C.INK; g.lineWidth = lwk(2.6); g.beginPath(); g.ellipse(cx, rc, R, ry, 0, 0, TAU); g.stroke();
    g.restore();
  };

  P.tahta = (x0, x1, yT) => {
    M.shape(g, M.P(p => p.rect(x0, yT - 10, x1 - x0, 10)), C.WOOD, C.WOOD_D, 2.4, 4);
    M.shape(g, M.poly([[x0 + 4, yT - 22], [x1 - 4, yT - 22], [x1, yT - 10], [x0, yT - 10]]), '#d9b27c', '#b48a55', 2.4, 4);
  };

  P.yarimSogan = (cx, cy, r, o = {}) => {
    const is = M.clamp(o.isik || 0);
    // kabuk: ucu yukarıda, kökü altta
    const skin = M.P(p => { p.moveTo(cx, cy - r * 1.42); p.bezierCurveTo(cx + r * .35, cy - r * 1.05, cx + r * 1.08, cy - r * .7, cx + r * 1.04, cy + r * .1); p.bezierCurveTo(cx + r, cy + r * .82, cx + r * .5, cy + r * 1.02, cx, cy + r * 1.02); p.bezierCurveTo(cx - r * .5, cy + r * 1.02, cx - r, cy + r * .82, cx - r * 1.04, cy + r * .1); p.bezierCurveTo(cx - r * 1.08, cy - r * .7, cx - r * .35, cy - r * 1.05, cx, cy - r * 1.42); p.closePath(); });
    M.shape(g, skin, '#c7884a', '#8a5a2a', 2.6, 6);
    // kök püskülü
    g.save(); g.strokeStyle = '#8a5a2a'; g.lineWidth = lwk(1.6); g.lineCap = 'round';
    for (const dx of [-.3, -.1, .1, .3]) { g.beginPath(); g.moveTo(cx + dx * r * .6, cy + r * 1.0); g.lineTo(cx + dx * r * 1.3, cy + r * 1.22); g.stroke(); }
    g.restore();
    // halkalar: dıştan içe çizilir, ışık içten dışa gelir
    const n = 6;
    for (let i = 0; i < n; i++) {
      const rr = r * (.88 - i * .145), cyy = cy + r * .06 + i * r * .015;
      const k = M.clamp((is * 1.35) - (n - 1 - i) * .07);
      M.gold(g, M.P(p => p.ellipse(cx, cyy, rr, rr * 1.04, 0, 0, TAU)), { x: cx, y: cyy, r: r * 1.3, k: k * (o.k ?? 1) }, i === 0 ? 2.4 : 1.4);
    }
    if (is > 0) { g.save(); g.globalAlpha = is * .9; M.glow(g, cx, cy, r * 2.4, .45 * is); g.restore(); }
  };

  P.butunSogan = (cx, cy, r) => {
    const skin = M.P(p => { p.moveTo(cx, cy - r * 1.42); p.bezierCurveTo(cx + r * .35, cy - r * 1.05, cx + r * 1.1, cy - r * .7, cx + r * 1.04, cy + r * .1); p.bezierCurveTo(cx + r, cy + r * .82, cx + r * .5, cy + r * 1.02, cx, cy + r * 1.02); p.bezierCurveTo(cx - r * .5, cy + r * 1.02, cx - r, cy + r * .82, cx - r * 1.04, cy + r * .1); p.bezierCurveTo(cx - r * 1.1, cy - r * .7, cx - r * .35, cy - r * 1.05, cx, cy - r * 1.42); p.closePath(); });
    M.shape(g, skin, '#cf9455', '#93602f', 2.6, 8);
    g.save(); g.clip(skin); g.strokeStyle = '#93602f'; g.lineWidth = lwk(1.6);
    for (const dx of [-.5, 0, .5]) { g.beginPath(); g.moveTo(cx, cy - r * 1.35); g.quadraticCurveTo(cx + dx * r * 1.6, cy, cx, cy + r); g.stroke(); }
    g.restore();
  };

  P.bicak = (x, y, a, s = 1) => {
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const P0 = (d, w) => [x + ux * d * s + nx * w * s, y + uy * d * s + ny * w * s];
    M.shape(g, M.poly([P0(-4, -5), P0(34, -5), P0(34, 5), P0(-4, 5)]), C.WOOD_D, null, 2);
    M.shape(g, M.poly([P0(34, -4), P0(96, -2), P0(102, 3), P0(34, 8)]), '#dedcd6', '#9e9b94', 2, 3);
  };

  P.kasik = (hx, hy, bx, by) => {
    g.save(); g.lineCap = 'round';
    g.strokeStyle = C.INK; g.lineWidth = lwk(9); g.beginPath(); g.moveTo(hx, hy); g.lineTo(bx, by); g.stroke();
    g.strokeStyle = '#c79a62'; g.lineWidth = lwk(5.5); g.beginPath(); g.moveTo(hx, hy); g.lineTo(bx, by); g.stroke();
    g.restore();
    M.shape(g, M.P(p => p.ellipse(bx, by, 13, 8, Math.atan2(by - hy, bx - hx), 0, TAU)), '#c79a62', '#9a6a43', 2, 3);
  };

  P.radyo = (cx, cy, o = {}) => {
    const col = o.renk || C.WOOD, colD = o.renkD || C.WOOD_D;
    for (const dx of [-36, 36]) M.shape(g, M.P(p => p.rect(cx + dx - 7, cy + 36, 14, 6)), C.INK, null, 1.6);
    M.shape(g, M.P(p => p.roundRect(cx - 50, cy - 40, 100, 78, 14)), col, colD, 3, 9);
    // hoparlör (solda)
    const sp = M.P(p => p.arc(cx - 20, cy + 2, 24, 0, TAU));
    M.shape(g, sp, '#4a3324', null, 2.4);
    g.save(); g.clip(sp); g.strokeStyle = C.WHITE; g.globalAlpha = .8; g.lineWidth = lwk(2);
    for (let y = -20; y <= 22; y += 7) { g.beginPath(); g.moveTo(cx - 46, cy + y); g.lineTo(cx + 6, cy + y); g.stroke(); }
    g.restore();
    g.strokeStyle = C.INK; g.lineWidth = lwk(2.4); g.beginPath(); g.arc(cx - 20, cy + 2, 24, 0, TAU); g.stroke();
    // kadran ve düğme (sağda)
    M.shape(g, M.P(p => p.rect(cx + 14, cy - 30, 28, 14)), C.VELLUM, C.VELLUM_D, 1.8, 3);
    g.strokeStyle = C.VERM; g.lineWidth = lwk(2); g.beginPath(); g.moveTo(cx + 22 + (o.ibre || 0) * 10, cy - 29); g.lineTo(cx + 22 + (o.ibre || 0) * 10, cy - 17); g.stroke();
    M.shape(g, M.P(p => p.arc(cx + 28, cy + 12, 13, 0, TAU)), C.VELLUM, C.VELLUM_D, 2.2, 4);
    const da = (o.dugme || 0) - Math.PI / 2;
    g.strokeStyle = C.INK; g.lineWidth = lwk(2.6); g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 28, cy + 12); g.lineTo(cx + 28 + Math.cos(da) * 10, cy + 12 + Math.sin(da) * 10); g.stroke();
  };

  P.pencere = (x0, y0, x1, y1, ic) => {
    const glass = M.P(p => p.rect(x0, y0, x1 - x0, y1 - y0));
    g.save(); g.clip(glass); ic(); g.restore();
    const fr = 14;
    const frame = M.P(p => { p.rect(x0 - fr, y0 - fr, x1 - x0 + 2 * fr, y1 - y0 + 2 * fr); p.rect(x0, y0, x1 - x0, y1 - y0); });
    g.fillStyle = C.WHITE; g.fill(frame, 'evenodd');
    g.strokeStyle = C.INK; g.lineWidth = lwk(2.6); g.strokeRect(x0 - fr, y0 - fr, x1 - x0 + 2 * fr, y1 - y0 + 2 * fr); g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    const xm = (x0 + x1) / 2;
    M.shape(g, M.P(p => p.rect(xm - 6, y0, 12, y1 - y0)), C.WHITE, '#c9c2b4', 2.2, 3);
    M.shape(g, M.P(p => p.rect(x0 - 26, y1 + fr - 2, x1 - x0 + 52, 16)), C.WHITE, '#c9c2b4', 2.4, 4);
  };

  P.nis = (cx, top, bot, w, o = {}) => {
    M.shape(g, M.arch(cx - w / 2 - 12, w + 24, top - 14, bot + 8), C.SAFFRON, C.SAFFRON_D, 2.6, 6);
    const inner = M.arch(cx - w / 2, w, top, bot);
    g.fillStyle = M.PAT.LAPIS; g.fill(inner); g.fillStyle = 'rgba(10,16,50,.35)'; g.fill(inner);
    const dol = M.clamp(o.dol || 0);
    if (dol > 0) {
      g.save(); g.clip(inner); g.globalAlpha = dol;
      M.gold(g, inner, { x: cx, y: (top + bot) / 2, r: w * 1.6, k: o.k ?? .25 }, 0);
      if (o.ic) o.ic();
      g.restore();
    }
    g.strokeStyle = C.INK; g.lineWidth = lwk(2.6); g.stroke(inner);
    if (dol > 0 && dol < 1) M.flash(g, cx + w * .22, top + w * .45, 14, Math.sin(Math.PI * dol));
  };

  P.kase = (x, y, a = 0) => {
    g.save(); g.translate(x, y); g.rotate(a);
    M.shape(g, M.P(p => { p.moveTo(-34, -6); p.quadraticCurveTo(-30, 26, 0, 28); p.quadraticCurveTo(30, 26, 34, -6); p.closePath(); }), C.TURQ, C.TURQ_D, 2.4, 6);
    M.shape(g, M.P(p => p.ellipse(0, -6, 34, 8, 0, 0, TAU)), '#e9f2ea', C.TURQ_D, 2.2, 3);
    M.pearls(g, -24, 10, 24, 10, 5, 2);
    g.restore();
  };

  // mini baş-omuz (vapur güvertesi, uzak kalabalık)
  P.mini = (x, y, coat, o = {}) => {
    M.shape(g, M.P(p => p.ellipse(x, y + 16, 15, 12, 0, Math.PI, 0)), coat, null, 1.8);
    if (o.scarf) M.shape(g, M.P(p => p.arc(x, y, 12, 0, TAU)), o.scarf, null, 1.8);
    else { M.shape(g, M.P(p => p.arc(x, y, 10, 0, TAU)), C.SKIN, C.SKIN_D, 1.8, 2); M.shape(g, M.P(p => p.arc(x - 1, y - 4, 9, Math.PI, 0)), o.hair || P.HAIR, null, 1.4); }
  };

  P.vapur = (x, y, o = {}) => {
    const s = o.s || 1;
    g.save(); g.translate(x, y); g.scale(s, s);
    // baca
    M.shape(g, M.P(p => p.rect(40, -210, 40, 66)), C.SAFFRON, C.SAFFRON_D, 2.6, 6);
    M.shape(g, M.P(p => p.rect(40, -210, 40, 14)), C.INK, null, 2);
    // üst kat
    M.shape(g, M.P(p => p.rect(-125, -146, 250, 44)), C.WHITE, '#c9c2b4', 2.6, 6);
    g.fillStyle = C.INK; for (let i = 0; i < 8; i++) g.fillRect(-113 + i * 30, -136, 15, 18);
    // güvertedeki üç baş
    const kf = M.clamp(o.kafalar || 0);
    if (kf > 0) {
      g.save(); g.globalAlpha *= kf;
      P.mini(-92, -166, C.VERD, { hair: '#5a3a22' }); P.mini(-56, -166, C.TURQ, {}); P.mini(-20, -166, C.SAFFRON, { scarf: C.LILAC });
      g.restore();
    }
    // korkuluk
    g.strokeStyle = C.INK; g.lineWidth = lwk(1.8); g.beginPath(); g.moveTo(-125, -160); g.lineTo(125, -160);
    for (let xx = -120; xx <= 120; xx += 16) { g.moveTo(xx, -160); g.lineTo(xx, -146); } g.stroke();
    // alt kat
    M.shape(g, M.P(p => p.rect(-178, -104, 356, 50)), C.WHITE, '#c9c2b4', 2.6, 6);
    g.fillStyle = C.INK; for (let i = 0; i < 11; i++) g.fillRect(-163 + i * 31, -93, 17, 21);
    // gövde
    M.shape(g, M.poly([[-218, -56], [218, -56], [190, 0], [-190, 0]]), C.WHITE, '#c9c2b4', 3, 8);
    M.shape(g, M.poly([[-207, -22], [207, -22], [190, 0], [-190, 0]]), C.LAPIS, C.LAPIS_D, 2.4, 4);
    g.strokeStyle = C.INK; g.lineWidth = lwk(2); g.beginPath(); g.moveTo(-212, -44); g.lineTo(212, -44); g.stroke();
    g.restore();
  };

  P.duman = (x, y, t, kal = 0) => {
    const n = 7;
    for (let i = n - 1; i >= 0; i--) {
      const v = i / (n - 1);
      const px = x + v * (70 + 260 * kal) + Math.sin(t * 2 + i) * 6, py = y - v * (90 + 60 * kal);
      const r = 8 + v * 14 + kal * (18 + 70 * v);
      g.save(); g.globalAlpha *= (1 - v * .45);
      M.shape(g, M.P(p => p.arc(px, py, r, 0, TAU)), C.WHITE, '#b9c3dc', 1.8, 5);
      g.restore();
    }
  };

  // sahil: dalgalı deniz bandı
  P.deniz = (x0, x1, y0, y1, t) => {
    g.fillStyle = C.TURQ; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    M.shape(g, M.P(p => p.rect(x0, y0, x1 - x0, 34)), C.LAPIS, C.LAPIS_D, 2.4, 6);
    g.save(); g.strokeStyle = C.WHITE; g.globalAlpha = .75; g.lineWidth = lwk(2.2); g.lineCap = 'round';
    for (let y = y0 + 70, r = 0; y < y1; y += 62, r++) for (let x = x0 + (r % 2) * 50; x < x1; x += 100) {
      const xx = x + Math.sin(t * .8 + r) * 6; g.beginPath(); g.arc(xx, y, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
    g.restore();
  };


  return P;
  };

  window.M = M;
})();
