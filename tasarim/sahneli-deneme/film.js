// Hemdem Minyatür — sahneli deneme (13 Kasım metninin ilk 7 cümlesi, ~18 sn)
// 5 çekim, 4 geçiş türü: kesintisiz kamera, eşleşen şekil, ön plan silmesi, çerçeveden geçiş.
// Bütün zamanlar sesten (hizalama.json): M.c(n), M.k(n, 'kelime').
//
//   node render.js ../tasarim/sahneli-deneme/film.js --still 3.2 --out kare.png
window.FILM = {
  style: 'minyatur',
  subs: 'ses',
  sonCumle: 7,
  kapanis: 1.5,
  seed: 11,

  render(g, t, M) {
    const C = M.C, TAU = M.TAU;

    // ---------- ortak parçalar ----------
    const kilim = (x0, y0, x1, y1) => {
      const r = M.P(p => p.rect(x0, y0, x1 - x0, y1 - y0));
      M.shape(g, r, C.VERM, C.VERM_D, 3, 16);
      g.save(); g.clip(r);
      for (let y = y0 + 50; y < y1; y += 90) for (let x = x0 + 40 + ((y / 90) % 2) * 45; x < x1; x += 90) {
        const d = M.poly([[x, y - 22], [x + 22, y], [x, y + 22], [x - 22, y]]);
        g.fillStyle = '#f0d9a6'; g.fill(d); g.strokeStyle = C.INK; g.lineWidth = 1.4 * M.lwK; g.stroke(d);
        g.fillStyle = C.LAPIS; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
      }
      g.restore();
    };
    const kahvehane = () => {
      const roof = M.poly([[84, 650], [500, 650], [452, 560], [132, 560]]);
      M.shape(g, roof, C.VERM, C.VERM_D, 3, 12);
      M.shape(g, M.P(p => p.rect(100, 650, 384, 540)), C.ROSE, C.ROSE_D, 3, 14);
      M.shape(g, M.P(p => p.rect(100, 660, 384, 34)), C.TURQ, C.TURQ_D, 2.4, 6);
      for (let x = 116; x < 480; x += 32) { g.fillStyle = C.WHITE; g.beginPath(); g.arc(x, 677, 4, 0, TAU); g.fill(); }
      const plaque = M.poly([[170, 708], [414, 708], [428, 730], [414, 752], [170, 752], [156, 730]]);
      g.fillStyle = M.PAT.VELLUM; g.fill(plaque); g.lineWidth = 2.6 * M.lwK; g.strokeStyle = C.INK; g.stroke(plaque);
      g.font = '600 26px "Fraunces Variable"'; g.fillStyle = C.VERM_D; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KAHVEHÂNE', 292, 731);
      for (const x of [122, 238, 354]) M.shape(g, M.arch(x, 104, 790, 1170), C.LAPIS_D, null, 3);
    };

    // =========================================================
    // ÇEKİM 1–2: ODA (gece). Yakın plan fincan → kamera geri çekilir → boş minder
    // =========================================================
    const oda = (g, t) => {
      const flip0 = M.k(2, 'ters'), flipU = M.ease((t - flip0) / .9);
      const down = 1 - M.ease((t - .3) / 1.0);                       // "içtin": fincan tabağa iner
      const cupX = 540, cupY = 1349 - 90 * down - 70 * Math.sin(Math.PI * flipU), rot = Math.PI * flipU;
      // kamera: fincanın üstünde yavaş yaklaşma → geri çekilme → minderin üstüne kayma
      const c3 = M.c(3).bas, c4 = M.c(4).bas, c5 = M.c(5).bas;
      const cam = M.track([
        [0, [530, 1330, 3.0]], [4.3, [530, 1335, 3.25]],
        [Math.max(4.4, c3 - 1.2), [530, 1335, 3.25]], [c3 + .2, [540, 1140, 1.15]],
        [c4 + .25, [540, 1140, 1.15]], [c4 + 1.6, [800, 1545, 2.3]], [c5, [800, 1550, 2.45]],
      ], t);
      M.camera(g, { x: cam[0], y: cam[1], zoom: cam[2] });

      // duvar, pencere (ay), niş, çini kuşak
      g.fillStyle = M.PAT.SAND; g.fillRect(0, 0, 1080, 1260);
      M.shape(g, M.arch(640, 260, 260, 760), C.LAPIS_D, C.WOOD_D, 4, 14);
      g.save(); g.clip(M.arch(640, 260, 260, 760)); M.stars(g, 7, [650, 300, 240, 400], 9, { x: 770, y: 420, r: 300, k: .6 });
      M.shape(g, M.P(p => p.arc(780, 430, 46, 0, TAU)), C.WHITE, '#c9c2b4', 2.4, 8); g.restore();
      M.shape(g, M.P(p => p.rect(632, 760, 276, 22)), C.WOOD, C.WOOD_D, 2.6, 6);
      M.shape(g, M.arch(150, 170, 560, 900), C.ROSE_D, null, 3);
      M.shape(g, M.P(p => { p.moveTo(205, 900); p.quadraticCurveTo(190, 840, 222, 812); p.lineTo(220, 790); p.lineTo(250, 790); p.lineTo(248, 812); p.quadraticCurveTo(280, 840, 265, 900); p.closePath(); }), C.COPPER, C.COPPER_D, 2.6, 8);
      M.shape(g, M.P(p => p.rect(0, 1150, 1080, 60)), C.TURQ, C.TURQ_D, 2.6, 8);
      for (let x = 30; x < 1080; x += 60) M.triad(g, x, 1180, 3);
      // kandil: 4. cümlede söner gibi kısılır
      const lamp = 1 - .45 * M.prog(t, c4 + .3, 1.5) + .05 * Math.sin(t * 9);
      M.chain(g, 470, 72, 520); M.lantern(g, 470, 555, lamp);
      // zemin
      kilim(0, 1260, 1080, 1920);
      // boş minder (sağda)
      M.shape(g, M.P(p => { p.ellipse(800, 1590, 125, 42, 0, 0, Math.PI); p.lineTo(675, 1555); p.ellipse(800, 1555, 125, 42, 0, Math.PI, 0, true); p.closePath(); }), C.TURQ_D, null, 3);
      M.shape(g, M.P(p => p.ellipse(800, 1555, 125, 42, 0, 0, TAU)), C.TURQ, C.TURQ_D, 3, 12);
      M.pearls(g, 690, 1555, 910, 1555, 16, 2.6);
      // sini ve ayak
      M.shape(g, M.poly([[480, 1400], [600, 1400], [620, 1500], [460, 1500]]), C.WOOD, C.WOOD_D, 3, 10);
      M.shape(g, M.P(p => p.ellipse(540, 1395, 165, 36, 0, 0, TAU)), C.COPPER, C.COPPER_D, 3, 10);
      M.saucer(g, cupX, 1385);
      // adam: el fincanı tutar → bırakır → "durdun": boş mindere uzanır ve durur → el düşer
      const hx0 = (cupX - 300) / 1.15 - 28, hy = (cupY + 15 - 1560) / 1.15;
      const hold = t < flip0 + 1.0;
      const hand = hold ? [hx0 + (rot ? Math.sin(rot) * -10 : 0), hy]
        : M.track([[flip0 + 1.0, [hx0, (1364 - 1560) / 1.15]], [flip0 + 1.8, [110, -60]], [c3, [110, -60]], [c3 + .5, [205, -160]], [M.k(3, 'durdun') + .25, [210, -165]], [c3 + 1.6, [210, -165]], [c3 + 2.4, [110, -60]]], t);
      const sag = M.prog(t, c3 + 1.6, 1.0) * .07;
      M.seated(g, { x: 300, y: 1560, dir: 1, scale: 1.15, coat: C.VERD, coatD: C.VERD_D, sash: C.SAFFRON, cap: '#3a2f2a', hand, lean: sag });
      // fincan en üstte (el onu tutuyor)
      M.cupR(g, cupX, cupY, rot, { kahve: true });
      if (flipU > 0 && flipU < 1) M.flash(g, cupX, cupY + 17, 10, .5);
    };

    // =========================================================
    // ÇEKİM 3–4: ANI — kahvehane önü (altın gökyüzü). Sini → genç adam fincanı uzatır;
    // ön plan silmesinden sonra arkadaşı gelir, fincana eğilir.
    // =========================================================
    const ani = (g, t, wide) => {
      const c5 = M.c(5).bas, c6 = M.c(6).bas;
      const cam = wide
        ? [540, 960, 1.0]
        : M.track([[c5, [600, 1255, 2.67]], [c5 + .25, [600, 1255, 2.67]], [c5 + 1.4, [560, 1080, 1.25]], [c6 + 1, [545, 1060, 1.2]]], t);
      M.camera(g, { x: cam[0], y: cam[1], zoom: cam[2] });
      const show = M.k(5, 'gösterirdin'), sunK = .35 + .65 * M.prog(t, show + .1, .6);
      // altın gök, güneş ve ışınları
      M.gold(g, M.P(p => p.rect(0, 0, 1080, 900)), { x: 860, y: 260, r: 900, k: .55 }, 0);
      M.gold(g, M.star8(860, 260, 90), { x: 860, y: 260, r: 120, k: 1 }, 2);
      g.save(); g.strokeStyle = '#fff0c4'; g.globalAlpha = .45 * sunK; g.lineWidth = 3 * M.lwK;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(860, 260); g.lineTo(700 - i * 30, 1150 + i * 12); g.stroke(); }
      g.restore();
      M.cloud(g, 120 + t * 6, 300, 220, 5); M.cloud(g, 420 - t * 4, 420, 160, 4);
      M.rock(g, 620, 880, 110, 130, C.ROSE, C.ROSE_D, 6);
      M.ground(g, 880, [0, 0, 1080, 1920], 8, [[200, 1180, 760, 260]]);
      kahvehane();
      M.cypress(g, 545, 640, 1000, 42);
      // çınar
      M.shape(g, M.P(p => { p.moveTo(918, 1215); p.bezierCurveTo(930, 1050, 900, 900, 920, 760); p.lineTo(990, 660); p.lineTo(1006, 680); p.lineTo(975, 790); p.bezierCurveTo(985, 950, 1000, 1080, 1004, 1215); p.closePath(); }), C.WOOD, C.WOOD_D, 3, 14);
      M.crown(g, 930, 600, 120, 21); M.crown(g, 1010, 700, 100, 23);
      // peyke + kilim
      M.shape(g, M.P(p => p.rect(218, 1302, 694, 74)), C.WOOD, C.WOOD_D, 3, 12);
      kilim(240, 1236, 890, 1302);
      // sini
      M.shape(g, M.P(p => p.ellipse(600, 1255, 110, 26, 0, 0, TAU)), C.COPPER, C.COPPER_D, 2.6, 8);
      M.cup(g, 560, 1214, {});
      // genç adam fincanı kaldırıp uzatır
      const lift = M.ease((t - show) / .8);
      const cx = 640 + 120 * lift, cy = 1205 - 95 * lift;
      const lit = { x: cx + 10, y: cy, r: 80, k: sunK };
      M.seated(g, { x: 380, y: 1292, dir: 1, coat: C.VERD, coatD: C.VERD_D, sash: C.SAFFRON, cap: '#3a2f2a', hand: [(cx - 22 - 380) + 6, cy + 15 - 1292] });
      M.saucer(g, 640, 1241, { gold: true, lit: { ...lit, k: sunK * .7 } });
      M.cupR(g, cx, cy, 0, { gold: true, lit });
      M.rings(g, cx, cy + 16, M.clamp((t - show - .3) / 1.4), 34, 100);
      M.flash(g, cx + 12, cy + 6, 13, sunK * (.7 + .3 * Math.sin(t * 6)));
      // arkadaş gelir (yalnızca geniş çekimde): sağdan yürür, fincana eğilir
      if (wide) {
        const w = M.yuru(t, c6 - .3, 1.5, 1150, 840);
        const bak = M.prog(t, M.k(6, 'bakardı') - .1, .5) * .2;
        M.standing(g, { x: w.x, y: 1330, dir: -1, scale: .95, coat: C.VERM, coatD: C.VERM_D, sash: C.TURQ, hair: '#4a3020', step: w.step, bob: w.bob, lean: bak, hand: w.gidiyor ? [60 + Math.sin(w.step * TAU) * 18, -150] : [96, -150 + bak * 90] });
      }
      // ön plan çiçekleri
      for (let i = 0, x = 120; x < 1000; x += 70, i++) M.tulip(g, x, 1560, 70 + (i % 3) * 8, i % 3 === 1 ? C.SAFFRON : C.VERM, i % 3 === 1 ? C.SAFFRON_D : C.VERM_D);
    };

    // =========================================================
    // ÇEKİM 5: İÇERİ — kahvehane içi (akşam, kandiller). İkisi gülüyor.
    // =========================================================
    const ic = (g, t) => {
      const c7 = M.c(7).bas, gul = M.k(7, 'gülerdiniz');
      const cam = M.track([[c7 - .8, [520, 1180, 1.55]], [c7 + 3.5, [560, 1130, 1.35]]], t);
      M.camera(g, { x: cam[0], y: cam[1], zoom: cam[2] });
      g.fillStyle = M.PAT.ROSE; g.fillRect(0, 0, 1080, 1300);
      for (const x of [90, 330, 570, 810]) {
        M.shape(g, M.arch(x, 180, 560, 1120), C.LAPIS_D, C.ROSE_D, 3, 12);
        M.chain(g, x + 90, 560, 700); M.lantern(g, x + 90, 735, .9 + .1 * Math.sin(t * 7 + x));
      }
      M.shape(g, M.P(p => p.rect(0, 1120, 1080, 50)), C.TURQ, C.TURQ_D, 2.6, 8);
      for (let x = 30; x < 1080; x += 60) M.triad(g, x, 1145, 3);
      kilim(0, 1170, 1080, 1920);
      // alçak masa ve fincanlar
      M.shape(g, M.poly([[470, 1380], [610, 1380], [630, 1460], [450, 1460]]), C.WOOD, C.WOOD_D, 3, 10);
      M.shape(g, M.P(p => p.ellipse(540, 1375, 150, 32, 0, 0, TAU)), C.COPPER, C.COPPER_D, 3, 10);
      M.cup(g, 490, 1318, {}); M.cup(g, 600, 1318, { gold: true, lit: { x: 600, y: 1330, r: 70, k: .8 } });
      const a = M.gul(t, gul - .1, 1.9), b = M.gul(t, gul + .05, 1.8);
      M.seated(g, { x: 290, y: 1500, dir: 1, scale: 1.05, coat: C.VERD, coatD: C.VERD_D, sash: C.SAFFRON, cap: '#3a2f2a', hand: [150, -40], bob: a.bob, tilt: a.tilt, agiz: a.agiz, lean: -a.tilt * .2 });
      M.seated(g, { x: 790, y: 1500, dir: -1, scale: 1.05, coat: C.VERM, coatD: C.VERM_D, sash: C.TURQ, hair: '#4a3020', hand: [150, -40], bob: b.bob, tilt: b.tilt, agiz: b.agiz, lean: -b.tilt * .2 });
    };

    const c5 = M.c(5).bas, c6 = M.c(6).bas, c7 = M.c(7).bas;
    const kapiAn = c7 + .35;
    M.cekimler(g, t, [
      { a: 0, b: c5, ciz: oda, gecis: { tur: 'esles' } },
      { a: c5, b: c6, ciz: (g, t) => ani(g, t, false), gecis: { tur: 'silme', d: 1.0, on: 'servi' } },
      { a: c6, b: kapiAn, ciz: (g, t) => ani(g, t, true), gecis: { tur: 'cerceve', d: .8, delik: M.arch(122, 104, 790, 1170), kutu: [122, 790, 104, 380] } },
      { a: kapiAn, b: 99, ciz: ic },
    ]);
  },
};
