// ============================================================================
// FLUXO SECRETO COM CENA PRÓPRIA (cine_fluxos_e) — ver js/cine_fluxos_b.js e _d.js
//   flow_fl_mitico_olhar_ego • (segredo: 7 cliques no "BL") a sala dos monitores acende
//     com você em todas as telas e o Ego de costas na frente → os óculos do Ego em close,
//     os monitores refletidos → no campo, quem entra na zona trava e quem cai no seu
//     carrinho não levanta → o seu olhar dourado com os óculos dele atrás, SOB O OLHAR
// Usa a base da cine_fluxos_b (fxbCfg, fxbSpr, fxbHead, fxbArena, fxbTitle...) e
// helpers da cine_partida/cine_final/cine_rin. Helpers novos com o prefixo "fxe".
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas do boneco, um flash só por
// impacto, olhos de close = o olho do próprio boneco (cineSpriteEyes).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine || !CE.fxbCfg) return;

  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };

  const ID = 'fl_mitico_olhar_ego';
  const GOLD = '#eab308';
  const GOLD_L = '#fde047';
  const RIV_KIT = { jerseyPrimary: '#7f1d1d', jerseySecondary: '#fecaca' };

  Object.assign(CE, {
    fxeCast() {
      const c = this.fxbCfg(ID);
      if (this._fxeCastC && this._fxeCastC.c === c) return this._fxeCastC;
      this._fxeCastC = {
        c,
        ego: this.getSpeakerCharData('JINPACHI EGO'),
        r1: this.fxbMate('otoya', RIV_KIT),
        r2: this.fxbMate('gagamaru', RIV_KIT),
        r3: this.fxbMate('raichi', RIV_KIT)
      };
      return this._fxeCastC;
    },

    // Um monitor da parede: o gramado com você no meio, tingido de dourado, com scanlines
    fxeMonitor(ctx, x, y, w, h, i, on, you) {
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
      if (on <= 0) {
        ctx.fillStyle = '#04060c';
        ctx.fillRect(x, y, w, h);
        return;
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = '#166534';
      ctx.fillRect(x, y, w, h);
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = s % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
        ctx.fillRect(x + (s * w) / 6, y, w / 6 + 1, h);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * (0.15 + rnd(i, 9) * 0.6), y);
      ctx.lineTo(x + w * (0.15 + rnd(i, 9) * 0.6), y + h);
      ctx.stroke();
      const sx = x + w * (0.3 + rnd(i, 5) * 0.4);
      this.fxbShadow(ctx, sx, y + h * 0.9, 34, 0.35);
      this.fxbSpr(ctx, you, sx, y + h * 0.9, 84, { flipX: rnd(i, 7) < 0.5, rim: GOLD, rimD: 1 });
      ctx.fillStyle = `rgba(234,179,8,${0.2 * on})`;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 1);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 8, y + 8, 6, 6);
      ctx.restore();
      if (on < 1) {
        ctx.fillStyle = `rgba(254,243,199,${(1 - on) * 0.9})`;
        ctx.fillRect(x, y, w, h);
      }
    },

    // Os óculos do Ego (contorno), gigantes, atrás de tudo
    fxeGlasses(ctx, cx, cy, s, color, alpha) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(4, s * 0.05);
      const w = s * 1.1;
      const h = s * 0.62;
      [-1, 1].forEach((k) => {
        const x = cx + k * (s * 0.68) - w / 2;
        const y = cy - h / 2;
        const r = h * 0.3;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.13, cy - h * 0.15);
      ctx.quadraticCurveTo(cx, cy - h * 0.32, cx + s * 0.13, cy - h * 0.15);
      ctx.stroke();
      ctx.restore();
    },

    // PLANO 1 — a sala dos monitores acende: você em todas as telas, o Ego de costas
    fxeOlhar0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxeCast();
      const k = easeIO(t / S.dur);
      ctx.fillStyle = '#01030a';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: lerp(1, 1.1, k), shake: 0.3 });
      const cols = 6;
      const rows = 3;
      const mw = 182;
      const mh = 108;
      const gap = 16;
      const x0 = 640 - (cols * mw + (cols - 1) * gap) / 2;
      const y0 = top + 24;
      let lit = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const at = 4 + rnd(i, 3) * 44;
          const on = seg(t, at, at + 6);
          lit += on;
          this.fxeMonitor(ctx, x0 + c * (mw + gap), y0 + r * (mh + gap), mw, mh, i, on, o.c.you);
        }
      }
      // a luz dos monitores no chão e nas costas do Ego
      this.cineGlow(ctx, 640, y0 + 200, 620, 'rgba(234,179,8,0.32)', lit / (cols * rows));
      this.fxbSpr(ctx, o.ego, 640, bot + 170, 640, { facing: 'back', dim: 0.62, dimTint: '2,6,23', rim: GOLD, rimD: 2 });
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'SALA DE MONITORAMENTO • BLUE LOCK', seg(t, 6, 22), GOLD);
      this.fxbSfx(S, 6, 'monitores', () => window.SFX?.click?.());
    },

    // PLANO 2 — os óculos do Ego em close; depois, no campo, a zona do olhar
    fxeOlhar1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxeCast();
      const cut = 62;
      if (t < cut) {
        // close nos óculos: os monitores refletidos e um brilho atravessando as lentes
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, W, H);
        const eyeY = top + (bot - top) * 0.52;
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: eyeY, zoom: lerp(1, 1.08, t / cut), shake: 0.2 });
        const h = this.fxbHead(ctx, o.ego, 640, eyeY, 1500, { rim: GOLD, rimD: 3 });
        const u = h.u;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        [-1, 1].forEach((s) => {
          for (let j = 0; j < 6; j++) {
            const rx = 640 + s * 3.5 * u + (-1.4 + (j % 3) * 1.0) * u;
            const ry = eyeY - 0.55 * u + Math.floor(j / 3) * 0.75 * u;
            ctx.fillStyle = `rgba(234,179,8,${0.18 + 0.12 * rnd(j, s + 3)})`;
            ctx.fillRect(rx, ry, 0.8 * u, 0.55 * u);
          }
        });
        const gx = lerp(640 - 9 * u, 640 + 9 * u, seg(t, 18, 40));
        if (t > 16 && t < 44) {
          ctx.fillStyle = 'rgba(254,243,199,0.55)';
          ctx.beginPath();
          ctx.moveTo(gx - 0.6 * u, eyeY - 1.6 * u);
          ctx.lineTo(gx + 0.6 * u, eyeY - 1.6 * u);
          ctx.lineTo(gx - 0.4 * u, eyeY + 1.6 * u);
          ctx.lineTo(gx - 1.6 * u, eyeY + 1.6 * u);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'JINPACHI EGO', seg(t, 4, 18), GOLD);
        this.fxbSfx(S, 18, 'brilho', () => window.SFX?.click?.());
        return;
      }
      // no campo: os rivais entram na zona e travam; o carrinho; ele não levanta
      const u2 = t - cut;
      const feet = H * 0.8;
      const hit = 70;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: lerp(1.04, 1.12, easeIO(u2 / 118)), shake: u2 >= hit ? 0.5 + 6 * (1 - seg(u2, hit, hit + 14)) : 0.4 });
      this.fxbArena(ctx, S, u2 * 1.5);
      // a zona do olhar no chão (elipse tracejada que gira)
      const zk = ease(seg(u2, 0, 16));
      ctx.save();
      ctx.globalAlpha = 0.85 * zk;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 4;
      ctx.setLineDash([22, 14]);
      ctx.lineDashOffset = -u2 * 2;
      ctx.beginPath();
      ctx.ellipse(640, feet - 6, 300 * zk, 84 * zk, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(234,179,8,0.1)';
      ctx.fill();
      ctx.restore();
      // os rivais: correm normal até a borda da zona e lá travam (câmera lenta)
      const runner = (char, sx, ex, d0, side) => {
        const tz = 26;
        const xNorm = lerp(sx, ex, seg(u2, 0, tz));
        const slow = Math.max(0, u2 - tz) * 0.25;
        const x = u2 < tz ? xNorm : ex + side * -1 * Math.min(60, slow * 1.6);
        const fr = u2 < tz ? u2 * 0.9 : tz * 0.9 + (u2 - tz) * 0.15;
        return { char, x, fr, d0, inZone: u2 >= tz };
      };
      const riv = [runner(o.r1, -60, 360, 0, -1), runner(o.r2, 1340, 920, 0, 1)];
      riv.forEach((r) => {
        this.fxbShadow(ctx, r.x, feet, 70, 0.4);
        this.fxbSpr(ctx, r.char, r.x, feet, 270, { animState: 'run', frame: Math.floor(r.fr), flipX: r.x > 640, dim: r.inZone ? 0.25 : 0, dimTint: '60,45,10' });
        if (r.inZone) {
          // o peso do olhar: riscos dourados caindo em cima dele
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = GOLD_L;
          for (let j = 0; j < 7; j++) {
            const lx = r.x - 70 + rnd(j, r.x > 640 ? 5 : 2) * 140;
            const ly = feet - 300 + ((u2 * 6 + j * 47) % 260);
            ctx.fillRect(lx, ly, 3, 26);
          }
          ctx.restore();
          this.finKicker(ctx, r.x, feet - 290, 'LENTO', seg(u2, 26, 36), GOLD, 'center');
        }
      });
      // o da bola vem de frente; o carrinho; ele cai e não levanta
      const ax = u2 < hit ? lerp(1260, 760, seg(u2, 0, 28)) + (u2 > 28 ? -Math.min(30, (u2 - 28) * 0.6) : 0) : 760 + ease(seg(u2, hit, hit + 12)) * 40;
      const fall = ease(seg(u2, hit, hit + 12));
      this.fxbShadow(ctx, ax, feet + 20, 70 + fall * 60, 0.4);
      if (u2 < hit) this.fxbSpr(ctx, o.r3, ax, feet + 20, 290, { animState: 'run', frame: Math.floor(u2 < 28 ? u2 * 0.9 : 25 + (u2 - 28) * 0.15), flipX: true, dim: u2 > 28 ? 0.25 : 0, dimTint: '60,45,10' });
      else this.fxbSprRot(ctx, o.r3, ax, feet + 20 + (290 * 0.42 - 70) * fall, 290, (Math.PI / 2) * fall, { flipX: true, dim: 0.3, dimTint: '30,24,8' });
      // você: espera no meio da zona, o carrinho, levanta com a bola
      const slide = seg(u2, hit - 9, hit);
      const yx = u2 < hit - 9 ? 600 : u2 < hit + 6 ? lerp(600, 690, ease(slide)) : 690;
      this.fxbShadow(ctx, yx, feet, 70, 0.45);
      if (u2 >= hit - 9 && u2 < hit + 6) this.fxbSpr(ctx, o.c.you, yx, feet, 300, { animState: 'slide', rim: GOLD, rimD: 2 });
      else this.fxbSpr(ctx, o.c.you, yx, feet, 300, { rim: GOLD, rimD: 2, showAura: true, auraColor: GOLD });
      // a bola: no pé dele, sobe no desarme e cai no seu
      let bx;
      let by;
      if (u2 < hit) {
        bx = ax - 70;
        by = feet + 4 - Math.abs(Math.sin(u2 * 0.25)) * 20;
      } else {
        const bk = seg(u2, hit, hit + 14);
        bx = lerp(ax - 70, yx + 60, bk);
        by = feet + 4 - Math.sin(bk * Math.PI) * 110;
      }
      this.ptdBall(ctx, bx, by, 17, u2 * 0.5);
      if (u2 >= hit + 6) this.fxbSparks(ctx, ax + 50, feet, seg(u2, hit + 6, hit + 30), 12, [GOLD, GOLD_L, '#a16207'], 0.6, 5, -Math.PI / 2, Math.PI * 0.9, 150);
      ctx.restore();
      // ele fica no chão: o anel dourado contando o dobro
      const rk = seg(u2, hit + 16, hit + 28);
      if (rk > 0) {
        ctx.save();
        ctx.globalAlpha = rk;
        this.finKicker(ctx, ax + 30, feet - 190, 'NÃO LEVANTA', 1, GOLD, 'center');
        ctx.font = '900 44px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#020617';
        ctx.strokeText('x2', ax + 30, feet - 130);
        ctx.fillStyle = GOLD_L;
        ctx.fillText('x2', ax + 30, feet - 130);
        ctx.restore();
      }
      if (u2 >= hit && u2 < hit + 8) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(u2, hit, hit + 8)), '#fef3c7');
      this.fxbSfx(S, cut + hit, 'carrinho', () => window.SFX?.tackle?.());
    },

    // PLANO 3 — o seu olhar dourado, os óculos do Ego enormes atrás, o nome do Fluxo
    fxeOlhar2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxeCast();
      ctx.fillStyle = '#05040a';
      ctx.fillRect(0, 0, W, H);
      this.ptdRays(ctx, 640, top + 230, 900, GOLD, 0.16, t * 0.003, 40);
      this.fxeGlasses(ctx, 640, top + 220, 420, GOLD, 0.22 * ease(seg(t, 0, 20)));
      const eyeY = top + 238;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: eyeY, zoom: lerp(1.0, 1.06, t / S.dur), shake: 0.2 });
      const h = this.fxbHead(ctx, o.c.you, 640, eyeY, 900, { rim: GOLD, rimD: 3 });
      // o olho do Fluxo aceso em dourado (o olho do próprio boneco)
      this.cineSpriteEyes(ctx, o.c.you, 640, eyeY, h.u, { aura: GOLD, eyeU: SPRITE_MAPY(10) });
      ctx.restore();
      const up = ease(seg(t, 26, 38));
      if (up < 1) this.rincStamp(ctx, 'EU TE OBSERVO', W / 2, lerp(top + 120, top + 80, up), 74, GOLD_L, t, 4, 2, W * 0.8, 'center', 1 - up);
      this.fxbTitle(ctx, S, t - 34, { cfg: o.c, y: bot - 130, color: GOLD });
      this.fxbSfx(S, 4, 'olhar', () => window.SFX?.kick?.(0.6));
    }
  });

  // ==========================================================================
  // REGISTRO (mesmo esquema da cine_fluxos_b / _d)
  // ==========================================================================
  const SHARED = [
    function (g, S) {
      this.fxbGrain(g, S.W, S.H, 0.05);
    },
    function () {
      for (let i = 0; i < 4; i++) this.ptdBallCv(i);
    },
    function (g) {
      this.ptdRays(g, 0, 0, 1, GOLD, 0.01, 0, 40);
    }
  ];
  const plan = (fns) =>
    function (ctx, S) {
      this.sakugaW = S.W;
      if (S.phase === 0 && S.t < 1) {
        this.fxbWarm(fns, S, SHARED);
        return;
      }
      fns[S.phase].call(this, ctx, S);
      this.fxbGrain(ctx, S.W, S.H, 0.05);
      if (S.phase === 0 && S.t < 10) this.cineFlash(ctx, S.W, S.H, 1 - (S.t - 1) / 9, '#000000');
      this.fxbWarm(fns, S, SHARED);
    };
  const def = {
    letterbox: 0.1,
    grain: 0,
    music: 'dread',
    icon: '👁️',
    label: 'O OLHAR DO EGO',
    phases: [90, 180, 95],
    tags: ['PLANO 1 • AS CÂMERAS', 'PLANO 2 • O OLHAR', 'PLANO 3 • SOB O OLHAR'],
    subs: [
      [{ from: 22, who: 'JINPACHI EGO', text: '"Eu vejo tudo."', color: GOLD }],
      [{ from: 4, who: 'JINPACHI EGO', text: '"Quem chegar perto de você... vai sentir o peso do meu olhar."', color: GOLD }],
      []
    ],
    draw: plan([CE.fxeOlhar0, CE.fxeOlhar1, CE.fxeOlhar2])
  };
  Object.defineProperty(def, 'title', {
    enumerable: true,
    get() {
      return `${def.icon} ${def.label} • ${CE.fxbCfg(ID).youName}`;
    }
  });
  CE.registerCine(`flow_${ID}`, def);
})();
