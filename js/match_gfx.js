// ============================================================================
// GRÁFICO DA PARTIDA: gramado de verdade
// O campo é pintado UMA vez (por mapa) numa textura grande vista de cima: faixas de
// corte com brilho, xadrez, folhas e tufos, desgaste na boca do gol e no pênalti,
// poças de luz dos refletores e as linhas pintadas (com falhas de tinta). A cada
// quadro a textura é colada em perspectiva, em faixas finas de tela (cada linha da
// tela é uma distância do campo), então ela anda junto com a câmera.
// Se algo der errado, a partida volta sozinha para o gramado antigo (js/match_engine.js).
// ============================================================================
(function () {
  const ME = window.MatchEngine;
  if (!ME) return;
  const hexRgb = (c) => {
    const n = parseInt(String(c).replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const lift = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))));
  const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  ME.getPitchTexture = function (mapTheme, theme) {
    const touch = document.documentElement.classList.contains('is-touch');
    const k = touch ? 0.6 : 0.9; // texels por unidade do campo
    const key = `${mapTheme}|${k}|${theme.grass1}|${theme.grass2}`;
    if (this._pitchTex && this._pitchTex.key === key) return this._pitchTex;
    const hx = this.PITCH_HALF_X;
    const hy = this.PITCH_HALF_Y;
    const X0 = -hx - 90;
    const X1 = hx + 90;
    const Y0 = -hy - 34;
    const Y1 = hy + 34;
    const w = Math.round((X1 - X0) * k);
    const h = Math.round((Y1 - Y0) * k);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const world = () => g.setTransform(k, 0, 0, k, -X0 * k, -Y0 * k);
    world();
    const c1 = hexRgb(theme.grass1);
    const c2 = hexRgb(theme.grass2);
    // 1) faixas de corte (28 no comprimento) com o brilho do corte de um lado
    const sw = (hx * 2) / 28;
    for (let i = -1; i < 29; i++) {
      const x = -hx + i * sw;
      const base = Math.abs(i) % 2 ? c2 : c1;
      const gr = g.createLinearGradient(x, 0, x + sw, 0);
      gr.addColorStop(0, css(lift(base, 0.07)));
      gr.addColorStop(0.5, css(base));
      gr.addColorStop(1, css(lift(base, -0.05)));
      g.fillStyle = gr;
      g.fillRect(x, Y0, sw + 0.6, Y1 - Y0);
    }
    // 2) xadrez (faixas na largura também)
    const bandH = (hy * 2 + 60) / 8;
    g.fillStyle = 'rgba(255,255,255,0.04)';
    for (let j = 0; j < 8; j += 2) g.fillRect(X0, -hy - 30 + j * bandH, X1 - X0, bandH);
    // 3) poças de luz dos refletores (no chão, andam com a câmera)
    [[-hx * 0.55, -hy * 0.55], [hx * 0.55, -hy * 0.55], [-hx * 0.55, hy * 0.6], [hx * 0.55, hy * 0.6], [0, 0]].forEach(([x, y], i) => {
      const r = i === 4 ? 520 : 760;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(255,255,235,${i === 4 ? 0.05 : 0.08})`);
      gr.addColorStop(1, 'rgba(255,255,235,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    });
    // 4) desgaste: terra aparecendo na boca do gol, no pênalti e no meio
    const wear = (x, y, rx, ry, a) => {
      g.save();
      g.translate(x, y);
      g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, `rgba(122,98,58,${a})`);
      gr.addColorStop(0.6, `rgba(110,92,52,${a * 0.45})`);
      gr.addColorStop(1, 'rgba(110,92,52,0)');
      g.fillStyle = gr;
      g.fillRect(-rx, -rx, rx * 2, rx * 2);
      g.restore();
    };
    [-1, 1].forEach((s) => {
      wear(s * (hx - 45), 0, 150, 120, 0.3);
      wear(s * (hx - 190), 0, 46, 36, 0.32);
      wear(s * (hx - 330), 0, 230, 170, 0.08);
    });
    wear(0, 0, 90, 70, 0.12);
    // 5) tufos (manchas grandes, claras e escuras)
    g.setTransform(1, 0, 0, 1, 0, 0);
    const nw = Math.ceil(w / 22);
    const nh = Math.ceil(h / 22);
    const nc = document.createElement('canvas');
    nc.width = nw;
    nc.height = nh;
    const ng = nc.getContext('2d');
    const nd = ng.createImageData(nw, nh);
    let s = 1337;
    const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
    for (let i = 0; i < nw * nh; i++) {
      const v = 96 + rnd() * 64;
      nd.data[i * 4] = nd.data[i * 4 + 1] = nd.data[i * 4 + 2] = v;
      nd.data[i * 4 + 3] = 255;
    }
    ng.putImageData(nd, 0, 0);
    g.save();
    g.imageSmoothingEnabled = true;
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = 0.5;
    g.drawImage(nc, 0, 0, w, h);
    g.restore();
    // 6) grão fino e folhas (riscos de 2-3 px, claros e escuros)
    const id = g.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0, n = w * h; i < n; i++) {
      const v = ((rnd() - 0.5) * 14) | 0;
      const j = i * 4;
      d[j] += v;
      d[j + 1] += v * 1.25;
      d[j + 2] += v * 0.8;
    }
    const blades = Math.round(w * h * 0.03);
    for (let b = 0; b < blades; b++) {
      const x = (rnd() * w) | 0;
      const y = (rnd() * (h - 3)) | 0;
      const v = rnd() < 0.55 ? 16 : -14;
      const len = 2 + ((rnd() * 2) | 0);
      for (let t = 0; t < len; t++) {
        const j = ((y + t) * w + x) * 4;
        d[j] += v * 0.8;
        d[j + 1] += v;
        d[j + 2] += v * 0.6;
      }
    }
    g.putImageData(id, 0, 0);
    // 7) linhas pintadas: numa camada à parte, com falhas de tinta, coladas por cima
    const lc = document.createElement('canvas');
    lc.width = w;
    lc.height = h;
    const l = lc.getContext('2d');
    l.setTransform(k, 0, 0, k, -X0 * k, -Y0 * k);
    l.strokeStyle = '#ffffff';
    l.fillStyle = '#ffffff';
    l.lineWidth = 3.6;
    l.lineJoin = 'miter';
    const rect = (x1, y1, x2, y2) => l.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    rect(-hx, -hy, hx, hy);
    l.beginPath();
    l.moveTo(0, -hy);
    l.lineTo(0, hy);
    l.stroke();
    l.beginPath();
    l.ellipse(0, 0, 100, 66, 0, 0, Math.PI * 2);
    l.stroke();
    l.beginPath();
    l.ellipse(0, 0, 5, 3.6, 0, 0, Math.PI * 2);
    l.fill();
    [-1, 1].forEach((sd) => {
      rect(sd * hx, -210, sd * (hx - 280), 210);
      rect(sd * hx, -110, sd * (hx - 100), 110);
      const spot = sd * (hx - 190);
      l.beginPath();
      l.ellipse(spot, 0, 5, 3.6, 0, 0, Math.PI * 2);
      l.fill();
      // meia-lua: só a parte do círculo do pênalti fora da grande área
      l.beginPath();
      let first = true;
      for (let a = -1.25; a <= 1.25; a += 0.02) {
        const x = spot - sd * Math.cos(a) * 130;
        if (sd * x >= hx - 280) {
          first = true;
          continue;
        }
        if (first) l.moveTo(x, Math.sin(a) * 130);
        else l.lineTo(x, Math.sin(a) * 130);
        first = false;
      }
      l.stroke();
      [-1, 1].forEach((t) => {
        l.beginPath();
        l.arc(sd * hx, t * hy, 26, sd > 0 ? (t > 0 ? Math.PI : Math.PI / 2) : t > 0 ? Math.PI * 1.5 : 0, sd > 0 ? (t > 0 ? Math.PI * 1.5 : Math.PI) : t > 0 ? Math.PI * 2 : Math.PI / 2);
        l.stroke();
      });
    });
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'destination-out';
    for (let i = 0, n = Math.round(w * h * 0.004); i < n; i++) l.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 1 + ((rnd() * 2) | 0), 1);
    g.globalAlpha = 0.9;
    g.drawImage(lc, 0, 0);
    g.globalAlpha = 1;
    this._pitchTex = { key, cv, k, X0, X1, Y0, Y1, w, h };
    return this._pitchTex;
  };

  // cola o gramado em perspectiva: cada faixa de tela é uma distância do campo
  ME.drawPitchTextured = function (ctx, W, H, horizonY, theme) {
    if (this._noPitchTex) return false;
    let T;
    try {
      T = this.getPitchTexture(this.chapter?.mapTheme, theme);
    } catch (e) {
      console.warn('[match_gfx] gramado antigo:', e);
      this._noPitchTex = true;
      return false;
    }
    // celular lento (desenho sem placa de vídeo): passa a colar sem suavizar, que custa o
    // mesmo que o gramado antigo; volta a suavizar se não for preciso
    const now = performance.now();
    if (this._pitchT) {
      const dt = Math.min(100, now - this._pitchT);
      this._pitchAvg = this._pitchAvg === undefined ? dt : this._pitchAvg * 0.96 + dt * 0.04;
      this._pitchN = (this._pitchN || 0) + 1;
      if (this._pitchN > 90 && !this.pitchNearest && this._pitchAvg > 22) {
        this.pitchNearest = true;
        this._pitchN = 0;
        this._pitchAvg = undefined;
      }
    }
    this._pitchT = now;
    const pitchH = H - horizonY - 24;
    const camX = this.camera.x;
    const camY = this.camera.y * 0.35;
    const rowToWy = (y) => ((y - horizonY) / pitchH) * 700 - 350 + camY;
    const wyToRow = (wy) => horizonY + ((wy - camY + 350) / 700) * pitchH;
    const yTop = Math.max(0, Math.floor(wyToRow(T.Y0)));
    const yBot = Math.min(H, Math.ceil(wyToRow(T.Y1)));
    ctx.save();
    ctx.imageSmoothingEnabled = !this.pitchNearest;
    // faixas de 3 px (celular: 6 px, metade das colagens; a diferença não aparece)
    const band = this.pitchBand || (document.documentElement.classList.contains("is-touch") ? 6 : 3);
    for (let y = yTop; y < yBot; y += band) {
      const y2 = Math.min(yBot, y + band);
      const tm = ((y + y2) / 2 - horizonY) / pitchH;
      const sc = Math.max(0.55, Math.min(1.42, 0.74 + tm * 0.5)) * 0.96;
      let wxL = camX - W / 2 / sc;
      let wxR = camX + W / 2 / sc;
      if (wxL < T.X0) wxL = T.X0;
      if (wxR > T.X1) wxR = T.X1;
      if (wxR <= wxL) continue;
      const yEnd = Math.min(yBot, y2 + 0.7);
      let syA = (rowToWy(y) - T.Y0) * T.k;
      let syB = (rowToWy(yEnd) - T.Y0) * T.k;
      if (syA < 0) syA = 0;
      if (syB > T.h) syB = T.h;
      if (syB <= syA) continue;
      ctx.drawImage(T.cv, (wxL - T.X0) * T.k, syA, (wxR - wxL) * T.k, syB - syA, W / 2 + (wxL - camX) * sc, y, (wxR - wxL) * sc, yEnd - y);
    }
    ctx.restore();
    return true;
  };
})();
