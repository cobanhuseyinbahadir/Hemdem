// Parça denetimi (17 Kasım 2026): K4 ve Z7'den M.parcalar / M.head / M.standing'e taşınan parçalar
// boş zeminde, büyük ölçekte. Her saniye bir sayfa:
//   0.5 mutfak (demir tava, ocak, tahta, soğanlar, bıçak, doğranmış parçalar)
//   1.5 eski ev mutfağı (beyaz ocak, bakır tava, kaşık, ışıyan yarım soğan) + radyolar + kâse
//   2.5 pencere, nişler, uzak baş-omuz (mini)
//   3.5 deniz, vapur, baca dumanı
//   4.5 figür: ayakta (normal kol / ince kol) ve baş: gülüş 0 / 0.5 / 1 (açık ağız)
// Komut (motor/ klasöründe): node render.js ornekler/parca-denetimi-17kasim.js --still 0.5 --out ornekler/parca-denetimi/1-mutfak.png
window.FILM = {
  style: 'minyatur',
  duration: 5,
  signature: 'parça denetimi',
  render(g, t, M) {
    const C = M.C, P = M.parcalar(g), sayfa = Math.floor(t);
    g.fillStyle = M.PAT.VELLUM; g.fillRect(0, 0, 1080, 1920);
    const yazi = (s, x, y) => { g.fillStyle = C.INK; g.font = '500 30px "Fraunces Variable"'; g.textAlign = 'center'; g.fillText(s, x, y); };
    const olcek = (x, y, k, fn) => { g.save(); g.translate(x, y); g.scale(k, k); const lw = M.lwK; M.lwK = 1 / Math.pow(k, .55); fn(); M.lwK = lw; g.restore(); };
    const icerik = [[-30, -4, 'domates', .3], [-8, 2, 'biber', -.4], [14, -3, 'sogan', 0], [34, 2, 'domates', 1], [-44, 4, 'sogan', .8], [26, 6, 'biber', .6]];

    if (sayfa === 0) {
      olcek(-32, 140, 2.2, () => {
        P.ocak(160, 360, 300, { alev: 260, t: 1 });
        P.tava(260, 264, { icerik });
      });
      yazi('P.ocak + P.tava (demir, içerik) + P.parca', 540, 870);
      olcek(1, 620, 2.2, () => {
        P.tahta(120, 370, 300);
        P.yarimSogan(155, 252, 28, {}); P.butunSogan(225, 254, 26);
        P.bicak(262, 270, 0, 1);
      });
      yazi('P.tahta, P.yarimSogan, P.butunSogan, P.bicak', 540, 1330);
      olcek(140, 1260, 3, () => {
        P.parca(40, 60, 'sogan'); P.parca(90, 60, 'domates'); P.parca(140, 60, 'biber', .3);
        P.kasik(170, 40, 250, 90);
      });
      yazi('P.parca: soğan / domates / biber · P.kasik', 540, 1560);
    } else if (sayfa === 1) {
      olcek(0, 100, 2, () => {
        P.ocak(160, 360, 300, { beyaz: true, alev: 260, t: 1 });
        P.tava(260, 264, { sap: 1, renk: C.COPPER, renkD: C.COPPER_D, icerik: icerik.filter(i => i[2] === 'sogan') });
        P.kasik(380, 250, 290, 228);
      });
      yazi('P.ocak (beyaz) + P.tava (bakır, sap sağda) + P.kasik', 540, 770);
      olcek(170, 880, 3, () => { P.yarimSogan(60, 70, 38, { isik: 1 }); });
      yazi('P.yarimSogan { isik: 1 }', 350, 1300);
      olcek(580, 920, 2.4, () => { P.butunSogan(70, 70, 34); });
      yazi('P.butunSogan', 750, 1300);
      olcek(110, 1380, 2.3, () => { P.radyo(70, 70, {}); P.radyo(210, 70, { renk: C.VERM, renkD: C.VERM_D, dugme: -1.2, ibre: .8 }); });
      yazi('P.radyo (ahşap / kırmızı)', 380, 1720);
      olcek(880, 1560, 2.2, () => { P.kase(0, 0, -.5); });
      yazi('P.kase', 870, 1720);
    } else if (sayfa === 2) {
      P.pencere(190, 300, 530, 760, () => { g.fillStyle = C.TURQ; g.fillRect(190, 300, 340, 460); M.cloud(g, 220, 380, 220, 3); });
      yazi('P.pencere', 360, 860);
      P.mini(700, 520, C.VERD, { hair: '#5a3a22' }); P.mini(780, 520, C.TURQ, {}); P.mini(860, 520, C.SAFFRON, { scarf: C.LILAC });
      olcek(780, 560, 1, () => {});
      yazi('P.mini', 780, 600);
      P.nis(270, 1000, 1420, 190, {});
      P.nis(540, 1000, 1420, 190, { dol: 1, ic: () => P.kase(540, 1300, 0) });
      P.nis(810, 1000, 1420, 190, { dol: .6 });
      yazi('P.nis (boş / dolu + ic / dol .6)', 540, 1500);
    } else if (sayfa === 3) {
      P.deniz(0, 1080, 1000, 1700, 1);
      P.vapur(520, 1240, { s: 1.6, kafalar: 1 });
      P.duman(600, 860, 1, 0); P.duman(250, 600, 1, .6);
      yazi('P.deniz, P.vapur { s: 1.6, kafalar: 1 }, P.duman (kal 0 / .6)', 540, 1780);
    } else {
      M.standing(g, { x: 300, y: 1000, scale: 1.4, coat: C.VERM, coatD: C.VERM_D, longHair: '#3a2418' });
      M.standing(g, { x: 740, y: 1000, scale: 1.4, coat: C.TURQ, coatD: C.TURQ_D, longHair: '#3a2418', kolInce: true, hand: [60, -150] });
      yazi('normal kol', 300, 1060); yazi('{ kolInce: true }', 740, 1060);
      const yuz = (x, o) => olcek(x, 1460, 2.1, () => M.head(g, 0, 0, { hair: '#3a2418', ...o }));
      yuz(250, {}); yuz(530, { gulus: .5 }); yuz(810, { gulus: 1, gulusAc: 1, tilt: -.12 });
      yazi('gülüş yok', 270, 1680); yazi('gulus: .5', 550, 1680); yazi('gulus: 1, ağız açık', 800, 1680);
    }
  },
};
