// ============================================================================
// Cenas cinematográficas (cine_espanha) — ver js/cine_kit.js
// ego_ticket • spain_flight • clasico_bunny • captain_speech • loki_hugo_promise
// Helpers próprios com prefixo "esp" (não colidem com os outros arquivos cine_*)
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;
  const PR = () => window.PixelRenderer;

  Object.assign(CE, {
    // ------------------------------------------------------------ utilidades
    espHex(hex) {
      const n = parseInt(String(hex).replace('#', ''), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    espMix(a, b, k) {
      const A = this.espHex(a);
      const B = this.espHex(b);
      const m = (i) => Math.round(A[i] + (B[i] - A[i]) * k);
      return `rgb(${m(0)},${m(1)},${m(2)})`;
    },
    espLerp(a, b, k) {
      return a + (b - a) * k;
    },
    // Pulso que some sozinho depois de "at" (soco de câmera, tremida de impacto)
    espPulse(t, at, len = 10) {
      return t < at ? 0 : Math.max(0, 1 - (t - at) / len);
    },
    // Posição dos olhos de um boneco desenhado com drawSprite (pés em feet)
    espEyes(x, feet, size) {
      const u = size / 36;
      const top = feet - size * 0.87;
      return { u, y: top + SPRITE_MAPY(10.1) * u, lx: x - 3.3 * u, rx: x + 3.3 * u, top };
    },
    // Texto simples com traço (para letreiros que não são "impacto")
    espText(ctx, text, x, y, size, color, align = 'center', weight = 'italic 900', stroke = '#020617') {
      ctx.save();
      ctx.font = `${weight} ${size}px "Segoe UI", sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      if (stroke) {
        ctx.lineWidth = Math.max(3, size / 8);
        ctx.strokeStyle = stroke;
        ctx.strokeText(text, x, y);
      }
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    },

    // Olho em close extremo (pixel art): sobrancelha, olho, pálpebra que desce, brilho
    // o = { iris, ring, skin, brow, short, angry, look, tiny, blink, lid (0..1), glint, glintColor }
    espEyeCU(ctx, cx, cy, px, o = {}) {
      const x0 = Math.round(cx - 6 * px);
      const y0 = Math.round(cy - 3.5 * px);
      const c = Math.ceil(px);
      // Sobrancelha em blocos (curtinha nos Itoshi, em "V" quando bravo)
      if (o.brow !== false) {
        ctx.fillStyle = o.browColor || '#090d16';
        const cols = o.short ? [6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        cols.forEach((col) => {
          const dy = o.angry ? (col - 1) * 0.28 : col < 3 ? 0.4 : 0;
          ctx.fillRect(Math.round(x0 + col * px), Math.round(y0 - (2.6 - dy) * px), c, Math.ceil(px * 1.2));
        });
      }
      this.drawPixelEye(ctx, cx, cy, px, { line: o.line || '#020617', iris: o.iris, ring: o.ring, look: o.look || 0, tiny: o.tiny, blink: o.blink });
      if (o.blink) return;
      if (o.lid > 0) {
        const n = Math.round(o.lid * 4);
        if (n > 0) {
          ctx.fillStyle = o.skin || '#f3d1b8';
          ctx.fillRect(x0 + px, y0 + px, 10 * px + 1, n * px);
          ctx.fillStyle = o.line || '#020617';
          ctx.fillRect(x0 + px * 0.5, y0 + (1 + n) * px - px * 0.5, 11 * px, Math.ceil(px * 0.9));
        }
      }
      if (o.glint && !o.tiny) {
        const ic = 3 + (o.look || 0);
        const row = 2 + (o.lid > 0.3 ? Math.round(o.lid * 4) - 1 : 0);
        if (row <= 4) {
          ctx.fillStyle = o.glintColor || '#ffffff';
          ctx.fillRect(Math.round(x0 + (ic + 1) * px), Math.round(y0 + row * px), c, c);
        }
      }
    },

    // Painel de olho de um personagem (fundo de pele, mechas de cabelo, o olho)
    espEyePanel(ctx, char, cx, cy, px, o = {}, light = 0) {
      const sk = char.skinColor || '#f3d1b8';
      ctx.fillStyle = PR().shade(sk, -0.12 - light);
      ctx.fillRect(cx - 16 * px, cy - 12 * px, 32 * px, 24 * px);
      // Mechas da franja caindo por cima (blocos diagonais)
      const hair = char.hairColor || '#0f172a';
      const hair2 = char.hairSecondary || hair;
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = i % 3 === 1 ? hair2 : hair;
        const hx = cx - 15 * px + i * 3.6 * px;
        const len = 3 + ((i * 5) % 4);
        for (let k = 0; k < len; k++) ctx.fillRect(Math.round(hx + k * px * 0.5), Math.round(cy - 12 * px + k * px), Math.ceil(px * 2.4), Math.ceil(px));
      }
      this.espEyeCU(ctx, cx, cy, px, Object.assign({ iris: PR().shade(char.eyeColor || '#0f766e', -0.25), ring: char.eyeColor || '#5eead4', skin: PR().shade(sk, -0.12 - light), short: char.shortBrows }, o));
    },

    // ---------------------------------------------------------- cache de bonecos parados
    // Um boneco grande custa caro (cada drawSprite amplia uma área bem maior que ele, e o
    // recorte de luz/escurecido são 2–4 desenhos). Quem está parado é montado UMA vez num
    // canvas do tamanho certo e depois só colado (dx/dy = deslocamento, para quem só anda)
    espCharKey(c) {
      return [c.name, c.hairStyle, c.hairColor, c.hairSecondary, c.skinColor, c.eyeColor, c.eyeStyle, c.jerseyPrimary, c.jerseySecondary, c.outfit, c.hat].join('|');
    },
    espStatic(ctx, key, x0, y0, w, h, fn, dx = 0, dy = 0) {
      if (!this._espStatic) this._espStatic = new Map();
      let cv = this._espStatic.get(key);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.ceil(w));
        cv.height = Math.max(1, Math.ceil(h));
        const g = cv.getContext('2d');
        g.translate(-x0, -y0);
        fn(g);
        this._espStatic.set(key, cv);
        let px = 0;
        this._espStatic.forEach((c) => (px += c.width * c.height));
        while (this._espStatic.size > 1 && (px > 24e6 || this._espStatic.size > 40)) {
          const k0 = this._espStatic.keys().next().value;
          const c0 = this._espStatic.get(k0);
          px -= c0.width * c0.height;
          this._espStatic.delete(k0);
        }
      }
      // Sem suavizar: é pixel art, e ampliar sem filtro custa bem menos
      const sm = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, Math.round(x0 + dx), Math.round(y0 + dy));
      ctx.imageSmoothingEnabled = sm;
    },
    // Só monta/pega o canvas guardado (para quem desenha com giro/escala/alpha próprios)
    espCanvas(key, w, h, fn) {
      if (!this._espCv) this._espCv = {};
      if (!this._espCv[key]) {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        fn(cv.getContext('2d'));
        this._espCv[key] = cv;
      }
      return this._espCv[key];
    },
    // Aura animada por cima de um corpo guardado: a aura (labaredas) é desenhada direto,
    // o corpo vem do cache (espFig). Bem mais barato que o drawSprite com showAura.
    espAuraFig(ctx, tag, char, x, feet, size, opts, dy = 0, rim = null) {
      const o = Object.assign({ animState: 'idle', frame: this.sakugaFrame }, opts, { showAura: true, auraOnly: true });
      ctx.save();
      ctx.translate(x - size / 2, feet + dy - size * 0.87);
      window.PixelRenderer.drawCharacterBody(ctx, char, size, size * 1.1, o);
      ctx.restore();
      // showAura + noAura: boca aberta e o rastro no olho (como no Fluxo), sem as labaredas
      const bodyOpts = Object.assign({}, opts, { showAura: true, noAura: true, frame: 1 });
      this.espFig(ctx, tag + (rim || ''), char, x, feet, size, (g) => {
        if (rim) this.drawSilhouette(g, char, x + Math.max(2, size / 90), feet - 2, size, bodyOpts, rim);
        this.drawSprite(g, char, x, feet, size, bodyOpts);
      }, 0, dy);
    },
    // Boneco parado (pés em feet): fn(g) desenha nele usando as mesmas coordenadas
    espFig(ctx, tag, char, x, feet, size, fn, dx = 0, dy = 0) {
      const key = `${tag}|${this.espCharKey(char)}|${Math.round(x)}|${Math.round(feet)}|${Math.round(size)}`;
      this.espStatic(ctx, key, Math.floor(x - size * 0.56), Math.floor(feet - size * 1.02), size * 1.12, size * 1.06, fn, dx, dy);
    },

    // Close nos olhos do próprio boneco (pixel art de verdade, o personagem continua
    // reconhecível): cineHead ampliado em volta dos olhos + pálpebra (lid 0..1, 1 = fechado)
    // e um brilho na íris
    espFaceCU(ctx, char, cx, eyeY, size, zoom = 1, o = {}) {
      // Até ~1400 px o boneco já é montado no tamanho final (colar 1:1 é bem mais barato
      // que ampliar a cada quadro); acima disso o canvas ficaria grande demais
      if (size * zoom <= 1400) {
        size *= zoom;
        zoom = 1;
      }
      ctx.save();
      ctx.translate(cx, eyeY);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -eyeY);
      const u = size / 36;
      const head = { u, top: eyeY - SPRITE_MAPY(10.1) * u, feet: eyeY - SPRITE_MAPY(10.1) * u + size * 0.87 };
      this.espFig(ctx, 'head', char, cx, head.feet, size, (g) => this.drawSprite(g, char, cx, head.feet, size, Object.assign({ animState: 'idle', frame: 1 }, o.opts || {})));
      const y0 = head.top + SPRITE_MAPY(8.7) * u;
      if (o.lid > 0) {
        const skin = PR().shade(char.skinColor || '#f3d1b8', -0.08);
        [12.6, 19.6].forEach((ex) => {
          ctx.fillStyle = skin;
          ctx.fillRect(cx + (ex - 18) * u, y0, 3.8 * u, o.lid * 2.7 * u);
          ctx.fillStyle = '#0a0f1c';
          ctx.fillRect(cx + (ex - 18) * u, y0 + o.lid * 2.7 * u - 0.45 * u, 3.8 * u, 0.55 * u);
        });
      }
      if (o.glint && (o.lid || 0) < 0.5) {
        ctx.fillStyle = o.glint;
        [14.15, 20.15].forEach((ex) => ctx.fillRect(cx + (ex - 18) * u, head.top + SPRITE_MAPY(9.3) * u + (o.lid || 0) * 2 * u, 0.45 * u, 0.45 * u));
      }
      ctx.restore();
      return head;
    },

    // Cartão de embarque (desenhado com a origem no canto de cima à esquerda, 520 x 200)
    espBoardingPass(ctx, name) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 520, 200);
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(0, 0, 520, 40);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(372, 40, 2, 160);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 17px "Segoe UI", sans-serif';
      ctx.fillText('BLUE LOCK AIRLINES • CARTÃO DE EMBARQUE', 16, 27);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic 900 50px "Segoe UI", sans-serif';
      ctx.fillText('HND', 16, 100);
      ctx.fillText('BCN', 228, 100);
      // Aviãozinho entre os códigos
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.moveTo(150, 72);
      ctx.lineTo(214, 82);
      ctx.lineTo(150, 92);
      ctx.lineTo(160, 82);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(170, 66, 10, 32);
      ctx.font = '700 13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('TÓQUIO', 18, 122);
      ctx.fillText('BARCELONA', 230, 122);
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 14px "Segoe UI", sans-serif';
      ctx.fillText(`PASSAGEIRO: ${name}`, 18, 156);
      ctx.fillText('VOO BL-011 • ASSENTO 11A • 06:00', 18, 180);
      for (let i = 0; i < 28; i++) ctx.fillRect(388 + i * 4.4, 58, i % 3 ? 2 : 3, 124);
    },

    // Ingresso do clássico (origem no canto, 340 x 130)
    espClasicoTicket(ctx) {
      const tg = ctx.createLinearGradient(0, 0, 340, 0);
      tg.addColorStop(0, '#7f1d1d');
      tg.addColorStop(1, '#1e40af');
      ctx.fillStyle = tg;
      ctx.fillRect(0, 0, 340, 130);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, 328, 118);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#facc15';
      ctx.font = 'italic 900 34px "Segoe UI", sans-serif';
      ctx.fillText('EL CLÁSICO', 18, 48);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 16px "Segoe UI", sans-serif';
      ctx.fillText('FC BARCHA x RE AL', 20, 80);
      ctx.fillText('ESTADI BARCHA • 21:00', 20, 106);
    },

    // Cadeado do Blue Lock em blocos (lacre do envelope)
    espLock(ctx, x, y, s, color = '#00f5d4') {
      ctx.fillStyle = color;
      ctx.fillRect(x - 3 * s, y - 7 * s, 6 * s, 1.4 * s);
      ctx.fillRect(x - 3.6 * s, y - 6 * s, 1.4 * s, 5 * s);
      ctx.fillRect(x + 2.2 * s, y - 6 * s, 1.4 * s, 5 * s);
      ctx.fillRect(x - 5 * s, y - 1.5 * s, 10 * s, 8 * s);
      ctx.fillStyle = '#020617';
      ctx.fillRect(x - 0.8 * s, y + 0.5 * s, 1.6 * s, 3.5 * s);
    },

    // Placar no canto do palco (o drawU20Scoreboard antigo fica escondido pela tarja)
    espScoreboard(ctx, x, y, home, away, minute, hl = 'BARCHA', al = 'RE AL') {
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,23,0.88)';
      ctx.fillRect(x, y, 300, 38);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(x, y, 6, 38);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(x + 294, y, 6, 38);
      ctx.font = '900 16px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(hl, x + 16, y + 19);
      ctx.textAlign = 'right';
      ctx.fillText(al, x + 284, y + 19);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#facc15';
      ctx.fillText(`${home} - ${away}`, x + 150, y + 19);
      ctx.font = '800 12px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(minute, x + 150, y + 50);
      ctx.restore();
    },

    // Torre Eiffel em silhueta (x = centro, base = chão, h = altura)
    espEiffel(ctx, x, base, h, color = '#3b2412') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - h * 0.24, base);
      ctx.quadraticCurveTo(x - h * 0.07, base - h * 0.42, x - h * 0.025, base - h);
      ctx.lineTo(x + h * 0.025, base - h);
      ctx.quadraticCurveTo(x + h * 0.07, base - h * 0.42, x + h * 0.24, base);
      ctx.lineTo(x + h * 0.13, base);
      ctx.quadraticCurveTo(x, base - h * 0.16, x - h * 0.13, base);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - h * 0.15, base - h * 0.3, h * 0.3, h * 0.03);
      ctx.fillRect(x - h * 0.09, base - h * 0.58, h * 0.18, h * 0.022);
      ctx.fillRect(x - 1.5, base - h * 1.1, 3, h * 0.12);
    },

    // Telhados de Paris (mansardas e chaminés) em silhueta
    espParisRoofs(ctx, W, base, color, shift = 0) {
      ctx.fillStyle = color;
      for (let i = -1; i < 16; i++) {
        const a = Math.sin(i * 12.9898 + 3) * 43758.5453;
        const r = a - Math.floor(a);
        const x = i * 96 - (shift % 96);
        const h = 70 + r * 70;
        ctx.fillRect(x, base - h, 92, h);
        ctx.beginPath();
        ctx.moveTo(x - 4, base - h);
        ctx.lineTo(x + 12, base - h - 26);
        ctx.lineTo(x + 80, base - h - 26);
        ctx.lineTo(x + 96, base - h);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x + 20 + r * 40, base - h - 44, 10, 22);
      }
    },

    // Lembrança: tom quente desbotado, vazamento de luz, granulado forte e a janela do
    // projetor de cinema (cantos arredondados). Nada pisca: tudo anda devagar.
    espMemory(ctx, S, k = 1) {
      const { W, H, t, top, bot } = S;
      // Tom sépia + preto levantado numa passada só (as duas camadas já somadas)
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(181,131,77,0.33)';
      ctx.fillRect(0, top, W, bot - top);
      ctx.restore();
      this.cineGlow(ctx, W * 0.1 + Math.sin(t * 0.012) * 50, top + 30, 360, 'rgba(255,160,70,0.55)', 0.7 * k);
      // Riscos verticais do filme, andando devagar
      ctx.save();
      ctx.globalAlpha = 0.16 * k;
      ctx.fillStyle = '#fff7ed';
      [0.23, 0.71].forEach((fx, i) => ctx.fillRect(((fx * W + t * (0.35 + i * 0.2)) % W), top, 1.5, bot - top));
      ctx.restore();
      // Janela do projetor
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(24,12,4,0.9)';
      ctx.beginPath();
      ctx.rect(0, top, W, bot - top);
      const i = 16;
      const r = 46;
      const x0 = i;
      const y0 = top + i;
      const x1 = W - i;
      const y1 = bot - i;
      ctx.moveTo(x0 + r, y0);
      ctx.arcTo(x0, y0, x0, y0 + r, r);
      ctx.arcTo(x0, y1, x0 + r, y1, r);
      ctx.arcTo(x1, y1, x1, y1 - r, r);
      ctx.arcTo(x1, y0, x1 - r, y0, r);
      ctx.closePath();
      ctx.fill('evenodd');
      ctx.restore();
    },

    // Fileira de armários do vestiário (mundo inteiro da cena; lit 0..1)
    espLockers(ctx, x0, x1, y0, floorY, lit = 0) {
      ctx.fillStyle = this.espMix('#0b1530', '#1f2a3d', lit);
      ctx.fillRect(x0, y0 - 200, x1 - x0, floorY - y0 + 200);
      for (let x = x0 + 8; x < x1; x += 94) {
        ctx.fillStyle = this.espMix('#13254a', '#2f5288', lit);
        ctx.fillRect(x, y0, 84, floorY - y0);
        ctx.fillStyle = this.espMix('#0b1834', '#1b2f50', lit);
        for (let v = 0; v < 4; v++) ctx.fillRect(x + 18, y0 + 14 + v * 10, 48, 4);
        ctx.fillRect(x + 80, y0, 4, floorY - y0);
        ctx.fillStyle = this.espMix('#475569', '#cbd5e1', lit);
        ctx.fillRect(x + 68, y0 + (floorY - y0) * 0.42, 5, 24);
      }
      ctx.fillStyle = this.espMix('#1e293b', '#9ca3af', lit);
      ctx.fillRect(x0, floorY, x1 - x0, 900);
    },

    // Os armários (e o véu escuro por cima) guardados prontos
    espLockersStatic(ctx, x0, x1, y0, floorY, lit, veil = null, alpha = 1) {
      const key = `lockers|${x0}|${x1}|${y0}|${floorY}|${lit}|${veil}|${alpha}`;
      this.espStatic(ctx, key, x0, y0 - 200, x1 - x0, floorY - y0 + 600, (g) => {
        g.globalAlpha = alpha;
        this.espLockers(g, x0, x1, y0, floorY, lit);
        g.globalAlpha = 1;
        if (veil) {
          g.fillStyle = veil;
          g.fillRect(x0, y0 - 200, x1 - x0, floorY - y0 + 600);
        }
      });
    },

    // Luminária pendurada com o cone de luz (ang = balanço)
    espLamp(ctx, x, y, len, spread, ang, alpha = 0.22, color = '191,219,254') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, `rgba(${color},${alpha})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-22, 8);
      ctx.lineTo(22, 8);
      ctx.lineTo(spread, len);
      ctx.lineTo(-spread, len);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-2, -400, 4, 400);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(-26, 10);
      ctx.lineTo(-12, -10);
      ctx.lineTo(12, -10);
      ctx.lineTo(26, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(${color},0.95)`;
      ctx.fillRect(-16, 8, 32, 4);
      ctx.restore();
      this.cineGlow(ctx, x, y + 12, 70, `rgba(${color},0.7)`, 0.8);
    },

    // cinePanel contorna o caminho ATUAL depois do draw(): se o draw desenhou alguma
    // linha, a borda saía em cima dela. Aqui o polígono do painel é refeito no fim.
    espPanel(ctx, pts, draw, opts) {
      this.cinePanel(ctx, pts, () => {
        draw();
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
      }, opts);
    },

    // Personagem com recorte de luz nos dois lados e escurecido (contra-luz)
    espBacklit(ctx, char, x, feet, size, opts, dim, tint, rimL, rimR) {
      const d = Math.max(2, size / 90);
      const o = Object.assign({ animState: 'idle', frame: 1 }, opts);
      if (rimL) this.drawSilhouette(ctx, char, x - d, feet - d * 0.4, size, o, rimL);
      if (rimR) this.drawSilhouette(ctx, char, x + d, feet - d * 0.4, size, o, rimR);
      this.drawSpriteDim(ctx, char, x, feet, size, o, dim, tint);
    },

    // ================================================================ EGO TICKET
    // Plano 1: a sala de monitores, o Ego em contraluz atrás da mesa (câmera entrando)
    espEgo0(ctx, S) {
      const { W, H, t, p, top, bot } = S;
      const cast = this.spainCast();
      const ego = cast.ego;
      const k = this.cineEaseInOut(p);
      ctx.fillStyle = '#01040b';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W * 0.5 + k * 50, y: H * 0.5 - k * 40, zoom: 1.02 + k * 0.2 });
      // Parede de monitores
      const cols = 8;
      const rows = 4;
      const mw = (W + 80) / cols;
      const mh = 92;
      const wy = top - 40;
      const kindOf = (i, r) => [0, 1, 3, 1, 0, 3, 2][(i * 3 + r * 5) % 7];
      // A parede é montada uma vez (em t = 0) e guardada; por cima só andam os pontinhos
      // dos jogadores nas telas de jogo
      const wall = (ctx, t) => {
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < cols; i++) {
          const x = -40 + i * mw;
          const y = wy + r * (mh + 10);
          const kind = kindOf(i, r);
          ctx.fillStyle = '#050b18';
          ctx.fillRect(x + 4, y, mw - 8, mh);
          if (kind === 0) {
            ctx.fillStyle = '#0b3a26';
            ctx.fillRect(x + 10, y + 6, mw - 20, mh - 12);
            ctx.strokeStyle = 'rgba(220,252,231,0.45)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 16, y + 12, mw - 32, mh - 24);
            ctx.beginPath();
            ctx.moveTo(x + mw / 2, y + 12);
            ctx.lineTo(x + mw / 2, y + mh - 12);
            ctx.stroke();
          } else if (kind === 1) {
            ctx.fillStyle = 'rgba(0,245,212,0.55)';
            for (let b = 0; b < 5; b++) ctx.fillRect(x + 14, y + 12 + b * 14, (mw - 40) * (0.3 + 0.7 * Math.abs(Math.sin(b * 1.7 + i + t * 0.01))), 5);
          } else if (kind === 2) {
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(x + 10, y + 6, (mw - 20) / 2, mh - 12);
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(x + 10 + (mw - 20) / 2, y + 6, (mw - 20) / 2, mh - 12);
            ctx.fillStyle = '#facc15';
            ctx.font = '900 13px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('AO VIVO • ESPANHA', x + mw / 2, y + mh / 2 + 5);
          } else {
            ctx.fillStyle = '#0b1736';
            ctx.fillRect(x + 10, y + 6, mw - 20, mh - 12);
            ctx.fillStyle = 'rgba(147,197,253,0.4)';
            ctx.font = '900 12px "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`#${(i * 7 + r * 13) % 300}`, x + 16, y + 26);
          }
          ctx.strokeStyle = 'rgba(0,245,212,0.5)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y, mw - 8, mh);
        }
      }
      ctx.fillStyle = 'rgba(1,4,11,0.42)';
      ctx.fillRect(-100, wy - 20, W + 200, rows * (mh + 10) + 40);
      };
      // Parede + brilho dos monitores + feixes de luz: tudo num canvas só
      this.espStatic(ctx, `egoWall|${W}|${top}`, -100, wy - 20, W + 200, H - wy + 60, (g) => {
        g.fillStyle = '#01040b';
        g.fillRect(-100, wy - 20, W + 200, H - wy + 60);
        wall(g, 0);
        this.cineGlow(g, W * 0.55, top + 150, 620, 'rgba(0,245,212,0.35)', 0.55);
        this.cineShafts(g, W * 0.55, top - 30, Math.PI / 2, 560, 1.7, 7, '0,245,212', 0.07, 0);
      });
      ctx.fillStyle = 'rgba(200,90,90,0.75)';
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < cols; i++) {
          if (kindOf(i, r)) continue;
          const x = -40 + i * mw;
          const y = wy + r * (mh + 10);
          for (let d = 0; d < 4; d++) ctx.fillRect(x + 24 + ((d * 37 + t * 0.6 + i * 9) % (mw - 50)), y + 22 + d * 13, 4, 4);
        }
      }
      // Faixa de varredura descendo devagar pelos monitores
      const sy = wy + ((t * 1.6) % (rows * (mh + 10)));
      ctx.fillStyle = 'rgba(0,245,212,0.07)';
      ctx.fillRect(-60, sy, W + 120, 26);
      // O Ego atrás da mesa, contra a luz dos monitores
      const ex = W * 0.56;
      const esz = 480;
      const efeet = bot + 50;
      this.espFig(ctx, 'egoBack', ego, ex, efeet, esz, (g) => this.espBacklit(g, ego, ex, efeet, esz, { frame: 1 }, 0.45, '2,14,32', '#00f5d4', '#00f5d4'));
      // O brilho correndo pelas lentes dos óculos
      const g = this.cineSeg(t, 70, 100);
      if (g > 0 && g < 1) {
        const u = esz / 36;
        const etop = efeet - esz * 0.87;
        ctx.save();
        ctx.beginPath();
        [12.4, 19.4].forEach((gx) => ctx.rect(ex + (gx + 0.6 - 18) * u, etop + SPRITE_MAPY(8.7) * u, 3 * u, 2.4 * u));
        ctx.clip();
        const gx = ex - 6 * u + g * 12 * u;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.moveTo(gx, etop + SPRITE_MAPY(8) * u);
        ctx.lineTo(gx + 1.6 * u, etop + SPRITE_MAPY(8) * u);
        ctx.lineTo(gx + 0.4 * u, etop + SPRITE_MAPY(12) * u);
        ctx.lineTo(gx - 1.2 * u, etop + SPRITE_MAPY(12) * u);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // A mesa (borda acesa pelo reflexo dos monitores)
      const deskY = bot - 70;
      this.espStatic(ctx, `egoDesk|${W}|${bot}`, -100, deskY, W + 200, H - deskY + 60, (g) => {
        this.cineGradient(g, -100, deskY, W + 200, H - deskY + 60, [[0, '#0b1324'], [1, '#02040a']]);
        g.fillStyle = 'rgba(0,245,212,0.5)';
        g.fillRect(-100, deskY, W + 200, 3);
        this.cineGlow(g, W * 0.55, deskY + 20, 260, 'rgba(0,245,212,0.25)', 0.6);
      });
      ctx.restore();
      // Você de costas no primeiro plano (sem câmera: fica mais perto)
      const you = this.cineYou();
      this.espFig(ctx, 'egoYou', you, W * 0.14, bot + 300, 640, (g) => this.espBacklit(g, you, W * 0.14, bot + 300, 640, { facing: 'back' }, 0.72, '1,6,16', '#0e7490', '#22d3ee'));
      this.cineDust(ctx, W, H, t, 30, 'rgba(165,243,252,0.5)', 5);
    },

    // Plano 2: tríptico de mangá — os óculos do Ego / a mão empurrando o envelope / o seu olho
    espEgo1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.spainCast();
      const ego = cast.ego;
      const you = this.cineYou();
      ctx.fillStyle = '#01040b';
      ctx.fillRect(0, 0, W, H);
      this.drawRadialSpeedLines(ctx, W * 0.6, (top + bot) / 2, W, '#0e7490', 0.25);
      const inA = this.cineEase(t / 14);
      const inC = this.cineEase((t - 12) / 14);
      const inB = this.cineEase((t - 78) / 14);
      // Painel A: os óculos do Ego e o brilho cortando as lentes
      if (inA > 0) {
        const pts = [[26, top + 14], [W * 0.45, top + 14], [W * 0.42, top + 262], [26, top + 262]];
        this.espPanel(ctx, pts, () => {
          this.cineGradient(ctx, 0, top, W * 0.5, 280, [[0, '#04212b'], [1, '#020617']]);
          const cx = W * 0.23;
          const eyeY = top + 150;
          const u = 900 / 36;
          const head = { top: eyeY - SPRITE_MAPY(10.1) * u };
          const feet = head.top + 900 * 0.87;
          this.espFig(ctx, 'egoHead', ego, cx, feet, 900, (g) => this.drawSprite(g, ego, cx, feet, 900, { animState: 'idle', frame: 1 }));
          ctx.fillStyle = 'rgba(2,12,28,0.35)';
          ctx.fillRect(0, top, W * 0.5, 280);
          const g = this.cineSeg(t, 16, 44);
          if (g > 0 && g < 1) {
            ctx.save();
            ctx.beginPath();
            [12.4, 19.4].forEach((gx) => ctx.rect(cx + (gx + 0.6 - 18) * u, head.top + SPRITE_MAPY(8.7) * u, 3 * u, 2.4 * u));
            ctx.clip();
            const gx = cx - 7 * u + g * 14 * u;
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath();
            ctx.moveTo(gx, head.top + SPRITE_MAPY(8) * u);
            ctx.lineTo(gx + 1.8 * u, head.top + SPRITE_MAPY(8) * u);
            ctx.lineTo(gx + 0.4 * u, head.top + SPRITE_MAPY(12) * u);
            ctx.lineTo(gx - 1.4 * u, head.top + SPRITE_MAPY(12) * u);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }, { dx: -(1 - inA) * 500 });
      }
      // Painel B: o seu olho acompanhando o envelope
      if (inB > 0) {
        const pts = [[26, top + 278], [W * 0.418, top + 278], [W * 0.395, bot - 14], [26, bot - 14]];
        this.espPanel(ctx, pts, () => {
          ctx.fillStyle = '#04121c';
          ctx.fillRect(0, top + 270, W * 0.45, 300);
          this.espFaceCU(ctx, you, W * 0.21, top + 400, 760, 1.5, { glint: '#a5f3fc' });
          const sh = ctx.createLinearGradient(0, 0, W * 0.42, 0);
          sh.addColorStop(0, 'rgba(0,30,50,0.1)');
          sh.addColorStop(1, 'rgba(0,30,50,0.6)');
          ctx.fillStyle = sh;
          ctx.fillRect(0, top + 270, W * 0.45, 300);
        }, { dy: (1 - inB) * 320 });
      }
      // Painel C: a mesa vista de cima, a mão do Ego deslizando o envelope até você
      if (inC > 0) {
        const pts = [[W * 0.465, top + 14], [W - 26, top + 14], [W - 26, bot - 14], [W * 0.435, bot - 14]];
        this.espPanel(ctx, pts, () => {
          const cx = W * 0.72;
          this.cineGradient(ctx, W * 0.4, top, W * 0.6, bot - top, [[0, '#0a1626'], [1, '#02050b']]);
          ctx.strokeStyle = 'rgba(0,245,212,0.12)';
          ctx.lineWidth = 2;
          for (let i = -6; i <= 6; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 20, top - 120);
            ctx.lineTo(cx + i * 140, bot);
            ctx.stroke();
          }
          this.cineGlow(ctx, cx - 120, top + 120, 200, 'rgba(0,245,212,0.3)', 0.5);
          this.cineGlow(ctx, cx + 160, top + 260, 160, 'rgba(56,189,248,0.25)', 0.5);
          const k = this.cineEaseInOut(this.cineSeg(t, 24, 92));
          const sc = this.espLerp(0.62, 1.12, k);
          const ey = this.espLerp(top + 120, bot - 170, k);
          // Linhas de velocidade enquanto ele desliza
          if (k > 0.05 && k < 0.95) {
            ctx.strokeStyle = 'rgba(165,243,252,0.35)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 9; i++) {
              const lx = cx - 150 * sc + i * 38 * sc;
              ctx.beginPath();
              ctx.moveTo(lx, ey - 100 * sc - 40 - (i % 3) * 30);
              ctx.lineTo(lx, ey - 100 * sc - 160 - (i % 3) * 40);
              ctx.stroke();
            }
          }
          ctx.save();
          ctx.translate(cx, ey);
          ctx.scale(sc, sc);
          ctx.rotate(-0.04 + k * 0.04);
          ctx.fillStyle = '#05080f';
          ctx.fillRect(-180, -95, 360, 190);
          ctx.strokeStyle = '#00f5d4';
          ctx.lineWidth = 3;
          ctx.strokeRect(-180, -95, 360, 190);
          ctx.strokeStyle = 'rgba(0,245,212,0.35)';
          ctx.beginPath();
          ctx.moveTo(-180, -95);
          ctx.lineTo(0, 10);
          ctx.lineTo(180, -95);
          ctx.stroke();
          this.espLock(ctx, 0, 14, 3.4);
          // A mão (manga do terno preta, dedos em blocos) — solta o envelope no fim
          const back = this.cineEase(this.cineSeg(t, 100, 130)) * 160;
          ctx.translate(0, -back);
          // Manga do terno + punho branco
          ctx.fillStyle = '#0b0f1a';
          ctx.fillRect(-62, -460, 124, 290);
          ctx.fillStyle = '#1f2937';
          ctx.fillRect(34, -460, 28, 290);
          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(-62, -178, 124, 14);
          // Costas da mão, dedos dobrados e os dois dedos esticados em cima do envelope
          ctx.fillStyle = '#f1dfcd';
          ctx.fillRect(-50, -164, 100, 70);
          ctx.fillStyle = '#d9c2ad';
          ctx.fillRect(26, -164, 24, 70);
          ctx.fillRect(-50, -104, 30, 26);
          ctx.fillRect(20, -104, 30, 22);
          ctx.fillStyle = '#f1dfcd';
          ctx.fillRect(-18, -100, 17, 112);
          ctx.fillRect(3, -100, 17, 100);
          ctx.fillStyle = '#b89f8a';
          ctx.fillRect(-1, -100, 4, 100);
          ctx.fillRect(-18, -60, 17, 3);
          ctx.fillRect(3, -60, 17, 3);
          ctx.fillStyle = '#fff7ed';
          ctx.fillRect(-15, 0, 11, 8);
          ctx.fillRect(6, -12, 11, 8);
          // Polegar de lado
          ctx.fillStyle = '#e8d2bd';
          ctx.fillRect(-72, -140, 24, 46);
          ctx.restore();
        }, { dx: (1 - inC) * 700 });
      }
      this.cineSfx(S, 26, 'slide', () => window.SFX?.whoosh?.());
    },

    // Plano 3: o envelope abre, a luz sai de dentro, a passagem e o ingresso sobem
    espEgo2(ctx, S) {
      const { W, H, t, p, top, bot } = S;
      const name = this.cinePlayerName();
      this.espStatic(ctx, `envBg|${W}|${H}`, 0, 0, W, H, (g) => {
        g.fillStyle = '#02050c';
        g.fillRect(0, 0, W, H);
        this.cineGlow(g, W / 2, (top + bot) / 2, 700, 'rgba(14,116,144,0.4)', 0.6);
      });
      ctx.save();
      const zoom = 1.02 + this.cineEaseInOut(p) * 0.16;
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2 + 10, zoom, rot: 0.03 - this.cineEaseInOut(p) * 0.05 });
      const cx = W / 2;
      const drop = this.cineEaseInOut(this.cineSeg(t, 104, 150)) * 520;
      const ey = H * 0.5 + 20 + drop;
      const ew = 620;
      const eh = 330;
      const fold = 1 - 2 * this.cineEaseInOut(this.cineSeg(t, 14, 40));
      const open = this.cineSeg(t, 24, 50);
      const flap = (inside) => {
        ctx.fillStyle = inside ? '#101a30' : '#070b14';
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - ew / 2, ey);
        ctx.lineTo(cx + ew / 2, ey);
        ctx.lineTo(cx, ey + 180 * fold);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      // Fundo do envelope e a luz saindo pela abertura
      ctx.fillStyle = '#0a1120';
      ctx.fillRect(cx - ew / 2, ey, ew, eh);
      if (fold <= 0) flap(true);
      if (open > 0) {
        const sh = this.espCanvas('envShafts', 1100, 560, (g) => this.cineShafts(g, 550, 550, -Math.PI / 2, 520, 1.5, 8, '0,245,212', 0.22, 0));
        ctx.save();
        ctx.globalAlpha = open;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(sh, cx - 550, ey + 10 - 550);
        ctx.restore();
        this.cineGlow(ctx, cx, ey, 300, 'rgba(0,245,212,0.55)', open);
      }
      // A passagem subindo (e depois vindo para a câmera)
      const up = this.cineEase(this.cineSeg(t, 40, 100));
      const fly = this.cineEaseInOut(this.cineSeg(t, 100, 150));
      ctx.save();
      const ey0 = ey - drop;
      ctx.translate(cx, this.espLerp(ey0 + 120, ey0 - 150, up) - fly * 40);
      ctx.scale(1 + fly * 0.22, 1 + fly * 0.22);
      ctx.rotate(-0.03 * fly);
      ctx.drawImage(this.espCanvas(`pass|${name}`, 520, 200, (g) => this.espBoardingPass(g, name)), -260, -100);
      ctx.restore();
      // Frente do envelope (com o lacre que quebra)
      ctx.fillStyle = '#070b14';
      ctx.fillRect(cx - ew / 2, ey, ew, eh);
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - ew / 2, ey, ew, eh);
      ctx.strokeStyle = 'rgba(0,245,212,0.3)';
      ctx.beginPath();
      ctx.moveTo(cx - ew / 2, ey + eh);
      ctx.lineTo(cx, ey + eh * 0.45);
      ctx.lineTo(cx + ew / 2, ey + eh);
      ctx.stroke();
      ctx.fillStyle = '#00f5d4';
      ctx.font = '900 24px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('B L U E   L O C K', cx, ey + eh - 40);
      if (fold > 0) {
        flap(false);
        const brk = this.cineSeg(t, 8, 30);
        const sy = ey + 180 * fold - 6;
        if (brk <= 0) this.espLock(ctx, cx, sy, 4);
        else {
          ctx.save();
          ctx.globalAlpha = 1 - brk;
          [-1, 1].forEach((s) => {
            ctx.save();
            ctx.translate(cx + s * brk * 60, sy + brk * brk * 120);
            ctx.rotate(s * brk * 0.8);
            ctx.beginPath();
            ctx.rect(s < 0 ? -30 : 0, -40, 30, 80);
            ctx.clip();
            this.espLock(ctx, 0, 0, 4);
            ctx.restore();
          });
          ctx.restore();
        }
      }
      ctx.restore();
      // O ingresso do clássico entra por cima, girando (fora da câmera: chega "na lente")
      const side = this.cineEase(this.cineSeg(t, 128, 162));
      if (side > 0) {
        ctx.save();
        ctx.translate(this.espLerp(W + 260, W * 0.62, side), this.espLerp(top + 40, top + 300, side));
        ctx.rotate(0.5 - side * 0.38);
        ctx.drawImage(this.espCanvas('clasicoTicket', 340, 130, (g) => this.espClasicoTicket(g)), 0, 0);
        ctx.restore();
      }
      this.cineSfx(S, 8, 'seal', () => window.SFX?.page?.());
      this.cineSfx(S, 128, 'ticket', () => window.SFX?.whoosh?.());
    },

    // Plano 4: o seu rosto aceso pela luz da passagem e o letreiro "RUMO À ESPANHA"
    espEgo3(ctx, S) {
      const { W, H, t, p, top, bot } = S;
      const you = this.cineYou();
      this.espStatic(ctx, `egoBg3|${W}|${top}`, 0, top, W, bot - top, (g) => {
        this.cineGradient(g, 0, top, W, bot - top, [[0, '#020617'], [1, '#04162a']]);
        const dk = g.createLinearGradient(W * 0.25, 0, W, 0);
        dk.addColorStop(0, 'rgba(2,6,23,0)');
        dk.addColorStop(1, 'rgba(2,6,23,0.45)');
        g.fillStyle = dk;
        g.fillRect(0, top, W, bot - top);
      });
      this.cineBokeh(ctx, W, top + 40, bot - 60, t, 12, ['rgba(0,245,212,0.35)', 'rgba(59,130,246,0.35)'], 4);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1 + this.cineEaseInOut(p) * 0.06 });
      const cx = W * 0.27;
      const eyeY = top + 230;
      const size = 820;
      const u = size / 36;
      const feet = eyeY - SPRITE_MAPY(10.1) * u + size * 0.87;
      this.espFig(ctx, 'egoFace', you, cx, feet, size, (g) => {
        this.drawSilhouette(g, you, cx - 8, feet, size, { frame: 1 }, '#67e8f9');
        this.drawSpriteDim(g, you, cx, feet, size, { frame: 1 }, 0.38, '2,12,32');
        // Sombra do lado direito do rosto (só nos pixels do boneco)
        const sh = g.createLinearGradient(cx - 20, 0, cx + 240, 0);
        sh.addColorStop(0, 'rgba(2,6,23,0)');
        sh.addColorStop(1, 'rgba(2,6,23,0.7)');
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = sh;
        g.fillRect(cx - 20, feet - size, size, size * 1.1);
        g.globalCompositeOperation = 'source-over';
      });
      // Luz de baixo (a passagem)
      this.cineGlow(ctx, cx + 30, bot + 80, 380, 'rgba(0,245,212,0.5)', 0.75);
      ctx.restore();
      // A passagem fora de foco no primeiro plano
      ctx.save();
      ctx.translate(W * 0.02, bot - 70);
      ctx.rotate(-0.2);
      ctx.scale(0.8, 0.8);
      const pn = this.cinePlayerName();
      ctx.drawImage(this.espCanvas(`pass|${pn}`, 520, 200, (g) => this.espBoardingPass(g, pn)), 0, 0);
      ctx.fillStyle = 'rgba(2,10,24,0.45)';
      ctx.fillRect(0, 0, 520, 200);
      ctx.restore();
      // Letreiro
      const k = this.cineSeg(t, 30, 60);
      ctx.save();
      ctx.translate(W * 0.72 - W * 0.3, 0);
      this.cineTitleCard(ctx, W * 0.6, top + stageMid(S) - 10, k, { kicker: 'INTERLÚDIO', title: 'RUMO À ESPANHA', sub: 'Os monstros de verdade estão lá fora.', color: '#00f5d4' });
      ctx.restore();
      this.cineDust(ctx, W, H, t, 24, 'rgba(165,243,252,0.5)', 9);
    },

    // ============================================================== SPAIN FLIGHT
    // Plano 1: Haneda ao amanhecer, pelo vidro do terminal; o painel de partidas
    espFly0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.spainCast();
      const hy = top + 330;
      this.cineGradient(ctx, 0, top - 20, W, hy - top + 20, [[0, '#0b1640'], [0.45, '#3b2f86'], [0.82, '#f97316'], [1, '#fdba74']]);
      this.cineGlow(ctx, W * 0.8, hy, 340, 'rgba(253,186,116,0.8)', 0.9);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, hy);
      ctx.clip();
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(W * 0.8, hy + 6, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.cineCity(ctx, W, hy, 80, '#231a52', 'rgba(253,224,71,0.45)', 4, t * 0.15);
      this.cineGradient(ctx, 0, hy, W, bot - hy, [[0, '#1c1838'], [1, '#090b18']]);
      // Luzes da pista em perspectiva
      [[hy + 22, 70, 3], [hy + 58, 110, 4], [hy + 120, 170, 6]].forEach(([y, step, s], r) => {
        for (let x = -((t * (0.3 + r * 0.4)) % step); x < W; x += step) {
          ctx.fillStyle = r === 1 ? '#38bdf8' : '#fbbf24';
          ctx.fillRect(x, y, s, s);
        }
      });
      // O avião taxiando lá fora
      this.drawPlane(ctx, W * 0.36 + t * 0.7, hy + 34, 1.15, 1);
      this.cineGlow(ctx, W * 0.36 + t * 0.7 + 210, hy + 30, 30, 'rgba(248,113,113,0.8)', 0.8);
      // Vidro do terminal: tom frio por cima de tudo lá fora e reflexos
      ctx.fillStyle = 'rgba(20,24,70,0.22)';
      ctx.fillRect(0, top, W, bot - top);
      const off = (t * 1.1) % 330;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let x = -330 - off; x < W + 330; x += 330) {
        ctx.beginPath();
        ctx.moveTo(x + 60, top);
        ctx.lineTo(x + 140, top);
        ctx.lineTo(x + 40, bot);
        ctx.lineTo(x - 40, bot);
        ctx.closePath();
        ctx.fill();
      }
      // Caixilhos (paralaxe: andam mais rápido que a paisagem)
      ctx.fillStyle = '#060914';
      for (let x = -off; x < W + 330; x += 330) ctx.fillRect(x, top - 10, 22, bot - top + 20);
      ctx.fillRect(0, top + 70, W, 14);
      // Chão do terminal, com o reflexo do sol
      this.cineGradient(ctx, 0, bot - 70, W, 70, [[0, '#0d1022'], [1, '#04050c']]);
      this.cineGlow(ctx, W * 0.8, bot - 40, 160, 'rgba(251,146,60,0.35)', 0.6);
      // Você de costas, olhando o avião
      this.espFig(ctx, 'hnd', cast.traveler, W * 0.3, bot + 110, 520, (g) => this.espBacklit(g, cast.traveler, W * 0.3, bot + 110, 520, { facing: 'back' }, 0.66, '8,10,30', '#6366f1', '#fb923c'), -t * 0.25);
      // Painel de partidas (letras virando até parar)
      const bx = W - 474;
      const by = top + 100;
      ctx.fillStyle = 'rgba(2,6,23,0.92)';
      ctx.fillRect(bx, by, 430, 96);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, 430, 96);
      ctx.font = '900 13px "Consolas", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('PARTIDAS • DEPARTURES', bx + 14, by + 22);
      ctx.font = '900 20px "Consolas", monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('06:00  BL-011', bx + 14, by + 54);
      const dest = 'BARCELONA';
      const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let shown = '';
      for (let i = 0; i < dest.length; i++) shown += t >= 18 + i * 5 ? dest[i] : AB[(Math.floor(t / 2) * 7 + i * 11) % 26];
      ctx.fillText(shown, bx + 196, by + 54);
      ctx.font = '900 15px "Consolas", monospace';
      ctx.fillStyle = t > 70 ? '#4ade80' : '#475569';
      ctx.fillText(t > 70 ? 'PORTÃO 11 • EMBARQUE' : 'PORTÃO 11 • AGUARDE', bx + 14, by + 82);
    },

    // Plano 2: a decolagem vista de baixo — o avião passa por cima da câmera
    espFly1(ctx, S) {
      const { W, H, t, top, bot } = S;
      this.cineGradient(ctx, 0, top, W, bot - top, [[0, '#1e3a8a'], [0.6, '#c2410c'], [1, '#fbbf24']]);
      const sunX = W * 0.74;
      const sunY = top + 110;
      this.cineGlow(ctx, sunX, sunY, 360, 'rgba(253,230,138,0.85)', 0.9);
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
      ctx.fill();
      // Reflexos de lente na linha do sol até o centro
      [[0.55, 26, 'rgba(56,189,248,0.4)'], [1.05, 46, 'rgba(251,146,60,0.35)'], [1.5, 18, 'rgba(255,255,255,0.4)']].forEach(([k, r, c]) => this.cineGlow(ctx, sunX + (W / 2 - sunX) * k, sunY + ((top + bot) / 2 - sunY) * k, r, c, 0.8));
      const k = this.cineSeg(t, 6, 104);
      const shake = 9 * Math.max(0, 1 - Math.abs(k - 0.3) * 3.2);
      ctx.save();
      this.cineCamera(ctx, W, H, { shake });
      // A pista no pé da tela
      ctx.fillStyle = '#0b0f1c';
      ctx.fillRect(-20, bot - 70, W + 40, 90);
      ctx.fillStyle = '#fbbf24';
      for (let x = -((t * 14) % 80); x < W; x += 80) ctx.fillRect(x, bot - 40, 34, 4);
      // Trilha de condensação
      const px = this.espLerp(-260, W + 300, k);
      const py = this.espLerp(bot + 140, top - 120, k);
      const sc = this.espLerp(3.4, 1.4, k);
      if (k > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        [-1, 1].forEach((s) => {
          const g = ctx.createLinearGradient(px, py, -300, bot + 300);
          g.addColorStop(0, 'rgba(255,255,255,0.6)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 10 * sc * 0.6;
          ctx.beginPath();
          ctx.moveTo(px - 60 * sc + s * 18 * sc, py + 34 * sc + s * 10);
          ctx.lineTo(-300, bot + 300 + s * 60);
          ctx.stroke();
        });
        ctx.restore();
      }
      if (k > 0 && k < 1) {
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(-0.42);
        ctx.translate(-W / 2, -H / 2);
        this.drawSpeedLines(ctx, W, H, '#ffffff', 0.14);
        ctx.restore();
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-0.42);
        this.drawPlane(ctx, 0, 0, sc, 1);
        // Barriga do avião na sombra (é contraluz)
        ctx.restore();
      }
      ctx.restore();
      const tk = this.cineSeg(t, 84, 100);
      if (tk > 0) {
        this.cineImpactText(ctx, 'TÓQUIO  ✈  BARCELONA', W / 2, bot - 120, 54, '#f8fafc', tk, W * 0.8);
        ctx.save();
        ctx.globalAlpha = this.cineSeg(t, 96, 112);
        this.espText(ctx, '10.400 KM • 14 HORAS DE VOO', W / 2, bot - 66, 20, '#fde68a', 'center', '900');
        ctx.restore();
      }
      this.cineSfx(S, 16, 'takeoff', () => window.SFX?.whoosh?.());
    },

    // Plano 3: a janelinha do avião — o céu passa de noite para dia em 14 horas
    espFly2(ctx, S) {
      const { W, H, t, p, top, bot } = S;
      const cast = this.spainCast();
      const k = p;
      const mixSky = (a, b, c) => (k < 0.5 ? this.espMix(a, b, k * 2) : this.espMix(b, c, (k - 0.5) * 2));
      const skyTop = mixSky('#020617', '#1e3a8a', '#0369a1');
      const skyBot = mixSky('#1e1b4b', '#fb923c', '#bae6fd');
      const cloud = mixSky('#334155', '#fed7aa', '#ffffff');
      ctx.save();
      this.cineCamera(ctx, W, H, { zoom: 1.02 + this.cineEaseInOut(p) * 0.05, shake: 1.6 });
      // Parede da cabine
      this.espStatic(ctx, `cabin|${W}`, -40, top - 40, W + 80, bot - top + 80, (g) => {
        this.cineGradient(g, -40, top - 40, W + 80, bot - top + 80, [[0, '#1e293b'], [1, '#0b1220']]);
        g.strokeStyle = 'rgba(148,163,184,0.12)';
        g.lineWidth = 3;
        [0.2, 0.86].forEach((fx) => {
          g.beginPath();
          g.moveTo(W * fx, top - 40);
          g.quadraticCurveTo(W * fx - 30, H / 2, W * fx, bot + 40);
          g.stroke();
        });
      });
      const wx = W * 0.5;
      const wy = (top + bot) / 2 - 6;
      const rx = 150;
      const ry = 200;
      if (k < 0.7) this.cineGlow(ctx, wx, wy, 330, 'rgba(56,189,248,0.4)', 0.5 * (1 - k));
      if (k > 0.3) this.cineGlow(ctx, wx, wy, 330, 'rgba(253,186,116,0.4)', 0.6 * k);
      // Moldura da janela
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(wx, wy, rx + 36, ry + 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(wx, wy, rx + 12, ry + 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Lá fora
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(wx, wy, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      this.cineGradient(ctx, wx - rx, wy - ry, rx * 2, ry * 2, [[0, skyTop], [1, skyBot]]);
      const stars = Math.max(0, 1 - k * 2.6);
      if (stars > 0) {
        ctx.fillStyle = `rgba(255,255,255,${stars * 0.8})`;
        for (let i = 0; i < 26; i++) ctx.fillRect(wx - rx + ((i * 97) % (rx * 2)), wy - ry + ((i * 53) % ry), 2, 2);
      }
      const sunK = this.cineSeg(k, 0.3, 0.75);
      if (sunK > 0) {
        const sy = this.espLerp(wy + ry * 0.7, wy - ry * 0.4, sunK);
        this.cineGlow(ctx, wx + 60, sy, 160, 'rgba(255,237,213,0.9)', sunK);
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.arc(wx + 60, sy, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      // Mar de nuvens passando
      [[wy + ry * 0.45, 2.6, 0.8], [wy + ry * 0.75, 5, 1]].forEach(([cy, sp, a], L) => {
        ctx.fillStyle = cloud;
        ctx.globalAlpha = a;
        for (let i = 0; i < 6; i++) {
          const x = ((i * 150 - t * sp) % 900 + 900) % 900 + wx - rx - 300;
          ctx.beginPath();
          ctx.ellipse(x, cy, 110 + L * 30, 28 + L * 8, 0, 0, Math.PI * 2);
          ctx.ellipse(x + 60, cy - 16, 70, 26, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      // A ponta da asa com a luz vermelha de navegação
      ctx.fillStyle = this.espMix('#334155', '#e2e8f0', k);
      ctx.beginPath();
      ctx.moveTo(wx + rx + 10, wy + ry * 0.25);
      ctx.lineTo(wx - 40, wy + ry * 0.62);
      ctx.lineTo(wx - 20, wy + ry * 0.7);
      ctx.lineTo(wx + rx + 10, wy + ry * 0.45);
      ctx.closePath();
      ctx.fill();
      this.cineGlow(ctx, wx - 34, wy + ry * 0.64, 22, 'rgba(248,113,113,0.9)', 0.9);
      ctx.restore();
      // Luz da janela entrando na cabine
      this.cineShafts(ctx, wx, wy, Math.PI * 0.82, 700, 0.5, 4, k < 0.5 ? '147,197,253' : '254,215,170', 0.05 + k * 0.08, t);
      // Brilho do vidro
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(wx, wy, rx - 18, ry - 18, 0, Math.PI * 1.1, Math.PI * 1.4);
      ctx.stroke();
      // Tela do encosto com a rota
      const sx = W * 0.71;
      const sy = top + 60;
      const sw = 330;
      const shh = 220;
      ctx.fillStyle = '#020617';
      ctx.fillRect(sx - 10, sy - 10, sw + 20, shh + 20);
      ctx.fillStyle = '#062033';
      ctx.fillRect(sx, sy, sw, shh);
      ctx.fillStyle = 'rgba(14,116,144,0.4)';
      [[0.2, 0.42, 0.13, 0.17], [0.32, 0.3, 0.1, 0.12], [0.55, 0.36, 0.2, 0.2], [0.82, 0.4, 0.07, 0.18], [0.68, 0.62, 0.09, 0.1]].forEach(([a, b, c, d]) => {
        ctx.beginPath();
        ctx.ellipse(sx + sw * a, sy + shh * b, sw * c, shh * d, 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = 'rgba(165,243,252,0.08)';
      ctx.lineWidth = 1;
      for (let gx = sx + 20; gx < sx + sw; gx += 30) {
        ctx.beginPath();
        ctx.moveTo(gx, sy);
        ctx.lineTo(gx, sy + shh);
        ctx.stroke();
      }
      const A = { x: sx + sw * 0.86, y: sy + shh * 0.5 };
      const B = { x: sx + sw * 0.14, y: sy + shh * 0.46 };
      const Q = { x: sx + sw * 0.5, y: sy + shh * 0.02 };
      ctx.setLineDash([5, 6]);
      ctx.strokeStyle = 'rgba(165,243,252,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.quadraticCurveTo(Q.x, Q.y, B.x, B.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const q = this.cineEaseInOut(p);
      const bz = (s) => ({ x: (1 - s) * (1 - s) * A.x + 2 * (1 - s) * s * Q.x + s * s * B.x, y: (1 - s) * (1 - s) * A.y + 2 * (1 - s) * s * Q.y + s * s * B.y });
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const pt = bz((q * i) / 24);
        if (i) ctx.lineTo(pt.x, pt.y);
        else ctx.moveTo(pt.x, pt.y);
      }
      ctx.stroke();
      const pt = bz(q);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(pt.x - 5, pt.y - 5, 10, 10);
      ctx.font = '900 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('TÓQUIO', A.x, A.y + 22);
      ctx.fillText('BARCELONA', B.x, B.y + 22);
      const mins = Math.round((1 - q) * 14 * 60);
      ctx.textAlign = 'left';
      ctx.font = '900 14px "Consolas", monospace';
      ctx.fillStyle = '#a5f3fc';
      ctx.fillText(`TEMPO RESTANTE ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`, sx + 12, sy + shh - 34);
      ctx.fillStyle = '#64748b';
      ctx.fillText('ALTITUDE 11.000 m', sx + 12, sy + shh - 14);
      ctx.restore();
      // Você de costas no primeiro plano, a luz da janela no contorno
      const day = k > 0.45;
      this.espFig(ctx, day ? 'seatD' : 'seatN', cast.traveler, W * 0.2, bot + 250, 560, (g) => this.espBacklit(g, cast.traveler, W * 0.2, bot + 250, 560, { facing: 'back' }, 0.6, '6,10,28', null, day ? '#fdba74' : '#93c5fd'));
    },

    // Plano 4: Barcelona — a câmera desce do sol até a cidade e encontra você
    espFly3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.spainCast();
      const tilt = this.cineEaseInOut(this.cineSeg(t, 0, 100));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: this.espLerp(H / 2 - 360, H / 2, tilt), zoom: 1.02 });
      const hy = top + 360;
      // Céu, mar, cidade e rua: tudo parado, montado uma vez só
      const city = (ctx) => {
      this.cineGradient(ctx, -20, -500, W + 40, hy + 520, [[0, '#0369a1'], [0.55, '#38bdf8'], [0.88, '#bae6fd'], [1, '#fde68a']]);
      this.cineGlow(ctx, W * 0.66, -160, 520, 'rgba(255,237,213,0.8)', 0.6);
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(W * 0.66, -160, 54, 0, Math.PI * 2);
      ctx.fill();
      // O mar e o brilho dele
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-20, hy - 56, W * 0.5, 50);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 14; i++) ctx.fillRect((i * 83) % (W * 0.48), hy - 50 + (i % 3) * 14, 18, 2);
      ctx.fillStyle = '#c9a77f';
      ctx.fillRect(-20, hy - 8, W + 40, 60);
      // A cidade cor de areia, as torres da basílica e o estádio do Barcha
      for (let i = 0; i < 20; i++) {
        const a = Math.sin(i * 7.1) * 999.9;
        const r = a - Math.floor(a);
        const bw = 50 + r * 40;
        const bh = 40 + r * 70;
        const x = i * 68 - 20;
        ctx.fillStyle = i % 2 ? '#e7c9a0' : '#d6b38a';
        ctx.fillRect(x, hy + 24 - bh, bw, bh + 30);
        ctx.fillStyle = 'rgba(120,80,40,0.35)';
        for (let wy = hy + 34 - bh; wy < hy + 20; wy += 14) for (let wx = x + 8; wx < x + bw - 8; wx += 14) ctx.fillRect(wx, wy, 5, 7);
      }
      const sag = W * 0.52;
      [[-54, 190], [-18, 250], [18, 250], [54, 190]].forEach(([dx, h]) => {
        ctx.fillStyle = '#b08a5e';
        ctx.beginPath();
        ctx.moveTo(sag + dx - 16, hy + 10);
        ctx.lineTo(sag + dx - 10, hy - h * 0.7);
        ctx.lineTo(sag + dx, hy - h);
        ctx.lineTo(sag + dx + 10, hy - h * 0.7);
        ctx.lineTo(sag + dx + 16, hy + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8a6a44';
        for (let y = hy - h * 0.62; y < hy; y += 16) ctx.fillRect(sag + dx - 4, y, 8, 6);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(sag + dx - 3, hy - h - 10, 6, 10);
      });
      // O estádio
      const stx = W * 0.85;
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(stx, hy + 8, 150, 50, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(stx - 150, hy - 4, 300, 10);
      ctx.fillStyle = '#facc15';
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESTADI BARCHA', stx, hy - 14);
      // Rua e calçada
      this.cineGradient(ctx, -20, hy + 26, W + 40, 600, [[0, '#c9a27a'], [1, '#7a5a3c']]);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < 9; i++) ctx.fillRect(i * 160 - 40, hy + 150, 90, 6);
      };
      this.espStatic(ctx, `bcn|${W}|${top}`, -20, -520, W + 40, hy + 900, city);
      // Gaivotas
      ctx.strokeStyle = 'rgba(15,23,42,0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const gx = ((i * 260 + t * (1.2 + i * 0.2)) % (W + 200)) - 100;
        const gy = -80 + i * 55 + Math.sin(t * 0.05 + i) * 8;
        const fl = Math.sin(t * 0.25 + i * 2) * 5;
        ctx.beginPath();
        ctx.moveTo(gx - 14, gy - fl);
        ctx.lineTo(gx, gy);
        ctx.lineTo(gx + 14, gy - fl);
        ctx.stroke();
      }
      // Palmeiras em silhueta
      [[W * 0.06, 1], [W * 0.94, -1]].forEach(([px, s]) => {
        ctx.fillStyle = '#3f2a14';
        ctx.fillRect(px - 7, hy - 200, 14, 420);
        ctx.fillStyle = '#14532d';
        for (let f = 0; f < 6; f++) {
          const a = -Math.PI / 2 + (f - 2.5) * 0.55 + Math.sin(t * 0.03 + f) * 0.04;
          ctx.save();
          ctx.translate(px, hy - 200);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.ellipse(70, 0, 76, 13, 0.3 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
      ctx.restore();
      // Você entra no quadro por baixo quando a câmera termina de descer, e se espreguiça
      const enter = this.cineEase(this.cineSeg(t, 80, 118));
      if (enter > 0) {
        const pose = t > 128 ? 'call_pass' : 'idle';
        const xf = W * 0.3;
        const yf = bot + 90;
        this.espFig(ctx, 'bcn' + pose, cast.traveler, xf, yf, 540, (g) => {
          this.drawSilhouette(g, cast.traveler, xf + 7, yf - 2, 540, { animState: pose, frame: 1 }, '#fde68a');
          this.drawSprite(g, cast.traveler, xf, yf, 540, { animState: pose, frame: 1 });
        }, -(1 - enter) * 60, (1 - enter) * 520);
      }
      this.cineDust(ctx, W, H, t, 26, 'rgba(254,240,138,0.7)', 2);
      // Letreiro com as faixas da bandeira
      const k = this.cineEase(this.cineSeg(t, 96, 124));
      if (k > 0) {
        const x0 = W * 0.48;
        const y0 = top + 34;
        const w = 560 * k;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x0, y0, w, 12);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x0, y0 + 12, w, 22);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x0, y0 + 34, w, 12);
        ctx.save();
        ctx.globalAlpha = this.cineSeg(t, 104, 120);
        this.espText(ctx, 'BARCELONA, ESPANHA', x0 + 4 + (1 - k) * 40, y0 + 92, 50, '#f8fafc', 'left');
        this.espText(ctx, '41°23′N • 13:40 • 31 °C', x0 + 8, y0 + 138, 17, '#fde68a', 'left', '800');
        ctx.restore();
      }
    },

    // ============================================================= CLÁSICO BUNNY
    espStands(ctx, W, y0, t, cheer = 0, shift = 0) {
      const scarf = ['#7f1d1d', '#1e40af', '#facc15', '#f8fafc'];
      ctx.save();
      ctx.translate(-shift, 0);
      this.drawStandsCrowd(ctx, W + shift + 200, [{ y: y0, scale: 0.45 }, { y: y0 + 46, scale: 0.55 }, { y: y0 + 104, scale: 0.68 }], t, scarf, cheer);
      ctx.restore();
    },

    // Plano 1: o estádio de noite, a grua descendo até o gramado; você na arquibancada
    espCla0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.spainCast();
      const k = this.cineEaseInOut(this.cineSeg(t, 0, 130));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: this.espLerp(H / 2 - 330, H / 2, k), zoom: this.espLerp(1.12, 1.0, k) });
      const gy = top + 310;
      // Céu, torres de luz, teto, fundo da arquibancada e gramado: montados uma vez
      const stadium = (ctx, t) => {
      ctx.fillStyle = '#020617';
      ctx.fillRect(-40, -440, W + 80, 60);
      ctx.save();
      ctx.translate(0, -420);
      this.cineNightSky(ctx, W, 520, t, { top: '#020617', bottom: '#1e1b4b' });
      ctx.restore();
      // Teto do estádio e torres de luz
      ctx.fillStyle = '#05070f';
      ctx.fillRect(-40, top + 20, W + 80, 40);
      [W * 0.1, W * 0.9].forEach((lx, i) => {
        ctx.fillStyle = '#111827';
        ctx.fillRect(lx - 6, -330, 12, 380);
        ctx.fillStyle = '#e5e7eb';
        for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) ctx.fillRect(lx - 50 + c * 21, -360 + r * 16, 16, 11);
        this.cineGlow(ctx, lx, -340, 260, 'rgba(255,255,255,0.75)', 0.9);
        this.cineShafts(ctx, lx, -340, i ? Math.PI * 0.68 : Math.PI * 0.32, 900, 0.35, 4, '226,232,240', 0.09, t);
      });
      ctx.fillStyle = '#1a0a10';
      ctx.fillRect(-40, top + 60, W + 80, 260);
      for (let i = 0; i < 9; i++) {
        const y0 = gy + 40 * ((i / 9) ** 1.3) * 9;
        const y1 = gy + 40 * (((i + 1) / 9) ** 1.3) * 9;
        ctx.fillStyle = i % 2 ? '#15803d' : '#166534';
        ctx.fillRect(-40, y0, W + 80, y1 - y0 + 1);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(W / 2, gy + 120, 200, 46, 0, 0, Math.PI * 2);
      ctx.moveTo(W / 2, gy);
      ctx.lineTo(W / 2, gy + 400);
      ctx.stroke();
      };
      this.espStatic(ctx, `clasico0|${W}|${top}`, -40, -440, W + 80, H + 540, (g) => stadium(g, 0));
      // Torcida (pulando) e sinalizadores
      this.espStands(ctx, W, top + 110, t, 0.35);
      [[0.22, 0], [0.58, 2], [0.8, 4]].forEach(([fx, s]) => {
        const pulse = 0.6 + 0.25 * Math.sin(t * 0.07 + s);
        this.cineGlow(ctx, W * fx, top + 200, 120, 'rgba(248,113,113,0.8)', pulse);
        ctx.fillStyle = 'rgba(148,163,184,0.12)';
        ctx.beginPath();
        ctx.ellipse(W * fx + Math.sin(t * 0.02 + s) * 20, top + 150 - (t * 0.2) % 40, 80, 36, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // Bunny e Sae no círculo central, frente a frente
      this.drawSprite(ctx, cast.bunny, W / 2 - 60, gy + 130, 110, { animState: 'idle' });
      this.drawSprite(ctx, cast.sae, W / 2 + 60, gy + 130, 110, { animState: 'idle', flipX: true });
      ctx.restore();
      // Primeiro plano: a fileira da frente e você de costas, no meio da torcida
      const fg = this.cineSeg(t, 50, 130);
      if (fg > 0) {
        const off = (1 - this.cineEase(fg)) * 220;
        ctx.save();
        ctx.translate(0, off);
        ctx.globalAlpha = 1;
        // Torcedores de costas em silhueta (alguns com o braço pra cima)
        [['kunigami', 0.02, 1], ['barou', 0.42, 0], ['chigiri', 0.6, 1], ['gagamaru', 0.79, 0], ['nagi', 0.97, 1]].forEach(([id, fx, arm], i) => {
          const jump = arm ? Math.abs(Math.sin(t * 0.12 + i)) * 10 : 0;
          const fan = this.cineChar(id);
          const fy = bot + 310 + (i % 2) * 30;
          this.espFig(ctx, 'fan', fan, W * fx, fy, 440, (g) => this.drawSilhouette(g, fan, W * fx, fy, 440, { facing: 'back', animState: arm ? 'call_pass' : 'idle', frame: 1 }, '#030409'), 0, -jump);
        });
        this.espFig(ctx, 'claYou', cast.traveler, W * 0.21, bot + 300, 520, (g) => this.espBacklit(g, cast.traveler, W * 0.21, bot + 300, 520, { facing: 'back' }, 0.7, '4,6,18', null, '#f87171'));
        ctx.restore();
      }
      if (t > 40) this.espScoreboard(ctx, 24, top + 14, 0, 0, "00'");
      const tk = this.cineSeg(t, 64, 96);
      this.cineTitleCard(ctx, W, top + 180, tk, { kicker: 'BARCELONA • 21:00', title: 'EL CLÁSICO', sub: 'FC BARCHA x RE AL', color: '#facc15' });
    },

    // Plano 2: campo e contracampo — o Bunny provoca / o Sae responde
    espCla1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.spainCast();
      if (t < 100) {
        const k = this.cineEaseInOut(t / 100);
        this.cineGradient(ctx, 0, top, W, 260, [[0, '#0b0712'], [1, '#2a0b18']]);
        this.cineBokeh(ctx, W, top + 20, top + 230, t, 22, ['rgba(251,113,133,0.4)', 'rgba(253,230,138,0.35)'], 6);
        this.cineGradient(ctx, 0, top + 250, W, bot - top - 250, [[0, '#14532d'], [1, '#052e16']]);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W * 0.45, y: H / 2, zoom: 1 + k * 0.08 });
        this.drawRadialSpeedLines(ctx, W * 0.36, top + 200, W, '#f43f5e', 0.12);
        const bob = Math.sin(t * 0.12) * 4;
        this.espAuraFig(ctx, 'bunnyTalk', cast.bunny, W * 0.36, bot + 30, 440, { animState: 'call_pass', auraColor: '#f43f5e' }, bob);
        ctx.restore();
        // O ombro do Sae no primeiro plano (de costas)
        this.espFig(ctx, 'saeBack', cast.sae, W * 0.83, bot + 420, 780, (g) => {
          this.drawSilhouette(g, cast.sae, W * 0.83 - 6, bot + 418, 780, { facing: 'back', frame: 1 }, '#2dd4bf');
          this.drawSpriteDim(g, cast.sae, W * 0.83, bot + 420, 780, { facing: 'back', frame: 1 }, 0.55, '10,4,20');
        });
      } else {
        const tt = t - 100;
        const k = this.cineEaseInOut(tt / 100);
        this.cineGradient(ctx, 0, top, W, bot - top, [[0, '#060814'], [1, '#0b1020']]);
        this.cineBokeh(ctx, W, top + 30, bot - 40, t, 16, ['rgba(244,63,94,0.35)', 'rgba(45,212,191,0.25)'], 8);
        ctx.save();
        ctx.globalAlpha = 0.55;
        this.drawSilhouette(ctx, cast.bunny, W * 0.16, bot - 20, 280, { animState: 'call_pass', frame: 1 }, '#9f1239');
        ctx.restore();
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W * 0.6, y: H / 2, zoom: 1 + k * 0.06 });
        const size = 780;
        const u = size / 36;
        const eyeY = top + 260;
        const feet = eyeY - SPRITE_MAPY(10.1) * u + size * 0.87;
        this.espFig(ctx, 'saeClose', cast.sae, W * 0.6, feet, size, (g) => {
          this.cineRim(g, cast.sae, W * 0.6, feet, size, { frame: 1 }, '#2dd4bf', -1);
          this.drawFaceShadow(g, cast.sae, W * 0.6, feet, size, { animState: 'idle', frame: 1 }, 0.42);
        });
        ctx.restore();
        const sh = ctx.createLinearGradient(W * 0.7, 0, W, 0);
        sh.addColorStop(0, 'rgba(2,6,23,0)');
        sh.addColorStop(1, 'rgba(2,6,23,0.85)');
        ctx.fillStyle = sh;
        ctx.fillRect(W * 0.7, top, W * 0.3, bot - top);
      }
    },

    // Plano 3: o show — calcanhar por cima do marcador (quadro de impacto) e o passe sem olhar
    espCla2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.spainCast();
      const pink = '#f43f5e';
      if (t < 108) {
        const impact = t >= 60 && t < 70;
        const bx = this.espLerp(W * 0.36, W * 0.5, this.cineEaseInOut(this.cineSeg(t, 64, 106)));
        const feet = bot - 26;
        const lunaX = t < 56 ? this.espLerp(W + 120, W * 0.58, this.cineEase(t / 56)) : t < 72 ? W * 0.58 : W * 0.58 - (t - 72) * 16;
        const lunaAnim = t < 50 ? 'run' : 'slide';
        // Lambreta: a bola sobe pelo calcanhar, passa por trás das costas e cai na frente
        const a = this.cineSeg(t, 64, 100);
        const ball = t < 60 ? { x: bx + 46, y: feet - 16 } : { x: this.espLerp(bx - 40, bx + 230, a), y: feet - 24 - Math.sin(a * Math.PI) * 330 };
        const ballBehind = t >= 60 && a < 0.45;
        const bunnyAnim = t >= 56 && t < 76 ? 'rabona' : 'run';
        if (impact) {
          // Quadro de impacto: tudo chapado em rosa, os dois em preto, a bola branca
          ctx.fillStyle = pink;
          ctx.fillRect(0, top, W, bot - top);
          this.drawRadialSpeedLines(ctx, ball.x, ball.y, W, '#020617', 0.55);
          // O caminho que a bola vai fazer: do calcanhar, por trás da cabeça, até a frente
          ctx.save();
          ctx.setLineDash([18, 12]);
          ctx.strokeStyle = '#fdf2f8';
          ctx.lineWidth = 6;
          ctx.beginPath();
          for (let i = 0; i <= 30; i++) {
            const s = i / 30;
            const px = this.espLerp(bx - 40, bx + 230, s);
            const py = feet - 24 - Math.sin(s * Math.PI) * 330;
            if (i) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          }
          ctx.stroke();
          ctx.restore();
          this.drawSilhouette(ctx, cast.bunny, bx, feet, 380, { animState: 'rabona', frame: 1 }, '#020617');
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, 20, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          this.cineCamera(ctx, W, H, { shake: t > 78 && t < 92 ? 6 : 2 });
          // A arquibancada passando rápido (câmera acompanhando)
          this.cineGradient(ctx, -20, top - 20, W + 40, 260, [[0, '#0b0712'], [1, '#1f0a14']]);
          this.espStands(ctx, W, top + 40, t, 0.4, (t * 9) % 128);
          this.cineGradient(ctx, -20, top + 230, W + 40, bot - top - 200, [[0, '#166534'], [1, '#14532d']]);
          ctx.fillStyle = 'rgba(21,128,61,0.8)';
          for (let x = -((t * 22) % 200); x < W + 40; x += 200) ctx.fillRect(x, top + 230, 100, bot - top);
          this.drawSpeedLines(ctx, W, H, '#fda4af', 0.22);
          if (ballBehind) this.drawAnimeBall(ctx, ball.x, ball.y, 15, 'rgba(244,63,94,0.6)', t);
          this.drawSprite(ctx, cast.bunny, bx, feet, 340, { animState: bunnyAnim, showAura: t > 50, auraColor: pink });
          this.drawSprite(ctx, cast.luna, lunaX, feet + 24, 300, { animState: lunaAnim, flipX: true });
          if (!ballBehind) this.drawAnimeBall(ctx, ball.x, ball.y, 15, 'rgba(244,63,94,0.6)', t);
          ctx.restore();
        }
        const ck = this.cineSeg(t, 60, 70);
        if (ck > 0 && t < 104) this.cineImpactText(ctx, 'CALCANHAR!!', W * 0.7, top + 90, 70, '#fdf2f8', ck, 0, -0.08);
      } else {
        // Painéis: o Bunny olhando para a câmera / a bola indo para o outro lado
        const tt = t - 108;
        ctx.fillStyle = '#0b0207';
        ctx.fillRect(0, top, W, bot - top);
        const inL = this.cineEase(tt / 12);
        const inR = this.cineEase((tt - 6) / 12);
        this.espPanel(ctx, [[20, top + 14], [W * 0.52, top + 14], [W * 0.44, bot - 14], [20, bot - 14]], () => {
          this.cineGradient(ctx, 0, top, W * 0.55, bot - top, [[0, '#4c0519'], [1, '#1f0410']]);
          this.drawRadialSpeedLines(ctx, W * 0.25, top + 230, W, pink, 0.3);
          const size = 720;
          const u = size / 36;
          const eyeY = top + 250;
          const feet = eyeY - SPRITE_MAPY(10.1) * u + size * 0.87;
          this.espFig(ctx, 'bunnyClose', cast.bunny, W * 0.25, feet, size, (g) => this.cineRim(g, cast.bunny, W * 0.25, feet, size, { frame: 1 }, pink, 1));
        }, { dx: -(1 - inL) * 600 });
        this.espPanel(ctx, [[W * 0.545, top + 14], [W - 20, top + 14], [W - 20, bot - 14], [W * 0.465, bot - 14]], () => {
          this.cineGradient(ctx, W * 0.45, top, W * 0.55, bot - top, [[0, '#14532d'], [1, '#052e16']]);
          this.drawSpeedLines(ctx, W, H, '#bbf7d0', 0.18);
          const a = this.cineEaseInOut(this.cineSeg(tt, 6, 44));
          const lx = this.espLerp(W + 100, W * 0.84, this.cineEase(this.cineSeg(tt, 0, 40)));
          this.drawSprite(ctx, cast.lavinho, lx, bot - 20, 300, { animState: 'run', flipX: true });
          const bx = this.espLerp(W * 0.5, W * 0.8, a);
          const by = this.espLerp(bot - 60, bot - 40, a) - Math.sin(a * Math.PI) * 40;
          ctx.strokeStyle = 'rgba(250,204,21,0.7)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(W * 0.48, bot - 60);
          ctx.quadraticCurveTo((W * 0.48 + bx) / 2, by - 40, bx, by);
          ctx.stroke();
          this.drawAnimeBall(ctx, bx, by, 16, 'rgba(250,204,21,0.6)', t);
        }, { dx: (1 - inR) * 700 });
        const pk = this.cineSeg(tt, 20, 32);
        this.cineImpactText(ctx, 'PASSE SEM OLHAR!', W * 0.74, top + 70, 44, '#facc15', pk, W * 0.46, -0.05);
      }
      this.cineSfx(S, 60, 'heel', () => window.SFX?.kick?.(0.6));
      this.cineSfx(S, 114, 'pass', () => window.SFX?.pass?.());
    },

    // Plano 4: a rede estufa — gol do Barcha — e o Bunny apontando para o Sae
    espCla3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.spainCast();
      const pink = '#f43f5e';
      const hit = 26;
      if (t < 84) {
        const isHit = t >= hit;
        ctx.save();
        this.cineCamera(ctx, W, H, { shake: isHit ? 12 * Math.max(0, 1 - (t - hit) / 30) : 0 });
        this.cineGradient(ctx, -20, top - 20, W + 40, 300, [[0, '#0b0712'], [1, '#2a0b18']]);
        this.espStands(ctx, W, top + 40, t, isHit ? 1 : 0.2);
        this.cineGradient(ctx, -20, top + 260, W + 40, bot - top, [[0, '#166534'], [1, '#052e16']]);
        const gx0 = W * 0.18;
        const gx1 = W * 0.82;
        const gy0 = top + 70;
        const gy1 = bot - 40;
        ctx.fillStyle = 'rgba(2,6,23,0.35)';
        ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
        const hitX = W * 0.3;
        const hitY = top + 140;
        const stretch = isHit ? Math.min(60, (t - hit) * 5) * Math.max(0.35, 1 - (t - hit) / 120) : 0;
        this.drawStretchNet(ctx, gx0, gy0, gx1, gy1, hitX, hitY, stretch);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(gx0 - 12, gy0 - 12, 12, gy1 - gy0 + 12);
        ctx.fillRect(gx1, gy0 - 12, 12, gy1 - gy0 + 12);
        ctx.fillRect(gx0 - 12, gy0 - 12, gx1 - gx0 + 24, 12);
        // Goleiro do Re Al em silhueta, voando para o lado errado
        this.drawSilhouette(ctx, cast.luna, W * 0.62, gy1 + 10, 260, { animState: 'dive', flipX: true, frame: 1 }, '#111827');
        const bk = Math.min(1, t / hit);
        const ballX = isHit ? hitX : this.espLerp(W * 0.52, hitX, bk);
        const ballY = isHit ? hitY + stretch * 0.15 : this.espLerp(bot + 120, hitY, bk);
        this.drawAnimeBall(ctx, ballX, ballY, isHit ? 22 : this.espLerp(70, 26, bk), 'rgba(250,204,21,0.6)', t * 2);
        ctx.restore();
        this.cineFlash(ctx, W, H, isHit ? 0.75 * this.espPulse(t, hit, 9) : 0);
        const gk = this.cineSeg(t, hit + 2, hit + 14);
        this.cineImpactText(ctx, 'GOOOOL DO BARCHA!', W / 2, top + 100, 84, '#facc15', gk, W * 0.9, -0.04);
        this.espScoreboard(ctx, 24, top + 14, t > hit + 20 ? 1 : 0, 0, "67'");
      } else {
        const tt = t - 84;
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.02 + this.cineEaseInOut(tt / 106) * 0.06, shake: 3 });
        this.cineGradient(ctx, -40, top - 40, W + 80, 320, [[0, '#0b0712'], [1, '#3b0a1c']]);
        this.espStands(ctx, W + 40, top + 30, t, 1);
        this.cineGradient(ctx, -40, top + 250, W + 80, 400, [[0, '#166534'], [1, '#052e16']]);
        this.drawRadialSpeedLines(ctx, W * 0.62, top + 200, W, pink, 0.22);
        // O Sae parado ao fundo, sem comemorar
        this.espFig(ctx, 'saeFar', cast.sae, W * 0.16, bot - 30, 250, (g) => this.drawSpriteDim(g, cast.sae, W * 0.16, bot - 30, 250, { frame: 1 }, 0.45, '4,6,20'));
        const rise = this.cineEase(tt / 22);
        this.espAuraFig(ctx, 'bunnyGoal', cast.bunny, W * 0.64, bot + 140, 540, { animState: 'call_pass', flipX: true, auraColor: pink }, (1 - rise) * 120);
        ctx.restore();
        this.drawConfetti(ctx, W, H, t, 50);
        this.espScoreboard(ctx, 24, top + 14, 1, 0, "67'");
        this.cineImpactText(ctx, 'EU SOU O SHOW.', W * 0.3, top + 110, 44, '#fda4af', this.cineSeg(tt, 30, 42), W * 0.45, -0.06);
      }
      this.cineSfx(S, hit, 'goal', () => window.SFX?.goal?.(true));
    },

    // Plano 5: o olho do Sae em close, frio; a pálpebra desce
    espCla4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const sae = this.spainCast().sae;
      ctx.fillStyle = '#05060d';
      ctx.fillRect(0, top, W, bot - top);
      this.cineBokeh(ctx, W, top + 20, bot - 20, t, 12, ['rgba(244,63,94,0.35)', 'rgba(250,204,21,0.25)'], 21);
      const eyeY = (top + bot) / 2;
      const lid = 0.12 + this.cineEaseInOut(this.cineSeg(t, 24, 74)) * 0.3;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: eyeY + 20, zoom: 1 + this.cineEaseInOut(t / 130) * 0.08 });
      this.espFaceCU(ctx, sae, W / 2, eyeY, 860, 2.6, { lid, glint: '#fb7185' });
      ctx.restore();
      // Luz rosa do estádio vindo da esquerda, sombra fria na direita
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(244,63,94,0.28)');
      g.addColorStop(0.45, 'rgba(244,63,94,0)');
      g.addColorStop(1, 'rgba(2,6,23,0.75)');
      ctx.fillStyle = g;
      ctx.fillRect(0, top, W, bot - top);
      this.cineFlash(ctx, W, H, this.cineSeg(t, 110, 130), '#000000');
    },

    // ============================================================ CAPTAIN SPEECH
    espSquad() {
      const k = this.KITS.japan;
      return {
        you: this.cineYou(k),
        rin: this.cineChar('rin', k),
        shidou: this.cineChar('shidou', k),
        bachira: this.cineChar('bachira', k),
        nagi: this.cineChar('nagi', k),
        chigiri: this.cineChar('chigiri', k),
        gagamaru: this.cineChar('gagamaru', k)
      };
    },

    // Plano 1: o silêncio — a câmera corre o banco, cabeças baixas, a torcida batendo na parede
    espCap0(ctx, S) {
      const { W, H, t, p, top, bot } = S;
      const q = this.espSquad();
      const beats = [40, 90, 140];
      let thump = 0;
      beats.forEach((b) => (thump = Math.max(thump, this.espPulse(t, b, 16))));
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      const cx = this.espLerp(W * 0.5, W * 1.02, this.cineEaseInOut(p));
      this.cineCamera(ctx, W, H, { x: cx, y: H / 2, zoom: 1.06, shake: thump * 5 });
      this.espLockersStatic(ctx, -100, Math.round(W * 1.6), top - 10, bot - 120, 0, 'rgba(3,10,30,0.45)');
      // "TUM" atrás da parede
      beats.forEach((b, i) => {
        const a = this.espPulse(t, b, 40);
        if (a > 0) {
          ctx.save();
          ctx.globalAlpha = a * 0.55;
          this.espText(ctx, 'TUM...', W * (0.35 + i * 0.3), top + 70 + i * 26, 46, '#64748b', 'center', 'italic 900', null);
          ctx.restore();
        }
      });
      const lampX = W * 1.22;
      this.espLamp(ctx, lampX, top + 6, 520, 300, Math.sin(t * 0.03) * 0.03 + thump * 0.03, 0.22);
      const seat = [
        [q.nagi, W * 0.08],
        [q.bachira, W * 0.3],
        [q.shidou, W * 0.52],
        [q.rin, W * 0.8],
        [q.you, W * 1.22]
      ];
      seat.forEach(([c, x]) => {
        const tap = c === q.shidou ? Math.abs(Math.sin(t * 0.35)) * 3 : 0;
        const feet = bot + 70;
        const lit = c === q.you;
        this.espFig(ctx, 'seat', c, x, feet, 340, (g) => {
          this.drawSpriteDim(g, c, x, feet, 340, { frame: 1 }, lit ? 0.12 : 0.55, '10,25,60');
          this.drawFaceShadow(g, c, x, feet, 340, { animState: 'idle', frame: 1 }, lit ? 0.6 : 0.72);
        }, 0, -tap);
      });
      // Banco na frente (escondendo as pernas: eles estão sentados)
      ctx.fillStyle = '#3f2a17';
      ctx.fillRect(-100, bot - 34, W * 1.8, 16);
      ctx.fillStyle = '#1c1209';
      ctx.fillRect(-100, bot - 18, W * 1.8, 200);
      ctx.restore();
      this.cineDust(ctx, W, H, t, 26 + Math.round(thump * 30), 'rgba(191,219,254,0.5)', 11);
    },

    // Plano 2: você se levanta para dentro da luz
    espCap1(ctx, S) {
      const { W, H, t, p, top, bot } = S;
      const q = this.espSquad();
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, H);
      const rise = this.cineEaseInOut(this.cineSeg(t, 18, 66));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2 + 20 - rise * 40, zoom: 1 + this.cineEaseInOut(p) * 0.08 });
      this.espLockersStatic(ctx, -100, W + 100, top - 30, bot - 110, 0, 'rgba(3,10,30,0.55)');
      this.espLamp(ctx, W / 2, top - 30, 600, 330, 0, 0.3);
      const feet = this.espLerp(bot + 300, bot + 50, rise);
      const size = 520;
      const f0 = bot + 50;
      this.espFig(ctx, 'stand', q.you, W / 2, f0, size, (g) => {
        this.drawSilhouette(g, q.you, W / 2 - 5, f0, size, { frame: 1 }, '#22d3ee');
        this.drawSilhouette(g, q.you, W / 2 + 5, f0, size, { frame: 1 }, '#22d3ee');
        this.drawSprite(g, q.you, W / 2, f0, size, { frame: 1 });
      }, 0, feet - f0);
      this.drawFaceShadow(ctx, q.you, W / 2, feet, size, { animState: 'idle', frame: 1 }, 0.95 * (1 - rise) + 0.08);
      ctx.restore();
      // Os dois do primeiro plano olhando pra cima (silhuetas de costas)
      this.espFig(ctx, 'fgRin', q.rin, W * 0.1, bot + 470, 640, (g) => this.drawSilhouette(g, q.rin, W * 0.1, bot + 470, 640, { facing: 'back', frame: 1 }, '#02040a'));
      this.espFig(ctx, 'fgBachira', q.bachira, W * 0.92, bot + 480, 640, (g) => this.drawSilhouette(g, q.bachira, W * 0.92, bot + 480, 640, { facing: 'back', frame: 1 }, '#02040a'));
      this.cineDust(ctx, W, H, t, 30, 'rgba(191,219,254,0.55)', 12);
    },

    // Plano 3: o discurso — câmera baixa, frases entrando com soco de câmera
    espCap2(ctx, S) {
      const { W, H, t, p, top, bot } = S;
      const q = this.espSquad();
      const hits = [124, 172];
      let punch = 0;
      hits.forEach((h) => (punch += this.espPulse(t, h, 12)));
      this.espStatic(ctx, `speechBg|${W}|${top}`, 0, 0, W, H, (g) => {
        g.fillStyle = '#020617';
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 0.35;
        this.espLockers(g, -100, W + 100, top - 30, bot - 80, 0);
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(2,6,23,0.55)';
        g.fillRect(0, top, W, bot - top);
      });
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1 + this.cineEaseInOut(p) * 0.06 + punch * 0.05, shake: punch * 9 });
      this.drawRadialSpeedLines(ctx, W * 0.27, top + 150, W, '#00f5d4', 0.08 + this.cineSeg(t, 100, 200) * 0.25);
      const aura = t >= 168;
      if (aura) this.espAuraFig(ctx, 'speechAura', q.you, W * 0.27, bot + 210, 620, { animState: 'call_pass', auraColor: '#00f5d4' }, 0, '#22d3ee');
      else this.espFig(ctx, 'speech', q.you, W * 0.27, bot + 210, 620, (g) => this.cineRim(g, q.you, W * 0.27, bot + 210, 620, { animState: 'call_pass', frame: 1 }, '#22d3ee', 1));
      ctx.restore();
      // Frases (fora da câmera: ficam firmes e legíveis)
      const tx = W * 0.69;
      const l1 = 'O mundo acha que o Japão veio só participar.';
      const l2 = 'Que a gente é o time que "corre bastante".';
      const w1 = this.cineType(l1, this.cineSeg(t, 8, 48));
      const w2 = this.cineType(l2, this.cineSeg(t, 60, 100));
      if (w1) this.espText(ctx, w1, tx, top + 70, 24, '#cbd5e1', 'center', 'italic 800');
      if (w2) this.espText(ctx, w2, tx, top + 112, 24, '#cbd5e1', 'center', 'italic 800');
      this.cineImpactText(ctx, 'EU NÃO VIM PARTICIPAR.', tx, top + 230, 58, '#f8fafc', this.cineSeg(t, 124, 134), W * 0.56, -0.03);
      this.cineImpactText(ctx, 'EU VIM DEVORAR', tx, top + 340, 72, '#00f5d4', this.cineSeg(t, 172, 182), W * 0.56, -0.03);
      this.cineImpactText(ctx, 'O MUNDO.', tx, top + 430, 92, '#00f5d4', this.cineSeg(t, 180, 190), W * 0.56, -0.03);
      this.cineFlash(ctx, W, H, 0.45 * this.espPulse(t, 172, 10), '#ccfbf1');
      this.cineSfx(S, 124, 'line3', () => window.SFX?.kick?.(0.5));
      this.cineSfx(S, 172, 'line4', () => window.SFX?.kick?.(1));
    },

    // Plano 4: os olhos do time se abrindo, um por painel
    espCap3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const q = this.espSquad();
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, top, W, bot - top);
      const list = [
        [q.rin, 'RIN', 1],
        [q.shidou, 'SHIDOU', 1],
        [q.bachira, 'BACHIRA', -1],
        [q.nagi, 'NAGI', -1]
      ];
      const pw = (W - 40) / 4;
      list.forEach(([c, name, look], i) => {
        const at = i * 10;
        const k = this.cineEase(this.cineSeg(t, at, at + 12));
        if (k <= 0) return;
        const x0 = 20 + i * pw;
        const sl = 34;
        const pts = [[x0 + sl, top + 14], [x0 + pw - 6 + sl, top + 14], [x0 + pw - 6 - sl, bot - 14], [x0 - sl, bot - 14]];
        const cx = x0 + pw / 2;
        const cy = (top + bot) / 2 - 10;
        this.espPanel(ctx, pts, () => {
          ctx.fillStyle = c.auraColor || '#0ea5e9';
          ctx.fillRect(x0 - 60, top, pw + 120, bot - top);
          const lid = 1 - this.cineEase(this.cineSeg(t, at + 16, at + 24));
          this.espFaceCU(ctx, c, cx, cy, 760, 1.3, { lid, glint: '#ffffff' });
          ctx.fillStyle = 'rgba(2,6,23,0.85)';
          ctx.fillRect(x0 - 40, bot - 70, pw + 80, 40);
          this.espText(ctx, name, cx, bot - 50, 22, c.auraColor || '#f8fafc', 'center', 'italic 900', null);
        }, { dy: -(1 - k) * 600 });
      });
      this.cineSfx(S, 20, 'eyes', () => window.SFX?.whoosh?.());
    },

    // Plano 5: VAMOS!!! — todo mundo de pé, auras acesas, a onda de choque
    espCap4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const q = this.espSquad();
      const at = 14;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.04, shake: 2 + 10 * Math.max(0, 1 - (t - at) / 50) * (t >= at ? 1 : 0) });
      this.espLockersStatic(ctx, -100, W + 100, top - 30, bot - 110, 0.55, 'rgba(2,6,23,0.35)');
      this.drawRadialSpeedLines(ctx, W / 2, top + 260, W, '#facc15', 0.28);
      for (let r = 0; r < 3; r++) {
        const rr = (t * 10 + r * 160) % 640;
        ctx.strokeStyle = `rgba(0,245,212,${Math.max(0, 1 - rr / 640) * 0.8})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(W / 2, top + 300, rr, rr * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const row = [
        [q.bachira, W * 0.12, false],
        [q.rin, W * 0.31, false],
        [q.shidou, W * 0.69, true],
        [q.nagi, W * 0.88, true]
      ];
      row.forEach(([c, x, flip], i) => {
        const up = this.cineEase(this.cineSeg(t, i * 4, i * 4 + 20));
        const jump = Math.abs(Math.sin(t * 0.16 + i)) * 24 * up;
        this.espAuraFig(ctx, 'vamos', c, x, bot + 60, 380, { animState: 'call_pass', flipX: flip, auraColor: c.auraColor }, -up * 30 - jump);
      });
      const jumpY = Math.abs(Math.sin(t * 0.14)) * 20;
      this.espAuraFig(ctx, 'vamos', q.you, W / 2, bot + 130, 500, { animState: 'call_pass', auraColor: '#00f5d4' }, -jumpY);
      ctx.restore();
      this.cineImpactText(ctx, 'VAMOS!!!', W / 2, top + 110, 140, '#facc15', this.cineSeg(t, at, at + 12), W * 0.9, -0.03);
      this.cineFlash(ctx, W, H, 0.55 * this.espPulse(t, at, 10));
      this.cineSfx(S, at, 'roar', () => window.SFX?.goal?.(false));
    },

    // ========================================================== LOKI & HUGO
    espFrance() {
      const fr = { jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff' };
      return {
        loki: this.cineChar('loki', fr),
        hugo: this.cineChar('hugo', fr),
        kidLoki: this.cineChar('loki', { hairStyle: 'loki_kid', jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff' }),
        kidHugo: this.cineChar('hugo', { jerseyPrimary: '#f8fafc', jerseySecondary: '#1e3a8a' })
      };
    },
    espSunsetSky(ctx, S, sunX, sunY, big = 1) {
      const { W, top, bot } = S;
      this.cineGradient(ctx, -60, top - 10, W + 120, bot - top + 20, [[0, '#6b2a12'], [0.5, '#e8892c'], [1, '#fcd9a0']]);
      this.cineGlow(ctx, sunX, sunY, 300 * big, 'rgba(255,240,200,0.95)', 1);
      ctx.fillStyle = '#fff4dc';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 40 * big, 0, Math.PI * 2);
      ctx.fill();
    },

    // Plano 1: na final, o close do Loki → a câmera entra no olho dele → a lembrança se abre
    espLoki0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const f = this.espFrance();
      const size = 760;
      const u = size / 36;
      const cx = W * 0.5;
      const eyeY = top + 250;
      const ex = cx - 3.3 * u;
      const z = 1 + Math.pow(this.cineSeg(t, 0, 44), 2) * 2.6;
      this.cineGradient(ctx, 0, top, W, bot - top, [[0, '#020617'], [1, '#0b1736']]);
      this.cineBokeh(ctx, W, top + 20, bot - 20, t, 14, ['rgba(147,197,253,0.4)', 'rgba(255,255,255,0.3)'], 13);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: this.espLerp(cx, ex, this.cineSeg(t, 0, 30)), y: eyeY, zoom: z });
      const feet = eyeY - SPRITE_MAPY(10.1) * u + size * 0.87;
      this.espFig(ctx, 'lokiCU', f.loki, cx, feet, size, (g) => this.drawSprite(g, f.loki, cx, feet, size, { frame: 1 }));
      // Gotas de suor
      ctx.fillStyle = '#bae6fd';
      [[-6.6, 6], [5.2, 9]].forEach(([dx, dy], i) => ctx.fillRect(cx + dx * u, eyeY - SPRITE_MAPY(10.1) * u + SPRITE_MAPY(dy + ((t * 0.08 + i * 3) % 4)) * u, u * 0.6, u * 1.1));
      ctx.restore();
      ctx.fillStyle = 'rgba(2,6,23,0.3)';
      ctx.fillRect(0, top, W, bot - top);
      // Abertura em íris: dentro do círculo, Paris ao pôr do sol
      const r = this.cineEaseInOut(this.cineSeg(t, 34, 70)) * 820;
      if (r > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, (top + bot) / 2, r, 0, Math.PI * 2);
        ctx.clip();
        this.espStatic(ctx, `paris0|${W}`, 0, top, W, bot - top, (g) => {
          this.espSunsetSky(g, S, W * 0.68, top + 300);
          this.espParisRoofs(g, W, bot - 120, '#5a3418');
          this.espEiffel(g, W * 0.8, bot - 120, 330, '#3b2412');
        });
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,237,213,0.85)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(W / 2, (top + bot) / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      this.cineSfx(S, 34, 'memory', () => window.SFX?.whoosh?.());
    },

    // Plano 2: Paris, anos atrás — os dois meninos trocando passes no fim da tarde
    espLoki1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const f = this.espFrance();
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 + t * 0.4, y: H / 2, zoom: 1.04 + t * 0.0003 });
      this.espStatic(ctx, `paris1|${W}`, -40, top - 20, W + 160, bot - top + 40, (g) => {
        this.espSunsetSky(g, { W: W + 160, top: top - 20, bot: bot + 20 }, W * 0.72, top + 250);
        this.espParisRoofs(g, W + 200, bot - 130, '#6b3d1c', 0);
        this.espEiffel(g, W * 0.82, bot - 128, 340, '#4a2a12');
        this.cineGradient(g, -40, bot - 132, W + 160, 200, [[0, '#c08a4a'], [1, '#8a5a2c']]);
      });
      const feet = bot - 34;
      const lx = W * 0.3;
      const hx = W * 0.68;
      // Sombras compridas no chão (o sol baixo à direita)
      ctx.fillStyle = 'rgba(70,35,10,0.35)';
      [lx, hx].forEach((x) => {
        ctx.beginPath();
        ctx.ellipse(x - 110, feet + 4, 130, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      const cyc = t % 84;
      const toHugo = cyc < 42;
      const a = (cyc % 42) / 42;
      const kickL = toHugo && a < 0.2;
      const kickH = !toHugo && a < 0.2;
      this.drawSprite(ctx, f.kidLoki, lx, feet, 230, { animState: kickL ? 'shoot' : 'idle' });
      this.drawSprite(ctx, f.kidHugo, hx, feet, 230, { animState: kickH ? 'shoot' : 'idle', flipX: true });
      const from = toHugo ? lx + 40 : hx - 40;
      const to = toHugo ? hx - 40 : lx + 40;
      this.drawAnimeBall(ctx, this.espLerp(from, to, a), feet - 16 - Math.sin(a * Math.PI) * 70, 12, 'rgba(255,237,213,0.4)', t);
      ctx.restore();
      this.espMemory(ctx, S, 1);
      ctx.save();
      ctx.globalAlpha = this.cineSeg(t, 10, 34);
      this.espText(ctx, 'Paris, anos atrás.', 70, top + 64, 30, '#fff7ed', 'left', 'italic 700', 'rgba(60,30,10,0.8)');
      ctx.restore();
    },

    // Plano 3: a promessa — de costas no muro olhando o sol → os punhos se encontram
    espLoki2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const f = this.espFrance();
      if (t < 92) {
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.02 + this.cineEaseInOut(t / 92) * 0.08 });
        this.espStatic(ctx, `paris2|${W}`, 0, top, W, bot - top, (g) => {
          this.espSunsetSky(g, S, W / 2, top + 290, 1.6);
          this.espParisRoofs(g, W, bot - 150, '#6b3d1c', 300);
          this.espEiffel(g, W * 0.86, bot - 148, 260, '#4a2a12');
          // O muro de pedra
          g.fillStyle = '#7c4a24';
          g.fillRect(-40, bot - 150, W + 80, 200);
          g.fillStyle = '#5c3618';
          for (let r = 0; r < 4; r++) for (let x = -40 + (r % 2) * 40; x < W + 40; x += 80) g.fillRect(x, bot - 150 + r * 40, 3, 40);
          for (let r = 0; r < 4; r++) g.fillRect(-40, bot - 150 + r * 40, W + 80, 3);
        });
        const feet = bot + 20;
        this.espFig(ctx, 'wallL', f.kidLoki, W * 0.43, feet, 300, (g) => this.espBacklit(g, f.kidLoki, W * 0.43, feet, 300, { facing: 'back' }, 0.5, '70,30,8', null, '#fde68a'));
        this.espFig(ctx, 'wallH', f.kidHugo, W * 0.57, feet, 300, (g) => this.espBacklit(g, f.kidHugo, W * 0.57, feet, 300, { facing: 'back' }, 0.5, '70,30,8', '#fde68a', null));
        ctx.restore();
      } else {
        const tt = t - 92;
        this.espStatic(ctx, `paris3|${W}`, 0, top, W, bot - top, (g) => this.espSunsetSky(g, S, W / 2, (top + bot) / 2, 2.2));
        const meet = this.cineEase(this.cineSeg(tt, 6, 24));
        const cy = (top + bot) / 2 + 30;
        // Os punhos em blocos (o do Loki com a manga azul, o do Hugo com a manga branca)
        const fist = (dir, skin, sleeve) => {
          const x = W / 2 - dir * this.espLerp(600, 3, meet);
          ctx.save();
          ctx.translate(x, cy);
          ctx.scale(dir, 1);
          ctx.fillStyle = sleeve;
          ctx.fillRect(-520, -54, 400, 108);
          ctx.fillStyle = PR().shade(sleeve, -0.25);
          ctx.fillRect(-520, 30, 400, 24);
          // Punho da manga com a faixa da outra cor
          ctx.fillStyle = sleeve === '#1e3a8a' ? '#f8fafc' : '#1e3a8a';
          ctx.fillRect(-150, -58, 30, 116);
          // Mão fechada: costas da mão, quatro dedos dobrados com os nós e o polegar por cima
          ctx.fillStyle = skin;
          ctx.fillRect(-120, -52, 84, 104);
          ctx.fillRect(-40, -60, 42, 120);
          ctx.fillStyle = PR().shade(skin, -0.22);
          [-30, 0, 30].forEach((fy) => ctx.fillRect(-40, fy - 2, 42, 4));
          ctx.fillRect(-120, 38, 82, 14);
          ctx.fillStyle = PR().shade(skin, 0.18);
          [-48, -18, 12, 42].forEach((fy) => ctx.fillRect(-10, fy, 10, 10));
          ctx.fillStyle = PR().shade(skin, -0.1);
          ctx.fillRect(-92, -70, 56, 26);
          ctx.restore();
        };
        fist(1, f.kidLoki.skinColor, '#1e3a8a');
        fist(-1, f.kidHugo.skinColor, '#f1f5f9');
        if (tt >= 24) {
          const b = this.cineSeg(tt, 24, 60);
          ctx.strokeStyle = `rgba(255,251,235,${1 - b})`;
          ctx.lineWidth = 5;
          for (let i = 0; i < 12; i++) {
            const an = (i / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(W / 2 + Math.cos(an) * (60 + b * 80), cy + Math.sin(an) * (60 + b * 80));
            ctx.lineTo(W / 2 + Math.cos(an) * (110 + b * 220), cy + Math.sin(an) * (110 + b * 220));
            ctx.stroke();
          }
        }
        this.cineImpactText(ctx, 'PROMESSA.', W / 2, top + 90, 74, '#fff7ed', this.cineSeg(tt, 30, 44), W * 0.7);
      }
      this.espMemory(ctx, S, 1);
      this.cineSfx(S, 116, 'fist', () => window.SFX?.kick?.(0.4));
    },

    // Plano 4: de volta à final — os dois acordam, os olhos acendem: A FRANÇA DESPERTA!
    espLoki3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const f = this.espFrance();
      this.cineGradient(ctx, 0, top, W, bot - top, [[0, '#020617'], [1, '#0b1736']]);
      ctx.fillStyle = '#0a0f1e';
      ctx.fillRect(0, top + 160, W, 160);
      this.cineBokeh(ctx, W, top + 150, top + 330, t, 24, ['rgba(147,197,253,0.45)', 'rgba(255,255,255,0.35)', 'rgba(244,114,182,0.35)'], 15);
      // Metade azul (Loki) e metade rosa (Hugo) cortadas na diagonal
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(37,99,235,0.18)';
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(W * 0.56, top);
      ctx.lineTo(W * 0.44, bot);
      ctx.lineTo(0, bot);
      ctx.fill();
      ctx.fillStyle = 'rgba(219,39,119,0.16)';
      ctx.beginPath();
      ctx.moveTo(W * 0.56, top);
      ctx.lineTo(W, top);
      ctx.lineTo(W, bot);
      ctx.lineTo(W * 0.44, bot);
      ctx.fill();
      ctx.restore();
      const rise = this.cineEase(this.cineSeg(t, 0, 50));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.02 + this.cineEaseInOut(t / 160) * 0.05, shake: t > 40 && t < 70 ? 5 : 1 });
      this.drawRadialSpeedLines(ctx, W / 2, top + 200, W, '#e0f2fe', 0.12 + rise * 0.12);
      const feet = bot + 300 - rise * 80;
      const size = 600;
      this.espAuraFig(ctx, 'awake', f.loki, W * 0.27, bot + 220, size, { auraColor: '#38bdf8' }, feet - (bot + 220));
      this.espAuraFig(ctx, 'awake', f.hugo, W * 0.73, bot + 220, size, { flipX: true, auraColor: '#ec4899' }, feet - (bot + 220));
      // Os olhos acendem
      const glow = this.cineSeg(t, 34, 50);
      if (glow > 0) {
        const L = this.espEyes(W * 0.27, feet, size);
        const R = this.espEyes(W * 0.73, feet, size);
        [L.lx, L.rx].forEach((x) => this.cineGlow(ctx, x, L.y, 46, 'rgba(56,189,248,0.95)', glow));
        [R.lx, R.rx].forEach((x) => this.cineGlow(ctx, x, R.y, 46, 'rgba(236,72,153,0.95)', glow));
      }
      ctx.restore();
      this.cineImpactText(ctx, 'A FRANÇA DESPERTA!', W / 2, top + 84, 78, '#f8fafc', this.cineSeg(t, 50, 62), W * 0.9, -0.03);
      // A volta da lembrança: um clarão quente só no começo
      this.cineFlash(ctx, W, H, 0.85 * this.espPulse(t, 0, 16), '#fff1d6');
      this.cineSfx(S, 50, 'awake', () => window.SFX?.kick?.(1));
    }
  });

  // Meio do palco (entre as tarjas)
  function stageMid(S) {
    return (S.bot - S.top) / 2;
  }

  CE.registerCine('ego_ticket', {
    phases: [170, 160, 210, 150],
    music: 'mystery',
    title: '✈ INTERLÚDIO • A PASSAGEM',
    tags: ['PLANO 1 • A SALA DOS MONITORES', 'PLANO 2 • O ENVELOPE PRETO', 'PLANO 3 • O QUE TEM DENTRO', 'PLANO 4 • RUMO À ESPANHA'],
    // O lacre com o cadeado, a passagem e o letreiro "RUMO À ESPANHA" já estão na imagem
    subs: [
      [{ from: 12, who: 'JINPACHI EGO', text: '"Vá ver com seus olhos."', color: '#00f5d4' }],
      [{ from: 30, text: 'Um envelope preto, lacrado.' }],
      [{ from: 16, who: 'JINPACHI EGO', text: '"Os monstros não esperam ninguém."', color: '#00f5d4' }],
      [{ from: 2, who: 'JINPACHI EGO', text: '"Vá. Volte com fome."', color: '#00f5d4' }]
    ],
    draw(ctx, S) {
      [this.espEgo0, this.espEgo1, this.espEgo2, this.espEgo3][S.phase].call(this, ctx, S);
    }
  });

  CE.registerCine('spain_flight', {
    phases: [170, 130, 200, 210],
    music: 'travel',
    title: '✈ INTERLÚDIO • A VIAGEM',
    tags: ['PLANO 1 • HANEDA, 06:00', 'PLANO 2 • DECOLAGEM', 'PLANO 3 • 14 HORAS', 'PLANO 4 • BARCELONA'],
    // "HANEDA, 06:00" está na tarja e "BARCELONA, ESPANHA" no letreiro do plano 4
    subs: [
      [{ from: 24, text: 'A primeira vez fora do Japão.' }],
      [],
      [{ from: 2, who: 'VOCÊ', text: '(Do outro lado do mundo, os monstros jogam.)', color: '#00f5d4' }],
      [{ from: 70, who: 'VOCÊ', text: '(Sol, calor... e futebol.)', color: '#00f5d4' }]
    ],
    draw(ctx, S) {
      [this.espFly0, this.espFly1, this.espFly2, this.espFly3][S.phase].call(this, ctx, S);
    }
  });

  CE.registerCine('clasico_bunny', {
    phases: [170, 200, 190, 190, 130],
    music: 'epic',
    title: '⚽ EL CLÁSICO • FC BARCHA x RE AL',
    tags: ['PLANO 1 • O ESTÁDIO', 'PLANO 2 • A PROVOCAÇÃO', 'PLANO 3 • O SHOW DO BUNNY', 'PLANO 4 • O ESTÁDIO EXPLODE', 'PLANO 5 • O OLHAR DO SAE'],
    // O "CALCANHAR!!", o "PASSE SEM OLHAR!", o gol e o "EU SOU O SHOW." já estão na imagem.
    // O "...Fala demais." do Sae vai para o close dele no fim (responde ao show do Bunny)
    subs: [
      [{ from: 8, text: '98 mil pessoas. E você no meio delas.' }],
      [{ from: 4, who: 'BUNNY IGLESIAS', text: '"Ei, Sae! Você é só o figurante."', color: '#fb7185' }],
      [{ from: 52, who: 'BUNNY IGLESIAS', text: '"Pra quê olhar?"', color: '#fb7185' }],
      [{ from: 18, who: 'BUNNY IGLESIAS', text: '"Viu, Sae? O campo é MEU."', color: '#fb7185' }],
      [{ from: 4, who: 'SAE ITOSHI', text: '"...Fala demais."', color: '#2dd4bf' }]
    ],
    draw(ctx, S) {
      [this.espCla0, this.espCla1, this.espCla2, this.espCla3, this.espCla4][S.phase].call(this, ctx, S);
    }
  });

  CE.registerCine('captain_speech', {
    phases: [170, 110, 230, 100, 170],
    music: 'epic',
    title: '🎙 O DISCURSO • VESTIÁRIO DO JAPÃO',
    tags: ['PLANO 1 • O SILÊNCIO', 'PLANO 2 • DE PÉ', 'PLANO 3 • O DISCURSO', 'PLANO 4 • OS OLHOS', 'PLANO 5 • VAMOS!!!'],
    // O discurso (plano 3) já está escrito na tela; o "E vocês?" passa para os olhos do time
    // se abrindo (plano 4), que mostram o "um por um" sem precisar de narração
    subs: [
      [{ from: 12, text: 'Lá fora, a torcida. Aqui, silêncio.' }],
      [{ from: 18, who: 'VOCÊ', text: '"...Escutem."', color: '#00f5d4' }],
      [],
      [{ from: 0, who: 'VOCÊ', text: '"E vocês?"', color: '#00f5d4' }],
      []
    ],
    draw(ctx, S) {
      [this.espCap0, this.espCap1, this.espCap2, this.espCap3, this.espCap4][S.phase].call(this, ctx, S);
    }
  });

  CE.registerCine('loki_hugo_promise', {
    phases: [70, 160, 170, 150],
    music: 'promise',
    grain: 0.1,
    title: '✦ FLASHBACK • A PROMESSA DE LOKI E HUGO',
    tags: ['PLANO 1 • O OLHAR DO LOKI', 'PLANO 2 • PARIS, ANOS ATRÁS', 'PLANO 3 • A PROMESSA', 'PLANO 4 • A FRANÇA DESPERTA'],
    subs: [
      [],
      [{ from: 4, who: 'HUGO (CRIANÇA)', text: '"Vamos ganhar a Copa?"', color: '#f9a8d4' }],
      [{ from: 10, who: 'LOKI (CRIANÇA)', text: '"Juntos. Eu prometo."', color: '#7dd3fc' }],
      [{ from: 0, who: 'HUGO', text: '"Eu lembro. Ainda não acabou."', color: '#f472b6' }]
    ],
    draw(ctx, S) {
      [this.espLoki0, this.espLoki1, this.espLoki2, this.espLoki3][S.phase].call(this, ctx, S);
    }
  });
})();
