// Cenas cinematográficas (cine_inicio) — ver js/cine_kit.js
// O começo da história: a final do colégio (passe pro Tada e a bola na trave),
// o discurso do Ego para os 300, a porta do Blue Lock e o pique-pega do Quarto Z.
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;
  const seg = (t, a, b) => CE.cineSeg(t, a, b);
  const E = (x) => CE.cineEase(x);
  const EIO = (x) => CE.cineEaseInOut(x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const name = () => CE.cinePlayerName();

  // Uniforme do Colégio Ichinan (azul) e do Matsukaze Kokuo (branco e azul)
  const ICHINAN = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
  const MATSUKAZE = { jerseyPrimary: '#f1f5f9', jerseySecondary: '#2563eb' };
  const KEEPER = { jerseyPrimary: '#15803d', jerseySecondary: '#0f172a' };

  Object.assign(CE, {
    // ======================================================================
    // AJUDANTES (prefixo inicio)
    // ======================================================================

    // Mistura duas cores '#rrggbb' (k 0..1) → 'rgb(...)'
    inicioMix(a, b, k) {
      if (k <= 0) return a;
      const p = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
      const c = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * Math.min(1, k)));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    },

    // Sombra no chão (elipse achatada), deslocada para longe do sol
    inicioShadow(ctx, x, y, w, alpha = 0.35, dx = 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#05030a';
      ctx.beginPath();
      ctx.ellipse(x + dx, y, w, w * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    // Pálpebra descendo por cima do olho em pixel (olhar decidido): cobre `rows` linhas
    inicioLid(ctx, cx, cy, px, rows, color = '#020617') {
      if (rows <= 0) return;
      const x0 = Math.round(cx - 6 * px);
      const y0 = Math.round(cy - 3.5 * px);
      ctx.fillStyle = color;
      ctx.fillRect(x0, y0, Math.ceil(12 * px), Math.ceil(rows * px));
    },

    // Os dois olhos em pixel por cima de um close (cineHead): eyeY = linha dos olhos
    inicioEyes(ctx, cx, eyeY, u, opts = {}) {
      const px = u * (opts.scale || 0.27);
      const iris = { line: opts.line || '#020617', iris: opts.iris || '#020617', ring: opts.ring || '#ef4444', look: opts.look || 0, tiny: opts.tiny, blink: opts.blink };
      [-1, 1].forEach((s) => {
        this.drawPixelEye(ctx, cx + s * 3.5 * u, eyeY, px, iris);
        if (opts.lid) this.inicioLid(ctx, cx + s * 3.5 * u, eyeY, px, opts.lid, iris.line);
      });
    },

    // Placar de TV no canto
    inicioScore(ctx, x, y, home, hg, away, ag, clock, k = 1, flash = 0) {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k);
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(2,6,23,0.88)';
      ctx.fillRect(0, 0, 400, 38);
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(0, 0, 6, 38);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(394, 0, 6, 38);
      ctx.font = '900 16px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(home, 16, 19);
      ctx.textAlign = 'right';
      ctx.fillText(away, 384, 19);
      ctx.textAlign = 'center';
      ctx.fillStyle = flash > 0 ? '#facc15' : '#f8fafc';
      ctx.font = 'italic 900 20px "Segoe UI", sans-serif';
      ctx.fillText(`${hg}  x  ${ag}`, 210, 19);
      ctx.fillStyle = clock === 'FIM' ? '#ef4444' : '#00f5d4';
      ctx.fillRect(0, 38, 92, 22);
      ctx.fillStyle = '#020617';
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.fillText(clock === 'FIM' ? 'FIM DE JOGO' : clock, 46, 49);
      ctx.restore();
    },

    // Campo do colégio ao pôr do sol (visto de lado, câmera acompanhando: camX)
    inicioField(ctx, S, o = {}) {
      const { W, top, bot } = S;
      const camX = o.camX || 0;
      const hz = o.horizon ?? top + S.stageH * 0.5;
      const dusk = o.dusk || 0;
      const sunX = o.sunX ?? W * 0.88;
      // O anoitecer entra misturado nas cores do degradê (sem camada extra por cima)
      const m = (a, b) => this.inicioMix(a, b, dusk * 0.8);
      this.cineGradient(ctx, -300, top - 40, W + 600, hz - top + 41, [[0, m('#14204d', '#050818')], [0.5, m('#6b3a6e', '#1e1b4b')], [0.85, m('#e0794a', '#4a2f5e')], [1, m('#fdba74', '#8a4a66')]]);
      // Sol baixo, metade atrás dos prédios (o brilho vem depois e vaza por cima deles)
      if (dusk < 0.6) {
        ctx.fillStyle = `rgba(254,236,170,${1 - dusk * 1.5})`;
        ctx.beginPath();
        ctx.arc(sunX, hz - 58, 46, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!o.simple) {
        // Cidade bem longe e o prédio do colégio mais perto (paralaxe)
        this.cineCity(ctx, W, hz - 4, 110, '#2b1d40', 'rgba(253,186,116,0.5)', 4, camX * 0.05);
        const period = 1900;
        const bx0 = (((140 - camX * 0.2) % period) + period) % period - period;
        for (let bx = bx0; bx < W + 100; bx += period) {
          ctx.fillStyle = '#2e2040';
          ctx.fillRect(bx, hz - 168, 900, 168);
          ctx.fillStyle = '#3c2a52';
          ctx.fillRect(bx, hz - 176, 900, 10);
          ctx.fillRect(bx + 380, hz - 220, 140, 52);
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(bx + 450, hz - 196, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(253,186,116,0.62)';
          for (let r = 0; r < 3; r++) for (let i = 0; i < 15; i++) ctx.fillRect(bx + 22 + i * 58, hz - 150 + r * 44, 32, 24);
        }
        // Alambrado atrás do campo
        ctx.strokeStyle = 'rgba(20,12,30,0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const fx0 = -((camX * 0.6) % 70);
        for (let x = fx0; x < W + 70; x += 70) {
          ctx.moveTo(x, hz - 52);
          ctx.lineTo(x, hz);
        }
        ctx.moveTo(-10, hz - 52);
        ctx.lineTo(W + 10, hz - 52);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(20,12,30,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = hz - 46; y < hz; y += 9) {
          ctx.moveTo(-10, y);
          ctx.lineTo(W + 10, y);
        }
        ctx.stroke();
      }
      this.cineGlow(ctx, sunX, hz - 58, 230, 'rgba(255,170,90,0.8)', 1 - dusk * 0.85);
      // Gramado com as faixas de corte em perspectiva
      this.cineGradient(ctx, -300, hz, W + 600, bot - hz + 50, [[0, m('#8a7a34', '#2c2a3a')], [0.2, m('#4a5e1e', '#1c2a24')], [1, m('#14260b', '#070b10')]]);
      ctx.fillStyle = 'rgba(255,240,200,0.07)';
      const vx = W / 2;
      const span = bot + 50 - hz;
      const i0 = Math.floor((camX - W * 2) / 360) * 2;
      for (let i = i0; i < (camX + W * 2) / 180; i += 2) {
        const b0 = i * 180 - camX;
        const b1 = b0 + 180;
        ctx.beginPath();
        ctx.moveTo(vx + (b0 - vx) * 0.22, hz);
        ctx.lineTo(vx + (b1 - vx) * 0.22, hz);
        ctx.lineTo(vx + (b1 - vx) * 1.6, hz + span);
        ctx.lineTo(vx + (b0 - vx) * 1.6, hz + span);
        ctx.closePath();
        ctx.fill();
      }
      return hz;
    },

    // Fileiras de cabeças de costas (plateia do auditório), prontas em canvas
    inicioCrowdCv(W, h, r0, r1, nRows, key) {
      if (!this._inicioCrowd) this._inicioCrowd = {};
      const k = `${key}|${W}|${h}`;
      if (this._inicioCrowd[k]) return this._inicioCrowd[k];
      const cv = document.createElement('canvas');
      cv.width = W + 240;
      cv.height = h;
      const g = cv.getContext('2d');
      for (let r = r0; r < r1; r++) {
        const fr = r / (nRows - 1);
        const y = h * (0.02 + Math.pow(fr, 1.35) * 0.98);
        const rr = 7 + fr * 34;
        const step = rr * 2.7;
        for (let x = (r % 2) * step * 0.5 - step; x < cv.width + step; x += step) {
          const q = Math.sin(x * 12.9898 + r * 78.233) * 43758.5453;
          const jit = (q - Math.floor(q)) - 0.5;
          const hx = x + jit * rr * 0.6;
          const hy = y + jit * rr * 0.3;
          g.fillStyle = r % 2 ? '#0a1226' : '#0c152c';
          g.fillRect(hx - rr * 1.45, hy + rr * 0.75, rr * 2.9, rr * 2.4);
          g.beginPath();
          g.arc(hx, hy, rr, 0, Math.PI * 2);
          g.fill();
          // Contorno de luz azul do telão no alto das cabeças
          g.strokeStyle = `rgba(125,211,252,${0.18 + fr * 0.22})`;
          g.lineWidth = Math.max(1.5, rr * 0.14);
          g.beginPath();
          g.arc(hx, hy, rr * 0.94, Math.PI * 1.15, Math.PI * 1.85);
          g.stroke();
        }
      }
      this._inicioCrowd[k] = cv;
      return cv;
    },

    // A porta do Blue Lock: duas folhas de aço, a fenda de luz e o emblema da tranca
    inicioDoor(ctx, cx, y0, w, h, open, t, spin = 0) {
      const half = w / 2;
      const gap = open * half * 1.02;
      // Moldura
      ctx.fillStyle = '#070d1a';
      ctx.fillRect(cx - half - 46, y0 - 40, w + 92, h + 40);
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(cx - half - 46, y0 - 40, w + 92, 5);
      ctx.fillRect(cx - half - 46, y0 - 40, 5, h + 40);
      ctx.fillRect(cx + half + 41, y0 - 40, 5, h + 40);
      // Luz atrás da porta (aparece na fenda)
      if (open > 0) {
        const g = ctx.createLinearGradient(cx - gap, 0, cx + gap, 0);
        g.addColorStop(0, '#67e8f9');
        g.addColorStop(0.5, '#ffffff');
        g.addColorStop(1, '#67e8f9');
        ctx.fillStyle = g;
        ctx.fillRect(cx - gap, y0, gap * 2, h);
      }
      const leaf = (side) => {
        const x = side < 0 ? cx - half - gap : cx + gap;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y0, half, h);
        ctx.clip();
        const g = ctx.createLinearGradient(x, 0, x + half, 0);
        g.addColorStop(0, side < 0 ? '#0b1730' : '#13264a');
        g.addColorStop(1, side < 0 ? '#13264a' : '#0b1730');
        ctx.fillStyle = g;
        ctx.fillRect(x, y0, half, h);
        // Painéis e rebites
        ctx.strokeStyle = 'rgba(56,189,248,0.22)';
        ctx.lineWidth = 3;
        for (let k = 1; k < 4; k++) {
          ctx.strokeRect(x + 22, y0 + (h / 4) * k - h / 4 + 22, half - 44, h / 4 - 30);
        }
        ctx.fillStyle = 'rgba(148,163,184,0.5)';
        for (let k = 0; k < 9; k++) {
          ctx.fillRect(x + 10, y0 + 20 + k * (h / 9), 5, 5);
          ctx.fillRect(x + half - 15, y0 + 20 + k * (h / 9), 5, 5);
        }
        // Faixa azul e a palavra
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(x, y0 + h * 0.18, half, 10);
        ctx.font = `italic 900 ${Math.round(w * 0.11)}px "Segoe UI", sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = side < 0 ? 'right' : 'left';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(side < 0 ? 'BLUE' : 'LOCK', side < 0 ? x + half - 24 : x + 24, y0 + h * 0.3);
        // Metade do emblema da tranca
        const ex = side < 0 ? x + half : x;
        const ey = y0 + h * 0.58;
        const er = w * 0.13;
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(ex, ey, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(34,211,238,0.7)';
        ctx.lineWidth = 4;
        for (let k = 0; k < 12; k++) {
          const a = spin + (k / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(a) * er * 0.7, ey + Math.sin(a) * er * 0.7);
          ctx.lineTo(ex + Math.cos(a) * er * 0.86, ey + Math.sin(a) * er * 0.86);
          ctx.stroke();
        }
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(ex - er * 0.3, ey - er * 0.05, er * 0.6, er * 0.45);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(ex, ey - er * 0.05 - (open > 0 ? er * 0.12 : 0), er * 0.22, Math.PI, 0);
        ctx.stroke();
        ctx.restore();
        // Borda da folha
        ctx.fillStyle = '#020617';
        ctx.fillRect(side < 0 ? x + half - 4 : x, y0, 4, h);
      };
      leaf(-1);
      leaf(1);
      // Fenda acesa quando fechada
      if (open <= 0) {
        ctx.fillStyle = 'rgba(165,243,252,0.9)';
        ctx.fillRect(cx - 1.5, y0, 3, h);
        this.cineGlow(ctx, cx, y0 + h * 0.5, h * 0.35, 'rgba(34,211,238,0.35)', 0.6 + 0.2 * Math.sin(t * 0.08));
      }
    },

    // Quarto Z: parede do fundo com o Z e o painel do tempo; chão em perspectiva
    inicioRoomZ(ctx, S, o = {}) {
      const { W, top, bot } = S;
      const hz = o.horizon ?? top + S.stageH * 0.42;
      const vx = o.vx ?? W / 2;
      // alarm 0..1: a sala vai ficando vermelha (misturado nas cores, sem camada extra)
      const m = (a, b) => this.inicioMix(a, b, o.alarm || 0);
      this.cineGradient(ctx, -300, top - 40, W + 600, hz - top + 41, [[0, m('#9fb6d3', '#b98e9c')], [1, m('#d6e2f0', '#ecd0d6')]]);
      // Painéis da parede
      ctx.strokeStyle = 'rgba(30,64,120,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = ((vx % 110) + 110) % 110 - 330; x < W + 330; x += 110) {
        ctx.moveTo(x, top - 80);
        ctx.lineTo(x, hz);
      }
      ctx.stroke();
      ctx.font = `italic 900 ${Math.round((hz - top) * 1.05)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(29,78,216,0.16)';
      ctx.fillText('Z', vx - W * 0.22, hz - 4);
      this.cineGradient(ctx, -300, hz - 26, W + 600, 26, [[0, 'rgba(15,41,66,0)'], [1, 'rgba(15,41,66,0.25)']]);
      // Chão
      this.cineGradient(ctx, -300, hz, W + 600, bot - hz + 50, [[0, m('#7f97b8', '#a37f90')], [1, m('#3c5677', '#5a3446')]]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = -10; i <= 10; i++) {
        ctx.moveTo(vx + i * 90, hz);
        ctx.lineTo(vx + i * 460, bot + 120);
      }
      for (let k = 1; k < 8; k++) {
        const y = hz + (bot + 120 - hz) * Math.pow(k / 8, 1.7);
        ctx.moveTo(-300, y);
        ctx.lineTo(W + 300, y);
      }
      ctx.stroke();
      // Reflexo da luz no chão
      this.cineGlow(ctx, vx, hz + 40, 240, 'rgba(224,242,254,0.35)', 0.8);
      return hz;
    },

    // Painel de LED com o tempo (m:ss)
    inicioTimer(ctx, x, y, secs, urgent, scale = 1, t = 0) {
      const s = Math.max(0, Math.ceil(secs));
      const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#020617';
      ctx.fillRect(-120, -48, 240, 96);
      ctx.strokeStyle = urgent ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 5;
      ctx.strokeRect(-120, -48, 240, 96);
      ctx.font = 'italic 900 66px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = urgent ? `rgba(239,68,68,${0.8 + 0.2 * Math.sin(t * 0.3)})` : '#e0f2fe';
      ctx.fillText(txt, 0, 4);
      ctx.restore();
    },

    // Linha de vento atrás da bola (uma faixa só, não é cópia da bola)
    inicioStreak(ctx, x0, y0, x1, y1, w, color = 'rgba(255,255,255,0.8)') {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, color);
      ctx.save();
      ctx.strokeStyle = g;
      ctx.lineCap = 'round';
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
    },

    // ======================================================================
    // 1) PRÓLOGO: a arrancada, o dilema, o passe, a trave, a eliminação e o Ego
    // ======================================================================
    inicioPrologue(ctx, S) {
      const you = this.cineYou(ICHINAN);
      const tada = Object.assign({}, this.getSpeakerCharData('TADA'), ICHINAN, { number: 9 });
      const c = { you, tada };
      [this.inicioPro0, this.inicioPro1, this.inicioPro2, this.inicioPro3, this.inicioPro4, this.inicioPro5][S.phase]?.call(this, ctx, S, c);
    },

    // PLANO 1: câmera acompanhando de lado; carrinho por baixo, cutucada por cima
    inicioPro0(ctx, S, c) {
      const { W, H, t, top, stageH } = S;
      const groundY = top + stageH * 0.93;
      const camX = t * 18;
      const push = EIO(seg(t, 128, 170));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 + push * 120, y: H / 2 + push * 40, zoom: 1 + push * 0.16, shake: 2.2 });
      this.inicioField(ctx, S, { camX, horizon: top + stageH * 0.47 });
      this.drawSpeedLines(ctx, W, H, '#ffedd5', 0.1);
      const youX = W * 0.4;
      const hop = Math.sin(seg(t, 52, 82) * Math.PI) * 74;
      const size = 300;
      // Zagueiro 1: carrinho; zagueiro 2: estica a perna
      const d1x = W * 1.15 - (t - 10) * 17;
      const d2x = W * 1.3 - (t - 66) * 17;
      const def1 = this.cineChar('ishikari', MATSUKAZE);
      const def2 = this.cineChar('shiguma', MATSUKAZE);
      const drawDef = (ch, x, mode) => {
        if (x < -300 || x > W + 300) return;
        this.inicioShadow(ctx, x - 10, groundY, size * 0.22, 0.3, -30);
        this.drawSprite(ctx, ch, x, groundY + (mode === 'slide' ? size * 0.12 : 0), size * 0.95, { animState: mode, flipX: true, frame: S.f });
      };
      drawDef(def1, d1x, d1x < youX + 270 ? 'slide' : 'run');
      drawDef(def2, d2x, d2x < youX + 230 && d2x > youX - 120 ? 'shoot' : 'run');
      // Você
      this.inicioShadow(ctx, youX - 10, groundY, size * 0.22 * (1 - hop / 160), 0.35, -30);
      this.cineRim(ctx, c.you, youX, groundY - hop, size, { animState: 'run', frame: S.f }, '#fdba74', 1);
      // A bola colada no pé (sobe junto no pulo e na cavadinha)
      const chip = Math.sin(seg(t, 114, 136) * Math.PI) * 92;
      const bx = youX + 78 + Math.sin(t * 0.45) * 10 + seg(t, 114, 136) * 20;
      const by = groundY - 13 - hop * 0.9 - chip;
      this.inicioShadow(ctx, bx, groundY, 14, 0.3);
      this.drawAnimeBall(ctx, bx, by, 13, 'rgba(255,214,150,0.5)', S.f);
      // Grama levantando atrás do pé
      ctx.fillStyle = 'rgba(190,242,100,0.6)';
      for (let i = 0; i < 8; i++) {
        const k = ((t * 3 + i * 13) % 40) / 40;
        ctx.fillRect(youX - 40 - k * 120, groundY - 6 - Math.sin(k * Math.PI) * 30 - i * 2, 4, 4);
      }
      // O goleiro saindo do gol
      if (t > 134) {
        const gx = W * 1.12 - (t - 134) * 7;
        this.inicioShadow(ctx, gx, groundY - 30, 50, 0.3, -20);
        this.cineRim(ctx, this.cineChar('fukaku', KEEPER), gx, groundY - 30, 250, { animState: 'run', flipX: true, frame: S.f }, '#fdba74', 1);
      }
      ctx.restore();
      if (t > 60 && t < 84) this.cineImpactText(ctx, 'PASSOU UM!', W * 0.66, top + 90, 46, '#fef3c7', seg(t, 60, 70), 0, -0.08);
      if (t > 122 && t < 146) this.cineImpactText(ctx, 'PASSOU DOIS!', W * 0.66, top + 90, 46, '#fef3c7', seg(t, 122, 132), 0, -0.08);
      if (t > 146) this.cineImpactText(ctx, 'CARA A CARA!', W * 0.5, top + stageH * 0.2, 84, '#facc15', seg(t, 146, 158), W * 0.8, -0.05);
      this.inicioScore(ctx, 28, top + 18, 'ICHINAN', 0, 'MATSUKAZE', 0, "89'", seg(t, 4, 18));
      this.cineSfx(S, 66, 'tackle', () => window.SFX?.tackle());
      this.cineSfx(S, 124, 'chip', () => window.SFX?.pass());
    },

    // PLANO 2: painéis de mangá — os seus olhos, o goleiro saindo, o Tada livre gritando
    inicioPro1(ctx, S, c) {
      const { W, t, top, bot, stageH } = S;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, top, W, stageH);
      const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 0.21)), 12) * 0.018;
      const mid = top + stageH * 0.5;
      // Painel B: o goleiro vindo na sua direção
      const kB = E(seg(t, 8, 24));
      if (kB > 0) {
        this.cinePanel(ctx, [[W * 0.5, top + 14], [W - 14, top + 14], [W - 14, mid - 12], [W * 0.47, mid + 6]], () => {
          this.inicioField(ctx, S, { camX: 400, horizon: top + stageH * 0.3, simple: true, sunX: W * 0.95 });
          this.drawRadialSpeedLines(ctx, W * 0.75, top + stageH * 0.26, W, '#fff7ed', 0.22);
          const gs = lerp(300, 420, E(seg(t, 10, 150)));
          this.cineRim(ctx, this.cineChar('fukaku', KEEPER), W * 0.75, mid + gs * 0.35, gs, { animState: 'run', frame: S.f }, '#fdba74', 1);
        }, { dx: (1 - kB) * W * 0.5 });
      }
      // Painel C: o Tada livre, braço pra cima
      const kC = E(seg(t, 46, 62));
      if (kC > 0) {
        this.cinePanel(ctx, [[W * 0.47, mid + 18], [W - 14, mid + 2], [W - 14, bot - 14], [W * 0.44, bot - 14]], () => {
          this.inicioField(ctx, S, { camX: 900, horizon: mid + 60, simple: true, sunX: W * 0.5 });
          this.drawSpeedLines(ctx, W, S.H, '#fff7ed', 0.12);
          this.cineRim(ctx, c.tada, W * 0.66, bot + 120, 360, { animState: 'call_pass', flipX: true, frame: S.f }, '#fdba74', 1);
          this.cineImpactText(ctx, 'PASSA PRA MIM!!', W * 0.84, mid + 70, 40, '#f8fafc', seg(t, 58, 68), W * 0.3, -0.06);
        }, { dy: (1 - kC) * stageH * 0.6 });
      }
      // Painel A: close nos seus olhos (o coração batendo dá o pulso no quadro)
      ctx.save();
      ctx.translate(W * 0.24, mid);
      ctx.scale(beat, beat);
      ctx.translate(-W * 0.24, -mid);
      this.cinePanel(ctx, [[14, top + 14], [W * 0.49, top + 14], [W * 0.43, bot - 14], [14, bot - 14]], () => {
        this.cineGradient(ctx, 0, top, W * 0.5, stageH, [[0, '#4c2a5e'], [1, '#e0794a']]);
        this.cineGlow(ctx, W * 0.4, top + stageH * 0.4, 260, 'rgba(255,190,110,0.7)', 0.8);
        const eyeY = top + stageH * 0.46;
        const size = 820;
        const cx = W * 0.23;
        const h = this.cineHead(ctx, c.you, cx, eyeY + Math.sin(t * 0.05) * 3, size);
        // Lado de fora do rosto na sombra
        const sh = ctx.createLinearGradient(0, 0, W * 0.45, 0);
        sh.addColorStop(0, 'rgba(10,6,30,0.75)');
        sh.addColorStop(0.55, 'rgba(10,6,30,0)');
        ctx.fillStyle = sh;
        ctx.fillRect(0, top, W * 0.5, stageH);
        const look = t < 92 ? 0 : 2;
        this.inicioEyes(ctx, cx, eyeY + Math.sin(t * 0.05) * 3, h.u, { ring: c.you.eyeColor || '#ef4444', look, tiny: t > 92 && t < 110 });
        // Gota de suor descendo pela têmpora
        const dy = (t % 90) * 1.4;
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(cx + 6.6 * h.u, eyeY - 2 * h.u + dy, h.u * 0.5, h.u * 0.8);
        ctx.fillRect(cx + 6.75 * h.u, eyeY - 2.4 * h.u + dy, h.u * 0.2, h.u * 0.4);
      });
      ctx.restore();
      if (t > 96) this.cineImpactText(ctx, 'TUM... TUM...', W * 0.25, bot - 60, 34, '#fca5a5', seg(t, 96, 106), 0, -0.05);
    },

    // PLANO 3: o passe — chicote de câmera acompanhando a bola até o Tada, que chuta torto
    inicioPro2(ctx, S, c) {
      const { W, H, t, top, stageH } = S;
      const groundY = top + stageH * 0.9;
      const youWX = 420;
      const tadaWX = 1640;
      const pan = EIO(seg(t, 24, 80));
      const camC = lerp(680, 1460, pan) + seg(t, 96, 140) * 80;
      const ox = camC - W / 2;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.04, shake: 1.2 });
      this.inicioField(ctx, S, { camX: ox * 1.0, horizon: top + stageH * 0.52 });
      const panSpeed = Math.sin(seg(t, 24, 80) * Math.PI);
      if (panSpeed > 0.05) this.drawSpeedLines(ctx, W, H, '#fff7ed', 0.22 * panSpeed);
      const size = 330;
      // Você: toque de lado
      const yState = t < 14 ? 'windup' : t < 34 ? 'shoot' : 'idle';
      this.inicioShadow(ctx, youWX - ox, groundY, 70, 0.35, -30);
      this.cineRim(ctx, c.you, youWX - ox, groundY, size, { animState: yState, frame: S.f }, '#fdba74', 1);
      // O Tada chegando de frente pra bola
      const tState = t < 84 ? 'run' : t < 96 ? 'windup' : t < 124 ? 'shoot' : 'idle';
      const tx = tadaWX - ox - (t < 84 ? (84 - t) * 1.5 : 0);
      this.inicioShadow(ctx, tx, groundY, 70, 0.35, -30);
      this.cineRim(ctx, c.tada, tx, groundY, size, { animState: tState, frame: S.f }, '#fdba74', 1);
      // A bola
      let bx;
      let by = groundY - 14;
      if (t < 18) bx = youWX + 70;
      else if (t < 90) bx = lerp(youWX + 80, tadaWX + 50, E(seg(t, 18, 90)));
      else {
        const k = t - 96;
        bx = tadaWX + 60 + Math.max(0, k) * 17;
        by = groundY - 14 - Math.max(0, k) * 5 + Math.sin(Math.max(0, k) * 0.12) * 30;
        if (k > 0) this.inicioStreak(ctx, bx - ox - 120, by + 10, bx - ox - 14, by, 10, 'rgba(255,255,255,0.55)');
      }
      if (t >= 18 && t < 90) this.inicioStreak(ctx, bx - ox - 160 * Math.sin(seg(t, 18, 90) * Math.PI), by, bx - ox - 14, by, 8, 'rgba(255,255,255,0.6)');
      this.drawAnimeBall(ctx, bx - ox, by, 14, 'rgba(255,214,150,0.4)', S.f);
      ctx.restore();
      if (t > 96) this.cineImpactText(ctx, 'TOC...', W * 0.84, top + stageH * 0.74, 54, '#cbd5e1', seg(t, 96, 106), 0, 0.12);
      this.cineSfx(S, 16, 'pass', () => window.SFX?.pass());
      this.cineSfx(S, 96, 'kick', () => window.SFX?.kick(0.5));
    },

    // PLANO 4: câmera atrás do gol — a bola vem em câmera lenta, curva... e explode na trave
    inicioPro3(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const hit = 72;
      const freeze = 24;
      const tt = t < hit ? t : t < hit + freeze ? hit : t - freeze;
      const groundY = top + stageH * 0.94;
      const postX = W * 0.72;
      const postW = 40;
      const impY = top + stageH * 0.4;
      const after = Math.max(0, tt - hit);
      const shake = t >= hit ? 16 * Math.max(0, 1 - (t - hit) / 40) : 0;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.06 + (t < hit ? seg(t, 0, hit) * 0.08 : 0.08), shake });
      this.inicioField(ctx, S, { camX: 250, horizon: top + stageH * 0.46, sunX: W * 0.9 });
      // Goleiro voando pro outro lado, batido (de costas pra câmera)
      const kd = E(seg(tt, 6, 90));
      const gkX = lerp(W * 0.48, W * 0.24, kd);
      const gkY = groundY - 40 - Math.sin(Math.min(1, kd * 1.2) * Math.PI) * 70 + kd * 30;
      this.inicioShadow(ctx, gkX, groundY - 10, 90, 0.3);
      this.drawSpriteDim(ctx, this.cineChar('fukaku', KEEPER), gkX, gkY, 360, { animState: 'dive', facing: 'back', flipX: true, frame: 4 }, 0.25, '40,20,60');
      // Travessão e trave (cilindro: degradê de branco a cinza)
      const pg = ctx.createLinearGradient(postX - postW / 2, 0, postX + postW / 2, 0);
      pg.addColorStop(0, '#cbd5e1');
      pg.addColorStop(0.35, '#ffffff');
      pg.addColorStop(1, '#94a3b8');
      const vib = t >= hit ? Math.sin((t - hit) * 2.2) * 6 * Math.max(0, 1 - (t - hit) / 45) : 0;
      ctx.fillStyle = pg;
      ctx.fillRect(postX - postW / 2 + vib, top - 40, postW, groundY - top + 40);
      const cb = ctx.createLinearGradient(0, top + 34, 0, top + 70);
      cb.addColorStop(0, '#ffffff');
      cb.addColorStop(1, '#94a3b8');
      ctx.fillStyle = cb;
      ctx.fillRect(-60, top + 34, postX + postW / 2 + 60 + vib, 36);
      // Bola: vem de longe, curva pra fora e bate na trave
      let bx;
      let by;
      let br;
      if (tt < hit) {
        const k = E(seg(tt, 0, hit));
        const p0 = [W * 0.46, top + stageH * 0.5];
        const p1 = [W * 0.36, top + stageH * 0.18];
        const p2 = [postX - postW / 2 - 26, impY];
        bx = (1 - k) * (1 - k) * p0[0] + 2 * (1 - k) * k * p1[0] + k * k * p2[0];
        by = (1 - k) * (1 - k) * p0[1] + 2 * (1 - k) * k * p1[1] + k * k * p2[1];
        br = lerp(6, 30, k * k);
      } else {
        bx = postX - postW / 2 - 26 - after * 22;
        by = impY + after * 7 + after * after * 0.25;
        br = Math.max(10, 30 - after * 0.5);
      }
      if (tt < hit) this.inicioStreak(ctx, bx - (bx - W * 0.46) * 0.3, by - (by - top - stageH * 0.5) * 0.3, bx, by, br * 0.9, 'rgba(255,255,255,0.45)');
      this.drawAnimeBall(ctx, bx, by, br, 'rgba(255,214,150,0.45)', tt);
      // Ondas da pancada na trave
      if (t >= hit) {
        const k = (t - hit) / 50;
        ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.8 - k)})`;
        ctx.lineWidth = 5;
        for (let r = 0; r < 3; r++) {
          ctx.beginPath();
          ctx.arc(postX - postW / 2, impY, 30 + r * 34 + k * 120, -Math.PI * 0.8, Math.PI * 0.8, true);
          ctx.stroke();
        }
      }
      // Rede de trás do gol em primeiro plano (a câmera está atrás do gol)
      ctx.strokeStyle = 'rgba(241,245,249,0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -200; x < W + 200; x += 64) {
        ctx.moveTo(x, top - 40);
        ctx.lineTo(x + 200, bot + 40);
        ctx.moveTo(x + 200, top - 40);
        ctx.lineTo(x, bot + 40);
      }
      ctx.stroke();
      ctx.restore();
      // Congelado no impacto: tom azul e linhas de foco (um flash só)
      if (t >= hit && t < hit + freeze) {
        ctx.fillStyle = 'rgba(30,58,138,0.32)';
        ctx.fillRect(0, top, W, stageH);
        this.drawRadialSpeedLines(ctx, postX - postW / 2, impY, W, '#020617', 0.5);
      }
      this.cineFlash(ctx, W, H, t >= hit ? 0.85 * (1 - (t - hit) / 8) : 0);
      if (t >= hit) this.cineImpactText(ctx, 'CLANG!!', W * 0.42, top + stageH * 0.3, 120, '#f8fafc', seg(t, hit, hit + 8), W * 0.6, -0.1);
      this.cineSfx(S, hit, 'post', () => window.SFX?.post());
    },

    // PLANO 5: fim de jogo — você de costas, eles comemorando lá longe; a tela racha
    inicioPro4(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const push = E(seg(t, 0, 150));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 - push * 40, y: H / 2 + push * 10, zoom: 1 + push * 0.1 });
      const hz = this.inicioField(ctx, S, { camX: 600, horizon: top + stageH * 0.5, dusk: 0.55 + push * 0.3, sunX: W * 0.8 });
      // Eles comemorando lá longe
      for (let i = 0; i < 4; i++) {
        const x = W * (0.58 + i * 0.1);
        const jump = Math.abs(Math.sin(t * 0.16 + i * 1.3)) * 22;
        this.drawSilhouette(ctx, this.cineChar(['ishikari', 'shiguma', 'tanaka', 'sokura', 'ishikari'][i], MATSUKAZE), x, hz + 64 - jump, 110, { animState: i % 2 ? 'call_pass' : 'idle', frame: 4, flipX: i % 2 === 0 }, '#3b2a4f');
      }
      // O Tada de cabeça baixa no meio do caminho
      this.drawSilhouette(ctx, c.tada, W * 0.2, hz + 150, 190, { animState: 'idle', frame: 4 }, '#241a3a');
      // Você, de costas
      const yx = W * 0.4;
      const feet = bot + 130;
      this.drawSpriteDim(ctx, c.you, yx, feet, 540, { animState: 'idle', facing: 'back', frame: 4 }, 0.5, '15,10,40');
      ctx.restore();
      this.inicioScore(ctx, W / 2 - 200, top + 18, 'ICHINAN', 0, 'MATSUKAZE', 1, 'FIM', seg(t, 4, 16), 1);
      if (t > 40) this.cineImpactText(ctx, 'ELIMINADOS.', W * 0.7, top + stageH * 0.3, 72, '#cbd5e1', seg(t, 40, 54), W * 0.5, -0.04);
      // A rachadura sai da sua cabeça (o ego quebrando a casca)
      if (t >= 112) {
        const sh = this.getShards(W, H, yx, top + stageH * 0.5);
        this.drawCracks(ctx, sh, Math.min(sh.rings, 1 + Math.floor((t - 112) / 5)));
        this.cineFlash(ctx, W, H, 0.7 * (1 - (t - 112) / 6));
        this.cineImpactText(ctx, 'CRACK', W * 0.2, top + stageH * 0.22, 64, '#f8fafc', seg(t, 112, 120), 0, -0.12);
      }
      this.cineSfx(S, 4, 'whistle', () => window.SFX?.whistle(3));
      this.cineSfx(S, 112, 'crack', () => window.SFX?.tackle());
    },

    // PLANO 6: a sala de monitores — o Ego parado no replay do passe; os óculos brilham
    inicioPro5(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const ego = this.getSpeakerCharData('JINPACHI EGO');
      const cut = 84;
      if (t < cut) {
        const push = EIO(seg(t, 0, cut));
        const mx = W * 0.4;
        const my = top + stageH * 0.38;
        ctx.save();
        this.cineCamera(ctx, W, H, { x: lerp(W / 2, mx, push * 0.6), y: lerp(H / 2, my, push * 0.4), zoom: 1 + push * 0.22 });
        ctx.fillStyle = '#02050c';
        ctx.fillRect(-40, top - 40, W + 80, stageH + 80);
        // Parede de monitores
        for (let r = 0; r < 4; r++) {
          for (let i = 0; i < 7; i++) {
            const x = 20 + i * 180;
            const y = top + 16 + r * 112;
            if (x + 170 > W * 0.18 && x < W * 0.62 && y < top + stageH * 0.62 && y + 100 > top + 30) continue;
            ctx.fillStyle = '#071226';
            ctx.fillRect(x, y, 168, 100);
            ctx.fillStyle = 'rgba(56,189,248,0.25)';
            for (let k = 0; k < 4; k++) ctx.fillRect(x + 12, y + 16 + k * 20, 140 * (0.3 + 0.7 * Math.abs(Math.sin(i * 3 + r * 7 + k + t * 0.02))), 6);
            ctx.strokeStyle = 'rgba(34,211,238,0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, 168, 100);
          }
        }
        // Monitor grande: o replay pausado no passe
        const sx = W * 0.18;
        const sy = top + 30;
        const sw = W * 0.44;
        const sh = stageH * 0.58;
        this.cineGlow(ctx, sx + sw / 2, sy + sh / 2, sw * 0.5, 'rgba(56,189,248,0.35)', 1);
        ctx.save();
        ctx.beginPath();
        ctx.rect(sx, sy, sw, sh);
        ctx.clip();
        this.cineGradient(ctx, sx, sy, sw, sh, [[0, '#5b6b2a'], [1, '#1f3a10']]);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx + sw * 0.62, sy + sh * 0.2, sw * 0.5, sh * 0.6);
        this.drawSprite(ctx, c.you, sx + sw * 0.28, sy + sh * 0.82, 150, { animState: 'shoot', frame: 4 });
        this.drawSprite(ctx, c.tada, sx + sw * 0.72, sy + sh * 0.72, 120, { animState: 'call_pass', flipX: true, frame: 4 });
        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx + sw * 0.36, sy + sh * 0.8);
        ctx.lineTo(sx + sw * 0.66, sy + sh * 0.72);
        ctx.stroke();
        ctx.setLineDash([]);
        this.drawAnimeBall(ctx, sx + sw * 0.4, sy + sh * 0.79, 7, 'rgba(255,255,255,0.2)', 0);
        // Círculo vermelho em você
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sx + sw * 0.28, sy + sh * 0.5, 62 + Math.sin(t * 0.15) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        for (let y = sy; y < sy + sh; y += 4) ctx.fillRect(sx, y, sw, 2);
        ctx.font = '900 16px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText("❚❚  REPLAY  •  89:41  •  ICHINAN x MATSUKAZE", sx + 14, sy + 12);
        ctx.restore();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 4;
        ctx.strokeRect(sx, sy, sw, sh);
        // A mesa e o Ego de costas, recortado pela luz dos monitores
        ctx.fillStyle = '#050b16';
        ctx.fillRect(-100, top + stageH * 0.78, W + 200, stageH);
        const ex = W * 0.72;
        const feet = bot + 120;
        this.drawSilhouette(ctx, ego, ex - 5, feet, 470, { facing: 'back', frame: 4 }, '#22d3ee');
        this.drawSilhouette(ctx, ego, ex + 3, feet, 470, { facing: 'back', frame: 4 }, '#0e7490');
        this.drawSilhouette(ctx, ego, ex, feet + 2, 470, { facing: 'back', frame: 4 }, '#02040a');
        // A haste dos óculos pegando a luz do monitor, do lado da cabeça
        const eu = 470 / 36;
        const ey = feet + 2 - 470 * 0.87 + 9.4 * eu;
        ctx.fillStyle = '#a5f3fc';
        ctx.fillRect(ex - 7.2 * eu, ey, 1.6 * eu, 0.45 * eu);
        ctx.fillRect(ex - 7.6 * eu, ey - 0.2 * eu, 0.5 * eu, 0.8 * eu);
        ctx.restore();
        return;
      }
      // Corte: o rosto do Ego na luz azul, os óculos brancos de reflexo
      const k = t - cut;
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, top, W, stageH);
      const size = 800;
      const u = size / 36;
      const cx = W * 0.62;
      const eyeY = top + stageH * 0.4 + (1 - E(seg(k, 0, 60))) * 20;
      this.cineGlow(ctx, W * 0.2, eyeY, 380, 'rgba(34,211,238,0.35)', 1);
      const h = this.cineHead(ctx, ego, cx, eyeY, size, { frame: 4 });
      // Luz azul do lado do monitor, sombra do outro lado
      const side = ctx.createLinearGradient(cx - 9 * u, 0, cx + 9 * u, 0);
      side.addColorStop(0, 'rgba(34,211,238,0.22)');
      side.addColorStop(0.45, 'rgba(2,4,10,0)');
      side.addColorStop(1, 'rgba(2,4,10,0.85)');
      ctx.fillStyle = side;
      ctx.fillRect(0, top, W, stageH);
      // Lentes viram espelho branco, com o brilho correndo
      const lensY = h.top + 9.2 * u;
      [12.4, 19.4].forEach((gx) => {
        const lx = cx + (gx + 0.7 - 18) * u;
        ctx.fillStyle = 'rgba(224,242,254,0.92)';
        ctx.fillRect(lx, lensY, 2.8 * u, 2.2 * u);
        ctx.save();
        ctx.beginPath();
        ctx.rect(lx, lensY, 2.8 * u, 2.2 * u);
        ctx.clip();
        const gx2 = lx + lerp(-2 * u, 5 * u, seg(k, 10, 40));
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(gx2, lensY);
        ctx.lineTo(gx2 + u, lensY);
        ctx.lineTo(gx2 - 0.2 * u, lensY + 2.2 * u);
        ctx.lineTo(gx2 - 1.2 * u, lensY + 2.2 * u);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(56,189,248,0.35)';
        ctx.fillRect(lx, lensY + 1.6 * u, 2.8 * u, 0.6 * u);
        ctx.restore();
      });
      // Canto da boca subindo (o sorriso de lado)
      if (k > 30) {
        ctx.fillStyle = '#5b4636';
        ctx.fillRect(cx + 1.3 * u, h.top + 12.1 * u, 0.8 * u, 0.4 * u);
      }
      // Escurece embaixo para o letreiro
      this.cineGradient(ctx, 0, top + stageH * 0.55, W, stageH * 0.45, [[0, 'rgba(2,4,10,0)'], [1, 'rgba(2,4,10,0.92)']]);
      this.cineTitleCard(ctx, W, top + stageH * 0.8, seg(k, 34, 64), { kicker: 'CONVOCAÇÃO', title: 'PROJETO BLUE LOCK', sub: 'O seu ego começa agora.', color: '#00f5d4' });
    },

    // ======================================================================
    // 2) A PORTA DO BLUE LOCK
    // ======================================================================
    inicioDoorScene(ctx, S) {
      const you = this.cineYou();
      [this.inicioDoor0, this.inicioDoor1, this.inicioDoor2, this.inicioDoor3][S.phase]?.call(this, ctx, S, you);
    },

    // PLANO 1: a porta gigante, o Ego no pedestal, os 300 atrás de você
    inicioDoor0(ctx, S, you) {
      const { W, H, t, top, bot, stageH } = S;
      const push = EIO(seg(t, 0, 150));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2 - push * 20, zoom: 1 + push * 0.1, shake: 1 });
      this.cineGradient(ctx, -40, top - 40, W + 80, stageH + 80, [[0, '#020617'], [0.6, '#06122b'], [1, '#0b1d3f']]);
      const dw = W * 0.34;
      const dh = stageH * 0.74;
      const dy = top + stageH * 0.08;
      this.cineShafts(ctx, W / 2, dy + dh * 0.5, Math.PI / 2, stageH, 0.9, 5, '125,211,252', 0.1, t);
      this.inicioDoor(ctx, W / 2, dy, dw, dh, 0, t, t * 0.01);
      // Chão brilhante refletindo a fenda
      this.cineGradient(ctx, -40, dy + dh, W + 80, bot - dy - dh + 50, [[0, '#0b1d3f'], [1, '#020617']]);
      ctx.fillStyle = 'rgba(165,243,252,0.35)';
      ctx.fillRect(W / 2 - 2, dy + dh, 4, bot - dy - dh);
      // O Ego no canto, de pé num foco de luz
      const ego = this.getSpeakerCharData('JINPACHI EGO');
      const ex = W * 0.2;
      const cone = ctx.createLinearGradient(0, top, 0, dy + dh);
      cone.addColorStop(0, 'rgba(191,219,254,0.22)');
      cone.addColorStop(1, 'rgba(191,219,254,0.04)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(ex - 20, top - 80);
      ctx.lineTo(ex + 20, top - 80);
      ctx.lineTo(ex + 110, dy + dh);
      ctx.lineTo(ex - 110, dy + dh);
      ctx.closePath();
      ctx.fill();
      this.drawSpriteDim(ctx, ego, ex, dy + dh + 4, 230, { animState: 'idle', frame: 4 }, 0.2, '20,40,90');
      if (t > 70 && t < 96) {
        const u = 230 / 36;
        const gy = dy + dh + 4 - 230 * 0.87 + 9.2 * u;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        [12.4, 19.4].forEach((gx) => ctx.fillRect(ex + (gx + 0.7 - 18) * u, gy, 2.8 * u, 2.2 * u));
      }
      // Os 300 atrás (primeiro plano, de costas) e você dando o primeiro passo
      const crowd = this.inicioCrowdCv(W, stageH * 0.36, 0, 5, 5, 'door');
      ctx.drawImage(crowd, -120 + push * 30, bot - stageH * 0.3);
      const step = E(seg(t, 50, 150));
      this.cineRim(ctx, you, W * 0.62, bot + 110 - step * 40, 400 - step * 50, { facing: 'back', frame: 4 }, '#67e8f9', -1);
      ctx.restore();
    },

    // PLANO 2: close nos olhos — a fenda de luz cortando o rosto, o olhar fecha
    inicioDoor1(ctx, S, you) {
      const { W, t, top, stageH } = S;
      ctx.fillStyle = '#01030a';
      ctx.fillRect(0, top, W, stageH);
      const bandTop = top + stageH * 0.2;
      const bandH = stageH * 0.5;
      const eyeY = bandTop + bandH * 0.52;
      const size = 860;
      const drift = (t - 60) * 0.4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, bandTop, W, bandH);
      ctx.clip();
      ctx.fillStyle = '#04112a';
      ctx.fillRect(0, bandTop, W, bandH);
      const h = this.cineHead(ctx, you, W / 2 + drift, eyeY, size);
      ctx.fillStyle = 'rgba(2,8,30,0.5)';
      ctx.fillRect(0, bandTop, W, bandH);
      // A fenda da porta refletida: uma lâmina de luz ciano no meio do rosto
      const lx = W / 2 + drift - 0.4 * h.u + Math.sin(t * 0.04) * 6;
      const g = ctx.createLinearGradient(lx - 70, 0, lx + 70, 0);
      g.addColorStop(0, 'rgba(34,211,238,0)');
      g.addColorStop(0.5, 'rgba(165,243,252,0.42)');
      g.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 70, bandTop, 140, bandH);
      const lid = t < 60 ? 0 : t < 70 ? 1 : 2;
      this.inicioEyes(ctx, W / 2 + drift, eyeY, h.u, { ring: '#22d3ee', iris: '#020617', lid, look: t > 30 ? 0 : -1 });
      ctx.restore();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 5;
      ctx.strokeRect(-4, bandTop, W + 8, bandH);
      if (t > 66) this.cineImpactText(ctx, 'SEM OLHAR PRA TRÁS.', W / 2, bandTop + bandH + 70, 52, '#a5f3fc', seg(t, 66, 78), W * 0.8);
      if (t > 10) {
        ctx.save();
        ctx.globalAlpha = seg(t, 10, 30);
        ctx.font = '900 15px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.fillText('— QUEM PASSAR POR ELA NÃO VOLTA ATRÁS —', W / 2, bandTop - 26);
        ctx.restore();
      }
    },

    // PLANO 3: atrás de você — a tranca gira, as folhas se abrem, a luz engole tudo
    inicioDoor2(ctx, S, you) {
      const { W, H, t, top, bot, stageH } = S;
      const open = EIO(seg(t, 44, 110));
      const shake = t > 40 && t < 112 ? 3 : 0;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.12 + seg(t, 0, 170) * 0.06, shake });
      ctx.fillStyle = '#020617';
      ctx.fillRect(-40, top - 40, W + 80, stageH + 80);
      const dw = W * 0.6;
      const dh = stageH * 0.96;
      const dy = top + stageH * 0.02;
      this.inicioDoor(ctx, W / 2, dy, dw, dh, open, t, E(seg(t, 0, 40)) * Math.PI * 1.5);
      if (open > 0) {
        this.cineShafts(ctx, W / 2, dy + dh * 0.5, Math.PI / 2, stageH * 0.8, 2.6, 6, '207,250,254', 0.22 * open, t);
        this.cineGlow(ctx, W / 2, dy + dh * 0.5, 420 * open, 'rgba(207,250,254,0.9)', open);
        this.cineDust(ctx, W, H, t, 40, 'rgba(224,242,254,0.8)', 5);
      }
      // Você entrando na luz (silhueta), cada vez menor
      const walk = EIO(seg(t, 84, 170));
      const size = lerp(480, 260, walk);
      const feet = lerp(bot + 250, dy + dh + 10, walk);
      const wx = lerp(W * 0.16, W / 2 + 10, walk);
      if (open > 0.2) {
        this.drawSilhouette(ctx, you, wx - 3, feet, size, { facing: 'back', frame: 4 }, '#a5f3fc');
        this.drawSilhouette(ctx, you, wx + 3, feet, size, { facing: 'back', frame: 4 }, '#a5f3fc');
      }
      this.drawSilhouette(ctx, you, wx, feet + 2, size, { facing: 'back', frame: 4 }, '#020617');
      ctx.restore();
      this.cineFlash(ctx, W, H, t >= 108 ? 0.75 * (1 - (t - 108) / 14) : 0, '#e0f2fe');
      this.cineSfx(S, 40, 'unlock', () => window.SFX?.tackle());
      this.cineSfx(S, 46, 'open', () => window.SFX?.whoosh());
    },

    // PLANO 4: contraplano — o corredor do Blue Lock e o letreiro
    inicioDoor3(ctx, S, you) {
      const { W, H, t, top, bot, stageH } = S;
      const back = E(seg(t, 0, 150));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.16 - back * 0.14 });
      const vx = W / 2;
      const vy = top + stageH * 0.52;
      ctx.fillStyle = '#06101f';
      ctx.fillRect(-40, top - 40, W + 80, stageH + 80);
      const quad = (pts, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
      };
      const L = -120;
      const R = W + 120;
      const T = top - 100;
      const B = bot + 100;
      quad([[L, T], [vx - 80, vy - 60], [vx - 80, vy + 70], [L, B]], '#0b1a33');
      quad([[R, T], [vx + 80, vy - 60], [vx + 80, vy + 70], [R, B]], '#0b1a33');
      quad([[L, T], [R, T], [vx + 80, vy - 60], [vx - 80, vy - 60]], '#081428');
      quad([[L, B], [R, B], [vx + 80, vy + 70], [vx - 80, vy + 70]], '#10284a');
      // Fim do corredor: a luz da porta atrás de você
      this.cineGlow(ctx, vx, vy, 300, 'rgba(207,250,254,0.9)', 1);
      ctx.fillStyle = '#ecfeff';
      ctx.fillRect(vx - 80, vy - 60, 160, 130);
      // Faixas de luz nas paredes correndo pro fundo
      ctx.strokeStyle = 'rgba(56,189,248,0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      [[L, top + stageH * 0.12, vx - 80, vy - 30], [R, top + stageH * 0.12, vx + 80, vy - 30], [L, top + stageH * 0.86, vx - 80, vy + 40], [R, top + stageH * 0.86, vx + 80, vy + 40]].forEach(([x1, y1, x2, y2]) => {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      });
      ctx.stroke();
      // Portas laterais numeradas
      ctx.fillStyle = 'rgba(56,189,248,0.18)';
      [0.2, 0.45, 0.68].forEach((k) => {
        const x = lerp(L, vx - 80, k);
        const hh = lerp(B - T, 130, k) * 0.45;
        ctx.fillRect(x, vy + 70 * (1 - k) - hh * 0.2, 26 * (1 - k * 0.8), hh);
        ctx.fillRect(W - x - 26 * (1 - k * 0.8), vy + 70 * (1 - k) - hh * 0.2, 26 * (1 - k * 0.8), hh);
      });
      // Reflexo no chão
      this.cineGlow(ctx, vx, vy + 180, 300, 'rgba(56,189,248,0.4)', 0.7);
      // Você vindo pela luz, de frente, contorno ciano
      const fy = bot + 70 + Math.abs(Math.sin(t * 0.12)) * 4;
      const sz = 400;
      this.drawSilhouette(ctx, you, W / 2 - 4, fy, sz, { animState: 'idle', frame: 4 }, '#67e8f9');
      this.drawSilhouette(ctx, you, W / 2 + 4, fy, sz, { animState: 'idle', frame: 4 }, '#67e8f9');
      this.drawSpriteDim(ctx, you, W / 2, fy, sz, { animState: 'idle', frame: 4 }, 0.55, '6,16,40');
      ctx.restore();
      this.cineGradient(ctx, 0, top, W, stageH * 0.42, [[0, 'rgba(2,6,23,0.9)'], [1, 'rgba(2,6,23,0)']]);
      this.cineTitleCard(ctx, W, top + stageH * 0.22, seg(t, 40, 70), { kicker: 'PRÉDIO 5 • QUARTO Z', title: 'BEM-VINDO AO BLUE LOCK', sub: `${name()} • 299º de 300 no ranking`, color: '#00f5d4' });
    },

    // ======================================================================
    // 3) O DISCURSO DO EGO PARA OS 300
    // ======================================================================
    inicioEgoScene(ctx, S) {
      const you = this.cineYou();
      const ego = this.getSpeakerCharData('JINPACHI EGO');
      [this.inicioEgo0, this.inicioEgo1, this.inicioEgo2, this.inicioEgo3, this.inicioEgo4][S.phase]?.call(this, ctx, S, you, ego);
    },

    // PLANO 1: o auditório escuro, o holofote varrendo as cabeças, o contador
    inicioEgo0(ctx, S, you) {
      const { W, H, t, top, bot, stageH } = S;
      // Primeiro quadro (ainda no preto do fade): deixa prontos os caches dos planos seguintes
      if (t < 1) {
        this.inicioCrowdCv(W, stageH * 0.78, 9, 11, 11, 'audF2');
        if (!this._inicioWarm) this._inicioWarm = document.createElement('canvas').getContext('2d');
        this.drawFaceShadow(this._inicioWarm, this.getSpeakerCharData('JINPACHI EGO'), 0, 0, 660, { animState: 'idle', frame: 4 }, 0.5, 11.6, 12.4);
      }
      const pan = EIO(seg(t, 0, 170));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 + pan * 50, y: H / 2, zoom: 1.02 + pan * 0.08 });
      this.cineGradient(ctx, -40, top - 40, W + 80, stageH + 80, [[0, '#01030a'], [0.4, '#04102a'], [1, '#020617']]);
      // Palco ao fundo, telão apagado
      ctx.fillStyle = '#071733';
      ctx.fillRect(W * 0.25, top + 20, W * 0.5, stageH * 0.26);
      ctx.strokeStyle = 'rgba(34,211,238,0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(W * 0.25, top + 20, W * 0.5, stageH * 0.26);
      ctx.font = 'italic 900 46px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(34,211,238,${0.18 + 0.06 * Math.sin(t * 0.1)})`;
      ctx.fillText('BLUE LOCK', W / 2, top + 20 + stageH * 0.13);
      const back = this.inicioCrowdCv(W, stageH * 0.78, 0, 7, 11, 'audB');
      const front = this.inicioCrowdCv(W, stageH * 0.78, 7, 11, 11, 'audF');
      const cy = top + stageH * 0.3;
      ctx.drawImage(back, -120 - pan * 30, cy);
      // Você no meio da plateia (de costas); o holofote termina em você
      const yx = W * 0.6;
      const sweep = t < 110 ? W * (0.5 + 0.38 * Math.sin(t * 0.035 - 0.6)) : lerp(W * (0.5 + 0.38 * Math.sin(110 * 0.035 - 0.6)), yx, EIO(seg(t, 110, 145)));
      const lit = Math.max(0, 1 - Math.abs(sweep - yx) / 160);
      ctx.drawImage(front, -120 - pan * 50, cy);
      if (lit > 0.05) {
        ctx.save();
        ctx.globalAlpha = lit;
        this.drawSilhouette(ctx, you, yx - 4, bot + 70, 260, { facing: 'back', frame: 4 }, '#bfdbfe');
        this.drawSilhouette(ctx, you, yx + 4, bot + 70, 260, { facing: 'back', frame: 4 }, '#bfdbfe');
        ctx.restore();
      }
      this.drawSpriteDim(ctx, you, yx, bot + 70, 260, { facing: 'back', frame: 4 }, 0.78 - lit * 0.6, '4,10,30');
      // Cone do holofote com poeira
      const g = ctx.createLinearGradient(0, top - 80, 0, bot);
      g.addColorStop(0, 'rgba(191,219,254,0.32)');
      g.addColorStop(1, 'rgba(191,219,254,0.04)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 14, top - 80);
      ctx.lineTo(W / 2 + 14, top - 80);
      ctx.lineTo(sweep + 140, bot + 40);
      ctx.lineTo(sweep - 140, bot + 40);
      ctx.closePath();
      ctx.fill();
      this.cineGlow(ctx, sweep, bot - 40, 200, 'rgba(191,219,254,0.35)', 0.8);
      ctx.restore();
      this.cineDust(ctx, W, H, t, 30, 'rgba(191,219,254,0.5)', 9);
      // Contador
      const n = Math.min(300, Math.floor(E(seg(t, 4, 90)) * 300));
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = 'italic 900 70px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(String(n).padStart(3, '0'), 36, top + 86);
      ctx.font = '900 16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('ATACANTES SUB-18 CONVOCADOS', 40, top + 112);
      ctx.restore();
      // Murmúrios soltos no escuro
      [['"Seleção sub-18...?"', 0.76, 0.34, 30], ['"Por que só atacantes?"', 0.2, 0.5, 60], ['"Quem chamou a gente?"', 0.82, 0.62, 90]].forEach(([txt, fx, fy, at]) => {
        const k = seg(t, at, at + 12) * (1 - seg(t, at + 50, at + 64));
        if (k <= 0) return;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.font = 'italic 700 20px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(txt, W * fx, top + stageH * fy - k * 6);
        ctx.restore();
      });
    },

    // PLANO 2: o holofote acende em cima do Ego; "EGOÍSTA" gigante atrás dele
    inicioEgo1(ctx, S, you, ego) {
      const { W, H, t, top, bot, stageH } = S;
      const on = t >= 18;
      const tilt = EIO(seg(t, 18, 200));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2 + 40 - tilt * 60, zoom: 1.04 + tilt * 0.08 });
      ctx.fillStyle = '#01030a';
      ctx.fillRect(-40, top - 40, W + 80, stageH + 100);
      const ex = W * 0.5;
      const feet = bot + 240;
      const size = 660;
      if (on) {
        // Telão atrás com o logo, aceso
        ctx.fillStyle = '#05142e';
        ctx.fillRect(W * 0.08, top - 40, W * 0.84, stageH * 0.7);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let y = top - 40; y < top + stageH * 0.66; y += 5) ctx.fillRect(W * 0.08, y, W * 0.84, 2);
        if (t < 120) {
          ctx.save();
          ctx.globalAlpha = 0.3 * (1 - seg(t, 100, 120));
          ctx.font = 'italic 900 120px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#22d3ee';
          ctx.fillText('BLUE LOCK', W / 2, top + stageH * 0.22);
          ctx.restore();
        }
        // A palavra gigante atrás dele
        const kw = E(seg(t, 110, 130));
        if (kw > 0) {
          ctx.save();
          ctx.globalAlpha = kw * 0.85;
          ctx.font = `italic 900 ${Math.round(250 - kw * 40)}px "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#22d3ee';
          ctx.strokeText('EGOÍSTA', W / 2, top + stageH * 0.3);
          ctx.restore();
        }
        // Cone de luz de cima
        const g = ctx.createLinearGradient(0, top - 80, 0, bot);
        g.addColorStop(0, 'rgba(224,242,254,0.4)');
        g.addColorStop(1, 'rgba(224,242,254,0.05)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(ex - 40, top - 100);
        ctx.lineTo(ex + 40, top - 100);
        ctx.lineTo(ex + 330, bot + 60);
        ctx.lineTo(ex - 330, bot + 60);
        ctx.closePath();
        ctx.fill();
        this.cineDust(ctx, W, H, t, 26, 'rgba(224,242,254,0.6)', 11);
        // O Ego: o rosto começa na sombra e aparece quando ele fala
        this.drawSprite(ctx, ego, ex, feet, size, { animState: 'idle', frame: 4 });
        this.drawFaceShadow(ctx, ego, ex, feet, size, { animState: 'idle', frame: 4 }, 0.95 * (1 - E(seg(t, 40, 90)) * 0.75), 11.6, 12.4);
        // Óculos acendendo
        const u = size / 36;
        const gy = feet - size * 0.87 + 9.2 * u;
        const gk = seg(t, 24, 30) * (1 - seg(t, 48, 70));
        if (gk > 0) {
          ctx.fillStyle = `rgba(255,255,255,${0.95 * gk})`;
          [12.4, 19.4].forEach((gx) => ctx.fillRect(ex + (gx + 0.7 - 18) * u, gy, 2.8 * u, 2.2 * u));
        }
      }
      // Cabeças da plateia em primeiro plano
      const front = this.inicioCrowdCv(W, stageH * 0.78, 9, 11, 11, 'audF2');
      ctx.drawImage(front, -120, bot - stageH * 0.42);
      ctx.restore();
      this.cineSfx(S, 18, 'spot', () => window.SFX?.kick(0.3));
    },

    // PLANO 3: os olhos do Ego atrás dos óculos (pupila minúscula)
    inicioEgo2(ctx, S, you, ego) {
      const { W, t, top, stageH } = S;
      ctx.fillStyle = '#01030a';
      ctx.fillRect(0, top, W, stageH);
      // Faixa estreita só com os olhos (o close mais apertado da cena)
      const open = E(seg(t, 0, 16));
      const bandH = stageH * 0.42 * open;
      const bandTop = top + stageH * 0.44 - bandH / 2;
      const size = 1120;
      const cx = W * 0.5 + (t - 55) * 0.35;
      const eyeY = top + stageH * 0.44 + 4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, bandTop, W, bandH);
      ctx.clip();
      ctx.fillStyle = '#04101f';
      ctx.fillRect(0, bandTop, W, bandH);
      this.cineGlow(ctx, W * 0.1, eyeY, 360, 'rgba(34,211,238,0.3)', 1);
      const h = this.cineHead(ctx, ego, cx, eyeY, size, { frame: 4 });
      const u = h.u;
      const sd = ctx.createLinearGradient(cx - 9 * u, 0, cx + 10 * u, 0);
      sd.addColorStop(0, 'rgba(34,211,238,0.16)');
      sd.addColorStop(0.5, 'rgba(1,3,10,0.1)');
      sd.addColorStop(1, 'rgba(1,3,10,0.9)');
      ctx.fillStyle = sd;
      ctx.fillRect(0, bandTop, W, bandH);
      // Olhos em pixel dentro das lentes, a pupila um ponto
      const ly = h.top + 10.35 * u;
      [-1, 1].forEach((s) => this.drawPixelEye(ctx, cx + s * 3.5 * u, ly, u * 0.235, { tiny: true, line: '#0b0b0f', iris: '#0b0b0f', ring: '#334155', look: s > 0 ? -1 : 0 }));
      // Brilho cruzando as lentes
      [12.4, 19.4].forEach((gx) => {
        const lx = cx + (gx + 0.7 - 18) * u;
        const ly0 = h.top + 9.2 * u;
        ctx.save();
        ctx.beginPath();
        ctx.rect(lx, ly0, 2.8 * u, 2.2 * u);
        ctx.clip();
        ctx.fillStyle = 'rgba(203,213,225,0.15)';
        ctx.fillRect(lx, ly0, 2.8 * u, 2.2 * u);
        const sx = lx + lerp(-2 * u, 5 * u, seg(t, 40, 80));
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.moveTo(sx, ly0);
        ctx.lineTo(sx + 0.8 * u, ly0);
        ctx.lineTo(sx - 0.3 * u, ly0 + 2.2 * u);
        ctx.lineTo(sx - 1.1 * u, ly0 + 2.2 * u);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, bandTop - 3, W, 3);
      ctx.fillRect(0, bandTop + bandH, W, 3);
      // Cartela com o nome (entra deslizando)
      const k = E(seg(t, 22, 40));
      if (k > 0) {
        const y = bandTop + bandH + 56;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.translate((1 - k) * -80, 0);
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(70, y - 28, 6, 62);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'italic 900 40px "Segoe UI", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('JINPACHI EGO', 92, y - 6);
        ctx.font = '800 15px "Segoe UI", sans-serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('DIRETOR DO PROJETO BLUE LOCK', 94, y + 24);
        ctx.restore();
      }
    },

    // PLANO 4: 300 bonecos; um a um eles apagam; sobra 1 — e a câmera mergulha nele
    inicioEgo3(ctx, S, you) {
      const { W, H, t, top, bot, stageH } = S;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, top, W, stageH);
      const cols = 25;
      const rows = 12;
      const youIdx = 8 * cols + 15;
      const fall = E(seg(t, 50, 170));
      const rnd = (i) => {
        const a = Math.sin(i * 127.1 + 7) * 43758.5453;
        return a - Math.floor(a);
      };
      const pos = (i) => {
        const r = Math.floor(i / cols);
        const cI = i % cols;
        const fr = r / (rows - 1);
        const sc = 0.55 + fr * 0.9;
        const y = top + stageH * (0.3 + Math.pow(fr, 1.2) * 0.6);
        const x = W / 2 + (cI - (cols - 1) / 2) * 40 * sc;
        return [x, y, sc];
      };
      const [yx, yy] = pos(youIdx);
      const dive = EIO(seg(t, 176, 220));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(W / 2, yx, dive), y: lerp(H / 2, yy - 12, dive), zoom: 1 + dive * 3.2 });
      let alive = 0;
      for (let i = 0; i < cols * rows; i++) {
        const [x, y, sc] = pos(i);
        const isYou = i === youIdx;
        const gone = !isYou && rnd(i) < fall;
        if (!gone) alive++;
        ctx.fillStyle = isYou ? '#00f5d4' : gone ? '#111827' : '#7c8ba1';
        ctx.fillRect(x - 4 * sc, y - 22 * sc, 8 * sc, 8 * sc);
        ctx.fillRect(x - 6 * sc, y - 13 * sc, 12 * sc, 14 * sc);
      }
      if (t > 150) {
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(yx - 13, yy - 32, 26, 40);
      }
      ctx.restore();
      if (fall >= 1) alive = 1;
      // O número gigante caindo até 1
      const shown = Math.max(1, alive);
      ctx.save();
      ctx.font = 'italic 900 110px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#000000';
      const ny = top + stageH * 0.15;
      ctx.globalAlpha = 1 - dive;
      ctx.strokeText(String(shown), W / 2, ny);
      ctx.fillStyle = shown <= 1 ? '#ef4444' : '#f8fafc';
      ctx.fillText(String(shown), W / 2, ny);
      ctx.restore();
      if (shown <= 1 && dive > 0.4) this.cineImpactText(ctx, 'SÓ 1 SOBREVIVE.', W / 2, top + stageH * 0.84, 80, '#ef4444', seg(t, 196, 208), W * 0.86);
    },

    // PLANO 5: seu rosto no escuro; o flashback da trave rasga; o olho decide
    inicioEgo4(ctx, S, you) {
      const { W, t, top, bot, stageH } = S;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, top, W, stageH);
      const size = 800;
      const cx = W * 0.64;
      const eyeY = top + stageH * 0.44;
      this.cineGlow(ctx, W * 0.98, eyeY, 380, 'rgba(34,211,238,0.4)', 1);
      const h = this.cineHead(ctx, you, cx + Math.sin(t * 0.03) * 4, eyeY, size);
      const sd = ctx.createLinearGradient(cx - 10 * h.u, 0, cx + 9 * h.u, 0);
      sd.addColorStop(0, 'rgba(2,6,23,0.92)');
      sd.addColorStop(0.55, 'rgba(2,6,23,0.25)');
      sd.addColorStop(1, 'rgba(34,211,238,0.12)');
      ctx.fillStyle = sd;
      ctx.fillRect(0, top, W, stageH);
      const decided = t > 104;
      this.inicioEyes(ctx, cx + Math.sin(t * 0.03) * 4, eyeY, h.u, { ring: decided ? '#22d3ee' : you.eyeColor || '#ef4444', lid: decided ? 2 : 0, tiny: t > 40 && t < 104, look: decided ? -1 : 0 });
      // Rastro de luz saindo do olho quando ele decide
      if (decided) {
        const k = E(seg(t, 104, 124));
        const x0 = cx + Math.sin(t * 0.03) * 4 + 3.5 * h.u + 6 * h.u * 0.27;
        this.inicioStreak(ctx, x0 + 260 * k, eyeY - 6, x0, eyeY - 2, 10, 'rgba(34,211,238,0.95)');
      }
      // Painel do flashback (tons de pôr do sol): o passe e a trave
      const inK = E(seg(t, 8, 26));
      const outK = EIO(seg(t, 92, 112));
      if (inK > 0 && outK < 1) {
        const dx = (1 - inK) * -W * 0.5 - outK * W * 0.6;
        this.cinePanel(ctx, [[30, top + 30], [W * 0.46, top + 50], [W * 0.42, bot - 40], [40, bot - 60]], () => {
          this.cineGradient(ctx, 0, top, W * 0.5, stageH, [[0, '#7a3b6b'], [1, '#e0794a']]);
          ctx.fillStyle = '#3f5a1c';
          ctx.fillRect(0, top + stageH * 0.68, W * 0.5, stageH);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(W * 0.33, top + stageH * 0.15, 22, stageH * 0.55);
          ctx.fillRect(0, top + stageH * 0.15, W * 0.33 + 22, 18);
          this.drawSilhouette(ctx, this.getSpeakerCharData('TADA'), W * 0.14, top + stageH * 0.82, 230, { animState: 'shoot', frame: 4 }, '#2a1530');
          this.drawAnimeBall(ctx, W * 0.31, top + stageH * 0.36, 16, 'rgba(255,214,150,0.3)', 0);
          this.cineImpactText(ctx, 'CLANG', W * 0.27, top + stageH * 0.22, 40, '#fef3c7', 1, 0, -0.1);
          ctx.fillStyle = 'rgba(120,53,15,0.25)';
          ctx.fillRect(0, top, W * 0.5, stageH);
        }, { dx, border: '#fde68a' });
      }
      if (t > 112) this.cineImpactText(ctx, 'EU VOU SER ESSE 1.', W * 0.3, top + stageH * 0.76, 70, '#22d3ee', seg(t, 112, 124), W * 0.55, -0.05);
    },

    // ======================================================================
    // 4) O PIQUE-PEGA DO QUARTO Z
    // ======================================================================
    inicioTagScene(ctx, S) {
      const you = this.cineYou();
      const kira = this.getSpeakerCharData('RYOSUKE KIRA');
      const crowd = ['bachira', 'kunigami', 'chigiri', 'gagamaru', 'igarashi', 'raichi'].map((id) => this.cineChar(id, this.KITS.blueLock)).filter((c) => c.name);
      [this.inicioTag0, this.inicioTag1, this.inicioTag2, this.inicioTag3, this.inicioTag4][S.phase]?.call(this, ctx, S, you, kira, crowd);
    },

    // PLANO 1: plano aberto do Quarto Z, todo mundo fugindo da bola, o tempo correndo
    inicioTag0(ctx, S, you, kira, crowd) {
      const { W, H, t, top, bot, stageH } = S;
      const pan = EIO(seg(t, 0, 170));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 - 60 + pan * 120, y: H / 2, zoom: 1.08 });
      const hz = this.inicioRoomZ(ctx, S, { horizon: top + stageH * 0.36 });
      this.inicioTimer(ctx, W * 0.72, top + stageH * 0.16, lerp(136, 11, E(seg(t, 16, 160))), false, 0.85, t);
      ctx.save();
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('▶▶  TEMPO RESTANTE', W * 0.72, top + stageH * 0.16 + 58);
      ctx.restore();
      const all = crowd.slice(0, 4).concat([kira, you]);
      const spots = all.map((ch, i) => {
        const a = t * 0.028 + i * 0.8;
        const dir = i % 2 ? 1 : -1;
        const x = W / 2 + Math.cos(a * dir) * (230 + (i % 4) * 95);
        const y = hz + 60 + ((i * 61) % 230) + Math.sin(a * 1.3) * 26;
        return { ch, x, y, right: Math.sin(a * dir) * dir < 0 };
      });
      spots.sort((a, b) => a.y - b.y).forEach((s) => {
        const sz = 80 + (s.y - hz) * 0.42;
        this.inicioShadow(ctx, s.x, s.y, sz * 0.2, 0.25);
        this.drawSprite(ctx, s.ch, s.x, s.y, sz, { animState: 'run', flipX: !s.right });
      });
      // A bola pulando de um em um
      const hop = (t % 40) / 40;
      const iA = Math.floor(t / 40) % spots.length;
      const from = spots[iA];
      const to = spots[(iA + 3) % spots.length];
      const bx = lerp(from.x, to.x, hop);
      const by = lerp(from.y, to.y, hop) - 40 - Math.sin(hop * Math.PI) * 110;
      this.inicioShadow(ctx, bx, lerp(from.y, to.y, hop), 14, 0.25);
      this.drawAnimeBall(ctx, bx, by, 13, 'rgba(239,68,68,0.4)', t);
      ctx.restore();
      this.cineImpactText(ctx, 'PIQUE-PEGA', W * 0.27, top + stageH * 0.15, 72, '#1e3a8a', seg(t, 6, 18) * (1 - seg(t, 70, 84)), 0, -0.06);
    },

    // PLANO 2: PÁ! — a bola bate em você; todo mundo some pras paredes; faltam 10 s
    inicioTag1(ctx, S, you, kira, crowd) {
      const { W, H, t, top, bot, stageH } = S;
      const hit = 14;
      const push = EIO(seg(t, 60, 150));
      const shake = t >= hit ? 12 * Math.max(0, 1 - (t - hit) / 26) : 0;
      const headY = bot + 30 - 430 * 0.87 + 9 * (430 / 36);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(W / 2, W / 2, push), y: lerp(H / 2, headY + 40, push), zoom: 1 + push * 0.45, shake });
      const hz = this.inicioRoomZ(ctx, S, { horizon: top + stageH * 0.42, alarm: 0.25 + 0.15 * Math.sin(t * 0.12) });
      this.inicioTimer(ctx, W * 0.8, top + stageH * 0.17, lerp(10, 8, seg(t, 0, 150)), true, 0.8, t);
      // Os outros fugindo pros cantos
      const flee = E(seg(t, hit, 90));
      crowd.concat([kira]).forEach((ch, i) => {
        const ang = Math.PI + (i / crowd.length) * Math.PI;
        const r = lerp(140, ch === kira ? 260 : 520, flee);
        const x = W / 2 + Math.cos(ang) * r * 1.2;
        const y = hz + 90 + Math.abs(Math.sin(ang)) * 30 - flee * 20;
        const sz = lerp(150, 110, flee);
        this.drawSprite(ctx, ch, x, y, sz, { animState: flee < 1 ? 'run' : 'idle', facing: flee < 1 ? 'back' : 'front', flipX: Math.cos(ang) < 0 });
      });
      // Você
      const sz = 430;
      this.inicioShadow(ctx, W / 2, bot + 20, 110, 0.3);
      this.drawSprite(ctx, you, W / 2, bot + 30, sz, { animState: 'idle', frame: t < hit + 10 ? 0 : S.f });
      // A bola chegando de lado, batendo, caindo no pé
      let bx;
      let by;
      if (t < hit) {
        bx = lerp(-60, W / 2 + 40, t / hit);
        by = lerp(top + stageH * 0.3, headY + 60, t / hit);
        this.inicioStreak(ctx, bx - 220, by - 50, bx, by, 14, 'rgba(255,255,255,0.8)');
      } else {
        const k = Math.min(1, (t - hit) / 30);
        bx = W / 2 + 40 + k * 90;
        by = lerp(headY + 60, bot - 10, k * k) - Math.sin(k * Math.PI) * 60;
      }
      this.drawAnimeBall(ctx, bx, by, 22, 'rgba(239,68,68,0.5)', t);
      // Gota de suor
      if (t > 40) {
        const u = sz / 36;
        const d = ((t - 40) % 70) * 0.5;
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(W / 2 + 6.4 * u, headY - 2 * u + d, u * 0.6, u * 0.9);
      }
      ctx.restore();
      // Cronômetro no canto quando a câmera fecha em você
      if (push > 0.3) {
        ctx.save();
        ctx.globalAlpha = seg(push, 0.3, 0.6);
        this.inicioTimer(ctx, W - 130, top + 64, lerp(10, 8, seg(t, 0, 150)), true, 0.6, t);
        ctx.restore();
      }
      if (t >= hit && t < 56) this.cineImpactText(ctx, 'PÁ!', W * 0.66, top + stageH * 0.3, 96, '#f8fafc', seg(t, hit, hit + 8), 0, -0.12);
      this.cineFlash(ctx, W, H, t >= hit ? 0.6 * (1 - (t - hit) / 6) : 0);
      if (t > 50) this.cineImpactText(ctx, '?!', W * 0.33, top + stageH * 0.3, 80, '#ef4444', seg(t, 50, 58), 0, 0.1);
      this.cineSfx(S, hit, 'hit', () => window.SFX?.tackle());
    },

    // PLANO 3: os olhos varrendo a sala → três candidatos → a mira para no Kira
    inicioTag2(ctx, S, you, kira, crowd) {
      const { W, H, t, top, bot, stageH } = S;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, top, W, stageH);
      const lock = 112;
      const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 0.26)), 12) * 0.02;
      // Faixa de cima: os seus olhos
      const bandTop = top + 12;
      const bandH = stageH * 0.36;
      ctx.save();
      ctx.translate(W / 2, bandTop + bandH / 2);
      ctx.scale(beat, beat);
      ctx.translate(-W / 2, -(bandTop + bandH / 2));
      this.cinePanel(ctx, [[14, bandTop], [W - 14, bandTop], [W - 14, bandTop + bandH], [14, bandTop + bandH]], () => {
        ctx.fillStyle = '#0b1736';
        ctx.fillRect(0, bandTop, W, bandH);
        const eyeY = bandTop + bandH * 0.52;
        const h = this.cineHead(ctx, you, W / 2, eyeY, 860);
        ctx.fillStyle = t >= lock ? 'rgba(127,29,29,0.28)' : 'rgba(2,8,30,0.35)';
        ctx.fillRect(0, bandTop, W, bandH);
        const look = t < lock ? Math.round(Math.sin(t * 0.09) * 2) : 2;
        this.inicioEyes(ctx, W / 2, eyeY, h.u, { ring: t >= lock ? '#ef4444' : you.eyeColor || '#ef4444', look, tiny: t < lock, lid: t >= lock ? 2 : 0 });
      });
      ctx.restore();
      // Três painéis: longe, longe, perto e de costas
      const pTop = bandTop + bandH + 16;
      const pH = bot - 14 - pTop;
      const panels = [
        { at: 14, ch: crowd[0] || kira, label: 'LONGE', x0: 14, x1: W * 0.32, size: 150, facing: 'front' },
        { at: 38, ch: crowd[1] || kira, label: 'LONGE', x0: W * 0.34, x1: W * 0.6, size: 160, facing: 'back' },
        { at: 62, ch: kira, label: 'PERTO • DE COSTAS', x0: W * 0.62, x1: W - 14, size: 380, facing: 'back', target: true }
      ];
      panels.forEach((p) => {
        const k = E(seg(t, p.at, p.at + 14));
        if (k <= 0) return;
        const pts = [[p.x0, pTop], [p.x1, pTop], [p.x1 - 20, pTop + pH], [p.x0 - 20, pTop + pH]];
        this.cinePanel(ctx, pts, () => {
          this.cineGradient(ctx, p.x0 - 30, pTop, p.x1 - p.x0 + 40, pH, [[0, '#c3d3e8'], [0.45, '#9fb6d3'], [0.46, '#7f97b8'], [1, '#4a6488']]);
          const cx = (p.x0 + p.x1) / 2 - 10;
          const feet = p.target ? pTop + pH + p.size * 0.45 : pTop + pH * 0.78;
          this.drawSprite(ctx, p.ch, cx, feet, p.size, { animState: 'idle', facing: p.facing, frame: p.target ? S.f : 0 });
          if (t >= lock && !p.target) {
            ctx.fillStyle = 'rgba(2,6,23,0.65)';
            ctx.fillRect(p.x0 - 30, pTop, p.x1 - p.x0 + 40, pH);
          }
          if (p.target && t >= lock) {
            const r = 90 - E(seg(t, lock, lock + 16)) * 30;
            const ry = feet - p.size * 0.87 + 9 * (p.size / 36);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(cx, ry, r, 0, Math.PI * 2);
            ctx.moveTo(cx - r - 26, ry);
            ctx.lineTo(cx - r + 18, ry);
            ctx.moveTo(cx + r - 18, ry);
            ctx.lineTo(cx + r + 26, ry);
            ctx.moveTo(cx, ry - r - 26);
            ctx.lineTo(cx, ry - r + 18);
            ctx.stroke();
          }
          ctx.font = '900 15px "Segoe UI", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = p.target && t >= lock ? '#ef4444' : '#020617';
          ctx.fillRect(p.x0 + 6, pTop + 8, ctx.measureText(p.label).width + 18, 26);
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(p.label, p.x0 + 15, pTop + 27);
        }, { dy: (1 - k) * pH, border: p.target && t >= lock ? '#ef4444' : '#f8fafc' });
      });
      // O tempo no canto
      this.inicioTimer(ctx, W - 120, bandTop + 56, lerp(7, 5, seg(t, 0, 170)), true, 0.55, t);
      if (t >= lock) this.cineImpactText(ctx, '...O KIRA.', W * 0.3, bandTop + bandH - 30, 64, '#ef4444', seg(t, lock, lock + 10), 0, -0.05);
      this.cineSfx(S, lock, 'lock', () => window.SFX?.blip(220));
    },

    // PLANO 4: o chute — quadro de impacto em preto e branco, a bola cruza a sala, PÁ no Kira
    inicioTag3(ctx, S, you, kira) {
      const { W, H, t, top, bot, stageH } = S;
      const kick = 18;
      const hitAt = 60;
      const flight = E(seg(t, kick, hitAt));
      const camX = lerp(W * 0.42, W * 0.6, EIO(seg(t, kick, hitAt + 10)));
      const shake = t >= hitAt ? 14 * Math.max(0, 1 - (t - hitAt) / 30) : t >= kick && t < kick + 12 ? 6 : 0;
      const groundY = bot + 20;
      const yX = W * 0.22;
      const kX = W * 0.86;
      const kSize = 340;
      const kHead = groundY - 30 - kSize * 0.87 + 9 * (kSize / 36);
      const impact = t >= kick && t < kick + 10;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: camX, y: H / 2, zoom: 1.04 + flight * 0.08, shake });
      if (impact) {
        // Quadro de impacto (um só): fundo branco, bonecos em preto, linhas de foco
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-200, top - 100, W + 400, stageH + 200);
        this.drawRadialSpeedLines(ctx, yX + 80, groundY - 60, W * 1.4, '#020617', 0.75);
        this.drawSilhouette(ctx, you, yX, groundY, 470, { animState: 'shoot', frame: 4 }, '#020617');
        this.drawSilhouette(ctx, kira, kX, groundY - 30, kSize, { facing: 'back', frame: 4 }, '#020617');
      } else {
        this.inicioRoomZ(ctx, S, { horizon: top + stageH * 0.4, vx: W * 0.55 });
        if (t >= kick) this.drawSpeedLines(ctx, W, H, '#1e3a8a', 0.18);
        this.inicioShadow(ctx, yX, groundY, 100, 0.3);
        this.drawSprite(ctx, you, yX, groundY, 470, { animState: t < kick ? 'windup' : t < kick + 30 ? 'shoot' : 'idle', frame: 4, showAura: t >= kick && t < hitAt });
        // O Kira se vira bem na hora
        const turned = t > 44;
        const fallK = E(seg(t, hitAt, hitAt + 30));
        this.inicioShadow(ctx, kX, groundY - 30, 70, 0.3);
        ctx.save();
        ctx.translate(kX, groundY - 30);
        ctx.rotate(fallK * 0.5);
        this.drawSprite(ctx, kira, fallK * 30, 0, kSize, { animState: 'idle', facing: turned ? 'front' : 'back', flipX: turned, frame: t >= hitAt ? 0 : 4 });
        ctx.restore();
        // A bola: uma faixa de vento atrás (não cópias)
        if (t >= kick) {
          let bx;
          let by;
          if (t < hitAt) {
            bx = lerp(yX + 110, kX - 10, flight);
            by = lerp(groundY - 40, kHead + 10, flight);
            this.inicioStreak(ctx, lerp(yX + 110, bx, 0.4), lerp(groundY - 40, by, 0.4), bx, by, 22, 'rgba(239,68,68,0.6)');
          } else {
            const k = t - hitAt;
            bx = kX - 10 - k * 9;
            by = kHead + 10 - k * 9 + k * k * 0.3;
          }
          this.drawAnimeBall(ctx, bx, by, 24, 'rgba(239,68,68,0.55)', t);
        }
        if (t > 44 && t < hitAt + 6) this.drawMangaCaption(ctx, 'Hã...?', kX - 20, kHead - 90, 26);
      }
      ctx.restore();
      if (t >= kick && t < hitAt) this.cineImpactText(ctx, 'DOM!!', W * 0.32, top + stageH * 0.26, 110, impact ? '#020617' : '#f8fafc', seg(t, kick, kick + 8), 0, -0.12);
      if (t >= hitAt) this.cineImpactText(ctx, 'PÁ!!', W * 0.62, top + stageH * 0.24, 120, '#ef4444', seg(t, hitAt, hitAt + 8), 0, 0.1);
      this.cineFlash(ctx, W, H, t >= hitAt ? 0.55 * (1 - (t - hitAt) / 7) : 0);
      this.cineSfx(S, kick, 'kick', () => window.SFX?.kick(1));
      this.cineSfx(S, hitAt, 'hit', () => window.SFX?.tackle());
    },

    // PLANO 5: 0:00 — o Kira no chão; a imagem congela numa foto com o carimbo
    inicioTag4(ctx, S, you, kira, crowd) {
      const { W, H, t, top, bot, stageH } = S;
      const freezeAt = 44;
      const tt = Math.min(t, freezeAt);
      const fz = EIO(seg(t, freezeAt, freezeAt + 22));
      // Fundo atrás da foto
      ctx.fillStyle = '#0a0410';
      ctx.fillRect(0, top, W, stageH);
      if (fz > 0) {
        ctx.save();
        ctx.globalAlpha = fz * 0.5;
        ctx.font = 'italic 900 26px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#7f1d1d';
        for (let r = 0; r < 9; r++) ctx.fillText('TEMPO ESGOTADO • TEMPO ESGOTADO • TEMPO ESGOTADO • TEMPO ESGOTADO', -((t * 0.6 + r * 120) % 300), top + 30 + r * 62);
        ctx.restore();
      }
      // A cena (vira foto: encolhe e inclina)
      const sc = lerp(1, 0.78, fz);
      const rot = lerp(0, -0.035, fz);
      const cx = W / 2;
      const cy = top + stageH / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      ctx.translate(-cx, -cy);
      if (fz > 0) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-16, top - 16, W + 32, stageH + 32);
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, W, stageH);
      ctx.clip();
      const hz = this.inicioRoomZ(ctx, S, { horizon: top + stageH * 0.38, alarm: 0.55 + 0.25 * Math.sin(tt * 0.1) });
      this.inicioTimer(ctx, W * 0.5, top + stageH * 0.17, 0, true, 0.8, tt);
      // Os outros olhando de longe
      crowd.slice(0, 4).forEach((ch, i) => {
        const x = W * [0.1, 0.27, 0.46, 0.9][i];
        this.drawSprite(ctx, ch, x, hz + 70, 120, { animState: 'idle', frame: 4, flipX: x > W * 0.55 });
      });
      // O Kira caído e a bola parada do lado
      const floorY = top + stageH * 0.84;
      this.inicioShadow(ctx, W * 0.68, floorY + 10, 140, 0.3);
      ctx.save();
      ctx.translate(W * 0.68, floorY - 280 * 0.12);
      ctx.rotate(-Math.PI / 2 + 0.06);
      // Caído de lado, olhos fechados (frame 0 = piscando)
      this.drawSprite(ctx, kira, 0, 280 * 0.45, 280, { animState: 'idle', frame: 0 });
      ctx.restore();
      this.drawAnimeBall(ctx, W * 0.86, floorY, 18, 'rgba(239,68,68,0.3)', 0);
      // Você de costas, em pé
      this.drawSpriteDim(ctx, you, W * 0.28, bot + 120, 470, { facing: 'back', animState: 'idle', frame: 4 }, 0.3, '20,10,30');
      ctx.restore();
      // Tom de foto congelada
      if (fz > 0) {
        ctx.fillStyle = `rgba(30,58,138,${0.3 * fz})`;
        ctx.fillRect(0, top, W, stageH);
      }
      ctx.restore();
      // O carimbo
      if (t > freezeAt + 20) {
        const k = E(seg(t, freezeAt + 20, freezeAt + 30));
        ctx.save();
        ctx.translate(W * 0.64, top + stageH * 0.42);
        ctx.rotate(-0.12);
        ctx.scale(1.7 - k * 0.7, 1.7 - k * 0.7);
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 9;
        ctx.strokeRect(-250, -70, 500, 128);
        ctx.lineWidth = 3;
        ctx.strokeRect(-238, -58, 476, 104);
        ctx.font = 'italic 900 34px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#dc2626';
        ctx.fillText('RYOSUKE KIRA', 0, -26);
        ctx.font = 'italic 900 52px "Segoe UI", sans-serif';
        ctx.fillText('ELIMINADO', 0, 22);
        ctx.restore();
      }
      this.cineFlash(ctx, W, H, t >= freezeAt && t < freezeAt + 6 ? 0.5 * (1 - (t - freezeAt) / 6) : 0);
      this.cineSfx(S, 2, 'buzz', () => window.SFX?.whistle(1));
      this.cineSfx(S, freezeAt, 'snap', () => window.SFX?.page());
      this.cineSfx(S, freezeAt + 20, 'stamp', () => window.SFX?.tackle());
    }
  });

  // ========================================================================
  // REGISTRO DAS CENAS
  // ========================================================================
  CE.registerCine('prologue_tada_miss', {
    phases: [170, 150, 140, 160, 150, 170],
    music: 'tension',
    title: '⚽ PRÓLOGO • A FINAL REGIONAL',
    tags: ["PLANO 1 • 89' — A ARRANCADA", 'PLANO 2 • O DILEMA', 'PLANO 3 • O PASSE', 'PLANO 4 • A TRAVE', 'PLANO 5 • ELIMINADOS', 'PLANO 6 • ALGUÉM ESTAVA ASSISTINDO'],
    get subs() {
      // O placar (89', 0 x 0 → 0 x 1), o "PASSA PRA MIM!!", o "CLANG!!" e o "ELIMINADOS."
      // já estão na imagem: uma fala por plano (duas curtas na trave)
      return [
        [{ from: 6, text: `Final Regional: a bola é de ${name()}.` }],
        [{ from: 48, who: 'TADA', text: '"UM POR TODOS!"', color: '#60a5fa' }],
        [{ from: 0, who: 'VOCÊ', text: '(Passar é o certo... né?)', color: '#00f5d4' }],
        [
          { from: 0, to: 84, text: 'Goleiro batido...' },
          { from: 84, text: 'Na trave.' }
        ],
        [{ from: 4, who: 'VOCÊ', text: '(...e se eu tivesse chutado?)', color: '#00f5d4' }],
        [{ from: 6, who: 'JINPACHI EGO', text: '"Passou? Que desperdício."', color: '#a5f3fc' }]
      ];
    },
    draw(ctx, S) {
      this.inicioPrologue(ctx, S);
    }
  });

  CE.registerCine('bluelock_door', {
    phases: [150, 120, 170, 150],
    music: 'mystery',
    title: '🚪 A PORTA DO BLUE LOCK',
    tags: ['PLANO 1 • A PORTA', 'PLANO 2 • SEM OLHAR PRA TRÁS', 'PLANO 3 • A PORTA SE ABRE', 'PLANO 4 • BEM-VINDO AO BLUE LOCK'],
    // O "SEM OLHAR PRA TRÁS." e o letreiro "BEM-VINDO AO BLUE LOCK" já estão na imagem
    subs: [
      [{ from: 0, who: 'JINPACHI EGO', text: '"Daqui não tem volta."', color: '#a5f3fc' }],
      [{ from: 8, who: 'VOCÊ', text: '(Eu vou ser o 1.)', color: '#00f5d4' }],
      [{ from: 30, text: 'A luz do Blue Lock engole tudo.' }],
      [{ from: 6, text: 'Atrás de você, a porta se fecha.' }]
    ],
    draw(ctx, S) {
      this.inicioDoorScene(ctx, S);
    }
  });

  CE.registerCine('ego_speech', {
    phases: [170, 200, 110, 220, 180],
    music: 'dread',
    title: '🎙️ O DISCURSO DE JINPACHI EGO',
    tags: ['PLANO 1 • 300 ATACANTES', 'PLANO 2 • JINPACHI EGO', 'PLANO 3 • O OLHAR', 'PLANO 4 • 300 → 1', 'PLANO 5 • O EGO DESPERTA'],
    // O contador de 300, o "EGOÍSTA" gigante, a cartela do nome, o "SÓ 1 SOBREVIVE." e o
    // "EU VOU SER ESSE 1." já estão na imagem; o plano 3 (os olhos + a cartela) fica mudo
    subs: [
      [{ from: 8, text: 'Ninguém sabe por que foi chamado.' }],
      [{ from: 12, who: 'JINPACHI EGO', text: '"Quero o atacante MAIS EGOÍSTA."', color: '#a5f3fc' }],
      [],
      [{ from: 6, who: 'JINPACHI EGO', text: '"Os 299 NUNCA mais jogam pelo Japão."', color: '#a5f3fc' }],
      [{ from: 8, who: 'VOCÊ', text: '(Aquela trave... nunca mais.)', color: '#00f5d4' }]
    ],
    draw(ctx, S) {
      this.inicioEgoScene(ctx, S);
    }
  });

  CE.registerCine('onigokko', {
    phases: [170, 150, 170, 130, 220],
    music: 'tension',
    title: '⏱️ O PIQUE-PEGA DO QUARTO Z',
    tags: ['PLANO 1 • QUARTO Z: PIQUE-PEGA', 'PLANO 2 • A BOLA É SUA', 'PLANO 3 • QUEM É O ALVO?', 'PLANO 4 • O CHUTE', 'PLANO 5 • RYOSUKE KIRA, ELIMINADO'],
    // O cronômetro, o "?!", o "...O KIRA.", o DOM!!/PÁ!! e o carimbo "RYOSUKE KIRA
    // ELIMINADO" já estão na imagem: uma fala por plano
    subs: [
      [{ from: 4, who: 'JINPACHI EGO', text: '"Bola no fim? ELIMINADO."', color: '#a5f3fc' }],
      [{ from: 6, who: 'VOCÊ', text: '(Se eu não passar, tô fora!)', color: '#00f5d4' }],
      [{ from: 8, who: 'VOCÊ', text: '(Quem está perto... e distraído?)', color: '#00f5d4' }],
      [{ from: 58, text: 'Na cabeça!' }],
      [{ from: 10, who: 'VOCÊ', text: '(Chutei sem pensar. Eu não quero ir embora.)', color: '#00f5d4' }]
    ],
    draw(ctx, S) {
      this.inicioTagScene(ctx, S);
    }
  });
})();
