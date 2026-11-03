// Fundos dos diálogos (bg_mundo): CutsceneEngine.VN_BG[tema] = function (ctx, W, H) { ... }
window.CutsceneEngine.VN_BG = window.CutsceneEngine.VN_BG || {};

// Cenários "do mundo" (fora do Blue Lock), pintados uma vez quando a cena muda:
//   night_home    quarto à noite com a janela para o bairro (ligações do Tada, prólogo, final)
//   spain_cafe    café em Barcelona, rua ensolarada e o estádio do Barcha no fim da rua
//   clasico_night o clássico Barcha x Re Al visto da arquibancada
//   paris_gala    teatro da gala da Bola de Ouro em Paris
//   hotel_night   quarto do hotel da seleção, varanda e a cidade acesa
//   rain_street   rua de casa, chuva fina, poste aceso (o desafio do Rin)
// Composição: o personagem fica grande no centro-baixo e a caixa de diálogo cobre o
// rodapé; os marcos ficam no alto e nas laterais. Tudo relativo a W/H e determinístico.
(function () {
  const CE = window.CutsceneEngine;

  // ======================================================================= utilitários
  Object.assign(CE, {
    // Sorteio com semente (mulberry32): o fundo sai sempre igual
    bgmuRng(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    bgmuLin(ctx, x0, y0, x1, y1, stops) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([o, c]) => g.addColorStop(o, c));
      return g;
    },
    bgmuRad(ctx, x, y, r0, r1, stops) {
      const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
      stops.forEach(([o, c]) => g.addColorStop(o, c));
      return g;
    },
    bgmuRect(ctx, style, x, y, w, h) {
      ctx.fillStyle = style;
      ctx.fillRect(x, y, w, h);
    },
    bgmuPoly(ctx, pts, style) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = style;
      ctx.fill();
    },
    bgmuLine(ctx, x0, y0, x1, y1, style, lw) {
      ctx.strokeStyle = style;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    },
    // Fio caído entre dois pontos (fios de poste, varais, cabos)
    bgmuWire(ctx, x0, y0, x1, y1, sag, style, lw) {
      ctx.strokeStyle = style;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1);
      ctx.stroke();
    },
    bgmuText(ctx, text, x, y, size, color, align = 'center', weight = '900', family = 'Arial, sans-serif') {
      ctx.font = `${weight} ${Math.max(6, Math.round(size))}px ${family}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    },
    bgmuStars(ctx, x, y, w, h, n, R, alpha = 0.9) {
      for (let i = 0; i < n; i++) {
        const sx = x + R() * w;
        const sy = y + Math.pow(R(), 1.5) * h;
        const b = R();
        ctx.fillStyle = `rgba(${b > 0.7 ? '255,244,214' : '220,230,255'},${(0.25 + b * 0.75) * alpha})`;
        const s = b > 0.93 ? 2 : b > 0.6 ? 1.4 : 1;
        ctx.fillRect(sx, sy, s, s);
        if (b > 0.965) {
          ctx.fillStyle = `rgba(220,232,255,${0.35 * alpha})`;
          ctx.fillRect(sx - 3, sy + 0.5, 8, 1);
          ctx.fillRect(sx + 0.5, sy - 3, 1, 8);
        }
      }
    },
    bgmuMoon(ctx, x, y, r) {
      this.cineGlow(ctx, x, y, r * 7, 'rgba(120,160,255,0.28)');
      this.cineGlow(ctx, x, y, r * 2.6, 'rgba(210,225,255,0.55)');
      ctx.fillStyle = this.bgmuRad(ctx, x - r * 0.3, y - r * 0.3, r * 0.1, r * 1.1, [[0, '#fffdf2'], [0.7, '#eef1f8'], [1, '#c9d4ea']]);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,165,200,0.28)';
      [[-0.32, -0.18, 0.26], [0.22, 0.12, 0.18], [-0.05, 0.38, 0.14], [0.35, -0.35, 0.1]].forEach(([dx, dy, s]) => {
        ctx.beginPath();
        ctx.arc(x + dx * r, y + dy * r, s * r, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    // Nuvem comprida: bolhas sobrepostas, com a borda de cima iluminada (rim)
    bgmuCloud(ctx, x, y, w, h, R, body, rim, lift = 0.12) {
      const n = 7 + Math.floor(R() * 5);
      const blobs = [];
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1);
        const bw = w * (0.12 + R() * 0.16);
        const bh = h * (0.5 + Math.sin(f * Math.PI) * 0.6 + R() * 0.3);
        blobs.push([x + f * w, y - bh * 0.3, bw, bh]);
      }
      if (rim) {
        ctx.fillStyle = rim;
        blobs.forEach(([bx, by, bw, bh]) => {
          ctx.beginPath();
          ctx.ellipse(bx, by - h * lift, bw, bh, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.fillStyle = body;
      blobs.forEach(([bx, by, bw, bh]) => {
        ctx.beginPath();
        ctx.ellipse(bx, by, bw, bh, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    // Fileira de prédios em silhueta com janelas acesas
    bgmuSkyline(ctx, x0, x1, baseY, o, R) {
      let x = x0 - R() * o.wMax;
      const tops = [];
      while (x < x1) {
        const bw = o.wMin + R() * (o.wMax - o.wMin);
        const bh = o.hMin + Math.pow(R(), 1.6) * (o.hMax - o.hMin);
        const top = baseY - bh;
        ctx.fillStyle = o.body;
        ctx.fillRect(x, top, bw, bh + 1);
        if (o.side) {
          ctx.fillStyle = o.side;
          ctx.fillRect(x + bw * 0.7, top, bw * 0.3, bh + 1);
        }
        if (o.roof && R() < 0.5) {
          ctx.fillStyle = o.body;
          if (R() < 0.5) ctx.fillRect(x + bw * 0.2, top - bh * 0.06, bw * 0.35, bh * 0.06 + 1);
          else ctx.fillRect(x + bw * 0.5, top - bh * 0.22, Math.max(1, bw * 0.03), bh * 0.22);
        }
        if (o.rim) {
          ctx.fillStyle = o.rim;
          ctx.fillRect(x, top, Math.max(1, bw * 0.06), bh);
          ctx.fillRect(x, top, bw, 1);
        }
        if (o.wins) {
          const cols = Math.max(1, Math.floor((bw - o.gapX) / (o.winW + o.gapX)));
          const offX = (bw - cols * (o.winW + o.gapX) + o.gapX) / 2;
          const lit = o.winP * (0.4 + R() * 1.2);
          for (let wy = top + o.gapY * 1.5; wy < baseY - o.winH - o.gapY; wy += o.winH + o.gapY) {
            for (let c = 0; c < cols; c++) {
              if (R() < lit) {
                ctx.fillStyle = o.wins[Math.floor(R() * o.wins.length)];
                ctx.fillRect(x + offX + c * (o.winW + o.gapX), wy, o.winW, o.winH);
              }
            }
          }
        }
        tops.push([x + bw / 2, top, bh]);
        if (o.beacon && bh > o.hMin + (o.hMax - o.hMin) * 0.55 && R() < 0.7) {
          this.cineGlow(ctx, x + bw / 2, top - 2, Math.max(4, o.winH * 4), 'rgba(255,70,70,0.9)');
          ctx.fillStyle = '#ff6b6b';
          ctx.fillRect(x + bw / 2 - 1, top - 3, 2, 2);
        }
        x += bw + (o.gap || 0);
      }
      return tops;
    },
    // Riscos de chuva (estáticos) com espessura/comprimento por profundidade
    bgmuRain(ctx, x, y, w, h, n, R, o = {}) {
      const { len = 30, slant = 0.18, color = '200,220,255', alpha = 0.3, lw = 1 } = o;
      ctx.save();
      ctx.lineCap = 'round';
      for (let pass = 0; pass < 3; pass++) {
        const depth = 0.45 + pass * 0.35;
        ctx.strokeStyle = `rgba(${color},${alpha * depth})`;
        ctx.lineWidth = lw * depth;
        ctx.beginPath();
        for (let i = 0; i < n / 3; i++) {
          const rx = x + R() * w;
          const ry = y + R() * h;
          const l = len * depth * (0.6 + R() * 0.6);
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - l * slant, ry + l);
        }
        ctx.stroke();
      }
      ctx.restore();
    },
    bgmuVignette(ctx, W, H, a = 0.6, color = '0,0,0', cy = 0.45) {
      ctx.fillStyle = this.bgmuRad(ctx, W / 2, H * cy, Math.min(W, H) * 0.35, Math.hypot(W, H) * 0.62, [[0, `rgba(${color},0)`], [1, `rgba(${color},${a})`]]);
      ctx.fillRect(0, 0, W, H);
    },
    // Partículas de poeira/brilho paradas no ar
    bgmuMotes(ctx, x, y, w, h, n, R, color, size = 2) {
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const s = size * (0.4 + R());
        ctx.globalAlpha = 0.25 + R() * 0.75;
        ctx.fillRect(x + R() * w, y + R() * h, s, s);
      }
      ctx.globalAlpha = 1;
    },
    // Casinhas japonesas (telhado de duas águas) com janelas acesas
    bgmuHouses(ctx, x0, x1, baseY, hh, k, R, o) {
      let x = x0;
      while (x < x1) {
        const hw = hh * (1.2 + R() * 0.9);
        const two = R() < 0.6;
        const wallH = hh * (two ? 0.78 : 0.5);
        const rh = hh * (0.22 + R() * 0.1);
        const ov = hw * 0.07;
        const top = baseY - wallH;
        ctx.fillStyle = o.body;
        ctx.fillRect(x, top, hw, wallH + 1);
        ctx.fillStyle = o.shade;
        ctx.fillRect(x + hw * 0.8, top, hw * 0.2, wallH + 1);
        // Janelas: algumas acesas (quente), uma ou outra com luz de TV
        const rows = two ? 2 : 1;
        for (let r = 0; r < rows; r++) {
          const wy = top + wallH * (0.14 + r * 0.46);
          const wH = wallH * (two ? 0.24 : 0.36);
          const nw = 1 + Math.floor(R() * 3);
          for (let c = 0; c < nw; c++) {
            const wW = hw * 0.18;
            const wx = x + hw * 0.1 + c * (hw * 0.8 / nw) + (hw * 0.8 / nw - wW) / 2;
            const roll = R();
            if (roll < o.lit) {
              const tv = roll < o.lit * 0.15;
              const col = tv ? '#9cc4ff' : ['#ffd38a', '#ffc46b', '#ffe2a8'][Math.floor(R() * 3)];
              ctx.fillStyle = col;
              ctx.fillRect(wx, wy, wW, wH);
              ctx.fillStyle = tv ? 'rgba(40,70,160,0.45)' : 'rgba(150,70,30,0.35)';
              ctx.fillRect(wx, wy, wW * (0.3 + R() * 0.3), wH);
              ctx.fillStyle = 'rgba(0,0,0,0.35)';
              ctx.fillRect(wx + wW / 2 - 0.5, wy, 1, wH);
              this.cineGlow(ctx, wx + wW / 2, wy + wH / 2, wW * 1.6, tv ? 'rgba(120,170,255,0.5)' : 'rgba(255,190,100,0.55)', o.glow ?? 1);
            } else {
              ctx.fillStyle = o.dark;
              ctx.fillRect(wx, wy, wW, wH);
            }
          }
        }
        // Telhado
        this.bgmuPoly(ctx, [[x - ov, top + 1], [x + hw * 0.22, top - rh], [x + hw * 0.78, top - rh], [x + hw + ov, top + 1]], o.roof);
        ctx.strokeStyle = o.rim;
        ctx.lineWidth = Math.max(1, 1.3 * k);
        ctx.beginPath();
        ctx.moveTo(x - ov, top + 1);
        ctx.lineTo(x + hw * 0.22, top - rh);
        ctx.lineTo(x + hw * 0.78, top - rh);
        ctx.stroke();
        // Telhas
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let ty = top - rh + rh * 0.25; ty < top; ty += rh * 0.25) {
          const f = (ty - (top - rh)) / rh;
          ctx.moveTo(x + hw * 0.22 - (hw * 0.22 + ov) * f, ty);
          ctx.lineTo(x + hw * 0.78 + (hw * 0.22 + ov) * f, ty);
        }
        ctx.stroke();
        // Caixa de ar-condicionado em algumas
        if (R() < 0.35) {
          ctx.fillStyle = o.shade;
          ctx.fillRect(x + hw * 0.62, top + wallH * 0.55, hw * 0.16, wallH * 0.14);
        }
        x += hw + hh * (0.05 + R() * 0.25);
      }
      // Muro de blocos na frente
      if (o.wall) {
        ctx.fillStyle = o.wall;
        ctx.fillRect(x0, baseY - hh * 0.2, x1 - x0, hh * 0.2 + 1);
        ctx.fillStyle = o.rim;
        ctx.fillRect(x0, baseY - hh * 0.2, x1 - x0, Math.max(1, k));
      }
    }
  });

  // ============================================================== night_home
  // Seu quarto de madrugada: janela grande com a lua, fios de poste e o bairro acordado,
  // escrivaninha com o envelope preto do Blue Lock e o celular aceso (as ligações do Tada)
  CE.bgmuNightView = function (ctx, x, y, w, h, k, R) {
    ctx.fillStyle = this.bgmuLin(ctx, 0, y, 0, y + h, [[0, '#030817'], [0.38, '#0b1b47'], [0.62, '#1f3576'], [0.76, '#3f4c92'], [0.86, '#26306a'], [1, '#121a40']]);
    ctx.fillRect(x, y, w, h);
    this.bgmuStars(ctx, x, y, w, h * 0.62, Math.round((w * h) / 2200), R);
    const mx = x + w * 0.76;
    const my = y + h * 0.2;
    const mr = Math.max(9, h * 0.075);
    this.bgmuMoon(ctx, mx, my, mr);
    // Nuvens finas passando pela lua
    this.bgmuCloud(ctx, x + w * 0.5, y + h * 0.29, w * 0.46, h * 0.045, R, 'rgba(20,32,76,0.93)', 'rgba(200,215,255,0.45)');
    this.bgmuCloud(ctx, x - w * 0.06, y + h * 0.45, w * 0.42, h * 0.04, R, 'rgba(30,44,98,0.9)', 'rgba(150,175,240,0.28)');
    this.bgmuCloud(ctx, x + w * 0.62, y + h * 0.5, w * 0.4, h * 0.035, R, 'rgba(38,52,110,0.85)', 'rgba(170,160,235,0.25)');
    // Brilho da cidade no horizonte
    const hz = y + h * 0.74;
    ctx.fillStyle = this.bgmuLin(ctx, 0, hz - h * 0.3, 0, hz, [[0, 'rgba(140,110,220,0)'], [1, 'rgba(170,130,230,0.4)']]);
    ctx.fillRect(x, hz - h * 0.3, w, h * 0.3);
    // Torre de TV ao longe
    const tx = x + w * 0.36;
    const th = h * 0.36;
    this.bgmuPoly(ctx, [[tx - w * 0.012, hz], [tx - 1.2 * k, hz - th], [tx + 1.2 * k, hz - th], [tx + w * 0.012, hz]], '#1c2558');
    ctx.fillStyle = '#1c2558';
    ctx.fillRect(tx - w * 0.01, hz - th * 0.62, w * 0.02, th * 0.05);
    ctx.fillStyle = 'rgba(255,220,170,0.7)';
    ctx.fillRect(tx - w * 0.008, hz - th * 0.6, w * 0.016, Math.max(1, k));
    this.cineGlow(ctx, tx, hz - th, 7 * k, 'rgba(255,60,60,0.95)');
    this.cineGlow(ctx, tx, hz - th * 0.6, 6 * k, 'rgba(255,60,60,0.7)');
    // Cidade ao longe (azulada) + névoa
    this.bgmuSkyline(ctx, x, x + w, hz, { hMin: h * 0.03, hMax: h * 0.17, wMin: w * 0.025, wMax: w * 0.065, body: '#1a2457', side: '#151d49', rim: 'rgba(170,190,255,0.12)', wins: ['rgba(255,214,150,0.6)', 'rgba(190,215,255,0.5)'], winP: 0.22, winW: 1.6 * k, winH: 1.6 * k, gapX: 2.4 * k, gapY: 2.6 * k, beacon: true, roof: true }, R);
    ctx.fillStyle = this.bgmuLin(ctx, 0, hz - h * 0.12, 0, hz + h * 0.04, [[0, 'rgba(90,90,170,0)'], [1, 'rgba(110,100,190,0.45)']]);
    ctx.fillRect(x, hz - h * 0.12, w, h * 0.16);
    // Bairro: casas mais longe e mais perto
    this.bgmuHouses(ctx, x - w * 0.04, x + w * 1.04, y + h * 0.86, h * 0.13, k, R, { body: '#18204a', shade: '#121940', roof: '#0f1535', rim: 'rgba(170,195,255,0.35)', dark: 'rgba(40,52,105,0.9)', lit: 0.4, glow: 0.6 });
    ctx.fillStyle = 'rgba(70,80,160,0.18)';
    ctx.fillRect(x, y + h * 0.7, w, h * 0.3);
    this.bgmuHouses(ctx, x - w * 0.08, x + w * 1.08, y + h * 1.04, h * 0.25, k, R, { body: '#0f1534', shade: '#0b102a', roof: '#080c22', rim: 'rgba(185,205,255,0.5)', dark: 'rgba(28,38,82,0.95)', lit: 0.45, wall: '#0b1029' });
    // Postes e fios atravessando a janela (o clássico do anime)
    const p1 = x + w * 0.14;
    const p2 = x + w * 0.93;
    const pole = (px, top, bot, pw, arm) => {
      ctx.fillStyle = '#060a18';
      ctx.fillRect(px - pw / 2, top, pw, bot - top);
      ctx.fillStyle = 'rgba(170,195,255,0.35)';
      ctx.fillRect(px + pw / 2 - Math.max(1, pw * 0.2), top, Math.max(1, pw * 0.2), bot - top);
      ctx.fillStyle = '#060a18';
      ctx.fillRect(px - arm, top + (bot - top) * 0.06, arm * 2, pw * 0.7);
      ctx.fillRect(px - arm * 0.8, top + (bot - top) * 0.15, arm * 1.6, pw * 0.6);
      // Transformador
      ctx.fillRect(px + pw * 0.4, top + (bot - top) * 0.24, pw * 1.6, (bot - top) * 0.07);
      ctx.fillStyle = 'rgba(170,195,255,0.25)';
      ctx.fillRect(px + pw * 1.7, top + (bot - top) * 0.24, Math.max(1, pw * 0.25), (bot - top) * 0.07);
      ctx.fillStyle = '#9fb4e6';
      [-1, -0.45, 0.45, 1].forEach((f) => ctx.fillRect(px + arm * f - 1, top + (bot - top) * 0.06 - 2, 2, 2));
    };
    pole(p1, y - h * 0.05, y + h * 1.1, 7 * k, w * 0.07);
    pole(p2, y + h * 0.22, y + h * 1.0, 3.5 * k, w * 0.035);
    const a1 = y - h * 0.05 + h * 1.15 * 0.06;
    const a2 = y + h * 0.22 + h * 0.78 * 0.06;
    const b1 = y - h * 0.05 + h * 1.15 * 0.15;
    const b2 = y + h * 0.22 + h * 0.78 * 0.15;
    [[-1, -1], [-0.45, -0.45], [0.45, 0.45], [1, 1]].forEach(([f1, f2], i) => {
      this.bgmuWire(ctx, p1 + w * 0.07 * f1, a1, p2 + w * 0.035 * f2, a2, h * (0.05 + i * 0.012), 'rgba(4,6,16,0.95)', Math.max(1, 1.3 * k));
      this.bgmuWire(ctx, x - w * 0.05, a1 + h * 0.02 * i, p1 + w * 0.07 * f1, a1, h * 0.02, 'rgba(4,6,16,0.95)', Math.max(1, 1.3 * k));
    });
    this.bgmuWire(ctx, p1 - w * 0.056, b1, p2 - w * 0.028, b2, h * 0.07, 'rgba(4,6,16,0.9)', Math.max(1, 2 * k));
    this.bgmuWire(ctx, p2 + w * 0.03, a2, x + w * 1.05, a2 + h * 0.05, h * 0.02, 'rgba(4,6,16,0.9)', Math.max(1, k));
  };

  CE.bgmuNightHome = function (ctx, W, H) {
    const k = H / 620;
    const R = this.bgmuRng(1207);
    const ceil = H * 0.045;
    const floorY = H * 0.8;
    // Parede do quarto (azul da lua) com papel listrado bem sutil
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, 0, 0, H, [[0, '#18223f'], [0.5, '#121a36'], [1, '#0b1024']]), 0, 0, W, H);
    ctx.fillStyle = 'rgba(160,185,255,0.03)';
    for (let x = 0; x < W; x += 24 * k) ctx.fillRect(x, ceil, 10 * k, floorY - ceil);
    // Teto e sanca
    this.bgmuRect(ctx, '#0a0f22', 0, 0, W, ceil);
    this.bgmuRect(ctx, 'rgba(150,175,240,0.16)', 0, ceil, W, Math.max(1, 2 * k));
    this.bgmuRect(ctx, 'rgba(0,0,0,0.3)', 0, ceil + 2 * k, W, 4 * k);
    // Canto da parede da esquerda (profundidade)
    const cx = W * 0.045;
    this.bgmuPoly(ctx, [[0, 0], [cx, ceil], [cx, floorY], [0, H]], this.bgmuLin(ctx, 0, 0, cx, 0, [[0, '#070b19'], [1, '#0e1430']]));
    this.bgmuLine(ctx, cx, ceil, cx, floorY, 'rgba(150,175,240,0.08)', 1);

    // Janela
    const wx0 = W * 0.55;
    const wx1 = W * 0.955;
    const wy0 = H * 0.1;
    const wy1 = H * 0.64;
    const ww = wx1 - wx0;
    const wh = wy1 - wy0;
    // Luz fria da lua espalhada na parede em volta da janela
    this.cineGlow(ctx, wx0 + ww * 0.5, wy0 + wh * 0.5, ww * 0.95, 'rgba(70,110,220,0.4)');
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx0, wy0, ww, wh);
    ctx.clip();
    this.bgmuNightView(ctx, wx0, wy0, ww, wh, k, R);
    // Reflexo no vidro
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(160,190,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(wx0 + ww * 0.08, wy0);
    ctx.lineTo(wx0 + ww * 0.2, wy0);
    ctx.lineTo(wx0 + ww * 0.02, wy1);
    ctx.lineTo(wx0 - ww * 0.1, wy1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(wx0 + ww * 0.6, wy0);
    ctx.lineTo(wx0 + ww * 0.64, wy0);
    ctx.lineTo(wx0 + ww * 0.46, wy1);
    ctx.lineTo(wx0 + ww * 0.42, wy1);
    ctx.fill();
    ctx.restore();
    // Caixilho de correr (alumínio escuro)
    const fw = Math.max(4, 9 * k);
    ctx.strokeStyle = '#1b2344';
    ctx.lineWidth = fw;
    ctx.strokeRect(wx0, wy0, ww, wh);
    ctx.strokeStyle = 'rgba(160,185,245,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(wx0 - fw / 2, wy0 - fw / 2, ww + fw, wh + fw);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(wx0 + fw / 2, wy0 + fw / 2, ww - fw, wh - fw);
    this.bgmuRect(ctx, '#1b2344', wx0 + ww * 0.5 - fw * 0.7, wy0, fw * 1.4, wh);
    this.bgmuRect(ctx, 'rgba(170,195,255,0.3)', wx0 + ww * 0.5 + fw * 0.7 - 1, wy0, 1, wh);
    // Trinco
    this.bgmuRect(ctx, '#8ea3d6', wx0 + ww * 0.5 - fw * 0.9, wy0 + wh * 0.45, fw * 0.5, fw * 1.4);
    // Peitoril com o despertador (02:47), um cacto e o troféu do colégio
    const sy = wy1 + fw / 2;
    this.bgmuRect(ctx, '#222b52', wx0 - 16 * k, sy, ww + 32 * k, 9 * k);
    this.bgmuRect(ctx, 'rgba(180,200,255,0.4)', wx0 - 16 * k, sy, ww + 32 * k, Math.max(1, k));
    this.bgmuRect(ctx, 'rgba(0,0,0,0.45)', wx0 - 16 * k, sy + 9 * k, ww + 32 * k, 5 * k);
    const ckx = wx0 + ww * 0.62;
    this.bgmuRect(ctx, '#0c1124', ckx, sy - 16 * k, 34 * k, 16 * k);
    this.cineGlow(ctx, ckx + 17 * k, sy - 8 * k, 26 * k, 'rgba(0,245,212,0.5)');
    this.bgmuText(ctx, '02:47', ckx + 17 * k, sy - 8 * k, 10 * k, '#5ff5e0', 'center', '700', 'monospace');
    const ctx2 = wx0 + ww * 0.12;
    this.bgmuPoly(ctx, [[ctx2, sy], [ctx2 + 3 * k, sy - 12 * k], [ctx2 + 17 * k, sy - 12 * k], [ctx2 + 20 * k, sy]], '#5b3a2e');
    this.bgmuRect(ctx, '#1f4d3a', ctx2 + 7 * k, sy - 30 * k, 7 * k, 18 * k);
    this.bgmuRect(ctx, '#1f4d3a', ctx2 + 2 * k, sy - 24 * k, 5 * k, 3 * k);
    this.bgmuRect(ctx, '#1f4d3a', ctx2 + 2 * k, sy - 28 * k, 3 * k, 6 * k);
    this.bgmuRect(ctx, 'rgba(180,210,255,0.35)', ctx2 + 13 * k, sy - 30 * k, Math.max(1, k), 18 * k);
    const tr = wx0 + ww * 0.84;
    ctx.fillStyle = this.bgmuLin(ctx, tr, 0, tr + 18 * k, 0, [[0, '#6b5a2a'], [0.6, '#d8b75a'], [1, '#7a6326']]);
    ctx.fillRect(tr + 5 * k, sy - 8 * k, 8 * k, 8 * k);
    ctx.fillRect(tr + 8 * k, sy - 16 * k, 2 * k, 8 * k);
    ctx.beginPath();
    ctx.moveTo(tr, sy - 30 * k);
    ctx.lineTo(tr + 18 * k, sy - 30 * k);
    ctx.quadraticCurveTo(tr + 17 * k, sy - 16 * k, tr + 9 * k, sy - 15 * k);
    ctx.quadraticCurveTo(tr + 1 * k, sy - 16 * k, tr, sy - 30 * k);
    ctx.fill();

    // Cortinas (dobras iluminadas pela lua) e varão
    const curtain = (x0, x1, flip) => {
      const top = wy0 - 20 * k;
      const bot = wy1 + 40 * k;
      const folds = 5;
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      for (let i = 0; i <= folds * 2; i++) {
        const f = i / (folds * 2);
        const lit = flip ? 1 - f : f;
        const base = i % 2 ? [28, 40, 82] : [58, 80, 150];
        const m = 0.65 + lit * 0.45;
        g.addColorStop(f, `rgb(${Math.round(base[0] * m)},${Math.round(base[1] * m)},${Math.round(base[2] * m)})`);
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, top);
      ctx.lineTo(x1, top);
      const span = x1 - x0;
      ctx.lineTo(x1 + (flip ? -span * 0.08 : span * 0.05), bot);
      for (let i = folds; i >= 0; i--) {
        const fx = x0 + (span * i) / folds + (flip ? -span * 0.08 : span * 0.05) * (i / folds);
        ctx.lineTo(fx, bot + (i % 2 ? 6 * k : 0));
      }
      ctx.closePath();
      ctx.fill();
      // Faixa amarrando a cortina
      this.bgmuRect(ctx, 'rgba(15,22,48,0.85)', x0, wy0 + wh * 0.62, span, 6 * k);
    };
    curtain(wx0 - 34 * k, wx0 + ww * 0.08, false);
    curtain(wx1 - ww * 0.09, wx1 + 30 * k, true);
    this.bgmuRect(ctx, '#2a3460', wx0 - 50 * k, wy0 - 26 * k, ww + 100 * k, 5 * k);
    this.bgmuRect(ctx, 'rgba(190,210,255,0.45)', wx0 - 50 * k, wy0 - 26 * k, ww + 100 * k, Math.max(1, k));
    [wx0 - 52 * k, wx1 + 46 * k].forEach((fx) => {
      ctx.fillStyle = '#2a3460';
      ctx.beginPath();
      ctx.arc(fx + 3 * k, wy0 - 23.5 * k, 6 * k, 0, Math.PI * 2);
      ctx.fill();
    });

    // Raio de luar entrando no quarto + poeira
    this.cineShafts(ctx, wx0 + ww * 0.7, wy0 + wh * 0.15, Math.PI * 0.72, W * 0.75, 0.5, 6, '150,180,255', 0.07, 0);
    this.bgmuMotes(ctx, W * 0.36, H * 0.3, W * 0.3, H * 0.45, 22, R, 'rgba(200,215,255,0.45)', 1.4 * k);

    // Pôster na parede (um atacante chutando) e a prateleira com troféus
    const px0 = W * 0.215;
    const py0 = H * 0.09;
    const pw = Math.min(W * 0.095, H * 0.19);
    const ph = pw * 1.4;
    ctx.save();
    ctx.translate(px0 + pw / 2, py0 + ph / 2);
    ctx.rotate(-0.025);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-pw / 2 + 4 * k, -ph / 2 + 5 * k, pw, ph);
    ctx.fillStyle = this.bgmuLin(ctx, 0, -ph / 2, 0, ph / 2, [[0, '#1d3f8f'], [0.7, '#14275c'], [1, '#0b1638']]);
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    this.cineGlow(ctx, pw * 0.1, -ph * 0.1, pw * 0.6, 'rgba(120,200,255,0.5)');
    // Silhueta do chute
    ctx.fillStyle = '#081026';
    const u = pw / 20;
    ctx.beginPath();
    ctx.arc(-u * 1, -u * 9, u * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-u * 2.5, -u * 7);
    ctx.lineTo(u * 1.2, -u * 7);
    ctx.lineTo(u * 6, -u * 4);
    ctx.lineTo(u * 5, -u * 3);
    ctx.lineTo(u * 1, -u * 4.5);
    ctx.lineTo(u * 1.4, u * 1);
    ctx.lineTo(u * 7, u * 0.5);
    ctx.lineTo(u * 7.5, u * 2);
    ctx.lineTo(u * 0.5, u * 3);
    ctx.lineTo(-u * 1.5, u * 9);
    ctx.lineTo(-u * 3.5, u * 9);
    ctx.lineTo(-u * 2.2, u * 2);
    ctx.lineTo(-u * 6, -u * 3);
    ctx.lineTo(-u * 5, -u * 4);
    ctx.lineTo(-u * 2.5, -u * 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8f1ff';
    ctx.beginPath();
    ctx.arc(u * 8.5, u * 3.4, u * 1.3, 0, Math.PI * 2);
    ctx.fill();
    this.bgmuText(ctx, 'EGO', 0, ph * 0.38, pw * 0.26, '#00f5d4', 'center', '900', 'Impact, Arial Black, sans-serif');
    ctx.fillStyle = 'rgba(220,230,255,0.55)';
    ctx.fillRect(-pw / 2 - 2 * k, -ph / 2 - 3 * k, 9 * k, 5 * k);
    ctx.fillRect(pw / 2 - 7 * k, -ph / 2 - 3 * k, 9 * k, 5 * k);
    ctx.restore();

    const shy = H * 0.45;
    const sx0 = W * 0.06;
    const sx1 = W * 0.33;
    this.bgmuRect(ctx, 'rgba(0,0,0,0.35)', sx0, shy + 7 * k, sx1 - sx0, 8 * k);
    this.bgmuRect(ctx, '#2b2a45', sx0, shy, sx1 - sx0, 7 * k);
    this.bgmuRect(ctx, 'rgba(170,190,255,0.3)', sx0, shy, sx1 - sx0, Math.max(1, k));
    // Livros e mangás
    let bx = sx0 + 6 * k;
    const bookCols = ['#3b2f5e', '#1f3b63', '#5a2b3a', '#2e4a3f', '#4a4a6a', '#25305a'];
    for (let i = 0; i < 9; i++) {
      const bw = (5 + R() * 5) * k;
      const bh = (24 + R() * 14) * k;
      this.bgmuRect(ctx, bookCols[i % bookCols.length], bx, shy - bh, bw, bh);
      this.bgmuRect(ctx, 'rgba(255,255,255,0.08)', bx, shy - bh, Math.max(1, k), bh);
      bx += bw + k;
    }
    // Troféus dourados
    [0.62, 0.74, 0.86].forEach((f, i) => {
      const tx = sx0 + (sx1 - sx0) * f;
      const s = (0.8 + (i === 1 ? 0.35 : 0)) * k;
      ctx.fillStyle = this.bgmuLin(ctx, tx - 9 * s, 0, tx + 9 * s, 0, [[0, '#6e5523'], [0.55, '#e9c766'], [1, '#7b6024']]);
      ctx.fillRect(tx - 7 * s, shy - 7 * s, 14 * s, 7 * s);
      ctx.fillRect(tx - 1.5 * s, shy - 16 * s, 3 * s, 9 * s);
      ctx.beginPath();
      ctx.moveTo(tx - 10 * s, shy - 34 * s);
      ctx.lineTo(tx + 10 * s, shy - 34 * s);
      ctx.quadraticCurveTo(tx + 9 * s, shy - 16 * s, tx, shy - 15 * s);
      ctx.quadraticCurveTo(tx - 9 * s, shy - 16 * s, tx - 10 * s, shy - 34 * s);
      ctx.fill();
      this.bgmuRect(ctx, 'rgba(255,250,220,0.7)', tx - 6 * s, shy - 32 * s, 2 * s, 12 * s);
    });
    // Flâmula do colégio e o calendário com a data da final marcada
    const fx0 = W * 0.355;
    const fy0 = H * 0.13;
    this.bgmuPoly(ctx, [[fx0, fy0], [fx0 + W * 0.085, fy0 + H * 0.035], [fx0, fy0 + H * 0.07]], '#1c3d7a');
    this.bgmuPoly(ctx, [[fx0, fy0], [fx0 + W * 0.085, fy0 + H * 0.035], [fx0 + W * 0.07, fy0 + H * 0.035]], 'rgba(160,190,255,0.18)');
    this.bgmuRect(ctx, '#d9e4ff', fx0 - 2 * k, fy0 - 2 * k, 3 * k, H * 0.075);
    this.bgmuText(ctx, 'ICHINAN', fx0 + W * 0.03, fy0 + H * 0.035, 8 * k, 'rgba(230,238,255,0.85)', 'center', '900');
    const clx = W * 0.37;
    const cly = H * 0.25;
    const clw = H * 0.075;
    this.bgmuRect(ctx, 'rgba(0,0,0,0.35)', clx + 3 * k, cly + 3 * k, clw, clw * 1.25);
    this.bgmuRect(ctx, '#aab6d8', clx, cly, clw, clw * 1.25);
    this.bgmuRect(ctx, '#7a2a3a', clx, cly, clw, clw * 0.28);
    ctx.fillStyle = 'rgba(30,40,80,0.55)';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) ctx.fillRect(clx + clw * (0.08 + c * 0.18), cly + clw * (0.4 + r * 0.2), clw * 0.1, clw * 0.08);
    ctx.strokeStyle = '#d33a4a';
    ctx.lineWidth = Math.max(1, 1.4 * k);
    ctx.beginPath();
    ctx.arc(clx + clw * 0.67, cly + clw * 0.84, clw * 0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Escrivaninha: abajur quente, o envelope preto do Blue Lock e o celular tocando
    const dy = H * 0.665;
    const dx0 = cx + W * 0.005;
    const dx1 = W * 0.37;
    // Luz do abajur na parede e na mesa
    const lx = W * 0.3;
    const ly = dy - H * 0.13;
    this.cineGlow(ctx, lx, dy - H * 0.02, H * 0.32, 'rgba(255,170,90,0.4)');
    this.bgmuPoly(ctx, [[lx - 10 * k, ly + 8 * k], [lx + 10 * k, ly + 8 * k], [lx + 70 * k, dy], [lx - 90 * k, dy]], this.bgmuLin(ctx, 0, ly, 0, dy, [[0, 'rgba(255,200,130,0.35)'], [1, 'rgba(255,180,110,0.05)']]));
    this.bgmuRect(ctx, '#2a1f2e', dx0, dy, dx1 - dx0, 9 * k);
    this.bgmuRect(ctx, 'rgba(255,200,140,0.45)', dx0, dy, dx1 - dx0, Math.max(1, k));
    this.bgmuRect(ctx, '#1b1424', dx0, dy + 9 * k, dx1 - dx0, H * 0.07);
    this.bgmuRect(ctx, 'rgba(0,0,0,0.4)', dx0 + (dx1 - dx0) * 0.5, dy + 9 * k + H * 0.03, (dx1 - dx0) * 0.4, Math.max(1, k));
    this.bgmuRect(ctx, '#3a2b3a', dx0 + (dx1 - dx0) * 0.68, dy + 9 * k + H * 0.02, 10 * k, 3 * k);
    this.bgmuRect(ctx, '#160f1e', dx0 + 4 * k, dy + 9 * k + H * 0.07, 8 * k, H);
    this.bgmuRect(ctx, '#160f1e', dx1 - 12 * k, dy + 9 * k + H * 0.07, 8 * k, H);
    // Abajur articulado
    ctx.strokeStyle = '#141020';
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    ctx.moveTo(lx + 30 * k, dy);
    ctx.lineTo(lx + 38 * k, ly - 14 * k);
    ctx.lineTo(lx + 4 * k, ly);
    ctx.stroke();
    this.bgmuRect(ctx, '#141020', lx + 20 * k, dy - 4 * k, 22 * k, 4 * k);
    this.bgmuPoly(ctx, [[lx - 8 * k, ly - 6 * k], [lx + 10 * k, ly - 8 * k], [lx + 14 * k, ly + 8 * k], [lx - 14 * k, ly + 10 * k]], '#1d1828');
    this.cineGlow(ctx, lx, ly + 9 * k, 22 * k, 'rgba(255,220,160,0.95)');
    // Envelope preto com o selo do Blue Lock
    ctx.save();
    ctx.translate(W * 0.15, dy - 2 * k);
    ctx.rotate(-0.08);
    this.bgmuRect(ctx, 'rgba(0,0,0,0.4)', -36 * k, -2 * k, 76 * k, 6 * k);
    this.bgmuPoly(ctx, [[-38 * k, 0], [38 * k, 0], [30 * k, -9 * k], [-30 * k, -9 * k]], '#06080f');
    this.bgmuRect(ctx, 'rgba(120,140,200,0.25)', -30 * k, -9 * k, 60 * k, Math.max(1, k));
    this.cineGlow(ctx, 0, -5 * k, 18 * k, 'rgba(0,245,212,0.7)');
    ctx.fillStyle = '#00f5d4';
    ctx.beginPath();
    ctx.arc(0, -5 * k, 3 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Celular aceso (chamada chegando)
    const phx = W * 0.235;
    this.cineGlow(ctx, phx, dy - 3 * k, 34 * k, 'rgba(140,200,255,0.55)');
    this.bgmuPoly(ctx, [[phx - 12 * k, dy], [phx + 12 * k, dy], [phx + 9 * k, dy - 5 * k], [phx - 9 * k, dy - 5 * k]], '#cfe6ff');
    this.bgmuRect(ctx, '#22c55e', phx + 3 * k, dy - 3.5 * k, 3 * k, 2 * k);

    // Cama embaixo da janela, cobertor pegando o luar
    const by = H * 0.74;
    this.bgmuRect(ctx, '#0b1024', wx0 - W * 0.04, by - H * 0.03, W, H * 0.03);
    ctx.fillStyle = this.bgmuLin(ctx, 0, by, 0, H, [[0, '#2f427c'], [0.15, '#1e2c5a'], [1, '#0c1330']]);
    ctx.beginPath();
    ctx.moveTo(wx0 - W * 0.03, by);
    ctx.quadraticCurveTo(wx0 + ww * 0.3, by - H * 0.025, wx0 + ww * 0.6, by - H * 0.005);
    ctx.quadraticCurveTo(wx0 + ww * 0.85, by + H * 0.01, W, by - H * 0.01);
    ctx.lineTo(W, H);
    ctx.lineTo(wx0 - W * 0.03, H);
    ctx.closePath();
    ctx.fill();
    // Dobras do cobertor
    ctx.strokeStyle = 'rgba(160,185,255,0.25)';
    ctx.lineWidth = 1.5 * k;
    for (let i = 0; i < 5; i++) {
      const fx = wx0 + ww * (0.05 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(fx, by + H * 0.01);
      ctx.quadraticCurveTo(fx + ww * 0.05, by + H * 0.08, fx - ww * 0.02, H);
      ctx.stroke();
    }
    // Travesseiro
    ctx.fillStyle = '#41548f';
    ctx.beginPath();
    ctx.ellipse(wx1 - ww * 0.12, by - H * 0.02, ww * 0.12, H * 0.035, -0.05, 0, Math.PI * 2);
    ctx.fill();
    this.bgmuRect(ctx, 'rgba(200,215,255,0.25)', wx1 - ww * 0.2, by - H * 0.05, ww * 0.12, Math.max(1, k));

    // Chão e a bola de futebol encostada
    ctx.fillStyle = this.bgmuLin(ctx, 0, floorY, 0, H, [[0, '#121831'], [1, '#05070f']]);
    ctx.fillRect(0, floorY, wx0 - W * 0.03, H - floorY);
    this.bgmuRect(ctx, '#1d2546', 0, floorY - 6 * k, wx0 - W * 0.03, 6 * k);
    ctx.strokeStyle = 'rgba(140,160,230,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      const yy = floorY + (H - floorY) * Math.pow(i / 6, 1.4);
      ctx.moveTo(0, yy);
      ctx.lineTo(wx0, yy);
    }
    ctx.stroke();
    const bx2 = W * 0.09;
    const br = H * 0.055;
    const by2 = H - br * 1.3;
    this.bgmuRect(ctx, 'rgba(0,0,0,0.45)', bx2 - br, by2 + br * 0.8, br * 2.2, br * 0.3);
    ctx.fillStyle = this.bgmuRad(ctx, bx2 + br * 0.4, by2 - br * 0.4, br * 0.1, br * 1.2, [[0, '#c8d4f0'], [0.6, '#6b7aa6'], [1, '#2a3358']]);
    ctx.beginPath();
    ctx.arc(bx2, by2, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#141a33';
    [[0, 0, 0.32], [0.62, -0.42, 0.22], [-0.62, -0.42, 0.22], [0.5, 0.6, 0.22], [-0.5, 0.6, 0.22]].forEach(([dx, dy2, s]) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        ctx.lineTo(bx2 + dx * br + Math.cos(a) * s * br, by2 + dy2 * br + Math.sin(a) * s * br);
      }
      ctx.fill();
    });

    // Luar no chão (o desenho da janela projetado)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(110,140,230,0.08)';
    ctx.beginPath();
    ctx.moveTo(W * 0.3, H * 0.86);
    ctx.lineTo(W * 0.55, H * 0.86);
    ctx.lineTo(W * 0.5, H);
    ctx.lineTo(W * 0.18, H);
    ctx.fill();
    ctx.restore();

    // Tom geral e vinheta
    ctx.fillStyle = 'rgba(30,50,120,0.08)';
    ctx.fillRect(0, 0, W, H);
    this.bgmuVignette(ctx, W, H, 0.6, '2,4,14', 0.42);
  };

  // ============================================================== spain_cafe
  // Um lado da rua em perspectiva (fachada com sacadas de ferro e venezianas).
  // xN/yT/yB = borda da fachada mais perto; os pontos se afastam até (vx, vy).
  CE.bgmuStreetSide = function (ctx, vx, vy, xN, yT, yB, zMax, bay, o, R) {
    const X = (z) => vx + (xN - vx) / z;
    const Y = (y, z) => vy + (y - vy) / z;
    const quad = (z0, z1, ya, yb, style) =>
      this.bgmuPoly(ctx, [[X(z0), Y(ya, z0)], [X(z1), Y(ya, z1)], [X(z1), Y(yb, z1)], [X(z0), Y(yb, z0)]], style);
    quad(1, zMax, yT, yB, o.wall);
    const fl = o.floors;
    const fh = (yB - yT) / fl;
    // Cornijas entre os andares
    ctx.strokeStyle = o.cornice;
    for (let f = 1; f < fl; f++) {
      const yy = yB - fh * f;
      ctx.lineWidth = Math.max(1, Math.abs(fh) * 0.04);
      ctx.beginPath();
      ctx.moveTo(X(1), Y(yy, 1));
      ctx.lineTo(X(zMax), Y(yy, zMax));
      ctx.stroke();
    }
    quad(1, zMax, yT, yT + fh * 0.18, o.top);
    const zs = [];
    for (let z0 = 1 + bay * 0.3; z0 < zMax - bay * 0.5; z0 += bay) zs.push(z0);
    zs.reverse().forEach((z0, bi) => {
      const z1 = z0 + bay * 0.5;
      const size = Math.abs(X(z0) - X(z1));
      // Térreo: loja com toldo listrado ou porta de madeira
      const shop = (bi + o.seed) % 3;
      quad(z0 - bay * 0.12, z1 + bay * 0.12, yB - fh * 0.82, yB, shop === 0 ? o.shopLit : o.shopDark);
      if (shop === 0 && size > 4) {
        const n = 6;
        for (let s = 0; s < n; s++) {
          const za = z0 - bay * 0.16 + ((z1 - z0 + bay * 0.32) * s) / n;
          const zb = za + (z1 - z0 + bay * 0.32) / n;
          quad(za, zb, yB - fh * 0.98, yB - fh * 0.8, s % 2 ? o.awning : '#f4ecd8');
        }
      }
      for (let f = 1; f < fl; f++) {
        const ya = yB - fh * (f + 1) + fh * 0.2;
        const yb = yB - fh * f - fh * 0.08;
        // Venezianas abertas dos dois lados
        quad(z0 - bay * 0.15, z0, ya, yb, o.shutter);
        quad(z1, z1 + bay * 0.15, ya, yb, o.shutter);
        quad(z0, z1, ya, yb, o.win);
        if (size > 5) {
          quad(z0, z0 + (z1 - z0) * 0.5, ya, ya + (yb - ya) * 0.5, o.winHi);
          // Sacada: laje + grade de ferro
          quad(z0 - bay * 0.18, z1 + bay * 0.18, yb, yb + fh * 0.06, o.slab);
          ctx.strokeStyle = o.iron;
          ctx.lineWidth = Math.max(1, size * 0.04);
          ctx.beginPath();
          ctx.moveTo(X(z0 - bay * 0.18), Y(yb - fh * 0.26, z0 - bay * 0.18));
          ctx.lineTo(X(z1 + bay * 0.18), Y(yb - fh * 0.26, z1 + bay * 0.18));
          const bars = Math.max(3, Math.round(size / 4));
          for (let b = 0; b <= bars; b++) {
            const zb = z0 - bay * 0.18 + ((z1 - z0 + bay * 0.36) * b) / bars;
            ctx.moveTo(X(zb), Y(yb - fh * 0.26, zb));
            ctx.lineTo(X(zb), Y(yb, zb));
          }
          ctx.stroke();
          // Vaso de planta ou roupa no varal em algumas sacadas
          if (R() < 0.35) quad(z0 + bay * 0.05, z0 + bay * 0.2, yb - fh * 0.2, yb, R() < 0.5 ? '#3f7a3a' : '#c24a3a');
        }
      }
    });
    if (o.shade) quad(1, zMax, yT, yB, o.shade);
    return { X, Y };
  };

  CE.bgmuPalm = function (ctx, x, y, h, lean, k) {
    const tx = x + lean * h;
    const ty = y - h;
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = Math.max(1, h * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * h * 0.2, y - h * 0.6, tx, ty);
    ctx.stroke();
    const leaves = 9;
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? 'rgba(170,200,90,0.75)' : '#2c5a2a';
      for (let i = 0; i < leaves; i++) {
        const a = -Math.PI + (i / (leaves - 1)) * Math.PI;
        const L = h * (0.32 + 0.08 * Math.sin(i * 2.3));
        const ex = tx + Math.cos(a) * L;
        const ey = ty + Math.sin(a) * L * 0.45 + L * 0.35;
        ctx.lineWidth = Math.max(1, h * (pass ? 0.012 : 0.04));
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - L * 0.12, ex, ey);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  };

  // A vista da janela: Barcelona ensolarada
  CE.bgmuBarcelonaView = function (ctx, x, y, w, h, k, R) {
    const vx = x + w * 0.52;
    const vy = y + h * 0.66;
    // Céu
    ctx.fillStyle = this.bgmuLin(ctx, 0, y, 0, vy, [[0, '#3f8fd8'], [0.55, '#7cc0ee'], [1, '#d8eef8']]);
    ctx.fillRect(x, y, w, h);
    this.cineGlow(ctx, x + w * 0.1, y + h * 0.05, w * 0.6, 'rgba(255,245,215,0.75)');
    ctx.globalAlpha = 0.85;
    this.bgmuCloud(ctx, x + w * 0.45, y + h * 0.16, w * 0.4, h * 0.04, R, 'rgba(255,255,255,0.75)', null);
    this.bgmuCloud(ctx, x + w * 0.62, y + h * 0.3, w * 0.3, h * 0.03, R, 'rgba(255,255,255,0.55)', null);
    ctx.globalAlpha = 1;
    // O estádio do Barcha no fim da rua
    const sw = w * 0.36;
    const sh = h * 0.27;
    const sb = vy - h * 0.06;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(vx, sb, sw, sh, 0, Math.PI, 0);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#d9dde6';
    ctx.fillRect(vx - sw, sb - sh, sw * 2, sh);
    const panels = 18;
    for (let i = 0; i < panels; i++) {
      ctx.fillStyle = i % 2 ? '#a3123f' : '#1f4fa8';
      ctx.fillRect(vx - sw + (i * sw * 2) / panels, sb - sh * 0.78, (sw * 2) / panels + 1, sh * 0.5);
    }
    ctx.fillStyle = this.bgmuLin(ctx, vx - sw, 0, vx + sw, 0, [[0, 'rgba(255,255,255,0.35)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(20,30,60,0.35)']]);
    ctx.fillRect(vx - sw, sb - sh, sw * 2, sh);
    ctx.fillStyle = 'rgba(30,40,70,0.35)';
    ctx.fillRect(vx - sw, sb - sh * 0.28, sw * 2, sh * 0.28);
    ctx.restore();
    ctx.strokeStyle = '#eef2f8';
    ctx.lineWidth = Math.max(1, 2 * k);
    ctx.beginPath();
    ctx.ellipse(vx, sb, sw, sh, 0, Math.PI, 0);
    ctx.stroke();
    // Bandeiras no topo
    for (let i = -2; i <= 2; i++) {
      const fx = vx + i * sw * 0.32;
      const fy = sb - sh * Math.sqrt(1 - Math.pow((i * 0.32), 2));
      this.bgmuLine(ctx, fx, fy, fx, fy - sh * 0.3, '#e8ecf4', Math.max(1, k));
      this.bgmuPoly(ctx, [[fx, fy - sh * 0.3], [fx + sh * 0.16, fy - sh * 0.25], [fx, fy - sh * 0.2]], i % 2 ? '#1f4fa8' : '#a3123f');
    }
    // Fachadas: a da direita no sol, a da esquerda na sombra
    const xL = x - w * 0.18;
    const xR = x + w * 1.18;
    const yT = y - h * 0.32;
    const yB = y + h * 1.12;
    const zMax = 7.5;
    // Prédio atravessando o fim da rua
    const Xl = vx + (xL - vx) / zMax;
    const Xr = vx + (xR - vx) / zMax;
    const yfT = vy + (yT - vy) / zMax + h * 0.04;
    this.bgmuRect(ctx, '#e3c79c', Xl, yfT, Xr - Xl, vy - yfT + h * 0.02);
    ctx.fillStyle = 'rgba(70,60,80,0.55)';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) ctx.fillRect(Xl + (Xr - Xl) * (0.06 + i * 0.16), yfT + (vy - yfT) * (0.15 + j * 0.28), (Xr - Xl) * 0.07, (vy - yfT) * 0.14);
    const L = this.bgmuStreetSide(ctx, vx, vy, xL, yT, yB, zMax, 0.55, { floors: 5, wall: '#c99c74', top: '#b88b66', cornice: 'rgba(255,240,220,0.5)', shopLit: '#7a4a32', shopDark: '#4a2f24', awning: '#2f6b4a', shutter: '#4f7d5f', win: '#3a2c38', winHi: 'rgba(160,200,240,0.25)', slab: '#e8d6b8', iron: '#2a1e1e', shade: 'rgba(60,70,140,0.32)', seed: 0 }, R);
    const Rr = this.bgmuStreetSide(ctx, vx, vy, xR, yT + h * 0.08, yB, zMax, 0.55, { floors: 5, wall: '#f4dcae', top: '#e6c693', cornice: 'rgba(255,255,255,0.7)', shopLit: '#9a5a36', shopDark: '#6a4030', awning: '#b8323a', shutter: '#5f9a6f', win: '#4a3a40', winHi: 'rgba(200,230,255,0.35)', slab: '#fff1d8', iron: '#3a2a26', shade: null, seed: 1 }, R);
    // Chão: rua, calçadas e faixa de pedestre
    const Xa = (xn, z) => vx + (xn - vx) / z;
    const Yg = (z) => vy + (yB - vy) / z;
    this.bgmuPoly(ctx, [[xL, yB], [Xa(xL, zMax), Yg(zMax)], [Xa(xR, zMax), Yg(zMax)], [xR, yB]], '#8c8a92');
    const sL = xL + (xR - xL) * 0.16;
    const sR = xR - (xR - xL) * 0.16;
    this.bgmuPoly(ctx, [[sL, yB], [Xa(sL, zMax), Yg(zMax)], [Xa(sR, zMax), Yg(zMax)], [sR, yB]], '#57565f');
    ctx.strokeStyle = '#d8d4cc';
    ctx.lineWidth = Math.max(1, 1.5 * k);
    ctx.beginPath();
    ctx.moveTo(sL, yB);
    ctx.lineTo(Xa(sL, zMax), Yg(zMax));
    ctx.moveTo(sR, yB);
    ctx.lineTo(Xa(sR, zMax), Yg(zMax));
    ctx.stroke();
    // Faixa central tracejada
    const xc = (xL + xR) / 2;
    for (let z = 1.1; z < zMax; z += 0.5) {
      const z2 = z + 0.22;
      this.bgmuPoly(ctx, [[Xa(xc - w * 0.01, z), Yg(z)], [Xa(xc - w * 0.01, z2), Yg(z2)], [Xa(xc + w * 0.01, z2), Yg(z2)], [Xa(xc + w * 0.01, z), Yg(z)]], '#f2efe6');
    }
    // Sombra dos prédios da esquerda na rua
    this.bgmuPoly(ctx, [[xL, yB], [Xa(xL, zMax), Yg(zMax)], [Xa(xc, zMax), Yg(zMax)], [xc - w * 0.2, yB]], 'rgba(40,50,110,0.28)');
    // Táxi preto e amarelo + pedestres
    const car = (xn, z, body, top) => {
      const cx = Xa(xn, z);
      const gy = Yg(z);
      const cw = (w * 0.28) / z;
      const ch = cw * 0.55;
      this.bgmuRect(ctx, 'rgba(0,0,0,0.35)', cx - cw * 0.55, gy - ch * 0.08, cw * 1.1, ch * 0.12);
      this.bgmuRect(ctx, body, cx - cw / 2, gy - ch * 0.55, cw, ch * 0.45);
      this.bgmuPoly(ctx, [[cx - cw * 0.4, gy - ch * 0.55], [cx - cw * 0.3, gy - ch], [cx + cw * 0.3, gy - ch], [cx + cw * 0.4, gy - ch * 0.55]], top);
      this.bgmuRect(ctx, '#2c3440', cx - cw * 0.26, gy - ch * 0.92, cw * 0.52, ch * 0.3);
      this.bgmuRect(ctx, '#ff4a3a', cx - cw * 0.48, gy - ch * 0.48, cw * 0.12, ch * 0.1);
      this.bgmuRect(ctx, '#ff4a3a', cx + cw * 0.36, gy - ch * 0.48, cw * 0.12, ch * 0.1);
      this.bgmuRect(ctx, '#111', cx - cw * 0.45, gy - ch * 0.12, cw * 0.15, ch * 0.12);
      this.bgmuRect(ctx, '#111', cx + cw * 0.3, gy - ch * 0.12, cw * 0.15, ch * 0.12);
      return [cx, gy - ch, cw];
    };
    car(xc + w * 0.42, 4.2, '#d8d8de', '#c4c6d0');
    const [tx, ty, tw] = car(xc + w * 0.26, 2.1, '#141414', '#f2c21b');
    this.cineGlow(ctx, tx, ty - tw * 0.05, tw * 0.15, 'rgba(60,255,120,0.9)');
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? sR + w * 0.05 : sL - w * 0.05;
      const z = 2.4 + R() * 4;
      const px = Xa(side + (R() - 0.5) * w * 0.08, z);
      const gy = Yg(z);
      const ph = (h * 0.42) / z;
      const col = ['#3a3f5a', '#7a2f3a', '#e8e2d4', '#2f5a7a', '#5a4a3a'][i % 5];
      this.bgmuRect(ctx, col, px - ph * 0.12, gy - ph * 0.8, ph * 0.24, ph * 0.45);
      this.bgmuRect(ctx, '#2a2a33', px - ph * 0.1, gy - ph * 0.36, ph * 0.2, ph * 0.36);
      ctx.fillStyle = '#c99a78';
      ctx.beginPath();
      ctx.arc(px, gy - ph * 0.9, ph * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // Palmeiras nas calçadas
    [[1.9, -1], [3, -1], [4.6, -1], [2.3, 1], [3.6, 1], [5.4, 1]].sort((a, b) => b[0] - a[0]).forEach(([z, side]) => {
      const xn = side < 0 ? xL + (xR - xL) * 0.1 : xR - (xR - xL) * 0.1;
      this.bgmuPalm(ctx, Xa(xn, z), Yg(z), (h * 0.8) / z, side * -0.06, k);
    });
    // Névoa de calor no fundo
    ctx.fillStyle = this.bgmuLin(ctx, 0, vy - h * 0.3, 0, vy + h * 0.05, [[0, 'rgba(255,240,220,0)'], [1, 'rgba(255,236,210,0.4)']]);
    ctx.fillRect(x, vy - h * 0.3, w, h * 0.35);
    return { L, Rr };
  };

  CE.bgmuSpainCafe = function (ctx, W, H) {
    const k = H / 620;
    const R = this.bgmuRng(3301);
    const vpx = W * 0.5;
    const vpy = H * 0.42;
    const bl = W * 0.055;
    const br = W * 0.945;
    const bt = H * 0.1;
    const bb = H * 0.77;
    // Parede do fundo (reboco quente) e azulejos azuis
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, bt, 0, bb, [[0, '#c99c6c'], [1, '#b0805a']]), 0, 0, W, H);
    ctx.fillStyle = 'rgba(255,240,210,0.05)';
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.ellipse(bl + R() * (br - bl), bt + R() * (bb - bt) * 0.6, (8 + R() * 30) * k, (4 + R() * 10) * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const ws = H * 0.5;
    const ts = Math.max(10, H * 0.042);
    for (let ty = ws; ty < bb; ty += ts) {
      const row = Math.round((ty - ws) / ts);
      for (let tx = bl; tx < br; tx += ts) {
        const border = row === 0;
        this.bgmuRect(ctx, border ? '#24467e' : '#ebe3cf', tx, ty, ts - 1, ts - 1);
        ctx.fillStyle = border ? '#e9c25a' : '#2f5d9e';
        ctx.beginPath();
        const cx = tx + ts / 2;
        const cy = ty + ts / 2;
        const r = ts * (border ? 0.18 : 0.28);
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.fill();
        if (!border) {
          [[0, 0], [ts, 0], [0, ts], [ts, ts]].forEach(([ox, oy]) => {
            ctx.beginPath();
            ctx.arc(tx + ox, ty + oy, ts * 0.22, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
    }
    ctx.fillStyle = this.bgmuLin(ctx, 0, ws, 0, bb, [[0, 'rgba(60,30,20,0.1)'], [1, 'rgba(40,20,20,0.5)']]);
    ctx.fillRect(bl, ws, br - bl, bb - ws);
    this.bgmuRect(ctx, '#5a3622', bl, ws - 5 * k, br - bl, 5 * k);
    this.bgmuRect(ctx, 'rgba(255,220,170,0.4)', bl, ws - 5 * k, br - bl, Math.max(1, k));

    // Janela em arco para a rua
    const wx0 = W * 0.115;
    const wx1 = W * 0.425;
    const wy0 = H * 0.13;
    const wy1 = H * 0.66;
    const ww = wx1 - wx0;
    const wh = wy1 - wy0;
    const ry = Math.min(ww * 0.28, wh * 0.28);
    const wcx = (wx0 + wx1) / 2;
    const archPath = (pad) => {
      ctx.beginPath();
      ctx.moveTo(wx0 - pad, wy1);
      ctx.lineTo(wx0 - pad, wy0 + ry);
      ctx.ellipse(wcx, wy0 + ry, ww / 2 + pad, ry + pad, 0, Math.PI, 0);
      ctx.lineTo(wx1 + pad, wy1);
      ctx.closePath();
    };
    this.cineGlow(ctx, wcx, wy0 + wh * 0.45, ww * 1.1, 'rgba(255,220,160,0.45)');
    archPath(14 * k);
    ctx.fillStyle = '#3b2416';
    ctx.fill();
    ctx.save();
    archPath(0);
    ctx.clip();
    this.bgmuBarcelonaView(ctx, wx0, wy0, ww, wh, k, R);
    // Letreiro dourado no vidro (lido de dentro, ao contrário)
    ctx.save();
    ctx.translate(wcx, wy0 + ry * 0.62);
    ctx.scale(-1, 1);
    ctx.strokeStyle = 'rgba(40,20,10,0.6)';
    ctx.lineWidth = 3 * k;
    ctx.font = `900 ${Math.round(Math.min(wh * 0.07, ry * 0.4))}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('CAFÈ · BAR', 0, 0);
    ctx.fillStyle = 'rgba(240,200,90,0.9)';
    ctx.fillText('CAFÈ · BAR', 0, 0);
    ctx.restore();
    // Brilho no vidro
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,240,210,0.08)';
    ctx.beginPath();
    ctx.moveTo(wx0 + ww * 0.55, wy0);
    ctx.lineTo(wx0 + ww * 0.7, wy0);
    ctx.lineTo(wx0 + ww * 0.35, wy1);
    ctx.lineTo(wx0 + ww * 0.2, wy1);
    ctx.fill();
    ctx.restore();
    // Caixilhos de madeira (leque no arco)
    ctx.strokeStyle = '#3b2416';
    ctx.lineWidth = Math.max(3, 6 * k);
    ctx.beginPath();
    ctx.moveTo(wcx, wy0);
    ctx.lineTo(wcx, wy1);
    ctx.moveTo(wx0, wy0 + ry);
    ctx.lineTo(wx1, wy0 + ry);
    ctx.moveTo(wx0, wy0 + ry + (wh - ry) * 0.5);
    ctx.lineTo(wx1, wy0 + ry + (wh - ry) * 0.5);
    for (let i = 1; i < 6; i++) {
      const a = Math.PI + (i * Math.PI) / 6;
      ctx.moveTo(wcx, wy0 + ry);
      ctx.lineTo(wcx + Math.cos(a) * ww * 0.5, wy0 + ry + Math.sin(a) * ry);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,150,0.35)';
    ctx.lineWidth = 1;
    archPath(-2 * k);
    ctx.stroke();
    // Cortininha de renda na parte de baixo
    const cy0 = wy1 - wh * 0.2;
    ctx.fillStyle = 'rgba(255,250,240,0.78)';
    ctx.beginPath();
    ctx.moveTo(wx0, wy1);
    ctx.lineTo(wx0, cy0);
    const sc = 8;
    for (let i = 0; i < sc; i++) {
      const xa = wx0 + (ww * i) / sc;
      ctx.quadraticCurveTo(xa + ww / sc / 2, cy0 + wh * 0.035, xa + ww / sc, cy0);
    }
    ctx.lineTo(wx1, wy1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,170,140,0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 16; i++) this.bgmuLine(ctx, wx0 + (ww * i) / 16, cy0 + wh * 0.03, wx0 + (ww * i) / 16 + ww * 0.01, wy1, 'rgba(200,170,140,0.3)', 1);
    this.bgmuRect(ctx, '#a9824a', wx0 - 4 * k, cy0 - 3 * k, ww + 8 * k, 3 * k);
    // Peitoril
    this.bgmuRect(ctx, '#4a2c1a', wx0 - 20 * k, wy1, ww + 40 * k, 10 * k);
    this.bgmuRect(ctx, 'rgba(255,220,170,0.5)', wx0 - 20 * k, wy1, ww + 40 * k, Math.max(1, k));

    // Lousa com o cardápio
    const mx0 = W * 0.452;
    const mx1 = W * 0.548;
    const my0 = H * 0.16;
    const my1 = H * 0.4;
    this.bgmuRect(ctx, 'rgba(0,0,0,0.3)', mx0 + 4 * k, my0 + 5 * k, mx1 - mx0, my1 - my0);
    this.bgmuRect(ctx, '#6b4426', mx0 - 5 * k, my0 - 5 * k, mx1 - mx0 + 10 * k, my1 - my0 + 10 * k);
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, my0, 0, my1, [[0, '#2b3a33'], [1, '#1d2a25']]), mx0, my0, mx1 - mx0, my1 - my0);
    const mcx = (mx0 + mx1) / 2;
    const ms = (my1 - my0) / 9;
    this.bgmuText(ctx, 'MENÚ', mcx, my0 + ms * 1.1, ms * 1.1, '#f6f1e6', 'center', '700', 'Georgia, serif');
    this.bgmuLine(ctx, mx0 + (mx1 - mx0) * 0.25, my0 + ms * 1.9, mx1 - (mx1 - mx0) * 0.25, my0 + ms * 1.9, 'rgba(246,241,230,0.6)', 1);
    [['CAFÈ', '1,50'], ['CORTADO', '1,60'], ['C. CON LECHE', '1,90'], ['CROISSANT', '2,00'], ['BOCADILLO', '4,50']].forEach(([a, b], i) => {
      const fs = Math.min(ms * 0.62, (mx1 - mx0) * 0.075);
      this.bgmuText(ctx, a, mx0 + (mx1 - mx0) * 0.08, my0 + ms * (3 + i * 1.2), fs, 'rgba(240,236,225,0.85)', 'left', '700', 'Arial, sans-serif');
      this.bgmuText(ctx, b, mx1 - (mx1 - mx0) * 0.08, my0 + ms * (3 + i * 1.2), fs, '#f2c94c', 'right', '700', 'Arial, sans-serif');
    });

    // Bar: espelho, prateleiras de garrafas e presuntos pendurados
    const sx0 = W * 0.6;
    const sx1 = W * 0.93;
    ctx.fillStyle = this.bgmuLin(ctx, sx0, 0, sx1, 0, [[0, '#6b4a33'], [0.5, '#8a6a4c'], [1, '#5a3c28']]);
    ctx.fillRect(sx0, H * 0.14, sx1 - sx0, H * 0.36);
    this.bgmuRect(ctx, '#3b2416', sx0 - 4 * k, H * 0.14 - 4 * k, sx1 - sx0 + 8 * k, 4 * k);
    ctx.fillStyle = 'rgba(255,230,190,0.12)';
    ctx.beginPath();
    ctx.moveTo(sx0 + (sx1 - sx0) * 0.2, H * 0.14);
    ctx.lineTo(sx0 + (sx1 - sx0) * 0.35, H * 0.14);
    ctx.lineTo(sx0 + (sx1 - sx0) * 0.15, H * 0.5);
    ctx.lineTo(sx0, H * 0.5);
    ctx.fill();
    // Presuntos
    const hamX = [0.635, 0.665, 0.695];
    this.bgmuRect(ctx, '#2a1a10', W * 0.615, H * 0.12, W * 0.1, 3 * k);
    hamX.forEach((f, i) => {
      const hx = W * f;
      const hy = H * 0.125;
      const hl = H * (0.11 + (i % 2) * 0.02);
      this.bgmuLine(ctx, hx, hy, hx, hy + hl * 0.15, '#d8c7a0', Math.max(1, k));
      ctx.fillStyle = this.bgmuLin(ctx, hx - hl * 0.15, 0, hx + hl * 0.15, 0, [[0, '#5a1e14'], [0.5, '#9a3a24'], [1, '#4a1a10']]);
      ctx.beginPath();
      ctx.moveTo(hx - hl * 0.03, hy + hl * 0.15);
      ctx.quadraticCurveTo(hx - hl * 0.2, hy + hl * 0.7, hx, hy + hl);
      ctx.quadraticCurveTo(hx + hl * 0.2, hy + hl * 0.7, hx + hl * 0.03, hy + hl * 0.15);
      ctx.fill();
      this.bgmuRect(ctx, 'rgba(255,200,160,0.35)', hx - hl * 0.08, hy + hl * 0.4, Math.max(1, k * 1.5), hl * 0.35);
    });
    // Prateleiras
    const bottleCols = ['#2f6b3a', '#7a2a1e', '#c8a24a', '#3a5a8a', '#e8e0c8', '#5a2a4a', '#1e3a2a', '#a8642a'];
    [0.27, 0.38, 0.49].forEach((fy, si) => {
      const shy = H * fy;
      let bx = (si === 0 ? W * 0.73 : sx0) + 8 * k;
      while (bx < sx1 - 10 * k) {
        const bw = (6 + R() * 6) * k;
        const bh = (22 + R() * 18) * k;
        const col = bottleCols[Math.floor(R() * bottleCols.length)];
        this.bgmuRect(ctx, col, bx, shy - bh * 0.7, bw, bh * 0.7);
        this.bgmuRect(ctx, col, bx + bw * 0.35, shy - bh, bw * 0.3, bh * 0.32);
        this.bgmuRect(ctx, 'rgba(255,255,255,0.35)', bx + bw * 0.15, shy - bh * 0.65, Math.max(1, bw * 0.15), bh * 0.5);
        if (R() < 0.5) this.bgmuRect(ctx, '#f0e6cc', bx + bw * 0.1, shy - bh * 0.45, bw * 0.8, bh * 0.18);
        bx += bw + (2 + R() * 4) * k;
      }
      this.bgmuRect(ctx, '#3b2416', sx0, shy, sx1 - sx0, 5 * k);
      this.bgmuRect(ctx, 'rgba(255,220,170,0.4)', sx0, shy, sx1 - sx0, Math.max(1, k));
    });

    // Paredes laterais, teto de madeira com vigas e o chão xadrez
    this.bgmuPoly(ctx, [[0, 0], [bl, bt], [bl, bb], [0, H]], this.bgmuLin(ctx, 0, 0, bl, 0, [[0, '#6e4a30'], [1, '#9a704c']]));
    this.bgmuPoly(ctx, [[W, 0], [br, bt], [br, bb], [W, H]], this.bgmuLin(ctx, br, 0, W, 0, [[0, '#8a6040'], [1, '#5a3a24']]));
    this.bgmuPoly(ctx, [[0, 0], [W, 0], [br, bt], [bl, bt]], '#4a2c1a');
    const beams = 9;
    for (let i = 0; i <= beams; i++) {
      const xb = bl + ((br - bl) * i) / beams;
      const xt = vpx + ((xb - vpx) * vpy) / (vpy - bt);
      const bw2 = (br - bl) * 0.012;
      this.bgmuPoly(ctx, [[xb - bw2, bt], [xb + bw2, bt], [xt + bw2 * 1.25, 0], [xt - bw2 * 1.25, 0]], '#2e1a0e');
      this.bgmuLine(ctx, xb + bw2, bt, xt + bw2 * 1.25, 0, 'rgba(255,200,140,0.25)', 1);
    }
    this.bgmuRect(ctx, '#3b2416', bl, bt - 3 * k, br - bl, 6 * k);
    // Chão xadrez em perspectiva
    const rows = 9;
    const cols = 14;
    const yAt = (i) => vpy + (bb - vpy) / (1 - (i / rows) * (1 - (bb - vpy) / (H * 1.08 - vpy)));
    const xAt = (j, y) => vpx + (bl + ((br - bl) * j) / cols - vpx) * ((y - vpy) / (bb - vpy));
    for (let i = 0; i < rows; i++) {
      const ya = yAt(i);
      const yb = Math.min(H + 2, yAt(i + 1));
      if (ya > H) break;
      for (let j = -12; j < cols + 12; j++) {
        this.bgmuPoly(ctx, [[xAt(j, ya), ya], [xAt(j + 1, ya), ya], [xAt(j + 1, yb), yb], [xAt(j, yb), yb]], (i + j) % 2 ? '#e2d2b4' : '#9c4a32');
      }
    }
    ctx.fillStyle = this.bgmuLin(ctx, 0, bb, 0, H, [[0, 'rgba(60,30,20,0.35)'], [1, 'rgba(30,15,10,0.55)']]);
    ctx.fillRect(0, bb, W, H - bb);
    this.bgmuRect(ctx, '#3b2416', bl, bb - 4 * k, br - bl, 5 * k);

    // Balcão de mármore com a máquina de café
    const cx0 = W * 0.585;
    const cty = H * 0.6;
    this.bgmuPoly(ctx, [[cx0, cty], [W, cty - H * 0.01], [W, H], [cx0, H]], '#4e2e1c');
    for (let i = 0; i < 6; i++) {
      const px = cx0 + (W - cx0) * (0.04 + i * 0.16);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2 * k;
      ctx.strokeRect(px, cty + H * 0.04, (W - cx0) * 0.12, H * 0.16);
      this.bgmuRect(ctx, 'rgba(255,210,160,0.12)', px, cty + H * 0.04, (W - cx0) * 0.12, Math.max(1, k));
    }
    this.bgmuRect(ctx, '#c9a24a', cx0, cty + H * 0.25, W - cx0, 3 * k);
    this.bgmuPoly(ctx, [[cx0 - 6 * k, cty - 8 * k], [W, cty - H * 0.01 - 8 * k], [W, cty - H * 0.01], [cx0 - 6 * k, cty]], '#efe6d6');
    this.bgmuRect(ctx, 'rgba(120,90,70,0.6)', cx0 - 6 * k, cty, W - cx0, 3 * k);
    // Máquina de espresso
    const ex = W * 0.65;
    const ew = W * 0.1;
    const eh = H * 0.11;
    const ey = cty - 8 * k - eh;
    ctx.fillStyle = this.bgmuLin(ctx, ex, 0, ex + ew, 0, [[0, '#6c7078'], [0.25, '#f4f6fa'], [0.5, '#9aa0aa'], [0.8, '#e2e6ee'], [1, '#5a5e66']]);
    ctx.fillRect(ex, ey, ew, eh * 0.62);
    this.bgmuRect(ctx, '#2a2a30', ex, ey + eh * 0.62, ew, eh * 0.06);
    this.bgmuRect(ctx, '#a3123f', ex + ew * 0.06, ey + eh * 0.12, ew * 0.2, eh * 0.14);
    this.bgmuText(ctx, 'EXPRÉS', ex + ew * 0.6, ey + eh * 0.2, eh * 0.12, '#2a2a30', 'center', '900');
    [0.3, 0.68].forEach((f) => {
      this.bgmuRect(ctx, '#3a3a42', ex + ew * f - ew * 0.06, ey + eh * 0.62, ew * 0.12, eh * 0.14);
      this.bgmuRect(ctx, '#f4f0e8', ex + ew * f - ew * 0.05, ey + eh * 0.86, ew * 0.1, eh * 0.14);
    });
    for (let i = 0; i < 4; i++) this.bgmuRect(ctx, '#f4f0e8', ex + ew * (0.12 + i * 0.2), ey - eh * 0.14, ew * 0.14, eh * 0.14);
    this.cineGlow(ctx, ex + ew * 0.06, ey + eh * 0.2, 8 * k, 'rgba(255,80,60,0.9)');
    // Vapor
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    ctx.moveTo(ex + ew * 0.92, ey + eh * 0.5);
    ctx.bezierCurveTo(ex + ew * 1.05, ey, ex + ew * 0.85, ey - eh * 0.3, ex + ew, ey - eh * 0.7);
    ctx.stroke();
    // Vitrine de croissants
    const vx0 = W * 0.79;
    const vw = W * 0.12;
    const vh = H * 0.07;
    const vy0 = cty - 8 * k - vh;
    this.bgmuRect(ctx, 'rgba(220,240,255,0.25)', vx0, vy0, vw, vh);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = Math.max(1, k);
    ctx.strokeRect(vx0, vy0, vw, vh);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#d99a3a';
      ctx.beginPath();
      ctx.ellipse(vx0 + vw * (0.15 + i * 0.23), vy0 + vh * 0.7, vw * 0.09, vh * 0.18, 0, Math.PI, 0);
      ctx.fill();
      this.bgmuRect(ctx, 'rgba(255,230,160,0.7)', vx0 + vw * (0.1 + i * 0.23), vy0 + vh * 0.58, vw * 0.06, Math.max(1, k));
    }

    // Luminárias pendentes
    [[0.29, 0.17, 1], [0.5, 0.12, 0.75], [0.76, 0.1, 0.85]].forEach(([fx, fy, s]) => {
      const lx = W * fx;
      const ly = H * fy;
      this.bgmuLine(ctx, lx, 0, lx, ly, '#1a1008', Math.max(1, k));
      this.cineGlow(ctx, lx, ly + 10 * k * s, H * 0.22 * s, 'rgba(255,190,110,0.5)');
      this.bgmuPoly(ctx, [[lx - 4 * k * s, ly], [lx + 4 * k * s, ly], [lx + 18 * k * s, ly + 14 * k * s], [lx - 18 * k * s, ly + 14 * k * s]], '#2f5a3a');
      this.bgmuRect(ctx, 'rgba(180,230,190,0.35)', lx - 12 * k * s, ly + 8 * k * s, 6 * k * s, Math.max(1, k));
      this.cineGlow(ctx, lx, ly + 15 * k * s, 16 * k * s, 'rgba(255,240,200,0.95)');
    });

    // Raios de sol entrando pela janela, mancha de luz no chão e poeira dourada
    this.cineShafts(ctx, wx0 + ww * 0.25, wy0 + wh * 0.2, Math.PI * 0.2, W * 0.75, 0.42, 7, '255,220,160', 0.1, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,210,150,0.16)';
    ctx.beginPath();
    ctx.moveTo(W * 0.36, bb + H * 0.02);
    ctx.lineTo(W * 0.62, bb + H * 0.02);
    ctx.lineTo(W * 0.86, H);
    ctx.lineTo(W * 0.42, H);
    ctx.fill();
    ctx.restore();
    this.bgmuMotes(ctx, W * 0.3, H * 0.25, W * 0.45, H * 0.5, 50, R, 'rgba(255,230,170,0.9)', 2 * k);

    // Mesinha de mármore com os dois cafés (a mesa do canto)
    const tx = W * 0.1;
    const tyy = H * 0.78;
    const trx = W * 0.075;
    const tryy = H * 0.028;
    // Cadeiras de bistrô
    [-1, 1].forEach((sd) => {
      ctx.strokeStyle = '#24140a';
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.ellipse(tx + sd * trx * 1.1, tyy - H * 0.06, trx * 0.35, H * 0.06, 0, Math.PI, 0);
      ctx.stroke();
      this.bgmuLine(ctx, tx + sd * trx * 1.1 - trx * 0.35, tyy - H * 0.06, tx + sd * trx * 1.1 - trx * 0.3, H, '#24140a', 3 * k);
      this.bgmuLine(ctx, tx + sd * trx * 1.1 + trx * 0.35, tyy - H * 0.06, tx + sd * trx * 1.1 + trx * 0.3, H, '#24140a', 3 * k);
    });
    this.bgmuRect(ctx, '#1a1008', tx - 3 * k, tyy, 6 * k, H - tyy);
    ctx.fillStyle = '#c8bcae';
    ctx.beginPath();
    ctx.ellipse(tx, tyy + 3 * k, trx, tryy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.bgmuLin(ctx, tx - trx, 0, tx + trx, 0, [[0, '#f6f0e6'], [0.5, '#ffffff'], [1, '#d8cfc2']]);
    ctx.beginPath();
    ctx.ellipse(tx, tyy, trx, tryy, 0, 0, Math.PI * 2);
    ctx.fill();
    [-0.4, 0.38].forEach((f) => {
      const gx = tx + trx * f;
      ctx.fillStyle = '#f4f0e8';
      ctx.beginPath();
      ctx.ellipse(gx, tyy, trx * 0.2, tryy * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      this.bgmuRect(ctx, 'rgba(220,235,255,0.6)', gx - trx * 0.08, tyy - H * 0.04, trx * 0.16, H * 0.04);
      this.bgmuRect(ctx, '#6a3a1a', gx - trx * 0.08, tyy - H * 0.026, trx * 0.16, H * 0.026);
      this.bgmuRect(ctx, '#e8d2b0', gx - trx * 0.08, tyy - H * 0.034, trx * 0.16, H * 0.008);
      this.bgmuRect(ctx, 'rgba(255,255,255,0.7)', gx - trx * 0.06, tyy - H * 0.038, Math.max(1, k), H * 0.03);
    });
    // Planta grande no canto direito
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + i * 0.28;
      const lx = W * 0.975 + Math.cos(a) * H * 0.18;
      const ly = H * 0.72 + Math.sin(a) * H * 0.2;
      ctx.fillStyle = i % 2 ? '#1f4a2a' : '#2a5e33';
      ctx.beginPath();
      ctx.ellipse(lx, ly, H * 0.07, H * 0.035, a, 0, Math.PI * 2);
      ctx.fill();
      this.bgmuLine(ctx, W * 0.975, H * 0.86, lx, ly, '#1a3a20', Math.max(1, 1.5 * k));
      this.bgmuLine(ctx, lx - Math.cos(a) * H * 0.06, ly - Math.sin(a) * H * 0.06, lx + Math.cos(a) * H * 0.06, ly + Math.sin(a) * H * 0.06, 'rgba(200,240,170,0.35)', Math.max(1, k));
    }
    this.bgmuPoly(ctx, [[W * 0.93, H * 0.86], [W * 1.02, H * 0.86], [W * 1.01, H], [W * 0.94, H]], '#a0522d');

    // Calor da tarde + vinheta quente
    ctx.fillStyle = 'rgba(255,170,90,0.06)';
    ctx.fillRect(0, 0, W, H);
    this.bgmuVignette(ctx, W, H, 0.5, '40,16,6', 0.45);
  };

  // =========================================================== clasico_night
  // O clássico visto da arquibancada: a curva do estádio lotado, mosaico blaugrana,
  // anel de refletores no teto, telão com o placar, gramado listrado e a torcida na frente
  CE.bgmuTrace = function (ctx, f, x0, x1, n = 64) {
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      ctx.lineTo(x, f(x));
    }
  };

  CE.bgmuFootballer = function (ctx, x, y, s, kit, pose, k) {
    // Sombras dos quatro refletores
    ctx.fillStyle = 'rgba(0,20,0,0.22)';
    [-1, 1].forEach((d) => {
      ctx.beginPath();
      ctx.ellipse(x + d * s * 0.35, y, s * 0.45, s * 0.06, d * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });
    const lw = s * 0.11;
    const sw = pose * s * 0.18;
    ctx.strokeStyle = kit.sock;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.06, y - s * 0.45);
    ctx.lineTo(x - s * 0.06 - sw, y - s * 0.02);
    ctx.moveTo(x + s * 0.06, y - s * 0.45);
    ctx.lineTo(x + s * 0.06 + sw * 0.6, y - s * 0.03);
    ctx.stroke();
    ctx.strokeStyle = '#e8c4a0';
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.17, y - s * 0.82);
    ctx.lineTo(x - s * 0.22 + sw * 0.5, y - s * 0.56);
    ctx.moveTo(x + s * 0.17, y - s * 0.82);
    ctx.lineTo(x + s * 0.22 - sw * 0.5, y - s * 0.58);
    ctx.stroke();
    ctx.lineCap = 'butt';
    this.bgmuRect(ctx, kit.short, x - s * 0.14, y - s * 0.56, s * 0.28, s * 0.14);
    if (kit.stripe) {
      this.bgmuRect(ctx, kit.shirt, x - s * 0.17, y - s * 0.88, s * 0.34, s * 0.34);
      this.bgmuRect(ctx, kit.stripe, x - s * 0.17 + s * 0.085, y - s * 0.88, s * 0.085, s * 0.34);
      this.bgmuRect(ctx, kit.stripe, x - s * 0.17 + s * 0.255, y - s * 0.88, s * 0.085, s * 0.34);
    } else {
      this.bgmuRect(ctx, kit.shirt, x - s * 0.17, y - s * 0.88, s * 0.34, s * 0.34);
    }
    this.bgmuRect(ctx, 'rgba(255,255,255,0.25)', x - s * 0.17, y - s * 0.88, s * 0.34, Math.max(1, s * 0.04));
    ctx.fillStyle = '#d8a882';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.97, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = kit.hair || '#1a1410';
    ctx.beginPath();
    ctx.arc(x, y - s * 1.0, s * 0.1, Math.PI, 0);
    ctx.fill();
  };

  CE.bgmuClasico = function (ctx, W, H) {
    const k = H / 620;
    const R = this.bgmuRng(5150);
    const cx = W / 2;
    const c = (x) => Math.pow((x - cx) / (W / 2), 2);
    const yRoof = (x) => H * 0.13 - c(x) * H * 0.17;
    const yBase = (x) => H * 0.5 + c(x) * H * 0.045;
    const yMid = (x) => yRoof(x) + (yBase(x) - yRoof(x)) * 0.47;
    const roofT = (x) => H * (0.045 + c(x) * 0.05);
    // Céu com a luz do estádio subindo
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, 0, 0, H * 0.5, [[0, '#01040e'], [0.6, '#0a1838'], [1, '#18305f']]), 0, 0, W, H);
    this.bgmuStars(ctx, 0, 0, W, H * 0.12, 40, R, 0.5);
    this.cineGlow(ctx, cx, H * 0.1, W * 0.6, 'rgba(110,150,255,0.3)');
    // Corpo das arquibancadas (lado de lá)
    ctx.beginPath();
    ctx.moveTo(0, yRoof(0));
    this.bgmuTrace(ctx, yRoof, 0, W);
    this.bgmuTrace(ctx, yBase, W, 0);
    ctx.closePath();
    ctx.fillStyle = '#0d1430';
    ctx.fill();
    // Torcida: milhares de pontinhos agrupados por cor (um fill por cor)
    const pal = ['#8c1a3c', '#1d3f8e', '#e6e1d6', '#e3b82a', '#2a2f48', '#c9a27e', '#5a1730', '#1a2a5e'];
    const wts = [0.2, 0.2, 0.12, 0.06, 0.18, 0.08, 0.08, 0.08];
    const pick = () => {
      let r = R();
      for (let i = 0; i < wts.length; i++) {
        if ((r -= wts[i]) < 0) return i;
      }
      return 0;
    };
    const buckets = pal.map(() => []);
    const tifo = [[], []];
    const step = Math.max(2.2, 3.7 * k);
    const vipH = (x) => H * (0.028 + c(x) * 0.012);
    for (let x = 0; x < W; x += step) {
      const sc = 1 + c(x) * 0.55;
      const sy = step * sc;
      const top = yRoof(x) + roofT(x) * 0.25 + sy;
      const mid = yMid(x);
      const base = yBase(x) - H * 0.03;
      for (let y = top; y < base; y += sy) {
        if (Math.abs(y - mid) < vipH(x) / 2 + sy * 0.3) continue;
        if (R() < 0.06) continue;
        const px = x + (R() - 0.5) * step * 0.4;
        const upper = y < mid;
        if (upper && Math.abs(x - cx) < W * 0.32 && y > top + sy) {
          tifo[Math.floor((x - cx) / (W * 0.045) + 100) % 2].push(px, y, step * 0.8 * sc, sy * 0.78);
        } else {
          buckets[pick()].push(px, y, step * 0.62 * sc, sy * 0.7);
        }
      }
    }
    const flush = (arr, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let i = 0; i < arr.length; i += 4) ctx.rect(arr[i], arr[i + 1], arr[i + 2], arr[i + 3]);
      ctx.fill();
    };
    buckets.forEach((b, i) => flush(b, pal[i]));
    flush(tifo[0], '#9a1a42');
    flush(tifo[1], '#1d4aa0');
    // Escrita do mosaico em amarelo (com a textura dos cartões por cima)
    const tY = (yRoof(cx) + roofT(cx) * 0.25 + yMid(cx)) / 2;
    const tS = Math.min((yMid(cx) - yRoof(cx)) * 0.36, W * 0.05);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.32, 0);
    ctx.lineTo(cx + W * 0.32, 0);
    ctx.lineTo(cx + W * 0.32, H);
    ctx.lineTo(cx - W * 0.32, H);
    ctx.clip();
    ctx.font = `900 ${Math.round(tS)}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2c62e';
    ctx.fillText('FORÇA BARCHA', cx, tY + tS * 0.08);
    ctx.fillStyle = 'rgba(10,14,30,0.5)';
    for (let y = yRoof(cx); y < yMid(cx); y += step) ctx.fillRect(cx - W * 0.32, y, W * 0.64, Math.max(1, step * 0.22));
    for (let x = cx - W * 0.32; x < cx + W * 0.32; x += step) ctx.fillRect(x, yRoof(cx), Math.max(1, step * 0.2), yMid(cx) - yRoof(cx));
    ctx.restore();
    // Penumbra no anel de cima, luz no anel de baixo
    ctx.fillStyle = this.bgmuLin(ctx, 0, 0, 0, H * 0.52, [[0, 'rgba(4,8,22,0.55)'], [0.45, 'rgba(4,8,22,0.25)'], [1, 'rgba(160,190,255,0.08)']]);
    ctx.beginPath();
    ctx.moveTo(0, yRoof(0));
    this.bgmuTrace(ctx, yRoof, 0, W);
    this.bgmuTrace(ctx, yBase, W, 0);
    ctx.closePath();
    ctx.fill();
    // Camarotes entre os anéis (janelas acesas + fita de LED)
    ctx.beginPath();
    ctx.moveTo(0, yMid(0) - vipH(0) / 2);
    this.bgmuTrace(ctx, (x) => yMid(x) - vipH(x) / 2, 0, W);
    this.bgmuTrace(ctx, (x) => yMid(x) + vipH(x) / 2, W, 0);
    ctx.closePath();
    ctx.fillStyle = '#080b18';
    ctx.fill();
    for (let x = W * 0.01; x < W; x += W / 70) {
      const yy = yMid(x);
      const vh = vipH(x);
      ctx.fillStyle = R() < 0.75 ? 'rgba(255,214,150,0.75)' : 'rgba(120,150,210,0.4)';
      ctx.fillRect(x, yy - vh * 0.05, (W / 70) * 0.7, vh * 0.42);
    }
    const ledSeg = 14;
    for (let i = 0; i < ledSeg; i++) {
      const xa = (W * i) / ledSeg;
      const xb = (W * (i + 1)) / ledSeg;
      ctx.strokeStyle = i % 2 ? '#ff3a6a' : '#3a7aff';
      ctx.lineWidth = Math.max(2, 3 * k);
      ctx.beginPath();
      ctx.moveTo(xa, yMid(xa) - vipH(xa) / 2);
      this.bgmuTrace(ctx, (x) => yMid(x) - vipH(x) / 2, xa, xb, 6);
      ctx.stroke();
    }
    // Teto: estrutura escura com treliça + anel de refletores
    ctx.beginPath();
    ctx.moveTo(0, yRoof(0) - roofT(0));
    this.bgmuTrace(ctx, (x) => yRoof(x) - roofT(x) * 0.2, 0, W);
    this.bgmuTrace(ctx, (x) => yRoof(x) + roofT(x) * 0.3, W, 0);
    ctx.closePath();
    ctx.fillStyle = '#05070f';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,150,220,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += W / 48) {
      ctx.moveTo(x, yRoof(x) - roofT(x) * 0.2);
      ctx.lineTo(x + W / 96, yRoof(x + W / 96) + roofT(x) * 0.3);
      ctx.lineTo(x + W / 48, yRoof(x + W / 48) - roofT(x) * 0.2);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,210,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(0, yRoof(0) + roofT(0) * 0.3);
    this.bgmuTrace(ctx, (x) => yRoof(x) + roofT(x) * 0.3, 0, W);
    ctx.stroke();
    const lamps = 24;
    for (let i = 0; i < lamps; i++) {
      const lx = (W * (i + 0.5)) / lamps;
      const ly = yRoof(lx) + roofT(lx) * 0.18;
      const s = 1 + c(lx) * 0.8;
      if (i % 4 === 1) this.cineShafts(ctx, lx, ly, Math.PI / 2 + (cx - lx) / W * 0.6, H * 0.55, 0.22, 3, '200,220,255', 0.045, 0);
      this.cineGlow(ctx, lx, ly, H * 0.11 * s, 'rgba(170,200,255,0.35)');
      this.cineGlow(ctx, lx, ly, H * 0.03 * s, 'rgba(240,248,255,0.95)');
      this.bgmuRect(ctx, '#ffffff', lx - 5 * k * s, ly - 2 * k * s, 10 * k * s, 4 * k * s);
    }
    // Telão com o placar (lado direito)
    const sx0 = W * 0.735;
    const sx1 = W * 0.905;
    const sy0 = yRoof(sx1) + roofT(sx1) * 0.55 + H * 0.02;
    const sh = H * 0.13;
    this.cineGlow(ctx, (sx0 + sx1) / 2, sy0 + sh / 2, (sx1 - sx0) * 0.8, 'rgba(120,160,255,0.35)');
    this.bgmuRect(ctx, '#05070d', sx0 - 4 * k, sy0 - 4 * k, sx1 - sx0 + 8 * k, sh + 8 * k);
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, sy0, 0, sy0 + sh, [[0, '#0c1a3a'], [1, '#050b1c']]), sx0, sy0, sx1 - sx0, sh);
    const sw = sx1 - sx0;
    this.bgmuText(ctx, 'EL CLÁSICO', sx0 + sw / 2, sy0 + sh * 0.17, sh * 0.13, '#9fb6ea', 'center', '900');
    this.bgmuRect(ctx, '#a3123f', sx0 + sw * 0.1, sy0 + sh * 0.64, sw * 0.13, sh * 0.04);
    this.bgmuRect(ctx, '#1d4aa0', sx0 + sw * 0.23, sy0 + sh * 0.64, sw * 0.13, sh * 0.04);
    this.bgmuRect(ctx, '#f4f4f4', sx0 + sw * 0.66, sy0 + sh * 0.64, sw * 0.24, sh * 0.04);
    const sf = Math.min(sh * 0.15, sw * 0.062);
    this.bgmuText(ctx, 'BARCHA', sx0 + sw * 0.23, sy0 + sh * 0.5, sf, '#ffffff', 'center', '900');
    this.bgmuText(ctx, '1 - 1', sx0 + sw * 0.5, sy0 + sh * 0.5, Math.min(sh * 0.24, sw * 0.085), '#ffd34a', 'center', '900');
    this.bgmuText(ctx, 'RE AL', sx0 + sw * 0.78, sy0 + sh * 0.5, sf, '#ffffff', 'center', '900');
    this.bgmuText(ctx, "78'", sx0 + sw / 2, sy0 + sh * 0.84, sh * 0.15, '#00f5d4', 'center', '900');
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = sy0; y < sy0 + sh; y += 2) ctx.fillRect(sx0, y, sw, 1);
    // Placas de LED na beira do campo
    const yB0 = (x) => yBase(x) - H * 0.03;
    const segs = 9;
    const texts = ['EL CLÁSICO', 'FC BARCHA x RE AL', 'BLTV', 'EL CLÁSICO', 'FC BARCHA x RE AL'];
    for (let i = 0; i < segs; i++) {
      const xa = (W * i) / segs;
      const xb = (W * (i + 1)) / segs;
      ctx.beginPath();
      ctx.moveTo(xa, yB0(xa));
      this.bgmuTrace(ctx, yB0, xa, xb, 8);
      this.bgmuTrace(ctx, yBase, xb, xa, 8);
      ctx.closePath();
      ctx.fillStyle = ['#7a1234', '#123a8a', '#0b1020'][i % 3];
      ctx.fill();
      const xm = (xa + xb) / 2;
      this.bgmuText(ctx, texts[i % texts.length], xm, (yB0(xm) + yBase(xm)) / 2, Math.min(H * 0.018 * (1 + c(xm) * 0.3), (W / segs) * 0.068), i % 3 === 2 ? '#00f5d4' : '#ffffff', 'center', '900');
    }
    // Gramado: faixas de corte, linhas e reflexo das placas
    const yTL = H * 0.548;
    ctx.beginPath();
    ctx.moveTo(0, yBase(0));
    this.bgmuTrace(ctx, yBase, 0, W);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = this.bgmuLin(ctx, 0, H * 0.5, 0, H, [[0, '#17532f'], [0.3, '#22703b'], [1, '#2c8445']]);
    ctx.fill();
    const vpy = -H * 0.9;
    const tx = (xf, y) => cx + (xf - cx) * ((y - vpy) / (yTL - vpy));
    const sw2 = W / 13;
    for (let i = -10; i < 10; i += 2) {
      const xa = cx + i * sw2;
      const xb = xa + sw2;
      this.bgmuPoly(ctx, [[tx(xa, yTL), yTL], [tx(xb, yTL), yTL], [tx(xb, H), H], [tx(xa, H), H]], 'rgba(255,255,255,0.045)');
    }
    ctx.fillStyle = this.bgmuLin(ctx, 0, H * 0.5, 0, yTL, [[0, 'rgba(255,60,110,0.12)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, H * 0.5, W, yTL - H * 0.5);
    ctx.strokeStyle = 'rgba(240,250,240,0.85)';
    ctx.lineWidth = Math.max(1, 1.6 * k);
    ctx.beginPath();
    ctx.moveTo(0, yTL);
    ctx.lineTo(W, yTL);
    ctx.moveTo(cx, yTL);
    ctx.lineTo(cx, H);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, 2.2 * k);
    ctx.beginPath();
    ctx.ellipse(cx, H * 0.79, W * 0.12, H * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Luz forte dos refletores no meio do campo
    this.cineGlow(ctx, cx, H * 0.66, W * 0.45, 'rgba(200,255,210,0.18)');
    // Jogadores espalhados (fora da área atrás da cabeça)
    const barcha = { shirt: '#1d3f8e', stripe: '#9a1a42', short: '#1a2a5e', sock: '#1a2a5e' };
    const real = { shirt: '#f4f4f4', stripe: null, short: '#f4f4f4', sock: '#e8e8e8', hair: '#3a2a1a' };
    const ref = { shirt: '#e7d23a', stripe: null, short: '#111', sock: '#111' };
    [[0.07, 0.69, barcha, 1], [0.17, 0.6, real, -1], [0.24, 0.66, barcha, 0.6], [0.3, 0.575, barcha, -0.8], [0.355, 0.63, real, 1], [0.64, 0.6, ref, 0.4], [0.7, 0.66, real, -1], [0.77, 0.58, barcha, 1], [0.84, 0.64, real, 0.7], [0.93, 0.6, barcha, -0.5]].forEach(([fx, fy, kit, pose]) => {
      this.bgmuFootballer(ctx, W * fx, H * fy, H * (0.035 + (fy - 0.55) * 0.35), kit, pose, k);
    });
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(W * 0.33, H * 0.645, H * 0.0065, 0, Math.PI * 2);
    ctx.fill();
    // Névoa de luz por cima das arquibancadas e flashes de câmera
    ctx.fillStyle = this.bgmuLin(ctx, 0, H * 0.25, 0, H * 0.6, [[0, 'rgba(170,200,255,0)'], [0.6, 'rgba(170,200,255,0.1)'], [1, 'rgba(170,200,255,0)']]);
    ctx.fillRect(0, H * 0.25, W, H * 0.35);
    for (let i = 0; i < 45; i++) {
      const fx = R() * W;
      const fy = yRoof(fx) + roofT(fx) + R() * (yBase(fx) - yRoof(fx) - roofT(fx));
      this.cineGlow(ctx, fx, fy, (4 + R() * 7) * k, 'rgba(255,255,255,0.9)');
    }
    // Torcida em primeiro plano (silhuetas recortadas pela luz do campo)
    const fan = (x, y, s, arm, to) => {
      ctx.fillStyle = '#04060c';
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.95, s * 0.62, s * 0.55, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - s * 0.62, y + s * 0.95, s * 1.24, H);
      ctx.beginPath();
      ctx.arc(x, y + s * 0.28, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(170,205,255,0.5)';
      ctx.lineWidth = Math.max(1, s * 0.04);
      ctx.beginPath();
      ctx.arc(x, y + s * 0.28, s * 0.3, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.95, s * 0.62, s * 0.55, 0, Math.PI * 1.15, Math.PI * 1.4);
      ctx.ellipse(x, y + s * 0.95, s * 0.62, s * 0.55, 0, Math.PI * 1.6, Math.PI * 1.85);
      ctx.stroke();
      if (arm) {
        const ax = to ? to[0] : x + arm * s * 0.7;
        const ay = to ? to[1] : y - s * 0.4;
        ctx.strokeStyle = '#04060c';
        ctx.lineWidth = s * 0.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + arm * s * 0.45, y + s * 0.75);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(170,205,255,0.4)';
        ctx.lineWidth = Math.max(1, s * 0.03);
        ctx.beginPath();
        ctx.moveTo(x + arm * s * 0.45 - arm * s * 0.1, y + s * 0.7);
        ctx.lineTo(ax - arm * s * 0.1, ay);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    };
    const fs = H * 0.12;
    // Cachecol erguido com as duas mãos (esquerda) e bandeira tremulando (direita)
    const scx = W * 0.035;
    const scy = H * 0.72;
    const scw = W * 0.12;
    [[0.02, 0.79, 1, [scx + 2 * k, scy + H * 0.03]], [0.19, 0.86, -1, [scx + scw - 2 * k, scy + H * 0.03]], [0.1, 0.83, 0], [0.82, 0.86, 0], [0.9, 0.81, -1, [W * 0.875, H * 0.62]], [0.98, 0.84, 0]].forEach(([fx, fy, arm, to]) => fan(W * fx, H * fy, fs, arm, to));
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#1d3f8e' : '#9a1a42';
      ctx.fillRect(scx + (scw * i) / 8, scy + Math.sin(i * 0.8) * 2 * k, scw / 8 + 1, H * 0.035);
    }
    this.bgmuText(ctx, 'BARCHA', scx + scw / 2, scy + H * 0.018, H * 0.022, '#f2c62e', 'center', '900');
    const fx0 = W * 0.86;
    const fy0 = H * 0.5;
    this.bgmuLine(ctx, fx0, fy0, fx0 + W * 0.02, H * 0.86, '#1a1a22', Math.max(2, 3 * k));
    const fw = W * 0.12;
    const fh = H * 0.12;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#1d3f8e' : '#9a1a42';
      ctx.beginPath();
      const y0 = fy0 + (fh * i) / 5;
      const y1 = fy0 + (fh * (i + 1)) / 5;
      ctx.moveTo(fx0, y0);
      ctx.bezierCurveTo(fx0 + fw * 0.35, y0 - fh * 0.15, fx0 + fw * 0.65, y0 + fh * 0.15, fx0 + fw, y0 - fh * 0.05);
      ctx.lineTo(fx0 + fw, y1 - fh * 0.05);
      ctx.bezierCurveTo(fx0 + fw * 0.65, y1 + fh * 0.15, fx0 + fw * 0.35, y1 - fh * 0.15, fx0, y1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.moveTo(fx0 + fw * 0.5, fy0);
    ctx.bezierCurveTo(fx0 + fw * 0.6, fy0 + fh * 0.3, fx0 + fw * 0.5, fy0 + fh * 0.7, fx0 + fw * 0.55, fy0 + fh);
    ctx.lineTo(fx0 + fw * 0.7, fy0 + fh);
    ctx.bezierCurveTo(fx0 + fw * 0.65, fy0 + fh * 0.7, fx0 + fw * 0.75, fy0 + fh * 0.3, fx0 + fw * 0.66, fy0);
    ctx.fill();
    this.bgmuVignette(ctx, W, H, 0.55, '1,3,12', 0.45);
  };

  // ============================================================== paris_gala
  // Teatro da gala em Paris: boca de cena dourada, cortinas de veludo, telão com a
  // Bola de Ouro, frisas laterais em perspectiva, lustres, canhões de luz e plateia vermelha
  CE.bgmuVelvet = function (ctx, x0, x1, folds, light, dark) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    for (let i = 0; i <= folds * 2; i++) g.addColorStop(i / (folds * 2), i % 2 ? dark : light);
    return g;
  };

  CE.bgmuParisGala = function (ctx, W, H) {
    const k = H / 620;
    const R = this.bgmuRng(7788);
    const vpx = W / 2;
    const vpy = H * 0.42;
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, 0, 0, H, [[0, '#12050a'], [0.5, '#22070f'], [1, '#0c0306']]), 0, 0, W, H);
    // Teto com caixotões dourados em arco
    ctx.strokeStyle = 'rgba(230,180,90,0.22)';
    ctx.lineWidth = Math.max(1, 1.5 * k);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(vpx, -H * 0.55, W * (0.42 + i * 0.12), H * (0.62 + i * 0.05), 0, 0, Math.PI);
      ctx.stroke();
    }
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(vpx + i * W * 0.03, 0);
      ctx.lineTo(vpx + i * W * 0.16, H * 0.2);
      ctx.stroke();
    }
    // Boca de cena
    const px0 = W * 0.315;
    const px1 = W * 0.685;
    const pt = H * 0.18;
    const pb = H * 0.62;
    const pw = px1 - px0;
    const ph = pb - pt;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px0, pt, pw, ph);
    ctx.clip();
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, pt, 0, pb, [[0, '#0d0820'], [0.6, '#24092c'], [1, '#100410']]), px0, pt, pw, ph);
    // Telão com a Bola de Ouro
    const sx0 = px0 + pw * 0.12;
    const sx1 = px1 - pw * 0.12;
    const sy0 = pt + ph * 0.1;
    const sy1 = pt + ph * 0.68;
    const sw = sx1 - sx0;
    const sh = sy1 - sy0;
    this.bgmuRect(ctx, this.bgmuRad(ctx, vpx, sy0 + sh * 0.42, 0, sw * 0.6, [[0, '#5a3a0a'], [0.5, '#2a1606'], [1, '#0c0604']]), sx0, sy0, sw, sh);
    const bx = vpx;
    const by = sy0 + sh * 0.5;
    const br = Math.min(sh * 0.23, sw * 0.13);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      ctx.fillStyle = i % 2 ? 'rgba(255,200,90,0.12)' : 'rgba(255,220,140,0.06)';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a - 0.05) * sw, by + Math.sin(a - 0.05) * sw);
      ctx.lineTo(bx + Math.cos(a + 0.05) * sw, by + Math.sin(a + 0.05) * sw);
      ctx.fill();
    }
    ctx.restore();
    this.cineGlow(ctx, bx, by, br * 3.2, 'rgba(255,190,80,0.6)');
    ctx.fillStyle = this.bgmuRad(ctx, bx - br * 0.35, by - br * 0.4, br * 0.05, br * 1.1, [[0, '#fff6c8'], [0.35, '#f2c14e'], [0.75, '#b07a1e'], [1, '#6a420c']]);
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,10,0.55)';
    ctx.lineWidth = Math.max(1, br * 0.05);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      ctx.lineTo(bx + Math.cos(a) * br * 0.38, by + Math.sin(a) * br * 0.38);
    }
    ctx.closePath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      ctx.moveTo(bx + Math.cos(a) * br * 0.38, by + Math.sin(a) * br * 0.38);
      ctx.lineTo(bx + Math.cos(a) * br * 0.92, by + Math.sin(a) * br * 0.92);
    }
    ctx.stroke();
    this.cineGlow(ctx, bx - br * 0.35, by - br * 0.4, br * 0.5, 'rgba(255,255,240,0.9)');
    this.bgmuText(ctx, 'BOLA DE OURO', vpx, sy0 + sh * 0.13, Math.min(sh * 0.12, sw * 0.085), '#f6d27a', 'center', '700', 'Georgia, serif');
    this.bgmuText(ctx, '— PARIS —', vpx, sy0 + sh * 0.88, Math.min(sh * 0.06, sw * 0.04), 'rgba(246,210,122,0.7)', 'center', '700', 'Georgia, serif');
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = sy0; y < sy1; y += 3) ctx.fillRect(sx0, y, sw, 1);
    // Colunas de LED dos lados do telão
    [sx0 - pw * 0.05, sx1 + pw * 0.02].forEach((lx) => {
      this.bgmuRect(ctx, this.bgmuLin(ctx, 0, sy0, 0, sy1, [[0, 'rgba(255,210,120,0.9)'], [1, 'rgba(255,160,60,0.2)']]), lx, sy0, pw * 0.03, sh);
    });
    // Palco espelhado
    const stY = pt + ph * 0.8;
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, stY, 0, pb, [[0, '#1a0c10'], [1, '#050203']]), px0, stY, pw, pb - stY);
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.translate(0, stY * 2);
    ctx.scale(1, -1);
    this.cineGlow(ctx, bx, stY + (stY - by) * 0.3, br * 2, 'rgba(255,190,80,0.6)');
    ctx.restore();
    this.bgmuRect(ctx, '#f2c14e', px0, stY, pw, Math.max(1, 1.5 * k));
    // Púlpito
    const lx = px0 + pw * 0.8;
    this.bgmuPoly(ctx, [[lx - pw * 0.05, stY - ph * 0.17], [lx + pw * 0.05, stY - ph * 0.17], [lx + pw * 0.035, stY + ph * 0.04], [lx - pw * 0.035, stY + ph * 0.04]], '#14080c');
    this.bgmuRect(ctx, 'rgba(242,193,78,0.8)', lx - pw * 0.05, stY - ph * 0.17, pw * 0.1, Math.max(1, k));
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(lx, stY - ph * 0.08, pw * 0.014, 0, Math.PI * 2);
    ctx.fill();
    this.bgmuLine(ctx, lx - pw * 0.02, stY - ph * 0.17, lx - pw * 0.035, stY - ph * 0.24, '#222', Math.max(1, k));
    ctx.restore();
    // Cortinas de veludo + bambinela com franja dourada
    const curtainSide = (side) => {
      const xo = side < 0 ? px0 : px1;
      const d = -side;
      const wtop = pw * 0.13;
      const g = this.bgmuVelvet(ctx, side < 0 ? xo : xo - wtop * 1.1, side < 0 ? xo + wtop * 1.1 : xo, 4, '#b3122e', '#4a0410');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(xo, pt);
      ctx.lineTo(xo + d * wtop, pt);
      ctx.quadraticCurveTo(xo + d * wtop * 0.9, pt + ph * 0.42, xo + d * wtop * 0.32, pt + ph * 0.58);
      ctx.quadraticCurveTo(xo + d * wtop * 0.75, pt + ph * 0.8, xo + d * wtop * 1.05, pb);
      ctx.lineTo(xo, pb);
      ctx.closePath();
      ctx.fill();
      this.bgmuRect(ctx, '#e8b84a', Math.min(xo, xo + d * wtop * 0.36), pt + ph * 0.56, wtop * 0.36, 4 * k);
      this.cineGlow(ctx, xo + d * wtop * 0.2, pt + ph * 0.58, 8 * k, 'rgba(255,220,140,0.8)');
    };
    curtainSide(-1);
    curtainSide(1);
    const swags = 5;
    for (let i = 0; i < swags; i++) {
      const xa = px0 + (pw * i) / swags;
      const xb = xa + pw / swags;
      ctx.fillStyle = this.bgmuLin(ctx, 0, pt, 0, pt + ph * 0.12, [[0, '#7a0a1e'], [0.7, '#c01836'], [1, '#5a0614']]);
      ctx.beginPath();
      ctx.moveTo(xa - pw * 0.01, pt);
      ctx.lineTo(xb + pw * 0.01, pt);
      ctx.quadraticCurveTo((xa + xb) / 2, pt + ph * 0.2, xa - pw * 0.01, pt);
      ctx.fill();
      ctx.strokeStyle = '#e8b84a';
      ctx.lineWidth = Math.max(1, 2.5 * k);
      ctx.beginPath();
      ctx.moveTo(xa, pt + ph * 0.005);
      ctx.quadraticCurveTo((xa + xb) / 2, pt + ph * 0.19, xb, pt + ph * 0.005);
      ctx.stroke();
    }
    // Moldura dourada da boca de cena
    const fw = H * 0.035;
    ctx.fillStyle = this.bgmuLin(ctx, 0, pt - fw, 0, pb, [[0, '#f6d27a'], [0.3, '#b0782a'], [0.7, '#d9a748'], [1, '#6a420c']]);
    ctx.beginPath();
    ctx.rect(px0 - fw, pt - fw, pw + fw * 2, ph + fw);
    ctx.rect(px0, pt, pw, ph);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,240,200,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px0 - fw * 0.55, pt - fw * 0.55, pw + fw * 1.1, ph + fw * 0.55);
    ctx.fillStyle = 'rgba(90,50,10,0.6)';
    for (let x = px0 - fw * 0.5; x < px1 + fw * 0.5; x += fw * 0.6) {
      ctx.beginPath();
      ctx.arc(x, pt - fw * 0.28, fw * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    // Brasão em cima da boca de cena
    const cy = pt - fw * 1.1;
    ctx.fillStyle = this.bgmuLin(ctx, 0, cy - fw, 0, cy + fw, [[0, '#fff0b8'], [1, '#a8701e']]);
    ctx.beginPath();
    ctx.moveTo(vpx - fw * 1.2, cy - fw * 0.6);
    ctx.lineTo(vpx + fw * 1.2, cy - fw * 0.6);
    ctx.lineTo(vpx + fw * 1.0, cy + fw * 0.5);
    ctx.lineTo(vpx, cy + fw * 1.1);
    ctx.lineTo(vpx - fw * 1.0, cy + fw * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9a748';
    ctx.lineWidth = Math.max(1, 2 * k);
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.arc(vpx + s * fw * 1.2, cy + fw * 0.2, fw * 1.4, s < 0 ? -Math.PI * 0.6 : -Math.PI * 0.4, s < 0 ? Math.PI * 0.2 : Math.PI * 0.8, s < 0);
      ctx.stroke();
    });
    // Pilastras
    [px0 - fw * 1.7, px1 + fw].forEach((x) => {
      this.bgmuRect(ctx, this.bgmuLin(ctx, x, 0, x + fw * 0.7, 0, [[0, '#6a420c'], [0.5, '#e8b84a'], [1, '#6a420c']]), x, pt - fw, fw * 0.7, ph + fw);
    });

    // Frisas laterais (3 andares) em perspectiva
    const tiers = [0.2, 0.335, 0.47].map((f) => f * H);
    const m = 1.9;
    [-1, 1].forEach((side) => {
      const xi = side < 0 ? px0 - fw * 1.8 : px1 + fw * 1.8;
      const xo = side < 0 ? -W * 0.02 : W * 1.02;
      const yAt = (y, u) => vpy + (y - vpy) * (1 + (m - 1) * u);
      const xAt = (u) => xi + (xo - xi) * u;
      // Parede lateral
      this.bgmuPoly(ctx, [[xi, 0], [xo, 0], [xo, H], [xi, H]], side < 0 ? '#1c060c' : '#1a050b');
      tiers.forEach((ty, ti) => {
        const band = H * 0.032;
        const nextTop = ti === 0 ? -H : tiers[ti - 1];
        // Interior do camarote
        ctx.fillStyle = this.bgmuLin(ctx, 0, yAt(ty, 0.5) - H * 0.12, 0, yAt(ty, 0.5), [[0, '#250810'], [1, '#4a0d1a']]);
        ctx.beginPath();
        ctx.moveTo(xi, Math.max(yAt(nextTop, 0) + band, yAt(ty, 0) - H * 0.15));
        ctx.lineTo(xo, Math.max(yAt(nextTop, 1) + band * m, yAt(ty, 1) - H * 0.15 * m));
        ctx.lineTo(xo, yAt(ty, 1));
        ctx.lineTo(xi, yAt(ty, 0));
        ctx.closePath();
        ctx.fill();
        // Público nos camarotes + abajures
        const n = 9;
        for (let j = 0; j < n; j++) {
          const u = Math.pow((j + 0.5) / n, 1.25);
          const x = xAt(u);
          const s = 1 + (m - 1) * u;
          const y = yAt(ty, u);
          if (R() < 0.75) {
            ctx.fillStyle = '#0a0306';
            ctx.beginPath();
            ctx.arc(x, y - 9 * k * s, 4.5 * k * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x, y, 8 * k * s, 6 * k * s, 0, Math.PI, 0);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,200,120,0.45)';
            ctx.lineWidth = Math.max(1, k * s * 0.8);
            ctx.beginPath();
            ctx.arc(x, y - 9 * k * s, 4.5 * k * s, Math.PI * (side < 0 ? 1.5 : 1.0), Math.PI * (side < 0 ? 2.0 : 1.5));
            ctx.stroke();
          }
          if (j % 3 === 1) this.cineGlow(ctx, x + side * 10 * k * s, y - 22 * k * s, 16 * k * s, 'rgba(255,190,110,0.75)');
        }
        // Colunas entre camarotes
        for (let j = 0; j <= 4; j++) {
          const u = Math.pow(j / 4, 1.25);
          const x = xAt(u);
          const s = 1 + (m - 1) * u;
          this.bgmuRect(ctx, '#8a5a1a', x - 2 * k * s, yAt(ty, u) - H * 0.12 * s, 4 * k * s, H * 0.12 * s);
          this.bgmuRect(ctx, 'rgba(255,230,160,0.5)', x - 2 * k * s, yAt(ty, u) - H * 0.12 * s, Math.max(1, k * s), H * 0.12 * s);
        }
        // Parapeito: veludo vermelho + corrimão dourado
        ctx.fillStyle = this.bgmuLin(ctx, 0, yAt(ty, 0), 0, yAt(ty, 0) + band, [[0, '#8a0f24'], [1, '#4a0612']]);
        ctx.beginPath();
        ctx.moveTo(xi, yAt(ty, 0));
        ctx.lineTo(xo, yAt(ty, 1));
        ctx.lineTo(xo, yAt(ty, 1) + band * m);
        ctx.lineTo(xi, yAt(ty, 0) + band);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#e8b84a';
        ctx.lineWidth = Math.max(1.5, 3 * k);
        ctx.beginPath();
        ctx.moveTo(xi, yAt(ty, 0));
        ctx.lineTo(xo, yAt(ty, 1));
        ctx.stroke();
        ctx.strokeStyle = 'rgba(232,184,74,0.6)';
        ctx.lineWidth = Math.max(1, k);
        ctx.beginPath();
        ctx.moveTo(xi, yAt(ty, 0) + band);
        ctx.lineTo(xo, yAt(ty, 1) + band * m);
        ctx.stroke();
        for (let j = 0; j < 12; j++) {
          const u = (j + 0.5) / 12;
          ctx.fillStyle = 'rgba(232,184,74,0.7)';
          ctx.beginPath();
          ctx.arc(xAt(u), yAt(ty, u) + band * (1 + (m - 1) * u) * 0.5, 2 * k * (1 + (m - 1) * u), 0, Math.PI * 2);
          ctx.fill();
        }
        // Sombra embaixo
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.moveTo(xi, yAt(ty, 0) + band);
        ctx.lineTo(xo, yAt(ty, 1) + band * m);
        ctx.lineTo(xo, yAt(ty, 1) + band * m * 2.2);
        ctx.lineTo(xi, yAt(ty, 0) + band * 2);
        ctx.closePath();
        ctx.fill();
      });
    });

    // Lustres de cristal
    [0.25, 0.75].forEach((fx) => {
      const x = W * fx;
      const y = H * 0.085;
      this.bgmuLine(ctx, x, 0, x, y - H * 0.03, '#6a4a1a', Math.max(1, k));
      this.cineGlow(ctx, x, y, H * 0.2, 'rgba(255,200,120,0.4)');
      ctx.strokeStyle = '#c9952e';
      ctx.lineWidth = Math.max(1, 1.5 * k);
      for (let t = 0; t < 3; t++) {
        ctx.beginPath();
        ctx.ellipse(x, y + t * H * 0.012, W * 0.04 - t * W * 0.01, H * 0.012, 0, 0, Math.PI);
        ctx.stroke();
      }
      for (let i = 0; i < 9; i++) {
        const a = (i / 8) * Math.PI;
        const cx = x + Math.cos(a) * W * 0.04;
        const cy = y + Math.sin(a) * H * 0.012;
        this.cineGlow(ctx, cx, cy - 3 * k, 7 * k, 'rgba(255,245,210,0.95)');
        this.bgmuPoly(ctx, [[cx, cy], [cx + 2 * k, cy + 5 * k], [cx, cy + 10 * k], [cx - 2 * k, cy + 5 * k]], 'rgba(255,250,230,0.8)');
      }
      this.bgmuPoly(ctx, [[x, y + H * 0.02], [x + 5 * k, y + H * 0.045], [x, y + H * 0.07], [x - 5 * k, y + H * 0.045]], 'rgba(255,250,230,0.9)');
    });

    // Canhões de luz cruzando até o palco
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = (x0, y0, x1, y1, w0, w1, col) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(${col},0.22)`);
      g.addColorStop(1, `rgba(${col},0.02)`);
      ctx.fillStyle = g;
      const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(x0 - Math.cos(a) * w0, y0 - Math.sin(a) * w0);
      ctx.lineTo(x0 + Math.cos(a) * w0, y0 + Math.sin(a) * w0);
      ctx.lineTo(x1 + Math.cos(a) * w1, y1 + Math.sin(a) * w1);
      ctx.lineTo(x1 - Math.cos(a) * w1, y1 - Math.sin(a) * w1);
      ctx.closePath();
      ctx.fill();
    };
    beam(W * 0.04, 0, vpx - pw * 0.05, pb, 6 * k, W * 0.05, '255,230,170');
    beam(W * 0.96, 0, vpx + pw * 0.05, pb, 6 * k, W * 0.05, '255,230,170');
    beam(px0 + pw * 0.1, pt, px0 - pw * 0.3, H * 0.75, 3 * k, W * 0.05, '120,160,255');
    beam(px1 - pw * 0.1, pt, px1 + pw * 0.3, H * 0.75, 3 * k, W * 0.05, '120,160,255');
    ctx.restore();
    this.cineGlow(ctx, W * 0.04, 0, 30 * k, 'rgba(255,240,200,0.9)');
    this.cineGlow(ctx, W * 0.96, 0, 30 * k, 'rgba(255,240,200,0.9)');

    // Plateia: fileiras curvas de poltronas vermelhas (as de trás primeiro)
    const rows = 10;
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);
      const y0 = H * 0.6 + H * 0.46 * Math.pow(t, 1.5);
      const s = 0.35 + 1.5 * t;
      const sw2 = 24 * k * s;
      const curve = (x) => y0 + Math.pow((x - vpx) / W, 2) * H * 0.3 * s;
      const off = (r % 2) * sw2 * 0.5;
      for (let x = -sw2 + off; x < W + sw2; x += sw2 * 1.08) {
        const y = curve(x);
        const occupied = R() < 0.72;
        if (occupied) {
          ctx.fillStyle = '#080204';
          ctx.beginPath();
          ctx.arc(x + sw2 / 2, y - sw2 * 0.55, sw2 * 0.24, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + sw2 / 2, y - sw2 * 0.05, sw2 * 0.44, sw2 * 0.35, 0, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,210,140,0.4)';
          ctx.lineWidth = Math.max(1, s);
          ctx.beginPath();
          ctx.arc(x + sw2 / 2, y - sw2 * 0.55, sw2 * 0.24, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
        ctx.fillStyle = this.bgmuLin(ctx, 0, y - sw2 * 0.15, 0, y + sw2 * 0.6, [[0, '#d42a48'], [0.25, '#9a1028'], [1, '#3a040e']]);
        ctx.beginPath();
        const rr = sw2 * 0.18;
        ctx.moveTo(x + rr, y - sw2 * 0.15);
        ctx.lineTo(x + sw2 - rr, y - sw2 * 0.15);
        ctx.quadraticCurveTo(x + sw2, y - sw2 * 0.15, x + sw2, y);
        ctx.lineTo(x + sw2, y + sw2 * 0.6);
        ctx.lineTo(x, y + sw2 * 0.6);
        ctx.lineTo(x, y);
        ctx.quadraticCurveTo(x, y - sw2 * 0.15, x + rr, y - sw2 * 0.15);
        ctx.fill();
      }
    }
    // Plateia na penumbra (só as primeiras fileiras pegam a luz do palco)
    ctx.fillStyle = this.bgmuLin(ctx, 0, H * 0.58, 0, H, [[0, 'rgba(12,2,5,0.05)'], [0.35, 'rgba(12,2,5,0.4)'], [1, 'rgba(8,1,3,0.72)']]);
    ctx.fillRect(0, H * 0.58, W, H * 0.42);
    this.cineGlow(ctx, vpx, H * 0.62, W * 0.3, 'rgba(255,170,90,0.22)');
    // Brilho dourado no ar: confete, bokeh e flashes
    this.cineBokeh(ctx, W, H * 0.15, H * 0.7, 0, 16, ['rgba(255,210,120,0.35)', 'rgba(255,170,90,0.3)'], 7);
    for (let i = 0; i < 110; i++) {
      const x = R() * W;
      const y = R() * H * 0.9;
      const s = (2 + R() * 4) * k;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(R() * Math.PI);
      ctx.fillStyle = R() < 0.7 ? `rgba(246,${190 + Math.floor(R() * 50)},90,${0.5 + R() * 0.5})` : 'rgba(255,255,255,0.7)';
      ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      ctx.restore();
    }
    for (let i = 0; i < 14; i++) {
      const x = R() < 0.5 ? R() * W * 0.28 : W * 0.72 + R() * W * 0.28;
      this.cineGlow(ctx, x, H * (0.15 + R() * 0.5), (5 + R() * 8) * k, 'rgba(255,255,255,0.9)');
    }
    this.bgmuVignette(ctx, W, H, 0.6, '12,2,4', 0.42);
  };

  // ============================================================= hotel_night
  // Quarto do hotel da seleção de madrugada: porta de vidro para a varanda, a cidade
  // inteira acesa (torre treliçada, viaduto com rastros de faróis), cama e abajur
  CE.bgmuLatticeTower = function (ctx, x, base, h, k) {
    const wB = h * 0.32;
    const glow = 'rgba(255,120,50,0.35)';
    this.cineGlow(ctx, x, base - h * 0.45, h * 0.7, glow);
    const L = (t) => x - (wB / 2) * Math.pow(1 - t, 1.8) - h * 0.012;
    const Rr = (t) => x + (wB / 2) * Math.pow(1 - t, 1.8) + h * 0.012;
    const Y = (t) => base - h * 0.82 * t;
    ctx.lineWidth = Math.max(1, h * 0.012);
    const segs = 12;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      ctx.strokeStyle = i % 3 === 2 ? '#ffe9d6' : '#ff6a2a';
      ctx.beginPath();
      ctx.moveTo(L(t0), Y(t0));
      ctx.lineTo(L(t1), Y(t1));
      ctx.moveTo(Rr(t0), Y(t0));
      ctx.lineTo(Rr(t1), Y(t1));
      ctx.moveTo(L(t0), Y(t0));
      ctx.lineTo(Rr(t1), Y(t1));
      ctx.moveTo(Rr(t0), Y(t0));
      ctx.lineTo(L(t1), Y(t1));
      ctx.stroke();
    }
    // Arco da base e mirantes
    ctx.strokeStyle = '#ff6a2a';
    ctx.beginPath();
    ctx.moveTo(L(0), base);
    ctx.quadraticCurveTo(x, base - h * 0.2, Rr(0), base);
    ctx.stroke();
    [0.38, 0.6].forEach((t, i) => {
      const w = (Rr(t) - L(t)) * (1.5 - i * 0.2);
      this.bgmuRect(ctx, '#ffe2c4', x - w / 2, Y(t) - h * 0.03, w, h * 0.03);
      this.cineGlow(ctx, x, Y(t) - h * 0.015, w * 0.9, 'rgba(255,220,180,0.5)');
    });
    this.bgmuLine(ctx, x, Y(1), x, base - h, '#ffe9d6', Math.max(1, h * 0.01));
    this.cineGlow(ctx, x, base - h, h * 0.04, 'rgba(255,60,60,0.95)');
  };

  CE.bgmuHotelView = function (ctx, x, y, w, h, k, R) {
    const hz = y + h * 0.6;
    ctx.fillStyle = this.bgmuLin(ctx, 0, y, 0, hz, [[0, '#040918'], [0.45, '#101c48'], [0.8, '#30306a'], [1, '#6a3f6e']]);
    ctx.fillRect(x, y, w, hz - y + 2);
    this.bgmuStars(ctx, x, y, w, h * 0.3, Math.round((w * h) / 4500), R, 0.7);
    this.bgmuMoon(ctx, x + w * 0.24, y + h * 0.11, Math.max(6, h * 0.032));
    // Nuvens baixas pegando a luz laranja da cidade
    this.bgmuCloud(ctx, x - w * 0.05, y + h * 0.3, w * 0.5, h * 0.035, R, 'rgba(36,34,80,0.9)', 'rgba(150,120,200,0.3)', -0.1);
    this.bgmuCloud(ctx, x + w * 0.5, y + h * 0.4, w * 0.6, h * 0.03, R, 'rgba(60,44,96,0.85)', 'rgba(255,150,120,0.25)', -0.12);
    // Cidade em camadas
    this.bgmuSkyline(ctx, x, x + w, hz, { hMin: h * 0.04, hMax: h * 0.16, wMin: w * 0.02, wMax: w * 0.05, body: '#2a2c62', side: '#24265a', wins: ['rgba(255,214,170,0.45)', 'rgba(190,210,255,0.4)'], winP: 0.2, winW: 1.4 * k, winH: 1.4 * k, gapX: 2.2 * k, gapY: 2.4 * k, roof: true }, R);
    ctx.fillStyle = this.bgmuLin(ctx, 0, hz - h * 0.12, 0, hz, [[0, 'rgba(120,80,140,0)'], [1, 'rgba(160,100,150,0.5)']]);
    ctx.fillRect(x, hz - h * 0.12, w, h * 0.12);
    this.bgmuLatticeTower(ctx, x + w * 0.66, hz + h * 0.03, h * 0.46, k);
    this.bgmuSkyline(ctx, x, x + w, hz + h * 0.1, { hMin: h * 0.06, hMax: h * 0.26, wMin: w * 0.03, wMax: w * 0.08, body: '#141a3e', side: '#10153a', rim: 'rgba(150,170,255,0.15)', wins: ['rgba(255,214,150,0.75)', 'rgba(200,225,255,0.65)', 'rgba(255,240,210,0.8)'], winP: 0.3, winW: 2 * k, winH: 2.2 * k, gapX: 2.6 * k, gapY: 3 * k, beacon: true, roof: true }, R);
    // Viaduto com rastros de faróis
    const vy = hz + h * 0.13;
    this.bgmuRect(ctx, '#0a0e22', x, vy, w, h * 0.025);
    this.bgmuRect(ctx, 'rgba(160,180,255,0.3)', x, vy, w, Math.max(1, k));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const lx = x + R() * w;
      const len = w * (0.06 + R() * 0.16);
      const red = i % 2;
      ctx.strokeStyle = red ? 'rgba(255,60,60,0.75)' : 'rgba(255,240,200,0.8)';
      ctx.lineWidth = Math.max(1, 1.6 * k);
      ctx.beginPath();
      ctx.moveTo(lx, vy - (red ? 2.5 : 5) * k);
      ctx.lineTo(lx + len, vy - (red ? 2.5 : 5) * k);
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) this.cineGlow(ctx, x + (w * (i + 0.5)) / 10, vy - 9 * k, 6 * k, 'rgba(255,200,120,0.8)');
    ctx.restore();
    for (let i = 0; i < 8; i++) this.bgmuRect(ctx, '#080b1c', x + (w * (i + 0.3)) / 8, vy + h * 0.025, w * 0.012, h);
    // Prédios bem perto nas laterais
    const tower = (tx, tw, top, cool) => {
      ctx.fillStyle = this.bgmuLin(ctx, tx, 0, tx + tw, 0, [[0, '#0c1230'], [1, '#070a1e']]);
      ctx.fillRect(tx, top, tw, h * 2);
      const cols = 6;
      for (let r = 0; r < 40; r++) {
        for (let cI = 0; cI < cols; cI++) {
          const wy = top + h * 0.02 + r * h * 0.035;
          if (wy > y + h) break;
          if (R() < 0.42) {
            ctx.fillStyle = cool ? 'rgba(180,215,255,0.75)' : 'rgba(255,220,160,0.75)';
            ctx.fillRect(tx + tw * (0.08 + cI * 0.15), wy, tw * 0.1, h * 0.02);
          }
        }
      }
      this.bgmuRect(ctx, 'rgba(160,190,255,0.35)', tx, top, Math.max(1, k), h * 2);
      this.cineGlow(ctx, tx + tw / 2, top - 3 * k, 8 * k, 'rgba(255,60,60,0.9)');
    };
    tower(x + w * 0.01, w * 0.13, y + h * 0.2, true);
    tower(x + w * 0.88, w * 0.14, y + h * 0.28, false);
    this.cineBokeh(ctx, w, y + h * 0.62, y + h * 0.78, 0, 10, ['rgba(255,200,130,0.35)', 'rgba(150,190,255,0.3)'], 4);
  };

  CE.bgmuHotelNight = function (ctx, W, H) {
    const k = H / 620;
    const R = this.bgmuRng(4404);
    const floorY = H * 0.86;
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, 0, 0, H, [[0, '#141b36'], [0.6, '#0f152c'], [1, '#090d1d']]), 0, 0, W, H);
    // Painéis de madeira escura na parede
    ctx.fillStyle = 'rgba(150,170,230,0.035)';
    for (let x = 0; x < W * 0.5; x += W * 0.06) ctx.fillRect(x, H * 0.05, 1, floorY - H * 0.05);
    // Teto com spots apagados e a sanca
    this.bgmuRect(ctx, '#0a0e20', 0, 0, W, H * 0.045);
    this.bgmuRect(ctx, 'rgba(160,180,240,0.15)', 0, H * 0.045, W, Math.max(1, k));
    [0.12, 0.3].forEach((f) => {
      ctx.fillStyle = '#1c2446';
      ctx.beginPath();
      ctx.ellipse(W * f, H * 0.022, 9 * k, 3 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // Porta de vidro para a varanda
    const gx0 = W * 0.5;
    const gx1 = W * 0.97;
    const gy0 = H * 0.075;
    const gy1 = floorY;
    const gw = gx1 - gx0;
    const gh = gy1 - gy0;
    this.cineGlow(ctx, gx0 + gw / 2, gy0 + gh * 0.5, gw * 0.75, 'rgba(110,100,200,0.35)');
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx0, gy0, gw, gh);
    ctx.clip();
    this.bgmuHotelView(ctx, gx0, gy0, gw, gh, k, R);
    // Varanda: guarda-corpo de vidro e piso
    const ry0 = gy0 + gh * 0.7;
    const ry1 = gy0 + gh * 0.9;
    this.bgmuRect(ctx, 'rgba(110,150,230,0.14)', gx0, ry0, gw, ry1 - ry0);
    this.bgmuRect(ctx, '#0c1128', gx0, ry1, gw, gy1 - ry1);
    this.bgmuRect(ctx, 'rgba(150,170,240,0.35)', gx0, ry1, gw, Math.max(1, k));
    for (let i = 0; i <= 5; i++) this.bgmuRect(ctx, '#1a2246', gx0 + (gw * i) / 5 - 2 * k, ry0, 4 * k, ry1 - ry0);
    this.bgmuRect(ctx, '#2a3460', gx0, ry0 - 3 * k, gw, 5 * k);
    this.bgmuRect(ctx, 'rgba(220,230,255,0.6)', gx0, ry0 - 3 * k, gw, Math.max(1, k));
    // Reflexos no vidro (fixo à esquerda)
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(160,190,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(gx0 + gw * 0.1, gy0);
    ctx.lineTo(gx0 + gw * 0.22, gy0);
    ctx.lineTo(gx0 + gw * 0.05, gy1);
    ctx.lineTo(gx0 - gw * 0.07, gy1);
    ctx.fill();
    this.cineGlow(ctx, gx0 + gw * 0.12, gy0 + gh * 0.55, gw * 0.05, 'rgba(255,190,110,0.35)');
    ctx.restore();
    // Caixilhos
    const fw = Math.max(3, 6 * k);
    ctx.strokeStyle = '#1a2142';
    ctx.lineWidth = fw;
    ctx.strokeRect(gx0, gy0, gw, gh);
    this.bgmuRect(ctx, '#1a2142', gx0 + gw * 0.5 - fw, gy0, fw * 2, gh);
    this.bgmuRect(ctx, 'rgba(170,195,255,0.3)', gx0 + gw * 0.5 + fw - 1, gy0, 1, gh);
    this.bgmuRect(ctx, '#9aa8d0', gx0 + gw * 0.5 - fw * 1.6, gy0 + gh * 0.48, fw * 0.6, gh * 0.08);
    // Cortina pesada à esquerda e voil soprando na parte aberta
    const heavy = (x0, x1) => {
      ctx.fillStyle = this.bgmuVelvet(ctx, x0, x1, 4, '#2c3768', '#121a3a');
      ctx.fillRect(x0, gy0 - 6 * k, x1 - x0, gy1 - gy0 + 6 * k);
    };
    heavy(gx0 - W * 0.035, gx0 + gw * 0.045);
    heavy(gx1 - gw * 0.04, W);
    ctx.fillStyle = 'rgba(220,230,255,0.13)';
    ctx.beginPath();
    ctx.moveTo(gx0 + gw * 0.6, gy0);
    ctx.lineTo(gx1 - gw * 0.04, gy0);
    ctx.lineTo(gx1 - gw * 0.06, gy1);
    ctx.bezierCurveTo(gx1 - gw * 0.2, gy1 - gh * 0.05, gx0 + gw * 0.48, gy0 + gh * 0.75, gx0 + gw * 0.44, gy0 + gh * 0.55);
    ctx.bezierCurveTo(gx0 + gw * 0.5, gy0 + gh * 0.35, gx0 + gw * 0.62, gy0 + gh * 0.2, gx0 + gw * 0.6, gy0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,238,255,0.18)';
    ctx.lineWidth = Math.max(1, k);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(gx0 + gw * (0.63 + i * 0.05), gy0);
      ctx.bezierCurveTo(gx0 + gw * (0.6 + i * 0.05), gy0 + gh * 0.3, gx0 + gw * (0.5 + i * 0.07), gy0 + gh * 0.6, gx0 + gw * (0.55 + i * 0.07), gy1);
      ctx.stroke();
    }
    this.bgmuRect(ctx, '#232c55', gx0 - W * 0.04, gy0 - 9 * k, gw + W * 0.08, 4 * k);

    // Quadro com uma onda (estilo ukiyo-e) acima da cama
    const ax0 = W * 0.205;
    const ay0 = H * 0.2;
    const aw = W * 0.13;
    const ah = H * 0.15;
    this.bgmuRect(ctx, 'rgba(0,0,0,0.35)', ax0 + 4 * k, ay0 + 4 * k, aw, ah);
    this.bgmuRect(ctx, '#2a2234', ax0 - 4 * k, ay0 - 4 * k, aw + 8 * k, ah + 8 * k);
    this.bgmuRect(ctx, '#c9c2a8', ax0, ay0, aw, ah);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax0, ay0, aw, ah);
    ctx.clip();
    ctx.fillStyle = '#28497a';
    ctx.beginPath();
    ctx.moveTo(ax0, ay0 + ah);
    ctx.bezierCurveTo(ax0 + aw * 0.1, ay0 + ah * 0.2, ax0 + aw * 0.5, ay0 + ah * 0.05, ax0 + aw * 0.6, ay0 + ah * 0.4);
    ctx.bezierCurveTo(ax0 + aw * 0.5, ay0 + ah * 0.35, ax0 + aw * 0.45, ay0 + ah * 0.6, ax0 + aw * 0.55, ay0 + ah * 0.65);
    ctx.bezierCurveTo(ax0 + aw * 0.7, ay0 + ah * 0.7, ax0 + aw * 0.85, ay0 + ah * 0.6, ax0 + aw, ay0 + ah * 0.7);
    ctx.lineTo(ax0 + aw, ay0 + ah);
    ctx.fill();
    ctx.fillStyle = '#eef0f4';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(ax0 + aw * (0.25 + i * 0.07), ay0 + ah * (0.22 + Math.sin(i) * 0.03), aw * 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7a8aa0';
    this.bgmuPoly(ctx, [[ax0 + aw * 0.72, ay0 + ah * 0.68], [ax0 + aw * 0.8, ay0 + ah * 0.5], [ax0 + aw * 0.88, ay0 + ah * 0.68]], '#e8e8ec');
    ctx.restore();
    ctx.fillStyle = 'rgba(10,16,40,0.35)';
    ctx.fillRect(ax0, ay0, aw, ah);

    // Cama de casal em perspectiva, cabeceira estofada e luzes de leitura
    const hb0 = W * 0.04;
    const hb1 = W * 0.31;
    this.bgmuRect(ctx, '#232c52', hb0, H * 0.44, hb1 - hb0, H * 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 1; i < 6; i++) ctx.fillRect(hb0 + ((hb1 - hb0) * i) / 6, H * 0.44, Math.max(1, k), H * 0.22);
    this.bgmuRect(ctx, 'rgba(170,190,255,0.25)', hb0, H * 0.44, hb1 - hb0, Math.max(1, k));
    [hb0 + W * 0.015, hb1 - W * 0.015].forEach((lx) => {
      this.cineGlow(ctx, lx, H * 0.4, H * 0.06, 'rgba(255,190,110,0.45)');
      this.bgmuRect(ctx, '#d9b87a', lx - 3 * k, H * 0.395, 6 * k, 4 * k);
    });
    const by0 = H * 0.64;
    ctx.fillStyle = this.bgmuLin(ctx, 0, by0, 0, H, [[0, '#9cadd8'], [0.25, '#6f81b5'], [1, '#2a3566']]);
    ctx.beginPath();
    ctx.moveTo(hb0 + W * 0.005, by0);
    ctx.lineTo(hb1 - W * 0.005, by0);
    ctx.lineTo(W * 0.37, H);
    ctx.lineTo(-W * 0.06, H);
    ctx.closePath();
    ctx.fill();
    // Travesseiros
    [0.09, 0.21].forEach((f) => {
      ctx.fillStyle = '#c2cdea';
      ctx.beginPath();
      ctx.ellipse(W * f + W * 0.02, by0 + H * 0.012, W * 0.055, H * 0.022, 0, 0, Math.PI * 2);
      ctx.fill();
      this.bgmuRect(ctx, 'rgba(255,255,255,0.4)', W * f, by0 - H * 0.004, W * 0.05, Math.max(1, k));
    });
    // Edredom dobrado + dobras
    // Edredom azul cobrindo o pé da cama, com dobras
    const dY = H * 0.71;
    const xLft = (y) => hb0 + W * 0.005 + ((-W * 0.06 - hb0) * (y - by0)) / (H - by0);
    const xRgt = (y) => hb1 - W * 0.005 + ((W * 0.37 - hb1) * (y - by0)) / (H - by0);
    ctx.fillStyle = this.bgmuLin(ctx, 0, dY, 0, H, [[0, '#3a5296'], [0.3, '#2b3f7a'], [1, '#141f48']]);
    ctx.beginPath();
    ctx.moveTo(xLft(dY) - W * 0.01, dY);
    ctx.quadraticCurveTo((xLft(dY) + xRgt(dY)) / 2, dY - H * 0.015, xRgt(dY) + W * 0.01, dY);
    ctx.lineTo(xRgt(H) + W * 0.015, H);
    ctx.lineTo(xLft(H) - W * 0.015, H);
    ctx.closePath();
    ctx.fill();
    this.bgmuLine(ctx, xLft(dY) - W * 0.01, dY, xRgt(dY) + W * 0.01, dY, 'rgba(190,210,255,0.4)', Math.max(1, k));
    ctx.strokeStyle = 'rgba(10,16,40,0.4)';
    ctx.lineWidth = Math.max(1, 2 * k);
    for (let i = 0; i < 5; i++) {
      const x0 = xLft(dY) + (xRgt(dY) - xLft(dY)) * (0.12 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(x0, dY + H * 0.01);
      ctx.quadraticCurveTo(x0 + W * 0.02, dY + H * 0.12, x0 - W * 0.01 + (i - 2) * W * 0.03, H);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(140,165,240,0.22)';
    ctx.lineWidth = Math.max(1, k);
    for (let i = 0; i < 5; i++) {
      const x0 = xLft(dY) + (xRgt(dY) - xLft(dY)) * (0.15 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(x0, dY + H * 0.01);
      ctx.quadraticCurveTo(x0 + W * 0.02, dY + H * 0.12, x0 - W * 0.005 + (i - 2) * W * 0.03, H);
      ctx.stroke();
    }
    // Lateral da cama
    this.bgmuPoly(ctx, [[xRgt(by0), by0], [xRgt(H), H], [xRgt(H) + W * 0.02, H], [xRgt(by0) + W * 0.004, by0 + H * 0.05]], '#1a2348');
    ctx.fillStyle = this.bgmuLin(ctx, 0, H * 0.78, 0, H, [[0, 'rgba(8,12,30,0)'], [1, 'rgba(8,12,30,0.55)']]);
    ctx.fillRect(0, H * 0.78, W * 0.4, H * 0.22);
    // Criado-mudo com o abajur aceso e o celular
    const nx0 = W * 0.325;
    const nx1 = W * 0.395;
    const ny = H * 0.66;
    this.cineGlow(ctx, (nx0 + nx1) / 2, ny - H * 0.1, H * 0.3, 'rgba(255,170,90,0.42)');
    this.bgmuRect(ctx, '#1e1a2c', nx0, ny, nx1 - nx0, H * 0.14);
    this.bgmuRect(ctx, 'rgba(255,200,140,0.5)', nx0, ny, nx1 - nx0, Math.max(1, k));
    this.bgmuRect(ctx, 'rgba(0,0,0,0.4)', nx0 + (nx1 - nx0) * 0.1, ny + H * 0.06, (nx1 - nx0) * 0.8, Math.max(1, k));
    const lcx = nx0 + (nx1 - nx0) * 0.4;
    this.bgmuRect(ctx, '#3a3040', lcx - 2 * k, ny - H * 0.06, 4 * k, H * 0.06);
    ctx.fillStyle = this.bgmuLin(ctx, 0, ny - H * 0.12, 0, ny - H * 0.06, [[0, '#ffe2b0'], [1, '#f2a860']]);
    ctx.beginPath();
    ctx.moveTo(lcx - W * 0.015, ny - H * 0.12);
    ctx.lineTo(lcx + W * 0.015, ny - H * 0.12);
    ctx.lineTo(lcx + W * 0.022, ny - H * 0.06);
    ctx.lineTo(lcx - W * 0.022, ny - H * 0.06);
    ctx.fill();
    this.cineGlow(ctx, lcx, ny - H * 0.05, W * 0.03, 'rgba(255,220,160,0.7)');
    this.cineGlow(ctx, nx1 - (nx1 - nx0) * 0.2, ny - 2 * k, 14 * k, 'rgba(140,200,255,0.6)');
    this.bgmuRect(ctx, '#bfe0ff', nx1 - (nx1 - nx0) * 0.3, ny - 2 * k, (nx1 - nx0) * 0.2, 2 * k);

    // Chão (carpete) com a luz da janela projetada
    ctx.fillStyle = this.bgmuLin(ctx, 0, floorY, 0, H, [[0, '#121834'], [1, '#070a16']]);
    ctx.fillRect(W * 0.36, floorY, W, H - floorY);
    this.bgmuRect(ctx, '#1d2446', W * 0.36, floorY - 4 * k, W, 4 * k);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(110,120,220,0.12)';
    ctx.beginPath();
    ctx.moveTo(gx0, floorY);
    ctx.lineTo(gx1, floorY);
    ctx.lineTo(gx1 - W * 0.1, H);
    ctx.lineTo(gx0 - W * 0.22, H);
    ctx.fill();
    ctx.restore();
    // Poltrona com a camisa da seleção (azul, número 10) em silhueta
    const px = W * 0.885;
    const py = H * 0.7;
    const ps = H * 0.2;
    this.bgmuPoly(ctx, [[px - ps * 0.5, py], [px + ps * 0.6, py], [px + ps * 0.7, H], [px - ps * 0.6, H]], '#0a0e20');
    this.bgmuRect(ctx, '#0a0e20', px - ps * 0.7, py + ps * 0.35, ps * 1.5, ps * 0.4);
    ctx.fillStyle = '#1e3fa0';
    ctx.beginPath();
    ctx.moveTo(px - ps * 0.12, py - ps * 0.04);
    ctx.lineTo(px - ps * 0.32, py);
    ctx.lineTo(px - ps * 0.55, py + ps * 0.2);
    ctx.lineTo(px - ps * 0.45, py + ps * 0.3);
    ctx.lineTo(px - ps * 0.3, py + ps * 0.2);
    ctx.lineTo(px - ps * 0.28, py + ps * 0.62);
    ctx.lineTo(px + ps * 0.36, py + ps * 0.6);
    ctx.lineTo(px + ps * 0.32, py + ps * 0.2);
    ctx.lineTo(px + ps * 0.48, py + ps * 0.32);
    ctx.lineTo(px + ps * 0.58, py + ps * 0.22);
    ctx.lineTo(px + ps * 0.34, py);
    ctx.lineTo(px + ps * 0.14, py - ps * 0.04);
    ctx.quadraticCurveTo(px, py + ps * 0.08, px - ps * 0.12, py - ps * 0.04);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,190,255,0.45)';
    ctx.lineWidth = Math.max(1, k);
    ctx.beginPath();
    ctx.moveTo(px - ps * 0.32, py);
    ctx.lineTo(px - ps * 0.55, py + ps * 0.2);
    ctx.moveTo(px - ps * 0.12, py - ps * 0.04);
    ctx.quadraticCurveTo(px, py + ps * 0.08, px + ps * 0.14, py - ps * 0.04);
    ctx.stroke();
    this.bgmuRect(ctx, '#f4f4f8', px - ps * 0.55, py + ps * 0.19, ps * 0.1, Math.max(1, 2 * k));
    this.bgmuText(ctx, '10', px + ps * 0.02, py + ps * 0.27, ps * 0.26, 'rgba(240,244,255,0.85)', 'center', '900');

    // Tom e vinheta
    ctx.fillStyle = 'rgba(30,40,110,0.06)';
    ctx.fillRect(0, 0, W, H);
    this.bgmuVignette(ctx, W, H, 0.6, '2,4,14', 0.42);
  };

  // ============================================================= rain_street
  // A rua de casa numa noite de chuva: poste aceso em primeiro plano, fios, máquinas
  // de bebida, a loja de conveniência lá no fundo, o carro do Rin de faróis acesos e o
  // asfalto molhado refletindo tudo
  CE.bgmuReflect = function (ctx, x, y, w, len, color) {
    // Reflexo no asfalto molhado: risquinhos horizontais tremidos que somem para baixo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const base = color.replace(/[\d.]+\)$/, '');
    const a0 = parseFloat(color.match(/([\d.]+)\)$/)[1]);
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, base + (a0 * 0.5).toFixed(3) + ')');
    g.addColorStop(1, base + '0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w * 0.18, y, w * 0.36, len);
    const n = 24;
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const ww = w * (0.35 + 0.65 * Math.abs(Math.sin(i * 2.7 + x * 0.013))) * (1 - f * 0.45);
      ctx.fillStyle = base + (a0 * (1 - f) * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7 + 0.4)))).toFixed(3) + ')';
      ctx.fillRect(x - ww / 2 + Math.sin(i * 3.1) * w * 0.08, y + len * f, ww, Math.max(1, (len / n) * 0.5));
    }
    ctx.restore();
  };

  CE.bgmuRainStreet = function (ctx, W, H) {
    const k = H / 620;
    const R = this.bgmuRng(9090);
    const vpx = W * 0.5;
    const vpy = H * 0.45;
    const X = (xn, z) => vpx + (xn - vpx) / z;
    const Y = (yn, z) => vpy + (yn - vpy) / z;
    const yG = H * 1.3;
    const zMax = 12;
    const q = (xn0, z0, xn1, z1, ya, yb, style) =>
      this.bgmuPoly(ctx, [[X(xn0, z0), Y(ya, z0)], [X(xn1, z1), Y(ya, z1)], [X(xn1, z1), Y(yb, z1)], [X(xn0, z0), Y(yb, z0)]], style);
    // Céu encoberto com o brilho da cidade nas nuvens
    this.bgmuRect(ctx, this.bgmuLin(ctx, 0, 0, 0, vpy, [[0, '#070c18'], [0.6, '#121c30'], [1, '#283750']]), 0, 0, W, H);
    for (let i = 0; i < 5; i++) this.bgmuCloud(ctx, W * (-0.1 + i * 0.25), H * (0.08 + (i % 2) * 0.08), W * 0.35, H * 0.05, R, 'rgba(20,28,46,0.85)', 'rgba(110,130,170,0.18)', -0.1);
    this.cineGlow(ctx, vpx, vpy, W * 0.35, 'rgba(120,150,200,0.25)');
    // Prédios no fim da rua
    this.bgmuSkyline(ctx, X(-W * 0.1, zMax), X(W * 1.1, zMax), Y(yG, zMax), { hMin: H * 0.04, hMax: H * 0.14, wMin: W * 0.012, wMax: W * 0.03, body: '#1a2338', side: '#151d30', wins: ['rgba(255,214,160,0.55)', 'rgba(190,215,255,0.45)'], winP: 0.3, winW: 1.5 * k, winH: 1.5 * k, gapX: 2 * k, gapY: 2.4 * k }, R);
    // Asfalto
    ctx.fillStyle = this.bgmuLin(ctx, 0, vpy, 0, H, [[0, '#1a2234'], [0.3, '#0f1524'], [1, '#080b14']]);
    ctx.beginPath();
    ctx.moveTo(X(-W * 0.6, 1), H * 1.5);
    ctx.lineTo(X(-W * 0.6, zMax), Y(yG, zMax));
    ctx.lineTo(X(W * 1.6, zMax), Y(yG, zMax));
    ctx.lineTo(X(W * 1.6, 1), H * 1.5);
    ctx.fill();
    // Lado esquerdo: casas atrás do muro de blocos
    const xH = -W * 0.55;
    const xF = -W * 0.32;
    for (let z = zMax - 1; z >= 1; z -= 1.1) {
      const z1 = z + 0.9;
      const top = yG - H * (1.25 + ((Math.floor(z * 7) % 3) * 0.2));
      q(xH, z, xH, z1, top, yG, '#141b2c');
      q(xH, z, xH, z1, top, top + H * 0.08, '#0d1220');
      // Janela acesa no andar de cima
      if (R() < 0.7) {
        const warm = R() < 0.75;
        q(xH, z + 0.25, xH, z + 0.55, top + H * 0.22, top + H * 0.5, warm ? 'rgba(255,200,120,0.85)' : 'rgba(150,190,255,0.8)');
        if (z < 6) this.cineGlow(ctx, X(xH, z + 0.4), Y(top + H * 0.36, z + 0.4), (H * 0.25) / z, warm ? 'rgba(255,180,90,0.45)' : 'rgba(120,170,255,0.4)');
      }
    }
    // Muro
    for (let z = zMax - 0.4; z >= 1; z -= 0.9) {
      q(xF, z, xF, z + 0.75, yG - H * 0.5, yG, '#1c2436');
      q(xF, z, xF, z + 0.75, yG - H * 0.5, yG - H * 0.47, 'rgba(160,180,220,0.35)');
    }
    // Máquinas de bebida encostadas no muro
    [[2.02, 2.32, 1], [1.7, 2.0, 0]].forEach(([z0, z1, i]) => {
      const xm = xF + W * 0.13;
      const top = yG - H * 0.98;
      const zm = (z0 + z1) / 2;
      this.cineGlow(ctx, X(xm, zm) + W * 0.02, Y(yG - H * 0.55, zm), H * 0.32, 'rgba(160,205,255,0.5)');
      // Lateral (virada pra câmera) e frente (virada pra rua)
      this.bgmuPoly(ctx, [[X(xF, z0), Y(top, z0)], [X(xm, z0), Y(top, z0)], [X(xm, z0), Y(yG, z0)], [X(xF, z0), Y(yG, z0)]], i ? '#3a4a6a' : '#2c3a58');
      this.bgmuPoly(ctx, [[X(xF, z0), Y(top, z0)], [X(xm, z0), Y(top, z0)], [X(xm, z0), Y(top + H * 0.02, z0)], [X(xF, z0), Y(top + H * 0.02, z0)]], 'rgba(200,220,255,0.4)');
      q(xm, z0, xm, z1, top, yG, '#c4d2ea');
      q(xm, z0 + 0.012, xm, z1 - 0.012, top + H * 0.03, top + H * 0.12, i ? '#2f62d0' : '#d23a3a');
      q(xm, z0 + 0.012, xm, z1 - 0.012, top + H * 0.14, yG - H * 0.42, '#f6faff');
      for (let r = 0; r < 4; r++) {
        for (let cI = 0; cI < 5; cI++) {
          const za = z0 + 0.025 + cI * ((z1 - z0 - 0.05) / 5);
          const ya = top + H * (0.17 + r * 0.1);
          q(xm, za, xm, za + (z1 - z0) * 0.11, ya, ya + H * 0.065, ['#ffd34a', '#e8483a', '#4ad06a', '#ff8a3a', '#3a8ae8', '#f2f2f2'][(r * 2 + cI + i * 3) % 6]);
        }
        q(xm, z0 + 0.012, xm, z1 - 0.012, top + H * (0.24 + r * 0.1), top + H * (0.25 + r * 0.1), '#9fb0c8');
      }
      q(xm, z0 + 0.06, xm, z1 - 0.06, yG - H * 0.26, yG - H * 0.14, '#121826');
      this.bgmuReflect(ctx, X(xm, zm) + W * 0.025, Y(yG, zm), W * 0.07, H * 0.28, 'rgba(180,215,255,0.4)');
    });
    // Lado direito: prédio de apartamentos e a loja de conveniência lá na frente
    const xA = W * 1.55;
    for (let z = zMax - 1; z >= 1; z -= 1.3) {
      q(xA, z, xA, z + 1.2, -H * 2.2, yG, z > 3.3 && z < 4.8 ? '#1a2236' : '#121a2c');
      for (let f = 0; f < 6; f++) {
        for (let b = 0; b < 3; b++) {
          const za = z + 0.12 + b * 0.36;
          const ya = yG - H * (0.95 + f * 0.6);
          const lit = R();
          q(xA, za, xA, za + 0.2, ya - H * 0.3, ya, lit < 0.4 ? 'rgba(255,205,130,0.85)' : lit < 0.55 ? 'rgba(160,200,255,0.75)' : '#0b1020');
        }
      }
    }
    // Konbini (faixa colorida + vitrine branca)
    const kz0 = 3.4;
    const kz1 = 4.7;
    const xK = xA - W * 0.02;
    q(xK, kz0, xK, kz1, yG - H * 0.9, yG, '#d6ebf6');
    for (let r = 0; r < 4; r++) {
      const ya = yG - H * (0.78 - r * 0.17);
      q(xK, kz0 + 0.05, xK, kz1 - 0.05, ya, ya + H * 0.025, '#8fa6bc');
      for (let p = 0; p < 10; p++) {
        const za = kz0 + 0.08 + p * 0.11;
        q(xK, za, xK, za + 0.06, ya - H * 0.07, ya, ['#f2c94c', '#e8583a', '#5ab86a', '#4a8ae8', '#f08ac0'][(p + r) % 5]);
      }
    }
    for (let z = kz0; z <= kz1 + 0.01; z += 0.325) q(xK, z, xK, z + 0.03, yG - H * 0.9, yG, '#56687e');
    q(xK, kz0, xK, kz1, yG - H * 0.9, yG, 'rgba(255,255,255,0.12)');
    q(xA - W * 0.02, kz0, xA - W * 0.02, kz1, yG - H * 1.05, yG - H * 0.95, '#2fa25a');
    q(xA - W * 0.02, kz0, xA - W * 0.02, kz1, yG - H * 1.12, yG - H * 1.05, '#2a5ad8');
    q(xA - W * 0.02, kz0, xA - W * 0.02, kz1, yG - H * 0.95, yG - H * 0.9, '#f28a2a');
    this.cineGlow(ctx, X(xA, 4), Y(yG - H * 0.5, 4), H * 0.3, 'rgba(210,235,255,0.55)');
    this.bgmuReflect(ctx, X(xA - W * 0.1, 4), Y(yG, 4), W * 0.06, H * 0.2, 'rgba(210,235,255,0.3)');
    // Sinal fechado lá no cruzamento
    const sx = X(W * 1.25, 8);
    const sy = Y(yG - H * 1.6, 8);
    this.bgmuLine(ctx, sx, sy, sx, Y(yG, 8), '#0b0f1a', Math.max(1, 2 * k));
    this.bgmuRect(ctx, '#0b0f1a', sx - 7 * k, sy - 3 * k, 14 * k, 6 * k);
    this.cineGlow(ctx, sx + 4 * k, sy, 16 * k, 'rgba(255,50,50,0.95)');
    this.bgmuReflect(ctx, sx, Y(yG, 8), 5 * k, H * 0.12, 'rgba(255,60,60,0.45)');
    // Faixas da rua (molhadas)
    ctx.strokeStyle = 'rgba(220,225,235,0.55)';
    ctx.lineWidth = Math.max(1, 1.5 * k);
    ctx.beginPath();
    ctx.moveTo(X(-W * 0.2, 1), Y(yG, 1));
    ctx.lineTo(X(-W * 0.2, zMax), Y(yG, zMax));
    ctx.moveTo(X(W * 1.2, 1), Y(yG, 1));
    ctx.lineTo(X(W * 1.2, zMax), Y(yG, zMax));
    ctx.stroke();
    for (let z = 1.2; z < zMax; z += 0.9) this.bgmuPoly(ctx, [[X(vpx - W * 0.012, z), Y(yG, z)], [X(vpx - W * 0.012, z + 0.4), Y(yG, z + 0.4)], [X(vpx + W * 0.012, z + 0.4), Y(yG, z + 0.4)], [X(vpx + W * 0.012, z), Y(yG, z)]], 'rgba(220,225,235,0.45)');
    // Postes de luz/fiação dos dois lados + fios
    const poles = [];
    [[-W * 0.28, [1.4, 3, 5.2, 8.5]], [W * 1.32, [2.2, 4.2, 7]]].forEach(([xn, zs]) => {
      zs.forEach((z) => {
        const x = X(xn, z);
        const yb = Y(yG, z);
        const yt = Y(yG - H * 2.6, z);
        const pw2 = Math.max(1.5, (14 * k) / z);
        this.bgmuRect(ctx, '#070a12', x - pw2 / 2, yt, pw2, yb - yt);
        this.bgmuRect(ctx, 'rgba(150,170,210,0.3)', x + pw2 / 2 - 1, yt, 1, yb - yt);
        const arm = (W * 0.1) / z;
        this.bgmuRect(ctx, '#070a12', x - arm, yt + (yb - yt) * 0.05, arm * 2, pw2 * 0.6);
        poles.push([x, yt + (yb - yt) * 0.05, arm, z, xn < 0 ? -1 : 1]);
      });
    });
    const left = poles.filter((p) => p[4] < 0).sort((a, b) => a[3] - b[3]);
    const right = poles.filter((p) => p[4] > 0).sort((a, b) => a[3] - b[3]);
    [left, right].forEach((arr) => {
      for (let i = 0; i < arr.length - 1; i++) {
        const [x0, y0, a0, z0] = arr[i];
        const [x1, y1, a1] = arr[i + 1];
        [-1, -0.4, 0.4, 1].forEach((f) => this.bgmuWire(ctx, x0 + a0 * f, y0, x1 + a1 * f, y1, (H * 0.05) / z0, 'rgba(4,6,12,0.9)', Math.max(1, (2 * k) / Math.sqrt(z0))));
      }
      const [x0, y0, a0] = arr[0];
      [-1, -0.4, 0.4, 1].forEach((f, i) => this.bgmuWire(ctx, x0 + a0 * f, y0, x0 + a0 * f + (arr === left ? -W * 0.4 : W * 0.4), y0 - H * 0.2 - i * H * 0.03, H * 0.03, 'rgba(4,6,12,0.9)', Math.max(1, 2 * k)));
    });
    this.bgmuWire(ctx, left[1][0] + left[1][2], left[1][1], right[1][0] - right[1][2], right[1][1], H * 0.04, 'rgba(4,6,12,0.85)', Math.max(1, k));

    // O carro do Rin parado, faróis acesos na sua direção
    const cz = 2.7;
    const cxn = W * 1.02;
    const ccx = X(cxn, cz);
    const cgy = Y(yG, cz);
    const cw = (W * 0.42) / cz;
    const ch = cw * 0.42;
    this.bgmuRect(ctx, 'rgba(0,0,0,0.5)', ccx - cw * 0.55, cgy - ch * 0.08, cw * 1.1, ch * 0.14);
    ctx.fillStyle = this.bgmuLin(ctx, 0, cgy - ch, 0, cgy, [[0, '#1a2236'], [0.5, '#0c111e'], [1, '#05070c']]);
    ctx.beginPath();
    ctx.moveTo(ccx - cw * 0.5, cgy - ch * 0.08);
    ctx.lineTo(ccx - cw * 0.5, cgy - ch * 0.55);
    ctx.lineTo(ccx - cw * 0.36, cgy - ch * 0.62);
    ctx.lineTo(ccx - cw * 0.28, cgy - ch * 1.05);
    ctx.lineTo(ccx + cw * 0.28, cgy - ch * 1.05);
    ctx.lineTo(ccx + cw * 0.36, cgy - ch * 0.62);
    ctx.lineTo(ccx + cw * 0.5, cgy - ch * 0.55);
    ctx.lineTo(ccx + cw * 0.5, cgy - ch * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = this.bgmuLin(ctx, 0, cgy - ch, 0, cgy - ch * 0.62, [[0, '#2a3a58'], [1, '#0a1020']]);
    ctx.beginPath();
    ctx.moveTo(ccx - cw * 0.33, cgy - ch * 0.64);
    ctx.lineTo(ccx - cw * 0.26, cgy - ch * 0.99);
    ctx.lineTo(ccx + cw * 0.26, cgy - ch * 0.99);
    ctx.lineTo(ccx + cw * 0.33, cgy - ch * 0.64);
    ctx.fill();
    this.bgmuLine(ctx, ccx - cw * 0.1, cgy - ch * 0.98, ccx - cw * 0.2, cgy - ch * 0.66, 'rgba(180,200,240,0.35)', Math.max(1, k));
    this.bgmuRect(ctx, '#05070c', ccx - cw * 0.18, cgy - ch * 0.4, cw * 0.36, ch * 0.16);
    this.bgmuRect(ctx, 'rgba(160,180,220,0.4)', ccx - cw * 0.5, cgy - ch * 0.56, cw, Math.max(1, k));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    [-1, 1].forEach((s) => {
      const hx = ccx + s * cw * 0.36;
      const hy = cgy - ch * 0.4;
      this.cineGlow(ctx, hx, hy, cw * 0.55, 'rgba(200,225,255,0.55)');
      this.cineGlow(ctx, hx, hy, cw * 0.14, 'rgba(255,255,255,1)');
      const g = ctx.createLinearGradient(hx - cw * 1.4, 0, hx + cw * 1.4, 0);
      g.addColorStop(0, 'rgba(180,210,255,0)');
      g.addColorStop(0.5, 'rgba(220,235,255,0.75)');
      g.addColorStop(1, 'rgba(180,210,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(hx - cw * 1.4, hy - Math.max(1, k), cw * 2.8, Math.max(2, 2 * k));
    });
    ctx.restore();
    [-1, 1].forEach((s) => this.bgmuReflect(ctx, ccx + s * cw * 0.36, cgy, cw * 0.14, H * 0.3, 'rgba(210,230,255,0.5)'));

    // Poste de luz em primeiro plano com o cone de luz na chuva
    const lpx = W * 0.86;
    const lhx = W * 0.765;
    const lhy = H * 0.13;
    this.bgmuRect(ctx, '#05070d', lpx - 5 * k, lhy - H * 0.02, 10 * k, H);
    this.bgmuRect(ctx, 'rgba(170,190,230,0.35)', lpx + 3 * k, lhy, Math.max(1, k), H);
    ctx.strokeStyle = '#05070d';
    ctx.lineWidth = 6 * k;
    ctx.beginPath();
    ctx.moveTo(lpx, lhy + H * 0.02);
    ctx.quadraticCurveTo(lpx, lhy - H * 0.03, lhx + W * 0.02, lhy - H * 0.02);
    ctx.stroke();
    this.bgmuPoly(ctx, [[lhx - W * 0.02, lhy - H * 0.005], [lhx + W * 0.025, lhy - H * 0.025], [lhx + W * 0.028, lhy - H * 0.01], [lhx - W * 0.018, lhy + H * 0.008]], '#0a0d16');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cone = ctx.createLinearGradient(0, lhy, 0, H);
    cone.addColorStop(0, 'rgba(225,235,255,0.26)');
    cone.addColorStop(1, 'rgba(200,220,255,0.03)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lhx - W * 0.015, lhy);
    ctx.lineTo(lhx + W * 0.015, lhy);
    ctx.lineTo(lhx + W * 0.2, H);
    ctx.lineTo(lhx - W * 0.2, H);
    ctx.closePath();
    ctx.fill();
    ctx.clip();
    this.bgmuRain(ctx, lhx - W * 0.2, lhy, W * 0.4, H - lhy, 160, R, { len: 34 * k, slant: 0.12, color: '235,242,255', alpha: 0.7, lw: 1.4 * k });
    ctx.restore();
    this.cineGlow(ctx, lhx, lhy + 3 * k, H * 0.22, 'rgba(200,220,255,0.45)');
    this.cineGlow(ctx, lhx, lhy + 3 * k, H * 0.04, 'rgba(255,255,255,1)');
    this.cineGlow(ctx, lhx, H * 0.97, W * 0.18, 'rgba(180,200,255,0.18)');
    // Poças com o reflexo do poste e anéis da chuva
    const puddle = (x, y, rx, ry, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(210,225,255,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const px = x + (R() - 0.5) * rx * 1.4;
        const py = y + (R() - 0.5) * ry;
        ctx.beginPath();
        ctx.ellipse(px, py, rx * 0.12, ry * 0.12, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    puddle(W * 0.1, H * 0.9, W * 0.08, H * 0.03, 'rgba(70,90,140,0.35)');
    puddle(W * 0.9, H * 0.94, W * 0.09, H * 0.03, 'rgba(150,175,230,0.3)');
    this.bgmuReflect(ctx, lhx, H * 0.83, W * 0.03, H * 0.17, 'rgba(220,235,255,0.4)');
    // Chuva em todo o quadro + respingos
    this.bgmuRain(ctx, 0, 0, W + W * 0.05, H, 520, R, { len: 28 * k, slant: 0.12, color: '180,200,240', alpha: 0.32, lw: 1.1 * k });
    ctx.strokeStyle = 'rgba(200,215,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const x = R() * W;
      const y = vpy + H * 0.12 + R() * (H * 0.43);
      const s = ((y - vpy) / H) * 10 * k;
      ctx.moveTo(x - s, y);
      ctx.lineTo(x - s * 0.4, y - s * 0.8);
      ctx.moveTo(x + s, y);
      ctx.lineTo(x + s * 0.4, y - s * 0.8);
    }
    ctx.stroke();
    // Névoa da chuva no fundo
    ctx.fillStyle = this.bgmuLin(ctx, 0, vpy - H * 0.2, 0, vpy + H * 0.12, [[0, 'rgba(110,130,170,0)'], [0.6, 'rgba(110,130,170,0.2)'], [1, 'rgba(110,130,170,0)']]);
    ctx.fillRect(0, vpy - H * 0.2, W, H * 0.32);
    this.bgmuVignette(ctx, W, H, 0.65, '2,4,12', 0.45);
  };

  // ============================================================= registro
  const VN = CE.VN_BG;
  VN.night_home = function (ctx, W, H) {
    this.bgmuNightHome(ctx, W, H);
  };
  VN.spain_cafe = function (ctx, W, H) {
    this.bgmuSpainCafe(ctx, W, H);
  };
  VN.clasico_night = function (ctx, W, H) {
    this.bgmuClasico(ctx, W, H);
  };
  VN.paris_gala = function (ctx, W, H) {
    this.bgmuParisGala(ctx, W, H);
  };
  VN.hotel_night = function (ctx, W, H) {
    this.bgmuHotelNight(ctx, W, H);
  };
  VN.rain_street = function (ctx, W, H) {
    this.bgmuRainStreet(ctx, W, H);
  };
})();
