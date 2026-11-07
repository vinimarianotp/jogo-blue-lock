// ============================================================================
// A ENGRENAGEM DO HUGO (cine_hugo) — final da Copa do Mundo Sub-20 (ch9_world_cup_final)
//   hugo_gears • o Hugo encosta do seu lado: "Aceite: um de nós dois vai ser o segundo
//     melhor." → você sem entender: "Por quê??" → metade do rosto dele e, no lugar da
//     outra metade, engrenagens girando: "gente como a gente não nasceu para ser o
//     primeiro lugar" → a câmera entra no olho dele: a íris vira uma engrenagem preta
//     com o anel azul-claro e ele entra no Fluxo.
// Tocada pelo midMatchLore da final ({ cinematic: 'hugo_gears' }); quando acaba, o Hugo
// fica alguns segundos em Fluxo na partida (midMatchLore.rivalFlow → MatchEngine).
// Usa os helpers da cine_partida (ptd*). Helpers novos com o prefixo "hgo".
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine || !CE.ptdHead) return;

  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = (x) => clamp(x) * clamp(x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };

  const PINK = '#ec4899';
  const CRIMSON = '#a8173a';
  const ICE = '#7dd3fc';
  const INK = '#0b0f19';
  const PAPER = '#eef2f7';
  // uniformes da final: França de azul-marinho, Japão de branco
  const FRA = { jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff' };
  const JPN = { jerseyPrimary: '#f8fafc', jerseySecondary: '#1d4ed8' };

  Object.assign(CE, {
    hgoCast() {
      return { hugo: this.cineChar('hugo', FRA), you: this.cineYou(JPN) };
    },

    // Engrenagem em tinta: dentes, aro, raios vazados, miolo e um fio de brilho
    hgoGear(ctx, x, y, r, teeth, rot, o = {}) {
      const fill = o.fill || INK;
      const hole = o.hole || PAPER;
      const th = r * 0.16;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a0 = (i / teeth) * TAU;
        const a1 = a0 + (TAU / teeth) * 0.22;
        const a2 = a0 + (TAU / teeth) * 0.5;
        const a3 = a0 + (TAU / teeth) * 0.72;
        const pts = [[a0, r], [a1, r + th], [a2, r + th], [a3, r]];
        pts.forEach(([a, rr], k) => {
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          i === 0 && k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
      }
      ctx.closePath();
      ctx.fill();
      // raios vazados
      const spokes = o.spokes ?? 6;
      if (spokes) {
        ctx.fillStyle = hole;
        for (let i = 0; i < spokes; i++) {
          const a0 = (i / spokes) * TAU + 0.18;
          const a1 = ((i + 1) / spokes) * TAU - 0.18;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.72, a0, a1);
          ctx.arc(0, 0, r * 0.32, a1, a0, true);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (o.ring) {
        ctx.strokeStyle = o.ring;
        ctx.lineWidth = Math.max(2, r * 0.07);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = hole;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.12, 0, TAU);
      ctx.fill();
      // brilho metálico
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1.5, r * 0.035);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, -2.6, -1.6);
      ctx.stroke();
      ctx.restore();
    },

    // O "mecanismo": engrenagens de vários tamanhos girando (vizinhas em sentidos
    // contrários), parafusos e lascas soltas, por cima de uma retícula de pontos
    hgoMachine(ctx, x0, y0, w, h, t, k = 1) {
      if (k <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, w, h);
      ctx.clip();
      // retícula
      ctx.fillStyle = 'rgba(11,15,25,0.16)';
      for (let yy = y0; yy < y0 + h; yy += 9) for (let xx = x0 + ((yy / 9) % 2) * 4.5; xx < x0 + w; xx += 9) ctx.fillRect(xx, yy, 2.4, 2.4);
      const gears = [
        [0.32, 0.22, 120, 14, 1], [0.72, 0.16, 70, 10, -1], [0.55, 0.52, 150, 18, -1], [0.9, 0.48, 96, 12, 1],
        [0.2, 0.7, 88, 12, 1], [0.66, 0.86, 110, 14, 1], [0.95, 0.85, 60, 9, -1], [0.1, 0.36, 54, 9, -1], [0.4, 0.95, 66, 10, -1]
      ];
      gears.forEach(([gx, gy, r, n, dir], i) => {
        const pop = ease(seg(k, i * 0.06, i * 0.06 + 0.4));
        if (pop <= 0) return;
        this.hgoGear(ctx, x0 + gx * w, y0 + gy * h, r * pop, n, dir * t * (0.9 / r) * 6 + i, { ring: i === 2 ? ICE : null });
      });
      // lascas e parafusos voando pra direita
      ctx.fillStyle = INK;
      for (let i = 0; i < 26; i++) {
        const q = (rnd(i, 4) + t * 0.004 * (0.5 + rnd(i, 5))) % 1;
        const x = x0 + q * w;
        const y = y0 + rnd(i, 6) * h + Math.sin(t * 0.05 + i) * 6;
        const s = 4 + rnd(i, 7) * 10;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.03 * (i % 2 ? 1 : -1) + i);
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
        ctx.restore();
      }
      ctx.restore();
    },

    // O olho do Hugo com a íris de engrenagem (desenhado pequeno e ampliado em pixel)
    hgoEyeCv(t, open = 1) {
      const w = 192;
      const h = 108;
      if (!this._hgoEye) {
        this._hgoEye = document.createElement('canvas');
        this._hgoEye.width = w;
        this._hgoEye.height = h;
      }
      const cv = this._hgoEye;
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      // pele com hachura de mangá
      g.fillStyle = '#f7e6dc';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(168,23,58,0.12)';
      for (let i = -h; i < w; i += 7) {
        g.beginPath();
        g.moveTo(i, h);
        g.lineTo(i + h * 0.6, 0);
        g.lineTo(i + h * 0.6 + 1.6, 0);
        g.lineTo(i + 1.6, h);
        g.fill();
      }
      const cx = w / 2;
      const cy = h * 0.5;
      const lidUp = (x) => cy - 30 * open * Math.sin(Math.PI * clamp((x - 14) / (w - 28)));
      const lidDn = (x) => cy + 14 * open * Math.sin(Math.PI * clamp((x - 20) / (w - 40)));
      const almond = () => {
        g.beginPath();
        for (let x = 14; x <= w - 14; x += 2) g.lineTo(x, lidUp(x));
        for (let x = w - 14; x >= 14; x -= 2) g.lineTo(x, lidDn(x));
        g.closePath();
      };
      // branco do olho
      almond();
      g.fillStyle = '#f8fafc';
      g.fill();
      // a íris: uma engrenagem preta com o anel azul-claro
      g.save();
      almond();
      g.clip();
      this.hgoGear(g, cx, cy - 3, 30, 12, t * 0.025, { fill: INK, hole: '#cbd5e1', ring: ICE, spokes: 8 });
      g.fillStyle = INK;
      g.beginPath();
      g.arc(cx, cy - 3, 6, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(cx + 9, cy - 16, 4, 4);
      g.restore();
      // pálpebra de cima grossa com cílios, risco de baixo e a dobra
      g.strokeStyle = INK;
      g.lineCap = 'round';
      g.lineWidth = 6;
      g.beginPath();
      for (let x = 10; x <= w - 10; x += 2) g.lineTo(x, lidUp(x) - 1);
      g.stroke();
      g.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) {
        const x = w - 30 + i * 3;
        g.beginPath();
        g.moveTo(x, lidUp(x) - 2);
        g.lineTo(x + 6, lidUp(x) - 9 - i);
        g.stroke();
      }
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 26; x <= w - 26; x += 2) g.lineTo(x, lidDn(x) + 1);
      g.stroke();
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = 30; x <= w - 30; x += 2) g.lineTo(x, lidUp(x) - 10);
      g.stroke();
      // mechas do cabelo carmim caindo nos cantos
      g.fillStyle = CRIMSON;
      [[0, 0, 40, 26], [w - 52, 0, 52, 18]].forEach(([x, y, ww, hh]) => {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + ww, y);
        g.lineTo(x + ww * 0.55, y + hh);
        g.lineTo(x + ww * 0.25, y + hh * 0.6);
        g.lineTo(x, y + hh);
        g.closePath();
        g.fill();
      });
      return cv;
    },

    // O rosto do Hugo desenhado (não é o boneco ampliado): franja carmim ondulada, olhar
    // meio fechado e sorriso de canto. Num canvas pequeno (240x135) ampliado em pixel, como
    // o olho de engrenagem. mode 'color' = close colorido (fundo transparente);
    // 'manga' = página de mangá: a metade esquerda é o rosto em preto e branco (só o cabelo
    // carmim) e a direita vira engrenagens
    hgoFaceCv(mode, t) {
      const w = 240;
      const h = 135;
      const key = `_hgoFace_${mode}`;
      if (!this[key]) {
        this[key] = document.createElement('canvas');
        this[key].width = w;
        this[key].height = h;
      }
      const cv = this[key];
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, w, h);
      const manga = mode === 'manga';
      const cx = manga ? 104 : 128;
      const C = manga
        ? { skin: '#f8fafc', shade: '#cbd5e1', hair: '#a8173a', hairD: '#5c0b20', hairL: '#d14a6a', ink: '#05070c', iris: '#05070c', lip: '#94a3b8', kit: '#1f2937' }
        : { skin: '#f7e6dc', shade: '#e7c4b2', hair: '#a8173a', hairD: '#6d0f26', hairL: '#d63a5c', ink: '#22101a', iris: '#1f2937', lip: '#c97b74', kit: '#1e3a8a' };
      const P = (pts) => {
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(cx + x, y) : g.moveTo(cx + x, y)));
        g.closePath();
      };
      const line = (pts, lw, col = C.ink) => {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(cx + x, y) : g.moveTo(cx + x, y)));
        g.stroke();
      };
      const tone = (x0, y0, x1, y1, step = 3) => {
        g.fillStyle = 'rgba(5,7,12,0.55)';
        for (let y = y0; y < y1; y += step) for (let x = x0 + ((y / step) % 2) * (step / 2); x < x1; x += step) g.fillRect(x, y, 1, 1);
      };
      // Mecha de cabelo: da raiz (x0,y0) até a ponta (x1,y1), largura wd, curvada (bend)
      const lock = (x0, y0, x1, y1, wd, bend, fill, lw = 1.1) => {
        const mx = (x0 + x1) / 2 + bend;
        const my = (y0 + y1) / 2;
        g.fillStyle = fill;
        g.beginPath();
        g.moveTo(cx + x0 - wd / 2, y0);
        g.quadraticCurveTo(cx + mx - wd * 0.35, my, cx + x1, y1);
        g.quadraticCurveTo(cx + mx + wd * 0.35, my, cx + x0 + wd / 2, y0);
        g.closePath();
        g.fill();
        g.strokeStyle = C.ink;
        g.lineWidth = lw;
        g.stroke();
        // fio escuro no meio da mecha
        g.strokeStyle = C.hairD;
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(cx + x0, y0 + 2);
        g.quadraticCurveTo(cx + mx, my, cx + lerp(x0, x1, 0.8), lerp(y0, y1, 0.8));
        g.stroke();
      };
      if (manga) {
        g.fillStyle = PAPER;
        g.fillRect(0, 0, w, h);
        tone(0, 0, w, h, 4);
      }
      // cabelo de trás (mais escuro), ondulado, até a altura do queixo
      g.fillStyle = C.hairD;
      g.beginPath();
      g.moveTo(cx - 64, 40);
      g.quadraticCurveTo(cx - 70, 80, cx - 62, 110);
      g.quadraticCurveTo(cx - 54, 100, cx - 50, 112);
      g.lineTo(cx + 50, 112);
      g.quadraticCurveTo(cx + 54, 100, cx + 62, 110);
      g.quadraticCurveTo(cx + 70, 80, cx + 64, 40);
      g.closePath();
      g.fill();
      // gola da camisa e pescoço
      g.fillStyle = C.kit;
      P([[-70, 135], [-26, 122], [0, 133], [26, 122], [70, 135]]);
      g.fill();
      g.fillStyle = '#f8fafc';
      P([[-26, 122], [0, 133], [26, 122], [22, 120], [0, 129], [-22, 120]]);
      g.fill();
      g.fillStyle = C.shade;
      g.fillRect(cx - 17, 112, 34, 14);
      // rosto
      const face = [[-45, 36], [-43, 80], [-33, 104], [-16, 122], [0, 127], [16, 122], [33, 104], [43, 80], [45, 36]];
      g.fillStyle = C.skin;
      P(face);
      g.fill();
      // sombra embaixo da franja e na bochecha do lado de longe
      g.save();
      P(face);
      g.clip();
      g.fillStyle = C.shade;
      g.fillRect(cx - 50, 34, 100, 14);
      P([[30, 40], [46, 40], [46, 90], [34, 108], [26, 96]]);
      g.fill();
      if (manga) tone(cx - 50, 34, cx + 50, 50, 2);
      g.restore();
      line(face.concat([face[0]]).slice(0, face.length), 1.6);
      // orelhas
      [-1, 1].forEach((s) => {
        g.fillStyle = C.skin;
        P([[s * 44, 64], [s * 50, 66], [s * 50, 82], [s * 44, 86]]);
        g.fill();
        line([[s * 44, 64], [s * 50, 66], [s * 50, 82], [s * 44, 86]], 1.2);
      });
      // olhos: meio fechados (a pálpebra pesada cobre o alto da íris), cílio grosso
      [-1, 1].forEach((s) => {
        const ex = s * 21;
        const ey = 70;
        g.fillStyle = '#ffffff';
        P([[ex - 14, ey], [ex - 6, ey - 5], [ex + 8, ey - 5], [ex + 14, ey - 1], [ex + 8, ey + 5], [ex - 8, ey + 5]]);
        g.fill();
        g.fillStyle = C.iris;
        g.beginPath();
        g.arc(cx + ex + s * 1, ey + 1, 6.2, 0, TAU);
        g.fill();
        g.fillStyle = manga ? '#64748b' : '#4b5563';
        g.beginPath();
        g.arc(cx + ex + s * 1, ey + 2, 3.4, 0, TAU);
        g.fill();
        g.fillStyle = '#ffffff';
        g.fillRect(cx + ex + s * 1 + 2, ey - 1, 2, 2);
        // pálpebra pesada
        g.fillStyle = C.skin;
        P([[ex - 15, ey - 2], [ex - 6, ey - 8], [ex + 9, ey - 8], [ex + 15, ey - 3], [ex + 9, ey - 2.5], [ex - 7, ey - 2.5]]);
        g.fill();
        line([[ex - 15, ey - 1], [ex - 7, ey - 3], [ex + 9, ey - 3], [ex + 15, ey - 1]], 2.6);
        line([[ex - 8, ey + 5.5], [ex + 8, ey + 5.5]], 1);
        line([[ex + s * 15, ey - 1], [ex + s * 19, ey - 4]], 1.6);
        // sobrancelha reta, de quem está achando graça
        line([[ex - s * 10, ey - 13], [ex + s * 13, ey - 15]], 2.2, C.hairD);
      });
      // nariz e boca de canto
      line([[3, 76], [6, 90], [1, 92]], 1.3);
      g.fillStyle = C.lip;
      P([[-9, 104], [8, 103], [12, 100], [10, 105], [-6, 106]]);
      g.fill();
      line([[-10, 104], [8, 103], [13, 99]], 1.4);
      // cabelo da frente: o topo arredondado, as laterais virando na bochecha e a franja em
      // mechas onduladas caindo na testa (uma mais comprida no meio, entre os olhos)
      g.fillStyle = C.hair;
      g.beginPath();
      g.moveTo(cx - 60, 42);
      g.quadraticCurveTo(cx - 66, -4, cx - 22, -12);
      g.quadraticCurveTo(cx + 22, -18, cx + 56, -2);
      g.quadraticCurveTo(cx + 68, 16, cx + 60, 42);
      g.lineTo(cx - 60, 42);
      g.closePath();
      g.fill();
      g.strokeStyle = C.ink;
      g.lineWidth = 1.3;
      g.stroke();
      lock(-54, 26, -60, 104, 20, -10, C.hair);
      lock(54, 26, 60, 104, 20, 10, C.hair);
      lock(-60, 92, -46, 108, 10, -4, C.hair);
      lock(60, 92, 46, 108, 10, 4, C.hair);
      [[-46, 8, -52, 62, 22, -7], [-30, 4, -36, 58, 24, -5], [42, 8, 48, 60, 22, 7], [24, 4, 28, 54, 24, 5], [6, 2, 4, 58, 24, 3], [-12, 2, -18, 62, 24, -3]].forEach(([x0, y0, x1, y1, wd, b]) =>
        lock(x0, y0, x1, y1, wd, b, C.hair)
      );
      lock(-2, 6, -7, 72, 14, -4, C.hair);
      // brilho em faixa ondulada no topo
      g.strokeStyle = C.hairL;
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - 44, 6);
      g.quadraticCurveTo(cx - 24, -4, cx - 6, 2);
      g.quadraticCurveTo(cx + 12, 8, cx + 34, -2);
      g.stroke();
      if (manga) {
        // a metade direita vira engrenagem: corte em zigue-zague no meio do rosto
        const seam = (y) => cx + 8 + Math.sin(y * 0.18) * 3 + (rnd(Math.floor(y / 9), 4) - 0.5) * 6;
        g.save();
        g.beginPath();
        g.moveTo(w, 0);
        for (let y = 0; y <= h; y += 3) g.lineTo(seam(y), y);
        g.lineTo(w, h);
        g.closePath();
        g.clip();
        g.fillStyle = PAPER;
        g.fillRect(0, 0, w, h);
        tone(0, 0, w, h, 4);
        const gs = [
          [cx + 34, 70, 15, 12, 1, ICE], [cx + 30, 26, 22, 14, -1], [cx + 62, 46, 18, 12, 1], [cx + 40, 108, 24, 16, -1], [cx + 78, 94, 14, 10, 1],
          [cx + 96, 22, 26, 16, 1], [cx + 112, 70, 20, 14, -1], [cx + 22, 128, 12, 9, 1], [cx + 128, 118, 16, 11, -1], [cx + 70, 8, 10, 8, -1]
        ];
        gs.forEach(([x, y, r, n, dir, ring], i) => this.hgoGear(g, x, y, r, n, dir * t * (1.6 / r) + i, { ring: ring || null, spokes: r > 14 ? 6 : 4 }));
        // peças voando pra direita
        g.fillStyle = INK;
        for (let i = 0; i < 18; i++) {
          const q = (rnd(i, 8) + t * 0.003 * (0.6 + rnd(i, 9))) % 1;
          const x = cx + 20 + q * (w - cx);
          const y = 8 + rnd(i, 10) * (h - 16);
          g.fillRect(x, y, 2 + (i % 3), 1 + (i % 2));
        }
        g.restore();
        // a borda rasgada e rachaduras subindo pelo rosto
        g.strokeStyle = INK;
        g.lineWidth = 1.6;
        g.beginPath();
        for (let y = 0; y <= h; y += 3) y ? g.lineTo(seam(y), y) : g.moveTo(seam(y), y);
        g.stroke();
        line([[4, 52], [-2, 58], [2, 62]], 0.9);
        line([[6, 96], [0, 100]], 0.9);
      }
      return cv;
    },

    // PLANO 1 — close do Hugo (desenhado), o estádio à noite desfocado atrás
    hgo0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const k = ease(t / S.dur);
      const bg = ctx.createLinearGradient(0, top, 0, bot);
      bg.addColorStop(0, '#0b0820');
      bg.addColorStop(1, '#3b0a2a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      this.cineBokeh(ctx, W, top, bot * 0.8, t, 26, ['rgba(236,72,153,0.4)', 'rgba(255,236,179,0.4)', 'rgba(147,197,253,0.35)'], 5);
      this.ptdRays(ctx, W * 0.6, H * 0.45, W * 0.9, PINK, 0.08, t * 0.002, 30);
      const face = this.hgoFaceCv('color', t);
      const sc = 4.6 * lerp(1, 1.06, k);
      ctx.save();
      // câmera levemente inclinada, ele "encostando" no quadro
      ctx.translate(W * 0.6 + lerp(30, 0, ease(seg(t, 0, 30))), H * 0.5);
      ctx.rotate(-0.05);
      ctx.imageSmoothingEnabled = false;
      // luz rosa por trás (contorno)
      ctx.globalAlpha = 0.85;
      this.cineGlow(ctx, 0, -40, 360, 'rgba(236,72,153,0.45)', 1);
      ctx.globalAlpha = 1;
      ctx.drawImage(face, -face.width * sc * 0.5, -face.height * sc * 0.52, face.width * sc, face.height * sc);
      // brilho no olho na hora da fala
      const gl = seg(t, 20, 28) * (1 - seg(t, 60, 80));
      if (gl > 0) this.cineGlow(ctx, (-21 + 3) * sc, (70 - 135 * 0.52) * sc, 40, 'rgba(236,72,153,0.9)', gl);
      ctx.restore();
      this.ptdChip(ctx, 'HUGO • FRANÇA SUB-20', W * 0.2, top + 40, PINK, seg(t, 6, 18), { size: 16 });
      this.ptdSfx(S, 4, 'hugo', () => window.SFX?.jingle?.([392, 330], 0, 'triangle'));
    },

    // PLANO 2 — você sem entender: a gota de suor e os pontos de interrogação
    hgo1(ctx, S) {
      const { W, H, t } = S;
      const o = this.hgoCast();
      const eyeY = H * 0.44;
      const x = W * 0.58;
      this.ptdCloseBg(ctx, S, '#38bdf8', x);
      ctx.save();
      this.cineCamera(ctx, W, H, { x, y: eyeY, zoom: lerp(1.02, 1.08, ease(t / S.dur)), shake: 0.15 });
      const { u } = this.ptdHead(ctx, o.you, x, eyeY, 700, { flipX: true, rim: '#38bdf8', rimD: 3 });
      // olhos do próprio boneco, com a cara de quem não entendeu
      this.cineSpriteEyes(ctx, o.you, x, eyeY, u, { expr: 'sweat', eyeU: SPRITE_MAPY(10) });
      // gota de suor descendo na têmpora
      const dy = seg(t, 10, 50) * 40;
      ctx.fillStyle = '#bae6fd';
      ctx.strokeStyle = '#0c4a6e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const sx = x + 6.6 * u;
      const sy = eyeY - 3 * u + dy;
      ctx.moveTo(sx, sy - 22);
      ctx.quadraticCurveTo(sx + 16, sy + 6, sx, sy + 12);
      ctx.quadraticCurveTo(sx - 16, sy + 6, sx, sy - 22);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // "?" pulando do lado da cabeça
      [[W * 0.26, H * 0.3, 96, 10], [W * 0.17, H * 0.46, 66, 18], [W * 0.84, H * 0.26, 74, 24]].forEach(([qx, qy, sz, at], i) => {
        const k = seg(t, at, at + 8);
        if (k <= 0) return;
        this.ptdWord(ctx, '?', qx, qy - Math.sin(t * 0.12 + i) * 6, sz, '#f8fafc', k, 1, (i - 1) * 0.15);
      });
    },

    // PLANO 3 — página de mangá: a metade do rosto dele e a outra metade em engrenagens
    hgo2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const face = this.hgoFaceCv('manga', t);
      const k = ease(t / S.dur);
      const sc = Math.max(W / face.width, (bot - top) / face.height) * lerp(1.02, 1.08, k);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const sh = t < 20 ? (rnd(t, 7) - 0.5) * 4 : 0;
      ctx.drawImage(face, W / 2 - (face.width * sc) / 2 + sh, (top + bot) / 2 - (face.height * sc) / 2, face.width * sc, face.height * sc);
      ctx.restore();
      // linhas de impacto vindo da engrenagem do olho
      this.ptdRays(ctx, W / 2 + (104 + 34 - 120) * sc, (top + bot) / 2 + (70 - 67.5) * sc, W * 0.9, INK, 0.07, t * 0.003, 40);
      this.cineGlow(ctx, W / 2 + (104 + 34 - 120) * sc, (top + bot) / 2 + (70 - 67.5) * sc, 110, 'rgba(125,211,252,0.5)', seg(t, 20, 40));
      this.ptdSfx(S, 14, 'engrenagem', () => window.SFX?.click?.());
    },

    // PLANO 4 — a câmera entra no olho: a íris de engrenagem gira e ele entra no Fluxo
    hgo3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.hgoCast();
      const dive = 26;
      if (t < dive) {
        // mergulho até o olho dele (o mesmo rosto desenhado do plano 1)
        ctx.fillStyle = '#1a0820';
        ctx.fillRect(0, 0, W, H);
        const face = this.hgoFaceCv('color', t);
        const sc = 4.6 * lerp(1, 6, easeIn(t / dive));
        // o olho da esquerda (x = 128 - 21, y = 70 no desenho) vai para o meio da tela
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(face, W / 2 - 107 * sc, H / 2 - 70 * sc, face.width * sc, face.height * sc);
        ctx.restore();
        this.cineFlash(ctx, W, H, seg(t, dive - 6, dive), '#ffffff');
        return;
      }
      const u2 = t - dive;
      const open = ease(seg(u2, 0, 14));
      const eye = this.hgoEyeCv(u2, 0.25 + 0.75 * open);
      const scale = Math.max(W / eye.width, (bot - top) / eye.height) * lerp(1.12, 1.0, ease(seg(u2, 0, 40)));
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const dw = eye.width * scale;
      const dh = eye.height * scale;
      const shake = u2 < 12 ? (rnd(u2, 3) - 0.5) * 10 : 0;
      ctx.drawImage(eye, (W - dw) / 2 + shake, (top + bot) / 2 - dh / 2, dw, dh);
      ctx.restore();
      // o anel azul pulsando e faíscas rosa do Fluxo saindo do olho
      const pulse = 0.5 + 0.5 * Math.sin(u2 * 0.25);
      this.cineGlow(ctx, W / 2, (top + bot) / 2 - 3 * scale, 160 + 60 * pulse, 'rgba(125,211,252,0.45)', open);
      ctx.fillStyle = PINK;
      for (let i = 0; i < 22; i++) {
        const q = ((u2 * 0.02 + rnd(i, 2)) % 1);
        const a = rnd(i, 3) * TAU;
        const r = 120 + q * W * 0.5;
        ctx.globalAlpha = (1 - q) * open;
        ctx.fillRect(W / 2 + Math.cos(a) * r, (top + bot) / 2 + Math.sin(a) * r * 0.55, 6, 6);
      }
      ctx.globalAlpha = 1;
      if (u2 < 8) this.cineFlash(ctx, W, H, 1 - u2 / 8, '#ffffff');
      // o carimbo do Fluxo
      const sk = seg(u2, 30, 40);
      if (sk > 0) {
        this.ptdWord(ctx, 'FLUXO', W * 0.5, top + 92, 96, PINK, sk, 1, -0.05, W * 0.7);
        this.ptdChip(ctx, 'HUGO • A ENGRENAGEM DO SEGUNDO LUGAR', W * 0.5, bot - 50, ICE, seg(u2, 40, 54), { size: 17 });
      }
      this.ptdSfx(S, dive, 'olho', () => window.SFX?.kick?.(0.8));
      this.ptdSfx(S, dive + 30, 'fluxo', () => window.SFX?.jingle?.([392, 523, 784], 0, 'square'));
    }
  });

  const PLANES = [CE.hgo0, CE.hgo1, CE.hgo2, CE.hgo3];
  CE.registerCine('hugo_gears', {
    phases: [130, 90, 170, 150],
    letterbox: 0.1,
    grain: 0.05,
    music: 'dread',
    title: '⚙️ A ENGRENAGEM DO HUGO',
    tags: ['PLANO 1 • HUGO', 'PLANO 2 • POR QUÊ?', 'PLANO 3 • O MECANISMO', 'PLANO 4 • O OLHO'],
    subs: [
      [{ from: 8, who: 'HUGO', text: '"Aceite: um de nós dois vai ser o segundo melhor."', color: PINK }],
      [{ from: 6, who: 'VOCÊ', text: '"...Por quê??"', color: '#38bdf8' }],
      [{ from: 6, who: 'HUGO', text: '"Porque gente como a gente... não nasceu para ser o primeiro lugar."', color: PINK }],
      [{ from: 40, who: 'NARRADOR', text: 'As engrenagens giram. O Hugo entrou no Fluxo.', color: '#94a3b8' }]
    ],
    draw(ctx, S) {
      PLANES[S.phase].call(this, ctx, S);
      if (S.phase === 0 && S.t < 10) this.cineFlash(ctx, S.W, S.H, 1 - S.t / 10, '#000000');
    }
  });
})();
