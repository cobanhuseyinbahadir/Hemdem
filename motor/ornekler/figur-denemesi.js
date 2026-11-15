// Motor örneği: balkonda oturan iki figür, çay bardakları, renk aralarından yayılıyor.
// Hazır yardımcıların (sittingBack, bustBack, teaGlass, railing, wash) nasıl kullanıldığını gösterir.
window.FILM = {
  duration: 4, fps: 30,
  paper: '#1F2A3A', ink: '#EDE7DE', accent: '#E2A65A', seed: 4,
  subs: [{ a: 0, b: 4, text: 'yanında oturan biri mi?' }],
  setup(E) {
    this.rail = E.drawing(E.railing(60, 1180, 960, 300, 12), { seed: 2, width: 2.4 });
    this.windows = E.drawing([...E.windowFrame(120, 300, 170, 230), ...E.windowFrame(780, 260, 170, 230)], { seed: 6, width: 2.2 });
    this.a = E.drawing(E.sittingBack(400, 760, 0.8, { tilt: -0.08, slump: 0.4 }), { seed: 9, width: 2.8 });
    this.b = E.drawing(E.bustBack(660, 800, 0.78, { tilt: 0.1 }), { seed: 11, width: 2.8 });
    this.glass = E.drawing([...E.teaGlass(560, 1160, 0.9), ...E.teaGlass(250, 1160, 0.9)], { seed: 13, width: 2.4 });
    this.light = E.bloom({ cx: 540, cy: 1000, rx: 470, ry: 620 }, { seed: 5, alpha: 0.75, glow: 0.25, origin: [530, 1000] });
    this.fillA = E.bustBackFill(400, 760, 0.8, { tilt: -0.08, slump: 0.4 });
    this.fillB = E.bustBackFill(660, 800, 0.78, { tilt: 0.1 });
    this.lit = E.wash({ cx: 205, cy: 415, rx: 70, ry: 95 }, { seed: 8, alpha: 0.8, rough: 6, glow: 0.4 });
  },
  render(g, t, E) {
    const boil = 1 + (Math.floor(t * 12) % 4);
    E.camera(g, { x: 540, y: 960, zoom: E.lerp(1.04, 1, E.prog(t, 0, 4)) });
    this.light.draw(g, E.prog(t, 1.2, 3.6));
    this.lit.draw(g, 1);
    this.windows.draw(g, 1, { boil });
    this.rail.draw(g, 1, { boil });
    // figürler korkuluğun önünde: önce kâğıt rengiyle doldur, sonra çiz
    [this.fillA, this.fillB].forEach(f => { E.fillPoly(g, f.body, E.paperColor); E.fillPoly(g, f.head, E.paperColor); });
    this.a.draw(g, 1, { boil });
    this.b.draw(g, E.prog(t, 0.2, 1.2), { boil });
    this.glass.draw(g, 1, { boil });
    g.setTransform(1, 0, 0, 1, 0, 0);
    E.hand(g, ['Kelimeler yetmediğinde', 'seni en çok ne anlattı?'], 540, 170, { size: 70, align: 'center' });
  }
};
