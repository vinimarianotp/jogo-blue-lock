// ============================================================================
// O RIVAL MORTAL (cine_rin) — ver js/cine_kit.js
//   sae_interview • a coletiva do Sae: cem câmeras → "tem um" → o SEU nome →
//                   o Rin ouvindo pela TV do corredor → a tela quebra
//   rin_rival     • o vestiário: a toalha → "pra nós dois?" → o olho →
//                   a aura (ciano por fora, quase preta por dentro) → "VOCÊ É O MEU RIVAL."
// Usa os bonecos guardados da cine_final (finSpr/finHead/finRim/finCrop/finEyes) e
// a aura do Rin do motor (drawRinAbyss). Helpers daqui têm o prefixo "rinc".
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas, sem tela piscando
// (um flash por impacto), olhos em close em pixel art, frame 0 = piscada (não usar).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;
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
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };

  const RIN_C = '#22d3ee';
  const SAE_C = '#f9a8d4';
  const YOU_C = '#00f5d4';
  const NARR_C = '#94a3b8';
  const REP_C = '#facc15';

  // ==========================================================================
  // HELPERS (prefixo rinc)
  // ==========================================================================
  Object.assign(CE, {
    rincCast() {
      const bl = this.KITS.blueLock;
      return {
        rin: this.cineChar('rin', Object.assign({ angry: true }, bl)),
        sae: this.cineChar('sae', Object.assign({}, this.KITS.u20)),
        you: this.cineYou(Object.assign({}, bl))
      };
    },

    // Sombra preta de mangá no rosto (como a drawFaceShadow), montada no tamanho da pixel
    // art (base 180) a partir do boneco guardado e ampliada: barata e sem travar no 1º quadro
    rincShade(ctx, char, x, feet, size, amount, o = {}, solidTo = 11, fadeTo = 14.5) {
      if (amount <= 0.02) return;
      const src = this.finSprEntry(char, 180, Object.assign({}, o, { tint: '#000000', showAura: false, rim: null, dim: 0 }));
      const key = `${src.key}|${solidTo}|${fadeTo}`;
      const cache = this._rincShadeC || (this._rincShadeC = new Map());
      let cv = cache.get(key);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = src.cv.width;
        cv.height = src.cv.height;
        const g = cv.getContext('2d');
        g.drawImage(src.cv, 0, 0);
        g.globalCompositeOperation = 'destination-in';
        const u = 5;
        const top = src.pad;
        const fade = g.createLinearGradient(0, top + 4 * u, 0, top + fadeTo * u);
        fade.addColorStop(0, 'rgba(0,0,0,1)');
        fade.addColorStop((solidTo - 4) / (fadeTo - 4), 'rgba(0,0,0,1)');
        fade.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fade;
        g.fillRect(0, 0, cv.width, cv.height);
        if (cache.size > 20) cache.delete(cache.keys().next().value);
        cache.set(key, cv);
      }
      const k = size / 180;
      ctx.save();
      ctx.imageSmoothingEnabled = size < 180;
      ctx.globalAlpha *= Math.min(1, amount);
      ctx.drawImage(cv, x - size / 2 - src.pad * k, feet - size * 0.87 - src.pad * k, cv.width * k, cv.height * k);
      ctx.restore();
    },

    // Toalha por cima da cabeça EM PIXEL ART (borda dura, dobras e barra em blocos, contorno
    // escuro como o dos bonecos), guardada pronta por cor no mesmo enquadramento do boneco
    rincTowelEntry(color) {
      const c = this._rincTowel || (this._rincTowel = {});
      if (c[color]) return c[color];
      const base = 180;
      const pad = Math.ceil(base * 0.45);
      const u = 5;
      const w = base + pad * 2;
      const h = Math.ceil(base * 1.1) + pad * 2;
      const shape = document.createElement('canvas');
      shape.width = w;
      shape.height = h;
      const g = shape.getContext('2d');
      const cx = pad + base / 2;
      const top = pad;
      g.beginPath();
      g.moveTo(cx - 10.4 * u, top + 16 * u);
      g.quadraticCurveTo(cx - 11.8 * u, top - 0.8 * u, cx, top - 1.4 * u);
      g.quadraticCurveTo(cx + 11.8 * u, top - 0.8 * u, cx + 10.4 * u, top + 16 * u);
      g.lineTo(cx + 7.3 * u, top + 15.2 * u);
      g.quadraticCurveTo(cx + 8 * u, top + 6.4 * u, cx, top + 6.1 * u);
      g.quadraticCurveTo(cx - 8 * u, top + 6.4 * u, cx - 7.3 * u, top + 15.2 * u);
      g.closePath();
      g.fillStyle = color;
      g.fill();
      const img = g.getImageData(0, 0, w, h);
      for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
      g.putImageData(img, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      const R = (x, y, ww, hh, col) => {
        g.fillStyle = col;
        g.fillRect(Math.round(cx + x * u), Math.round(top + y * u), Math.round(ww * u), Math.round(hh * u));
      };
      const sh = (a) => this.finShade(color, a);
      R(-12, -2, 24, 1.6, sh(0.35));
      R(-12, -0.4, 24, 1.2, sh(0.18));
      R(-12, 8, 24, 9, sh(-0.14));
      R(-12, 11.5, 24, 6, sh(-0.26));
      [-7.4, -4.2, -1.2, 2.2, 5.4].forEach((x, i) => R(x, -0.2 + (i % 2) * 0.6, 0.6, 4.8 - (i % 2), sh(-0.2)));
      [-9.6, 8.8].forEach((x) => R(x, 5, 0.6, 9, sh(-0.3)));
      R(-12, 13.4, 24, 0.6, sh(-0.45));
      R(-12, 14.4, 24, 0.4, sh(-0.45));
      // a borda de dentro (sobre o rosto) fica mais escura: a toalha faz sombra
      g.strokeStyle = sh(-0.5);
      g.lineWidth = 1.2 * u;
      g.beginPath();
      g.moveTo(cx + 7.3 * u, top + 15.2 * u);
      g.quadraticCurveTo(cx + 8 * u, top + 6.4 * u, cx, top + 6.1 * u);
      g.quadraticCurveTo(cx - 8 * u, top + 6.4 * u, cx - 7.3 * u, top + 15.2 * u);
      g.stroke();
      g.globalCompositeOperation = 'source-over';
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const og = out.getContext('2d');
      [[-2, 0], [2, 0], [0, -2], [0, 2]].forEach(([dx, dy]) => og.drawImage(shape, dx, dy));
      og.globalCompositeOperation = 'source-in';
      og.fillStyle = '#0a0f1c';
      og.fillRect(0, 0, w, h);
      og.globalCompositeOperation = 'source-over';
      og.drawImage(shape, 0, 0);
      c[color] = { cv: out, pad, base };
      return c[color];
    },
    rincTowel(ctx, x, feet, size, color = '#b4c2d6') {
      const e = this.rincTowelEntry(color);
      const k = size / e.base;
      ctx.save();
      ctx.imageSmoothingEnabled = size < e.base;
      ctx.drawImage(e.cv, x - size / 2 - e.pad * k, feet - size * 0.87 - e.pad * k, e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },

    // Boneco SENTADO: o corpo (até o quadril) desce `drop` unidades por cima das pernas, que
    // ficam no lugar (as coxas somem de frente). Devolve o "pé" do tronco (para rosto/toalha)
    rincSeat(ctx, char, x, feet, size, o = {}, drop = 2.6) {
      const e = this.finSprEntry(char, 180, o);
      const k = size / 180;
      const cut = Math.round(e.pad + 22.6 * 5);
      const ox = x - size / 2 - e.pad * k;
      const oy = feet - size * 0.87 - e.pad * k;
      const du = (drop * size) / 36;
      ctx.save();
      ctx.imageSmoothingEnabled = size < 180;
      ctx.drawImage(e.cv, 0, cut, e.cv.width, e.cv.height - cut, ox, oy + cut * k, e.cv.width * k, (e.cv.height - cut) * k);
      ctx.drawImage(e.cv, 0, 0, e.cv.width, cut, ox, oy + du, e.cv.width * k, cut * k);
      ctx.restore();
      return feet + du;
    },

    // Flash de fotógrafo: estrelinhas pequenas que estouram e somem (nunca a tela toda)
    rincPops(ctx, pts, t, seed = 1, period = 80, life = 7) {
      pts.forEach(([x, y, r], i) => {
        const per = period * (0.65 + rnd(i, seed + 1) * 0.9);
        const ph = (t + rnd(i, seed) * per * 3) % per;
        if (ph >= life) return;
        const a = 1 - ph / life;
        this.cineGlow(ctx, x, y, r * 6, 'rgba(226,232,240,0.55)', a * 0.7);
        this.finSparkle(ctx, x, y, r * (0.7 + 0.5 * a), a);
      });
    },

    // Texto que entra letra por letra, cada uma batendo no lugar (tipografia cinética)
    rincStamp(ctx, text, x, y, size, color, t, t0, step = 2, maxW = 0, align = 'center', alpha = 1) {
      if (t < t0 || alpha <= 0) return;
      ctx.save();
      let fs = size;
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      while (maxW && fs > 16 && ctx.measureText(text).width > maxW) {
        fs -= 2;
        ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      }
      const total = ctx.measureText(text).width;
      const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, fs / 9);
      let acc = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const px = x0 + ctx.measureText(acc).width;
        acc += ch;
        const kk = clamp((t - t0 - i * step) / 7);
        if (kk <= 0 || ch === ' ') continue;
        const cw = ctx.measureText(ch).width;
        const sc = 1 + (1 - ease(kk)) * 0.9;
        ctx.save();
        ctx.translate(px + cw / 2, y);
        ctx.scale(sc, sc);
        ctx.globalAlpha = Math.min(1, kk * 2) * alpha;
        ctx.fillStyle = '#020617';
        ctx.fillText(ch, -cw / 2 + fs * 0.05, fs * 0.07);
        ctx.strokeStyle = '#020617';
        ctx.strokeText(ch, -cw / 2, 0);
        ctx.fillStyle = color;
        ctx.fillText(ch, -cw / 2, 0);
        ctx.restore();
      }
      ctx.restore();
      return { x0, w: total, fs };
    },

    // Gotas de suor caindo (pixel), de x0..x1 na altura y0 até y1
    rincDrops(ctx, xs, y0, y1, t, px, seed = 1) {
      ctx.save();
      xs.forEach((x, i) => {
        const per = 70 + rnd(i, seed) * 50;
        const ph = (t + rnd(i, seed + 2) * per) % per;
        const grow = clamp(ph / 30);
        const fall = Math.max(0, ph - 30);
        const y = y0 + fall * fall * 0.06 * (y1 - y0) / 60;
        if (y > y1) return;
        ctx.fillStyle = 'rgba(186,230,253,0.85)';
        const s = Math.ceil(px * (0.6 + 0.4 * grow));
        ctx.fillRect(Math.round(x - s / 2), Math.round(y), s, Math.ceil(s * 1.4));
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(Math.round(x - s / 2), Math.round(y), Math.ceil(s / 3), Math.ceil(s / 3));
      });
      ctx.restore();
    },

    // ---------------------------------------------------------------- sala de imprensa
    rincPressBack(g, w, h) {
      this.cineGradient(g, 0, 0, w, h, [[0, '#04070f'], [0.55, '#0a1530'], [1, '#04070f']]);
      // teto com a fileira de spots
      g.fillStyle = '#03050b';
      g.fillRect(0, 0, w, 70);
      for (let i = 0; i < 9; i++) {
        const x = 120 + i * 130;
        g.fillStyle = '#0f172a';
        g.fillRect(x - 18, 52, 36, 14);
        g.fillStyle = '#e0f2fe';
        g.fillRect(x - 12, 64, 24, 4);
      }
      // painel de patrocínio (step-and-repeat)
      const bx0 = 150;
      const bx1 = 1130;
      const by0 = 104;
      const by1 = 470;
      this.cineGradient(g, bx0, by0, bx1 - bx0, by1 - by0, [[0, '#10264d'], [1, '#0a1838']]);
      g.save();
      g.beginPath();
      g.rect(bx0, by0, bx1 - bx0, by1 - by0);
      g.clip();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 10; c++) {
          const x = bx0 + 30 + c * 112 + (r % 2) * 56;
          const y = by0 + 24 + r * 47;
          const kind = (r + c * 2) % 3;
          if (kind === 0) {
            g.font = 'italic 900 16px "Segoe UI", sans-serif';
            g.fillStyle = 'rgba(56,189,248,0.36)';
            g.fillText('BLUE LOCK', x, y);
          } else if (kind === 1) {
            g.fillStyle = 'rgba(248,250,252,0.08)';
            g.beginPath();
            g.arc(x, y, 15, 0, TAU);
            g.fill();
            g.strokeStyle = 'rgba(248,250,252,0.22)';
            g.lineWidth = 1.5;
            g.stroke();
            g.font = '900 11px "Segoe UI", sans-serif';
            g.fillStyle = 'rgba(248,250,252,0.42)';
            g.fillText('JFU', x, y + 1);
          } else {
            g.font = '900 13px "Segoe UI", sans-serif';
            g.fillStyle = 'rgba(250,204,21,0.28)';
            g.fillText('SUB-20 JAPÃO', x, y);
          }
        }
      }
      // luz do spot no painel, atrás de onde o Sae senta
      const spot = g.createRadialGradient(640, 330, 20, 640, 330, 420);
      spot.addColorStop(0, 'rgba(191,219,254,0.22)');
      spot.addColorStop(1, 'rgba(191,219,254,0)');
      g.fillStyle = spot;
      g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      g.restore();
      g.strokeStyle = 'rgba(148,163,184,0.4)';
      g.lineWidth = 3;
      g.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
      // cortinas dos lados
      [[0, bx0], [bx1, w]].forEach(([x0, x1]) => {
        this.cineGradient(g, x0, 70, x1 - x0, h, [[0, '#060a16'], [1, '#03050b']]);
        g.fillStyle = 'rgba(30,41,59,0.6)';
        for (let x = x0 + 10; x < x1; x += 24) g.fillRect(x, 70, 6, h);
      });
      // chão do palco
      this.cineGradient(g, 0, 470, w, h - 470, [[0, '#0a1222'], [1, '#03060d']]);
    },

    rincPressTable(g, w) {
      // tampo e saia da mesa
      g.fillStyle = '#334155';
      g.fillRect(240, 458, 800, 6);
      g.fillStyle = '#1e293b';
      g.fillRect(240, 464, 800, 12);
      this.cineGradient(g, 252, 476, 776, 150, [[0, '#0b1d4d'], [1, '#040a1c']]);
      g.fillStyle = '#e2e8f0';
      g.fillRect(252, 478, 776, 3);
      g.font = '900 15px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(248,250,252,0.75)';
      g.fillText('COLETIVA OFICIAL  •  BLUE LOCK  x  SUB-20 DO JAPÃO', w / 2, 520);
      g.fillStyle = 'rgba(56,189,248,0.6)';
      g.fillRect(w / 2 - 160, 536, 320, 2);
      // garrafinhas e copo
      [[470, 0], [810, 1]].forEach(([x, i]) => {
        g.fillStyle = 'rgba(147,197,253,0.35)';
        g.fillRect(x, 426 + i * 4, 14, 36 - i * 4);
        g.fillStyle = '#e2e8f0';
        g.fillRect(x + 2, 420 + i * 4, 10, 7);
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.fillRect(x + 2, 430 + i * 4, 3, 26 - i * 4);
      });
      // plaquinha com o nome
      g.fillStyle = '#e2e8f0';
      poly(g, [[586, 436], [694, 436], [700, 462], [580, 462]]);
      g.fill();
      g.font = '900 12px "Segoe UI", sans-serif';
      g.fillStyle = '#0b1d4d';
      g.fillText('SAE ITOSHI', 640, 450);
      // os microfones das emissoras na frente dele
      const mics = [[560, 432, '#ef4444', 'TV1'], [598, 424, '#facc15', 'ESP'], [640, 420, '#38bdf8', 'JTV'], [682, 424, '#22c55e', 'NEWS'], [722, 432, '#a855f7', 'RÁDIO']];
      mics.forEach(([x, y, col, lab], i) => {
        g.strokeStyle = '#0f172a';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(x + (i - 2) * 8, 462);
        g.lineTo(x, y + 18);
        g.stroke();
        g.fillStyle = col;
        g.fillRect(x - 13, y + 4, 26, 15);
        g.font = '900 8px "Segoe UI", sans-serif';
        g.fillStyle = '#f8fafc';
        g.fillText(lab, x, y + 12);
        g.fillStyle = '#111827';
        g.beginPath();
        g.ellipse(x, y, 9, 8, 0, 0, TAU);
        g.fill();
        g.fillStyle = 'rgba(148,163,184,0.5)';
        g.fillRect(x - 5, y - 4, 3, 3);
      });
    },

    // Microfone grande de emissora em primeiro plano (cabeça com grade + cubo colorido)
    rincMic(ctx, mx, my, col, lab, dir, baseY, s = 1) {
      ctx.save();
      ctx.strokeStyle = '#05070d';
      ctx.lineWidth = 16 * s;
      ctx.beginPath();
      ctx.moveTo(mx - dir * 40 * s, baseY);
      ctx.lineTo(mx, my + 60 * s);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.fillRect(mx - 46 * s, my + 30 * s, 92 * s, 54 * s);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(mx + 20 * s, my + 30 * s, 26 * s, 54 * s);
      ctx.font = `900 ${Math.round(22 * s)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(lab, mx - 4 * s, my + 58 * s);
      ctx.fillStyle = '#05070d';
      ctx.beginPath();
      ctx.ellipse(mx, my, 40 * s, 36 * s, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(148,163,184,0.22)';
      for (let gy = -24; gy <= 20; gy += 8) ctx.fillRect(mx - 26 * s, my + gy * s, 52 * s, 3 * s);
      ctx.strokeStyle = 'rgba(191,219,254,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(mx, my, 40 * s, 36 * s, 0, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();
      ctx.restore();
    },

    // Repórteres em primeiro plano (silhuetas com luz de recorte), câmeras erguidas com a
    // telinha acesa; cada câmera solta um flash pequeno de vez em quando
    rincPressCrowd(ctx, W, rows, t, seed = 3, rim = 'rgba(147,197,253,0.55)', burst = null) {
      const pops = [];
      rows.forEach((row, r) => {
        const s = row.s;
        const step = 128 * s;
        for (let i = -1; i * step < W + step; i++) {
          const x = i * step + (r % 2) * step * 0.5 + Math.sin(i * 2.7 + r) * 14 * s;
          const y = row.y + Math.sin(i * 1.3 + r) * 8 * s;
          ctx.fillStyle = '#02040a';
          const cam = rnd(i + 7, r + seed) < 0.62 && !(row.gap && Math.abs(x - W / 2) < row.gap);
          if (cam) {
            const cx = x + (rnd(i, r + 20) - 0.5) * 50 * s;
            const cy = y - 108 * s - rnd(i, r + 21) * 34 * s;
            ctx.strokeStyle = '#02040a';
            ctx.lineWidth = 13 * s;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - 32 * s, y + 6 * s);
            ctx.lineTo(cx - 20 * s, cy + 16 * s);
            ctx.moveTo(x + 32 * s, y + 6 * s);
            ctx.lineTo(cx + 20 * s, cy + 16 * s);
            ctx.stroke();
            ctx.fillRect(cx - 31 * s, cy - 19 * s, 62 * s, 40 * s);
            ctx.fillRect(cx - 12 * s, cy - 30 * s, 24 * s, 13 * s);
            ctx.fillStyle = 'rgba(96,140,200,0.75)';
            ctx.fillRect(cx - 23 * s, cy - 12 * s, 32 * s, 23 * s);
            ctx.fillStyle = '#16306a';
            ctx.fillRect(cx - 21 * s, cy - 1 * s, 28 * s, 10 * s);
            ctx.fillStyle = '#a94e68';
            ctx.fillRect(cx - 10 * s, cy - 8 * s, 6 * s, 5 * s);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(cx + 18 * s, cy - 14 * s, 4 * s, 4 * s);
            this.cineGlow(ctx, cx - 7 * s, cy, 30 * s, 'rgba(147,197,253,0.35)', 0.45);
            pops.push([cx, cy - 32 * s, 9 * s]);
          }
          ctx.fillStyle = '#02040a';
          ctx.beginPath();
          ctx.arc(x, y - 40 * s, 27 * s, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x, y + 30 * s, 56 * s, 42 * s, 0, Math.PI, TAU);
          ctx.fill();
          ctx.fillRect(x - 56 * s, y + 29 * s, 112 * s, 260 * s);
          ctx.strokeStyle = rim;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y - 40 * s, 27 * s, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
      });
      if (burst == null) {
        this.rincPops(ctx, pops, t, seed, 92, 6);
        return;
      }
      // todas disparam (cada uma uma vez, quase juntas)
      pops.forEach(([x, y, r], i) => {
        const at = rnd(i, seed + 40) * 22;
        const a = 1 - (burst - at) / 9;
        if (burst < at || a <= 0) return;
        this.cineGlow(ctx, x, y, r * 7, 'rgba(226,232,240,0.6)', a * 0.8);
        this.finSparkle(ctx, x, y, r * 1.3, a);
      });
    },

    // A imagem da coletiva pronta (vai para dentro da TV do corredor)
    rincFeed(g, w, h) {
      const { sae } = this.rincCast();
      g.drawImage(this.finBg('rinc_pback', w, h, this.rincPressBack), 0, 0);
      this.finRim(g, sae, 640, 548, 300, {}, '#e0f2fe', [-1, 1], 2);
      g.drawImage(this.finBg('rinc_ptable', w, h, this.rincPressTable), 0, 0);
    },

    // Interface do visor da câmera de TV (REC, timecode, foco, áudio)
    rincViewfinder(ctx, S, t, fx, fy, lock, talk) {
      const { W, top, bot } = S;
      const L = 56;
      const T = top + 22;
      const R = W - 56;
      const B = bot - 22;
      ctx.save();
      ctx.strokeStyle = 'rgba(248,250,252,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      [[L, T, 1, 1], [R, T, -1, 1], [L, B, 1, -1], [R, B, -1, -1]].forEach(([x, y, sx, sy]) => {
        ctx.moveTo(x, y + sy * 34);
        ctx.lineTo(x, y);
        ctx.lineTo(x + sx * 34, y);
      });
      ctx.moveTo(W / 2 - 12, (T + B) / 2);
      ctx.lineTo(W / 2 + 12, (T + B) / 2);
      ctx.moveTo(W / 2, (T + B) / 2 - 12);
      ctx.lineTo(W / 2, (T + B) / 2 + 12);
      ctx.stroke();
      ctx.font = '900 16px monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(L + 22, T + 26, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillText('REC', L + 36, T + 27);
      ctx.fillStyle = 'rgba(248,250,252,0.7)';
      ctx.fillText('AO VIVO • CAM 3', L + 90, T + 27);
      const pad = (n) => String(n).padStart(2, '0');
      const fr = Math.floor(t * 0.5);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`23:08:${pad(14 + Math.floor(fr / 30))}:${pad(fr % 30)}`, R - 20, T + 27);
      ctx.textAlign = 'left';
      ctx.font = '700 14px monospace';
      ctx.fillStyle = 'rgba(248,250,252,0.75)';
      ctx.fillText('ISO 3200   F2.8   1/50   ZOOM 84mm', L + 20, B - 22);
      // bateria
      ctx.strokeStyle = 'rgba(248,250,252,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(R - 64, B - 32, 40, 18);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(R - 61, B - 29, 24, 12);
      ctx.fillRect(R - 24, B - 27, 3, 8);
      // medidor de áudio (mexe quando ele fala)
      for (let i = 0; i < 2; i++) {
        const lv = talk * (0.45 + 0.4 * Math.abs(Math.sin(t * 0.37 + i * 1.3)) + 0.15 * Math.abs(Math.sin(t * 1.1 + i)));
        for (let b = 0; b < 12; b++) {
          ctx.fillStyle = b / 12 < lv ? (b > 9 ? '#ef4444' : b > 7 ? '#facc15' : '#4ade80') : 'rgba(248,250,252,0.15)';
          ctx.fillRect(R - 210 + b * 11, B - 34 + i * 10, 8, 6);
        }
      }
      // caixa de foco no rosto (fecha e fica verde quando trava)
      const fw = lerp(380, 210, lock);
      const fh = fw * 0.82;
      ctx.strokeStyle = lock >= 1 ? '#4ade80' : 'rgba(248,250,252,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        const x = fx + (sx * fw) / 2;
        const y = fy + (sy * fh) / 2;
        ctx.moveTo(x, y - sy * 22);
        ctx.lineTo(x, y);
        ctx.lineTo(x - sx * 22, y);
      });
      ctx.stroke();
      ctx.restore();
    },

    // ---------------------------------------------------------------- corredor
    rincHallBg(g, w, h) {
      const fx0 = 690;
      const fx1 = 880;
      const fy0 = 262;
      const fy1 = 410;
      g.fillStyle = '#03060d';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#060b16';
      poly(g, [[0, 0], [w, 0], [fx1, fy0], [fx0, fy0]]);
      g.fill();
      let gr = g.createLinearGradient(0, 0, fx0, 0);
      gr.addColorStop(0, '#0e1a30');
      gr.addColorStop(1, '#070d1a');
      g.fillStyle = gr;
      poly(g, [[0, 0], [fx0, fy0], [fx0, fy1], [0, h]]);
      g.fill();
      gr = g.createLinearGradient(fx1, 0, w, 0);
      gr.addColorStop(0, '#070d1a');
      gr.addColorStop(1, '#0b1528');
      g.fillStyle = gr;
      poly(g, [[w, 0], [fx1, fy0], [fx1, fy1], [w, h]]);
      g.fill();
      gr = g.createLinearGradient(0, fy1, 0, h);
      gr.addColorStop(0, '#03070f');
      gr.addColorStop(1, '#0c1526');
      g.fillStyle = gr;
      poly(g, [[0, h], [w, h], [fx1, fy1], [fx0, fy1]]);
      g.fill();
      g.fillStyle = '#04080f';
      g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
      // a porta do fim com a placa de SAÍDA
      g.fillStyle = '#0b1528';
      g.fillRect(756, 318, 66, 92);
      g.fillStyle = '#132240';
      g.fillRect(762, 324, 54, 86);
      g.fillStyle = 'rgba(148,163,184,0.35)';
      g.fillRect(806, 362, 6, 4);
      g.fillStyle = '#15803d';
      g.fillRect(760, 294, 58, 16);
      g.font = '900 10px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#f0fdf4';
      g.fillText('SAÍDA', 789, 302);
      // rodapés e emendas das paredes em perspectiva
      g.strokeStyle = '#16233c';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, h - 26);
      g.lineTo(fx0, fy1 - 4);
      g.moveTo(w, h - 26);
      g.lineTo(fx1, fy1 - 4);
      g.stroke();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(30,41,59,0.8)';
      [90, 300, 470, 600].forEach((x) => {
        const k = x / fx0;
        g.beginPath();
        g.moveTo(x, lerp(0, fy0, k));
        g.lineTo(x, lerp(h, fy1, k));
        g.stroke();
      });
      [1200, 1060, 960].forEach((x) => {
        const k = (w - x) / (w - fx1);
        g.beginPath();
        g.moveTo(x, lerp(0, fy0, k));
        g.lineTo(x, lerp(h, fy1, k));
        g.stroke();
      });
      // lâmpadas do teto apagadas
      for (let i = 0; i < 5; i++) {
        const k = Math.pow(i / 5, 0.7);
        const x = lerp(700, 785, k);
        const y = lerp(30, 255, k);
        const ww = lerp(150, 16, k);
        g.fillStyle = '#18233a';
        g.fillRect(x - ww / 2, y, ww, Math.max(2, lerp(12, 2, k)));
      }
      // pôster do Blue Lock na parede da direita
      g.save();
      g.translate(1010, 200);
      g.transform(1, -0.17, 0, 1, 0, 0);
      g.fillStyle = '#0a1830';
      g.fillRect(0, 0, 110, 150);
      g.strokeStyle = 'rgba(0,245,212,0.55)';
      g.lineWidth = 3;
      g.strokeRect(0, 0, 110, 150);
      g.font = 'italic 900 18px "Segoe UI", sans-serif';
      g.fillStyle = 'rgba(0,245,212,0.75)';
      g.fillText('BLUE', 55, 50);
      g.fillText('LOCK', 55, 74);
      g.fillStyle = 'rgba(226,232,240,0.4)';
      g.fillRect(20, 100, 70, 4);
      g.fillRect(28, 112, 54, 4);
      g.restore();
    },

    // ---------------------------------------------------------------- vestiário
    rincLockerBg(g, w, h) {
      this.cineGradient(g, 0, 0, w, 112, [[0, '#020409'], [1, '#060c18']]);
      g.fillStyle = '#0a1324';
      g.fillRect(0, 30, w, 12);
      g.fillStyle = 'rgba(148,163,184,0.18)';
      g.fillRect(0, 30, w, 2);
      g.fillStyle = '#070e1c';
      g.fillRect(0, 100, w, 372);
      for (let i = 0; i < 15; i++) {
        const x = i * 88 + 4;
        if (x < 210) continue;
        this.cineGradient(g, x, 112, 82, 338, [[0, i % 2 ? '#16294a' : '#132546'], [1, '#0b1730']]);
        g.fillStyle = '#081225';
        for (let v = 0; v < 4; v++) g.fillRect(x + 18, 124 + v * 8, 46, 3);
        g.fillStyle = 'rgba(203,213,225,0.55)';
        g.fillRect(x + 30, 166, 22, 12);
        g.font = '900 9px "Segoe UI", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#0b1730';
        g.fillText(String(i + 1), x + 41, 172);
        g.fillStyle = '#64748b';
        g.fillRect(x + 68, 270, 5, 30);
        g.fillStyle = 'rgba(148,163,184,0.15)';
        g.fillRect(x, 112, 2, 338);
        g.fillStyle = '#050a14';
        g.fillRect(x + 80, 112, 3, 338);
      }
      // a camisa 10 pendurada e uma toalha numa porta
      g.save();
      g.translate(992, 196);
      g.fillStyle = '#0f2942';
      poly(g, [[14, 0], [42, 0], [58, 10], [52, 22], [46, 18], [46, 74], [10, 74], [10, 18], [4, 22], [-2, 10]]);
      g.fill();
      g.fillStyle = '#38bdf8';
      g.fillRect(10, 18, 3, 54);
      g.fillRect(43, 18, 3, 54);
      g.font = '900 20px "Segoe UI", sans-serif';
      g.fillStyle = '#e0f2fe';
      g.fillText('10', 28, 44);
      g.restore();
      g.fillStyle = '#8b98ae';
      g.fillRect(420, 230, 26, 70);
      g.fillStyle = '#6b778c';
      g.fillRect(420, 288, 26, 4);
      // placa do Blue Lock
      g.fillStyle = '#050a14';
      g.fillRect(560, 56, 240, 38);
      g.strokeStyle = 'rgba(0,245,212,0.45)';
      g.lineWidth = 2;
      g.strokeRect(560, 56, 240, 38);
      g.font = 'italic 900 18px "Segoe UI", sans-serif';
      g.fillStyle = 'rgba(0,245,212,0.7)';
      g.fillText('BLUE LOCK • VESTIÁRIO A', 680, 76);
      // base dos armários
      g.fillStyle = '#040810';
      g.fillRect(0, 450, w, 22);
      // a porta aberta à esquerda: o corredor aceso lá fora
      g.fillStyle = '#04070e';
      g.fillRect(28, 140, 182, 332);
      this.cineGradient(g, 44, 156, 150, 316, [[0, '#9fb6d8'], [1, '#d6e3f5']]);
      g.fillStyle = 'rgba(15,23,42,0.35)';
      g.fillRect(44, 156, 150, 40);
      g.fillStyle = '#0a1222';
      poly(g, [[194, 156], [236, 128], [236, 492], [194, 472]]);
      g.fill();
      // piso em perspectiva
      this.cineGradient(g, 0, 472, w, h - 472, [[0, '#0a1424'], [1, '#050a14']]);
      g.strokeStyle = 'rgba(30,41,59,0.75)';
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 1; i < 9; i++) {
        const y = 472 + (h - 472) * Math.pow(i / 9, 1.6);
        g.moveTo(0, y);
        g.lineTo(w, y);
      }
      for (let i = -8; i <= 16; i++) {
        g.moveTo(760 + (i - 4) * 60, 472);
        g.lineTo(760 + (i - 4) * 260, h);
      }
      g.stroke();
      // a luz do corredor entrando pelo chão (e a sua sombra comprida dentro dela)
      g.save();
      g.globalCompositeOperation = 'lighter';
      const lg = g.createLinearGradient(0, 472, 0, h);
      lg.addColorStop(0, 'rgba(191,219,254,0.30)');
      lg.addColorStop(1, 'rgba(191,219,254,0.04)');
      g.fillStyle = lg;
      poly(g, [[44, 472], [194, 472], [560, h], [60, h]]);
      g.fill();
      g.restore();
      g.fillStyle = 'rgba(2,4,10,0.85)';
      poly(g, [[106, 472], [128, 472], [360, h], [270, h]]);
      g.fill();
    },

    // A luminária pendurada (gira em ang a partir do teto), o cone e a poeira na luz
    rincLamp(ctx, x, ang, t, power = 1, len = 118, coneLen = 560, W = 1280, H = 720) {
      ctx.save();
      ctx.translate(x, -40);
      ctx.rotate(ang);
      const y = len + 40;
      ctx.strokeStyle = '#0b1220';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, y);
      ctx.stroke();
      // cone de luz
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cg = ctx.createLinearGradient(0, y + 30, 0, y + coneLen);
      cg.addColorStop(0, `rgba(191,219,254,${0.2 * power})`);
      cg.addColorStop(1, `rgba(191,219,254,${0.03 * power})`);
      ctx.fillStyle = cg;
      poly(ctx, [[-36, y + 30], [36, y + 30], [250, y + coneLen], [-250, y + coneLen]]);
      ctx.fill();
      ctx.restore();
      ctx.save();
      poly(ctx, [[-36, y + 30], [36, y + 30], [250, y + coneLen], [-250, y + coneLen]]);
      ctx.clip();
      ctx.translate(-260, y);
      this.cineDust(ctx, 520, coneLen, t, 26, `rgba(226,232,240,${0.55 * power})`, 5);
      ctx.restore();
      // a cúpula
      ctx.fillStyle = '#0b1220';
      poly(ctx, [[-26, y], [26, y], [44, y + 30], [-44, y + 30]]);
      ctx.fill();
      ctx.fillStyle = 'rgba(148,163,184,0.35)';
      ctx.fillRect(-26, y, 52, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-16, y + 28, 32, 5);
      this.cineGlow(ctx, 0, y + 32, 90, 'rgba(219,234,254,0.85)', power);
      ctx.restore();
    },

    // Aquecimento: monta antes (um item por quadro, durante o plano 1) os cenários e bonecos
    // guardados que os próximos planos usam — sem travada na troca de plano
    rincWarm(S, list) {
      if (S.phase !== 0 || S.t < 4) return;
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._rincWarmRun !== run) {
        this._rincWarmRun = run;
        this._rincWarmIdx = 0;
      }
      if (this._rincWarmIdx < list.length) list[this._rincWarmIdx++].call(this);
    },

    // Banco de madeira do meio do vestiário (assento na altura seatY)
    rincBench(ctx, x0, x1, seatY, u) {
      ctx.fillStyle = '#2a1d12';
      ctx.fillRect(x0 + 2.5 * u, seatY + 1.6 * u, 1.6 * u, 12 * u);
      ctx.fillRect(x1 - 4.1 * u, seatY + 1.6 * u, 1.6 * u, 12 * u);
      ctx.fillStyle = '#5a4128';
      ctx.fillRect(x0, seatY - 0.8 * u, x1 - x0, 1.2 * u);
      ctx.fillStyle = '#3d2b19';
      ctx.fillRect(x0, seatY + 0.4 * u, x1 - x0, 1.2 * u);
      ctx.fillStyle = 'rgba(219,234,254,0.25)';
      ctx.fillRect(x0, seatY - 0.8 * u, x1 - x0, Math.max(2, 0.25 * u));
    }
  });

  // ==========================================================================
  // 1. A COLETIVA DO SAE
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — a sala de imprensa: a câmera passa por cima dos repórteres até o Sae
    rincSae0(ctx, S) {
      const { W, H, t, top } = S;
      const { sae } = this.rincCast();
      const k = easeIO(t / 190);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(360, 388, k), zoom: lerp(1.0, 1.34, k), shake: 0.5 });
      ctx.drawImage(this.finBg('rinc_pback', W, H, this.rincPressBack), 0, 0);
      this.cineShafts(ctx, 640, 64, Math.PI / 2, 520, 0.55, 5, '219,234,254', 0.07, t);
      this.cineGlow(ctx, 640, 360, 240, 'rgba(191,219,254,0.16)');
      this.finRim(ctx, sae, 640, 548, 300, {}, '#e0f2fe', [-1, 1], 2);
      ctx.drawImage(this.finBg('rinc_ptable', W, H, this.rincPressTable), 0, 0);
      // câmeras de TV nos cantos + fotógrafos de pé
      this.finTvCam(ctx, 150, 452, 0.6, 1);
      this.finTvCam(ctx, 1130, 452, 0.6, -1);
      const side = [];
      for (let i = 0; i < 10; i++) side.push([i < 5 ? 60 + rnd(i, 3) * 120 : 1100 + rnd(i, 3) * 140, 250 + rnd(i, 4) * 160, 9]);
      this.rincPops(ctx, side, t, 11, 70, 6);
      ctx.restore();
      // a plateia de repórteres na frente (mais perto: cresce mais rápido)
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360 + k * 30, zoom: lerp(1.0, 1.62, k), shake: 0.8 });
      this.rincPressCrowd(ctx, W, [{ y: 575, s: 1.05, gap: 170 }, { y: 690, s: 1.45, gap: 120 }], t, 3);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'ESTÁDIO NACIONAL • SALA DE IMPRENSA', seg(t, 8, 50));
      this.finKicker(ctx, 40, top + 58, 'LOGO DEPOIS DO BLUE LOCK x SUB-20', seg(t, 36, 84), '#38bdf8');
    },

    // PLANO 2 — pelo visor da câmera: o Sae, frio, "...tem um."
    rincSae1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const { sae } = this.rincCast();
      const k = easeIO(t / 180);
      const nx = this.cineNoise(t * 0.5, 3) * 5;
      const ny = this.cineNoise(t * 0.5, 8) * 3;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + nx, y: 360 + ny, zoom: lerp(1, 1.08, k) });
      // o painel atrás, fora de foco (ampliado suavizando = desfocado e barato)
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.6;
      ctx.drawImage(this.finBg('rinc_pback', W, H, this.rincPressBack), 420, 180, 440, 260, -80, -40, W + 160, H + 80);
      ctx.restore();
      ctx.fillStyle = 'rgba(2,6,23,0.35)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      this.cineBokeh(ctx, W, top + 20, bot - 160, t, 12, ['rgba(255,255,255,0.28)', 'rgba(147,197,253,0.32)'], 5);
      // flashes lá atrás, desfocados (só o brilho)
      for (let i = 0; i < 6; i++) {
        const per = 60 + rnd(i, 9) * 50;
        const ph = (t + rnd(i, 10) * per) % per;
        if (ph < 6) this.cineGlow(ctx, 80 + rnd(i, 12) * 1120, top + 60 + rnd(i, 13) * 200, 70, 'rgba(255,255,255,0.8)', 1 - ph / 6);
      }
      const r = this.finHead(ctx, sae, 700, 330, 620, { rim: '#bae6fd' });
      // luz de chave fria pela esquerda, o outro lado na sombra
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.foxcGradH(ctx, 0, top, 760, bot - top, [[0, 'rgba(147,197,253,0)'], [0.55, 'rgba(147,197,253,0.12)'], [1, 'rgba(147,197,253,0)']]);
      ctx.restore();
      this.foxcGradH(ctx, 760, top, 520, bot - top, [[0, 'rgba(2,6,23,0)'], [1, 'rgba(2,6,23,0.55)']]);
      // a borda da mesa e dois microfones grandes na frente, nos cantos
      const ty = r.top + 19 * r.u;
      this.cineGradient(ctx, -100, ty, W + 200, 400, [[0, '#0b1d4d'], [1, '#040a1c']]);
      ctx.fillStyle = 'rgba(226,232,240,0.5)';
      ctx.fillRect(-100, ty, W + 200, 3);
      this.rincMic(ctx, 430, ty - 30, '#ef4444', 'TV1', 1, bot + 40, 1);
      this.rincMic(ctx, 985, ty - 10, '#38bdf8', 'JTV', -1, bot + 40, 1);
      ctx.restore();
      const talk = Math.max(seg(t, 20, 26) * (1 - seg(t, 70, 76)), seg(t, 92, 98) * (1 - seg(t, 166, 172)));
      this.rincViewfinder(ctx, S, t, 700, 318, ease(seg(t, 4, 34)), talk);
    },

    // PLANO 3 — o silêncio em painéis → o SEU nome explode na sala
    rincSae2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const { sae } = this.rincCast();
      const name = this.cinePlayerName();
      const hit = 80;
      if (t < hit) {
        ctx.fillStyle = '#05070f';
        ctx.fillRect(0, 0, W, H);
        this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
        const mid = top + 196;
        // A: os olhos do Sae, parados
        const kA = ease(seg(t, 0, 16));
        this.finPanel(ctx, [[0, top + 12], [W, top + 12], [W, mid - 6], [0, mid + 4]], () => {
          ctx.fillStyle = '#081024';
          ctx.fillRect(0, top, W, 220);
          const dw = 660;
          const U = dw / 14;
          this.finEyes(ctx, sae, 640 - dw / 2, top + 104 - 3.1 * U, dw, { half: true, ring: '#5eead4', iris: '#0f766e', look: t > 50 ? -1 : 0 });
          ctx.fillStyle = 'rgba(8,16,40,0.25)';
          ctx.fillRect(0, top, W, 220);
        }, { dx: (1 - kA) * -W });
        // B: os repórteres se inclinando, gravadores esticados
        const kB = ease(seg(t, 12, 28));
        this.finPanel(ctx, [[0, mid + 12], [600, mid + 2], [560, bot - 12], [0, bot - 12]], () => {
          this.cineGradient(ctx, 0, mid, 620, bot - mid, [[0, '#0d1a36'], [1, '#050a18']]);
          this.cineBokeh(ctx, 620, mid + 20, bot - 40, t, 8, ['rgba(255,255,255,0.25)', 'rgba(147,197,253,0.3)'], 8);
          [[150, bot - 40, 1.25], [330, bot - 10, 1.5], [480, bot - 60, 1.0]].forEach(([x, y, s], i) => {
            const lean = ease(seg(t, 20 + i * 6, 60)) * 18 * s;
            ctx.fillStyle = '#02040a';
            ctx.beginPath();
            ctx.arc(x + lean, y - 90 * s, 30 * s, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x + lean * 0.5, y - 10 * s, 64 * s, 50 * s, 0, Math.PI, TAU);
            ctx.fill();
            ctx.fillRect(x - 64 * s + lean * 0.5, y - 12 * s, 128 * s, 200);
            ctx.strokeStyle = '#02040a';
            ctx.lineWidth = 14 * s;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + 30 * s + lean * 0.5, y - 30 * s);
            ctx.lineTo(x + 80 * s + lean * 1.4, y - 120 * s);
            ctx.stroke();
            ctx.fillStyle = '#111827';
            ctx.fillRect(x + 70 * s + lean * 1.4, y - 156 * s, 22 * s, 40 * s);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x + 76 * s + lean * 1.4, y - 150 * s, 6 * s, 6 * s);
            this.cineGlow(ctx, x + 79 * s + lean * 1.4, y - 147 * s, 16 * s, 'rgba(239,68,68,0.8)', 0.8);
            ctx.strokeStyle = 'rgba(147,197,253,0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + lean, y - 90 * s, 30 * s, Math.PI * 1.2, Math.PI * 1.9);
            ctx.stroke();
          });
        }, { dy: (1 - kB) * 400 });
        // C: a boca do Sae entre os microfones — e ela abre
        const kC = ease(seg(t, 24, 40));
        this.finPanel(ctx, [[612, mid + 2], [W, mid + 12], [W, bot - 12], [572, bot - 12]], () => {
          ctx.fillStyle = '#081024';
          ctx.fillRect(560, mid, 740, bot - mid);
          const cw = 720;
          const U = cw / 16;
          const x0 = 935 - cw / 2;
          const y0 = mid + 10 - 1.2 * U;
          const cu0 = 10;
          const cv0 = 8;
          this.finCrop(ctx, sae, {}, cu0, cv0, 16, 9, x0, y0, cw, U * 9);
          if (t > 60) {
            const fu = (ux, uy, uw, uh, c) => {
              ctx.fillStyle = c;
              ctx.fillRect(Math.round(x0 + (ux - cu0) * U), Math.round(y0 + (uy - cv0) * U), Math.ceil(uw * U), Math.ceil(uh * U));
            };
            fu(16.8, 12.0, 2.4, 1.2, '#2b0b0b');
            fu(17.0, 12.0, 2.0, 0.3, '#f1f5f9');
          }
          ctx.fillStyle = 'rgba(8,16,40,0.2)';
          ctx.fillRect(560, mid, 740, bot - mid);
          this.rincMic(ctx, 700, bot - 70, '#facc15', 'ESP', 1, bot + 40, 1.1);
          this.rincMic(ctx, 1170, bot - 56, '#22c55e', 'NEWS', -1, bot + 40, 1.1);
        }, { dx: (1 - kC) * W });
        this.finKicker(ctx, 40, mid + 40, 'NINGUÉM RESPIRA', seg(t, 30, 56), '#facc15');
        return;
      }
      // O impacto: o nome
      const u = t - hit;
      const shake = 7 * (1 - seg(u, 0, 26));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.04 + easeIO(u / 100) * 0.05, shake });
      this.cineGradient(ctx, -40, -40, W + 80, H + 80, [[0, '#030714'], [0.5, '#0b1838'], [1, '#030714']]);
      this.foxcRays(ctx, 640, 340, 0, 900, 64, '#bfdbfe', 0.1, u * 0.004, 0.03);
      this.cineGlow(ctx, 640, 340, 420, 'rgba(147,197,253,0.22)');
      // flashes espalhados pela sala (pequenos, cada um uma vez)
      for (let i = 0; i < 26; i++) {
        const at = rnd(i, 63) * 30;
        const a = 1 - (u - at) / 9;
        if (u < at || a <= 0) continue;
        this.finSparkle(ctx, 40 + rnd(i, 61) * 1200, top + 20 + rnd(i, 62) * 260, 8 + rnd(i, 64) * 12, a);
      }
      ctx.restore();
      // as câmeras dos repórteres, todas erguidas, disparando juntas
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + easeIO(u / 100) * 0.08, shake: shake * 1.3 });
      this.rincPressCrowd(ctx, W, [{ y: 650, s: 1.0 }, { y: 760, s: 1.4 }], t, 5, 'rgba(147,197,253,0.6)', u);
      ctx.restore();
      const cy = (top + bot) / 2 - 18;
      const st = this.rincStamp(ctx, `${name}.`, 640, cy, 170, '#f8fafc', u, 2, 2, W * 0.84);
      if (st) {
        const lk = ease(seg(u, 2 + name.length * 2 + 6, 2 + name.length * 2 + 26));
        ctx.fillStyle = YOU_C;
        ctx.fillRect(640 - (st.w / 2) * lk, cy + st.fs * 0.56, st.w * lk, 6);
      }
      this.finKicker(ctx, W / 2, cy + 112, '— SAE ITOSHI, SOBRE O BLUE LOCK', seg(u, 34, 70), SAE_C, 'center');
      if (u >= 0) this.cineFlash(ctx, W, H, 0.55 * (1 - seg(u, 0, 12)));
      this.cineSfx(S, hit, 'nome', () => window.SFX?.kick?.(1));
    },

    // PLANO 4 — a TV do corredor... e quem estava assistindo
    rincSae3(ctx, S) {
      const { W, H, t } = S;
      const { rin } = this.rincCast();
      const name = this.cinePlayerName();
      const k = easeIO(seg(t, 34, 150));
      const flick = 0.9 + 0.1 * Math.sin(t * 0.07);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(352, 712, k), y: lerp(272, 392, k), zoom: lerp(2.35, 1.12, k), shake: 0.5 });
      ctx.drawImage(this.finBg('rinc_hall', W, H, this.rincHallBg), 0, 0);
      this.cineGlow(ctx, 789, 302, 60, 'rgba(74,222,128,0.5)', 0.8);
      // o brilho da TV na parede e no chão, até o Rin
      this.cineGlow(ctx, 350, 270, 330, 'rgba(56,189,248,0.32)', flick);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fl = ctx.createLinearGradient(300, 0, 1000, 0);
      fl.addColorStop(0, `rgba(56,189,248,${0.16 * flick})`);
      fl.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = fl;
      poly(ctx, [[250, 470], [470, 420], [1100, 600], [200, 720]]);
      ctx.fill();
      ctx.restore();
      // a TV na parede (paralelogramo acompanhando a perspectiva)
      ctx.save();
      ctx.translate(230, 176);
      ctx.transform(1, 0.13, 0, 1, 0, 0);
      ctx.fillStyle = '#05070c';
      ctx.fillRect(-12, -12, 264, 194);
      ctx.strokeStyle = 'rgba(148,163,184,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -12, 264, 194);
      ctx.beginPath();
      ctx.rect(0, 0, 240, 170);
      ctx.save();
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.finBg('rinc_feed', W, H, this.rincFeed), 400, 240, 480, 340, 0, 0, 240, 170);
      this.rincPops(ctx, [[30, 50, 4], [210, 40, 4], [180, 110, 3], [60, 120, 3]], t, 21, 40, 5);
      ctx.fillStyle = 'rgba(2,6,23,0.88)';
      ctx.fillRect(0, 136, 240, 34);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 136, 52, 14);
      ctx.font = '900 9px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('AO VIVO', 6, 143.5);
      ctx.font = '900 10px "Segoe UI", sans-serif';
      ctx.fillText(`SAE ITOSHI: "...${name}."`, 6, 159, 228);
      this.finFillPat(ctx, 'scan', 0, 0, 240, 170, 0.7);
      ctx.fillStyle = `rgba(56,189,248,${0.06 * flick})`;
      ctx.fillRect(0, 0, 240, 170);
      const gl = ctx.createLinearGradient(0, 0, 240, 170);
      gl.addColorStop(0, 'rgba(255,255,255,0.12)');
      gl.addColorStop(0.4, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, 240, 170);
      ctx.restore();
      ctx.restore();
      // o Rin, parado no escuro, a luz da TV recortando um lado
      this.cineGlow(ctx, 860, 470, 160, 'rgba(56,189,248,0.12)', flick);
      this.finRim(ctx, rin, 930, 652, 330, { dim: 0.38, dimTint: '2,10,26' }, '#7dd3fc', [-1], 4);
      this.rincShade(ctx, rin, 930, 652, 330, 0.92);
      ctx.restore();
      // pilar em primeiro plano (mais perto: passa mais rápido)
      const px = lerp(1500, 1160, k);
      ctx.fillStyle = '#010309';
      ctx.fillRect(px, 0, 220, H);
      ctx.fillStyle = 'rgba(56,189,248,0.18)';
      ctx.fillRect(px, 0, 3, H);
      this.finKicker(ctx, 40, S.top + 30, 'CORREDOR DO VESTIÁRIO • AO MESMO TEMPO', seg(t, 60, 100), '#38bdf8');
    },

    // O close do Rin, desenhado num canvas próprio (é ele que vira vidro e quebra)
    rincShockSrc(g, S, tt) {
      const { W, H } = S;
      const { rin } = this.rincCast();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#02050c';
      g.fillRect(0, 0, W, H);
      this.cineGlow(g, 80, 360, 560, 'rgba(56,189,248,0.32)');
      const z = 1 + easeIO(tt / 74) * 0.07;
      g.save();
      g.translate(640, 360);
      g.scale(z, z);
      g.translate(-640, -360);
      const size = 880;
      const eyeY = 352;
      const r = this.finHead(g, rin, 640, eyeY, size, { dim: 0.32, dimTint: '2,14,30', rim: '#7dd3fc' });
      this.rincShade(g, rin, 640, r.feet, size, 0.8);
      g.save();
      g.globalCompositeOperation = 'lighter';
      this.foxcGradH(g, 0, 0, 660, H, [[0, 'rgba(56,189,248,0.18)'], [0.3, 'rgba(56,189,248,0.14)'], [1, 'rgba(56,189,248,0)']]);
      g.restore();
      this.foxcGradH(g, 760, 0, 520, H, [[0, 'rgba(2,5,12,0)'], [1, 'rgba(2,5,12,0.6)']]);
      const shock = seg(tt, 26, 32);
      [-1, 1].forEach((s) => {
        const ex = 640 + s * 3.5 * r.u;
        this.cineGlow(g, ex, eyeY, r.u * 3, 'rgba(34,211,238,0.3)');
        const look = shock > 0 ? [0, 1, 0, -1][Math.floor(tt / 2) % 4] : 0;
        this.drawPixelEye(g, ex, eyeY, r.u * 0.3, { line: '#020617', iris: '#0f766e', ring: '#5eead4', tiny: shock > 0.5, look });
      });
      // uma gota de suor descendo da têmpora
      const dy = ease(seg(tt, 30, 74)) * 3.2 * r.u;
      g.fillStyle = 'rgba(186,230,253,0.85)';
      g.fillRect(Math.round(640 + 7.2 * r.u), Math.round(r.top + 9 * r.u + dy), Math.ceil(r.u * 0.5), Math.ceil(r.u * 0.8));
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(640 + 7.2 * r.u), Math.round(r.top + 9 * r.u + dy), Math.ceil(r.u * 0.2), Math.ceil(r.u * 0.2));
      g.restore();
      return { cx: 640 + (-3.5 * r.u) * z, cy: 360 + (eyeY - 360) * z };
    },

    // PLANO 5 — o olho do Rin → a tela racha a partir dele → os cacos caem no preto
    rincSae4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const crackAt = 74;
      const fallAt = 124;
      // Antes da rachadura o close é desenhado direto na tela; a cópia "vidro" (o close
      // congelado no quadro da rachadura) é montada uma vez só, alguns quadros antes
      if (!this._rincSrc) this._rincSrc = document.createElement('canvas');
      const src = this._rincSrc;
      if (src.width !== W || src.height !== H) {
        src.width = W;
        src.height = H;
        this._rincSrcKey = null;
      }
      const key = `${this._cineRun}|${crackAt}`;
      if (t >= crackAt - 10 && this._rincSrcKey !== key) {
        this._rincSrcEye = this.rincShockSrc(src.getContext('2d'), S, crackAt);
        this._rincSrcKey = key;
      }
      if (t < crackAt) {
        ctx.save();
        this.rincShockSrc(ctx, S, t);
        ctx.restore();
        return;
      }
      const eye = this._rincSrcEye;
      const shards = this.getShards(W, H, eye.cx, eye.cy);
      if (!shards.list[0].bb) {
        shards.list.forEach((sh) => {
          const xs = sh.pts.map((p) => p[0]);
          const ys = sh.pts.map((p) => p[1]);
          const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 2);
          const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 2);
          const x1 = Math.min(W, Math.ceil(Math.max(...xs)) + 2);
          const y1 = Math.min(H, Math.ceil(Math.max(...ys)) + 2);
          sh.bb = [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
        });
      }
      // Cada caco recortado UMA vez num canvas próprio (o close já está congelado na hora da
      // rachadura): depois é só colar girando — sem recorte por quadro
      // (montado na 1ª vez que cada caco aparece: os anéis racham um de cada vez, então o
      // custo fica espalhado pelos quadros da rachadura)
      const bakeKey = `${key}|${shards.key}`;
      const bake = (sh) => {
        if (sh.bakeKey === bakeKey) return;
        const [bx, by, bw, bh] = sh.bb;
        const cv = sh.cv || document.createElement('canvas');
        cv.width = bw;
        cv.height = bh;
        const g = cv.getContext('2d');
        g.save();
        g.translate(-bx, -by);
        poly(g, sh.pts);
        g.clip();
        g.drawImage(src, bx, by, bw, bh, bx, by, bw, bh);
        g.restore();
        sh.cv = cv;
        sh.bakeKey = bakeKey;
      };
      const drawShard = (sh, dx, dy, rot, sc, dark, edge) => {
        bake(sh);
        ctx.save();
        ctx.translate(sh.cx + dx, sh.cy + dy);
        if (rot) ctx.rotate(rot);
        if (sc !== 1) ctx.scale(sc, sc);
        ctx.translate(-sh.cx, -sh.cy);
        const [bx, by] = sh.bb;
        ctx.drawImage(sh.cv, bx, by);
        poly(ctx, sh.pts);
        if (dark > 0) {
          ctx.fillStyle = `rgba(0,0,0,${dark})`;
          ctx.fill();
        }
        if (edge > 0) {
          ctx.lineJoin = 'miter';
          ctx.strokeStyle = `rgba(224,242,254,${edge})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      };
      if (t < fallAt) {
        const u = t - crackAt;
        const sh = this.cineNoise(S.f * 2.3, 4) * 8 * (1 - seg(u, 0, 24));
        ctx.save();
        ctx.translate(sh, sh * 0.6);
        ctx.drawImage(src, 0, 0);
        const rings = Math.min(shards.rings, 1 + Math.floor(u / 4));
        const spread = ease(seg(u, 6, 46)) * 4;
        shards.list.forEach((s, i) => {
          const ring = Math.floor(i / shards.n);
          if (ring >= rings) return;
          drawShard(s, s.vx * spread * (1 + ring * 0.3), s.vy * spread + spread * 0.6, s.vr * spread * 0.5, 1, 0, 0);
        });
        this.drawCracks(ctx, shards, rings);
        // reflexo do vidro passando
        const gx = lerp(-300, W + 300, seg(u, 4, 50));
        const g = ctx.createLinearGradient(gx - 160, 0, gx + 160, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(224,242,254,0.12)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // lasquinhas soltando do centro
        for (let i = 0; i < 18; i++) {
          const a = rnd(i, 71) * TAU;
          const d = u * (2 + rnd(i, 72) * 5);
          const x = eye.cx + Math.cos(a) * d;
          const y = eye.cy + Math.sin(a) * d + u * u * 0.04;
          ctx.fillStyle = `rgba(224,242,254,${0.9 * (1 - seg(u, 10, 40))})`;
          ctx.fillRect(x, y, 3 + rnd(i, 73) * 4, 3 + rnd(i, 74) * 4);
        }
        ctx.restore();
        this.cineImpactText(ctx, 'CRACK', 1040, top + 92, 92, '#f8fafc', seg(u, 0, 8), 0, -0.1);
        this.cineFlash(ctx, W, H, 0.5 * (1 - seg(u, 0, 10)), '#e0f2fe');
        this.cineSfx(S, crackAt, 'crack', () => window.SFX?.kick?.(1));
      } else {
        const f = t - fallAt;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
        this.cineGlow(ctx, eye.cx, eye.cy, 360, 'rgba(34,211,238,0.22)', 1 - seg(f, 0, 70));
        // os cacos caindo para o fundo: os do olho primeiro, girando, encolhendo e apagando
        shards.list.forEach((s, i) => {
          const ring = Math.floor(i / shards.n);
          const d = Math.max(0, f - (ring * 7 + rnd(i, 5) * 9));
          const dx = s.vx * 4 * (1 + ring * 0.3) + s.vx * d * 1.6;
          const dy = s.vy * 4 + 2.4 + s.vy * d * 0.7 + 0.085 * d * d;
          if (s.cy + dy - 260 > H) return;
          const sc = 1 / (1 + d * 0.012);
          drawShard(s, dx, dy, s.vr * (2 + d * 1.6), sc, Math.min(0.82, 0.06 * ring + d * 0.011), Math.max(0, 0.85 - d * 0.008));
        });
        // brilho de vidro caindo
        for (let i = 0; i < 30; i++) {
          const d = Math.max(0, f - rnd(i, 81) * 20);
          const x = eye.cx + (rnd(i, 82) - 0.5) * 700 + (rnd(i, 83) - 0.5) * d * 2;
          const y = eye.cy + (rnd(i, 84) - 0.5) * 300 + d * d * 0.05 + d;
          if (y > H) continue;
          ctx.fillStyle = `rgba(224,242,254,${0.8 * (0.5 + 0.5 * Math.sin(t * 0.3 + i))})`;
          ctx.fillRect(x, y, 3, 3);
        }
        const ek = seg(f, 52, 82);
        this.finKicker(ctx, W / 2, (top + bot) / 2 - 56, 'RIN ITOSHI', ek, RIN_C, 'center');
        this.rincStamp(ctx, 'DESTRUÍDO.', W / 2, (top + bot) / 2 + 6, 76, '#cbd5e1', f, 62, 3, W * 0.7);
      }
    }
  });

  // ==========================================================================
  // 2. O RIVAL MORTAL (o vestiário)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — o vestiário apagado, uma luz em cima do Rin; você na porta
    rincRin0(ctx, S) {
      const { W, H, t, top } = S;
      const { rin, you } = this.rincCast();
      const k = easeIO(t / 200);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 606, k), y: lerp(372, 396, k), zoom: lerp(1.0, 1.13, k), shake: 0.6 });
      ctx.drawImage(this.finBg('rinc_locker', W, H, this.rincLockerBg), 0, 0);
      ctx.fillStyle = 'rgba(4,10,28,0.35)';
      ctx.fillRect(0, 0, W, H);
      this.finRim(ctx, you, 118, 474, 188, { tint: '#03060c' }, '#e0f2fe', [-1, 1], 2);
      this.rincLamp(ctx, 760, Math.sin(t * 0.012) * 0.02, t, 1);
      this.cineGlow(ctx, 760, 610, 260, 'rgba(191,219,254,0.16)');
      const size = 330;
      const u = size / 36;
      const seat = 640 - (31.3 - 23.6) * u;
      this.rincBench(ctx, 520, 1000, seat, u);
      const up = this.rincSeat(ctx, rin, 760, 640, size, { dim: 0.3, dimTint: '6,16,40' });
      this.rincShade(ctx, rin, 760, up, size, 0.96);
      this.rincTowel(ctx, 760, up, size, '#a3b2c9');
      ctx.restore();
      // porta de armário aberta em primeiro plano (profundidade)
      const fx = lerp(1180, 1110, k);
      ctx.fillStyle = '#02050c';
      poly(ctx, [[fx, 0], [W + 40, 0], [W + 40, H], [fx - 30, H]]);
      ctx.fill();
      ctx.fillStyle = 'rgba(147,197,253,0.22)';
      for (let v = 0; v < 5; v++) ctx.fillRect(fx + 40, 160 + v * 12, 60, 4);
      ctx.fillRect(fx, 0, 3, H);
      this.finKicker(ctx, 40, top + 30, 'VESTIÁRIO DO BLUE LOCK • 23:40', seg(t, 8, 50));
      this.finKicker(ctx, 40, top + 58, 'A FESTA JÁ FOI PARA OS CORREDORES', seg(t, 36, 86), '#38bdf8');
    },

    // PLANO 2 — "...pra nós dois?" (meio corpo, por cima do seu ombro) + painéis
    rincRin1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const { rin, you } = this.rincCast();
      const k = easeIO(t / 190);
      ctx.fillStyle = '#03060d';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 680, y: 360, zoom: lerp(1, 1.07, k), shake: 0.7 });
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(this.finBg('rinc_locker', W, H, this.rincLockerBg), 470, 110, 600, 360, -60, -20, W + 120, H + 40);
      ctx.restore();
      ctx.fillStyle = 'rgba(3,8,22,0.4)';
      ctx.fillRect(-60, -20, W + 120, H + 40);
      this.cineShafts(ctx, 760, top - 60, Math.PI / 2, 760, 0.9, 6, '191,219,254', 0.07, t);
      this.cineGlow(ctx, 760, top - 20, 200, 'rgba(219,234,254,0.5)');
      this.cineDust(ctx, W, H, t, 30, 'rgba(226,232,240,0.45)', 9);
      const size = 800;
      const u = size / 36;
      const T = 366 - 10.1 * u;
      const drop = 2.6;
      const tremble = t > 34 && t < 92 ? Math.round(Math.sin(t * 1.3)) * 2 : 0;
      const feet = T + size * 0.87 - drop * u + tremble;
      this.rincBench(ctx, 260, W + 40, T + 21.2 * u, u * 0.9);
      const up = this.rincSeat(ctx, rin, 760, feet, size, { dim: 0.28, dimTint: '6,16,40', rim: '#93c5fd' }, drop);
      this.rincShade(ctx, rin, 760, up, size, 0.97);
      this.rincTowel(ctx, 760, up, size, '#97a7c0');
      this.rincDrops(ctx, [760 - 9.6 * u, 760 + 9.2 * u, 760 - 8 * u], T + 16 * u, bot + 40, t, u * 0.45, 3);
      ctx.restore();
      // o seu ombro em primeiro plano
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.04, k), shake: 1 });
      this.finRim(ctx, you, 175, bot + 430, 860, { facing: 'back', tint: '#02040a' }, '#60a5fa', [1], 6);
      ctx.restore();
      // painel: a boca, os dentes trincados ("Hah.")
      const kp = ease(seg(t, 96, 112));
      if (kp > 0) {
        const pts = [[808, top + 16], [W - 18, top + 16], [W - 18, bot - 190], [772, bot - 176]];
        this.finPanel(ctx, pts, () => {
          ctx.fillStyle = '#05070f';
          ctx.fillRect(760, top, 540, bot - top);
          const cw = 560;
          const U = cw / 10;
          const x0 = 1035 - cw / 2;
          const y0 = top + 16 - 0.6 * U;
          // (bonecos novos: a boca fica mais alta — o recorte sobe pra ela sair embaixo da faixa escura)
          this.finCrop(ctx, rin, { expr: 'angry' }, 13, window.PixelRenderer.spritesV2 ? 7.3 : 9.6, 10, 5.4, x0, y0, cw, U * 5.4);
          this.foxcGrad(ctx, 760, y0, 560, U * 3.6, [[0, 'rgba(0,0,0,1)'], [0.55, 'rgba(0,0,0,0.97)'], [1, 'rgba(0,0,0,0)']]);
          ctx.fillStyle = 'rgba(6,16,40,0.25)';
          ctx.fillRect(760, top, 540, bot - top);
          this.rincStamp(ctx, 'HAH.', 1150, bot - 236, 54, '#e0f2fe', t, 116, 3, 0, 'center');
        }, { dx: (1 - kp) * 560 });
      }
      // painel: a gota batendo no chão
      const kd = ease(seg(t, 132, 146));
      if (kd > 0) {
        const pts = [[30, bot - 196], [420, bot - 186], [404, bot - 18], [18, bot - 18]];
        this.finPanel(ctx, pts, () => {
          this.cineGradient(ctx, 0, bot - 200, 440, 200, [[0, '#0b1424'], [1, '#04080f']]);
          ctx.strokeStyle = 'rgba(30,41,59,0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, bot - 90);
          ctx.lineTo(440, bot - 104);
          ctx.stroke();
          const u2 = t - 146;
          const gx = 220;
          const gy = bot - 64;
          if (u2 < 10) {
            const y = lerp(bot - 220, gy - 14, clamp(u2 / 10));
            ctx.fillStyle = 'rgba(186,230,253,0.9)';
            ctx.fillRect(gx - 6, y, 12, 18);
          } else {
            const a = u2 - 10;
            ctx.strokeStyle = `rgba(186,230,253,${0.9 * (1 - seg(a, 0, 34))})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(gx, gy, 10 + a * 4, 3 + a * 1.1, 0, 0, TAU);
            ctx.stroke();
            ctx.fillStyle = `rgba(186,230,253,${0.9 * (1 - seg(a, 0, 20))})`;
            [-1, 1].forEach((sd) => ctx.fillRect(gx + sd * (6 + a * 1.6), gy - 14 - a * 2 + a * a * 0.12, 5, 5));
            this.rincStamp(ctx, 'TIC.', 330, bot - 150, 30, '#bae6fd', a, 0, 3);
          }
        }, { dy: (1 - kd) * 260 });
      }
    },

    // PLANO 3 — o olho por baixo da toalha: "Não esquece."
    rincRin2(ctx, S) {
      const { W, H, t, top } = S;
      const { rin } = this.rincCast();
      ctx.fillStyle = '#010409';
      ctx.fillRect(0, 0, W, H);
      const size = 880;
      const u = size / 36;
      const x = 700;
      const eyeY = 400;
      const ex = x - 3.5 * u;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(660, ex + 40, easeIO(t / 190)), y: lerp(380, eyeY - 10, easeIO(t / 190)), zoom: 1 + easeIO(t / 190) * 0.12, shake: 0.7 });
      this.cineGlow(ctx, x, top - 40, 420, 'rgba(191,219,254,0.22)');
      const r = this.finHead(ctx, rin, x, eyeY, size, { dim: 0.45, dimTint: '4,10,26' });
      this.rincShade(ctx, rin, x, r.feet, size, 1);
      // a sombra da toalha engole o lado direito do rosto
      this.foxcGradH(ctx, x + 0.5 * u, r.top + 5 * u, 7 * u, 12 * u, [[0, 'rgba(1,4,9,0)'], [1, 'rgba(1,4,9,0.96)']]);
      ctx.fillStyle = 'rgba(1,4,9,0.96)';
      ctx.fillRect(x + 7.5 * u, r.top + 5 * u, 4 * u, 12 * u);
      this.rincTowel(ctx, x, r.feet, size, '#8d9ab0');
      const open = seg(t, 18, 30);
      if (open > 0) {
        const px = u * 0.3;
        this.cineGlow(ctx, ex, eyeY, u * 4.2, 'rgba(34,211,238,0.42)', open);
        const tiny = t > 108;
        const look = tiny ? [0, 1, 0, -1][Math.floor(t / 3) % 4] : 0;
        this.drawPixelEye(ctx, ex, eyeY, px, { line: '#010409', iris: '#0f766e', ring: '#22d3ee', blink: open < 0.5, tiny, look });
        if (open >= 0.5) this.finLid(ctx, ex, eyeY, px, 1, 'angry', '#010409');
      }
      this.rincDrops(ctx, [x - 9.8 * u, x - 7.6 * u], r.top + 15.6 * u, H + 40, t, u * 0.35, 7);
      ctx.restore();
      this.rincStamp(ctx, 'NÃO ESQUECE.', 1010, top + 96, 52, '#e0f2fe', t, 46, 2, 420, 'center', 1 - seg(t, 150, 172));
    },

    // PLANO 4 — a aura sai das costas dele e toma o vestiário
    rincRin3(ctx, S) {
      const { W, H, t, bot } = S;
      const { rin, you } = this.rincCast();
      const erupt = 40;
      const k = ease(seg(t, erupt, 150));
      const shake = 0.8 + 6 * (t >= erupt ? 1 - seg(t, erupt, erupt + 50) : 0) + k * 1.2;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 760, y: lerp(404, 380, k), zoom: lerp(1.24, 1.36, easeIO(t / 220)), rot: -0.035 * k, shake });
      ctx.drawImage(this.finBg('rinc_locker', W, H, this.rincLockerBg), 0, 0);
      ctx.fillStyle = `rgba(1,6,10,${0.35 + 0.35 * k})`;
      ctx.fillRect(-200, -200, W + 400, H + 400);
      // o chão pega a luz ciano da aura
      this.cineGlow(ctx, 760, 600, 420, 'rgba(34,211,238,0.3)', k);
      const ang = t > erupt ? Math.sin((t - erupt) * 0.06) * 0.16 * (1 - seg(t, 150, 220) * 0.6) : 0;
      this.rincLamp(ctx, 760, ang, t, 1 - 0.45 * k);
      this.drawRinAbyss(ctx, 760, 520, 0.95, t, k);
      const size = 330;
      const u = size / 36;
      const seat = 640 - (31.3 - 23.6) * u;
      this.rincBench(ctx, 520, 1000, seat, u);
      const up = this.rincSeat(ctx, rin, 760, 640, size, { dim: 0.3, dimTint: '0,24,30', rim: k > 0.05 ? '#67e8f9' : null });
      this.rincShade(ctx, rin, 760, up, size, 0.96 * (1 - 0.68 * k));
      this.rincTowel(ctx, 760, up, size, '#97a5bb');
      // os olhos acendem quando a sombra abre
      const top = up - size * 0.87;
      [-1, 1].forEach((s) => this.cineGlow(ctx, 760 + s * 3.5 * u, top + 10.1 * u, u * 2.4, 'rgba(34,211,238,0.75)', seg(t, 90, 130)));
      // poeira subindo, puxada pela aura
      ctx.fillStyle = 'rgba(165,243,252,0.7)';
      for (let i = 0; i < 40; i++) {
        const ph = (t * (0.6 + rnd(i, 31) * 0.8) + rnd(i, 32) * 400) % 400;
        const x = 760 + (rnd(i, 33) - 0.5) * 900 + Math.sin(t * 0.03 + i) * 20;
        const y = 640 - ph * 1.3;
        ctx.globalAlpha = k * (1 - ph / 400);
        ctx.fillRect(x, y, 3, 3);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // você em primeiro plano, de costas, recortado de ciano
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1, shake: shake * 1.4 });
      this.finRim(ctx, you, 205, bot + 215, 560, { facing: 'back', tint: '#010409' }, '#22d3ee', [1], 4);
      ctx.restore();
      if (t >= erupt) this.cineFlash(ctx, W, H, 0.32 * (1 - seg(t, erupt, erupt + 12)), '#a5f3fc');
      this.cineSfx(S, erupt, 'aura', () => window.SFX?.tackle?.());
    },

    // PLANO 5 — o rosto, a aura em volta e a frase
    rincRin4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const { rin } = this.rincCast();
      const hit = 104;
      const shake = 0.8 + (t >= hit ? 7 * (1 - seg(t, hit, hit + 30)) : 0);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#000507'], [1, '#021418']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 690, y: 370, zoom: 1 + easeIO(t / 260) * 0.1 + (t >= hit ? 0.03 * (1 - seg(t, hit, hit + 20)) : 0), shake });
      this.cineGlow(ctx, 700, 330, 520, 'rgba(34,211,238,0.2)');
      this.drawRinAbyss(ctx, 700, 700, 1.6, t + 60, 1);
      const size = 900;
      const eyeY = 356;
      const r = this.finHead(ctx, rin, 700, eyeY, size, { dim: 0.18, dimTint: '0,30,36', rim: '#67e8f9' });
      this.rincShade(ctx, rin, 700, r.feet, size, 0.32);
      this.rincTowel(ctx, 700, r.feet, size, '#8794a8');
      [-1, 1].forEach((s) => {
        const ex = 700 + s * 3.5 * r.u;
        const px = r.u * 0.3;
        this.cineGlow(ctx, ex, eyeY, r.u * 3.6, 'rgba(34,211,238,0.55)');
        this.drawPixelEye(ctx, ex, eyeY, px, { line: '#010409', iris: '#021a1d', ring: '#22d3ee', tiny: t >= hit });
        this.finLid(ctx, ex, eyeY, px, s < 0 ? 1 : -1, 'angry', '#010409');
      });
      ctx.restore();
      this.rincStamp(ctx, 'A PARTIR DESTE MOMENTO...', 640, top + 46, 36, '#a5f3fc', t, 22, 2, W * 0.8);
      this.cineImpactText(ctx, 'VOCÊ É O MEU RIVAL.', 640, bot - 78, 84, RIN_C, seg(t, hit, hit + 10), W * 0.92, -0.03);
      if (t >= hit) this.cineFlash(ctx, W, H, 0.42 * (1 - seg(t, hit, hit + 12)), '#cffafe');
      this.cineSfx(S, hit, 'rival', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // AQUECIMENTO (o que os planos seguintes vão usar, montado durante o plano 1)
  // ==========================================================================
  const spr = (who, o) =>
    function () {
      this.finSprEntry(this.rincCast()[who], 180, o);
    };
  const shade = (who, o = {}) =>
    function () {
      const c = this.rincCast()[who];
      if (!this._rincDummy) this._rincDummy = document.createElement('canvas').getContext('2d');
      this.rincShade(this._rincDummy, c, 0, 0, 180, 1, o);
    };
  const warmSae = [
    function () {
      this.finSprEntry(this.rincCast().sae, 180, { rim: '#bae6fd' });
    },
    function () {
      this.finEyes(document.createElement('canvas').getContext('2d'), this.rincCast().sae, 0, 0, 14, { half: true });
    },
    function () {
      this.finBg('rinc_hall', 1280, 720, this.rincHallBg);
    },
    function () {
      const cv = document.getElementById('sakuga-action-canvas');
      this.finBg('rinc_feed', cv?.width || 1280, cv?.height || 720, this.rincFeed);
    },
    spr('rin', { dim: 0.38, dimTint: '2,10,26' }),
    spr('rin', { dim: 0.38, dimTint: '2,10,26', rim: '#7dd3fc', rimSides: [-1], rimD: 2 }),
    spr('rin', { dim: 0.32, dimTint: '2,14,30' }),
    spr('rin', { dim: 0.32, dimTint: '2,14,30', rim: '#7dd3fc' }),
    shade('rin')
  ];
  const warmRin = [
    spr('rin', { dim: 0.28, dimTint: '6,16,40', rim: '#93c5fd' }),
    spr('you', { facing: 'back', tint: '#02040a' }),
    spr('you', { facing: 'back', tint: '#02040a', rim: '#60a5fa', rimSides: [1], rimD: 1 }),
    function () {
      this.rincTowelEntry('#97a7c0');
      this.rincTowelEntry('#8d9ab0');
    },
    spr('rin', {}),
    spr('rin', { dim: 0.45, dimTint: '4,10,26' }),
    spr('rin', { dim: 0.3, dimTint: '0,24,30' }),
    spr('rin', { dim: 0.3, dimTint: '0,24,30', rim: '#67e8f9' }),
    function () {
      this.rincTowelEntry('#97a5bb');
      this.rincTowelEntry('#8794a8');
    },
    spr('you', { facing: 'back', tint: '#010409', rim: '#22d3ee', rimSides: [1], rimD: 1 }),
    spr('rin', { dim: 0.18, dimTint: '0,30,36' }),
    spr('rin', { dim: 0.18, dimTint: '0,30,36', rim: '#67e8f9' })
  ];

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  CE.registerCine('sae_interview', {
    phases: [190, 180, 180, 170, 230],
    music: 'dread',
    title: '🎤 A COLETIVA DO SAE',
    tags: ['PLANO 1 • CEM CÂMERAS', 'PLANO 2 • AO VIVO', 'PLANO 3 • O NOME', 'PLANO 4 • O CORREDOR', 'PLANO 5 • CRACK'],
    get subs() {
      const nm = CE.cinePlayerName().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
      // Cena-régua: as falas ficam, só mais curtas. A sala de imprensa (letreiros), a TV do
      // corredor com "SAE ITOSHI: ...NOME." e o "DESTRUÍDO." já estão na imagem.
      // Plano 3: o "Quem?" do repórter só entra se o seu nome couber depois dele (nomes
      // longos: o Sae responde sozinho, o nome já explode na tela)
      const nameNeed = 30 + `SAE ITOSHI "${nm}."`.length * 3.4;
      const ask = 84 + nameNeed <= 180;
      return [
        [{ from: 0, who: 'REPÓRTER', text: '"Alguém do Blue Lock te impressionou?"', color: REP_C }],
        [{ from: 20, who: 'SAE ITOSHI', text: '"...Tem um. Muito bom."', color: SAE_C }],
        ask
          ? [
              { from: 0, to: 80, who: 'REPÓRTER', text: '"Quem?"', color: REP_C },
              { from: 84, who: 'SAE ITOSHI', text: `"${nm}."`, color: SAE_C }
            ]
          : [{ from: Math.max(0, Math.min(80, Math.floor(180 - nameNeed))), who: 'SAE ITOSHI', text: `"${nm}."`, color: SAE_C }],
        [{ from: 10, who: 'NARRADOR', text: 'O irmão disse outro nome.', color: NARR_C }],
        [
          { from: 0, to: 72, who: 'RIN ITOSHI', text: '"...o quê?"', color: RIN_C },
          { from: 100, who: 'NARRADOR', text: 'Algo se partiu.', color: NARR_C }
        ]
      ];
    },
    grain: 0,
    vignette: 0.6,
    draw(ctx, S) {
      [this.rincSae0, this.rincSae1, this.rincSae2, this.rincSae3, this.rincSae4][S.phase].call(this, ctx, S);
      this.rincWarm(S, warmSae);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    }
  });

  CE.registerCine('rin_rival', {
    phases: [200, 190, 190, 220, 270],
    music: 'dread',
    title: '🩸 O RIVAL MORTAL',
    tags: ['PLANO 1 • UMA LUZ ACESA', 'PLANO 2 • PRA NÓS DOIS?', 'PLANO 3 • NÃO ESQUECE', 'PLANO 4 • O ABISMO', 'PLANO 5 • O RIVAL MORTAL'],
    // Cena-régua: as falas do Rin ficam inteiras ou quase. O vestiário (letreiros), o "HAH.",
    // o "NÃO ESQUECE." e o "VOCÊ É O MEU RIVAL." também estão desenhados na imagem
    subs: [
      [{ from: 4, who: 'VOCÊ', text: '"...Obrigado, Rin. Esse gol é de nós dois."', color: YOU_C }],
      [{ from: 30, who: 'RIN ITOSHI', text: '"...Pra nós dois?"', color: RIN_C }],
      [{ from: 14, who: 'RIN ITOSHI', text: '"Não esquece. Eu VOU te matar."', color: RIN_C }],
      [
        { from: 4, to: 50, who: 'VOCÊ', text: '(...Rin?)', color: YOU_C },
        { from: 82, who: 'NARRADOR', text: 'Algo faminto acordou.', color: NARR_C }
      ],
      [{ from: 22, who: 'RIN ITOSHI', text: '"A partir deste momento... VOCÊ É O MEU RIVAL."', color: RIN_C }]
    ],
    grain: 0,
    vignette: 0.6,
    draw(ctx, S) {
      [this.rincRin0, this.rincRin1, this.rincRin2, this.rincRin3, this.rincRin4][S.phase].call(this, ctx, S);
      this.rincWarm(S, warmRin);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    }
  });
})();
