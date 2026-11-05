// ============================================================================
// O GOL DA SORTE (cine_luck) — ver js/cine_kit.js
//   u20_direct_shoot • o seu gol no último lance contra a Sub-20 do Japão (cap. 5)
//   u20_final_goal   • o gol do título na final da Copa do Mundo Sub-20 x França (cap. 9)
// Os dois usam o mesmo filme (13 planos, 30 s) com a config de cada jogo (luckCfg):
// o Rin arranca, se choca com o rival, a bola espirra, a SORTE cai do céu... e só
// você estava esperando embaixo dela.
// Helpers no CutsceneEngine com o prefixo "luck". Bonecos e cenários ficam prontos em
// canvas guardados (colar um canvas é bem mais barato que redesenhar a pixel art).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = (x) => clamp(x) * clamp(x);
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
  // Ciclo de corrida em 8 quadros (o boneco guardado pronto não refaz a pixel art todo quadro)
  const RUNF = (f) => 1 + (Math.floor(f / 2) % 8) * 2;

  const CYAN = '#00f5d4';
  const RIN_C = '#22d3ee';
  const NARR = '#94a3b8';
  const KIT_BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const KIT_U20 = { jerseyPrimary: '#ffffff', jerseySecondary: '#dc2626' };
  const KIT_JPN = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
  const KIT_FRA = { jerseyPrimary: '#0b1d4d', jerseySecondary: '#ef4444' };
  const KIT_GK = { jerseyPrimary: '#facc15', jerseySecondary: '#111827' };
  const FROZEN = { dim: 0.5, dimTint: '70,120,205', rim: '#bfdbfe' };

  // Paletas das peças de quebra-cabeça 3D
  const PAL = {
    gold: { f0: '#fff7cc', f1: '#fcd34d', f2: '#b45309', b0: '#d9a520', b1: '#b8860b', b2: '#7c4a03', side: '#8a5a00', side2: '#9a6700', dark: '#5c3a00', edge: '#78350f', text: '#6b2f06', glow: 'rgba(253,224,71,0.85)' },
    cyan: { f0: '#ccfbf1', f1: '#2dd4bf', f2: '#0f766e', b0: '#5eead4', b1: '#0d9488', b2: '#134e4a', side: '#0b4f4a', side2: '#0d5c56', dark: '#042f2e', edge: '#022c22', text: '#042f2e', glow: 'rgba(45,212,191,0.7)' },
    teal: { f0: '#a5f3fc', f1: '#22d3ee', f2: '#0e7490', b0: '#67e8f9', b1: '#0891b2', b2: '#164e63', side: '#155e75', side2: '#0e7490', dark: '#083344', edge: '#082f49', text: '#083344', glow: 'rgba(34,211,238,0.7)' },
    blue: { f0: '#dbeafe', f1: '#60a5fa', f2: '#1d4ed8', b0: '#93c5fd', b1: '#2563eb', b2: '#1e3a8a', side: '#1e3a8a', side2: '#1e40af', dark: '#172554', edge: '#0b1d4d', text: '#0b1d4d', glow: 'rgba(96,165,250,0.7)' },
    white: { f0: '#ffffff', f1: '#e2e8f0', f2: '#94a3b8', b0: '#f1f5f9', b1: '#cbd5e1', b2: '#64748b', side: '#64748b', side2: '#475569', dark: '#334155', edge: '#1e293b', text: '#0f172a', glow: 'rgba(226,232,240,0.6)' }
  };

  Object.assign(CE, {
    // ======================================================================
    // CONFIG DE CADA JOGO
    // ======================================================================
    luckCfg(type) {
      const key = `${type}|${this.sakugaFrame}|${window.App?.state?.profile?.name || ''}`;
      if (this._luckCfgC?.key === key) return this._luckCfgC.c;
      const ch = (id, kit, extra) => this.cineChar(id, Object.assign({}, kit, extra || {}));
      let c;
      if (type === 'u20_final_goal') {
        c = {
          id: 'final', home: 'JAPÃO', away: 'FRANÇA', homeCol: '#1d4ed8', awayCol: '#ef4444',
          you: this.cineYou(KIT_JPN), rin: ch('rin', KIT_JPN, { angry: true }), rival: ch('loki', KIT_FRA), defender: ch('hugo', KIT_FRA), gk: ch('gk_france', KIT_GK),
          mates: [ch('sae', KIT_JPN), ch('shidou', KIT_JPN)], foes: [ch('charles', KIT_FRA), ch('lorenzo', KIT_FRA)],
          rivalName: 'JULIAN LOKI', rivalShort: 'LOKI', defName: 'HUGO', gkShort: 'O GOLEIRO', gkDe: 'do goleiro da França',
          rivalRim: '#fde047', rivalGlow: 'rgba(250,204,21,0.5)', rivalBg: ['#1c1403', '#3f2e06'], awayRim: '#fca5a5',
          rivalLine: 'Aqui ninguém passa.',
          before: [2, 2], after: [3, 2], minute: "90+4'",
          place: 'GRANDE FINAL • COPA DO MUNDO SUB-20',
          sign: 'FIFA U-20 WORLD CUP • GRANDE FINAL • JAPÃO x FRANÇA',
          board: '#0b1d4d', boardLine: '#60a5fa',
          crowd: ['#1d4ed8', '#f8fafc', '#ef4444', '#1e3a8a', '#60a5fa', '#e2e8f0', '#b91c1c'],
          title: '🏆 O GOL DO TÍTULO • FINAL SUB-20',
          kicker: 'COPA DO MUNDO SUB-20 • GRANDE FINAL', bigTitle: 'CAMPEÕES DO MUNDO!',
          stakes: 'Quem marcar, leva a Copa!',
          goalCall: 'GOOOOOL DO JAPÃO!!',
          goalSub: 'O Japão é campeão do mundo!'
        };
      } else {
        c = {
          id: 'direct', home: 'BLUE LOCK', away: 'SUB-20', homeCol: '#38bdf8', awayCol: '#dc2626',
          you: this.cineYou(KIT_BL), rin: ch('rin', KIT_BL, { angry: true }), rival: ch('sae', KIT_U20), defender: ch('aiku', KIT_U20), gk: ch('fukaku', KIT_GK),
          mates: [ch('bachira', KIT_BL), ch('nagi', KIT_BL)], foes: [ch('shidou', KIT_U20), ch('sendo', KIT_U20)],
          rivalName: 'SAE ITOSHI', rivalShort: 'SAE', defName: 'AIKU', gkShort: 'FUKAKU', gkDe: 'do Fukaku',
          rivalRim: '#fb7185', rivalGlow: 'rgba(244,63,94,0.5)', rivalBg: ['#2a0a12', '#4c0519'], awayRim: '#fda4af',
          rivalLine: 'Ainda fraco, Rin.',
          before: [3, 3], after: [4, 3], minute: "90+3'",
          place: 'ESTÁDIO NACIONAL • TÓQUIO',
          sign: 'JFU JAPAN • BLUE LOCK vs SUB-20 DO JAPÃO',
          board: '#7f1d1d', boardLine: '#f87171',
          crowd: ['#dc2626', '#f1f5f9', '#1d4ed8', '#38bdf8', '#b91c1c', '#e2e8f0', '#0f2942'],
          title: '🍀 O GOL DA SORTE • BLUE LOCK x SUB-20',
          kicker: 'BLUE LOCK x JAPÃO SUB-20', bigTitle: 'O GOL DA VITÓRIA',
          stakes: 'Quem marcar, vence a Sub-20!',
          goalCall: 'GOOOOOL DO BLUE LOCK!!',
          goalSub: 'O Blue Lock venceu a Sub-20!'
        };
      }
      this._luckCfgC = { key, c };
      return c;
    },

    luckTags(type) {
      const c = this.luckCfg(type);
      return [
        `PLANO 1 • ${c.minute} — O ÚLTIMO LANCE`, 'PLANO 2 • A ARRANCADA', 'PLANO 3 • DOIS MONSTROS', 'PLANO 4 • O CHOQUE',
        'PLANO 5 • A SORTE', 'PLANO 6 • O EGO DESPERTA', 'PLANO 7 • SÓ VOCÊ SE MEXE', 'PLANO 8 • A PEÇA DA SORTE',
        'PLANO 9 • CHUTE DIRETO', 'PLANO 10 • RUMO AO GOL', 'PLANO 11 • A REDE', 'PLANO 12 • O ESTÁDIO EXPLODE', 'PLANO 13 • O OLHAR DO RIN'
      ];
    },

    luckSubs(type) {
      const c = this.luckCfg(type);
      const me = this.cinePlayerName();
      // Uma fala por plano (o placar, o "ÚLTIMO LANCE!", o DOOOM, o "PERCEBEU!", o
      // "CHUTE DIRETO!" e o "NÃO ALCANÇA!" já estão desenhados na imagem)
      return [
        [{ from: 6, who: 'NARRADOR', text: c.stakes, color: NARR }],
        [{ from: 4, who: 'NARRADOR', text: `...e ninguém marca ${me}.`, color: NARR }],
        [{ from: 6, who: c.rivalName, text: `"${c.rivalLine}"`, color: c.rivalRim }],
        [{ from: 8, who: 'RIN ITOSHI', text: '"Sai da frente."', color: '#2dd4bf' }],
        [{ from: 2, who: me, text: '(Sorte só cai pra quem está embaixo.)', color: CYAN }],
        [{ from: 4, who: me, text: '"A bola é sua, Rin. O gol..."', color: CYAN }],
        [{ from: 10, who: me, text: '(Só eu me mexo nesse mundo.)', color: CYAN }],
        [{ from: 4, who: me, text: '(A sorte quicou na minha frente.)', color: CYAN }],
        [{ from: 2, who: 'NARRADOR', text: `Tarde demais, ${c.defName}!`, color: NARR }],
        [{ from: 12, who: 'NARRADOR', text: 'Passou por todos!', color: NARR }],
        [{ from: 24, who: 'NARRADOR', text: c.goalCall, color: '#facc15' }],
        [{ from: 6, who: 'NARRADOR', text: c.goalSub, color: '#facc15' }],
        [{ from: 24, who: 'RIN ITOSHI', text: '"Esse gol... era MEU."', color: '#2dd4bf' }]
      ];
    },

    // ======================================================================
    // AJUDANTES (prefixo luck)
    // ======================================================================
    // Boneco pronto num canvas guardado. o = { facing, animState, frame, flipX, tint, dim, dimTint, rim, rimSides, rimD }
    luckSprEntry(char, base, o) {
      const cache = this._luckSpr || (this._luckSpr = new Map());
      if (o.rim) {
        const plain = Object.assign({}, o, { rim: null });
        const body = this.luckSprEntry(char, base, plain);
        const ck = `rim|${o.rim}|${(o.rimSides || [-1, 1]).join(',')}|${o.rimD || 0}|${body.key}`;
        let e = cache.get(ck);
        if (e) return e;
        const sil = this.luckSprEntry(char, base, Object.assign({}, plain, { tint: o.rim, dim: 0 }));
        const cv = document.createElement('canvas');
        cv.width = body.cv.width;
        cv.height = body.cv.height;
        const g = cv.getContext('2d');
        const d = o.rimD || Math.max(1, Math.round(base / 75));
        (o.rimSides || [-1, 1]).forEach((s) => g.drawImage(sil.cv, s * d, -Math.round(d * 0.35)));
        g.drawImage(body.cv, 0, 0);
        e = { cv, pad: body.pad, base, key: ck };
        if (cache.size > 260) cache.delete(cache.keys().next().value);
        cache.set(ck, e);
        return e;
      }
      const key = [
        base, char.id || '', char.name || '', char.jerseyPrimary, char.jerseySecondary, char.angry ? 1 : 0, char.outfit || '',
        char.hairColor, char.hairSecondary, char.skinColor, char.eyeColor, char.hairStyle, char.eyeStyle || '',
        o.facing || 'front', o.animState || 'idle', o.frame || 1, o.flipX ? 1 : 0, o.tint || '', o.dim || 0, o.dimTint || ''
      ].join('|');
      let e = cache.get(key);
      if (e) return e;
      const pad = Math.ceil(base * 0.45);
      const cv = document.createElement('canvas');
      cv.width = base + pad * 2;
      cv.height = Math.ceil(base * 1.1) + pad * 2;
      const g = cv.getContext('2d');
      g.translate(pad, pad);
      window.PixelRenderer.drawCharacterSprite(g, char, base, base * 1.1, {
        facing: o.facing || 'front',
        animState: o.animState || 'idle',
        frame: o.frame || 1,
        flipX: !!o.flipX,
        tint: o.tint
      });
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (o.dim) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = `rgba(${o.dimTint || '0,0,0'},${o.dim})`;
        g.fillRect(0, 0, cv.width, cv.height);
        g.globalCompositeOperation = 'source-over';
      }
      e = { cv, pad, base, key };
      if (cache.size > 260) cache.delete(cache.keys().next().value);
      cache.set(key, e);
      return e;
    },

    // Boneco com os pés em (x, feet). >= 180 amplia a base de 180 sem suavizar
    luckSpr(ctx, char, x, feet, size, o = {}) {
      const base = size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
      const e = this.luckSprEntry(char, base, o);
      const k = size / base;
      ctx.save();
      ctx.imageSmoothingEnabled = size < base;
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(e.cv, x - size / 2 - e.pad * k, feet - size * 0.87 - e.pad * k, e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },

    // Close: o olho do boneco fica em eyeY. Devolve { u, top, feet }
    luckHead(ctx, char, cx, eyeY, size, o = {}) {
      const u = size / 36;
      const top = eyeY - SPRITE_MAPY(10.1) * u;
      const feet = top + size * 0.87;
      this.luckSpr(ctx, char, cx, feet, size, o);
      return { u, top, feet };
    },

    // Olhos em pixel por cima de um close (luckHead). o = { ring, iris, look, tiny, angry, line }
    luckEyes(ctx, cx, eyeY, u, o = {}) {
      const px = u * 0.27;
      [-1, 1].forEach((s) => {
        const ex = cx + s * 3.5 * u;
        this.drawPixelEye(ctx, ex, eyeY, px, { line: o.line || '#020617', iris: o.iris || '#020617', ring: o.ring || '#ef4444', look: o.look || 0, tiny: o.tiny });
        if (o.angry) this.luckLid(ctx, ex, eyeY, px, s < 0 ? 1 : -1, o.line || '#020617');
      });
    },

    // Pálpebra brava em pixel (mesma grade 12 x 7 do drawPixelEye); side 1 = olho da esquerda
    luckLid(ctx, cx, cy, px, side, color) {
      const x0 = Math.round(cx - 6 * px);
      const y0 = Math.round(cy - 3.5 * px);
      const s = Math.ceil(px);
      ctx.fillStyle = color;
      for (let c = 1; c < 11; c++) {
        const inner = side > 0 ? c : 11 - c;
        if (inner >= 5) ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + 2 * px), s, s);
        if (inner >= 8) ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + 3 * px), s, s);
      }
    },

    // Faixa dos olhos em close extremo: o rosto recortado e ampliado + olhos em pixel por cima.
    // dw = largura da faixa (14 unidades da pixel art). Devolve { U, ly, lx, rx }
    luckBand(ctx, char, dx, dy, dw, o = {}) {
      const U = dw / 14;
      const e = this.luckSprEntry(char, 180, o.spr || {});
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(e.cv, e.pad + 11 * 5, e.pad + SPRITE_MAPY(7) * 5, 14 * 5, 6 * 5, dx, dy, dw, U * 6);
      ctx.restore();
      const px = U * 0.3;
      const ly = dy + 3.1 * U;
      const xs = [dx + 3.5 * U, dx + 10.5 * U];
      xs.forEach((ex, i) => {
        this.drawPixelEye(ctx, ex, ly, px, { line: '#020617', iris: o.iris || '#020617', ring: o.ring || char.eyeColor || '#ef4444', look: o.look || 0, tiny: o.tiny });
        if (o.angry) this.luckLid(ctx, ex, ly, px, i === 0 ? 1 : -1, '#020617');
      });
      return { U, ly, lx: xs[0], rx: xs[1] };
    },

    luckBg(key, w, h, fn) {
      const c = this._luckBgC || (this._luckBgC = {});
      if (!c[key]) {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        fn.call(this, cv.getContext('2d'), w, h);
        c[key] = cv;
      }
      return c[key];
    },

    // Versão borrada de um canvas guardado (profundidade de campo): reduz e amplia suavizando
    luckBlur(src, key, f = 6) {
      return this.luckBg(`blur|${key}|${f}`, src.width, src.height, (g, w, h) => {
        const sm = document.createElement('canvas');
        sm.width = Math.ceil(w / f);
        sm.height = Math.ceil(h / f);
        const s = sm.getContext('2d');
        s.imageSmoothingEnabled = true;
        s.drawImage(src, 0, 0, sm.width, sm.height);
        g.imageSmoothingEnabled = true;
        g.drawImage(sm, 0, 0, w, h);
      });
    },

    luckShadow(ctx, x, y, rx, a = 0.4) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#01040a';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.18, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    },

    // Placar de TV no canto
    luckScore(ctx, c, x, y, hg, ag, clock, k = 1, flash = 0) {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k);
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(2,6,23,0.9)';
      ctx.fillRect(0, 0, 400, 38);
      ctx.fillStyle = c.homeCol;
      ctx.fillRect(0, 0, 6, 38);
      ctx.fillStyle = c.awayCol;
      ctx.fillRect(394, 0, 6, 38);
      if (flash > 0) {
        ctx.fillStyle = `rgba(250,204,21,${0.35 * flash})`;
        ctx.fillRect(150, 0, 120, 38);
      }
      ctx.font = '900 16px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(c.home, 16, 19);
      ctx.textAlign = 'right';
      ctx.fillText(c.away, 384, 19);
      ctx.textAlign = 'center';
      ctx.fillStyle = flash > 0 ? '#facc15' : '#f8fafc';
      ctx.font = 'italic 900 20px "Segoe UI", sans-serif';
      ctx.fillText(`${hg}  x  ${ag}`, 210, 19);
      ctx.fillStyle = clock === 'FIM DE JOGO' ? '#ef4444' : CYAN;
      ctx.fillRect(0, 38, clock.length > 8 ? 130 : 92, 22);
      ctx.fillStyle = '#020617';
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.fillText(clock, clock.length > 8 ? 65 : 46, 49);
      ctx.restore();
    },

    // Letreiro pequeno espaçado, digitado
    luckKicker(ctx, x, y, text, k, color = CYAN) {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k * 3);
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      const s = this.cineType(text, k * 1.15).split('').join(' ');
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 9, 4, 18);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(2,6,23,0.85)';
      ctx.strokeText(s, x + 14, y);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(s, x + 14, y);
      ctx.restore();
    },

    // Tipografia cinética: cada letra entra com o próprio "soco" (atraso stagger entre elas)
    luckKinetic(ctx, text, cx, y, size, color, t, t0, stagger = 3, rot = 0) {
      if (t < t0) return;
      ctx.save();
      ctx.font = `italic 900 ${size}px "Segoe UI", sans-serif`;
      const chars = [...text];
      const ws = chars.map((ch) => ctx.measureText(ch).width * 1.02);
      ctx.restore();
      const total = ws.reduce((a, b) => a + b, 0);
      let x = cx - total / 2;
      chars.forEach((ch, i) => {
        const a = t0 + i * stagger;
        const k = seg(t, a, a + 8);
        const hop = Math.sin(seg(t, a, a + 14) * Math.PI) * size * 0.12;
        if (ch !== ' ') this.cineImpactText(ctx, ch, x + ws[i] / 2, y - hop + (x - cx) * Math.tan(rot), size, color, k, 0, rot);
        x += ws[i];
      });
    },

    // Rastro de vento afinando atrás de algo que voa (uma faixa só, sem cópias da bola)
    luckStreak(ctx, x0, y0, x1, y1, w0, w1, rgb = '0,245,212', a = 0.8) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d;
      const ny = dx / d;
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(${rgb},0)`);
      g.addColorStop(1, `rgba(${rgb},${a})`);
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0 + nx * w0 * 0.5, y0 + ny * w0 * 0.5);
      ctx.lineTo(x1 + nx * w1 * 0.5, y1 + ny * w1 * 0.5);
      ctx.lineTo(x1 - nx * w1 * 0.5, y1 - ny * w1 * 0.5);
      ctx.lineTo(x0 - nx * w0 * 0.5, y0 - ny * w0 * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    // Peça de quebra-cabeça 3D (espessura em camadas, face com degradê, texto em relevo).
    // O texto é medido e encolhido para caber longe do encaixe da esquerda (o "L" do LUCK
    // já virou "D" uma vez)
    luckPiece(ctx, x, y, s, spin, tilt, label, pal, glow = 0, shine = -1) {
      if (glow > 0) this.cineGlow(ctx, x, y, s * 1.55, pal.glow, glow);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      const cos = Math.cos(spin);
      const sx = Math.max(0.1, Math.abs(cos));
      const depth = Math.max(4, Math.round(s * 0.13));
      const side = Math.sin(spin) >= 0 ? 1 : -1;
      for (let i = depth; i >= 1; i--) {
        ctx.save();
        ctx.translate(side * i * (1 - sx) * 1.7 + i * 0.35, i * 0.9);
        ctx.scale(sx, 1);
        this.puzzlePath(ctx, s);
        ctx.fillStyle = i === depth ? pal.dark : i % 2 ? pal.side : pal.side2;
        ctx.fill();
        ctx.restore();
      }
      ctx.scale(sx, 1);
      this.puzzlePath(ctx, s);
      const front = cos >= 0;
      const grad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
      grad.addColorStop(0, front ? pal.f0 : pal.b0);
      grad.addColorStop(0.4, front ? pal.f1 : pal.b1);
      grad.addColorStop(1, front ? pal.f2 : pal.b2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, s * 0.035);
      ctx.strokeStyle = pal.edge;
      ctx.stroke();
      // Brilho que corre pela face (shine 0..1)
      if (shine >= 0 && shine <= 1) {
        ctx.save();
        this.puzzlePath(ctx, s);
        ctx.clip();
        const bx = lerp(-s, s, shine);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.12, -s);
        ctx.lineTo(bx + s * 0.04, -s);
        ctx.lineTo(bx - s * 0.36, s);
        ctx.lineTo(bx - s * 0.52, s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      this.puzzlePath(ctx, s * 0.84);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.stroke();
      ctx.restore();
      if (front && label) {
        let fs = Math.round(s * 0.27);
        ctx.font = `900 ${fs}px "Segoe UI", Arial, sans-serif`;
        const mw = ctx.measureText(label).width;
        if (mw > s * 0.5) {
          fs = Math.max(8, Math.floor((fs * s * 0.5) / mw));
          ctx.font = `900 ${fs}px "Segoe UI", Arial, sans-serif`;
        }
        const tx = s * 0.06;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(2, fs * 0.18);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.strokeText(label, tx, fs * 0.04);
        ctx.fillStyle = pal.text;
        ctx.fillText(label, tx, fs * 0.04);
      }
      ctx.restore();
    },

    // Encaixe vazio da peça que falta (tracejado pulsando)
    luckSlot(ctx, x, y, s, a, t) {
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha *= a;
      this.puzzlePath(ctx, s);
      ctx.fillStyle = 'rgba(253,224,71,0.08)';
      ctx.fill();
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(253,224,71,${0.55 + 0.35 * Math.sin(t * 0.15)})`;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `italic 900 ${Math.round(s * 0.45)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(253,224,71,0.85)';
      ctx.fillText('?', s * 0.04, 2);
      ctx.restore();
    },

    // ---------------------------------------------------------------- cenários
    // Estádio visto de lado (2560 de largura, repete): céu, cobertura com refletores,
    // dois anéis de arquibancada lotada, faixas da torcida e placas de LED
    luckSideBg(c, frozen) {
      return this.luckBg(`luck_side|${c.id}|${frozen ? 1 : 0}`, 2560, 380, (g, w, h) => {
        this.cineGradient(g, 0, 0, w, h, [[0, '#01030b'], [0.45, '#06102a'], [1, '#0b1a3e']]);
        g.fillStyle = '#02050d';
        g.fillRect(0, 0, w, 48);
        g.strokeStyle = 'rgba(71,97,150,0.35)';
        g.lineWidth = 2;
        g.beginPath();
        for (let x = 0; x < w; x += 64) {
          g.moveTo(x, 0);
          g.lineTo(x + 32, 46);
          g.lineTo(x + 64, 0);
        }
        g.stroke();
        g.fillStyle = '#0d1830';
        g.fillRect(0, 46, w, 5);
        // Refletores pendurados na cobertura
        for (let x = 160; x < w; x += 320) {
          g.fillStyle = '#0b1324';
          g.fillRect(x - 52, 40, 104, 32);
          g.fillStyle = '#e0f2fe';
          for (let r = 0; r < 3; r++) for (let q = 0; q < 8; q++) g.fillRect(x - 47 + q * 12, 44 + r * 9, 8, 6);
        }
        const crowd = (y0, y1, step, dot, seed) => {
          for (let y = y0, row = 0; y < y1; y += step, row++) {
            for (let x = (row % 2) * step * 0.5; x < w; x += step) {
              const r = rnd(x * 0.37 + y * 1.7, seed);
              g.fillStyle = r < 0.25 ? '#0d1730' : c.crowd[Math.floor(rnd(x * 0.91 + y * 3.1, seed + 2) * c.crowd.length)];
              g.fillRect(x + (rnd(x, y) - 0.5) * 2, y + (rnd(y, x) - 0.5) * 2, dot, dot);
            }
          }
        };
        g.fillStyle = '#0a1430';
        g.fillRect(0, 74, w, 126);
        crowd(76, 198, 8, 5, 3);
        g.fillStyle = '#04081a';
        g.fillRect(0, 198, w, 14);
        g.fillStyle = 'rgba(125,211,252,0.5)';
        for (let x = 20; x < w; x += 46) g.fillRect(x, 204, 10, 3);
        g.fillStyle = '#0a1430';
        g.fillRect(0, 212, w, 136);
        crowd(214, 344, 10, 7, 7);
        // Faixas (bandeirões) da torcida
        for (let x = 90; x < w; x += 430) {
          const bw = 120 + rnd(x, 9) * 80;
          const cols = [c.crowd[0], c.crowd[1], c.crowd[2]];
          cols.forEach((col, i) => {
            g.fillStyle = col;
            g.fillRect(x, 240 + i * 14, bw, 14);
          });
          g.strokeStyle = '#020617';
          g.lineWidth = 2;
          g.strokeRect(x, 240, bw, 42);
        }
        // Parte de cima mais escura (fora da luz)
        const dk = g.createLinearGradient(0, 74, 0, 200);
        dk.addColorStop(0, 'rgba(1,3,11,0.65)');
        dk.addColorStop(1, 'rgba(1,3,11,0.1)');
        g.fillStyle = dk;
        g.fillRect(0, 74, w, 126);
        g.fillStyle = 'rgba(30,58,138,0.16)';
        g.fillRect(0, 74, w, 274);
        // Placas de LED
        g.fillStyle = c.board;
        g.fillRect(0, 348, w, 24);
        g.fillStyle = c.boardLine;
        g.fillRect(0, 348, w, 2);
        g.fillStyle = '#020617';
        g.fillRect(0, 372, w, 8);
        g.font = '900 14px "Segoe UI", sans-serif';
        g.textBaseline = 'middle';
        g.textAlign = 'left';
        g.fillStyle = '#f8fafc';
        const step = g.measureText(c.sign).width + 70;
        for (let x = 20; x < w; x += step) g.fillText(c.sign, x, 361);
        if (frozen) {
          // O tempo parou: tudo vira azul gelado (feito uma vez só, no canvas guardado)
          g.globalCompositeOperation = 'color';
          g.fillStyle = '#4f7fd6';
          g.fillRect(0, 0, w, h);
          g.globalCompositeOperation = 'source-over';
          g.fillStyle = 'rgba(8,24,64,0.32)';
          g.fillRect(0, 0, w, h);
        }
      });
    },

    // Desenha o estádio de lado com a câmera em camX e o horizonte (placas) em hz
    luckSide(ctx, S, c, o = {}) {
      const { W } = S;
      const hz = o.hz;
      const par = o.par ?? 0.35;
      let cv = this.luckSideBg(c, o.frozen);
      if (o.blur) cv = this.luckBlur(cv, `side|${c.id}|${o.frozen ? 1 : 0}`, o.blur);
      const off = (((o.camX || 0) * par) % 2560 + 2560) % 2560;
      const y0 = hz - 372;
      ctx.fillStyle = '#01030b';
      ctx.fillRect(-300, y0 - 400, W + 600, 402);
      // Faixa larga (W + 600) para sobrar nas tremidas e no zoom da câmera
      const DW = W + 600;
      const w1 = Math.min(DW, 2560 - off);
      ctx.drawImage(cv, off, 0, w1, 380, -300, y0, w1, 380);
      if (w1 < DW) ctx.drawImage(cv, 0, 0, DW - w1, 380, -300 + w1, y0, DW - w1, 380);
      // Brilho dos refletores
      if (!o.noGlow) {
        for (let bx = 160; bx < 2560; bx += 320) {
          let sx = bx - off - 300;
          if (sx < -400) sx += 2560;
          if (sx < -400 || sx > W + 400) continue;
          this.cineGlow(ctx, sx, y0 + 56, o.blur ? 190 : 150, o.frozen ? 'rgba(191,219,254,0.55)' : 'rgba(224,242,254,0.85)', 1);
        }
      }
      this.luckPitch(ctx, S, hz, o.camX || 0, o.frozen, o.pitchBot);
    },

    // Gramado visto de lado (faixas de corte em perspectiva andando com a câmera)
    luckPitch(ctx, S, hz, camX, frozen, bot) {
      const { W } = S;
      const b = bot ?? S.H + 60;
      this.cineGradient(ctx, -300, hz, W + 600, b - hz, frozen
        ? [[0, '#203a5e'], [0.25, '#162b48'], [1, '#0a1526']]
        : [[0, '#1c6b3d'], [0.25, '#13502d'], [1, '#072515']]);
      ctx.fillStyle = frozen ? 'rgba(191,219,254,0.05)' : 'rgba(187,247,208,0.06)';
      const vx = W / 2;
      const span = b - hz;
      const i0 = Math.floor((camX - W * 3) / 360) * 2;
      for (let i = i0; i < (camX + W * 3) / 180; i += 2) {
        const b0 = i * 180 - camX;
        const b1 = b0 + 180;
        ctx.beginPath();
        ctx.moveTo(vx + (b0 - vx) * 0.3, hz);
        ctx.lineTo(vx + (b1 - vx) * 0.3, hz);
        ctx.lineTo(vx + (b1 - vx) * 2.2, hz + span);
        ctx.lineTo(vx + (b0 - vx) * 2.2, hz + span);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = frozen ? 'rgba(191,219,254,0.45)' : 'rgba(226,232,240,0.55)';
      ctx.fillRect(-300, hz + 16, W + 600, 3);
      // Luz dos refletores no gramado
      const sh = ctx.createLinearGradient(0, hz, 0, hz + 160);
      sh.addColorStop(0, frozen ? 'rgba(147,197,253,0.14)' : 'rgba(147,197,253,0.10)');
      sh.addColorStop(1, 'rgba(147,197,253,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(-300, hz, W + 600, 160);
    },

    // Grama de perto (primeiro plano das câmeras no chão)
    luckGrassCv() {
      return this.luckBg('luck_grass', 1600, 150, (g, w, h) => {
        for (let i = 0; i < 1400; i++) {
          const x = rnd(i, 51) * w;
          const bh = 18 + rnd(i, 52) * 70;
          const lean = (rnd(i, 53) - 0.5) * 18;
          const shade = Math.floor(rnd(i, 54) * 4);
          g.fillStyle = ['#062012', '#0a2e1a', '#0f3d24', '#14532d'][shade];
          g.beginPath();
          g.moveTo(x - 3, h);
          g.lineTo(x + lean, h - bh);
          g.lineTo(x + 3, h);
          g.closePath();
          g.fill();
          if (shade === 3) {
            g.fillStyle = 'rgba(147,197,253,0.25)';
            g.fillRect(x + lean - 1, h - bh, 2, 6);
          }
        }
      });
    },

    // Plano geral do alto: o estádio inteiro, o gramado em perspectiva (P(u, v) mapeia o campo)
    luckFieldPt(u, v) {
      const y = lerp(302, 712, v);
      return [lerp(lerp(330, 950, u), lerp(-60, 1340, u), v), y];
    },
    luckBowlCv(c) {
      return this.luckBg(`luck_bowl|${c.id}`, 1920, 1080, (g) => {
        g.scale(1.5, 1.5);
        const W = 1280;
        const H = 720;
        this.cineGradient(g, 0, 0, W, H, [[0, '#01030b'], [0.4, '#06102a'], [1, '#0a1a3e']]);
        // Arquibancadas em anel (as pontas sobem: a curva da tigela)
        for (let y = 96; y < H + 10;) {
          const k = (y - 96) / (H - 96);
          const ds = 2.4 + k * 5;
          const step = ds * 1.55;
          for (let x = -10; x < W + 10; x += step) {
            const cy = y - Math.pow((x - 640) / 640, 2) * (24 + k * 60);
            const r = rnd(x * 1.3 + y * 7.1, 2);
            g.fillStyle = r < 0.24 ? '#0c1630' : c.crowd[Math.floor(rnd(x + y * 3.3, 6) * c.crowd.length)];
            g.fillRect(x, cy, ds, ds);
          }
          y += step;
        }
        g.strokeStyle = '#040817';
        g.lineWidth = 7;
        [196, 300].forEach((yy) => {
          g.beginPath();
          for (let x = -10; x <= W + 10; x += 20) {
            const cy = yy - Math.pow((x - 640) / 640, 2) * (24 + ((yy - 96) / 624) * 60);
            if (x < 0) g.moveTo(x, cy);
            else g.lineTo(x, cy);
          }
          g.stroke();
        });
        const dk = g.createLinearGradient(0, 90, 0, 300);
        dk.addColorStop(0, 'rgba(1,3,11,0.75)');
        dk.addColorStop(1, 'rgba(1,3,11,0.05)');
        g.fillStyle = dk;
        g.fillRect(0, 90, W, 210);
        g.fillStyle = 'rgba(30,58,138,0.15)';
        g.fillRect(0, 90, W, H);
        // Anel das placas em volta do campo
        poly(g, [[300, 286], [980, 286], [1420, 722], [-140, 722]]);
        g.fillStyle = '#050a18';
        g.fill();
        g.strokeStyle = c.boardLine;
        g.lineWidth = 4;
        poly(g, [[318, 294], [962, 294], [1380, 722], [-100, 722]]);
        g.stroke();
        // Gramado
        const P = this.luckFieldPt;
        const quad = (u0, u1, v0, v1) => poly(g, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]);
        quad(0, 1, 0, 1);
        const pg = g.createLinearGradient(0, 302, 0, 712);
        pg.addColorStop(0, '#0f3f27');
        pg.addColorStop(1, '#17643a');
        g.fillStyle = pg;
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 16; i += 2) {
          quad(i / 16, (i + 1) / 16, 0, 1);
          g.fill();
        }
        g.strokeStyle = 'rgba(226,236,240,0.72)';
        g.lineWidth = 2.5;
        const line = (pts) => {
          g.beginPath();
          pts.forEach(([u, v], i) => {
            const [x, y] = P(u, v);
            if (i) g.lineTo(x, y);
            else g.moveTo(x, y);
          });
          g.stroke();
        };
        line([[0.03, 0.05], [0.97, 0.05], [0.97, 0.95], [0.03, 0.95], [0.03, 0.05]]);
        line([[0.5, 0.05], [0.5, 0.95]]);
        const circ = [];
        for (let i = 0; i <= 40; i++) circ.push([0.5 + Math.cos((i / 40) * TAU) * 0.085, 0.5 + Math.sin((i / 40) * TAU) * 0.15]);
        line(circ);
        line([[0.03, 0.25], [0.17, 0.25], [0.17, 0.75], [0.03, 0.75]]);
        line([[0.97, 0.25], [0.83, 0.25], [0.83, 0.75], [0.97, 0.75]]);
        line([[0.03, 0.38], [0.075, 0.38], [0.075, 0.62], [0.03, 0.62]]);
        line([[0.97, 0.38], [0.925, 0.38], [0.925, 0.62], [0.97, 0.62]]);
        // Gols
        [0.03, 0.97].forEach((u) => {
          const [x0, y0] = P(u, 0.44);
          const [x1, y1] = P(u, 0.56);
          g.fillStyle = 'rgba(241,245,249,0.25)';
          poly(g, [[x0, y0], [x1, y1], [x1, y1 - 18], [x0, y0 - 14]]);
          g.fill();
          g.strokeStyle = '#f8fafc';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(x0, y0);
          g.lineTo(x0, y0 - 14);
          g.lineTo(x1, y1 - 18);
          g.lineTo(x1, y1);
          g.stroke();
        });
        // Cobertura (a borda faz uma curva) com a fileira de refletores
        const edge = (x) => 104 + Math.pow((x - 640) / 640, 2) * 74;
        g.beginPath();
        g.moveTo(-20, -20);
        g.lineTo(W + 20, -20);
        for (let x = W + 20; x >= -20; x -= 20) g.lineTo(x, edge(x));
        g.closePath();
        g.fillStyle = '#02040b';
        g.fill();
        g.strokeStyle = 'rgba(148,163,184,0.3)';
        g.lineWidth = 2;
        g.beginPath();
        for (let x = -20; x <= W + 20; x += 20) (x < 0 ? g.moveTo(x, edge(x)) : g.lineTo(x, edge(x)));
        g.stroke();
        g.fillStyle = '#e0f2fe';
        for (let x = 10; x < W; x += 22) g.fillRect(x, edge(x) - 7, 8, 4);
      });
    },

    // O céu visto de baixo: as bordas da cobertura nos cantos, com os refletores
    luckSkyCv() {
      return this.luckBg('luck_sky', 1280, 900, (g, w, h) => {
        this.cineGradient(g, 0, 0, w, h, [[0, '#01030b'], [0.45, '#071433'], [0.8, '#11285c'], [1, '#1b3a78']]);
        for (let i = 0; i < 120; i++) {
          g.fillStyle = `rgba(255,255,255,${0.2 + rnd(i, 61) * 0.5})`;
          const s = rnd(i, 62) < 0.85 ? 1.5 : 2.5;
          g.fillRect(rnd(i, 63) * w, rnd(i, 64) * h * 0.7, s, s);
        }
        [[1, 0], [-1, w]].forEach(([d, x0]) => {
          g.save();
          g.translate(x0, 0);
          g.scale(d, 1);
          poly(g, [[-10, -10], [470, -10], [300, 150], [120, 330], [-10, 470]]);
          g.fillStyle = '#02050d';
          g.fill();
          g.strokeStyle = 'rgba(148,163,184,0.35)';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(470, -10);
          g.lineTo(300, 150);
          g.lineTo(120, 330);
          g.lineTo(-10, 470);
          g.stroke();
          // Estrutura da cobertura
          g.strokeStyle = 'rgba(71,97,150,0.3)';
          g.lineWidth = 2;
          g.beginPath();
          for (let k = 0; k < 9; k++) {
            g.moveTo(-10, k * 50);
            g.lineTo(470 - k * 55, -10 + k * 20);
          }
          g.stroke();
          g.restore();
        });
      });
    },

    // Visão de trás do gol (a câmera está atrás da rede): o campo e a arquibancada lá do outro lado
    luckGoalBg(c) {
      return this.luckBg(`luck_goal|${c.id}`, 1280, 720, (g, w, h) => {
        this.cineGradient(g, 0, 0, w, h, [[0, '#01030b'], [1, '#0a1838']]);
        g.drawImage(this.luckSideBg(c, false), 300, 0, 2000, 380, -60, 70, 1400, 266);
        g.fillStyle = '#01030b';
        g.fillRect(0, 0, w, 72);
        const hz = 336;
        this.cineGradient(g, 0, hz, w, h - hz, [[0, '#103f26'], [1, '#1a6b3d']]);
        for (let i = 0; i < 10; i++) {
          const y0 = hz + (h - hz) * Math.pow(i / 10, 1.6);
          const y1 = hz + (h - hz) * Math.pow((i + 1) / 10, 1.6);
          if (i % 2) {
            g.fillStyle = 'rgba(255,255,255,0.05)';
            g.fillRect(0, y0, w, y1 - y0);
          }
        }
        g.strokeStyle = 'rgba(226,236,240,0.6)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(0, hz + 6);
        g.lineTo(w, hz + 6);
        g.moveTo(90, 720);
        g.lineTo(420, 420);
        g.lineTo(860, 420);
        g.lineTo(1190, 720);
        g.moveTo(360, 720);
        g.lineTo(500, 560);
        g.lineTo(780, 560);
        g.lineTo(920, 720);
        g.stroke();
        g.beginPath();
        g.ellipse(640, 420, 120, 26, 0, Math.PI * 1.05, Math.PI * 1.95);
        g.stroke();
        g.fillStyle = 'rgba(226,236,240,0.8)';
        g.beginPath();
        g.ellipse(640, 480, 6, 3, 0, 0, TAU);
        g.fill();
        const sh = g.createLinearGradient(0, hz, 0, hz + 200);
        sh.addColorStop(0, 'rgba(147,197,253,0.12)');
        sh.addColorStop(1, 'rgba(147,197,253,0)');
        g.fillStyle = sh;
        g.fillRect(0, hz, w, 200);
      });
    },

    // Fogos de artifício (anel de faíscas caindo); t = tempo desde o estouro
    luckFirework(ctx, x, y, t, color, n = 26, R = 150) {
      if (t < 0 || t > 70) return;
      const k = t / 70;
      const r = ease(k * 1.4) * R;
      this.cineGlow(ctx, x, y, R * 0.9, 'rgba(255,255,255,0.5)', Math.max(0, 1 - k * 3));
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r + k * k * 60;
        ctx.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78 + k * k * 50);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    },

    // Torcida em silhueta pulando de braço pra cima (primeiro plano)
    luckFans(ctx, W, baseY, t, s = 1, rim = 'rgba(125,211,252,0.7)', seed = 1) {
      const step = 84 * s;
      ctx.save();
      for (let i = -1; i * step < W + step; i++) {
        const x = i * step + rnd(i, seed) * 20 * s;
        const jump = Math.abs(Math.sin(t * 0.18 + i * 1.7 + seed)) * 22 * s;
        const y = baseY - jump;
        ctx.fillStyle = '#01030a';
        ctx.beginPath();
        ctx.arc(x, y - 58 * s, 20 * s, 0, TAU);
        ctx.fill();
        ctx.fillRect(x - 32 * s, y - 34 * s, 64 * s, 200 * s);
        // Braços pra cima
        const wav = Math.sin(t * 0.25 + i) * 0.25;
        [-1, 1].forEach((d) => {
          ctx.save();
          ctx.translate(x + d * 26 * s, y - 30 * s);
          ctx.rotate(d * (0.35 + wav * d));
          ctx.fillRect(-7 * s, -64 * s, 14 * s, 64 * s);
          ctx.restore();
        });
        ctx.strokeStyle = rim;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y - 58 * s, 20 * s, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      ctx.restore();
    },

    // Partículas de luz dourada saindo de (x, y)
    luckGoldBurst(ctx, x, y, k, n = 14, R = 120, flat = 0.5) {
      if (k <= 0 || k >= 1) return;
      ctx.save();
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (i / (n - 1)) * Math.PI;
        const d = ease(k) * R * (0.6 + rnd(i, 71) * 0.6);
        ctx.fillStyle = `rgba(253,224,71,${1 - k})`;
        const s = 4 + rnd(i, 72) * 4;
        ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * flat, s, s);
      }
      ctx.restore();
    },

    // ======================================================================
    // OS PLANOS
    // ======================================================================
    luckDraw(ctx, S, type) {
      const c = this.luckCfg(type);
      const fns = [this.luckP1, this.luckP2, this.luckP3, this.luckP4, this.luckP5, this.luckP6, this.luckP7, this.luckP8, this.luckP9, this.luckP10, this.luckP11, this.luckP12, this.luckP13];
      fns[S.phase]?.call(this, ctx, S, c);
    },

    // PLANO 1: o estádio inteiro do alto; a grua desce até o lance (o Rin com a bola, você livre)
    luckP1(ctx, S, c) {
      const { W, H, t, top, bot } = S;
      // Monta os cenários guardados dos outros planos aos poucos (um por quadro, ainda no
      // começo do filme) para nenhum plano travar na primeira vez que aparece
      if (t >= 2) {
        const warm = [
          () => this.luckSideBg(c, false), () => this.luckSideBg(c, true), () => this.luckBlur(this.luckSideBg(c, false), `side|${c.id}|0`, 6),
          () => this.luckGoalBg(c), () => this.luckSkyCv(), () => this.luckGrassCv()
        ];
        const keys = [`luck_side|${c.id}|0`, `luck_side|${c.id}|1`, `blur|side|${c.id}|0|6`, `luck_goal|${c.id}`, 'luck_sky', 'luck_grass'];
        const bg = this._luckBgC || {};
        const i = keys.findIndex((k) => !bg[k]);
        if (i >= 0) warm[i]();
      }
      const k = easeIO(seg(t, 6, 140));
      const P = this.luckFieldPt;
      const rinU = lerp(0.36, 0.5, ease(t / 140));
      const [rx, ry] = P(rinU, 0.56);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, rx + 40, k), y: lerp(400, ry - 30, k), zoom: lerp(1, 2.15, k), rot: lerp(-0.03, 0, k) });
      ctx.drawImage(this.luckBowlCv(c), 0, 0, 1280, 720);
      // Refletores da cobertura e os feixes descendo no campo
      [150, 420, 860, 1130].forEach((x, i) => {
        const ey = 104 + Math.pow((x - 640) / 640, 2) * 74;
        this.cineGlow(ctx, x, ey - 4, 120, 'rgba(224,242,254,0.8)', 1);
        this.cineShafts(ctx, x, ey, Math.atan2(480 - ey, 640 - x), 520, 0.28, 3, '191,219,254', 0.06, t + i * 40);
      });
      // Flashes de câmera na arquibancada (acendem e apagam devagar)
      for (let i = 0; i < 16; i++) {
        const a = Math.max(0, Math.sin(t * 0.07 + i * 2.3));
        if (a < 0.6) continue;
        const x = rnd(i, 81) * W;
        const y = 130 + rnd(i, 82) * 150;
        this.cineGlow(ctx, x, y, 10, 'rgba(255,255,255,0.9)', (a - 0.6) * 2.5);
      }
      // Os jogadores (escala pela profundidade)
      const who = [];
      const add = (ch, u, v, o = {}) => who.push({ ch, u, v, o });
      add(c.gk, 0.95, 0.5, { flipX: true });
      add(c.defender, lerp(0.8, 0.74, k), 0.52, { animState: 'run', flipX: true });
      add(c.foes[0], lerp(0.7, 0.66, k), 0.36, { animState: 'run', flipX: true });
      add(c.foes[1], 0.62, 0.78, { animState: 'run', flipX: true });
      add(c.mates[0], lerp(0.3, 0.42, k), 0.82, { animState: 'run' });
      add(c.mates[1], lerp(0.28, 0.38, k), 0.2, { animState: 'run' });
      add(c.rival, lerp(0.72, 0.6, ease(seg(t, 20, 140))), 0.6, { animState: 'run', flipX: true });
      add(c.rin, rinU, 0.56, { animState: 'run' });
      const youU = lerp(0.26, 0.42, ease(t / 140));
      add(c.you, youU, 0.3, { animState: 'run' });
      who.sort((a, b) => a.v - b.v).forEach(({ ch, u, v, o }) => {
        const [x, y] = P(u, v);
        const sz = lerp(30, 54, v);
        this.luckShadow(ctx, x, y, sz * 0.3, 0.45);
        this.luckSpr(ctx, ch, x, y, sz, Object.assign({ frame: o.animState === 'run' ? RUNF(S.f + u * 40) : 1 }, o));
      });
      this.drawAnimeBall(ctx, rx + 10, ry - 3, 3.2, 'rgba(255,255,255,0.4)', S.f);
      // A marca em você: ninguém por perto
      const [yx, yy] = P(youU, 0.3);
      const mk = seg(t, 70, 84);
      if (mk > 0) {
        ctx.save();
        ctx.globalAlpha = mk;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(yx, yy, 16 + Math.sin(t * 0.2) * 1.5, 5, 0, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = CYAN;
        ctx.font = '900 9px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`▼ ${this.cinePlayerName()}`, yx, yy - 44);
        ctx.restore();
      }
      ctx.restore();
      this.luckKicker(ctx, 40, top + 30, c.place, seg(t, 10, 50));
      this.luckKicker(ctx, 40, top + 58, `${c.minute} • ACRÉSCIMOS`, seg(t, 40, 80), '#facc15');
      this.luckScore(ctx, c, W - 428, top + 18, c.before[0], c.before[1], c.minute, seg(t, 6, 20));
      if (t > 98) this.cineImpactText(ctx, 'ÚLTIMO LANCE!', W / 2, bot - 70, 70, '#facc15', seg(t, 98, 110), W * 0.8, -0.04);
      this.cineSfx(S, 2, 'torcida', () => window.SFX?.whistle?.(1));
    },

    // PLANO 2: travelling de lado — o Rin conduz, o rival vem fechar; você lá atrás, livre
    luckP2(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const hz = top + stageH * 0.44;
      const camX = 400 + t * 16;
      const push = easeIO(seg(t, 80, 140));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 + push * 40, y: H / 2 + push * 20, zoom: 1.04 + push * 0.08, shake: 1.4 });
      this.luckSide(ctx, S, c, { camX, hz });
      this.drawSpeedLines(ctx, W, H, '#e0f2fe', 0.08);
      // Fundo: você correndo sozinho (pequeno, do outro lado) e o zagueiro longe
      const far = hz + 112;
      const yx = lerp(150, 360, ease(t / 140));
      this.luckShadow(ctx, yx, far, 26, 0.4);
      this.luckSpr(ctx, c.you, yx, far, 150, { animState: 'run', frame: RUNF(S.f + 5), rim: CYAN, rimSides: [1] });
      this.luckShadow(ctx, 1060 - t * 0.5, far - 6, 24, 0.4);
      this.luckSpr(ctx, c.defender, 1060 - t * 0.5, far - 6, 140, { animState: 'run', frame: RUNF(S.f + 3), flipX: true, dim: 0.15, dimTint: '2,10,30' });
      const mk = seg(t, 84, 96);
      if (mk > 0) {
        ctx.save();
        ctx.globalAlpha = mk;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(yx, far, 50 + Math.sin(t * 0.2) * 3, 12, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
        this.cineImpactText(ctx, `▼ ${this.cinePlayerName()} • LIVRE`, yx, far - 170, 22, CYAN, mk, 300, 0);
      }
      // O rival chegando pela direita
      const vx = lerp(1460, 830, ease(seg(t, 14, 140)));
      const feet = top + stageH * 0.94;
      this.cineGlow(ctx, vx, feet - 150, 200, c.rivalGlow, 0.7);
      this.luckShadow(ctx, vx, feet, 70, 0.45);
      this.luckSpr(ctx, c.rival, vx, feet, 320, { animState: 'run', frame: RUNF(S.f + 7), flipX: true, rim: c.rivalRim, rimSides: [-1] });
      // O Rin com a bola colada no pé
      const rx = lerp(260, 470, ease(t / 140));
      this.cineGlow(ctx, rx, feet - 150, 210, 'rgba(34,211,238,0.45)', 0.8);
      this.luckShadow(ctx, rx, feet + 4, 74, 0.45);
      this.luckSpr(ctx, c.rin, rx, feet + 4, 340, { animState: 'run', frame: RUNF(S.f), rim: RIN_C, rimSides: [1] });
      const bx = rx + 88 + Math.sin(t * 0.4) * 8;
      this.luckShadow(ctx, bx, feet + 4, 16, 0.4);
      this.drawAnimeBall(ctx, bx, feet - 12, 15, 'rgba(165,243,252,0.35)', S.f);
      // Grama levantando atrás do pé
      ctx.fillStyle = 'rgba(134,239,172,0.55)';
      for (let i = 0; i < 9; i++) {
        const q = ((t * 3 + i * 13) % 40) / 40;
        ctx.fillRect(rx - 50 - q * 130, feet - 6 - Math.sin(q * Math.PI) * 34 - i * 2, 4, 4);
      }
      ctx.restore();
      this.luckScore(ctx, c, 28, top + 18, c.before[0], c.before[1], c.minute);
      if (t > 26 && t < 84) this.cineImpactText(ctx, 'O RIN ARRANCA!', W * 0.66, top + 84, 54, '#a5f3fc', seg(t, 26, 36), W * 0.6, -0.06);
    },

    // PLANO 3: página de mangá — os dois rostos rachados na diagonal, e o VS
    luckP3(ctx, S, c) {
      const { W, t, top, bot, stageH } = S;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, top, W, stageH);
      const kL = ease(seg(t, 0, 18));
      const kR = ease(seg(t, 8, 26));
      const z = 1 + easeIO(t / 130) * 0.07;
      const vs = 72;
      const shake = t >= vs && t < vs + 24 ? this.cineNoise(S.f * 3, 4) * 6 * (1 - (t - vs) / 24) : 0;
      const eyeY = top + stageH * 0.47;
      this.cinePanel(ctx, [[14, top + 14], [W * 0.56 - 8, top + 14], [W * 0.44 - 8, bot - 14], [14, bot - 14]], () => {
        this.cineGradient(ctx, 0, top, W * 0.6, stageH, [[0, '#021a1d'], [1, '#04343a']]);
        this.drawRadialSpeedLines(ctx, W * 0.24, eyeY, W, '#2dd4bf', 0.22);
        ctx.save();
        ctx.translate(W * 0.25, eyeY);
        ctx.scale(z, z);
        ctx.translate(-W * 0.25 + shake, -eyeY);
        this.cineGlow(ctx, W * 0.25, eyeY, 330, 'rgba(34,211,238,0.35)', 1);
        const h = this.luckHead(ctx, c.rin, W * 0.25, eyeY, 760, { rim: RIN_C, dim: 0.12, dimTint: '0,30,36' });
        this.luckEyes(ctx, W * 0.25, eyeY, h.u, { ring: RIN_C, iris: '#0f766e', look: 1, angry: true, tiny: t > vs });
        ctx.restore();
        const sh = ctx.createLinearGradient(0, 0, W * 0.5, 0);
        sh.addColorStop(0, 'rgba(1,10,14,0.65)');
        sh.addColorStop(0.5, 'rgba(1,10,14,0)');
        ctx.fillStyle = sh;
        ctx.fillRect(0, top, W * 0.6, stageH);
      }, { dx: (1 - kL) * -W * 0.6 });
      this.cinePanel(ctx, [[W * 0.56 + 8, top + 14], [W - 14, top + 14], [W - 14, bot - 14], [W * 0.44 + 8, bot - 14]], () => {
        this.cineGradient(ctx, W * 0.4, top, W * 0.6, stageH, [[0, c.rivalBg[0]], [1, c.rivalBg[1]]]);
        this.drawRadialSpeedLines(ctx, W * 0.76, eyeY, W, c.rivalRim, 0.2);
        ctx.save();
        ctx.translate(W * 0.75, eyeY);
        ctx.scale(z, z);
        ctx.translate(-W * 0.75 - shake, -eyeY);
        this.cineGlow(ctx, W * 0.75, eyeY, 330, c.rivalGlow, 1);
        const h = this.luckHead(ctx, c.rival, W * 0.75, eyeY, 760, { rim: c.rivalRim, flipX: true, dim: 0.1, dimTint: '20,0,0' });
        this.luckEyes(ctx, W * 0.75, eyeY, h.u, { ring: c.rivalRim, iris: '#1f0a0a', look: -1 });
        ctx.restore();
        const sh = ctx.createLinearGradient(W, 0, W * 0.5, 0);
        sh.addColorStop(0, 'rgba(14,4,4,0.65)');
        sh.addColorStop(0.5, 'rgba(14,4,4,0)');
        ctx.fillStyle = sh;
        ctx.fillRect(W * 0.4, top, W * 0.6, stageH);
      }, { dx: (1 - kR) * W * 0.6 });
      // Os nomes
      const kn = ease(seg(t, 26, 40));
      if (kn > 0) {
        ctx.save();
        ctx.globalAlpha = kn;
        [[W * 0.2, 'RIN ITOSHI', RIN_C], [W * 0.8, c.rivalName, c.rivalRim]].forEach(([x, nm, col]) => {
          ctx.font = 'italic 900 22px "Segoe UI", sans-serif';
          const w = ctx.measureText(nm).width + 34;
          ctx.fillStyle = 'rgba(2,6,23,0.9)';
          ctx.fillRect(x - w / 2, bot - 64, w, 36);
          ctx.fillStyle = col;
          ctx.fillRect(x - w / 2, bot - 64, w, 3);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(nm, x, bot - 45);
        });
        ctx.restore();
      }
      // A costura vira raio e o VS
      if (t >= vs) {
        const pts = [];
        for (let i = 0; i <= 10; i++) {
          const f = i / 10;
          pts.push([lerp(W * 0.56, W * 0.44, f) + (i && i < 10 ? (i % 2 ? 16 : -16) : 0), lerp(top, bot, f)]);
        }
        ctx.save();
        ctx.lineJoin = 'miter';
        [['#020617', 14], ['#facc15', 7], ['#ffffff', 3]].forEach(([col, w]) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        });
        ctx.restore();
        this.cineGlow(ctx, W / 2, top + stageH * 0.5, 220, 'rgba(250,204,21,0.45)', 1 - seg(t, vs, vs + 40) * 0.6);
        this.cineImpactText(ctx, 'VS', W / 2, top + stageH * 0.5, 150, '#facc15', seg(t, vs, vs + 10), 0, -0.08);
        this.cineFlash(ctx, W, S.H, (1 - seg(t, vs, vs + 10)) * 0.45);
      }
      this.cineSfx(S, vs, 'vs', () => window.SFX?.tackle?.());
    },

    // PLANO 4: câmera baixa — o choque na entrada da área e a bola subindo
    luckP4(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const clash = 50;
      const after = Math.max(0, t - clash);
      const hz = top + stageH * 0.5;
      const feet = bot - 24;
      const shake = t >= clash ? 14 * Math.max(0, 1 - after / 34) : 1;
      const tilt = easeIO(seg(t, clash + 4, clash + 60)) * 80;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2 - tilt, zoom: 1.08 + seg(t, 0, clash) * 0.06, shake });
      this.luckSide(ctx, S, c, { camX: 1700 + t * 2, hz });
      const k = easeIn(seg(t, 4, clash));
      // Depois do tranco os dois são jogados pra trás (inclinados, sem cair deitados)
      const rx = t < clash ? lerp(150, 560, k) : 560 - Math.min(110, ease(after / 30) * 110);
      const vx = t < clash ? lerp(1130, 720, k) : 720 + Math.min(110, ease(after / 30) * 110);
      const st = t < clash ? 'run' : 'windup';
      this.cineGlow(ctx, rx, feet - 170, 240, 'rgba(34,211,238,0.5)', 0.9);
      this.cineGlow(ctx, vx, feet - 170, 240, c.rivalGlow, 0.9);
      this.luckShadow(ctx, rx, feet, 80, 0.5);
      this.luckShadow(ctx, vx, feet, 80, 0.5);
      this.luckSpr(ctx, c.rin, rx, feet, 380, { animState: st, frame: st === 'run' ? RUNF(S.f) : 1, rim: RIN_C, rimSides: [1] });
      this.luckSpr(ctx, c.rival, vx, feet, 380, { animState: st, frame: st === 'run' ? RUNF(S.f + 4) : 1, flipX: true, rim: c.rivalRim, rimSides: [-1] });
      // A bola: no pé do Rin, depois sobe girando
      const bx = t < clash ? rx + 90 : 640 + after * 1.4;
      const by = t < clash ? feet - 14 : feet - 70 - after * 13 + after * after * 0.05;
      if (t >= clash) this.luckStreak(ctx, 640, feet - 70, bx, by + 18, 4, 22, '255,255,255', 0.5);
      this.drawAnimeBall(ctx, bx, by, 17, t >= clash ? 'rgba(253,224,71,0.6)' : 'rgba(255,255,255,0.3)', S.f);
      if (t >= clash) {
        const q = after / 40;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - q);
        ctx.lineWidth = 6;
        for (let r = 1; r <= 3; r++) {
          ctx.strokeStyle = r % 2 ? '#f8fafc' : '#facc15';
          ctx.beginPath();
          ctx.ellipse(640, feet - 120, after * 10 * r * 0.7 + 20, after * 4 * r * 0.7 + 8, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
        // Torrões de grama voando
        ctx.fillStyle = 'rgba(134,239,172,0.8)';
        for (let i = 0; i < 18; i++) {
          const a = Math.PI + rnd(i, 91) * Math.PI;
          const d = after * (4 + rnd(i, 92) * 6);
          const gy = feet - 20 + Math.sin(a) * d + after * after * 0.12;
          if (gy < feet + 10) ctx.fillRect(640 + Math.cos(a) * d, gy, 5, 5);
        }
      }
      ctx.restore();
      if (t >= clash && t < clash + 14) this.drawRadialSpeedLines(ctx, 640, feet - 120 + tilt, W, '#020617', 0.6 * (1 - (t - clash) / 14));
      this.cineFlash(ctx, W, H, t >= clash ? 0.8 * (1 - seg(t, clash, clash + 10)) : 0);
      if (t >= clash) this.cineImpactText(ctx, 'DOOOM!!', W * 0.5, top + 120, 130, '#f8fafc', seg(t, clash, clash + 8), W * 0.7, -0.08);
      if (t < clash) this.cineImpactText(ctx, `RIN x ${c.rivalShort}`, W / 2, top + 80, 44, '#e2e8f0', seg(t, 14, 24), W * 0.7, -0.04);
      this.luckScore(ctx, c, 28, top + 18, c.before[0], c.before[1], c.minute);
      this.cineSfx(S, clash, 'choque', () => window.SFX?.tackle?.());
    },

    // PLANO 5: câmera lenta olhando pro céu — a bola lá em cima, a peça da sorte brilhando;
    // todo mundo parado de costas olhando, só você aceso
    luckP5(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const k = easeIO(t / 160);
      const bx = W * 0.6 + Math.sin(t * 0.01) * 10;
      const by = top + stageH * 0.3 - k * 14;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(W / 2, bx, 0.25), y: H / 2 - k * 20, zoom: 1 + k * 0.08 });
      ctx.drawImage(this.luckSkyCv(), 0, -40 - k * 60);
      [[150, top + 40], [330, top - 20], [W - 150, top + 40], [W - 330, top - 20]].forEach(([x, y], i) => {
        this.cineGlow(ctx, x, y - k * 60, 150, 'rgba(224,242,254,0.85)', 0.9);
        this.cineShafts(ctx, x, y - k * 60, Math.atan2(by - y, bx - x), 700, 0.22, 3, '191,219,254', 0.06, t + i * 30);
      });
      // A palavra SORTE gigante e quase invisível no céu
      ctx.save();
      ctx.globalAlpha = 0.08 * seg(t, 20, 60);
      ctx.font = 'italic 900 230px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#bfdbfe';
      ctx.fillText('SORTE', W / 2 - t * 0.3, top + stageH * 0.42);
      ctx.restore();
      this.cineDust(ctx, W, H, t * 0.25, 40, 'rgba(191,219,254,0.6)', 5);
      // A bola em câmera lenta
      this.cineGlow(ctx, bx, by, 150, 'rgba(253,224,71,0.35)', 0.8);
      this.drawAnimeBall(ctx, bx, by, 46, 'rgba(253,224,71,0.3)', t * 0.08);
      // A peça da SORTE entra voando e para do lado da bola
      const pk = ease(seg(t, 30, 120));
      const px = lerp(W + 120, bx + 110, pk);
      const py = lerp(by + 260, by - 34, pk);
      this.luckPiece(ctx, px, py, 74 * (1 + (t > 120 ? Math.sin(t * 0.2) * 0.05 : 0)), (1 - pk) * 9, -0.15, 'LUCK', PAL.gold, 0.5 + 0.3 * Math.sin(t * 0.1), seg(t, 122, 146));
      if (t > 120) this.cineGlow(ctx, px, py, 70, 'rgba(255,255,255,0.7)', Math.max(0, 1 - (t - 120) / 20));
      // Primeiro plano: todos parados de costas olhando pra cima (azulados); você aceso
      // (meio corpo: cabelo + camisa, para cada um ser reconhecível de costas)
      const frozen = (ch, x, f, size) => this.luckSpr(ctx, ch, x, f, size, { facing: 'back', dim: 0.3, dimTint: '30,60,130', rim: '#93c5fd', rimSides: [-1, 1] });
      frozen(c.defender, W * 0.87, bot + 120, 330);
      frozen(c.rival, W * 0.64, bot + 130, 370);
      frozen(c.rin, W * 0.4, bot + 120, 380);
      this.cineGlow(ctx, W * 0.14, bot - 170, 230, 'rgba(0,245,212,0.4)', 0.5 + 0.5 * seg(t, 40, 90));
      this.luckSpr(ctx, c.you, W * 0.14, bot + 110, 420, { facing: 'back', rim: CYAN, rimSides: [-1, 1], rimD: 5 });
      ctx.restore();
      this.luckKicker(ctx, 40, top + 30, 'CÂMERA LENTA', seg(t, 8, 30), '#93c5fd');
    },

    // PLANO 6: close extremo nos seus olhos + as peças do quebra-cabeça se montando
    luckP6(ctx, S, c) {
      const { W, t, top, bot, stageH } = S;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, top, W, stageH);
      const rowY = top + stageH * 0.72;
      this.drawRadialSpeedLines(ctx, W / 2, rowY, W, '#0e7490', 0.25);
      this.cineGlow(ctx, W / 2, rowY, 420, 'rgba(0,245,212,0.18)', 1);
      // Faixa dos olhos (com o coração batendo dando o pulso no quadro)
      const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 0.2)), 12) * 0.02;
      const b0 = top + 20;
      const b1 = top + 224;
      const kb = ease(seg(t, 0, 14));
      ctx.save();
      ctx.translate(W / 2, (b0 + b1) / 2);
      ctx.scale(beat, beat);
      ctx.translate(-W / 2, -(b0 + b1) / 2);
      this.cinePanel(ctx, [[20, b0], [W - 20, b0], [W - 20, b1], [20, b1]], () => {
        ctx.fillStyle = '#04111a';
        ctx.fillRect(0, b0, W, b1 - b0);
        const dw = 780 + easeIO(t / 140) * 60;
        const U = dw / 14;
        const e = this.luckBand(ctx, c.you, W / 2 - dw / 2, (b0 + b1) / 2 - 3.1 * U, dw, { ring: c.you.eyeColor || '#ef4444', look: 0, tiny: t > 100 });
        // O brilho do fluxo saindo dos olhos
        const gl = ease(seg(t, 20, 70));
        if (gl > 0) {
          this.luckStreak(ctx, e.rx + 2.4 * U + gl * 520, e.ly - 0.4 * U, e.rx + 2.2 * U, e.ly, 2, 14, '0,245,212', 0.9);
          this.luckStreak(ctx, e.lx - 2.4 * U - gl * 520, e.ly - 0.4 * U, e.lx - 2.2 * U, e.ly, 2, 14, '0,245,212', 0.9);
          this.cineGlow(ctx, e.rx, e.ly, 90, 'rgba(0,245,212,0.45)', gl);
          this.cineGlow(ctx, e.lx, e.ly, 90, 'rgba(0,245,212,0.45)', gl);
        }
        ctx.fillStyle = 'rgba(0,40,60,0.18)';
        ctx.fillRect(0, b0, W, b1 - b0);
      }, { dx: (1 - kb) * -W });
      ctx.restore();
      // As peças voando e se encaixando: EGO, RIN, BOLA, [?], GOL
      const sz = 94;
      const gap = 128;
      const pieces = [
        { label: 'EGO', pal: PAL.cyan, at: 20, from: [-200, top + 40] },
        { label: 'RIN', pal: PAL.teal, at: 34, from: [W + 200, top + 60] },
        { label: 'BOLA', pal: PAL.white, at: 48, from: [-200, bot + 100] },
        { slot: true, at: 18 },
        { label: 'GOL', pal: PAL.blue, at: 62, from: [W + 200, bot + 100] }
      ];
      pieces.forEach((p, i) => {
        const x = W / 2 + (i - 2) * gap;
        if (p.slot) {
          this.luckSlot(ctx, x, rowY, sz, seg(t, p.at, p.at + 12), t);
          if (t > 80) this.cineGlow(ctx, x, rowY, 110, 'rgba(253,224,71,0.4)', 0.5 + 0.4 * Math.sin(t * 0.15));
          return;
        }
        const k = ease(seg(t, p.at, p.at + 22));
        if (k <= 0) return;
        const px = lerp(p.from[0], x, k);
        const py = lerp(p.from[1], rowY, k) + (k >= 1 ? Math.sin(t * 0.08 + i) * 2 : 0);
        this.luckPiece(ctx, px, py, sz, (1 - k) * 8, (1 - k) * (i % 2 ? 1 : -1) * 1.2, p.label, p.pal, k >= 1 ? 0.35 : 0, seg(t, p.at + 22, p.at + 40));
        if (t >= p.at + 22 && t < p.at + 34) this.cineGlow(ctx, x, rowY, 90, 'rgba(255,255,255,0.7)', 1 - (t - p.at - 22) / 12);
      });
      if (t > 104) this.cineImpactText(ctx, 'SOU EU.', W / 2, bot - 40, 64, CYAN, seg(t, 104, 114), W * 0.6, -0.05);
      [20, 34, 48, 62].forEach((a, i) => this.cineSfx(S, a + 22, 'peca' + i, () => window.SFX?.blip?.(440 + i * 110)));
    },

    // PLANO 7: o tempo parou — o mundo azul e congelado; só você corre (a câmera vai junto)
    luckP7(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const hz = top + stageH * 0.42;
      const camX = t * 10;
      const notice = 112;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.04 + easeIO(t / 160) * 0.05, shake: 0.6 });
      this.luckSide(ctx, S, c, { camX: 3000 + camX, hz, frozen: true });
      // Flashes de câmera parados no ar (congelados no meio do brilho)
      for (let i = 0; i < 12; i++) {
        let x = ((rnd(i, 101) * 2400 - camX * 0.35) % 2400 + 2400) % 2400 - 300;
        this.cineGlow(ctx, x, hz - 140 - rnd(i, 102) * 170, 14, 'rgba(219,234,254,0.9)', 0.8);
      }
      const feet = top + stageH * 0.93;
      const mid = hz + 160;
      const sx = (wx) => wx - camX;
      // O goleiro lá no fundo (anda menos: está longe)
      this.luckSpr(ctx, c.gk, 1220 - t * 3.5, hz + 120, 130, Object.assign({ flipX: true }, FROZEN));
      // Rin e o rival parados no meio do tranco, e a grama suspensa no ar
      this.luckShadow(ctx, sx(700), mid, 44, 0.35);
      this.luckShadow(ctx, sx(820), mid, 44, 0.35);
      this.luckSpr(ctx, c.rin, sx(705), mid, 240, Object.assign({ animState: 'windup' }, FROZEN));
      this.luckSpr(ctx, c.rival, sx(815), mid, 240, Object.assign({ animState: 'windup', flipX: true }, FROZEN));
      ctx.fillStyle = 'rgba(191,219,254,0.75)';
      for (let i = 0; i < 26; i++) {
        const a = Math.PI + rnd(i, 111) * Math.PI;
        const d = 40 + rnd(i, 112) * 150;
        ctx.fillRect(sx(765) + Math.cos(a) * d * 1.4, mid - 60 + Math.sin(a) * d * 0.6, 4, 4);
      }
      // A bola parada lá no alto, onde ela vai cair
      const ballX = sx(1650);
      this.cineGlow(ctx, ballX, top + 110, 60, 'rgba(191,219,254,0.5)', 0.8);
      this.drawAnimeBall(ctx, ballX, top + 110, 20, 'rgba(147,197,253,0.3)', 3);
      // O zagueiro: congelado... até perceber
      const dk = seg(t, notice, notice + 28);
      const dWX = 2300 - ease(seg(t, notice + 10, 160)) * 120;
      const dimQ = Math.round((1 - dk) * 5) / 10;
      this.luckShadow(ctx, sx(dWX), feet, 64, 0.4);
      this.luckSpr(ctx, c.defender, sx(dWX), feet, 320, dimQ > 0
        ? { animState: t > notice + 10 ? 'run' : 'idle', frame: t > notice + 10 ? RUNF(S.f) : 1, flipX: true, dim: dimQ, dimTint: '70,120,205', rim: dk > 0 ? c.awayRim : '#bfdbfe' }
        : { animState: 'run', frame: RUNF(S.f), flipX: true, rim: c.awayRim, rimSides: [-1] });
      if (t > notice) this.cineImpactText(ctx, '!', sx(dWX) + 20, feet - 330, 70, '#ef4444', seg(t, notice, notice + 8), 0, 0.1);
      // Você: o único em cores, com o rastro de luz atrás (uma faixa, nada de cópias)
      const yx = lerp(170, 620, easeIO(seg(t, 0, 150)));
      [0.42, 0.6, 0.78].forEach((q, i) => this.luckStreak(ctx, yx - 330, feet - 330 * q, yx - 50, feet - 330 * q, 2, 9 - i * 2, '0,245,212', 0.6));
      this.cineGlow(ctx, yx, feet - 160, 230, 'rgba(0,245,212,0.45)', 1);
      this.luckShadow(ctx, yx, feet, 70, 0.5);
      this.luckSpr(ctx, c.you, yx, feet, 340, { animState: 'run', frame: RUNF(S.f), rim: CYAN, rimSides: [-1, 1], rimD: 4 });
      ctx.restore();
      // Moldura do tempo parado
      ctx.save();
      ctx.strokeStyle = `rgba(0,245,212,${0.3 + Math.sin(t * 0.12) * 0.12})`;
      ctx.lineWidth = 8;
      ctx.strokeRect(10, top + 10, W - 20, stageH - 20);
      ctx.restore();
      this.luckKicker(ctx, 40, top + 36, 'O TEMPO PAROU', seg(t, 10, 40), '#93c5fd');
      this.luckScore(ctx, c, W - 428, top + 18, c.before[0], c.before[1], '⏸ ' + c.minute, 0.85);
      if (t > notice + 6) this.cineImpactText(ctx, `${c.defName} PERCEBEU!`, W * 0.7, bot - 70, 46, '#fca5a5', seg(t, notice + 6, notice + 16), W * 0.5, -0.05);
    },

    // PLANO 8: câmera no chão — a peça dourada LUCK cai, quica e para brilhando
    luckP8(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const hz = top + stageH * 0.52;
      const ground = bot - 66;
      const px = 650;
      const hits = [40, 72, 92, 102];
      let air = 0;
      if (t < 40) air = lerp(ground - top + 160, 0, easeIn(t / 40));
      else if (t < 72) air = 300 * 4 * ((t - 40) / 32) * (1 - (t - 40) / 32);
      else if (t < 92) air = 110 * 4 * ((t - 72) / 20) * (1 - (t - 72) / 20);
      else if (t < 102) air = 26 * 4 * ((t - 92) / 10) * (1 - (t - 92) / 10);
      const s = 124;
      const py = ground - s * 0.55 - air;
      const settle = seg(t, 100, 124);
      const bump = hits.reduce((m, h) => (t >= h && t < h + 6 ? Math.max(m, 4 * (1 - (t - h) / 6)) : m), 0);
      const pz = easeIO(seg(t, 96, 150));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(W / 2, px, pz), y: lerp(H / 2, py + 10, pz * 0.6), zoom: 1 + pz * 0.2, shake: bump });
      this.luckSide(ctx, S, c, { camX: 900, hz, blur: 6 });
      this.cineBokeh(ctx, W, top, hz - 30, t, 16, ['rgba(224,242,254,0.4)', 'rgba(253,224,71,0.3)', 'rgba(125,211,252,0.35)'], 8);
      // Você vindo lá de trás, cada vez mais perto
      const yk = easeIn(seg(t, 0, 150));
      const ysz = lerp(140, 300, yk);
      const yfeet = lerp(hz + 70, hz + 150, yk);
      const yx = lerp(270, 330, yk);
      this.luckShadow(ctx, yx, yfeet, ysz * 0.2, 0.4);
      this.luckSpr(ctx, c.you, yx, yfeet, ysz, { animState: 'run', frame: RUNF(S.f), rim: CYAN, rimSides: [1] });
      // Raios dourados descendo na peça
      if (t > 60) this.cineShafts(ctx, px, top - 60, Math.PI / 2, ground - top + 80, 0.42, 5, '253,224,71', 0.12 * seg(t, 60, 110), t);
      // Sombra da peça e (no fim) a sombra da bola chegando
      this.luckShadow(ctx, px, ground + 4, Math.max(20, 74 - air * 0.12), 0.5);
      const bs = seg(t, 104, 150);
      if (bs > 0) this.luckShadow(ctx, px + 150, ground + 6, 14 + bs * 30, 0.25 + bs * 0.3);
      hits.slice(0, 3).forEach((h, i) => this.luckGoldBurst(ctx, px, ground, seg(t, h, h + 20), 14, 140 - i * 30, 0.35));
      const spin = t < 100 ? t * 0.14 : Math.sin(t * 0.06) * 0.3 * (1 - settle * 0.6);
      const tilt = t < 100 ? Math.sin(t * 0.13) * 0.35 : Math.sin(t * 0.09) * 0.08 * (1 - settle * 0.7);
      this.luckPiece(ctx, px, py, s, spin, tilt, 'LUCK', PAL.gold, t >= 100 ? 0.55 + Math.sin(t * 0.2) * 0.2 : 0.25, seg(t, 112, 140));
      if (t >= 100) this.cineGlow(ctx, px, py, 220, 'rgba(253,224,71,0.35)', 0.6 + 0.2 * Math.sin(t * 0.2));
      // A bola caindo do céu no fim
      const bk = seg(t, 128, 152);
      if (bk > 0) this.drawAnimeBall(ctx, px + 150, lerp(top - 60, ground - 160, easeIn(bk)), 22, 'rgba(253,224,71,0.45)', t);
      // Grama de perto (primeiro plano)
      ctx.drawImage(this.luckGrassCv(), -160, ground - 60, 1600, 150);
      ctx.restore();
      if (t >= 100) this.luckKicker(ctx, 40, top + 36, 'A PEÇA QUE FALTAVA', seg(t, 100, 130), '#facc15');
      hits.slice(0, 3).forEach((h, i) => this.cineSfx(S, h, 'quique' + i, () => window.SFX?.blip?.(660 - i * 120)));
    },

    // PLANO 9: o chute de primeira — a peça vira luz, a bola sai antes do carrinho
    luckP9(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const kick = 40;
      const hold = 6;
      const tt = t < kick ? t : t < kick + hold ? kick : t - hold;
      const after = Math.max(0, tt - kick);
      const hz = top + stageH * 0.5;
      const feet = bot - 22;
      const shake = t >= kick ? 12 * Math.max(0, 1 - (t - kick) / 26) : 0.8;
      const z = t < kick ? 1 + seg(t, 0, kick) * 0.12 : 1.12 - seg(t, kick, kick + 40) * 0.05;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 + (t < kick ? -30 : 0), y: H / 2 + 20, zoom: z, shake });
      this.luckSide(ctx, S, c, { camX: 1200 + tt * 1.5, hz, blur: 6 });
      this.cineBokeh(ctx, W, top, hz - 30, t, 12, ['rgba(224,242,254,0.35)', 'rgba(125,211,252,0.35)'], 12);
      const yx = t < 24 ? lerp(230, 420, ease(t / 24)) : 420;
      const st = t < 24 ? 'run' : t < kick ? 'windup' : 'shoot';
      const cx = 520;
      const cy = feet - 34;
      // A peça no chão; no chute ela estoura em luz dourada
      if (t < kick) {
        this.luckShadow(ctx, cx + 30, feet + 2, 40, 0.4);
        this.luckPiece(ctx, cx + 40, feet - 40, 66, Math.sin(t * 0.06) * 0.2, 0.04, 'LUCK', PAL.gold, 0.6, -1);
      } else {
        const q = seg(t, kick, kick + 26);
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * TAU;
          const d = ease(q) * (90 + rnd(i, 121) * 120);
          ctx.fillStyle = `rgba(253,224,71,${1 - q})`;
          ctx.fillRect(cx + 40 + Math.cos(a) * d, feet - 40 + Math.sin(a) * d * 0.6, 6, 6);
        }
        this.cineGlow(ctx, cx + 40, feet - 40, 160, 'rgba(253,224,71,0.8)', 1 - q);
      }
      this.cineGlow(ctx, yx, feet - 200, 280, 'rgba(0,245,212,0.45)', 1);
      this.luckShadow(ctx, yx, feet, 90, 0.5);
      this.luckSpr(ctx, c.you, yx, feet, 460, { animState: st, frame: st === 'run' ? RUNF(S.f) : 1, rim: CYAN, rimSides: [-1, 1], rimD: 5 });
      // A bola: cai do céu até o pé e sai disparada
      let bx;
      let by;
      if (tt < kick) {
        const q = tt / kick;
        bx = lerp(600, cx, q);
        by = lerp(top - 80, cy, q * q);
      } else {
        bx = cx + after * 52;
        by = cy - after * 8;
        this.luckStreak(ctx, cx, cy, bx - 10, by, 6, 34, '0,245,212', 0.85);
      }
      this.drawAnimeBall(ctx, bx, by, 24, t < kick ? 'rgba(253,224,71,0.5)' : 'rgba(0,245,212,0.6)', S.f);
      // O carrinho do zagueiro chegando tarde
      const dx = lerp(1500, 780, ease(seg(t, 20, 70)));
      this.luckShadow(ctx, dx, feet + 6, 90, 0.45);
      this.luckSpr(ctx, c.defender, dx, feet + 10, 400, { animState: 'slide', flipX: true, rim: c.awayRim, rimSides: [-1] });
      if (t >= kick && t < kick + 30) {
        ctx.save();
        ctx.globalAlpha = 1 - (t - kick) / 30;
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 6;
        for (let r = 1; r <= 2; r++) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, (t - kick) * 8 * r + 20, (t - kick) * 4 * r + 10, -0.2, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      if (t >= kick && t < kick + hold + 10) this.drawRadialSpeedLines(ctx, cx, cy, W, '#020617', 0.55);
      this.cineFlash(ctx, W, H, t >= kick ? 0.85 * (1 - seg(t, kick, kick + 9)) : 0);
      if (t >= kick) this.cineImpactText(ctx, 'DOM!!', W * 0.76, top + 130, 140, '#f8fafc', seg(t, kick, kick + 8), W * 0.5, -0.12);
      if (t > 66) this.cineImpactText(ctx, 'CHUTE DIRETO!', W * 0.3, top + 80, 56, CYAN, seg(t, 66, 76), W * 0.5, -0.06);
      this.cineSfx(S, kick, 'chute', () => window.SFX?.kick?.(1));
    },

    // PLANO 10: a câmera colada na bola — o zagueiro e o goleiro passam e ficam pra trás
    luckP10(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const hz = top + stageH * 0.36;
      const bx = lerp(520, 700, t / 120);
      const by = top + stageH * 0.5 + Math.sin(t * 0.12) * 8;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.02, rot: Math.sin(t * 0.04) * 0.03, shake: 3 });
      this.luckSide(ctx, S, c, { camX: 4000 + t * 80, hz, blur: 6, par: 0.5, noGlow: true });
      this.drawSpeedLines(ctx, W, H, '#e0f2fe', 0.35);
      this.drawSpeedLines(ctx, W, H, CYAN, 0.18);
      // Zagueiro passando por baixo da bola
      const dk = seg(t, 6, 50);
      if (dk > 0 && dk < 1) this.luckSpr(ctx, c.defender, lerp(1600, -500, dk), by + 330, 560, { animState: 'slide', flipX: true, rim: c.awayRim, dim: 0.15, dimTint: '2,6,23' });
      this.luckStreak(ctx, bx - 520, by + 20, bx - 40, by, 4, 80, '0,245,212', 0.55);
      this.luckStreak(ctx, bx - 300, by + 8, bx - 40, by, 2, 36, '255,255,255', 0.6);
      this.cineGlow(ctx, bx, by, 170, 'rgba(0,245,212,0.5)', 1);
      this.drawAnimeBall(ctx, bx, by, 62, 'rgba(0,245,212,0.55)', S.f * 1.6);
      // Goleiro voando por cima, a luva passa raspando
      const gk = seg(t, 58, 108);
      if (gk > 0 && gk < 1) this.luckSpr(ctx, c.gk, lerp(1700, -500, gk), by + 30, 620, { animState: 'dive', flipX: true, rim: '#fef08a', dim: 0.1, dimTint: '2,6,23' });
      ctx.restore();
      if (t > 22 && t < 64) this.cineImpactText(ctx, `PASSOU PELO ${c.defName}!`, W / 2, top + 70, 46, '#f8fafc', seg(t, 22, 32), W * 0.8, -0.04);
      if (t > 76) this.cineImpactText(ctx, `${c.gkShort} NÃO ALCANÇA!`, W / 2, bot - 60, 50, '#facc15', seg(t, 76, 86), W * 0.8, -0.04);
      this.cineSfx(S, 4, 'vento', () => window.SFX?.whoosh?.());
      this.cineSfx(S, 70, 'luva', () => window.SFX?.whoosh?.());
    },

    // PLANO 11: de trás da rede — a bola vem, a rede estufa na cara da câmera, o placar vira
    luckP11(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const hit = 34;
      const hx = W * 0.62;
      const hy = top + stageH * 0.36;
      const shake = t >= hit ? 12 * Math.max(0, 1 - (t - hit) / 30) : 0.6;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1 + seg(t, hit, 140) * 0.05, shake });
      ctx.drawImage(this.luckGoalBg(c), 0, 0);
      [200, 520, 840, 1160].forEach((x) => this.cineGlow(ctx, x, 130, 120, 'rgba(224,242,254,0.75)', 1));
      // Lá no campo: o goleiro caído, você depois do chute (e comemorando), o Rin parado
      this.luckSpr(ctx, c.rin, W * 0.78, 432, 120, { rim: RIN_C, rimSides: [-1] });
      this.luckSpr(ctx, c.defender, W * 0.9, 454, 140, { animState: 'slide', flipX: true, dim: 0.15, dimTint: '2,6,23' });
      const yst = t > 70 ? 'call_pass' : 'shoot';
      this.luckSpr(ctx, c.you, W * 0.55, 442 - (t > 70 ? Math.abs(Math.sin((t - 70) * 0.15)) * 14 : 0), 150, { animState: yst, rim: CYAN, rimSides: [-1, 1] });
      this.luckShadow(ctx, W * 0.32, 520, 80, 0.4);
      this.luckSpr(ctx, c.gk, W * 0.32, 530, 280, { animState: 'dive', facing: 'back', flipX: true, rim: '#fef08a', dim: 0.15, dimTint: '2,6,23' });
      // Traves (de trás)
      const pg = ctx.createLinearGradient(0, 0, 40, 0);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(70, top + 30, 26, bot - top);
      ctx.fillRect(W - 96, top + 30, 26, bot - top);
      ctx.fillRect(70, top + 30, W - 140, 22);
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.fillRect(88, top + 52, 8, bot - top);
      ctx.fillRect(W - 78, top + 52, 8, bot - top);
      ctx.fillRect(70, top + 46, W - 140, 6);
      void pg;
      // A bola vindo (cresce com a perspectiva) e batendo na rede
      let bx;
      let by;
      let br;
      if (t < hit) {
        const q = t / hit;
        bx = lerp(W * 0.55 + 20, hx, q);
        by = lerp(430, hy, q);
        br = lerp(7, 56, q * q);
        if (q > 0.2) this.luckStreak(ctx, lerp(W * 0.55 + 20, bx, 0.5), lerp(430, by, 0.5), bx, by, 2, br * 1.2, '0,245,212', 0.5);
      } else {
        const w = Math.max(0, 1 - (t - hit) / 50);
        bx = hx;
        by = hy + (t - hit) * 0.6;
        br = 56 + Math.sin((t - hit) * 0.5) * 8 * w + 10 * w;
      }
      this.drawAnimeBall(ctx, bx, by, br, 'rgba(0,245,212,0.5)', S.f * 1.4);
      // A rede em primeiro plano, estufando em volta do ponto do impacto
      const A = t >= hit ? Math.sin((t - hit) * 0.28) * Math.exp(-(t - hit) / 30) * 0.9 + 0.35 * Math.exp(-(t - hit) / 60) : 0;
      const sig2 = 2 * 210 * 210;
      const pt = (x, y) => {
        if (!A) return [x, y];
        const dx = x - hx;
        const dy = y - hy;
        const m = 1 + A * Math.exp(-(dx * dx + dy * dy) / sig2);
        return [hx + dx * m, hy + dy * m];
      };
      ctx.save();
      ctx.strokeStyle = 'rgba(241,245,249,0.42)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const step = 46;
      for (let gx = -2; gx <= W / step + 2; gx++) {
        for (let gy = -1; gy <= stageH / step + 2; gy++) {
          const x = gx * step + (gy % 2) * step * 0.5;
          const y = top + gy * step;
          const p0 = pt(x, y);
          const p1 = pt(x + step * 0.5, y + step);
          const p2 = pt(x - step * 0.5, y + step);
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p2[0], p2[1]);
        }
      }
      ctx.stroke();
      ctx.restore();
      if (t >= hit && t < hit + 30) {
        const q = (t - hit) / 30;
        ctx.save();
        ctx.globalAlpha = 1 - q;
        ctx.lineWidth = 5;
        for (let r = 1; r <= 3; r++) {
          ctx.strokeStyle = r % 2 ? CYAN : '#facc15';
          ctx.beginPath();
          ctx.arc(hx, hy, (t - hit) * 6 * r + 30, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (t > hit + 20) this.drawConfetti(ctx, W, H, t - hit, 60);
      ctx.restore();
      this.cineFlash(ctx, W, H, t >= hit ? 0.8 * (1 - seg(t, hit, hit + 9)) : 0);
      this.luckKinetic(ctx, 'GOOOOOL!!', W / 2, top + stageH * 0.62, 120, CYAN, t, hit + 8, 3, -0.06);
      const flipped = t > hit + 30;
      this.luckScore(ctx, c, 28, top + 18, flipped ? c.after[0] : c.before[0], flipped ? c.after[1] : c.before[1], flipped ? 'FIM DE JOGO' : c.minute, 1, flipped ? Math.max(0, 1 - (t - hit - 30) / 40) + 0.2 : 0);
      this.cineSfx(S, hit, 'gol', () => window.SFX?.goal?.(true));
    },

    // PLANO 12: o estádio explode — fogos, papel picado, a torcida pulando e você no meio
    luckP12(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const hz = top + stageH * 0.66;
      const orbit = easeIO(t / 140);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 + lerp(-40, 40, orbit), y: H / 2, zoom: lerp(1.12, 1.02, orbit), shake: t < 30 ? 6 * (1 - t / 30) : 0.8 });
      this.luckSide(ctx, S, c, { camX: 5000 + t * 3, hz });
      // A onda de luz do estouro e os fogos em cima da cobertura
      if (t < 60) {
        const q = 1 - t / 60;
        this.cineGlow(ctx, W / 2, hz - 150, 260 + t * 8, 'rgba(254,249,195,0.7)', q);
        this.cineShafts(ctx, W / 2, hz - 150, -Math.PI / 2, 300 + t * 14, TAU, 14, '254,240,138', 0.22 * q, t);
      }
      const fw = [[220, top + 60, 4], [980, top + 40, 12], [620, top + 20, 24], [380, top + 90, 38], [1120, top + 100, 50], [760, top + 70, 62], [160, top + 40, 74], [1000, top + 60, 86], [480, top + 50, 98], [1180, top + 80, 108], [300, top + 110, 118], [860, top + 30, 126]];
      fw.forEach(([x, y, at], i) => this.luckFirework(ctx, x, y, t - at, c.crowd[i % 3] === '#0f2942' ? '#38bdf8' : ['#facc15', c.crowd[0], '#f8fafc', CYAN][i % 4], 24, 120 + (i % 3) * 30));
      for (let i = 0; i < 24; i++) {
        const a = Math.max(0, Math.sin(t * 0.09 + i * 2.1));
        if (a < 0.55) continue;
        this.cineGlow(ctx, rnd(i, 131) * W, hz - 40 - rnd(i, 132) * 230, 12, 'rgba(255,255,255,0.9)', (a - 0.55) * 2.2);
      }
      this.cineShafts(ctx, 200, top - 20, 1.1 + Math.sin(t * 0.03) * 0.3, 700, 0.2, 2, '191,219,254', 0.08, t);
      this.cineShafts(ctx, 1080, top - 20, 2.0 + Math.sin(t * 0.03 + 1) * 0.3, 700, 0.2, 2, '191,219,254', 0.08, t);
      // Você no meio, braço pra cima
      const feet = bot + 150;
      this.cineGlow(ctx, W / 2, feet - 360, 300, 'rgba(0,245,212,0.4)', 1);
      const jump = Math.abs(Math.sin(t * 0.1)) * 10;
      this.luckSpr(ctx, c.you, W / 2, feet - jump, 520, { animState: 'call_pass', rim: CYAN, rimSides: [-1, 1], rimD: 5 });
      this.drawConfetti(ctx, W, H, t + 120, 90);
      this.luckFans(ctx, W, bot + 40, t, 1.15, 'rgba(125,211,252,0.7)', 3);
      ctx.restore();
      // Escurece o alto para o letreiro (os refletores estouravam o texto)
      const dkk = seg(t, 40, 60);
      if (dkk > 0) this.cineGradient(ctx, 0, top, W, 250, [[0, `rgba(1,3,11,${0.8 * dkk})`], [0.7, `rgba(1,3,11,${0.45 * dkk})`], [1, 'rgba(1,3,11,0)']]);
      this.cineTitleCard(ctx, W, top + 92, seg(t, 46, 78), { kicker: c.kicker, title: c.bigTitle, sub: '', color: CYAN });
      const ks = ease(seg(t, 70, 90));
      if (ks > 0) {
        ctx.save();
        ctx.globalAlpha = ks;
        ctx.font = 'italic 900 30px "Segoe UI", sans-serif';
        const txt = `${c.home}  ${c.after[0]} x ${c.after[1]}  ${c.away}`;
        const w = ctx.measureText(txt).width + 50;
        ctx.fillStyle = 'rgba(2,6,23,0.88)';
        ctx.fillRect(W / 2 - w / 2, top + 170, w, 48);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(W / 2 - w / 2, top + 170, w, 3);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(txt, W / 2, top + 195);
        ctx.restore();
      }
      if (t >= 46) this.cineFlash(ctx, W, H, (1 - seg(t, 46, 58)) * 0.4);
      this.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
    },

    // PLANO 13: o estádio comemora ao fundo; o Rin parado na sombra, olhando
    luckP13(ctx, S, c) {
      const { W, H, t, top, bot, stageH } = S;
      const hz = top + stageH * 0.5;
      const push = easeIO(seg(t, 0, 150));
      const rx = W * 0.27;
      const eyeY = top + stageH * 0.44;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(W / 2, rx + 120, push * 0.5), y: lerp(H / 2, eyeY + 40, push * 0.4), zoom: 1 + push * 0.12 });
      this.luckSide(ctx, S, c, { camX: 7000, hz, blur: 6 });
      this.cineBokeh(ctx, W, top, hz, t, 14, ['rgba(250,204,21,0.35)', 'rgba(224,242,254,0.4)'], 15);
      // A festa lá atrás: você e o time pulando
      const party = [[c.mates[0], 860, 8], [c.you, 960, 0], [c.mates[1], 1070, 4]];
      party.forEach(([ch, x, ph]) => {
        const j = Math.abs(Math.sin(t * 0.14 + ph)) * 16;
        this.luckSpr(ctx, ch, x, hz + 150 - j, 190, { animState: 'call_pass', rim: ch === c.you ? CYAN : '#e0f2fe', rimSides: [-1, 1] });
      });
      this.drawConfetti(ctx, W, H, t + 300, 50);
      // O lado do Rin fica na sombra
      const shade = ctx.createLinearGradient(0, 0, W * 0.66, 0);
      shade.addColorStop(0, 'rgba(1,6,10,0.85)');
      shade.addColorStop(1, 'rgba(1,6,10,0)');
      ctx.fillStyle = shade;
      ctx.fillRect(-200, 0, W + 400, H);
      // A aura escura começando a tremular (contorno, sem borrão)
      const ak = seg(t, 50, 120);
      if (ak > 0) {
        ctx.save();
        ctx.globalAlpha = ak * 0.8;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const a = Math.PI * 0.95 + (i / 40) * Math.PI * 1.1;
          const r = 300 + Math.sin(i * 1.7 + t * 0.12) * 22 + Math.pow(Math.abs(Math.sin(i * 0.9 + t * 0.05)), 3) * 50;
          const x = rx + Math.cos(a) * r * 0.82;
          const y = eyeY + 140 + Math.sin(a) * r;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.fillStyle = 'rgba(2,26,29,0.55)';
        ctx.fill();
        this.glowStroke(ctx, RIN_C, 3);
        ctx.restore();
      }
      const h = this.luckHead(ctx, c.rin, rx, eyeY, 640, { dim: 0.35, dimTint: '0,20,26', rim: RIN_C, rimSides: [1], rimD: 4 });
      this.luckEyes(ctx, rx, eyeY, h.u, { ring: RIN_C, iris: '#0f766e', look: 1, angry: true, tiny: t > 70 });
      ctx.restore();
      // Faixa de mangá: os olhos do Rin, de perto
      const ke = ease(seg(t, 96, 112));
      if (ke > 0) {
        const y0 = top + stageH * 0.64;
        this.cinePanel(ctx, [[W * 0.42, y0], [W - 24, y0 - 30], [W - 24, y0 + 120], [W * 0.42, y0 + 150]], () => {
          ctx.fillStyle = '#010409';
          ctx.fillRect(W * 0.4, y0 - 40, W * 0.6, 200);
          const dw = 640;
          const U = dw / 14;
          this.luckBand(ctx, c.rin, W * 0.71 - dw / 2, y0 + 60 - 3.1 * U, dw, { ring: RIN_C, iris: '#0f766e', angry: true, tiny: true, look: 1 });
          ctx.fillStyle = 'rgba(2,24,30,0.3)';
          ctx.fillRect(W * 0.4, y0 - 40, W * 0.6, 200);
        }, { dx: (1 - ke) * W * 0.6 });
      }
    }
  });

  // ==========================================================================
  // REGISTRO: o mesmo filme para os dois jogos
  // ==========================================================================
  ['u20_direct_shoot', 'u20_final_goal'].forEach((type) => {
    CE.registerCine(type, {
      phases: [140, 140, 130, 120, 160, 140, 160, 150, 110, 120, 140, 140, 150],
      // o tema da Sub-20 no jogo do Estádio Nacional; a final contra a França fica com o épico
      music: type === 'u20_direct_shoot' ? 'u20' : 'epic',
      get title() {
        return CE.luckCfg(type).title;
      },
      get tags() {
        return CE.luckTags(type);
      },
      get subs() {
        return CE.luckSubs(type);
      },
      draw(ctx, S) {
        this.luckDraw(ctx, S, type);
      }
    });
  });
})();
