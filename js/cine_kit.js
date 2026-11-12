// ============================================================================
// KIT DE CINEMA DAS CUTSCENES (nível da cena do Rin no vestiário)
// As cenas novas ficam em js/cine_*.js e se registram com registerCine(tipo, def):
//   def = {
//     phases: [frames por plano],            // 60 frames = 1 s
//     music: 'epic' | 'dread' | ...,         // trilha (SFX.MUSIC_THEMES)
//     title: '🩸 NOME DA CENA',              // vai pro canto da tarja de cima
//     tags: ['PLANO 1 • ...', ...],          // nome de cada plano (tarja de cima)
//     subs: [[{ from, to, who, text, color }], ...], // legendas por plano (tarja de baixo)
//     letterbox: 0.12, grain: 0.06, vignette: 0.55,  // opcionais
//     draw(ctx, S) { ... }                   // S = { W, H, t, phase, dur, p, f, top, bot, stageH }
//   }
// Uma cena registrada tem prioridade sobre o desenho antigo do mesmo tipo.
// REGRAS (já custaram caro): nada de ctx.filter nem shadowBlur por quadro (trava);
// nada de cópias fantasmas/rastros do boneco nem tela piscando (parece bug);
// olhos em close são pixel art (drawPixelEye); boneco em canvas auxiliar sempre com
// margem (spriteToScratch); cenas escuras ainda precisam mostrar quem é quem.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  CE.CINE = CE.CINE || {};

  // Uniformes usados nas cenas
  CE.KITS = {
    japan: { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' },
    blueLock: { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' },
    u20: { jerseyPrimary: '#0b1d4d', jerseySecondary: '#f8fafc' },
    france: { jerseyPrimary: '#0b1d4d', jerseySecondary: '#ef4444' },
    suit: { outfit: 'casual', jerseyPrimary: '#111827', jerseySecondary: '#e5e7eb' }
  };

  Object.assign(CE, {
    registerCine(type, def) {
      this.CINE[type] = def;
    },

    // Personagem pelo id (com roupa/expressão por cima) e você
    cineChar(id, extra = {}) {
      const c = (window.BLUE_LOCK_CHARACTERS || []).find((x) => x.id === id) || window.findCharacter?.(id) || {};
      return Object.assign({}, c, extra);
    },
    cineYou(extra = {}) {
      return Object.assign({}, this.getSpeakerCharData('VOCÊ'), extra);
    },
    cinePlayerName() {
      return (window.App?.state?.profile?.name || 'VOCÊ').toUpperCase();
    },

    // ---------------------------------------------------------------- tempo
    cineClamp(x) {
      return x < 0 ? 0 : x > 1 ? 1 : x;
    },
    // Progresso 0..1 entre os frames a e b
    cineSeg(t, a, b) {
      return this.cineClamp((t - a) / (b - a));
    },
    cineEase(x) {
      x = this.cineClamp(x);
      return 1 - Math.pow(1 - x, 3);
    },
    cineEaseInOut(x) {
      x = this.cineClamp(x);
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    },
    // Ruído suave e determinístico (tremida de câmera na mão, sem sorteio por quadro)
    cineNoise(t, seed = 0) {
      return Math.sin(t * 0.37 + seed * 12.9) * 0.6 + Math.sin(t * 0.91 + seed * 4.1) * 0.3 + Math.sin(t * 2.3 + seed) * 0.1;
    },

    // ---------------------------------------------------------------- moldura
    // Desenha a cena registrada: plano → pós (granulado, vinheta) → tarjas + legendas
    drawCine(ctx, W, H, def) {
      const phase = this.sakugaPhase;
      const t = this.sakugaPhaseTimer;
      const dur = def.phases[phase] || 120;
      const lb = def.letterbox ?? 0.12;
      const top = Math.round(H * lb);
      const bot = H - top;
      const S = { W, H, t, phase, dur, p: t / dur, f: this.sakugaFrame, top, bot, stageH: bot - top };
      ctx.save();
      // clearRect antes: só com fillRect o Chrome acumulava o desenho de vários quadros e
      // pagava tudo de uma vez (travadas de 1-2 s no teste)
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      try {
        def.draw.call(this, ctx, S);
      } finally {
        ctx.restore();
      }
      ctx.save();
      if ((def.vignette ?? 0.55) > 0) this.cineVignette(ctx, W, H, def.vignette ?? 0.55);
      // Granulado só na área da imagem (as tarjas pretas cobrem o resto)
      if ((def.grain ?? 0.06) > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, W, bot - top);
        ctx.clip();
        this.cineGrain(ctx, W, H, def.grain ?? 0.06);
        ctx.restore();
      }
      this.cineLetterbox(ctx, W, H, top);
      const tag = def.tags?.[phase];
      if (def.title || tag) this.cineTag(ctx, W, top, def.title || '', tag || '', phase, def.phases.length);
      // Falas já redistribuídas para dar tempo de ler (cinePlanAll); a que veio do plano
      // anterior continua sem piscar no corte
      this.cineReadRate(def);
      (this._cineSubs || []).forEach((s) => {
        if (t >= s.from && t < s.to) this.cineSubtitle(ctx, W, H, top, s.who, s.text, s.color, s.carried ? 1 : this.cineSeg(t, s.from, s.from + 10));
      });
      ctx.restore();
    },

    cineLetterbox(ctx, W, H, top) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, top);
      ctx.fillRect(0, H - top, W, top);
    },

    // Nome da cena e do plano na tarja de cima (discreto, como um filme)
    cineTag(ctx, W, top, title, tag, phase, n) {
      ctx.save();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = '900 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#facc15';
      ctx.fillText(title, 28, top * 0.36);
      ctx.font = 'italic 800 15px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(226,232,240,0.78)';
      ctx.fillText(tag, 28, top * 0.68);
      // Contador de planos (pontinhos)
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i === phase ? '#00f5d4' : i < phase ? 'rgba(0,245,212,0.4)' : 'rgba(148,163,184,0.25)';
        ctx.fillRect(W - 28 - (n - i) * 18, top * 0.5 - 2, 12, 4);
      }
      ctx.restore();
    },

    // Legenda na tarja de baixo: nome de quem fala colorido + fala em branco
    cineSubtitle(ctx, W, H, top, who, text, color = '#00f5d4', k = 1) {
      ctx.save();
      ctx.globalAlpha = k;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const y = H - top / 2;
      let fs = 22;
      ctx.font = `italic 700 ${fs}px "Segoe UI", sans-serif`;
      const full = who ? `${who}  ${text}` : text;
      while (fs > 14 && ctx.measureText(full).width > W - 120) {
        fs -= 1;
        ctx.font = `italic 700 ${fs}px "Segoe UI", sans-serif`;
      }
      if (who) {
        ctx.font = `900 ${fs}px "Segoe UI", sans-serif`;
        const ww = ctx.measureText(who + '  ').width;
        ctx.font = `italic 700 ${fs}px "Segoe UI", sans-serif`;
        const tw = ctx.measureText(text).width;
        const x0 = W / 2 - (ww + tw) / 2;
        ctx.textAlign = 'left';
        ctx.font = `900 ${fs}px "Segoe UI", sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(who, x0, y);
        ctx.font = `italic 700 ${fs}px "Segoe UI", sans-serif`;
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(text, x0 + ww, y);
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(text, W / 2, y);
      }
      ctx.restore();
    },

    // Vinheta (canvas guardado por tamanho/força: o degradê não é refeito todo quadro).
    // Guarda várias: cena que usa duas forças no mesmo quadro (a da cena + a do plano)
    // refazia dois canvases 1280x720 POR QUADRO quando o cache tinha uma só
    cineVignette(ctx, W, H, strength = 0.55, color = '0,0,0') {
      const key = `${W}x${H}|${strength}|${color}`;
      if (!this._vigCaches) this._vigCaches = new Map();
      let hit = this._vigCaches.get(key);
      if (!hit) {
        const cv = document.createElement('canvas');
        cv.width = W;
        cv.height = H;
        const g = cv.getContext('2d');
        const grd = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.hypot(W, H) * 0.56);
        grd.addColorStop(0, `rgba(${color},0)`);
        grd.addColorStop(1, `rgba(${color},${strength})`);
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
        hit = { cv };
        if (this._vigCaches.size >= 8) this._vigCaches.delete(this._vigCaches.keys().next().value);
        this._vigCaches.set(key, hit);
      }
      ctx.drawImage(hit.cv, 0, 0);
    },

    // Granulado de filme: 4 texturas de ruído prontas, trocadas e deslocadas a cada quadro
    cineGrain(ctx, W, H, alpha = 0.06) {
      if (!this._grain) {
        this._grain = [0, 1, 2, 3].map(() => {
          const cv = document.createElement('canvas');
          cv.width = 192;
          cv.height = 192;
          const g = cv.getContext('2d');
          const img = g.createImageData(192, 192);
          for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.random() < 0.5 ? 0 : 255;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = Math.random() * 150;
          }
          g.putImageData(img, 0, 0);
          return ctx.createPattern(cv, 'repeat');
        });
      }
      const f = this.sakugaFrame;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(-((f * 53) % 192), -((f * 31) % 192));
      ctx.fillStyle = this._grain[f % 4];
      ctx.fillRect(((f * 53) % 192), ((f * 31) % 192) + Math.round(H * 0.1), W, H * 0.8);
      ctx.restore();
    },

    // Câmera: posiciona o ponto (x, y) do mundo no centro da tela, com zoom, giro e tremida.
    // Use entre ctx.save() e ctx.restore()
    cineCamera(ctx, W, H, cam = {}) {
      const { x = W / 2, y = H / 2, zoom = 1, rot = 0, shake = 0 } = cam;
      const f = this.sakugaFrame;
      const sx = shake ? this.cineNoise(f * 1.7, 1) * shake : 0;
      const sy = shake ? this.cineNoise(f * 1.9, 2) * shake : 0;
      ctx.translate(W / 2 + sx, H / 2 + sy);
      if (rot) ctx.rotate(rot);
      ctx.scale(zoom, zoom);
      ctx.translate(-x, -y);
    },

    cineFlash(ctx, W, H, alpha, color = '#ffffff') {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },

    cineGradient(ctx, x, y, w, h, stops) {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      stops.forEach(([o, c]) => g.addColorStop(o, c));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    },

    // Brilho redondo pronto (bokeh, refletor, luz de janela): sprite guardado por cor
    cineGlowSprite(color) {
      if (!this._glowCache) this._glowCache = {};
      if (!this._glowCache[color]) {
        const cv = document.createElement('canvas');
        cv.width = 128;
        cv.height = 128;
        const g = cv.getContext('2d');
        const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, color);
        grd.addColorStop(0.35, color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.45})`));
        grd.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
        g.fillStyle = grd;
        g.fillRect(0, 0, 128, 128);
        this._glowCache[color] = cv;
      }
      return this._glowCache[color];
    },
    // color no formato 'rgba(r,g,b,a)'
    cineGlow(ctx, x, y, r, color = 'rgba(255,255,255,0.9)', alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.cineGlowSprite(color), x - r, y - r, r * 2, r * 2);
      ctx.restore();
    },

    // Bolinhas de luz fora de foco no fundo (estádio, cidade à noite)
    cineBokeh(ctx, W, y0, y1, t, n = 24, colors = ['rgba(255,236,179,0.5)', 'rgba(147,197,253,0.45)'], seed = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
        const r1 = a - Math.floor(a);
        const b = Math.sin(i * 39.346 + seed * 11.135) * 24634.6345;
        const r2 = b - Math.floor(b);
        const x = (r1 * (W + 200) - 100 + t * (0.15 + r2 * 0.3)) % (W + 200) - 50;
        const y = y0 + r2 * (y1 - y0) + Math.sin(t * 0.02 + i) * 4;
        const r = 10 + r2 * 34;
        this.cineGlow(ctx, x, y, r, colors[i % colors.length], 0.5 + 0.5 * Math.sin(t * 0.03 + i * 1.7) * 0.4);
      }
    },

    // Poeira/partículas brilhando no ar, iluminadas por uma luz
    cineDust(ctx, W, H, t, n = 40, color = 'rgba(226,232,240,0.7)', seed = 3) {
      ctx.save();
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const a = Math.sin(i * 91.7 + seed) * 4375.85;
        const r1 = a - Math.floor(a);
        const b = Math.sin(i * 17.3 + seed * 7) * 2463.43;
        const r2 = b - Math.floor(b);
        const x = (r1 * W + Math.sin(t * 0.01 + i) * 30 + t * 0.2) % W;
        const y = (r2 * H - t * (0.15 + r2 * 0.25) + H * 4) % H;
        const s = 1.5 + r2 * 2.5;
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.04 + i));
        ctx.fillRect(x, y, s, s);
      }
      ctx.restore();
    },

    // Feixes de luz saindo de (x, y) na direção angle (radianos), abrindo spread
    cineShafts(ctx, x, y, angle, len, spread, n, color = '191,219,254', alpha = 0.18, t = 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const a = angle - spread / 2 + (spread * (i + 0.5)) / n + Math.sin(t * 0.01 + i * 2.1) * 0.015;
        const w = (spread / n) * (0.35 + 0.4 * Math.abs(Math.sin(i * 3.7)));
        const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
        const al = alpha * (0.55 + 0.45 * Math.sin(t * 0.025 + i * 1.3));
        g.addColorStop(0, `rgba(${color},${al})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a - w) * len, y + Math.sin(a - w) * len);
        ctx.lineTo(x + Math.cos(a + w) * len, y + Math.sin(a + w) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    // Chuva caindo inclinada
    cineRain(ctx, W, H, t, alpha = 0.35, n = 140, slant = 0.25) {
      ctx.save();
      ctx.strokeStyle = `rgba(191,219,254,${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = Math.sin(i * 45.1) * 9999.1;
        const r = a - Math.floor(a);
        const x = (r * (W + 200) + t * 6 * slant) % (W + 200) - 100;
        const y = ((i * 97 + t * 22) % (H + 60)) - 30;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 18 * slant, y - 26);
      }
      ctx.stroke();
      ctx.restore();
    },

    // Painel de mangá: recorta o polígono pts, desenha draw() dentro (deslizando com k)
    // e contorna com borda branca + traço preto
    cinePanel(ctx, pts, draw, opts = {}) {
      const { dx = 0, dy = 0, border = '#f8fafc', width = 6 } = opts;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.save();
      ctx.clip();
      draw();
      ctx.restore();
      // draw() pode ter deixado outro caminho aberto: refaz o contorno do painel
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.lineJoin = 'miter';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = width + 4;
      ctx.stroke();
      ctx.strokeStyle = border;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.restore();
    },

    // Close no rosto: o olho fica em eyeY. size = tamanho do boneco (W*0.9 = rosto gigante).
    // Devolve { u, top, feet } (u = 1 unidade da pixel art em px)
    cineHead(ctx, char, cx, eyeY, size, opts = {}) {
      const u = size / 36;
      const top = eyeY - SPRITE_MAPY(10.1) * u;
      const feet = top + size * 0.87;
      this.drawSprite(ctx, char, cx, feet, size, Object.assign({ animState: 'idle', frame: 1 }, opts));
      return { u, top, feet };
    },

    // Luz de recorte: a borda de um lado do boneco acende numa cor (silhueta atrás, deslocada)
    cineRim(ctx, char, x, feet, size, opts = {}, color = '#7dd3fc', side = 1) {
      const d = Math.max(2, size / 90);
      this.drawSilhouette(ctx, char, x + side * d, feet - d * 0.4, size, Object.assign({ animState: 'idle', frame: 1 }, opts), color);
      this.drawSprite(ctx, char, x, feet, size, Object.assign({ animState: 'idle', frame: 1 }, opts));
    },

    // Letreiro grande de capítulo/momento: kicker pequeno, título enorme com traço que corre
    cineTitleCard(ctx, W, y, k, { kicker = '', title = '', sub = '', color = '#00f5d4' } = {}) {
      if (k <= 0) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const e = this.cineEase(k);
      ctx.globalAlpha = Math.min(1, k * 2);
      if (kicker) {
        ctx.font = '900 16px "Segoe UI", sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(kicker.split('').join(' '), W / 2, y - 58);
      }
      let fs = 74;
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      while (fs > 28 && ctx.measureText(title).width > W * 0.86) {
        fs -= 4;
        ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      }
      ctx.save();
      ctx.translate((1 - e) * 60, 0);
      ctx.lineWidth = Math.max(5, fs / 10);
      ctx.strokeStyle = '#020617';
      ctx.strokeText(title, W / 2, y);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(title, W / 2, y);
      ctx.restore();
      const lw = ctx.measureText(title).width * e;
      ctx.fillStyle = color;
      ctx.fillRect(W / 2 - lw / 2, y + fs * 0.55, lw, 4);
      if (sub) {
        ctx.font = 'italic 700 18px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(226,232,240,0.85)';
        ctx.fillText(sub, W / 2, y + fs * 0.55 + 30);
      }
      ctx.restore();
    },

    // Texto grande "de impacto" (sem shadowBlur): traço grosso + cor + sombra sólida deslocada
    cineImpactText(ctx, text, x, y, size, color, k = 1, maxW = 0, rot = 0) {
      if (k <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      const sc = 1.6 - this.cineEase(k) * 0.6;
      ctx.scale(sc, sc);
      ctx.globalAlpha = Math.min(1, k * 2.5);
      let fs = size;
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      while (maxW && fs > 18 && ctx.measureText(text).width > maxW) {
        fs -= 3;
        ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#020617';
      ctx.fillText(text, fs * 0.06, fs * 0.08);
      ctx.lineWidth = Math.max(5, fs / 9);
      ctx.strokeStyle = '#020617';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    },

    // Céu noturno com estrelas (pronto por tamanho) e lua opcional
    cineNightSky(ctx, W, h, t, opts = {}) {
      const { top = '#020617', bottom = '#1e3a8a', moon = null } = opts;
      this.cineGradient(ctx, 0, 0, W, h, [[0, top], [1, bottom]]);
      const key = `${W}x${h}`;
      if (!this._stars || this._stars.key !== key) {
        const cv = document.createElement('canvas');
        cv.width = W;
        cv.height = h;
        const g = cv.getContext('2d');
        for (let i = 0; i < 160; i++) {
          const a = Math.sin(i * 12.9898) * 43758.5453;
          const b = Math.sin(i * 78.233) * 12345.678;
          g.fillStyle = `rgba(255,255,255,${0.25 + (a - Math.floor(a)) * 0.6})`;
          const s = (b - Math.floor(b)) < 0.85 ? 1.5 : 2.5;
          g.fillRect((a - Math.floor(a)) * W, (b - Math.floor(b)) * h * 0.85, s, s);
        }
        this._stars = { key, cv };
      }
      ctx.save();
      ctx.globalAlpha = 0.75 + Math.sin(t * 0.05) * 0.1;
      ctx.drawImage(this._stars.cv, 0, 0);
      ctx.restore();
      if (moon) {
        this.cineGlow(ctx, moon.x, moon.y, moon.r * 4, 'rgba(191,219,254,0.35)');
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(148,163,184,0.5)';
        ctx.beginPath();
        ctx.arc(moon.x - moon.r * 0.3, moon.y - moon.r * 0.2, moon.r * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // Prédios da cidade em silhueta com janelas acesas (pronto por parâmetro)
    cineCity(ctx, W, baseY, h, color = '#0b1225', win = 'rgba(253,224,71,0.7)', seed = 1, shift = 0) {
      const key = `${W}|${h}|${color}|${win}|${seed}`;
      if (!this._cityCache) this._cityCache = {};
      if (!this._cityCache[key]) {
        const cv = document.createElement('canvas');
        cv.width = W + 400;
        cv.height = h;
        const g = cv.getContext('2d');
        let x = 0;
        let i = 0;
        while (x < cv.width) {
          const a = Math.sin((i + seed * 31) * 12.9898) * 43758.5453;
          const r = a - Math.floor(a);
          const bw = 40 + r * 90;
          const bh = h * (0.35 + r * 0.65);
          g.fillStyle = color;
          g.fillRect(x, h - bh, bw, bh);
          for (let wy = h - bh + 8; wy < h - 6; wy += 12) {
            for (let wx = x + 6; wx < x + bw - 6; wx += 10) {
              const q = Math.sin(wx * 3.1 + wy * 7.7 + seed) * 999.9;
              if (q - Math.floor(q) < 0.32) {
                g.fillStyle = win;
                g.fillRect(wx, wy, 4, 5);
              }
            }
          }
          x += bw + 2;
          i++;
        }
        this._cityCache[key] = cv;
      }
      const cv = this._cityCache[key];
      const off = ((shift % 400) + 400) % 400;
      ctx.drawImage(cv, off, 0, W, h, 0, baseY - h, W, h);
    },

    // Escreve o texto aos poucos (k 0..1)
    cineType(text, k) {
      return text.slice(0, Math.floor(text.length * this.cineClamp(k)));
    },

    // Som que toca UMA vez quando o plano passa do frame `at` (o draw roda todo quadro).
    // Ex: this.cineSfx(S, 40, 'chute', () => window.SFX?.kick(1))
    // SFX disponíveis: kick(power 0..1), pass(), whoosh(), tackle(), save(), post(), goal(big),
    // concede(), whistle(n), page(), blip(pitch), jingle([notas midi], quando, tipo)
    cineSfx(S, at, id, fn) {
      if (S.t < at) return;
      if (!this._cineSfxDone) this._cineSfxDone = new Set();
      const key = `${this._cineRun || 0}|${S.phase}|${id}`;
      if (this._cineSfxDone.has(key)) return;
      this._cineSfxDone.add(key);
      if (S.t - at < 6) fn();
    }
  });
})();
