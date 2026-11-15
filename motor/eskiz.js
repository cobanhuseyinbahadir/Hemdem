// Hemdem Eskiz motoru — tonlu kâğıt üstüne mürekkep çizgi + suluboya, kare kare.
// Tarayıcıda çalışır (Canvas 2D). Bütün çizimler deterministiktir: aynı tohum, aynı iz.
// İlham: Lemo-Opuscar "Urban Sketch · Pen & Wash" (MIT). Bu dosya Hemdem için sıfırdan yazıldı.

(function () {
  const E = {};
  E.W = 1080; E.H = 1920;

  // ---------- Matematik ----------
  E.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const hash = (i, s) => { let x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  E.noise1 = function (x, seed = 0) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u; // 0..1
  };
  E.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  E.lerp = (a, b, t) => a + (b - a) * t;
  E.ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  E.easeOut = t => 1 - Math.pow(1 - t, 3);
  // t anının [a,b] aralığındaki ilerlemesi (0..1), isteğe bağlı yumuşatma ile
  E.prog = (t, a, b, easing = E.ease) => easing(E.clamp((t - a) / Math.max(1e-6, b - a)));
  E.hexA = function (hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // ---------- Kâğıt ----------
  // Tek renk tonlu kâğıt: hafif lekelenme + ince doku. Bir kez üretilir, önbellekte tutulur.
  E.paper = function (color, seed = 7, w = E.W, h = E.H) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    const r = E.rng(seed);
    // büyük ölçekli lekelenme
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, rad = 120 + r() * 420;
      const light = r() < 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, light ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // ince kâğıt dişi
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 14;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // soğuk-baskı kâğıt lifleri
    g.globalAlpha = 0.05; g.strokeStyle = '#ffffff'; g.lineWidth = 0.6;
    for (let i = 0; i < 900; i++) {
      const x = r() * w, y = r() * h, l = 2 + r() * 6, a = r() * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.globalAlpha = 1;
    return c;
  };

  // ---------- Geometri yardımcıları (nokta dizileri) ----------
  E.line = (x1, y1, x2, y2) => [[x1, y1], [x2, y2]];
  E.ellipse = function (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 40) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return pts;
  };
  // Catmull-Rom ile yumuşak eğri: kontrol noktalarından geçen bir çizgi
  E.curve = function (ctrl, seg = 10) {
    if (ctrl.length < 3) return ctrl.slice();
    const p = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]], out = [];
    for (let i = 1; i < p.length - 2; i++) {
      for (let j = 0; j < seg; j++) {
        const t = j / seg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p[i - 1][0], p[i][0], p[i + 1][0], p[i + 2][0]), f(p[i - 1][1], p[i][1], p[i + 1][1], p[i + 2][1])]);
      }
    }
    out.push(ctrl[ctrl.length - 1]);
    return out;
  };
  // Dikdörtgen: eskizdeki gibi dört ayrı, köşelerde taşan çizgi
  E.rectLines = (x, y, w, h) => [E.line(x, y, x + w, y), E.line(x + w, y, x + w, y + h), E.line(x + w, y + h, x, y + h), E.line(x, y + h, x, y)];
  E.roundRect = function (x, y, w, h, r) {
    const pts = [];
    const arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + (Math.PI / 2) * (i / 6); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
    pts.push(pts[0]);
    return pts;
  };

  // ---------- Mürekkep çizgi ----------
  // Bir nokta dizisini eskiz çizgisine çevirir: yeniden örnekleme, titreme, uçlarda taşma, ara ara kopma.
  let strokeSeed = 1;
  E.stroke = function (pts, o = {}) {
    const seed = o.seed ?? strokeSeed++;
    const r = E.rng(seed * 9973);
    const wob = o.wobble ?? 1.1, step = 5;
    // uçlarda taşma
    const ext = (a, b, d) => { const dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1; return [a[0] + dx / l * d, a[1] + dy / l * d]; };
    let P = pts.slice();
    if (o.overshoot !== false && P.length >= 2) {
      P[0] = ext(P[0], P[1], 2 + r() * 6);
      P[P.length - 1] = ext(P[P.length - 1], P[P.length - 2], 2 + r() * 6);
    }
    // yeniden örnekle
    const S = [];
    for (let i = 0; i < P.length - 1; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[i + 1], l = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.ceil(l / step));
      for (let j = 0; j < n; j++) S.push([x1 + (x2 - x1) * j / n, y1 + (y2 - y1) * j / n]);
    }
    S.push(P[P.length - 1]);
    // dik doğrultuda titreme
    const ns = r() * 100, out = [], len = [0];
    for (let i = 0; i < S.length; i++) {
      const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const off = (E.noise1(i * 0.18, ns) - 0.5) * 2 * wob;
      out.push([S[i][0] + nx * off, S[i][1] + ny * off]);
      if (i) len.push(len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    }
    // uzun çizgilerde bir küçük kopukluk
    let gap = null;
    if (o.gaps !== false && len[len.length - 1] > 140 && r() < 0.5) {
      const at = 0.3 + r() * 0.4; gap = [at, at + 6 / len[len.length - 1] * (1 + r() * 1.5)];
    }
    return { pts: out, len, total: len[len.length - 1], width: o.width ?? 2.6, gap, seed, alpha: o.alpha ?? 0.94, color: o.color };
  };

  // Çizgiyi p (0..1) ilerlemesine kadar çizer. boil: kare grubuna göre çok hafif kıpırdama.
  E.drawStroke = function (g, s, p = 1, o = {}) {
    if (p <= 0) return;
    const until = s.total * E.clamp(p);
    const boil = o.boil ?? 0;
    g.save();
    g.strokeStyle = s.color || o.color || E.ink;
    g.globalAlpha = (o.alpha ?? 1) * s.alpha;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const draw = (from, to, wMul) => {
      g.lineWidth = s.width * wMul;
      g.beginPath(); let started = false;
      for (let i = 0; i < s.pts.length; i++) {
        const L = s.len[i]; if (L < from) continue; if (L > to) break;
        let [x, y] = s.pts[i];
        if (boil) { x += (hash(i, s.seed + boil) - 0.5) * 0.9; y += (hash(i + 7, s.seed + boil) - 0.5) * 0.9; }
        if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y);
      }
      g.stroke();
    };
    if (s.gap) {
      const g0 = s.gap[0] * s.total, g1 = s.gap[1] * s.total;
      draw(0, Math.min(until, g0), 1);
      if (until > g1) draw(g1, until, 1);
    } else draw(0, until, 1);
    g.restore();
  };

  // Birden çok çizgiden oluşan çizim; çizim sırası korunur.
  E.drawing = function (list, o = {}) {
    const strokes = list.map((pts, i) => (pts.pts ? pts : E.stroke(pts, { ...o, seed: (o.seed ?? 1) * 100 + i })));
    const total = strokes.reduce((a, s) => a + s.total, 0);
    return {
      strokes, total,
      draw(g, p = 1, opts = {}) {
        let budget = total * E.clamp(p);
        for (const s of strokes) {
          if (budget <= 0) break;
          E.drawStroke(g, s, Math.min(1, budget / s.total), opts);
          budget -= s.total;
        }
      }
    };
  };

  // ---------- Suluboya ----------
  // Pürüzlü kenarlı, şeffaf leke. Kenarı biraz koyu (kurumuş pigment), içi taneli.
  // shape: nokta dizisi (kapalı çokgen) ya da {cx,cy,r}. reveal: 0..1 rengin gelişi (origin'den yayılır).
  E.wash = function (shape, o = {}) {
    const seed = o.seed ?? 3, r = E.rng(seed * 31);
    let poly;
    if (Array.isArray(shape)) poly = shape;
    else poly = E.ellipse(shape.cx, shape.cy, shape.rx ?? shape.r, shape.ry ?? shape.r, 0, Math.PI * 2, 64);
    // kenarı gürültüyle boz, çizgiden 1–3 px kaydır
    const off = o.offset ?? [2 + r() * 2, 1 + r() * 2], rough = o.rough ?? 6, ns = r() * 50;
    let cx = 0, cy = 0; poly.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= poly.length; cy /= poly.length;
    // çokgeni sık örnekle ki kenar pürüzü yumuşak dağılsın
    const dense = [];
    for (let i = 0; i < poly.length - 1; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8));
      for (let j = 0; j < n; j++) dense.push([x1 + (x2 - x1) * j / n, y1 + (y2 - y1) * j / n]);
    }
    if (!dense.length) dense.push(...poly);
    const edge = dense.map((p, i) => {
      const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1;
      const k = ((E.noise1(i * 0.08, ns) - 0.5) * 2 + (E.noise1(i * 0.45, ns + 9) - 0.5) * 0.6) * rough;
      return [p[0] + dx / l * k + off[0], p[1] + dy / l * k + off[1]];
    });
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    edge.forEach(([x, y]) => { minx = Math.min(minx, x); miny = Math.min(miny, y); maxx = Math.max(maxx, x); maxy = Math.max(maxy, y); });
    const pad = 30, w = Math.ceil(maxx - minx + pad * 2), h = Math.ceil(maxy - miny + pad * 2);
    const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
    const g = c.getContext('2d');
    g.translate(pad - minx, pad - miny);
    const path = () => { g.beginPath(); edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    const color = o.color || E.accent, A = o.alpha ?? 0.6;
    // gövde: iki üç katman, her biri biraz farklı, pigment düzensiz dağılsın
    path(); g.fillStyle = E.hexA(color, A * 0.75); g.filter = 'blur(2px)'; g.fill(); g.filter = 'none';
    const lr = E.rng(seed * 13);
    for (let k = 0; k < 9; k++) {
      const bx = minx + lr() * (maxx - minx), by = miny + lr() * (maxy - miny), br = Math.max(maxx - minx, maxy - miny) * (0.15 + lr() * 0.3);
      const gr = g.createRadialGradient(bx, by, 0, bx, by, br);
      gr.addColorStop(0, E.hexA(color, A * (0.18 + lr() * 0.25))); gr.addColorStop(1, E.hexA(color, 0));
      g.save(); path(); g.clip(); g.fillStyle = gr; g.fillRect(bx - br, by - br, br * 2, br * 2); g.restore();
    }
    // kurumuş kenar (pigment kenarda toplanır)
    path(); g.strokeStyle = E.hexA(color, Math.min(1, A * 1.05)); g.lineWidth = 4; g.filter = 'blur(1.6px)'; g.stroke(); g.filter = 'none';
    // taneleşme
    g.globalCompositeOperation = 'destination-out';
    const rr = E.rng(seed * 77);
    for (let i = 0; i < (w * h) / 260; i++) {
      g.fillStyle = `rgba(0,0,0,${0.08 + rr() * 0.18})`;
      g.fillRect(minx - pad + rr() * w, miny - pad + rr() * h, 1 + rr() * 2, 1 + rr() * 2);
    }
    // içten hafif açılma (beyaz/kâğıt bırakma)
    const hole = o.reserve ?? 0.25;
    if (hole > 0) {
      const gr = g.createRadialGradient(cx - (maxx - minx) * 0.15, cy - (maxy - miny) * 0.15, 0, cx, cy, Math.max(maxx - minx, maxy - miny) * 0.6);
      gr.addColorStop(0, `rgba(0,0,0,${hole})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; path(); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    const origin = o.origin || [cx, cy];
    const maxR = Math.max(...edge.map(([x, y]) => Math.hypot(x - origin[0], y - origin[1]))) + 10;
    const glow = o.glow ?? 0; // 0..1: koyu kâğıtta ışık etkisi
    return {
      canvas: c, x: minx - pad, y: miny - pad, origin, maxR, seed,
      // reveal: 0..1 rengin gelişi; alpha: genel opaklık (geri çekilirken azaltmak için)
      draw(gc, reveal = 1, alpha = 1) {
        if (reveal <= 0 || alpha <= 0) return;
        gc.save(); gc.globalAlpha = alpha;
        if (reveal < 1) {
          // ıslak cephe: yumuşak gürültülü bir daire
          const R = maxR * E.easeOut(reveal);
          gc.beginPath();
          for (let i = 0; i <= 160; i++) {
            const a = (i / 160) * Math.PI * 2;
            const k = 1 + (E.noise1(i * 0.09, seed) - 0.5) * 0.14 + (E.noise1(i * 0.5, seed + 4) - 0.5) * 0.04;
            const x = origin[0] + Math.cos(a) * R * k, y = origin[1] + Math.sin(a) * R * k;
            i ? gc.lineTo(x, y) : gc.moveTo(x, y);
          }
          gc.closePath(); gc.clip();
        }
        if (glow) {
          // ışık gibi davranan renk: arkasında yumuşak bir hale
          gc.save(); gc.globalCompositeOperation = 'lighter'; gc.globalAlpha = alpha * glow;
          gc.filter = 'blur(36px)'; gc.drawImage(c, this.x, this.y); gc.filter = 'none'; gc.restore();
        }
        gc.drawImage(c, this.x, this.y);
        gc.restore();
      }
    };
  };

  // ---------- Büyük renk yayılımı (bloom) ----------
  // Sayfanın büyük bir bölümüne yayılan suluboya. Tek parça oval leke yerine: üst üste binen
  // düzensiz lekeler, kenarda dağılan damlalar, içeride kâğıdın göründüğü boşluklar.
  // area: {cx, cy, rx, ry} — yayılımın kabaca kapladığı elips. origin: rengin çıktığı nokta.
  E.bloom = function (area, o = {}) {
    const seed = o.seed ?? 5, r = E.rng(seed * 101);
    const color = o.color || E.accent, A = o.alpha ?? 0.5;
    const { cx, cy, rx, ry } = area;
    const pad = 80, w = Math.ceil(rx * 2 + pad * 2), h = Math.ceil(ry * 2 + pad * 2);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const ox = cx - rx - pad, oy = cy - ry - pad; // tuvalin dünya konumu
    const blob = (x, y, rad, alpha, sd) => {
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2, k = 1 + (E.noise1(i * 0.35, sd) - 0.5) * 0.55;
        const px = x + Math.cos(a) * rad * k, py = y + Math.sin(a) * rad * k * (0.8 + r() * 0.4);
        i ? g.lineTo(px - ox, py - oy) : g.moveTo(px - ox, py - oy);
      }
      g.closePath(); g.fillStyle = E.hexA(color, alpha); g.fill();
    };
    // 1) gövde: birbirine karışan düzensiz lekeler (merkeze yakın daha yoğun)
    g.filter = 'blur(3px)';
    const n = o.count ?? 46;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7);
      const x = cx + Math.cos(a) * rx * d * 0.82, y = cy + Math.sin(a) * ry * d * 0.82;
      const rad = Math.min(rx, ry) * (0.18 + r() * 0.3) * (1.1 - d * 0.4);
      blob(x, y, rad, A * (0.22 + r() * 0.2), seed * 10 + i);
    }
    // 2) kenarda dağılan damlalar
    g.filter = 'blur(1.2px)';
    const dabs = o.dabs ?? 110;
    for (let i = 0; i < dabs; i++) {
      const a = r() * Math.PI * 2, d = 0.78 + r() * 0.32;
      const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      blob(x, y, 4 + r() * 16 * (1.15 - d * 0.5), A * (0.25 + r() * 0.35), seed * 50 + i);
    }
    g.filter = 'none';
    // 3) kâğıt boşlukları ve taneleşme
    g.globalCompositeOperation = 'destination-out';
    g.filter = 'blur(2px)';
    for (let i = 0; i < (o.holes ?? 12); i++) {
      const a = r() * Math.PI * 2, d = 0.45 + r() * 0.45;
      blob(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 5 + r() * 16, 0.3 + r() * 0.35, seed * 90 + i);
    }
    g.filter = 'none';
    for (let i = 0; i < (w * h) / 300; i++) { g.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.15})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    g.globalCompositeOperation = 'source-over';
    // 4) kurumuş kenar: kenar bandını hafif koyulaştır
    const origin = o.origin || [cx, cy];
    const maxR = Math.hypot(Math.max(Math.abs(origin[0] - (cx - rx)), Math.abs(origin[0] - (cx + rx))), Math.max(Math.abs(origin[1] - (cy - ry)), Math.abs(origin[1] - (cy + ry)))) + pad;
    const glow = o.glow ?? 0;
    // yumuşak ıslak cephe için maske tuvali
    const m = document.createElement('canvas'); m.width = w; m.height = h; const mg = m.getContext('2d');
    return {
      canvas: c, origin, maxR,
      draw(gc, reveal = 1, alpha = 1) {
        if (reveal <= 0 || alpha <= 0) return;
        let src = c;
        if (reveal < 1) {
          // ıslak cephe: yumuşak kenarlı, gürültülü bir daire; cephenin hemen arkası biraz koyu
          const R = maxR * E.easeOut(reveal);
          mg.globalCompositeOperation = 'source-over'; mg.clearRect(0, 0, w, h);
          mg.drawImage(c, 0, 0);
          mg.globalCompositeOperation = 'destination-in';
          const gx = origin[0] - ox, gy = origin[1] - oy;
          const gr = mg.createRadialGradient(gx, gy, Math.max(0, R * 0.82), gx, gy, R);
          gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          mg.fillStyle = gr; mg.beginPath();
          for (let i = 0; i <= 120; i++) {
            const a = (i / 120) * Math.PI * 2, k = 1 + (E.noise1(i * 0.14, seed) - 0.5) * 0.22;
            const px = gx + Math.cos(a) * R * k, py = gy + Math.sin(a) * R * k;
            i ? mg.lineTo(px, py) : mg.moveTo(px, py);
          }
          mg.closePath(); mg.fill();
          src = m;
        }
        gc.save(); gc.globalAlpha = alpha;
        if (glow) { gc.save(); gc.globalCompositeOperation = 'lighter'; gc.globalAlpha = alpha * glow; gc.filter = 'blur(40px)'; gc.drawImage(src, ox, oy); gc.restore(); }
        gc.drawImage(src, ox, oy);
        gc.restore();
      }
    };
  };

  // ---------- Dolgu ----------
  // Kapalı bir şekli (ör. figürün gövdesi) kâğıt rengiyle doldurur; arkasındaki çizgileri ve rengi örter.
  // Önce dolguyu, sonra figürün çizgilerini çiz.
  E.fillPoly = function (g, pts, color, alpha = 1) {
    if (!pts || pts.length < 3) return;
    g.save(); g.globalAlpha = alpha; g.fillStyle = color || E.paperColor;
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    g.restore();
  };
  // Hazır figürler için gövde silueti (dolgu için kapalı şekil)
  E.bustBackFill = function (x, y, s = 1, o = {}) {
    const parts = E.bustBack(x, y, s, { ...o, bun: false });
    const shoulders = parts[parts.length - 2];
    const bottom = Math.max(...shoulders.map(p => p[1])) + 200 * s;
    const hx = x + Math.sin(o.tilt ?? 0) * 20 * s;
    const hr = 52 * s;
    return {
      body: [...shoulders, [shoulders[shoulders.length - 1][0], bottom], [shoulders[0][0], bottom]],
      head: E.ellipse(hx, y + 52 * s, 48 * s, 55 * s, 0, Math.PI * 2, 30),
      bun: o.bun ? E.ellipse(hx, y + hr * 0.62, hr * 0.42, hr * 0.36, 0, Math.PI * 2, 24) : null,
    };
  };

  // ---------- Yazı ----------
  // El yazısı: kalemin yazdığı gibi soldan sağa açılır (satır satır). p: 0..1
  E.hand = function (g, lines, x, y, o = {}) {
    if (!Array.isArray(lines)) lines = [lines];
    const size = o.size ?? 64, lh = o.lineHeight ?? size * 1.15, align = o.align ?? 'left';
    const font = `${o.weight ?? 500} ${size}px ${o.family ?? "'Caveat', cursive"}`;
    g.save(); g.font = font; g.fillStyle = o.color || E.ink; g.textBaseline = 'alphabetic'; g.globalAlpha = o.alpha ?? 1;
    const widths = lines.map(l => g.measureText(l).width), total = widths.reduce((a, b) => a + b, 0);
    let budget = total * E.clamp(o.p ?? 1);
    lines.forEach((ln, i) => {
      const w = widths[i], ly = y + i * lh;
      const lx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      const show = Math.min(w, Math.max(0, budget)); budget -= w;
      if (show <= 0) return;
      g.save();
      if (show < w) {
        // pürüzlü kalem ucu
        g.beginPath(); g.moveTo(lx - 10, ly - size * 1.1);
        g.lineTo(lx + show, ly - size * 1.1);
        for (let k = 0; k <= 6; k++) g.lineTo(lx + show + (hash(k, i + 3) - 0.5) * 8, ly - size * 1.1 + (size * 1.5) * (k / 6));
        g.lineTo(lx - 10, ly + size * 0.4); g.closePath(); g.clip();
      }
      g.fillText(ln, lx, ly);
      g.restore();
    });
    g.restore();
  };

  // Altyazı: sayfanın alt kenarında, Nunito, okunurluk için yumuşak kâğıt rengi zemin.
  E.subtitle = function (g, text, o = {}) {
    if (!text) return;
    const size = o.size ?? 46, y = o.y ?? E.H - 300;
    g.save();
    g.font = `600 ${size}px 'Nunito', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + 44, h = size + 26;
    g.globalAlpha = (o.alpha ?? 1) * 0.72; g.fillStyle = E.paperColor;
    const x0 = E.W / 2 - w / 2, y0 = y - h / 2, r = h / 2;
    g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + h, r); g.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    g.arcTo(x0, y0 + h, x0, y0, r); g.arcTo(x0, y0, x0 + w, y0, r); g.closePath(); g.fill();
    g.globalAlpha = o.alpha ?? 1; g.fillStyle = E.ink; g.fillText(text, E.W / 2, y + 2);
    g.restore();
  };

  // İmza: Fraunces SOFT 100
  E.signature = function (g, alpha = 1) {
    if (alpha <= 0) return;
    g.save(); g.globalAlpha = alpha; g.fillStyle = E.ink;
    g.font = `400 92px 'Fraunces Variable', serif`;
    try { g.fontVariationSettings = '"SOFT" 100, "opsz" 96'; } catch (e) {}
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.letterSpacing = '6px';
    g.fillText('Hemdem', E.W / 2, E.H / 2);
    g.restore();
  };

  // ---------- Kamera ----------
  // Dünya koordinatlarında (cx,cy) noktasını ekran merkezine getirir, zoom ile ölçekler.
  E.camera = function (g, cam) {
    const z = cam.zoom ?? 1;
    g.setTransform(z, 0, 0, z, E.W / 2 - cam.x * z, E.H / 2 - cam.y * z);
  };
  E.camLerp = (a, b, p) => ({ x: E.lerp(a.x, b.x, p), y: E.lerp(a.y, b.y, p), zoom: E.lerp(a.zoom ?? 1, b.zoom ?? 1, p) });

  // ---------- Sayfa çevirme ----------
  // drawOld ve drawNew ekrana çizer; p: 0..1. Sağdan sola kıvrılan sayfa kenarı.
  E.pageTurn = function (g, p, drawOld, drawNew) {
    const x = E.W * (1 - E.ease(E.clamp(p)));
    drawNew();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.beginPath(); g.rect(0, 0, x, E.H); g.clip();
    drawOld();
    g.restore();
    if (p > 0 && p < 1) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      const gr = g.createLinearGradient(x - 70, 0, x + 40, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.75, 'rgba(0,0,0,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - 70, 0, 110, E.H);
      g.restore();
    }
  };

  // ---------- Hazır figür ve eşyalar ----------
  // Hepsi nokta dizisi listesi döndürür; E.drawing(...) ile çizime çevrilir.
  // Ölçek s=1 iken yaklaşık boyutlar yorumda yazılı.

  // Sırtı dönük, yüzsüz baş ve omuz (s=1: ~260 px genişlik, ~300 px yükseklik). (x,y) = başın tepesi.
  // tilt: başın yana eğimi (radyan), slump: omuzların düşüklüğü 0..1
  E.bustBack = function (x, y, s = 1, o = {}) {
    const tilt = o.tilt ?? 0, sl = o.slump ?? 0.2;
    const hx = x + Math.sin(tilt) * 20 * s, hr = 52 * s;
    const head = E.ellipse(hx, y + hr, hr * 0.92, hr * 1.05, -Math.PI * 0.95, Math.PI * 0.95, 30);
    const hair = [E.curve([[hx - hr * 0.8, y + hr * 0.7], [hx - hr * 0.2, y + hr * 0.25], [hx + hr * 0.5, y + hr * 0.5]], 8)];
    const ny = y + hr * 2.05;
    const neckL = E.line(hx - 18 * s, ny - 4 * s, hx - 22 * s, ny + 26 * s);
    const neckR = E.line(hx + 18 * s, ny - 4 * s, hx + 22 * s, ny + 26 * s);
    const sh = ny + 26 * s, drop = 30 * s * sl;
    const shoulders = E.curve([[x - 135 * s, sh + 110 * s + drop], [x - 120 * s, sh + 40 * s + drop], [x - 70 * s, sh + 6 * s + drop * 0.5], [hx - 22 * s, sh],
      [hx + 22 * s, sh], [x + 70 * s, sh + 6 * s + drop * 0.5], [x + 120 * s, sh + 40 * s + drop], [x + 135 * s, sh + 110 * s + drop]], 8);
    const spine = E.curve([[hx, sh + 30 * s], [x + 4 * s, sh + 90 * s], [x, sh + 150 * s]], 6);
    const extra = [];
    // topuz: başın arkasında, tepeye yakın yuvarlak (yaşlı/yorgun bir kadın figürü için)
    if (o.bun) extra.push(E.ellipse(hx + Math.sin(tilt) * 6 * s, y + hr * 0.62, hr * 0.42, hr * 0.36, 0, Math.PI * 2, 24),
      E.curve([[hx - hr * 0.3, y + hr * 0.7], [hx, y + hr * 0.5], [hx + hr * 0.3, y + hr * 0.72]], 6));
    return [head, ...hair, neckL, neckR, shoulders, spine, ...extra];
  };

  // Oturan, sırtı dönük figür (s=1: ~300 px genişlik, ~520 px yükseklik). (x,y) = başın tepesi.
  E.sittingBack = function (x, y, s = 1, o = {}) {
    const bust = E.bustBack(x, y, s, o);
    const hip = y + 470 * s;
    const sides = [
      E.curve([[x - 135 * s, y + 255 * s], [x - 128 * s, y + 360 * s], [x - 140 * s, hip]], 8),
      E.curve([[x + 135 * s, y + 255 * s], [x + 128 * s, y + 360 * s], [x + 140 * s, hip]], 8),
      E.curve([[x - 150 * s, hip], [x, hip + 16 * s], [x + 150 * s, hip]], 8),
    ];
    return [...bust, ...sides];
  };

  // İnce belli çay bardağı ve tabağı (s=1: ~70 px genişlik, ~120 px yükseklik). (x,y) = tabağın ortası.
  E.teaGlass = function (x, y, s = 1) {
    const w = 34 * s, h = 105 * s, waist = 22 * s;
    const left = E.curve([[x - w, y - h], [x - waist, y - h * 0.55], [x - w * 0.95, y - h * 0.18], [x - w * 0.8, y]], 8);
    const right = E.curve([[x + w, y - h], [x + waist, y - h * 0.55], [x + w * 0.95, y - h * 0.18], [x + w * 0.8, y]], 8);
    const rim = E.ellipse(x, y - h, w, 7 * s, 0, Math.PI * 2, 24);
    const tea = E.curve([[x - w * 0.9, y - h * 0.82], [x, y - h * 0.79], [x + w * 0.9, y - h * 0.82]], 6);
    const saucer = E.ellipse(x, y + 4 * s, 62 * s, 14 * s, 0, Math.PI * 2, 30);
    return [rim, left, right, tea, saucer];
  };

  // Akıllı telefon (genişlik w, yükseklik h). Ekran dikdörtgeni .screen olarak döner.
  E.phone = function (x, y, w, h) {
    const r = Math.min(w, h) * 0.12, m = w * 0.05;
    const list = [E.roundRect(x, y, w, h, r), E.roundRect(x + m, y + h * 0.085, w - 2 * m, h * 0.83, r * 0.3)];
    list.screen = { x: x + m, y: y + h * 0.085, w: w - 2 * m, h: h * 0.83 };
    return list;
  };

  // Pencere çerçevesi (iki kanat, birkaç çizgi)
  E.windowFrame = function (x, y, w, h) {
    return [...E.rectLines(x, y, w, h), E.line(x + w / 2, y, x + w / 2, y + h), E.line(x, y + h * 0.35, x + w, y + h * 0.35)];
  };

  // Balkon korkuluğu: üst bant + dikey demirler
  E.railing = function (x, y, w, h, n = 9) {
    const L = [E.line(x, y, x + w, y), E.line(x, y + 14, x + w, y + 14)];
    for (let i = 0; i <= n; i++) L.push(E.line(x + (w * i) / n, y + 14, x + (w * i) / n, y + h));
    return L;
  };

  // Konuşma balonu (yuvarlak köşeli, kuyruklu). tail: 'left' | 'right'
  E.speechBubble = function (x, y, w, h, tail = 'left') {
    const tx = tail === 'left' ? x + 40 : x + w - 40, dir = tail === 'left' ? -1 : 1;
    return [E.roundRect(x, y, w, h, Math.min(h / 2, 40)), E.curve([[tx, y + h - 4], [tx + dir * 18, y + h + 26], [tx + dir * 34, y + h + 30]], 6)];
  };

  // ---------- Zaman eşleme (gerçek ses kaydına uydurmak için) ----------
  // map: [[planSn, gercekSn], ...] artan sırada. Gerçek zamanı plan zamanına çevirir (parça parça doğrusal).
  E.warp = function (map, t) {
    if (!map || map.length < 2) return t;
    if (t <= map[0][1]) return map[0][0] + (t - map[0][1]);
    for (let i = 0; i < map.length - 1; i++) {
      const [p0, r0] = map[i], [p1, r1] = map[i + 1];
      if (t <= r1) return p0 + (p1 - p0) * ((t - r0) / Math.max(1e-6, r1 - r0));
    }
    const [pl, rl] = map[map.length - 1]; return pl + (t - rl);
  };

  // ---------- Kurulum ----------
  E.setup = function (film) {
    E.paperColor = film.paper; E.ink = film.ink; E.accent = film.accent || '#E2A65A';
    E.paperCanvas = E.paper(film.paper, film.seed ?? 7);
  };
  E.drawPaper = function (g) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(E.paperCanvas, 0, 0); g.restore();
  };
  // Altyazıları FILM.subs listesinden çizer: [{a, b, text}] ; hidden olanlar çizilmez.
  E.drawSubs = function (g, subs, t) {
    if (!subs) return;
    const s = subs.find(s => t >= s.a && t < s.b && !s.hidden);
    if (!s) return;
    const fade = Math.min(E.prog(t, s.a, s.a + 0.12), 1 - E.prog(t, s.b - 0.12, s.b));
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); E.subtitle(g, s.text, { alpha: fade }); g.restore();
  };

  window.E = E;
})();
