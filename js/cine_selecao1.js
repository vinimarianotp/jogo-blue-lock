// ============================================================================
// CENAS DA 1ª SELEÇÃO (Time X, Time Y, Time W) — ver js/cine_kit.js — prefixo zsel
//   barou_king      • Time Z x Time X (derrota): a estreia → o Rei atravessa sozinho →
//                     gol, gol, gol → "você não tem talento nenhum" → você no chão, a mão
//   barou_king_win  • a mesma estreia, mas o Time Z vira: o Rei não acredita e te olha
//                     com ódio pela primeira vez
//   ego_victory     • Time Z x Time Y: o Niko leu tudo → você lê um passo depois → o gol
//                     → o Niko de joelhos → vencer é bom DEMAIS → o monstro no rosto
//   kuon_betrayal   • Time Z x Time W: os gêmeos sabem as jogadas → o vestiário → o Kuon
//                     confessa → egoísmo sem gol é só traição
//   chigiri_sprint  • o joelho → "se quebrar, quebrou" → a arrancada vermelha → o gol
// Usa os bonecos guardados da cine_final (finSpr/finHead/finCrop), o rincStamp/rincShade da
// cine_rin, o wcdRim/wcdEyes/wcdPixelize da cine_wildcard e o estádio/gol/bola da cine_partida.
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas, sem tela piscando (um flash por
// impacto), olhos em close em pixel art, frame 0 = piscada (não usar).
// Nenhuma cena mostra placar exato (o jogo não força resultado).
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
  const line = (ctx, a, b) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  // Quadros da corrida (4 por ciclo: cada um é um boneco guardado; o 0 é a piscada)
  const RUNF = (f, sp = 3) => 1 + (Math.floor(f / sp) % 4) * 4;
  // Perspectiva do campo do Prédio 5 (ponto de fuga no meio, chão em y = 720)
  const HZ = 236;
  const ZF = 5;
  const PP = (x, y, z) => [640 + (x - 640) / z, HZ + (y - HZ) / z];

  const YOU_C = '#00f5d4';
  const NARR_C = '#94a3b8';
  const BAROU_C = '#ef4444';
  const NIKO_C = '#fca5a5';
  const KUON_C = '#a5b4fc';
  const RAICHI_C = '#facc15';
  const WANIMA_C = '#4ade80';
  const CHI_C = '#fb7185';
  const BACHIRA_C = '#fde047';
  const KX = { jerseyPrimary: '#111827', jerseySecondary: '#dc2626' };
  const KY = { jerseyPrimary: '#b91c1c', jerseySecondary: '#0a0a0a', zStripes: true };
  const THEME = 'bluelock_bunker';

  // ==========================================================================
  // HELPERS (prefixo zsel)
  // ==========================================================================
  Object.assign(CE, {
    zselCast() {
      const bl = this.KITS.blueLock;
      const z = (id, extra = {}) => this.cineChar(id, Object.assign({}, bl, extra));
      return {
        you: this.cineYou(Object.assign({}, bl)),
        // (a boca não entra na chave do boneco guardado: o nome diferente separa as versões)
        youGrin: this.cineYou(Object.assign({ mouth: 'grin', name: (window.App?.state?.profile?.name || 'Você') + ' • sorriso' }, bl)),
        bachira: z('bachira'),
        kunigami: z('kunigami'),
        chigiri: z('chigiri'),
        raichi: z('raichi', { angry: true }),
        igarashi: z('igarashi'),
        kuon: z('kuon'),
        imamura: z('imamura'),
        iemon: this.cineChar('iemon'),
        barou: this.cineChar('barou', Object.assign({}, KX)),
        barouA: this.cineChar('barou', Object.assign({ angry: true }, KX)),
        xa: this.cineChar('gen_teamx_a'),
        xb: this.cineChar('gen_teamx_b'),
        xc: this.cineChar('gen_teamx_c'),
        gkx: this.cineChar('gk_teamx'),
        niko: this.cineChar('niko', Object.assign({ name: 'Ikki Niko (Time Y)' }, KY)),
        okawa: this.cineChar('okawa', { zStripes: true }),
        ya: this.cineChar('gen_teamy_a', { zStripes: true }),
        gky: this.cineChar('gk_teamy'),
        wj: this.cineChar('wanima_junichi'),
        wk: this.cineChar('wanima_keisuke'),
        wjG: this.cineChar('wanima_junichi', { mouth: 'grin', name: 'Junichi Wanima • sorriso' }),
        wkG: this.cineChar('wanima_keisuke', { mouth: 'grin', name: 'Keisuke Wanima • sorriso' }),
        wa: this.cineChar('gen_teamw_a'),
        gkw: this.cineChar('gk_teamw')
      };
    },
    zselNum() {
      return window.App?.state?.profile?.number || 11;
    },
    zselWin() {
      return this.sakugaType === 'barou_king_win';
    },

    // ------------------------------------------------------------------ camisa listrada
    // Mesma chave do finSprEntry: o boneco listrado (Time Y: vermelho com listras pretas
    // verticais) entra no cache dele e todos os helpers fin*/wcd* passam a usá-lo
    zselKey(char, base, o) {
      return [
        base, char.id || '', char.name || '', char.jerseyPrimary, char.jerseySecondary, char.angry ? 1 : 0, char.outfit || '', char.clothesColor || '',
        char.hairColor, char.hairSecondary, char.skinColor, char.eyeColor, char.hairStyle, char.eyeStyle || '', char.hat || '',
        o.facing || 'front', o.animState || 'idle', o.frame || 45, o.flipX ? 1 : 0, o.tint || '', o.dim || 0, o.dimTint || '', o.shirtNumber || '', o.showAura ? 1 : 0
      ].join('|');
    },
    zselEnsure(char, base, o = {}) {
      if (!char || !char.zStripes || o.tint) return;
      if (o.rim) {
        this.zselEnsure(char, base, Object.assign({}, o, { rim: null }));
        return;
      }
      const cache = this._finSpr || (this._finSpr = new Map());
      const key = this.zselKey(char, base, o);
      const old = cache.get(key);
      if (old && old.zs) return;
      const pad = Math.ceil(base * 0.45);
      const cv = document.createElement('canvas');
      cv.width = base + pad * 2;
      cv.height = Math.ceil(base * 1.1) + pad * 2;
      const g = cv.getContext('2d');
      g.translate(pad, pad);
      window.PixelRenderer.drawCharacterSprite(g, char, base, base * 1.1, {
        facing: o.facing || 'front', animState: o.animState || 'idle', frame: o.frame || 45, flipX: !!o.flipX, showAura: !!o.showAura, shirtNumber: o.shirtNumber
      });
      g.setTransform(1, 0, 0, 1, 0, 0);
      const s = base / 36;
      const x0 = Math.floor(pad + 12.4 * s);
      const y0 = Math.floor(pad + 12 * s);
      const w = Math.ceil(11.2 * s);
      const h = Math.ceil(12.5 * s);
      const img = g.getImageData(x0, y0, w, h);
      const d = img.data;
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const i = (py * w + px) * 4;
          if (d[i + 3] < 200 || d[i] < 100 || d[i + 1] > 90 || d[i + 2] > 90) continue;
          const ux = (x0 + px + 0.5 - pad) / s;
          const on = (ux > 14.6 && ux < 15.6) || (ux > 17.5 && ux < 18.5) || (ux > 20.4 && ux < 21.4);
          if (!on) continue;
          d[i] = Math.round(d[i] * 0.12);
          d[i + 1] = Math.round(d[i + 1] * 0.12);
          d[i + 2] = Math.round(d[i + 2] * 0.12);
        }
      }
      g.putImageData(img, x0, y0);
      if (o.dim) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = `rgba(${o.dimTint || '0,0,0'},${o.dim})`;
        g.fillRect(0, 0, cv.width, cv.height);
        g.globalCompositeOperation = 'source-over';
      }
      // as montagens com luz de recorte feitas com o boneco sem listras saem do cache
      if (old) [...cache.keys()].forEach((k) => k.endsWith('|' + key) && cache.delete(k));
      cache.set(key, { cv, pad, base, key, zs: true });
    },
    zselBase(size) {
      return size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
    },
    zselSpr(ctx, char, x, feet, size, o = {}) {
      this.zselEnsure(char, this.zselBase(size), o);
      this.finSpr(ctx, char, x, feet, size, o);
    },
    zselRim(ctx, char, x, feet, size, o, color, sides = [-1, 1], rimD = 1) {
      this.zselEnsure(char, this.zselBase(size), o);
      this.wcdRim(ctx, char, x, feet, size, o, color, sides, rimD);
    },
    zselHead(ctx, char, cx, eyeY, size, o = {}) {
      this.zselEnsure(char, 180, o);
      return this.finHead(ctx, char, cx, eyeY, size, o);
    },
    // De joelhos: o corpo até as coxas desce até o chão (as canelas ficam para trás);
    // de costas, as solas das chuteiras aparecem embaixo dos joelhos
    zselKneel(ctx, char, x, feet, size, o = {}, cutU = 26.4) {
      this.zselEnsure(char, 180, o);
      const e = this.finSprEntry(char, 180, o);
      const k = size / 180;
      const cut = Math.round(e.pad + cutU * 5);
      const u = size / 36;
      const drop = (31.3 - cutU) * u;
      const ox = x - size / 2 - e.pad * k;
      const oy = feet - size * 0.87 - e.pad * k + drop;
      ctx.save();
      ctx.imageSmoothingEnabled = size < 180;
      if (o.facing === 'back' && !o.tint) {
        ctx.fillStyle = '#05070d';
        [-3.4, 2.2].forEach((dx) => ctx.fillRect(Math.round(x + (dx - 0.5) * u), Math.round(feet - 1.4 * u), Math.ceil(2.6 * u), Math.ceil(1.9 * u)));
        ctx.fillStyle = o.dim > 0.5 ? '#1e293b' : '#334155';
        [-3.4, 2.2].forEach((dx) => ctx.fillRect(Math.round(x + dx * u), Math.round(feet - 1.1 * u), Math.ceil(1.6 * u), Math.ceil(1.2 * u)));
      }
      ctx.drawImage(e.cv, 0, 0, e.cv.width, cut, ox, oy, e.cv.width * k, cut * k);
      ctx.restore();
    },
    // (aquecimento) o vestiário pronto, sozinho num quadro
    zselWarmLocker() {
      this.finBg('rinc_locker', 1280, 720, this.rincLockerBg);
    },
    zselShadow(ctx, x, y, rx, a = 0.4) {
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.18, 0, 0, TAU);
      ctx.fill();
    },
    // Ponto do mundo → ponto da tela (mesma conta do cineCamera, sem a tremida)
    zselToScreen(S, cam, x, y) {
      const z = cam.zoom || 1;
      return [S.W / 2 + (x - cam.x) * z, S.H / 2 + (y - cam.y) * z];
    },
    // Aquecimento: durante o plano 1, um "ensaio" por quadro (num canvas minúsculo) monta os
    // bonecos, fundos e brilhos que os próximos planos usam
    zselWarm(S, list) {
      if (S.phase !== 0 || S.t < 3) return;
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._zselWarmRun !== run) {
        this._zselWarmRun = run;
        this._zselWarmIdx = 0;
      }
      if (this._zselWarmIdx >= list.length) return;
      const [name, phase, t] = list[this._zselWarmIdx++];
      const def = this.CINE[this.sakugaType];
      if (!this._zselDry) {
        this._zselDry = document.createElement('canvas');
        this._zselDry.width = 64;
        this._zselDry.height = 36;
      }
      const g = this._zselDry.getContext('2d');
      const top = Math.round(720 * (def.letterbox ?? 0.12));
      const dur = def.phases[phase];
      const DS = { W: 1280, H: 720, t, phase, dur, p: t / dur, f: t + phase * 100, top, bot: 720 - top, stageH: 720 - top * 2 };
      const sfx = this.cineSfx;
      this.cineSfx = () => {};
      const pw = this._ptdWarming;
      this._ptdWarming = true;
      try {
        g.save();
        g.scale(0.05, 0.05);
        this[name](g, DS);
      } finally {
        g.restore();
        this.cineSfx = sfx;
        this._ptdWarming = pw;
      }
    },

    // ------------------------------------------------------------------ o campo do Prédio 5
    zselPitchBg(g, w, h) {
      const q = (pts, f) => {
        g.fillStyle = f;
        poly(g, pts);
        g.fill();
      };
      const XL = -1100;
      const XR = 2380;
      const YC = -900;
      const YG = 720;
      g.fillStyle = '#02050c';
      g.fillRect(0, 0, w, h);
      // teto
      q([PP(XL, YC, 1), PP(XR, YC, 1), PP(XR, YC, ZF), PP(XL, YC, ZF)], '#040812');
      g.strokeStyle = 'rgba(30,41,59,0.7)';
      g.lineWidth = 2;
      for (let x = XL; x <= XR; x += 290) line(g, PP(x, YC, 1), PP(x, YC, ZF));
      // paredes dos lados
      [[XL, '#132743', '#0a1528'], [XR, '#122540', '#0a1528']].forEach(([X, c0, c1]) => {
        const a = PP(X, 0, 1)[0];
        const b = PP(X, 0, ZF)[0];
        const gr = g.createLinearGradient(a, 0, b, 0);
        gr.addColorStop(0, c0);
        gr.addColorStop(1, c1);
        q([PP(X, YC, 1), PP(X, YC, ZF), PP(X, YG, ZF), PP(X, YG, 1)], gr);
        // janelas de observação lá em cima (vidro escuro com luz fria)
        const zs = [1.1, 1.38, 1.7, 2.08, 2.55, 3.1, 3.75, 4.5];
        for (let i = 0; i < zs.length - 1; i++) {
          const z0 = zs[i] + 0.04;
          const z1 = zs[i + 1] - 0.04;
          q([PP(X, -560, z0), PP(X, -560, z1), PP(X, -300, z1), PP(X, -300, z0)], 'rgba(56,189,248,0.10)');
          g.strokeStyle = 'rgba(125,211,252,0.28)';
          g.lineWidth = 1.5;
          poly(g, [PP(X, -560, z0), PP(X, -560, z1), PP(X, -300, z1), PP(X, -300, z0)]);
          g.stroke();
        }
        g.strokeStyle = 'rgba(3,7,16,0.7)';
        g.lineWidth = 2;
        zs.forEach((z) => line(g, PP(X, YC, z), PP(X, YG, z)));
        // faixa ciano e as placas de LED na altura do gramado
        q([PP(X, 300, 1), PP(X, 300, ZF), PP(X, 314, ZF), PP(X, 314, 1)], 'rgba(34,211,238,0.75)');
        q([PP(X, 600, 1), PP(X, 600, ZF), PP(X, YG, ZF), PP(X, YG, 1)], '#0b1d4d');
        for (let z = 1.05; z < ZF; z *= 1.16) q([PP(X, 630, z), PP(X, 630, z * 1.07), PP(X, 690, z * 1.07), PP(X, 690, z)], 'rgba(56,189,248,0.45)');
      });
      // parede do fundo, a moldura do telão e a placa
      q([PP(XL, YC, ZF), PP(XR, YC, ZF), PP(XR, YG, ZF), PP(XL, YG, ZF)], '#091327');
      const s0 = PP(250, -640, ZF);
      const s1 = PP(1030, -30, ZF);
      g.fillStyle = '#1e293b';
      g.fillRect(s0[0] - 4, s0[1] - 4, s1[0] - s0[0] + 8, s1[1] - s0[1] + 8);
      g.fillStyle = '#020409';
      g.fillRect(s0[0], s0[1], s1[0] - s0[0], s1[1] - s0[1]);
      const b0 = PP(XL, 600, ZF);
      const b1 = PP(XR, YG, ZF);
      g.fillStyle = '#0b1d4d';
      g.fillRect(b0[0], b0[1], b1[0] - b0[0], b1[1] - b0[1]);
      g.fillStyle = 'rgba(56,189,248,0.5)';
      for (let x = b0[0] + 6; x < b1[0] - 10; x += 22) g.fillRect(x, b0[1] + 6, 12, 8);
      // gramado em faixas
      const zs = [1, 1.16, 1.35, 1.58, 1.86, 2.2, 2.62, 3.14, 3.8, 4.6, ZF];
      for (let i = 0; i < zs.length - 1; i++) q([PP(XL, YG, zs[i]), PP(XR, YG, zs[i]), PP(XR, YG, zs[i + 1]), PP(XL, YG, zs[i + 1])], i % 2 ? '#104a37' : '#135842');
      let gr = g.createLinearGradient(0, PP(0, YG, ZF)[1], 0, h);
      gr.addColorStop(0, 'rgba(2,6,16,0.55)');
      gr.addColorStop(0.5, 'rgba(2,6,16,0.1)');
      gr.addColorStop(1, 'rgba(2,6,16,0.25)');
      g.fillStyle = gr;
      g.fillRect(0, PP(0, YG, ZF)[1], w, h);
      // linhas do campo
      g.strokeStyle = 'rgba(226,232,240,0.62)';
      g.lineWidth = 3;
      const GL = 4.7;
      line(g, PP(-760, YG, 1), PP(-760, YG, GL));
      line(g, PP(2040, YG, 1), PP(2040, YG, GL));
      line(g, PP(-760, YG, GL), PP(2040, YG, GL));
      line(g, PP(-760, YG, 1.62), PP(2040, YG, 1.62));
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU;
        const p = PP(640 + Math.cos(a) * 300, YG, 1.62 + Math.sin(a) * 0.2);
        if (i) g.lineTo(p[0], p[1]);
        else g.moveTo(p[0], p[1]);
      }
      g.stroke();
      g.lineWidth = 2;
      poly(g, [PP(230, YG, GL), PP(230, YG, 3.85), PP(1050, YG, 3.85), PP(1050, YG, GL)]);
      g.stroke();
      poly(g, [PP(460, YG, GL), PP(460, YG, 4.42), PP(820, YG, 4.42), PP(820, YG, GL)]);
      g.stroke();
      // o gol do fundo (rede + traves)
      g.strokeStyle = 'rgba(226,232,240,0.3)';
      g.lineWidth = 1;
      for (let i = 0; i <= 10; i++) line(g, PP(lerp(530, 750, i / 10), 600, GL + 0.18), PP(lerp(530, 750, i / 10), YG, GL + 0.18));
      for (let i = 0; i <= 4; i++) line(g, PP(530, lerp(600, YG, i / 4), GL + 0.18), PP(750, lerp(600, YG, i / 4), GL + 0.18));
      g.strokeStyle = '#f1f5f9';
      g.lineWidth = 3;
      line(g, PP(530, YG, GL), PP(530, 596, GL));
      line(g, PP(750, YG, GL), PP(750, 596, GL));
      line(g, PP(528, 596, GL), PP(752, 596, GL));
      // luminárias do teto e a luz no gramado
      [1.12, 1.4, 1.75, 2.2, 2.75, 3.45, 4.3].forEach((z) => {
        q([PP(380, YC, z), PP(900, YC, z), PP(900, YC, z + 0.07), PP(380, YC, z + 0.07)], '#e0f2fe');
        const c = PP(640, YC, z + 0.04);
        this.cineGlow(g, c[0], c[1] + 8 / z, 220 / z, 'rgba(186,230,253,0.4)');
        const f = PP(640, YG, z + 0.25);
        g.save();
        g.translate(f[0], f[1]);
        g.scale(1.6, 0.32);
        this.cineGlow(g, 0, 0, 260 / z, 'rgba(190,242,220,0.16)');
        g.restore();
      });
    },
    // O campo + o telão do fundo (o telão é desenhado por cima, com o texto do jogo)
    zselPitch(ctx, t, lines, dark = 0) {
      ctx.drawImage(this.finBg('zsel_pitch', 1280, 720, this.zselPitchBg), 0, 0);
      const s0 = PP(250, -640, ZF);
      const s1 = PP(1030, -30, ZF);
      this.zselScreen(ctx, s0[0], s0[1], s1[0] - s0[0], s1[1] - s0[1], t, lines);
      if (dark > 0) {
        ctx.fillStyle = `rgba(2,4,10,${dark})`;
        ctx.fillRect(-300, -300, 1880, 1320);
      }
    },
    // Telão de LED: lines = [{ text, color, y (0..1), px }]
    zselScreen(ctx, x, y, w, h, t, lines = []) {
      ctx.save();
      this.cineGlow(ctx, x + w / 2, y + h / 2, w * 0.9, 'rgba(56,189,248,0.22)');
      this.cineGradient(ctx, x, y, w, h, [[0, '#072447'], [1, '#03101f']]);
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      lines.forEach((l) => this.finPixelText(ctx, l.text, x + w / 2, y + h * l.y, l.px || h * 0.012, l.color || '#e0f2fe', 'center', w * 0.92));
      this.finFillPat(ctx, 'scan', x, y, w, h, 0.8);
      const by = y + ((t * 0.8) % (h * 1.6)) - h * 0.3;
      ctx.fillStyle = 'rgba(186,230,253,0.07)';
      ctx.fillRect(x, by, w, h * 0.16);
      ctx.restore();
    },
    // Placar grande de LED (sem números: o jogo não força resultado)
    zselLed(ctx, x, y, w, h, t, o = {}) {
      ctx.save();
      ctx.fillStyle = '#05070c';
      ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
      this.cineGradient(ctx, x, y, w, h, [[0, '#06162c'], [1, '#020814']]);
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      if (o.top) this.finPixelText(ctx, o.top, x + w / 2, y + h * 0.2, h * 0.016, o.topColor || '#facc15', 'center', w * 0.8);
      const lw = w * 0.34;
      const glowL = o.leftOn ? 0.75 + 0.25 * Math.sin(t * 0.12) : 0;
      if (glowL) this.cineGlow(ctx, x + w * 0.24, y + h * 0.6, lw * 0.8, 'rgba(56,189,248,0.4)', glowL);
      this.finPixelText(ctx, o.left || 'TIME Z', x + w * 0.24, y + h * 0.6, h * 0.04, o.leftOn ? '#e0f2fe' : '#64748b', 'center', lw);
      this.finPixelText(ctx, o.right || 'TIME X', x + w * 0.76, y + h * 0.6, h * 0.04, o.rightOn ? '#fecaca' : '#475569', 'center', lw);
      this.finPixelText(ctx, o.mid || 'x', x + w / 2, y + h * 0.6, h * 0.03, '#94a3b8', 'center', w * 0.12);
      if (o.leftOn) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + w * 0.07, y + h * 0.84, lw, 4);
      }
      this.finFillPat(ctx, 'scan', x, y, w, h, 0.9);
      const by = y + ((t * 1.2) % (h * 1.8)) - h * 0.4;
      ctx.fillStyle = 'rgba(186,230,253,0.06)';
      ctx.fillRect(x, by, w, h * 0.2);
      ctx.restore();
    },

    // ------------------------------------------------------------------ pecinhas em pixel
    // Mão aberta, palma para cima (manga do Blue Lock, pele do perfil)
    zselHandCv(skin = '#f3d1b8') {
      return this.wcdPixelize('zsel_hand|' + skin, 18, 22, (g) => {
        const S = skin;
        const D = this.finShade(skin, -0.16);
        const L = this.finShade(skin, 0.35);
        const C = this.finShade(skin, -0.3);
        [[2, 7], [5, 4], [8, 3], [11, 4]].forEach(([x, y0]) => {
          g.fillStyle = S;
          g.fillRect(x, y0, 2, 11 - y0);
          g.fillStyle = L;
          g.fillRect(x, y0, 1, 10 - y0);
          g.fillStyle = C;
          g.fillRect(x, y0 + Math.floor((11 - y0) / 2), 2, 1);
        });
        g.fillStyle = S;
        g.fillRect(2, 10, 11, 6);
        g.fillStyle = D;
        g.fillRect(11, 10, 2, 6);
        g.fillRect(2, 15, 11, 1);
        g.fillStyle = C;
        [[4, 12], [5, 12], [6, 13], [7, 13], [8, 11], [9, 11], [10, 12]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
        g.fillStyle = S;
        poly(g, [[12.5, 11], [16, 7.5], [17.6, 8.6], [14.6, 14], [12.5, 14]]);
        g.fill();
        g.fillStyle = D;
        g.fillRect(13, 13, 2, 1);
        g.fillStyle = S;
        g.fillRect(4, 16, 8, 3);
        g.fillStyle = D;
        g.fillRect(10, 16, 2, 3);
        g.fillStyle = '#0f2942';
        g.fillRect(3, 18, 10, 4);
        g.fillStyle = '#38bdf8';
        g.fillRect(3, 18, 10, 1);
        g.fillRect(11, 19, 2, 3);
      }, '#1a1410');
    },
    // Rachaduras serrilhadas (o joelho, a memória quebrando)
    zselCracks(ctx, cx, cy, r, k, color = '#fecaca', seed = 3, n = 7) {
      if (k <= 0) return;
      ctx.save();
      ctx.lineJoin = 'miter';
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rnd(i, seed) * 0.6;
        const len = r * (0.5 + rnd(i, seed + 1) * 0.6) * ease(k);
        const pts = [[cx, cy]];
        for (let j = 1; j <= 5; j++) {
          const d = (len * j) / 5;
          const aa = a + (rnd(i * 5 + j, seed + 2) - 0.5) * 0.7;
          pts.push([cx + Math.cos(aa) * d, cy + Math.sin(aa) * d]);
        }
        [['#020617', 6], [color, 2.5]].forEach(([col, lw]) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          pts.forEach(([x, y], m) => (m ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        });
      }
      ctx.restore();
    },
    // Prancheta vista de cima: o Time Z (ciano) e o Time Y (vermelho).
    // o.red = linhas da leitura do Niko, o.cross = as jogadas riscadas, o.cyan = o seu caminho
    zselTactics(ctx, x, y, w, h, t, o = {}) {
      const P = (u, v) => [x + u * w, y + v * h];
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      this.cineGradient(ctx, x, y, w, h, [[0, '#0b3b2d'], [1, '#062319']]);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.02)';
        ctx.fillRect(x, y + (i * h) / 8, w, h / 8);
      }
      ctx.strokeStyle = 'rgba(226,232,240,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + w * 0.05, y + h * 0.04, w * 0.9, h * 0.92);
      line(ctx, P(0.05, 0.5), P(0.95, 0.5));
      ctx.strokeRect(x + w * 0.28, y + h * 0.04, w * 0.44, h * 0.16);
      ctx.strokeRect(x + w * 0.4, y + h * 0.04, w * 0.2, h * 0.06);
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.5, w * 0.1, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x + w * 0.44, y + h * 0.02, w * 0.12, h * 0.02);
      const Z = [[0.18, 0.66], [0.4, 0.56], [0.64, 0.62], [0.82, 0.52], [0.52, 0.8], [0.3, 0.42]];
      const Y = [[0.24, 0.46], [0.47, 0.4], [0.62, 0.44], [0.78, 0.34], [0.5, 0.22]];
      const Ztgt = [[0.22, 0.36], [0.42, 0.26], [0.7, 0.3], [0.86, 0.22], [0.58, 0.5], [0.34, 0.2]];
      // as jogadas do Time Z (setas tracejadas)
      ctx.setLineDash([8, 7]);
      ctx.lineWidth = 3;
      Z.forEach(([u, v], i) => {
        if (i === 1) return;
        ctx.strokeStyle = 'rgba(56,189,248,0.75)';
        line(ctx, P(u, v), P(...Ztgt[i]));
      });
      ctx.setLineDash([]);
      // a leitura do Niko: linhas vermelhas que chegam antes
      const red = o.red || 0;
      if (red > 0) {
        ctx.strokeStyle = 'rgba(248,113,113,0.95)';
        ctx.lineWidth = 3;
        Z.forEach((zp, i) => {
          if (i === 1) return;
          const yp = Y[i % Y.length];
          const k = clamp(red * 1.6 - i * 0.12);
          if (k <= 0) return;
          const a = P(...yp);
          const b = P(...Ztgt[i]);
          line(ctx, a, [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
        });
      }
      const cross = o.cross || 0;
      if (cross > 0) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        Ztgt.forEach(([u, v], i) => {
          if (i === 1 || clamp(cross * 1.5 - i * 0.1) <= 0) return;
          const [px, py] = P(u, v);
          line(ctx, [px - 10, py - 10], [px + 10, py + 10]);
          line(ctx, [px + 10, py - 10], [px - 10, py + 10]);
        });
      }
      // jogadores
      const dot = (p, col, r, label) => {
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(p[0], p[1], r + 3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(p[0], p[1], r, 0, TAU);
        ctx.fill();
        if (label) {
          ctx.font = '900 12px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#020617';
          ctx.fillText(label, p[0], p[1] + 1);
        }
      };
      Y.forEach((p, i) => dot(P(...p), '#ef4444', i === 1 ? 13 : 9, i === 1 ? '7' : ''));
      Z.forEach((p, i) => dot(P(...p), i === 1 ? YOU_C : '#38bdf8', i === 1 ? 12 : 9, ''));
      // o seu caminho: um passo DEPOIS da leitura dele (passa pelas costas do Niko)
      const cy = o.cyan || 0;
      if (cy > 0) {
        const path = (q) => {
          const a = P(0.4, 0.56);
          const b = P(0.6, 0.3);
          const c = P(0.53, 0.06);
          const m = 1 - q;
          return [m * m * a[0] + 2 * m * q * b[0] + q * q * c[0], m * m * a[1] + 2 * m * q * b[1] + q * q * c[1]];
        };
        const n = Math.max(2, Math.floor(30 * cy));
        this.cineGlow(ctx, ...path(cy), 50, 'rgba(0,245,212,0.6)');
        [['rgba(2,6,23,0.9)', 9], [YOU_C, 5]].forEach(([col, lw]) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          for (let i = 0; i <= n; i++) {
            const p = path((i / n) * cy);
            if (i) ctx.lineTo(p[0], p[1]);
            else ctx.moveTo(p[0], p[1]);
          }
          ctx.stroke();
        });
      }
      ctx.restore();
    },
    // Mechas de cabelo vermelho cortando a tela atrás de quem corre
    zselHairStreaks(ctx, x, y, t, len, color = '226,55,79', n = 7, spread = 60) {
      ctx.save();
      for (let i = 0; i < n; i++) {
        const yy = y + (i - n / 2) * (spread / n) + Math.sin(t * 0.25 + i * 1.7) * 6;
        const L = len * (0.55 + rnd(i, 9) * 0.6);
        const w = 4 + rnd(i, 10) * 10;
        const g = ctx.createLinearGradient(x, 0, x - L, 0);
        g.addColorStop(0, `rgba(${i % 3 === 0 ? '255,122,138' : color},0.95)`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, yy - w / 2);
        ctx.quadraticCurveTo(x - L * 0.5, yy - w / 2 + Math.sin(t * 0.2 + i) * 14, x - L, yy);
        ctx.quadraticCurveTo(x - L * 0.5, yy + w / 2 + Math.sin(t * 0.2 + i) * 14, x, yy + w / 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
    // Fundo de close: degradê na cor + linhas radiais girando devagar
    zselCloseBg(ctx, S, color, cx, rays = 0.1, rot = 0) {
      this.ptdCloseBg(ctx, S, color, cx);
      if (rays > 0) this.ptdRays(ctx, cx, S.H * 0.45, S.W * 1.1, color, rays, rot, 40, 0.025);
    },
    // Palavra que bate letra por letra (sem sair da tela)
    zselStamp(ctx, text, x, y, size, color, t, t0, step = 2, maxW = 0, align = 'center', alpha = 1) {
      return this.rincStamp(ctx, text, x, y, size, color, t, t0, step, maxW, align, alpha);
    }
  });

  // ==========================================================================
  // 1. O REI (Time Z x Time X) — derrota e vitória
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — o campo do Prédio 5: o Time Z de costas, o Time X do outro lado, o Rei no meio
    zselBarou0(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.zselCast();
      const k = easeIO(t / S.dur);
      const bz = 2.05;
      const [bx, bf] = PP(640, 720, bz);
      const cam = { x: 640, y: lerp(372, bf - 92, k), zoom: lerp(1.0, 1.75, k), shake: 0.5 };
      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      this.zselPitch(ctx, t, [{ text: 'TIME Z  x  TIME X', y: 0.42, px: 1.3 }, { text: '1ª SELEÇÃO • JOGO 1', y: 0.74, px: 0.8, color: '#facc15' }]);
      const team = [[c.gkx, 640, 4.45], [c.xb, 340, 2.75], [c.xc, 940, 2.6], [c.xa, 470, 2.35]];
      // (abre do preto: os bonecos entram nos primeiros quadros, um grupo por vez, para o 1º quadro não travar)
      if (t >= 2) team.forEach(([ch, x, z]) => {
        const [px, pf] = PP(x, 720, z);
        this.zselShadow(ctx, px, pf, 46 / z, 0.35);
        this.finSpr(ctx, ch, px, pf, 330 / z, { dim: 0.25, dimTint: '6,10,24' });
      });
      // o Rei: luz vermelha atrás dele
      ctx.save();
      ctx.translate(bx, bf);
      ctx.scale(1.4, 0.3);
      this.cineGlow(ctx, 0, 0, 120, 'rgba(239,68,68,0.45)');
      ctx.restore();
      this.cineGlow(ctx, bx, bf - 100, 130, 'rgba(239,68,68,0.28)', 0.8 + 0.2 * Math.sin(t * 0.06));
      this.zselShadow(ctx, bx, bf, 26, 0.45);
      this.zselRim(ctx, c.barou, bx, bf, 330 / bz, { dim: 0.08, dimTint: '30,6,6' }, '#f87171', [-1, 1], 1);
      ctx.restore();
      // o Time Z em primeiro plano, de costas (passa pelos lados conforme a câmera entra)
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1, shake: 0.9 });
      const spread = 1 + k * 0.9;
      const grow = 1 + k * 0.35;
      const num = this.zselNum();
      [[c.chigiri, 110, 380, 44], [c.kunigami, 1190, 400, 50], [c.bachira, 980, 420, 8], [c.you, 320, 450, num]].forEach(([ch, x0, s, n], i) => {
        if (t < 3 + i) return;
        const x = 640 + (x0 - 640) * spread;
        this.wcdRim(ctx, ch, x, S.bot + s * 0.3 * grow, s * grow, { facing: 'back', dim: 0.5, dimTint: '3,8,20', shirtNumber: n }, '#38bdf8', [x < 640 ? 1 : -1], 2);
      });
      ctx.restore();
      if (t > 150) {
        const [sx, sy] = this.zselToScreen(S, cam, bx, bf - 330 / bz - 18);
        this.ptdChip(ctx, 'SHOUEI BAROU • "O REI"', sx, sy, BAROU_C, seg(t, 150, 166), { size: 15 });
      }
      this.finKicker(ctx, 40, top + 30, 'BLUE LOCK • PRÉDIO 5 • 1ª SELEÇÃO', seg(t, 6, 48));
      this.finKicker(ctx, 40, top + 58, 'A ESTREIA: TIME Z x TIME X', seg(t, 34, 84), '#ef4444');
      this.cineFlash(ctx, W, H, 1 - seg(t, 0, 16), '#000000');
      this.cineSfx(S, 24, 'apito', () => window.SFX?.whistle?.(1));
    },

    // PLANO 2 — o Rei atravessa sozinho: três marcadores voando para longe, e o chute
    zselBarou1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const feet = 604;
      const shootAt = 238;
      const pan = t * 11 + (t > shootAt ? (t - shootAt) * -6 : 0);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.04, shake: 1.2 + (t > shootAt ? 6 * (1 - seg(t, shootAt, shootAt + 24)) : 0) });
      this.ptdArena(ctx, S, pan, { theme: THEME, hc: '#38bdf8', ac: '#ef4444', sign: 'BLUE LOCK • PRÉDIO 5 • TIME Z x TIME X' });
      ctx.fillStyle = 'rgba(30,4,4,0.22)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      this.ptdSpeed(ctx, S, t, '#fecaca', 0.22, 1, 46, 16, top + 20, feet - 40, 7);
      const bx = W * 0.36 + Math.sin(t * 0.05) * 10;
      const defs = [[c.kuon, 62, 'DOM!'], [c.raichi, 128, 'DOM!!'], [c.igarashi, 192, 'DOOM!!']];
      defs.forEach(([ch, at, word], i) => {
        const u = t - at;
        if (u < -70) return;
        if (u < 0) {
          const x = bx + 110 - u * 12;
          this.zselShadow(ctx, x, feet, 50, 0.3);
          this.finSpr(ctx, ch, x, feet, 270, { animState: 'run', frame: RUNF(S.f + i), flipX: true });
          return;
        }
        if (u > 70) return;
        const k = seg(u, 0, 30);
        const x = bx + 90 - u * 8 + Math.sin(i) * 20;
        const y = feet - Math.sin(k * Math.PI) * (110 + i * 20) + (u > 30 ? (u - 30) * 3 : 0);
        ctx.save();
        ctx.globalAlpha = 1 - seg(u, 46, 70);
        this.finSpr(ctx, ch, x, y, 270, { animState: 'dive', frame: 1, flipX: i % 2 === 0 });
        ctx.restore();
        if (u < 20) this.cineImpactText(ctx, word, bx + 150, feet - 300 - i * 16, 60 + i * 10, '#fecaca', seg(u, 0, 6), 0, -0.1 + i * 0.08);
      });
      const anim = t < shootAt - 20 ? 'run' : t < shootAt ? 'windup' : 'shoot';
      this.cineGlow(ctx, bx, feet - 140, 170, 'rgba(239,68,68,0.3)');
      this.zselShadow(ctx, bx, feet, 60, 0.4);
      this.finSpr(ctx, c.barou, bx, feet, 300, { animState: anim, frame: anim === 'run' ? RUNF(S.f) : 1, showAura: true });
      if (t < shootAt) {
        this.ptdBall(ctx, bx + 66 + Math.abs(Math.sin(t * 0.3)) * 10, feet - 16, 18, t * 0.5);
      } else {
        const k = seg(t, shootAt, shootAt + 20);
        const tail = [];
        for (let i = 0; i < 6; i++) tail.push({ x: lerp(bx + 80, W + 120, Math.max(0, k - i * 0.06)), y: lerp(feet - 30, top + 120, Math.max(0, k - i * 0.06)) });
        this.ptdStreak(ctx, tail, '#ef4444', 30, 0.9);
        if (k < 1) this.ptdBall(ctx, lerp(bx + 80, W + 120, k), lerp(feet - 30, top + 120, k), 22, t);
      }
      ctx.restore();
      defs.forEach(([, at], i) => this.cineSfx(S, at, 'tranco' + i, () => window.SFX?.tackle?.()));
      if (t >= shootAt) {
        this.cineImpactText(ctx, 'BANG!!', W * 0.72, top + 120, 110, '#ef4444', seg(t, shootAt, shootAt + 8), 0, -0.08);
        this.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, shootAt, shootAt + 10)), '#fee2e2');
      }
      this.ptdChip(ctx, 'O REI ATRAVESSA O CAMPO SOZINHO', 30, bot - 40, BAROU_C, seg(t, 8, 22) * (1 - seg(t, 220, 236)), { size: 14, left: true });
      this.cineSfx(S, shootAt, 'chute', () => window.SFX?.kick?.(1));
    },

    // PLANO 3 — gol, e outro, e mais outro (página de mangá)
    zselBarou2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const mid = 368;
      // A: a rede estufando, o Iemon atrasado
      const kA = ease(seg(t, 0, 16));
      this.finPanel(ctx, [[24, top + 14], [720, top + 14], [690, mid - 8], [24, mid + 6]], () => {
        const u = t;
        const hit = 22;
        ctx.save();
        ctx.translate(-30, top - 70);
        ctx.scale(0.6, 0.6);
        const geo = this.ptdGoalView(ctx, S, { theme: THEME, hc: '#38bdf8', ac: '#ef4444' });
        const kk = seg(u, 4, hit + 10);
        this.finSpr(ctx, c.iemon, lerp(W * 0.5, W * 0.4, ease(kk)), geo.gy1 + 6 - Math.sin(kk * Math.PI) * 30, 300, { animState: kk > 0.2 ? 'dive' : 'idle', frame: 1, flipX: true });
        const st = u >= hit ? Math.min(1, (u - hit) / 6) * Math.max(0.3, 1 - (u - hit) / 120) : 0;
        this.ptdGoalFront(ctx, geo, W * 0.3, 320, st);
        const bk = seg(u, 0, hit);
        this.ptdBall(ctx, u >= hit ? W * 0.3 : lerp(W * 0.5, W * 0.3, bk), u >= hit ? 326 : lerp(H, 320, ease(bk)), u >= hit ? 26 : lerp(60, 28, bk), u * 0.7, u >= hit ? null : '#ef4444');
        ctx.restore();
        ctx.fillStyle = 'rgba(40,4,4,0.18)';
        ctx.fillRect(0, top, 760, mid);
        this.zselStamp(ctx, 'GOL.', 560, mid - 70, 64, '#fecaca', u, hit, 3);
      }, { dx: (1 - kA) * -760 });
      // B: o Rei de costas, braço erguido
      const kB = ease(seg(t, 40, 56));
      if (kB > 0) {
        this.finPanel(ctx, [[742, top + 14], [W - 24, top + 14], [W - 24, mid - 22], [712, mid - 8]], () => {
          this.cineGradient(ctx, 700, top, 600, mid - top, [[0, '#1a0505'], [1, '#050204']]);
          this.cineShafts(ctx, 1000, top - 30, Math.PI / 2, 340, 0.7, 4, '254,202,202', 0.12, t);
          this.cineGlow(ctx, 1000, mid - 60, 240, 'rgba(239,68,68,0.45)');
          this.wcdRim(ctx, c.barou, 1000, mid + 40, 290, { facing: 'back', animState: 'call_pass', frame: 1, dim: 0.28, dimTint: '30,4,4', shirtNumber: 13 }, '#fca5a5', [-1, 1], 2);
          this.zselStamp(ctx, 'O REI.', 1150, top + 70, 46, '#fecaca', t, 58, 3);
        }, { dx: (1 - kB) * 600 });
      }
      // C: GOL. GOL. GOL.
      const kC = ease(seg(t, 92, 108));
      if (kC > 0) {
        this.finPanel(ctx, [[24, mid + 22], [652, mid + 8], [632, bot - 14], [24, bot - 14]], () => {
          ctx.fillStyle = '#2a0505';
          ctx.fillRect(0, mid, 680, bot - mid);
          this.ptdRays(ctx, 330, mid + 140, 700, '#ef4444', 0.35, t * 0.003, 36);
          [[110, 150, 46, -0.12], [140, 330, 62, 0.06], [170, 500, 82, -0.08]].forEach(([at, x, s, r]) => {
            if (t >= at) this.cineImpactText(ctx, 'GOL.', x, mid + 60 + (s - 46) * 2.2, s, '#fee2e2', seg(t, at, at + 7), 0, r);
          });
        }, { dy: (1 - kC) * 300 });
      }
      // D: o seu rosto, as pupilas encolhendo
      const kD = ease(seg(t, 150, 166));
      if (kD > 0) {
        this.finPanel(ctx, [[674, mid + 8], [W - 24, mid - 6], [W - 24, bot - 14], [654, bot - 14]], () => {
          this.cineGradient(ctx, 640, mid, 660, bot - mid, [[0, '#0a1530'], [1, '#03060f']]);
          const r = this.finHead(ctx, c.you, 960, mid + 120, 620, { dim: 0.35, dimTint: '4,10,30' });
          this.wcdEyes(ctx, 960, mid + 120, r.u, { ring: '#38bdf8', iris: '#0c4a6e', tiny: true, look: [0, 1, 0, -1][Math.floor(t / 3) % 4] });
          const dy = ease(seg(t, 170, 240)) * 2.6 * r.u;
          ctx.fillStyle = 'rgba(186,230,253,0.9)';
          ctx.fillRect(Math.round(960 + 6.8 * r.u), Math.round(mid + 120 - 2.4 * r.u + dy), Math.ceil(r.u * 0.5), Math.ceil(r.u * 0.8));
        }, { dx: (1 - kD) * 640 });
      }
      [22, 110, 140, 170].forEach((at, i) => this.cineSfx(S, at, 'gol' + i, () => window.SFX?.kick?.(i ? 0.6 : 0.9)));
    },

    // PLANO 4 (derrota) — "Você não tem talento nenhum." / "Some do meu campo."
    zselBarou3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const cut = 170;
      if (t < cut) {
        const k = easeIO(t / cut);
        this.zselCloseBg(ctx, S, '#ef4444', 420, 0.06, t * 0.002);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640 + this.cineNoise(t * 0.5, 2) * 3, y: 360, zoom: 1 + k * 0.06 });
        // você lá atrás, pequeno e apagado
        this.finSpr(ctx, c.you, 1000, bot + 60, 420, { dim: 0.62, dimTint: '6,10,28' });
        const x = 440;
        const eyeY = 330;
        const r = this.finHead(ctx, c.barouA, x, eyeY, 900, { dim: 0.12, dimTint: '40,4,4', rim: '#f87171', rimSides: [1], rimD: 2 });
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.foxcGrad(ctx, x - 16 * r.u, eyeY + 6 * r.u, 32 * r.u, 12 * r.u, [[0, 'rgba(239,68,68,0)'], [1, 'rgba(239,68,68,0.22)']]);
        ctx.restore();
        this.wcdEyes(ctx, x, eyeY, r.u, { ring: '#ef4444', iris: '#450a0a', look: 1, angry: true, glow: 'rgba(239,68,68,0.3)' });
        ctx.restore();
        this.zselStamp(ctx, 'VOCÊ NÃO TEM', 1000, top + 70, 38, '#fecaca', t, 34, 2, 480);
        this.zselStamp(ctx, 'TALENTO NENHUM.', 1000, top + 128, 58, '#ef4444', t, 64, 3, 520);
        return;
      }
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      this.zselCloseBg(ctx, S, '#38bdf8', 640, 0.05);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02 + k * 0.05, shake: 0.6 + (u >= 34 ? 6 * (1 - seg(u, 34, 60)) : 0) });
      const r = this.finHead(ctx, c.you, 600, 344, 760, { dim: 0.25, dimTint: '4,10,30' });
      this.wcdEyes(ctx, 600, 344, r.u, { ring: '#38bdf8', iris: '#0c4a6e', tiny: u > 30, look: u > 30 ? [0, 1, 0, -1][Math.floor(u / 3) % 4] : 0 });
      const dy = ease(seg(u, 40, 140)) * 3 * r.u;
      ctx.fillStyle = 'rgba(186,230,253,0.9)';
      ctx.fillRect(Math.round(600 - 7.4 * r.u), Math.round(344 - 2 * r.u + dy), Math.ceil(r.u * 0.5), Math.ceil(r.u * 0.8));
      ctx.restore();
      // o ombro do Rei passando por você (primeiro plano) e saindo de quadro
      const sx = lerp(1060, 1720, easeIO(seg(u, 70, 150)));
      this.wcdRim(ctx, c.barou, sx, bot + 600, 1100, { facing: 'back', dim: 0.85, dimTint: '8,2,2', shirtNumber: 13 }, '#ef4444', [-1], 4);
      this.cineImpactText(ctx, 'SOME DO MEU CAMPO.', 470, bot - 70, 70, '#ef4444', seg(u, 34, 44), 760, -0.04);
      if (u >= 34) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(u, 34, 46)), '#fee2e2');
      this.cineSfx(S, cut + 34, 'some', () => window.SFX?.kick?.(1));
      this.cineSfx(S, 64, 'talento', () => window.SFX?.kick?.(0.5));
    },

    // PLANO 5 (derrota) — você de joelhos no meio do campo → a mão
    zselBarou4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const cut = 150;
      if (t < cut) {
        const k = easeIO(t / cut);
        const yz = 1.6;
        const [yx, yf] = PP(580, 720, yz);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: lerp(600, 640, k), y: lerp(yf - 90, 345, k), zoom: lerp(2.0, 1.1, k), shake: 0.4 });
        this.zselPitch(ctx, t, [{ text: 'FIM DE JOGO', y: 0.3, px: 1.1, color: '#e0f2fe' }, { text: 'DERROTA', y: 0.66, px: 1.8, color: '#ef4444' }], 0.32);
        const s0 = PP(250, -640, ZF);
        const s1 = PP(1030, -30, ZF);
        this.cineGlow(ctx, (s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2, 150, 'rgba(239,68,68,0.3)', 0.8 + 0.2 * Math.sin(t * 0.1));
        // o Time X comemorando lá no fundo, o Rei indo embora sem olhar para trás
        [[c.xa, 470, 3.3], [c.xc, 820, 3.5], [c.xb, 600, 3.9]].forEach(([ch, x, z], i) => {
          const [px, pf] = PP(x, 720, z);
          const hop = Math.abs(Math.sin(t * 0.12 + i)) * 8 / z * 3;
          this.finSpr(ctx, ch, px, pf - hop, 330 / z, { animState: 'call_pass', frame: 1, dim: 0.3, dimTint: '6,8,20' });
        });
        const bz = lerp(2.2, 2.9, t / cut);
        const [bx, bf] = PP(780, 720, bz);
        this.zselRim(ctx, c.barou, bx, bf, 330 / bz, { facing: 'back', animState: 'run', frame: RUNF(S.f, 6), dim: 0.3, dimTint: '10,4,4', shirtNumber: 13 }, '#f87171', [-1, 1], 1);
        // você de joelhos, sozinho num círculo de luz
        ctx.save();
        ctx.translate(yx, yf);
        ctx.scale(1.5, 0.32);
        this.cineGlow(ctx, 0, 0, 150, 'rgba(186,230,253,0.3)');
        ctx.restore();
        this.zselShadow(ctx, yx, yf, 60, 0.5);
        this.zselKneel(ctx, c.you, yx, yf, 330 / yz, { facing: 'back', dim: 0.35, dimTint: '4,10,28', shirtNumber: this.zselNum() });
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'FIM DE JOGO • TIME Z x TIME X', seg(t, 6, 44));
        this.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
        return;
      }
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#02050c'], [0.55, '#06101e'], [0.56, '#0a2a1f'], [1, '#04120c']]);
      this.cineBokeh(ctx, W, top + 10, top + 160, t, 10, ['rgba(186,230,253,0.32)', 'rgba(56,189,248,0.22)'], 6);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.06, shake: 0.4 });
      // o seu rosto lá atrás, olhando para baixo (fora de foco: apagado)
      const r = this.finHead(ctx, c.you, 860, 300, 760, { dim: 0.55, dimTint: '3,8,20' });
      this.wcdEyes(ctx, 860, 300, r.u, { ring: '#38bdf8', iris: '#0c4a6e', tiny: true, half: true, lid: this.finShade(c.you.skinColor || '#f3d1b8', -0.45) });
      ctx.fillStyle = 'rgba(3,8,20,0.35)';
      ctx.fillRect(0, 0, W, H);
      // a mão, tremendo
      const hv = this.zselHandCv(c.you.skinColor || '#f3d1b8');
      const px = 17;
      const tr = 1 - seg(u, 120, 170) * 0.7;
      const dx = Math.round(this.cineNoise(S.f * 2.7, 3) * 3 * tr);
      const dyy = Math.round(this.cineNoise(S.f * 2.3, 9) * 2 * tr);
      const hx = 200 + dx;
      const hy = 300 + dyy;
      this.cineGlow(ctx, hx + 150, hy + 180, 260, 'rgba(186,230,253,0.16)');
      this.wcdPix(ctx, hv, hx, hy, px);
      // uma gota cai na palma
      if (u > 70) {
        const dk = seg(u, 70, 96);
        const gy = lerp(top - 20, hy + 11.5 * px, dk * dk);
        if (dk < 1) {
          ctx.fillStyle = 'rgba(186,230,253,0.9)';
          ctx.fillRect(hx + 7 * px, gy, px * 0.8, px * 1.3);
        } else {
          const a = u - 96;
          ctx.strokeStyle = `rgba(186,230,253,${0.9 * (1 - seg(a, 0, 30))})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(hx + 7.4 * px, hy + 11.8 * px, 8 + a * 2, 2 + a * 0.5, 0, 0, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
      this.zselStamp(ctx, 'TÃO LONGE...', 960, bot - 70, 56, '#bae6fd', u, 110, 3, 520);
      const fo = seg(u, 150, S.dur - cut);
      if (fo > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fo * 0.85})`;
        ctx.fillRect(0, 0, W, H);
      }
      this.cineSfx(S, cut + 96, 'gota', () => window.SFX?.blip?.(880));
    },

    // PLANO 4 (vitória) — a virada: o seu chute → a rede → o Rei sem acreditar
    zselBarou3w(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const shot = 46;
      const cut = 150;
      if (t < shot) {
        this.ptdImpactBg(ctx, S, W * 0.62, H * 0.58, '#0a1430', '#e0f2fe', t * 0.003);
        ctx.save();
        this.cineCamera(ctx, W, H, { zoom: 1.04, shake: t > 30 ? 8 * (1 - seg(t, 30, 46)) : 1 });
        this.finSpr(ctx, c.you, W * 0.38, H * 1.04, 620, { animState: t < 30 ? 'windup' : 'shoot', frame: 1, rim: '#0a1430', rimD: 4 });
        this.ptdRings(ctx, W * 0.62, H * 0.6, seg(t, 30, 60), ['#0a1430', YOU_C, '#0a1430'], 340);
        const sq = t >= 30 && t < 35 ? 0.68 : 1;
        this.ptdBall(ctx, W * 0.62, H * 0.6, 44, t * 0.7, null, 2 - sq, sq);
        ctx.restore();
        if (t >= 30) {
          this.cineImpactText(ctx, 'AGORA!!', W * 0.76, top + 110, 96, YOU_C, seg(t, 30, 37), 0, -0.1);
          this.cineFlash(ctx, W, H, 0.7 * (1 - seg(t, 30, 38)));
        }
        this.cineSfx(S, 30, 'chute', () => window.SFX?.kick?.(1));
        return;
      }
      if (t < cut) {
        const u = t - shot;
        const hit = 24;
        const isHit = u >= hit;
        ctx.save();
        this.cineCamera(ctx, W, H, { zoom: 1 + (isHit ? 0.03 * (1 - seg(u, hit, hit + 40)) : 0), shake: isHit ? 10 * (1 - seg(u, hit, hit + 30)) : 0 });
        const geo = this.ptdGoalView(ctx, S, { theme: THEME, hc: '#38bdf8', ac: '#ef4444' });
        const kk = seg(u, 4, hit + 12);
        this.finSpr(ctx, c.gkx, lerp(W * 0.5, W * 0.4, ease(kk)), geo.gy1 + 8 - Math.sin(kk * Math.PI) * 34, 300, { animState: kk > 0.15 ? 'dive' : 'idle', frame: 1, flipX: true });
        const st = isHit ? Math.min(1, (u - hit) / 6) * Math.max(0.3, 1 - (u - hit) / 120) : 0;
        this.ptdGoalFront(ctx, geo, W * 0.3, 306, st);
        const bk = seg(u, 0, hit);
        if (!isHit) {
          const tail = [];
          for (let i = 0; i < 6; i++) {
            const q = Math.max(0, bk - i * 0.08);
            tail.push({ x: lerp(W * 0.52, W * 0.3, q), y: lerp(H * 1.05, 306, ease(q)) });
          }
          this.ptdStreak(ctx, tail, YOU_C, 60, 0.85);
        }
        this.ptdBall(ctx, isHit ? W * 0.3 : lerp(W * 0.52, W * 0.3, bk), isHit ? 312 : lerp(H * 1.05, 306, ease(bk)), isHit ? 24 : lerp(70, 26, bk), u * 0.8, isHit ? null : YOU_C);
        ctx.restore();
        // o Rei de costas, parado, vendo a bola entrar
        this.wcdRim(ctx, c.barou, 1150, bot + 300, 640, { facing: 'back', dim: 0.8, dimTint: '10,2,2', shirtNumber: 13 }, '#ef4444', [-1], 3);
        if (isHit) {
          this.cineFlash(ctx, W, H, 0.7 * (1 - seg(u, hit, hit + 8)));
          this.cineImpactText(ctx, 'VIRADA!!', W * 0.42, top + 110, 110, YOU_C, seg(u, hit, hit + 10), W * 0.7, -0.05);
        }
        this.cineSfx(S, shot + hit, 'rede', () => window.SFX?.goal?.(true));
        return;
      }
      // o Rei: a pupila tremendo → o ódio
      const u = t - cut;
      const hate = seg(u, 96, 110);
      this.zselCloseBg(ctx, S, '#ef4444', 560, 0.05 + hate * 0.12, u * 0.003);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + easeIO(u / 180) * 0.07, shake: 0.6 + (u >= 96 ? 7 * (1 - seg(u, 96, 126)) : 0) });
      this.wcdAura(ctx, 560, 340 - 10.1 * 25 + 900 * 0.87, 900, u, hate,['#450a0a', '#991b1b', '#f87171']);
      const ch = hate > 0 ? c.barouA : c.barou;
      const r = this.finHead(ctx, ch, 560, 340, 900, { dim: 0.1, dimTint: '40,4,4', rim: '#f87171' });
      const shaky = u < 96 ? [0, 1, 0, -1][Math.floor(u / 2) % 4] : 0;
      this.wcdEyes(ctx, 560, 340, r.u, { ring: '#ef4444', iris: '#450a0a', tiny: true, look: shaky, angry: hate > 0, glow: 'rgba(239,68,68,0.4)', glowA: hate });
      const dy = ease(seg(u, 10, 90)) * 3 * r.u;
      ctx.fillStyle = 'rgba(186,230,253,0.9)';
      ctx.fillRect(Math.round(560 + 7 * r.u), Math.round(340 - 2 * r.u + dy), Math.ceil(r.u * 0.5), Math.ceil(r.u * 0.8));
      ctx.restore();
      this.zselStamp(ctx, 'SORTE DE', 1040, top + 80, 44, '#fecaca', u, 24, 2, 420);
      this.zselStamp(ctx, 'PRINCIPIANTE.', 1040, top + 140, 54, '#ef4444', u, 40, 2, 440);
      if (u >= 96) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 96, 108)), '#fecaca');
      this.cineSfx(S, cut + 96, 'odio', () => window.SFX?.tackle?.());
    },

    // PLANO 5 (vitória) — o olho do Rei: "O Rei não perde duas vezes." → você, existindo
    zselBarou4w(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const cut = 170;
      if (t < cut) {
        ctx.fillStyle = '#080102';
        ctx.fillRect(0, 0, W, H);
        this.ptdRays(ctx, 640, 360, W * 1.1, '#7f1d1d', 0.5, t * 0.002, 50, 0.03);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + easeIO(t / cut) * 0.06, shake: 0.8 });
        const eyeY = 360;
        const U = this.wcdEyeBand(ctx, c.barouA, 640, eyeY, 1500, { dim: 0.1, dimTint: '40,4,4' });
        this.wcdEyes(ctx, 640, eyeY, U, { ring: '#ef4444', iris: '#450a0a', angry: true, look: -1, glow: 'rgba(239,68,68,0.5)', shine: 0.7 });
        ctx.restore();
        ctx.fillStyle = 'rgba(8,1,2,0.82)';
        ctx.fillRect(0, top, W, 70);
        ctx.fillRect(0, bot - 96, W, 96);
        this.zselStamp(ctx, 'O REI NÃO PERDE DUAS VEZES.', 640, bot - 48, 50, '#ef4444', t, 20, 2, W * 0.86);
        return;
      }
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      this.zselCloseBg(ctx, S, YOU_C, 760, 0.08, u * 0.002);
      this.cineDust(ctx, W, H, t, 30, 'rgba(165,243,252,0.5)', 11);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.08, shake: 0.5 });
      const r = this.finHead(ctx, c.you, 780, 330, 860, { dim: 0.12, dimTint: '2,20,24', rim: '#5eead4' });
      this.wcdEyes(ctx, 780, 330, r.u, { ring: YOU_C, iris: '#065f46', glow: 'rgba(0,245,212,0.3)', glowA: seg(u, 100, 140), shine: 0.8, angry: u > 120 });
      ctx.restore();
      // a mão sobe e fecha na frente (o punho do Time Z)
      const hk = ease(seg(u, 30, 70));
      const hv = this.zselHandCv(c.you.skinColor || '#f3d1b8');
      this.wcdPix(ctx, hv, 120, lerp(bot + 40, 300, hk), 15);
      this.zselStamp(ctx, 'ELE ME OLHOU.', 330, top + 70, 44, '#ccfbf1', u, 10, 2, 520);
      this.cineImpactText(ctx, 'EU EXISTO AQUI.', 470, bot - 70, 76, YOU_C, seg(u, 130, 140), 820, -0.04);
      if (u >= 130) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(u, 130, 142)), '#ccfbf1');
      this.cineSfx(S, cut + 130, 'existo', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 2. O GOSTO DO EGO (Time Z x Time Y)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — o Niko leu tudo (a prancheta dele, as linhas vermelhas)
    zselEgo0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const k = easeIO(t / S.dur);
      this.zselCloseBg(ctx, S, '#ef4444', 380, 0.06, t * 0.002);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.05, shake: 0.5 });
      const x = 380;
      const eyeY = 340;
      const r = this.zselHead(ctx, c.niko, x, eyeY, 880, { dim: 0.18, dimTint: '30,4,6', rim: '#f87171', rimSides: [-1], rimD: 2 });
      // os olhos ficam sempre escondidos na franja: só a sombra embaixo dela, que pesa
      // conforme ele "lê" o jogo
      this.foxcGrad(ctx, x - 7 * r.u, eyeY + 1.2 * r.u, 14 * r.u, 2.4 * r.u, [[0, 'rgba(10,2,4,0.75)'], [1, 'rgba(10,2,4,0)']]);
      this.cineGlow(ctx, x, eyeY - 2 * r.u, r.u * 9, 'rgba(239,68,68,0.22)', seg(t, 60, 100));
      ctx.restore();
      const kp = ease(seg(t, 20, 38));
      this.finPanel(ctx, [[730, top + 22], [W - 30, top + 14], [W - 40, bot - 24], [700, bot - 14]], () => {
        this.zselTactics(ctx, 700, top + 10, 560, bot - top - 20, t, { red: seg(t, 40, 140), cross: seg(t, 140, 180) });
      }, { dx: (1 - kp) * 600, border: '#fecaca' });
      if (t > 180) this.cineImpactText(ctx, 'XEQUE.', 990, bot - 80, 70, '#ef4444', seg(t, 180, 188), 0, -0.06);
      this.ptdChip(ctx, '89:41', 52, top + 34, '#facc15', seg(t, 4, 16), { size: 16, left: true });
      this.finKicker(ctx, 150, top + 34, 'TIME Z x TIME Y • ÚLTIMO MINUTO', seg(t, 8, 50), '#ef4444');
      this.cineSfx(S, 180, 'xeque', () => window.SFX?.kick?.(0.6));
    },

    // PLANO 2 — um passo depois: o seu olho lendo a leitura dele
    zselEgo1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const mid = top + 236;
      const lock = t > 150;
      this.finPanel(ctx, [[20, top + 14], [W - 20, top + 14], [W - 20, mid - 4], [20, mid + 10]], () => {
        this.ptdCloseBg(ctx, S, YOU_C, 640);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + t * 0.0004, shake: 0.4 });
        const eyeY = top + 128;
        const U = this.wcdEyeBand(ctx, c.you, 640, eyeY, 1260);
        const look = lock ? 1 : [0, -1, 0, 1][Math.floor(t / 22) % 4];
        this.wcdEyes(ctx, 640, eyeY, U, { ring: lock ? YOU_C : '#38bdf8', iris: '#065f46', look, angry: lock, glow: 'rgba(0,245,212,0.4)', glowA: seg(t, 150, 170), shine: 0.8 });
        ctx.restore();
      }, { dx: (1 - ease(seg(t, 0, 14))) * -W });
      const kb = ease(seg(t, 26, 42));
      if (kb > 0) {
        this.finPanel(ctx, [[20, mid + 26], [770, mid + 12], [760, bot - 14], [20, bot - 14]], () => {
          this.zselTactics(ctx, 20, mid + 10, 760, bot - mid, t, { red: 1, cross: 1, cyan: seg(t, 150, 210) });
        }, { dy: (1 - kb) * 360 });
      }
      const kc = ease(seg(t, 160, 176));
      if (kc > 0) {
        this.finPanel(ctx, [[792, mid + 10], [W - 20, mid - 4], [W - 20, bot - 14], [780, bot - 14]], () => {
          ctx.fillStyle = '#04201c';
          ctx.fillRect(760, mid - 10, 540, bot - mid + 10);
          this.ptdRays(ctx, 1030, mid + 120, 600, YOU_C, 0.3, t * 0.004, 30);
          const kk = ease(seg(t, 176, 204));
          for (let i = 0; i < 5; i++) {
            if (i === 2) continue;
            this.ptdPuzzle(ctx, 950 + (i % 3) * 80, mid + 80 + Math.floor(i / 3) * 80, 80, '#1d4ed8', 0, 0.9);
          }
          this.ptdPuzzle(ctx, lerp(1230, 1110, kk), lerp(mid + 20, mid + 80, kk), 80, YOU_C, (1 - kk) * 1.4, 1);
          if (kk >= 1) this.cineGlow(ctx, 1110, mid + 80, 120, 'rgba(0,245,212,0.6)', 1 - seg(t, 204, 260) * 0.5);
          this.zselStamp(ctx, 'ACHEI.', 1030, bot - 50, 54, '#ccfbf1', t, 206, 3);
        }, { dx: (1 - kc) * 520, border: '#99f6e4' });
      }
      this.cineSfx(S, 204, 'click', () => window.SFX?.blip?.(1320));
    },

    // PLANO 3 — o chute → a rede, com o Niko parado de costas em primeiro plano
    zselEgo2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const cut = 62;
      if (t < cut) {
        this.ptdImpactBg(ctx, S, W * 0.62, H * 0.58, '#0a1430', '#e0f2fe', t * 0.004);
        ctx.save();
        this.cineCamera(ctx, W, H, { zoom: 1.04, shake: t > 40 ? 9 * (1 - seg(t, 40, 60)) : 1 });
        this.finSpr(ctx, c.you, W * 0.38, H * 1.04, 620, { animState: t < 40 ? 'windup' : 'shoot', frame: 1, rim: '#0a1430', rimD: 4 });
        this.ptdRings(ctx, W * 0.62, H * 0.6, seg(t, 40, 70), ['#0a1430', YOU_C, '#0a1430'], 360);
        const sq = t >= 40 && t < 45 ? 0.66 : 1;
        this.ptdBall(ctx, W * 0.62, H * 0.6, 44, t * 0.7, null, 2 - sq, sq);
        ctx.restore();
        if (t >= 40) {
          this.cineImpactText(ctx, 'DOM!!', W * 0.78, top + 110, 100, YOU_C, seg(t, 40, 47), 0, -0.12);
          this.cineFlash(ctx, W, H, 0.7 * (1 - seg(t, 40, 48)));
        }
        this.cineSfx(S, 40, 'chute', () => window.SFX?.kick?.(1));
        return;
      }
      const u = t - cut;
      const hit = 28;
      const isHit = u >= hit;
      ctx.save();
      this.cineCamera(ctx, W, H, { zoom: 1 + (isHit ? 0.03 * (1 - seg(u, hit, hit + 40)) : 0), shake: isHit ? 10 * (1 - seg(u, hit, hit + 30)) : 0 });
      const geo = this.ptdGoalView(ctx, S, { theme: THEME, hc: '#38bdf8', ac: '#ef4444' });
      const kk = seg(u, 4, hit + 14);
      this.finSpr(ctx, c.gky, lerp(W * 0.5, W * 0.66, ease(kk)), geo.gy1 + 8 - Math.sin(kk * Math.PI) * 36, 300, { animState: kk > 0.15 ? 'dive' : 'idle', frame: 1 });
      const st = isHit ? Math.min(1, (u - hit) / 6) * Math.max(0.3, 1 - (u - hit) / 120) : 0;
      this.ptdGoalFront(ctx, geo, W * 0.32, 300, st);
      const bk = seg(u, 0, hit);
      if (!isHit) {
        const tail = [];
        for (let i = 0; i < 6; i++) {
          const q = Math.max(0, bk - i * 0.08);
          tail.push({ x: lerp(W * 0.46, W * 0.32, q), y: lerp(H * 1.05, 300, ease(q)) });
        }
        this.ptdStreak(ctx, tail, YOU_C, 60, 0.85);
      }
      this.ptdBall(ctx, isHit ? W * 0.32 : lerp(W * 0.46, W * 0.32, bk), isHit ? 306 : lerp(H * 1.05, 300, ease(bk)), isHit ? 24 : lerp(70, 26, bk), u * 0.8, isHit ? null : YOU_C);
      ctx.restore();
      // o Niko (camisa 7) de costas, congelado
      this.zselRim(ctx, c.niko, 1100, bot + 150, 560, { facing: 'back', dim: 0.5, dimTint: '20,2,4', shirtNumber: 7 }, '#f87171', [-1], 3);
      if (isHit) {
        this.cineFlash(ctx, W, H, 0.75 * (1 - seg(u, hit, hit + 8)));
        this.cineImpactText(ctx, 'GOOOOL!!', W * 0.4, top + 112, 112, YOU_C, seg(u, hit, hit + 10), W * 0.66, -0.05);
      }
      this.cineSfx(S, cut + hit, 'rede', () => window.SFX?.goal?.(true));
    },

    // PLANO 4 — a imagem: você de pé, olhando para baixo; o Niko de joelhos, de costas
    zselEgo3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const k = easeIO(t / S.dur);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 660, y: lerp(372, 352, k), zoom: lerp(1.0, 1.1, k), shake: 0.4 });
      this.cineGradient(ctx, -100, -100, W + 200, 570, [[0, '#02050c'], [1, '#0a1428']]);
      // a parede com o placar de LED (TIME Z aceso)
      this.zselLed(ctx, 380, 104, 640, 190, t, { top: 'FIM DE JOGO', left: 'TIME Z', right: 'TIME Y', leftOn: true, mid: '•' });
      ctx.fillStyle = '#0b1d4d';
      ctx.fillRect(-100, 420, W + 200, 52);
      ctx.fillStyle = 'rgba(56,189,248,0.6)';
      for (let x = -80; x < W + 100; x += 120) ctx.fillRect(x, 440, 70, 10);
      // gramado
      this.cineGradient(ctx, -100, 470, W + 200, 400, [[0, '#0c3d2d'], [1, '#14553f']]);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for (let i = 0; i < 5; i++) ctx.fillRect(-100, 470 + Math.pow(i / 5, 1.5) * 300, W + 200, 14 + i * 8);
      // o refletor em você
      this.cineShafts(ctx, 760, top - 40, Math.PI / 2, 620, 0.42, 5, '224,242,254', 0.12, t);
      ctx.save();
      ctx.translate(760, 560);
      ctx.scale(1.6, 0.3);
      this.cineGlow(ctx, 0, 0, 160, 'rgba(224,242,254,0.4)');
      ctx.restore();
      this.cineDust(ctx, W, H, t, 26, 'rgba(226,232,240,0.5)', 21);
      this.zselShadow(ctx, 760, 560, 56, 0.5);
      this.zselRim(ctx, c.you, 760, 560, 300, { dim: 0.05, dimTint: '2,10,20' }, '#ccfbf1', [-1, 1], 1);
      // olhando para baixo, para ele
      this.wcdEyes(ctx, 760, 560 - 300 * 0.87 + 10.1 * (300 / 36), 300 / 36, { ring: '#38bdf8', iris: '#0c4a6e', half: true, lid: this.finShade(c.you.skinColor || '#f3d1b8', -0.2), glow: 'rgba(0,245,212,0.35)', glowA: seg(t, 120, 200) });
      ctx.restore();
      // o Niko de joelhos em primeiro plano
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.04, k), shake: 0.6 });
      this.cineGlow(ctx, 300, bot - 20, 300, 'rgba(239,68,68,0.18)');
      const no = { facing: 'back', dim: 0.42, dimTint: '16,2,4', shirtNumber: 7 };
      [-4, 4].forEach((d) => this.zselKneel(ctx, c.niko, 300 + d, bot + 60 - 2, 520, Object.assign({}, no, { tint: d < 0 ? '#f87171' : '#bae6fd', dim: 0 })));
      this.zselKneel(ctx, c.niko, 300, bot + 60, 520, no);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'FIM DE JOGO • PRÉDIO 5', seg(t, 6, 46), YOU_C);
    },

    // PLANO 5 — vencer é bom DEMAIS (o corpo tremendo, o coração)
    zselEgo4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const beats = [44, 62, 120, 138, 196, 214];
      const beat = beats.reduce((m, b) => Math.max(m, t >= b ? 1 - seg(t, b, b + 14) : 0), 0);
      this.zselCloseBg(ctx, S, YOU_C, 640, 0.06 + beat * 0.1, t * 0.003);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + this.cineNoise(S.f * 2.1, 3) * 3, y: 360 + this.cineNoise(S.f * 1.9, 5) * 2, zoom: 1.02 + easeIO(t / S.dur) * 0.08 + beat * 0.012 });
      const r = this.finHead(ctx, c.you, 640, 352, 1000, { dim: 0.06, dimTint: '2,20,24', rim: '#5eead4' });
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.foxcGrad(ctx, 0, 352 + 4 * r.u, W, 12 * r.u, [[0, 'rgba(0,245,212,0)'], [1, 'rgba(0,245,212,0.18)']]);
      ctx.restore();
      this.wcdEyes(ctx, 640, 352, r.u, { ring: YOU_C, iris: '#065f46', tiny: t < 150, shine: 0.9, glow: 'rgba(0,245,212,0.35)', glowA: 0.4 + beat * 0.6 });
      ctx.restore();
      // painel: as mãos tremendo
      const kh = ease(seg(t, 70, 86));
      if (kh > 0) {
        this.finPanel(ctx, [[26, bot - 214], [400, bot - 230], [410, bot - 16], [20, bot - 16]], () => {
          ctx.fillStyle = '#04201c';
          ctx.fillRect(0, bot - 240, 420, 240);
          this.ptdRays(ctx, 210, bot - 110, 400, YOU_C, 0.25, t * 0.004, 26);
          const hv = this.zselHandCv(c.you.skinColor || '#f3d1b8');
          const dx = Math.round(this.cineNoise(S.f * 3.1, 1) * 4);
          this.wcdPix(ctx, hv, 120 + dx, bot - 214, 10);
        }, { dy: (1 - kh) * 280, border: '#99f6e4' });
      }
      beats.forEach((b, i) => {
        if (t >= b && t < b + 30) this.zselStamp(ctx, 'TUM', 1080 + (i % 2) * 90, top + 90 + (i % 2) * 50, 40, '#ccfbf1', t, b, 2, 0, 'center', 1 - seg(t, b + 18, b + 30));
      });
      this.zselStamp(ctx, 'VENCER...', 340, top + 70, 52, '#ccfbf1', t, 152, 3);
      this.cineImpactText(ctx, 'É BOM DEMAIS.', 820, bot - 80, 92, YOU_C, seg(t, 190, 200), 760, -0.05);
      if (t >= 190) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, 190, 202)), '#ccfbf1');
      beats.forEach((b, i) => this.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.15)));
      this.cineSfx(S, 190, 'demais', () => window.SFX?.kick?.(1));
    },

    // PLANO 6 — o monstro aparece no seu rosto: "eu quero sentir isso de novo"
    zselEgo5(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const k = ease(seg(t, 10, 150));
      const hit = 176;
      ctx.fillStyle = '#010405';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 372, zoom: 1.02 + easeIO(t / S.dur) * 0.1, shake: 0.6 + (t >= hit ? 7 * (1 - seg(t, hit, hit + 30)) : 0) });
      this.ptdRays(ctx, 640, 330, W * 1.1, '#0d9488', 0.18 + k * 0.25, t * 0.004, 50, 0.03);
      const size = 1000;
      const eyeY = 362;
      const feet = eyeY - 10.1 * (size / 36) + size * 0.87;
      this.wcdAura(ctx, 640, feet, size, t, k, ['#064e3b', '#0d9488', '#5eead4']);
      const ch = t > 100 ? c.youGrin : c.you;
      const r = this.finHead(ctx, ch, 640, eyeY, size, { dim: 0.08, dimTint: '0,20,20', rim: '#2dd4bf' });
      this.rincShade(ctx, ch, 640, r.feet, size, 0.25 + k * 0.7);
      this.wcdEyes(ctx, 640, eyeY, r.u, { ring: YOU_C, iris: '#022c22', line: '#010405', tiny: t > 60, glow: 'rgba(0,245,212,0.75)', glowA: 0.3 + k * 0.7, shine: 1, angry: t > 100 });
      ctx.restore();
      this.zselStamp(ctx, 'DEVORAR O PLANO DE OUTRO...', 640, top + 46, 36, '#99f6e4', t, 20, 2, W * 0.84);
      this.cineImpactText(ctx, 'DE NOVO.', 640, bot - 82, 120, YOU_C, seg(t, hit, hit + 10), W * 0.7, -0.04);
      if (t >= hit) this.cineFlash(ctx, W, H, 0.42 * (1 - seg(t, hit, hit + 12)), '#ccfbf1');
      const fo = seg(t, S.dur - 30, S.dur);
      if (fo > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fo * 0.7})`;
        ctx.fillRect(0, 0, W, H);
      }
      this.cineSfx(S, hit, 'denovo', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 3. O TRAIDOR (Time Z x Time W)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — a jogada ensaiada... e o gêmeo já está lá
    zselKuon0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const feet = 604;
      const pass = 92;
      const cutIn = 112;
      const slow = t > cutIn ? 0.25 : 1;
      const pan = t < cutIn ? t * 8 : cutIn * 8 + (t - cutIn) * 2;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.04 + (t > cutIn ? ease(seg(t, cutIn, cutIn + 40)) * 0.08 : 0), shake: 0.8 + (t >= cutIn ? 5 * (1 - seg(t, cutIn, cutIn + 24)) : 0) });
      this.ptdArena(ctx, S, pan, { theme: THEME, hc: '#38bdf8', ac: '#22c55e', sign: 'BLUE LOCK • PRÉDIO 5 • TIME Z x TIME W' });
      if (t < cutIn) this.ptdSpeed(ctx, S, t, '#bae6fd', 0.18, 1, 36, 14, top + 20, feet - 40, 5);
      const bx = W * 0.28;
      const ba = t < pass - 12 ? 'run' : t < pass ? 'windup' : t < pass + 20 ? 'shoot' : 'idle';
      this.zselShadow(ctx, bx, feet, 56, 0.35);
      this.finSpr(ctx, c.bachira, bx, feet, 280, { animState: ba, frame: ba === 'run' ? RUNF(S.f) : 1 });
      // o caminho ensaiado (giz na grama) e o gêmeo que aparece no meio dele
      const lane = ease(seg(t, 10, 40));
      if (lane > 0) {
        ctx.save();
        ctx.setLineDash([16, 12]);
        ctx.lineWidth = 5;
        ctx.strokeStyle = t >= cutIn ? 'rgba(239,68,68,0.9)' : 'rgba(56,189,248,0.85)';
        ctx.beginPath();
        ctx.moveTo(bx + 70, feet - 6);
        ctx.lineTo(lerp(bx + 70, W + 40, lane), feet - 6 - lane * 40);
        ctx.stroke();
        ctx.restore();
      }
      const wx = W * 0.7;
      const wIn = ease(seg(t, pass + 2, cutIn));
      if (wIn > 0) {
        const x = lerp(W + 160, wx, wIn);
        this.cineGlow(ctx, x, feet - 120, 160, 'rgba(34,197,94,0.3)', wIn);
        this.zselShadow(ctx, x, feet, 56, 0.35);
        if (t > cutIn + 20) {
          const kk = ease(seg(t, cutIn + 20, cutIn + 60));
          this.finSpr(ctx, c.wkG, lerp(W + 200, W * 0.86, kk), feet - 30, 260, { animState: 'call_pass', frame: 1, flipX: true, dim: 0.15, dimTint: '2,20,8' });
        }
        this.finSpr(ctx, t >= cutIn ? c.wjG : c.wj, x, t < cutIn ? feet : feet - 56, 290, { animState: t < cutIn ? 'run' : 'slide', frame: t < cutIn ? RUNF(S.f) : 1, flipX: true });
      }
      // a bola
      if (t < pass) this.ptdBall(ctx, bx + 62 + Math.abs(Math.sin(t * 0.3)) * 8, feet - 16, 18, t * 0.5);
      else {
        const kb = t < cutIn ? seg(t, pass, cutIn) : 1;
        const x = lerp(bx + 80, wx - 50, kb);
        this.ptdBall(ctx, x, feet - 18 - Math.sin(kb * Math.PI) * 30, 18, t * (t < cutIn ? 0.6 : 0.1));
      }
      ctx.restore();
      if (t >= cutIn) {
        this.cineImpactText(ctx, 'LIDO?!', W * 0.62, top + 110, 100, '#4ade80', seg(t, cutIn, cutIn + 8), 0, -0.08);
        this.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, cutIn, cutIn + 10)), '#dcfce7');
      }
      this.ptdChip(ctx, 'JOGADA ENSAIADA Nº 3', 30, top + 34, '#38bdf8', seg(t, 6, 20), { size: 15, left: true });
      void slow;
      this.cineSfx(S, pass, 'passe', () => window.SFX?.pass?.());
      this.cineSfx(S, cutIn, 'corte', () => window.SFX?.tackle?.());
    },

    // PLANO 2 — os gêmeos Wanima, rindo; o Kuon desvia o olhar
    zselKuon1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const k = easeIO(t / S.dur);
      this.zselCloseBg(ctx, S, '#22c55e', 640, 0.08, t * 0.002);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.05, shake: 0.5 });
      [[c.wjG, 380, false, -1], [c.wkG, 900, true, 1]].forEach(([ch, x, flip, side]) => {
        const r = this.finHead(ctx, ch, x, 340, 760, { flipX: flip, dim: 0.1, dimTint: '2,24,10', rim: '#86efac', rimSides: [side], rimD: 2 });
        this.wcdEyes(ctx, x, 340, r.u, { ring: '#4ade80', iris: '#052e16', look: -side, glow: 'rgba(74,222,128,0.3)', shine: 0.7 });
      });
      ctx.restore();
      this.zselStamp(ctx, 'VALEU PELA DICA~', 640, top + 56, 44, '#bbf7d0', t, 14, 2, W * 0.8);
      // painel: o Kuon desviando o olhar, suando
      const kp = ease(seg(t, 150, 166));
      if (kp > 0) {
        const px0 = 470;
        this.finPanel(ctx, [[px0 + 20, bot - 196], [px0 + 340, bot - 210], [px0 + 350, bot - 14], [px0, bot - 14]], () => {
          this.cineGradient(ctx, px0 - 20, bot - 220, 400, 220, [[0, '#0b1222'], [1, '#03060d']]);
          const cx = px0 + 175;
          const ey = bot - 100;
          const r = this.finHead(ctx, c.kuon, cx, ey, 520, { dim: 0.35, dimTint: '6,10,24' });
          this.wcdEyes(ctx, cx, ey, r.u, { ring: '#64748b', iris: '#0f172a', look: -2, tiny: true });
          const dy = ease(seg(t, 170, 250)) * 2.4 * r.u;
          ctx.fillStyle = 'rgba(186,230,253,0.9)';
          ctx.fillRect(Math.round(cx + 7 * r.u), Math.round(ey - 2 * r.u + dy), Math.ceil(r.u * 0.5), Math.ceil(r.u * 0.8));
          this.zselStamp(ctx, '...', px0 + 300, bot - 170, 40, '#cbd5e1', t, 186, 6);
        }, { dy: (1 - kp) * 260, border: '#cbd5e1' });
      }
    },

    // PLANO 3 — o vestiário no intervalo: o Kuon no banco, o time em volta
    zselKuon2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const k = easeIO(t / S.dur);
      const hit = 40;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(660, 700, k), y: lerp(380, 400, k), zoom: lerp(1.04, 1.16, k), shake: 0.6 + (t >= hit ? 5 * (1 - seg(t, hit, hit + 26)) : 0) });
      ctx.drawImage(this.finBg('rinc_locker', W, H, this.rincLockerBg), 0, 0);
      ctx.fillStyle = 'rgba(4,10,28,0.4)';
      ctx.fillRect(0, 0, W, H);
      this.rincLamp(ctx, 760, Math.sin(t * 0.02) * 0.03 + (t >= hit ? Math.sin((t - hit) * 0.15) * 0.06 * (1 - seg(t, hit, hit + 80)) : 0), t, 1);
      // o time em pé em volta
      this.finRim(ctx, c.kunigami, 1060, 650, 340, { dim: 0.45, dimTint: '6,12,30' }, '#93c5fd', [-1], 2);
      this.finRim(ctx, c.chigiri, 1200, 640, 320, { dim: 0.5, dimTint: '6,12,30' }, '#93c5fd', [-1], 2);
      this.finRim(ctx, c.bachira, 330, 650, 330, { dim: 0.5, dimTint: '6,12,30' }, '#93c5fd', [1], 2);
      // o Kuon sentado embaixo da luz
      const size = 330;
      const u = size / 36;
      const seat = 640 - (31.3 - 23.6) * u;
      this.cineGlow(ctx, 760, 610, 240, 'rgba(191,219,254,0.16)');
      this.rincBench(ctx, 560, 960, seat, u);
      const up = this.rincSeat(ctx, c.kuon, 760, 640, size, { dim: 0.2, dimTint: '6,16,40' });
      this.rincShade(ctx, c.kuon, 760, up, size, 0.75);
      // o Raichi apontando, furioso
      this.finRim(ctx, c.raichi, 520, 664, 380, { animState: 'call_pass', frame: 1, dim: 0.22, dimTint: '20,10,4' }, '#fde68a', [1], 2);
      ctx.restore();
      // você em primeiro plano, de costas
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1, shake: 0.9 });
      this.wcdRim(ctx, c.you, 150, bot + 260, 600, { facing: 'back', dim: 0.8, dimTint: '2,4,10', shirtNumber: this.zselNum() }, '#60a5fa', [1], 3);
      ctx.restore();
      if (t >= hit) this.cineImpactText(ctx, 'TRAIDOR!', 470, top + 100, 84, RAICHI_C, seg(t, hit, hit + 8), 0, -0.1);
      this.finKicker(ctx, 40, top + 30, 'INTERVALO • VESTIÁRIO DO TIME Z', seg(t, 6, 46));
      this.cineSfx(S, hit, 'traidor', () => window.SFX?.kick?.(0.8));
    },

    // PLANO 4 — a confissão: o rosto frio; a memória do acordo com os gêmeos
    zselKuon3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const k = easeIO(t / S.dur);
      const hit = 268;
      ctx.fillStyle = '#030406';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 680, y: 370, zoom: 1 + k * 0.08, shake: 0.4 + (t >= hit ? 5 * (1 - seg(t, hit, hit + 24)) : 0) });
      this.cineGlow(ctx, 560, 330, 460, 'rgba(165,180,252,0.16)');
      const x = 840;
      const eyeY = 350;
      const r = this.finHead(ctx, c.kuon, x, eyeY, 980, { dim: 0.16, dimTint: '8,10,24', rim: '#a5b4fc', rimSides: [-1], rimD: 2 });
      this.foxcGradH(ctx, x - 1.5 * r.u, top - 40, 6 * r.u, bot - top + 80, [[0, 'rgba(3,4,6,0)'], [1, 'rgba(3,4,6,0.95)']]);
      ctx.fillStyle = 'rgba(3,4,6,0.95)';
      ctx.fillRect(x + 4.5 * r.u, top - 40, W, bot - top + 80);
      this.wcdEye(ctx, x - 3.5 * r.u, eyeY, r.u * 0.3, -1, { ring: '#64748b', iris: '#0f172a', half: true, lid: this.finShade(c.kuon.skinColor, -0.25), reflect: '#4ade80' });
      ctx.restore();
      // a memória: o acordo no corredor (verde, sem cor)
      const kp = ease(seg(t, 24, 42));
      const out = seg(t, 196, 232);
      if (kp > 0 && out < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - out;
        ctx.translate(0, out * out * 200);
        this.finPanel(ctx, [[30, top + 24], [560, top + 14], [580, bot - 30], [24, bot - 16]], () => {
          this.cineGradient(ctx, 0, top, 600, bot - top, [[0, '#0b2015'], [1, '#03100a']]);
          this.cineShafts(ctx, 300, top - 20, Math.PI / 2, 520, 0.5, 4, '134,239,172', 0.1, t);
          this.finSpr(ctx, c.wjG, 200, bot - 60, 300, { dim: 0.25, dimTint: '4,30,12' });
          this.finSpr(ctx, c.wkG, 400, bot - 64, 290, { flipX: true, dim: 0.25, dimTint: '4,30,12' });
          this.wcdRim(ctx, c.kuon, 300, bot + 170, 400, { facing: 'back', dim: 0.5, dimTint: '2,8,4', shirtNumber: 5 }, '#86efac', [-1, 1], 2);
          ctx.save();
          ctx.globalCompositeOperation = 'saturation';
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#777777';
          ctx.fillRect(0, top, 600, bot - top);
          ctx.restore();
          this.finFillPat(ctx, 'dots', 0, top, 600, bot - top, 0.25);
          this.finKicker(ctx, 50, top + 44, 'ANTES DO JOGO', seg(t, 40, 70), '#86efac');
          this.zselStamp(ctx, 'ARTILHEIRO.', 300, top + 120, 46, '#dcfce7', t, 80, 3, 480);
        }, { dx: (1 - kp) * -600, border: '#bbf7d0' });
        ctx.restore();
      }
      this.zselStamp(ctx, 'O EGO MANDOU...', 300, top + 90, 44, '#c7d2fe', t, 214, 2, 520);
      this.cineImpactText(ctx, 'SER EGOÍSTA.', 320, bot - 84, 84, KUON_C, seg(t, hit, hit + 10), 560, -0.05);
      if (t >= hit) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, hit, hit + 12)), '#e0e7ff');
      this.cineSfx(S, hit, 'egoista', () => window.SFX?.kick?.(1));
    },

    // PLANO 5 — você entende: egoísmo sem gol é só traição
    zselKuon4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const k = easeIO(t / S.dur);
      const hit = 110;
      this.zselCloseBg(ctx, S, '#38bdf8', 460, 0.05, t * 0.002);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.07, shake: 0.5 + (t >= hit ? 5 * (1 - seg(t, hit, hit + 24)) : 0) });
      const x = 460;
      const r = this.finHead(ctx, c.you, x, 340, 900, { dim: 0.1, dimTint: '2,10,24', rim: '#7dd3fc', rimSides: [-1], rimD: 2 });
      this.foxcGradH(ctx, x, top - 40, 10 * r.u, bot - top + 80, [[0, 'rgba(2,6,23,0)'], [1, 'rgba(2,6,23,0.7)']]);
      this.wcdEyes(ctx, x, 340, r.u, { ring: t > hit ? YOU_C : '#38bdf8', iris: '#0c4a6e', angry: t > hit, glow: 'rgba(0,245,212,0.35)', glowA: seg(t, hit, hit + 30), shine: 0.7 });
      ctx.restore();
      // painel: o gol vazio, a bola parada na linha
      const kp = ease(seg(t, 30, 46));
      if (kp > 0) {
        this.finPanel(ctx, [[820, top + 24], [W - 24, top + 14], [W - 24, 380], [800, 392]], () => {
          ctx.save();
          ctx.translate(780, top - 30);
          ctx.scale(0.4, 0.4);
          const geo = this.ptdGoalView(ctx, S, { theme: THEME, hc: '#38bdf8', ac: '#22c55e' });
          this.ptdGoalFront(ctx, geo, W / 2, 400, 0);
          this.ptdBall(ctx, W / 2, geo.gy1 + 40, 34, 0);
          ctx.restore();
          ctx.fillStyle = 'rgba(2,6,23,0.35)';
          ctx.fillRect(780, top, 500, 400);
          this.zselStamp(ctx, 'SEM GOL...', 1040, 340, 40, '#e2e8f0', t, 50, 3);
        }, { dx: (1 - kp) * 480, border: '#bae6fd' });
      }
      this.zselStamp(ctx, 'EGOÍSMO SEM GOL...', 940, 450, 44, '#e0f2fe', t, 60, 2, 560);
      this.cineImpactText(ctx, 'É SÓ TRAIÇÃO.', 940, bot - 70, 80, YOU_C, seg(t, hit, hit + 10), 600, -0.05);
      if (t >= hit) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, hit, hit + 12)), '#e0f2fe');
      this.cineSfx(S, hit, 'traicao', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 4. O RELÂMPAGO VERMELHO (Chigiri)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — a ponta esquerda livre, a bola chegando no pé dele
    zselChi0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const k = easeIO(t / S.dur);
      const cam = { x: lerp(640, 560, k), y: lerp(380, 360, k), zoom: lerp(1.06, 1.32, k), shake: 0.5 };
      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      this.zselPitch(ctx, t, [{ text: 'TIME Z  x  TIME W', y: 0.42, px: 1.3 }, { text: '1ª SELEÇÃO', y: 0.74, px: 0.8, color: '#facc15' }]);
      // o corredor livre pela esquerda (aceso)
      const lane = ease(seg(t, 60, 120));
      if (lane > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = lane * (0.8 + 0.2 * Math.sin(t * 0.12));
        const g = ctx.createLinearGradient(0, 720, 0, PP(0, 720, 4.6)[1]);
        g.addColorStop(0, 'rgba(244,63,94,0.55)');
        g.addColorStop(1, 'rgba(244,63,94,0.05)');
        ctx.fillStyle = g;
        poly(ctx, [PP(-420, 720, 1.05), PP(360, 720, 1.05), PP(200, 720, 4.6), PP(-560, 720, 4.6)]);
        ctx.fill();
        ctx.restore();
        // setas correndo pelo corredor livre
        ctx.save();
        ctx.strokeStyle = 'rgba(255,228,230,0.75)';
        ctx.lineWidth = 4;
        for (let i = 0; i < 6; i++) {
          const z = 1.25 + ((i * 0.55 + t * 0.012) % 3.3);
          const a = PP(-160, 720, z);
          const b = PP(-60, 720, z + 0.12);
          const d = PP(40, 720, z);
          ctx.globalAlpha = lane * (1 - (z - 1.25) / 3.3);
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1] - 2);
          ctx.lineTo(d[0], d[1]);
          ctx.stroke();
        }
        ctx.restore();
      }
      [[c.gkw, 640, 4.5], [c.wa, 1000, 3.1], [c.wk, 860, 2.4], [c.wj, 700, 2.2]].forEach(([ch, x, z]) => {
        const [px, pf] = PP(x, 720, z);
        this.zselShadow(ctx, px, pf, 46 / z, 0.35);
        this.finSpr(ctx, ch, px, pf, 330 / z, { dim: 0.22, dimTint: '2,16,8' });
      });
      ctx.restore();
      // o Chigiri de costas, na ponta, e a bola rolando até ele
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.1, shake: 0.8 });
      const cx = 170;
      const cf = bot + 70;
      const bk = ease(seg(t, 20, 70));
      this.ptdBall(ctx, lerp(W + 60, cx + 90, bk), lerp(bot - 120, cf - 20, bk), 24, t * (1 - bk) * 0.6);
      this.wcdRim(ctx, c.chigiri, cx, cf, 420, { facing: 'back', dim: 0.35, dimTint: '20,4,10', shirtNumber: 44 }, '#fda4af', [1], 2);
      ctx.restore();
      if (lane > 0) this.ptdChip(ctx, 'A PONTA ESQUERDA ESTÁ LIVRE', 740, top + 80, CHI_C, lane, { size: 15 });
      this.finKicker(ctx, 40, top + 30, 'TIME Z x TIME W • RETA FINAL', seg(t, 6, 46), CHI_C);
      this.cineSfx(S, 70, 'domina', () => window.SFX?.pass?.());
    },

    // PLANO 2 — o joelho (o medo) → os olhos → "se quebrar, quebrou"
    zselChi1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const cut = 150;
      if (t < cut) {
        const beats = [20, 40, 80, 100, 130];
        const beat = beats.reduce((m, b) => Math.max(m, t >= b ? 1 - seg(t, b, b + 14) : 0), 0);
        ctx.fillStyle = '#0a0204';
        ctx.fillRect(0, 0, W, H);
        this.cineGlow(ctx, 520, 380, 420, 'rgba(239,68,68,0.25)', 0.6 + beat * 0.4);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + beat * 0.02 + t * 0.0004, shake: 0.6 });
        // as pernas em close (recorte da pixel art)
        const dw = 760;
        const U = dw / 19;
        const x0 = 470 - dw / 2;
        const y0 = top - 10;
        this.finCrop(ctx, c.chigiri, { dim: 0.25, dimTint: '30,4,8' }, 8.5, 17, 19, 15, x0, y0, dw, U * 15);
        // o medo: correntes presas na perna da frente (no joelho), puxando para o chão;
        // a cada batida do coração elas se esticam mais
        const kx = x0 + (20.6 - 8.5) * U;
        const ky = y0 + (27 - 17) * U;
        this.cineGlow(ctx, kx, ky, 130, 'rgba(239,68,68,0.6)', 0.35 + beat * 0.6);
        const grip = ease(seg(t, 4, 30));
        const vib = 1 + beat * 5;
        const ch = { link: 34, thick: 9, color: '#6b7280', shine: '#e2e8f0' };
        // as que prendem a perna ao chão (vêm de fora do quadro)
        [[-80, bot + 60, 0], [kx - 330, bot + 90, 2], [kx + 260, bot + 90, 4]].forEach(([ax, ay, s]) => {
          const ex = lerp(ax, kx + (s - 2) * 14, grip);
          const ey = lerp(ay, ky + 30, grip);
          this.foxcChain(ctx, ax, ay, ex, ey, Object.assign({ t: t * 0.3 + s, vib }, ch));
        });
        // as voltas em torno do joelho
        if (grip > 0.6) {
          ctx.save();
          ctx.globalAlpha = seg(grip, 0.6, 1);
          this.foxcChain(ctx, kx - 120, ky - 34, kx + 120, ky + 4, Object.assign({ t, vib: vib * 0.6, sag: 16 }, ch));
          this.foxcChain(ctx, kx - 120, ky + 30, kx + 120, ky - 6, Object.assign({ t: t + 2, vib: vib * 0.6, sag: 16 }, ch));
          this.foxcChain(ctx, kx - 110, ky + 78, kx + 110, ky + 56, Object.assign({ t: t + 4, vib: vib * 0.6, sag: 12 }, ch));
          ctx.restore();
        }
        this.cineGlow(ctx, kx, ky, 90, 'rgba(239,68,68,0.45)', beat * 0.8);
        ctx.restore();
        beats.forEach((b, i) => {
          if (t >= b && t < b + 26) this.zselStamp(ctx, 'TUM', 160 + (i % 2) * 70, top + 80 + (i % 3) * 60, 40, '#fecaca', t, b, 2, 0, 'center', 1 - seg(t, b + 14, b + 26));
        });
        // a memória: a lesão (sem cor)
        const kp = ease(seg(t, 46, 62));
        if (kp > 0) {
          this.finPanel(ctx, [[860, top + 24], [W - 24, top + 14], [W - 24, bot - 24], [836, bot - 14]], () => {
            this.cineGradient(ctx, 820, top, 460, bot - top, [[0, '#262626'], [1, '#0a0a0a']]);
            const fall = ease(seg(t, 62, 92));
            this.finSpr(ctx, c.chigiri, lerp(1000, 1060, fall), bot - 70 + fall * 20, 300, { animState: fall > 0.2 ? 'slide' : 'run', frame: 5, dim: 0.2, dimTint: '20,20,20' });
            ctx.save();
            ctx.globalCompositeOperation = 'saturation';
            ctx.fillStyle = '#777777';
            ctx.fillRect(820, top, 460, bot - top);
            ctx.restore();
            if (t > 88) {
              this.cineGlow(ctx, 1080, bot - 120, 90, 'rgba(239,68,68,0.8)', 1 - seg(t, 88, 140) * 0.5);
              this.zselStamp(ctx, 'CRACK', 1060, top + 80, 50, '#fecaca', t, 88, 3);
            }
            this.finFillPat(ctx, 'dots', 820, top, 460, bot - top, 0.25);
            this.finKicker(ctx, 880, bot - 50, 'UM ANO ATRÁS', seg(t, 66, 96), '#fca5a5');
          }, { dx: (1 - kp) * 460, border: '#e5e5e5' });
        }
        beats.forEach((b, i) => this.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.15)));
        return;
      }
      const u = t - cut;
      const hit = 64;
      const decide = u >= hit;
      ctx.fillStyle = '#0b0206';
      ctx.fillRect(0, 0, W, H);
      this.ptdRays(ctx, 640, 360, W * 1.1, '#be123c', decide ? 0.4 : 0.15, u * 0.003, 46, 0.03);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + easeIO(u / (S.dur - cut)) * 0.07, shake: 0.5 + (decide ? 7 * (1 - seg(u, hit, hit + 28)) : 0) });
      const eyeY = 330;
      const U = this.wcdEyeBand(ctx, c.chigiri, 640, eyeY, 1400, { dim: 0.08, dimTint: '30,4,10' });
      const look = decide ? 0 : [0, 1, 0, -1][Math.floor(u / 2) % 4];
      this.wcdEyes(ctx, 640, eyeY, U, { ring: '#f472b6', iris: '#831843', tiny: !decide, look, angry: decide, glow: 'rgba(244,63,94,0.5)', glowA: decide ? 1 : 0.2, shine: decide ? 0.9 : 0 });
      ctx.restore();
      ctx.fillStyle = 'rgba(11,2,6,0.8)';
      ctx.fillRect(0, bot - 110, W, 110);
      // na decisão, as correntes da perna estouram: os elos voam pela tela
      const gone = 1 - seg(u, hit + 22, hit + 52);
      if (decide && gone > 0) {
        const snap = 0.3 + 0.7 * ease(seg(u, hit, hit + 34));
        ctx.save();
        ctx.globalAlpha = gone;
        const big = { link: 58, thick: 15, color: '#6b7280', shine: '#e2e8f0', snap };
        this.foxcChain(ctx, -80, bot - 150, W + 80, bot - 30, Object.assign({ t: u, cut: 0.46 }, big));
        this.foxcChain(ctx, -80, bot - 30, W + 80, bot - 160, Object.assign({ t: u + 3, cut: 0.55 }, big));
        ctx.restore();
      }
      this.cineImpactText(ctx, 'SE QUEBRAR, QUEBROU.', 640, bot - 56, 78, CHI_C, seg(u, hit, hit + 10), W * 0.86, -0.03);
      if (decide) this.cineFlash(ctx, W, H, 0.4 * (1 - seg(u, hit, hit + 12)), '#ffe4e6');
      this.cineSfx(S, cut + hit, 'decide', () => window.SFX?.kick?.(1));
    },

    // PLANO 3 — a arrancada: o cabelo vermelho cortando a tela, os gêmeos ficando para trás
    zselChi2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const cut = 36;
      if (t < cut) {
        this.ptdImpactBg(ctx, S, W * 0.5, H * 0.5, '#4c0519', '#ffe4e6', t * 0.004);
        ctx.save();
        this.cineCamera(ctx, W, H, { zoom: 1.04, shake: 8 * (1 - seg(t, 0, 20)) });
        this.zselHairStreaks(ctx, W * 0.42, H * 0.36, t, 900, '190,18,60', 9, 120);
        this.finSpr(ctx, c.chigiri, W * 0.5, H * 1.12, 680, { animState: 'idle', frame: 1, rim: '#4c0519', rimD: 4 });
        // os pedaços das correntes voando das pernas dele
        ctx.globalAlpha = 1 - seg(t, 16, cut);
        this.foxcChain(ctx, W * 0.14, H * 0.8, W * 0.86, H * 0.7, { t, snap: 0.45 + 0.55 * seg(t, 0, cut), cut: 0.5, link: 50, thick: 13, color: '#6b7280', shine: '#e2e8f0' });
        ctx.globalAlpha = 1;
        ctx.restore();
        this.cineImpactText(ctx, 'DASH!!', W * 0.78, top + 110, 110, '#e11d48', seg(t, 0, 8), 0, -0.1);
        this.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, 0, 10)));
        this.cineSfx(S, 0, 'dash', () => window.SFX?.whoosh?.());
        return;
      }
      const u = t - cut;
      const feet = 604;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.06, shake: 2.2 });
      this.ptdArena(ctx, S, u * 30, { theme: THEME, hc: '#38bdf8', ac: '#22c55e', sign: 'BLUE LOCK • PRÉDIO 5 • TIME Z x TIME W' });
      ctx.fillStyle = 'rgba(40,2,10,0.3)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      this.ptdSpeed(ctx, S, u, '#fda4af', 0.5, 1, 70, 26, top + 10, bot - 10, 3);
      this.ptdSpeed(ctx, S, u, '#ffffff', 0.25, 1, 80, 12, top + 10, bot - 10, 11);
      // os gêmeos correndo atrás, ficando para trás
      [[c.wj, 20, 0], [c.wk, 50, 1]].forEach(([ch, at, i]) => {
        const x = W * 1.15 - (u - at) * 13;
        if (x < -200 || u < at) return;
        const fy = feet - 46 + i * 10;
        this.zselShadow(ctx, x, fy, 44, 0.3);
        this.finSpr(ctx, ch, x, fy, 220, { animState: 'run', frame: RUNF(S.f + i * 2, 4), dim: 0.3, dimTint: '2,20,8' });
      });
      const cx = W * 0.56 + Math.sin(u * 0.05) * 14;
      this.zselHairStreaks(ctx, cx - 30, feet - 236, u, 820, '226,55,79', 8, 70);
      this.cineGlow(ctx, cx, feet - 140, 170, 'rgba(244,63,94,0.3)');
      this.zselShadow(ctx, cx, feet, 60, 0.4);
      this.finSpr(ctx, c.chigiri, cx, feet, 300, { animState: 'run', frame: RUNF(S.f, 2), showAura: true });
      this.ptdBall(ctx, cx + 80 + Math.abs(Math.sin(u * 0.4)) * 10, feet - 16, 18, u);
      // poeira dos passos
      for (let i = 0; i < 10; i++) {
        const ph = (u * 2 + i * 9) % 40;
        ctx.fillStyle = `rgba(226,232,240,${0.5 * (1 - ph / 40)})`;
        ctx.fillRect(cx - 40 - ph * 8, feet - 8 - rnd(i, 3) * 20 - ph * 0.5, 6, 6);
      }
      ctx.restore();
      this.zselStamp(ctx, 'MAIS RÁPIDO QUE TODOS.', 640, top + 70, 52, '#ffe4e6', u, 90, 2, W * 0.86);
      this.ptdChip(ctx, 'HYOMA CHIGIRI', 30, bot - 40, CHI_C, seg(u, 4, 16), { size: 15, left: true });
      this.cineSfx(S, cut + 20, 'vento', () => window.SFX?.whoosh?.());
    },

    // PLANO 4 — o corte para dentro e o gol
    zselChi3(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.zselCast();
      const cut = 80;
      if (t < cut) {
        ctx.fillStyle = '#12020a';
        ctx.fillRect(0, 0, W, H);
        this.ptdRays(ctx, W * 0.55, H * 0.55, W * 1.1, '#e11d48', 0.4, t * 0.004, 40, 0.03);
        ctx.save();
        this.cineCamera(ctx, W, H, { zoom: 1 + t * 0.001, rot: -0.04, shake: t > 64 ? 8 * (1 - seg(t, 64, 80)) : 1.5 });
        this.zselHairStreaks(ctx, W * 0.42, H * 0.3, t, 700, '226,55,79', 7, 90);
        this.finSpr(ctx, c.chigiri, W * 0.44, H * 1.2, 760, { animState: 'idle', frame: 1, rim: '#fb7185' });
        ctx.restore();
        this.ptdBall(ctx, W * 0.74, lerp(H * 0.6, H * 0.72, seg(t, 0, 60)), 46, t * 0.4, '#fb7185');
        if (t >= 64) {
          this.cineImpactText(ctx, 'VAI!!', W * 0.76, top + 110, 100, CHI_C, seg(t, 64, 71), 0, -0.1);
          this.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, 64, 72)));
        }
        this.cineSfx(S, 64, 'chute', () => window.SFX?.kick?.(1));
        return;
      }
      const SS = Object.assign({}, S, { t: t - cut });
      this.ptdGoalHit(ctx, SS, { theme: THEME, sign: 'BLUE LOCK • PRÉDIO 5', hc: '#38bdf8', ac: '#22c55e', keeper: c.gkw, scorer: c.chigiri, color: '#fb7185', teamColor: CHI_C, word: 'GOOOOL!!', hx: W * 0.7, hit: 24, sfx: () => window.SFX?.goal?.(true) });
    },

    // PLANO 5 — "...não quebrou."
    zselChi4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.zselCast();
      const k = easeIO(t / S.dur);
      this.zselCloseBg(ctx, S, '#fb7185', 640, 0.08, t * 0.002);
      this.cineDust(ctx, W, H, t, 30, 'rgba(255,228,230,0.5)', 17);
      ctx.save();
      const breath = Math.sin(t * 0.09) * 6 * (1 - seg(t, 120, 240));
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.06, shake: 0.4 });
      const r = this.finHead(ctx, c.chigiri, 640, 340 + breath, 860, { dim: 0.06, dimTint: '30,4,10', rim: '#fda4af' });
      const down = t > 70 && t < 150;
      this.wcdEyes(ctx, 640, 340 + breath, r.u, { ring: '#f472b6', iris: '#831843', half: down, lid: this.finShade(c.chigiri.skinColor || '#fce4d6', -0.2), shine: 0.9, glow: 'rgba(244,63,94,0.3)', glowA: seg(t, 150, 190) });
      ctx.restore();
      // painel: o joelho inteiro
      const kp = ease(seg(t, 70, 86)) * (1 - seg(t, 150, 166));
      if (kp > 0) {
        this.finPanel(ctx, [[30, bot - 250], [420, bot - 236], [430, bot - 16], [20, bot - 16]], () => {
          ctx.fillStyle = '#1a0710';
          ctx.fillRect(0, bot - 260, 460, 260);
          this.cineGlow(ctx, 270, bot - 110, 140, 'rgba(255,228,230,0.35)');
          this.finCrop(ctx, c.chigiri, {}, 9, 19.5, 18, 12, 24, bot - 250, 390, 260);
          // a corrente partida, largada no chão
          this.foxcChain(ctx, 30, bot - 34, 420, bot - 26, { snap: 0.22, cut: 0.5, link: 28, thick: 7, color: '#6b7280', shine: '#e2e8f0' });
        }, { dy: (1 - kp) * 300, border: '#ffe4e6' });
      }
      // o time chegando dos lados
      const kt = ease(seg(t, 170, 230));
      if (kt > 0) {
        this.finRim(ctx, c.bachira, lerp(-260, 130, kt), bot + 210, 700, { animState: 'call_pass', frame: 1, dim: 0.35, dimTint: '20,10,4' }, '#fde68a', [1], 3);
        this.finRim(ctx, c.you, lerp(W + 260, W - 130, kt), bot + 210, 700, { flipX: true, dim: 0.35, dimTint: '4,10,30' }, '#5eead4', [-1], 3);
      }
      this.zselStamp(ctx, '...NÃO QUEBROU.', 640, top + 60, 52, '#ffe4e6', t, 24, 3, W * 0.8, 'center', 1 - seg(t, 160, 180));
      if (t > 200) this.cineImpactText(ctx, 'O RELÂMPAGO VERMELHO', 640, top + 64, 56, CHI_C, seg(t, 200, 210), W * 0.8, -0.03);
    }
  });

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  const draw = (names, warm) =>
    function (ctx, S) {
      this[names[S.phase]](ctx, S);
      this.zselWarm(S, warm);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    };
  const dryList = (names, ts) => names.flatMap((n, p) => (p === 0 ? [] : ts[p].map((t) => [n, p, t])));

  const BAROU_L = ['zselBarou0', 'zselBarou1', 'zselBarou2', 'zselBarou3', 'zselBarou4'];
  const BAROU_W = ['zselBarou0', 'zselBarou1', 'zselBarou2', 'zselBarou3w', 'zselBarou4w'];
  const barouSubs0 = [
    [
      { from: 12, to: 144, who: 'NARRADOR', text: 'Prédio 5. A estreia.', color: NARR_C },
      { from: 148, who: 'SHOUEI BAROU', text: '"Hmph. Plebeus."', color: BAROU_C }
    ],
    [
      { from: 16, to: 160, who: 'SHOUEI BAROU', text: '"Saiam da frente!"', color: BAROU_C },
      { from: 164, who: 'NARRADOR', text: 'Ninguém encosta nele.', color: NARR_C }
    ],
    [
      { from: 8, to: 162, who: 'NARRADOR', text: 'Gol. E outro. E mais outro.', color: NARR_C },
      { from: 164, who: 'SHOUEI BAROU', text: '"É só isso, Time Z?"', color: BAROU_C }
    ]
  ];
  CE.registerCine('barou_king', {
    phases: [290, 300, 310, 350, 330],
    music: 'tension',
    title: '👑 O REI',
    tags: ['PLANO 1 • A ESTREIA', 'PLANO 2 • O REI ATRAVESSA', 'PLANO 3 • DE NOVO E DE NOVO', 'PLANO 4 • NENHUM TALENTO', 'PLANO 5 • A DISTÂNCIA'],
    subs: [
      ...barouSubs0,
      [
        { from: 24, to: 202, who: 'SHOUEI BAROU', text: '"Você não tem talento nenhum."', color: BAROU_C },
        { from: 204, who: 'SHOUEI BAROU', text: '"Some do meu campo."', color: BAROU_C }
      ],
      [
        { from: 16, to: 180, who: 'VOCÊ', text: '(Eu nem encostei na bola.)', color: YOU_C },
        { from: 182, who: 'VOCÊ', text: '(Então essa é a distância...)', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw(BAROU_L, dryList(BAROU_L, [[], [20, 130, 250], [30, 120, 200], [60, 250], [60, 250]]))
  });
  CE.registerCine('barou_king_win', {
    phases: [290, 300, 310, 330, 450],
    music: 'tension',
    title: '👑 O REI (A VIRADA)',
    tags: ['PLANO 1 • A ESTREIA', 'PLANO 2 • O REI ATRAVESSA', 'PLANO 3 • DE NOVO E DE NOVO', 'PLANO 4 • A VIRADA', 'PLANO 5 • O PRIMEIRO OLHAR'],
    subs: [
      ...barouSubs0,
      [
        { from: 4, to: 162, who: 'NARRADOR', text: 'O Time Z virou contra o Rei.', color: NARR_C },
        { from: 166, who: 'SHOUEI BAROU', text: '"Sorte de principiante."', color: BAROU_C }
      ],
      [
        { from: 8, to: 182, who: 'SHOUEI BAROU', text: '"O Rei não perde duas vezes."', color: BAROU_C },
        { from: 184, to: 320, who: 'VOCÊ', text: '(O Rei me olhou com ódio.)', color: YOU_C },
        { from: 322, who: 'VOCÊ', text: '(Então eu existo aqui.)', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw(BAROU_W, dryList(BAROU_W, [[], [20, 130, 250], [30, 120, 200], [20, 80, 250], [60, 300]]))
  });

  const EGO = ['zselEgo0', 'zselEgo1', 'zselEgo2', 'zselEgo3', 'zselEgo4', 'zselEgo5'];
  CE.registerCine('ego_victory', {
    phases: [250, 300, 220, 310, 300, 310],
    music: 'epic',
    title: '😈 O GOSTO DO EGO',
    tags: ['PLANO 1 • XEQUE', 'PLANO 2 • UM PASSO DEPOIS', 'PLANO 3 • O ÚLTIMO LANCE', 'PLANO 4 • DE JOELHOS', 'PLANO 5 • BOM DEMAIS', 'PLANO 6 • O MONSTRO'],
    subs: [
      [
        { from: 16, to: 142, who: 'IKKI NIKO', text: '"Li tudo. Acabou."', color: NIKO_C },
        { from: 160, who: 'VOCÊ', text: '(...Será?)', color: YOU_C }
      ],
      [
        { from: 16, to: 188, who: 'VOCÊ', text: '(Ele leu tudo... então eu leio ele.)', color: YOU_C },
        { from: 190, who: 'VOCÊ', text: '(Um passo depois.)', color: YOU_C }
      ],
      [{ from: 4, who: 'NARRADOR', text: 'Último lance. Um chute só.', color: NARR_C }],
      [
        { from: 16, to: 176, who: 'IKKI NIKO', text: '"...Impossível. Eu li tudo."', color: NIKO_C },
        { from: 180, who: 'VOCÊ', text: '(Leu. Mas eu li depois.)', color: YOU_C }
      ],
      [
        { from: 14, to: 150, who: 'VOCÊ', text: '(Que sensação é essa...?)', color: YOU_C },
        { from: 152, who: 'VOCÊ', text: '(Vencer... é bom DEMAIS.)', color: YOU_C }
      ],
      [
        { from: 10, to: 160, who: 'VOCÊ', text: '(Devorar o plano de outro...)', color: YOU_C },
        { from: 162, who: 'VOCÊ', text: '(Quero sentir isso DE NOVO.)', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw(EGO, dryList(EGO, [[], [20, 200], [20, 120], [60], [100, 220], [60, 200]]))
  });

  const KUON = ['zselKuon0', 'zselKuon1', 'zselKuon2', 'zselKuon3', 'zselKuon4'];
  CE.registerCine('kuon_betrayal', {
    phases: [296, 280, 300, 370, 320],
    music: 'mystery',
    title: '🗡️ O TRAIDOR',
    tags: ['PLANO 1 • TUDO LIDO', 'PLANO 2 • OS GÊMEOS', 'PLANO 3 • O VESTIÁRIO', 'PLANO 4 • A CONFISSÃO', 'PLANO 5 • EGOÍSMO SEM GOL'],
    subs: [
      [
        { from: 4, to: 122, who: 'NARRADOR', text: 'Jogada ensaiada.', color: NARR_C },
        { from: 124, who: 'CHIGIRI', text: '"Eles sabiam pra onde a bola ia!"', color: CHI_C }
      ],
      [
        { from: 14, to: 158, who: 'WANIMA', text: '"Valeu pela dica, Time Z."', color: WANIMA_C },
        { from: 160, who: 'VOCÊ', text: '(...Dica? Que dica?)', color: YOU_C }
      ],
      [
        { from: 8, to: 192, who: 'RAICHI', text: '"Foi você, Kuon! Você vendeu a gente!"', color: RAICHI_C },
        { from: 196, who: 'KUON', text: '"...E se fui?"', color: KUON_C }
      ],
      [
        { from: 10, to: 168, who: 'KUON', text: '"Os gêmeos me fazem artilheiro."', color: KUON_C },
        { from: 170, who: 'KUON', text: '"Eu só fiz o que o Ego mandou: ser egoísta."', color: KUON_C }
      ],
      [
        { from: 12, to: 178, who: 'VOCÊ', text: '(Egoísmo sem gol... é só traição.)', color: YOU_C },
        { from: 180, who: 'VOCÊ', text: '"A gente vence sem você."', color: YOU_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw(KUON, [['zselWarmLocker', 2, 0], ...dryList(KUON, [[], [40, 200], [20, 200], [60, 250], [60, 200]])])
  });

  const CHI = ['zselChi0', 'zselChi1', 'zselChi2', 'zselChi3', 'zselChi4'];
  CE.registerCine('chigiri_sprint', {
    phases: [240, 360, 276, 300, 300],
    music: 'epic',
    title: '🐆 O RELÂMPAGO VERMELHO',
    tags: ['PLANO 1 • A PONTA LIVRE', 'PLANO 2 • AS CORRENTES', 'PLANO 3 • A ARRANCADA', 'PLANO 4 • O GOL', 'PLANO 5 • NÃO QUEBROU'],
    subs: [
      [{ from: 30, who: 'VOCÊ', text: '"CHIGIRI! A ponta tá livre!"', color: YOU_C }],
      [
        { from: 14, to: 196, who: 'CHIGIRI', text: '(E se o joelho estourar de novo?)', color: CHI_C },
        { from: 212, who: 'CHIGIRI', text: '"...Se quebrar, quebrou."', color: CHI_C }
      ],
      [
        { from: 36, to: 170, who: 'WANIMA', text: '"Ninguém alcança isso!"', color: WANIMA_C },
        { from: 170, who: 'VOCÊ', text: '(Ele tá voando!)', color: YOU_C }
      ],
      [{ from: 10, who: 'CHIGIRI', text: '"Eu sou o mais rápido daqui!"', color: CHI_C }],
      [
        { from: 20, to: 138, who: 'CHIGIRI', text: '"...Não quebrou."', color: CHI_C },
        { from: 160, who: 'BACHIRA', text: '"Que pernas, Chigiri!"', color: BACHIRA_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw(CHI, dryList(CHI, [[], [60, 220], [20, 120], [40, 140], [60, 200]]))
  });
})();
