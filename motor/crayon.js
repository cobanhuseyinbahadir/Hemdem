// Hemdem Crayon (mum boya) varyantı — DENEME (19 Kasım 2026).
// Minyatür motorunun üstüne biner: film dosyasında `style: 'crayon'` yazılır, çizim araçları aynı kalır (M.shape, M.standing...).
// Yalnızca M.crayon açıkken (sahne.html, style:'crayon') M.shape mum boya gibi çizer; minyatür ve eskiz filmleri değişmez.
// Fikir: grenli, dişli kâğıt; dolgu mum boya tarama izli; kontur kırık, çift geçişli; üstüne yarı saydam sulu boya yıkaması,
// beyaz mum çizgileri yıkamayı iter (resist) ve yıkama geldikçe belirir. Lemo-Opuscar "Crayon Picture Book" fikrinden esinlendi; kod ve metin kopyalanmadı.
(function () {
  const M = window.M, TAU = Math.PI * 2, W = 1080, H = 1920;
  const CR = window.CR = { PAPER: '#efe4cb', INK: '#3a2a22', boil: 0 };

  const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const tile = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
  const wrap = (w, h, x, y, f) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) f(x + dx, y + dy); };

  let hatchPat = null, toothPat = null, paperPat = null, washL = null, tmpL = null;
  CR.setup = function (g) {
    const R = rng(7);
    // mum boya tarama izi: kısa, eğik, yarı saydam çizgiler
    hatchPat = g.createPattern(tile(256, 256, (q, w, h) => {
      q.lineCap = 'round';
      for (let i = 0; i < 230; i++) {
        const x = R() * w, y = R() * h, L = 22 + R() * 46, a = -0.62 + (R() - .5) * .28, lw = 3 + R() * 5;
        const light = R() < .55;
        q.strokeStyle = light ? 'rgba(255,248,230,.24)' : 'rgba(60,35,25,.13)'; q.lineWidth = lw;
        wrap(w, h, x, y, (px, py) => { q.beginPath(); q.moveTo(px, py); q.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); q.stroke(); });
      }
    }), 'repeat');
    // kâğıt dişi: kâğıt rengi benekler (üstüne basılınca mumun arasından kâğıt görünür)
    toothPat = g.createPattern(tile(512, 512, (q, w, h) => {
      for (let i = 0; i < 2000; i++) {
        q.fillStyle = CR.PAPER; q.globalAlpha = .18 + R() * .3;
        const x = R() * w, y = R() * h, r = .4 + R() * 1.2;
        q.beginPath(); q.ellipse(x, y, r, r * (.5 + R() * .8), R() * 3, 0, TAU); q.fill();
      }
      for (let i = 0; i < 700; i++) { q.fillStyle = 'rgba(90,65,45,.22)'; q.beginPath(); q.arc(R() * w, R() * h, .5 + R() * 1.1, 0, TAU); q.fill(); }
    }), 'repeat');
    paperPat = g.createPattern(tile(512, 512, (q, w, h) => {
      q.fillStyle = CR.PAPER; q.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { q.fillStyle = R() < .5 ? 'rgba(120,95,60,.10)' : 'rgba(255,252,240,.35)'; q.beginPath(); q.arc(R() * w, R() * h, .5 + R() * 1.6, 0, TAU); q.fill(); }
      for (let i = 0; i < 160; i++) { q.strokeStyle = 'rgba(130,105,70,.10)'; q.lineWidth = .8; const x = R() * w, y = R() * h, a = R() * TAU; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); q.stroke(); }
    }), 'repeat');
    washL = tile(W, H, () => {}); tmpL = tile(W, H, () => {});
    CR.tooth = toothPat;
  };

  // ---- mum boya şekil kalıbı (minyatür M.shape imzası) ----
  const prevShape = M.shape;
  M.shape = function (g, path, fill, rim, lw = 3, rimW = 10) {
    if (!M.crayon) return prevShape(g, path, fill, rim, lw, rimW);
    const lk = M.lwK || 1, A = g.globalAlpha;
    if (fill) {
      g.save(); g.fillStyle = fill; g.globalAlpha = A * .93; g.fill(path);
      g.clip(path);
      if (rim) { g.lineWidth = rimW * Math.sqrt(lk) * 1.1; g.strokeStyle = rim; g.globalAlpha = A * .38; g.stroke(path); }
      g.fillStyle = hatchPat; g.globalAlpha = A; g.fill(path);
      g.restore();
    }
    // kırık, çift geçişli kontur: mum boya kalemin kâğıt dişinde kesilen çizgisi
    for (let k = 0; k < 2; k++) {
      g.save();
      const j = (((CR.boil + k * 2) % 3) - 1) * 1.15 * (k ? -1 : 1);
      g.translate(j, -j * .7);
      g.strokeStyle = CR.INK; g.globalAlpha = A * (k ? .42 : .8);
      g.lineWidth = lw * lk * (k ? 1.5 : 1.05) + .6; g.lineJoin = 'round'; g.lineCap = 'round';
      g.setLineDash(k ? [26, 5, 70, 7] : [90, 4, 40, 3]); g.lineDashOffset = k * 31;
      g.stroke(path);
      g.restore();
    }
  };

  // ---- kare başı / sonu ----
  CR.begin = function (g, t) {
    CR.boil = Math.floor(t * 8) % 3;
    g.fillStyle = paperPat; g.fillRect(0, 0, W, H);
    M.crayon = true;
  };
  CR.end = function (g) {
    M.crayon = false;
    // kâğıt dişi hepsinin üstüne: mumdaki ve yıkamadaki küçük kâğıt delikleri
    g.save(); g.fillStyle = toothPat; g.fillRect(0, 0, W, H); g.restore();
    // kenar karartması: kâğıdın elle tutulmuş kenarı
    const v = g.createRadialGradient(W / 2, H / 2, H * .38, W / 2, H / 2, H * .72);
    v.addColorStop(0, 'rgba(120,85,45,0)'); v.addColorStop(1, 'rgba(120,85,45,.22)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  };

  // ---- yumuşak ışık yıkaması ----
  // CR.isik(g, x, y, r, renk, alpha): lamba/pencere ışığı için halka ve ışın DEĞİL, yumuşak sıcak boya yıkaması (multiply).
  CR.isik = function (g, x, y, r, renk = '#f6c85a', alpha = .5) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply';
    const gr = g.createRadialGradient(x, y, r * .08, x, y, r);
    gr.addColorStop(0, renk); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = alpha; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  };

  // ---- sulu boya yıkaması ----
  // CR.wash(g, parçalar, direnc): parçalar [{ yol: Path2D, renk, alpha, from: [x, y], p: 0..1 (ıslak cephe), kenar }]
  // direnc(q): beyaz mum çizgileri; yıkamadan silinir, yani kâğıt rengi olarak kalır ve yıkama geldikçe belirir.
  CR.wash = function (g, parts, resist) {
    const wl = washL.getContext('2d'), tm = tmpL.getContext('2d');
    wl.setTransform(1, 0, 0, 1, 0, 0); wl.clearRect(0, 0, W, H);
    for (const o of parts) {
      if (o.p <= 0) continue;
      tm.setTransform(1, 0, 0, 1, 0, 0); tm.globalCompositeOperation = 'source-over'; tm.clearRect(0, 0, W, H);
      // lekenin gövdesi + kenarda biriken pigment
      tm.fillStyle = o.renk; tm.globalAlpha = o.alpha ?? .6; tm.fill(o.yol, o.evenodd ? 'evenodd' : 'nonzero');
      tm.save(); tm.clip(o.yol, o.evenodd ? 'evenodd' : 'nonzero'); tm.strokeStyle = o.renk; tm.globalAlpha = .5; tm.lineWidth = o.kenar ?? 14; tm.stroke(o.yol); tm.restore();
      // ıslak cephe: from noktasından yumuşak kenarlı yayılır
      if (o.p < 1) {
        const r = (o.r ?? 1500) * o.p, m = tm.createRadialGradient(o.from[0], o.from[1], Math.max(0, r - 260), o.from[0], o.from[1], r + 20);
        m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
        tm.globalAlpha = 1; tm.globalCompositeOperation = 'destination-in'; tm.fillStyle = m; tm.fillRect(0, 0, W, H);
        tm.globalCompositeOperation = 'source-over';
      }
      wl.globalAlpha = 1; wl.drawImage(tmpL, 0, 0);
    }
    // mum direnci
    if (resist) {
      wl.save(); wl.globalCompositeOperation = 'destination-out'; wl.strokeStyle = '#000'; wl.fillStyle = '#000'; wl.lineCap = 'round'; wl.lineJoin = 'round';
      resist(wl); wl.restore();
    }
    // kâğıt dişi yıkamada da deliklenir
    wl.save(); wl.globalCompositeOperation = 'destination-out'; wl.globalAlpha = .5; wl.fillStyle = toothPat; wl.fillRect(0, 0, W, H); wl.restore();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.drawImage(washL, 0, 0); g.restore();
  };
})();
