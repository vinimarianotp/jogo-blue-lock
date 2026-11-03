// ============================================================================
// CENAS DOS FLUXOS (parte A) — ver js/cine_kit.js
// Cada Fluxo tem a sua ativação própria (o [G] da partida toca 'flow_<id>'):
//   fl_comum_foco          • Concentração de Jogo: o barulho vira uma linha, um batimento, os olhos abrem
//   fl_incomum_adrenalina  • Adrenalina de Sobrevivência: o carimbo "ELIMINADO" racha, as pernas pegam fogo verde
//   fl_raro_cacador        • Olhos de Caçador: o cheiro do gol no escuro, a mira trava, raios azuis nos olhos
//   fl_epico_rua           • Fluxo de Rua: o estádio some, a rua dourada se pavimenta e os postes acendem
//   fl_lendario_rei        • Rei Tirano: tempestade rubro-negra, a mandíbula de raio devora os zagueiros
//   fl_mitico_destruidor   • Destruidor Abissal: afundando no abismo, correntes estouram, o quadro tático racha
//   fl_wc_quatro_egos      • Quatro Egos: constelações na galáxia de peças → a singularidade
//   fl_comum_pulmao        • Pulmão de Aço: sem fôlego → o fole nos pulmões → a barra vira ∞
// A partida passa this.flowCfg = { flow, you, youName } (flow pode ser o combinado 'a+b').
// Sem config (teste) cada cena usa o próprio Fluxo do FLOWS_DB e this.cineYou().
// Helpers no CutsceneEngine com o prefixo "fxa". Usa os bonecos guardados da cine_partida (ptd*).
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas, um flash por impacto,
// olhos em close em pixel art, nada de frame 0 (piscada).
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
  const easeIn = (x) => clamp(x) * clamp(x);
  const back = (x) => {
    x = clamp(x);
    const c1 = 1.70158;
    return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };
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
  const path = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (m) return [1, 2, 3].map((i) => parseInt(m[i], 16));
    return [0, 245, 212];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;
  const mix = (a, b, k) => {
    const A = rgbOf(a);
    const B = rgbOf(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  const pulses = (t, list, len = 10) => list.reduce((a, b) => a + (t >= b && t < b + len ? Math.pow(1 - (t - b) / len, 2) : 0), 0);

  const KIT_BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const KIT_DEF = { jerseyPrimary: '#111827', jerseySecondary: '#7f1d1d' };
  const YOU = '#00f5d4';
  const RUN = [3, 7, 11, 15];
  const runF = (t, sp = 4) => RUN[Math.floor(t / sp) % RUN.length];

  // ==========================================================================
  // HELPERS (prefixo fxa)
  // ==========================================================================
  Object.assign(CE, {
    // Config do Fluxo desta cena: o da partida (se for este ou o combinado com este) ou o do banco
    fxaCfg(id) {
      const c = this.flowCfg;
      const live = !!(c && c.flow && String(c.flow.id || '').split('+').includes(id));
      const key = `${id}|${live ? `${c.flow.id}|${c.flow.name}` : '-'}|${this._cineRun || 0}`;
      if (this._fxaCfgC && this._fxaCfgC.key === key) return this._fxaCfgC.v;
      const own = (window.FLOWS_DB || []).find((f) => f.id === id) || { id, name: 'Fluxo', color: YOU, rarity: 'COMUM', duration: 10 };
      const flow = live ? c.flow : own;
      const rar = window.RARITY_TIERS?.[own.rarity];
      const v = {
        id,
        own,
        flow,
        color: own.color || YOU,
        you: Object.assign({}, (live && c.you) || this.cineYou(KIT_BL)),
        youName: String((live && c.youName) || window.App?.state?.profile?.name || 'Você'),
        name: String(flow.name || own.name || 'Fluxo').toUpperCase(),
        rarName: rar ? String(rar.name).split(' (')[0].toUpperCase() : '',
        rarColor: rar?.color || own.color || YOU,
        desc: window.describeFlow?.(flow) || '',
        dur: flow.duration || own.duration || 10
      };
      this._fxaCfgC = { key, v };
      return v;
    },

    // Fundos guardados por cena (ficam os das 2 últimas cenas de Fluxo: o mesmo Fluxo
    // costuma tocar várias vezes na partida)
    // scale < 1 monta em resolução menor (degradês/nuvens: ampliar suavizando não aparece) —
    // quem desenha passa o tamanho de destino
    fxaBg(key, w, h, fn, scale = 1) {
      const scene = this.sakugaType || '';
      const all = this._fxaBgs || (this._fxaBgs = new Map());
      let m = all.get(scene);
      if (!m) {
        m = new Map();
        all.set(scene, m);
        if (all.size > 2) all.delete(all.keys().next().value);
      }
      let cv = m.get(key);
      if (!cv) {
        if (this.fxaGate()) return this.fxaBlank();
        cv = document.createElement('canvas');
        cv.width = Math.ceil(w * scale);
        cv.height = Math.ceil(h * scale);
        const g = cv.getContext('2d');
        if (scale !== 1) g.scale(scale, scale);
        fn.call(this, g, w, h);
        // na pré-carga, pinta já (senão o Chrome só pinta no 1º uso, no meio da cena)
        if (this._fxaLoading) g.getImageData(0, 0, 1, 1);
        m.set(key, cv);
      }
      return cv;
    },
    // Na pré-carga, só um fundo novo por passada (o resto espera o próximo quadro)
    fxaGate() {
      if (!this._fxaLoading) return false;
      if (this._fxaBudget > 0) {
        this._fxaBudget--;
        return false;
      }
      this._fxaSkipped = true;
      return true;
    },
    fxaBlank() {
      if (!this._fxaBlankCv) {
        this._fxaBlankCv = document.createElement('canvas');
        this._fxaBlankCv.width = 2;
        this._fxaBlankCv.height = 2;
      }
      return this._fxaBlankCv;
    },
    // Pré-carga no começo do plano 1: alguns quadros pretos montando os fundos e bonecos
    // de TODOS os planos (um fundo pesado por quadro), em vez de travar no 1º quadro.
    // Devolve true enquanto ainda está carregando.
    fxaLoad(fns, S) {
      const key = `${this.sakugaType}|${this._cineRun}`;
      if (!this._fxaL || this._fxaL.key !== key) {
        const durs = this.getSakugaPhaseDurations();
        const list = [];
        durs.forEach((d, p) => [0, 0.3, 0.6, 0.97].forEach((f) => list.push([p, Math.floor(d * f)])));
        // (entrou no meio da cena — teste: desenha direto)
        this._fxaL = { key, list, i: 0, done: S.phase > 0 || S.t > 8, doneT: 0 };
        // o 1º quadro fica só preto (a moldura do kit já paga as coisas dela nele)
        if (!this._fxaL.done) return true;
      }
      const L = this._fxaL;
      if (L.done) return false;
      if (!this._fxaDummy) {
        const cv = document.createElement('canvas');
        cv.width = 2;
        cv.height = 2;
        this._fxaDummy = cv.getContext('2d');
      }
      const durs = this.getSakugaPhaseDurations();
      const t0 = performance.now();
      this._fxaWarming = true;
      this._fxaLoading = true;
      // os bonecos guardados (ptdEntry) também entram na fila: um novo por passada, já pintado
      const orig = this.ptdEntry;
      const fake = { cv: this.fxaBlank(), pad: 0, base: 180 };
      let depth = 0;
      let sprBudget = 0;
      this.ptdEntry = function (char, base, o) {
        // um item pesado por passada: um fundo OU um boneco
        if (depth === 0 && (sprBudget <= 0 || this._fxaBudget <= 0)) {
          this._fxaSkipped = true;
          return Object.assign({}, fake, { base });
        }
        const map = this._ptdSpr;
        const n0 = map ? map.size : 0;
        depth++;
        let e;
        try {
          e = orig.call(this, char, base, o);
        } finally {
          depth--;
        }
        if (depth === 0 && (this._ptdSpr ? this._ptdSpr.size : 0) !== n0) {
          sprBudget--;
          this._fxaBudget = 0;
          e.cv.getContext('2d').getImageData(0, 0, 1, 1);
        }
        return e;
      };
      try {
        while (L.i < L.list.length) {
          this._fxaBudget = 1;
          sprBudget = 1;
          this._fxaSkipped = false;
          const [p, t] = L.list[L.i];
          const g = this._fxaDummy;
          g.save();
          fns[p].call(this, g, Object.assign({}, S, { t, phase: p, dur: durs[p], p: t / durs[p] }));
          g.restore();
          if (!this._fxaSkipped) L.i++;
          // (máquina rápida monta vários itens no mesmo quadro; lenta, um por quadro)
          if (performance.now() - t0 > 3) break;
        }
      } finally {
        this.ptdEntry = orig;
        this._fxaWarming = false;
        this._fxaLoading = false;
        this._fxaBudget = 0;
      }
      if (L.i >= L.list.length) {
        L.done = true;
        L.doneT = S.t + 1;
      }
      return !L.done;
    },
    // Canvas pequeno guardado para sempre (pétala, pulmão, carimbo)
    fxaSmall(key, w, h, fn) {
      const c = this._fxaSmall || (this._fxaSmall = new Map());
      let cv = c.get(key);
      if (!cv) {
        if (this.fxaGate()) return this.fxaBlank();
        cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        fn.call(this, cv.getContext('2d'), w, h);
        if (this._fxaLoading) cv.getContext('2d').getImageData(0, 0, 1, 1);
        c.set(key, cv);
      }
      return cv;
    },

    fxaSfx(S, at, id, fn) {
      if (this._fxaWarming) return;
      this.cineSfx(S, at, id, fn);
    },
    // Aquecimento: desenha os próximos planos num canvas minúsculo (monta fundos e bonecos
    // guardados), um pedaço por quadro, para não travar nos cortes
    fxaWarm(fns, S) {
      const durs = this.getSakugaPhaseDurations();
      const key = `${this.sakugaType}|${this._cineRun}`;
      if (!this._fxaW || this._fxaW.key !== key) {
        const list = [];
        for (let p = 1; p < fns.length; p++) for (let t = 0; t < durs[p]; t += 6) list.push([p, t]);
        this._fxaW = { key, list, i: 0 };
      }
      const w = this._fxaW;
      if (w.i >= w.list.length || (S.phase === 0 && S.t < 2)) return;
      if (!this._fxaDummy) {
        const cv = document.createElement('canvas');
        cv.width = 2;
        cv.height = 2;
        this._fxaDummy = cv.getContext('2d');
      }
      const t0 = performance.now();
      this._fxaWarming = true;
      try {
        while (w.i < w.list.length && performance.now() - t0 < 2.5) {
          const [p, t] = w.list[w.i++];
          if (p <= S.phase) continue;
          const g = this._fxaDummy;
          g.save();
          fns[p].call(this, g, Object.assign({}, S, { t, phase: p, dur: durs[p], p: t / durs[p] }));
          g.restore();
        }
      } finally {
        this._fxaWarming = false;
      }
    },

    // Texto que entra letra por letra, cada uma batendo no lugar
    // Tamanho de fonte que cabe em maxW (guardado: cada tamanho novo de fonte custa caro
    // na 1ª vez, então mede uma vez e calcula na proporção)
    fxaFit(ctx, text, size, maxW) {
      if (!maxW) return size;
      const c = this._fxaFitC || (this._fxaFitC = new Map());
      const key = `${text}|${size}|${Math.round(maxW)}`;
      let fs = c.get(key);
      if (fs == null) {
        ctx.font = `italic 900 ${size}px "Segoe UI", sans-serif`;
        const w = ctx.measureText(text).width;
        fs = w > maxW ? Math.max(16, Math.floor((size * maxW) / w)) : size;
        if (c.size > 200) c.clear();
        c.set(key, fs);
      }
      return fs;
    },

    fxaStamp(ctx, text, x, y, size, color, t, t0, step = 2, maxW = 0, alpha = 1, align = 'center') {
      if (t < t0 || alpha <= 0) return null;
      ctx.save();
      const fs = this.fxaFit(ctx, text, size, maxW);
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      // posições das letras guardadas (medir tudo a cada quadro pesa)
      const lc = this._fxaLetC || (this._fxaLetC = new Map());
      const lkey = `${text}|${fs}`;
      let L = lc.get(lkey);
      if (!L) {
        let acc = '';
        const xs = [];
        for (let i = 0; i < text.length; i++) {
          xs.push([ctx.measureText(acc).width, ctx.measureText(text[i]).width]);
          acc += text[i];
        }
        L = { total: ctx.measureText(text).width, xs };
        if (lc.size > 200) lc.clear();
        lc.set(lkey, L);
      }
      const total = L.total;
      const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, fs / 9);
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const px = x0 + L.xs[i][0];
        const kk = clamp((t - t0 - i * step) / 7);
        if (kk <= 0 || ch === ' ') continue;
        const cw = L.xs[i][1];
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

    // O letreiro final: raridade, NOME DO FLUXO na cor dele, bônus e duração
    fxaTitle(ctx, S, o, t, t0, y, opt = {}) {
      const k = t - t0;
      if (k < 0) return;
      const { W } = S;
      const band = opt.band ?? 0.74;
      if (band > 0) {
        ctx.save();
        ctx.globalAlpha = ease(seg(k, 0, 12));
        const g = ctx.createLinearGradient(0, y - 120, 0, y + 140);
        g.addColorStop(0, 'rgba(2,6,23,0)');
        g.addColorStop(0.3, `rgba(2,6,23,${band})`);
        g.addColorStop(0.8, `rgba(2,6,23,${band})`);
        g.addColorStop(1, 'rgba(2,6,23,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, y - 120, W, 260);
        ctx.restore();
      }
      this.cineGlow(ctx, W / 2, y, 420, rgba(o.color, 0.3), ease(seg(k, 0, 18)));
      // nome: combinado (A + B) quebra no "+", nome com "(…)" ganha a 2ª linha menor
      const name = o.name;
      const two = name.includes(' + ') || (name.length > 30 && !/ \(.+\)$/.test(name));
      if (o.rarName) this.finKicker(ctx, W / 2, y - (two ? 100 : 80), `✦  FLUXO ${o.rarName}  ✦`, seg(k, 0, 16), o.rarColor, 'center');
      let lines;
      if (name.includes(' + ')) {
        const i = name.indexOf(' + ');
        lines = [[name.slice(0, i), 60, -34], ['+ ' + name.slice(i + 3), 60, 30]];
      } else if (/ \(.+\)$/.test(name)) {
        const i = name.lastIndexOf(' (');
        lines = [[name.slice(0, i), 80, -8], [name.slice(i + 1), 32, 44, true]];
      } else if (name.length > 30) {
        lines = this.ptdSplit(name, 30).map((s, i) => [s, 62, i ? 30 : -34]);
      } else lines = [[name, 92, 0]];
      const n = lines.reduce((a, l) => a + l[0].length, 0);
      const step = Math.min(2, 34 / Math.max(1, n));
      let acc = 0;
      let last = null;
      lines.forEach(([s, size, dy, small]) => {
        const st = this.fxaStamp(ctx, s, W / 2, y + dy, size, small ? '#f8fafc' : o.color, k, 4 + acc * step, step, W * 0.88);
        acc += s.length;
        if (st && !small) last = { st, y: y + dy };
      });
      if (last) {
        const lk = ease(seg(k, 8 + n * step * 0.6, 24 + n * step * 0.6));
        ctx.fillStyle = o.color;
        const lw = last.st.w * lk;
        const paren = lines.length > 1 && lines[1][3];
        ctx.fillRect(W / 2 - lw / 2, paren ? y + 68 : last.y + last.st.fs * 0.56, lw, 5);
      }
      // bônus em etiquetas
      const parts = String(o.desc || '').split(' • ').filter(Boolean).slice(0, 4);
      parts.push(`⏱ ${o.dur} SEGUNDOS`);
      ctx.save();
      ctx.font = '900 14px "Segoe UI", sans-serif';
      const ws = parts.map((p) => ctx.measureText(p).width + 14 * 1.6 + 10);
      ctx.restore();
      const total = ws.reduce((a, b) => a + b, 0) - 10;
      let x = W / 2 - total / 2;
      const cy = y + (opt.chipsDy ?? 92);
      parts.forEach((p, i) => {
        this.ptdChip(ctx, p, x, cy, i === parts.length - 1 ? '#facc15' : o.color, seg(k, 26 + i * 5, 36 + i * 5), { size: 14, left: true });
        x += ws[i];
      });
    },

    // Olhos fechados em pixel (pinta a pele por cima do olho do boneco e desenha o traço)
    fxaShut(ctx, char, cx, eyeY, u, o = {}) {
      const skin = char.skinColor || '#f3d1b8';
      const px = u * 0.34;
      const s = Math.ceil(px);
      [-1, 1].forEach((side) => {
        const ex = cx + side * 3.5 * u;
        ctx.fillStyle = skin;
        ctx.fillRect(Math.round(ex - 1.9 * u), Math.round(eyeY - 1.12 * u), Math.ceil(3.8 * u), Math.ceil(2.4 * u));
        if (o.dim) {
          ctx.fillStyle = `rgba(${o.dimTint || '2,6,23'},${o.dim})`;
          ctx.fillRect(Math.round(ex - 1.9 * u), Math.round(eyeY - 1.12 * u), Math.ceil(3.8 * u), Math.ceil(2.4 * u));
        }
        // "︶" relaxado: as pontas mais altas que o meio + um cílio na ponta de fora
        ctx.fillStyle = o.line || '#0a0f1c';
        const x0 = Math.round(ex - 6 * px);
        const y0 = Math.round(eyeY);
        for (let c = 0; c < 12; c++) {
          const dy = c < 2 || c > 9 ? -1 : c < 4 || c > 7 ? 0 : 1;
          ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + dy * px), s, s);
        }
        const outer = side < 0 ? 0 : 11;
        ctx.fillRect(Math.round(x0 + (outer + (side < 0 ? -1 : 1)) * px), Math.round(y0 - 2 * px), s, s);
      });
    },

    // Bocas em pixel (unidades do boneco): 'pant' ofegante, 'crazy' sorriso insano com a língua de fora
    fxaMouth(ctx, char, cx, top, u, kind, k = 1, o = {}) {
      const R = (x, y, w, h, c) => {
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(cx + (x - 18) * u), Math.round(top + y * u), Math.ceil(w * u), Math.ceil(h * u));
      };
      const skin = char.skinColor || '#f3d1b8';
      R(16.6, 11.8, 2.8, 1.2, skin);
      if (kind === 'pant') {
        const h = 0.7 + 1.1 * k;
        R(16.8, 11.8, 2.4, h, '#2b0a0a');
        R(17.1, 11.8, 1.8, 0.35, '#f1f5f9');
        if (h > 1.2) R(17.2, 11.8 + h - 0.45, 1.6, 0.45, '#be123c');
      } else if (kind === 'crazy') {
        R(14.9, 11.5, 6.2, 1.9, '#1a0505');
        R(14.3, 10.9, 0.8, 0.8, '#1a0505');
        R(20.9, 10.9, 0.8, 0.8, '#1a0505');
        R(15.2, 11.6, 5.6, 0.55, '#f8fafc');
        R(15.6, 12.85, 4.8, 0.4, '#e2e8f0');
        [16.3, 17.3, 18.4, 19.5].forEach((x) => R(x, 11.6, 0.18, 0.55, '#94a3b8'));
        // a língua pendurada
        const L = 2.4 * k;
        R(17.1, 12.5, 2.3, L, '#f472b6');
        R(17.1, 12.5, 0.45, L, '#db2777');
        R(18.0, 12.7, 0.25, L * 0.8, '#be185d');
        R(17.4, 12.5 + L, 1.7, 0.45, '#f472b6');
      }
      if (o.dim) R(14, 10.6, 8, 5.6, `rgba(${o.dimTint || '2,6,23'},${o.dim})`);
    },

    // Gotas de suor caindo (pixel)
    fxaDrops(ctx, xs, y0, y1, t, px, seed = 1) {
      ctx.save();
      xs.forEach((x, i) => {
        const per = 60 + rnd(i, seed) * 40;
        const ph = (t + rnd(i, seed + 2) * per) % per;
        const grow = clamp(ph / 24);
        const fall = Math.max(0, ph - 24);
        const y = y0 + fall * fall * 0.07 * ((y1 - y0) / 60);
        if (y > y1) return;
        const s = Math.ceil(px * (0.6 + 0.4 * grow));
        ctx.fillStyle = 'rgba(186,230,253,0.9)';
        ctx.fillRect(Math.round(x - s / 2), Math.round(y), s, Math.ceil(s * 1.4));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(x - s / 2), Math.round(y), Math.ceil(s / 3), Math.ceil(s / 3));
      });
      ctx.restore();
    },

    // Raio: pontos em zigue-zague de (x0,y0) a (x1,y1) (seed muda o desenho)
    fxaBoltPts(x0, y0, x1, y1, seed, n = 12, jag = 0.16) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      const pts = [[x0, y0]];
      for (let i = 1; i < n; i++) {
        const k = i / n;
        const off = (rnd(i, seed) - 0.5) * jag * L * (0.35 + Math.sin(Math.PI * k) * 0.65);
        pts.push([x0 + dx * k + nx * off, y0 + dy * k + ny * off]);
      }
      pts.push([x1, y1]);
      return pts;
    },
    fxaBolt(ctx, pts, outer, core, w = 5, glowA = 0.3) {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= glowA;
      ctx.strokeStyle = outer;
      ctx.lineWidth = w * 3;
      path(ctx, pts);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = outer;
      ctx.lineWidth = w;
      path(ctx, pts);
      ctx.stroke();
      ctx.strokeStyle = core;
      ctx.lineWidth = Math.max(1, w * 0.36);
      ctx.stroke();
      ctx.restore();
    },

    // Língua de fogo (base em x,y, ponta para cima): 3 camadas de fora para dentro
    fxaFlame(ctx, x, y, w, h, sway, cols) {
      [1, 0.66, 0.36].forEach((s, i) => {
        const ww = w * s;
        const hh = h * (0.5 + 0.5 * s);
        const sw = sway * (0.6 + 0.4 * s);
        ctx.fillStyle = cols[i];
        ctx.beginPath();
        ctx.moveTo(x - ww / 2, y);
        ctx.bezierCurveTo(x - ww * 0.62, y - hh * 0.42, x + sw * 0.3 - ww * 0.22, y - hh * 0.72, x + sw, y - hh);
        ctx.bezierCurveTo(x + sw * 0.3 + ww * 0.22, y - hh * 0.72, x + ww * 0.62, y - hh * 0.42, x + ww / 2, y);
        ctx.closePath();
        ctx.fill();
      });
    },

    // Pétala em pixel art (guardada por cor)
    fxaPetal(ctx, x, y, s, rot, color, alpha = 1) {
      const cv = this.fxaSmall(`petal|${color}`, 8, 5, (g) => {
        const rows = ['...XX...', '.XXXXXX.', 'XXXXXXXX', '.XXXXXX.', '...XX...'];
        rows.forEach((r, yy) =>
          [...r].forEach((c, xx) => {
            if (c !== 'X') return;
            g.fillStyle = yy === 1 && xx < 5 ? mix(color, '#ffffff', 0.45) : yy >= 3 ? mix(color, '#000000', 0.25) : color;
            g.fillRect(xx, yy, 1, 1);
          })
        );
      });
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(cv, -s * 0.8, -s * 0.5, s * 1.6, s);
      ctx.restore();
    },

    // Corrente: elos alternando de frente (anel) e de lado (barra), de (x0,y0) a (x1,y1)
    fxaChain(ctx, x0, y0, x1, y1, link, col = '#5f7a80', from = 0, to = 1) {
      const L = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.round(L / link));
      const st = L / n;
      ctx.save();
      ctx.translate(x0, y0);
      ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
      for (let i = 0; i < n; i++) {
        if (i / n < from || i / n >= to) continue;
        const cx = (i + 0.5) * st;
        if (i % 2 === 0) {
          ctx.lineWidth = st * 0.3;
          ctx.strokeStyle = '#020617';
          ctx.beginPath();
          ctx.ellipse(cx, 0, st * 0.62, st * 0.36, 0, 0, TAU);
          ctx.stroke();
          ctx.lineWidth = st * 0.17;
          ctx.strokeStyle = col;
          ctx.stroke();
          ctx.strokeStyle = mix(col, '#ffffff', 0.5);
          ctx.lineWidth = Math.max(1, st * 0.05);
          ctx.beginPath();
          ctx.ellipse(cx, 0, st * 0.62, st * 0.36, 0, Math.PI * 1.1, Math.PI * 1.6);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#020617';
          ctx.fillRect(cx - st * 0.62, -st * 0.15, st * 1.24, st * 0.3);
          ctx.fillStyle = col;
          ctx.fillRect(cx - st * 0.56, -st * 0.08, st * 1.12, st * 0.16);
          ctx.fillStyle = mix(col, '#ffffff', 0.45);
          ctx.fillRect(cx - st * 0.5, -st * 0.08, st * 1.0, Math.max(1, st * 0.05));
        }
      }
      ctx.restore();
    },

    // Estádio parado (arquibancada lotada, refletores, placas e gramado)
    fxaStadium(g, w, h, pal) {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, pal.sky[0]);
      sky.addColorStop(0.62, pal.sky[1]);
      sky.addColorStop(1, pal.sky[1]);
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      // cobertura com os refletores
      g.fillStyle = '#03050a';
      g.fillRect(0, 70, w, 62);
      [[150, 330], [950, 1130]].forEach(([a, b]) => {
        for (let x = a; x < b; x += 22) {
          for (let r = 0; r < 2; r++) {
            g.fillStyle = pal.lamp;
            g.fillRect(x, 88 + r * 14, 14, 8);
          }
        }
        const lg = g.createRadialGradient((a + b) / 2, 100, 10, (a + b) / 2, 100, 240);
        lg.addColorStop(0, pal.lampGlow);
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = lg;
        g.fillRect(a - 240, 0, b - a + 480, 360);
      });
      // a torcida (cabecinhas): um path por cor em cada fileira (milhares de fillRect
      // separados pesam muito na hora de pintar o canvas)
      const rows = 27;
      const nc = pal.crowd.length;
      for (let r = 0; r < rows; r++) {
        const y = 136 + r * 12.4;
        g.globalAlpha = 0.25 + 0.5 * (r / rows);
        for (let ci = 0; ci < nc; ci++) {
          g.beginPath();
          for (let x = 0; x < w; x += 8) {
            const q = rnd(x * 0.37 + r * 91, 3);
            if (Math.floor(q * nc) !== ci) continue;
            g.rect(x + Math.round(rnd(x, r) * 3), y + Math.round(q * 3), 5, 6);
          }
          g.fillStyle = pal.crowd[ci];
          g.fill();
        }
        if (r % 7 === 6) {
          g.globalAlpha = 1;
          g.fillStyle = 'rgba(2,4,10,0.85)';
          g.fillRect(0, y + 9, w, 4);
        }
      }
      g.globalAlpha = 1;
      // placas de publicidade e gramado
      g.fillStyle = '#05070d';
      g.fillRect(0, 470, w, 24);
      for (let x = 0; x < w; x += 160) {
        g.fillStyle = pal.board[(x / 160) % pal.board.length];
        g.fillRect(x + 4, 474, 152, 16);
      }
      const pg = g.createLinearGradient(0, 494, 0, h);
      pg.addColorStop(0, pal.pitch[0]);
      pg.addColorStop(1, pal.pitch[1]);
      g.fillStyle = pg;
      g.fillRect(0, 494, w, h - 494);
      g.fillStyle = 'rgba(255,255,255,0.035)';
      for (let i = 0; i < 6; i++) g.fillRect(0, 494 + Math.pow(i / 6, 1.5) * (h - 494), w, 8 + i * 6);
    },

    // Fundo de close: degradê + brilho radial na cor (guardado)
    fxaCloseBg(ctx, S, key, top, bottom, glow, cx = S.W / 2, cy = S.H * 0.42) {
      const { W, H } = S;
      ctx.drawImage(
        this.fxaBg(key, W, H, (g) => {
          const gr = g.createLinearGradient(0, 0, 0, H);
          gr.addColorStop(0, top);
          gr.addColorStop(1, bottom);
          g.fillStyle = gr;
          g.fillRect(0, 0, W, H);
          const rg = g.createRadialGradient(cx, cy, 10, cx, cy, W * 0.55);
          rg.addColorStop(0, glow);
          rg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = rg;
          g.fillRect(0, 0, W, H);
        }, 0.5), 0, 0, W, H);
    }
  });

  // ==========================================================================
  // 1. CONCENTRAÇÃO DE JOGO — uma respiração funda
  // ==========================================================================
  const PAL_FOCO = {
    sky: ['#04070e', '#0b1424'],
    lamp: '#e2e8f0',
    lampGlow: 'rgba(226,232,240,0.22)',
    crowd: ['#64748b', '#94a3b8', '#475569', '#cbd5e1', '#334155'],
    board: ['#1e293b', '#334155', '#0f172a'],
    pitch: ['#0f1a14', '#070b09']
  };
  Object.assign(CE, {
    // As ondas do barulho do estádio: 5 linhas que vão achatando até sobrar uma reta
    fxaFocoWaves(ctx, W, t, quiet, y0) {
      ctx.save();
      ctx.lineJoin = 'round';
      for (let i = 0; i < 5; i++) {
        const base = lerp(y0 - 180 + i * 90, y0, quiet);
        const A = (30 + i * 7) * (1 - quiet);
        const a = i === 2 ? 0.5 + 0.5 * quiet : 0.42 * (1 - quiet);
        if (a <= 0.01) continue;
        ctx.strokeStyle = `rgba(226,232,240,${a})`;
        ctx.lineWidth = i === 2 ? 2 + quiet * 2 : 2;
        ctx.beginPath();
        for (let x = -60; x <= W + 60; x += 10) {
          const j = rnd(Math.floor(x / 10) + Math.floor(t / 3) * 7, i + 1) - 0.5;
          const y = base + A * (Math.sin(x * 0.031 + t * 0.21 + i * 1.7) * 0.55 + Math.sin(x * 0.083 - t * 0.37 + i) * 0.3 + j * 0.6);
          if (x === -60) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    },

    // PLANO 1 — o estádio gritando; você fecha os olhos e respira
    fxaFoco0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_comum_foco');
      const quiet = easeIO(seg(t, 34, 150));
      const br = easeIO(seg(t, 30, 92)) - easeIO(seg(t, 104, 164));
      const eyeY = 330;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(380, 340, easeIO(t / 176)), zoom: 1 + 0.16 * easeIO(t / 176) + br * 0.02, shake: 0.4 + 2.2 * (1 - quiet) });
      ctx.drawImage(this.fxaBg('foco_std', W, H, (g, w, h) => this.fxaStadium(g, w, h, PAL_FOCO), 0.5), -30, -20, W + 60, H + 40);
      ctx.save();
      ctx.globalAlpha = 1 - quiet;
      this.cineBokeh(ctx, W, top + 30, 470, t, 16, ['rgba(254,240,138,0.42)', 'rgba(191,219,254,0.42)'], 7);
      ctx.restore();
      ctx.fillStyle = `rgba(3,6,12,${0.12 + 0.72 * quiet})`;
      ctx.fillRect(-60, -60, W + 120, H + 120);
      this.fxaFocoWaves(ctx, W, t, quiet, eyeY);
      this.cineShafts(ctx, 640, top - 70, Math.PI / 2, 600, 0.55, 5, '226,232,240', 0.05 + 0.08 * quiet, t);
      this.cineGlow(ctx, 640, 290, 320, 'rgba(226,232,240,0.16)', 0.3 + 0.7 * quiet);
      const ey = eyeY - br * 12;
      const r = this.ptdHead(ctx, o.you, 640, ey, 900, { rim: '#cbd5e1', rimD: 2 });
      this.fxaShut(ctx, o.you, 640, ey, r.u);
      ctx.restore();
      // o barulho em palavras, sumindo
      [['UOOOOH!!', 190, 196, -0.12], ['VAI!!', 1090, 176, 0.1], ['CHUTA!!', 175, 456, 0.08], ['OLÉ!!', 1105, 452, -0.06], ['AAAAH!!', 1035, 318, 0.06], ['DEFENDE!!', 230, 326, -0.05]].forEach(([s, x, y, rot], i) => {
        const a0 = 2 + i * 6;
        const fade = 1 - seg(t, 46 + i * 9, 76 + i * 9);
        if (fade <= 0) return;
        const jx = this.cineNoise(t * 2.2 + i * 9, i) * 5 * fade;
        const jy = this.cineNoise(t * 2.6 + i * 5, i + 3) * 4 * fade;
        this.ptdWord(ctx, s, x + jx, y + jy, 48 - i * 2, i % 2 ? '#e2e8f0' : '#94a3b8', seg(t, a0, a0 + 8), fade * 0.95, rot);
      });
      this.fxaStamp(ctx, 'INSPIRA...', 250, bot - 64, 44, '#e2e8f0', t, 32, 3, 0, 1 - seg(t, 96, 106));
      this.fxaStamp(ctx, '...E SOLTA.', 1030, bot - 64, 44, '#cbd5e1', t, 106, 3, 0, 1 - seg(t, 164, 174));
      this.fxaSfx(S, 32, 'in', () => window.SFX?.whoosh?.());
      this.fxaSfx(S, 106, 'out', () => window.SFX?.whoosh?.());
    },

    // PLANO 2 — a linha vira um batimento; os olhos abrem
    fxaFoco1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_comum_foco');
      ctx.fillStyle = '#080b12';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const beats = [24, 61];
      const bump = pulses(t, beats, 8);
      const open = t >= 68;
      ctx.save();
      ctx.translate(0, bump * 3);
      const mid = top + 262;
      // A — a faixa dos olhos
      const kA = ease(seg(t, 0, 12));
      this.cinePanel(
        ctx,
        [[0, top + 10], [W, top + 10], [W, mid - 22], [0, mid]],
        () => {
          ctx.fillStyle = '#121822';
          ctx.fillRect(0, top, W, mid);
          const U = lerp(42, 46, easeIO(t / 90));
          const cy = (top + 10 + mid - 11) / 2;
          this.ptdCrop(ctx, o.you, {}, 6, 6.6, 24, 7, 640 - 12 * U, cy - 3.4 * U, 24 * U, 7 * U);
          if (!open) this.fxaShut(ctx, o.you, 640, cy, U);
          else {
            this.ptdEyes(ctx, o.you, 640, cy, U, { ring: '#e2e8f0', iris: '#334155' });
            const sk = 1 - seg(t, 70, 86);
            [-1, 1].forEach((s) => this.finSparkle(ctx, 640 + s * 3.5 * U + 1.2 * U, cy - 0.6 * U, 26 * sk, sk));
          }
          ctx.fillStyle = 'rgba(15,23,42,0.16)';
          ctx.fillRect(0, top, W, mid);
        },
        { dx: (1 - kA) * -W }
      );
      // B — o monitor: a linha reta com dois batimentos
      const kB = ease(seg(t, 4, 16));
      this.cinePanel(
        ctx,
        [[0, mid + 12], [W, mid - 10], [W, bot - 10], [0, bot - 10]],
        () => {
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, mid - 20, W, bot - mid + 20);
          ctx.fillStyle = 'rgba(148,163,184,0.09)';
          for (let x = 0; x < W; x += 40) ctx.fillRect(x, mid - 20, 1, bot - mid + 20);
          for (let y = mid; y < bot; y += 40) ctx.fillRect(0, y, W, 1);
          const ly = (mid + bot) / 2 + 22;
          const head = 60 + t * 15;
          const shape = [[-60, 0], [-44, -10], [-30, 0], [-12, 0], [-6, 10], [0, -112], [7, 48], [14, 0], [40, 0], [56, -22], [74, 0]];
          const yAt = (x) => {
            for (const cx of [420, 980]) {
              const d = x - cx;
              if (d <= -60 || d >= 74) continue;
              for (let i = 1; i < shape.length; i++) {
                if (d <= shape[i][0]) {
                  const [a, ya] = shape[i - 1];
                  const [b, yb] = shape[i];
                  return ly + lerp(ya, yb, (d - a) / (b - a));
                }
              }
            }
            return ly;
          };
          ctx.save();
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(226,232,240,0.22)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(Math.min(W, head + 30), ly);
          ctx.lineTo(W, ly);
          ctx.stroke();
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 3;
          ctx.beginPath();
          const end = Math.min(W, head);
          for (let x = 0; x <= end; x += 3) {
            if (x) ctx.lineTo(x, yAt(x));
            else ctx.moveTo(x, yAt(x));
          }
          ctx.stroke();
          ctx.restore();
          if (head < W) this.cineGlow(ctx, head, yAt(head), 34, 'rgba(226,232,240,0.9)');
          beats.forEach((b, i) => this.ptdWord(ctx, 'TUM.', [420, 980][i], ly - 150, 46, '#e2e8f0', seg(t, b, b + 6), 1 - seg(t, b + 22, b + 32), i ? 0.06 : -0.06));
          // batimentos por minuto caindo
          const bpm = Math.round(lerp(152, 64, easeIO(seg(t, 0, 80))));
          ctx.save();
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.font = '900 40px "Segoe UI", sans-serif';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(String(bpm), W - 92, mid + 46);
          ctx.font = '900 14px "Segoe UI", sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('BPM', W - 40, mid + 54);
          const hs = 1 + bump * 0.4;
          ctx.translate(W - 196, mid + 46);
          ctx.scale(hs, hs);
          ctx.font = '900 30px "Segoe UI", sans-serif';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText('♥', 12, 0);
          ctx.restore();
          this.finKicker(ctx, 40, mid + 40, 'UM BATIMENTO DE CADA VEZ', seg(t, 8, 44), '#94a3b8');
        },
        { dy: (1 - kB) * 320 }
      );
      ctx.restore();
      this.fxaSfx(S, 24, 'b1', () => window.SFX?.blip?.(110));
      this.fxaSfx(S, 61, 'b2', () => window.SFX?.blip?.(110));
      this.fxaSfx(S, 68, 'eye', () => window.SFX?.blip?.(880));
    },

    // PLANO 3 — o mundo vira papel: só você e a linha. CONCENTRAÇÃO DE JOGO
    fxaFoco2(ctx, S) {
      const { W, H, t } = S;
      const o = this.fxaCfg('fl_comum_foco');
      const hit = 6;
      const eyeY = 262;
      ctx.drawImage(
        this.fxaBg('foco_paper', W, H, (g) => {
          const gr = g.createLinearGradient(0, 0, 0, H);
          gr.addColorStop(0, '#f1f5f9');
          gr.addColorStop(1, '#b8c2d0');
          g.fillStyle = gr;
          g.fillRect(0, 0, W, H);
        }, 0.5), 0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.06 - 0.06 * easeIO(t / 94), shake: t >= hit ? 8 * (1 - seg(t, hit, hit + 22)) : 0 });
      // ondas de foco saindo do olho
      ctx.save();
      ctx.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        const r = mod(t * 6 + i * 80, 560);
        ctx.strokeStyle = `rgba(15,23,42,${0.32 * (1 - r / 560)})`;
        ctx.beginPath();
        ctx.ellipse(640, eyeY, r * 1.4, r, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      this.ptdRays(ctx, 640, eyeY, W, '#0f172a', 0.07, t * 0.002, 40);
      // a reta que sobrou do barulho, cortando a tela na altura dos olhos
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-60, eyeY - 2, W + 120, 4);
      const r = this.ptdHead(ctx, o.you, 640, eyeY, 800, { rim: '#0f172a', rimD: 2 });
      this.ptdEyes(ctx, o.you, 640, eyeY, r.u, { ring: '#94a3b8', iris: '#1e293b' });
      const gl = 1 - seg(t, hit + 2, hit + 30);
      [-1, 1].forEach((s) => this.finSparkle(ctx, 640 + s * 3.5 * r.u + r.u, eyeY - 0.7 * r.u, 34 * gl, gl));
      ctx.restore();
      // faixa de tinta com o nome
      const kb = ease(seg(t, 18, 30));
      if (kb > 0) {
        ctx.save();
        ctx.translate((1 - kb) * W, 0);
        ctx.fillStyle = '#0f172a';
        poly(ctx, [[0, 420], [W, 396], [W, H], [0, H]]);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, 424, W, 3);
        ctx.restore();
      }
      this.fxaTitle(ctx, S, o, t, 24, 506, { band: 0, chipsDy: 88 });
      if (t >= hit) this.cineFlash(ctx, W, H, 0.55 * (1 - seg(t, hit, hit + 10)), '#ffffff');
      this.fxaSfx(S, hit, 'hit', () => window.SFX?.kick?.(0.8));
    }
  });

  // ==========================================================================
  // 2. ADRENALINA DE SOBREVIVÊNCIA — o medo de ser eliminado vira fogo verde
  // ==========================================================================
  const ADR_MAIN = [[310, -6], [290, 40], [318, 80], [282, 120], [306, 160], [276, 226]];
  const ADR_BR = [
    [[290, 40], [232, 62], [188, 52]],
    [[318, 80], [384, 98], [436, 90]],
    [[282, 120], [214, 142], [170, 136]],
    [[306, 160], [370, 182], [404, 214]]
  ];
  const ADR_L = [[-10, -10], ...ADR_MAIN, [-10, 232]];
  const ADR_R = [[610, -10], [610, 232], ...ADR_MAIN.slice().reverse()];
  Object.assign(CE, {
    fxaAdrStampCv(g, w, h) {
      g.strokeStyle = '#dc2626';
      g.lineWidth = 12;
      g.strokeRect(10, 10, w - 20, h - 20);
      g.lineWidth = 4;
      g.strokeRect(26, 26, w - 52, h - 52);
      let fs = 112;
      g.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      while (g.measureText('ELIMINADO').width > w - 80) {
        fs -= 4;
        g.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#dc2626';
      g.fillText('ELIMINADO', w / 2, h / 2 + 4);
      // tinta falhada de carimbo (dois lotes de furinhos, um path cada)
      g.globalCompositeOperation = 'destination-out';
      [0.5, 0.95].forEach((a, k) => {
        g.fillStyle = `rgba(0,0,0,${a})`;
        g.beginPath();
        for (let i = k * 260; i < (k + 1) * 260; i++) {
          const s = 1 + rnd(i, 8) * 4;
          g.rect(rnd(i, 5) * w, rnd(i, 6) * h, s, s);
        }
        g.fill();
      });
      g.globalCompositeOperation = 'source-over';
    },
    // O carimbo (centrado em 0,0): inteiro, rachando (luz verde por dentro) ou partido
    fxaAdrStamp(ctx, crack, split, t) {
      const cv = this.fxaSmall('adr_stamp', 600, 220, this.fxaAdrStampCv);
      const leak = Math.max(crack, split);
      if (leak > 0) this.cineGlow(ctx, 0, 0, 140 + 260 * leak, 'rgba(74,222,128,0.7)', 0.4 + 0.6 * leak);
      if (split <= 0) ctx.drawImage(cv, -300, -110);
      else {
        [[ADR_L, -1], [ADR_R, 1]].forEach(([pts, s]) => {
          ctx.save();
          ctx.translate(s * split * 46, -s * split * 10 + split * split * 30);
          ctx.rotate(s * split * 0.1);
          poly(ctx, pts.map(([x, y]) => [x - 300, y - 110]));
          ctx.clip();
          ctx.drawImage(cv, -300, -110);
          ctx.restore();
        });
      }
      if (crack <= 0 || split >= 1) return;
      // as rachaduras correndo (verde por dentro)
      const draw = (pts, k) => {
        let L = 0;
        for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        let rem = L * k;
        const out = [[pts[0][0] - 300, pts[0][1] - 110]];
        for (let i = 1; i < pts.length && rem > 0; i++) {
          const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
          const f = Math.min(1, rem / d);
          out.push([lerp(pts[i - 1][0], pts[i][0], f) - 300, lerp(pts[i - 1][1], pts[i][1], f) - 110]);
          rem -= d;
        }
        if (out.length < 2) return;
        // rachadura fina e quebrada: cada trecho ganha dois desvios
        const jag = [out[0]];
        for (let i = 1; i < out.length; i++) {
          const [ax, ay] = out[i - 1];
          const [bx, by] = out[i];
          const L = Math.hypot(bx - ax, by - ay) || 1;
          [0.33, 0.66].forEach((f, j) => {
            const off = (rnd(i * 3 + j, pts.length) - 0.5) * Math.min(14, L * 0.3);
            jag.push([lerp(ax, bx, f) + (-(by - ay) / L) * off, lerp(ay, by, f) + ((bx - ax) / L) * off]);
          });
          jag.push(out[i]);
        }
        ctx.save();
        ctx.lineJoin = 'miter';
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(34,197,94,0.35)';
        ctx.lineWidth = 9;
        path(ctx, jag);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 4;
        path(ctx, jag);
        ctx.stroke();
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      };
      ctx.save();
      ctx.globalAlpha = 1 - split;
      draw(ADR_MAIN, ease(crack));
      ADR_BR.forEach((b, i) => draw(b, ease(seg(crack, 0.3 + i * 0.12, 0.75 + i * 0.06))));
      ctx.restore();
    },

    // PLANO 1 — "ELIMINADO": o coração dispara... e o carimbo racha
    fxaAdr0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_incomum_adrenalina');
      const slam = 16;
      const beats = [30, 52, 70, 86, 100, 112, 123, 133, 142];
      const pulse = pulses(t, beats, 12);
      const imp = t >= slam ? 1 - seg(t, slam, slam + 22) : 0;
      const crack = seg(t, 100, 128);
      const split = ease(seg(t, 138, 164));
      const brave = t >= 142;
      this.fxaCloseBg(ctx, S, 'adr_bg0', '#1f0505', '#060101', 'rgba(239,68,68,0.22)', 900, 300);
      this.finFillPat(ctx, 'scan', 0, 0, W, H, 0.8);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + 0.05 * easeIO(t / 170) + pulse * 0.025, shake: 0.8 + imp * 8 + pulse * 1.6 });
      // você, encharcado de suor, a luz vermelha do telão no rosto
      const ex = 350;
      const eyeY = 300;
      this.cineGlow(ctx, 900, 300, 420, 'rgba(239,68,68,0.2)', 0.7 + pulse * 0.3);
      const r = this.ptdHead(ctx, o.you, ex, eyeY, 880, { dim: 0.16, dimTint: '80,0,0', rim: '#f87171', rimD: 2 });
      if (brave) {
        this.ptdEyes(ctx, o.you, ex, eyeY, r.u, { ring: '#4ade80', iris: '#14532d', angry: true });
        [-1, 1].forEach((s) => this.cineGlow(ctx, ex + s * 3.5 * r.u, eyeY, r.u * 3, 'rgba(74,222,128,0.6)', seg(t, 142, 152)));
      } else {
        const look = t > slam ? [0, 1, 0, -1][Math.floor(t / 3) % 4] : 0;
        this.ptdEyes(ctx, o.you, ex, eyeY, r.u, { ring: '#fca5a5', iris: '#7f1d1d', tiny: t > slam, look });
      }
      this.fxaDrops(ctx, [ex - 8.6 * r.u, ex + 8.4 * r.u, ex - 6.8 * r.u, ex + 6.2 * r.u], r.top + 6.5 * r.u, bot + 40, t, r.u * 0.42, 5);
      // o carimbo
      ctx.save();
      ctx.translate(900, 286);
      ctx.rotate(-0.13);
      const ks = seg(t, slam - 6, slam);
      ctx.globalAlpha = Math.min(1, ks * 3);
      const sc = lerp(2.4, 0.9, ease(ks)) * (1 + pulse * 0.02);
      ctx.scale(sc, sc);
      if (ks > 0) this.fxaAdrStamp(ctx, crack, split, t);
      ctx.restore();
      ctx.restore();
      this.finKicker(ctx, 690, top + 34, 'BLUE LOCK • RESULTADO DA SELEÇÃO', seg(t, 22, 60), '#f87171');
      // TUM nos batimentos
      beats.slice(0, 6).forEach((b, i) => {
        const x = i % 2 ? 700 : 110;
        const y = i % 2 ? bot - 80 : bot - 120 - (i % 3) * 30;
        this.ptdWord(ctx, 'TUM', x, y, 50 + i * 4, '#fecaca', seg(t, b, b + 5), 1 - seg(t, b + 12, b + 20), i % 2 ? 0.08 : -0.08);
      });
      if (brave) this.fxaStamp(ctx, 'AINDA NÃO!!', 920, bot - 74, 62, '#4ade80', t, 146, 2);
      // a vinheta vermelha pulsando junto com o coração
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.35 + pulse * 0.45) * (1 - split * 0.6);
      ctx.drawImage(
        this.fxaBg('adr_vig', W, H, (g) => {
          const grd = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.56);
          grd.addColorStop(0, 'rgba(120,0,0,0)');
          grd.addColorStop(1, 'rgba(120,0,0,0.85)');
          g.fillStyle = grd;
          g.fillRect(0, 0, W, H);
        }, 0.5), 0, 0, W, H);
      ctx.restore();
      if (t >= slam) this.cineFlash(ctx, W, H, 0.32 * (1 - seg(t, slam, slam + 10)), '#fecaca');
      this.fxaSfx(S, slam, 'slam', () => window.SFX?.kick?.(0.9));
      beats.slice(0, 5).forEach((b, i) => this.fxaSfx(S, b, `b${i}`, () => window.SFX?.blip?.(90)));
      this.fxaSfx(S, 128, 'crack', () => window.SFX?.tackle?.());
    },

    // PLANO 2 — de baixo: as chuteiras pegam fogo verde e sobe pelas pernas
    fxaAdr1(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.fxaCfg('fl_incomum_adrenalina');
      const ig = 14;
      const k = ease(seg(t, ig, 44));
      const beats = [4, 28, 50, 70, 86];
      const bump = pulses(t, beats, 9);
      const FY = 612;
      ctx.drawImage(
        this.fxaBg('adr_ground', W, H, (g) => {
          const gr = g.createLinearGradient(0, 0, 0, 430);
          gr.addColorStop(0, '#010603');
          gr.addColorStop(1, '#06200f');
          g.fillStyle = gr;
          g.fillRect(0, 0, W, 430);
          const gg = g.createLinearGradient(0, 430, 0, H);
          gg.addColorStop(0, '#07260f');
          gg.addColorStop(1, '#020a05');
          g.fillStyle = gg;
          g.fillRect(0, 430, W, H - 430);
          g.strokeStyle = 'rgba(187,247,208,0.07)';
          g.lineWidth = 2;
          for (let i = -12; i <= 12; i++) {
            g.beginPath();
            g.moveTo(640 + i * 40, 430);
            g.lineTo(640 + i * 260, H);
            g.stroke();
          }
          for (let i = 0; i < 8; i++) {
            const y = 430 + Math.pow(i / 8, 1.7) * (H - 430);
            g.fillStyle = 'rgba(187,247,208,0.05)';
            g.fillRect(0, y, W, 2);
          }
        }),
        0,
        0
      );
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.03 + bump * 0.02, shake: 1 + (t >= ig ? 6 * (1 - seg(t, ig, ig + 26)) : 0) + bump * 2 });
      this.cineGlow(ctx, 640, FY - 40, 120 + 340 * k, 'rgba(34,197,94,0.5)', 0.5 + 0.5 * k);
      // rachaduras no chão saindo das chuteiras
      if (t >= ig) {
        const kc = ease(seg(t, ig, ig + 12));
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (0.02 + (i / 8) * 0.96) + (rnd(i, 3) - 0.5) * 0.2;
          const L = (110 + rnd(i, 4) * 260) * kc;
          const pts = this.fxaBoltPts(640, FY, 640 + Math.cos(a) * L * 1.6, FY + Math.sin(a) * L * 0.18 + 10, i + 20, 6, 0.25);
          this.fxaBolt(ctx, pts, 'rgba(34,197,94,0.85)', '#dcfce7', 3, 0.3);
        }
      }
      const U = 1000 / 36;
      const legs = [640 + (14.3 - 18) * U, 640 + (21.3 - 18) * U];
      const COLS = ['rgba(21,128,61,0.88)', 'rgba(34,197,94,0.92)', 'rgba(220,252,231,0.95)'];
      const flames = (front) =>
        legs.forEach((lx, l) => {
          const n = front ? 4 : 6;
          for (let i = 0; i < n; i++) {
            const fx = lx + (i - (n - 1) / 2) * (front ? 26 : 24);
            const h = (30 + (front ? 150 : 300) * k) * (0.6 + 0.4 * rnd(i + l * 9, front ? 2 : 1)) * (0.85 + 0.15 * Math.sin(t * 0.45 + i * 1.7 + l));
            this.fxaFlame(ctx, fx, FY + 4, front ? 48 : 62, h, Math.sin(t * 0.21 + i + l * 2) * 18, COLS);
          }
        });
      if (k > 0) flames(false);
      this.ptdSpr(ctx, o.you, 640, FY, 1000, { rim: '#4ade80', rimD: 1 });
      if (k > 0) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        flames(true);
        ctx.restore();
        // brasas subindo
        for (let i = 0; i < 40; i++) {
          const ph = mod(t * (2.6 + rnd(i, 5) * 2) + rnd(i, 6) * 500, 500);
          const x = legs[i % 2] + (rnd(i, 7) - 0.5) * 220 + Math.sin(t * 0.06 + i) * 16;
          const y = FY - ph;
          ctx.globalAlpha = k * (1 - ph / 500);
          ctx.fillStyle = i % 3 ? '#4ade80' : '#dcfce7';
          ctx.fillRect(Math.round(x), Math.round(y), i % 4 ? 4 : 6, i % 4 ? 4 : 6);
        }
        ctx.globalAlpha = 1;
      }
      // suor voando do corpo
      for (let i = 0; i < 10; i++) {
        const b = beats[i % beats.length] + (i % 3);
        const d = t - b;
        if (d < 0 || d > 30) continue;
        const s = i % 2 ? 1 : -1;
        const x = 640 + s * (180 + d * (5 + rnd(i, 2) * 4));
        const y = 200 + rnd(i, 3) * 160 - d * 3 + d * d * 0.22;
        ctx.fillStyle = 'rgba(186,230,253,0.9)';
        ctx.fillRect(Math.round(x), Math.round(y), 7, 9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
      }
      ctx.restore();
      beats.slice(0, 4).forEach((b, i) => this.ptdWord(ctx, 'TUM!', i % 2 ? 1040 : 210, top + 86 + (i % 2) * 40, 64 + i * 6, '#bbf7d0', seg(t, b, b + 5), 1 - seg(t, b + 12, b + 20), i % 2 ? 0.1 : -0.1));
      this.fxaStamp(ctx, 'CORRE!!', 1010, 400, 84, '#4ade80', t, 52, 3, 0, 1 - seg(t, 86, 94));
      this.fxaSfx(S, ig, 'ign', () => window.SFX?.tackle?.());
      beats.forEach((b, i) => this.fxaSfx(S, b, `hb${i}`, () => window.SFX?.blip?.(80)));
    },

    // PLANO 3 — a arrancada com as pernas em chamas. ADRENALINA DE SOBREVIVÊNCIA
    fxaAdr2(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.fxaCfg('fl_incomum_adrenalina');
      const GY = 440;
      ctx.drawImage(
        this.fxaBg('adr_run', W, H, (g) => {
          const gr = g.createLinearGradient(0, 0, 0, GY);
          gr.addColorStop(0, '#020a05');
          gr.addColorStop(1, '#0a3a1c');
          g.fillStyle = gr;
          g.fillRect(0, 0, W, GY);
          const gg = g.createLinearGradient(0, GY, 0, H);
          gg.addColorStop(0, '#0b2a14');
          gg.addColorStop(1, '#010603');
          g.fillStyle = gg;
          g.fillRect(0, GY, W, H - GY);
          const rg = g.createRadialGradient(560, 300, 10, 560, 300, 520);
          rg.addColorStop(0, 'rgba(74,222,128,0.28)');
          rg.addColorStop(1, 'rgba(74,222,128,0)');
          g.fillStyle = rg;
          g.fillRect(0, 0, W, H);
        }),
        0,
        0
      );
      this.ptdSpeed(ctx, S, t, '#4ade80', 0.22, 1, 46, 24, top, GY - 10, 5);
      // riscos do gramado passando
      ctx.fillStyle = 'rgba(187,247,208,0.16)';
      for (let i = 0; i < 18; i++) {
        const y = GY + 6 + Math.pow(rnd(i, 3), 1.6) * 150;
        const len = 80 + rnd(i, 4) * 200;
        const x = W - mod(rnd(i, 5) * (W + 400) + t * (30 + (y - GY) * 0.3), W + 400) + 100;
        ctx.fillRect(Math.round(x), Math.round(y), len, 3);
      }
      ctx.fillStyle = 'rgba(74,222,128,0.5)';
      ctx.fillRect(0, GY, W, 2);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02, shake: 1.6 });
      const x = 600 + Math.sin(t * 0.05) * 10;
      const size = 360;
      // fogo verde escorrendo das pernas para trás (para a esquerda)
      const COLS = ['rgba(21,128,61,0.85)', 'rgba(34,197,94,0.9)', 'rgba(220,252,231,0.92)'];
      for (let i = 0; i < 7; i++) {
        const fy = GY - 8 - i * 13;
        const len = (120 + rnd(i, 2) * 140) * (0.82 + 0.18 * Math.sin(t * 0.5 + i * 1.3));
        ctx.save();
        ctx.translate(x - 4 + (i % 2) * 14, fy);
        ctx.rotate(-Math.PI / 2 + Math.sin(t * 0.3 + i) * 0.05);
        this.fxaFlame(ctx, 0, 0, 30 + (i % 3) * 6, len, Math.sin(t * 0.37 + i) * 12, COLS);
        ctx.restore();
      }
      this.cineGlow(ctx, x - 60, GY - 50, 220, 'rgba(34,197,94,0.45)');
      this.ptdSpr(ctx, o.you, x, GY, size, { animState: 'run', frame: runF(t, 3), rim: '#22c55e', rimD: 1 });
      for (let i = 0; i < 34; i++) {
        const ph = mod(t * (9 + rnd(i, 5) * 8) + rnd(i, 6) * 900, 900);
        const ex = x - 20 - ph;
        const ey = GY - 20 - rnd(i, 7) * 120 - Math.sin(ph * 0.02 + i) * 14;
        ctx.globalAlpha = 1 - ph / 900;
        ctx.fillStyle = i % 3 ? '#4ade80' : '#f0fdf4';
        ctx.fillRect(Math.round(ex), Math.round(ey), i % 4 ? 4 : 6, i % 4 ? 4 : 6);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // pedaços do carimbo passando na frente e queimando
      const cv = this.fxaSmall('adr_stamp', 600, 220, this.fxaAdrStampCv);
      for (let i = 0; i < 5; i++) {
        const d = t - i * 5;
        if (d < 0 || d > 44) continue;
        const px = W + 160 - d * (36 + i * 6);
        const py = top + 80 + rnd(i, 2) * 380;
        const s = 0.55 + rnd(i, 3) * 0.5;
        const a = 1 - seg(d, 18, 44);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(px, py);
        ctx.rotate(d * 0.08 * (i % 2 ? 1 : -1) + i);
        ctx.scale(s, s);
        const pts = [[-90, -60], [70, -80], [110, 30], [-40, 70], [-110, 10]].map(([a2, b2]) => [a2 * (0.8 + rnd(i, 9) * 0.4), b2]);
        ctx.save();
        poly(ctx, pts);
        ctx.clip();
        ctx.fillStyle = 'rgba(254,226,226,0.85)';
        ctx.fillRect(-120, -90, 240, 180);
        ctx.drawImage(cv, -150 - i * 60, -110 + (i % 2) * 20);
        ctx.restore();
        poly(ctx, pts);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#22c55e';
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#dcfce7';
        ctx.stroke();
        ctx.restore();
      }
      this.fxaTitle(ctx, S, o, t, 24, 516);
      this.fxaSfx(S, 2, 'go', () => window.SFX?.whoosh?.());
    }
  });

  // ==========================================================================
  // 3. OLHOS DE CAÇADOR FAMINTO — o cheiro do gol no escuro
  // ==========================================================================
  const KEEPER = { jerseyPrimary: '#111827', jerseySecondary: '#facc15' };
  Object.assign(CE, {
    // A trilha do cheiro: 3 fios azuis ondulando ao longo de uma curva (revelada até k)
    fxaScent(ctx, P, t, k, w = 1) {
      const N = 64;
      const at = (u) => {
        const v = 1 - u;
        return [
          v * v * v * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u * u * u * P[3][0],
          v * v * v * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u * u * u * P[3][1]
        ];
      };
      const n = Math.max(2, Math.floor(N * k));
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      [[16, 0.08], [7, 0.22], [2.5, 0.75]].forEach(([lw, a], li) => {
        for (let s = 0; s < 3; s++) {
          ctx.strokeStyle = li === 2 && s === 1 ? `rgba(224,242,254,${a})` : `rgba(56,189,248,${a})`;
          ctx.lineWidth = lw * w * (s === 1 ? 1 : 0.7);
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const u = i / (N - 1);
            const [x, y] = at(u);
            const off = Math.sin(i * 0.34 + t * 0.09 + s * 2.1) * (10 + s * 7) * w * Math.sin(Math.PI * Math.min(1, u * 1.15));
            if (i) ctx.lineTo(x, y + off);
            else ctx.moveTo(x, y + off);
          }
          ctx.stroke();
        }
      });
      ctx.restore();
      // partículas correndo pela trilha
      ctx.fillStyle = '#bae6fd';
      for (let i = 0; i < 34; i++) {
        const u = mod(rnd(i, 4) + t * (0.004 + rnd(i, 5) * 0.004), 1) * k;
        const [x, y] = at(u);
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.2 + i);
        ctx.fillRect(Math.round(x + (rnd(i, 6) - 0.5) * 24 * w), Math.round(y + (rnd(i, 7) - 0.5) * 24 * w), 3, 3);
      }
      ctx.globalAlpha = 1;
      return at;
    },

    // PLANO 1 — o escuro; do gol vem um cheiro azul até você
    fxaCac0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_raro_cacador');
      const pan = easeIO(seg(t, 0, 128));
      const sniff = easeIO(seg(t, 86, 108)) * (1 - easeIO(seg(t, 110, 130)));
      const open = t >= 112;
      ctx.fillStyle = '#010307';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(1100, 700, pan), y: 360, zoom: lerp(1.0, 1.08, pan), shake: 0.6 });
      // o campo quase invisível
      ctx.drawImage(
        this.fxaBg('cac_dark', 2000, H, (g, w, h) => {
          const gr = g.createLinearGradient(0, 0, 0, h);
          gr.addColorStop(0, '#010208');
          gr.addColorStop(0.62, '#030a16');
          gr.addColorStop(1, '#02060c');
          g.fillStyle = gr;
          g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(148,163,184,0.08)';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(0, 520);
          g.lineTo(w, 470);
          g.moveTo(980, 600);
          g.lineTo(1250, 478);
          g.moveTo(1250, 478);
          g.lineTo(1720, 474);
          g.stroke();
          // o gol lá no fundo (apagado): rede em perspectiva, postes e travessão
          g.strokeStyle = 'rgba(148,163,184,0.08)';
          g.lineWidth = 1;
          for (let i = 0; i <= 20; i++) {
            const x = lerp(1310, 1610, i / 20);
            const xb = lerp(1340, 1580, i / 20);
            g.beginPath();
            g.moveTo(x, 300);
            g.lineTo(xb, 326);
            g.lineTo(xb, 462);
            g.stroke();
          }
          for (let j = 0; j <= 10; j++) {
            const y = lerp(326, 462, j / 10);
            g.beginPath();
            g.moveTo(1340, y);
            g.lineTo(1580, y);
            g.stroke();
          }
          g.fillStyle = 'rgba(226,232,240,0.28)';
          g.fillRect(1304, 296, 8, 178);
          g.fillRect(1608, 296, 8, 178);
          g.fillRect(1304, 294, 312, 7);
        }),
        -340,
        0
      );
      this.cineGlow(ctx, 1460 - 340, 400, 260, 'rgba(56,189,248,0.22)', 0.6 + 0.4 * Math.sin(t * 0.08));
      // a trilha: do gol até o seu nariz
      const hx = 360;
      const eyeY = 330 - sniff * 10;
      const size = 860;
      const u = size / 36;
      const nose = [hx + 0.6 * u, eyeY + 1.6 * u];
      // você no escuro, a luz azul recortando
      this.cineGlow(ctx, hx + 120, eyeY + 40, 260, 'rgba(56,189,248,0.16)', seg(t, 60, 110));
      const r = this.ptdHead(ctx, o.you, hx, eyeY, size, { dim: 0.5, dimTint: '2,6,20', rim: '#38bdf8', rimD: 2 });
      // (a trilha passa na frente do rosto até o nariz)
      this.fxaScent(ctx, [[1120, 400], [900, 210], [640, 560], nose], t, ease(seg(t, 8, 108)));
      this.cineGlow(ctx, nose[0], nose[1], 60, 'rgba(56,189,248,0.6)', seg(t, 96, 112));
      if (!open) this.fxaShut(ctx, o.you, hx, eyeY, r.u, { dim: 0.5, dimTint: '2,6,20' });
      else {
        this.ptdEyes(ctx, o.you, hx, eyeY, r.u, { ring: '#38bdf8', iris: '#0c4a6e', tiny: true });
        [-1, 1].forEach((s) => this.cineGlow(ctx, hx + s * 3.5 * r.u, eyeY, r.u * 3, 'rgba(56,189,248,0.6)', seg(t, 112, 120)));
      }
      ctx.restore();
      this.finKicker(ctx, 760, top + 40, 'O GOL TEM CHEIRO', seg(t, 30, 70), '#38bdf8');
      this.fxaStamp(ctx, 'ACHEI.', 980, bot - 90, 72, '#7dd3fc', t, 120, 3);
      this.fxaSfx(S, 92, 'sniff', () => window.SFX?.whoosh?.());
      this.fxaSfx(S, 112, 'eye', () => window.SFX?.blip?.(990));
    },

    // PLANO 2 — a mira: varre o gol e trava no ângulo
    fxaCac1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const lock = 62;
      const tgt = [928, 228];
      const lk = ease(seg(t, lock - 6, lock));
      const mv = easeIO(seg(t, 18, 56));
      const nz = 1 - mv;
      const cx = lerp(600, tgt[0], mv) + this.cineNoise(t * 1.4, 2) * 40 * nz;
      const cy = lerp(400, tgt[1], mv) + this.cineNoise(t * 1.2, 5) * 30 * nz;
      const zk = easeIO(seg(t, lock, 100));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 760, zk), y: lerp(360, 300, zk), zoom: 1 + zk * 0.14, shake: t >= lock ? 4 * (1 - seg(t, lock, lock + 14)) : 0.5 });
      ctx.drawImage(
        this.fxaBg('cac_goal', W, H, (g) => {
          g.fillStyle = '#01040a';
          g.fillRect(0, 0, W, H);
          const gg = g.createLinearGradient(0, 520, 0, H);
          gg.addColorStop(0, '#04140c');
          gg.addColorStop(1, '#010604');
          g.fillStyle = gg;
          g.fillRect(0, 520, W, H - 520);
          // rede (fundo em perspectiva)
          g.strokeStyle = 'rgba(148,163,184,0.12)';
          g.lineWidth = 1;
          for (let i = 0; i <= 28; i++) {
            const x = lerp(300, 980, i / 28);
            const xb = lerp(370, 910, i / 28);
            g.beginPath();
            g.moveTo(x, 190);
            g.lineTo(xb, 240);
            g.lineTo(xb, 490);
            g.stroke();
          }
          for (let j = 0; j <= 14; j++) {
            const y = lerp(240, 490, j / 14);
            g.beginPath();
            g.moveTo(370, y);
            g.lineTo(910, y);
            g.stroke();
          }
          // postes e travessão
          g.fillStyle = '#cbd5e1';
          g.fillRect(292, 184, 16, 340);
          g.fillRect(972, 184, 16, 340);
          g.fillRect(292, 184, 696, 14);
          g.fillStyle = '#64748b';
          g.fillRect(302, 198, 6, 326);
          g.fillRect(982, 198, 6, 326);
          // pequena área
          g.strokeStyle = 'rgba(226,232,240,0.25)';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(120, 640);
          g.lineTo(200, 560);
          g.lineTo(1080, 560);
          g.lineTo(1160, 640);
          g.stroke();
          g.fillStyle = 'rgba(1,4,10,0.55)';
          g.fillRect(0, 0, W, H);
        }),
        0,
        0
      );
      // o cheiro escorrendo até o ângulo
      this.fxaScent(ctx, [[640, bot + 60], [420, 420], [980, 420], tgt], t, ease(seg(t, 0, 40)), 0.8);
      this.cineGlow(ctx, tgt[0], tgt[1], 90 + lk * 80, 'rgba(56,189,248,0.6)', 0.4 + 0.6 * lk);
      // goleiro e zagueiros (silhuetas com luz azul)
      const keeper = this.cineChar('gagamaru', KEEPER);
      this.ptdSpr(ctx, keeper, 640 + Math.sin(t * 0.06) * 18, 520, 250, { tint: '#030712', rim: '#38bdf8', rimD: 1 });
      ctx.restore();
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + zk * 0.06, shake: 0.8 });
      const d1 = this.cineChar('aryu', KIT_DEF);
      const d2 = this.cineChar('kiyora', KIT_DEF);
      this.ptdSpr(ctx, d1, 120, 800, 560, { facing: 'back', tint: '#010409', rim: '#1d4ed8', rimD: 1 });
      this.ptdSpr(ctx, d2, 1170, 820, 600, { facing: 'back', tint: '#010409', rim: '#1d4ed8', rimD: 1 });
      ctx.restore();
      // a mira (tela)
      const sc = 1 + zk * 0.14;
      const sx = 640 + (cx - lerp(640, 760, zk)) * sc;
      const sy = 360 + (cy - lerp(360, 300, zk)) * sc;
      const R = lerp(120, 44, lk);
      const col = lk >= 1 ? '#38bdf8' : '#e0f2fe';
      ctx.save();
      ctx.translate(sx, sy);
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.55, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => {
        ctx.moveTo(a * R * 0.3, b * R * 0.3);
        ctx.lineTo(a * (R + 40), b * (R + 40));
      });
      ctx.stroke();
      ctx.save();
      ctx.rotate((1 - lk) * t * 0.05);
      ctx.lineWidth = 4;
      const B = R * 1.35;
      ctx.beginPath();
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
        ctx.moveTo(a * B, b * B - b * 20);
        ctx.lineTo(a * B, b * B);
        ctx.lineTo(a * B - a * 20, b * B);
      });
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = col;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
      ctx.save();
      ctx.font = '900 15px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      if (lk < 1) {
        ctx.fillText(`BUSCANDO${'.'.repeat(1 + (Math.floor(t / 8) % 3))}`, sx + R + 28, sy - 16);
        ctx.fillText(`X ${Math.round(cx)}  Y ${Math.round(cy)}`, sx + R + 28, sy + 6);
      } else {
        ctx.fillText('ÂNGULO SUPERIOR • 17,8 m', sx - 120, sy + R + 74);
      }
      ctx.restore();
      if (t >= lock) this.cineImpactText(ctx, 'TRAVADO', sx - 40, sy + R + 40, 42, '#38bdf8', seg(t, lock, lock + 6), 0, -0.04);
      this.finKicker(ctx, 40, top + 30, 'VISÃO DO CAÇADOR', seg(t, 4, 40), '#38bdf8');
      [20, 34, 48].forEach((a, i) => this.fxaSfx(S, a, `tk${i}`, () => window.SFX?.blip?.(440 + i * 110)));
      this.fxaSfx(S, lock, 'lock', () => window.SFX?.blip?.(1320));
    },

    // PLANO 3 — raios azuis saindo dos olhos. OLHOS DE CAÇADOR FAMINTO
    fxaCac2(ctx, S) {
      const { W, H, t } = S;
      const o = this.fxaCfg('fl_raro_cacador');
      const hit = 6;
      const eyeY = 250;
      this.fxaCloseBg(ctx, S, 'cac_bg3', '#020617', '#0a1a3a', 'rgba(56,189,248,0.32)', 640, eyeY);
      this.ptdRays(ctx, 640, eyeY, W, '#38bdf8', 0.14, t * 0.003, 40);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.05 - 0.05 * easeIO(t / 100), shake: t >= hit ? 8 * (1 - seg(t, hit, hit + 24)) : 0 });
      const r = this.ptdHead(ctx, o.you, 640, eyeY, 900, { dim: 0.18, dimTint: '2,10,30', rim: '#7dd3fc', rimD: 2 });
      // raios saindo dos olhos (redesenhados a cada 3 quadros, como eletricidade)
      const fl = Math.floor(t / 3);
      const k = ease(seg(t, hit, hit + 10));
      [-1, 1].forEach((s) => {
        const ex = 640 + s * 3.5 * r.u;
        [-0.38, 0.02, 0.42].forEach((da, i) => {
          const a = (s < 0 ? Math.PI : 0) + s * da;
          const L = (200 + rnd(i + fl, s + 3) * 200) * k;
          if (L < 4) return;
          const x1 = ex + Math.cos(a) * L * s * s;
          const y1 = eyeY + Math.sin(a) * L * 0.55 - 30 * i * 0;
          const pts = this.fxaBoltPts(ex + s * 1.5 * r.u, eyeY, x1, y1, fl * 7 + i * 13 + (s > 0 ? 50 : 0), 9, 0.22);
          this.fxaBolt(ctx, pts, 'rgba(56,189,248,0.95)', '#f0f9ff', 5, 0.3);
          const m = pts[4];
          const br = this.fxaBoltPts(m[0], m[1], m[0] + s * 60, m[1] + (rnd(i, fl) - 0.5) * 120, fl + i * 5, 4, 0.3);
          this.fxaBolt(ctx, br, 'rgba(56,189,248,0.85)', '#e0f2fe', 3, 0.2);
        });
        this.cineGlow(ctx, ex, eyeY, r.u * 4, 'rgba(56,189,248,0.75)', k);
      });
      this.ptdEyes(ctx, o.you, 640, eyeY, r.u, { ring: '#38bdf8', iris: '#0c4a6e', tiny: true, angry: true });
      ctx.restore();
      this.fxaTitle(ctx, S, o, t, 24, 516);
      if (t >= hit) this.cineFlash(ctx, W, H, 0.42 * (1 - seg(t, hit, hit + 10)), '#bae6fd');
      this.fxaSfx(S, hit, 'hit', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 4. FLUXO DE RUA ILUMINADO — o estádio some e sobra uma rua dourada até o gol
  // ==========================================================================
  const PAL_RUA = {
    sky: ['#06040a', '#140d06'],
    lamp: '#fde68a',
    lampGlow: 'rgba(253,230,138,0.22)',
    crowd: ['#f59e0b', '#fbbf24', '#78350f', '#fde68a', '#b45309', '#ef4444', '#38bdf8'],
    board: ['#451a03', '#78350f', '#1c1917'],
    pitch: ['#10200f', '#060b06']
  };
  const PETALS = ['#f59e0b', '#fbbf24', '#fde68a', '#fb923c'];
  Object.assign(CE, {
    // PLANO 1 — o barulho some: a torcida vira pétalas e é levada pelo vento
    fxaRua0(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.fxaCfg('fl_epico_rua');
      const fade = easeIO(seg(t, 10, 76));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1 + 0.1 * easeIO(t / 96), shake: 0.5 + 1.2 * (1 - fade) });
      ctx.drawImage(this.fxaBg('rua_std', W, H, (g, w, h) => this.fxaStadium(g, w, h, PAL_RUA), 0.5), -30, -20, W + 60, H + 40);
      ctx.save();
      ctx.globalAlpha = 1 - fade;
      this.cineBokeh(ctx, W, top + 30, 460, t, 14, ['rgba(253,230,138,0.45)', 'rgba(251,146,60,0.35)'], 9);
      ctx.restore();
      ctx.fillStyle = `rgba(4,3,2,${0.15 + 0.8 * fade})`;
      ctx.fillRect(-60, -60, W + 120, H + 120);
      // pétalas saindo da arquibancada e voando para a direita
      for (let i = 0; i < 90; i++) {
        const t0 = 6 + rnd(i, 3) * 64;
        const d = t - t0;
        if (d < 0) continue;
        const x = rnd(i, 4) * (W + 100) - 50 + d * (3 + rnd(i, 5) * 4) + Math.sin(d * 0.05 + i) * 16;
        const y = 150 + rnd(i, 6) * 320 - d * (0.6 + rnd(i, 7)) + Math.sin(d * 0.08 + i * 2) * 10;
        const a = seg(d, 0, 6) * (1 - seg(d, 50, 80));
        if (a <= 0 || x > W + 40) continue;
        this.fxaPetal(ctx, x, y, 8 + rnd(i, 8) * 8, d * 0.06 * (i % 2 ? 1 : -1) + i, PETALS[i % 4], a);
      }
      // a luz quente em cima de você
      this.cineShafts(ctx, 640, top - 80, Math.PI / 2, 640, 0.42, 5, '253,230,138', 0.05 + 0.1 * fade, t);
      this.cineGlow(ctx, 640, 600, 260, 'rgba(251,191,36,0.3)', 0.3 + 0.7 * fade);
      ctx.fillStyle = `rgba(251,191,36,${0.18 * fade})`;
      ctx.beginPath();
      ctx.ellipse(640, 604, 190, 26, 0, 0, TAU);
      ctx.fill();
      this.ptdSpr(ctx, o.you, 640, 604, 340, { rim: '#fbbf24', rimD: 1 });
      this.ptdBall(ctx, 700, 592, 13, 0);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'O ESTÁDIO SUMIU', seg(t, 40, 76), '#fbbf24');
      this.fxaSfx(S, 10, 'wind', () => window.SFX?.whoosh?.());
    },

    // A rua de paralelepípedos dourados em perspectiva (aparece fileira por fileira)
    fxaRuaRoad(ctx, t, HY, nearY) {
      const N = 22;
      const Z = (i) => Math.pow(28, i / N);
      const Y = (z) => HY + (nearY - HY) / z;
      const HW = (z) => 560 / z;
      ctx.save();
      for (let i = N - 1; i >= 0; i--) {
        const ta = 6 + i * 3.6;
        const k = ease(seg(t, ta, ta + 8));
        if (k <= 0) continue;
        const z0 = Z(i);
        const z1 = Z(i + 1);
        const y0 = Y(z0) + (1 - k) * 14;
        const y1 = Y(z1) + (1 - k) * 14;
        const w0 = HW(z0);
        const w1 = HW(z1);
        ctx.globalAlpha = k;
        ctx.fillStyle = i % 2 ? '#d97706' : '#f59e0b';
        poly(ctx, [[640 - w0, y0], [640 + w0, y0], [640 + w1, y1], [640 - w1, y1]]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,53,15,0.85)';
        ctx.lineWidth = Math.max(1, 3 / Math.sqrt(z0));
        ctx.beginPath();
        ctx.moveTo(640 - w0, y0);
        ctx.lineTo(640 + w0, y0);
        for (let j = 0; j <= 7; j++) {
          const f = (j + (i % 2) * 0.5) / 7;
          if (f <= 0 || f >= 1) continue;
          ctx.moveTo(lerp(640 - w0, 640 + w0, f), y0);
          ctx.lineTo(lerp(640 - w1, 640 + w1, f), y1);
        }
        ctx.stroke();
        // brilho de cima de cada pedra
        ctx.fillStyle = 'rgba(254,243,199,0.35)';
        ctx.fillRect(640 - w1, y1, w1 * 2, Math.max(1, 2 / Math.sqrt(z0)));
      }
      ctx.globalAlpha = 1;
      // meio-fio dourado acendendo junto
      const kk = seg(t, 6, 6 + N * 3.6);
      const zf = Z(N * kk);
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      [-1, 1].forEach((s) => {
        ctx.moveTo(640 + s * HW(1), Y(1));
        ctx.lineTo(640 + s * HW(zf), Y(zf));
      });
      ctx.stroke();
      ctx.restore();
      // um véu de luz dourada sobre a rua
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, nearY, 0, HY);
      g.addColorStop(0, 'rgba(251,191,36,0.05)');
      g.addColorStop(1, `rgba(253,230,138,${0.3 * kk})`);
      ctx.fillStyle = g;
      poly(ctx, [[640 - HW(1), Y(1)], [640 + HW(1), Y(1)], [640 + HW(zf), Y(zf)], [640 - HW(zf), Y(zf)]]);
      ctx.fill();
      ctx.restore();
      return { Y, HW };
    },

    // PLANO 2 — a rua se pavimenta dos seus pés até o gol; os postes acendem um a um
    fxaRua1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_epico_rua');
      const HY = 300;
      const k = easeIO(t / 166);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(360, 334, k), zoom: lerp(1, 1.14, k), shake: 0.5 });
      ctx.drawImage(
        this.fxaBg('rua_night', W, H, (g) => {
          const gr = g.createLinearGradient(0, 0, 0, HY);
          gr.addColorStop(0, '#030208');
          gr.addColorStop(1, '#2a1a08');
          g.fillStyle = gr;
          g.fillRect(0, 0, W, HY);
          [0.3, 0.6].forEach((a, b) => {
            g.fillStyle = `rgba(255,247,237,${a})`;
            g.beginPath();
            for (let i = b; i < 160; i += 2) {
              const s = rnd(i, 3) < 0.85 ? 1.5 : 2.5;
              g.rect(rnd(i, 4) * W, rnd(i, 5) * HY * 0.85, s, s);
            }
            g.fill();
          });
          const gg = g.createLinearGradient(0, HY, 0, H);
          gg.addColorStop(0, '#0d0904');
          gg.addColorStop(1, '#050302');
          g.fillStyle = gg;
          g.fillRect(0, HY, W, H - HY);
        }),
        -40,
        -30,
        W + 80,
        H + 60
      );
      this.cineCity(ctx, W, HY + 2, 120, '#0b0805', 'rgba(251,191,36,0.55)', 4, 0);
      this.cineGlow(ctx, 640, HY, 300, 'rgba(251,191,36,0.25)', seg(t, 60, 100));
      const { Y, HW } = this.fxaRuaRoad(ctx, t, HY, bot + 40);
      // o gol no fim da rua
      const kg = ease(seg(t, 84, 100));
      if (kg > 0) {
        this.cineGlow(ctx, 640, Y(28) - 14, 90, 'rgba(253,230,138,0.8)', kg);
        ctx.save();
        ctx.globalAlpha = kg;
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 3;
        ctx.strokeRect(604, Y(28) - 26, 72, 26);
        ctx.restore();
      }
      // postes (de perto para longe)
      const zs = [1.3, 2.1, 3.3, 5.2, 8.4, 13.5];
      zs.forEach((z, j) => {
        const on = 26 + j * 15;
        const lit = t >= on && !(t < on + 4 && Math.floor(t) % 2);
        const ka = seg(t, on - 22, on - 8);
        if (ka <= 0) return;
        [-1, 1].forEach((s) => {
          const bx = 640 + s * (HW(z) + 80 / z);
          const by = Y(z);
          const ph = 430 / z;
          const hx = bx - s * 54 / z;
          const hy = by - ph;
          ctx.save();
          ctx.globalAlpha = ka;
          if (lit) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const cg = ctx.createLinearGradient(0, hy, 0, by);
            cg.addColorStop(0, 'rgba(253,230,138,0.22)');
            cg.addColorStop(1, 'rgba(253,230,138,0.02)');
            ctx.fillStyle = cg;
            poly(ctx, [[hx - 10 / z, hy], [hx + 10 / z, hy], [hx + 170 / z, by], [hx - 170 / z, by]]);
            ctx.fill();
            ctx.fillStyle = 'rgba(253,230,138,0.22)';
            ctx.beginPath();
            ctx.ellipse(hx, by, 190 / z, 34 / z, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
          }
          ctx.fillStyle = '#0b0703';
          ctx.fillRect(bx - 6 / z, hy, 12 / z, ph);
          ctx.fillRect(Math.min(bx, hx) - 2 / z, hy - 4 / z, 58 / z, 8 / z);
          ctx.fillStyle = lit ? '#fef3c7' : '#3f2a10';
          ctx.fillRect(hx - 18 / z, hy, 36 / z, 10 / z);
          ctx.restore();
          if (lit) this.cineGlow(ctx, hx, hy + 6 / z, 150 / z + 20, 'rgba(253,224,71,0.75)', ka);
        });
      });
      // pétalas indo para o gol
      for (let i = 0; i < 30; i++) {
        const ph = mod(t * (0.004 + rnd(i, 2) * 0.004) + rnd(i, 3), 1);
        const x = lerp(rnd(i, 4) * W, 640, ph);
        const y = lerp(top + rnd(i, 5) * 500, HY, ph) + Math.sin(t * 0.05 + i) * 12;
        this.fxaPetal(ctx, x, y, 10 * (1 - ph * 0.7), t * 0.05 + i, PETALS[i % 4], 0.85 * (1 - ph));
      }
      // você de costas, no começo da rua
      this.ptdSpr(ctx, o.you, 640, 724, 400, { facing: 'back', rim: '#fbbf24', rimD: 1 });
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'SÓ VOCÊ, A BOLA E O CAMINHO', seg(t, 96, 140), '#fbbf24');
      [0, 1, 2, 3, 4, 5].forEach((j) => this.fxaSfx(S, 26 + j * 15, `lamp${j}`, () => window.SFX?.blip?.([523, 587, 659, 784, 880, 1046][j])));
    },

    // PLANO 3 — debaixo do poste, os olhos dourados. FLUXO DE RUA ILUMINADO
    fxaRua2(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.fxaCfg('fl_epico_rua');
      const hit = 4;
      const eyeY = 250;
      this.fxaCloseBg(ctx, S, 'rua_bg3', '#120a02', '#060402', 'rgba(251,191,36,0.3)', 640, 230);
      this.cineBokeh(ctx, W, top + 20, 600, t, 18, ['rgba(253,224,71,0.42)', 'rgba(251,146,60,0.35)'], 12);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.04 - 0.04 * easeIO(t / 98), shake: t >= hit ? 5 * (1 - seg(t, hit, hit + 20)) : 0 });
      this.cineShafts(ctx, 640, top - 90, Math.PI / 2, 760, 0.8, 6, '253,230,138', 0.12, t);
      this.cineGlow(ctx, 640, top - 30, 260, 'rgba(254,243,199,0.7)');
      for (let i = 0; i < 16; i++) {
        const x = mod(rnd(i, 3) * W + t * (1.5 + rnd(i, 4) * 2), W + 80) - 40;
        const y = top + mod(rnd(i, 5) * 560 + t * (0.8 + rnd(i, 6)), 560);
        this.fxaPetal(ctx, x, y, 9, t * 0.05 + i, PETALS[i % 4], 0.8);
      }
      const r = this.ptdHead(ctx, o.you, 640, eyeY, 900, { rim: '#fbbf24', rimD: 2 });
      this.ptdEyes(ctx, o.you, 640, eyeY, r.u, { ring: '#fbbf24', iris: '#78350f' });
      const gl = 1 - seg(t, hit + 4, hit + 34);
      [-1, 1].forEach((s) => this.finSparkle(ctx, 640 + s * 3.5 * r.u + r.u, eyeY - 0.7 * r.u, 30 * gl, gl, 'rgba(253,230,138,0.8)'));
      ctx.restore();
      // pétalas grandes passando na frente (perto da câmera)
      for (let i = 0; i < 6; i++) {
        const x = W + 100 - mod(t * (7 + i * 1.5) + rnd(i, 7) * 900, W + 300);
        const y = (i % 2 ? top + 30 + rnd(i, 8) * 70 : 400 + rnd(i, 8) * 150) + Math.sin(t * 0.04 + i) * 20;
        this.fxaPetal(ctx, x, y, 26 + rnd(i, 9) * 16, t * 0.04 * (i % 2 ? 1 : -1) + i, PETALS[(i + 1) % 4], 0.9);
      }
      this.fxaTitle(ctx, S, o, t, 22, 516);
      if (t >= hit) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, hit, hit + 12)), '#fde68a');
      this.fxaSfx(S, hit, 'hit', () => window.SFX?.jingle?.([659, 784, 988], 0, 'triangle'));
    }
  });

  // ==========================================================================
  // 5. RELÂMPAGO DO REI TIRANO — a mandíbula de raio que devora
  // ==========================================================================
  Object.assign(CE, {
    fxaReiSky(g, w, h) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#050102');
      gr.addColorStop(1, '#2a0708');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      // nuvens em 4 camadas (um path por camada), cada uma com a barriga avermelhada
      for (let b = 0; b < 4; b++) {
        const c = 12 + b * 7;
        g.fillStyle = `rgba(${c + 8},${Math.floor(c * 0.25)},${Math.floor(c * 0.3)},0.75)`;
        g.beginPath();
        for (let i = b; i < 110; i += 4) {
          const x = rnd(i, 2) * w;
          const y = rnd(i, 3) * h * 0.95;
          const rx = 90 + rnd(i, 4) * 220;
          const ry = 26 + rnd(i, 5) * 60;
          g.moveTo(x + rx, y);
          g.ellipse(x, y, rx, ry, 0, 0, TAU);
        }
        g.fill();
        g.fillStyle = 'rgba(239,68,68,0.08)';
        g.beginPath();
        for (let i = b; i < 110; i += 4) {
          const x = rnd(i, 2) * w;
          const y = rnd(i, 3) * h * 0.95;
          const rx = 90 + rnd(i, 4) * 220;
          const ry = 26 + rnd(i, 5) * 60;
          g.moveTo(x + rx * 0.8, y + ry * 0.45);
          g.ellipse(x, y + ry * 0.45, rx * 0.8, ry * 0.4, 0, 0, TAU);
        }
        g.fill();
      }
    },
    fxaReiGround(g, w, h) {
      // silhueta da cobertura do estádio + o gramado escuro
      g.fillStyle = '#020001';
      g.beginPath();
      g.moveTo(0, 400);
      for (let x = 0; x <= w; x += 40) g.lineTo(x, 404 - Math.sin(x * 0.006) * 26 - (x % 120 === 0 ? 30 : 0));
      g.lineTo(w, 480);
      g.lineTo(0, 480);
      g.fill();
      g.fillStyle = 'rgba(239,68,68,0.5)';
      for (let x = 30; x < w; x += 120) g.fillRect(x, 392 - Math.sin(x * 0.006) * 26, 6, 4);
      const pg = g.createLinearGradient(0, 470, 0, h);
      pg.addColorStop(0, '#1a0606');
      pg.addColorStop(1, '#050101');
      g.fillStyle = pg;
      g.fillRect(0, 470, w, h - 470);
      g.strokeStyle = 'rgba(254,202,202,0.06)';
      g.lineWidth = 2;
      for (let i = -10; i <= 10; i++) {
        g.beginPath();
        g.moveTo(640 + i * 60, 470);
        g.lineTo(640 + i * 240, h);
        g.stroke();
      }
    },
    fxaReiStorm(ctx, S, t, dark = 0) {
      const { W, H } = S;
      const sky = this.fxaBg('rei_sky', W * 2, 480, this.fxaReiSky, 0.5);
      const o1 = mod(t * 0.7, W);
      ctx.drawImage(sky, o1 * 0.5, 0, W * 0.5, 240, -40, -20, W + 80, 500);
      ctx.save();
      ctx.globalAlpha = 0.55;
      const o2 = mod(t * 1.6 + 600, W);
      ctx.drawImage(sky, o2 * 0.5, 30, W * 0.5, 210, -40, -40, W + 80, 460);
      ctx.restore();
      ctx.drawImage(this.fxaBg('rei_ground', W, H, this.fxaReiGround), 0, 0);
      if (dark) {
        ctx.fillStyle = `rgba(3,0,1,${dark})`;
        ctx.fillRect(-60, -60, W + 120, H + 120);
      }
      // chuva fina
      ctx.save();
      ctx.strokeStyle = 'rgba(254,202,202,0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 110; i++) {
        const x = mod(rnd(i, 7) * (W + 200) + t * 4, W + 200) - 100;
        const y = mod(i * 97 + t * 24, H + 60) - 30;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 7, y - 26);
      }
      ctx.stroke();
      ctx.restore();
    },
    // Raio rubro-negro (núcleo preto, contorno vermelho)
    fxaRedBolt(ctx, pts, w = 6, a = 1) {
      ctx.save();
      ctx.globalAlpha *= a;
      this.fxaBolt(ctx, pts, 'rgba(239,68,68,0.95)', '#0a0000', w, 0.35);
      ctx.restore();
    },

    // PLANO 1 — a tempestade vermelha; você, de costas, no meio dela
    fxaRei0(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.fxaCfg('fl_lendario_rei');
      const k = easeIO(t / 100);
      const strikes = [[24, 300, 380, 11], [62, 990, 880, 23]];
      const sh = strikes.reduce((a, [at]) => a + (t >= at && t < at + 16 ? 1 - (t - at) / 16 : 0), 0);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(340, 380, k), zoom: lerp(1, 1.1, k), shake: 0.6 + sh * 5 });
      this.fxaReiStorm(ctx, S, t);
      strikes.forEach(([at, x0, x1, sd]) => {
        const d = t - at;
        if (d < 0 || d > 14) return;
        const a = 1 - d / 14;
        this.cineGlow(ctx, x0, 120, 420, 'rgba(239,68,68,0.5)', a);
        const pts = this.fxaBoltPts(x0, -20, x1, 470, sd + Math.floor(d / 2), 14, 0.2);
        this.fxaRedBolt(ctx, pts, 7, a);
        const m = pts[6];
        this.fxaRedBolt(ctx, this.fxaBoltPts(m[0], m[1], m[0] + (x1 > x0 ? -120 : 120), m[1] + 140, sd + 5, 6, 0.3), 4, a * 0.8);
      });
      // você de costas, a luz vermelha em volta
      this.cineGlow(ctx, 640, 520, 230, 'rgba(239,68,68,0.3)');
      this.ptdSpr(ctx, o.you, 640, 604, 300, { facing: 'back', dim: 0.35, dimTint: '30,0,0', rim: '#ef4444', rimD: 1 });
      // faíscas rubro-negras estalando em volta do corpo
      const fl = Math.floor(t / 3);
      for (let i = 0; i < 6; i++) {
        if (rnd(i, fl) < 0.45) continue;
        const a = (i / 6) * TAU + rnd(i, fl + 1);
        const r0 = 90 + rnd(i, fl + 2) * 40;
        const cx = 640 + Math.cos(a) * r0 * 0.7;
        const cy = 480 + Math.sin(a) * r0;
        this.fxaRedBolt(ctx, this.fxaBoltPts(cx, cy, cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, fl * 3 + i, 5, 0.5), 3, 0.9);
      }
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'O CÉU FICA VERMELHO', seg(t, 30, 70), '#ef4444');
      if (t >= 62) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, 62, 72)), '#fecaca');
      this.fxaSfx(S, 24, 'th1', () => window.SFX?.tackle?.());
      this.fxaSfx(S, 62, 'th2', () => window.SFX?.kick?.(1));
    },

    // Um maxilar de raio: curva (parábola) com dentes; dir 1 = de cima (dentes para baixo)
    fxaJaw(ctx, cy, dir, k, t, seedBase, depth = 100) {
      const x0 = 150;
      const x1 = 1130;
      const n = 24;
      const fl = Math.floor(t / 2);
      const P = (f) => [lerp(x0, x1, f), cy - dir * depth * Math.sin(Math.PI * f)];
      // revela do centro para fora
      const lo = 0.5 - 0.5 * k;
      const hi = 0.5 + 0.5 * k;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const f = lerp(lo, hi, i / n);
        const [x, y] = P(f);
        pts.push([x + (i && i < n ? (rnd(i, fl + seedBase) - 0.5) * 12 : 0), y + (i && i < n ? (rnd(i, fl + seedBase + 9) - 0.5) * 16 : 0)]);
      }
      // dentes
      const teeth = 11;
      for (let i = 0; i < teeth; i++) {
        // os de baixo ficam entre os de cima (fecham encaixados)
        const f = 0.06 + ((i + (dir < 0 ? 0.5 : 0)) / (teeth - 1)) * 0.88;
        if (f > 0.95) continue;
        if (f < lo || f > hi) continue;
        const [bx, by] = P(f);
        const fang = i === 2 || i === teeth - 3;
        const L = (fang ? 120 : 70 + rnd(i, seedBase) * 20) * clamp((k - Math.abs(f - 0.5) * 2 * 0.6) * 2);
        if (L < 2) continue;
        const bw = fang ? 34 : 26;
        const tip = [bx, by + dir * L];
        ctx.fillStyle = 'rgba(69,10,10,0.55)';
        poly(ctx, [[bx - bw, by], [bx + bw, by], tip]);
        ctx.fill();
        this.fxaRedBolt(ctx, [[bx - bw, by], [bx - bw * 0.3 + (rnd(i, fl) - 0.5) * 8, by + dir * L * 0.5], tip, [bx + bw * 0.3 + (rnd(i, fl + 1) - 0.5) * 8, by + dir * L * 0.5], [bx + bw, by]], 3.5, 1);
      }
      this.fxaRedBolt(ctx, pts, 8, 1);
    },

    // PLANO 2 — a mandíbula de raio se forma em cima dos zagueiros... e fecha
    fxaRei1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_lendario_rei');
      const bite = 100;
      const form = ease(seg(t, 8, 64));
      const close = easeIn(seg(t, 76, bite));
      const after = seg(t, bite, bite + 50);
      const shake = 0.8 + (t >= bite ? 11 * (1 - seg(t, bite, bite + 26)) : 0) + form * 0.6;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1.02 + 0.06 * easeIO(t / 162) + (t >= bite ? 0.04 * (1 - seg(t, bite, bite + 18)) : 0), shake });
      this.fxaReiStorm(ctx, S, t, 0.35);
      this.cineGlow(ctx, 640, 440, 520, 'rgba(239,68,68,0.28)', form);
      // os zagueiros (somem na mordida)
      const ids = ['aryu', 'aiku', 'kiyora', 'raichi'];
      const vanish = 1 - seg(t, bite, bite + 8);
      if (vanish > 0) {
        ids.forEach((id, i) => {
          const c = this.cineChar(id, KIT_DEF);
          const x = [420, 560, 720, 860][i];
          const shiver = t > 40 ? Math.round(Math.sin(t * 1.3 + i)) * 2 : 0;
          this.ptdSpr(ctx, c, x + shiver, 520, 220 + (i % 2) * 14, { tint: '#050101', rim: '#f87171', rimD: 1, alpha: vanish });
        });
      }
      // a fera: olhos em cima e as duas mandíbulas
      const Uy = lerp(top + 214, 440, close);
      const Ly = lerp(bot - 90, 462, close);
      const depth = lerp(95, 14, close);
      const fade = 1 - after * 0.75;
      ctx.save();
      ctx.globalAlpha = fade;
      if (form > 0.5) {
        [-1, 1].forEach((s) => {
          const ex = 640 + s * 150;
          const ey = Uy - depth - 54;
          this.cineGlow(ctx, ex, ey, 70, 'rgba(239,68,68,0.8)', seg(form, 0.5, 1));
          ctx.fillStyle = '#fecaca';
          poly(ctx, [[ex - s * 46, ey - 10], [ex + s * 40, ey - 4], [ex + s * 30, ey + 10], [ex - s * 40, ey + 6]]);
          ctx.fill();
          ctx.fillStyle = '#0a0000';
          ctx.fillRect(ex - 4, ey - 10, 8, 20);
        });
      }
      this.fxaJaw(ctx, Uy, 1, form, t, 3, depth);
      this.fxaJaw(ctx, Ly, -1, form, t, 17, depth);
      ctx.restore();
      // faíscas vermelhas da mordida
      if (t >= bite) {
        const d = t - bite;
        for (let i = 0; i < 40; i++) {
          const a = rnd(i, 4) * TAU;
          const sp = 4 + rnd(i, 5) * 10;
          const x = 640 + (rnd(i, 6) - 0.5) * 500 + Math.cos(a) * sp * d;
          const y = 450 + Math.sin(a) * sp * d * 0.6 + d * d * 0.05;
          ctx.globalAlpha = 1 - seg(d, 10, 50);
          ctx.fillStyle = i % 3 ? '#ef4444' : '#fecaca';
          ctx.fillRect(Math.round(x), Math.round(y), i % 4 ? 4 : 7, i % 4 ? 4 : 7);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // você em primeiro plano, de costas
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1, shake: shake * 1.3 });
      this.ptdSpr(ctx, o.you, 190, bot + 360, 640, { facing: 'back', tint: '#050101', rim: '#ef4444', rimD: 1 });
      ctx.restore();
      if (t >= bite) this.cineImpactText(ctx, 'NHAC!!', 860, top + 110, 120, '#ef4444', seg(t, bite, bite + 8), 0, -0.1);
      this.fxaStamp(ctx, 'DEVORAR.', 1000, bot - 70, 56, '#fecaca', t, 128, 3);
      if (t >= bite) this.cineFlash(ctx, W, H, 0.42 * (1 - seg(t, bite, bite + 10)), '#fecaca');
      this.fxaSfx(S, 8, 'form', () => window.SFX?.tackle?.());
      this.fxaSfx(S, bite, 'bite', () => window.SFX?.kick?.(1));
    },

    // PLANO 3 — a coroa de raio. RELÂMPAGO DO REI TIRANO
    fxaRei2(ctx, S) {
      const { W, H, t } = S;
      const o = this.fxaCfg('fl_lendario_rei');
      const hit = 6;
      const eyeY = 330;
      this.fxaCloseBg(ctx, S, 'rei_bg3', '#020000', '#2a0606', 'rgba(239,68,68,0.3)', 640, 260);
      this.ptdRays(ctx, 640, eyeY, W, '#7f1d1d', 0.4, -t * 0.003, 36);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.05 - 0.05 * easeIO(t / 98), shake: t >= hit ? 8 * (1 - seg(t, hit, hit + 24)) : 0.5 });
      const size = 780;
      const u = size / 36;
      const top = eyeY - 10 * u;
      const fl = Math.floor(t / 3);
      const k = ease(seg(t, hit, hit + 14));
      if (k > 0) this.cineGlow(ctx, 640, top + u, 10 * u, 'rgba(239,68,68,0.5)', k);
      const r = this.ptdHead(ctx, o.you, 640, eyeY, size, { dim: 0.3, dimTint: '40,0,0', rim: '#ef4444', rimD: 2 });
      // raios saindo das têmporas
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 2; i++) {
          const sx = 640 + s * 7.6 * r.u;
          const sy = r.top + (6 + i * 4) * r.u;
          this.fxaRedBolt(ctx, this.fxaBoltPts(sx, sy, sx + s * (220 + i * 60) * k, sy - (70 - i * 110) * k, fl * 5 + i + (s > 0 ? 9 : 0), 8, 0.25), 5, k);
        }
      });
      // a coroa de raio pousada na cabeça
      if (k > 0) {
        const cr = [];
        for (let i = 0; i <= 8; i++) {
          const x = 640 + (i / 8 - 0.5) * 11 * u;
          const y = top + 2.6 * u - (i % 2 ? 0.4 : 2.4 + (i === 4 ? 0.9 : 0)) * u * k;
          cr.push([x, y]);
        }
        ctx.fillStyle = 'rgba(69,10,10,0.75)';
        poly(ctx, [...cr, [640 + 5.5 * u, top + 3.4 * u], [640 - 5.5 * u, top + 3.4 * u]]);
        ctx.fill();
        for (let i = 0; i < cr.length - 1; i++) this.fxaRedBolt(ctx, this.fxaBoltPts(cr[i][0], cr[i][1], cr[i + 1][0], cr[i + 1][1], fl * 3 + i, 3, 0.16), 6, 1);
        this.fxaRedBolt(ctx, [[640 - 5.5 * u, top + 3.4 * u], [640 + 5.5 * u, top + 3.4 * u]], 6, 1);
      }
      this.ptdEyes(ctx, o.you, 640, eyeY, r.u, { ring: '#ef4444', iris: '#450a0a', tiny: true, angry: true });
      [-1, 1].forEach((s) => this.cineGlow(ctx, 640 + s * 3.5 * r.u, eyeY, r.u * 3.2, 'rgba(239,68,68,0.6)', k));
      ctx.restore();
      this.fxaTitle(ctx, S, o, t, 24, 520);
      if (t >= hit) this.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, hit, hit + 10)), '#fecaca');
      this.fxaSfx(S, hit, 'hit', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 6. TRANSE DO DESTRUIDOR ABISSAL — afundar, arrebentar as correntes, quebrar a tática
  // ==========================================================================
  const DES_COL = '#14b8a6';
  Object.assign(CE, {
    fxaDesSea(g, w, h) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#0e7490');
      gr.addColorStop(0.3, '#0f4c50');
      gr.addColorStop(0.65, '#031a1c');
      gr.addColorStop(1, '#000506');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        const x = rnd(i, 3) * w;
        const y = rnd(i, 4) * h * 0.3;
        const rg = g.createRadialGradient(x, y, 0, x, y, 60 + rnd(i, 5) * 80);
        rg.addColorStop(0, 'rgba(153,246,228,0.12)');
        rg.addColorStop(1, 'rgba(153,246,228,0)');
        g.fillStyle = rg;
        g.fillRect(x - 160, y - 160, 320, 320);
      }
    },
    fxaBubbles(ctx, W, y0, y1, t, n = 26, seed = 1) {
      ctx.save();
      ctx.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const H2 = y1 - y0;
        const y = y1 - mod(t * (1 + rnd(i, seed) * 2) + rnd(i, seed + 1) * H2, H2);
        const x = rnd(i, seed + 2) * W + Math.sin(t * 0.05 + i) * 8;
        const r = 3 + rnd(i, seed + 3) * 9;
        ctx.strokeStyle = 'rgba(204,251,241,0.45)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = 'rgba(240,253,250,0.7)';
        ctx.fillRect(x - r * 0.5, y - r * 0.5, Math.max(2, r * 0.3), Math.max(2, r * 0.3));
      }
      ctx.restore();
    },

    // PLANO 1 — afundando no abismo, as correntes puxando para baixo
    fxaDes0(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.fxaCfg('fl_mitico_destruidor');
      const k = easeIO(t / 90);
      const sea = this.fxaBg('des_sea', W, H * 2, this.fxaDesSea, 0.5);
      ctx.drawImage(sea, 0, lerp(0, H * 0.45, k), W * 0.5, H * 0.5, 0, 0, W, H);
      this.cineShafts(ctx, 640, -80, Math.PI / 2, 760, 0.9, 6, '153,246,228', 0.14 * (1 - k * 0.8), t);
      this.cineDust(ctx, W, H, t, 40, 'rgba(204,251,241,0.45)', 6);
      this.fxaBubbles(ctx, W, top, H, t, 24, 3);
      ctx.save();
      const feet = 590;
      const size = 380;
      const u = size / 36;
      const T = feet - size * 0.87;
      ctx.translate(640, feet - size * 0.45);
      ctx.rotate(Math.sin(t * 0.03) * 0.05);
      ctx.translate(-640, -(feet - size * 0.45));
      this.cineGlow(ctx, 640, feet - 180, 260, 'rgba(20,184,166,0.25)');
      // correntes (atrás e na frente das pernas)
      this.fxaChain(ctx, 380, H + 60, 640 - 3 * u, T + 30 * u, 26, '#4b6b70');
      this.ptdSpr(ctx, o.you, 640, feet, size, { dim: 0.3, dimTint: '0,40,45', rim: '#2dd4bf', rimD: 1 });
      this.fxaShut(ctx, o.you, 640, T + 10 * u, u, { dim: 0.3, dimTint: '0,40,45' });
      this.fxaChain(ctx, 900, H + 60, 640 + 1 * u, T + 22.5 * u, 26, '#5f7a80');
      ctx.restore();
      this.fxaStamp(ctx, 'MAIS FUNDO...', 300, top + 90, 46, '#99f6e4', t, 30, 3, 0, 1 - seg(t, 76, 88));
      this.finKicker(ctx, W - 40, top + 30, `PROFUNDIDADE ${Math.round(lerp(40, 3200, k))} m`, seg(t, 10, 40), DES_COL, 'right');
      this.fxaSfx(S, 4, 'sink', () => window.SFX?.whoosh?.());
    },

    fxaDesBoardCv(g, w, h) {
      g.fillStyle = '#f8fafc';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#94a3b8';
      g.lineWidth = 10;
      g.strokeRect(5, 5, w - 10, h - 10);
      g.strokeStyle = '#16a34a';
      g.lineWidth = 3;
      g.strokeRect(30, 40, w - 60, h - 70);
      g.beginPath();
      g.moveTo(w / 2, 40);
      g.lineTo(w / 2, h - 30);
      g.stroke();
      g.beginPath();
      g.arc(w / 2, (h + 10) / 2, 34, 0, TAU);
      g.stroke();
      g.strokeRect(30, h / 2 - 60, 50, 120);
      g.strokeRect(w - 80, h / 2 - 60, 50, 120);
      g.font = '900 18px "Segoe UI", sans-serif';
      g.fillStyle = '#0f172a';
      g.textBaseline = 'middle';
      g.fillText('TÁTICA 4-4-2', 34, 22);
      const O = [[110, 80], [110, 140], [110, 200], [110, 260], [180, 90], [180, 160], [180, 230], [200, 300], [250, 130], [250, 220]];
      O.forEach(([x, y]) => {
        g.strokeStyle = '#1d4ed8';
        g.lineWidth = 4;
        g.beginPath();
        g.arc(x, y * 0.85 + 10, 11, 0, TAU);
        g.stroke();
      });
      [[330, 110], [330, 200], [380, 150], [300, 270]].forEach(([x, y]) => {
        g.strokeStyle = '#dc2626';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(x - 10, y - 10);
        g.lineTo(x + 10, y + 10);
        g.moveTo(x + 10, y - 10);
        g.lineTo(x - 10, y + 10);
        g.stroke();
      });
      g.strokeStyle = '#0f172a';
      g.lineWidth = 3;
      [[[200, 300 * 0.85 + 10], [320, 230]], [[250, 130 * 0.85 + 10], [360, 90]]].forEach(([a, b]) => {
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.quadraticCurveTo((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 30, b[0], b[1]);
        g.stroke();
        g.beginPath();
        g.moveTo(b[0], b[1]);
        g.lineTo(b[0] - 12, b[1] + 2);
        g.moveTo(b[0], b[1]);
        g.lineTo(b[0] - 4, b[1] + 12);
        g.stroke();
      });
      [[60, 300, '#ef4444'], [400, 290, '#facc15']].forEach(([x, y, c]) => {
        g.fillStyle = c;
        g.beginPath();
        g.arc(x, y, 9, 0, TAU);
        g.fill();
      });
    },

    // PLANO 2 — as correntes arrebentam; o quadro tático racha ao meio
    fxaDes1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_mitico_destruidor');
      const snaps = [44, 78];
      const crackAt = 116;
      const fallAt = 142;
      const panelAt = 92;
      const shake = 0.8 + snaps.reduce((a, s) => a + (t >= s && t < s + 16 ? 5 * (1 - (t - s) / 16) : 0), 0) + (t >= crackAt ? 9 * (1 - seg(t, crackAt, crackAt + 24)) : 0);
      ctx.fillStyle = '#020809';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1, shake });
      // A — você, preso nas correntes
      const kA = ease(seg(t, 0, 12));
      const sea = this.fxaBg('des_sea', W, H * 2, this.fxaDesSea, 0.5);
      this.cinePanel(
        ctx,
        [[0, top + 10], [W, top + 10], [W, bot - 10], [0, bot - 10]],
        () => {
          ctx.drawImage(sea, 0, H * 0.375, W * 0.5, H * 0.5, 0, 0, W, H);
          this.fxaBubbles(ctx, 800, top, bot, t, 16, 8);
          const eyeY = 252;
          const x = 400;
          this.cineGlow(ctx, x, 300, 380, 'rgba(20,184,166,0.3)');
          const r = this.ptdHead(ctx, o.you, x, eyeY, 860, { dim: 0.25, dimTint: '0,40,45', rim: '#2dd4bf', rimD: 2 });
          const open = t >= snaps[0];
          if (!open) this.fxaShut(ctx, o.you, x, eyeY, r.u, { dim: 0.25, dimTint: '0,40,45' });
          else {
            this.ptdEyes(ctx, o.you, x, eyeY, r.u, { ring: '#2dd4bf', iris: '#042f2e', tiny: true, look: t > snaps[1] ? [0, 1, 0, -1][Math.floor(t / 4) % 4] : 0 });
            [-1, 1].forEach((s) => this.cineGlow(ctx, x + s * 3.5 * r.u, eyeY, r.u * 3, 'rgba(45,212,191,0.6)', seg(t, snaps[0], snaps[0] + 8)));
          }
          // duas correntes cruzando o peito
          const chains = [[[-40, 600], [880, 380]], [[-40, 420], [880, 640]]];
          chains.forEach(([[ax, ay], [bx, by]], i) => {
            const s = snaps[i];
            const mx = (ax + bx) / 2 + 20;
            const my = (ay + by) / 2;
            if (t < s) {
              const tr = t > s - 14 ? Math.round(Math.sin(t * 2)) * 2 : 0;
              this.fxaChain(ctx, ax, ay + tr, bx, by + tr, 34, '#5f7a80');
            } else {
              const d = ease(seg(t, s, s + 26));
              this.fxaChain(ctx, ax - d * 160, ay + d * 120, mx - 30 - d * 120, my + d * 140, 34, '#5f7a80');
              this.fxaChain(ctx, mx + 30 + d * 140, my - d * 60, bx + d * 160, by - d * 40, 34, '#5f7a80');
              const dd = t - s;
              for (let j = 0; j < 10; j++) {
                const a = rnd(j, i + 3) * TAU;
                const px = mx + Math.cos(a) * dd * (4 + rnd(j, 5) * 5);
                const py = my + Math.sin(a) * dd * (3 + rnd(j, 6) * 4) + dd * dd * 0.08;
                ctx.globalAlpha = 1 - seg(dd, 10, 40);
                ctx.fillStyle = j % 2 ? '#99f6e4' : '#5f7a80';
                ctx.fillRect(px, py, 8, 5);
              }
              ctx.globalAlpha = 1;
              if (dd < 26) this.cineImpactText(ctx, 'CLANG!!', mx + (i ? 60 : -40), my - 70, 58, '#ccfbf1', seg(dd, 0, 6), 0, i ? 0.1 : -0.1);
            }
          });
        },
        { dx: (1 - kA) * -W }
      );
      // B — o quadro tático entra pela direita e racha
      const kB = ease(seg(t, panelAt, panelAt + 12));
      if (kB > 0) {
        const pts = [[760, top + 30], [W - 20, top + 30], [W - 20, bot - 30], [700, bot - 30]];
        this.cinePanel(
          ctx,
          pts,
          () => {
            ctx.drawImage(sea, 0, H * 0.45, W * 0.5, H * 0.5, 0, 0, W, H);
            const crack = seg(t, crackAt, crackAt + 16);
            const fall = t - fallAt;
            this.cineGlow(ctx, 990, 360, 320, 'rgba(45,212,191,0.6)', crack);
            const cv = this.fxaSmall('des_board', 440, 300, this.fxaDesBoardCv);
            const cut = [[230, -10], [212, 70], [246, 130], [206, 190], [238, 250], [214, 310]];
            const L = [[-10, -10], ...cut, [-10, 310]];
            const R = [[450, -10], [450, 310], ...cut.slice().reverse()];
            [[L, -1], [R, 1]].forEach(([pp, s]) => {
              ctx.save();
              ctx.translate(990, 360);
              ctx.rotate(-0.04);
              if (fall > 0) {
                ctx.translate(s * fall * 3, fall * fall * 0.14);
                ctx.rotate(s * fall * 0.012);
              }
              ctx.save();
              poly(ctx, pp.map(([a, b]) => [a - 220, b - 150]));
              ctx.clip();
              ctx.drawImage(cv, -220, -150);
              ctx.restore();
              ctx.restore();
            });
            if (crack > 0 && fall <= 0) {
              ctx.save();
              ctx.translate(990, 360);
              ctx.rotate(-0.04);
              const n = Math.max(2, Math.ceil(cut.length * crack));
              this.fxaBolt(ctx, cut.slice(0, n).map(([a, b]) => [a - 220, b - 150]), 'rgba(45,212,191,0.95)', '#f0fdfa', 5, 0.4);
              [[1, -1], [3, 1], [4, -1]].forEach(([ci, s], j) => {
                if (crack < 0.4 + j * 0.15) return;
                const [a, b] = cut[ci];
                this.fxaBolt(ctx, [[a - 220, b - 150], [a - 220 + s * 70, b - 150 + 20], [a - 220 + s * 120, b - 150 + 6]], 'rgba(45,212,191,0.85)', '#f0fdfa', 3, 0.3);
              });
              ctx.restore();
            }
          },
          { dx: (1 - kB) * 600 }
        );
      }
      ctx.restore();
      if (t >= crackAt) this.cineImpactText(ctx, 'CRACK!!', 1010, top + 80, 86, '#5eead4', seg(t, crackAt, crackAt + 8), 0, -0.08);
      if (t >= crackAt) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, crackAt, crackAt + 10)), '#ccfbf1');
      snaps.forEach((s, i) => this.fxaSfx(S, s, `snap${i}`, () => window.SFX?.post?.()));
      this.fxaSfx(S, crackAt, 'crack', () => window.SFX?.kick?.(1));
    },

    // PLANO 3 — o sorriso insano, a língua de fora. TRANSE DO DESTRUIDOR ABISSAL
    fxaDes2(ctx, S) {
      const { W, H, t } = S;
      const o = this.fxaCfg('fl_mitico_destruidor');
      const hit = 4;
      const eyeY = 250;
      this.fxaCloseBg(ctx, S, 'des_bg3', '#000506', '#03201f', 'rgba(20,184,166,0.32)', 640, 280);
      // redemoinho do abismo
      ctx.save();
      ctx.strokeStyle = 'rgba(45,212,191,0.22)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 9; a += 0.14) {
        const rr = 14 + a * 26;
        const x = 640 + Math.cos(a - t * 0.04) * rr * 1.5;
        const y = 300 + Math.sin(a - t * 0.04) * rr * 0.8;
        if (a) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      // pedaços de corrente flutuando para fora
      for (let i = 0; i < 8; i++) {
        const a = rnd(i, 3) * TAU;
        const d = 260 + mod(t * (1 + rnd(i, 4)) + rnd(i, 5) * 300, 300);
        const x = 640 + Math.cos(a) * d * 1.3;
        const y = 300 + Math.sin(a) * d * 0.7;
        this.fxaChain(ctx, x, y, x + Math.cos(a + t * 0.02 + i) * 70, y + Math.sin(a + t * 0.02 + i) * 70, 24, '#4b6b70');
      }
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.05 - 0.05 * easeIO(t / 90), shake: t >= hit ? 8 * (1 - seg(t, hit, hit + 24)) : 0.6 });
      const r = this.ptdHead(ctx, o.you, 640, eyeY, 900, { dim: 0.2, dimTint: '0,30,32', rim: '#2dd4bf', rimD: 2 });
      // sombra de mangá na testa
      const sg = ctx.createLinearGradient(0, r.top, 0, eyeY);
      sg.addColorStop(0, 'rgba(0,10,12,0.55)');
      sg.addColorStop(1, 'rgba(0,10,12,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(640 - 7 * r.u, r.top + 4 * r.u, 14 * r.u, eyeY - r.top - 5.2 * r.u);
      this.fxaMouth(ctx, o.you, 640, r.top, r.u, 'crazy', ease(seg(t, hit, hit + 18)));
      const look = [0, 1, 0, -1][Math.floor(t / 4) % 4];
      this.ptdEyes(ctx, o.you, 640, eyeY, r.u, { ring: '#2dd4bf', iris: '#021a1d', tiny: true, look });
      [-1, 1].forEach((s) => this.cineGlow(ctx, 640 + s * 3.5 * r.u, eyeY, r.u * 3.4, 'rgba(45,212,191,0.6)'));
      ctx.restore();
      this.fxaTitle(ctx, S, o, t, 22, 520);
      if (t >= hit) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, hit, hit + 10)), '#ccfbf1');
      this.fxaSfx(S, hit, 'hit', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 7. SINGULARIDADE DOS QUATRO EGOS — constelações numa galáxia de peças
  // ==========================================================================
  const JOINTS = { head: [18, 8.6], neck: [18, 14.6], shL: [13, 16.4], shR: [23, 16.4], hL: [11, 23.4], hR: [25, 23.4], pel: [18, 22.2], hipL: [15.6, 22.8], hipR: [20.4, 22.8], kL: [14.8, 27], kR: [21.2, 27], fL: [14.4, 30.8], fR: [21.6, 30.8] };
  const BONES = [['head', 'neck'], ['neck', 'shL'], ['neck', 'shR'], ['shL', 'hL'], ['shR', 'hR'], ['neck', 'pel'], ['pel', 'hipL'], ['pel', 'hipR'], ['hipL', 'kL'], ['kL', 'fL'], ['hipR', 'kR'], ['kR', 'fR']];
  const EGO_POS = [[330, 350], [960, 336], [440, 616], [850, 616]];
  const EGO_END = [[548, 318], [732, 318], [548, 560], [732, 560]];
  Object.assign(CE, {
    fxaEgosCast() {
      const o = this.fxaCfg('fl_wc_quatro_egos');
      if (this._fxaEgos && this._fxaEgos.you === o.you) return this._fxaEgos.list;
      const list = [
        { c: o.you, name: String(o.youName).toUpperCase(), col: '#00f5d4', iris: '#064e3b' },
        { c: this.cineChar('sae', this.KITS.u20), name: 'SAE ITOSHI', col: '#f9a8d4', iris: '#0f766e' },
        { c: this.cineChar('loki'), name: 'JULIAN LOKI', col: '#fbbf24', iris: '#78350f' },
        { c: this.cineChar('hugo'), name: 'HUGO', col: '#fb7185', iris: '#1f2937', lids: true }
      ];
      this._fxaEgos = { you: o.you, list };
      return list;
    },
    fxaSpace(g, w, h) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#02010a');
      gr.addColorStop(0.5, '#070b24');
      gr.addColorStop(1, '#0a0420');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      [[300, 250, 420, 'rgba(0,245,212,0.13)'], [950, 430, 460, 'rgba(168,85,247,0.15)'], [720, 150, 320, 'rgba(236,72,153,0.09)'], [180, 600, 300, 'rgba(56,189,248,0.1)']].forEach(([x, y, r, c]) => {
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, c);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      });
      [0.3, 0.55, 0.85].forEach((a, b) => {
        g.fillStyle = `rgba(255,255,255,${a})`;
        g.beginPath();
        for (let i = b; i < 360; i += 3) {
          const s = rnd(i, 3) < 0.88 ? 1.5 : 2.5;
          g.rect(rnd(i, 4) * w, rnd(i, 5) * h, s, s);
        }
        g.fill();
      });
    },
    // Uma constelação: o boneco apagado + estrelas nas juntas ligadas por linhas
    fxaConst(ctx, e, x, feet, size, k, t, i) {
      if (k <= 0) return;
      const u = size / 36;
      const T = feet - size * 0.87;
      const P = (j) => [x + (JOINTS[j][0] - 18) * u, T + JOINTS[j][1] * u];
      this.cineGlow(ctx, x, T + 18 * u, size * 0.7, rgba(e.col, 0.22), k);
      this.ptdSpr(ctx, e.c, x, feet, size, { rim: e.col, rimD: 1, alpha: 0.62 * k });
      ctx.save();
      ctx.strokeStyle = rgba(e.col, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      BONES.forEach(([a, b], j) => {
        const kk = clamp(k * BONES.length - j);
        if (kk <= 0) return;
        const [ax, ay] = P(a);
        const [bx, by] = P(b);
        ctx.moveTo(ax, ay);
        ctx.lineTo(lerp(ax, bx, kk), lerp(ay, by, kk));
      });
      ctx.stroke();
      ctx.restore();
      Object.keys(JOINTS).forEach((j, n) => {
        const a = clamp(k * 13 - n);
        if (a <= 0) return;
        const [px, py] = P(j);
        const tw = 0.7 + 0.3 * Math.sin(t * 0.15 + n + i * 3);
        this.cineGlow(ctx, px, py, j === 'head' ? 22 : 14, rgba(e.col, 0.9), a * tw);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(px - 2), Math.round(py - 2), 4, 4);
      });
      return P;
    },
    fxaPieces(ctx, W, H, t, n = 26, seed = 1, alpha = 1) {
      const cols = ['#00f5d4', '#e0f2fe', '#a78bfa', '#f9a8d4'];
      for (let i = 0; i < n; i++) {
        const d = 0.5 + rnd(i, seed) * 0.9;
        const x = mod(rnd(i, seed + 1) * (W + 120) + t * 0.4 * d, W + 120) - 60;
        const y = mod(rnd(i, seed + 2) * H - t * 0.15 * d, H);
        this.ptdPuzzle(ctx, x, y, 18 * d * d + 6, cols[i % 4], t * 0.01 * (rnd(i, seed + 3) - 0.5) + i, alpha * (0.35 + 0.5 * d / 1.4));
      }
    },

    // PLANO 1 — a galáxia; as quatro constelações acendem
    fxaEgos0(ctx, S) {
      const { W, H, t, top } = S;
      const cast = this.fxaEgosCast();
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1 + 0.07 * easeIO(t / 176), rot: Math.sin(t * 0.008) * 0.03, shake: 0.4 });
      ctx.drawImage(this.fxaBg('egos_space', W, H, this.fxaSpace), -60, -60, W + 120, H + 120);
      this.fxaPieces(ctx, W, H, t, 26, 3);
      for (let i = 0; i < 14; i++) {
        const a = 0.5 + 0.5 * Math.sin(t * 0.06 + i * 2.3);
        this.finSparkle(ctx, rnd(i, 21) * W, top + rnd(i, 22) * 560, 6 + 6 * a, a * 0.8);
      }
      cast.forEach((e, i) => {
        const a0 = 8 + i * 30;
        const k = ease(seg(t, a0, a0 + 34));
        const [x, feet] = EGO_POS[i];
        this.fxaConst(ctx, e, x, feet, 230, k, t, i);
        this.finKicker(ctx, x, feet + 18, e.name, seg(t, a0 + 10, a0 + 40), e.col, 'center');
      });
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'FINAL DO MUNDIAL • QUATRO EGOS NO MESMO CÉU', seg(t, 120, 170), '#00f5d4');
      cast.forEach((e, i) => this.fxaSfx(S, 8 + i * 30, `c${i}`, () => window.SFX?.blip?.([523, 659, 784, 1046][i])));
    },

    // PLANO 2 — tudo se alinha: as peças fecham um anel, os quatro se encontram
    fxaEgos1(ctx, S) {
      const { W, H, t } = S;
      const cast = this.fxaEgosCast();
      const m = easeIO(seg(t, 0, 52));
      const C = [640, 400];
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(380, 400, m), zoom: lerp(1.07, 1.18, easeIO(t / 80)), rot: Math.sin((176 + t) * 0.008) * 0.03 * (1 - m), shake: 0.5 });
      ctx.drawImage(this.fxaBg('egos_space', W, H, this.fxaSpace), -60, -60, W + 120, H + 120);
      this.fxaPieces(ctx, W, H, t + 176, 18, 3, 1 - m * 0.6);
      this.cineGlow(ctx, C[0], C[1], 120 + 260 * m, 'rgba(0,245,212,0.5)', 0.4 + 0.6 * m);
      // anel de peças encaixando
      const N = 16;
      for (let i = 0; i < N; i++) {
        const ts = 14 + i * 2.6;
        const kk = back(seg(t, ts - 12, ts));
        const a = (i / N) * TAU - Math.PI / 2;
        const tx = C[0] + Math.cos(a) * 270;
        const ty = C[1] + Math.sin(a) * 230;
        const sx = rnd(i, 7) * W;
        const sy = rnd(i, 8) * H;
        const x = lerp(sx, tx, kk);
        const y = lerp(sy, ty, kk);
        this.ptdPuzzle(ctx, x, y, 34, ['#00f5d4', '#f9a8d4', '#fbbf24', '#fb7185'][i % 4], lerp(i * 1.7, a + Math.PI / 2, clamp(kk)), seg(t, ts - 14, ts - 8));
        if (t >= ts && t < ts + 8) this.finSparkle(ctx, tx, ty, 16 * (1 - (t - ts) / 8), 1 - (t - ts) / 8);
      }
      // os quatro, indo para o centro
      const heads = cast.map((e, i) => {
        const [x0, f0] = EGO_POS[i];
        const [x1, f1] = EGO_END[i];
        const bend = Math.sin(m * Math.PI) * 50 * (i % 2 ? 1 : -1);
        const x = lerp(x0, x1, m) + bend;
        const feet = lerp(f0, f1, m);
        const size = lerp(230, 170, m);
        const P = this.fxaConst(ctx, e, x, feet, size, 1, t + 176, i);
        return P ? P('head') : [x, feet - size * 0.6];
      });
      const lk = seg(t, 30, 58);
      if (lk > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,245,212,0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        [[0, 1], [1, 3], [3, 2], [2, 0], [0, 3], [1, 2]].forEach(([a, b], j) => {
          const kk = clamp(lk * 6 - j);
          if (kk <= 0) return;
          ctx.moveTo(heads[a][0], heads[a][1]);
          ctx.lineTo(lerp(heads[a][0], heads[b][0], kk), lerp(heads[a][1], heads[b][1], kk));
        });
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      this.fxaStamp(ctx, 'TUDO SE ENCAIXA.', 640, S.bot - 40, 44, '#e0f2fe', t, 40, 2);
      [14, 28, 42].forEach((a, i) => this.fxaSfx(S, a, `k${i}`, () => window.SFX?.blip?.(1046 + i * 120)));
    },

    // PLANO 3 — os quatro olhares → a singularidade. SINGULARIDADE DOS QUATRO EGOS
    fxaEgos2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_wc_quatro_egos');
      const cast = this.fxaEgosCast();
      const hit = 44;
      if (t < hit) {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, W, H);
        const gap = 8;
        const ph = (bot - top - 20 - gap * 3) / 4;
        cast.forEach((e, i) => {
          const y0 = top + 10 + i * (ph + gap);
          const kk = ease(seg(t, i * 7, i * 7 + 12));
          if (kk <= 0) return;
          const s = i % 2 ? 1 : -1;
          const pts = [[0, y0 + (i % 2 ? 6 : 0)], [W, y0 + (i % 2 ? 0 : 6)], [W, y0 + ph], [0, y0 + ph]];
          this.cinePanel(
            ctx,
            pts,
            () => {
              ctx.fillStyle = mix(e.col, '#020617', 0.82);
              ctx.fillRect(0, y0, W, ph + 6);
              this.ptdSpeed(ctx, S, t + i * 40, e.col, 0.18, s, 30, 10, y0, y0 + ph, i + 3);
              const U = 44;
              const cx = i % 2 ? 820 : 460;
              const cy = y0 + ph / 2 + 3;
              this.ptdCrop(ctx, e.c, {}, 10, 8.5, 16, 3, cx - 8 * U, cy - 1.5 * U, 16 * U, 3 * U);
              this.ptdEyes(ctx, e.c, cx, cy, U, { ring: e.col, iris: e.iris });
              if (e.lids) [-1, 1].forEach((sd) => this.finLid(ctx, cx + sd * 3.5 * U, cy, U * 0.34, -sd, 'half', mix(e.c.skinColor || '#f7e6dc', '#000000', 0.15)));
              [-1, 1].forEach((sd) => this.cineGlow(ctx, cx + sd * 3.5 * U, cy, U * 2.6, rgba(e.col, 0.55)));
              ctx.save();
              ctx.font = 'italic 900 40px "Segoe UI", sans-serif';
              ctx.textBaseline = 'middle';
              ctx.textAlign = i % 2 ? 'left' : 'right';
              ctx.lineWidth = 6;
              ctx.strokeStyle = '#020617';
              const tx = i % 2 ? 40 : W - 40;
              ctx.strokeText(e.name, tx, cy);
              ctx.fillStyle = e.col;
              ctx.fillText(e.name, tx, cy);
              ctx.restore();
            },
            { dx: (1 - kk) * W * s, width: 5 }
          );
        });
        cast.forEach((e, i) => this.fxaSfx(S, i * 7, `p${i}`, () => window.SFX?.whoosh?.()));
        return;
      }
      // a singularidade
      const d = t - hit;
      const C = [640, 300];
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.04 - 0.04 * easeIO(d / 60), shake: 8 * (1 - seg(d, 0, 24)) });
      ctx.drawImage(this.fxaBg('egos_space', W, H, this.fxaSpace), -60, -60, W + 120, H + 120);
      this.ptdRays(ctx, C[0], C[1], W, '#00f5d4', 0.16, d * 0.004, 48);
      this.cineGlow(ctx, C[0], C[1], 420, 'rgba(0,245,212,0.35)');
      // peças caindo em espiral
      for (let i = 0; i < 22; i++) {
        const ph = mod(d * 0.012 + rnd(i, 4), 1);
        const rr = 520 * (1 - ph);
        const a = rnd(i, 5) * TAU + ph * 5;
        this.ptdPuzzle(ctx, C[0] + Math.cos(a) * rr * 1.2, C[1] + Math.sin(a) * rr * 0.5, 10 + 26 * (1 - ph), ['#00f5d4', '#f9a8d4', '#fbbf24', '#fb7185'][i % 4], a * 2, 0.4 + 0.6 * (1 - ph));
      }
      // disco: um anel por ego
      ctx.save();
      ctx.lineCap = 'round';
      cast.forEach((e, i) => {
        const rx = 120 + i * 46;
        ctx.strokeStyle = rgba(e.col, 0.85);
        ctx.lineWidth = 6 - i;
        ctx.beginPath();
        ctx.ellipse(C[0], C[1], rx, rx * 0.26, -0.18 + i * 0.06, d * 0.05 * (i % 2 ? 1 : -1), d * 0.05 * (i % 2 ? 1 : -1) + Math.PI * 1.6);
        ctx.stroke();
      });
      ctx.restore();
      this.cineGlow(ctx, C[0], C[1], 140, 'rgba(255,255,255,0.9)');
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(C[0], C[1], 16 + Math.sin(d * 0.2) * 2, 0, TAU);
      ctx.fill();
      ctx.restore();
      this.fxaTitle(ctx, S, o, t, hit + 6, 520);
      this.cineFlash(ctx, W, H, 0.8 * (1 - seg(d, 0, 12)), '#ccfbf1');
      this.fxaSfx(S, hit, 'hit', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 8. PULMÃO DE AÇO — sem fôlego → o fole → a barra vira infinito
  // ==========================================================================
  const LIME = '#a3e635';
  const LUNG = ['.....XXX....', '....XXXXX...', '...XXXXXXX..', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXXXXXXXXX.', 'XXXXXXXXXXX.', 'XXXXXXXXXX..', 'XXXXXXXXX...', 'XXXXXXXXX...', 'XXXXXXXXXX..', 'XXXXXXXXXXX.', '.XXXXXXXXXX.', '..XXXXXXX...'];
  Object.assign(CE, {
    fxaLungCv() {
      return this.fxaSmall('lung', 12, 14, (g) => {
        const on = (x, y) => LUNG[y] && LUNG[y][x] === 'X';
        for (let y = 0; y < 14; y++) {
          for (let x = 0; x < 12; x++) {
            if (!on(x, y)) continue;
            const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
            g.fillStyle = edge ? '#365314' : x + y < 9 ? '#ecfccb' : (x * 7 + y * 3) % 5 === 0 ? '#65a30d' : LIME;
            g.fillRect(x, y, 1, 1);
          }
        }
      });
    },
    // Pulmões (s = escala da respiração) com o centro do peito em (cx, cy)
    fxaLungs(ctx, cx, cy, px, s, glow = 1) {
      const cv = this.fxaLungCv();
      this.cineGlow(ctx, cx, cy, px * 16 * s, 'rgba(163,230,53,0.55)', glow);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      [-1, 1].forEach((sd) => {
        ctx.save();
        ctx.translate(cx + sd * px * 1.2, cy - px * 6);
        ctx.scale(sd * s, s);
        ctx.drawImage(cv, -12 * px, 0, 12 * px, 14 * px);
        ctx.restore();
      });
      ctx.restore();
      // traqueia e brônquios
      ctx.strokeStyle = '#ecfccb';
      ctx.lineWidth = px * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx, cy - px * 12);
      ctx.lineTo(cx, cy - px * 4);
      ctx.lineTo(cx - px * 3 * s, cy - px * 1);
      ctx.moveTo(cx, cy - px * 4);
      ctx.lineTo(cx + px * 3 * s, cy - px * 1);
      ctx.stroke();
    },
    // O fole de ferreiro (bico apontando para a esquerda em hx,hy), open 0..1
    fxaBellows(ctx, hx, hy, open, len = 280) {
      const a = 0.12 + 0.34 * open;
      const top = [hx + Math.cos(-a) * len, hy + Math.sin(-a) * len];
      const bot = [hx + Math.cos(a) * len, hy + Math.sin(a) * len];
      // couro sanfonado
      ctx.fillStyle = '#3b2412';
      poly(ctx, [[hx + 30, hy - 8], top, bot, [hx + 30, hy + 8]]);
      ctx.fill();
      ctx.strokeStyle = '#1c0f06';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 1; i < 7; i++) {
        const f = 0.2 + i * 0.12;
        const x1 = lerp(hx, top[0], f);
        const y1 = lerp(hy, top[1], f);
        const x2 = lerp(hx, bot[0], f);
        const y2 = lerp(hy, bot[1], f);
        ctx.moveTo(x1, y1);
        ctx.lineTo((x1 + x2) / 2 + 10, (y1 + y2) / 2);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      // tábuas
      [[top, -1], [bot, 1]].forEach(([p, s]) => {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(Math.atan2(p[1] - hy, p[0] - hx));
        ctx.fillStyle = '#1c0f06';
        ctx.fillRect(6, -s * 6 - 13, len - 2, 26);
        ctx.fillStyle = '#7c4a1e';
        ctx.fillRect(10, -s * 6 - 10, len - 10, 20);
        ctx.fillStyle = '#a16207';
        ctx.fillRect(10, -s * 6 - 10, len - 10, 5);
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(len - 4, -s * 6 - 12, 56, 24);
        ctx.fillStyle = '#facc15';
        [0.3, 0.6].forEach((f) => ctx.fillRect(len * f, -s * 6 - 3, 6, 6));
        ctx.restore();
      });
      // bico de metal
      ctx.fillStyle = '#94a3b8';
      poly(ctx, [[hx + 34, hy - 14], [hx + 34, hy + 14], [hx - 46, hy + 5], [hx - 46, hy - 5]]);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(hx - 46, hy - 5, 80, 3);
    },

    // PLANO 1 — sem ar: ofegando, o vapor saindo, a barra de fôlego no vermelho
    fxaPul0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_comum_pulmao');
      const per = 26;
      const calm = seg(t, 132, 150);
      const deep = easeIO(seg(t, 136, 170));
      const ph = (t % per) / per;
      const bob = Math.sin(ph * TAU) * 6 * (1 - calm);
      ctx.drawImage(
        this.fxaBg('pul_bg', W, H, (g) => {
          const gr = g.createLinearGradient(0, 0, 0, H);
          gr.addColorStop(0, '#071021');
          gr.addColorStop(0.6, '#0b1d16');
          gr.addColorStop(1, '#06120b');
          g.fillStyle = gr;
          g.fillRect(0, 0, W, H);
        }, 0.5), 0, 0, W, H);
      this.cineBokeh(ctx, W, top + 20, 520, t, 18, ['rgba(254,240,138,0.38)', 'rgba(163,230,53,0.3)'], 4);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 620, y: 360, zoom: 1 + deep * 0.12, shake: 1.6 * (1 - calm) + 0.4 });
      const eyeY = 300 + bob - deep * 10;
      const x = 600;
      const r = this.ptdHead(ctx, o.you, x, eyeY, 880, { rim: '#d9f99d', rimD: 1 });
      const lit = t >= 152;
      if (lit) {
        this.ptdEyes(ctx, o.you, x, eyeY, r.u, { ring: LIME, iris: '#365314' });
        [-1, 1].forEach((s) => this.cineGlow(ctx, x + s * 3.5 * r.u, eyeY, r.u * 3, 'rgba(163,230,53,0.6)', seg(t, 152, 160)));
      } else {
        this.ptdEyes(ctx, o.you, x, eyeY, r.u, { ring: '#94a3b8', iris: '#1e293b' });
        [-1, 1].forEach((s) => this.finLid(ctx, x + s * 3.5 * r.u, eyeY, r.u * 0.34, -s, 'half', mix(o.you.skinColor || '#f3d1b8', '#000000', 0.12)));
      }
      const mOpen = t < 136 ? 0.5 + 0.5 * Math.sin(ph * TAU) : 1 - seg(t, 136, 148);
      this.fxaMouth(ctx, o.you, x, r.top, r.u, 'pant', clamp(mOpen));
      this.fxaDrops(ctx, [x - 8.4 * r.u, x + 8.2 * r.u, x - 6 * r.u, x + 5.6 * r.u], r.top + 5 * r.u, bot + 40, t, r.u * 0.4, 9);
      // vapor saindo da boca a cada expiração
      const mx = x + 0.4 * r.u;
      const my = r.top + 12.6 * r.u;
      for (let n = 0; n < 7; n++) {
        const te = n * per + 6;
        const d = t - te;
        if (d < 0 || d > 46 || te > 136) continue;
        const a = 1 - d / 46;
        for (let j = 0; j < 5; j++) {
          const px = mx + (n % 2 ? 1 : -1) * (60 + d * 5 + j * 20) + Math.sin(d * 0.1 + j) * 8;
          const py = my + 18 - d * 0.7 - j * 5;
          this.cineGlow(ctx, px, py, 20 + d * 1.2 + j * 5, 'rgba(241,245,249,0.42)', a * 0.9 * seg(d, 0, 4));
        }
      }
      ctx.restore();
      // "HAH..." a cada expiração
      for (let n = 0; n < 5; n++) {
        const te = n * per + 6;
        if (t < te || t > te + 22) continue;
        this.ptdWord(ctx, 'HAH...', n % 2 ? 960 : 250, n % 2 ? top + 110 : top + 170, 46, '#e2e8f0', seg(t, te, te + 5), 1 - seg(t, te + 14, te + 22), n % 2 ? 0.08 : -0.08);
      }
      if (t >= 138) this.fxaStamp(ctx, 'FUUUUU...', 980, top + 120, 56, '#d9f99d', t, 138, 3, 0, 1);
      // a barra de fôlego (HUD)
      const bx = 60;
      const by = bot - 78;
      const blink = 0.5 + 0.5 * Math.sin(t * 0.3);
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,23,0.85)';
      ctx.fillRect(bx - 12, by - 30, 400, 64);
      ctx.font = '900 13px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('FÔLEGO', bx, by - 14);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx, by, 370, 18);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx, by, 370 * 0.05, 18);
      ctx.strokeStyle = `rgba(239,68,68,${0.4 + 0.6 * blink})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx - 2, by - 2, 374, 22);
      ctx.fillStyle = '#fca5a5';
      ctx.textAlign = 'right';
      ctx.fillText('5%', bx + 370, by - 14);
      ctx.restore();
      this.fxaSfx(S, 138, 'in', () => window.SFX?.whoosh?.());
    },

    // PLANO 2 — raio-x: os pulmões abrindo como um fole
    fxaPul1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxaCfg('fl_comum_pulmao');
      const br = easeIO(seg(t, 2, 30)) * (1 - easeIO(seg(t, 32, 44)) * 0.7) + easeIO(seg(t, 46, 76)) * 0.85;
      const pump = seg(t, 2, 30) * (t < 32 ? 1 : 0) + (t >= 46 && t < 76 ? 1 : 0);
      ctx.drawImage(
        this.fxaBg('pul_grid', W, H, (g) => {
          g.fillStyle = '#03140a';
          g.fillRect(0, 0, W, H);
          g.fillStyle = 'rgba(163,230,53,0.08)';
          for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 2, H);
          for (let y = 0; y < H; y += 32) g.fillRect(0, y, W, 2);
          const rg = g.createRadialGradient(500, 380, 10, 500, 380, 520);
          rg.addColorStop(0, 'rgba(163,230,53,0.16)');
          rg.addColorStop(1, 'rgba(163,230,53,0)');
          g.fillStyle = rg;
          g.fillRect(0, 0, W, H);
        }, 0.5), 0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + br * 0.03, shake: 0.6 });
      const size = 820;
      const u = size / 36;
      const cx = 500;
      const T = 380 - 17.5 * u;
      this.ptdSpr(ctx, o.you, cx, T + size * 0.87, size, { dim: 0.55, dimTint: '4,40,18', rim: LIME, rimD: 1 });
      this.fxaLungs(ctx, cx, T + 19.4 * u - br * 6, u * 0.4, 0.86 + 0.3 * br);
      // o fole
      const hx = 860;
      const hy = 400;
      this.fxaBellows(ctx, hx, hy, 1 - br);
      // ar entrando
      if (pump > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(217,249,157,0.8)';
        for (let i = 0; i < 8; i++) {
          const f = mod(t * 0.06 + i / 8, 1);
          const px = lerp(hx - 46, cx + 2 * u, f);
          const py = lerp(hy, T + 19 * u, f) + Math.sin(f * 9 + i) * 6;
          ctx.fillRect(px - 10, py - 2, 20, 4);
        }
        ctx.restore();
      }
      ctx.restore();
      [[2, 'FUUU...'], [46, 'FUUUUU...']].forEach(([a, s], i) => this.ptdWord(ctx, s, i ? 1060 : 940, i ? top + 120 : top + 80, 50 + i * 10, LIME, seg(t, a, a + 6), 1 - seg(t, a + 30, a + 40), i ? 0.06 : -0.06));
      const cap = Math.round(100 + 200 * easeIO(seg(t, 0, 80)));
      this.finKicker(ctx, 40, top + 30, 'RAIO-X • CAPACIDADE PULMONAR', seg(t, 4, 30), LIME);
      ctx.save();
      ctx.font = 'italic 900 54px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#020617';
      ctx.strokeText(`${cap}%`, 40, bot - 60);
      ctx.fillStyle = '#ecfccb';
      ctx.fillText(`${cap}%`, 40, bot - 60);
      ctx.restore();
      this.fxaSfx(S, 2, 'p1', () => window.SFX?.whoosh?.());
      this.fxaSfx(S, 46, 'p2', () => window.SFX?.whoosh?.());
    },

    // PLANO 3 — a barra enche, transborda e vira ∞. PULMÃO DE AÇO
    fxaPul2(ctx, S) {
      const { W, H, t } = S;
      const o = this.fxaCfg('fl_comum_pulmao');
      const hit = 22;
      const fill = ease(seg(t, 0, 20));
      const inf = seg(t, hit, hit + 24);
      this.fxaCloseBg(ctx, S, 'pul_bg3', '#020a05', '#0b2a0f', 'rgba(163,230,53,0.28)', 820, 300);
      this.ptdRays(ctx, 820, 300, W, LIME, 0.12, t * 0.003, 40);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.03 - 0.03 * easeIO(t / 90), shake: t >= hit ? 7 * (1 - seg(t, hit, hit + 22)) : 0.5 });
      const hx = 300;
      const eyeY = 244;
      const r = this.ptdHead(ctx, o.you, hx, eyeY, 760, { rim: LIME, rimD: 2 });
      // o corpo some num degradê (close de busto)
      const fg = ctx.createLinearGradient(0, 470, 0, 640);
      fg.addColorStop(0, 'rgba(2,10,5,0)');
      fg.addColorStop(1, 'rgba(2,10,5,0.92)');
      ctx.fillStyle = fg;
      ctx.fillRect(hx - 300, 470, 600, 200);
      this.ptdEyes(ctx, o.you, hx, eyeY, r.u, { ring: LIME, iris: '#365314', angry: true });
      // o vapor da expiração saindo de lado
      for (let j = 0; j < 7; j++) {
        const d = t - j * 2;
        if (d < 0) continue;
        const a = 1 - seg(d, 10, 50);
        this.cineGlow(ctx, hx + 0.4 * r.u + 90 + d * 5 + j * 18, r.top + 13.2 * r.u + 10 - d * 0.4 - j * 3, 22 + d * 1.3, 'rgba(241,245,249,0.45)', a);
      }
      // a barra
      const C = [820, 300];
      if (inf < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - inf;
        const bw = 520;
        ctx.fillStyle = 'rgba(2,6,23,0.9)';
        ctx.fillRect(C[0] - bw / 2 - 10, C[1] - 30, bw + 20, 60);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(C[0] - bw / 2, C[1] - 17, bw, 34);
        ctx.fillStyle = LIME;
        ctx.fillRect(C[0] - bw / 2, C[1] - 17, bw * fill, 34);
        ctx.fillStyle = '#ecfccb';
        ctx.fillRect(C[0] - bw / 2, C[1] - 17, bw * fill, 6);
        ctx.font = '900 16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textBaseline = 'middle';
        ctx.fillText(`FÔLEGO ${Math.round(fill * 100)}%`, C[0] - bw / 2, C[1] - 46);
        ctx.restore();
      }
      if (inf > 0) {
        const N = 120;
        const n = Math.max(2, Math.floor(N * ease(inf)));
        const P = (i) => {
          const th = (i / N) * TAU - Math.PI / 2;
          const den = 1 + Math.sin(th) * Math.sin(th);
          return [C[0] + (220 * Math.cos(th)) / den, C[1] + (220 * Math.sin(th) * Math.cos(th)) / den];
        };
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        [[30, 'rgba(163,230,53,0.3)'], [18, LIME], [6, '#f7fee7']].forEach(([lw, c]) => {
          ctx.strokeStyle = c;
          ctx.lineWidth = lw;
          ctx.beginPath();
          for (let i = 0; i <= n; i++) {
            const [x, y] = P(i);
            if (i) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.stroke();
        });
        ctx.restore();
        const tip = P(inf < 1 ? n : Math.floor(mod(t * 1.6, N)));
        this.cineGlow(ctx, tip[0], tip[1], 60, 'rgba(236,252,203,0.9)');
      }
      ctx.restore();
      this.fxaTitle(ctx, S, o, t, 38, 520);
      if (t >= hit) this.cineFlash(ctx, W, H, 0.38 * (1 - seg(t, hit, hit + 10)), '#ecfccb');
      [4, 10, 16].forEach((a, i) => this.fxaSfx(S, a, `f${i}`, () => window.SFX?.blip?.(523 + i * 196)));
      this.fxaSfx(S, hit, 'hit', () => window.SFX?.kick?.(0.8));
    }
  });

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  const run = (fns) =>
    function (ctx, S) {
      this.sakugaW = S.W;
      if (this.fxaLoad(fns, S)) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, S.W, S.H);
        return;
      }
      // o plano 1 começa a contar depois da pré-carga e abre do preto
      const off = S.phase === 0 ? this._fxaL.doneT : 0;
      const S2 = off ? Object.assign({}, S, { t: Math.max(0, S.t - off) }) : S;
      fns[S.phase].call(this, ctx, S2);
      if (off) this.cineFlash(ctx, S.W, S.H, 1 - seg(S2.t, 0, 8), '#000000');
      this.ptdGrain(ctx, S.W, S.H, 0.045);
      this.fxaWarm(fns, S);
    };
  const reg = (id, def) => {
    // (vinheta 0.55 = a mesma das outras cenas da partida: o kit guarda uma só)
    const d = Object.assign({ letterbox: 0.1, grain: 0, vignette: 0.55 }, def);
    Object.defineProperty(d, 'title', {
      enumerable: true,
      get() {
        const o = CE.fxaCfg(id);
        return `${def.icon} FLUXO • ${o.youName.toUpperCase()}`;
      }
    });
    CE.registerCine(`flow_${id}`, d);
  };

  reg('fl_comum_foco', {
    icon: '🌀',
    phases: [176, 90, 94],
    music: 'mystery',
    tags: ['PLANO 1 • O BARULHO', 'PLANO 2 • UM BATIMENTO', 'PLANO 3 • CONCENTRAÇÃO'],
    subs: [[{ from: 2, who: 'VOCÊ', text: '(...respira.)', color: YOU }], [], []],
    draw: run([CE.fxaFoco0, CE.fxaFoco1, CE.fxaFoco2])
  });
  reg('fl_incomum_adrenalina', {
    icon: '💚',
    phases: [170, 95, 95],
    music: 'tension',
    tags: ['PLANO 1 • ELIMINADO', 'PLANO 2 • O CORAÇÃO', 'PLANO 3 • SOBREVIVER'],
    subs: [[{ from: 2, who: 'VOCÊ', text: '(Ainda não!)', color: YOU }], [], []],
    draw: run([CE.fxaAdr0, CE.fxaAdr1, CE.fxaAdr2])
  });
  reg('fl_raro_cacador', {
    icon: '⚡',
    phases: [160, 100, 100],
    music: 'mystery',
    tags: ['PLANO 1 • O CHEIRO DO GOL', 'PLANO 2 • A MIRA', 'PLANO 3 • CAÇADOR'],
    subs: [[{ from: 4, who: 'VOCÊ', text: '(...ali.)', color: YOU }], [], []],
    draw: run([CE.fxaCac0, CE.fxaCac1, CE.fxaCac2])
  });
  reg('fl_epico_rua', {
    icon: '🌼',
    phases: [96, 166, 98],
    music: 'promise',
    tags: ['PLANO 1 • O ESTÁDIO SOME', 'PLANO 2 • A RUA DOURADA', 'PLANO 3 • ILUMINADO'],
    subs: [[], [{ from: 2, who: 'VOCÊ', text: '(Silêncio.)', color: YOU }], []],
    draw: run([CE.fxaRua0, CE.fxaRua1, CE.fxaRua2])
  });
  reg('fl_lendario_rei', {
    icon: '👑',
    phases: [100, 162, 98],
    music: 'epic',
    tags: ['PLANO 1 • A TEMPESTADE', 'PLANO 2 • A MANDÍBULA', 'PLANO 3 • O REI TIRANO'],
    subs: [[], [{ from: 2, who: 'VOCÊ', text: '"Devorar."', color: YOU }], []],
    draw: run([CE.fxaRei0, CE.fxaRei1, CE.fxaRei2])
  });
  reg('fl_mitico_destruidor', {
    icon: '⛓️',
    phases: [90, 180, 90],
    music: 'dread',
    tags: ['PLANO 1 • O ABISMO', 'PLANO 2 • CORRENTES', 'PLANO 3 • O TRANSE'],
    subs: [[], [{ from: 2, who: 'VOCÊ', text: '(Quebra tudo.)', color: YOU }], []],
    draw: run([CE.fxaDes0, CE.fxaDes1, CE.fxaDes2])
  });
  reg('fl_wc_quatro_egos', {
    icon: '🌌',
    phases: [176, 80, 104],
    music: 'epic',
    tags: ['PLANO 1 • A GALÁXIA', 'PLANO 2 • ALINHAMENTO', 'PLANO 3 • SINGULARIDADE'],
    subs: [[{ from: 2, who: 'VOCÊ', text: '(Nós quatro.)', color: YOU }], [], []],
    draw: run([CE.fxaEgos0, CE.fxaEgos1, CE.fxaEgos2])
  });
  reg('fl_comum_pulmao', {
    icon: '🫁',
    phases: [178, 92, 90],
    music: 'victory',
    tags: ['PLANO 1 • SEM FÔLEGO', 'PLANO 2 • O FOLE', 'PLANO 3 • INFINITO'],
    subs: [[{ from: 2, who: 'VOCÊ', text: '(Ainda... dá.)', color: YOU }], [], []],
    draw: run([CE.fxaPul0, CE.fxaPul1, CE.fxaPul2])
  });
})();
