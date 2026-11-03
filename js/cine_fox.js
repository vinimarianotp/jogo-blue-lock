// Cenas cinematográficas (cine_fox) — ver js/cine_kit.js
// fox_training • monster_awaken • rin_challenge • u20_celebration • wc_champion • credits • wc_opening
// Tudo que é auxiliar fica no CutsceneEngine com o prefixo foxc (não colide com os outros arquivos).
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;

  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = (i, s = 0) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  // Entrada com um leve "passa e volta"
  const back = (x) => {
    x = clamp(x);
    const c1 = 1.70158;
    return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };
  // Batida que acende e decai (para coração, flash, soco de câmera)
  const pulse = (t, at, len = 18) => (t < at || t > at + len ? 0 : Math.pow(1 - (t - at) / len, 2));

  const FOX_COLOR = '#f59e0b';
  const RIN_COLOR = '#22d3ee';
  const YOU_COLOR = '#00f5d4';

  Object.assign(CE, {
    // ======================================================================
    // AUXILIARES
    // ======================================================================
    foxcFox() {
      return this.getSpeakerCharData('FOX');
    },

    // Mistura duas cores hex #rrggbb (k = quanto da segunda)
    foxcMix(a, b, k) {
      const p = (h) => (/^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : [200, 200, 200]);
      const A = p(a);
      const B = p(b);
      return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
    },

    // ---------------------------------------------------------------- desempenho
    // Num canvas sem GPU, degradê em tela cheia custa ~5 ms e o granulado da kit ~11 ms.
    // Aqui tudo isso vira imagem pronta (drawImage esticado custa ~0,5 ms).
    // Ao trocar de cena, os bonecos guardados da cena anterior são jogados fora (memória).
    foxcBegin(ctx, S) {
      // clearRect na tela inteira: o Chrome descarta os comandos dos quadros anteriores ainda
      // não desenhados (só com o fillRect preto da kit eles acumulavam e travavam de uma vez)
      ctx.clearRect(0, 0, S.W, S.H);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, S.W, S.H);
      // a cada vez que uma cena começa, os bonecos guardados são refeitos (uniforme/visual podem ter mudado)
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._foxcType !== run) {
        this._foxcType = run;
        if (this._foxcSprites) this._foxcSprites.clear();
        if (this._foxcShade) this._foxcShade.clear();
      }
    },
    foxcGradCv(stops) {
      if (!this._foxcGrads) this._foxcGrads = new Map();
      const key = JSON.stringify(stops);
      let cv = this._foxcGrads.get(key);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = 4;
        cv.height = 256;
        const g = cv.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 0, 256);
        stops.forEach(([o, c]) => gr.addColorStop(o, c));
        g.fillStyle = gr;
        g.fillRect(0, 0, 4, 256);
        this._foxcGrads.set(key, cv);
      }
      return cv;
    },
    // Degradê vertical (mesma assinatura do cineGradient)
    foxcGrad(ctx, x, y, w, h, stops) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.foxcGradCv(stops), 1, 0, 2, 256, x, y, w, h);
      ctx.restore();
    },
    // Degradê horizontal (stop 0 na esquerda)
    foxcGradH(ctx, x, y, w, h, stops) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.translate(x, y);
      // gira o canvas vertical para o degradê correr na horizontal
      ctx.transform(0, 1, 1, 0, 0, 0);
      ctx.drawImage(this.foxcGradCv(stops), 1, 0, 2, 256, 0, 0, h, w);
      ctx.restore();
    },
    // Céu noturno barato: degradê pronto + estrelas prontas
    foxcSky(ctx, W, h, t, top = '#020617', bottom = '#1e3a8a') {
      this.foxcGrad(ctx, 0, 0, W, h, [[0, top], [1, bottom]]);
      const key = `${W}x${h}`;
      if (!this._foxcStars || this._foxcStars.key !== key) {
        const cv = document.createElement('canvas');
        cv.width = W;
        cv.height = h;
        const g = cv.getContext('2d');
        for (let i = 0; i < 170; i++) {
          g.fillStyle = `rgba(255,255,255,${0.25 + hash(i, 1) * 0.6})`;
          const s = hash(i, 2) < 0.85 ? 1.5 : 2.5;
          g.fillRect(hash(i, 3) * W, hash(i, 4) * h * 0.85, s, s);
        }
        this._foxcStars = { key, cv };
      }
      ctx.save();
      ctx.globalAlpha = 0.75 + Math.sin(t * 0.05) * 0.1;
      ctx.drawImage(this._foxcStars.cv, 0, 0);
      ctx.restore();
    },
    // Granulado de filme barato (texturas prontas ampliadas)
    foxcGrain(ctx, W, H, alpha = 0.06) {
      // três texturas de ruído, montadas uma por quadro (montar as três juntas pesava)
      if (!this._foxcNoise) this._foxcNoise = [];
      if (this._foxcNoise.length < 3) {
        const cv = document.createElement('canvas');
        cv.width = 360;
        cv.height = 210;
        const g = cv.getContext('2d');
        const img = g.createImageData(360, 210);
        let seed = 1 + this._foxcNoise.length * 7919;
        for (let i = 0; i < img.data.length; i += 4) {
          seed = (seed * 16807) % 2147483647;
          const v = seed & 1 ? 255 : 0;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = (seed >> 3) % 150;
        }
        g.putImageData(img, 0, 0);
        this._foxcNoise.push(cv);
      }
      const f = this.sakugaFrame;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this._foxcNoise[f % this._foxcNoise.length], (f * 37) % 40, (f * 23) % 30, 320, 180, 0, 0, W, H);
      ctx.restore();
    },

    // Boneco parado guardado pronto num canvas (desenhar de novo todo quadro custava caro).
    // No máximo UM canvas novo por quadro (montar um boneco grande custa ~10 ms): se o
    // quadro já montou um, este é desenhado direto e fica para o próximo quadro.
    foxcSpriteKey(key, size, opts) {
      return `${key}|${Math.round(size)}|${opts.tint || ''}|${opts.facing || 'front'}|${opts.animState || 'idle'}|${opts.flipX ? 1 : 0}|${opts.showAura ? 1 : 0}|${opts.frame || 0}`;
    },
    // Orçamento de montagem por quadro: ~4 ms (cada boneco pequeno monta em ~1 ms)
    foxcCanBuild() {
      if (this._foxcBudgetFrame !== this.sakugaFrame) {
        this._foxcBudgetFrame = this.sakugaFrame;
        this._foxcBudgetStart = performance.now();
        return true;
      }
      return this._foxcBuiltAt !== this.sakugaFrame || performance.now() - this._foxcBudgetStart < 4;
    },
    // O PixelRenderer desenha qualquer boneco grande em no máximo 5 px por unidade (180 px)
    // e só amplia no fim: aqui o boneco é guardado nesse tamanho pequeno e ampliado na hora
    // de colar. Fica idêntico, monta em ~1 ms e quase não gasta memória.
    foxcBuildSprite(key, char, size, opts = {}) {
      if (!this._foxcSprites) this._foxcSprites = new Map();
      const base = Math.min(Math.round(size), 180);
      const k = this.foxcSpriteKey(key, base, opts);
      let c = this._foxcSprites.get(k);
      if (c) return c;
      if (!this.foxcCanBuild()) return null;
      this._foxcBuiltAt = this.sakugaFrame;
      const pad = Math.ceil(base * (opts.showAura ? 0.45 : 0.34));
      const cv = document.createElement('canvas');
      cv.width = base + pad * 2;
      cv.height = Math.ceil(base * 1.1) + pad * 2;
      const g = cv.getContext('2d');
      g.translate(pad, pad);
      window.PixelRenderer.drawCharacterSprite(g, char, base, base * 1.1, Object.assign({ facing: 'front', frame: 0, animState: 'idle' }, opts));
      c = { cv, pad, base };
      if (this._foxcSprites.size > 80) this._foxcSprites.delete(this._foxcSprites.keys().next().value);
      this._foxcSprites.set(k, c);
      return c;
    },
    foxcCached(ctx, key, char, x, feet, size, opts = {}) {
      const c = this.foxcBuildSprite(key, char, size, opts);
      if (!c) {
        this.drawSprite(ctx, char, x, feet, size, Object.assign({ frame: 0, animState: 'idle' }, opts));
        return;
      }
      const k = size / c.base;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c.cv, Math.round(x - size / 2 - c.pad * k), Math.round(feet - size * 0.87 - c.pad * k), c.cv.width * k, c.cv.height * k);
      ctx.restore();
    },    // O mesmo boneco guardado, desenhado em outra escala (gente andando para longe/perto)
    foxcCachedScaled(ctx, key, char, x, feet, size, base, opts = {}) {
      const k = size / base;
      ctx.save();
      ctx.translate(x, feet);
      ctx.scale(k, k);
      this.foxcCached(ctx, key, char, 0, 0, base, opts);
      ctx.restore();
    },
    // Sombra preta no rosto (como a drawFaceShadow da kit), montada no tamanho pequeno da
    // pixel art e ampliada: a da kit monta no tamanho grande e custava ~30 ms na 1ª vez
    foxcFaceShadow(ctx, char, x, feet, size, opts, amount, solidTo = 11, fadeTo = 14.5) {
      if (amount <= 0.02) return;
      if (!this._foxcShade) this._foxcShade = new Map();
      const base = Math.min(Math.round(size), 180);
      const key = `${char.name}|${char.jerseyPrimary}|${base}|${solidTo}|${fadeTo}|${opts.animState || 'idle'}|${opts.flipX ? 1 : 0}|${opts.facing || 'front'}`;
      let c = this._foxcShade.get(key);
      if (!c) {
        if (!this.foxcCanBuild()) return;
        this._foxcBuiltAt = this.sakugaFrame;
        const pad = Math.ceil(base * 0.34);
        const cv = document.createElement('canvas');
        cv.width = base + pad * 2;
        cv.height = Math.ceil(base * 1.1) + pad * 2;
        const g = cv.getContext('2d');
        g.save();
        g.translate(pad, pad);
        window.PixelRenderer.drawCharacterSprite(g, char, base, base * 1.1, Object.assign({ facing: 'front', animState: 'idle' }, opts, { frame: 0, showAura: false }));
        g.restore();
        const u = base / 36;
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#000000';
        g.fillRect(0, 0, cv.width, cv.height);
        g.globalCompositeOperation = 'destination-in';
        const fade = g.createLinearGradient(0, pad + 4 * u, 0, pad + fadeTo * u);
        fade.addColorStop(0, 'rgba(0,0,0,1)');
        fade.addColorStop((solidTo - 4) / (fadeTo - 4), 'rgba(0,0,0,1)');
        fade.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fade;
        g.fillRect(0, 0, cv.width, cv.height);
        c = { cv, pad, base };
        if (this._foxcShade.size > 24) this._foxcShade.delete(this._foxcShade.keys().next().value);
        this._foxcShade.set(key, c);
      }
      const k = size / c.base;
      ctx.save();
      ctx.globalAlpha *= amount;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(c.cv, Math.round(x - size / 2 - c.pad * k), Math.round(feet - size * 0.87 - c.pad * k), c.cv.width * k, c.cv.height * k);
      ctx.restore();
    },    // Fila de aquecimento: monta antes (um item por quadro livre) o que os próximos planos usam.
    // Itens: ['c', key, char, size, opts] boneco guardado • ['s', char, size, solidTo, fadeTo] sombra
    foxcWarm(def) {
      if (!def.warm) return;
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._foxcWarmRun !== run) {
        this._foxcWarmRun = run;
        this._foxcWarmList = def.warm.call(this);
        this._foxcWarmIdx = 0;
      }
      if (!this._foxcDummy) {
        const cv = document.createElement('canvas');
        cv.width = 1;
        cv.height = 1;
        this._foxcDummy = cv.getContext('2d');
      }
      const list = this._foxcWarmList;
      while (this._foxcWarmIdx < list.length && this.foxcCanBuild()) {
        const it = list[this._foxcWarmIdx++];
        if (it[0] === 'c') this.foxcBuildSprite(it[1], it[2], it[3], it[4] || {});
        else if (it[0] === 's') this.foxcFaceShadow(this._foxcDummy, it[1], 0, 0, it[2], { animState: 'idle', frame: 0 }, 1, it[3] ?? 11, it[4] ?? 14.5);
        else if (it[0] === 'f') {
          this._foxcBuiltAt = this.sakugaFrame;
          it[1].call(this);
        }
      }
    },
    // Rosto recortado (retrato quadrado) guardado pronto: jornal, mural do elenco
    foxcPortrait(char, key, size = 150) {
      if (!this._foxcPort) this._foxcPort = new Map();
      const k = `${key}|${size}`;
      let cv = this._foxcPort.get(k);
      if (cv) return cv;
      cv = document.createElement('canvas');
      cv.width = size;
      cv.height = size;
      const g = cv.getContext('2d');
      const S = size * 2.25;
      const u = S / 36;
      g.imageSmoothingEnabled = false;
      g.translate(size / 2 - S / 2, -1.4 * u);
      window.PixelRenderer.drawCharacterSprite(g, char, S, S * 1.1, { facing: 'front', frame: 0, animState: 'idle' });
      this._foxcPort.set(k, cv);
      return cv;
    },

    // Texto de impacto com alpha multiplicado (o da kit sobrescreve o alpha)
    foxcWord(ctx, text, x, y, size, color, k = 1, alpha = 1, rot = 0, maxW = 0, align = 'center') {
      if (k <= 0 || alpha <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      const sc = 1.5 - ease(k) * 0.5;
      ctx.scale(sc, sc);
      ctx.globalAlpha = Math.min(1, k * 2.5) * alpha;
      let fs = size;
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      while (maxW && fs > 16 && ctx.measureText(text).width > maxW) {
        fs -= 2;
        ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      }
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#020617';
      ctx.fillText(text, fs * 0.05, fs * 0.07);
      ctx.lineWidth = Math.max(4, fs / 9);
      ctx.strokeStyle = '#020617';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    },

    // Texto limpo (créditos, letreiros) com espaçamento opcional
    foxcText(ctx, text, x, y, font, color, alpha = 1, align = 'center', spacing = 0) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = font;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(spacing ? text.split('').join(' ') : text, x, y);
      ctx.restore();
    },

    // Linhas radiais baratas (fundo de painel de mangá)
    // (desenhadas uma vez num canvas por cor/quantidade; depois é só girar e colar)
    foxcRays(ctx, cx, cy, r0, r1, n, color, alpha = 0.3, rot = 0, width = 0.04) {
      if (!this._foxcRayCv) this._foxcRayCv = new Map();
      const key = `${color}|${n}|${width}`;
      let cv = this._foxcRayCv.get(key);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = 512;
        cv.height = 512;
        const g = cv.getContext('2d');
        g.fillStyle = color;
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const w = width * (0.5 + hash(i, 4));
          g.moveTo(256 + Math.cos(a) * 14, 256 + Math.sin(a) * 14);
          g.lineTo(256 + Math.cos(a - w) * 400, 256 + Math.sin(a - w) * 400);
          g.lineTo(256 + Math.cos(a + w) * 400, 256 + Math.sin(a + w) * 400);
          g.closePath();
        }
        g.fill();
        this._foxcRayCv.set(key, cv);
      }
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(cv, -r1, -r1, r1 * 2, r1 * 2);
      ctx.restore();
    },

    // Painel de mangá sem o bug do traço: o cinePanel contorna o caminho ATUAL depois do
    // draw(), então o caminho do painel é refeito no fim (senão ele contorna o último arco)
    foxcPanel(ctx, pts, draw, opts = {}) {
      this.cinePanel(
        ctx,
        pts,
        () => {
          draw();
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
        },
        opts
      );
    },

    // O Fox com o rosto na sombra (só o sorriso aparece) e uma luz de recorte no cabelo,
    // para o contorno branco espetado continuar reconhecível no escuro
    foxcFoxShadowed(ctx, x, feet, size, rim = '#e0f2fe', sides = 0, faceAmount = 1) {
      const fox = this.foxcFox();
      const d = Math.max(6, Math.round(size / 34));
      this.foxcCached(ctx, 'foxc_fox_rim', fox, x, feet - d, size, { tint: rim });
      if (sides) {
        this.foxcCached(ctx, 'foxc_fox_rim', fox, x - d, feet, size, { tint: rim });
        this.foxcCached(ctx, 'foxc_fox_rim', fox, x + d, feet, size, { tint: rim });
      }
      this.foxcCached(ctx, 'foxc_fox', fox, x, feet, size);
      this.foxcFaceShadow(ctx, fox, x, feet, size, { animState: 'idle', frame: 0 }, faceAmount, 11.6, 12.4);
    },

    // A mão do Fox entrando de lado, o indicador apontando para a esquerda (ponta em x, y)
    foxcFingerSide(ctx, x, y, px, skin = '#d6a77a') {
      const r = (cx, cy, w, h, c) => {
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(x + cx * px), Math.round(y + cy * px), Math.ceil(w * px), Math.ceil(h * px));
      };
      r(-0.5, -1.5, 7, 3, '#0c0a09');
      r(5, -2.5, 7, 8, '#0c0a09');
      r(0, -1, 6, 2, skin);
      r(5.5, -2, 6, 7, skin);
      r(5.5, 1.5, 4, 1, 'rgba(0,0,0,0.25)');
      r(5.5, 3, 4, 1, 'rgba(0,0,0,0.25)');
      r(0, -1, 6, 0.6, 'rgba(255,255,255,0.25)');
      r(11.5, -2.5, 1.5, 8, '#f5f5f4');
      r(13, -3, 30, 9, '#0b0f1a');
    },
    foxcTwirl(ctx, x, y, r, t, color = '#fde68a') {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      for (let i = 0; i < 3; i++) {
        const a0 = -t * 0.24 + i * 2.1;
        ctx.globalAlpha = 0.95 - i * 0.25;
        ctx.lineWidth = Math.max(1.5, r * 0.16 - i * r * 0.03);
        ctx.beginPath();
        ctx.arc(x, y, r * (1 + i * 0.5), a0, a0 + 1.5);
        ctx.stroke();
      }
      ctx.restore();
    },

    // Faixa de rosto em close extremo (pixel art): pele, franja em fios, sobrancelha e olhos.
    // eyes = [[x, y], ...]; brow > 0 = bravo (ponta de dentro desce)
    foxcFaceBand(ctx, x, y, w, h, char, o = {}) {
      const px = o.px || 16;
      const eyes = o.eyes || [[x + w / 2, y + h * 0.6]];
      const skin = char.skinColor || '#f3d1b8';
      const hair = char.hairColor || '#0f172a';
      const hair2 = char.hairSecondary || hair;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = skin;
      ctx.fillRect(x, y, w, h);
      // Sombra de pele em degraus (embaixo dos olhos e nas bordas)
      ctx.fillStyle = 'rgba(120,53,15,0.16)';
      eyes.forEach(([ex, ey]) => {
        ctx.fillRect(ex - px * 6, ey + px * 4, px * 12, px);
      });
      // Franja: fios em blocos de pixel, descendo até perto da sobrancelha
      const fringe = o.fringe ?? eyes[0][1] - px * 5.4;
      const step = px * 2;
      for (let cx = x - step * 2, i = 0; cx < x + w + step; cx += step, i++) {
        const tip = fringe - (hash(i, 7) * 1.6 + (i % 3 === 0 ? 0 : 0.8)) * px;
        ctx.fillStyle = hash(i, 9) < 0.22 ? hair2 : hair;
        ctx.fillRect(cx, y - 2, step + 1, tip - y + 2);
        ctx.fillRect(cx + px * 0.5, tip - 2, px, px * 1.6);
        // brilho do cabelo
        if (hash(i, 11) < 0.3) {
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(cx + px * 0.5, y + (tip - y) * 0.3, px * 0.6, (tip - y) * 0.4);
        }
      }
      // Sombra da franja na testa
      ctx.fillStyle = 'rgba(2,6,23,0.22)';
      ctx.fillRect(x, fringe - px * 0.5, w, px * 1.2);
      // Sobrancelhas e olhos
      const cxFace = o.faceX ?? x + w / 2;
      eyes.forEach(([ex, ey]) => {
        const inner = ex < cxFace ? 1 : -1;
        const by = ey - px * 6;
        ctx.fillStyle = o.browColor || '#0b0f1a';
        for (let c = 0; c < 11; c++) {
          const k = inner > 0 ? c / 10 : 1 - c / 10; // 1 = ponta de dentro
          const off = Math.round((o.brow || 0) * k * 1.3) * px;
          if (c > 0) ctx.fillRect(Math.round(ex - px * 5.5 + c * px), Math.round(by + off), Math.ceil(px), Math.ceil(px * 1.1));
        }
        this.drawPixelEye(ctx, ex, ey, px, {
          line: o.line || '#020617',
          white: o.white,
          iris: o.iris || '#0f766e',
          ring: o.ring || '#5eead4',
          tiny: o.tiny,
          look: o.look || 0,
          blink: o.blink
        });
        // brilho no olho (um pixel branco na íris)
        if (!o.tiny && !o.blink) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(Math.round(ex - 6 * px) + (4 + (o.look || 0)) * px, Math.round(ey - 3.5 * px) + 2 * px, Math.ceil(px), Math.ceil(px));
        }
      });
      if (o.dim) {
        ctx.fillStyle = `rgba(${o.dimTint || '2,6,23'},${o.dim})`;
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
    },

    // Corrente atravessando de (x1,y1) a (x2,y2). snap 0..1 = partindo no meio e voando
    foxcChain(ctx, x1, y1, x2, y2, o = {}) {
      const link = o.link || 40;
      const thick = o.thick || 11;
      const snap = o.snap || 0;
      const vib = o.vib || 0;
      const t = o.t || 0;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const L = Math.hypot(dx, dy);
      const n = Math.ceil(L / (link * 0.78));
      const ang = Math.atan2(dy, dx);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const cut = o.cut ?? 0.5;
      for (let i = 0; i <= n; i++) {
        const s = i / n;
        if (snap > 0 && Math.abs(s - cut) < 0.6 / n) continue;
        let px = x1 + dx * s;
        let py = y1 + dy * s;
        const sag = Math.sin(s * Math.PI) * (o.sag || 0);
        const v = Math.sin(i * 1.7 + t * 1.1) * vib;
        px += nx * (sag + v);
        py += ny * (sag + v);
        let rot = 0;
        if (snap > 0) {
          const side = s < cut ? -1 : 1;
          const d = 1 - Math.min(1, Math.abs(s - cut) * 2);
          const fly = snap * (60 + d * 260) * (0.6 + hash(i, 2) * 0.6);
          px += side * Math.cos(ang) * fly;
          py += side * Math.sin(ang) * fly + snap * snap * 220 * hash(i, 5);
          rot = side * snap * (1 + hash(i, 3) * 3);
        }
        const cv = this.foxcLink(link, thick, i % 2 === 1, o.color || '#64748b', o.shine || '#cbd5e1');
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang + rot);
        ctx.drawImage(cv, -cv.width / 2, -cv.height / 2);
        ctx.restore();
      }
    },
    // Um elo de corrente pronto num canvas (traçar 3 elipses grossas por elo era caro)
    foxcLink(link, thick, flat, color, shine) {
      if (!this._foxcLinks) this._foxcLinks = new Map();
      const key = `${link}|${thick}|${flat ? 1 : 0}|${color}|${shine}`;
      let cv = this._foxcLinks.get(key);
      if (cv) return cv;
      cv = document.createElement('canvas');
      cv.width = Math.ceil(link * 1.12 + thick + 10);
      cv.height = Math.ceil((flat ? link * 0.2 : link * 0.6) + thick + 10);
      const g = cv.getContext('2d');
      g.translate(cv.width / 2, cv.height / 2);
      g.beginPath();
      g.ellipse(0, 0, link * 0.56, flat ? link * 0.1 : link * 0.3, 0, 0, Math.PI * 2);
      g.lineWidth = thick + 4;
      g.strokeStyle = '#020617';
      g.stroke();
      g.lineWidth = thick;
      g.strokeStyle = color;
      g.stroke();
      g.lineWidth = Math.max(1.5, thick * 0.28);
      g.strokeStyle = shine;
      g.beginPath();
      g.ellipse(0, -1, link * 0.5, flat ? link * 0.05 : link * 0.24, 0, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
      this._foxcLinks.set(key, cv);
      return cv;
    },

    // Fogos de artifício (n foguetes em ciclo, posições fixas por índice)
    foxcFireworks(ctx, W, y0, y1, t, n = 6, colors = ['#facc15', '#38bdf8', '#f8fafc', '#ef4444'], seed = 1, period = 96, scale = 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const per = period + Math.floor(hash(i, seed) * 40);
        const local = t + hash(i, seed + 1) * per;
        const cyc = Math.floor(local / per);
        const age = local % per;
        const x = W * (0.08 + 0.84 * hash(i * 7 + cyc, seed + 3));
        const y = lerp(y0, y1, hash(i * 3 + cyc, seed + 2));
        const col = colors[(i + cyc) % colors.length];
        if (age < 16) {
          // o foguete subindo
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y + (16 - age) * 22);
          ctx.lineTo(x, y + (16 - age) * 22 + 30);
          ctx.stroke();
          continue;
        }
        const a2 = age - 16;
        const life = per - 16;
        const R = 150 * scale * (0.7 + hash(i, seed + 5) * 0.5) * ease(a2 / 34);
        const fade = 1 - a2 / life;
        if (a2 < 8) this.cineGlow(ctx, x, y, 90 * scale, 'rgba(255,255,255,0.8)', 1 - a2 / 8);
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        const m = 26;
        ctx.globalAlpha = Math.max(0, fade);
        ctx.beginPath();
        for (let j = 0; j < m; j++) {
          const a = (j / m) * Math.PI * 2 + hash(i, seed + 9);
          const drop = a2 * a2 * 0.012 * scale;
          const px = x + Math.cos(a) * R;
          const py = y + Math.sin(a) * R + drop;
          ctx.moveTo(px, py);
          ctx.lineTo(x + Math.cos(a) * R * 0.82, y + Math.sin(a) * R * 0.82 + drop * 0.8);
        }
        ctx.stroke();
        for (let j = 0; j < m; j++) {
          const a = (j / m) * Math.PI * 2 + hash(i, seed + 9);
          const drop = a2 * a2 * 0.012 * scale;
          ctx.fillRect(x + Math.cos(a) * R - 2, y + Math.sin(a) * R + drop - 2, 4, 4);
        }
      }
      ctx.restore();
    },

    // Bandeiras (prontas num canvas pequeno) tremulando em fatias
    foxcFlagCanvas(code) {
      if (!this._foxcFlags) this._foxcFlags = {};
      if (this._foxcFlags[code]) return this._foxcFlags[code];
      const cv = document.createElement('canvas');
      cv.width = 120;
      cv.height = 80;
      const g = cv.getContext('2d');
      const vert = (a, b, c) => {
        [a, b, c].forEach((col, i) => {
          g.fillStyle = col;
          g.fillRect(i * 40, 0, 40, 80);
        });
      };
      const horiz = (a, b, c) => {
        [a, b, c].forEach((col, i) => {
          g.fillStyle = col;
          g.fillRect(0, Math.round(i * 26.67), 120, 27);
        });
      };
      if (code === 'jp') {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, 120, 80);
        g.fillStyle = '#dc2626';
        g.beginPath();
        g.arc(60, 40, 24, 0, Math.PI * 2);
        g.fill();
      } else if (code === 'it') vert('#15803d', '#f8fafc', '#dc2626');
      else if (code === 'ng') vert('#15803d', '#f8fafc', '#15803d');
      else if (code === 'fr') vert('#1d4ed8', '#f8fafc', '#dc2626');
      else if (code === 'ar') {
        horiz('#7dd3fc', '#f8fafc', '#7dd3fc');
        g.fillStyle = '#facc15';
        g.beginPath();
        g.arc(60, 40, 8, 0, Math.PI * 2);
        g.fill();
      }
      this._foxcFlags[code] = cv;
      return cv;
    },
    foxcFlag(ctx, code, x, y, w, h, t, amp = 0.07) {
      const cv = this.foxcFlagCanvas(code);
      const n = 14;
      const sw = w / n;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < n; i++) {
        const ph = i / n;
        const wv = Math.sin(t * 0.11 - ph * 5);
        const off = wv * h * amp * (0.3 + ph);
        ctx.drawImage(cv, ph * 120, 0, 120 / n + 0.5, 80, x + i * sw, y + off, sw + 1, h);
        ctx.fillStyle = wv > 0 ? `rgba(255,255,255,${wv * 0.1})` : `rgba(0,0,0,${-wv * 0.22})`;
        ctx.fillRect(x + i * sw, y + off, sw + 1, h);
      }
      ctx.restore();
    },

    // A Bola de Ouro (troféu): esfera dourada com gomos e brilho
    foxcGoldBall(ctx, x, y, r, t) {
      ctx.save();
      this.cineGlow(ctx, x, y, r * 2.6, 'rgba(253,224,71,0.55)');
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, '#fffbeb');
      g.addColorStop(0.35, '#fde047');
      g.addColorStop(0.8, '#ca8a04');
      g.addColorStop(1, '#713f12');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(113,63,18,0.65)';
      ctx.lineWidth = Math.max(2, r * 0.05);
      const sp = t * 0.02;
      for (let i = -2; i <= 2; i++) {
        const ox = Math.sin(sp + i * 0.9) * r;
        ctx.beginPath();
        ctx.ellipse(x + ox * 0.3, y, Math.abs(Math.cos(sp + i * 0.9)) * r * 0.9 + 2, r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // pedestal
      ctx.fillStyle = '#a16207';
      ctx.fillRect(x - r * 0.35, y + r * 0.9, r * 0.7, r * 0.4);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(x - r * 0.55, y + r * 1.25, r * 1.1, r * 0.35);
      // estrela de brilho
      const sx = x - r * 0.45;
      const sy = y - r * 0.5;
      const s = r * (0.35 + 0.15 * Math.sin(t * 0.1));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx, sy - s);
      ctx.lineTo(sx + s * 0.18, sy - s * 0.18);
      ctx.lineTo(sx + s, sy);
      ctx.lineTo(sx + s * 0.18, sy + s * 0.18);
      ctx.lineTo(sx, sy + s);
      ctx.lineTo(sx - s * 0.18, sy + s * 0.18);
      ctx.lineTo(sx - s, sy);
      ctx.lineTo(sx - s * 0.18, sy - s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    // A taça da Copa do Mundo (dourada, faixas verdes na base, o globo em cima). y = base
    foxcWCTrophy(ctx, x, y, sc) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sc, sc);
      const gold = ctx.createLinearGradient(-40, 0, 40, 0);
      gold.addColorStop(0, '#78350f');
      gold.addColorStop(0.3, '#eab308');
      gold.addColorStop(0.5, '#fef9c3');
      gold.addColorStop(0.7, '#ca8a04');
      gold.addColorStop(1, '#713f12');
      ctx.fillStyle = gold;
      ctx.fillRect(-30, -34, 60, 34);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-30, -28, 60, 7);
      ctx.fillRect(-30, -14, 60, 7);
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(-26, -34);
      ctx.bezierCurveTo(-12, -70, -6, -96, -24, -128);
      ctx.bezierCurveTo(-38, -150, -26, -168, 0, -170);
      ctx.bezierCurveTo(26, -168, 38, -150, 24, -128);
      ctx.bezierCurveTo(6, -96, 12, -70, 26, -34);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,53,15,0.7)';
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i * 18, -36);
        ctx.bezierCurveTo(i * -10, -80, i * 20, -110, i * -6, -150);
        ctx.stroke();
      }
      const gl = ctx.createRadialGradient(-10, -196, 4, 0, -186, 30);
      gl.addColorStop(0, '#fffbeb');
      gl.addColorStop(0.45, '#facc15');
      gl.addColorStop(1, '#854d0e');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(0, -186, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(133,77,14,0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, -186, 12, 28, 0, 0, Math.PI * 2);
      ctx.moveTo(-28, -186);
      ctx.lineTo(28, -186);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(-18, -120, 5, 50);
      ctx.restore();
    },

    // Placar de TV (canto inferior)
    foxcScorebug(ctx, x, y, home, away, hs, as, tag, k = 1, tagColor = '#ef4444') {
      if (k <= 0) return;
      ctx.save();
      ctx.translate((1 - ease(k)) * -420, 0);
      ctx.fillStyle = 'rgba(2,6,23,0.92)';
      ctx.fillRect(x, y, 380, 54);
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x, y, 8, 54);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x + 372, y, 8, 54);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x + 150, y, 80, 54);
      this.foxcText(ctx, home, x + 80, y + 28, '900 20px "Segoe UI", sans-serif', '#f8fafc');
      this.foxcText(ctx, away, x + 300, y + 28, '900 20px "Segoe UI", sans-serif', '#f8fafc');
      this.foxcText(ctx, `${hs} - ${as}`, x + 190, y + 28, '900 26px "Segoe UI", sans-serif', '#020617');
      if (tag) {
        ctx.fillStyle = tagColor;
        ctx.fillRect(x, y + 54, 140, 26);
        this.foxcText(ctx, tag, x + 70, y + 67, '900 14px "Segoe UI", sans-serif', '#ffffff');
      }
      ctx.restore();
    },

    // Painéis verticais inclinados lado a lado (mangá), cada um entra deslizando
    foxcStrips(ctx, S, n, t, drawFn, o = {}) {
      const { W, top, bot } = S;
      const pad = o.pad ?? 14;
      const skew = o.skew ?? 46;
      const gap = 8;
      const w = (W - pad * 2) / n;
      for (let i = 0; i < n; i++) {
        const k = ease(seg(t, (o.start || 0) + i * (o.stagger ?? 14), (o.start || 0) + i * (o.stagger ?? 14) + 20));
        if (k <= 0) continue;
        const x0 = pad + i * w;
        const x1 = x0 + w;
        const y0 = top + pad;
        const y1 = bot - pad;
        const l = i === 0 ? 0 : skew;
        const r = i === n - 1 ? 0 : skew;
        const pts = [
          [x0 + l + gap, y0],
          [x1 + r - gap, y0],
          [x1 - r - gap, y1],
          [x0 - l + gap, y1]
        ];
        const dir = i % 2 ? 1 : -1;
        const cx = (x0 + x1) / 2;
        this.foxcPanel(ctx, pts, () => drawFn(i, cx, y0, y1, k), { dy: (1 - k) * dir * (S.H * 0.9), width: 5 });
      }
    },

    // Letreiro de créditos: linhas aparecendo em sequência (k 0..1) e sumindo no fim (out 0..1)
    foxcCredits(ctx, x, y, lines, k, out = 0, align = 'center') {
      const fonts = {
        kick: ['900 15px "Segoe UI", sans-serif', '#00f5d4', 30, true],
        name: ['italic 900 40px "Segoe UI", sans-serif', '#f8fafc', 52, false],
        role: ['italic 600 19px "Segoe UI", sans-serif', '#94a3b8', 30, false],
        line: ['700 22px "Segoe UI", sans-serif', '#e2e8f0', 34, false],
        big: ['italic 900 56px "Segoe UI", sans-serif', '#facc15', 74, false],
        gap: [null, null, 22, false]
      };
      let yy = y;
      const n = lines.length;
      lines.forEach(([kind, text], i) => {
        const f = fonts[kind];
        const a = clamp(k * (n + 2) - i) * (1 - out);
        if (f[0] && text && a > 0) {
          this.foxcText(ctx, text, x, yy + (1 - ease(a)) * 14, f[0], f[1], a, align, f[3]);
        }
        yy += f[2];
      });
    },

    // ======================================================================
    // 1) O TREINO DA RAPOSA
    // ======================================================================
    // Plano 1: a escadaria antes do sol, a câmera abre do seu rosto até o Fox lá em cima
    foxcTrain0(ctx, S) {
      const { W, H, t } = S;
      const you = this.cineYou();
      const fox = this.foxcFox();
      const N = 20;
      const x0 = -40;
      const y0 = H * 0.97;
      const xTop = W * 0.74;
      const yTop = H * 0.36;
      const dx = (xTop - x0) / N;
      const dy = (y0 - yTop) / N;
      const p = 2 + (t / 180) * 9.5;
      const rx = x0 + p * dx + dx * 0.4;
      const fr = p % 1;
      const ry = y0 - Math.floor(p) * dy - Math.sin(fr * Math.PI) * dy * 0.5;
      const e = easeIO(seg(t, 25, 172));
      const cam = { x: lerp(rx + 70, W * 0.5, e), y: lerp(ry - 90, H * 0.5, e), zoom: lerp(1.75, 1.0, e), shake: 1.6 * (1 - e) };

      // Céu antes do sol (fica parado: dá a profundidade)
      this.foxcSky(ctx, W, H, t, '#01030b', '#16213f');
      this.foxcGrad(ctx, 0, H * 0.55, W, H * 0.45, [[0, 'rgba(127,29,29,0)'], [1, 'rgba(127,29,29,0.35)']]);
      this.cineCity(ctx, W, H * 0.8, 200, '#060a16', 'rgba(56,189,248,0.32)', 4, (cam.x - W / 2) * 0.15);

      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      // O bloco da escadaria
      const g = ctx.createLinearGradient(0, yTop, 0, H);
      g.addColorStop(0, '#1e293b');
      g.addColorStop(1, '#0b1120');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-700, H + 400);
      ctx.lineTo(-700, y0);
      ctx.lineTo(x0, y0);
      for (let i = 0; i < N; i++) {
        ctx.lineTo(x0 + (i + 1) * dx, y0 - i * dy);
        ctx.lineTo(x0 + (i + 1) * dx, y0 - (i + 1) * dy);
      }
      ctx.lineTo(W + 400, yTop);
      ctx.lineTo(W + 400, H + 400);
      ctx.closePath();
      ctx.fill();
      // Quinas dos degraus acesas pela luz lá de cima
      for (let i = 0; i < N; i++) {
        const lit = 0.18 + 0.7 * (i / N) ** 2;
        ctx.fillStyle = `rgba(148,163,184,${lit})`;
        ctx.fillRect(x0 + i * dx, y0 - i * dy - 2, dx, 3);
        ctx.fillStyle = `rgba(2,6,23,${0.5 - lit * 0.3})`;
        ctx.fillRect(x0 + (i + 1) * dx - 3, y0 - (i + 1) * dy, 3, dy);
      }
      ctx.fillStyle = 'rgba(203,213,225,0.55)';
      ctx.fillRect(xTop, yTop - 2, W + 400 - xTop, 3);
      // Corrimão
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-700, y0 - 78);
      ctx.lineTo(x0, y0 - 78);
      ctx.lineTo(xTop, yTop - 78);
      ctx.lineTo(W + 400, yTop - 78);
      ctx.stroke();
      ctx.lineWidth = 3;
      for (let i = 0; i <= N; i += 3) {
        const px = x0 + i * dx + dx * 0.5;
        const py = y0 - i * dy;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - 78 - dy * 0.5);
        ctx.stroke();
      }
      // O poste com o refletor e o cone de luz no patamar
      const lx = W * 0.93;
      const ly = H * 0.09;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(lx - 4, ly, 8, yTop - ly);
      ctx.fillRect(lx - 40, ly - 8, 44, 14);
      const cone = ctx.createLinearGradient(0, ly, 0, yTop);
      cone.addColorStop(0, 'rgba(219,234,254,0.42)');
      cone.addColorStop(1, 'rgba(219,234,254,0.05)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lx - 46, ly + 6);
      ctx.lineTo(lx - 14, ly + 6);
      ctx.lineTo(lx + 90, yTop);
      ctx.lineTo(lx - 260, yTop);
      ctx.closePath();
      ctx.fill();
      this.cineGlow(ctx, lx - 30, ly + 4, 70, 'rgba(219,234,254,0.9)');
      // O Fox no patamar: sombra no rosto, só o sorriso, girando o dedo
      const fx = W * 0.85;
      this.foxcFoxShadowed(ctx, fx, yTop + 2, 150, '#e0f2fe');
      this.foxcTwirl(ctx, fx + 150 * 0.32, yTop - 150 * 0.4, 9, t);
      // a poça de luz no patamar
      this.cineGlow(ctx, fx - 40, yTop, 150, 'rgba(219,234,254,0.25)');
      // Você subindo
      this.drawSprite(ctx, you, rx, ry, 120, { animState: 'run', frame: t * 1.1 });
      // Fôlego virando fumaça no frio
      const hx = rx + 8;
      const hy = ry - 120 * 0.62;
      for (let i = 0; i < 6; i++) {
        const age = (t + i * 11) % 66;
        const a = 0.32 * (1 - age / 66);
        ctx.fillStyle = `rgba(203,213,225,${a})`;
        ctx.beginPath();
        ctx.arc(hx - age * 0.9, hy - age * 0.35, 3 + age * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      this.cineDust(ctx, W, H, t, 26, 'rgba(219,234,254,0.55)', 5);
      ctx.restore();

      // Contador de degraus (tipografia na tela)
      const k = ease(seg(t, 10, 30));
      const steps = Math.floor(lerp(231, 262, t / 180));
      this.foxcText(ctx, 'DEGRAU', 64, S.top + 44, '900 14px "Segoe UI", sans-serif', '#93c5fd', k, 'left', true);
      this.foxcWord(ctx, `${steps}`, 64, S.top + 100, 74, '#f8fafc', 1, k, 0, 0, 'left');
      ctx.font = 'italic 900 74px "Segoe UI", sans-serif';
      this.foxcText(ctx, '/ 300', 64 + ctx.measureText(`${steps}`).width + 14, S.top + 112, 'italic 800 26px "Segoe UI", sans-serif', '#64748b', k, 'left');
      this.foxcWord(ctx, '9ª SUBIDA', 150, S.top + 170, 36, '#ef4444', seg(t, 55, 68), 1, -0.08);
    },

    // Plano 2: tríptico de mangá — você sem ar, o cronômetro girando no dedo, o Fox de baixo
    foxcTrain1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const you = this.cineYou();
      const fox = this.foxcFox();
      ctx.fillStyle = '#03050b';
      ctx.fillRect(0, 0, W, H);
      this.foxcRays(ctx, W / 2, H / 2, 60, W, 40, '#1e293b', 0.5, t * 0.002);
      const g = (y) => 520 - (80 * (y - (top + 18))) / (bot - top - 36);
      const yA = top + 18;
      const yB = top + 252;
      const yC = top + 270;
      const yD = bot - 18;
      // A: você, ofegante
      const kA = ease(seg(t, 0, 22));
      this.foxcPanel(
        ctx,
        [[24, yA], [g(yA), yA], [g(yD), yD], [24, yD]],
        () => {
          this.foxcGrad(ctx, 0, yA, W, yD - yA, [[0, '#0b1a3a'], [1, '#050a18']]);
          const sx = this.cineNoise(t * 2, 3) * 3;
          const r = this.cineHead(ctx, you, 270 + sx, yA + 230 + Math.sin(t * 0.3) * 4, 640);
          ctx.fillStyle = 'rgba(8,18,48,0.38)';
          ctx.fillRect(0, yA, 560, yD - yA);
          // suor
          for (let i = 0; i < 7; i++) {
            const dy = (t * (1.4 + hash(i) * 1.2) + hash(i, 2) * 200) % 260;
            const x = 270 + (hash(i, 3) - 0.5) * 360;
            ctx.fillStyle = 'rgba(191,219,254,0.85)';
            ctx.fillRect(x, yA + 140 + dy, 6, 10);
            ctx.fillRect(x + 1, yA + 136 + dy, 4, 4);
          }
          // a respiração
          const mouthY = r.top + 14.5 * r.u;
          for (let i = 0; i < 4; i++) {
            const age = (t + i * 9) % 36;
            ctx.fillStyle = `rgba(226,232,240,${0.35 * (1 - age / 36)})`;
            ctx.beginPath();
            ctx.arc(300 + age * 2.2, mouthY + age * 0.6, 8 + age * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
          this.foxcWord(ctx, 'hah... hah...', 150, yD - 60, 30, '#e2e8f0', seg(t, 18, 30), 1, -0.05);
        },
        { dx: (1 - kA) * -620, width: 5 }
      );
      // B: o cronômetro balançando no dedo
      const kB = ease(seg(t, 16, 38));
      this.foxcPanel(
        ctx,
        [[g(yA) + 22, yA], [W - 24, yA], [W - 24, yB], [g(yB) + 22, yB]],
        () => {
          ctx.fillStyle = '#07080d';
          ctx.fillRect(g(yA), yA, W, yB - yA);
          const pvx = W * 0.72;
          const pvy = yA + 34;
          this.cineGlow(ctx, pvx, yA + 120, 220, 'rgba(245,158,11,0.18)');
          const ang = Math.sin(t * 0.09) * 0.55;
          const L = 108;
          const wx = pvx + Math.sin(ang) * L;
          const wy = pvy + Math.cos(ang) * L;
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(pvx, pvy);
          ctx.lineTo(wx, wy - 60);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.save();
          ctx.translate(wx, wy);
          ctx.rotate(-ang * 0.6);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-9, -72, 18, 16);
          const sg = ctx.createRadialGradient(-14, -14, 4, 0, 0, 62);
          sg.addColorStop(0, '#f1f5f9');
          sg.addColorStop(1, '#475569');
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(0, 0, 60, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0b0f1a';
          ctx.beginPath();
          ctx.arc(0, 0, 50, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 42, Math.sin(a) * 42);
            ctx.lineTo(Math.cos(a) * 48, Math.sin(a) * 48);
            ctx.stroke();
          }
          const secs = 37 + Math.floor(t / 6);
          const ha = (Math.floor(t / 6) / 60) * Math.PI * 2 - Math.PI / 2;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ha) * 40, Math.sin(ha) * 40);
          ctx.stroke();
          this.foxcText(ctx, `04:12:${String(secs % 60).padStart(2, '0')}`, 0, 22, '800 13px "Consolas", monospace', '#fca5a5');
          ctx.restore();
          this.foxcFingerSide(ctx, pvx - 4, pvy, 6, fox.skinColor);
          this.foxcWord(ctx, Math.floor(t / 30) % 2 ? 'TAC' : 'TIC', g(yA) + 120, yA + 70, 30, '#f8fafc', 1, 0.8, -0.1);
        },
        { dy: (1 - kB) * -320, width: 5 }
      );
      // C: o Fox visto de baixo, rosto na sombra, os olhos com anéis acendendo
      const kC = ease(seg(t, 46, 70));
      this.foxcPanel(
        ctx,
        [[g(yC) + 22, yC], [W - 24, yC], [W - 24, yD], [g(yD) + 22, yD]],
        () => {
          this.foxcGrad(ctx, 0, yC, W, yD - yC, [[0, '#1a1208'], [1, '#05040a']]);
          const cx = W * 0.7;
          this.cineShafts(ctx, cx, yC - 30, Math.PI / 2, 360, 0.7, 5, '254,243,199', 0.2, t);
          const size = 520;
          const eyeY = yC + 150;
          const r = { u: size / 36 };
          r.feet = eyeY - 10.1 * r.u + size * 0.87;
          this.foxcFoxShadowed(ctx, cx, r.feet, size, '#fef3c7');
          const open = seg(t, 100, 112);
          if (open > 0) {
            [-1, 1].forEach((s) => {
              this.cineGlow(ctx, cx + s * 3.3 * r.u, eyeY, r.u * 4, 'rgba(254,243,199,0.35)', open);
              this.drawPixelEye(ctx, cx + s * 3.3 * r.u, eyeY, r.u * 0.24, { line: '#0c0a09', iris: '#1c1917', ring: '#f5f5f4', look: s > 0 ? -1 : 1, blink: open < 0.5 });
            });
          }
          this.foxcTwirl(ctx, g(yD) + 140, yD - 70, 16, t);
        },
        { dx: (1 - kC) * 760, width: 5 }
      );
    },

    // Plano 3: close extremo no Fox — o rosto some na sombra, ficam o sorriso e os olhos
    foxcTrain2(ctx, S) {
      const { W, H, t } = S;
      const fox = this.foxcFox();
      ctx.fillStyle = '#030206';
      ctx.fillRect(0, 0, W, H);
      const x = W * 0.33;
      const eyeY = H * 0.5;
      const size = 700;
      const u = size / 36;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W * 0.5, y: H * 0.5, zoom: 1 + easeIO(t / 190) * 0.12, shake: 0.8 });
      this.cineGlow(ctx, x, eyeY - u * 4, 520, 'rgba(127,29,29,0.55)');
      const top0 = eyeY - 10.1 * u;
      const feet = top0 + size * 0.87;
      this.foxcFoxShadowed(ctx, x, feet, size, '#b91c1c', 1);
      const open = seg(t, 38, 50);
      if (open > 0) {
        [-1, 1].forEach((s) => {
          this.cineGlow(ctx, x + s * 3.3 * u, eyeY, u * 5, 'rgba(254,226,226,0.28)', open);
          this.drawPixelEye(ctx, x + s * 3.3 * u, eyeY, u * 0.25, { line: '#0c0a09', iris: '#1c1917', ring: '#f5f5f4', look: s > 0 ? -1 : 1, blink: open < 0.6 });
        });
      }
      // o giro do dedo em cima da mão dele
      this.foxcTwirl(ctx, x + 9.6 * u, top0 + 22 * u, 26, t);
      ctx.restore();
      // Palavras-chave entrando como letreiro
      const words = [
        { at: 20, text: 'MONSTRO', y: 0.32, s: 88, c: '#f8fafc' },
        { at: 82, text: 'COLEIRA', y: 0.5, s: 78, c: '#cbd5e1' },
        { at: 140, text: 'EU VIM TIRAR.', y: 0.68, s: 64, c: '#ef4444' }
      ];
      words.forEach((w, i) => {
        const next = words[i + 1];
        const dim = next && t > next.at ? 0.3 : 1;
        this.foxcWord(ctx, w.text, W * 0.79, H * w.y, w.s, w.c, seg(t, w.at, w.at + 14), dim, -0.05, W * 0.38);
      });
    },

    // Plano 4: amanhecer no alto da escada — as correntes em você e a sombra que cresce
    foxcTrain3(ctx, S) {
      const { W, H, t } = S;
      const you = this.cineYou();
      const fox = this.foxcFox();
      const beats = [24, 66, 104, 136, 162];
      const punch = beats.reduce((s, b) => s + pulse(t, b, 16), 0);
      const ground = H * 0.88;
      const yx = W * 0.58;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W * 0.55, y: H * 0.52, zoom: 1 + easeIO(t / 170) * 0.1 + punch * 0.025 });
      // O muro de concreto no alto da escada, pegando a primeira luz (baixa, da direita)
      this.foxcGrad(ctx, -200, -100, W + 400, ground + 100, [[0, '#0e1630'], [1, '#26304d']]);
      this.foxcGradH(ctx, -200, -100, W + 400, ground + 100, [[0, 'rgba(15,23,42,0)'], [0.55, 'rgba(190,24,93,0.12)'], [1, 'rgba(251,146,60,0.4)']]);
      ctx.fillStyle = 'rgba(2,6,23,0.45)';
      for (let x = -160; x < W + 200; x += 170) ctx.fillRect(x, -100, 4, ground + 100);
      ctx.fillRect(-200, H * 0.36, W + 400, 4);
      ctx.fillStyle = 'rgba(148,163,184,0.25)';
      for (let x = -160; x < W + 200; x += 170) {
        ctx.fillRect(x + 14, H * 0.36 + 16, 5, 5);
        ctx.fillRect(x + 150, H * 0.36 + 16, 5, 5);
      }
      // A sua sombra no muro: grande, torta... e crescendo com o coração
      const grow = 0.5 + ease(seg(t, 0, 130)) * 0.32 + punch * 0.03;
      const msize = 820;
      const mu = msize / 36;
      ctx.save();
      ctx.translate(yx - 60, ground);
      ctx.transform(1, 0, -0.22, 1, 0, 0);
      ctx.scale(grow, grow * 1.06);
      this.foxcCached(ctx, 'foxc_wall_shadow', you, 0, 0, msize, { tint: 'rgba(5,4,14,0.82)' });
      const eo = seg(t, 96, 110);
      if (eo > 0) {
        const meY = -msize * 0.87 + 10.1 * mu;
        [-1, 1].forEach((s) => {
          this.cineGlow(ctx, s * 3.3 * mu, meY, mu * 4, 'rgba(239,68,68,0.55)', eo);
          this.drawPixelEye(ctx, s * 3.3 * mu, meY, mu * 0.3, { line: '#1c0505', white: '#fecaca', iris: '#450a0a', ring: '#ef4444', blink: eo < 0.5 });
        });
      }
      ctx.restore();
      // O chão do patamar
      ctx.fillStyle = '#111827';
      ctx.fillRect(-200, ground, W + 400, H);
      ctx.fillStyle = 'rgba(251,146,60,0.35)';
      ctx.fillRect(-200, ground, W + 400, 3);
      // Você, com a luz da manhã raspando de um lado
      const feet = ground;
      this.foxcCached(ctx, 'foxc_you_warmrim', you, yx + 3, feet - 1, 300, { tint: '#fdba74' });
      this.drawSpriteDim(ctx, you, yx, feet, 300, { animState: 'idle', frame: 0 }, 0.3, '12,24,60');
      // O coração batendo (anéis vermelhos)
      beats.forEach((b) => {
        const a = t - b;
        if (a < 0 || a > 40) return;
        ctx.strokeStyle = `rgba(239,68,68,${0.7 * (1 - a / 40)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(yx, feet - 300 * 0.48, 30 + a * 9, 0, Math.PI * 2);
        ctx.stroke();
      });
      // As correntes presas em você, na cintura
      const vib = punch * 6;
      this.foxcChain(ctx, -60, H * 0.5, W + 60, H * 0.86, { t, vib, sag: 18, link: 40, thick: 10 });
      this.foxcChain(ctx, -60, H * 0.9, W + 60, H * 0.56, { t: t + 3, vib, sag: 14, link: 40, thick: 10 });
      ctx.restore();
      // O Fox em primeiro plano, de costas, girando o dedo
      this.foxcCached(ctx, 'foxc_fox_back_rim', fox, W * 0.1 + 18, H * 1.28, 640, { facing: 'back', tint: '#9a3412' });
      this.foxcCached(ctx, 'foxc_fox_back', fox, W * 0.1, H * 1.28, 640, { facing: 'back', tint: '#010205' });
      this.foxcTwirl(ctx, W * 0.1 + 640 * 0.27, H * 1.28 - 640 * 0.52, 18, t);
    },

    // Plano 5: o seu olho em close extremo — a íris fica vermelha, as correntes racham
    foxcTrain4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const you = this.cineYou();
      const beats = [14, 50, 84, 112, 134];
      const punch = beats.reduce((s, b) => s + pulse(t, b, 14), 0);
      const red = t >= 40;
      const ex = W * 0.5;
      const ey = H * 0.5;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1 + easeIO(t / 150) * 0.08 + punch * 0.03, shake: punch * 3 });
      this.foxcFaceBand(ctx, -40, top - 40, W + 80, bot - top + 80, you, {
        px: 34,
        eyes: [[ex, ey]],
        faceX: ex + 400,
        iris: red ? '#450a0a' : you.eyeColor || '#ef4444',
        ring: red ? '#ef4444' : '#fca5a5',
        brow: red ? 0.8 : 0.2,
        dim: 0.3,
        dimTint: '6,10,30'
      });
      if (red) this.cineGlow(ctx, ex, ey, 260, 'rgba(239,68,68,0.45)', Math.min(1, (t - 40) / 10));
      const crack = seg(t, 95, 104);
      this.foxcChain(ctx, -80, H * 0.4, W + 80, H * 1.16, { t, vib: punch * 8, link: 64, thick: 16 });
      this.foxcChain(ctx, -80, H * 1.16, W + 80, H * 0.4, { t: t + 5, vib: punch * 8, link: 64, thick: 16 });
      if (crack > 0) {
        ctx.strokeStyle = '#fef2f2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        [[W * 0.36, H * 0.39], [W * 0.62, H * 0.56]].forEach(([cx, cy], k) => {
          for (let i = 0; i < 5; i++) {
            const a = i * 1.3 + k;
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * 40 * crack, cy + Math.sin(a) * 40 * crack);
          }
        });
        ctx.stroke();
      }
      ctx.restore();
      this.foxcGrad(ctx, 0, bot - 170, W, 170, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]);
      this.foxcWord(ctx, '...DEIXA ELE SAIR.', W / 2, bot - 86, 70, '#ef4444', seg(t, 86, 100), 1, -0.02, W * 0.8);
      this.foxcText(ctx, 'FICOU PRA TRÁS NO PLACAR? ELE VAI ACORDAR.', W / 2, bot - 30, '900 16px "Segoe UI", sans-serif', '#fecaca', seg(t, 112, 126), 'center', true);
    },

    // ======================================================================
    // 2) O MONSTRO ACORDA (no meio da partida, curtinho)
    // ======================================================================
    foxcMonsterYou() {
      const ch = window.MatchEngine?.chapter;
      const kit = ch?.homeColor ? { jerseyPrimary: ch.homeColor, jerseySecondary: ch.homeSecondary } : {};
      return this.cineYou(kit);
    },
    foxcMonster0(ctx, S) {
      const { W, H, t, top } = S;
      const you = this.foxcMonsterYou();
      const ME = window.MatchEngine;
      const beat = pulse(t, 6, 22) + pulse(t, 40, 22);
      this.foxcGrad(ctx, 0, 0, W, H, [[0, '#02040a'], [0.6, '#051a10'], [1, '#020a06']]);
      this.cineBokeh(ctx, W, top + 20, H * 0.45, t, 14, ['rgba(254,202,202,0.35)', 'rgba(219,234,254,0.3)'], 7);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H * 0.47, zoom: 1.02 + beat * 0.07, shake: 1.5 + beat * 4 });
      this.cineHead(ctx, you, W * 0.5, H * 0.45, 660, { animState: 'idle', frame: 0 });
      ctx.restore();
      ctx.fillStyle = 'rgba(2,6,23,0.42)';
      ctx.fillRect(0, 0, W, H);
      // Suor e o vermelho pulsando nas bordas
      ctx.save();
      ctx.globalAlpha = 0.45 + beat * 0.55;
      if (!this._foxcRedVig) {
        const cv = document.createElement('canvas');
        cv.width = 320;
        cv.height = 180;
        const g = cv.getContext('2d');
        const grd = g.createRadialGradient(160, 90, 50, 160, 90, 190);
        grd.addColorStop(0, 'rgba(127,0,0,0)');
        grd.addColorStop(1, 'rgba(127,0,0,0.95)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 320, 180);
        this._foxcRedVig = cv;
      }
      ctx.drawImage(this._foxcRedVig, 0, 0, W, H);
      ctx.restore();
      [6, 40].forEach((b, i) => {
        const a = t - b;
        if (a < 0 || a > 34) return;
        ctx.strokeStyle = `rgba(239,68,68,${0.8 * (1 - a / 34)})`;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(W / 2, H * 0.47, 80 + a * 18, 0, Math.PI * 2);
        ctx.stroke();
        this.foxcWord(ctx, 'TUM.', i ? W * 0.82 : W * 0.17, i ? H * 0.66 : H * 0.32, 96, '#ef4444', seg(t, b, b + 8), 1 - a / 40, i ? 0.08 : -0.08);
      });
      let hs = ME?.scoreHome ?? 1;
      let as = ME?.scoreAway ?? 2;
      if (hs >= as) {
        hs = 1;
        as = 2;
      }
      const labels = ME?.chapter?.scoreLabels || { home: 'VOCÊ', away: 'RIVAL' };
      const min = ME?.totalTime ? `${Math.round(90 * (1 - ME.timeLeft / ME.totalTime))}'` : "71'";
      this.foxcScorebug(ctx, 40, top + 22, labels.home.slice(0, 10), labels.away.slice(0, 10), hs, as, `2º TEMPO • ${min}`, 1);
    },
    foxcMonster1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const you = this.foxcMonsterYou();
      const red = t >= 22;
      const snapAt = 46;
      const snap = ease(seg(t, snapAt, snapAt + 30));
      const shake = t > snapAt ? 10 * (1 - seg(t, snapAt, snapAt + 26)) : pulse(t, 22, 12) * 4;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.04 + pulse(t, 22, 14) * 0.06, shake });
      this.foxcFaceBand(ctx, -60, top - 60, W + 120, bot - top + 120, you, {
        px: 32,
        eyes: [[W * 0.5, H * 0.5]],
        faceX: W * 0.5 + 400,
        iris: red ? '#450a0a' : you.eyeColor || '#ef4444',
        ring: red ? '#ef4444' : '#fca5a5',
        brow: red ? 1 : 0.3,
        dim: 0.35,
        dimTint: '20,0,0'
      });
      if (red) this.cineGlow(ctx, W * 0.5, H * 0.5, 300, 'rgba(239,68,68,0.5)', Math.min(1, (t - 22) / 8));
      this.foxcChain(ctx, -80, H * 0.2, W + 80, H * 0.84, { t, snap, link: 66, thick: 17, cut: 0.48, vib: t < snapAt ? 4 : 0 });
      this.foxcChain(ctx, -80, H * 0.86, W + 80, H * 0.22, { t: t + 4, snap, link: 66, thick: 17, cut: 0.53, vib: t < snapAt ? 4 : 0 });
      ctx.restore();
      if (t >= snapAt) {
        this.cineFlash(ctx, W, H, 0.85 * (1 - (t - snapAt) / 9));
        this.foxcWord(ctx, 'KRAAASH!!', W * 0.76, top + 80, 84, '#fef2f2', seg(t, snapAt, snapAt + 8), 1, -0.12);
      }
    },
    foxcMonster2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const you = Object.assign(this.foxcMonsterYou(), { auraColor: '#dc2626' });
      const rise = ease(seg(t, 0, 26));
      const shake = 12 * (1 - seg(t, 0, 50)) + 1.5;
      ctx.fillStyle = '#0a0000';
      ctx.fillRect(0, 0, W, H);
      this.foxcRays(ctx, W / 2, H * 0.42, 90, W, 46, '#7f1d1d', 0.55, t * 0.004);
      this.cineGlow(ctx, W / 2, H * 0.4, 520, 'rgba(220,38,38,0.45)');
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H * 0.5, zoom: 1.12 - ease(seg(t, 0, 110)) * 0.1, shake });
      // A sombra gigante: o monstro em pé atrás de você
      const msize = 860;
      const mfeet = lerp(H * 1.45, H * 1.0, rise);
      // contorno vermelho aceso + o corpo escuro por cima (a sombra ganha forma)
      [[-5, 0], [5, 0], [0, -6]].forEach(([dx, dy]) => this.foxcCached(ctx, 'foxc_monster_edge', you, W / 2 + dx, mfeet + dy, msize, { tint: '#ef4444' }));
      this.foxcCached(ctx, 'foxc_monster_red', you, W / 2, mfeet, msize, { tint: '#160202' });
      const mu = msize / 36;
      const meY = mfeet - msize * 0.87 + 10.1 * mu;
      [-1, 1].forEach((s) => {
        this.cineGlow(ctx, W / 2 + s * 3.3 * mu, meY, mu * 6, 'rgba(239,68,68,0.7)');
        this.drawPixelEye(ctx, W / 2 + s * 3.3 * mu, meY, mu * 0.3, { line: '#1c0505', white: '#fecaca', iris: '#450a0a', ring: '#ef4444', look: 0 });
      });
      // O sorriso do monstro: dentes em pixel, abrindo junto com o rugido
      const gp = Math.round(mu * 0.62);
      const open = ease(seg(t, 10, 30));
      const cols = 17;
      for (let c = 0; c < cols; c++) {
        const k = (c - (cols - 1) / 2) / ((cols - 1) / 2);
        const xx = Math.round(W / 2 + (c - cols / 2) * gp);
        const y0 = Math.round(meY + 4.6 * mu - Math.round(k * k * 2.4) * gp);
        const hgt = Math.max(1, Math.round((1 - k * k) * 3 * open + 1));
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(xx, y0 - gp, gp, gp * (hgt + 2));
        ctx.fillStyle = '#120202';
        ctx.fillRect(xx, y0, gp, gp * hgt);
        ctx.fillStyle = '#fef2f2';
        ctx.fillRect(xx, c % 2 ? y0 : y0 + gp * (hgt - 1), gp, gp);
      }
      // Chão e você, com a aura vermelha
      ctx.fillStyle = '#140303';
      ctx.fillRect(-200, H * 0.9, W + 400, H);
      this.drawSprite(ctx, you, W / 2, H * 0.94, 330, { animState: 'run', frame: t, showAura: true, auraColor: '#dc2626' });
      ctx.restore();
      this.foxcWord(ctx, 'O MONSTRO ACORDOU!!', W / 2, top + 64, 80, '#ef4444', seg(t, 8, 22), 1, -0.03, W * 0.9);
      const chips = ['15 SEGUNDOS', 'VELOCIDADE ▲', 'PRECISÃO ▲', 'CHUTE ▲'];
      ctx.save();
      ctx.font = '900 18px "Segoe UI", sans-serif';
      const ws = chips.map((c) => ctx.measureText(c).width + 36);
      const total = ws.reduce((a, b) => a + b, 0) + 12 * (chips.length - 1);
      let cx = W / 2 - total / 2;
      chips.forEach((c, i) => {
        const k = back(seg(t, 34 + i * 7, 48 + i * 7));
        if (k > 0) {
          const y = bot - 40 + (1 - k) * 60;
          ctx.globalAlpha = clamp(k);
          ctx.fillStyle = i === 0 ? '#dc2626' : 'rgba(20,3,3,0.92)';
          ctx.fillRect(cx, y - 18, ws[i], 36);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx, y - 18, ws[i], 36);
          this.foxcText(ctx, c, cx + ws[i] / 2, y + 1, '900 18px "Segoe UI", sans-serif', '#fef2f2', clamp(k));
        }
        cx += ws[i] + 12;
      });
      ctx.restore();
    },

    // ======================================================================
    // 3) O DESAFIO DO RIN (noite de chuva, na frente do seu prédio)
    // ======================================================================
    foxcRinChars() {
      const rin = this.cineChar('rin', { angry: true, outfit: 'casual', clothesColor: '#1f2937' });
      const you = this.cineYou({ outfit: 'casual', clothesColor: '#334155' });
      return { rin, you };
    },
    // O prédio (pronto num canvas): fachada, janelas e a marquise da entrada
    foxcBuilding(w, h) {
      const key = `${w}x${h}`;
      if (this._foxcBld?.key === key) return this._foxcBld.cv;
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const g = cv.getContext('2d');
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, '#0a1122');
      grd.addColorStop(1, '#16213a');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      for (let r = 0; r < 14; r++) {
        for (let c = 0; c < 6; c++) {
          const lit = hash(r * 7 + c, 3) < 0.28;
          const warm = hash(r * 5 + c, 8) < 0.5;
          g.fillStyle = lit ? (warm ? 'rgba(253,224,71,0.75)' : 'rgba(147,197,253,0.6)') : 'rgba(30,41,59,0.9)';
          g.fillRect(28 + c * ((w - 56) / 6), 24 + r * 44, (w - 56) / 6 - 18, 26);
        }
      }
      g.fillStyle = '#060a14';
      g.fillRect(w * 0.18, h - 150, w * 0.5, 150);
      g.fillStyle = 'rgba(253,230,138,0.55)';
      g.fillRect(w * 0.3, h - 130, w * 0.26, 130);
      g.fillStyle = '#020617';
      g.fillRect(w * 0.12, h - 160, w * 0.62, 16);
      cv.getContext('2d');
      this._foxcBld = { key, cv };
      return cv;
    },
    foxcRin0(ctx, S) {
      const { W, H, t } = S;
      const { rin, you } = this.foxcRinChars();
      const e = easeIO(seg(t, 0, 185));
      const cam = { x: lerp(W * 0.52, W * 0.6, e), y: lerp(H * 0.42, H * 0.56, e), zoom: lerp(1.0, 1.3, e), shake: 1.2 };
      this.foxcSky(ctx, W, H, t, '#01030a', '#14264a');
      this.cineCity(ctx, W, H * 0.7, 260, '#091327', 'rgba(147,197,253,0.4)', 3, cam.x * 0.08);
      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      const ground = H * 0.82;
      ctx.drawImage(this.foxcBuilding(Math.round(W * 0.44), Math.round(ground + 40)), -40, -40);
      // Calçada e asfalto molhado
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-300, ground - 8, W + 600, 14);
      this.foxcGrad(ctx, -300, ground + 6, W + 600, H, [[0, '#0b1324'], [1, '#03060e']]);
      // O poste e o cone de luz
      const lx = W * 0.7;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(lx - 4, H * 0.2, 8, ground - H * 0.2);
      ctx.fillRect(lx - 70, H * 0.2, 74, 8);
      const cone = ctx.createLinearGradient(0, H * 0.22, 0, ground);
      cone.addColorStop(0, 'rgba(186,230,253,0.4)');
      cone.addColorStop(1, 'rgba(186,230,253,0.06)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lx - 74, H * 0.22);
      ctx.lineTo(lx - 50, H * 0.22);
      ctx.lineTo(lx + 60, ground);
      ctx.lineTo(lx - 190, ground);
      ctx.closePath();
      ctx.fill();
      this.cineGlow(ctx, lx - 62, H * 0.215, 60, 'rgba(219,234,254,0.9)');
      // Reflexos no asfalto molhado
      [[lx - 62, 'rgba(186,230,253,0.35)'], [W * 0.84, 'rgba(254,240,138,0.35)'], [W * 1.02, 'rgba(239,68,68,0.3)']].forEach(([rx, c]) => {
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = c;
          ctx.globalAlpha = 0.5 - i * 0.09;
          ctx.fillRect(rx - 10 + Math.sin(t * 0.2 + i) * 3, ground + 14 + i * 22, 20, 14);
        }
        ctx.globalAlpha = 1;
      });
      // O carro que trouxe o Rin, faróis acesos
      const cx = W * 0.84;
      ctx.fillStyle = '#05070d';
      ctx.beginPath();
      ctx.moveTo(cx, ground - 14);
      ctx.lineTo(cx + 18, ground - 62);
      ctx.lineTo(cx + 90, ground - 70);
      ctx.lineTo(cx + 150, ground - 112);
      ctx.lineTo(cx + 300, ground - 112);
      ctx.lineTo(cx + 360, ground - 70);
      ctx.lineTo(cx + 420, ground - 60);
      ctx.lineTo(cx + 420, ground - 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(56,189,248,0.18)';
      ctx.fillRect(cx + 160, ground - 104, 120, 32);
      ctx.fillStyle = '#020305';
      [cx + 70, cx + 330].forEach((wx) => {
        ctx.beginPath();
        ctx.arc(wx, ground - 12, 24, 0, Math.PI * 2);
        ctx.fill();
      });
      this.cineShafts(ctx, cx + 8, ground - 46, Math.PI, 560, 0.22, 3, '254,249,195', 0.22, t);
      this.cineGlow(ctx, cx + 8, ground - 46, 40, 'rgba(254,249,195,0.95)');
      // O Rin debaixo do poste: luz de recorte ciano, rosto na sombra
      const rx = lx - 70;
      this.foxcCached(ctx, 'foxc_rin_rim', rin, rx - 6, ground + 4, 210, { tint: '#7dd3fc' });
      this.foxcCached(ctx, 'foxc_rin_rim', rin, rx, ground - 2, 210, { tint: '#e0f2fe' });
      this.drawSprite(ctx, rin, rx, ground + 4, 210, { animState: 'idle', frame: 0 });
      this.foxcFaceShadow(ctx, rin, rx, ground + 4, 210, { animState: 'idle', frame: 0 }, 0.8);
      // respingos da chuva no chão
      ctx.strokeStyle = 'rgba(191,219,254,0.45)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) {
        const age = (t * 1.5 + i * 13) % 30;
        const x = hash(i, Math.floor((t * 1.5 + i * 13) / 30)) * W * 1.2 - 60;
        const y = ground + 20 + hash(i, 4) * 120;
        ctx.globalAlpha = 1 - age / 30;
        ctx.beginPath();
        ctx.ellipse(x, y, age * 0.9, age * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // Você em primeiro plano, de costas (sobre o ombro)
      const ox = W * 0.13 + this.cineNoise(t, 4) * 4 - e * 40;
      this.foxcCached(ctx, 'foxc_you_back_casual_rim', you, ox + 16, H * 1.36, 600, { facing: 'back', tint: '#38bdf8' });
      this.foxcCached(ctx, 'foxc_you_back_casual', you, ox, H * 1.36, 600, { facing: 'back', tint: '#02040a' });
      this.cineRain(ctx, W, H, t, 0.4, 170, 0.22);
    },
    foxcRin1(ctx, S) {
      const { W, H, t } = S;
      const { you } = this.foxcRinChars();
      const name = this.cinePlayerName();
      const wet = seg(t, 0, 170);
      const stomp = seg(t, 104, 116);
      const after = t >= 116;
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.02 + easeIO(t / 180) * 0.14 + pulse(t, 116, 12) * 0.04, rot: lerp(-0.05, 0.02, easeIO(t / 180)), shake: after ? 4 * (1 - seg(t, 116, 140)) : 0.6 });
      // asfalto com poças refletindo a luz do poste
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = i % 2 ? '#0b1222' : '#0a0f1c';
        ctx.fillRect(-200 + hash(i, 1) * (W + 400), -200 + hash(i, 2) * (H + 400), 120 + hash(i, 3) * 200, 50 + hash(i, 4) * 80);
      }
      this.cineGlow(ctx, W * 0.2, H * 0.25, 160, 'rgba(147,197,253,0.25)');
      this.cineGlow(ctx, W * 0.85, H * 0.75, 200, 'rgba(147,197,253,0.2)');
      // O jornal
      ctx.save();
      ctx.translate(W * 0.47, H * 0.52);
      ctx.rotate(-0.12);
      const pw = 620;
      const ph = 380;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-pw / 2 + 12, -ph / 2 + 14, pw, ph);
      ctx.fillStyle = '#d8d4c7';
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-pw / 2, -ph / 2, pw, 46);
      this.foxcText(ctx, 'DIÁRIO DO ESPORTE', 0, -ph / 2 + 24, '900 24px Georgia, serif', '#f8fafc', 1, 'center', true);
      let hf = 40;
      const head = `${name}: FAVORITO À BOLA DE OURO`;
      ctx.font = `900 ${hf}px "Segoe UI", sans-serif`;
      while (hf > 20 && ctx.measureText(head).width > pw - 40) {
        hf -= 2;
        ctx.font = `900 ${hf}px "Segoe UI", sans-serif`;
      }
      this.foxcText(ctx, head, 0, -ph / 2 + 84, `900 ${hf}px "Segoe UI", sans-serif`, '#111827');
      ctx.fillStyle = '#111827';
      ctx.fillRect(-pw / 2 + 20, -ph / 2 + 112, pw - 40, 3);
      // a foto
      const port = this.foxcPortrait(you, 'foxc_news_you', 180);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-pw / 2 + 24, -ph / 2 + 128, 210, 210);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(port, -pw / 2 + 39, -ph / 2 + 143, 180, 180);
      ctx.fillStyle = 'rgba(214,211,199,0.18)';
      ctx.fillRect(-pw / 2 + 24, -ph / 2 + 128, 210, 210);
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = 'rgba(17,24,39,0.55)';
        ctx.fillRect(-pw / 2 + 252, -ph / 2 + 136 + i * 24, (pw - 290) * (0.6 + hash(i, 5) * 0.4), 9);
      }
      this.foxcText(ctx, 'Artilheiro, campeão... e ainda com fome.', -pw / 2 + 252, ph / 2 - 22, 'italic 700 15px Georgia, serif', '#334155', 1, 'left');
      // A chuva molhando o papel
      for (let i = 0; i < 16; i++) {
        const r = 10 + hash(i, 6) * 26;
        ctx.fillStyle = `rgba(87,83,78,${0.22 * wet})`;
        ctx.beginPath();
        ctx.arc((hash(i, 7) - 0.5) * pw, (hash(i, 8) - 0.5) * ph, r * (0.4 + wet * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      if (after) {
        ctx.fillStyle = 'rgba(15,23,42,0.45)';
        ctx.beginPath();
        ctx.ellipse(-170, 70, 170, 95, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // Gotas batendo (anéis)
      ctx.strokeStyle = 'rgba(191,219,254,0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const age = (t * 1.2 + i * 17) % 26;
        const cyc = Math.floor((t * 1.2 + i * 17) / 26);
        const x = hash(i, cyc) * W;
        const y = hash(i + 50, cyc) * H;
        ctx.globalAlpha = 1 - age / 26;
        ctx.beginPath();
        ctx.ellipse(x, y, age * 1.6, age * 1.1, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // O tênis do Rin pisando na sua foto
      if (t > 92) {
        const k = ease(stomp);
        const tx = W * 0.36;
        const ty = H * 0.6;
        const sx = tx + (1 - k) * 240;
        const sy = ty - (1 - k) * 260;
        const sc = 1.3 - k * 0.3;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-0.9);
        ctx.scale(sc, sc);
        const shoe = (s) => {
          ctx.beginPath();
          ctx.moveTo(-150 * s, 0);
          ctx.bezierCurveTo(-150 * s, -64 * s, -40 * s, -66 * s, 40 * s, -50 * s);
          ctx.bezierCurveTo(110 * s, -38 * s, 150 * s, -32 * s, 150 * s, 0);
          ctx.bezierCurveTo(150 * s, 32 * s, 110 * s, 38 * s, 40 * s, 50 * s);
          ctx.bezierCurveTo(-40 * s, 66 * s, -150 * s, 64 * s, -150 * s, 0);
          ctx.closePath();
        };
        ctx.save();
        ctx.translate(18, 22);
        shoe(1);
        ctx.fillStyle = `rgba(0,0,0,${0.45 * k})`;
        ctx.fill();
        ctx.restore();
        shoe(1);
        ctx.fillStyle = '#e5e7eb';
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 5;
        ctx.stroke();
        shoe(0.86);
        ctx.fillStyle = '#111827';
        ctx.fill();
        ctx.strokeStyle = '#0e7490';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-110, 34);
        ctx.quadraticCurveTo(-10, 46, 80, 18);
        ctx.stroke();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 5;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-70 + i * 22, -20);
          ctx.lineTo(-64 + i * 22, 20);
          ctx.stroke();
        }
        // o tornozelo e a barra da calça molhada (vista de cima)
        ctx.fillStyle = '#1f2a44';
        ctx.beginPath();
        ctx.arc(70, 0, 62, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(148,163,184,0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(70, 0, 44, -1.2, 1.4);
        ctx.stroke();
        ctx.restore();
      }
      if (after) {
        const a = t - 116;
        ctx.strokeStyle = `rgba(191,219,254,${0.8 * (1 - a / 30)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(W * 0.36, H * 0.6, 150 + a * 5, 70 + a * 2.5, -0.3, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2;
          const r = 120 + a * 6;
          ctx.fillStyle = `rgba(191,219,254,${0.8 * (1 - a / 30)})`;
          ctx.fillRect(W * 0.36 + Math.cos(ang) * r, H * 0.6 + Math.sin(ang) * r * 0.5 - a * 1.5 + a * a * 0.06, 5, 5);
        }
        this.foxcWord(ctx, 'SPLASH', W * 0.82, S.top + 74, 54, '#bae6fd', seg(t, 116, 124), 1 - seg(t, 150, 175), 0.1);
      }
      ctx.restore();
      this.cineRain(ctx, W, H, t, 0.3, 110, 0.05);
    },
    foxcRin2(ctx, S) {
      const { W, H, t } = S;
      const { rin, you } = this.foxcRinChars();
      const x = W * 0.6;
      const eyeY = H * 0.43;
      const size = 640;
      const u = size / 36;
      ctx.fillStyle = '#02050c';
      ctx.fillRect(0, 0, W, H);
      this.cineBokeh(ctx, W, S.top, H * 0.8, t, 18, ['rgba(147,197,253,0.35)', 'rgba(253,224,71,0.25)'], 4);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W * 0.56, y: H * 0.5, zoom: 1 + easeIO(t / 180) * 0.1, shake: 0.9 });
      const k = ease(seg(t, 30, 150));
      this.drawRinAbyss(ctx, x, H * 0.66, 0.95, t, k * 0.9);
      const r = this.cineHead(ctx, rin, x, eyeY, size);
      ctx.fillStyle = 'rgba(4,14,36,0.35)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      this.foxcFaceShadow(ctx, rin, x, r.feet, size, { animState: 'idle', frame: 0 }, 0.92);
      // Luz do poste por cima: o cabelo molhado brilha
      this.cineGlow(ctx, x - 2 * u, r.top + 2 * u, 260, 'rgba(186,230,253,0.25)');
      const open = seg(t, 52, 62);
      if (open > 0) {
        [-1, 1].forEach((s) => {
          this.cineGlow(ctx, x + s * 3.3 * u, eyeY, u * 4.5, 'rgba(34,211,238,0.45)', open);
          this.drawPixelEye(ctx, x + s * 3.3 * u, eyeY, u * 0.28, { line: '#010409', iris: '#0f766e', ring: '#5eead4', tiny: t > 110, look: 0, blink: open < 0.5 });
        });
      }
      // água escorrendo do cabelo
      for (let i = 0; i < 8; i++) {
        const dy = (t * (2 + hash(i) * 2) + hash(i, 3) * 300) % 360;
        ctx.fillStyle = 'rgba(186,230,253,0.75)';
        ctx.fillRect(x + (hash(i, 9) - 0.5) * 16 * u, r.top + 6 * u + dy, 4, 12);
      }
      ctx.restore();
      // o seu ombro em primeiro plano
      this.foxcCached(ctx, 'foxc_you_back_casual_big', you, W * 0.06, H * 1.62, 780, { facing: 'back', tint: '#010309' });
      this.cineRain(ctx, W, H, t, 0.35, 150, 0.22);
    },
    foxcRin3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const { rin, you } = this.foxcRinChars();
      const mid = (top + bot) / 2;
      const kA = ease(seg(t, 0, 18));
      const kB = ease(seg(t, 8, 26));
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      const shake = pulse(t, 60, 20) * 8;
      // Você em cima
      ctx.save();
      ctx.translate((1 - kA) * -W + this.cineNoise(t, 2) * shake, 0);
      this.foxcFaceBand(ctx, 0, top, W, mid - top - 6, you, {
        px: 17,
        eyes: [[W * 0.22, top + 168], [W * 0.46, top + 168]],
        faceX: W * 0.34,
        iris: you.eyeColor || '#ef4444',
        ring: this.foxcMix(you.eyeColor || '#ef4444', '#ffffff', 0.5),
        brow: 0.6,
        dim: 0.4,
        dimTint: '8,20,50',
        fringe: top + 52
      });
      ctx.restore();
      // O Rin embaixo
      ctx.save();
      ctx.translate((1 - kB) * W + this.cineNoise(t, 5) * shake, 0);
      this.foxcFaceBand(ctx, 0, mid + 6, W, bot - mid - 6, rin, {
        px: 17,
        eyes: [[W * 0.54, mid + 150], [W * 0.78, mid + 150]],
        faceX: W * 0.66,
        iris: '#0f766e',
        ring: '#5eead4',
        brow: 1,
        dim: 0.42,
        dimTint: '2,20,30',
        fringe: mid + 40
      });
      ctx.restore();
      // A rachadura dourada entre os dois e a Bola de Ouro no meio
      const lk = seg(t, 56, 64);
      if (lk > 0) {
        ctx.save();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const x = (W * i) / 16;
          const y = mid + (i % 2 ? -14 : 14) * (0.6 + hash(i, 2) * 0.6);
          if (x > W * lk) break;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fffbeb';
        ctx.stroke();
        ctx.restore();
      }
      if (t >= 60) this.cineFlash(ctx, W, H, 0.6 * (1 - (t - 60) / 10), '#fef9c3');
      const bk = back(seg(t, 64, 84));
      if (bk > 0) {
        ctx.save();
        ctx.translate(W * 0.5, mid);
        ctx.scale(bk, bk);
        this.foxcGoldBall(ctx, 0, -8, 56, t);
        ctx.restore();
      }
      this.foxcWord(ctx, 'SÓ EXISTE UM.', W * 0.8, top + 150, 58, '#f8fafc', seg(t, 24, 38), 1 - seg(t, 100, 112), -0.05, W * 0.34);
      this.foxcWord(ctx, 'VAI SER EU.', W * 0.8, top + 150, 62, YOU_COLOR, seg(t, 114, 126), 1, -0.05, W * 0.34);
      this.foxcWord(ctx, 'VAI SER EU.', W * 0.21, bot - 120, 62, RIN_COLOR, seg(t, 114, 126), 1, 0.05, W * 0.34);
      this.cineRain(ctx, W, H, t, 0.28, 120, 0.22);
    },

    // ======================================================================
    // 4) CAMPEÕES (Copa Sub-20 e Copa do Mundo)
    // ======================================================================
    foxcCelebCfg() {
      const wc = this.sakugaType === 'wc_champion';
      const c = this.celebCfg || { home: 3, away: 2 };
      const kit = this.KITS.japan;
      const ids = wc ? ['sae', 'rin', 'shidou', 'bachira', 'nagi', 'chigiri', 'gagamaru', 'kunigami'] : ['sae', 'rin', 'shidou', 'gagamaru', 'bachira', 'nagi'];
      return {
        wc,
        home: c.home,
        away: c.away,
        kit,
        you: this.cineYou(kit),
        mates: ids.map((id) => this.cineChar(id, Object.assign({}, kit, id === 'rin' ? { angry: true } : {}))),
        sign: wc ? 'FIFA WORLD CUP • GRANDE FINAL • JAPÃO x FRANÇA' : 'FIFA U-20 WORLD CUP • GRANDE FINAL • JAPÃO x FRANÇA',
        champ: wc ? 'CAMPEÕES DO MUNDO!!' : 'CAMPEÕES DO MUNDO SUB-20!',
        kicker: wc ? 'COPA DO MUNDO' : 'COPA DO MUNDO SUB-20',
        panels: wc
          ? [['nagi', 'QUE CANSEIRA...', '#e2e8f0', '#1e293b'], ['bachira', 'PARCEIRO!!', '#facc15', '#1e3a8a'], ['rin', 'A PRÓXIMA É MINHA.', '#22d3ee', '#042f2e'], ['sae', 'COMO EU DISSE.', '#f87171', '#3b0a0a']]
          : [['shidou', 'BIG BAAANG!!', '#f472b6', '#3b0a2a'], ['bachira', 'PARCEIRO!!', '#facc15', '#1e3a8a'], ['rin', 'TSC.', '#22d3ee', '#042f2e'], ['sae', '...NADA MAL.', '#f87171', '#3b0a0a']]
      };
    },
    foxcCeleb0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.foxcCelebCfg();
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.0 + easeIO(t / 150) * 0.08, shake: 1 + pulse(t, 4, 30) * 5 });
      ctx.save();
      ctx.translate(0, top - 20);
      this.drawU20Stadium(ctx, W, H, t * 0.5, 0.5, c.sign);
      ctx.restore();
      this.cineShafts(ctx, W * 0.15, top - 30, Math.PI * 0.35, 900, 0.3, 4, '254,249,195', 0.12, t);
      this.cineShafts(ctx, W * 0.85, top - 30, Math.PI * 0.65, 900, 0.3, 4, '254,249,195', 0.12, t);
      const feet = H * 0.93;
      c.mates.slice(0, 6).forEach((m, i) => {
        const side = i % 2 ? 1 : -1;
        const k = ease(seg(t, 26 + i * 6, 96 + i * 6));
        const x = lerp(W / 2 + side * W * 0.7, W / 2 + side * (150 + Math.floor(i / 2) * 120), k);
        const f = feet - 10 - Math.floor(i / 2) * 6;
        if (x < -160 || x > W + 160) return;
        if (k < 1) this.foxcCached(ctx, `foxc_cel_run_${m.id}`, m, x, f - Math.abs(Math.sin(t * 0.35 + i)) * 6, 210 - Math.floor(i / 2) * 10, { animState: 'run', frame: Math.floor(t / 7 + i) % 2 ? 4 : 12, flipX: side > 0 });
        else this.foxcCached(ctx, `foxc_cel_${m.id}`, m, x, f - Math.abs(Math.sin(t * 0.13 + i)) * 26, 210 - Math.floor(i / 2) * 10, { animState: 'call_pass', flipX: side > 0 });
      });
      const jump = t > 30 ? Math.abs(Math.sin(t * 0.12)) * 34 : 0;
      this.drawSprite(ctx, c.you, W / 2, feet - jump, 300, { animState: 'call_pass', frame: t, showAura: t > 40, auraColor: '#facc15' });
      ctx.restore();
      if (t > 86) this.drawConfetti(ctx, W, H, t - 86, 90);
      this.foxcWord(ctx, 'PRIIIIIIII!!', W * 0.5, top + 60, 66, '#f8fafc', seg(t, 2, 10), 1 - seg(t, 60, 76), -0.06);
      this.foxcWord(ctx, 'CAMPEÕES!!', W / 2, H * 0.36, 118, '#facc15', seg(t, 92, 106), 1, -0.04, W * 0.9);
      this.foxcScorebug(ctx, 34, top + 18, 'JAPÃO', 'FRANÇA', c.home, c.away, 'FIM DE JOGO', seg(t, 18, 36));
    },
    foxcCeleb1(ctx, S) {
      const { W, H, t } = S;
      const c = this.foxcCelebCfg();
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);
      this.foxcRays(ctx, W / 2, H / 2, 40, W, 36, '#1e3a8a', 0.4, t * 0.003);
      this.foxcStrips(ctx, S, 4, t, (i, cx, y0, y1, k) => {
        const [id, shout, color, bg] = c.panels[i];
        const ch = c.mates.find((m) => m.id === id) || c.you;
        this.foxcGrad(ctx, cx - 220, y0, 440, y1 - y0, [[0, bg], [1, '#020617']]);
        this.foxcRays(ctx, cx, y0 + 200, 30, 600, 22, color, 0.18, t * 0.01 + i);
        const size = 440;
        const eyeY = y0 + 190 + Math.sin(t * 0.15 + i) * 4;
        const u = size / 36;
        const top0 = eyeY - 10.1 * u;
        this.foxcCached(ctx, `foxc_cel_head_${id}`, ch, cx, top0 + size * 0.87, size);
        this.foxcGrad(ctx, cx - 220, y1 - 170, 440, 170, [[0, 'rgba(2,6,23,0)'], [1, 'rgba(2,6,23,0.92)']]);
        this.foxcWord(ctx, shout, cx, y1 - 80, 40, color, seg(t, 24 + i * 14, 36 + i * 14), 1, -0.08, 250);
        this.foxcText(ctx, (ch.name || '').toUpperCase(), cx, y1 - 32, '900 13px "Segoe UI", sans-serif', '#94a3b8', 1, 'center', true);
      }, { stagger: 16 });
      this.drawConfetti(ctx, W, H, t + 40, 40);
    },
    foxcCeleb2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.foxcCelebCfg();
      if (c.wc) {
        // O outro lado: a França parada no meio da festa japonesa
        const france = this.KITS.france;
        const noa = this.cineChar('noa', france);
        const loki = this.cineChar('loki', france);
        const hugo = this.cineChar('hugo', france);
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, W, H);
        this.cineBokeh(ctx, W, top, H * 0.75, t, 26, ['rgba(253,224,71,0.45)', 'rgba(96,165,250,0.4)', 'rgba(255,255,255,0.3)'], 9);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: lerp(W * 0.46, W * 0.54, easeIO(t / 200)), y: H * 0.52, zoom: 1.06, shake: 0.6 });
        // lá no fundo, fora de foco: o Japão pulando na luz dourada
        this.cineGlow(ctx, W * 0.5, H * 0.6, 520, 'rgba(250,204,21,0.22)');
        [c.you, ...c.mates.slice(0, 6)].forEach((m, i) => {
          const x = W * (0.12 + i * 0.127);
          const j = Math.abs(Math.sin(t * 0.12 + i * 1.1)) * 22;
          this.foxcCached(ctx, `foxc_far_${m.id || 'you'}`, m, x, H * 0.7 - j, 150, { animState: 'call_pass', flipX: i > 3, tint: '#0a0f1f' });
        });
        ctx.fillStyle = 'rgba(2,6,23,0.55)';
        ctx.fillRect(-200, H * 0.86, W + 400, H);
        this.foxcCached(ctx, 'foxc_fr_noa', noa, W * 0.5, H * 0.82, 270);
        this.foxcCached(ctx, 'foxc_fr_noa_dim', noa, W * 0.5, H * 0.82, 270, { tint: 'rgba(10,20,50,0.45)' });
        this.foxcFaceShadow(ctx, noa, W * 0.5, H * 0.82, 270, { animState: 'idle', frame: 0 }, 0.5);
        [[loki, W * 0.25], [hugo, W * 0.76]].forEach(([ch, x]) => {
          this.foxcCached(ctx, `foxc_fr_${ch.id}`, ch, x, H * 1.02, 380);
          this.foxcCached(ctx, `foxc_fr_${ch.id}_dim`, ch, x, H * 1.02, 380, { tint: 'rgba(10,20,50,0.4)' });
          this.foxcFaceShadow(ctx, ch, x, H * 1.02, 380, { animState: 'idle', frame: 0 }, 0.6);
        });
        ctx.restore();
        this.drawConfetti(ctx, W, H, t, 70);
        this.foxcText(ctx, 'FRANÇA', W - 60, top + 40, '900 15px "Segoe UI", sans-serif', '#93c5fd', seg(t, 10, 30), 'right', true);
        this.foxcText(ctx, `${c.away} x ${c.home}`, W - 60, top + 78, 'italic 900 34px "Segoe UI", sans-serif', '#f8fafc', seg(t, 14, 34), 'right');
        return;
      }
      // A festa: fogos sobre o estádio e o time inteiro pulando
      this.foxcGrad(ctx, 0, 0, W, H, [[0, '#020617'], [0.7, '#1e1b4b'], [1, '#0b1023']]);
      this.foxcFireworks(ctx, W, top + 60, H * 0.42, t, 7, ['#facc15', '#38bdf8', '#f8fafc', '#ef4444', '#00f5d4'], 3);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(W * 0.42, W * 0.58, easeIO(t / 180)), y: H * 0.52, zoom: 1.08 });
      // a borda da arquibancada com os celulares acesos
      ctx.fillStyle = '#070b1a';
      ctx.fillRect(-300, H * 0.5, W + 600, H);
      for (let i = 0; i < 120; i++) {
        const on = (Math.floor(t / 8) + i * 7) % 11 < 6;
        ctx.fillStyle = on ? 'rgba(254,249,195,0.85)' : 'rgba(148,163,184,0.25)';
        ctx.fillRect(-300 + hash(i, 2) * (W + 600), H * 0.52 + hash(i, 3) * H * 0.18, 3, 3);
      }
      ctx.fillStyle = '#0b1324';
      ctx.fillRect(-300, H * 0.74, W + 600, H);
      const row = [c.mates[2], c.mates[0], c.mates[4], c.you, c.mates[5], c.mates[1], c.mates[3]].filter(Boolean);
      row.forEach((m, i) => {
        const x = W * (0.09 + i * 0.137);
        const jump = Math.abs(Math.sin(t * 0.11 + i * 0.9)) * 46;
        const size = m === c.you ? 290 : 250;
        const key = m === c.you ? 'foxc_party_you' : `foxc_party_${m.id}`;
        this.foxcCached(ctx, key + '_rim', m, x, H * 0.9 - jump - 8, size, { animState: 'call_pass', flipX: i > 3, tint: 'rgba(253,224,71,0.9)' });
        this.foxcCached(ctx, key, m, x, H * 0.9 - jump, size, { animState: 'call_pass', flipX: i > 3 });
      });
      ctx.restore();
      this.drawConfetti(ctx, W, H, t, 70);
    },
    foxcCeleb3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.foxcCelebCfg();
      const lift = ease(seg(t, 0, 60));
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);
      this.cineGlow(ctx, W / 2, H * 0.3, 560, 'rgba(250,204,21,0.35)');
      this.cineShafts(ctx, W / 2, top - 80, Math.PI / 2, H, 0.9, 7, '253,224,71', 0.16, t);
      // flashes das câmeras na arquibancada (pontinhos, nada de tela piscando)
      for (let i = 0; i < 30; i++) {
        if ((t + i * 13) % 37 > 2) continue;
        this.cineGlow(ctx, hash(i, 3) * W, top + 20 + hash(i, 4) * H * 0.4, 26, 'rgba(255,255,255,0.9)');
      }
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: lerp(H * 0.62, H * 0.5, lift), zoom: 1.04 + easeIO(t / 200) * 0.06 });
      c.mates.slice(0, 6).forEach((m, i) => {
        const side = i % 2 ? 1 : -1;
        const x = W / 2 + side * (210 + Math.floor(i / 2) * 140);
        this.foxcCached(ctx, `foxc_trophy_mate_${m.id}`, m, x, H * 1.0 - Math.abs(Math.sin(t * 0.1 + i)) * 20, 230, { animState: 'call_pass', flipX: side > 0, tint: 'rgba(15,23,60,0.72)' });
      });
      const size = 400;
      const feet = H * 0.99;
      this.drawSprite(ctx, c.you, W / 2, feet, size, { animState: 'call_pass', frame: 0, showAura: true, auraColor: '#facc15' });
      // A taça na mão levantada
      const u = size / 36;
      const hx = W / 2 + 8.6 * u;
      const hy = feet - size * 0.87 + 7.4 * u;
      if (c.wc) this.foxcWCTrophy(ctx, hx, hy + 30, 0.95);
      else this.drawTrophy(ctx, hx, hy - 50, 1.15);
      for (let i = 0; i < 36; i++) {
        const a = i * 2.4 + t * 0.02;
        const r = 50 + ((t * 2 + i * 23) % 240);
        ctx.fillStyle = i % 3 ? '#fde047' : '#ffffff';
        ctx.fillRect(hx + Math.cos(a) * r, hy - 80 + Math.sin(a) * r * 0.7, 4, 4);
      }
      ctx.restore();
      this.drawConfetti(ctx, W, H, t, 60);
      this.foxcGrad(ctx, 0, top, W, 220, [[0, 'rgba(2,6,23,0.9)'], [1, 'rgba(2,6,23,0)']]);
      this.cineTitleCard(ctx, W, top + 104, seg(t, 84, 110), { kicker: `${c.kicker} • JAPÃO ${c.home} x ${c.away} FRANÇA`, title: c.champ, sub: c.wc ? 'O Japão no topo do planeta.' : 'Da final do colégio ao topo do mundo.', color: '#facc15' });
    },

    // ======================================================================
    // 5) CRÉDITOS FINAIS
    // ======================================================================
    foxcTitleCv(W) {
      if (this._foxcTitle?.W === W) return this._foxcTitle;
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = 220;
      const g = cv.getContext('2d');
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.font = 'italic 900 128px "Segoe UI", sans-serif';
      g.lineWidth = 14;
      g.strokeStyle = '#020617';
      g.strokeText('BLUE LOCK', W / 2, 80);
      const gr = g.createLinearGradient(0, 20, 0, 140);
      gr.addColorStop(0, '#e0f2fe');
      gr.addColorStop(0.55, '#38bdf8');
      gr.addColorStop(1, '#1d4ed8');
      g.fillStyle = gr;
      g.fillText('BLUE LOCK', W / 2, 80);
      g.font = '900 34px "Segoe UI", sans-serif';
      g.fillStyle = '#00f5d4';
      g.fillText('E  G  O  I  S  T     C  A  R  E  E  R', W / 2, 180);
      const glint = document.createElement('canvas');
      glint.width = W;
      glint.height = 220;
      this._foxcTitle = { W, cv, glint };
      return this._foxcTitle;
    },
    foxcCred0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const you = this.cineYou({ jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' });
      const tada = this.getSpeakerCharData('TADA');
      this.foxcSky(ctx, W, H, t, '#01030a', '#1e3a8a');
      // estrela cadente
      const sk = seg(t, 30, 60);
      if (sk > 0 && sk < 1) {
        const sx = lerp(W * 0.85, W * 0.45, sk);
        const sy = lerp(top + 30, top + 140, sk);
        const g = ctx.createLinearGradient(sx, sy, sx + 140, sy - 40);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 140, sy - 40);
        ctx.stroke();
      }
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.12 - easeIO(t / 300) * 0.1 });
      // o campinho do colégio
      ctx.fillStyle = '#06130c';
      ctx.fillRect(-200, H * 0.78, W + 400, H);
      ctx.strokeStyle = 'rgba(226,232,240,0.85)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(W * 0.62, H * 0.8);
      ctx.lineTo(W * 0.62, H * 0.6);
      ctx.lineTo(W * 0.9, H * 0.6);
      ctx.lineTo(W * 0.9, H * 0.8);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(W * 0.62 + i * W * 0.028, H * 0.6);
        ctx.lineTo(W * 0.62 + i * W * 0.028, H * 0.8);
        ctx.stroke();
      }
      this.foxcCached(ctx, 'foxc_cred_tada', tada, W * 0.3, H * 0.82, 130, { tint: '#020617' });
      this.foxcCached(ctx, 'foxc_cred_you_sil', you, W * 0.44, H * 0.82, 136, { tint: '#020617' });
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(W * 0.48, H * 0.8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // O título com o brilho passando
      const tk = ease(seg(t, 60, 100));
      if (tk > 0) {
        const T = this.foxcTitleCv(W);
        const y = top + 70 + (1 - tk) * 20;
        ctx.save();
        ctx.globalAlpha = tk;
        ctx.drawImage(T.cv, 0, y);
        const gx = lerp(-300, W + 300, seg(t, 110, 170));
        if (gx > -300 && gx < W + 300) {
          const g2 = T.glint.getContext('2d');
          g2.clearRect(0, 0, W, 220);
          g2.globalCompositeOperation = 'source-over';
          g2.drawImage(T.cv, 0, 0);
          g2.globalCompositeOperation = 'source-in';
          const gr = g2.createLinearGradient(gx - 120, 0, gx + 120, 0);
          gr.addColorStop(0, 'rgba(255,255,255,0)');
          gr.addColorStop(0.5, 'rgba(255,255,255,0.9)');
          gr.addColorStop(1, 'rgba(255,255,255,0)');
          g2.fillStyle = gr;
          g2.fillRect(0, 0, W, 220);
          g2.globalCompositeOperation = 'source-over';
          ctx.drawImage(T.glint, 0, y);
        }
        ctx.restore();
      }
      this.foxcText(ctx, 'UMA HISTÓRIA SOBRE EGO', W / 2, top + 40, '900 14px "Segoe UI", sans-serif', '#93c5fd', seg(t, 20, 50) * (1 - seg(t, 270, 295)), 'center', true);
      this.foxcText(ctx, 'Obrigado por chegar até aqui.', W / 2, bot - 40, 'italic 600 20px "Segoe UI", sans-serif', '#cbd5e1', seg(t, 180, 210) * (1 - seg(t, 275, 298)));
    },
    foxcCred1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const you = this.cineYou(this.KITS.japan);
      const name = this.cinePlayerName();
      this.foxcGrad(ctx, 0, 0, W, H, [[0, '#020617'], [1, '#0c1d45']]);
      this.cineBokeh(ctx, W, top, bot, t, 16, ['rgba(56,189,248,0.35)', 'rgba(0,245,212,0.3)'], 2);
      this.cineShafts(ctx, W * 0.3, top - 60, Math.PI * 0.48, 760, 0.5, 5, '125,211,252', 0.14, t);
      ctx.save();
      const zc = 1 + easeIO(t / 360) * 0.08;
      ctx.translate(W * 0.3, H * 0.6);
      ctx.scale(zc, zc);
      ctx.translate(-W * 0.3, -H * 0.6);
      this.foxcCached(ctx, 'foxc_cred_you_rim', you, W * 0.3 - 10, H * 1.2, 600, { tint: '#22d3ee' });
      this.foxcCached(ctx, 'foxc_cred_you_rim', you, W * 0.3, H * 1.2 - 10, 600, { tint: '#22d3ee' });
      this.foxcCached(ctx, 'foxc_cred_you', you, W * 0.3, H * 1.2, 600);
      ctx.restore();
      this.foxcCredits(
        ctx,
        W * 0.72,
        top + 110,
        [['kick', 'ESTRELANDO'], ['name', name], ['role', 'atacante nº 1 do Blue Lock'], ['gap'], ['kick', 'TÍTULOS'], ['line', 'Campeão da Copa do Mundo Sub-20'], ['line', 'Campeão da Copa do Mundo'], ['line', 'Bola de Ouro']],
        seg(t, 20, 140),
        seg(t, 330, 358)
      );
    },
    foxcCred2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const rin = this.cineChar('rin', { angry: true });
      const sae = this.cineChar('sae');
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);
      const kA = ease(seg(t, 0, 24));
      const kB = ease(seg(t, 14, 38));
      this.foxcPanel(
        ctx,
        [[16, top + 14], [W * 0.52, top + 14], [W * 0.4, bot - 14], [16, bot - 14]],
        () => {
          this.foxcGrad(ctx, 0, top, W * 0.55, bot - top, [[0, '#042f2e'], [1, '#010409']]);
          this.drawRinAbyss(ctx, W * 0.25, H * 0.66, 0.7, t, 0.75);
          const u = 520 / 36;
          this.foxcCached(ctx, 'foxc_cred_rin', rin, W * 0.24, H * 0.36 - 10.1 * u + 520 * 0.87 + Math.sin(t * 0.02) * 6, 520);
        },
        { dx: (1 - kA) * -700 }
      );
      this.foxcPanel(
        ctx,
        [[W * 0.54, top + 14], [W - 16, top + 14], [W - 16, bot - 14], [W * 0.42, bot - 14]],
        () => {
          this.foxcGrad(ctx, W * 0.4, top, W * 0.6, bot - top, [[0, '#3b0a12'], [1, '#05030a']]);
          this.foxcRays(ctx, W * 0.78, H * 0.45, 40, 700, 26, '#f43f5e', 0.12, t * 0.002);
          const u = 520 / 36;
          this.foxcCached(ctx, 'foxc_cred_sae', sae, W * 0.78, H * 0.36 - 10.1 * u + 520 * 0.87 - Math.sin(t * 0.02) * 6, 520);
        },
        { dx: (1 - kB) * 760 }
      );
      this.foxcGrad(ctx, 0, bot - 240, W, 240, [[0, 'rgba(2,6,23,0)'], [0.45, 'rgba(2,6,23,0.85)'], [1, 'rgba(2,6,23,0.97)']]);
      const k = seg(t, 50, 150);
      const out = seg(t, 330, 358);
      this.foxcCredits(ctx, W * 0.24, bot - 96, [['kick', 'O RIVAL MORTAL'], ['name', 'RIN ITOSHI']], k, out);
      this.foxcCredits(ctx, W * 0.74, bot - 96, [['kick', 'O GÊNIO QUE DISSE O SEU NOME'], ['name', 'SAE ITOSHI']], seg(t, 90, 190), out);
    },
    foxcCred3(ctx, S) {
      const { W, H, t, top, bot } = S;
      if (!this._foxcCast) {
        const cast = (window.BLUE_LOCK_CHARACTERS || []).filter((c) => !/^gen_|^gk_/.test(c.id));
        this._foxcCast = cast;
      }
      const cast = this._foxcCast;
      this.foxcGrad(ctx, 0, 0, W, H, [[0, '#020617'], [1, '#0b1736']]);
      const cols = 7;
      const cw = 150;
      const chh = 186;
      const gx = 18;
      const rows = Math.ceil(cast.length / cols);
      const wallW = cols * cw + (cols - 1) * gx;
      const total = (bot - top) + rows * (chh + gx) + 60;
      const scroll = (t / 540) * total;
      // Os retratos são montados aos poucos (3 por quadro, na ordem em que aparecem)
      let built = 0;
      for (const c of cast) {
        if (built >= 3) break;
        const key = `foxc_cast_${c.id}`;
        if (!this._foxcPort?.has(`${key}|130`)) {
          this.foxcPortrait(c, key, 130);
          built++;
        }
      }
      ctx.save();
      ctx.translate(W * 0.56, H / 2);
      ctx.rotate(-0.06);
      ctx.translate(-wallW / 2, 0);
      cast.forEach((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (cw + gx);
        const y = H * 0.5 + 20 + row * (chh + gx) - scroll + (col % 2) * 40;
        if (y < -H * 0.7 || y > H * 0.7) return;
        ctx.fillStyle = 'rgba(15,23,42,0.92)';
        ctx.fillRect(x, y, cw, chh);
        ctx.fillStyle = c.auraColor || '#38bdf8';
        ctx.fillRect(x, y, cw, 5);
        const key = `foxc_cast_${c.id}`;
        const ready = this._foxcPort?.has(`${key}|130`);
        if (ready) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(this.foxcPortrait(c, key, 130), x + 10, y + 12);
        }
        ctx.save();
        ctx.font = '800 13px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e2e8f0';
        let nm = (c.name || '').toUpperCase();
        while (ctx.measureText(nm).width > cw - 10) nm = nm.slice(0, -1);
        ctx.fillText(nm, x + cw / 2, y + chh - 26);
        ctx.font = '700 11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(c.position || c.team || '', x + cw / 2, y + chh - 10);
        ctx.restore();
      });
      ctx.restore();
      // título fixo à esquerda
      this.foxcGradH(ctx, 0, 0, W * 0.5, H, [[0, 'rgba(2,6,23,0.97)'], [0.5, 'rgba(2,6,23,0.8)'], [1, 'rgba(2,6,23,0)']]);
      this.foxcCredits(ctx, 60, H * 0.42, [['kick', 'ELENCO'], ['name', 'TODOS OS EGOS'], ['role', 'que cruzaram o seu caminho']], seg(t, 10, 80), seg(t, 510, 538), 'left');
    },
    foxcCred4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const ego = this.getSpeakerCharData('EGO');
      const anri = this.getSpeakerCharData('ANRI');
      const fox = this.foxcFox();
      ctx.fillStyle = '#010205';
      ctx.fillRect(0, 0, W, H);
      const kA = ease(seg(t, 0, 24));
      const kB = ease(seg(t, 150, 176));
      // Ego e Anri na sala dos monitores
      this.foxcPanel(
        ctx,
        [[16, top + 14], [W * 0.56, top + 14], [W * 0.5, bot - 14], [16, bot - 14]],
        () => {
          ctx.fillStyle = '#020a14';
          ctx.fillRect(0, top, W * 0.6, bot - top);
          for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 6; c++) {
              const on = (c + r + Math.floor(t / 20)) % 5;
              ctx.fillStyle = on ? 'rgba(14,165,233,0.22)' : 'rgba(0,245,212,0.4)';
              ctx.fillRect(30 + c * 112, top + 30 + r * 70, 100, 58);
            }
          }
          this.cineGlow(ctx, W * 0.28, top + 160, 360, 'rgba(0,245,212,0.18)');
          this.foxcCached(ctx, 'foxc_cred_anri', anri, W * 0.38, bot + 10, 360);
          this.foxcCached(ctx, 'foxc_cred_ego', ego, W * 0.18, bot + 70, 480);
          ctx.fillStyle = 'rgba(0,30,40,0.25)';
          ctx.fillRect(0, top, W * 0.6, bot - top);
        },
        { dx: (1 - kA) * -760 }
      );
      // O Fox: a fumaça do charuto e o sorriso no escuro
      this.foxcPanel(
        ctx,
        [[W * 0.58, top + 14], [W - 16, top + 14], [W - 16, bot - 14], [W * 0.52, bot - 14]],
        () => {
          ctx.fillStyle = '#050304';
          ctx.fillRect(W * 0.5, top, W * 0.5, bot - top);
          this.cineGlow(ctx, W * 0.8, H * 0.4, 300, 'rgba(127,29,29,0.4)');
          const size = 620;
          const u = size / 36;
          const fx = W * 0.8;
          const feet = H * 0.44 - 10.1 * u + size * 0.87;
          this.foxcFoxShadowed(ctx, fx, feet, size, '#991b1b', 1);
          // a brasa do charuto e a fumaça
          const bx = fx + 4.5 * u;
          const by = feet - size * 0.87 + 13.2 * u;
          ctx.fillStyle = '#78350f';
          ctx.fillRect(bx, by - 4, 46, 9);
          this.cineGlow(ctx, bx + 46, by, 18 + Math.sin(t * 0.2) * 4, 'rgba(249,115,22,0.95)');
          for (let i = 0; i < 9; i++) {
            const age = (t * 0.8 + i * 14) % 120;
            ctx.fillStyle = `rgba(148,163,184,${0.22 * (1 - age / 120)})`;
            ctx.beginPath();
            ctx.arc(bx + 50 + Math.sin(age * 0.06 + i) * 22, by - age * 2.2, 10 + age * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
          if (t > 200) {
            [-1, 1].forEach((s) => this.drawPixelEye(ctx, fx + s * 3.3 * u, H * 0.44, u * 0.25, { line: '#0c0a09', iris: '#1c1917', ring: '#f5f5f4', look: s > 0 ? -1 : 1, blink: t < 206 }));
          }
          this.foxcTwirl(ctx, W * 0.62, bot - 80, 16, t);
        },
        { dx: (1 - kB) * 760 }
      );
      this.foxcGrad(ctx, 0, bot - 220, W, 220, [[0, 'rgba(2,6,23,0)'], [0.5, 'rgba(2,6,23,0.85)'], [1, 'rgba(2,6,23,0.97)']]);
      this.foxcCredits(ctx, W * 0.27, bot - 128, [['kick', 'O PROJETO BLUE LOCK'], ['name', 'JINPACHI EGO'], ['role', 'e Anri Teieri, que acreditou primeiro']], seg(t, 30, 120), seg(t, 330, 358));
      this.foxcCredits(ctx, W * 0.78, bot - 128, [['kick', 'O TREINADOR'], ['name', 'FOX'], ['role', 'paradeiro desconhecido']], seg(t, 180, 260), seg(t, 330, 358));
    },
    foxcCred5(ctx, S) {
      const { W, H, t, top, bot } = S;
      const you = this.cineYou({ jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' });
      const tada = this.getSpeakerCharData('TADA');
      // Amanhecer no campinho: o último chute
      this.foxcGrad(ctx, 0, 0, W, H, [[0, '#0b1d4d'], [0.55, '#1e3a8a'], [0.8, '#f59e0b'], [1, '#7c2d12']]);
      this.cineGlow(ctx, W * 0.72, H * 0.78, 380, 'rgba(253,224,71,0.5)');
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.04 - easeIO(t / 480) * 0.04 });
      ctx.fillStyle = '#0a1f12';
      ctx.fillRect(-200, H * 0.8, W + 400, H);
      // o gol velho
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(W * 0.74, H * 0.82);
      ctx.lineTo(W * 0.74, H * 0.56);
      ctx.lineTo(W * 0.97, H * 0.56);
      ctx.lineTo(W * 0.97, H * 0.82);
      ctx.stroke();
      const kickAt = 70;
      const bk = seg(t, kickAt, kickAt + 34);
      const bulge = pulse(t, kickAt + 34, 30);
      ctx.strokeStyle = 'rgba(226,232,240,0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 1; i < 9; i++) {
        const x = W * 0.74 + i * W * 0.0255;
        ctx.beginPath();
        ctx.moveTo(x, H * 0.56);
        ctx.quadraticCurveTo(x + bulge * 30 * Math.sin((i / 9) * Math.PI), H * 0.69, x, H * 0.82);
        ctx.stroke();
      }
      this.foxcCached(ctx, 'foxc_end_tada', tada, W * 0.18, H * 0.84, 170, { tint: 'rgba(15,23,42,0.85)' });
      const st = t < kickAt - 12 ? 'idle' : t < kickAt ? 'windup' : t < kickAt + 30 ? 'shoot' : 'idle';
      this.drawSprite(ctx, you, W * 0.4, H * 0.86, 230, { animState: st, frame: 0, flipX: false });
      // a bola
      const bx = bk <= 0 ? W * 0.44 : lerp(W * 0.44, W * 0.88, bk);
      const by = bk <= 0 ? H * 0.84 : lerp(H * 0.84, H * 0.64, bk) - Math.sin(bk * Math.PI) * 90;
      if (bk < 1 || t < kickAt + 120) this.drawAnimeBall(ctx, bk >= 1 ? W * 0.88 + bulge * 20 : bx, bk >= 1 ? H * 0.78 : by, 12, 'rgba(0,0,0,0)', 0);
      ctx.restore();
      if (t >= kickAt && t < kickAt + 30) this.drawSpeedLines(ctx, W, H, 'rgba(255,255,255,0.8)', 0.12);
      // os créditos finais
      const k1 = seg(t, 120, 200);
      const o1 = seg(t, 270, 290);
      this.foxcCredits(ctx, W / 2, top + 70, [['kick', 'BASEADO EM'], ['line', 'Blue Lock, de Muneyuki Kaneshiro e Yusuke Nomura'], ['gap'], ['kick', 'E VOCÊ'], ['line', 'que chutou quando todo mundo mandava passar.']], k1, o1);
      const k2 = seg(t, 300, 330);
      this.foxcWord(ctx, 'OBRIGADO POR JOGAR!', W / 2, top + 130, 74, '#facc15', k2, 1, -0.03, W * 0.86);
      this.foxcText(ctx, 'F  I  M', W / 2, top + 210, '900 22px "Segoe UI", sans-serif', '#f8fafc', seg(t, 360, 400));
    },

    // ======================================================================
    // 6) A ABERTURA DA COPA DO MUNDO
    // ======================================================================
    // O estádio visto do alto (pronto num canvas): anel do teto, arquibancada lotada e o gramado
    foxcBowl(W, H) {
      const key = `${W}x${H}`;
      if (this._foxcBowl?.key === key) return this._foxcBowl.cv;
      const cv = document.createElement('canvas');
      cv.width = W + 400;
      cv.height = H + 200;
      const g = cv.getContext('2d');
      const cx = cv.width / 2;
      const cy = H * 0.66;
      const rx = W * 0.72;
      const ry = H * 0.42;
      g.fillStyle = '#060a16';
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      // arquibancada: anéis de torcida em pixels coloridos
      const cols = ['#1d4ed8', '#f8fafc', '#dc2626', '#facc15', '#16a34a', '#38bdf8', '#7dd3fc', '#334155'];
      for (let ring = 0; ring < 12; ring++) {
        const f = 0.95 - ring * 0.028;
        const n = Math.floor(260 * f);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const x = cx + Math.cos(a) * rx * f;
          const y = cy + Math.sin(a) * ry * f;
          g.fillStyle = cols[Math.floor(hash(i * 13 + ring, 2) * cols.length)];
          g.globalAlpha = 0.45 + hash(i, ring) * 0.4;
          g.fillRect(x - 2, y - 2, 5, 4);
        }
      }
      g.globalAlpha = 1;
      // o gramado (retângulo em perspectiva) com faixas
      const pw = rx * 0.98;
      const near = cy + ry * 0.5;
      const far = cy - ry * 0.48;
      g.save();
      g.beginPath();
      g.moveTo(cx - pw * 0.42, far);
      g.lineTo(cx + pw * 0.42, far);
      g.lineTo(cx + pw * 0.62, near);
      g.lineTo(cx - pw * 0.62, near);
      g.closePath();
      g.clip();
      for (let i = 0; i < 12; i++) {
        g.fillStyle = i % 2 ? '#166534' : '#15803d';
        g.fillRect(cx - pw, far + ((near - far) * i) / 12, pw * 2, (near - far) / 12 + 1);
      }
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx - pw * 0.42, far);
      g.lineTo(cx + pw * 0.42, far);
      g.lineTo(cx + pw * 0.62, near);
      g.lineTo(cx - pw * 0.62, near);
      g.closePath();
      g.moveTo(cx, far);
      g.lineTo(cx, near);
      g.stroke();
      g.beginPath();
      g.ellipse(cx, (far + near) / 2, pw * 0.1, (near - far) * 0.12, 0, 0, Math.PI * 2);
      g.stroke();
      // o teto: anel escuro por cima da torcida, com refletores
      g.lineWidth = 34;
      g.strokeStyle = '#0b1120';
      g.beginPath();
      g.ellipse(cx, cy, rx * 1.02, ry * 1.02, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#e0f2fe';
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        g.fillRect(cx + Math.cos(a) * rx * 1.02 - 4, cy + Math.sin(a) * ry * 1.02 - 2, 8, 4);
      }
      this._foxcBowl = { key, cv, cx, cy, rx, ry, far, near, pw };
      return cv;
    },
    foxcOpen0(ctx, S) {
      const { W, H, t, top } = S;
      const cvB = this.foxcBowl(W, H);
      const B = this._foxcBowl;
      const e = easeIO(seg(t, 0, 190));
      this.foxcSky(ctx, W, H, t, '#01030a', '#0f1d3d');
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: lerp(H * 0.48, H * 0.62, e), zoom: lerp(0.95, 1.2, e), rot: lerp(0.03, 0, e) });
      // Holofotes varrendo o céu
      const beamCols = ['147,197,253', '253,224,71', '255,255,255', '244,114,182'];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const bx = W / 2 + Math.cos(a) * B.rx * 1.02;
        const by = B.cy + 60 + Math.sin(a) * B.ry * 1.02;
        const ang = -Math.PI / 2 + Math.sin(t * 0.02 + i * 1.7) * 0.5;
        this.cineShafts(ctx, bx, by, ang, 900, 0.08, 1, beamCols[i % 4], 0.22, t);
      }
      ctx.drawImage(cvB, W / 2 - cvB.width / 2, 60);
      // Show de luz no gramado: anéis com as cores das seleções
      const pc = { x: W / 2, y: (B.far + B.near) / 2 + 60 };
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const lc = ['#dc2626', '#1d4ed8', '#16a34a', '#facc15', '#38bdf8'];
      for (let i = 0; i < 5; i++) {
        const age = (t * 1.4 + i * 22) % 110;
        ctx.strokeStyle = lc[i];
        ctx.globalAlpha = 0.55 * (1 - age / 110);
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.ellipse(pc.x, pc.y, age * 4, age * 1.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      // Placas de LED em volta do campo, trocando de cor
      ctx.strokeStyle = ['#00f5d4', '#facc15', '#f472b6', '#38bdf8'][Math.floor(t / 30) % 4];
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(W / 2, B.cy + 60, B.rx * 0.63, B.ry * 0.63, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Flashes de celular na torcida
      for (let i = 0; i < 50; i++) {
        if ((Math.floor(t / 4) + i * 7) % 13 > 1) continue;
        const a = hash(i, 4) * Math.PI * 2;
        const f = 0.68 + hash(i, 5) * 0.26;
        this.cineGlow(ctx, W / 2 + Math.cos(a) * B.rx * f, B.cy + 60 + Math.sin(a) * B.ry * f, 14, 'rgba(255,255,255,0.9)');
      }
      ctx.restore();
      this.foxcFireworks(ctx, W, top + 40, H * 0.36, t, 6, ['#facc15', '#ef4444', '#38bdf8', '#f8fafc', '#22c55e'], 8, 84, 0.9);
      this.cineTitleCard(ctx, W, top + 120, seg(t, 70, 100), { kicker: 'CERIMÔNIA DE ABERTURA', title: 'COPA DO MUNDO', sub: '48 seleções • 1 troféu', color: '#facc15' });
    },
    foxcOpen1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const teams = [['jp', 'JAPÃO'], ['it', 'ITÁLIA'], ['ar', 'ARGENTINA'], ['ng', 'NIGÉRIA']];
      this.foxcGrad(ctx, 0, 0, W, H, [[0, '#020617'], [1, '#0b1d4d']]);
      // parede de LED
      for (let r = 0; r < 14; r++) {
        for (let c = 0; c < 26; c++) {
          const sweep = Math.abs(((c * 0.6 + r * 0.3 - t * 0.25) % 16) - 8);
          ctx.fillStyle = sweep < 1.2 ? 'rgba(56,189,248,0.35)' : 'rgba(30,58,138,0.25)';
          ctx.fillRect(8 + c * 49, top + 6 + r * 40, 44, 34);
        }
      }
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1 + easeIO(t / 200) * 0.06 });
      // O pote de vidro com as bolinhas
      const px = W * 0.2;
      const py = H * 0.56;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 70, py + 110, 140, 120);
      ctx.fillStyle = 'rgba(148,163,184,0.3)';
      ctx.fillRect(px - 70, py + 110, 140, 6);
      const balls = ['#facc15', '#f8fafc', '#38bdf8', '#ef4444', '#22c55e', '#f8fafc', '#facc15', '#7dd3fc', '#f8fafc', '#ef4444', '#22c55e', '#38bdf8'];
      balls.forEach((col, i) => {
        const a = i * 2.3 + t * 0.03 * (i % 2 ? 1 : -1);
        const rr = 30 + hash(i, 2) * 60;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * rr, py + 30 + Math.sin(a) * rr * 0.6, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(px + Math.cos(a) * rr - 8, py + 30 + Math.sin(a) * rr * 0.6 - 9, 6, 4);
      });
      const glass = ctx.createRadialGradient(px - 40, py - 50, 10, px, py, 130);
      glass.addColorStop(0, 'rgba(255,255,255,0.35)');
      glass.addColorStop(0.6, 'rgba(186,230,253,0.08)');
      glass.addColorStop(1, 'rgba(186,230,253,0.28)');
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.arc(px, py, 125, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(186,230,253,0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
      // O quadro do grupo, levemente em perspectiva
      const bx = W * 0.4;
      const by = top + 26;
      const bw = W * 0.56;
      const bh = bot - top - 52;
      ctx.save();
      ctx.transform(1, -0.035, 0, 1, 0, 30);
      ctx.fillStyle = 'rgba(2,6,23,0.88)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx, by, bw, 74);
      this.foxcText(ctx, 'SORTEIO • FASE DE GRUPOS', bx + bw / 2, by + 20, '900 13px "Segoe UI", sans-serif', '#422006', 1, 'center', true);
      this.foxcText(ctx, 'GRUPO E', bx + bw / 2, by + 50, 'italic 900 36px "Segoe UI", sans-serif', '#020617');
      const rowH = (bh - 100) / 4;
      teams.forEach(([code, nm], i) => {
        const at = 22 + i * 34;
        const ry = by + 88 + i * rowH;
        ctx.fillStyle = 'rgba(30,41,59,0.6)';
        ctx.fillRect(bx + 18, ry, bw - 36, rowH - 12);
        this.foxcText(ctx, `${i + 1}`, bx + 46, ry + (rowH - 12) / 2, '900 26px "Segoe UI", sans-serif', '#475569');
        const k = back(seg(t, at + 12, at + 26));
        if (k > 0) {
          ctx.save();
          ctx.globalAlpha = clamp(k);
          ctx.translate((1 - k) * 90, 0);
          const hl = code === 'jp';
          if (hl) {
            ctx.fillStyle = `rgba(250,204,21,${0.18 + 0.1 * Math.sin(t * 0.15)})`;
            ctx.fillRect(bx + 18, ry, bw - 36, rowH - 12);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3;
            ctx.strokeRect(bx + 18, ry, bw - 36, rowH - 12);
          }
          this.foxcFlag(ctx, code, bx + 80, ry + 10, 100, rowH - 32, t + i * 10, 0.06);
          this.foxcText(ctx, nm, bx + 206, ry + (rowH - 12) / 2, 'italic 900 34px "Segoe UI", sans-serif', hl ? '#facc15' : '#f8fafc', 1, 'left');
          ctx.restore();
        }
        this.cineSfx(S, at + 14, `sorteio${i}`, () => window.SFX?.blip?.(520 + i * 90));
      });
      ctx.restore();
      // A bolinha saindo do pote até a linha
      teams.forEach(([, nm], i) => {
        const at = 22 + i * 34;
        const k = seg(t, at, at + 14);
        if (k <= 0 || k >= 1) return;
        const tx = W * 0.47;
        const ty = top + 150 + i * ((bot - top - 152) / 4);
        const x = lerp(px, tx, k);
        const y = lerp(py - 40, ty, k) - Math.sin(k * Math.PI) * 120;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x - 16, y - 2, 32, 4);
      });
      ctx.restore();
      this.foxcWord(ctx, 'ESTREIA: JAPÃO x ITÁLIA', W * 0.2, top + 60, 28, '#facc15', seg(t, 168, 182), 1, -0.04, W * 0.36);
    },
    foxcOpen2(ctx, S) {
      const { W, H, t } = S;
      const rivals = [
        ['lorenzo', 'it', 'ITÁLIA', 'a muralha de Don Lorenzo', '#1d4ed8', '#0b1d4d'],
        ['gen_argentina_fw', 'ar', 'ARGENTINA', 'a camisa mais pesada do grupo', '#7dd3fc', '#0c2a43'],
        ['gen_nigeria_fw', 'ng', 'NIGÉRIA', 'a velocidade que assusta', '#22c55e', '#052e16']
      ];
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);
      this.foxcStrips(ctx, S, 3, t, (i, cx, y0, y1) => {
        const [id, code, nm, tag, col, bg] = rivals[i];
        const ch = this.cineChar(id);
        this.foxcGrad(ctx, cx - 300, y0, 600, y1 - y0, [[0, bg], [1, '#020617']]);
        ctx.save();
        ctx.globalAlpha = 0.22;
        this.foxcFlag(ctx, code, cx - 300, y0, 600, (y1 - y0) * 0.6, t + i * 20, 0.04);
        ctx.restore();
        this.foxcRays(ctx, cx, y0 + 220, 30, 600, 24, col, 0.12, t * 0.004 + i);
        const size = 520;
        const u = size / 36;
        const eyeY = y0 + 200 + Math.sin(t * 0.04 + i) * 5;
        const feet = eyeY - 10.1 * u + size * 0.87;
        this.foxcCached(ctx, `foxc_rival_${id}`, ch, cx, feet, size);
        ctx.fillStyle = 'rgba(2,6,23,0.25)';
        ctx.fillRect(cx - 300, y0, 600, y1 - y0);
        this.foxcGrad(ctx, cx - 300, y1 - 180, 600, 180, [[0, 'rgba(2,6,23,0)'], [1, 'rgba(2,6,23,0.95)']]);
        this.foxcWord(ctx, nm, cx, y1 - 82, 50, col, seg(t, 20 + i * 18, 34 + i * 18), 1, -0.06, 330);
        this.foxcText(ctx, tag, cx, y1 - 36, 'italic 700 17px "Segoe UI", sans-serif', '#cbd5e1', seg(t, 30 + i * 18, 44 + i * 18));
      }, { stagger: 18, skew: 60 });
    },
    foxcOpen3(ctx, S) {
      const { W, H, t } = S;
      const squad = this.japanSquad(['sae', 'rin', 'shidou', 'bachira', 'nagi', 'chigiri']);
      const vx = W / 2;
      const vy = H * 0.46;
      const grow = 1 + easeIO(t / 200) * 0.35;
      const ew = 250 * grow;
      const eh = 170 * grow;
      ctx.fillStyle = '#04060c';
      ctx.fillRect(0, 0, W, H);
      // paredes, teto e chão do túnel indo até a saída iluminada
      const q = (pts, c) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
      };
      const L = vx - ew / 2;
      const R = vx + ew / 2;
      const T = vy - eh / 2;
      const B = vy + eh / 2;
      q([[0, 0], [W, 0], [R, T], [L, T]], '#070b14');
      q([[0, H], [W, H], [R, B], [L, B]], '#0d1322');
      q([[0, 0], [L, T], [L, B], [0, H]], '#0a0f1c');
      q([[W, 0], [R, T], [R, B], [W, H]], '#0a0f1c');
      // luzes no teto do túnel, correndo para trás
      for (let i = 0; i < 7; i++) {
        const z = ((i / 7 + t * 0.006) % 1);
        const k = 1 - z;
        const y = lerp(T, -40, k * k);
        const w = lerp(ew * 0.2, W * 0.5, k * k);
        ctx.fillStyle = `rgba(226,232,240,${0.25 + 0.5 * k})`;
        ctx.fillRect(vx - w / 2, y, w, 4 + k * 8);
      }
      // a saída: o estádio estourando de luz
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(L, T, ew, eh);
      this.foxcGrad(ctx, L, T + eh * 0.55, ew, eh * 0.45, [[0, 'rgba(34,197,94,0.5)'], [1, 'rgba(22,163,74,0.8)']]);
      this.cineGlow(ctx, vx, vy, 520 * grow, 'rgba(219,234,254,0.85)');
      this.cineShafts(ctx, vx, vy, Math.PI / 2, H, 1.6, 9, '219,234,254', 0.12, t);
      this.cineDust(ctx, W, H, t, 40, 'rgba(226,232,240,0.6)', 2);
      // o time de costas, andando para a luz (contorno aceso pela saída)
      const people = [[squad[1], -0.2, 0.46], [squad[2], 0.22, 0.52], [squad[3], -0.36, 0.3], [squad[4], 0.36, 0.34], [squad[5], -0.13, 0.2], [squad[6], 0.15, 0.16], [squad[0], 0.02, 0.0]];
      people
        .map(([c, ox, z0]) => [c, ox, z0 + t * 0.0016])
        .sort((a, b) => b[2] - a[2])
        .forEach(([c, ox, z], i) => {
          if (!c) return;
          const k = clamp(z);
          const size = lerp(380, 110, k);
          const feet = lerp(H * 1.08, B + 6, k);
          const x = vx + ox * lerp(W * 1.1, ew * 1.3, k);
          const opts = { facing: 'back', animState: 'run', frame: Math.floor(t / 9 + i) % 2 ? 4 : 12, tint: '#05080f' };
          this.cineGlow(ctx, x, feet - size * 0.62, size * 0.5, 'rgba(219,234,254,0.35)');
          const fy = feet - Math.abs(Math.sin(t * 0.35 + i)) * size * 0.03;
          // duas vezes, 1 px de diferença: fecha as frestinhas da pixel art (a luz vazava)
          this.foxcCachedScaled(ctx, `foxc_tun_${c.id || 'you'}`, c, x, fy, size, 380, opts);
          this.foxcCachedScaled(ctx, `foxc_tun_${c.id || 'you'}`, c, x, fy + 1.5, size, 380, opts);
        });
      this.foxcText(ctx, 'WOOOOOOOOH', vx, vy - eh / 2 - 34, 'italic 900 26px "Segoe UI", sans-serif', '#e2e8f0', seg(t, 60, 80) * (0.7 + 0.3 * Math.sin(t * 0.3)), 'center', true);
    },
    foxcOpen4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const squad = this.japanSquad(['sae', 'rin', 'shidou', 'bachira', 'nagi', 'chigiri', 'gagamaru']);
      const [you, sae, rin, shidou, bachira, nagi, chigiri, gagamaru] = squad;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.04 + easeIO(t / 190) * 0.06, shake: 0.8 });
      ctx.save();
      ctx.translate(0, top - 30);
      this.drawU20Stadium(ctx, W, H, t * 0.3, 0.55, 'FIFA WORLD CUP • CERIMÔNIA DE ABERTURA • GRUPO E');
      ctx.restore();
      // o bandeirão do Japão na arquibancada
      this.foxcFlag(ctx, 'jp', W * 0.03, top + 50, W * 0.26, 130, t, 0.05);
      this.foxcFlag(ctx, 'jp', W * 0.71, top + 50, W * 0.26, 130, t + 30, 0.05);
      // a boca do túnel atrás deles
      ctx.fillStyle = '#334155';
      ctx.fillRect(W * 0.4, H * 0.58, W * 0.2, H * 0.27);
      ctx.fillStyle = '#05070c';
      ctx.fillRect(W * 0.415, H * 0.6, W * 0.17, H * 0.25);
      this.cineGlow(ctx, W * 0.5, H * 0.72, 120, 'rgba(219,234,254,0.25)');
      // o time saindo em fila, vindo na direção da câmera
      const lineUp = [[gagamaru, 0.0, 0.95], [nagi, 0.2, 0.84], [chigiri, -0.22, 0.76], [bachira, 0.3, 0.62], [shidou, -0.32, 0.54], [rin, 0.36, 0.36], [sae, -0.36, 0.3], [you, 0.0, 0.1]];
      lineUp.forEach(([c, ox, z0], i) => {
        if (!c) return;
        const z = clamp(z0 + 0.18 - easeIO(t / 190) * 0.18);
        const size = lerp(300, 110, z);
        const feet = lerp(H * 0.99, H * 0.84, z);
        const x = W / 2 + ox * lerp(W * 0.95, W * 0.3, z);
        if (c === you) {
          this.drawSprite(ctx, c, x, feet, size, { animState: 'run', frame: t * 0.5, showAura: t > 120, auraColor: '#38bdf8' });
          return;
        }
        const opts = { animState: 'run', frame: Math.floor(t / 8 + i) % 2 ? 4 : 12, accessories: c === sae ? ['captain_armband'] : [] };
        this.foxcCachedScaled(ctx, `foxc_ent_${c.id}`, c, x, feet - Math.abs(Math.sin(t * 0.39 + i)) * size * 0.03, size, 300, opts);
      });
      ctx.restore();
      // flashes das câmeras (pontinhos)
      for (let i = 0; i < 26; i++) {
        if ((t + i * 11) % 29 > 2) continue;
        this.cineGlow(ctx, hash(i, 6) * W, top + 30 + hash(i, 7) * H * 0.35, 24, 'rgba(255,255,255,0.9)');
      }
      this.drawConfetti(ctx, W, H, t, 40);
      this.foxcGrad(ctx, 0, top, W, 200, [[0, 'rgba(2,6,23,0.85)'], [1, 'rgba(2,6,23,0)']]);
      this.cineTitleCard(ctx, W, top + 100, seg(t, 100, 126), { kicker: 'COPA DO MUNDO • GRUPO E', title: 'O JAPÃO ENTRA EM CAMPO', sub: '', color: '#38bdf8' });
    }
  });

  // ==========================================================================
  // LISTAS DE AQUECIMENTO (o que cada cena monta antes de precisar)
  // ==========================================================================
  const foxW = (fox, size, rim) => [['c', 'foxc_fox_rim', fox, size, { tint: rim }], ['c', 'foxc_fox', fox, size], ['s', fox, size, 11.6, 12.4]];
  const warmTraining = function () {
    const fox = this.foxcFox();
    const you = this.cineYou();
    return [
      ...foxW(fox, 150, '#e0f2fe'),
      ...foxW(fox, 520, '#fef3c7'),
      ...foxW(fox, 700, '#b91c1c'),
      ['c', 'foxc_wall_shadow', you, 820, { tint: 'rgba(5,4,14,0.82)' }],
      ['c', 'foxc_you_warmrim', you, 300, { tint: '#fdba74' }],
      ['c', 'foxc_fox_back_rim', fox, 640, { facing: 'back', tint: '#9a3412' }],
      ['c', 'foxc_fox_back', fox, 640, { facing: 'back', tint: '#010205' }]
    ];
  };
  const warmMonster = function () {
    const you = this.foxcMonsterYou();
    return [['c', 'foxc_monster_edge', you, 860, { tint: '#ef4444' }], ['c', 'foxc_monster_red', you, 860, { tint: '#160202' }]];
  };
  const warmRin = function () {
    const { rin, you } = this.foxcRinChars();
    return [
      ['c', 'foxc_rin_rim', rin, 210, { tint: '#7dd3fc' }],
      ['c', 'foxc_rin_rim', rin, 210, { tint: '#e0f2fe' }],
      ['s', rin, 210],
      ['c', 'foxc_you_back_casual_rim', you, 600, { facing: 'back', tint: '#38bdf8' }],
      ['c', 'foxc_you_back_casual', you, 600, { facing: 'back', tint: '#02040a' }],
      ['f', () => this.foxcPortrait(you, 'foxc_news_you', 180)],
      ['s', rin, 640],
      ['c', 'foxc_you_back_casual_big', you, 780, { facing: 'back', tint: '#010309' }]
    ];
  };
  const warmCeleb = function () {
    const c = this.foxcCelebCfg();
    const list = [];
    c.mates.slice(0, 6).forEach((m, i) => {
      const flipX = i % 2 === 1;
      const size = 210 - Math.floor(i / 2) * 10;
      list.push(['c', `foxc_cel_run_${m.id}`, m, size, { animState: 'run', frame: 4, flipX }]);
      list.push(['c', `foxc_cel_run_${m.id}`, m, size, { animState: 'run', frame: 12, flipX }]);
    });
    c.mates.slice(0, 6).forEach((m, i) => list.push(['c', `foxc_cel_${m.id}`, m, 210 - Math.floor(i / 2) * 10, { animState: 'call_pass', flipX: i % 2 === 1 }]));
    c.panels.forEach(([id]) => list.push(['c', `foxc_cel_head_${id}`, c.mates.find((m) => m.id === id) || c.you, 440]));
    if (c.wc) {
      const fr = this.KITS.france;
      [c.you, ...c.mates.slice(0, 6)].forEach((m, i) => list.push(['c', `foxc_far_${m.id || 'you'}`, m, 150, { animState: 'call_pass', flipX: i > 3, tint: '#0a0f1f' }]));
      const noa = this.cineChar('noa', fr);
      list.push(['c', 'foxc_fr_noa', noa, 270], ['c', 'foxc_fr_noa_dim', noa, 270, { tint: 'rgba(10,20,50,0.45)' }], ['s', noa, 270]);
      ['loki', 'hugo'].forEach((id) => {
        const ch = this.cineChar(id, fr);
        list.push(['c', `foxc_fr_${id}`, ch, 380], ['c', `foxc_fr_${id}_dim`, ch, 380, { tint: 'rgba(10,20,50,0.4)' }], ['s', ch, 380]);
      });
    } else {
      [c.mates[2], c.mates[0], c.mates[4], c.you, c.mates[5], c.mates[1], c.mates[3]].filter(Boolean).forEach((m, i) => {
        const key = m === c.you ? 'foxc_party_you' : `foxc_party_${m.id}`;
        const size = m === c.you ? 290 : 250;
        list.push(['c', key + '_rim', m, size, { animState: 'call_pass', flipX: i > 3, tint: 'rgba(253,224,71,0.9)' }], ['c', key, m, size, { animState: 'call_pass', flipX: i > 3 }]);
      });
    }
    c.mates.slice(0, 6).forEach((m, i) => list.push(['c', `foxc_trophy_mate_${m.id}`, m, 230, { animState: 'call_pass', flipX: i % 2 === 1, tint: 'rgba(15,23,60,0.72)' }]));
    return list;
  };
  const warmCredits = function () {
    const tada = this.getSpeakerCharData('TADA');
    const you = this.cineYou({ jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' });
    const fox = this.foxcFox();
    return [
      ['c', 'foxc_cred_tada', tada, 130, { tint: '#020617' }],
      ['c', 'foxc_cred_you_sil', you, 136, { tint: '#020617' }],
      ['c', 'foxc_cred_you_rim', you, 600, { tint: '#22d3ee' }],
      ['c', 'foxc_cred_you', you, 600],
      ['c', 'foxc_cred_rin', this.cineChar('rin', { angry: true }), 520],
      ['c', 'foxc_cred_sae', this.cineChar('sae'), 520],
      ['c', 'foxc_cred_anri', this.getSpeakerCharData('ANRI'), 360],
      ['c', 'foxc_cred_ego', this.getSpeakerCharData('EGO'), 480],
      ...foxW(fox, 620, '#991b1b'),
      ['c', 'foxc_end_tada', tada, 170, { tint: 'rgba(15,23,42,0.85)' }]
    ];
  };
  const warmOpening = function () {
    const cv = document.getElementById('sakuga-action-canvas');
    const list = [['f', () => this.foxcBowl(cv?.width || 1280, cv?.height || 720)]];
    ['lorenzo', 'gen_argentina_fw', 'gen_nigeria_fw'].forEach((id) => list.push(['c', `foxc_rival_${id}`, this.cineChar(id), 520]));
    const tun = this.japanSquad(['sae', 'rin', 'shidou', 'bachira', 'nagi', 'chigiri']);
    tun.forEach((c) => [4, 12].forEach((fr) => list.push(['c', `foxc_tun_${c.id || 'you'}`, c, 380, { facing: 'back', animState: 'run', frame: fr, tint: '#05080f' }])));
    const ent = this.japanSquad(['sae', 'rin', 'shidou', 'bachira', 'nagi', 'chigiri', 'gagamaru']).slice(1);
    ent.forEach((c) => [4, 12].forEach((fr) => list.push(['c', `foxc_ent_${c.id}`, c, 300, { animState: 'run', frame: fr, accessories: c.id === 'sae' ? ['captain_armband'] : [] }])));
    return list;
  };
  // ==========================================================================
  // REGISTRO DAS CENAS
  // ==========================================================================
  CE.registerCine('fox_training', {
    warm: warmTraining,
    phases: [180, 170, 190, 170, 150],
    music: 'dread',
    title: '🦊 O TREINO DA RAPOSA',
    tags: ['PLANO 1 • 04:00, A ESCADARIA', 'PLANO 2 • O CORPO DESISTE', 'PLANO 3 • A RAPOSA', 'PLANO 4 • A SOMBRA', 'PLANO 5 • DEIXA ELE SAIR'],
    // O "04:00", o contador de degraus, o "9ª SUBIDA", o "hah... hah...", os letreiros
    // MONSTRO / COLEIRA / EU VIM TIRAR. e o "...DEIXA ELE SAIR." já estão na imagem
    subs: [
      [{ from: 10, who: 'FOX', text: '"De novo! Quem para, eu substituo!"', color: FOX_COLOR }],
      [{ from: 8, who: 'FOX', text: '"O corpo desistiu. Agora começa."', color: FOX_COLOR }],
      [{ from: 12, who: 'FOX', text: '"O Ego pôs uma coleira no seu monstro."', color: FOX_COLOR }],
      [{ from: 8, who: 'FOX', text: '"Hehe... Tá ouvindo ele arranhar?"', color: FOX_COLOR }],
      [{ from: 0, who: 'FOX', text: '"Ainda não. Falta perder mais."', color: FOX_COLOR }]
    ],
    grain: 0,
    draw(ctx, S) {
      this.foxcBegin(ctx, S);
      [this.foxcTrain0, this.foxcTrain1, this.foxcTrain2, this.foxcTrain3, this.foxcTrain4][S.phase].call(this, ctx, S);
      this.foxcWarm(this.CINE[this.sakugaType]);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    }
  });

  CE.registerCine('monster_awaken', {
    warm: warmMonster,
    phases: [75, 85, 120],
    music: 'epic',
    title: '👹 O MONSTRO',
    letterbox: 0.09,
    tags: ['PLANO 1 • TUM.', 'PLANO 2 • AS CORRENTES', 'PLANO 3 • O MONSTRO ACORDOU'],
    subs: [
      [{ from: 0, who: 'VOCÊ', text: '(Perder de novo?)', color: YOU_COLOR }],
      [{ from: 4, who: 'FOX', text: '"...deixa ele sair."', color: FOX_COLOR }],
      [{ from: 10, text: '15 s: mais rápido, preciso e forte!' }]
    ],
    grain: 0,
    draw(ctx, S) {
      this.foxcBegin(ctx, S);
      [this.foxcMonster0, this.foxcMonster1, this.foxcMonster2][S.phase].call(this, ctx, S);
      this.foxcWarm(this.CINE[this.sakugaType]);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    }
  });

  CE.registerCine('rin_challenge', {
    warm: warmRin,
    phases: [190, 180, 180, 200],
    music: 'tension',
    title: '⚡ O DESAFIO DO RIN',
    tags: ['PLANO 1 • CHUVA', 'PLANO 2 • A MANCHETE', 'PLANO 3 • O RIVAL', 'PLANO 4 • SÓ EXISTE UM'],
    // A manchete com o seu nome, o "SÓ EXISTE UM." e os dois "VAI SER EU." (um de cada
    // lado, ao mesmo tempo) já estão na imagem: uma fala do Rin por plano
    subs: [
      [{ from: 16, who: 'RIN ITOSHI', text: '"...Não. Vim ver o favorito."', color: RIN_COLOR }],
      [{ from: 2, who: 'RIN ITOSHI', text: '"Essa manchete devia ser minha."', color: RIN_COLOR }],
      [{ from: 6, who: 'RIN ITOSHI', text: '"Você tá vivendo a MINHA vida."', color: RIN_COLOR }],
      [{ from: 20, who: 'RIN ITOSHI', text: '"Bola de Ouro? Só existe UM."', color: RIN_COLOR }]
    ],
    grain: 0,
    draw(ctx, S) {
      this.foxcBegin(ctx, S);
      [this.foxcRin0, this.foxcRin1, this.foxcRin2, this.foxcRin3][S.phase].call(this, ctx, S);
      this.foxcWarm(this.CINE[this.sakugaType]);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    }
  });

  const celebDraw = function (ctx, S) {
    this.foxcBegin(ctx, S);
    [this.foxcCeleb0, this.foxcCeleb1, this.foxcCeleb2, this.foxcCeleb3][S.phase].call(this, ctx, S);
    this.foxcWarm(this.CINE[this.sakugaType]);
    this.foxcGrain(ctx, S.W, S.H, 0.06);
  };
  CE.registerCine('u20_celebration', {
    warm: warmCeleb,
    phases: [150, 170, 180, 210],
    music: 'victory',
    title: '🏆 JAPÃO CAMPEÃO DA COPA DO MUNDO SUB-20',
    tags: ['PLANO 1 • O APITO FINAL', 'PLANO 2 • CADA UM DO SEU JEITO', 'PLANO 3 • A FESTA', 'PLANO 4 • A TAÇA'],
    // O "PRIIIIIIII!!", o "CAMPEÕES!!" e os gritos de cada um nos painéis (BIG BAAANG!!,
    // PARCEIRO!!, TSC., ...NADA MAL.) já estão na imagem
    subs: [
      [{ from: 4, who: 'NARRADOR', text: '"ACABOU! JAPÃO CAMPEÃO!!"', color: '#facc15' }],
      [{ from: 8, who: 'SAE ITOSHI', text: '"Esse gol foi o meu passe."', color: '#f87171' }],
      [{ from: 10, text: 'Fogos no céu. Ninguém quer ir embora.' }],
      [{ from: 10, text: 'Da final do colégio ao topo do mundo.' }]
    ],
    grain: 0,
    draw: celebDraw
  });
  CE.registerCine('wc_champion', {
    warm: warmCeleb,
    phases: [150, 170, 200, 210],
    music: 'victory',
    title: '🏆 JAPÃO CAMPEÃO DA COPA DO MUNDO',
    tags: ['PLANO 1 • O APITO FINAL', 'PLANO 2 • CADA UM DO SEU JEITO', 'PLANO 3 • O OUTRO LADO', 'PLANO 4 • A TAÇA DE VERDADE'],
    // O "PRIIIIIIII!!", o "CAMPEÕES!!", os gritos de cada um nos painéis (QUE CANSEIRA...,
    // PARCEIRO!!, A PRÓXIMA É MINHA., COMO EU DISSE.) e a cartela final já estão na imagem
    subs: [
      [{ from: 4, who: 'NARRADOR MUNDIAL', text: '"ACABOU A COPA!!"', color: '#facc15' }],
      [{ from: 14, who: 'RIN ITOSHI', text: '"Da próxima, o gol é meu."', color: RIN_COLOR }],
      [{ from: 10, who: 'HUGO', text: '"A gente volta. Daqui a quatro anos."', color: '#93c5fd' }],
      [{ from: 10, text: 'A taça de verdade. Pela 1ª vez na história.' }]
    ],
    grain: 0,
    draw: celebDraw
  });

  CE.registerCine('credits', {
    warm: warmCredits,
    phases: [300, 360, 360, 540, 360, 480],
    music: 'promise',
    title: '🎬 CRÉDITOS',
    letterbox: 0.1,
    tags: ['BLUE LOCK: EGOIST CAREER', 'ESTRELANDO', 'OS IRMÃOS ITOSHI', 'ELENCO', 'O BLUE LOCK E A RAPOSA', 'FIM'],
    subs: [[], [], [], [], [], []],
    grain: 0,
    draw(ctx, S) {
      this.foxcBegin(ctx, S);
      [this.foxcCred0, this.foxcCred1, this.foxcCred2, this.foxcCred3, this.foxcCred4, this.foxcCred5][S.phase].call(this, ctx, S);
      this.foxcWarm(this.CINE[this.sakugaType]);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    }
  });

  CE.registerCine('wc_opening', {
    warm: warmOpening,
    phases: [190, 200, 180, 200, 190],
    music: 'epic',
    title: '🌍 A ABERTURA DA COPA DO MUNDO',
    tags: ['PLANO 1 • A CERIMÔNIA', 'PLANO 2 • O SORTEIO', 'PLANO 3 • OS RIVAIS', 'PLANO 4 • O TÚNEL', 'PLANO 5 • O JAPÃO ENTRA EM CAMPO'],
    // A cartela "48 seleções • 1 troféu", o quadro do Grupo E (com a estreia), os rivais
    // com as legendas de cada um e o "WOOOOOOOOH" do túnel já estão na imagem
    subs: [
      [{ from: 16, who: 'NARRADOR MUNDIAL', text: '"Boa noite, planeta!"', color: '#facc15' }],
      [{ from: 10, who: 'NARRADOR MUNDIAL', text: '"E o sorteio do Grupo E..."', color: '#facc15' }],
      [{ from: 10, who: 'NARRADOR MUNDIAL', text: '"É o grupo da morte!"', color: '#facc15' }],
      [{ from: 6, who: 'SAE ITOSHI', text: '"Hoje o mundo aprende o nosso nome."', color: '#f87171' }],
      [{ from: 20, who: 'VOCÊ', text: '"Ninguém aqui veio participar."', color: YOU_COLOR }]
    ],
    grain: 0,
    draw(ctx, S) {
      this.foxcBegin(ctx, S);
      [this.foxcOpen0, this.foxcOpen1, this.foxcOpen2, this.foxcOpen3, this.foxcOpen4][S.phase].call(this, ctx, S);
      this.foxcWarm(this.CINE[this.sakugaType]);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    }
  });
})();
