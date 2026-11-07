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

    // PLANO 1 — o Hugo em close, sorrindo de canto
    hgo0(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.hgoCast();
      const eyeY = H * 0.44;
      this.ptdCloseBg(ctx, S, PINK, W * 0.42);
      this.ptdRays(ctx, W * 0.42, eyeY, W * 0.8, PINK, 0.16, t * 0.002, 36);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W * 0.42, y: eyeY, zoom: lerp(1, 1.07, ease(t / S.dur)), shake: 0.2 });
      const { u } = this.ptdHead(ctx, o.hugo, W * 0.42, eyeY, 700, { rim: PINK, rimD: 3 });
      this.ptdEyes(ctx, o.hugo, W * 0.42, eyeY, u, {});
      ctx.restore();
      this.ptdChip(ctx, 'HUGO • FRANÇA SUB-20', W * 0.78, top + 40, PINK, seg(t, 6, 18), { size: 16 });
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

    // PLANO 3 — metade do rosto do Hugo e, no lugar da outra metade, o mecanismo
    hgo2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.hgoCast();
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      const eyeY = H * 0.46;
      // o meio do rosto fica no corte: aparece exatamente a metade dele (com o olho)
      const hx = W * 0.47;
      const cutX = (y) => W * 0.47 + Math.sin(y * 0.045 + 1) * 14 + (rnd(Math.floor(y / 24), 9) - 0.5) * 18;
      // a metade do rosto (escurecida como página de mangá)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let y = 0; y <= H; y += 12) ctx.lineTo(cutX(y), y);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.clip();
      this.ptdRays(ctx, hx, eyeY, W, INK, 0.1, 0, 40);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: hx, y: eyeY, zoom: lerp(1, 1.05, ease(t / S.dur)), shake: 0.15 });
      const { u } = this.ptdHead(ctx, o.hugo, hx, eyeY, 1300, { dim: 0.22, dimTint: '15,23,42' });
      this.ptdEyes(ctx, o.hugo, hx, eyeY, u, {});
      ctx.restore();
      ctx.restore();
      // o mecanismo crescendo da borda pra direita
      const mk = ease(seg(t, 12, 70));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W, 0);
      for (let y = 0; y <= H; y += 12) ctx.lineTo(cutX(y) - 6, y);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      this.hgoMachine(ctx, W * 0.45, top, W * 0.55, bot - top, t, mk);
      ctx.restore();
      // a borda rasgada em tinta e a engrenagem "monóculo" no olho de lá
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let y = 0; y <= H; y += 12) y ? ctx.lineTo(cutX(y), y) : ctx.moveTo(cutX(y), y);
      ctx.stroke();
      const mono = ease(seg(t, 30, 50));
      if (mono > 0) {
        // no lugar do outro olho, uma engrenagem
        const mx = hx + 3.5 * (1300 / 36);
        this.cineGlow(ctx, mx, eyeY, 100, 'rgba(125,211,252,0.6)', mono);
        this.hgoGear(ctx, mx, eyeY, 52 * mono, 12, t * 0.04, { ring: ICE, spokes: 8 });
      }
      this.ptdSfx(S, 14, 'engrenagem', () => window.SFX?.click?.());
    },

    // PLANO 4 — a câmera entra no olho: a íris de engrenagem gira e ele entra no Fluxo
    hgo3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.hgoCast();
      const dive = 26;
      if (t < dive) {
        // mergulho até o olho dele
        const eyeY = H * 0.44;
        this.ptdCloseBg(ctx, S, PINK, W * 0.5);
        ctx.save();
        const z = lerp(1, 7, easeIn(t / dive));
        const { u } = { u: 900 / 36 };
        this.cineCamera(ctx, W, H, { x: W * 0.5 - 3.5 * u, y: eyeY, zoom: z, shake: 0 });
        const hd = this.ptdHead(ctx, o.hugo, W * 0.5, eyeY, 900, { rim: PINK, rimD: 3 });
        this.ptdEyes(ctx, o.hugo, W * 0.5, eyeY, hd.u, {});
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
