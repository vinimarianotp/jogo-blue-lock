// Fundos dos diálogos (bg_estadios): CutsceneEngine.VN_BG[tema] = function (ctx, W, H) { ... }
window.CutsceneEngine.VN_BG = window.CutsceneEngine.VN_BG || {};

// Os 7 mapas das partidas como cenário de anime: perspectiva, profundidade, luz e atmosfera.
// Tudo é desenhado UMA vez quando a cena muda (e na arte dos capítulos), com geometria
// relativa a W/H e aleatório com semente (o fundo nunca muda entre redesenhos).
(function () {
  'use strict';
  const CE = window.CutsceneEngine;
  const VN = CE.VN_BG;
  const FONT = '"Segoe UI", sans-serif';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const SKINS = ['#f3d1b8', '#e5b899', '#c99472', '#8d5a3b', '#f1d3bd', '#d9a988'];
  const HAIRS = ['#111827', '#1f2937', '#3f2a1d', '#5b3a29', '#0f172a', '#78350f', '#a16207'];
  const mapColors = (id) => window.MatchEngine.getMapColors(id);
  // Alturas (fração de H acima do horizonte, no centro) de cada parte do estádio
  const TIERS = (f1 = 0.37, k = 1) => ({ f1: f1 * k, f2: 0.33 * k, ut: 0.27 * k, mid: 0.137 * k, bandB: 0.1 * k, boardT: 0.016 * k, boardB: -0.02 });
  const crowdOf = (id, fb) => (window.MatchEngine && window.MatchEngine.CROWD_COLORS && window.MatchEngine.CROWD_COLORS[id]) || fb;

  // Bandeirinhas na torcida: (ctx, x, y, w, h)
  const FLAGS = {
    jp(g, x, y, w, h) {
      g.fillStyle = '#f8fafc'; g.fillRect(x, y, w, h);
      g.fillStyle = '#dc2626'; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.3, 0, Math.PI * 2); g.fill();
    },
    en(g, x, y, w, h) {
      g.fillStyle = '#f8fafc'; g.fillRect(x, y, w, h);
      g.fillStyle = '#dc2626'; g.fillRect(x, y + h * 0.4, w, h * 0.2); g.fillRect(x + w * 0.42, y, w * 0.16, h);
    },
    fr(g, x, y, w, h) {
      g.fillStyle = '#1d4ed8'; g.fillRect(x, y, w / 3, h);
      g.fillStyle = '#f8fafc'; g.fillRect(x + w / 3, y, w / 3, h);
      g.fillStyle = '#dc2626'; g.fillRect(x + (2 * w) / 3, y, w / 3, h);
    },
    bl(g, x, y, w, h) {
      g.fillStyle = '#1d4ed8'; g.fillRect(x, y, w, h);
      g.fillStyle = '#f8fafc'; g.fillRect(x, y + h * 0.42, w, h * 0.16);
    },
    red(g, x, y, w, h) {
      g.fillStyle = '#dc2626'; g.fillRect(x, y, w, h);
      g.fillStyle = '#f8fafc'; g.fillRect(x, y + h * 0.7, w, h * 0.14);
    },
    gold(g, x, y, w, h) {
      g.fillStyle = '#facc15'; g.fillRect(x, y, w, h);
      g.fillStyle = '#111827'; g.fillRect(x, y + h * 0.45, w, h * 0.12);
    },
    cyan(g, x, y, w, h) {
      g.fillStyle = '#00f5d4'; g.fillRect(x, y, w, h);
      g.fillStyle = '#0f172a'; g.fillRect(x + w * 0.4, y, w * 0.2, h);
    }
  };

  Object.assign(CE, {
    // ------------------------------------------------------------------ cores
    bgestRng(seed) {
      let s = seed >>> 0 || 1;
      return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    bgestRgb(c) {
      if (Array.isArray(c)) return c;
      if (c.startsWith('rgb')) return c.match(/[\d.]+/g).slice(0, 3).map(Number);
      let h = c.replace('#', '');
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      const n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    bgestMix(a, b, k) {
      const A = this.bgestRgb(a);
      const B = this.bgestRgb(b);
      return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`;
    },
    bgestA(c, a) {
      const A = this.bgestRgb(c);
      return `rgba(${A[0]},${A[1]},${A[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
    },
    // Cor iluminada: lv < 1 escurece, lv > 1 clareia; tint puxa para a cor da luz ambiente
    bgestLit(col, lv, tint, tk) {
      if (!this._bgestLitC) this._bgestLitC = new Map();
      const key = `${col}|${lv.toFixed(2)}|${tint}|${tk}`;
      let v = this._bgestLitC.get(key);
      if (v) return v;
      let c = tk ? this.bgestMix(col, tint, tk) : col;
      c = lv >= 1 ? this.bgestMix(c, '#ffffff', Math.min(0.6, lv - 1)) : this.bgestMix(c, '#000000', 1 - lv);
      this._bgestLitC.set(key, c);
      return c;
    },
    bgestCanvas(w, h, draw) {
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w));
      cv.height = Math.max(1, Math.round(h));
      draw(cv.getContext('2d'), cv.width, cv.height);
      return cv;
    },

    // ------------------------------------------------------------ luz e clima
    // Brilho elíptico (lighter = luz; source-over com cor escura = sombra suave)
    bgestGlowE(ctx, x, y, rx, ry, color, alpha = 1, comp = 'lighter') {
      if (!(rx > 0 && ry > 0) || alpha <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = comp;
      ctx.translate(x, y);
      ctx.scale(rx / ry, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
      g.addColorStop(0, this.bgestA(color, alpha));
      g.addColorStop(0.45, this.bgestA(color, alpha * 0.45));
      g.addColorStop(1, this.bgestA(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
      ctx.restore();
    },
    bgestStars(ctx, W, h, rng, n = 120, alpha = 0.8) {
      ctx.save();
      for (let i = 0; i < n; i++) {
        const x = Math.round(rng() * W);
        const y = Math.round(rng() * h);
        const b = rng();
        ctx.globalAlpha = alpha * (0.25 + b * 0.75) * (1 - (y / h) * 0.65);
        ctx.fillStyle = b > 0.93 ? '#fde68a' : b > 0.8 ? '#bfdbfe' : '#ffffff';
        const s = b > 0.95 ? 2 : 1;
        ctx.fillRect(x, y, s, s);
        if (b > 0.975) {
          ctx.globalAlpha *= 0.6;
          ctx.fillRect(x - 2, y, 5 + s - 1, 1);
          ctx.fillRect(x, y - 2, 1, 5 + s - 1);
        }
      }
      ctx.restore();
    },
    // Placa do local no topo, centralizada
    bgestPlate(ctx, W, H, text, accent = '#38bdf8') {
      ctx.save();
      let fs = clamp(Math.round(H * 0.028), 10, 18);
      const hasLS = 'letterSpacing' in ctx;
      const setF = () => {
        ctx.font = `italic 900 ${fs}px ${FONT}`;
        if (hasLS) ctx.letterSpacing = `${(fs * 0.14).toFixed(1)}px`;
      };
      setF();
      let tw = ctx.measureText(text).width;
      while (tw + fs * 5 > W * 0.6 && fs > 9) {
        fs--;
        setF();
        tw = ctx.measureText(text).width;
      }
      const ph = Math.round(fs * 2.1);
      const pw = Math.round(tw + fs * 3.6);
      const sk = ph * 0.3;
      const x0 = Math.round(W / 2 - pw / 2);
      const y0 = Math.round(Math.max(8, H * 0.032));
      const para = (x, y, w, h) => {
        ctx.beginPath();
        ctx.moveTo(x + sk, y);
        ctx.lineTo(x + w + sk, y);
        ctx.lineTo(x + w - sk, y + h);
        ctx.lineTo(x - sk, y + h);
        ctx.closePath();
      };
      // fio de luz atravessando a tela atrás da placa
      const hl = ctx.createLinearGradient(W * 0.1, 0, W * 0.9, 0);
      hl.addColorStop(0, this.bgestA(accent, 0));
      hl.addColorStop(0.5, this.bgestA(accent, 0.6));
      hl.addColorStop(1, this.bgestA(accent, 0));
      ctx.fillStyle = hl;
      ctx.fillRect(W * 0.1, y0 + ph / 2 - 0.5, W * 0.8, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      para(x0 + 3, y0 + 4, pw, ph);
      ctx.fill();
      const g = ctx.createLinearGradient(0, y0, 0, y0 + ph);
      g.addColorStop(0, 'rgba(22,32,54,0.93)');
      g.addColorStop(1, 'rgba(3,7,18,0.93)');
      ctx.fillStyle = g;
      para(x0, y0, pw, ph);
      ctx.fill();
      ctx.strokeStyle = 'rgba(203,213,225,0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // detalhes de cor: base iluminada e blocos nas pontas
      ctx.fillStyle = accent;
      ctx.fillRect(x0 - sk + 2, y0 + ph - 2, pw - 2, 2);
      para(x0 - fs * 0.95, y0, fs * 0.42, ph);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      para(x0 + pw + fs * 0.5, y0, fs * 0.42, ph);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tx = W / 2 + (hasLS ? fs * 0.07 : 0);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(text, tx + 1, y0 + ph / 2 + 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(text, tx, y0 + ph / 2 + 1);
      ctx.restore();
    },
    // Acabamento: sombra atrás do personagem, vinheta e placa
    bgestFinish(ctx, W, H, o = {}) {
      const { plate, accent, vig = 0.6, shade = 0.3 } = o;
      if (shade > 0) this.bgestGlowE(ctx, W / 2, H * 0.74, W * 0.3, H * 0.42, '#020617', shade, 'source-over');
      this.cineVignette(ctx, W, H, vig);
      if (plate) this.bgestPlate(ctx, W, H, plate, accent);
    },

    // ------------------------------------------------------------ gramado
    // Campo visto da lateral: faixas de corte convergindo, círculo central em perspectiva
    bgestPitch(ctx, W, H, hy, o = {}) {
      const cx = W / 2;
      const Zt = 50;
      const F = W * 0.62;
      const K = H * (o.touch || 0.042) * Zt;
      const P = (X, Z) => [cx + (F * X) / Z, hy + K / Z];
      ctx.save();
      this.cineGradient(ctx, 0, hy - 1, W, H - hy + 1, [[0, o.far], [0.32, o.mid], [1, o.near]]);
      const kx = (F / K) * (H - hy);
      const sw = 5.5;
      const maxX = (W * 1.3) / kx;
      ctx.beginPath();
      for (let i = Math.floor(-maxX / sw) - 1; i * sw < maxX; i++) {
        if (Math.abs(i) % 2 === 1) continue;
        ctx.moveTo(cx, hy);
        ctx.lineTo(cx + i * sw * kx, H);
        ctx.lineTo(cx + (i + 1) * sw * kx, H);
        ctx.closePath();
      }
      ctx.fillStyle = o.stripe || 'rgba(0,0,0,0.1)';
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < 70; i += 2) {
        const z0 = 1.5 + i * 5.5;
        const ya = hy + K / (z0 + 5.5);
        const yb = Math.min(H, hy + K / z0);
        ctx.rect(0, ya, W, yb - ya);
      }
      ctx.fillStyle = o.band || 'rgba(255,255,255,0.03)';
      ctx.fill();
      // Linhas do campo
      ctx.fillStyle = o.line || 'rgba(255,255,255,0.7)';
      const ty = hy + K / Zt;
      ctx.fillRect(0, ty - 0.6, W, Math.max(1.2, (K * 0.12) / (Zt * Zt)));
      const Zn = (K / (H - hy)) * 0.9;
      const quadW = (pts) => {
        ctx.beginPath();
        pts.forEach(([X, Z], i) => {
          const p = P(X, Z);
          if (i) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
        });
        ctx.closePath();
        ctx.fill();
      };
      quadW([[-0.07, Zt], [0.07, Zt], [0.07, Zn], [-0.07, Zn]]);
      const Zc = Zt - 34;
      ctx.beginPath();
      [9.22, 9.08].forEach((r) => {
        for (let i = 0; i <= 120; i++) {
          const a = (i / 120) * Math.PI * 2;
          const p = P(r * Math.cos(a), Math.max(Zn * 0.8, Zc + r * Math.sin(a)));
          if (i) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
        }
        ctx.closePath();
      });
      ctx.fill('evenodd');
      const sp = P(0, Zc);
      ctx.beginPath();
      ctx.ellipse(sp[0], sp[1], (F * 0.22) / Zc, (K * 0.22) / (Zc * Zc), 0, 0, Math.PI * 2);
      ctx.fill();
      // perto da câmera o gramado escurece (as linhas não brigam com a caixa de diálogo)
      this.cineGradient(ctx, 0, hy + (H - hy) * 0.25, W, (H - hy) * 0.75 + 1, [[0, 'rgba(1,4,8,0)'], [1, `rgba(1,4,8,${o.nearDark == null ? 0.5 : o.nearDark})`]]);
      (o.pools || []).forEach(([fx, fy, rx, ry, col, al]) => this.bgestGlowE(ctx, W * fx, H * fy, W * rx, H * ry, col, al));
      ctx.restore();
      return { P, K, F, Zt };
    },

    // ------------------------------------------------------- estádio (tigela)
    // A arquibancada do fundo curva para cima nas laterais (está mais perto da câmera):
    // y = hy - H * a * s(x), com s(x) = 1 + k*u²
    bgestBowlGeo(W, H, o) {
      const cx = W / 2;
      const hy = o.hy;
      const kk = o.k == null ? 1.45 : o.k;
      const s = (x) => {
        const u = (x - cx) / (W / 2);
        return 1 + kk * u * u;
      };
      const Y = (x, a) => hy - H * a * s(x);
      const N = 90;
      const xs = [];
      for (let i = 0; i <= N; i++) xs.push(-W * 0.04 + (W * 1.08 * i) / N);
      const g = { W, H, cx, hy, k: kk, T: o.tiers, s, Y, xs };
      g.curve = (ctx, a, move = true) => {
        xs.forEach((x, i) => (i || !move ? ctx.lineTo(x, Y(x, a)) : ctx.moveTo(x, Y(x, a))));
      };
      g.band = (ctx, a1, a2) => {
        ctx.beginPath();
        g.curve(ctx, a1);
        for (let i = N; i >= 0; i--) ctx.lineTo(xs[i], Y(xs[i], a2));
        ctx.closePath();
      };
      g.quad = (ctx, x0, x1, a0, a1, seg = 10) => {
        ctx.beginPath();
        for (let i = 0; i <= seg; i++) {
          const x = lerp(x0, x1, i / seg);
          if (i) ctx.lineTo(x, Y(x, a0));
          else ctx.moveTo(x, Y(x, a0));
        }
        for (let i = seg; i >= 0; i--) {
          const x = lerp(x0, x1, i / seg);
          ctx.lineTo(x, Y(x, a1));
        }
        ctx.closePath();
      };
      // posições com espaçamento que cresce com a proximidade (simétricas ao centro)
      g.steps = (base, phase = 0.5) => {
        const out = [];
        let x = cx + base * phase;
        while (x < W * 1.12) {
          out.push(x);
          x += base * s(x);
        }
        x = cx - base * (phase > 0 ? phase : 1);
        while (x > -W * 0.12) {
          out.push(x);
          x -= base * s(x);
        }
        return out.sort((a, b) => a - b);
      };
      return g;
    },
    // Degradê que acompanha a curva (faixas verticais, cada uma com seu degradê)
    // (faixas com lados verticais em x inteiro: sem clip e sem emendas visíveis)
    bgestShadeBand(ctx, g, a1, a2, stops, n = 32) {
      for (let i = 0; i < n; i++) {
        const x0 = Math.floor((g.W * i) / n);
        const x1 = Math.floor((g.W * (i + 1)) / n);
        const xm = (x0 + x1) / 2;
        const y0 = g.Y(xm, a1);
        const y1 = g.Y(xm, a2);
        if (Math.abs(y1 - y0) < 0.5 || (Math.max(y0, y1) < 0 && Math.max(g.Y(x0, a2), g.Y(x1, a2), g.Y(x0, a1), g.Y(x1, a1)) < 0)) continue;
        const gr = ctx.createLinearGradient(0, y0, 0, y1);
        stops.forEach(([k, c]) => gr.addColorStop(k, c));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(x0, g.Y(x0, a1));
        ctx.lineTo(xm, g.Y(xm, a1));
        ctx.lineTo(x1, g.Y(x1, a1));
        ctx.lineTo(x1, g.Y(x1, a2));
        ctx.lineTo(xm, g.Y(xm, a2));
        ctx.lineTo(x0, g.Y(x0, a2));
        ctx.closePath();
        ctx.fill();
      }
    },
    // Imagem colada na curva da arquibancada (telão, bandeirão)
    bgestCurveImage(ctx, g, img, x0, x1, a0, a1, n) {
      n = n || Math.max(24, Math.round(Math.abs(x1 - x0) / 5));
      for (let i = 0; i < n; i++) {
        const xa = lerp(x0, x1, i / n);
        const xb = lerp(x0, x1, (i + 1) / n);
        const xm = (xa + xb) / 2;
        const top = g.Y(xm, a0);
        const bot = g.Y(xm, a1);
        ctx.drawImage(img, (img.width * i) / n, 0, img.width / n, img.height, xa, top, xb - xa + 0.8, bot - top);
      }
    },
    // Texto repetido ao longo de uma faixa curva
    bgestCurveText(ctx, g, text, a1, a2, color, o = {}) {
      const { gap = 2.2, size = 0.68, font = 'italic 900', start = -g.W * 0.03 } = o;
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const am = (a1 + a2) / 2;
      let x = start;
      let guard = 0;
      while (x < g.W * 1.03 && guard++ < 200) {
        let fs = Math.max(5, g.H * Math.abs(a1 - a2) * g.s(x) * size);
        ctx.font = `${font} ${fs.toFixed(1)}px ${FONT}`;
        let tw = ctx.measureText(text).width;
        fs = Math.max(5, g.H * Math.abs(a1 - a2) * g.s(x + tw / 2) * size);
        ctx.font = `${font} ${fs.toFixed(1)}px ${FONT}`;
        tw = ctx.measureText(text).width;
        const ang = Math.atan2(g.Y(x + tw, am) - g.Y(x, am), tw);
        ctx.save();
        ctx.translate(x, g.Y(x, am));
        ctx.rotate(ang);
        ctx.fillText(text, 0, fs * 0.04);
        ctx.restore();
        x += tw + fs * gap;
      }
      ctx.restore();
    },
    // Uma arquibancada (anel) com degraus, cadeiras, escadas e torcedor por torcedor
    bgestTier(ctx, g, a1, a2, o) {
      const { n = 12, density = 0.85, light = [0.6, 1], seats, crowd, tint = '#1e3a8a', tk = 0.15, rng, blocked = [], aisles = [], aisleCol = '#475569', flags = null, flagK = 0 } = o;
      const H = g.H;
      const W = g.W;
      const rowA = (a1 - a2) / n;
      const lit = (c, lv) => this.bgestLit(c, Math.round(lv * 12) / 12, tint, tk);
      ctx.fillStyle = lit(seats[0], lerp(light[0], light[1], 0.5) * 0.85);
      g.band(ctx, a1, a2);
      ctx.fill();
      ctx.fillStyle = 'rgba(3,5,10,0.5)';
      for (let j = 0; j < n; j++) {
        g.band(ctx, a1 - rowA * j, a1 - rowA * (j + 0.28));
        ctx.fill();
      }
      const seatB = new Map();
      const bodyB = new Map();
      const headB = new Map();
      const add = (m, col, x, y, w, h) => {
        let p = m.get(col);
        if (!p) m.set(col, (p = new Path2D()));
        p.rect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
      };
      const isBlocked = (x, a, r) => {
        for (let i = 0; i < blocked.length; i++) {
          const b = blocked[i];
          if (a <= b.a1 && a >= b.a2 && Math.abs(x - b.x) < b.hw * r) return true;
        }
        for (let i = 0; i < aisles.length; i++) if (Math.abs(x - aisles[i]) < r * 0.62) return true;
        return false;
      };
      const flagSpots = [];
      // paletas já iluminadas por nível de luz (sem montar string a cada torcedor)
      const Q = 12;
      const mk = (list) => list.map((c) => {
        const arr = [];
        return (lv) => {
          const q = Math.max(0, Math.round(lv * Q));
          return arr[q] || (arr[q] = this.bgestLit(c, q / Q, tint, tk));
        };
      });
      const crowdL = mk(crowd);
      const skinL = mk(SKINS);
      const hairL = mk(HAIRS);
      const seatL = mk(seats);
      const pick = (arr) => arr[Math.floor(rng() * arr.length)];
      for (let j = 0; j < n; j++) {
        const L = lerp(light[0], light[1], n > 1 ? j / (n - 1) : 1);
        const aBase = a1 - rowA * (j + 1);
        let x = -W * 0.03 - rng() * 8;
        while (x < W * 1.03) {
          const sc = g.s(x);
          const r = H * rowA * sc;
          const y = g.Y(x, aBase);
          const lv = L + (rng() - 0.5) * 0.14;
          if (!isBlocked(x, aBase + rowA * 0.5, r)) {
            if (rng() < density) {
              const jx = (rng() - 0.5) * r * 0.22;
              const px = x + jx;
              const bc = pick(crowdL)(lv);
              add(bodyB, bc, px - r * 0.34, y - r * 0.8, r * 0.68, r * 0.66);
              add(headB, pick(skinL)(lv * 0.95), px - r * 0.19, y - r * 1.12, r * 0.38, r * 0.36);
              if (r > 7) add(headB, pick(hairL)(lv), px - r * 0.21, y - r * 1.17, r * 0.42, r * 0.13);
              const q = rng();
              if (q < 0.06) add(bodyB, bc, px + r * 0.24, y - r * 1.42, r * 0.13, r * 0.62);
              else if (q < 0.1) add(headB, pick(crowdL)(lv * 1.05), px - r * 0.55, y - r * 1.5, r * 1.1, r * 0.2);
              else if (flags && q < 0.1 + flagK) flagSpots.push([px, y - r * 1.1, r]);
            } else {
              add(seatB, pick(seatL)(lv * 0.9), x - r * 0.34, y - r * 0.68, r * 0.68, r * 0.5);
            }
          }
          x += r * (0.8 + rng() * 0.08);
        }
      }
      [seatB, bodyB, headB].forEach((m) => m.forEach((p, col) => {
        ctx.fillStyle = col;
        ctx.fill(p);
      }));
      // escadas
      aisles.forEach((ax) => {
        for (let j = 0; j < n; j++) {
          const sc = g.s(ax);
          const r = H * rowA * sc;
          const y = g.Y(ax, a1 - rowA * (j + 1));
          ctx.fillStyle = lit(aisleCol, lerp(light[0], light[1], j / Math.max(1, n - 1)) * 1.05);
          ctx.fillRect(Math.round(ax - r * 0.5), Math.round(y - r), Math.max(1, Math.round(r)), Math.max(1, Math.round(r * 0.55)));
          ctx.fillStyle = 'rgba(2,6,23,0.55)';
          ctx.fillRect(Math.round(ax - r * 0.5), Math.round(y - r * 0.45), Math.max(1, Math.round(r)), Math.max(1, Math.round(r * 0.45)));
        }
        ctx.strokeStyle = 'rgba(226,232,240,0.28)';
        ctx.lineWidth = Math.max(0.6, g.s(ax) * 0.6);
        ctx.beginPath();
        ctx.moveTo(ax, g.Y(ax, a1));
        ctx.lineTo(ax, g.Y(ax, a2));
        ctx.stroke();
      });
      // bandeirinhas
      if (flags) {
        flagSpots.forEach(([fx, fy, r]) => {
          const kind = flags[Math.floor(rng() * flags.length)];
          const w = r * 1.5;
          const h = r * 1.0;
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate((rng() - 0.5) * 0.5);
          ctx.globalAlpha = clamp(lerp(light[0], light[1], 0.6), 0.4, 1);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(-0.5, -h * 0.9, Math.max(1, r * 0.08), h * 1.4);
          FLAGS[kind](ctx, 0, -h * 0.9, w, h);
          ctx.restore();
        });
      }
    },
    // A tigela inteira: teto, anel superior, camarotes, anel inferior e placas de LED
    bgestBowl(ctx0, g0, o) {
      // Profundidade de campo: a arquibancada é desenhada numa tela menor (com a própria
      // geometria, em pixels inteiros) e ampliada: fica levemente desfocada atrás do personagem
      const dof = o.dof || 1;
      let off = null;
      let ctx = ctx0;
      let g = g0;
      if (dof < 1) {
        const w2 = Math.max(1, Math.round(g0.W * dof));
        const h2 = Math.max(1, Math.round(g0.H * dof));
        g = this.bgestBowlGeo(w2, h2, { hy: (g0.hy * h2) / g0.H, k: g0.k, tiers: g0.T });
        off = document.createElement('canvas');
        off.width = w2;
        off.height = h2;
        ctx = off.getContext('2d');
      }
      const { W, H, T, Y, cx } = g;
      const rng = this.bgestRng(o.seed || 7);
      const tint = o.tint || '#1e3a8a';
      const tk = o.tk == null ? 0.15 : o.tk;
      // --- teto: parte de baixo com treliças (fica escura, com reflexo das luzes)
      const under = o.under || ['#0b1220', '#182235'];
      this.bgestShadeBand(ctx, g, T.f2, T.ut, [[0, under[0]], [1, under[1]]]);
      ctx.save();
      g.band(ctx, T.f2, T.ut);
      ctx.clip();
      ctx.strokeStyle = o.truss || 'rgba(148,163,184,0.2)';
      g.steps(W * 0.045).forEach((x) => {
        const x2 = cx + (x - cx) * 0.92;
        ctx.lineWidth = Math.max(0.8, g.s(x) * 0.9);
        ctx.beginPath();
        ctx.moveTo(x, Y(x, T.f2));
        ctx.lineTo(x2, Y(x2, T.ut));
        ctx.stroke();
      });
      [0.25, 0.5, 0.75].forEach((k) => {
        ctx.lineWidth = 1;
        ctx.beginPath();
        g.curve(ctx, lerp(T.f2, T.ut, k));
        ctx.stroke();
      });
      ctx.restore();
      // corredor escuro no alto do anel
      ctx.fillStyle = '#04060c';
      g.band(ctx, T.ut + 0.012, T.ut);
      ctx.fill();
      // --- fachada do teto (cada mapa tem seu estilo)
      this.bgestFascia(ctx, g, o.fascia || 'steel', rng, o);
      // --- corredores de escada (alinhados nos dois anéis)
      const aisles = g.steps(W * (o.aisleStep || 0.11));
      const blocked = [];
      const base = { seats: o.seats, crowd: o.crowd, tint, tk, rng, aisles, aisleCol: o.aisle || '#475569', flags: o.flags, flagK: o.flagK || 0 };
      this.bgestTier(ctx, g, T.ut, T.mid, Object.assign({}, base, o.upper));
      // sombra do teto no anel superior
      this.bgestShadeBand(ctx, g, T.ut, T.mid, [[0, `rgba(2,4,10,${o.roofShadow == null ? 0.65 : o.roofShadow})`], [0.55, 'rgba(2,4,10,0.18)'], [1, 'rgba(2,4,10,0)']]);
      // --- camarotes com vidro aceso e a fita de LED com o nome do estádio
      ctx.fillStyle = '#070b14';
      g.band(ctx, T.mid, T.bandB);
      ctx.fill();
      const rib = lerp(T.mid, T.bandB, 0.56);
      const wins = g.steps(W * 0.03, 0.5);
      for (let i = 0; i < wins.length - 1; i++) {
        const x0 = wins[i];
        const x1 = wins[i + 1];
        const gap = (x1 - x0) * 0.1;
        const on = rng() < 0.75;
        ctx.fillStyle = on ? `rgba(254,236,190,${(0.3 + rng() * 0.45).toFixed(2)})` : 'rgba(71,110,170,0.22)';
        g.quad(ctx, x0 + gap, x1 - gap, lerp(T.mid, rib, 0.18), lerp(T.mid, rib, 0.86), 2);
        ctx.fill();
      }
      ctx.fillStyle = o.signBg;
      g.band(ctx, rib, T.bandB);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      g.curve(ctx, rib);
      ctx.stroke();
      this.bgestCurveText(ctx, g, o.sign, rib, T.bandB, o.signInk || '#ffffff', { gap: 3 });
      // --- anel inferior
      this.bgestTier(ctx, g, T.bandB, T.boardT + 0.008, Object.assign({}, base, { blocked }, o.lower));
      this.bgestShadeBand(ctx, g, T.bandB, T.boardT, [[0, 'rgba(2,4,10,0.45)'], [0.4, 'rgba(2,4,10,0.05)'], [1, 'rgba(2,4,10,0)']]);
      // ar/névoa sobre a torcida: tira o ruído e empurra o fundo para longe
      if (o.haze) {
        const [hc, ha] = o.haze;
        this.bgestShadeBand(ctx, g, T.ut, T.boardT, [[0, this.bgestA(hc, ha)], [0.5, this.bgestA(hc, ha * 0.75)], [1, this.bgestA(hc, ha * 0.35)]]);
        this.bgestGlowE(ctx, cx, Y(cx, T.mid), W * 0.42, H * 0.16, hc, ha * 0.9, 'source-over');
      }
      // poças de luz dos refletores na arquibancada
      if (o.pools !== false) {
        g.steps(W * 0.22, 0.25).forEach((x, i) => {
          const sc = g.s(x);
          this.bgestGlowE(ctx, x, Y(x, lerp(T.ut, T.mid, 0.55)), W * 0.09 * sc, H * 0.07 * sc, o.poolCol || '#dbeafe', (o.poolA || 0.09) * (i % 2 ? 1 : 0.6));
        });
      }
      // mureta + placas de LED
      ctx.fillStyle = '#0b111c';
      g.band(ctx, T.boardT + 0.008, T.boardT);
      ctx.fill();
      this.bgestBoards(ctx, g, o, rng);
      if (off) {
        ctx0.save();
        ctx0.imageSmoothingEnabled = true;
        ctx0.imageSmoothingQuality = 'low';
        ctx0.drawImage(off, 0, 0, g0.W, g0.H);
        ctx0.restore();
      }
      return { aisles };
    },
    // Nuvens em faixa (estratos), iluminadas por baixo ou por cima
    bgestStratus(ctx, x, y, w, h, rng, body, lit, dark, ly = 1) {
      const blobs = [];
      const n = 6 + Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) {
        const k = n > 1 ? i / (n - 1) : 0.5;
        const env = Math.sin(k * Math.PI) * 0.7 + 0.3;
        blobs.push([x + (k - 0.5) * w * 0.9 + (rng() - 0.5) * w * 0.05, y + (rng() - 0.5) * h * 0.5, w * (0.1 + rng() * 0.1), h * env * (0.45 + rng() * 0.4)]);
      }
      const shape = (dy) => {
        ctx.beginPath();
        blobs.forEach(([bx, by, rx, ry]) => {
          ctx.moveTo(bx + rx, by + dy);
          ctx.ellipse(bx, by + dy, rx, ry, 0, 0, Math.PI * 2);
        });
      };
      // borda iluminada do lado da luz (ly = 1: luz vem de baixo), miolo e lado escuro
      ctx.save();
      shape(0);
      ctx.fillStyle = lit;
      ctx.fill();
      shape(0);
      ctx.clip();
      shape(-ly * h * 0.2);
      ctx.fillStyle = body;
      ctx.fill();
      shape(-ly * h * 0.55);
      ctx.fillStyle = dark;
      ctx.fill();
      ctx.restore();
    },
    bgestFascia(ctx, g, style, rng, o) {
      const { W, T, Y } = g;
      if (style === 'wood') {
        // Estádio Nacional: beirais de madeira em camadas com plantas no alto
        this.bgestShadeBand(ctx, g, T.f1, T.f2, [[0, '#6b4528'], [0.5, '#4a2e19'], [1, '#2a190d']]);
        ctx.save();
        g.band(ctx, T.f1, T.f2);
        ctx.clip();
        const light = new Path2D();
        const dark = new Path2D();
        g.steps(W * 0.0042).forEach((x, i) => {
          (i % 2 ? dark : light).rect(Math.round(x), Y(x, T.f1) - 2, Math.max(1, g.s(x) * 0.8), Y(x, T.f2) - Y(x, T.f1) + 4);
        });
        ctx.fillStyle = 'rgba(232,186,130,0.28)';
        ctx.fill(light);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill(dark);
        ctx.restore();
        [0.34, 0.68].forEach((k) => {
          ctx.fillStyle = 'rgba(12,7,3,0.75)';
          g.band(ctx, lerp(T.f1, T.f2, k), lerp(T.f1, T.f2, k) - 0.004);
          ctx.fill();
          ctx.fillStyle = 'rgba(253,200,140,0.25)';
          g.band(ctx, lerp(T.f1, T.f2, k) - 0.004, lerp(T.f1, T.f2, k) - 0.0055);
          ctx.fill();
        });
        // plantas no topo do beiral
        const leaf = new Path2D();
        g.steps(W * 0.006).forEach((x) => {
          const sc = g.s(x);
          const y = Y(x, T.f1);
          const r = sc * (1.2 + rng() * 2.2);
          leaf.rect(Math.round(x), Math.round(y - r), Math.max(1, Math.round(r * 1.4)), Math.max(1, Math.round(r * 1.2)));
        });
        ctx.fillStyle = '#1f3d2a';
        ctx.fill(leaf);
      } else if (style === 'white') {
        this.bgestShadeBand(ctx, g, T.f1, T.f2, [[0, '#f8fafc'], [0.55, '#e2e8f0'], [1, '#94a3b8']]);
        ctx.save();
        g.band(ctx, T.f1, T.f2);
        ctx.clip();
        ctx.strokeStyle = 'rgba(71,85,105,0.55)';
        const xsT = g.steps(W * 0.028);
        ctx.beginPath();
        xsT.forEach((x, i) => {
          const a = i % 2 ? T.f1 : T.f2;
          if (i) ctx.lineTo(x, Y(x, a));
          else ctx.moveTo(x, Y(x, a));
        });
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = 'rgba(71,85,105,0.6)';
        ctx.lineWidth = 1.2;
        [T.f1, T.f2].forEach((a) => {
          ctx.beginPath();
          g.curve(ctx, a);
          ctx.stroke();
        });
      } else if (style === 'gothic') {
        // "Catedral": arcada de arcos ogivais com vitrais acesos por dentro
        this.bgestShadeBand(ctx, g, T.f1, T.f2, [[0, '#1b2234'], [1, '#0a0f1c']]);
        const xsA = g.steps(W * 0.052);
        for (let i = 0; i < xsA.length - 1; i++) {
          const x0 = xsA[i];
          const x1 = xsA[i + 1];
          const pad = (x1 - x0) * 0.14;
          const xa = x0 + pad;
          const xb = x1 - pad;
          const xm = (xa + xb) / 2;
          const top = Y(xm, T.f1) + (Y(xm, T.f2) - Y(xm, T.f1)) * 0.1;
          const spring = Y(xm, T.f1) + (Y(xm, T.f2) - Y(xm, T.f1)) * 0.45;
          const bot = Y(xm, T.f2) - 1;
          ctx.beginPath();
          ctx.moveTo(xa, bot);
          ctx.lineTo(xa, spring);
          ctx.quadraticCurveTo(xa, top + (spring - top) * 0.25, xm, top);
          ctx.quadraticCurveTo(xb, top + (spring - top) * 0.25, xb, spring);
          ctx.lineTo(xb, bot);
          ctx.closePath();
          const gr = ctx.createLinearGradient(0, top, 0, bot);
          const hue = i % 3;
          gr.addColorStop(0, hue === 0 ? '#5eead4' : hue === 1 ? '#fde68a' : '#93c5fd');
          gr.addColorStop(0.5, hue === 0 ? '#0e7490' : hue === 1 ? '#b45309' : '#1d4ed8');
          gr.addColorStop(1, '#0b1020');
          ctx.fillStyle = gr;
          ctx.globalAlpha = 0.9;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#05070d';
          ctx.lineWidth = Math.max(1, g.s(xm) * 1.2);
          ctx.stroke();
          // mainel e rosácea
          ctx.beginPath();
          ctx.moveTo(xm, top + (bot - top) * 0.25);
          ctx.lineTo(xm, bot);
          ctx.moveTo(xa, lerp(spring, bot, 0.5));
          ctx.lineTo(xb, lerp(spring, bot, 0.5));
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0,245,212,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        g.curve(ctx, T.f2 + 0.001);
        ctx.stroke();
      } else if (style === 'dome') {
        this.bgestShadeBand(ctx, g, T.f1, T.f2, [[0, '#3f3f46'], [0.5, '#27272a'], [1, '#111113']]);
        ctx.fillStyle = '#eab308';
        g.band(ctx, lerp(T.f1, T.f2, 0.55), lerp(T.f1, T.f2, 0.68));
        ctx.fill();
        this.bgestCurveText(ctx, g, 'BLTV • NEO EGOIST LEAGUE', lerp(T.f1, T.f2, 0.1), lerp(T.f1, T.f2, 0.5), 'rgba(250,250,250,0.6)', { gap: 4, size: 0.62 });
      } else {
        this.bgestShadeBand(ctx, g, T.f1, T.f2, [[0, '#334155'], [0.5, '#1e293b'], [1, '#0b1220']]);
      }
      ctx.strokeStyle = 'rgba(226,232,240,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      g.curve(ctx, T.f2);
      ctx.stroke();
    },
    bgestBoards(ctx, g, o, rng) {
      const { W, H, T, Y } = g;
      const sp = o.sponsors || ['BLUE LOCK'];
      let x = -W * 0.06;
      let i = Math.floor(rng() * sp.length);
      const am = (T.boardT + T.boardB) / 2;
      while (x < W * 1.05) {
        const segW = W * 0.13 * g.s(x + W * 0.06);
        const x1 = x + segW;
        g.quad(ctx, x, x1, T.boardT, T.boardB, 4);
        const top = Y(x, T.boardT);
        const bot = Y(x, T.boardB);
        const gr = ctx.createLinearGradient(0, top, 0, bot);
        const alt = i % 2 ? 0.08 : -0.06;
        gr.addColorStop(0, this.bgestMix(o.boardBg, '#ffffff', 0.18 + Math.max(0, alt)));
        gr.addColorStop(1, this.bgestMix(o.boardBg, '#000000', 0.25 - Math.min(0, alt)));
        ctx.fillStyle = gr;
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x1 - 1, Y(x1, T.boardT), Math.max(1, g.s(x1)), Y(x1, T.boardB) - Y(x1, T.boardT));
        const xm = (x + x1) / 2;
        const hgt = Y(xm, T.boardB) - Y(xm, T.boardT);
        ctx.save();
        ctx.translate(xm, Y(xm, am));
        ctx.rotate(Math.atan2(Y(x1, am) - Y(x, am), segW));
        ctx.font = `italic 900 ${Math.max(6, hgt * 0.5).toFixed(1)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = o.boardInk || '#ffffff';
        ctx.fillText(sp[i % sp.length], 0, hgt * 0.03, segW * 0.86);
        ctx.restore();
        x = x1;
        i++;
      }
      // brilho do LED no gramado logo abaixo
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.bgestShadeBand(ctx, g, T.boardB, T.boardB - 0.03, [[0, this.bgestA(o.boardBg, 0.3)], [1, this.bgestA(o.boardBg, 0)]]);
      this.bgestShadeBand(ctx, g, T.boardT + 0.02, T.boardT, [[0, this.bgestA(o.boardBg, 0)], [1, this.bgestA(o.boardBg, 0.22)]]);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      g.band(ctx, T.boardT, T.boardT - 0.0018);
      ctx.fill();
    },
    // Refletores na beira do teto + fachos de luz descendo no gramado
    bgestBowlLights(ctx, g, o = {}) {
      const { W, H, T, Y, cx, hy } = g;
      const col = o.lamp || '226,240,255';
      const xsL = g.steps(W * (o.step || 0.075));
      xsL.forEach((x, i) => {
        const sc = g.s(x);
        const y = Y(x, T.f2) + sc * 1.5;
        if (y < -20 || y > g.H) return;
        const bw = W * 0.016 * sc;
        const bh = Math.max(2, H * 0.006 * sc);
        ctx.fillStyle = '#05070d';
        ctx.fillRect(x - bw / 2 - 1, y - 1, bw + 2, bh + 2);
        ctx.fillStyle = `rgba(${col},1)`;
        for (let k = 0; k < 4; k++) ctx.fillRect(x - bw / 2 + (k * bw) / 4 + 0.5, y, bw / 4 - 1, bh);
        this.cineGlow(ctx, x, y + bh / 2, W * 0.022 * sc, `rgba(${col},0.9)`, 0.9);
        if (i % 3 === 1) {
          this.cineGlow(ctx, x, y + bh / 2, W * 0.07 * sc, `rgba(${col},0.35)`, 0.8);
          const ang = Math.atan2(hy + H * 0.12 - y, cx + (x - cx) * 0.35 - x);
          this.cineShafts(ctx, x, y, ang, H * 0.95, 0.22, 3, col, o.shaft == null ? 0.035 : o.shaft, 0);
        }
      });
    },
    // Telão / placa pendurada, com moldura e pontinhos de LED
    bgestLed(g, w, h) {
      g.fillStyle = 'rgba(0,0,0,0.28)';
      for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
      for (let x = 0; x < w; x += 3) g.fillRect(x, 0, 1, h);
    },
    bgestBowlScreen(ctx, g, img, x0, x1, a0, a1, glow) {
      const pad = 0.006;
      ctx.fillStyle = '#020409';
      g.quad(ctx, x0 - g.W * 0.006, x1 + g.W * 0.006, a0 + pad, a1 - pad, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      this.bgestCurveImage(ctx, g, img, x0, x1, a0, a1);
      if (glow) {
        const xm = (x0 + x1) / 2;
        this.bgestGlowE(ctx, xm, g.Y(xm, (a0 + a1) / 2), (x1 - x0) * 0.8, (g.Y(xm, a1) - g.Y(xm, a0)) * 1.2, glow, 0.18);
      }
    },
    // Faíscas de flashes de celular/câmera na torcida
    bgestFlashes(ctx, g, a1, a2, n, rng, col = '255,255,255') {
      for (let i = 0; i < n; i++) {
        const x = rng() * g.W;
        const y = g.Y(x, lerp(a1, a2, rng()));
        ctx.fillStyle = `rgba(${col},0.95)`;
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
        this.cineGlow(ctx, x + 1, y + 1, 4 + rng() * 7 * g.s(x), `rgba(${col},0.8)`, 0.7);
      }
    },
    // Nuvens de anime: corpo + borda iluminada, lado da luz definido por (lx, ly)
    bgestCloud(ctx, x, y, w, h, rng, body, lit, shadow, lx = 0, ly = -1) {
      const blobs = [];
      const n = 12 + Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) {
        const k = rng();
        const env = Math.sin(k * Math.PI);
        const bx = x + (k - 0.5) * w * 0.92;
        const r = h * (0.22 + env * 0.5 * (0.5 + rng()));
        blobs.push([bx, y + h * 0.5 - r * 0.55 - env * h * 0.45 * rng(), r]);
      }
      const shape = (dx, dy, sc) => {
        ctx.beginPath();
        blobs.forEach(([bx, by, r]) => {
          ctx.moveTo(bx + dx + r * sc, by + dy);
          ctx.arc(bx + dx, by + dy, r * sc, 0, Math.PI * 2);
        });
        ctx.moveTo(x - w * 0.42, y + h * 0.5);
        ctx.ellipse(x, y + h * 0.42, w * 0.46, h * 0.12, 0, Math.PI, Math.PI * 2);
        ctx.closePath();
      };
      ctx.save();
      shape(0, 0, 1);
      ctx.fillStyle = shadow;
      ctx.fill();
      ctx.save();
      shape(0, 0, 1);
      ctx.clip();
      shape(lx * h * 0.12, ly * h * 0.12, 0.96);
      ctx.fillStyle = body;
      ctx.fill();
      shape(lx * h * 0.3, ly * h * 0.3, 0.9);
      ctx.fillStyle = lit;
      ctx.fill();
      ctx.restore();
      ctx.restore();
    },

    // ------------------------------------------------------------ interiores 3D
    bgestRoom(W, H, o) {
      const cx = W / 2;
      const vy = H * o.vy;
      const F = Math.max(W * 0.55, H * 1.1);
      const eye = o.eye;
      const P = (X, Y, Z) => [cx + (F * X) / Z, vy - (F * (Y - eye)) / Z];
      const path = (ctx, pts) => {
        ctx.beginPath();
        pts.forEach((p, i) => {
          const q = P(p[0], p[1], p[2]);
          if (i) ctx.lineTo(q[0], q[1]);
          else ctx.moveTo(q[0], q[1]);
        });
        ctx.closePath();
      };
      const poly = (ctx, pts, fill) => {
        path(ctx, pts);
        ctx.fillStyle = fill;
        ctx.fill();
      };
      return { W, H, cx, vy, F, eye, P, path, poly };
    },
    // Imagem colada num plano vertical do mundo, de (X0,Z0) a (X1,Z1), altura Y0..Y1
    bgestPlaneImage(ctx, R, img, X0, Z0, X1, Z1, Y0, Y1, n = 60, s0 = 0, s1 = 1) {
      const sw = (img.width * (s1 - s0)) / n;
      for (let i = 0; i < n; i++) {
        const ka = i / n;
        const kb = (i + 1) / n;
        const Xa = lerp(X0, X1, ka);
        const Za = lerp(Z0, Z1, ka);
        const Xb = lerp(X0, X1, kb);
        const Zb = lerp(Z0, Z1, kb);
        const at = R.P(Xa, Y1, Za);
        const ab = R.P(Xa, Y0, Za);
        const bt = R.P(Xb, Y1, Zb);
        const bb = R.P(Xb, Y0, Zb);
        const xl = Math.min(at[0], bt[0]);
        const w = Math.abs(bt[0] - at[0]) + 0.8;
        const top = (at[1] + bt[1]) / 2;
        const bot = (ab[1] + bb[1]) / 2;
        ctx.drawImage(img, img.width * s0 + sw * i, 0, sw, img.height, xl, top, w, bot - top);
      }
    },
    // Faixa de largura física w (m) entre dois pontos do mundo
    bgestStrip3(ctx, R, a, b, w, fill, axis = 'y') {
      const d = w / 2;
      const off = axis === 'y' ? [0, d, 0] : axis === 'x' ? [d, 0, 0] : [0, 0, d];
      R.poly(ctx, [
        [a[0] - off[0], a[1] - off[1], a[2] - off[2]],
        [b[0] - off[0], b[1] - off[1], b[2] - off[2]],
        [b[0] + off[0], b[1] + off[1], b[2] + off[2]],
        [a[0] + off[0], a[1] + off[1], a[2] + off[2]]
      ], fill);
    },
    // Silhueta de jogador treinando lá no fundo (com luz de recorte)
    bgestFigure(ctx, x, feet, h, body, rim, pose = 0) {
      const u = h / 10;
      ctx.save();
      const draw = (dx, col) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x + dx, feet - u * 8.9, u * 0.95, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + dx - u * 1.3, feet - u * 7.8, u * 2.6, u * 3.6);
        if (pose === 1) {
          // correndo
          ctx.beginPath();
          ctx.moveTo(x + dx - u * 0.8, feet - u * 4.3);
          ctx.lineTo(x + dx - u * 2.6, feet - u * 1.6);
          ctx.lineTo(x + dx - u * 1.9, feet);
          ctx.lineTo(x + dx - u * 1.2, feet - u * 1.7);
          ctx.lineTo(x + dx + u * 0.2, feet - u * 3.9);
          ctx.lineTo(x + dx + u * 2.4, feet - u * 2.3);
          ctx.lineTo(x + dx + u * 2.9, feet - u * 0.4);
          ctx.lineTo(x + dx + u * 1.6, feet - u * 1.9);
          ctx.lineTo(x + dx + u * 0.9, feet - u * 4.3);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(x + dx - u * 2.6, feet - u * 7.4, u * 1.1, u * 3);
          ctx.fillRect(x + dx + u * 1.5, feet - u * 7.6, u * 1.1, u * 2.4);
        } else {
          ctx.fillRect(x + dx - u * 1.2, feet - u * 4.3, u * 1, u * 4.3);
          ctx.fillRect(x + dx + u * 0.2, feet - u * 4.3, u * 1, u * 4.3);
          ctx.fillRect(x + dx - u * 2, feet - u * 7.6, u * 0.8, u * 3.6);
          ctx.fillRect(x + dx + u * 1.2, feet - u * 7.6, u * 0.8, u * 3.6);
        }
      };
      draw(Math.max(1, u * 0.35), rim);
      draw(0, body);
      ctx.restore();
    }
  });

  // =====================================================================
  // ESTÁDIO NACIONAL (noite) — Blue Lock x Sub-20
  // =====================================================================
  VN.u20_national = function (ctx, W, H) {
    const c = mapColors('u20_national');
    const rng = this.bgestRng(2020);
    const hy = Math.round(H * 0.6);
    const g = this.bgestBowlGeo(W, H, { hy, k: 1.0, tiers: TIERS(0.38) });
    // céu de Tóquio
    this.cineGradient(ctx, 0, 0, W, hy + 2, [[0, '#01030a'], [0.4, '#061029'], [0.78, '#13234c'], [1, '#2a3a6a']]);
    this.bgestStars(ctx, W, hy * 0.5, rng, 160, 0.8);
    this.bgestGlowE(ctx, W * 0.5, g.Y(W / 2, 0.38), W * 0.75, H * 0.2, '#6366f1', 0.22);
    this.bgestGlowE(ctx, W * 0.5, g.Y(W / 2, 0.38), W * 0.4, H * 0.1, '#fbbf24', 0.08);
    for (let i = 0; i < 5; i++) this.bgestStratus(ctx, W * (0.08 + i * 0.21 + rng() * 0.06), H * (0.1 + rng() * 0.1), W * (0.2 + rng() * 0.12), H * 0.03, rng, 'rgba(30,44,86,0.75)', 'rgba(110,130,200,0.6)', 'rgba(12,18,40,0.7)', 1);
    this.bgestPitch(ctx, W, H, hy, {
      far: '#3d9c5a', mid: '#1f7a3c', near: '#062610', stripe: 'rgba(0,0,0,0.14)', band: 'rgba(255,255,255,0.03)', line: 'rgba(236,253,245,0.55)',
      pools: [[0.22, 0.66, 0.22, 0.06, '#dbeafe', 0.08], [0.78, 0.66, 0.22, 0.06, '#dbeafe', 0.08]]
    });
    this.bgestBowl(ctx, g, {
      seed: 31, fascia: 'wood', under: ['#0e1626', '#1b2436'], dof: 0.72,
      seats: ['#e2e8f0', '#2f5d3a', '#6b8f4e', '#8b6b43', '#1f3d2c'],
      crowd: crowdOf('u20_national', ['#dc2626', '#f8fafc', '#1d4ed8']),
      upper: { n: 12, density: 0.82, light: [0.32, 0.62] },
      lower: { n: 11, density: 0.9, light: [0.55, 0.85] },
      tint: '#1e3a8a', tk: 0.32, flags: ['jp', 'jp', 'bl', 'red'], flagK: 0.01,
      haze: ['#1c2c58', 0.32], poolCol: '#dbeafe', poolA: 0.12,
      sign: c.signText, signBg: c.signBg, boardBg: c.boardBg, sponsors: c.sponsors, aisle: '#4b5563'
    });
    const T = g.T;
    // telão do placar
    const scr = this.bgestCanvas(520, 200, (s, w, h) => {
      const bg = s.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#071230');
      bg.addColorStop(1, '#020617');
      s.fillStyle = bg;
      s.fillRect(0, 0, w, h);
      s.fillStyle = '#b91c1c';
      s.fillRect(0, 0, w, 38);
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillStyle = '#fff';
      s.font = `italic 900 22px ${FONT}`;
      s.fillText('JAPAN NATIONAL STADIUM', w / 2, 20);
      s.font = `italic 900 30px ${FONT}`;
      s.fillStyle = '#60a5fa';
      s.fillText('BLUE LOCK 11', w * 0.22, 100);
      s.fillStyle = '#f87171';
      s.fillText('U-20 JAPAN', w * 0.78, 100);
      s.fillStyle = '#fff';
      s.font = `900 74px ${FONT}`;
      s.fillText('0 - 0', w / 2, 104);
      s.fillStyle = '#facc15';
      s.font = `900 22px ${FONT}`;
      s.fillText('KICK-OFF • 19:30', w / 2, 168);
      this.bgestLed(s, w, h);
    });
    const sx0 = W * 0.715;
    const sx1 = W * 0.905;
    this.bgestBowlScreen(ctx, g, scr, sx0, sx1, T.ut - 0.004, lerp(T.ut, T.mid, 0.6), '#60a5fa');
    // bandeirão da torcida
    const ban = this.bgestCanvas(600, 110, (s, w, h) => {
      s.fillStyle = '#1d4ed8';
      s.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        s.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)';
        s.fillRect((i * w) / 9, 0, w / 9, h);
      }
      s.fillStyle = '#f8fafc';
      s.font = `italic 900 74px ${FONT}`;
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillText('BLUE LOCK', w / 2, h / 2 + 4);
    });
    this.bgestCurveImage(ctx, g, ban, W * 0.04, W * 0.24, lerp(T.bandB, T.boardT, 0.08), lerp(T.bandB, T.boardT, 0.42));
    const ban2 = this.bgestCanvas(600, 110, (s, w, h) => {
      s.fillStyle = '#f8fafc';
      s.fillRect(0, 0, w, h);
      s.fillStyle = '#dc2626';
      s.beginPath();
      s.arc(w * 0.13, h / 2, h * 0.32, 0, Math.PI * 2);
      s.fill();
      s.font = `italic 900 64px ${FONT}`;
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillText('U-20 JAPAN', w * 0.6, h / 2 + 4);
    });
    this.bgestCurveImage(ctx, g, ban2, W * 0.76, W * 0.95, lerp(T.bandB, T.boardT, 0.1), lerp(T.bandB, T.boardT, 0.44));
    this.bgestFlashes(ctx, g, T.ut, T.boardT, 26, rng);
    this.bgestBowlLights(ctx, g, { lamp: '226,240,255', step: 0.07 });
    this.bgestGlowE(ctx, W / 2, g.Y(W / 2, T.ut), W * 0.5, H * 0.14, '#93c5fd', 0.07);
    this.bgestFinish(ctx, W, H, { plate: c.signText, accent: '#ef4444', vig: 0.55, shade: 0.32 });
  };

  // =====================================================================
  // NEO EGOIST LEAGUE — arena coberta da BLTV com o leilão em ¥
  // =====================================================================
  VN.nel_dome = function (ctx, W, H) {
    const c = mapColors('nel_dome');
    const rng = this.bgestRng(4242);
    const hy = Math.round(H * 0.6);
    const g = this.bgestBowlGeo(W, H, { hy, k: 1.0, tiers: TIERS(0.375) });
    const { T, Y } = g;
    const cx = W / 2;
    // interior da cúpula
    this.cineGradient(ctx, 0, 0, W, hy, [[0, '#030304'], [0.45, '#111114'], [1, '#2a2a31']]);
    const ax = cx;
    const ay = -H * 0.95;
    const at = (x, t) => [lerp(x, ax, t), lerp(Y(x, T.f1), ay, t)];
    ctx.save();
    ctx.beginPath();
    g.curve(ctx, T.f1);
    ctx.lineTo(W * 1.1, -10);
    ctx.lineTo(-W * 0.1, -10);
    ctx.closePath();
    ctx.clip();
    // painéis de vidro escuros, alguns refletindo
    const ribs = g.steps(W * 0.062);
    const rings = [0, 0.1, 0.21, 0.33, 0.46, 0.6, 0.75];
    for (let i = 0; i < ribs.length - 1; i++) {
      for (let j = 0; j < rings.length - 1; j++) {
        const q = rng();
        if (q > 0.35) continue;
        const p1 = at(ribs[i], rings[j]);
        const p2 = at(ribs[i + 1], rings[j]);
        const p3 = at(ribs[i + 1], rings[j + 1]);
        const p4 = at(ribs[i], rings[j + 1]);
        ctx.fillStyle = q < 0.08 ? 'rgba(234,179,8,0.06)' : 'rgba(161,161,170,0.05)';
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.lineTo(p4[0], p4[1]);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(161,161,170,0.26)';
    ribs.forEach((x) => {
      const p = at(x, 0);
      const q = at(x, 0.8);
      ctx.lineWidth = Math.max(1, g.s(x) * 1.4);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    });
    rings.slice(1).forEach((t) => {
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      g.xs.forEach((x, i) => {
        const p = at(x, t);
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      });
      ctx.stroke();
    });
    // anel de holofotes coloridos no alto da cúpula
    const spots = [];
    g.steps(W * 0.15).forEach((x, i) => {
      const p = at(x, 0.21);
      if (p[1] < -10) return;
      const col = i % 3 === 0 ? '239,68,68' : '234,179,8';
      spots.push([p[0], p[1], col]);
      ctx.fillStyle = '#09090b';
      ctx.fillRect(p[0] - 5, p[1] - 3, 10, 6);
      this.cineGlow(ctx, p[0], p[1], 16 * g.s(x), `rgba(${col},0.9)`, 0.9);
    });
    ctx.restore();
    this.bgestGlowE(ctx, cx, Y(cx, T.f1), W * 0.6, H * 0.12, '#eab308', 0.07);
    this.bgestPitch(ctx, W, H, hy, {
      far: '#2f8a4e', mid: '#176236', near: '#05200d', stripe: 'rgba(0,0,0,0.14)', line: 'rgba(240,253,244,0.55)',
      pools: [[0.3, 0.68, 0.18, 0.05, '#fde68a', 0.08], [0.7, 0.68, 0.18, 0.05, '#fca5a5', 0.06]]
    });
    this.bgestBowl(ctx, g, {
      seed: 77, fascia: 'dome', under: ['#141416', '#1f1f24'], truss: 'rgba(161,161,170,0.18)', dof: 0.72,
      seats: ['#3f3f46', '#27272a', '#52525b'],
      crowd: crowdOf('nel_dome', ['#eab308', '#f8fafc', '#dc2626']),
      upper: { n: 12, density: 0.85, light: [0.32, 0.62] },
      lower: { n: 11, density: 0.9, light: [0.55, 0.86] },
      tint: '#3f2a10', tk: 0.28, flags: ['gold', 'red', 'bl'], flagK: 0.01,
      haze: ['#2a2420', 0.3], poolCol: '#fde68a', poolA: 0.1,
      sign: c.signText, signBg: c.signBg, boardBg: c.boardBg, boardInk: '#111111', sponsors: c.sponsors, aisle: '#52525b'
    });
    // fachos coloridos dos holofotes da cúpula
    spots.forEach(([x, y, col], i) => {
      const tx = cx + (i % 2 ? -1 : 1) * W * (0.08 + (i % 3) * 0.06);
      this.cineShafts(ctx, x, y, Math.atan2(hy + H * 0.1 - y, tx - x), H * 1.1, 0.07, 2, col, 0.05, 0);
    });
    // bandeiras dos clubes penduradas
    const CLUBS = [
      ['BASTARD MÜNCHEN', ['#111111', '#b91c1c'], '#eab308'],
      ['MANSHINE CITY', ['#7dd3fc', '#e0f2fe'], '#0c4a6e'],
      ['FC BARCHA', ['#1e3a8a', '#9f1239'], '#facc15'],
      ['UBERS', ['#0f172a', '#2563eb'], '#f8fafc'],
      ['P.X.G', ['#1e1b4b', '#dc2626'], '#f8fafc'],
      ['BLTV', ['#991b1b', '#7f1d1d'], '#f8fafc']
    ];
    [-0.96, -0.5, -0.31, 0.31, 0.5, 0.96].forEach((u, i) => {
      const x = cx + (u * W) / 2;
      const sc = g.s(x);
      const bw = W * 0.026 * sc;
      const top = Math.max(-5, Y(x, T.f1) - H * 0.02);
      const bot = Y(x, lerp(T.ut, T.mid, 0.25));
      const [name, cols, ink] = CLUBS[i];
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x - bw / 2 + 3, top, bw, bot - top + 4);
      ctx.beginPath();
      ctx.moveTo(x - bw / 2, top);
      ctx.lineTo(x + bw / 2, top);
      ctx.lineTo(x + bw / 2, bot);
      ctx.lineTo(x, bot - bw * 0.45);
      ctx.lineTo(x - bw / 2, bot);
      ctx.closePath();
      const gr = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
      gr.addColorStop(0, cols[0]);
      gr.addColorStop(0.5, cols[1]);
      gr.addColorStop(1, cols[0]);
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.clip();
      // dobras do tecido
      for (let k = 0; k < 3; k++) this.bgestGlowE(ctx, x - bw * 0.25, lerp(top, bot, 0.2 + k * 0.3), bw * 0.4, (bot - top) * 0.12, '#000000', 0.18, 'source-over');
      ctx.fillStyle = ink;
      ctx.fillRect(x - bw / 2, top + (bot - top) * 0.06, bw, Math.max(1, bw * 0.06));
      ctx.translate(x, (top + bot) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = `italic 900 ${(bw * 0.5).toFixed(1)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 0, 0, (bot - top) * 0.8);
      ctx.restore();
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(x - bw * 0.6, top - 2, bw * 1.2, Math.max(2, bw * 0.08));
    });
    // telões do leilão (¥)
    const yen = (label, big, rows) => this.bgestCanvas(420, 250, (s, w, h) => {
      s.fillStyle = '#050505';
      s.fillRect(0, 0, w, h);
      s.fillStyle = '#991b1b';
      s.fillRect(0, 0, w, 44);
      s.textAlign = 'left';
      s.textBaseline = 'middle';
      s.fillStyle = '#fff';
      s.font = `italic 900 24px ${FONT}`;
      s.fillText(label, 16, 23);
      s.fillStyle = '#eab308';
      s.font = `italic 900 50px ${FONT}`;
      s.textAlign = 'center';
      s.fillText(big, w / 2, 92);
      rows.forEach((r, i) => {
        const y = 146 + i * 30;
        s.fillStyle = i % 2 ? 'rgba(234,179,8,0.08)' : 'rgba(255,255,255,0.05)';
        s.fillRect(14, y - 13, w - 28, 26);
        s.textAlign = 'left';
        s.fillStyle = '#e5e7eb';
        s.font = `900 18px ${FONT}`;
        s.fillText(r[0], 24, y);
        s.textAlign = 'right';
        s.fillStyle = r[2] ? '#4ade80' : '#f87171';
        s.fillText(`${r[1]} ${r[2] ? '▲' : '▼'}`, w - 24, y);
      });
      this.bgestLed(s, w, h);
    });
    const scr1 = yen('BLTV • WORLD AUCTION', '¥ 300.000.000', [['#1  ???', '¥ 280M', 1], ['#2  ???', '¥ 210M', 1], ['#3  ???', '¥ 180M', 0]]);
    const scr2 = yen('VALOR DE MERCADO', '¥ 30.000.000', [['BASTARD', '¥ 95M', 1], ['P.X.G', '¥ 80M', 0], ['UBERS', '¥ 60M', 1]]);
    const hang = (img, x0, y0, w) => {
      const h = w * (img.height / img.width);
      ctx.strokeStyle = 'rgba(161,161,170,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 + w * 0.15, y0);
      ctx.lineTo(x0 + w * 0.2, -5);
      ctx.moveTo(x0 + w * 0.85, y0);
      ctx.lineTo(x0 + w * 0.8, -5);
      ctx.stroke();
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(x0 - w * 0.03, y0 - w * 0.03, w * 1.06, h + w * 0.06);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x0 - w * 0.03, y0 + h + w * 0.02, w * 1.06, Math.max(2, w * 0.012));
      ctx.drawImage(img, x0, y0, w, h);
      this.bgestGlowE(ctx, x0 + w / 2, y0 + h / 2, w * 0.8, h * 0.9, '#eab308', 0.1);
    };
    hang(scr1, W * 0.735, H * 0.135, W * 0.19);
    hang(scr2, W * 0.05, H * 0.26, W * 0.15);
    this.bgestFlashes(ctx, g, T.ut, T.boardT, 24, rng, '254,240,138');
    this.bgestBowlLights(ctx, g, { lamp: '254,243,199', step: 0.08, shaft: 0.025 });
    this.bgestFinish(ctx, W, H, { plate: c.signText, accent: '#eab308', vig: 0.6, shade: 0.32 });
  };

  // =====================================================================
  // COPA SUB-20 — Japão x Inglaterra (tarde clara, arco branco)
  // =====================================================================
  VN.worldcup_england = function (ctx, W, H) {
    const c = mapColors('worldcup_england');
    const rng = this.bgestRng(1966);
    const hy = Math.round(H * 0.6);
    const g = this.bgestBowlGeo(W, H, { hy, k: 0.8, tiers: TIERS(0.37, 0.88) });
    const { T, Y } = g;
    const cx = W / 2;
    this.cineGradient(ctx, 0, 0, W, hy + 2, [[0, '#0b4f7d'], [0.45, '#1a87c9'], [0.8, '#7cc4ec'], [1, '#d6ecf7']]);
    // sol no alto à direita, com raios
    const sunX = W * 0.97;
    const sunY = -H * 0.04;
    this.bgestGlowE(ctx, sunX, sunY, W * 0.45, H * 0.5, '#fff7d6', 0.55);
    this.cineShafts(ctx, sunX, sunY, Math.PI * 0.72, H * 1.2, 0.7, 6, '255,250,230', 0.07, 0);
    // nuvens grandes
    [[0.13, 0.12, 0.3, 0.09], [0.48, 0.06, 0.26, 0.06], [0.78, 0.2, 0.34, 0.1], [0.32, 0.26, 0.22, 0.05], [0.95, 0.33, 0.2, 0.05]].forEach(([fx, fy, fw, fh]) => {
      this.bgestCloud(ctx, W * fx, H * fy, W * fw, H * fh, rng, '#e6f1fa', '#ffffff', '#9fbad3', 0.5, -1);
    });
    // arco branco gigante atrás do estádio
    const A0 = [-W * 0.1, H * 0.46];
    const AC = [W * 0.56, -H * 0.3];
    const A2 = [W * 1.1, H * 0.4];
    const bez = (t, off) => {
      const x = (1 - t) * (1 - t) * A0[0] + 2 * (1 - t) * t * AC[0] + t * t * A2[0];
      const y = (1 - t) * (1 - t) * A0[1] + 2 * (1 - t) * t * AC[1] + t * t * A2[1];
      return [x, y + off];
    };
    const th = H * 0.016;
    // cabos do arco até o teto
    ctx.strokeStyle = 'rgba(241,245,249,0.5)';
    ctx.lineWidth = 1;
    for (let t = 0.12; t < 0.9; t += 0.045) {
      const p = bez(t, th);
      const x2 = p[0] + (p[0] - cx) * 0.15;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(x2, Y(x2, T.f1) + 2);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.strokeStyle = '#f8fafc';
    [0, th].forEach((off) => {
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const p = bez(i / 80, off);
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
    });
    ctx.lineWidth = Math.max(1, H * 0.0022);
    ctx.strokeStyle = 'rgba(226,232,240,0.9)';
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const p = bez(i / 120, i % 2 ? th : 0);
      if (i) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
    // névoa do horizonte
    this.bgestGlowE(ctx, cx, Y(cx, T.f1), W * 0.8, H * 0.12, '#ffffff', 0.25);
    this.bgestPitch(ctx, W, H, hy, {
      far: '#73c35f', mid: '#3e9b3c', near: '#11461a', stripe: 'rgba(0,40,0,0.13)', band: 'rgba(255,255,255,0.04)', line: 'rgba(255,255,255,0.7)'
    });
    // sombra do teto cobrindo o fundo do gramado
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-5, hy);
    ctx.lineTo(W + 5, hy);
    ctx.lineTo(W + 5, hy + H * 0.028);
    ctx.bezierCurveTo(W * 0.7, hy + H * 0.05, W * 0.3, hy + H * 0.07, -5, hy + H * 0.1);
    ctx.closePath();
    ctx.fillStyle = 'rgba(12,40,70,0.38)';
    ctx.fill();
    ctx.restore();
    this.bgestBowl(ctx, g, {
      seed: 55, fascia: 'white', under: ['#64748b', '#334155'], truss: 'rgba(226,232,240,0.35)', roofShadow: 0.55, dof: 0.72,
      seats: ['#b91c1c', '#991b1b', '#e2e8f0'],
      crowd: crowdOf('worldcup_england', ['#f8fafc', '#dc2626', '#1d4ed8']),
      upper: { n: 12, density: 0.86, light: [0.45, 0.7] },
      lower: { n: 11, density: 0.9, light: [0.8, 1.0] },
      tint: '#475569', tk: 0.22, flags: ['en', 'en', 'jp', 'jp'], flagK: 0.014,
      haze: ['#a8c4dc', 0.26], poolCol: '#fff7d6', poolA: 0.05,
      sign: c.signText, signBg: c.signBg, boardBg: c.boardBg, sponsors: c.sponsors, aisle: '#94a3b8'
    });
    // telão
    const scr = this.bgestCanvas(520, 200, (s, w, h) => {
      s.fillStyle = '#0b1736';
      s.fillRect(0, 0, w, h);
      s.fillStyle = '#1e3a8a';
      s.fillRect(0, 0, w, 40);
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillStyle = '#fff';
      s.font = `italic 900 22px ${FONT}`;
      s.fillText('FIFA U-20 WORLD CUP', w / 2, 21);
      FLAGS.jp(s, 30, 70, 80, 54);
      FLAGS.en(s, w - 110, 70, 80, 54);
      s.font = `900 70px ${FONT}`;
      s.fillText('0 - 0', w / 2, 100);
      s.font = `italic 900 24px ${FONT}`;
      s.fillText('JAPAN', 70, 150);
      s.fillText('ENGLAND', w - 70, 150);
      s.fillStyle = '#facc15';
      s.fillText("00'", w / 2, 165);
      this.bgestLed(s, w, h);
    });
    this.bgestBowlScreen(ctx, g, scr, W * 0.72, W * 0.905, T.ut - 0.004, lerp(T.ut, T.mid, 0.6));
    // bandeirões
    const tifo = (txt, bgc, ink, flag) => this.bgestCanvas(620, 110, (s, w, h) => {
      s.fillStyle = bgc;
      s.fillRect(0, 0, w, h);
      if (flag) flag(s, 14, 14, 120, 82);
      s.fillStyle = ink;
      s.font = `italic 900 64px ${FONT}`;
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillText(txt, flag ? w * 0.6 : w / 2, h / 2 + 4);
    });
    this.bgestCurveImage(ctx, g, tifo('THREE LIONS', '#b91c1c', '#ffffff', FLAGS.en), W * 0.03, W * 0.23, lerp(T.bandB, T.boardT, 0.08), lerp(T.bandB, T.boardT, 0.42));
    this.bgestCurveImage(ctx, g, tifo('SAMURAI BLUE', '#1d4ed8', '#ffffff', FLAGS.jp), W * 0.77, W * 0.96, lerp(T.bandB, T.boardT, 0.1), lerp(T.bandB, T.boardT, 0.44));
    // luz do sol batendo no anel de baixo à direita
    this.bgestGlowE(ctx, W * 0.85, Y(W * 0.85, T.mid), W * 0.3, H * 0.2, '#fff7d6', 0.12);
    this.bgestFinish(ctx, W, H, { plate: c.signText, accent: '#ef4444', vig: 0.42, shade: 0.26 });
  };

  // =====================================================================
  // FINAL DA COPA — "Catedral dos Quatro Egos" (noite, fogos, confete)
  // =====================================================================
  VN.worldcup_final = function (ctx, W, H) {
    const c = mapColors('worldcup_final');
    const rng = this.bgestRng(2026);
    const hy = Math.round(H * 0.6);
    const g = this.bgestBowlGeo(W, H, { hy, k: 0.8, tiers: TIERS(0.4, 0.86) });
    const { T, Y } = g;
    const cx = W / 2;
    this.cineGradient(ctx, 0, 0, W, hy + 2, [[0, '#010208'], [0.45, '#07102a'], [0.8, '#122a52'], [1, '#1d3d6b']]);
    this.bgestStars(ctx, W, hy * 0.55, rng, 140, 0.7);
    // holofotes cruzando o céu
    [[0.2, -0.32, '0,245,212'], [0.8, 0.32, '250,204,21'], [0.38, -0.12, '147,197,253'], [0.64, 0.14, '0,245,212']].forEach(([fx, tilt, col]) => {
      const x = W * fx;
      const y = Y(x, T.f1);
      this.cineShafts(ctx, x, y, -Math.PI / 2 + tilt, H * 1.1, 0.06, 1, col, 0.16, 0);
    });
    // fogos de artifício
    const burst = (x, y, r, col, n) => {
      this.cineGlow(ctx, x, y, r * 1.1, `rgba(${col},0.35)`, 0.8);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rng() * 0.1;
        const len = r * (0.7 + rng() * 0.3);
        for (let k = 0; k < 9; k++) {
          const d = len * (0.25 + k * 0.095);
          const px = x + Math.cos(a) * d;
          const py = y + Math.sin(a) * d + (d / r) * (d / r) * r * 0.18;
          ctx.fillStyle = `rgba(${col},${(0.25 + k * 0.085).toFixed(2)})`;
          const sz = k === 8 ? 3 : 2;
          ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
      }
      ctx.restore();
      this.cineGlow(ctx, x, y, r * 0.18, 'rgba(255,255,255,0.9)', 0.8);
    };
    const R0 = Math.min(W, H * 1.8);
    // cada estouro fica no pedaço de céu acima do teto naquela coluna
    const sky = (fx, fy, rr) => [W * fx, Math.max(rr * 0.6, Math.min(H * fy, Y(W * fx, T.f1) - rr * 0.75))];
    [[0.2, 0.2, 0.07, '250,204,21', 28], [0.33, 0.12, 0.05, '0,245,212', 24], [0.68, 0.17, 0.075, '248,113,113', 30], [0.82, 0.1, 0.045, '250,204,21', 22], [0.55, 0.22, 0.032, '191,219,254', 18]].forEach(([fx, fy, fr, col, n]) => {
      const rr = R0 * fr;
      const [bx, by] = sky(fx, fy, rr);
      burst(bx, by, rr, col, n);
    });
    // fumaça dos fogos iluminada
    this.bgestGlowE(ctx, W * 0.5, Y(cx, T.f1) - H * 0.03, W * 0.7, H * 0.09, '#94a3b8', 0.12);
    this.bgestPitch(ctx, W, H, hy, {
      far: '#2f8f55', mid: '#156134', near: '#031c0b', stripe: 'rgba(0,0,0,0.16)', line: 'rgba(236,253,245,0.55)',
      pools: [[0.25, 0.67, 0.2, 0.05, '#5eead4', 0.07], [0.75, 0.67, 0.2, 0.05, '#fde68a', 0.08]]
    });
    this.bgestBowl(ctx, g, {
      seed: 99, fascia: 'gothic', under: ['#0b1020', '#151c2e'], dof: 0.72,
      seats: ['#1e3a8a', '#172554', '#e2e8f0'],
      crowd: crowdOf('worldcup_final', ['#1d4ed8', '#f8fafc', '#facc15']),
      upper: { n: 12, density: 0.88, light: [0.32, 0.64] },
      lower: { n: 11, density: 0.93, light: [0.56, 0.88] },
      tint: '#0e2a5a', tk: 0.3, flags: ['jp', 'fr', 'cyan', 'jp'], flagK: 0.014,
      haze: ['#0f2347', 0.32], poolCol: '#99f6e4', poolA: 0.1,
      sign: c.signText, signBg: c.signBg, signInk: '#04121a', boardBg: c.boardBg, boardInk: '#111827', sponsors: c.sponsors, aisle: '#475569'
    });
    // telão com a taça
    const scr = this.bgestCanvas(520, 210, (s, w, h) => {
      const bg = s.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6);
      bg.addColorStop(0, '#0f2f4a');
      bg.addColorStop(1, '#020617');
      s.fillStyle = bg;
      s.fillRect(0, 0, w, h);
      // taça
      const tx = w * 0.18;
      s.fillStyle = '#facc15';
      s.beginPath();
      s.moveTo(tx - 34, 40);
      s.lineTo(tx + 34, 40);
      s.quadraticCurveTo(tx + 32, 110, tx + 8, 122);
      s.lineTo(tx + 8, 150);
      s.lineTo(tx + 26, 162);
      s.lineTo(tx - 26, 162);
      s.lineTo(tx - 8, 150);
      s.lineTo(tx - 8, 122);
      s.quadraticCurveTo(tx - 32, 110, tx - 34, 40);
      s.fill();
      s.fillStyle = '#b45309';
      s.fillRect(tx - 30, 168, 60, 16);
      s.fillStyle = 'rgba(255,255,255,0.5)';
      s.fillRect(tx - 22, 48, 8, 56);
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillStyle = '#00f5d4';
      s.font = `italic 900 26px ${FONT}`;
      s.fillText('WORLD CUP GRAND FINAL', w * 0.62, 46);
      s.fillStyle = '#fff';
      s.font = `italic 900 38px ${FONT}`;
      s.fillText('JAPAN  vs  FRANCE', w * 0.62, 104);
      s.fillStyle = '#facc15';
      s.font = `900 22px ${FONT}`;
      s.fillText('QUATRO EGOS', w * 0.62, 158);
      this.bgestLed(s, w, h);
    });
    this.bgestBowlScreen(ctx, g, scr, W * 0.715, W * 0.905, T.ut - 0.004, lerp(T.ut, T.mid, 0.62), '#00f5d4');
    const tifo = this.bgestCanvas(640, 110, (s, w, h) => {
      const gr = s.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#1d4ed8');
      gr.addColorStop(1, '#0e7490');
      s.fillStyle = gr;
      s.fillRect(0, 0, w, h);
      s.fillStyle = '#f8fafc';
      s.font = `italic 900 70px ${FONT}`;
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillText('NIPPON EGO', w / 2, h / 2 + 4);
    });
    this.bgestCurveImage(ctx, g, tifo, W * 0.04, W * 0.24, lerp(T.bandB, T.boardT, 0.08), lerp(T.bandB, T.boardT, 0.42));
    this.bgestFlashes(ctx, g, T.ut, T.boardT, 40, rng);
    this.bgestBowlLights(ctx, g, { lamp: '224,250,255', step: 0.07 });
    // confete caindo (menos no centro, atrás da cabeça)
    const CONF = ['#facc15', '#f8fafc', '#00f5d4', '#ef4444', '#60a5fa'];
    for (let i = 0; i < 260; i++) {
      const x = rng() * W;
      const y = rng() * H * 0.95;
      const dc = Math.abs(x - cx) / (W / 2);
      if (dc < 0.3 && y > H * 0.3 && rng() < 0.85) continue;
      const near = rng();
      const sz = (2 + near * near * 7) * (H / 620);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rng() * Math.PI);
      ctx.globalAlpha = 0.55 + near * 0.45;
      ctx.fillStyle = CONF[i % CONF.length];
      ctx.fillRect(-sz / 2, -sz * 0.3, sz, sz * (0.35 + rng() * 0.4));
      ctx.restore();
    }
    this.bgestFinish(ctx, W, H, { plate: c.signText, accent: '#00f5d4', vig: 0.58, shade: 0.32 });
  };

  // =====================================================================
  // PRÓLOGO — campo do colégio ao pôr do sol
  // =====================================================================
  VN.school_sunset = function (ctx, W, H) {
    const c = mapColors('school_sunset');
    const rng = this.bgestRng(1704);
    const hy = Math.round(H * 0.62);
    const cx = W / 2;
    const k = H / 620;
    this.cineGradient(ctx, 0, 0, W, hy + 2, [[0, '#211a4e'], [0.28, '#56306f'], [0.52, '#b4466a'], [0.74, '#ef7745'], [0.9, '#fbad5c'], [1, '#fde3a6']]);
    const sunX = W * 0.8;
    const sunY = hy - H * 0.1;
    this.bgestGlowE(ctx, sunX, sunY, W * 0.6, H * 0.5, '#ff9248', 0.33);
    this.bgestGlowE(ctx, sunX, sunY, W * 0.22, H * 0.2, '#ffe0a8', 0.55);
    // faixas de nuvens iluminadas por baixo
    for (let i = 0; i < 11; i++) {
      const y = H * (0.07 + (i / 10) * 0.33 + (rng() - 0.5) * 0.04);
      const x = rng() * W * 1.1 - W * 0.05;
      const w = W * (0.22 + rng() * 0.3) * (1 - i * 0.04);
      const h = H * (0.05 - i * 0.0025) * (0.8 + rng() * 0.4);
      const warm = clamp(y / (hy * 0.72), 0, 1);
      const nearSun = clamp(1 - Math.abs(x - sunX) / (W * 0.6), 0, 1);
      this.bgestStratus(ctx, x, y, w, h, rng,
        this.bgestMix('#4a2766', '#b2486c', warm),
        this.bgestMix('#f08a5d', '#ffe0a6', clamp(warm * 0.6 + nearSun * 0.5, 0, 1)),
        this.bgestMix('#271a52', '#6a2f62', warm),
        1);
    }
    // sol
    this.cineGlow(ctx, sunX, sunY, H * 0.16, 'rgba(255,236,190,0.95)', 0.9);
    ctx.fillStyle = '#fff6dc';
    ctx.beginPath();
    ctx.arc(sunX, sunY, H * 0.042, 0, Math.PI * 2);
    ctx.fill();
    // corvos
    ctx.strokeStyle = 'rgba(40,20,40,0.8)';
    ctx.lineWidth = 1.6 * k;
    for (let i = 0; i < 6; i++) {
      const bx = W * (0.56 + rng() * 0.3);
      const by = H * (0.1 + rng() * 0.18);
      const s = (4 + rng() * 5) * k;
      ctx.beginPath();
      ctx.moveTo(bx - s, by - s * 0.4);
      ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.6, bx, by);
      ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.6, bx + s, by - s * 0.4);
      ctx.stroke();
    }
    // montanhas e cidade ao longe
    const ridge = (base, amp, col, seed) => {
      const r2 = this.bgestRng(seed);
      ctx.beginPath();
      ctx.moveTo(-5, hy + 2);
      let y = base;
      for (let x = -5; x <= W + 30; x += W / 36) {
        y = clamp(y + (r2() - 0.5) * amp, base - amp * 1.6, base + amp * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W + 30, hy + 2);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    };
    ridge(hy - H * 0.085, H * 0.03, 'rgba(150,80,120,0.55)', 3);
    ridge(hy - H * 0.05, H * 0.02, 'rgba(98,52,104,0.75)', 8);
    this.cineCity(ctx, W, hy - H * 0.022, Math.round(H * 0.06), '#4a2a5c', 'rgba(255,214,150,0.55)', 9, 0);
    // fileira de árvores
    ctx.fillStyle = '#2a1c3c';
    ctx.beginPath();
    for (let x = -10; x < W + 20; x += 14 * k) {
      const r = (8 + rng() * 14) * k;
      ctx.moveTo(x + r, hy - H * 0.022);
      ctx.arc(x, hy - H * 0.022, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillRect(0, hy - H * 0.024, W, H * 0.03);
    this.bgestGlowE(ctx, sunX, hy - H * 0.03, W * 0.35, H * 0.05, '#ff9a55', 0.3);
    // gramado
    this.bgestPitch(ctx, W, H, hy, {
      touch: 0.05, far: '#b48d4c', mid: '#5f7d32', near: '#1b2f16', stripe: 'rgba(30,10,30,0.13)', band: 'rgba(255,210,150,0.035)', line: 'rgba(255,240,220,0.7)'
    });
    this.bgestGlowE(ctx, sunX, hy + H * 0.035, W * 0.32, H * 0.05, '#ffa860', 0.3);
    // prédio do colégio (contra a luz)
    const bx0 = -W * 0.02;
    const bx1 = W * 0.4;
    const base = hy - H * 0.018;
    const fH = H * 0.062;
    const top = base - fH * 4 - H * 0.012;
    const side = 0.1;
    const sx = bx1 + (cx - bx1) * side;
    const sTop = top + (hy - top) * side;
    const sBot = base + (hy - base) * side;
    ctx.fillStyle = '#7d5b74';
    ctx.beginPath();
    ctx.moveTo(bx1, top);
    ctx.lineTo(sx, sTop);
    ctx.lineTo(sx, sBot);
    ctx.lineTo(bx1, base);
    ctx.closePath();
    ctx.fill();
    const fg = ctx.createLinearGradient(0, top, 0, base);
    fg.addColorStop(0, '#d8b2a2');
    fg.addColorStop(1, '#94768b');
    ctx.fillStyle = fg;
    ctx.fillRect(bx0, top, bx1 - bx0, base - top);
    // pavimentos: laje + janelas refletindo o céu
    for (let f = 0; f < 4; f++) {
      const fy = top + H * 0.012 + f * fH;
      ctx.fillStyle = 'rgba(255,230,210,0.25)';
      ctx.fillRect(bx0, fy, bx1 - bx0, Math.max(1, fH * 0.08));
      ctx.fillStyle = 'rgba(60,30,60,0.25)';
      ctx.fillRect(bx0, fy + fH * 0.08, bx1 - bx0, Math.max(1, fH * 0.05));
      const ww = W * 0.03;
      for (let x = bx0 + W * 0.012; x + ww < bx1 - W * 0.006; x += ww + W * 0.007) {
        const wy = fy + fH * 0.24;
        const wh = fH * 0.58;
        const q = rng();
        const gr = ctx.createLinearGradient(0, wy, 0, wy + wh);
        if (q < 0.18) {
          gr.addColorStop(0, '#e3f2ff');
          gr.addColorStop(1, '#a9c8e8');
        } else {
          gr.addColorStop(0, '#ffcf96');
          gr.addColorStop(1, '#c76a5c');
        }
        ctx.fillStyle = gr;
        ctx.fillRect(x, wy, ww, wh);
        if (q > 0.7) {
          ctx.fillStyle = 'rgba(255,248,230,0.75)';
          ctx.fillRect(x, wy, ww * 0.35, wh);
        }
        ctx.fillStyle = 'rgba(70,40,70,0.7)';
        ctx.fillRect(x + ww / 2 - 0.5, wy, 1.2, wh);
        ctx.fillRect(x, wy + wh * 0.5, ww, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 2, wy + 2, ww * 0.2, 1);
      }
    }
    // telhado: platibanda, grade e caixa d'água
    ctx.fillStyle = '#6e4c66';
    ctx.fillRect(bx0, top - H * 0.008, bx1 - bx0 + 2, H * 0.012);
    ctx.strokeStyle = 'rgba(60,35,60,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx0, top - H * 0.035);
    ctx.lineTo(bx1, top - H * 0.035);
    for (let x = bx0; x < bx1; x += 6 * k) {
      ctx.moveTo(x, top - H * 0.035);
      ctx.lineTo(x, top - H * 0.008);
    }
    ctx.stroke();
    ctx.fillStyle = '#5c3f58';
    ctx.fillRect(W * 0.06, top - H * 0.07, W * 0.035, H * 0.06);
    ctx.fillRect(W * 0.064, top - H * 0.078, W * 0.027, H * 0.01);
    // torre do relógio
    const tx = W * 0.25;
    const tw = W * 0.06;
    const tTop = top - H * 0.085;
    ctx.fillStyle = '#c7a196';
    ctx.fillRect(tx - tw / 2, tTop, tw, top - tTop);
    ctx.fillStyle = '#6e4c66';
    ctx.fillRect(tx - tw / 2 - 3, tTop - H * 0.008, tw + 6, H * 0.01);
    const cr = Math.min(tw * 0.36, H * 0.03);
    const ccy = tTop + (top - tTop) * 0.5;
    ctx.fillStyle = '#fff8ec';
    ctx.beginPath();
    ctx.arc(tx, ccy, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = Math.max(1.5, cr * 0.14);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, cr * 0.1);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.moveTo(tx + Math.cos(a) * cr * 0.78, ccy + Math.sin(a) * cr * 0.78);
      ctx.lineTo(tx + Math.cos(a) * cr * 0.9, ccy + Math.sin(a) * cr * 0.9);
    }
    ctx.moveTo(tx, ccy);
    ctx.lineTo(tx + Math.cos(-Math.PI / 2 + (5.65 / 12) * Math.PI * 2) * cr * 0.5, ccy + Math.sin(-Math.PI / 2 + (5.65 / 12) * Math.PI * 2) * cr * 0.5);
    ctx.moveTo(tx, ccy);
    ctx.lineTo(tx + Math.cos(-Math.PI / 2 + (40 / 60) * Math.PI * 2) * cr * 0.78, ccy + Math.sin(-Math.PI / 2 + (40 / 60) * Math.PI * 2) * cr * 0.78);
    ctx.stroke();
    // luz de recorte do sol nas bordas
    ctx.fillStyle = 'rgba(255,190,120,0.85)';
    ctx.fillRect(bx0, top - H * 0.008, bx1 - bx0, 1.5);
    ctx.fillRect(tx + tw / 2 - 2, tTop, 2, top - tTop);
    ctx.fillRect(sx - 1.5, sTop, 1.5, sBot - sTop);
    // rede alta atrás do gol (silhueta contra o sol)
    const n0 = W * 0.6;
    const n1 = W * 1.02;
    const nTop = hy - H * 0.27;
    ctx.fillStyle = '#2a1830';
    [n0, W * 0.81, n1].forEach((x) => ctx.fillRect(x - 2 * k, nTop - 4, 4 * k, hy - nTop));
    ctx.strokeStyle = 'rgba(40,25,50,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = n0; x < n1; x += 7 * k) {
      ctx.moveTo(x, nTop);
      ctx.lineTo(x, hy - H * 0.02);
    }
    for (let y = nTop; y < hy - H * 0.02; y += 7 * k) {
      ctx.moveTo(n0, y);
      ctx.lineTo(n1, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#2a1830';
    ctx.fillRect(n0, nTop - 2, n1 - n0, 3 * k);
    // poste com fios
    const px = W * 0.93;
    ctx.fillStyle = '#21142a';
    ctx.fillRect(px - 4 * k, -5, 8 * k, hy - H * 0.01);
    [H * 0.1, H * 0.15].forEach((y) => {
      ctx.fillRect(px - W * 0.035, y, W * 0.07, 4 * k);
      ctx.fillStyle = '#3a2440';
      [-0.03, -0.012, 0.012, 0.03].forEach((d) => ctx.fillRect(px + W * d - 2, y - 6 * k, 4 * k, 6 * k));
      ctx.fillStyle = '#21142a';
    });
    ctx.strokeStyle = 'rgba(25,14,32,0.85)';
    ctx.lineWidth = 1.3 * k;
    [[-0.03, 0.1], [-0.012, 0.1], [0.012, 0.15], [0.03, 0.15]].forEach(([d, fy], i) => {
      const x0 = px + W * d;
      const y0 = H * fy - 6 * k;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(W * 0.45, y0 + H * (0.11 + i * 0.015), -W * 0.05, y0 - H * 0.02 + i * H * 0.012);
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(W * 0.97, y0 + H * 0.03, W * 1.05, y0 + H * 0.02);
      ctx.stroke();
    });
    // alambrado na beira do campo
    const fTop = hy - H * 0.055;
    const fBot = hy + H * 0.012;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, fTop, W, fBot - fTop);
    ctx.clip();
    ctx.strokeStyle = 'rgba(45,25,50,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const st = 6 * k;
    for (let x = -H; x < W + H; x += st) {
      ctx.moveTo(x, fTop);
      ctx.lineTo(x + (fBot - fTop), fBot);
      ctx.moveTo(x, fBot);
      ctx.lineTo(x + (fBot - fTop), fTop);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#3a2440';
    ctx.fillRect(0, fTop - 1, W, 2.5 * k);
    for (let x = W * 0.02; x < W; x += W * 0.075) {
      ctx.fillStyle = '#3a2440';
      ctx.fillRect(x - 1.5 * k, fTop - 2, 3 * k, fBot - fTop + 2);
      ctx.fillStyle = 'rgba(255,190,120,0.6)';
      ctx.fillRect(x + 1.5 * k - 1, fTop, 1, fBot - fTop);
      // sombra comprida do mourão vindo na direção da câmera
      ctx.fillStyle = 'rgba(40,15,45,0.22)';
      ctx.beginPath();
      ctx.moveTo(x - 1.5 * k, fBot);
      ctx.lineTo(x + 1.5 * k, fBot);
      ctx.lineTo(x - W * 0.32, H + 10);
      ctx.lineTo(x - W * 0.32 - 10 * k, H + 10);
      ctx.closePath();
      ctx.fill();
    }
    // alunos olhando o jogo atrás do alambrado
    [[0.63, 1], [0.665, 0], [0.7, 0], [0.105, 0], [0.13, 0]].forEach(([fx, p]) => {
      const fh = H * (0.05 + rng() * 0.008);
      this.bgestFigure(ctx, W * fx, hy - H * 0.004, fh, '#2a1830', 'rgba(255,170,100,0.9)', p === 1 ? 0 : 0);
    });
    // sombra do prédio no gramado
    ctx.fillStyle = 'rgba(40,15,50,0.3)';
    ctx.beginPath();
    ctx.moveTo(-5, fBot);
    ctx.lineTo(bx1 * 0.92, fBot);
    ctx.lineTo(bx1 * 0.4, H * 0.82);
    ctx.lineTo(-5, H * 0.86);
    ctx.closePath();
    ctx.fill();
    // gol de lado, à esquerda
    const gx0 = W * 0.045;
    const gx1 = W * 0.14;
    const gb0 = hy + H * 0.075;
    const gb1 = hy + H * 0.045;
    const gt0 = gb0 - H * 0.12;
    const gt1 = gb1 - H * 0.085;
    ctx.strokeStyle = 'rgba(255,240,225,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      ctx.moveTo(lerp(gx0, gx1, t), lerp(gt0, gt1, t));
      ctx.lineTo(lerp(gx0, gx1, t) - W * 0.03, lerp(gb0, gb1, t));
    }
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      ctx.moveTo(lerp(gx0, gx0 - W * 0.03, t), lerp(gt0, gb0, t));
      ctx.lineTo(lerp(gx1, gx1 - W * 0.03, t), lerp(gt1, gb1, t));
    }
    ctx.stroke();
    ctx.strokeStyle = '#fbe7d6';
    ctx.lineWidth = Math.max(2, 4 * k);
    ctx.beginPath();
    ctx.moveTo(gx0, gb0);
    ctx.lineTo(gx0, gt0);
    ctx.lineTo(gx1, gt1);
    ctx.lineTo(gx1, gb1);
    ctx.stroke();
    // reflexos de lente vindos do sol
    [[0.35, 26, '#ffb070', 0.18], [0.62, 12, '#ffd9a8', 0.2], [1.25, 40, '#ff8a5c', 0.1]].forEach(([t, r, col, a]) => {
      this.bgestGlowE(ctx, lerp(sunX, cx, t), lerp(sunY, H * 0.55, t), r * k * 1.5, r * k * 1.5, col, a);
    });
    this.bgestFinish(ctx, W, H, { plate: c.signText, accent: '#fb923c', vig: 0.48, shade: 0.24 });
  };

  // =====================================================================
  // BLUE LOCK — "Estrato 5": campo subterrâneo do bunker
  // =====================================================================
  VN.bluelock_bunker = function (ctx, W, H) {
    const c = mapColors('bluelock_bunker');
    const rng = this.bgestRng(505);
    const R = this.bgestRoom(W, H, { vy: 0.41, eye: 3 });
    const { P, F, cx } = R;
    const poly = (pts, fill) => R.poly(ctx, pts, fill);
    const Xw = 22;
    const Yc = 14;
    const Zf = 62;
    const Zn = 1.5;
    const pw = (Z, m) => Math.max(0.7, (F * m) / Z);
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, W, H);
    // teto
    const tc = P(0, Yc, Zf);
    const cg = ctx.createLinearGradient(0, 0, 0, tc[1]);
    cg.addColorStop(0, '#010207');
    cg.addColorStop(1, '#0b1424');
    poly([[-Xw, Yc, Zn], [Xw, Yc, Zn], [Xw, Yc, Zf], [-Xw, Yc, Zf]], cg);
    // paredes laterais
    [-1, 1].forEach((sg) => {
      const X = sg * Xw;
      const far = P(X, 0, Zf)[0];
      const gx = ctx.createLinearGradient(sg < 0 ? 0 : W, 0, far, 0);
      gx.addColorStop(0, '#04080f');
      gx.addColorStop(1, '#122036');
      poly([[X, 0, Zn], [X, Yc, Zn], [X, Yc, Zf], [X, 0, Zf]], gx);
    });
    // parede do fundo
    const b0 = P(-Xw, Yc, Zf);
    const b1 = P(Xw, 0, Zf);
    const bg = ctx.createLinearGradient(0, b0[1], 0, b1[1]);
    bg.addColorStop(0, '#0c1628');
    bg.addColorStop(1, '#13223a');
    ctx.fillStyle = bg;
    ctx.fillRect(b0[0], b0[1], b1[0] - b0[0], b1[1] - b0[1]);
    // chão (grama sintética escura)
    const fy0 = P(0, 0, Zf)[1];
    const fg = ctx.createLinearGradient(0, fy0, 0, H);
    fg.addColorStop(0, '#13584a');
    fg.addColorStop(0.35, '#0b3a2d');
    fg.addColorStop(1, '#020c08');
    poly([[-Xw, 0, Zn], [Xw, 0, Zn], [Xw, 0, Zf], [-Xw, 0, Zf]], fg);
    for (let X = -Xw, i = 0; X < Xw; X += 4, i++) {
      if (i % 2) poly([[X, 0, Zn], [X + 4, 0, Zn], [X + 4, 0, Zf], [X, 0, Zf]], 'rgba(0,0,0,0.16)');
    }
    // grade de luz ciano no chão
    for (let Z = 5; Z < Zf; Z += 5) this.bgestStrip3(ctx, R, [-Xw, 0, Z], [Xw, 0, Z], 0.06, 'rgba(56,189,248,0.16)', 'z');
    for (let X = -Xw + 2; X < Xw; X += 5) this.bgestStrip3(ctx, R, [X, 0, Zn], [X, 0, Zf], 0.06, 'rgba(56,189,248,0.12)', 'x');
    // linhas do campo
    const LN = 'rgba(226,232,240,0.45)';
    const gl = Zf - 1.5;
    [-20, 20].forEach((X) => this.bgestStrip3(ctx, R, [X, 0, Zn], [X, 0, gl], 0.14, LN, 'x'));
    this.bgestStrip3(ctx, R, [-20, 0, gl], [20, 0, gl], 0.14, LN, 'z');
    [[-12, 12, gl - 13], [-5, 5, gl - 5]].forEach(([xa, xb, z]) => {
      this.bgestStrip3(ctx, R, [xa, 0, z], [xb, 0, z], 0.14, LN, 'z');
      this.bgestStrip3(ctx, R, [xa, 0, z], [xa, 0, gl], 0.14, LN, 'x');
      this.bgestStrip3(ctx, R, [xb, 0, z], [xb, 0, gl], 0.14, LN, 'x');
    });
    const hl = 14;
    this.bgestStrip3(ctx, R, [-20, 0, hl], [20, 0, hl], 0.14, LN, 'z');
    ctx.beginPath();
    [7.07, 6.93].forEach((r) => {
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const p = P(r * Math.cos(a), 0, hl + r * Math.sin(a));
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
      ctx.closePath();
    });
    ctx.fillStyle = LN;
    ctx.fill('evenodd');
    // o chão perto da câmera cai no escuro
    this.cineGradient(ctx, 0, H * 0.5, W, H * 0.5, [[0, 'rgba(2,4,10,0)'], [1, 'rgba(2,4,10,0.6)']]);
    // ---- parede do fundo: painéis, portão, telão do Ego, gol
    const BW = (X, Y) => P(X, Y, Zf);
    ctx.strokeStyle = 'rgba(148,163,184,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let X = -Xw + 4; X < Xw; X += 4) {
      const a = BW(X, 0);
      const b = BW(X, Yc);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    [3.5, 7, 10.5].forEach((Yy) => {
      const a = BW(-Xw, Yy);
      const b = BW(Xw, Yy);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    });
    ctx.stroke();
    const sh0 = BW(-9, 6);
    const sh1 = BW(9, 0);
    ctx.fillStyle = '#070d18';
    ctx.fillRect(sh0[0], sh0[1], sh1[0] - sh0[0], sh1[1] - sh0[1]);
    ctx.fillStyle = 'rgba(148,163,184,0.12)';
    for (let y = sh0[1] + 2; y < sh1[1]; y += Math.max(2, (sh1[1] - sh0[1]) / 16)) ctx.fillRect(sh0[0], y, sh1[0] - sh0[0], 1);
    ctx.fillStyle = 'rgba(250,204,21,0.45)';
    ctx.fillRect(sh0[0], sh0[1] - 2, sh1[0] - sh0[0], 2);
    // telão do Ego
    const m0 = BW(-10.5, 12.8);
    const m1 = BW(10.5, 7.4);
    const mon = this.bgestCanvas(420, 110, (s, w, h) => {
      const gr = s.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#0b2547');
      gr.addColorStop(1, '#04101f');
      s.fillStyle = gr;
      s.fillRect(0, 0, w, h);
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillStyle = 'rgba(56,189,248,0.9)';
      s.font = `italic 900 46px ${FONT}`;
      s.fillText('BLUE LOCK', w / 2, h * 0.42);
      s.fillStyle = 'rgba(226,232,240,0.7)';
      s.font = `900 16px ${FONT}`;
      s.fillText('STRATUM 05 • TEAM Z • SURVIVAL', w / 2, h * 0.8);
      this.bgestLed(s, w, h);
    });
    ctx.fillStyle = '#01030a';
    ctx.fillRect(m0[0] - 3, m0[1] - 3, m1[0] - m0[0] + 6, m1[1] - m0[1] + 6);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(mon, m0[0], m0[1], m1[0] - m0[0], m1[1] - m0[1]);
    ctx.globalAlpha = 1;
    this.bgestGlowE(ctx, (m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2, (m1[0] - m0[0]) * 0.75, (m1[1] - m0[1]) * 1.4, '#38bdf8', 0.12);
    // gol
    const gz = gl;
    const gp = (X, Y) => P(X, Y, gz);
    ctx.strokeStyle = 'rgba(203,213,225,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let X = -3.66; X <= 3.66; X += 0.6) {
      const a = gp(X, 2.44);
      const b = P(X, 0, gz + 1.2);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = pw(gz, 0.14);
    ctx.beginPath();
    let q = gp(-3.66, 0);
    ctx.moveTo(q[0], q[1]);
    q = gp(-3.66, 2.44);
    ctx.lineTo(q[0], q[1]);
    q = gp(3.66, 2.44);
    ctx.lineTo(q[0], q[1]);
    q = gp(3.66, 0);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
    // ---- paredes laterais
    const stencil5 = this.bgestCanvas(420, 560, (s, w, h) => {
      s.textAlign = 'center';
      s.textBaseline = 'alphabetic';
      s.font = `italic 900 640px ${FONT}`;
      s.fillStyle = 'rgba(56,189,248,0.25)';
      s.fillText('5', w * 0.5 + 14, h * 0.97 + 10);
      s.fillStyle = 'rgba(176,214,245,0.5)';
      s.fillText('5', w * 0.5, h * 0.97);
      s.globalCompositeOperation = 'destination-out';
      s.fillRect(w * 0.47, 0, w * 0.04, h);
      s.fillRect(0, h * 0.46, w, h * 0.03);
      const r2 = this.bgestRng(55);
      for (let i = 0; i < 260; i++) {
        s.globalAlpha = 0.3 + r2() * 0.7;
        s.fillRect(r2() * w, r2() * h, 2 + r2() * 10, 1 + r2() * 4);
      }
      s.globalAlpha = 1;
      s.globalCompositeOperation = 'source-over';
    });
    const wallTxt = (txt, col, w0, h0, fs) => this.bgestCanvas(w0, h0, (s, w, h) => {
      s.fillStyle = col;
      s.font = `italic 900 ${fs}px ${FONT}`;
      s.textAlign = 'center';
      s.textBaseline = 'middle';
      s.fillText(txt, w / 2, h / 2 + fs * 0.05);
      s.globalCompositeOperation = 'destination-out';
      const r2 = this.bgestRng(fs);
      for (let i = 0; i < 120; i++) s.fillRect(r2() * w, r2() * h, 2 + r2() * 6, 1 + r2() * 2);
    });
    const blTxt = wallTxt('BLUE LOCK', 'rgba(148,180,210,0.42)', 900, 120, 110);
    const strTxt = wallTxt('STRATUM 05', 'rgba(56,189,248,0.55)', 700, 110, 96);
    // ranking dos monitores
    const rankCv = (seed) => this.bgestCanvas(320, 180, (s, w, h) => {
      const r2 = this.bgestRng(seed);
      s.fillStyle = '#031225';
      s.fillRect(0, 0, w, h);
      s.fillStyle = '#0ea5e9';
      s.fillRect(0, 0, w, 26);
      s.fillStyle = '#e0f2fe';
      s.font = `italic 900 17px ${FONT}`;
      s.textBaseline = 'middle';
      s.fillText(seed % 2 ? 'BL RANKING' : 'TEAM Z • DATA', 10, 14);
      for (let i = 0; i < 6; i++) {
        const y = 38 + i * 23;
        s.fillStyle = 'rgba(56,189,248,0.18)';
        s.fillRect(8, y, w - 16, 17);
        s.fillStyle = i === 0 ? '#facc15' : '#38bdf8';
        s.fillRect(48, y + 4, (w - 70) * (0.25 + r2() * 0.7), 9);
        s.fillStyle = '#e0f2fe';
        s.font = `900 13px ${FONT}`;
        s.fillText(`#${String(Math.floor(r2() * 299) + 1).padStart(3, '0')}`, 10, y + 9);
      }
      this.bgestLed(s, w, h);
    });
    [-1, 1].forEach((sg) => {
      const X = sg * Xw;
      const z0 = 22;
      // painéis
      ctx.strokeStyle = 'rgba(148,163,184,0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let Z = z0; Z <= Zf; Z += 4) {
        const a = P(X, 0, Z);
        const b = P(X, Yc, Z);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      [3.5, 7, 10.5].forEach((Yy) => {
        const a = P(X, Yy, z0);
        const b = P(X, Yy, Zf);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      });
      ctx.stroke();
      for (let Z = z0, i = 0; Z < Zf; Z += 4, i++) {
        if (i % 3 === 1) poly([[X, 0, Z], [X, Yc, Z], [X, Yc, Z + 4], [X, 0, Z + 4]], 'rgba(148,163,184,0.035)');
      }
      // listras de perigo no rodapé
      for (let Z = z0; Z < Zf; Z += 1.2) poly([[X, 0, Z], [X, 0, Z + 0.6], [X, 1, Z + 1.1], [X, 1, Z + 0.5]], 'rgba(202,138,4,0.5)');
      poly([[X, 1, z0], [X, 1.12, z0], [X, 1.12, Zf], [X, 1, Zf]], '#05080f');
    });
    // número gigante na parede direita, e o nome na esquerda
    this.bgestPlaneImage(ctx, R, stencil5, Xw, 46, Xw, 26.5, 1.8, 13.2, 70);
    this.bgestPlaneImage(ctx, R, blTxt, -Xw, 27, -Xw, 56, 11.2, 13.4, 70);
    this.bgestPlaneImage(ctx, R, strTxt, Xw, 60, Xw, 48, 11.4, 13.4, 40);
    // monitores na parede esquerda
    [[28, 33.5, 1], [36, 40.5, 2], [43, 47, 3]].forEach(([za, zb, sd]) => {
      R.path(ctx, [[-Xw + 0.05, 7.4, za - 0.3], [-Xw + 0.05, 7.4, zb + 0.3], [-Xw + 0.05, 10.4, zb + 0.3], [-Xw + 0.05, 10.4, za - 0.3]]);
      ctx.fillStyle = '#01040a';
      ctx.fill();
      this.bgestPlaneImage(ctx, R, rankCv(sd), -Xw + 0.1, za, -Xw + 0.1, zb, 7.6, 10.2, 30);
      const cc = P(-Xw, 8.9, (za + zb) / 2);
      this.cineGlow(ctx, cc[0], cc[1], (F * 3) / za, 'rgba(56,189,248,0.4)', 0.6);
    });
    // porta da equipe Z
    const dz0 = 49;
    const dz1 = 53;
    R.path(ctx, [[-Xw, 0, dz0], [-Xw, 4.6, dz0], [-Xw, 4.6, dz1], [-Xw, 0, dz1]]);
    ctx.fillStyle = '#060b14';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const zl = P(-Xw, 5.4, (dz0 + dz1) / 2);
    ctx.fillStyle = '#38bdf8';
    ctx.font = `italic 900 ${Math.round((F * 0.9) / dz0)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Z', zl[0], zl[1]);
    // canos na parede esquerda
    [[4.3, 0.35], [4.9, 0.25]].forEach(([Yy, d]) => {
      this.bgestStrip3(ctx, R, [-Xw + 0.3, Yy, 22], [-Xw + 0.3, Yy, Zf], d, '#1c2a40', 'y');
      this.bgestStrip3(ctx, R, [-Xw + 0.3, Yy + d * 0.3, 22], [-Xw + 0.3, Yy + d * 0.3, Zf], d * 0.2, 'rgba(148,163,184,0.35)', 'y');
    });
    // passarelas nas duas paredes
    [-1, 1].forEach((sg) => {
      const X = sg * Xw;
      const Xi = X - sg * 1.6;
      poly([[X, 6, 22], [Xi, 6, 22], [Xi, 6, Zf], [X, 6, Zf]], '#0a111d');
      poly([[Xi, 5.7, 22], [Xi, 6, 22], [Xi, 6, Zf], [Xi, 5.7, Zf]], '#1e293b');
      ctx.strokeStyle = 'rgba(148,163,184,0.45)';
      ctx.beginPath();
      for (let Z = 22; Z <= Zf; Z += 2) {
        const a = P(Xi, 6, Z);
        const b = P(Xi, 7.1, Z);
        ctx.lineWidth = pw(Z, 0.06);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
      this.bgestStrip3(ctx, R, [Xi, 7.1, 22], [Xi, 7.1, Zf], 0.08, 'rgba(148,163,184,0.6)', 'y');
      this.bgestStrip3(ctx, R, [Xi, 6.6, 22], [Xi, 6.6, Zf], 0.05, 'rgba(148,163,184,0.35)', 'y');
      // neons
      [1.3, 13.2].forEach((Yy) => {
        this.bgestStrip3(ctx, R, [X, Yy, 22], [X, Yy, Zf], 0.5, 'rgba(56,189,248,0.16)', 'y');
        this.bgestStrip3(ctx, R, [X, Yy, 22], [X, Yy, Zf], 0.12, '#7dd3fc', 'y');
      });
    });
    [1.3, 13.2].forEach((Yy) => {
      const a = P(-Xw, Yy, Zf);
      const b = P(Xw, Yy, Zf);
      ctx.fillStyle = 'rgba(56,189,248,0.16)';
      ctx.fillRect(a[0], a[1] - 2, b[0] - a[0], 4);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(a[0], a[1] - 0.6, b[0] - a[0], 1.2);
    });
    // ---- teto: vigas, cabos e os painéis de luz fria
    for (let Z = 24; Z < Zf; Z += 4) {
      poly([[-Xw, Yc - 0.7, Z], [Xw, Yc - 0.7, Z], [Xw, Yc, Z], [-Xw, Yc, Z]], '#0c1422');
      poly([[-Xw, Yc - 0.7, Z], [Xw, Yc - 0.7, Z], [Xw, Yc - 0.7, Z + 0.5], [-Xw, Yc - 0.7, Z + 0.5]], '#141f33');
    }
    [-16, -6, 6, 16].forEach((X) => poly([[X - 0.3, Yc - 0.5, Zn + 18], [X + 0.3, Yc - 0.5, Zn + 18], [X + 0.3, Yc - 0.5, Zf], [X - 0.3, Yc - 0.5, Zf]], '#0f1829'));
    ctx.strokeStyle = '#03060c';
    for (let i = 0; i < 14; i++) {
      const X1 = (rng() - 0.5) * Xw * 1.8;
      const X2 = X1 + (rng() - 0.5) * 14;
      const Z1 = 26 + rng() * 32;
      const Z2 = Z1 + (rng() - 0.5) * 10;
      const sag = 1 + rng() * 3.5;
      ctx.beginPath();
      for (let t = 0; t <= 16; t++) {
        const k = t / 16;
        const p = P(lerp(X1, X2, k), Yc - 0.7 - sag * 4 * k * (1 - k), lerp(Z1, Z2, k));
        if (t) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      }
      ctx.lineWidth = pw((Z1 + Z2) / 2, 0.08);
      ctx.stroke();
    }
    const rigs = [];
    for (let Z = 26; Z < Zf; Z += 8) {
      [-11, 0, 11].forEach((X) => {
        poly([[X - 3.4, Yc - 1.25, Z - 0.7], [X + 3.4, Yc - 1.25, Z - 0.7], [X + 3.4, Yc - 1.25, Z + 0.7], [X - 3.4, Yc - 1.25, Z + 0.7]], '#0b1220');
        poly([[X - 3, Yc - 1.3, Z - 0.45], [X + 3, Yc - 1.3, Z - 0.45], [X + 3, Yc - 1.3, Z + 0.45], [X - 3, Yc - 1.3, Z + 0.45]], '#e0f2fe');
        rigs.push([X, Z]);
      });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    rigs.forEach(([X, Z]) => {
      const p = P(X, Yc - 1.3, Z);
      this.cineGlow(ctx, p[0], p[1], (F * 3.2) / Z, 'rgba(125,211,252,0.6)', 0.9);
      // cone de luz até o chão
      if (X !== 0) {
        const a = P(X - 3, Yc - 1.3, Z);
        const b = P(X + 3, Yc - 1.3, Z);
        const cc = P(X + 5.5, 0, Z);
        const d = P(X - 5.5, 0, Z);
        const gr = ctx.createLinearGradient(0, a[1], 0, cc[1]);
        gr.addColorStop(0, 'rgba(125,211,252,0.1)');
        gr.addColorStop(1, 'rgba(125,211,252,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(cc[0], cc[1]);
        ctx.lineTo(d[0], d[1]);
        ctx.closePath();
        ctx.fill();
      }
      // reflexo no chão
      const f = P(X, 0, Z);
      this.bgestGlowE(ctx, f[0], f[1], (F * 4) / Z, (F * 0.5) / Z, '#7dd3fc', 0.22);
    });
    ctx.restore();
    // jogadores treinando lá no fundo
    [[-13, 42, 1], [-10.5, 44, 0], [14, 50, 1]].forEach(([X, Z, pose]) => {
      const p = P(X, 0, Z);
      this.bgestFigure(ctx, p[0], p[1], (F * 1.8) / Z, '#03070d', 'rgba(125,211,252,0.85)', pose);
    });
    const ball = P(-11.8, 0.11, 41);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(ball[0], ball[1], Math.max(1.5, (F * 0.11) / 41), 0, Math.PI * 2);
    ctx.fill();
    // névoa fria lá no fundo e poeira no ar
    this.bgestGlowE(ctx, cx, P(0, 3, Zf)[1], W * 0.42, H * 0.2, '#38bdf8', 0.1);
    this.bgestGlowE(ctx, cx, P(0, 0, Zf)[1], W * 0.5, H * 0.04, '#7dd3fc', 0.12);
    ctx.fillStyle = 'rgba(186,230,253,0.5)';
    for (let i = 0; i < 70; i++) {
      const x = rng() * W;
      const y = rng() * H * 0.75;
      if (Math.abs(x - cx) < W * 0.12 && y > H * 0.35) continue;
      const s = rng() < 0.2 ? 2 : 1;
      ctx.globalAlpha = 0.25 + rng() * 0.5;
      ctx.fillRect(Math.round(x), Math.round(y), s, s);
    }
    ctx.globalAlpha = 1;
    this.bgestFinish(ctx, W, H, { plate: c.signText, accent: '#38bdf8', vig: 0.72, shade: 0.36 });
  };

  // =====================================================================
  // BLUE LOCK — Câmara holográfica central (roxo/ciano)
  // =====================================================================
  VN.bluelock_holo = function (ctx, W, H) {
    const c = mapColors('bluelock_holo');
    const rng = this.bgestRng(808);
    const R = this.bgestRoom(W, H, { vy: 0.43, eye: 2.6 });
    const { P, F, cx } = R;
    const Zc = 26;
    const Rad = 26;
    const Hw = 9;
    const apex = 24;
    const minZ = 2.2;
    ctx.fillStyle = '#04020c';
    ctx.fillRect(0, 0, W, H);
    const dome = (th, ph) => [Rad * Math.cos(ph) * Math.cos(th), Hw + (apex - Hw) * Math.sin(ph), Zc + Rad * Math.cos(ph) * Math.sin(th)];
    const NT = 36;
    const PH = [0, 0.22, 0.45, 0.7, 0.95, 1.25, Math.PI / 2];
    // cúpula em gomos
    for (let i = 0; i < NT; i++) {
      const t0 = (i / NT) * Math.PI * 2;
      const t1 = ((i + 1) / NT) * Math.PI * 2;
      for (let j = 0; j < PH.length - 1; j++) {
        const pts = [dome(t0, PH[j]), dome(t1, PH[j]), dome(t1, PH[j + 1]), dome(t0, PH[j + 1])];
        if (pts.some((p) => p[2] < minZ)) continue;
        const k = j / (PH.length - 1);
        R.poly(ctx, pts, this.bgestMix((i + j) % 2 ? '#1a1240' : '#150f36', '#05030f', k * 0.7));
      }
    }
    // paredes do cilindro
    const wall = (th, Yy) => [Rad * Math.cos(th), Yy, Zc + Rad * Math.sin(th)];
    for (let i = 0; i < NT; i++) {
      const t0 = (i / NT) * Math.PI * 2;
      const t1 = ((i + 1) / NT) * Math.PI * 2;
      const pts = [wall(t0, 0), wall(t1, 0), wall(t1, Hw), wall(t0, Hw)];
      if (pts.some((p) => p[2] < minZ)) continue;
      R.poly(ctx, pts, i % 2 ? '#1e1b4b' : '#191640');
      if (i % 3 === 0) {
        const tm = (t0 + t1) / 2;
        const d = 0.012;
        R.poly(ctx, [wall(tm - d, 1.2), wall(tm + d, 1.2), wall(tm + d, Hw - 1), wall(tm - d, Hw - 1)], 'rgba(0,245,212,0.55)');
      }
    }
    // linhas da cúpula
    ctx.lineWidth = 1;
    const ring = (fn, n, col) => {
      ctx.strokeStyle = col;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= n; i++) {
        const p3 = fn(i / n);
        if (p3[2] < minZ) {
          pen = false;
          continue;
        }
        const p = P(p3[0], p3[1], p3[2]);
        if (pen) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
        pen = true;
      }
      ctx.stroke();
    };
    PH.slice(1, -1).forEach((ph) => ring((k) => dome(k * Math.PI * 2, ph), 120, 'rgba(168,85,247,0.4)'));
    for (let i = 0; i < NT; i += 2) ring((k) => dome((i / NT) * Math.PI * 2, k * Math.PI * 0.5), 30, 'rgba(168,85,247,0.28)');
    // letreiro correndo em volta da parede
    const ringTxt = this.bgestCanvas(3600, 90, (s, w, h) => {
      s.fillStyle = 'rgba(88,28,135,0.55)';
      s.fillRect(0, 0, w, h);
      s.fillStyle = 'rgba(216,180,254,0.95)';
      s.font = `italic 900 58px ${FONT}`;
      s.textBaseline = 'middle';
      const msg = 'BLUE LOCK  ◆  RIVALRY BATTLE  ◆  WORLD FIVE  ◆  TOP 6  ◆  CHEMICAL  ◆  ';
      let x = 10;
      while (x < w) {
        s.fillText(msg, x, h / 2 + 3);
        x += s.measureText(msg).width;
      }
    });
    for (let i = 0; i < NT; i++) {
      const t0 = (i / NT) * Math.PI * 2;
      const t1 = ((i + 1) / NT) * Math.PI * 2;
      const a = wall(t1, 0);
      const b = wall(t0, 0);
      if (a[2] < minZ || b[2] < minZ) continue;
      // de t1 para t0 = da esquerda para a direita na tela (lado de trás do cilindro)
      this.bgestPlaneImage(ctx, R, ringTxt, a[0], a[2], b[0], b[2], Hw * 0.62, Hw * 0.62 + 1.1, 6, (NT - 1 - i) / NT, (NT - i) / NT);
    }
    // anéis de neon na parede
    [[0.5, 'rgba(0,245,212,0.85)'], [Hw - 0.35, 'rgba(168,85,247,0.95)'], [Hw * 0.55, 'rgba(129,140,248,0.35)']].forEach(([Yy, col]) => {
      ctx.lineWidth = 2;
      ring((k) => wall(k * Math.PI * 2, Yy), 160, col);
    });
    ctx.lineWidth = 1;
    // chão: tudo abaixo da base da parede
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= 200; i++) {
      const th = Math.PI + 1.45 - (i / 200) * (Math.PI + 2.9);
      const p3 = wall(th, 0);
      if (p3[2] < minZ) continue;
      const p = P(p3[0], 0, p3[2]);
      if (first) ctx.moveTo(-W, p[1]);
      ctx.lineTo(p[0], p[1]);
      first = false;
    }
    ctx.lineTo(W * 2, P(Rad, 0, minZ)[1]);
    ctx.lineTo(W * 2, H * 2);
    ctx.lineTo(-W, H * 2);
    ctx.closePath();
    const fl = ctx.createLinearGradient(0, R.vy, 0, H);
    fl.addColorStop(0, '#0f4c48');
    fl.addColorStop(0.4, '#0a2e30');
    fl.addColorStop(1, '#03090c');
    ctx.fillStyle = fl;
    ctx.fill();
    // anéis e raios no piso (campo holográfico)
    for (let r = 3; r < Rad; r += 3) {
      ctx.lineWidth = 1;
      ring((k) => [r * Math.cos(k * Math.PI * 2), 0, Zc + r * Math.sin(k * Math.PI * 2)], 120, `rgba(0,245,212,${(0.28 - r * 0.006).toFixed(3)})`);
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ring((k) => [Math.cos(a) * Rad * k, 0, Zc + Math.sin(a) * Rad * k], 20, 'rgba(0,245,212,0.1)');
    }
    // colunas de luz saindo do piso
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    [0.3, 0.72, 1.45, 1.94, 2.39, 2.84].forEach((th, i) => {
      const X = 21 * Math.cos(th);
      const Z = Zc + 21 * Math.sin(th);
      const b = P(X, 0, Z);
      const t = P(X, Hw + 4, Z);
      const wpx = (F * 0.9) / Z;
      const col = i % 2 ? '168,85,247' : '0,245,212';
      const gr2 = ctx.createLinearGradient(0, b[1], 0, t[1]);
      gr2.addColorStop(0, `rgba(${col},0.4)`);
      gr2.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr2;
      ctx.fillRect(b[0] - wpx / 2, t[1], wpx, b[1] - t[1]);
      ctx.fillStyle = `rgba(${col},0.9)`;
      ctx.fillRect(b[0] - wpx * 0.08, t[1] + (b[1] - t[1]) * 0.3, Math.max(1, wpx * 0.16), (b[1] - t[1]) * 0.7);
      this.bgestGlowE(ctx, b[0], b[1], wpx * 1.6, wpx * 0.35, `rgb(${col})`, 0.5);
    });
    ctx.restore();
    // projetor central (deslocado para a direita da cabeça) com globo holográfico
    const PX = 6.6;
    const PZ = 34;
    const base = P(PX, 0, PZ);
    const pr = (F * 2.4) / PZ;
    ctx.fillStyle = '#0b0820';
    ctx.beginPath();
    ctx.ellipse(base[0], base[1], pr, pr * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,212,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const gc = P(PX, 6.8, PZ);
    const gr = (F * 2.3) / PZ;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(0, base[1], 0, gc[1] - gr);
    beam.addColorStop(0, 'rgba(0,245,212,0.32)');
    beam.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(base[0] - pr * 0.8, base[1]);
    ctx.lineTo(base[0] + pr * 0.8, base[1]);
    ctx.lineTo(gc[0] + gr * 1.5, gc[1] - gr);
    ctx.lineTo(gc[0] - gr * 1.5, gc[1] - gr);
    ctx.closePath();
    ctx.fill();
    this.cineGlow(ctx, gc[0], gc[1], gr * 2.4, 'rgba(0,245,212,0.3)', 0.8);
    ctx.strokeStyle = 'rgba(94,234,212,0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(gc[0], gc[1], gr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(94,234,212,0.55)';
    [0.25, 0.6, 0.88].forEach((k) => {
      ctx.beginPath();
      ctx.ellipse(gc[0], gc[1], gr * k, gr, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    [-0.6, -0.25, 0.25, 0.6].forEach((k) => {
      ctx.beginPath();
      ctx.ellipse(gc[0], gc[1] + gr * k, gr * Math.sqrt(1 - k * k), gr * 0.18 * Math.sqrt(1 - k * k), 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(192,132,252,0.75)';
    ctx.lineWidth = 1.6;
    [[1.55, 0.32, -0.25], [1.85, 0.22, 0.35]].forEach(([s, f, rot]) => {
      ctx.beginPath();
      ctx.ellipse(gc[0], gc[1], gr * s, gr * s * f, rot, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(224,231,255,0.9)';
    ctx.font = `italic 900 ${Math.round(gr * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TOP 6', gc[0], gc[1] - gr * 1.45);
    ctx.restore();
    // painéis holográficos flutuando dos dois lados
    const card = (title, seed, hue) => this.bgestCanvas(360, 230, (s, w, h) => {
      const r2 = this.bgestRng(seed);
      s.fillStyle = `rgba(${hue},0.16)`;
      s.fillRect(0, 0, w, h);
      s.strokeStyle = `rgba(${hue},0.9)`;
      s.lineWidth = 3;
      s.strokeRect(2, 2, w - 4, h - 4);
      s.fillStyle = `rgba(${hue},0.85)`;
      s.fillRect(0, 0, w, 30);
      s.fillStyle = '#05030f';
      s.font = `italic 900 19px ${FONT}`;
      s.textBaseline = 'middle';
      s.fillText(title, 12, 16);
      // silhueta de jogador em arame
      s.strokeStyle = `rgba(${hue},0.95)`;
      s.lineWidth = 2;
      const px = 74;
      s.beginPath();
      s.arc(px, 74, 16, 0, Math.PI * 2);
      s.moveTo(px - 30, 196);
      s.lineTo(px - 24, 122);
      s.quadraticCurveTo(px, 96, px + 24, 122);
      s.lineTo(px + 30, 196);
      s.stroke();
      for (let i = 0; i < 5; i++) {
        const y = 60 + i * 30;
        s.fillStyle = `rgba(${hue},0.2)`;
        s.fillRect(140, y, w - 158, 14);
        s.fillStyle = `rgba(${hue},0.9)`;
        s.fillRect(140, y, (w - 158) * (0.3 + r2() * 0.65), 14);
      }
      s.fillStyle = 'rgba(0,0,0,0.25)';
      for (let y = 0; y < h; y += 4) s.fillRect(0, y, w, 1);
    });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.9;
    this.bgestPlaneImage(ctx, R, card('RIVALRY BATTLE', 3, '0,245,212'), -15.5, 23, -11, 30.5, 2.8, 5.9, 40);
    this.bgestPlaneImage(ctx, R, card('WORLD FIVE', 7, '192,132,252'), 11.5, 30.5, 16, 23, 2.8, 5.9, 40);
    ctx.restore();
    [[-13.2, 4.3, 26.7, '0,245,212'], [13.7, 4.3, 26.7, '192,132,252']].forEach(([X, Yy, Z, col]) => {
      const p = P(X, Yy, Z);
      this.cineGlow(ctx, p[0], p[1], (F * 3.5) / Z, `rgba(${col},0.25)`, 0.8);
    });
    // números de ranking pairando
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.textAlign = 'center';
    for (let i = 0; i < 10; i++) {
      const X = (rng() - 0.5) * 40;
      const Z = 12 + rng() * 30;
      const Yy = 1 + rng() * 8;
      const p = P(X, Yy, Z);
      if (Math.abs(p[0] - cx) < W * 0.12 && p[1] > H * 0.3) continue;
      ctx.fillStyle = rng() < 0.5 ? 'rgba(0,245,212,0.4)' : 'rgba(192,132,252,0.45)';
      ctx.font = `italic 900 ${Math.round((F * 0.7) / Z)}px ${FONT}`;
      ctx.fillText(['#1', '#2', '#3', 'TOP', 'EGO', '#6', 'BL'][i % 7], p[0], p[1]);
    }
    ctx.restore();
    // brilhos e partículas de dados
    this.bgestGlowE(ctx, cx, P(0, Hw, Zc + Rad)[1], W * 0.55, H * 0.15, '#a855f7', 0.14);
    this.bgestGlowE(ctx, cx, P(0, 0, Zc + Rad)[1], W * 0.5, H * 0.05, '#00f5d4', 0.1);
    ctx.fillStyle = 'rgba(165,243,252,0.7)';
    for (let i = 0; i < 90; i++) {
      const x = rng() * W;
      const y = rng() * H * 0.8;
      if (Math.abs(x - cx) < W * 0.12 && y > H * 0.35) continue;
      ctx.globalAlpha = 0.2 + rng() * 0.6;
      ctx.fillRect(Math.round(x), Math.round(y), rng() < 0.2 ? 2 : 1, rng() < 0.2 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    // linhas de varredura
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    this.bgestFinish(ctx, W, H, { plate: c.signText, accent: '#a855f7', vig: 0.66, shade: 0.34 });
  };
})();
