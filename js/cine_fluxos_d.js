// ============================================================================
// FLUXOS COM CENA PRÓPRIA (cine_fluxos_d) — ver js/cine_kit.js e js/cine_fluxos_b.js
// Cada Fluxo abaixo tem a sua ativação (3 planos, ~6 s) tocada pelo [G] no meio da partida
// (CutsceneEngine.playFlowCutscene registra this.flowCfg = { flow, you, youName }):
//   flow_fl_mitico_lorenzo • o desarme no ás, a mandíbula de dentes de ouro morde a carta, DEVORAR
//   flow_fl_mitico_sae     • a barra do Fluxo zera, o anel volta 60% num clique, SEM PAUSA
//   flow_fl_wc_noa         • o campo vira número, só sobra uma trajetória, o chute 100%
// Usa a base da cine_fluxos_b (fxbCfg, fxbSpr, fxbWarm, fxbTitle...) e helpers da
// cine_partida/cine_final/cine_rin (ptdEyes, ptdRays, ptdBall, finKicker, rincStamp).
// Helpers novos no CutsceneEngine com o prefixo "fxd".
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas do boneco, sem tela piscando
// (um flash só por impacto), olhos de close em pixel art, frame 0 = piscada (não usar).
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
  const easeIn = (x) => clamp(x) * clamp(x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const mod = (a, n) => ((a % n) + n) % n;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (m) return [1, 2, 3].map((i) => parseInt(m[i], 16));
    return [0, 245, 212];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;
  const num = (v, d = 1) => v.toFixed(d).replace('.', ',');

  const KIT_RIVAL = { jerseyPrimary: '#7f1d1d', jerseySecondary: '#f8fafc' };
  const KIT_GK = { jerseyPrimary: '#1f2937', jerseySecondary: '#facc15' };
  const RUN = [3, 7, 11, 15];
  const runF = (t, sp = 4) => RUN[Math.floor(t / sp) % RUN.length];

  // ==========================================================================
  // HELPERS COMUNS (prefixo fxd)
  // ==========================================================================
  Object.assign(CE, {
    // Barra do Fluxo em segmentos. k 0..1; o.extra 0..1 acende o.extraN segmentos além do fim
    fxdBar(ctx, x, y, w, h, k, color, o = {}) {
      const n = o.n || 20;
      const gap = 3;
      const sw = (w - gap * (n - 1)) / n;
      const exN = o.extraN || 0;
      const ex = clamp(o.extra || 0);
      ctx.save();
      ctx.globalAlpha *= o.alpha ?? 1;
      const exW = exN && ex > 0 ? ease(ex) * (exN * (sw + gap) + 10) : 0;
      ctx.fillStyle = 'rgba(2,6,23,0.88)';
      ctx.fillRect(x - 8, y - 8, w + 16 + exW, h + 16);
      ctx.strokeStyle = o.frame || 'rgba(226,232,240,0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
      const on = clamp(k) * n;
      for (let i = 0; i < n; i++) {
        const sx = x + i * (sw + gap);
        ctx.fillStyle = 'rgba(148,163,184,0.16)';
        ctx.fillRect(sx, y, sw, h);
        const f = clamp(on - i);
        if (f > 0) {
          ctx.fillStyle = color;
          ctx.fillRect(sx, y, Math.ceil(sw * f), h);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(sx, y, Math.ceil(sw * f), Math.max(2, Math.round(h * 0.2)));
        }
      }
      if (exW > 0) {
        const x2 = x + w + 10;
        ctx.strokeStyle = o.extraColor || color;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x + w + 5, y - 5, exW, h + 10);
        ctx.setLineDash([]);
        const on2 = ex * exN;
        for (let i = 0; i < exN; i++) {
          const f = clamp(on2 - i);
          if (f <= 0) break;
          ctx.fillStyle = o.extraColor || color;
          ctx.fillRect(x2 + i * (sw + gap), y, Math.ceil(sw * f), h);
        }
      }
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(2,6,23,0.9)';
      if (o.label) {
        ctx.textAlign = 'left';
        ctx.strokeText(o.label, x - 4, y - 12);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(o.label, x - 4, y - 12);
      }
      if (o.value) {
        ctx.textAlign = 'right';
        ctx.strokeText(o.value, x + w + 4 + exW, y - 12);
        ctx.fillStyle = o.valueColor || color;
        ctx.fillText(o.value, x + w + 4 + exW, y - 12);
      }
      ctx.restore();
    },
    // Anel medidor em segmentos (começa no alto e anda no sentido do relógio)
    fxdRing(ctx, cx, cy, R, k, color, o = {}) {
      const n = o.n || 20;
      const lw = o.lw || R * 0.14;
      const a0 = -Math.PI / 2;
      const step = TAU / n;
      const gp = o.gapA ?? 0.05;
      const on = clamp(k) * n;
      ctx.save();
      ctx.globalAlpha *= o.alpha ?? 1;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(2,6,23,0.88)';
      ctx.lineWidth = lw + 8;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = lw;
      ctx.strokeStyle = o.off || 'rgba(148,163,184,0.2)';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (on - i >= 1) continue;
        const a = a0 + i * step + gp;
        ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.arc(cx, cy, R, a, a0 + (i + 1) * step - gp);
      }
      ctx.stroke();
      if (on > 0) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const f = clamp(on - i);
          if (f <= 0) break;
          const a = a0 + i * step + gp;
          ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          ctx.arc(cx, cy, R, a, a + (step - 2 * gp) * f);
        }
        ctx.stroke();
        // fio claro por dentro (brilho)
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = Math.max(2, lw * 0.18);
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const f = clamp(on - i);
          if (f <= 0) break;
          const a = a0 + i * step + gp;
          const r2 = R - lw * 0.32;
          ctx.moveTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
          ctx.arc(cx, cy, r2, a, a + (step - 2 * gp) * f);
        }
        ctx.stroke();
      }
      // marcas de fora
      if (o.ticks !== false) {
        ctx.strokeStyle = o.tickColor || 'rgba(226,232,240,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = a0 + i * step;
          const r1 = R + lw / 2 + 6;
          const r2 = r1 + (i % 5 ? 6 : 14);
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        }
        ctx.stroke();
      }
      // a cabeça acesa na ponta do que está cheio
      if (o.head && on > 0 && on < n) {
        const a = a0 + (on / n) * TAU;
        this.cineGlow(ctx, cx + Math.cos(a) * R, cy + Math.sin(a) * R, lw * 2.4, rgba(color, 0.9));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + Math.cos(a) * R - 3, cy + Math.sin(a) * R - 3, 6, 6);
      }
      ctx.restore();
    },
    // Neblina rasteira (brilhos achatados que andam devagar)
    fxdFog(ctx, x0, x1, y, t, color, n = 9, seed = 1, r = 200, alpha = 1) {
      const span = x1 - x0 + r * 2;
      for (let i = 0; i < n; i++) {
        const x = x0 - r + mod(rnd(i, seed) * span + t * (0.4 + rnd(i, seed + 1) * 0.8), span);
        const yy = y + (rnd(i, seed + 2) - 0.5) * r * 0.5;
        ctx.save();
        ctx.translate(x, yy);
        ctx.scale(1, 0.3);
        this.cineGlow(ctx, 0, 0, r * (0.7 + rnd(i, seed + 3) * 0.6), color, alpha);
        ctx.restore();
      }
    },
    // Linha tracejada com rótulo no meio (medidas)
    fxdMeasure(ctx, x0, y0, x1, y1, label, color, k = 1, t = 0) {
      if (k <= 0) return;
      const xe = lerp(x0, x1, ease(k));
      const ye = lerp(y0, y1, ease(k));
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -t * 0.8;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(xe, ye);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.fillRect(x0 - 3, y0 - 3, 6, 6);
      ctx.fillRect(xe - 3, ye - 3, 6, 6);
      ctx.restore();
      if (label && k >= 1) this.fxdTag(ctx, (x0 + x1) / 2, (y0 + y1) / 2, label, color);
    },
    // Etiqueta pequena de medida (caixinha escura com o número)
    fxdTag(ctx, x, y, label, color) {
      ctx.save();
      ctx.font = '900 15px monospace';
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = 'rgba(2,6,23,0.9)';
      ctx.fillRect(x - tw / 2, y - 11, tw, 22);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - tw / 2, y - 11, tw, 22);
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 1);
      ctx.restore();
    },
    // Bloco de leitura em monoespaçada (linhas que se digitam)
    fxdReadout(ctx, x, y, lines, k, color, align = 'left', fs = 15) {
      if (k <= 0) return;
      ctx.save();
      ctx.font = `900 ${fs}px monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = align;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(2,6,23,0.9)';
      lines.forEach((ln, i) => {
        const kk = clamp(k * lines.length - i);
        if (kk <= 0) return;
        const s = this.cineType(ln[0], kk);
        ctx.strokeText(s, x, y + i * (fs + 9));
        ctx.fillStyle = ln[1] || color;
        ctx.fillText(s, x, y + i * (fs + 9));
      });
      ctx.restore();
    }
  });

  // ==========================================================================
  // 1. DEVORADOR DE ÁS (Don Lorenzo) — o desarme, a mordida, DEVORAR
  // ==========================================================================
  const LOR_C = '#a3a3a3';
  const LOR_GOLD = '#facc15';
  const LOR_PUR = '#7c3aed';
  const ACE_W = 31;
  const ACE_H = 43;
  const SPADE = ['.....#.....', '....###....', '...#####...', '..#######..', '.#########.', '###########', '###########', '.####.####.', '.....#.....', '....###....', '...#####...'];
  const LETTER_A = ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'];

  Object.assign(CE, {
    fxdLorCast() {
      const c = this.fxbCfg('fl_mitico_lorenzo');
      return { c, lor: this.cineChar('lorenzo'), ace: this.fxbMate('charles', KIT_RIVAL) };
    },
    // A carta ÁS de espadas em pixel art (31 x 43), com o filete dourado
    fxdAceCv() {
      return this.fxbBg('fxdAce', ACE_W, ACE_H, (g) => {
        g.fillStyle = '#0b0b0f';
        g.fillRect(1, 0, ACE_W - 2, ACE_H);
        g.fillRect(0, 1, ACE_W, ACE_H - 2);
        g.fillStyle = '#f5f5f4';
        g.fillRect(2, 1, ACE_W - 4, ACE_H - 2);
        g.fillRect(1, 2, ACE_W - 2, ACE_H - 4);
        g.fillStyle = '#d6d3d1';
        g.fillRect(2, ACE_H - 4, ACE_W - 4, 2);
        g.fillRect(ACE_W - 4, 2, 2, ACE_H - 4);
        g.fillStyle = LOR_GOLD;
        g.fillRect(3, 3, ACE_W - 6, 1);
        g.fillRect(3, ACE_H - 4, ACE_W - 6, 1);
        g.fillRect(3, 3, 1, ACE_H - 6);
        g.fillRect(ACE_W - 4, 3, 1, ACE_H - 6);
        g.fillStyle = '#0b0b0f';
        LETTER_A.forEach((row, y) =>
          row.split('').forEach((ch, x) => {
            if (ch !== '#') return;
            g.fillRect(5 + x, 5 + y, 1, 1);
            g.fillRect(ACE_W - 6 - x, ACE_H - 6 - y, 1, 1);
          })
        );
        SPADE.forEach((row, y) =>
          row.split('').forEach((ch, x) => {
            if (ch !== '#') return;
            g.fillStyle = '#0b0b0f';
            g.fillRect(10 + x, 16 + y, 1, 1);
          })
        );
        g.fillStyle = '#52525b';
        g.fillRect(13, 21, 1, 2);
      });
    },
    fxdAce(ctx, x, y, h, rot = 0, alpha = 1) {
      const cv = this.fxdAceCv();
      if (cv.width < 2) return;
      const s = h / ACE_H;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(cv, (-ACE_W * s) / 2, -h / 2, ACE_W * s, h);
      ctx.restore();
    },
    // A carta em pedaços voando de (x, y) até (tx, ty); k 0..1
    fxdAcePieces(ctx, x, y, h, k, tx, ty, seed = 1) {
      if (k <= 0 || k >= 1) return;
      const cv = this.fxdAceCv();
      if (cv.width < 2) return;
      const s = h / ACE_H;
      const cols = 5;
      const rows = 7;
      const cw = ACE_W / cols;
      const rh = ACE_H / rows;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const d = rnd(i, seed) * 0.45;
          const kk = clamp((k - d) / 0.55);
          if (kk <= 0 || kk >= 1) continue;
          const sx = x + (c * cw - ACE_W / 2) * s * 0.4;
          const sy = y + (r * rh - ACE_H / 2) * s * 0.25;
          const e = easeIO(kk);
          const lift = Math.sin(kk * Math.PI) * (60 + rnd(i, seed + 1) * 140) * (rnd(i, seed + 2) < 0.5 ? -1 : 1);
          const px = lerp(sx, tx, e);
          const py = lerp(sy, ty, e) + lift;
          const sc = s * lerp(0.9, 0.25, e);
          ctx.globalAlpha = 1 - easeIn(seg(kk, 0.7, 1));
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate((kk * 6 + i) * (i % 2 ? 1 : -1));
          ctx.drawImage(cv, c * cw, r * rh, cw, rh, (-cw * sc) / 2, (-rh * sc) / 2, cw * sc, rh * sc);
          ctx.restore();
        }
      }
      ctx.restore();
    },
    // O fundo escuro da boca aberta (desenhar antes do que estiver dentro dela)
    fxdJawThroat(ctx, cx, cy, w, gap, th, alpha = 0.9) {
      if (gap <= 0) return;
      const span = w / 2 + 50;
      const pts = [];
      const lo = [];
      for (let j = 0; j <= 26; j++) {
        const x = cx - span + (2 * span * j) / 26;
        const c = Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / span, 2)));
        pts.push([x, cy - (gap / 2) * c - th * 0.5]);
        lo.push([x, cy + (gap / 2) * c + th * 0.5]);
      }
      ctx.save();
      ctx.globalAlpha *= alpha;
      poly(ctx, pts.concat(lo.reverse()));
      ctx.fillStyle = '#0a0410';
      ctx.fill();
      ctx.restore();
    },
    // A mandíbula de zumbi com dentes de ouro, em forma de boca (lente): no meio as pontas ficam a
    // gap/2 do centro (cy), nos cantos a boca fecha. gap negativo = dentes cruzados (mordida)
    fxdJaw(ctx, cx, cy, w, gap, o = {}) {
      const n = o.n || 8;
      const tw = w / n;
      const th = o.th || tw * 1.3;
      const gh = o.gh || 220;
      const gold = o.gold || [1, 4, 6];
      const goldLo = o.goldLo || [2, 5];
      const bone = o.bone || '#e7e5d8';
      const half = gap / 2;
      const span = w / 2 + 50;
      const curve = (x) => Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / span, 2)));
      const tipAt = (x, side) => cy + side * half * curve(x);
      ctx.save();
      ctx.globalAlpha *= o.alpha ?? 1;
      ctx.lineJoin = 'round';
      // gengivas (com o lábio cinza por fora)
      [-1, 1].forEach((side) => {
        const pts = [];
        const outer = [];
        const steps = 26;
        for (let j = 0; j <= steps; j++) {
          const x = cx - span + (2 * span * j) / steps;
          const c = curve(x);
          pts.push([x, tipAt(x, side) + side * th * 0.45]);
          outer.push([x, tipAt(x, side) + side * (th + gh * (0.3 + 0.7 * c))]);
        }
        poly(ctx, pts.concat(outer.reverse()));
        ctx.fillStyle = o.gum || '#2e1065';
        ctx.fill();
        ctx.beginPath();
        outer.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.strokeStyle = '#0b0b0f';
        ctx.lineWidth = 26;
        ctx.stroke();
        ctx.strokeStyle = o.lip || '#52525b';
        ctx.lineWidth = 16;
        ctx.stroke();
      });
      // dentes: os de baixo deslocados meio dente (encaixam quando a boca fecha)
      [1, -1].forEach((side) => {
        const off = side > 0 ? tw / 2 : 0;
        const cnt = side > 0 ? n - 1 : n;
        for (let i = 0; i < cnt; i++) {
          const x0 = cx - w / 2 + off + i * tw;
          const tip = tipAt(x0 + tw / 2, side);
          const root = tip + side * th;
          const isGold = (side < 0 ? gold : goldLo).includes(i);
          poly(ctx, [
            [x0 + 3, root],
            [x0 + tw - 3, root],
            [x0 + tw - 3, root - side * th * 0.55],
            [x0 + tw / 2, tip],
            [x0 + 3, root - side * th * 0.55]
          ]);
          ctx.fillStyle = isGold ? LOR_GOLD : bone;
          ctx.fill();
          ctx.strokeStyle = '#0b0b0f';
          ctx.lineWidth = 4;
          ctx.stroke();
          // brilho e sombra em blocos (pixel)
          ctx.fillStyle = isGold ? '#fef9c3' : '#ffffff';
          ctx.fillRect(x0 + 9, side < 0 ? root + 6 : root - 6 - th * 0.35, 6, th * 0.35);
          ctx.fillStyle = isGold ? '#a16207' : '#a8a29e';
          ctx.fillRect(x0 + tw - 12, side < 0 ? root + 4 : root - 4 - th * 0.45, 5, th * 0.45);
        }
      });
      ctx.restore();
    },

    // PLANO 1 — o ás vem driblando; o carrinho; ele fica no chão
    fxdLor0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxdLorCast();
      const feet = H * 0.86;
      const hit = 44;
      const camK = easeIO(seg(t, hit, 85));
      const cam = { x: lerp(640, 700, camK), y: lerp(360, 410, camK), zoom: lerp(1, 1.15, camK), shake: t >= hit ? 0.6 + 8 * (1 - seg(t, hit, hit + 16)) : 0.7 };
      // o ás correndo da direita (depois, caído para trás)
      const ax = t < hit ? lerp(1240, 780, t / hit) : 780 + ease(seg(t, hit, hit + 12)) * 50;
      const fall = ease(seg(t, hit, hit + 12));
      // você: espera agachado, o carrinho, levanta com a bola
      const slide = seg(t, hit - 9, hit);
      const yx = t < hit - 9 ? 360 : t < hit + 6 ? lerp(360, 640, ease(slide)) : 640;
      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      this.fxbArena(ctx, S, Math.min(t, hit) * 3);
      this.fxdFog(ctx, -100, W + 100, feet - 40, t, 'rgba(163,163,163,0.35)', 8, 3, 240);
      this.fxbShadow(ctx, ax, feet, 70 + fall * 60, 0.4);
      if (t < hit) {
        this.fxbSpr(ctx, o.ace, ax, feet, 310, { animState: 'run', frame: runF(t, 3), flipX: true });
      } else {
        // cai de costas (gira em volta do meio do corpo e desce até o chão)
        this.fxbSprRot(ctx, o.ace, ax, feet + (310 * 0.42 - 70) * fall, 310, (Math.PI / 2) * fall, { flipX: true, dim: 0.2, dimTint: '30,30,36' });
      }
      ctx.restore();
      // o mundo do zumbi é cinza (você continua com cor, por cima)
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = 'rgba(128,128,128,0.8)';
      ctx.fillRect(0, top, W, bot - top);
      ctx.restore();
      ctx.fillStyle = 'rgba(24,16,36,0.28)';
      ctx.fillRect(0, top, W, bot - top);
      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      this.fxbShadow(ctx, yx, feet, 70, 0.45);
      if (t >= hit - 9 && t < hit + 6) this.fxbSpr(ctx, o.c.you, yx, feet, 300, { animState: 'slide', rim: LOR_C, rimD: 2 });
      else this.fxbSpr(ctx, o.c.you, yx, feet, 300, { rim: t < hit ? LOR_C : LOR_GOLD, rimD: 2, showAura: t >= hit + 6, auraColor: LOR_C });
      // a bola: no pé do ás, sobe no desarme e cai no seu pé
      let bx;
      let by;
      if (t < hit) {
        bx = ax - 80;
        by = feet - 16 - Math.abs(Math.sin(t * 0.25)) * 24;
      } else {
        const k = seg(t, hit, hit + 14);
        bx = lerp(ax - 80, 712, k);
        by = lerp(feet - 16, feet - 16, k) - Math.sin(k * Math.PI) * 120;
      }
      this.ptdBall(ctx, bx, by, 17, t * 0.5);
      // poeira do tombo
      if (t >= hit + 8) this.fxbSparks(ctx, ax + 60, feet - 10, seg(t, hit + 8, hit + 34), 14, ['#a3a3a3', '#d4d4d4', '#737373'], 0.6, 5, -Math.PI / 2, Math.PI * 0.9, 160);
      // a fumaça cinza no chão, na frente de todo mundo
      this.fxdFog(ctx, -100, W + 100, feet + 10, t + 50, 'rgba(163,163,163,0.3)', 6, 9, 200);
      // 3 s no chão: o anel em cima dele
      const rk = seg(t, hit + 18, hit + 30);
      if (rk > 0) {
        const rx = ax + 40;
        const ry = feet - 150;
        ctx.save();
        ctx.globalAlpha = rk;
        this.fxdRing(ctx, rx, ry, 34, 1 - seg(t, hit + 30, 120) * 0.33, LOR_GOLD, { n: 3, lw: 10, gapA: 0.12, ticks: false });
        ctx.font = '900 30px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#020617';
        ctx.strokeText('3', rx, ry + 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('3', rx, ry + 2);
        ctx.restore();
      }
      ctx.restore();
      if (rk > 0) this.ptdChip(ctx, 'NO CHÃO • 3 S', W * 0.73, top + 120, LOR_GOLD, rk, { size: 16 });
      if (t >= hit) {
        this.ptdWord(ctx, 'DESARMADO!', W * 0.36, top + 110, 64, LOR_GOLD, seg(t, hit, hit + 8), 1 - seg(t, 70, 82), -0.06);
        this.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, hit, hit + 8)), '#e5e5e5');
      }
      this.finKicker(ctx, 40, top + 34, t < hit ? 'O ÁS DELES VEM DRIBLANDO' : 'O ÁS VIROU COMIDA', 1, t < hit ? LOR_C : LOR_GOLD);
      this.fxbSfx(S, hit, 'tackle', () => window.SFX?.tackle?.());
    },

    // PLANO 2 — a mandíbula de dentes de ouro morde a carta; a energia vem para você
    fxdLor1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxdLorCast();
      const chomp = 74;
      const jx = 450;
      const jy = (top + bot) / 2 + 6;
      const yx = 1010;
      const yFeet = bot - 22;
      const isHit = t >= chomp;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#09090b'], [0.55, '#1a1024'], [1, '#09090b']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02 + easeIO(t / 185) * 0.05, shake: 0.6 + (isHit ? 10 * (1 - seg(t, chomp, chomp + 22)) : 0) });
      this.ptdRays(ctx, jx, jy, 760, LOR_C, 0.07 + (isHit ? 0.08 * (1 - seg(t, chomp, chomp + 40)) : 0), t * 0.002, 40);
      this.fxdFog(ctx, -100, W + 100, bot - 30, t, 'rgba(124,58,237,0.3)', 7, 4, 260);
      // abertura da boca: entra de fora da tela, abre devagar, fecha de uma vez
      let gap;
      if (t < 30) gap = lerp(900, 520, ease(seg(t, 0, 30)));
      else if (t < chomp - 10) gap = 520 + Math.sin((t - 30) * 0.08) * 16 + seg(t, 30, chomp - 10) * 60;
      else if (t < chomp) gap = lerp(580, -42, easeIn(seg(t, chomp - 10, chomp)));
      else gap = -42 + Math.abs(Math.sin((t - chomp) * 0.09)) * 30 * seg(t, chomp + 16, chomp + 40);
      // a carta: flutua no meio, treme quando a boca abre
      this.fxdJawThroat(ctx, jx, jy, 500, gap, 81, 0.85);
      if (t < chomp) {
        const sh = seg(t, chomp - 24, chomp) * 4;
        this.cineGlow(ctx, jx, jy, 220, 'rgba(250,204,21,0.25)');
        this.fxdAce(ctx, jx + Math.sin(t * 1.7) * sh, jy + Math.sin(t * 0.06) * 8, 240, Math.sin(t * 0.05) * 0.12);
      }
      this.fxdJaw(ctx, jx, jy, 500, gap, { gh: 260 });
      // depois da mordida: pedaços da carta e a energia indo para você
      if (isHit) {
        this.fxdAcePieces(ctx, jx + 40, jy, 240, seg(t, chomp + 6, chomp + 70), yx, yFeet - 170, 3);
        this.fxdAcePieces(ctx, jx - 40, jy, 240, seg(t, chomp + 18, chomp + 84), yx, yFeet - 150, 8);
        this.fxbSparks(ctx, jx, jy, seg(t, chomp, chomp + 26), 18, [LOR_GOLD, '#fef9c3', LOR_C], 1.1, 6);
      }
      // você, absorvendo
      const absorb = seg(t, chomp + 40, chomp + 80);
      this.cineGlow(ctx, yx, yFeet - 160, 240, 'rgba(163,163,163,0.35)', 0.4 + absorb * 0.6);
      this.fxbShadow(ctx, yx, yFeet, 80, 0.5);
      this.fxbSpr(ctx, o.c.you, yx, yFeet, 340, { rim: absorb > 0 ? LOR_GOLD : LOR_C, rimD: 2, showAura: absorb > 0, auraColor: LOR_C });
      ctx.restore();
      if (isHit) {
        this.ptdWord(ctx, 'NHAC!', jx + 250, top + 130, 96, LOR_GOLD, seg(t, chomp, chomp + 8), 1 - seg(t, chomp + 36, chomp + 50), -0.08);
        this.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, chomp, chomp + 8)), '#f5f5f4');
      }
      // a barra do Fluxo passa do fim
      const bk = seg(t, 6, 24);
      const ex = seg(t, chomp + 50, chomp + 90);
      this.fxdBar(ctx, 40, top + 84, 300, 16, 1, LOR_C, {
        alpha: bk,
        n: 15,
        label: 'FLUXO',
        value: ex > 0 ? '+ TEMPO' : '100%',
        valueColor: ex > 0 ? LOR_GOLD : '#e2e8f0',
        extra: ex,
        extraN: 5,
        extraColor: LOR_GOLD
      });
      if (ex >= 1) this.ptdChip(ctx, 'O FLUXO DURA MAIS', 40, top + 140, LOR_GOLD, seg(t, chomp + 90, chomp + 102), { left: true, size: 15 });
      // painel: o sorriso de ouro do Don Lorenzo
      const pk = ease(seg(t, 104, 120));
      if (pk > 0) {
        const pts = [[W - 450, top + 14], [W - 16, top + 14], [W - 16, top + 168], [W - 430, top + 184]];
        this.ptdPanel(ctx, pts, () => {
          ctx.fillStyle = '#140b1c';
          ctx.fillRect(W - 460, top, 460, 200);
          this.ptdRays(ctx, W - 230, top + 100, 420, LOR_PUR, 0.3, t * 0.004, 40);
          const dw = 440;
          const U = this.fxbFaceCrop(ctx, o.lor, W - 233 - dw / 2, top + 4, dw, 4, 5.2, 28, 11, { ring: '#a78bfa', iris: '#3b0764' });
          this.cineGlow(ctx, W - 233, top + 4 + (12.8 - 5.2) * U, 70, 'rgba(250,204,21,0.5)', 0.6 + 0.4 * Math.sin(t * 0.2));
          this.finKicker(ctx, W - 40, top + 160, 'DON LORENZO', seg(t, 116, 134), LOR_GOLD, 'right');
        }, { dx: (1 - pk) * 480 });
      }
      this.finKicker(ctx, 40, top + 34, t < chomp ? 'A FOME DO ZUMBI' : 'DEVORADO', seg(t, 4, 30), isHit ? LOR_GOLD : LOR_C);
      this.fxbSfx(S, chomp, 'chomp', () => window.SFX?.tackle?.());
      this.fxbSfx(S, chomp + 50, 'mais', () => window.SFX?.jingle?.([392, 523, 659], 0, 'square'));
    },

    // PLANO 3 — a boca gigante atrás de você, DEVORAR
    fxdLor2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxdLorCast();
      const hit = 14;
      const isHit = t >= hit;
      const cx = W / 2;
      const jy = top + 290;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#0c0a10'], [0.6, '#1c1226'], [1, '#09090b']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.0 + easeIO(t / 90) * 0.05, shake: 0.5 + (isHit ? 8 * (1 - seg(t, hit, hit + 22)) : 0) });
      this.ptdRays(ctx, cx, jy, 900, LOR_PUR, 0.14, -t * 0.003, 40);
      // a mandíbula atrás (fecha um pouco na batida)
      const gap = t < hit ? lerp(700, 420, easeIn(seg(t, 0, hit))) : lerp(420, 460, ease(seg(t, hit, hit + 30)));
      this.fxdJawThroat(ctx, cx, jy, 1000, gap, 100, 0.7);
      this.fxdJaw(ctx, cx, jy, 1000, gap, { n: 10, th: 100, gh: 260, gold: [2, 5, 7], goldLo: [3, 6], gum: '#1e0b3a', alpha: 0.95 });
      this.cineGlow(ctx, cx, bot - 150, 300, 'rgba(163,163,163,0.4)');
      this.fxdFog(ctx, -100, W + 100, bot - 10, t, 'rgba(163,163,163,0.35)', 8, 6, 240);
      this.fxbShadow(ctx, cx, bot - 8, 90, 0.5);
      this.fxbSpr(ctx, o.c.you, cx, bot - 8, 340, { rim: LOR_GOLD, rimD: 3, showAura: true, auraColor: LOR_C });
      ctx.restore();
      if (isHit) this.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, hit, hit + 9)), '#f5f5f4');
      const up = ease(seg(t, 40, 54));
      if (up < 1) this.rincStamp(ctx, 'DEVORAR', W / 2, lerp(top + 205, top + 165, up), 104, LOR_GOLD, t, hit, 2, W * 0.9, 'center', 1 - up);
      this.fxbTitle(ctx, S, t - 46, { cfg: o.c, y: bot - 130, color: LOR_C });
      this.fxbSfx(S, hit, 'lor', () => window.SFX?.jingle?.([196, 233, 294, 392], 0, 'sawtooth'));
    }
  });

  // ==========================================================================
  // 2. GÊNIO SEM PAUSA (Sae) — a barra zera e volta 60% num clique
  // ==========================================================================
  const SAE_C = '#be123c';
  const SAE_TEAL = '#5eead4';

  Object.assign(CE, {
    fxdSaeCast() {
      const c = this.fxbCfg('fl_mitico_sae');
      return { c, sae: this.cineChar('sae'), r1: this.fxbMate('ness', KIT_RIVAL), r2: this.fxbMate('aiku', KIT_RIVAL) };
    },
    // A geometria fria do Sae: nós que se ligam em linhas retas finas (passes perfeitos)
    fxdSaeGeo(ctx, cx, cy, R, t, alpha = 1, seed = 2) {
      const n = 9;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = rnd(i, seed) * TAU + t * 0.002 * (i % 2 ? 1 : -1);
        const r = R * (0.3 + rnd(i, seed + 1) * 0.7);
        pts.push([cx + Math.cos(a) * r * 1.5, cy + Math.sin(a) * r * 0.8]);
      }
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.strokeStyle = 'rgba(94,234,212,0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[(i * 4 + 3) % n];
        const c = pts[(i + 1) % n];
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(c[0], c[1]);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(226,232,240,0.7)';
      pts.forEach(([x, y]) => ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6));
      ctx.restore();
    },

    // PLANO 1 — correndo em Fluxo... a barra esvazia, a cor some
    fxdSae0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxdSaeCast();
      const feet = H * 0.86;
      const end = 52;
      const k = 1 - seg(t, 6, end);
      const off = seg(t, end, end + 10);
      const v = 1 - ease(seg(t, end - 6, end + 14));
      const pan = t < end + 14 ? t * 12 - (t > end - 6 ? Math.pow(t - (end - 6), 2) * 0.3 : 0) : (end + 14) * 12 - Math.pow(20, 2) * 0.3;
      const yx = W * 0.42;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 600, seg(t, end, 85)), y: 360, zoom: lerp(1, 1.08, easeIO(seg(t, end, 85))), shake: 0.6 });
      this.fxbArena(ctx, S, pan);
      // marcadores ficando para trás
      if (k > 0) this.ptdSpeed(ctx, S, t, SAE_C, 0.35 * k, 1, 50, 18, feet - 300, feet, 7);
      [[o.r1, 300], [o.r2, 1500]].forEach(([ch, wx], i) => {
        const sx = wx - pan + 200;
        if (sx < -250 || sx > W + 250) return;
        this.fxbShadow(ctx, sx, feet - 40, 55, 0.4);
        this.fxbSpr(ctx, ch, sx, feet - 40, 250, { animState: 'run', frame: runF(t + i * 2, 5), flipX: true });
      });
      this.fxbShadow(ctx, yx, feet, 70, 0.45);
      if (v > 0.15) this.fxbSpr(ctx, o.c.you, yx, feet, 310, { animState: 'run', frame: runF(t, 3), showAura: off < 1, auraColor: SAE_C });
      else this.fxbSpr(ctx, o.c.you, yx, feet, 310, {});
      this.ptdBall(ctx, yx + 70, feet - 16, 17, pan * 0.05);
      ctx.restore();
      // quando zera: a cor vai embora
      if (off > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = `rgba(128,128,128,${0.85 * off})`;
        ctx.fillRect(0, top, W, bot - top);
        ctx.restore();
        ctx.fillStyle = `rgba(15,23,42,${0.3 * off})`;
        ctx.fillRect(0, top, W, bot - top);
      }
      // a barra do Fluxo (em cima, no meio)
      const secs = Math.max(0, k * 11);
      this.fxdBar(ctx, W / 2 - 260, top + 70, 520, 18, k, off > 0 ? '#64748b' : SAE_C, {
        n: 24,
        label: 'FLUXO',
        value: `${num(secs)} S`,
        valueColor: off > 0 ? '#94a3b8' : '#fecdd3'
      });
      // uma faísca vermelha teimosa no começo da barra
      if (t >= 70) {
        const bl = 0.5 + 0.5 * Math.sin((t - 70) * 0.5);
        this.cineGlow(ctx, W / 2 - 258, top + 79, 26, 'rgba(190,18,60,0.9)', bl);
        ctx.fillStyle = '#fecdd3';
        ctx.fillRect(W / 2 - 262, top + 75, 8, 8);
      }
      if (off > 0) this.ptdChip(ctx, 'FLUXO ENCERRADO', W / 2, top + 136, '#94a3b8', off, { size: 16 });
      this.finKicker(ctx, 40, top + 34, t < end ? 'O RELÓGIO DO FLUXO CORRE' : 'ACABOU?', 1, t < end ? SAE_C : '#94a3b8');
      this.fxbSfx(S, end, 'fim', () => window.SFX?.blip?.(220));
    },

    // PLANO 2 — o anel vazio... CLIQUE: 60% de volta. O gênio não desliga
    fxdSae1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxdSaeCast();
      const click = 52;
      const isOn = t >= click;
      const cx = W * 0.64;
      const cy = (top + bot) / 2 + 4;
      const R = 200;
      const fill = !isOn ? 0 : 0.6 * ease(seg(t, click, click + 8)) + 0.1 * seg(t, click + 40, 185);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#07060a'], [0.5, isOn ? '#2a0612' : '#101018'], [1, '#07060a']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.0 + easeIO(t / 185) * 0.05, shake: 0.5 + (isOn ? 6 * (1 - seg(t, click, click + 16)) : 0) });
      this.fxdSaeGeo(ctx, cx, cy, 300, t, 0.9);
      if (isOn) this.ptdRays(ctx, cx, cy, 760, SAE_C, 0.12 * (0.5 + 0.5 * (1 - seg(t, click, click + 40))), t * 0.002, 48);
      this.cineGlow(ctx, cx, cy, R * 1.6, isOn ? 'rgba(190,18,60,0.35)' : 'rgba(100,116,139,0.2)');
      this.fxdRing(ctx, cx, cy, R, fill, SAE_C, { n: 20, lw: 26, head: isOn });
      // você dentro do anel: apagado → a aura volta no clique
      this.fxbShadow(ctx, cx, cy + 150, 60, 0.5);
      this.fxbSpr(ctx, o.c.you, cx, cy + 150, 290, isOn ? { rim: SAE_C, rimD: 2, showAura: true, auraColor: SAE_C } : { dim: 0.35, dimTint: '30,41,59' });
      if (isOn) this.fxbSparks(ctx, cx, cy - R, seg(t, click, click + 24), 16, [SAE_C, '#fecdd3', '#ffffff'], 0.9, 4);
      ctx.restore();
      // a leitura grande do lado
      const pct = Math.round(fill * 100);
      ctx.save();
      ctx.font = '900 76px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const pop = isOn ? 1 + 0.35 * (1 - ease(seg(t, click, click + 10))) : 1;
      ctx.translate(cx + R + 52, cy - 10);
      ctx.scale(pop, pop);
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#020617';
      ctx.strokeText(`${pct}%`, 0, 0);
      ctx.fillStyle = isOn ? '#fecdd3' : '#64748b';
      ctx.fillText(`${pct}%`, 0, 0);
      ctx.restore();
      this.ptdChip(ctx, isOn ? 'RECARGA INSTANTÂNEA' : 'FLUXO ENCERRADO', cx + R + 40, cy + 64, isOn ? SAE_C : '#64748b', isOn ? seg(t, click + 4, click + 14) : seg(t, 4, 14), { left: true, size: 15 });
      if (isOn) {
        this.ptdWord(ctx, 'CLIQUE.', cx, top + 80, 64, '#fecdd3', seg(t, click, click + 6), 1 - seg(t, click + 30, click + 42), 0.05);
        this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, click, click + 7)), '#fecdd3');
      }
      // painel: o olhar frio do Sae
      const pk = ease(seg(t, 8, 24));
      if (pk > 0) {
        const pts = [[24, top + 70], [420, top + 54], [432, top + 372], [36, top + 388]];
        this.ptdPanel(ctx, pts, () => {
          ctx.fillStyle = '#0b0d14';
          ctx.fillRect(0, top, 460, bot - top);
          this.ptdRays(ctx, 228, top + 160, 440, SAE_TEAL, 0.12, -t * 0.003, 40);
          const dw = 420;
          this.fxbFaceCrop(ctx, o.sae, 228 - dw / 2, top + 48, dw, 6, 1, 24, 10.6, { ring: SAE_TEAL, iris: '#134e4a' });
          ctx.fillStyle = 'rgba(11,13,20,0.9)';
          ctx.fillRect(0, top + 240, 460, 160);
          this.finKicker(ctx, 60, top + 272, 'SAE ITOSHI', seg(t, 22, 40), SAE_TEAL);
          this.fxdReadout(ctx, 60, top + 306, [['FLUXO: 0,0 S'], ['DESLIGAR? NÃO.', SAE_C]], seg(t, 30, click + 6), '#cbd5e1', 'left', 14);
        }, { dx: -(1 - pk) * 480 });
      }
      this.finKicker(ctx, 470, top + 34, isOn ? 'O GÊNIO NÃO DESLIGA' : 'A BARRA ZEROU', seg(t, 4, 30), isOn ? SAE_C : '#94a3b8');
      this.fxbSfx(S, click, 'clique', () => window.SFX?.blip?.(1318));
      this.fxbSfx(S, click + 6, 'volta', () => window.SFX?.jingle?.([587, 784, 1175], 0, 'triangle'));
    },

    // PLANO 3 — close: o anel atrás da cabeça, SEM PAUSA
    fxdSae2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxdSaeCast();
      const hit = 8;
      const cx = W * 0.5;
      const eyeY = top + 220;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#0a0508'], [0.5, '#2a0612'], [1, '#0a0508']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02 + easeIO(t / 90) * 0.05, shake: 0.5 + (t >= hit ? 6 * (1 - seg(t, hit, hit + 20)) : 0) });
      this.ptdRays(ctx, cx, eyeY, 900, SAE_C, 0.16, t * 0.003, 48);
      this.fxdSaeGeo(ctx, cx, eyeY + 60, 380, t + 100, 0.7, 5);
      const fill = 0.6 + 0.15 * ease(seg(t, hit, 90));
      this.fxdRing(ctx, cx, eyeY + 10, 300, t < hit ? 0.6 * ease(seg(t, 0, hit)) : fill, SAE_C, { n: 30, lw: 22, head: true });
      const size = 760;
      const { u } = this.fxbHead(ctx, o.c.you, cx, eyeY, size, { rim: SAE_C, rimD: 3 });
      [-1, 1].forEach((s) => this.cineGlow(ctx, cx + s * 3.5 * u, eyeY, u * 3, 'rgba(190,18,60,0.55)'));
      this.ptdEyes(ctx, o.c.you, cx, eyeY, u, { ring: '#fb7185', iris: '#4c0519' });
      ctx.restore();
      const up = ease(seg(t, 40, 54));
      if (up < 1) this.rincStamp(ctx, 'SEM PAUSA', W / 2, lerp(top + 330, top + 200, up), 120, '#fecdd3', t, hit, 2, W * 0.9, 'center', 1 - up);
      this.fxbTitle(ctx, S, t - 48, { cfg: o.c, y: bot - 130, color: SAE_C });
      if (t >= hit) this.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, hit, hit + 9)), '#fecdd3');
      this.fxbSfx(S, hit, 'sae', () => window.SFX?.jingle?.([659, 880, 988, 1319], 0, 'triangle'));
    }
  });

  // ==========================================================================
  // 3. MÁQUINA RACIONAL (Noel Noa) — o campo em números, a única trajetória, 100%
  // ==========================================================================
  const NOA_C = '#e5e7eb';
  const NOA_GOLD = '#eab308';
  const NOA_RED = '#f43f5e';
  // câmera atrás de você olhando o gol (X = lado, Y = profundidade, em metros)
  const NOA_CAM = { cx: 640, hy: 140, f: 1000, h: 4.4, d: 10 };
  const NOA_GOALY = 15;
  const NOA_YOU = [-1.5, 1];
  const NOA_DEF = [['aiku', 3.6, 4.2], ['charles', -6.2, 6.4], ['lavinho', 1.8, 9.2]];
  const NOA_GK = [0.3, 14.2];
  // o gol de frente (planos 2 e 3): candidatos de chute (coluna, linha) e a resposta
  const NOA_CANDS = [[0, 2], [1, 1], [2, 2], [3, 1], [0, 0], [2, 0], [1, 2], [3, 2], [0, 1], [2, 1], [1, 0]];
  const NOA_PCT = [31, 12, 22, 44, 58, 19, 9, 37, 26, 15, 48];
  const NOA_WHY = ['GOLEIRO', 'GOLEIRO', 'ZAGUEIRO', 'TRAVE', 'ZAGUEIRO', 'GOLEIRO', 'GOLEIRO', 'TRAVE', 'ZAGUEIRO', 'GOLEIRO', 'GOLEIRO'];

  Object.assign(CE, {
    fxdNoaCast() {
      const c = this.fxbCfg('fl_wc_noa');
      return {
        c,
        noa: this.cineChar('noa'),
        defs: NOA_DEF.map(([id, X, Y]) => ({ ch: this.fxbMate(id, KIT_RIVAL), X, Y })),
        gk: this.fxbMate('gagamaru', KIT_GK)
      };
    },
    // O mostrador da máquina (círculos, marcas, graus), pronto por cor
    fxdDialCv(color) {
      return this.fxbBg(`fxdDial|${color}`, 512, 512, (g) => {
        g.strokeStyle = color;
        g.fillStyle = color;
        g.translate(256, 256);
        [250, 236, 180, 120, 60].forEach((r, i) => {
          g.lineWidth = i === 1 ? 6 : 2;
          g.beginPath();
          g.arc(0, 0, r, 0, TAU);
          g.stroke();
        });
        g.lineWidth = 2;
        g.beginPath();
        for (let i = 0; i < 120; i++) {
          const a = (i / 120) * TAU;
          const L = i % 10 ? 8 : 22;
          g.moveTo(Math.cos(a) * 250, Math.sin(a) * 250);
          g.lineTo(Math.cos(a) * (250 - L), Math.sin(a) * (250 - L));
        }
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          g.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
          g.lineTo(Math.cos(a) * 180, Math.sin(a) * 180);
        }
        g.stroke();
        g.font = '900 15px monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU - Math.PI / 2;
          g.fillText(String(i * 30), Math.cos(a) * 208, Math.sin(a) * 208);
        }
        // triângulo inscrito (geometria)
        g.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * TAU - Math.PI / 2;
          if (i) g.lineTo(Math.cos(a) * 180, Math.sin(a) * 180);
          else g.moveTo(Math.cos(a) * 180, Math.sin(a) * 180);
        }
        g.closePath();
        g.stroke();
      });
    },
    fxdDial(ctx, x, y, R, color, rot, alpha) {
      const cv = this.fxdDialCv(color);
      if (cv.width < 2) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(cv, -R, -R, R * 2, R * 2);
      ctx.restore();
    },
    // Números soltos boiando no escuro (dados do campo)
    fxdDigits(ctx, W, y0, y1, t, n, alpha, seed = 1) {
      ctx.save();
      ctx.font = '900 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        const x = rnd(i, seed) * W;
        const span = y1 - y0;
        const y = y1 - mod(rnd(i, seed + 1) * span + t * (0.3 + rnd(i, seed + 2) * 0.5), span);
        const v = Math.floor(rnd(i + Math.floor((t + i * 7) / 12), seed + 3) * 1000) / 10;
        ctx.globalAlpha = alpha * (0.35 + 0.65 * rnd(i, seed + 4));
        ctx.fillStyle = i % 5 ? '#94a3b8' : NOA_GOLD;
        ctx.fillText(num(v), x, y);
      }
      ctx.restore();
    },
    // A grande área em arame (vista de trás de você)
    fxdNoaBox(ctx, cam, k, t) {
      if (k <= 0) return;
      const G = NOA_GOALY;
      ctx.save();
      // grade de 2 m
      ctx.strokeStyle = `rgba(229,231,235,${0.08 * k})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -24; x <= 24; x += 2) this.fxbLineTo(ctx, cam, x, -2, x, G + 4);
      for (let y = -2; y <= G + 4; y += 2) this.fxbLineTo(ctx, cam, -24, y, 24, y);
      ctx.stroke();
      // linhas da área (aparecem de longe para perto)
      ctx.strokeStyle = `rgba(241,245,249,${0.9 * k})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      this.fxbLineTo(ctx, cam, -30, G, 30, G);
      ctx.stroke();
      this.fxbLine(ctx, cam, [[-20.15, G], [-20.15, G - 16.5], [20.15, G - 16.5], [20.15, G]], 1);
      ctx.stroke();
      this.fxbLine(ctx, cam, [[-9.15, G], [-9.15, G - 5.5], [9.15, G - 5.5], [9.15, G]], 1);
      ctx.stroke();
      const [px, py] = this.fxbProj(cam, 0, G - 11);
      ctx.fillStyle = `rgba(241,245,249,${k})`;
      ctx.fillRect(px - 4, py - 2, 8, 4);
      // o gol (traves + rede)
      const [l0x, l0y, lk] = this.fxbProj(cam, -3.66, G);
      const [r0x, r0y] = this.fxbProj(cam, 3.66, G);
      const gh = 2.44 * lk;
      const [b0x, b0y, bk] = this.fxbProj(cam, -3.66, G + 2);
      const [b1x] = this.fxbProj(cam, 3.66, G + 2);
      ctx.strokeStyle = `rgba(229,231,235,${0.3 * k})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const xx = lerp(b0x, b1x, i / 12);
        ctx.moveTo(xx, b0y - 2.2 * bk);
        ctx.lineTo(xx, b0y);
      }
      for (let j = 0; j <= 5; j++) {
        const yy = lerp(b0y - 2.2 * bk, b0y, j / 5);
        ctx.moveTo(b0x, yy);
        ctx.lineTo(b1x, yy);
      }
      ctx.moveTo(l0x, l0y - gh);
      ctx.lineTo(b0x, b0y - 2.2 * bk);
      ctx.moveTo(r0x, r0y - gh);
      ctx.lineTo(b1x, b0y - 2.2 * bk);
      ctx.stroke();
      ctx.strokeStyle = `rgba(248,250,252,${k})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(l0x, l0y);
      ctx.lineTo(l0x, l0y - gh);
      ctx.lineTo(r0x, r0y - gh);
      ctx.lineTo(r0x, r0y);
      ctx.stroke();
      ctx.restore();
    },
    // O gol de frente, em 2D: retângulo + rede; bulge = estufada no canto (0..1)
    fxdNoaGoal(ctx, x0, y0, w, h, bulge = 0, bx = 0, by = 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(15,17,22,0.75)';
      ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = 'rgba(203,213,225,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const step = w / 16;
      const push = (x, y) => {
        if (bulge <= 0) return [x, y];
        const d = Math.hypot(x - bx, y - by);
        const f = Math.max(0, 1 - d / 160) * bulge * 18;
        return [x + ((x - bx) / (d || 1)) * f, y + ((y - by) / (d || 1)) * f];
      };
      for (let i = 1; i < 16; i++) {
        for (let j = 0; j < 6; j++) {
          const [ax, ay] = push(x0 + i * step, y0 + (j * h) / 6);
          const [cx, cy] = push(x0 + i * step, y0 + ((j + 1) * h) / 6);
          ctx.moveTo(ax, ay);
          ctx.lineTo(cx, cy);
        }
      }
      for (let j = 1; j < 6; j++) {
        for (let i = 0; i < 16; i++) {
          const [ax, ay] = push(x0 + i * step, y0 + (j * h) / 6);
          const [cx, cy] = push(x0 + (i + 1) * step, y0 + (j * h) / 6);
          ctx.moveTo(ax, ay);
          ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();
      // chão + traves
      ctx.fillStyle = 'rgba(229,231,235,0.5)';
      ctx.fillRect(x0 - 160, y0 + h, w + 320, 3);
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + h);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0 + w, y0);
      ctx.lineTo(x0 + w, y0 + h);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.restore();
    },
    // Curva de chute (quadrática) da bola até o alvo
    fxdNoaPath(bx, by, tx, ty) {
      return [bx, by, (bx + tx) / 2 + (tx - bx) * 0.15, Math.min(by, ty) - 70, tx, ty];
    },
    fxdNoaAt(p, k) {
      const [ax, ay, cx, cy, bx, by] = p;
      const u = 1 - k;
      return [u * u * ax + 2 * u * k * cx + k * k * bx, u * u * ay + 2 * u * k * cy + k * k * by];
    },

    // PLANO 1 — o campo vira número: a área em arame, as distâncias, o "livre"
    fxdNoa0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxdNoaCast();
      const cam = NOA_CAM;
      const k = easeIO(t / 90);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#020203'], [0.6, '#0b0c10'], [1, '#020203']]);
      this.fxdDigits(ctx, W, top, bot, t, 34, 0.35 * seg(t, 10, 40), 3);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 620, k), y: lerp(380, 350, k), zoom: lerp(0.96, 1.08, k), rot: lerp(-0.02, 0, k), shake: 0.4 });
      this.fxdDial(ctx, 640, 250, 300, NOA_C, t * 0.003, 0.1 * seg(t, 0, 30));
      this.fxdNoaBox(ctx, cam, seg(t, 2, 26), t);
      // o círculo dos 2 passos em volta de você (ninguém dentro = LIVRE)
      const ck = ease(seg(t, 40, 58));
      if (ck > 0) {
        ctx.save();
        ctx.strokeStyle = NOA_GOLD;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 7]);
        ctx.lineDashOffset = -t;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * TAU * ck;
          const [sx, sy] = this.fxbProj(cam, NOA_YOU[0] + Math.cos(a) * 2, NOA_YOU[1] + Math.sin(a) * 2);
          if (i) ctx.lineTo(sx, sy);
          else ctx.moveTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();
      }
      // a distância até cada marcador
      const [ux, uy] = this.fxbProj(cam, NOA_YOU[0], NOA_YOU[1]);
      o.defs.forEach((d, i) => {
        const [dx, dy] = this.fxbProj(cam, d.X, d.Y);
        this.fxdMeasure(ctx, ux, uy, dx, dy, '', '#cbd5e1', seg(t, 26 + i * 7, 38 + i * 7), t);
      });
      // jogadores em arame (vultos com contorno), do fundo para a frente
      const pa = seg(t, 10, 30);
      const list = o.defs.map((d) => ({ ch: d.ch, X: d.X, Y: d.Y, riv: true })).concat([{ ch: o.gk, X: NOA_GK[0], Y: NOA_GK[1], gk: true }, { ch: o.c.you, X: NOA_YOU[0], Y: NOA_YOU[1], you: true }]);
      list.sort((a, b) => b.Y - a.Y);
      list.forEach((p) => {
        const opt = p.you ? { rim: NOA_C, rimD: 2, alpha: pa } : { tint: '#0b0d12', rim: p.gk ? NOA_GOLD : '#9ca3af', rimD: 2, flipX: true, alpha: pa };
        this.fxbOnPitch(ctx, cam, p.ch, p.X, p.Y, opt, 2.5);
      });
      // os rótulos das distâncias por cima dos vultos
      o.defs.forEach((d, i) => {
        if (seg(t, 26 + i * 7, 38 + i * 7) < 1) return;
        const [dx, dy] = this.fxbProj(cam, d.X, d.Y);
        const dist = Math.hypot(d.X - NOA_YOU[0], d.Y - NOA_YOU[1]);
        this.fxdTag(ctx, (ux + dx) / 2, (uy + dy) / 2, `${num(dist)} m`, '#cbd5e1');
      });
      // o cone de chute: da bola às duas traves
      const sk = ease(seg(t, 56, 72));
      if (sk > 0) {
        const [bx, by] = this.fxbProj(cam, NOA_YOU[0] + 0.6, NOA_YOU[1] + 0.1);
        const [lx, ly] = this.fxbProj(cam, -3.66, NOA_GOALY);
        const [rx, ry] = this.fxbProj(cam, 3.66, NOA_GOALY);
        ctx.save();
        ctx.globalAlpha = sk;
        poly(ctx, [[bx, by], [lerp(bx, lx, sk), lerp(by, ly, sk)], [lerp(bx, rx, sk), lerp(by, ry, sk)]]);
        ctx.fillStyle = 'rgba(234,179,8,0.14)';
        ctx.fill();
        ctx.strokeStyle = NOA_GOLD;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        this.ptdBall(ctx, bx, by - 6, 9, 0, NOA_GOLD);
      }
      ctx.restore();
      // leituras
      const ang = (Math.atan2(3.66 - (NOA_YOU[0] + 0.6), NOA_GOALY - NOA_YOU[1]) - Math.atan2(-3.66 - (NOA_YOU[0] + 0.6), NOA_GOALY - NOA_YOU[1])) * (180 / Math.PI);
      const near = Math.min(...NOA_DEF.map(([, X, Y]) => Math.hypot(X - NOA_YOU[0], Y - NOA_YOU[1])));
      const lines = [
        [`DIST. AO GOL ....... ${num(NOA_GOALY - NOA_YOU[1])} m`],
        [`ÂNGULO DE CHUTE .... ${num(ang)}°`],
        [`MARCADOR + PERTO ... ${num(near)} m`],
        ['RAIO 2 PASSOS ...... LIVRE', NOA_GOLD]
      ];
      this.fxdReadout(ctx, W - 40, top + 40, lines, seg(t, 30, 74), '#cbd5e1', 'right', 15);
      if (ck >= 1) this.ptdChip(ctx, 'LIVRE • DENTRO DA ÁREA', W / 2, bot - 40, NOA_GOLD, seg(t, 58, 70), { size: 16 });
      this.finKicker(ctx, 40, top + 34, 'O CAMPO VIRA NÚMERO', seg(t, 4, 36), NOA_C);
      this.fxbSfx(S, 26, 'm1', () => window.SFX?.blip?.(880));
      this.fxbSfx(S, 58, 'm2', () => window.SFX?.blip?.(1175));
    },

    // PLANO 2 — o gol de frente: todas as trajetórias caem, menos uma
    fxdNoa1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxdNoaCast();
      const gx = 110;
      const gw = 660;
      const gh = 220;
      const gy = top + 120;
      const ball = [gx + gw / 2 - 40, bot - 40];
      const win = [gx + gw - 36, gy + 30];
      const reveal = 128;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#020203'], [0.55, '#0e0f14'], [1, '#020203']]);
      this.fxdDigits(ctx, W, top, bot, t + 90, 28, 0.25, 7);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.0 + easeIO(t / 185) * 0.05, shake: 0.4 });
      this.fxdDial(ctx, gx + gw / 2, gy + gh / 2, 420, NOA_C, t * 0.002, 0.12);
      this.fxdDial(ctx, gx + gw / 2, gy + gh / 2, 260, NOA_GOLD, -t * 0.004, 0.16);
      this.fxdNoaGoal(ctx, gx, gy, gw, gh);
      // o goleiro (vulto) e o alcance dele
      const kx = gx + gw / 2;
      const ky = gy + gh;
      ctx.save();
      ctx.fillStyle = 'rgba(244,63,94,0.10)';
      ctx.strokeStyle = 'rgba(244,63,94,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.ellipse(kx, ky - 90, 215 * ease(seg(t, 14, 30)), 130 * ease(seg(t, 14, 30)), 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      this.fxbSpr(ctx, o.gk, kx, ky, 190, { tint: '#0b0d12', rim: NOA_RED, rimD: 2 });
      // as trajetórias candidatas
      const cw = gw / 4;
      const rh = gh / 3;
      NOA_CANDS.forEach(([c, r], i) => {
        const tx = gx + (c + 0.5) * cw;
        const ty = gy + (r + 0.5) * rh;
        const p = this.fxdNoaPath(ball[0], ball[1], tx, ty);
        const showK = seg(t, 6 + i * 2, 18 + i * 2);
        const dieAt = 34 + i * 7;
        const dead = seg(t, dieAt, dieAt + 6);
        const gone = seg(t, dieAt + 20, dieAt + 40);
        if (showK <= 0 || gone >= 1) return;
        ctx.save();
        ctx.globalAlpha = showK * (1 - gone * 0.85);
        ctx.strokeStyle = dead > 0 ? NOA_RED : 'rgba(203,213,225,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        for (let j = 1; j <= 16; j++) {
          const [x, y] = this.fxdNoaAt(p, (j / 16) * showK);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (showK >= 1) {
          ctx.font = '900 14px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(2,6,23,0.85)';
          ctx.fillRect(tx - 24, ty - 10, 48, 20);
          ctx.fillStyle = dead > 0 ? NOA_RED : '#e2e8f0';
          ctx.fillText(`${NOA_PCT[i]}%`, tx, ty + 1);
          if (dead > 0) {
            const s = 16 * ease(dead);
            ctx.strokeStyle = NOA_RED;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(tx - s, ty - s);
            ctx.lineTo(tx + s, ty + s);
            ctx.moveTo(tx + s, ty - s);
            ctx.lineTo(tx - s, ty + s);
            ctx.stroke();
          }
        }
        ctx.restore();
      });
      // a resposta: o ângulo de cima, fora do alcance
      const wp = this.fxdNoaPath(ball[0], ball[1], win[0], win[1]);
      const wk = ease(seg(t, reveal - 14, reveal + 6));
      if (wk > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        [[14, 'rgba(234,179,8,0.35)'], [5, NOA_GOLD], [2, '#ffffff']].forEach(([lw, col]) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(wp[0], wp[1]);
          for (let j = 1; j <= 24; j++) {
            const [x, y] = this.fxdNoaAt(wp, (j / 24) * wk);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        ctx.restore();
        if (wk >= 1) {
          const pul = (t - reveal - 6) % 30;
          ctx.strokeStyle = rgba(NOA_GOLD, 1 - pul / 30);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(win[0], win[1], 14 + pul * 1.6, 0, TAU);
          ctx.stroke();
          this.cineGlow(ctx, win[0], win[1], 70, 'rgba(234,179,8,0.7)');
        }
      }
      this.ptdBall(ctx, ball[0], ball[1], 16, 0, wk >= 1 ? NOA_GOLD : null);
      ctx.restore();
      if (wk >= 1) {
        const v = Math.round(lerp(48, 100, ease(seg(t, reveal + 6, reveal + 22))));
        this.ptdChip(ctx, `ÂNGULO SUPERIOR • ${v}%`, win[0] - 20, win[1] - 56, NOA_GOLD, seg(t, reveal + 6, reveal + 14), { size: 15 });
      }
      // painel: Noel Noa, o número 1
      const pk = ease(seg(t, 16, 32));
      const px0 = 840;
      if (pk > 0) {
        const pts = [[px0, top + 16], [W - 16, top + 16], [W - 16, top + 236], [px0 + 20, top + 252]];
        this.ptdPanel(ctx, pts, () => {
          ctx.fillStyle = '#0c0d10';
          ctx.fillRect(px0 - 10, top, W - px0 + 10, 270);
          this.ptdRays(ctx, (px0 + W) / 2, top + 120, 420, NOA_GOLD, 0.18, t * 0.003, 44);
          const dw = 440;
          this.fxbFaceCrop(ctx, o.noa, (px0 + W) / 2 - dw / 2 + 4, top + 16, dw, 4, 4, 28, 13, { ring: NOA_GOLD, iris: '#713f12' });
          ctx.fillStyle = 'rgba(12,13,16,0.82)';
          ctx.fillRect(px0, top + 200, W - px0, 60);
          this.finKicker(ctx, W - 40, top + 222, 'NOEL NOA • Nº 1 DO MUNDO', seg(t, 30, 52), NOA_GOLD, 'right');
        }, { dx: (1 - pk) * 480 });
      }
      // a lista das eliminadas (as últimas 5)
      const shown = [];
      NOA_CANDS.forEach((cd, i) => {
        if (t >= 34 + i * 7) shown.push([`T${String(i + 1).padStart(2, '0')}  ${NOA_PCT[i]}%  ✗ ${NOA_WHY[i]}`, NOA_RED]);
      });
      if (t >= reveal) shown.push(['T12  100%  ✓ RACIONAL', NOA_GOLD]);
      const last = shown.slice(-6);
      if (last.length) this.fxdReadout(ctx, px0 + 20, top + 300, last, 1, '#cbd5e1', 'left', 15);
      this.finKicker(ctx, 40, top + 34, wk >= 1 ? 'SÓ EXISTE UM CHUTE' : 'ELIMINANDO O RESTO', seg(t, 4, 30), wk >= 1 ? NOA_GOLD : NOA_C);
      this.fxbSfx(S, reveal, 'res', () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'triangle'));
      this.fxbSfx(S, 40, 'x1', () => window.SFX?.blip?.(330));
      this.fxbSfx(S, 75, 'x2', () => window.SFX?.blip?.(311));
    },

    // PLANO 3 — o chute que não tem defesa: 100%, RACIONAL
    fxdNoa2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxdNoaCast();
      const kick = 8;
      const hit = 26;
      const isHit = t >= hit;
      const gx = 520;
      const gw = 660;
      const gh = 220;
      const gy = top + 60;
      const yx = 230;
      const feet = bot - 30;
      const ball0 = [yx + 92, feet - 20];
      const win = [gx + gw - 36, gy + 30];
      const wp = this.fxdNoaPath(ball0[0], ball0[1], win[0], win[1]);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#020203'], [0.5, '#121216'], [1, '#020203']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.0 + easeIO(t / 95) * 0.04, shake: 0.4 + (isHit ? 9 * (1 - seg(t, hit, hit + 24)) : 0) });
      this.ptdRays(ctx, win[0], win[1], 1000, NOA_GOLD, 0.1 + (isHit ? 0.12 * (1 - seg(t, hit, hit + 50)) : 0), t * 0.002, 44);
      this.fxdDial(ctx, gx + gw / 2, gy + gh / 2, 520, NOA_GOLD, t * 0.003, 0.14);
      this.fxdDial(ctx, gx + gw / 2, gy + gh / 2, 300, NOA_C, -t * 0.005, 0.12);
      const bulge = isHit ? Math.sin(seg(t, hit, hit + 24) * Math.PI) : 0;
      this.fxdNoaGoal(ctx, gx, gy, gw, gh, bulge, win[0], win[1]);
      // o goleiro voa... e não chega
      const dk = ease(seg(t, kick + 2, hit));
      const drop = seg(t, hit + 6, hit + 30);
      const kx = lerp(gx + gw / 2, gx + gw - 200, dk);
      const ky = gy + gh - Math.sin(dk * Math.PI * 0.8) * 70 + drop * 30;
      if (t < kick + 2) this.fxbSpr(ctx, o.gk, kx, ky, 190, {});
      else this.fxbSpr(ctx, o.gk, kx, ky, 190, { animState: 'dive', dim: drop * 0.3 });
      // a linha calculada, desenhada antes do chute; a bola segue em cima dela
      const lineA = 1 - seg(t, hit, hit + 30);
      if (lineA > 0) {
        ctx.save();
        ctx.globalAlpha = lineA;
        ctx.strokeStyle = NOA_GOLD;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -t * 2;
        ctx.beginPath();
        ctx.moveTo(wp[0], wp[1]);
        for (let j = 1; j <= 24; j++) {
          const [x, y] = this.fxdNoaAt(wp, j / 24);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      const fk = seg(t, kick, hit);
      if (t >= kick && !isHit) {
        // rastro que afina (não é cópia da bola)
        const pts = [];
        for (let j = 0; j < 8; j++) {
          const [x, y] = this.fxdNoaAt(wp, Math.max(0, fk - j * 0.035));
          pts.push({ x, y });
        }
        this.ptdStreak(ctx, pts, NOA_GOLD, 22, 0.9);
      }
      const [bx, by] = isHit ? [win[0] + 10 * bulge, win[1] - 8 * bulge] : this.fxdNoaAt(wp, fk);
      this.ptdBall(ctx, bx, by, lerp(18, 12, fk), t * 0.6, t >= kick ? NOA_GOLD : null);
      if (isHit) this.ptdRings(ctx, win[0], win[1], seg(t, hit, hit + 22), [NOA_GOLD, '#ffffff'], 220, 0);
      // você: o chute
      this.fxbShadow(ctx, yx, feet, 80, 0.5);
      const pose = t < kick ? { animState: 'windup', rim: NOA_C, rimD: 2 } : { animState: 'shoot', rim: NOA_GOLD, rimD: 2 };
      this.fxbSpr(ctx, o.c.you, yx, feet, 340, pose);
      ctx.restore();
      // painel: os olhos do Noa acompanhando o chute (a máquina olhando)
      const pk = ease(seg(t, 0, 12));
      if (pk > 0) {
        const pts = [[16, top + 14], [470, top + 14], [470, top + 150], [16, top + 166]];
        this.ptdPanel(ctx, pts, () => {
          ctx.fillStyle = '#0c0d10';
          ctx.fillRect(0, top, 480, 180);
          this.ptdRays(ctx, 243, top + 90, 420, NOA_GOLD, 0.25, t * 0.004, 44);
          const dw = 470;
          this.fxbFaceCrop(ctx, o.noa, 243 - dw / 2, top + 4, dw, 4, 6.4, 28, 7.6, { ring: NOA_GOLD, iris: '#713f12', look: t < hit ? 1 : 0 });
          this.finKicker(ctx, 40, top + 140, 'NOEL NOA', seg(t, 8, 24), NOA_GOLD);
        }, { dx: -(1 - pk) * 480 });
      }
      if (isHit) this.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, hit, hit + 9)), '#fefce8');
      // 100% batendo letra a letra, depois o nome
      const up = ease(seg(t, 48, 60));
      if (up < 1) this.rincStamp(ctx, '100%', W / 2 + 160, lerp(top + 360, top + 300, up), 140, NOA_GOLD, t, hit + 2, 3, W * 0.6, 'center', 1 - up);
      this.fxbTitle(ctx, S, t - 54, { cfg: o.c, y: bot - 130, color: NOA_C });
      this.fxbSfx(S, kick, 'chute', () => window.SFX?.kick?.(1));
      this.fxbSfx(S, hit, 'rede', () => window.SFX?.goal?.(true));
    }
  });

  // ==========================================================================
  // REGISTRO (mesmo esquema da cine_fluxos_b)
  // ==========================================================================
  const SHARED = [
    function (g, S) {
      this.fxbGrain(g, S.W, S.H, 0.05);
    },
    function () {
      for (let i = 0; i < 4; i++) this.ptdBallCv(i);
    }
  ];
  const raysWarm = (list) =>
    list.map(
      ([c, n]) =>
        function (g) {
          this.ptdRays(g, 0, 0, 1, c, 0.01, 0, n);
        }
    );
  const plan = (fns, rays = [], more = []) => {
    const extra = SHARED.concat(more, raysWarm(rays));
    return function (ctx, S) {
      this.sakugaW = S.W;
      if (S.phase === 0 && S.t < 1) {
        this.fxbWarm(fns, S, extra);
        return;
      }
      fns[S.phase].call(this, ctx, S);
      this.fxbGrain(ctx, S.W, S.H, 0.05);
      if (S.phase === 0 && S.t < 10) this.cineFlash(ctx, S.W, S.H, 1 - (S.t - 1) / 9, '#000000');
      this.fxbWarm(fns, S, extra);
    };
  };
  const reg = (id, def) => {
    const d = Object.assign({ letterbox: 0.1, grain: 0, music: 'epic' }, def);
    Object.defineProperty(d, 'title', {
      enumerable: true,
      get() {
        return `${def.icon} ${def.label} • ${CE.fxbCfg(id).youName}`;
      }
    });
    CE.registerCine(`flow_${id}`, d);
  };

  reg('fl_mitico_lorenzo', {
    icon: '🧟',
    label: 'DEVORADOR DE ÁS',
    phases: [90, 185, 90],
    music: 'dread',
    tags: ['PLANO 1 • O DESARME', 'PLANO 2 • A MORDIDA', 'PLANO 3 • DEVORAR'],
    subs: [[], [{ from: 0, who: 'LORENZO', text: '"Hora de comer."', color: LOR_C }], []],
    draw: plan([CE.fxdLor0, CE.fxdLor1, CE.fxdLor2], [[LOR_C, 40], [LOR_PUR, 40]], [
      function () {
        this.fxdAceCv();
      }
    ])
  });

  reg('fl_mitico_sae', {
    icon: '🔁',
    label: 'GÊNIO SEM PAUSA',
    phases: [85, 185, 90],
    music: 'tension',
    tags: ['PLANO 1 • A BARRA ZERA', 'PLANO 2 • SEM PAUSA', 'PLANO 3 • GÊNIO'],
    subs: [[], [{ from: 0, who: 'SAE', text: '"Gênio não pausa."', color: SAE_C }], []],
    draw: plan([CE.fxdSae0, CE.fxdSae1, CE.fxdSae2], [[SAE_C, 48], [SAE_TEAL, 40]])
  });

  reg('fl_wc_noa', {
    icon: '🧮',
    label: 'MÁQUINA RACIONAL',
    phases: [90, 185, 100],
    music: 'mystery',
    tags: ['PLANO 1 • O CAMPO EM NÚMEROS', 'PLANO 2 • A ÚNICA RESPOSTA', 'PLANO 3 • RACIONAL'],
    subs: [[], [{ from: 0, who: 'NOA', text: '"Só existe um chute."', color: NOA_C }], []],
    draw: plan([CE.fxdNoa0, CE.fxdNoa1, CE.fxdNoa2], [[NOA_GOLD, 44]], [
      function () {
        this.fxdDialCv(NOA_C);
      },
      function () {
        this.fxdDialCv(NOA_GOLD);
      }
    ])
  });
})();
