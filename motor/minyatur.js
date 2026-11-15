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
      let parts = [[0, words.length]];
      if (sameWords && g.measureText(c.metin).width > maxW) {
        // en dengeli bölme noktası; virgül/iki nokta sonrası tercih edilir
        let best = null;
        for (let j = 1; j < words.length; j++) {
          const l = g.measureText(words.slice(0, j).join(' ')).width, r = g.measureText(words.slice(j).join(' ')).width;
          const score = Math.max(l, r) - (/[,:;]$/.test(words[j - 1]) ? 120 : 0);
          if (!best || score < best.s) best = { j, s: score };
        }
        parts = [[0, best.j], [best.j, words.length]];
      }
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
      film.subs = M.sesSubs(g, W - 300, film.kapanis ?? 2.5);
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
    M.scrollW = Math.min(W - 180, Math.max(560, longest + 110));
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
    const arm = M.P(p => { p.moveTo(26, -292); p.bezierCurveTo(56, -270, 66, -220, hx - 6, hy - 8); p.lineTo(hx - 10, hy + 12); p.bezierCurveTo(50, -214, 40, -250, 18, -262); p.closePath(); });
    M.shape(g, arm, o.coat || C.VERM, o.coatD || C.VERM_D, 2.8, 10);
    M.shape(g, M.P(p => p.ellipse(hx, hy + 2, 11, 10, 0, 0, TAU)), C.SKIN, C.SKIN_D, 2.2, 5);
    M.head(g, 0, -352, o);
    g.restore();
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
  M.cartouche = function (g, lines, p = 1, y = 104, h = 158) {
    if (p <= 0) return;
    const cart = M.P(q => { q.moveTo(140, y); q.lineTo(940, y); q.quadraticCurveTo(990, y + h / 2, 940, y + h); q.lineTo(140, y + h); q.quadraticCurveTo(90, y + h / 2, 140, y); q.closePath(); });
    g.save();
    g.beginPath(); g.rect(80, y - 20, 920 * M.ease(p) + 10, h + 40); g.clip();
    g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 10; g.fillStyle = M.PAT.VELLUM; g.fill(cart); g.restore();
    g.save(); g.clip(cart); g.lineWidth = 14; g.strokeStyle = M.PAT.GOLD; g.stroke(cart); g.restore();
    g.lineWidth = 3; g.strokeStyle = C.INK; g.stroke(cart);
    const inner = M.P(q => { q.moveTo(156, y + 16); q.lineTo(924, y + 16); q.quadraticCurveTo(966, y + h / 2, 924, y + h - 16); q.lineTo(156, y + h - 16); q.quadraticCurveTo(114, y + h / 2, 156, y + 16); q.closePath(); });
    g.lineWidth = 1.4; g.stroke(inner);
    g.fillStyle = C.INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = lines.length, lh = n > 1 ? 54 : 0, y0 = y + h / 2 - lh * (n - 1) / 2;
    lines.forEach((l, i) => { const o = typeof l === 'string' ? { text: l } : l; g.font = `${o.italic ? 'italic ' : ''}500 ${o.size || 50}px "Fraunces Variable"`; g.fillText(o.text, 540, y0 + i * lh); });
    g.restore();
  };

  // sabit parşömen altyazı (yeri ve genişliği film boyunca değişmez)
  M.drawSubs = function (g, subs, t) {
    if (!subs || !subs.length) return;
    const vis = subs.filter(s => !s.hidden);
    if (!vis.length) return;
    const first = vis[0].a, last = vis[vis.length - 1].b;
    const open = M.clamp((t - first + .3) / .35) * (1 - M.clamp((t - last - .2) / .35));
    if (open <= 0) return;
    const sy = 1690, sh = 96, w = M.scrollW * M.easeOut(open), sx0 = 540 - w / 2, sx1 = 540 + w / 2;
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
      g.fillText(cur.text, 540, sy + sh / 2 + 2); g.restore();
    }
    g.restore();
  };

  // tezhip bordürü (ekran koordinatında, her karenin üstüne)
  M.border = function (g, signature = 'Hemdem') {
    const X0 = 72, Y0 = 72, X1 = W - 72, Y1 = H - 72;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
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
  M.PIC = { x: 72, y: 72, w: W - 144, h: H - 144 };

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
    g.restore();
  };
  // oturan ve ayakta figüre gövde sarsıntısı (bob) ekle
  const _seated = M.seated, _standing = M.standing;
  M.seated = function (g, o) { _seated(g, { ...o, y: o.y + (o.bob || 0) }); };
  M.standing = function (g, o) { _standing(g, { ...o, y: o.y + (o.bob || 0) }); };

  window.M = M;
})();
