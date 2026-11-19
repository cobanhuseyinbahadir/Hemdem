// Hemdem Crayon — DENEME çekimi (19 Kasım 2026, Z11 "amae" için stil denemesi). Sessiz, ~6 sn.
// Gün sonu: kanepede iki figür arkadan; açık saçlı kadının omuzları düşer, başını sevdiğinin omzuna bırakır.
// Beyaz mum çizgileri (yıldızlar, ay, lamba ışınları) sulu boya yıkaması gelince belirir.
//   node render.js ornekler/crayon-deneme.js --still 5 --out kare.png
window.FILM = {
  style: 'crayon', duration: 6, fps: 24, seed: 5,

  render(g, t, M, CR) {
    const TAU = M.TAU, P = M.P, ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const sw = Math.sin(t * 1.3);

    // ---- sahne: mumla çizilen (yıkamadan önce) ----
    const winX = 560, winY = 250, winW = 400, winH = 620;
    const pencere = P(p => p.rect(winX, winY, winW, winH));
    // pencere çerçevesi (kahverengi mum)
    M.shape(g, P(p => p.rect(winX - 26, winY - 26, winW + 52, winH + 52)), '#b98a5c', '#7a4f2c', 4, 14);
    M.shape(g, pencere, '#efe4cb', null, 4);               // cam: kâğıt (yıkama burayı gece yapar)
    M.shape(g, P(p => p.rect(winX + winW / 2 - 9, winY, 18, winH)), '#b98a5c', '#7a4f2c', 3, 8);
    M.shape(g, P(p => p.rect(winX, winY + winH * .42, winW, 18)), '#b98a5c', '#7a4f2c', 3, 8);
    M.shape(g, P(p => p.rect(winX - 50, winY + winH + 26, winW + 100, 26)), '#b98a5c', '#7a4f2c', 3, 8);

    // lamba (solda): ayak, gövde, abajur
    const lx = 170, ly = 560;
    M.shape(g, P(p => p.rect(lx - 7, ly + 70, 14, 620)), '#6b4a34', null, 3);
    M.shape(g, P(p => p.ellipse(lx, 1240, 62, 16, 0, 0, TAU)), '#6b4a34', null, 3);
    M.shape(g, P(p => { p.moveTo(lx - 62, ly + 70); p.lineTo(lx + 62, ly + 70); p.lineTo(lx + 38, ly - 26); p.lineTo(lx - 38, ly - 26); p.closePath(); }), '#f0c35a', '#c98a24', 4, 14);

    // kanepe arkası ve oturak (arkadan)
    M.shape(g, P(p => p.roundRect(110, 1130, 860, 420, 60)), '#b9553b', '#7d2f20', 5, 22);
    M.shape(g, P(p => p.roundRect(70, 1280, 150, 330, 50)), '#a24a33', '#7d2f20', 5, 16);   // sol kol
    M.shape(g, P(p => p.roundRect(860, 1280, 150, 330, 50)), '#a24a33', '#7d2f20', 5, 16);  // sağ kol
    g.save(); g.strokeStyle = '#7d2f20'; g.lineWidth = 4; g.globalAlpha = .6; g.beginPath(); g.moveTo(540, 1330); g.lineTo(540, 1550); g.stroke(); g.restore();
    // halı
    M.shape(g, P(p => p.rect(0, 1640, 1080, 280)), '#6f9a8a', '#3f6b5c', 4, 20);
    for (let x = 40; x < 1080; x += 120) M.shape(g, M.poly([[x, 1760], [x + 40, 1720], [x + 80, 1760], [x + 40, 1800]]), '#efe4cb', null, 3);

    // ---- yıkama (sulu boya) ----
    const pSky = ease((t - .3) / 2.6), pWarm = ease((t - 1.2) / 3.6), pFloor = ease((t - 2) / 2.6);
    const kare = (x, y, w, h) => P(p => p.rect(x, y, w, h));
    CR.wash(g, [
      { yol: P(p => { p.rect(-20, -20, 1120, 1660); p.rect(winX - 26, winY - 26, winW + 52, winH + 52); }), evenodd: true, renk: '#f2b95a', alpha: .42, from: [lx, ly + 30], p: pWarm, r: 1700, kenar: 22 },
      { yol: kare(0, 1640, 1080, 280), renk: '#c9704f', alpha: .22, from: [540, 1700], p: pFloor, r: 1200, kenar: 14 },
      { yol: pencere, renk: '#1d3a7a', alpha: .92, from: [winX + winW, winY], p: pSky, r: 900, kenar: 18 },
    ], (q) => {
      // direnç: beyaz mumla çizilmiş, yıkamayı iten çizgiler
      q.lineWidth = 7;
      const yildiz = (x, y, s) => { q.beginPath(); q.moveTo(x - s, y); q.lineTo(x + s, y); q.moveTo(x, y - s); q.lineTo(x, y + s); q.moveTo(x - s * .55, y - s * .55); q.lineTo(x + s * .55, y + s * .55); q.moveTo(x + s * .55, y - s * .55); q.lineTo(x - s * .55, y + s * .55); q.stroke(); };
      const ys = [[620, 330, 22], [910, 440, 15], [900, 330, 18], [690, 470, 12], [860, 520, 24], [610, 560, 14], [920, 610, 12], [740, 600, 16], [650, 740, 18], [880, 760, 14]];
      for (const [x, y, s] of ys) yildiz(x, y, s);
      q.beginPath(); q.arc(780, 330, 46, 0, TAU); q.arc(802, 318, 40, 0, TAU, true); q.fill('evenodd');   // hilal
    });

    // lamba ışığı: yumuşak sıcak yıkama (halka/ışın yok)
    CR.isik(g, lx, ly + 20, 330, '#f6c85a', .55 * pWarm);

    // ---- figürler (yıkamanın üstünde, mumla) ----
    g.save(); g.translate(540, 1220); g.scale(1.32, 1.32); g.translate(-540, -1220);
    const lean = ease((t - 1.1) / 2.6);            // kadın yaslanır
    const drop = ease((t - 0.9) / 2.2);            // omuzlar düşer
    const breath = Math.sin(t * 1.6) * 2.5;
    const torso = (cx, sy, w, col, colD, slope) => {
      const r = slope;                                       // omuz eğimi (kadında düşer)
      M.shape(g, P(p => {
        p.moveTo(cx - w, 1220); p.lineTo(cx - w + 6, sy + 70 + r);
        p.quadraticCurveTo(cx - w + 2, sy + 14 + r, cx - w * .55, sy + 2 + r * .6);
        p.quadraticCurveTo(cx - 26, sy - 8, cx - 22, sy - 38);
        p.lineTo(cx + 22, sy - 38);
        p.quadraticCurveTo(cx + 26, sy - 8, cx + w * .55, sy + 2 + r * .6);
        p.quadraticCurveTo(cx + w - 2, sy + 14 + r, cx + w - 6, sy + 70 + r);
        p.lineTo(cx + w, 1220); p.closePath();
      }), col, colD, 4, 16);
    };
    // erkek (sol, kısa koyu saç), hafifçe kadına döner
    const mx = 430, msy = 1010 + breath * .4;
    g.save(); g.translate(mx, msy - 38); g.rotate(.05 * lean);
    M.shape(g, P(p => p.rect(-17, -38, 34, 46)), '#d79a73', '#a8683f', 3, 6);
    M.shape(g, P(p => p.ellipse(0, -100, 56, 64, 0, 0, TAU)), '#26242b', '#0e0d12', 4, 14);
    M.shape(g, P(p => p.ellipse(-52, -98, 9, 14, 0, 0, TAU)), '#d79a73', null, 3);
    g.restore();
    torso(mx, msy, 118, '#41767a', '#244a4e', 8);
    // kadın (sağ, açık saçlı), omuzları düşer, başı onun omzuna yaslanır
    const wx = 650 - 40 * lean, wsy = 988 + 30 * drop + breath * (1 - drop);
    torso(wx, wsy, 108, '#d9a53f', '#9b6f1a', 6 + 34 * drop);
    g.save(); g.translate(wx, wsy - 38); g.rotate(-.30 * lean + .01 * sw);
    // uzun açık saç (başın arkası + sırta dökülen)
    M.shape(g, P(p => { p.moveTo(-60, -100); p.bezierCurveTo(-72, -20, -70, 80, -52, 150); p.quadraticCurveTo(0, 176, 52, 150); p.bezierCurveTo(70, 80, 70, -20, 60, -100); p.closePath(); }), '#4a2f25', '#2a1710', 4, 20);
    M.shape(g, P(p => p.ellipse(0, -104, 62, 70, 0, 0, TAU)), '#4a2f25', '#2a1710', 4, 18);
    g.save(); g.strokeStyle = '#8a5a3f'; g.globalAlpha = .6; g.lineWidth = 4;
    for (const dx of [-34, -10, 16, 38]) { g.beginPath(); g.moveTo(dx, -146); g.bezierCurveTo(dx + 8, -60, dx - 6, 40, dx + 6, 138); g.stroke(); }
    g.restore();
    g.restore();
    // sırtında sevdiğinin omzuna dayanan el (omzuna konan küçük kol-kıvrımı)
    M.shape(g, P(p => { p.moveTo(mx + 90, msy + 60); p.quadraticCurveTo(mx + 130, msy + 50, mx + 150, msy + 96); p.lineTo(mx + 120, msy + 106); p.quadraticCurveTo(mx + 108, msy + 84, mx + 82, msy + 92); p.closePath(); }), '#d9a53f', '#9b6f1a', 3, 8);
    g.restore();
  },
};
