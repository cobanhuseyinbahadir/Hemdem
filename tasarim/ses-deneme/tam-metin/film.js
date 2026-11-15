// Hemdem Minyatür — örnek film (10 sn): "Bir fincan kahvenin kırk yıl hatırı vardır."
// Kamera altın fincanın üstünde başlar; kandil yanar, ışık fincana değer, varak parlar,
// halkalar yayılır; kamera geri çekilip resmin tamamını gösterir; Sav kartuşa yazılır.
//
//   node render.js ornekler/minyatur-kahvehane.js --still 7 --out kare.png
//   node render.js ornekler/minyatur-kahvehane.js --scale 0.5 --fps 24 --out taslak.mp4
window.FILM = {
  style: 'minyatur',
  // süre ve altyazı sesten gelir (hizalama.json)
  fps: 30,
  seed: 11,
  subs: 'ses',
  gizli: [12],          // Sav kartuşta; altyazıda tekrar etmez
  kapanis: 2.5,

  render(g, t, M) {
    const C = M.C;
    // --- zaman çizelgesi ---
    const lampK = M.prog(t, M.c(3).bas, 1.2);            // kandil yanıyor
    const cupK = M.prog(t, M.k(5, 'fincanı'), 1.0);             // ışık fincana değiyor
    const lift = M.prog(t, M.c(6).bas, 1.4) * -10;       // yaşlı adam fincanı hafifçe kaldırıyor
    const cam = M.track([[0, [672, 1150, 2.3]], [M.c(9).bas, [672, 1150, 2.3]], [M.c(11).bas, [540, 960, 1]]], t);
    M.camera(g, { x: cam[0], y: cam[1], zoom: cam[2] });

    // --- gökyüzü, yıldızlar, bulutlar (bulutlar çok yavaş süzülür) ---
    M.sky(g, 72, 72, 936, 900);
    M.stars(g, 38, [92, 300, 896, 500], 3);
    const drift = t * 4;
    M.cloud(g, 120 + drift, 360, 230, 5); M.cloud(g, 400 - drift * .6, 450, 170, 4); M.cloud(g, 560 + drift * .4, 330, 130, 3);

    // --- uzak kayalar, zemin ---
    M.rock(g, 470, 860, 120, 170, C.LILAC, C.LILAC_D, 5);
    M.rock(g, 610, 880, 100, 130, C.ROSE, C.ROSE_D, 6);
    M.rock(g, 380, 900, 90, 110, '#c9b6d2', C.LILAC_D, 7);
    M.ground(g, 880, [72, 72, 1008, 1848], 8, [[200, 1180, 730, 220]]);
    M.cypress(g, 545, 620, 1000, 45);

    // --- kahvehane ---
    const roof = M.poly([[84, 650], [500, 650], [452, 560], [132, 560]]);
    M.shape(g, roof, C.VERM, C.VERM_D, 3, 12);
    g.save(); g.clip(roof); g.strokeStyle = 'rgba(80,15,5,.55)'; g.lineWidth = 2;
    for (let y = 578; y < 650; y += 18) for (let x = 90; x < 500; x += 22) { g.beginPath(); g.arc(x + (y % 36 ? 11 : 0), y, 11, 0, Math.PI); g.stroke(); }
    g.restore();
    M.shape(g, M.P(p => p.rect(100, 650, 384, 540)), C.ROSE, C.ROSE_D, 3, 14);
    M.shape(g, M.P(p => p.rect(100, 660, 384, 34)), C.TURQ, C.TURQ_D, 2.4, 6);
    for (let x = 116; x < 480; x += 32) { g.fillStyle = C.WHITE; g.beginPath(); g.arc(x, 677, 4, 0, M.TAU); g.fill(); g.fillStyle = C.VERM; g.beginPath(); g.arc(x + 16, 677, 2.4, 0, M.TAU); g.fill(); }
    const plaque = M.poly([[170, 708], [414, 708], [428, 730], [414, 752], [170, 752], [156, 730]]);
    g.fillStyle = M.PAT.VELLUM; g.fill(plaque); g.lineWidth = 2.6; g.strokeStyle = C.INK; g.stroke(plaque);
    g.font = '600 26px "Fraunces Variable"'; g.fillStyle = C.VERM_D; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KAHVEHÂNE', 292, 731);
    for (const x of [122, 238, 354]) {
      M.shape(g, M.arch(x, 104, 790, 1170), C.LAPIS_D, null, 3);
      M.hiLine(g, q => { q.moveTo(x + 6, 1160); q.lineTo(x + 6, 790 + 104 * .55); q.quadraticCurveTo(x + 6, 790 + 104 * .14, x + 52, 797); }, 2, .6);
      g.strokeStyle = C.INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 52, 800); g.lineTo(x + 52, 860); g.stroke();
      M.gold(g, M.poly([[x + 40, 860], [x + 64, 860], [x + 58, 884], [x + 46, 884]]), null, 1.6);
    }

    // --- çınar, dal, kandil ---
    const trunk = M.P(p => { p.moveTo(918, 1215); p.bezierCurveTo(930, 1050, 900, 900, 920, 760); p.lineTo(870, 700); p.lineTo(890, 690); p.lineTo(950, 740); p.lineTo(990, 660); p.lineTo(1006, 680); p.lineTo(975, 790); p.bezierCurveTo(985, 950, 1000, 1080, 1004, 1215); p.closePath(); });
    M.shape(g, trunk, C.WOOD, C.WOOD_D, 3, 14);
    M.shape(g, M.P(p => { p.moveTo(900, 760); p.bezierCurveTo(820, 740, 760, 760, 700, 790); p.lineTo(702, 802); p.bezierCurveTo(760, 776, 830, 762, 905, 784); p.closePath(); }), C.WOOD, C.WOOD_D, 2.6, 6);
    M.crown(g, 930, 440, 120, 21); M.crown(g, 790, 520, 110, 22); M.crown(g, 1000, 600, 100, 23); M.crown(g, 860, 640, 95, 24); M.crown(g, 720, 650, 80, 25);
    M.chain(g, 712, 798, 900);
    M.lantern(g, 712, 935, lampK);

    // --- peyke ve kilim ---
    const top = M.poly([[250, 1235], [880, 1235], [912, 1302], [218, 1302]]);
    M.shape(g, M.P(p => p.rect(218, 1302, 694, 74)), C.WOOD, C.WOOD_D, 3, 12);
    for (let x = 250; x < 900; x += 62) { g.strokeStyle = C.WOOD_D; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 1308); g.lineTo(x, 1370); g.stroke(); }
    M.shape(g, top, C.VERM, C.VERM_D, 3, 10);
    g.save(); g.clip(top);
    for (let x = 250; x < 920; x += 46) { const d = M.poly([[x, 1250], [x + 16, 1268], [x, 1286], [x - 16, 1268]]); g.fillStyle = '#f0d9a6'; g.fill(d); g.strokeStyle = C.INK; g.lineWidth = 1.4; g.stroke(d); g.fillStyle = C.LAPIS; g.beginPath(); g.arc(x, 1268, 4, 0, M.TAU); g.fill(); }
    g.restore();
    M.pearls(g, 230, 1296, 900, 1296, 44, 2.4);

    // --- iki eski dost ---
    M.seated(g, { x: 372, y: 1292, dir: 1, coat: C.VERD, coatD: C.VERD_D, sash: C.SAFFRON, cap: '#3a2f2a', hand: [148, -96] });
    M.seated(g, { x: 790, y: 1292, dir: -1, coat: C.VERM, coatD: C.VERM_D, sash: C.TURQ, hair: '#d9d2c4', beard: true, hand: [122, -142 + lift] });

    // --- sini ve fincanlar ---
    M.shape(g, M.P(p => p.ellipse(578, 1256, 70, 17, 0, 0, M.TAU)), C.COPPER, C.COPPER_D, 2.6, 6);
    M.cup(g, 560, 1212, { gold: false });
    const cx = 668, cy = 1128 + lift;
    const lit = { x: cx + 10, y: cy + 4, r: 70, k: cupK };
    M.cup(g, cx, cy, { gold: true, lit });
    M.rings(g, cx, cy + 16, M.clamp((t - 2.2) / 1.6), 34, 96);
    M.flash(g, cx + 12, cy + 6, 13, cupK * (.75 + .25 * Math.sin(t * 5)));
    M.flash(g, cx - 8, cy + 24, 7, cupK * .7);

    // --- ön plan: kedi, laleler, çeşme, dere ---
    const cat = M.P(p => { p.moveTo(170, 1500); p.quadraticCurveTo(158, 1440, 182, 1420); p.lineTo(178, 1398); p.lineTo(192, 1412); p.lineTo(208, 1398); p.lineTo(208, 1422); p.quadraticCurveTo(232, 1450, 220, 1500); p.closePath(); });
    M.shape(g, cat, '#e7dccb', '#b8a68c', 2.4, 8);
    const tail = Math.sin(t * 2.2) * 10;
    g.strokeStyle = C.INK; g.lineWidth = 2.6; g.beginPath(); g.moveTo(220, 1494); g.bezierCurveTo(260, 1500, 266 + tail, 1468, 246 + tail, 1460 - tail * .3); g.stroke();
    g.fillStyle = C.INK; g.beginPath(); g.arc(186, 1428, 2, 0, M.TAU); g.arc(202, 1428, 2, 0, M.TAU); g.fill();
    M.shape(g, M.poly([[110, 1560], [970, 1560], [960, 1600], [120, 1600]]), '#a77a52', '#7a5434', 2.6, 6);
    const R = M.rng(40);
    for (let i = 0, x = 276; x < 770; x += 50, i++) M.tulip(g, x, 1566, R.r(60, 84), i % 3 === 1 ? C.SAFFRON : C.VERM, i % 3 === 1 ? C.SAFFRON_D : C.VERM_D);
    const cesme = M.P(p => { p.moveTo(800, 1540); p.lineTo(800, 1430); p.quadraticCurveTo(800, 1392, 850, 1388); p.quadraticCurveTo(900, 1392, 900, 1430); p.lineTo(900, 1540); p.closePath(); });
    M.shape(g, cesme, C.WHITE, '#c9c2b4', 2.8, 10);
    M.shape(g, M.arch(824, 52, 1414, 1500), C.TURQ, C.TURQ_D, 2.4, 8);
    M.shape(g, M.poly([[812, 1512], [888, 1512], [880, 1540], [820, 1540]]), '#d8d0c0', '#a9a090', 2.4, 4);
    g.strokeStyle = '#7fb3d9'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(850, 1490); g.lineTo(850, 1512); g.stroke();
    const brook = M.P(p => { p.moveTo(72, 1612); p.bezierCurveTo(300, 1596, 700, 1630, 1008, 1606); p.lineTo(1008, 1680); p.bezierCurveTo(700, 1700, 300, 1668, 72, 1684); p.closePath(); });
    g.fillStyle = M.PAT.LAPIS; g.fill(brook); g.lineWidth = 3; g.strokeStyle = C.INK; g.stroke(brook);
    const flow = (t * 30) % 44;
    M.hiLine(g, q => { for (let x = 56 + flow; x < 1000; x += 44) { const y = 1640 + Math.sin(x * .03) * 8; q.moveTo(x, y); q.quadraticCurveTo(x + 11, y - 8, x + 22, y); } }, 2, .7);
  },

  // ekran koordinatında: Sav kartuşu kamera geri çekilirken kalemle açılır
  overlay(g, t, M) {
    M.cartouche(g, ['Bir fincan kahvenin', { text: 'kırk yıl hatırı vardır.', italic: true }], M.clamp((t - M.c(12).bas) / 1.2));
  },
};
